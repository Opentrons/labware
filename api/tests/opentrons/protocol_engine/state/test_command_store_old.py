"""Tests for CommandStore.

DEPRECATED: Testing CommandStore independently of CommandView is no longer helpful.
Try to add new tests to test_command_state.py, where they can be tested together,
treating CommandState as a private implementation detail.
"""


from decoy import matchers
import pytest
from datetime import datetime
from typing import Any

from opentrons_shared_data.errors import ErrorCodes

from opentrons.ordered_set import OrderedSet
from opentrons.protocol_engine.actions.actions import RunCommandAction

from opentrons.protocol_engine import commands, errors
from opentrons.protocol_engine.types import DeckType
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.state.commands import (
    CommandState,
    CommandStore,
    RunResult,
    QueueStatus,
)
from opentrons.protocol_engine.state.command_history import CommandEntry

from opentrons.protocol_engine.actions import (
    QueueCommandAction,
    SucceedCommandAction,
    PlayAction,
    PauseAction,
    PauseSource,
    FinishAction,
    FinishErrorDetails,
    StopAction,
    HardwareStoppedAction,
)

from opentrons.protocol_engine.state.command_history import CommandHistory

from .command_fixtures import create_succeeded_command


def _make_config(block_on_door_open: bool = False) -> Config:
    return Config(
        block_on_door_open=block_on_door_open,
        # Choice of robot and deck type is arbitrary.
        robot_type="OT-2 Standard",
        deck_type=DeckType.OT2_STANDARD,
    )


def _placeholder_error_recovery_policy(*args: object, **kwargs: object) -> Any:
    """A placeholder `ErrorRecoveryPolicy` for tests that don't care about it.

    That should be all the tests in this file, since error recovery was added
    after this file was deprecated.
    """
    raise NotImplementedError()


def test_command_queue_and_unqueue() -> None:
    """It should queue on QueueCommandAction and dequeue on RunCommandAction."""
    queue_1 = QueueCommandAction(
        request=commands.WaitForResumeCreate(params=commands.WaitForResumeParams()),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    queue_2 = QueueCommandAction(
        request=commands.WaitForResumeCreate(params=commands.WaitForResumeParams()),
        request_hash=None,
        created_at=datetime(year=2022, month=2, day=2),
        command_id="command-id-2",
    )
    run_1 = RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2021, month=1, day=1),
    )
    run_2 = RunCommandAction(
        command_id="command-id-2",
        started_at=datetime(year=2022, month=2, day=2),
    )
    succeed_2 = SucceedCommandAction(
        command=create_succeeded_command(command_id="command-id-2"),
    )

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(queue_1)
    assert subject.state.command_history.get_queue_ids() == OrderedSet(["command-id-1"])

    subject.handle_action(queue_2)
    assert subject.state.command_history.get_queue_ids() == OrderedSet(
        ["command-id-1", "command-id-2"]
    )

    subject.handle_action(run_2)
    assert subject.state.command_history.get_queue_ids() == OrderedSet(["command-id-1"])

    subject.handle_action(succeed_2)
    subject.handle_action(run_1)
    assert subject.state.command_history.get_queue_ids() == OrderedSet()


def test_setup_command_queue_and_unqueue() -> None:
    """It should queue and dequeue on setup commands."""
    queue_1 = QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    queue_2 = QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
        ),
        request_hash=None,
        created_at=datetime(year=2022, month=2, day=2),
        command_id="command-id-2",
    )
    run_1 = RunCommandAction(
        command_id="command-id-1", started_at=datetime(year=2021, month=1, day=1)
    )
    run_2 = RunCommandAction(
        command_id="command-id-2", started_at=datetime(year=2022, month=2, day=2)
    )
    succeed_2 = SucceedCommandAction(
        command=create_succeeded_command(command_id="command-id-2"),
    )

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(queue_1)
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet(
        ["command-id-1"]
    )

    subject.handle_action(queue_2)
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet(
        ["command-id-1", "command-id-2"]
    )

    subject.handle_action(run_2)
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet(
        ["command-id-1"]
    )

    subject.handle_action(succeed_2)
    subject.handle_action(run_1)
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_setup_queue_action_updates_command_intent() -> None:
    """It should update command source correctly."""
    queue_cmd = QueueCommandAction(
        request=commands.WaitForResumeCreate(
            params=commands.WaitForResumeParams(),
            intent=commands.CommandIntent.SETUP,
            key="command-key-1",
        ),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )

    expected_pause_cmd = commands.WaitForResume(
        id="command-id-1",
        key="command-key-1",
        createdAt=datetime(year=2021, month=1, day=1),
        params=commands.WaitForResumeParams(),
        status=commands.CommandStatus.QUEUED,
        intent=commands.CommandIntent.SETUP,
    )

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(queue_cmd)
    assert subject.state.command_history.get("command-id-1") == CommandEntry(
        index=0, command=expected_pause_cmd
    )


