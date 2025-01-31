"""Tests for CommandView.

DEPRECATED: Testing CommandView independently of CommandStore is no longer helpful.
Try to add new tests to test_command_state.py, where they can be tested together,
treating CommandState as a private implementation detail.
"""


import pytest
from contextlib import nullcontext as does_not_raise
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Optional, Sequence, Type, Union

from opentrons.protocol_engine import EngineStatus, commands as cmd, errors
from opentrons.protocol_engine.actions import (
    PlayAction,
    PauseAction,
    PauseSource,
    StopAction,
    QueueCommandAction,
)
from opentrons.protocol_engine.actions.actions import ResumeFromRecoveryAction

from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.state.commands import (
    # todo(mm, 2024-10-24): Avoid testing internal implementation details like
    # _RecoveryTargetInfo. See note above about porting to test_command_state.py.
    _RecoveryTargetInfo,
    CommandState,
    CommandView,
    CommandSlice,
    CommandPointer,
    RunResult,
    QueueStatus,
)

from opentrons.protocol_engine.state.command_history import CommandEntry, CommandHistory

from opentrons.protocol_engine.errors import ProtocolCommandFailedError, ErrorOccurrence

from opentrons_shared_data.errors.codes import ErrorCodes

from opentrons.protocol_engine.state.update_types import StateUpdate

from .command_fixtures import (
    create_queued_command,
    create_running_command,
    create_failed_command,
    create_succeeded_command,
)


def _placeholder_error_recovery_policy(*args: object, **kwargs: object) -> Any:
    """A placeholder `ErrorRecoveryPolicy` for tests that don't care about it.

    That should be all the tests in this file, since error recovery was added
    after this file was deprecated.
    """
    raise NotImplementedError()


def get_command_view(  # noqa: C901
    queue_status: QueueStatus = QueueStatus.SETUP,
    run_completed_at: Optional[datetime] = None,
    run_started_at: Optional[datetime] = None,
    is_door_blocking: bool = False,
    run_result: Optional[RunResult] = None,
    running_command_id: Optional[str] = None,
    queued_command_ids: Sequence[str] = (),
    queued_setup_command_ids: Sequence[str] = (),
    queued_fixit_command_ids: Sequence[str] = (),
    run_error: Optional[errors.ErrorOccurrence] = None,
    failed_command: Optional[CommandEntry] = None,
    command_error_recovery_types: Optional[Dict[str, ErrorRecoveryType]] = None,
    recovery_target_command_id: Optional[str] = None,
    finish_error: Optional[errors.ErrorOccurrence] = None,
    commands: Sequence[cmd.Command] = (),
    latest_command_hash: Optional[str] = None,
    has_entered_error_recovery: bool = False,
) -> CommandView:
    """Get a command view test subject."""
    command_history = CommandHistory()

    if running_command_id:
        command_history._set_running_command_id(running_command_id)
    # TODO(tz, 8-21-24): consolidate all quques into 1 and use append_queued_command
    if queued_command_ids:
        for command_id in queued_command_ids:
            command_history._add_to_queue(command_id)
    if queued_setup_command_ids:
        for command_id in queued_setup_command_ids:
            command_history._add_to_setup_queue(command_id)
    if queued_fixit_command_ids:
        for command_id in queued_fixit_command_ids:
            command_history._add_to_fixit_queue(command_id)
    if commands:
        for index, command in enumerate(commands):
            command_history._add(
                command_id=command.id,
                command_entry=CommandEntry(index=index, command=command),
            )

    state = CommandState(
        command_history=command_history,
        queue_status=queue_status,
        run_completed_at=run_completed_at,
        is_door_blocking=is_door_blocking,
        run_result=run_result,
        run_error=run_error,
        finish_error=finish_error,
        failed_command=failed_command,
        command_error_recovery_types=command_error_recovery_types or {},
        recovery_target=_RecoveryTargetInfo(
            command_id=recovery_target_command_id,
            state_update_if_false_positive=StateUpdate(),
        )
        if recovery_target_command_id is not None
        else None,
        run_started_at=run_started_at,
        latest_protocol_command_hash=latest_command_hash,
        stopped_by_estop=False,
        has_entered_error_recovery=has_entered_error_recovery,
        error_recovery_policy=_placeholder_error_recovery_policy,
    )

    return CommandView(state=state)


