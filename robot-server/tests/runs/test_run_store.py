"""Tests for robot_server.runs.run_store."""

from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Type
import warnings

import pytest
from decoy import Decoy
from robot_server.data_files.data_files_store import (
    DataFileInfo,
    DataFilesStore,
)
from sqlalchemy.engine import Engine
from unittest import mock

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.errors.codes import ErrorCodes

from robot_server.data_files.models import DataFileSource
from robot_server.protocols.protocol_store import ProtocolNotFoundError
from robot_server.runs.run_store import (
    CSVParameterRunResource,
    RunStore,
    RunResource,
    CommandNotFoundError,
    BadStateSummary,
)
from robot_server.runs.run_models import RunNotFoundError
from robot_server.runs.action_models import RunAction, RunActionType
from robot_server.service.notifications import RunsPublisher

from opentrons.protocol_engine import (
    commands as pe_commands,
    errors as pe_errors,
    types as pe_types,
    StateSummary,
    CommandSlice,
    Liquid,
    EngineStatus,
    ErrorOccurrence,
)
from opentrons.types import MountType, DeckSlotName


@pytest.fixture()
def mock_runs_publisher(decoy: Decoy) -> RunsPublisher:
    """Get a mock RunsPublisher."""
    return decoy.mock(cls=RunsPublisher)


@pytest.fixture
def subject(
    sql_engine: Engine,
    mock_runs_publisher: RunsPublisher,
) -> RunStore:
    """Get a ProtocolStore test subject."""
    return RunStore(
        sql_engine=sql_engine,
    )


@pytest.fixture
def protocol_commands() -> List[pe_commands.Command]:
    """Get protocol commands list."""
    return [
        pe_commands.WaitForResume(
            id="pause-1",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2021, month=1, day=1),
            params=pe_commands.WaitForResumeParams(message="hello world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
        ),
        pe_commands.WaitForResume(
            id="pause-2",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2022, month=2, day=2),
            params=pe_commands.WaitForResumeParams(message="hey world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
        ),
        pe_commands.WaitForResume(
            id="pause-3",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2023, month=3, day=3),
            params=pe_commands.WaitForResumeParams(message="sup world"),
            result=pe_commands.WaitForResumeResult(),
        ),
        pe_commands.WaitForResume(
            id="fixit-pause-1",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2021, month=1, day=1),
            params=pe_commands.WaitForResumeParams(message="hello world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.FIXIT,
        ),
    ]


@pytest.fixture
def protocol_commands_errors() -> List[pe_commands.Command]:
    """Get protocol commands errors list."""
    return [
        pe_commands.WaitForResume(
            id="pause-4",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2022, month=2, day=2),
            params=pe_commands.WaitForResumeParams(message="hey world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
        ),
        pe_commands.WaitForResume(
            id="pause-1",
            key="command-key",
            status=pe_commands.CommandStatus.FAILED,
            createdAt=datetime(year=2021, month=1, day=1),
            params=pe_commands.WaitForResumeParams(message="hello world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
            error=ErrorOccurrence.model_construct(
                id="error-id",
                createdAt=datetime(2024, 1, 1),
                errorType="blah-blah",
                detail="test details",
            ),
        ),
        pe_commands.WaitForResume(
            id="pause-2",
            key="command-key",
            status=pe_commands.CommandStatus.FAILED,
            createdAt=datetime(year=2022, month=2, day=2),
            params=pe_commands.WaitForResumeParams(message="hey world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
            error=ErrorOccurrence.model_construct(
                id="error-id-2",
                createdAt=datetime(2024, 1, 1),
                errorType="blah-blah",
                detail="test details",
            ),
        ),
        pe_commands.WaitForResume(
            id="pause-3",
            key="command-key",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=datetime(year=2022, month=2, day=2),
            params=pe_commands.WaitForResumeParams(message="hey world"),
            result=pe_commands.WaitForResumeResult(),
            intent=pe_commands.CommandIntent.PROTOCOL,
        ),
    ]


@pytest.fixture
def state_summary() -> StateSummary:
    """Get a StateSummary test object."""
    analysis_error = pe_errors.ErrorOccurrence(
        id="error-id",
        createdAt=datetime(year=2023, month=3, day=3),
        errorType="BadError",
        detail="oh no",
    )

    analysis_labware = pe_types.LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="namespace/load-name/42",
        location=pe_types.DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=None,
    )

    analysis_pipette = pe_types.LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )

    liquids = [Liquid(id="some-id", displayName="water", description="water desc")]

    return StateSummary(
        errors=[analysis_error],
        labware=[analysis_labware],
        pipettes=[analysis_pipette],
        # TODO(mc, 2022-02-14): evaluate usage of modules in the analysis resp.
        modules=[],
        # TODO (tz 22-4-19): added the field to class. make sure what to initialize
        labwareOffsets=[],
        status=EngineStatus.IDLE,
        liquids=liquids,
        wells=[],
        files=[],
        hasEverEnteredErrorRecovery=False,
    )


