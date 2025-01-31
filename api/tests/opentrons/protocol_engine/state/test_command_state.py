"""Tests for the CommandStore+CommandState+CommandView trifecta.

The trifecta is tested here as a single unit, treating CommandState as a private
implementation detail.
"""

from datetime import datetime
from typing import Any
from unittest.mock import sentinel

import pytest

from opentrons_shared_data.errors import ErrorCodes, PythonException

from opentrons.hardware_control.types import DoorState
from opentrons.ordered_set import OrderedSet
from opentrons.protocol_engine import actions, commands, errors
from opentrons.protocol_engine.actions.actions import (
    PlayAction,
    SetErrorRecoveryPolicyAction,
)
from opentrons.protocol_engine.commands.command import CommandIntent, DefinedErrorData
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence
from opentrons.protocol_engine.errors.exceptions import (
    EStopActivatedError,
    RobotDoorOpenError,
)
from opentrons.protocol_engine.notes.notes import CommandNote
from opentrons.protocol_engine.state.commands import (
    CommandStore,
    CommandView,
    CommandErrorSlice,
)
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.state.update_types import StateUpdate
from opentrons.protocol_engine.types import DeckType, EngineStatus


def _make_config() -> Config:
    return Config(
        # Choice of robot and deck type is arbitrary.
        robot_type="OT-2 Standard",
        deck_type=DeckType.OT2_STANDARD,
    )


def _placeholder_error_recovery_policy(*args: object, **kwargs: object) -> Any:
    """A placeholder `ErrorRecoveryPolicy` for tests that don't care about it."""
    raise NotImplementedError()


def test_queue_command_action() -> None:
    """It should translate a command request into a queued command and add it."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    id = "command-id"
    key = "command-key"
    params = commands.CommentParams(message="yay")
    created_at = datetime(year=2021, month=1, day=1)
    request = commands.CommentCreate(params=params, key=key)
    action = actions.QueueCommandAction(
        request=request,
        request_hash=None,
        created_at=created_at,
        command_id=id,
    )
    expected_command = commands.Comment(
        id=id,
        key=key,
        createdAt=created_at,
        status=commands.CommandStatus.QUEUED,
        params=params,
    )

    subject.handle_action(action)
    assert subject_view.get("command-id") == expected_command
    assert subject_view.get_all() == [expected_command]


def test_latest_protocol_command_hash() -> None:
    """It should return the latest protocol command's hash."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    # The initial hash should be None.
    assert subject_view.get_latest_protocol_command_hash() is None

    # It should pick up the hash from an enqueued protocol command.
    subject.handle_action(
        actions.QueueCommandAction(
            request=commands.CommentCreate(
                params=commands.CommentParams(message="hello world"),
            ),
            request_hash="hash-1",
            command_id="command-id-1",
            created_at=datetime.now(),
        )
    )
    assert subject_view.get_latest_protocol_command_hash() == "hash-1"

    # It should pick up newer hashes as they come in.
    subject.handle_action(
        actions.QueueCommandAction(
            request=commands.CommentCreate(
                params=commands.CommentParams(message="hello world"),
            ),
            request_hash="hash-2",
            command_id="command-id-2",
            created_at=datetime.now(),
        )
    )
    assert subject_view.get_latest_protocol_command_hash() == "hash-2"