def test_get_by_id() -> None:
    """It should get a command by ID from state."""
    command = create_succeeded_command(command_id="command-id")
    subject = get_command_view(commands=[command])

    assert subject.get("command-id") == command


def test_get_command_bad_id() -> None:
    """It should raise if a requested command ID isn't in state."""
    command = create_succeeded_command(command_id="command-id")
    subject = get_command_view(commands=[command])

    with pytest.raises(errors.CommandDoesNotExistError):
        subject.get("asdfghjkl")


def test_get_all() -> None:
    """It should get all the commands from the state."""
    command_1 = create_succeeded_command(command_id="command-id-1")
    command_2 = create_running_command(command_id="command-id-2")
    command_3 = create_queued_command(command_id="command-id-3")

    subject = get_command_view(commands=[command_1, command_2, command_3])

    assert subject.get_all() == [command_1, command_2, command_3]


def test_get_next_to_execute_returns_first_queued() -> None:
    """It should return the next queued command ID."""
    subject = get_command_view(
        queue_status=QueueStatus.RUNNING,
        queued_command_ids=["command-id-1", "command-id-2"],
        queued_fixit_command_ids=["fixit-id-1", "fixit-id-2"],
    )

    assert subject.get_next_to_execute() == "command-id-1"


@pytest.mark.parametrize(
    "queue_status",
    [QueueStatus.SETUP, QueueStatus.RUNNING],
)
def test_get_next_to_execute_prioritizes_setup_command_queue(
    queue_status: QueueStatus,
) -> None:
    """It should prioritize setup command queue over protocol command queue."""
    subject = get_command_view(
        queue_status=queue_status,
        queued_command_ids=["command-id-1", "command-id-2"],
        queued_setup_command_ids=["setup-command-id"],
    )

    assert subject.get_next_to_execute() == "setup-command-id"


@pytest.mark.parametrize(
    "queue_status",
    [QueueStatus.AWAITING_RECOVERY],
)
def test_get_next_to_execute_prioritizes_fixit_command_queue(
    queue_status: QueueStatus,
) -> None:
    """It should prioritize fixit command queue over protocol command queue."""
    subject = get_command_view(
        queue_status=queue_status,
        queued_command_ids=["command-id-1", "command-id-2"],
        queued_setup_command_ids=["setup-command-id"],
        queued_fixit_command_ids=["fixit-1", "fixit-2"],
    )

    assert subject.get_next_to_execute() == "fixit-1"


def test_get_next_to_execute_returns_none_when_no_queued() -> None:
    """It should return None if there are no queued commands."""
    subject = get_command_view(
        queue_status=QueueStatus.RUNNING,
        queued_command_ids=[],
    )

    assert subject.get_next_to_execute() is None


@pytest.mark.parametrize("queue_status", [QueueStatus.SETUP, QueueStatus.PAUSED])
def test_get_next_to_execute_returns_none_if_not_running(
    queue_status: QueueStatus,
) -> None:
    """It should not return protocol commands if the engine is not running."""
    subject = get_command_view(
        queue_status=queue_status,
        queued_setup_command_ids=[],
        queued_command_ids=["command-id-1", "command-id-2"],
    )
    result = subject.get_next_to_execute()

    assert result is None


def test_get_next_to_execute_returns_no_commands_if_paused() -> None:
    """It should not return any type of command if the engine is paused."""
    subject = get_command_view(
        queue_status=QueueStatus.PAUSED,
        queued_setup_command_ids=["setup-id-1", "setup-id-2"],
        queued_command_ids=["command-id-1", "command-id-2"],
        queued_fixit_command_ids=["fixit-id-1", "fixit-id-2"],
    )
    result = subject.get_next_to_execute()

    assert result is None


def test_get_next_to_execute_returns_no_commands_if_awaiting_recovery_no_fixit() -> (
    None
):
    """It should not return any type of command if the engine is awaiting-recovery."""
    subject = get_command_view(
        queue_status=QueueStatus.AWAITING_RECOVERY,
        queued_setup_command_ids=["setup-id-1", "setup-id-2"],
        queued_command_ids=["command-id-1", "command-id-2"],
        queued_fixit_command_ids=[],
    )
    result = subject.get_next_to_execute()

    assert result is None