def test_running_command_id() -> None:
    """It should update the running command ID through a command's lifecycle."""
    queue = QueueCommandAction(
        request=commands.WaitForResumeCreate(params=commands.WaitForResumeParams()),
        request_hash=None,
        created_at=datetime(year=2021, month=1, day=1),
        command_id="command-id-1",
    )
    run = RunCommandAction(
        command_id="command-id-1",
        started_at=datetime(year=2021, month=1, day=1),
    )
    succeed = SucceedCommandAction(
        command=create_succeeded_command(command_id="command-id-1"),
    )

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(queue)
    assert subject.state.command_history.get_running_command() is None

    subject.handle_action(run)
    running_command = subject.state.command_history.get_running_command()
    assert running_command is not None
    assert running_command.command.id == "command-id-1"

    subject.handle_action(succeed)
    assert subject.state.command_history.get_running_command() is None


def test_command_store_keeps_commands_in_queue_order() -> None:
    """It should keep commands in the order they were originally enqueued."""
    command_create_1_non_setup = commands.CommentCreate(
        params=commands.CommentParams(message="hello world"),
    )
    command_create_2_setup = commands.CommentCreate(
        params=commands.CommentParams(message="hello world"),
        intent=commands.CommandIntent.SETUP,
    )
    command_create_3_non_setup = commands.CommentCreate(
        params=commands.CommentParams(message="hello world"),
    )

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(
        QueueCommandAction(
            "command-id-1",
            created_at=datetime(year=2021, month=1, day=1),
            request=command_create_1_non_setup,
            request_hash=None,
        )
    )
    assert subject.state.command_history.get_all_ids() == ["command-id-1"]

    subject.handle_action(
        QueueCommandAction(
            "command-id-2",
            created_at=datetime(year=2021, month=1, day=1),
            request=command_create_2_setup,
            request_hash=None,
        )
    )
    assert subject.state.command_history.get_all_ids() == [
        "command-id-1",
        "command-id-2",
    ]

    subject.handle_action(
        QueueCommandAction(
            "command-id-3",
            created_at=datetime(year=2021, month=1, day=1),
            request=command_create_3_non_setup,
            request_hash=None,
        )
    )
    assert subject.state.command_history.get_all_ids() == [
        "command-id-1",
        "command-id-2",
        "command-id-3",
    ]

    # Running and completing commands shouldn't affect the command order.
    subject.handle_action(
        RunCommandAction(
            command_id="command-id-2", started_at=datetime(year=2021, month=1, day=1)
        )
    )
    subject.handle_action(
        SucceedCommandAction(
            command=create_succeeded_command(
                command_id="command-id-2",
            ),
        )
    )
    assert subject.state.command_history.get_all_ids() == [
        "command-id-1",
        "command-id-2",
        "command-id-3",
    ]


@pytest.mark.parametrize("pause_source", PauseSource)
def test_command_store_handles_pause_action(pause_source: PauseSource) -> None:
    """It should clear the running flag on pause."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject.handle_action(PauseAction(source=pause_source))

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=None,
        run_completed_at=None,
        run_started_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )


@pytest.mark.parametrize("pause_source", PauseSource)
def test_command_store_handles_play_action(pause_source: PauseSource) -> None:
    """It should set the running flag on play."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.RUNNING,
        run_result=None,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_handles_finish_action() -> None:
    """It should change to a succeeded state with FinishAction."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))
    subject.handle_action(FinishAction())

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.SUCCEEDED,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_handles_finish_action_with_stopped() -> None:
    """It should change to a stopped state if FinishAction has set_run_status=False."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))
    subject.handle_action(FinishAction(set_run_status=False))

    assert subject.state.run_result == RunResult.STOPPED