@pytest.mark.parametrize("error_recovery_type", ErrorRecoveryType)
def test_command_failure(error_recovery_type: ErrorRecoveryType) -> None:
    """It should store an error and mark the command if it fails."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    command_id = "command-id"
    command_key = "command-key"
    created_at = datetime(year=2021, month=1, day=1)
    started_at = datetime(year=2022, month=2, day=2)
    failed_at = datetime(year=2023, month=3, day=3)
    error_id = "error-id"
    notes = [
        CommandNote(
            noteKind="noteKind",
            shortMessage="shortMessage",
            longMessage="longMessage",
            source="source",
        )
    ]

    params = commands.CommentParams(message="No comment.")

    subject.handle_action(
        actions.QueueCommandAction(
            command_id=command_id,
            created_at=created_at,
            request=commands.CommentCreate(params=params, key=command_key),
            request_hash=None,
        )
    )
    subject.handle_action(
        actions.RunCommandAction(command_id=command_id, started_at=started_at)
    )
    subject.handle_action(
        actions.FailCommandAction(
            command_id=command_id,
            running_command=subject_view.get(command_id),
            error_id=error_id,
            failed_at=failed_at,
            error=errors.ProtocolEngineError(message="oh no"),
            notes=notes,
            type=error_recovery_type,
        )
    )

    expected_error_occurrence = errors.ErrorOccurrence(
        id=error_id,
        errorType="ProtocolEngineError",
        createdAt=failed_at,
        detail="oh no",
        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
    )
    expected_failed_command = commands.Comment(
        id=command_id,
        key=command_key,
        commandType="comment",
        createdAt=created_at,
        startedAt=started_at,
        completedAt=failed_at,
        status=commands.CommandStatus.FAILED,
        params=params,
        result=None,
        error=expected_error_occurrence,
        notes=notes,
    )

    assert subject_view.get("command-id") == expected_failed_command
    assert subject_view.get_all_errors() == [expected_error_occurrence]


def test_command_failure_clears_queues() -> None:
    """It should clear the command queue on command failure."""
    subject = CommandStore(
        config=_make_config(),
        is_door_open=False,
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    queue_1 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    queue_2 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-2"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-2",
    )
    subject.handle_action(queue_2)

    run_1 = actions.RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_1)
    expected_error = errors.ProtocolEngineError(message="oh no")
    expected_error_occurance = errors.ErrorOccurrence(
        id="error-id",
        errorType="ProtocolEngineError",
        createdAt=datetime(year=2023, month=3, day=3),
        detail="oh no",
        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
    )
    fail_1 = actions.FailCommandAction(
        command_id="command-id-1",
        running_command=subject_view.get("command-id-1"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=expected_error,
        notes=[],
        type=ErrorRecoveryType.FAIL_RUN,
    )
    subject.handle_action(fail_1)

    assert [(c.id, c.status) for c in subject_view.get_all()] == [
        ("command-id-1", commands.CommandStatus.FAILED),
        ("command-id-2", commands.CommandStatus.FAILED),
    ]
    assert subject_view.get_running_command_id() is None
    assert subject_view.get_queue_ids() == OrderedSet()
    assert subject_view.get_next_to_execute() is None
    assert subject_view.get_all_errors() == [expected_error_occurance]


def test_setup_command_failure_only_clears_setup_command_queue() -> None:
    """It should clear only the setup command queue for a failed setup command.

    This test queues up a non-setup command followed by two setup commands,
    then runs and fails the first setup command.
    """
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    queue_1 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    queue_2_setup = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
            key="command-key-2",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-2",
    )
    subject.handle_action(queue_2_setup)
    queue_3_setup = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
            key="command-key-3",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-3",
    )
    subject.handle_action(queue_3_setup)

    run_2_setup = actions.RunCommandAction(
        command_id="command-id-2",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_2_setup)
    fail_2_setup = actions.FailCommandAction(
        command_id="command-id-2",
        running_command=subject_view.get("command-id-2"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=errors.ProtocolEngineError(message="oh no"),
        notes=[],
        type=ErrorRecoveryType.FAIL_RUN,
    )
    subject.handle_action(fail_2_setup)

    assert [(c.id, c.status) for c in subject_view.get_all()] == [
        ("command-id-1", commands.CommandStatus.QUEUED),
        ("command-id-2", commands.CommandStatus.FAILED),
        ("command-id-3", commands.CommandStatus.FAILED),
    ]
    assert subject_view.get_running_command_id() is None

    subject.handle_action(actions.PlayAction(requested_at=datetime.now()))
    assert subject_view.get_next_to_execute() == "command-id-1"


def test_nonfatal_command_failure() -> None:
    """Test the command queue if a command fails recoverably.

    Commands that were after the failed command in the queue should be left in
    the queue.

    The queue status should be "awaiting-recovery."
    """
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject_view = CommandView(subject.state)

    queue_1 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    queue_2 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-2"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-2",
    )
    subject.handle_action(queue_2)

    run_1 = actions.RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_1)
    fail_1 = actions.FailCommandAction(
        command_id="command-id-1",
        running_command=subject_view.get("command-id-1"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=errors.ProtocolEngineError(message="oh no"),
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
    )
    subject.handle_action(fail_1)

    assert subject_view.get_status() == EngineStatus.AWAITING_RECOVERY
    assert [(c.id, c.status) for c in subject_view.get_all()] == [
        ("command-id-1", commands.CommandStatus.FAILED),
        ("command-id-2", commands.CommandStatus.QUEUED),
    ]
    assert subject_view.get_running_command_id() is None


def test_door_during_setup_phase() -> None:
    """Test behavior when the door is opened during the setup phase."""
    subject = CommandStore(
        is_door_open=False,
        error_recovery_policy=_placeholder_error_recovery_policy,
        config=Config(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_STANDARD,
        ),
    )
    subject_view = CommandView(subject.state)

    queue_setup_command = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""),
            key="setup-command-key",
            intent=commands.CommandIntent.SETUP,
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="setup-command-id",
    )
    subject.handle_action(queue_setup_command)

    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))

    assert subject_view.get_status() == EngineStatus.IDLE
    # The door being open should not block the setup command from executing.
    assert subject_view.get_next_to_execute() == "setup-command-id"


def test_door_during_protocol_phase() -> None:
    """Test behavior when the door is opened during the main protocol phase."""
    subject = CommandStore(
        is_door_open=False,
        error_recovery_policy=_placeholder_error_recovery_policy,
        config=Config(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_STANDARD,
        ),
    )
    subject_view = CommandView(subject.state)

    queue_protocol_command = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""),
            key="command-key",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id",
    )
    subject.handle_action(queue_protocol_command)

    subject.handle_action(actions.PlayAction(requested_at=datetime.now()))

    play = PlayAction(requested_at=datetime.now())

    # Test state after we open the door:
    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))
    assert subject_view.get_status() == EngineStatus.BLOCKED_BY_OPEN_DOOR
    assert subject_view.get_next_to_execute() is None
    with pytest.raises(RobotDoorOpenError):
        subject_view.validate_action_allowed(play)

    # Test state after we close the door (with an extra open-close for good measure)
    subject.handle_action(actions.DoorChangeAction(DoorState.CLOSED))
    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))
    subject.handle_action(actions.DoorChangeAction(DoorState.CLOSED))
    assert subject_view.get_status() == EngineStatus.PAUSED
    assert subject_view.get_next_to_execute() is None
    subject_view.validate_action_allowed(play)  # Should not raise.

    # Test state when we resume:
    subject.handle_action(play)
    assert subject_view.get_status() == EngineStatus.RUNNING
    assert subject_view.get_next_to_execute() == "command-id"


def test_door_during_error_recovery() -> None:
    """Test behavior when the door is opened during error recovery."""
    subject = CommandStore(
        is_door_open=False,
        error_recovery_policy=_placeholder_error_recovery_policy,
        config=Config(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_STANDARD,
        ),
    )
    subject_view = CommandView(subject.state)

    # Fail a command to put the subject in recovery mode.
    queue_1 = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    run_1 = actions.RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_1)
    expected_error = errors.ProtocolEngineError(message="oh no")
    expected_error_occurance = errors.ErrorOccurrence(
        id="error-id",
        errorType="ProtocolEngineError",
        createdAt=datetime(year=2023, month=3, day=3),
        detail="oh no",
        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
    )
    fail_1 = actions.FailCommandAction(
        command_id="command-id-1",
        running_command=subject_view.get("command-id-1"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=expected_error,
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
    )
    subject.handle_action(fail_1)

    queue_2 = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""),
            key="command-key-2",
            intent=CommandIntent.FIXIT,
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-2",
    )
    subject.handle_action(queue_2)
    assert subject_view.get_status() == EngineStatus.AWAITING_RECOVERY
    assert subject_view.get_next_to_execute() == "command-id-2"

    # Test state after we open the door:
    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))
    assert (
        subject_view.get_status() == EngineStatus.AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
    )
    assert subject_view.get_next_to_execute() is None
    play = actions.PlayAction(requested_at=datetime.now())
    with pytest.raises(RobotDoorOpenError):
        subject_view.validate_action_allowed(play)

    # Test state after we close the door (with an extra open-close for good measure)
    subject.handle_action(actions.DoorChangeAction(DoorState.CLOSED))
    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))
    subject.handle_action(actions.DoorChangeAction(DoorState.CLOSED))
    assert subject_view.get_status() == EngineStatus.AWAITING_RECOVERY_PAUSED
    assert subject_view.get_next_to_execute() is None
    subject_view.validate_action_allowed(play)  # Should not raise.

    # Test state when we resume recovery mode:
    subject.handle_action(play)
    assert subject_view.get_status() == EngineStatus.AWAITING_RECOVERY
    assert subject_view.get_next_to_execute() == "command-id-2"
    assert subject_view.get_all_errors() == [expected_error_occurance]


@pytest.mark.parametrize("close_door_before_queueing", [False, True])
def test_door_ungrip_labware(close_door_before_queueing: bool) -> None:
    """Ungrip commands should be able to run even when the door is open."""
    subject = CommandStore(
        is_door_open=False,
        error_recovery_policy=_placeholder_error_recovery_policy,
        config=Config(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_STANDARD,
        ),
    )
    subject_view = CommandView(subject.state)

    # Fail a command to put the subject in recovery mode.
    queue_failing = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="failing-command-id",
    )
    subject.handle_action(queue_failing)
    run_failing = actions.RunCommandAction(
        command_id="failing-command-id",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_failing)
    expected_error = errors.ProtocolEngineError(message="oh no")
    fail_failing = actions.FailCommandAction(
        command_id="failing-command-id",
        running_command=subject_view.get("failing-command-id"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=expected_error,
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
    )
    subject.handle_action(fail_failing)

    # Open the door:
    subject.handle_action(actions.DoorChangeAction(DoorState.OPEN))
    assert (
        subject_view.get_status() == EngineStatus.AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
    )
    assert subject_view.get_next_to_execute() is None

    if close_door_before_queueing:
        subject.handle_action(actions.DoorChangeAction(DoorState.CLOSED))

    assert subject_view.get_status() in (
        EngineStatus.AWAITING_RECOVERY_PAUSED,  # If we closed the door.
        EngineStatus.AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,  # If we didn't.
    )

    # Make sure the special ungrip command can be queued and that it will be returned
    # as next to execute:
    queue_fixit = actions.QueueCommandAction(
        request=commands.unsafe.UnsafeUngripLabwareCreate(
            params=commands.unsafe.UnsafeUngripLabwareParams(),
            intent=CommandIntent.FIXIT,
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="fixit-command-id",
    )
    subject_view.validate_action_allowed(queue_fixit)
    subject.handle_action(queue_fixit)
    assert subject_view.get_next_to_execute() == "fixit-command-id"


@pytest.mark.parametrize(
    ("door_initially_open", "expected_engine_status_after_play"),
    [
        (False, EngineStatus.RUNNING),
        (True, EngineStatus.BLOCKED_BY_OPEN_DOOR),
    ],
)
def test_door_initially_open(
    door_initially_open: bool, expected_engine_status_after_play: EngineStatus
) -> None:
    """Test open-door blocking behavior given different initial door states."""
    subject = CommandStore(
        is_door_open=door_initially_open,
        error_recovery_policy=_placeholder_error_recovery_policy,
        config=Config(
            block_on_door_open=True,
            # Choice of robot and deck type are arbitrary.
            robot_type="OT-2 Standard",
            deck_type=DeckType.OT2_STANDARD,
        ),
    )
    subject_view = CommandView(subject.state)

    assert subject_view.get_status() == EngineStatus.IDLE
    play = actions.PlayAction(requested_at=datetime.now())
    subject_view.validate_action_allowed(play)  # Should not raise.
    subject.handle_action(play)
    assert subject_view.get_status() == expected_engine_status_after_play


def test_error_recovery_type_tracking() -> None:
    """It should keep track of each failed command's error recovery type."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )

    subject.handle_action(
        actions.QueueCommandAction(
            command_id="c1",
            created_at=datetime.now(),
            request=commands.CommentCreate(
                params=commands.CommentParams(message="yeehaw"),
            ),
            request_hash=None,
        )
    )
    subject.handle_action(
        actions.QueueCommandAction(
            command_id="c2",
            created_at=datetime.now(),
            request=commands.CommentCreate(
                params=commands.CommentParams(message="yeehaw"),
            ),
            request_hash=None,
        )
    )
    subject.handle_action(
        actions.RunCommandAction(command_id="c1", started_at=datetime.now())
    )
    running_command_1 = CommandView(subject.state).get("c1")
    subject.handle_action(
        actions.FailCommandAction(
            command_id="c1",
            running_command=running_command_1,
            error_id="c1-error",
            failed_at=datetime(year=2023, month=3, day=3),
            error=PythonException(RuntimeError("new sheriff in town")),
            notes=[],
            type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
        )
    )
    subject.handle_action(
        actions.RunCommandAction(command_id="c2", started_at=datetime.now())
    )
    running_command_2 = CommandView(subject.state).get("c2")
    subject.handle_action(
        actions.FailCommandAction(
            command_id="c2",
            running_command=running_command_2,
            error_id="c2-error",
            failed_at=datetime(year=2023, month=3, day=3),
            error=PythonException(RuntimeError("new sheriff in town")),
            notes=[],
            type=ErrorRecoveryType.FAIL_RUN,
        )
    )

    view = CommandView(subject.state)
    assert view.get_error_recovery_type("c1") == ErrorRecoveryType.WAIT_FOR_RECOVERY
    assert view.get_error_recovery_type("c2") == ErrorRecoveryType.FAIL_RUN

    exception = PythonException(RuntimeError("new sheriff in town"))
    error_occurrence_1 = ErrorOccurrence.from_failed(
        id="c1-error", createdAt=datetime(year=2023, month=3, day=3), error=exception
    )
    error_occurrence_2 = ErrorOccurrence.from_failed(
        id="c2-error", createdAt=datetime(year=2023, month=3, day=3), error=exception
    )

    assert view.get_all_errors() == [
        error_occurrence_1,
        error_occurrence_2,
    ]