@pytest.mark.parametrize("run_result", RunResult)
def test_get_next_to_execute_raises_if_stopped(run_result: RunResult) -> None:
    """It should raise if an engine stop has been requested."""
    subject = get_command_view(run_result=run_result)

    with pytest.raises(errors.RunStoppedError):
        subject.get_next_to_execute()


def test_get_is_running_queue() -> None:
    """It should be able to get if the engine is running."""
    subject = get_command_view(queue_status=QueueStatus.PAUSED)
    assert subject.get_is_running() is False

    subject = get_command_view(queue_status=QueueStatus.RUNNING)
    assert subject.get_is_running() is True

    subject = get_command_view(queue_status=QueueStatus.SETUP)
    assert subject.get_is_running() is False


def test_get_command_is_final() -> None:
    """It should be able to tell if a command is complete."""
    completed_command = create_succeeded_command(command_id="completed-command-id")
    failed_command = create_failed_command(command_id="failed-command-id")
    running_command = create_running_command(command_id="running-command-id")
    pending_command = create_queued_command(command_id="queued-command-id")

    subject = get_command_view(
        commands=[completed_command, failed_command, running_command, pending_command]
    )

    assert subject.get_command_is_final("completed-command-id") is True
    assert subject.get_command_is_final("failed-command-id") is True
    assert subject.get_command_is_final("running-command-id") is False
    assert subject.get_command_is_final("queued-command-id") is False


@pytest.mark.parametrize("run_result", RunResult)
def test_get_command_is_final_when_run_has_result(run_result: RunResult) -> None:
    """Queued commands are final when the run will never execute any more commands."""
    completed_command = create_succeeded_command(command_id="completed-command-id")
    failed_command = create_failed_command(command_id="failed-command-id")
    running_command = create_running_command(command_id="running-command-id")
    pending_command = create_queued_command(command_id="queued-command-id")

    subject = get_command_view(
        commands=[completed_command, failed_command, running_command, pending_command],
        run_result=run_result,
    )

    assert subject.get_command_is_final("completed-command-id") is True
    assert subject.get_command_is_final("failed-command-id") is True
    assert subject.get_command_is_final("running-command-id") is False
    assert subject.get_command_is_final("queued-command-id") is True


def test_get_all_commands_final() -> None:
    """It should return True if no commands queued or running."""
    running_command = create_running_command(command_id="running-command-id")

    subject = get_command_view(queued_command_ids=[])
    assert subject.get_all_commands_final() is True

    subject = get_command_view(queued_command_ids=["queued-command-id"])
    assert subject.get_all_commands_final() is False

    subject = get_command_view(
        queued_command_ids=[],
        running_command_id="running-command-id",
        commands=[running_command],
    )
    assert subject.get_all_commands_final() is False


def test_raise_fatal_command_error() -> None:
    """It should raise the fatal command error."""
    completed_command = create_succeeded_command(command_id="command-id-1")
    failed_command = create_failed_command(
        command_id="command-id-2",
        error=errors.ErrorOccurrence(
            id="some-error-id",
            errorType="PrettyBadError",
            createdAt=datetime(year=2021, month=1, day=1),
            detail="Oh no",
            errorCode="4321",
        ),
    )

    subject = get_command_view(
        queued_command_ids=[],
        running_command_id=None,
        failed_command=CommandEntry(index=1, command=failed_command),
        commands=[completed_command, failed_command],
    )

    with pytest.raises(ProtocolCommandFailedError):
        subject.raise_fatal_command_error()


def test_raise_fatal_command_error_tolerates_failed_setup_commands() -> None:
    """It should not call setup command fatal."""
    completed_command = create_succeeded_command(command_id="command-id-1")
    failed_command = create_failed_command(
        command_id="command-id-2",
        intent=cmd.CommandIntent.SETUP,
        error=errors.ErrorOccurrence(
            id="some-error-id",
            errorType="PrettyBadError",
            createdAt=datetime(year=2021, month=1, day=1),
            detail="Oh no",
            errorCode="4321",
        ),
    )

    subject = get_command_view(
        queued_command_ids=[],
        running_command_id=None,
        commands=[completed_command, failed_command],
    )

    subject.raise_fatal_command_error()  # Should not raise.