@pytest.mark.parametrize(
    ["from_estop", "expected_run_result"],
    [(True, RunResult.FAILED), (False, RunResult.STOPPED)],
)
def test_command_store_handles_stop_action(
    from_estop: bool, expected_run_result: RunResult
) -> None:
    """It should mark the engine as non-gracefully stopped on StopAction."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))
    subject.handle_action(StopAction(from_estop=from_estop))

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=expected_run_result,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=from_estop,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_handles_stop_action_when_awaiting_recovery() -> None:
    """It should mark the engine as non-gracefully stopped on StopAction."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))

    subject.state.queue_status = QueueStatus.AWAITING_RECOVERY

    subject.handle_action(StopAction())

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.STOPPED,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_cannot_restart_after_should_stop() -> None:
    """It should reject a play action after finish."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    subject.handle_action(FinishAction())
    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.SUCCEEDED,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=None,
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_save_started_completed_run_timestamp() -> None:
    """It should save started and completed timestamps."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )
    start_time = datetime(year=2021, month=1, day=1)
    hardware_stopped_time = datetime(year=2022, month=2, day=2)

    subject.handle_action(PlayAction(requested_at=start_time))
    subject.handle_action(
        HardwareStoppedAction(
            completed_at=hardware_stopped_time, finish_error_details=None
        )
    )

    assert subject.state.run_started_at == start_time
    assert subject.state.run_completed_at == hardware_stopped_time


def test_timestamps_are_latched() -> None:
    """It should not change startedAt or completedAt once set."""
    subject = CommandStore(
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
        is_door_open=False,
    )

    play_time_1 = datetime(year=2021, month=1, day=1)
    play_time_2 = datetime(year=2022, month=2, day=2)
    stop_time_1 = datetime(year=2023, month=3, day=3)
    stop_time_2 = datetime(year=2024, month=4, day=4)

    subject.handle_action(PlayAction(requested_at=play_time_1))
    subject.handle_action(PauseAction(source=PauseSource.CLIENT))
    subject.handle_action(PlayAction(requested_at=play_time_2))
    subject.handle_action(
        HardwareStoppedAction(completed_at=stop_time_1, finish_error_details=None)
    )
    subject.handle_action(
        HardwareStoppedAction(completed_at=stop_time_2, finish_error_details=None)
    )

    assert subject.state.run_started_at == play_time_1
    assert subject.state.run_completed_at == stop_time_1