def test_recovery_target_tracking() -> None:
    """It should keep track of the command currently undergoing error recovery."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    queue_1 = actions.QueueCommandAction(
        "c1",
        created_at=datetime.now(),
        request=commands.CommentCreate(params=commands.CommentParams(message="")),
        request_hash=None,
    )
    subject.handle_action(queue_1)
    run_1 = actions.RunCommandAction(command_id="c1", started_at=datetime.now())
    subject.handle_action(run_1)
    fail_1 = actions.FailCommandAction(
        command_id="c1",
        error_id="c1-error",
        failed_at=datetime.now(),
        error=PythonException(RuntimeError()),
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
        running_command=subject_view.get("c1"),
    )
    subject.handle_action(fail_1)

    # c1 failed recoverably and we're currently recovering from it.
    recovery_target = subject_view.get_recovery_target()
    assert recovery_target is not None
    assert recovery_target.command_id == "c1"
    assert subject_view.get_recovery_in_progress_for_command("c1")

    resume_from_1_recovery = actions.ResumeFromRecoveryAction(StateUpdate())
    subject.handle_action(resume_from_1_recovery)

    # c1 failed recoverably, but we've already completed its recovery.
    assert subject_view.get_recovery_target() is None
    assert not subject_view.get_recovery_in_progress_for_command("c1")

    queue_2 = actions.QueueCommandAction(
        "c2",
        created_at=datetime.now(),
        request=commands.CommentCreate(params=commands.CommentParams(message="")),
        request_hash=None,
    )
    subject.handle_action(queue_2)
    run_2 = actions.RunCommandAction(command_id="c2", started_at=datetime.now())
    subject.handle_action(run_2)
    fail_2 = actions.FailCommandAction(
        command_id="c2",
        error_id="c2-error",
        failed_at=datetime.now(),
        error=PythonException(RuntimeError()),
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
        running_command=subject_view.get("c2"),
    )
    subject.handle_action(fail_2)

    # c2 failed recoverably and we're currently recovering from it.
    recovery_target = subject_view.get_recovery_target()
    assert recovery_target is not None
    assert recovery_target.command_id == "c2"
    assert subject_view.get_recovery_in_progress_for_command("c2")
    # ...and that means we're *not* currently recovering from c1,
    # even though it failed recoverably before.
    assert not subject_view.get_recovery_in_progress_for_command("c1")

    resume_from_2_recovery = actions.ResumeFromRecoveryAction(StateUpdate())
    subject.handle_action(resume_from_2_recovery)
    queue_3 = actions.QueueCommandAction(
        "c3",
        created_at=datetime.now(),
        request=commands.CommentCreate(params=commands.CommentParams(message="")),
        request_hash=None,
    )
    subject.handle_action(queue_3)
    run_3 = actions.RunCommandAction(command_id="c3", started_at=datetime.now())
    subject.handle_action(run_3)
    fail_3 = actions.FailCommandAction(
        command_id="c3",
        error_id="c3-error",
        failed_at=datetime.now(),
        error=PythonException(RuntimeError()),
        notes=[],
        type=ErrorRecoveryType.FAIL_RUN,
        running_command=subject_view.get("c3"),
    )
    subject.handle_action(fail_3)

    # c3 failed, but not recoverably.
    assert subject_view.get_recovery_target() is None
    assert not subject_view.get_recovery_in_progress_for_command("c3")

    assert subject_view.get_has_entered_recovery_mode() is True


@pytest.mark.parametrize(
    "ending_action",
    [
        actions.StopAction(from_estop=False),
        actions.StopAction(from_estop=True),
        actions.FinishAction(set_run_status=False),
        actions.FinishAction(
            set_run_status=True,
            error_details=actions.FinishErrorDetails(
                error=Exception("blimey"),
                error_id="error-id",
                created_at=datetime.now(),
            ),
        ),
    ],
)
def test_recovery_target_clears_when_run_ends(ending_action: actions.Action) -> None:
    """There should never be an error recovery target when the run is done."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    # Setup: Put the run in error recovery mode.
    queue = actions.QueueCommandAction(
        "c1",
        created_at=datetime.now(),
        request=commands.CommentCreate(params=commands.CommentParams(message="")),
        request_hash=None,
    )
    subject.handle_action(queue)
    run = actions.RunCommandAction(command_id="c1", started_at=datetime.now())
    subject.handle_action(run)
    fail = actions.FailCommandAction(
        command_id="c1",
        error_id="c1-error",
        failed_at=datetime.now(),
        error=PythonException(RuntimeError()),
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
        running_command=subject_view.get("c1"),
    )
    subject.handle_action(fail)

    # Test: Assert that the ending action clears the recovery target.
    assert subject_view.get_recovery_target() is not None
    subject.handle_action(ending_action)
    assert subject_view.get_recovery_target() is None