@pytest.fixture()
def run_time_parameters() -> List[pe_types.RunTimeParameter]:
    """Get a RunTimeParameter list."""
    return [
        pe_types.BooleanParameter(
            displayName="Display Name 1",
            variableName="variable_name_1",
            value=False,
            default=True,
        ),
        pe_types.NumberParameter(
            displayName="Display Name 2",
            variableName="variable_name_2",
            type="int",
            min=123.0,
            max=456.0,
            value=333.0,
            default=222.0,
        ),
        pe_types.EnumParameter(
            displayName="Display Name 3",
            variableName="variable_name_3",
            type="str",
            choices=[
                pe_types.EnumChoice(
                    displayName="Choice Name",
                    value="cool choice",
                )
            ],
            default="cooler choice",
            value="coolest choice",
        ),
        pe_types.CSVParameter(
            displayName="Display Name 4",
            variableName="variable_name_4",
            description="a csv parameter without file id",
            file=pe_types.FileInfo(id="file-id", name="csvFile"),
        ),
    ]


@pytest.fixture
def invalid_state_summary() -> StateSummary:
    """Should fail pydantic validation."""
    analysis_error = pe_errors.ErrorOccurrence.model_construct(
        id="error-id",
        # Invalid value here should fail analysis
        createdAt=MountType.LEFT,  # type: ignore[arg-type]
        errorType="BadError",
        detail="oh no",
    )

    analysis_labware = pe_types.LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="namespace/load-name/42",
        location=pe_types.DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=None,
    )

    analysis_pipette = pe_types.LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )

    liquids = [Liquid(id="some-id", displayName="water", description="water desc")]

    return StateSummary(
        errors=[analysis_error],
        hasEverEnteredErrorRecovery=False,
        labware=[analysis_labware],
        pipettes=[analysis_pipette],
        # TODO(mc, 2022-02-14): evaluate usage of modules in the analysis resp.
        modules=[],
        # TODO (tz 22-4-19): added the field to class. make sure what to initialize
        labwareOffsets=[],
        status=EngineStatus.IDLE,
        liquids=liquids,
        wells=[],
        files=[],
    )


@pytest.fixture
def data_files_store(sql_engine: Engine, tmp_path: Path) -> DataFilesStore:
    """Return a `DataFilesStore` linked to the same database as the subject under test.

    `DataFilesStore` is tested elsewhere.
    We only need it here to prepare the database for the analysis store tests.
    The CSV parameters table always needs a data file to link to.
    """
    data_files_dir = tmp_path / "data_files"
    data_files_dir.mkdir()
    return DataFilesStore(sql_engine=sql_engine, data_files_directory=data_files_dir)