def test_get_is_stopped() -> None:
    """It should return true if stop requested and no command running."""
    subject = get_command_view(run_completed_at=None)
    assert subject.get_is_stopped() is False

    subject = get_command_view(run_completed_at=datetime(year=2021, day=1, month=1))
    assert subject.get_is_stopped() is True


def test_get_is_started() -> None:
    """It should return true if start requested and no command running."""
    subject = get_command_view(run_started_at=None)
    assert subject.has_been_played() is False

    subject = get_command_view(run_started_at=datetime(year=2021, day=1, month=1))
    assert subject.has_been_played() is True


def test_get_is_terminal() -> None:
    """It should return true if run is in a terminal state."""
    subject = get_command_view(run_result=None)
    assert subject.get_is_terminal() is False

    subject = get_command_view(run_result=RunResult.SUCCEEDED)
    assert subject.get_is_terminal() is True


class ActionAllowedSpec(NamedTuple):
    """Spec data to test CommandView.validate_action_allowed."""

    subject: CommandView
    action: Union[
        PlayAction,
        PauseAction,
        StopAction,
        QueueCommandAction,
        ResumeFromRecoveryAction,
    ]
    expected_error: Optional[Type[Exception]]


action_allowed_specs: List[ActionAllowedSpec] = [
    # play is allowed if the engine is idle
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.SETUP),
        action=PlayAction(requested_at=datetime(year=2021, month=1, day=1)),
        expected_error=None,
    ),
    # play is allowed if engine is idle, even if door is blocking
    ActionAllowedSpec(
        subject=get_command_view(is_door_blocking=True, queue_status=QueueStatus.SETUP),
        action=PlayAction(requested_at=datetime(year=2021, month=1, day=1)),
        expected_error=None,
    ),
    # play is allowed if the engine is paused
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.PAUSED),
        action=PlayAction(requested_at=datetime(year=2021, month=1, day=1)),
        expected_error=None,
    ),
    # pause is allowed if the engine is running
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.RUNNING),
        action=PauseAction(source=PauseSource.CLIENT),
        expected_error=None,
    ),
    # stop is usually allowed
    ActionAllowedSpec(
        subject=get_command_view(),
        action=StopAction(),
        expected_error=None,
    ),
    # queue command is allowed during setup
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.SETUP),
        action=QueueCommandAction(
            request=cmd.HomeCreate(params=cmd.HomeParams()),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=None,
    ),
    # play is disallowed if paused and door is blocking
    ActionAllowedSpec(
        subject=get_command_view(
            is_door_blocking=True, queue_status=QueueStatus.PAUSED
        ),
        action=PlayAction(requested_at=datetime(year=2021, month=1, day=1)),
        expected_error=errors.RobotDoorOpenError,
    ),
    # play is disallowed if stop has been requested
    ActionAllowedSpec(
        subject=get_command_view(run_result=RunResult.STOPPED),
        action=PlayAction(requested_at=datetime(year=2021, month=1, day=1)),
        expected_error=errors.RunStoppedError,
    ),
    # pause is disallowed if stop has been requested
    ActionAllowedSpec(
        subject=get_command_view(run_result=RunResult.STOPPED),
        action=PauseAction(source=PauseSource.CLIENT),
        expected_error=errors.RunStoppedError,
    ),
    # pause is disallowed if engine is not running
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.SETUP),
        action=PauseAction(source=PauseSource.CLIENT),
        expected_error=errors.PauseNotAllowedError,
    ),
    # pause is disallowed if engine is already paused
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.PAUSED),
        action=PauseAction(source=PauseSource.CLIENT),
        expected_error=errors.PauseNotAllowedError,
    ),
    # stop is disallowed if stop has already been requested
    ActionAllowedSpec(
        subject=get_command_view(run_result=RunResult.STOPPED),
        action=StopAction(),
        expected_error=errors.RunStoppedError,
    ),
    # queue command action is disallowed if stop has already been requested
    ActionAllowedSpec(
        subject=get_command_view(run_result=RunResult.STOPPED),
        action=QueueCommandAction(
            request=cmd.HomeCreate(params=cmd.HomeParams()),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=errors.RunStoppedError,
    ),
    # queue setup command is disallowed if paused
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.PAUSED),
        action=QueueCommandAction(
            request=cmd.HomeCreate(
                params=cmd.HomeParams(),
                intent=cmd.CommandIntent.SETUP,
            ),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=errors.SetupCommandNotAllowedError,
    ),
    # queue setup command is disallowed if running
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.RUNNING),
        action=QueueCommandAction(
            request=cmd.HomeCreate(
                params=cmd.HomeParams(),
                intent=cmd.CommandIntent.SETUP,
            ),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=errors.SetupCommandNotAllowedError,
    ),
    # fixit command is disallowed if not in recovery mode
    ActionAllowedSpec(
        subject=get_command_view(queue_status=QueueStatus.RUNNING),
        action=QueueCommandAction(
            request=cmd.HomeCreate(
                params=cmd.HomeParams(),
                intent=cmd.CommandIntent.FIXIT,
            ),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=errors.FixitCommandNotAllowedError,
    ),
    ActionAllowedSpec(
        subject=get_command_view(
            queue_status=QueueStatus.AWAITING_RECOVERY,
            failed_command=CommandEntry(
                index=2,
                command=create_failed_command(
                    command_id="command-id-3",
                    error=ErrorOccurrence(
                        id="error-id",
                        errorType="ProtocolEngineError",
                        createdAt=datetime(year=2022, month=2, day=2),
                        detail="oh no",
                        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
                    ),
                ),
            ),
        ),
        action=QueueCommandAction(
            request=cmd.HomeCreate(
                params=cmd.HomeParams(),
                intent=cmd.CommandIntent.FIXIT,
            ),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=None,
    ),
    # resume from recovery not allowed if fixit commands in queue
    ActionAllowedSpec(
        subject=get_command_view(
            queue_status=QueueStatus.AWAITING_RECOVERY,
            queued_fixit_command_ids=["fixit-id-1", "fixit-id-2"],
            failed_command=CommandEntry(
                index=2,
                command=create_failed_command(
                    command_id="command-id-3",
                    error=ErrorOccurrence(
                        id="error-id",
                        errorType="ProtocolEngineError",
                        createdAt=datetime(year=2022, month=2, day=2),
                        detail="oh no",
                        errorCode=ErrorCodes.GENERAL_ERROR.value.code,
                    ),
                ),
            ),
        ),
        action=ResumeFromRecoveryAction(StateUpdate()),
        expected_error=errors.ResumeFromRecoveryNotAllowedError,
    ),
    ActionAllowedSpec(
        subject=get_command_view(
            queue_status=QueueStatus.AWAITING_RECOVERY_PAUSED, is_door_blocking=True
        ),
        action=QueueCommandAction(
            request=cmd.unsafe.UnsafeUngripLabwareCreate(
                params=cmd.unsafe.UnsafeUngripLabwareParams(),
                intent=cmd.CommandIntent.FIXIT,
            ),
            request_hash=None,
            command_id="command-id",
            created_at=datetime(year=2021, month=1, day=1),
        ),
        expected_error=None,
    ),
]


@pytest.mark.parametrize(ActionAllowedSpec._fields, action_allowed_specs)
def test_validate_action_allowed(
    subject: CommandView,
    action: Union[PlayAction, PauseAction, StopAction],
    expected_error: Optional[Type[Exception]],
) -> None:
    """It should validate allowed play/pause/stop actions."""
    expectation = pytest.raises(expected_error) if expected_error else does_not_raise()

    with expectation:
        result = subject.validate_action_allowed(action)

    if expected_error is None:
        assert result == action


def test_get_errors() -> None:
    """It should be able to pull all ErrorOccurrences from the store."""
    run_error = errors.ErrorOccurrence(
        id="error-1",
        createdAt=datetime(year=2021, month=1, day=1),
        errorType="ReallyBadError",
        detail="things could not get worse",
        errorCode="4321",
    )
    finish_error = errors.ErrorOccurrence(
        id="error-2",
        createdAt=datetime(year=2022, month=2, day=2),
        errorType="EvenWorseError",
        detail="things got worse",
        errorCode="1234",
    )

    no_error_subject = get_command_view()
    assert no_error_subject.get_error() is None

    just_run_error_subject = get_command_view(run_error=run_error)
    assert just_run_error_subject.get_error() == run_error

    just_finish_error_subject = get_command_view(finish_error=finish_error)
    assert just_finish_error_subject.get_error() == finish_error

    both_errors_subject = get_command_view(
        run_error=run_error, finish_error=finish_error
    )
    both_errors_result = both_errors_subject.get_error()
    assert both_errors_result is not None
    assert both_errors_result.wrappedErrors == [run_error, finish_error]


class GetStatusSpec(NamedTuple):
    """Spec data for get_status tests."""

    subject: CommandView
    expected_status: EngineStatus


get_status_specs: List[GetStatusSpec] = [
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.RUNNING,
            running_command_id=None,
            queued_command_ids=[],
        ),
        expected_status=EngineStatus.RUNNING,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.PAUSED,
            run_result=RunResult.SUCCEEDED,
            run_completed_at=None,
        ),
        expected_status=EngineStatus.FINISHING,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.PAUSED,
            run_result=RunResult.FAILED,
            run_completed_at=None,
        ),
        expected_status=EngineStatus.FINISHING,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.PAUSED,
        ),
        expected_status=EngineStatus.PAUSED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            run_result=RunResult.FAILED,
            run_completed_at=datetime(year=2021, day=1, month=1),
        ),
        expected_status=EngineStatus.FAILED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            run_result=RunResult.SUCCEEDED,
            run_completed_at=datetime(year=2021, day=1, month=1),
            finish_error=errors.ErrorOccurrence(
                id="finish-error-id",
                errorType="finish-error-type",
                createdAt=datetime(year=2021, day=1, month=1),
                detail="finish-error-detail",
            ),
        ),
        expected_status=EngineStatus.FAILED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            run_result=RunResult.SUCCEEDED,
            run_completed_at=datetime(year=2021, day=1, month=1),
        ),
        expected_status=EngineStatus.SUCCEEDED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            run_result=RunResult.STOPPED,
            run_completed_at=None,
        ),
        expected_status=EngineStatus.STOP_REQUESTED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            run_result=RunResult.STOPPED,
            run_completed_at=datetime(year=2021, day=1, month=1),
        ),
        expected_status=EngineStatus.STOPPED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.PAUSED,
            is_door_blocking=True,
        ),
        expected_status=EngineStatus.BLOCKED_BY_OPEN_DOOR,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.SETUP,
            is_door_blocking=True,
        ),
        expected_status=EngineStatus.IDLE,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.PAUSED,
            is_door_blocking=False,
            run_completed_at=datetime(year=2021, day=1, month=1),
        ),
        expected_status=EngineStatus.PAUSED,
    ),
    GetStatusSpec(
        subject=get_command_view(
            queue_status=QueueStatus.SETUP,
            running_command_id="command-id",
            queued_command_ids=["command-id-1"],
            queued_setup_command_ids=["command-id-2"],
        ),
        expected_status=EngineStatus.IDLE,
    ),
]