def test_final_state_after_estop() -> None:
    """Test the final state of the run after it's E-stopped."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    error_details = actions.FinishErrorDetails(
        error=EStopActivatedError(), error_id="error-id", created_at=datetime.now()
    )
    expected_error_occurrence = ErrorOccurrence(
        id=error_details.error_id,
        createdAt=error_details.created_at,
        errorCode=ErrorCodes.E_STOP_ACTIVATED.value.code,
        errorType="EStopActivatedError",
        detail="E-stop activated.",
    )

    subject.handle_action(actions.StopAction(from_estop=True))
    subject.handle_action(actions.FinishAction(error_details=error_details))
    subject.handle_action(
        actions.HardwareStoppedAction(
            completed_at=sentinel.hardware_stopped_action_completed_at,
            finish_error_details=None,
        )
    )

    assert subject_view.get_status() == EngineStatus.FAILED
    assert subject_view.get_error() == expected_error_occurrence
    assert subject_view.get_all_errors() == []


def test_final_state_after_stop() -> None:
    """Test the final state of the run after it's stopped."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    subject.handle_action(actions.StopAction())
    subject.handle_action(
        actions.FinishAction(
            error_details=actions.FinishErrorDetails(
                error=RuntimeError(
                    "uh oh I was a command and then I got cancelled because someone"
                    " stopped the run, and now I'm raising this exception because"
                    " of that. Woe is me"
                ),
                error_id="error-id",
                created_at=datetime.now(),
            )
        )
    )
    subject.handle_action(
        actions.HardwareStoppedAction(
            completed_at=sentinel.hardware_stopped_action_completed_at,
            finish_error_details=None,
        )
    )

    assert subject_view.get_status() == EngineStatus.STOPPED
    assert subject_view.get_error() is None