async def test_update_run_state(
    subject: RunStore,
    state_summary: StateSummary,
    protocol_commands: List[pe_commands.Command],
    run_time_parameters: List[pe_types.RunTimeParameter],
    mock_runs_publisher: mock.Mock,
) -> None:
    """It should be able to update a run state to the store."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        id="action-id",
    )

    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.insert_action(run_id="run-id", action=action)

    result = subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=run_time_parameters,
    )
    run_summary_result = subject.get_state_summary(run_id="run-id")
    parameters_result = subject.get_run_time_parameters(run_id="run-id")
    commands_result = subject.get_commands_slice(
        run_id="run-id",
        length=len(protocol_commands),
        cursor=0,
        include_fixit_commands=True,
    )

    assert result == RunResource(
        ok=True,
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        actions=[action],
    )
    assert run_summary_result == state_summary
    assert parameters_result == run_time_parameters
    assert commands_result.commands == protocol_commands
    mock_runs_publisher.publish_runs_advise_refetch.assert_called_once_with(
        run_id="run-id"
    )


async def test_update_run_state_command_with_errors(
    subject: RunStore,
    state_summary: StateSummary,
    protocol_commands_errors: List[pe_commands.Command],
    run_time_parameters: List[pe_types.RunTimeParameter],
    mock_runs_publisher: mock.Mock,
) -> None:
    """It should be able to update a run state to the store."""
    commands_with_errors = [
        command
        for command in protocol_commands_errors
        if command.status == pe_commands.CommandStatus.FAILED
    ]
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        id="action-id",
    )

    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands_errors,
        run_time_parameters=run_time_parameters,
    )

    subject.insert_action(run_id="run-id", action=action)
    command_errors_result = subject.get_commands_errors_slice(
        run_id="run-id",
        length=5,
        cursor=0,
    )

    assert command_errors_result.commands_errors == [
        item.error for item in commands_with_errors
    ]


async def test_insert_and_get_csv_rtp(
    subject: RunStore,
    data_files_store: DataFilesStore,
    run_time_parameters: List[pe_types.RunTimeParameter],
) -> None:
    """It should be able to insert and get csv rtp from the db."""
    await data_files_store.insert(
        DataFileInfo(
            id="file-id",
            name="my_csv_file.csv",
            file_hash="file-hash",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2024, month=1, day=1, tzinfo=timezone.utc),
        )
    )

    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    subject.insert_csv_rtp(run_id="run-id", run_time_parameters=run_time_parameters)
    csv_rtp_result = subject.get_all_csv_rtp()

    assert csv_rtp_result == [
        CSVParameterRunResource(
            run_id="run-id",
            parameter_variable_name="variable_name_4",
            file_id="file-id",
        )
    ]


def test_update_state_run_not_found(
    subject: RunStore,
    state_summary: StateSummary,
    protocol_commands: List[pe_commands.Command],
) -> None:
    """It should be able to catch the exception raised by insert."""
    with pytest.raises(RunNotFoundError, match="run-not-found"):
        subject.update_run_state(
            run_id="run-not-found",
            summary=state_summary,
            commands=protocol_commands,
            run_time_parameters=[],
        )


def test_add_run(subject: RunStore) -> None:
    """It should be able to add a new run to the store."""
    result = subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
    )

    assert result == RunResource(
        ok=True,
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        actions=[],
    )


def test_insert_actions_missing_run_id(subject: RunStore) -> None:
    """Should not be able to insert an action with a run id that does not exist."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        id="action-id",
    )

    with pytest.raises(RunNotFoundError, match="missing-run-id"):
        subject.insert_action(run_id="missing-run-id", action=action)


def test_insert_run_missing_protocol_id(subject: RunStore) -> None:
    """Should not be able to insert an action with a run id that does not exist."""
    with pytest.raises(ProtocolNotFoundError, match="missing-protocol-id"):
        subject.insert(
            run_id="run-id",
            protocol_id="missing-protocol-id",
            created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        )


def test_get_run_no_actions(subject: RunStore) -> None:
    """It can get a previously stored run entry."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    result = subject.get("run-id")

    assert result == RunResource(
        ok=True,
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        actions=[],
    )


def test_get_run(subject: RunStore) -> None:
    """It can get a previously stored run entry."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        id="action-id",
    )

    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    subject.insert_action("run-id", action)

    result = subject.get(run_id="run-id")

    assert result == RunResource(
        ok=True,
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        actions=[action],
    )


