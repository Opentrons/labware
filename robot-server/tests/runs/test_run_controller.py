"""Tests for RunController."""
from typing import List

import pytest
from datetime import datetime
from decoy import Decoy, matchers

from opentrons.protocol_engine import (
    EngineStatus,
    StateSummary,
    commands as pe_commands,
    errors as pe_errors,
)
from opentrons.protocol_engine.types import (
    RunTimeParameter,
    BooleanParameter,
    CommandAnnotation,
    SecondOrderCommandAnnotation,
)
from opentrons.protocol_runner import RunResult

from robot_server.service.notifications import RunsPublisher, MaintenanceRunsPublisher
from robot_server.service.task_runner import TaskRunner
from robot_server.runs.action_models import RunAction, RunActionType
from robot_server.runs.run_orchestrator_store import RunOrchestratorStore
from robot_server.runs.run_store import RunStore
from robot_server.runs.run_controller import RunController, RunActionNotAllowedError


@pytest.fixture
def mock_run_orchestrator_store(decoy: Decoy, run_id: str) -> RunOrchestratorStore:
    """Get a mock EngineStore."""
    mock = decoy.mock(cls=RunOrchestratorStore)
    decoy.when(mock.current_run_id).then_return(run_id)
    return mock


@pytest.fixture
def mock_run_store(decoy: Decoy) -> RunStore:
    """Get a mock RunStore."""
    return decoy.mock(cls=RunStore)


@pytest.fixture
def mock_task_runner(decoy: Decoy) -> TaskRunner:
    """Get a mock background TaskRunner."""
    return decoy.mock(cls=TaskRunner)


@pytest.fixture()
def mock_runs_publisher(decoy: Decoy) -> RunsPublisher:
    """Get a mock RunsPublisher."""
    return decoy.mock(cls=RunsPublisher)


@pytest.fixture()
def mock_maintenance_runs_publisher(decoy: Decoy) -> MaintenanceRunsPublisher:
    """Get a mock RunsPublisher."""
    return decoy.mock(cls=MaintenanceRunsPublisher)


@pytest.fixture
def run_id() -> str:
    """A run identifier value."""
    return "hello world"


@pytest.fixture
def engine_state_summary() -> StateSummary:
    """Get a StateSummary value object."""
    return StateSummary(
        status=EngineStatus.IDLE,
        errors=[],
        labware=[],
        labwareOffsets=[],
        pipettes=[],
        modules=[],
        liquids=[],
        wells=[],
        files=[],
        hasEverEnteredErrorRecovery=False,
    )


@pytest.fixture
def run_time_parameters() -> List[RunTimeParameter]:
    """Get a RunTimeParameter list."""
    return [
        BooleanParameter(
            displayName="Display Name",
            variableName="variable_name",
            value=False,
            default=True,
        )
    ]


@pytest.fixture
def command_annotations() -> List[CommandAnnotation]:
    """Get a CommandAnnotation list."""
    return [
        SecondOrderCommandAnnotation(
            commandKeys=["abc"],
            params={"abc": "123"},
            machineReadableName="hello world",
        )
    ]


@pytest.fixture
def protocol_commands() -> List[pe_commands.Command]:
    """Get a StateSummary value object."""
    return [
        pe_commands.WaitForResume.model_construct(  # type: ignore[call-arg]
            params=pe_commands.WaitForResumeParams(message="hello world")
        )
    ]


@pytest.fixture
def subject(
    run_id: str,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    mock_task_runner: TaskRunner,
    mock_runs_publisher: RunsPublisher,
    mock_maintenance_runs_publisher: MaintenanceRunsPublisher,
) -> RunController:
    """Get a RunController test subject."""
    return RunController(
        run_id=run_id,
        run_orchestrator_store=mock_run_orchestrator_store,
        run_store=mock_run_store,
        task_runner=mock_task_runner,
        runs_publisher=mock_runs_publisher,
        maintenance_runs_publisher=mock_maintenance_runs_publisher,
    )


async def test_create_play_action_to_resume(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    run_id: str,
    subject: RunController,
) -> None:
    """It should resume a run."""
    decoy.when(mock_run_orchestrator_store.run_was_started()).then_return(True)

    result = subject.create_action(
        action_id="some-action-id",
        action_type=RunActionType.PLAY,
        created_at=datetime(year=2021, month=1, day=1),
        action_payload=[],
    )

    assert result == RunAction(
        id="some-action-id",
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2021, month=1, day=1),
    )

    decoy.verify(mock_run_store.insert_action(run_id, result), times=1)
    decoy.verify(mock_run_orchestrator_store.play(), times=1)
    decoy.verify(await mock_run_orchestrator_store.run(deck_configuration=[]), times=0)