def test_final_state_after_error_recovery_stop() -> None:
    """Test the final state of the run after it's stopped during error recovery.

    We still want to count this as "stopped," not "failed."
    """
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    # Fail a command to put the subject in recovery mode.
    queue_1 = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    run_1 = actions.RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_1)
    fail_1 = actions.FailCommandAction(
        command_id="command-id-1",
        running_command=subject_view.get("command-id-1"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=errors.ProtocolEngineError(message="oh no"),
        notes=[],
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
    )
    expected_error_occurrence_1 = ErrorOccurrence(
        id="error-id",
        createdAt=datetime(year=2023, month=3, day=3),
        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        errorType="ProtocolEngineError",
        detail="oh no",
    )
    subject.handle_action(fail_1)
    assert subject_view.get_status() == EngineStatus.AWAITING_RECOVERY

    subject.handle_action(actions.StopAction())
    subject.handle_action(
        actions.FinishAction(
            error_details=actions.FinishErrorDetails(
                error=RuntimeError(
                    "uh oh I was a command and then I got cancelled because someone"
                    " stopped the run, and now I'm raising this exception because"
                    " of that. Woe is me"
                ),
                error_id="error-id",
                created_at=datetime.now(),
            )
        )
    )
    subject.handle_action(
        actions.HardwareStoppedAction(
            completed_at=sentinel.hardware_stopped_action_completed_at,
            finish_error_details=None,
        )
    )

    assert subject_view.get_status() == EngineStatus.STOPPED
    assert subject_view.get_recovery_target() is None
    assert subject_view.get_error() is None
    assert subject_view.get_all_errors() == [
        expected_error_occurrence_1,
    ]


def test_set_and_get_error_recovery_policy() -> None:
    """Test storage of `ErrorRecoveryPolicy`s."""
    initial_policy = sentinel.initial_policy
    new_policy = sentinel.new_policy
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=initial_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)
    assert subject_view.get_error_recovery_policy() is initial_policy
    subject.handle_action(SetErrorRecoveryPolicyAction(sentinel.new_policy))
    assert subject_view.get_error_recovery_policy() is new_policy