@pytest.mark.parametrize(GetStatusSpec._fields, get_status_specs)
def test_get_status(subject: CommandView, expected_status: EngineStatus) -> None:
    """It should set a status according to the command queue and running flag."""
    assert subject.get_status() == expected_status


class GetOkayToClearSpec(NamedTuple):
    """Spec data for get_status tests."""

    subject: CommandView
    expected_is_okay: bool


get_okay_to_clear_specs: List[GetOkayToClearSpec] = [
    GetOkayToClearSpec(
        # Protocol not played yet, no commands queued or ran yet
        subject=get_command_view(
            queue_status=QueueStatus.SETUP,
            running_command_id=None,
            queued_command_ids=[],
            queued_setup_command_ids=[],
        ),
        expected_is_okay=True,
    ),
    GetOkayToClearSpec(
        # Protocol commands are queued but not played yet,
        # no setup commands queued or running
        subject=get_command_view(
            queue_status=QueueStatus.SETUP,
            running_command_id=None,
            queued_setup_command_ids=[],
            queued_command_ids=["command-id"],
            commands=[create_queued_command(command_id="command-id")],
        ),
        expected_is_okay=True,
    ),
    GetOkayToClearSpec(
        # Protocol not played yet, setup commands are queued
        subject=get_command_view(
            queue_status=QueueStatus.SETUP,
            running_command_id=None,
            queued_setup_command_ids=["command-id"],
            commands=[create_queued_command(command_id="command-id")],
        ),
        expected_is_okay=False,
    ),
    GetOkayToClearSpec(
        # Protocol is stopped
        subject=get_command_view(
            run_completed_at=datetime(year=2021, day=1, month=1),
        ),
        expected_is_okay=True,
    ),
]