async def test_create_play_action_to_start(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    mock_task_runner: TaskRunner,
    mock_runs_publisher: RunsPublisher,
    mock_maintenance_runs_publisher: MaintenanceRunsPublisher,
    engine_state_summary: StateSummary,
    run_time_parameters: List[RunTimeParameter],
    command_annotations: List[CommandAnnotation],
    protocol_commands: List[pe_commands.Command],
    run_id: str,
    subject: RunController,
) -> None:
    """It should start a run."""
    decoy.when(mock_run_orchestrator_store.run_was_started()).then_return(False)

    result = subject.create_action(
        action_id="some-action-id",
        action_type=RunActionType.PLAY,
        created_at=datetime(year=2021, month=1, day=1),
        action_payload=[],
    )

    assert result == RunAction(
        id="some-action-id",
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2021, month=1, day=1),
    )

    decoy.verify(mock_run_store.insert_action(run_id, result), times=1)

    background_task_captor = matchers.Captor()
    decoy.verify(mock_task_runner.run(background_task_captor, deck_configuration=[]))

    decoy.when(
        await mock_run_orchestrator_store.run(deck_configuration=[])
    ).then_return(
        RunResult(
            commands=protocol_commands,
            state_summary=engine_state_summary,
            parameters=run_time_parameters,
            command_annotations=command_annotations,
        )
    )

    await background_task_captor.value(deck_configuration=[])

    decoy.verify(
        mock_run_store.update_run_state(
            run_id=run_id,
            summary=engine_state_summary,
            commands=protocol_commands,
            run_time_parameters=run_time_parameters,
        ),
        mock_runs_publisher.publish_pre_serialized_commands_notification(run_id),
        times=1,
    )

    # Verify maintenance run publication after background task execution
    decoy.verify(
        mock_maintenance_runs_publisher.publish_current_maintenance_run(),
        times=1,
    )

    # Verify maintenance run publication after background task execution
    decoy.verify(
        mock_maintenance_runs_publisher.publish_current_maintenance_run(),
        times=1,
    )

    # Verify maintenance run publication after background task execution
    decoy.verify(
        mock_maintenance_runs_publisher.publish_current_maintenance_run(),
        times=1,
    )

    # Verify maintenance run publication after background task execution
    decoy.verify(
        mock_maintenance_runs_publisher.publish_current_maintenance_run(),
        times=1,
    )


def test_create_pause_action(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    run_id: str,
    subject: RunController,
) -> None:
    """It should resume a run."""
    result = subject.create_action(
        action_id="some-action-id",
        action_type=RunActionType.PAUSE,
        created_at=datetime(year=2021, month=1, day=1),
        action_payload=[],
    )

    assert result == RunAction(
        id="some-action-id",
        actionType=RunActionType.PAUSE,
        createdAt=datetime(year=2021, month=1, day=1),
    )

    decoy.verify(mock_run_store.insert_action(run_id, result), times=1)
    decoy.verify(mock_run_orchestrator_store.pause(), times=1)


def test_create_stop_action(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    mock_task_runner: TaskRunner,
    run_id: str,
    subject: RunController,
) -> None:
    """It should resume a run."""
    result = subject.create_action(
        action_id="some-action-id",
        action_type=RunActionType.STOP,
        created_at=datetime(year=2021, month=1, day=1),
        action_payload=[],
    )

    assert result == RunAction(
        id="some-action-id",
        actionType=RunActionType.STOP,
        createdAt=datetime(year=2021, month=1, day=1),
    )

    decoy.verify(mock_run_store.insert_action(run_id, result), times=1)
    decoy.verify(mock_task_runner.run(mock_run_orchestrator_store.stop), times=1)


def test_create_resume_from_recovery_action(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    mock_task_runner: TaskRunner,
    run_id: str,
    subject: RunController,
) -> None:
    """It should call `resume_from_recovery()` on the underlying engine store."""
    result = subject.create_action(
        action_id="some-action-id",
        action_type=RunActionType.RESUME_FROM_RECOVERY,
        created_at=datetime(year=2021, month=1, day=1),
        action_payload=[],
    )

    assert result == RunAction(
        id="some-action-id",
        actionType=RunActionType.RESUME_FROM_RECOVERY,
        createdAt=datetime(year=2021, month=1, day=1),
    )

    decoy.verify(mock_run_store.insert_action(run_id, result), times=1)
    decoy.verify(
        mock_run_orchestrator_store.resume_from_recovery(reconcile_false_positive=False)
    )


@pytest.mark.parametrize(
    ("action_type", "exception"),
    [
        (RunActionType.PLAY, pe_errors.RobotDoorOpenError("oh no")),
        (RunActionType.PLAY, pe_errors.RunStoppedError("oh no")),
        (RunActionType.PAUSE, pe_errors.RunStoppedError("oh no")),
    ],
)
async def test_action_not_allowed(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    mock_run_store: RunStore,
    mock_task_runner: TaskRunner,
    run_id: str,
    subject: RunController,
    action_type: RunActionType,
    exception: Exception,
) -> None:
    """It should raise a RunActionNotAllowedError if a play/pause action is rejected."""
    decoy.when(mock_run_orchestrator_store.run_was_started()).then_return(True)
    decoy.when(mock_run_orchestrator_store.play()).then_raise(exception)
    decoy.when(mock_run_orchestrator_store.pause()).then_raise(exception)

    with pytest.raises(RunActionNotAllowedError, match="oh no"):
        subject.create_action(
            action_id="whatever",
            action_type=action_type,
            created_at=datetime(year=2021, month=1, day=1),
            action_payload=[],
        )