def test_get_state_update_for_false_positive() -> None:
    """Test storage of false-positive state updates."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)

    empty_state_update = StateUpdate()

    assert subject_view.get_state_update_for_false_positive() == empty_state_update

    queue = actions.QueueCommandAction(
        request=commands.CommentCreate(
            params=commands.CommentParams(message=""), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue)
    run = actions.RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run)
    fail = actions.FailCommandAction(
        command_id="command-id-1",
        running_command=subject_view.get("command-id-1"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=DefinedErrorData(
            public=sentinel.public,
            state_update_if_false_positive=sentinel.state_update_if_false_positive,
        ),
        type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
        notes=[],
    )
    subject.handle_action(fail)

    assert (
        subject_view.get_state_update_for_false_positive()
        == sentinel.state_update_if_false_positive
    )

    resume_from_recovery = actions.ResumeFromRecoveryAction(
        state_update=sentinel.some_other_state_update
    )
    subject.handle_action(resume_from_recovery)

    assert subject_view.get_state_update_for_false_positive() == empty_state_update


def test_get_errors_slice_empty() -> None:
    """It should return an empty error list."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    subject_view = CommandView(subject.state)
    result = subject_view.get_errors_slice(cursor=0, length=2)

    assert result == CommandErrorSlice(commands_errors=[], cursor=0, total_length=0)