@pytest.mark.parametrize(GetOkayToClearSpec._fields, get_okay_to_clear_specs)
def test_get_okay_to_clear(subject: CommandView, expected_is_okay: bool) -> None:
    """It should report whether an engine is ok to clear."""
    assert subject.get_is_okay_to_clear() is expected_is_okay


def test_get_running_command_id() -> None:
    """It should return the running command ID."""
    running_command = create_running_command(command_id="command-id")

    subject_with_running = get_command_view(
        running_command_id="command-id", commands=[running_command]
    )
    assert subject_with_running.get_running_command_id() == "command-id"

    subject_without_running = get_command_view(running_command_id=None)
    assert subject_without_running.get_running_command_id() is None


def test_get_current() -> None:
    """It should return the "current" command."""
    subject = get_command_view(
        running_command_id=None,
        queued_command_ids=[],
    )
    assert subject.get_current() is None

    command = create_running_command(
        "command-id",
        command_key="command-key",
        created_at=datetime(year=2021, month=1, day=1),
    )
    subject = get_command_view(
        running_command_id="command-id",
        queued_command_ids=[],
        commands=[command],
    )
    assert subject.get_current() == CommandPointer(
        index=0,
        command_id="command-id",
        command_key="command-key",
        created_at=datetime(year=2021, month=1, day=1),
    )

    command_1 = create_succeeded_command(
        "command-id-1",
        command_key="key-1",
        created_at=datetime(year=2021, month=1, day=1),
    )
    command_2 = create_succeeded_command(
        "command-id-2",
        command_key="key-2",
        created_at=datetime(year=2022, month=2, day=2),
    )
    subject = get_command_view(commands=[command_1, command_2])
    subject._state.command_history._set_most_recently_completed_command_id(command_1.id)

    assert subject.get_current() == CommandPointer(
        index=1,
        command_id="command-id-2",
        command_key="key-2",
        created_at=datetime(year=2022, month=2, day=2),
    )

    command_1 = create_succeeded_command(
        "command-id-1",
        command_key="key-1",
        created_at=datetime(year=2021, month=1, day=1),
    )
    command_2 = create_failed_command(
        "command-id-2",
        command_key="key-2",
        created_at=datetime(year=2022, month=2, day=2),
    )
    subject = get_command_view(commands=[command_1, command_2])
    subject._state.command_history._set_most_recently_completed_command_id(command_1.id)

    assert subject.get_current() == CommandPointer(
        index=1,
        command_id="command-id-2",
        command_key="key-2",
        created_at=datetime(year=2022, month=2, day=2),
    )