def test_get_run_missing(subject: RunStore) -> None:
    """It raises if the run does not exist."""
    with pytest.raises(RunNotFoundError, match="run-id"):
        subject.get(run_id="run-id")


@pytest.mark.parametrize(
    "length, expected_result",
    [
        (0, []),
        (
            1,
            [
                RunResource(
                    ok=True,
                    run_id="run-id-2",
                    protocol_id=None,
                    created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
                    actions=[],
                )
            ],
        ),
        (
            20,
            [
                RunResource(
                    ok=True,
                    run_id="run-id-1",
                    protocol_id=None,
                    created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
                    actions=[],
                ),
                RunResource(
                    ok=True,
                    run_id="run-id-2",
                    protocol_id=None,
                    created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
                    actions=[],
                ),
            ],
        ),
        (
            None,
            [
                RunResource(
                    ok=True,
                    run_id="run-id-1",
                    protocol_id=None,
                    created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
                    actions=[],
                ),
                RunResource(
                    ok=True,
                    run_id="run-id-2",
                    protocol_id=None,
                    created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
                    actions=[],
                ),
            ],
        ),
    ],
)
def test_get_all_runs(
    subject: RunStore, length: Optional[int], expected_result: List[RunResource]
) -> None:
    """It gets the number of created runs supplied in length."""
    subject.insert(
        run_id="run-id-1",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.insert(
        run_id="run-id-2",
        protocol_id=None,
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
    )

    result = subject.get_all(length=length)

    assert result == expected_result


async def test_remove_run(
    subject: RunStore,
    mock_runs_publisher: mock.Mock,
    data_files_store: DataFilesStore,
    run_time_parameters: List[pe_types.RunTimeParameter],
) -> None:
    """It can remove a previously stored run entry."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        id="action-id",
    )

    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.insert_action(run_id="run-id", action=action)
    await data_files_store.insert(
        DataFileInfo(
            id="file-id",
            name="my_csv_file.csv",
            file_hash="file-hash",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2024, month=1, day=1, tzinfo=timezone.utc),
        )
    )
    subject.insert_csv_rtp(run_id="run-id", run_time_parameters=run_time_parameters)
    subject.remove(run_id="run-id")

    assert subject.get_all(length=20) == []
    mock_runs_publisher.publish_runs_advise_unsubscribe.assert_called_once_with(
        run_id="run-id"
    )


def test_remove_run_missing_id(subject: RunStore) -> None:
    """It raises if the run does not exist."""
    with pytest.raises(RunNotFoundError, match="run-id"):
        subject.remove(run_id="run-id")


def test_insert_actions_no_run(subject: RunStore) -> None:
    """Insert actions with a run that doesn't exist should raise an exception."""
    action = RunAction(
        actionType=RunActionType.PLAY,
        createdAt=datetime(year=2023, month=3, day=3, tzinfo=timezone.utc),
        id="action-id-1",
    )

    with pytest.raises(Exception):
        subject.insert_action(run_id="run-id-996", action=action)


def test_get_state_summary(
    subject: RunStore, state_summary: StateSummary, mock_runs_publisher: mock.Mock
) -> None:
    """It should be able to get store run data."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id", summary=state_summary, commands=[], run_time_parameters=[]
    )
    result = subject.get_state_summary(run_id="run-id")
    assert result == state_summary
    mock_runs_publisher.publish_runs_advise_refetch.assert_called_once_with(
        run_id="run-id"
    )


def test_get_state_summary_failure(
    subject: RunStore, invalid_state_summary: StateSummary
) -> None:
    """It should return None."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    with warnings.catch_warnings():
        # Pydantic raises a warning because invalid_state_summary (deliberately)
        # has a wrongly-typed value in one of its fields. Ignore the warning.
        warnings.filterwarnings(
            action="ignore",
            category=UserWarning,
            module="pydantic",
        )
        subject.update_run_state(
            run_id="run-id",
            summary=invalid_state_summary,
            commands=[],
            run_time_parameters=[],
        )

    result = subject.get_state_summary(run_id="run-id")
    assert isinstance(result, BadStateSummary)
    assert result.dataError.code == ErrorCodes.INVALID_STORED_DATA


def test_get_state_summary_none(subject: RunStore) -> None:
    """It should return None if no state data stored."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    result = subject.get_state_summary(run_id="run-id")
    assert isinstance(result, BadStateSummary)
    assert result.dataError.code == ErrorCodes.INVALID_STORED_DATA


def test_get_run_time_parameters(
    subject: RunStore,
    state_summary: StateSummary,
    run_time_parameters: List[pe_types.RunTimeParameter],
) -> None:
    """It should be able to get store run time parameters."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=[],
        run_time_parameters=run_time_parameters,
    )
    result = subject.get_run_time_parameters(run_id="run-id")
    assert result == run_time_parameters