def test_get_errors_slice() -> None:
    """It should return a slice of all command errors."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )

    subject_view = CommandView(subject.state)

    queue_1 = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(), key="command-key-1"
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    subject.handle_action(queue_1)
    queue_2_setup = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
            key="command-key-2",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-2",
    )
    subject.handle_action(queue_2_setup)
    queue_3_setup = actions.QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
            key="command-key-3",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-3",
    )
    subject.handle_action(queue_3_setup)

    run_2_setup = actions.RunCommandAction(
        command_id="command-id-2",
        started_at=datetime(year=2022, month=2, day=2),
    )
    subject.handle_action(run_2_setup)
    fail_2_setup = actions.FailCommandAction(
        command_id="command-id-2",
        running_command=subject_view.get("command-id-2"),
        error_id="error-id",
        failed_at=datetime(year=2023, month=3, day=3),
        error=errors.ProtocolEngineError(message="oh no"),
        notes=[],
        type=ErrorRecoveryType.CONTINUE_WITH_ERROR,
    )
    subject.handle_action(fail_2_setup)

    result = subject_view.get_errors_slice(cursor=1, length=3)

    assert result == CommandErrorSlice(
        [
            ErrorOccurrence(
                id="error-id",
                createdAt=datetime(2023, 3, 3, 0, 0),
                isDefined=False,
                errorType="ProtocolEngineError",
                errorCode="4000",
                detail="oh no",
                errorInfo={},
                wrappedErrors=[],
            )
        ],
        cursor=0,
        total_length=1,
    )