def test_get_slice_empty() -> None:
    """It should return a slice from the tail if no current command."""
    subject = get_command_view(commands=[])
    result = subject.get_slice(cursor=0, length=2, include_fixit_commands=True)

    assert result == CommandSlice(commands=[], cursor=0, total_length=0)


def test_get_slice() -> None:
    """It should return a slice of all commands."""
    command_1 = create_succeeded_command(command_id="command-id-1")
    command_2 = create_running_command(command_id="command-id-2")
    command_3 = create_queued_command(command_id="command-id-3")
    command_4 = create_queued_command(command_id="command-id-4")

    subject = get_command_view(commands=[command_1, command_2, command_3, command_4])

    result = subject.get_slice(cursor=1, length=3, include_fixit_commands=True)

    assert result == CommandSlice(
        commands=[command_2, command_3, command_4],
        cursor=1,
        total_length=4,
    )

    result = subject.get_slice(cursor=-3, length=10, include_fixit_commands=True)

    assert result == CommandSlice(
        commands=[command_1, command_2, command_3, command_4],
        cursor=0,
        total_length=4,
    )


def test_get_slice_default_cursor_no_current() -> None:
    """It should return a slice from the tail if no current command."""
    command_1 = create_succeeded_command(command_id="command-id-1")
    command_2 = create_succeeded_command(command_id="command-id-2")
    command_3 = create_succeeded_command(command_id="command-id-3")
    command_4 = create_succeeded_command(command_id="command-id-4")

    subject = get_command_view(commands=[command_1, command_2, command_3, command_4])

    result = subject.get_slice(cursor=None, length=3, include_fixit_commands=True)

    assert result == CommandSlice(
        commands=[command_2, command_3, command_4],
        cursor=1,
        total_length=4,
    )