def test_get_run_time_parameters_invalid(
    subject: RunStore,
    state_summary: StateSummary,
) -> None:
    """It should return an empty list if there invalid parameters."""
    bad_parameters = [pe_types.BooleanParameter.model_construct(foo="bar")]  # type: ignore[call-arg]
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=[],
        run_time_parameters=bad_parameters,  # type: ignore[arg-type]
    )
    result = subject.get_run_time_parameters(run_id="run-id")
    assert result == []


def test_get_run_time_parameters_none(
    subject: RunStore,
    state_summary: StateSummary,
) -> None:
    """It should return an empty list if there are no run time parameters associated."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    result = subject.get_run_time_parameters(run_id="run-id")
    assert result == []


def test_has_run_id(subject: RunStore) -> None:
    """It should tell us if a given ID is in the store."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    result = subject.has("run-id")
    assert result is True


def test_has_no_run_id(subject: RunStore) -> None:
    """It should tell us if a given ID is not in the store."""
    result = subject.has("no-run-id")
    assert result is False


def test_get_command(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
) -> None:
    """Should return a run command from the db."""
    subject.insert(
        run_id="run-id", protocol_id=None, created_at=datetime.now(timezone.utc)
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_command(run_id="run-id", command_id="pause-2")

    assert result == protocol_commands[1]


@pytest.mark.parametrize(
    "input_run_id, input_command_id, expected_exception",
    [
        ("not-run-id", "pause-1", RunNotFoundError),
        ("run-id", "not-command-id", CommandNotFoundError),
    ],
)
def test_get_command_raise_exception(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
    input_run_id: str,
    input_command_id: str,
    expected_exception: Type[Exception],
) -> None:
    """Should raise exception."""
    subject.insert(
        run_id="run-id", protocol_id=None, created_at=datetime.now(timezone.utc)
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    with pytest.raises(expected_exception):
        subject.get_command(run_id=input_run_id, command_id=input_command_id)


def test_get_command_slice(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
) -> None:
    """It should return slices of commands."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_commands_slice(
        run_id="run-id",
        cursor=0,
        length=len(protocol_commands),
        include_fixit_commands=True,
    )

    assert result == CommandSlice(
        cursor=0,
        total_length=len(protocol_commands),
        commands=protocol_commands,
    )


@pytest.mark.parametrize(
    ("input_cursor", "input_length", "expected_cursor", "expected_command_ids"),
    [
        (0, 0, 0, []),
        (None, 0, 3, []),
        (0, 3, 0, ["pause-1", "pause-2", "pause-3"]),
        (0, 1, 0, ["pause-1"]),
        (1, 2, 1, ["pause-2", "pause-3"]),
        (0, 999, 0, ["pause-1", "pause-2", "pause-3", "fixit-pause-1"]),
        (1, 999, 1, ["pause-2", "pause-3", "fixit-pause-1"]),
        (None, 3, 1, ["pause-2", "pause-3", "fixit-pause-1"]),
        (None, 2, 2, ["pause-3", "fixit-pause-1"]),
        (999, 2, 3, ["fixit-pause-1"]),
    ],
)
def test_get_commands_slice_clamping(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
    input_cursor: Optional[int],
    input_length: int,
    expected_cursor: int,
    expected_command_ids: List[str],
) -> None:
    """It should clamp slice cursor and page length."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_commands_slice(
        run_id="run-id",
        cursor=input_cursor,
        length=input_length,
        include_fixit_commands=True,
    )

    assert result.cursor == expected_cursor
    assert result.total_length == len(protocol_commands)
    assert [
        result_command.id for result_command in result.commands
    ] == expected_command_ids


def test_get_run_command_slice_none(subject: RunStore) -> None:
    """It should return None if no commands stored."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    result = subject.get_commands_slice(
        run_id="run-id", length=999, cursor=None, include_fixit_commands=True
    )
    assert result == CommandSlice(commands=[], cursor=0, total_length=0)


def test_get_commands_slice_run_not_found(subject: RunStore) -> None:
    """Should raise an error RunNotFoundError."""
    subject.insert(
        run_id="run-id", protocol_id=None, created_at=datetime.now(timezone.utc)
    )
    with pytest.raises(RunNotFoundError):
        subject.get_commands_slice(
            run_id="not-run-id", cursor=1, length=3, include_fixit_commands=True
        )


def test_get_commands_slice_no_fixit_commands(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
) -> None:
    """Should raise an error RunNotFoundError."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_commands_slice(
        run_id="run-id",
        cursor=0,
        length=5,
        include_fixit_commands=False,
    )

    assert result.cursor == 0
    assert result.total_length == 3
    assert [result_command.id for result_command in result.commands] == [
        "pause-1",
        "pause-2",
        "pause-3",
    ]