def test_command_store_wraps_unknown_errors() -> None:
    """Fatal errors that are unknown should be wrapped in EnumeratedErrors.

    Fatal errors can come in through FinishActions and HardwareStoppedActions.
    If these are not descendants of EnumeratedError already, they should be
    wrapped in an EnumeratedError before being converted to an ErrorOccurrence.

    The wrapping EnumeratedError should be an UnexpectedProtocolError for errors that happened
    in the main part of the protocol run, or a PythonException for errors that happened elsewhere.
    """
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(
        FinishAction(
            error_details=FinishErrorDetails(
                error=RuntimeError("oh no"),
                error_id="error-id-1",
                created_at=datetime(year=2021, month=1, day=1),
            )
        )
    )

    subject.handle_action(
        HardwareStoppedAction(
            completed_at=datetime(year=2022, month=2, day=2),
            finish_error_details=FinishErrorDetails(
                error=RuntimeError("yikes"),
                error_id="error-id-2",
                created_at=datetime(year=2023, month=3, day=3),
            ),
        )
    )

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.FAILED,
        run_completed_at=datetime(year=2022, month=2, day=2),
        is_door_blocking=False,
        run_error=errors.ErrorOccurrence(
            id="error-id-1",
            createdAt=datetime(year=2021, month=1, day=1),
            # This is wrapped into an UnexpectedProtocolError because it's not
            # enumerated, and it happened in the main part of the run.
            errorType="UnexpectedProtocolError",
            # Unknown errors use the default error code.
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
            # And it has information about what created it.
            detail="oh no",
            wrappedErrors=[
                errors.ErrorOccurrence(
                    id="error-id-1",
                    createdAt=datetime(year=2021, month=1, day=1),
                    errorType="PythonException",
                    detail="RuntimeError: oh no",
                    errorCode="4000",
                    errorInfo={
                        "class": "RuntimeError",
                        "args": "('oh no',)",
                    },
                    wrappedErrors=[],
                )
            ],
        ),
        finish_error=errors.ErrorOccurrence(
            id="error-id-2",
            createdAt=datetime(year=2023, month=3, day=3),
            # This is wrapped into a PythonException because it's not
            # enumerated, and it happened during the post-run cleanup steps.
            errorType="PythonException",
            # Unknown errors use the default error code.
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
            # And it has information about what created it.
            detail="RuntimeError: yikes",
            errorInfo={
                "class": "RuntimeError",
                "args": "('yikes',)",
            },
        ),
        run_started_at=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_preserves_enumerated_errors() -> None:
    """If an error is derived from EnumeratedError, it should be stored as-is."""

    class MyCustomError(errors.ProtocolEngineError):
        def __init__(self, message: str) -> None:
            super().__init__(ErrorCodes.PIPETTE_NOT_PRESENT, message)

    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(
        FinishAction(
            error_details=FinishErrorDetails(
                error=MyCustomError(message="oh no"),
                error_id="error-id-1",
                created_at=datetime(year=2021, month=1, day=1),
            )
        )
    )

    subject.handle_action(
        HardwareStoppedAction(
            completed_at=datetime(year=2022, month=2, day=2),
            finish_error_details=FinishErrorDetails(
                error=MyCustomError(message="yikes"),
                error_id="error-id-2",
                created_at=datetime(year=2023, month=3, day=3),
            ),
        )
    )

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.FAILED,
        run_completed_at=datetime(year=2022, month=2, day=2),
        is_door_blocking=False,
        run_error=errors.ErrorOccurrence(
            id="error-id-1",
            createdAt=datetime(year=2021, month=1, day=1),
            errorType="MyCustomError",
            detail="oh no",
            errorCode=ErrorCodes.PIPETTE_NOT_PRESENT.value.code,
        ),
        finish_error=errors.ErrorOccurrence(
            id="error-id-2",
            createdAt=datetime(year=2023, month=3, day=3),
            errorType="MyCustomError",
            detail="yikes",
            errorCode=ErrorCodes.PIPETTE_NOT_PRESENT.value.code,
        ),
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=None,
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_ignores_stop_after_graceful_finish() -> None:
    """It should no-op on stop if already gracefully finished."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))
    subject.handle_action(FinishAction())
    subject.handle_action(StopAction())

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.SUCCEEDED,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_command_store_ignores_finish_after_non_graceful_stop() -> None:
    """It should no-op on finish if already ungracefully stopped."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    subject.handle_action(PlayAction(requested_at=datetime(year=2021, month=1, day=1)))
    subject.handle_action(StopAction())
    subject.handle_action(FinishAction())

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.STOPPED,
        run_completed_at=None,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=datetime(year=2021, month=1, day=1),
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()


def test_handles_hardware_stopped() -> None:
    """It should mark the hardware as stopped on HardwareStoppedAction."""
    subject = CommandStore(
        is_door_open=False,
        config=_make_config(),
        error_recovery_policy=_placeholder_error_recovery_policy,
    )
    completed_at = datetime(year=2021, day=1, month=1)
    subject.handle_action(
        HardwareStoppedAction(completed_at=completed_at, finish_error_details=None)
    )

    assert subject.state == CommandState(
        command_history=CommandHistory(),
        queue_status=QueueStatus.PAUSED,
        run_result=RunResult.STOPPED,
        run_completed_at=completed_at,
        is_door_blocking=False,
        run_error=None,
        finish_error=None,
        failed_command=None,
        command_error_recovery_types={},
        recovery_target=None,
        run_started_at=None,
        latest_protocol_command_hash=None,
        stopped_by_estop=False,
        error_recovery_policy=matchers.Anything(),
        has_entered_error_recovery=False,
    )
    assert subject.state.command_history.get_running_command() is None
    assert subject.state.command_history.get_all_ids() == []
    assert subject.state.command_history.get_queue_ids() == OrderedSet()
    assert subject.state.command_history.get_setup_queue_ids() == OrderedSet()