def test_get_slice_default_cursor_failed_command() -> None:
    """It should return a slice from the last executed command."""
    command_1 = create_failed_command(command_id="command-id-1")
    command_2 = create_failed_command(command_id="command-id-2")
    command_3 = create_failed_command(
        command_id="command-id-3",
        error=ErrorOccurrence(
            id="error-id",
            errorType="ProtocolEngineError",
            createdAt=datetime(year=2022, month=2, day=2),
            detail="oh no",
            errorCode=ErrorCodes.GENERAL_ERROR.value.code,
        ),
    )
    command_4 = create_failed_command(command_id="command-id-4")

    subject = get_command_view(
        commands=[command_1, command_2, command_3, command_4],
        run_result=RunResult.FAILED,
        failed_command=CommandEntry(index=2, command=command_3),
    )

    result = subject.get_slice(cursor=None, length=3, include_fixit_commands=True)

    assert result == CommandSlice(
        commands=[command_3, command_4],
        cursor=2,
        total_length=4,
    )


def test_get_slice_default_cursor_running() -> None:
    """It should select a cursor based on the running command, if present."""
    command_1 = create_succeeded_command(command_id="command-id-1")
    command_2 = create_succeeded_command(command_id="command-id-2")
    command_3 = create_running_command(command_id="command-id-3")
    command_4 = create_queued_command(command_id="command-id-4")
    command_5 = create_queued_command(command_id="command-id-5")

    subject = get_command_view(
        commands=[command_1, command_2, command_3, command_4, command_5],
        running_command_id="command-id-3",
    )

    result = subject.get_slice(cursor=None, length=2, include_fixit_commands=True)

    assert result == CommandSlice(
        commands=[command_3, command_4],
        cursor=2,
        total_length=5,
    )


def test_get_slice_without_fixit() -> None:
    """It should select a cursor based on the running command, if present."""
    command_1 = create_succeeded_command(command_id="command-id-1")
    command_2 = create_succeeded_command(command_id="command-id-2")
    command_3 = create_running_command(command_id="command-id-3")
    command_4 = create_queued_command(command_id="command-id-4")
    command_5 = create_queued_command(command_id="command-id-5")
    command_6 = create_queued_command(
        command_id="fixit-id-1", intent=cmd.CommandIntent.FIXIT
    )
    command_7 = create_queued_command(
        command_id="fixit-id-2", intent=cmd.CommandIntent.FIXIT
    )

    subject = get_command_view(
        commands=[
            command_1,
            command_2,
            command_3,
            command_4,
            command_5,
            command_6,
            command_7,
        ],
        queued_command_ids=[
            "command-id-1",
            "command-id-2",
            "command-id-3",
            "command-id-4",
            "command-id-5",
            "fixit-id-1",
            "fixit-id-2",
        ],
        queued_fixit_command_ids=["fixit-id-1", "fixit-id-2"],
    )

    result = subject.get_slice(cursor=None, length=7, include_fixit_commands=False)

    assert result == CommandSlice(
        commands=[command_1, command_2, command_3, command_4, command_5],
        cursor=0,
        total_length=5,
    )