def test_get_all_commands_as_preserialized_list(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
) -> None:
    """It should get all commands stored in DB as a pre-serialized list."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_all_commands_as_preserialized_list(
        run_id="run-id", include_fixit_commands=True
    )
    assert result == [
        '{"id":"pause-1","createdAt":"2021-01-01T00:00:00","commandType":"waitForResume",'
        '"key":"command-key","status":"succeeded","params":{"message":"hello world"},"result":{},"intent":"protocol"}',
        '{"id":"pause-2","createdAt":"2022-02-02T00:00:00","commandType":"waitForResume",'
        '"key":"command-key","status":"succeeded","params":{"message":"hey world"},"result":{},"intent":"protocol"}',
        '{"id":"pause-3","createdAt":"2023-03-03T00:00:00","commandType":"waitForResume","key":"command-key","status":"succeeded","params":{"message":"sup world"},"result":{}}',
        '{"id":"fixit-pause-1","createdAt":"2021-01-01T00:00:00","commandType":"waitForResume","key":"command-key","status":"succeeded","params":{"message":"hello world"},"result":{},"intent":"fixit"}',
    ]


def test_get_all_commands_as_preserialized_list_no_fixit(
    subject: RunStore,
    protocol_commands: List[pe_commands.Command],
    state_summary: StateSummary,
) -> None:
    """It should get all commands stored in DB without fixit commands as a pre-serialized list."""
    subject.insert(
        run_id="run-id",
        protocol_id=None,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    subject.update_run_state(
        run_id="run-id",
        summary=state_summary,
        commands=protocol_commands,
        run_time_parameters=[],
    )
    result = subject.get_all_commands_as_preserialized_list(
        run_id="run-id", include_fixit_commands=False
    )
    assert result == [
        '{"id":"pause-1","createdAt":"2021-01-01T00:00:00","commandType":"waitForResume",'
        '"key":"command-key","status":"succeeded","params":{"message":"hello world"},"result":{},"intent":"protocol"}',
        '{"id":"pause-2","createdAt":"2022-02-02T00:00:00","commandType":"waitForResume",'
        '"key":"command-key","status":"succeeded","params":{"message":"hey world"},"result":{},"intent":"protocol"}',
        '{"id":"pause-3","createdAt":"2023-03-03T00:00:00","commandType":"waitForResume","key":"command-key","status":"succeeded","params":{"message":"sup world"},"result":{}}',
    ]
