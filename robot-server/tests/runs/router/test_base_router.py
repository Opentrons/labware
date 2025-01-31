"""Tests for base /runs routes."""

from opentrons.hardware_control import HardwareControlAPI
from opentrons_shared_data.robot.types import RobotTypeEnum
import pytest
from datetime import datetime
from decoy import Decoy
from pathlib import Path

from opentrons.types import DeckSlotName, Point, NozzleConfigurationType
from opentrons.protocol_engine import (
    types as pe_types,
    errors as pe_errors,
    CommandErrorSlice,
    CommandPointer,
)
from opentrons.protocol_reader import ProtocolSource, JsonProtocolConfig

from opentrons.hardware_control.nozzle_manager import NozzleMap

from robot_server.data_files.data_files_store import (
    DataFilesStore,
    DataFileInfo,
)

from robot_server.data_files.models import DataFileSource
from robot_server.errors.error_responses import ApiError
from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    SimpleEmptyBody,
    MultiBodyMeta,
    ResourceLink,
)

from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import (
    ProtocolNotFoundError,
    ProtocolResource,
    ProtocolStore,
)

from robot_server.runs.run_auto_deleter import RunAutoDeleter

from robot_server.runs.run_models import (
    Run,
    RunCreate,
    RunUpdate,
    RunCurrentState,
    ActiveNozzleLayout,
    CommandLinkNoMeta,
    NozzleLayoutConfig,
    TipState,
)
from robot_server.runs.run_orchestrator_store import RunConflictError
from robot_server.runs.run_data_manager import (
    RunDataManager,
    RunNotCurrentError,
)
from robot_server.runs.run_models import RunNotFoundError
from robot_server.runs.router.base_router import (
    AllRunsLinks,
    create_run,
    get_run_data_from_url,
    get_run,
    get_runs,
    remove_run,
    update_run,
    get_run_commands_error,
    get_current_state,
    CurrentStateLinks,
)

from robot_server.deck_configuration.store import DeckConfigurationStore
from opentrons.protocol_engine.resources.file_provider import (
    FileProvider,
)
from robot_server.file_provider.provider import FileProviderWrapper


def mock_notify_publishers() -> None:
    """A mock notify_publishers."""
    return None


@pytest.fixture
def mock_data_files_store(decoy: Decoy) -> DataFilesStore:
    """Get a mock DataFilesStore."""
    return decoy.mock(cls=DataFilesStore)


@pytest.fixture
def mock_data_files_directory(decoy: Decoy) -> Path:
    """Get a mocked out data files directory.

    We could use Path("/dev/null") for this but I worry something will accidentally
    try to use it as an actual path and then we'll get confusing errors on Windows.
    """
    return decoy.mock(cls=Path)


@pytest.fixture
def labware_offset_create() -> pe_types.LegacyLabwareOffsetCreate:
    """Get a labware offset create request value object."""
    return pe_types.LegacyLabwareOffsetCreate(
        definitionUri="namespace_1/load_name_1/123",
        location=pe_types.LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        vector=pe_types.LabwareOffsetVector(x=1, y=2, z=3),
    )


async def test_create_run(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    mock_run_auto_deleter: RunAutoDeleter,
    labware_offset_create: pe_types.LegacyLabwareOffsetCreate,
    mock_deck_configuration_store: DeckConfigurationStore,
    mock_file_provider_wrapper: FileProviderWrapper,
    mock_protocol_store: ProtocolStore,
    mock_data_files_store: DataFilesStore,
    mock_file_provider: FileProvider,
) -> None:
    """It should be able to create a basic run."""
    run_id = "run-id"
    run_created_at = datetime(year=2021, month=1, day=1)

    expected_response = Run(
        id=run_id,
        createdAt=run_created_at,
        protocolId=None,
        current=True,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        status=pe_types.EngineStatus.IDLE,
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )
    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])

    decoy.when(
        await mock_run_data_manager.create(
            run_id=run_id,
            created_at=run_created_at,
            labware_offsets=[labware_offset_create],
            deck_configuration=[],
            file_provider=mock_file_provider,
            protocol=None,
            run_time_param_values=None,
            run_time_param_paths=None,
            notify_publishers=mock_notify_publishers,
        )
    ).then_return(expected_response)

    result = await create_run(
        request_body=RequestModel(
            data=RunCreate(labwareOffsets=[labware_offset_create])
        ),
        run_data_manager=mock_run_data_manager,
        data_files_store=mock_data_files_store,
        data_files_directory=Path("/dev/null"),
        run_id=run_id,
        created_at=run_created_at,
        run_auto_deleter=mock_run_auto_deleter,
        quick_transfer_run_auto_deleter=mock_run_auto_deleter,
        deck_configuration_store=mock_deck_configuration_store,
        file_provider=mock_file_provider,
        notify_publishers=mock_notify_publishers,
        protocol_store=mock_protocol_store,
        check_estop=True,
    )

    assert result.content.data == expected_response
    assert result.status_code == 201

    decoy.verify(mock_run_auto_deleter.make_room_for_new_run(), times=1)


async def test_create_protocol_run(
    decoy: Decoy,
    mock_protocol_store: ProtocolStore,
    mock_run_data_manager: RunDataManager,
    mock_run_auto_deleter: RunAutoDeleter,
    mock_deck_configuration_store: DeckConfigurationStore,
    mock_data_files_store: DataFilesStore,
    mock_file_provider: FileProvider,
) -> None:
    """It should be able to create a protocol run."""
    run_id = "run-id"
    run_created_at = datetime(year=2021, month=1, day=1)
    protocol_id = "protocol-id"

    protocol_resource = ProtocolResource(
        protocol_id=protocol_id,
        protocol_key=None,
        protocol_kind=ProtocolKind.STANDARD,
        created_at=datetime(year=2022, month=2, day=2),
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
    )

    expected_response = Run(
        id=run_id,
        createdAt=run_created_at,
        protocolId=protocol_id,
        current=True,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        status=pe_types.EngineStatus.IDLE,
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )
    decoy.when(mock_data_files_store.get("file-id")).then_return(
        DataFileInfo(
            id="123",
            name="abc.xyz",
            file_hash="987",
            created_at=datetime(month=1, day=2, year=2024),
            source=DataFileSource.UPLOADED,
        )
    )
    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])
    decoy.when(mock_protocol_store.get(protocol_id=protocol_id)).then_return(
        protocol_resource
    )

    decoy.when(
        await mock_run_data_manager.create(
            run_id=run_id,
            created_at=run_created_at,
            labware_offsets=[],
            deck_configuration=[],
            file_provider=mock_file_provider,
            protocol=protocol_resource,
            run_time_param_values={"foo": "bar"},
            run_time_param_paths={"my-csv-param": Path("/dev/null/file-id/abc.xyz")},
            notify_publishers=mock_notify_publishers,
        )
    ).then_return(expected_response)

    result = await create_run(
        request_body=RequestModel(
            data=RunCreate(
                protocolId="protocol-id",
                runTimeParameterValues={"foo": "bar"},
                runTimeParameterFiles={"my-csv-param": "file-id"},
            )
        ),
        protocol_store=mock_protocol_store,
        run_data_manager=mock_run_data_manager,
        data_files_store=mock_data_files_store,
        data_files_directory=Path("/dev/null"),
        run_id=run_id,
        created_at=run_created_at,
        run_auto_deleter=mock_run_auto_deleter,
        quick_transfer_run_auto_deleter=mock_run_auto_deleter,
        deck_configuration_store=mock_deck_configuration_store,
        file_provider=mock_file_provider,
        notify_publishers=mock_notify_publishers,
        check_estop=True,
    )

    assert result.content.data == expected_response
    assert result.status_code == 201

    decoy.verify(mock_run_auto_deleter.make_room_for_new_run(), times=1)


async def test_create_protocol_run_bad_protocol_id(
    decoy: Decoy,
    mock_protocol_store: ProtocolStore,
    mock_deck_configuration_store: DeckConfigurationStore,
    mock_run_data_manager: RunDataManager,
    mock_run_auto_deleter: RunAutoDeleter,
    mock_data_files_store: DataFilesStore,
    mock_data_files_directory: Path,
    mock_file_provider: FileProvider,
) -> None:
    """It should 404 if a protocol for a run does not exist."""
    error = ProtocolNotFoundError("protocol-id")
    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])
    decoy.when(mock_protocol_store.get(protocol_id="protocol-id")).then_raise(error)

    with pytest.raises(ApiError) as exc_info:
        await create_run(
            request_body=RequestModel(data=RunCreate(protocolId="protocol-id")),
            protocol_store=mock_protocol_store,
            deck_configuration_store=mock_deck_configuration_store,
            run_data_manager=mock_run_data_manager,
            data_files_store=mock_data_files_store,
            data_files_directory=mock_data_files_directory,
            file_provider=mock_file_provider,
            run_id="run-id",
            created_at=datetime.now(),
            run_auto_deleter=mock_run_auto_deleter,
            quick_transfer_run_auto_deleter=mock_run_auto_deleter,
            check_estop=True,
            notify_publishers=mock_notify_publishers,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolNotFound"


async def test_create_run_conflict(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    mock_run_auto_deleter: RunAutoDeleter,
    mock_deck_configuration_store: DeckConfigurationStore,
    mock_protocol_store: ProtocolStore,
    mock_data_files_store: DataFilesStore,
    mock_data_files_directory: Path,
    mock_file_provider: FileProvider,
) -> None:
    """It should respond with a conflict error if multiple engines are created."""
    created_at = datetime(year=2021, month=1, day=1)

    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])
    decoy.when(
        await mock_run_data_manager.create(
            run_id="run-id",
            created_at=created_at,
            labware_offsets=[],
            deck_configuration=[],
            file_provider=mock_file_provider,
            protocol=None,
            run_time_param_values=None,
            run_time_param_paths=None,
            notify_publishers=mock_notify_publishers,
        )
    ).then_raise(RunConflictError("oh no"))

    with pytest.raises(ApiError) as exc_info:
        await create_run(
            run_id="run-id",
            created_at=created_at,
            request_body=None,
            protocol_store=mock_protocol_store,
            run_data_manager=mock_run_data_manager,
            run_auto_deleter=mock_run_auto_deleter,
            quick_transfer_run_auto_deleter=mock_run_auto_deleter,
            deck_configuration_store=mock_deck_configuration_store,
            data_files_store=mock_data_files_store,
            data_files_directory=mock_data_files_directory,
            file_provider=mock_file_provider,
            notify_publishers=mock_notify_publishers,
            check_estop=True,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunAlreadyActive"


async def test_get_run_data_from_url(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should be able to get a run by ID."""
    expected_response = Run(
        id="run-id",
        protocolId=None,
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_types.EngineStatus.IDLE,
        current=False,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(mock_run_data_manager.get("run-id")).then_return(expected_response)

    result = await get_run_data_from_url(
        runId="run-id",
        run_data_manager=mock_run_data_manager,
    )

    assert result == expected_response


async def test_get_run_with_missing_id(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 404 if the run ID does not exist."""
    not_found_error = RunNotFoundError(run_id="run-id")

    decoy.when(mock_run_data_manager.get(run_id="run-id")).then_raise(not_found_error)

    with pytest.raises(ApiError) as exc_info:
        await get_run_data_from_url(
            runId="run-id",
            run_data_manager=mock_run_data_manager,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_get_run() -> None:
    """It should wrap the run data in a response."""
    run_data = Run(
        id="run-id",
        protocolId=None,
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_types.EngineStatus.IDLE,
        current=False,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    result = await get_run(run_data=run_data)

    assert result.content.data == run_data
    assert result.status_code == 200


async def test_get_runs_empty(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should return an empty collection response when no runs exist."""
    decoy.when(mock_run_data_manager.get_all(length=20)).then_return([])
    decoy.when(mock_run_data_manager.current_run_id).then_return(None)

    result = await get_runs(run_data_manager=mock_run_data_manager, pageLength=20)

    assert result.content.data == []
    assert result.content.links == AllRunsLinks(current=None)
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=0)
    assert result.status_code == 200


async def test_get_runs_not_empty(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should return a collection response when a run exists."""
    created_at_1 = datetime(year=2021, month=1, day=1)
    created_at_2 = datetime(year=2022, month=2, day=2)

    response_1 = Run(
        id="unique-id-1",
        protocolId=None,
        createdAt=created_at_1,
        status=pe_types.EngineStatus.SUCCEEDED,
        current=False,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    response_2 = Run(
        id="unique-id-2",
        protocolId=None,
        createdAt=created_at_2,
        status=pe_types.EngineStatus.IDLE,
        current=True,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(mock_run_data_manager.get_all(20)).then_return([response_1, response_2])
    decoy.when(mock_run_data_manager.current_run_id).then_return("unique-id-2")

    result = await get_runs(run_data_manager=mock_run_data_manager, pageLength=20)

    assert result.content.data == [response_1, response_2]
    assert result.content.links == AllRunsLinks(
        current=ResourceLink(href="/runs/unique-id-2")
    )
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=2)
    assert result.status_code == 200


async def test_delete_run_by_id(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should be able to remove a run by ID."""
    result = await remove_run(runId="run-id", run_data_manager=mock_run_data_manager)

    decoy.verify(await mock_run_data_manager.delete("run-id"), times=1)

    assert result.content == SimpleEmptyBody()
    assert result.status_code == 200


async def test_delete_run_with_bad_id(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 404 if the run ID does not exist."""
    key_error = RunNotFoundError(run_id="run-id")

    decoy.when(await mock_run_data_manager.delete("run-id")).then_raise(key_error)

    with pytest.raises(ApiError) as exc_info:
        await remove_run(runId="run-id", run_data_manager=mock_run_data_manager)

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_delete_active_run(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 409 if the run is not finished."""
    decoy.when(await mock_run_data_manager.delete("run-id")).then_raise(
        RunConflictError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await remove_run(runId="run-id", run_data_manager=mock_run_data_manager)

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunNotIdle"


async def test_update_run_to_not_current(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should update a run to no longer be current."""
    expected_response = Run(
        id="run-id",
        protocolId=None,
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_types.EngineStatus.SUCCEEDED,
        current=False,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(await mock_run_data_manager.update("run-id", current=False)).then_return(
        expected_response
    )

    result = await update_run(
        runId="run-id",
        request_body=RequestModel(data=RunUpdate(current=False)),
        run_data_manager=mock_run_data_manager,
    )

    assert result.content == SimpleBody(data=expected_response)
    assert result.status_code == 200


async def test_update_current_none_noop(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should noop if the update does not request any change to current."""
    expected_response = Run(
        id="run-id",
        protocolId=None,
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_types.EngineStatus.SUCCEEDED,
        current=True,
        actions=[],
        errors=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(await mock_run_data_manager.update("run-id", current=None)).then_return(
        expected_response
    )

    result = await update_run(
        runId="run-id",
        request_body=RequestModel(data=RunUpdate()),
        run_data_manager=mock_run_data_manager,
    )

    assert result.content == SimpleBody(data=expected_response)
    assert result.status_code == 200


async def test_update_to_current_not_current(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 409 if attempting to update a not current run."""
    decoy.when(
        await mock_run_data_manager.update(run_id="run-id", current=False)
    ).then_raise(RunNotCurrentError("oh no"))

    with pytest.raises(ApiError) as exc_info:
        await update_run(
            runId="run-id",
            request_body=RequestModel(data=RunUpdate(current=False)),
            run_data_manager=mock_run_data_manager,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"


async def test_update_to_current_conflict(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 409 if attempting to un-current a run that is not idle."""
    decoy.when(
        await mock_run_data_manager.update(run_id="run-id", current=False)
    ).then_raise(RunConflictError("oh no"))

    with pytest.raises(ApiError) as exc_info:
        await update_run(
            runId="run-id",
            request_body=RequestModel(data=RunUpdate(current=False)),
            run_data_manager=mock_run_data_manager,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunNotIdle"


async def test_update_to_current_missing(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
) -> None:
    """It should 404 if attempting to update a missing run."""
    decoy.when(
        await mock_run_data_manager.update(run_id="run-id", current=False)
    ).then_raise(RunNotFoundError(run_id="run-id"))

    with pytest.raises(ApiError) as exc_info:
        await update_run(
            runId="run-id",
            request_body=RequestModel(data=RunUpdate(current=False)),
            run_data_manager=mock_run_data_manager,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_get_run_commands_errors(
    decoy: Decoy, mock_run_data_manager: RunDataManager
) -> None:
    """It should return a list of all commands errors in a run."""
    decoy.when(
        mock_run_data_manager.get_command_error_slice(
            run_id="run-id",
            cursor=0,
            length=42,
        )
    ).then_raise(RunNotCurrentError("oh no!"))

    decoy.when(mock_run_data_manager.get_command_errors_count("run-id")).then_return(1)

    with pytest.raises(ApiError):
        result = await get_run_commands_error(
            runId="run-id",
            run_data_manager=mock_run_data_manager,
            cursor=None,
            pageLength=42,
        )
        assert result.status_code == 409


async def test_get_run_commands_errors_raises_no_run(
    decoy: Decoy, mock_run_data_manager: RunDataManager
) -> None:
    """It should return a list of all commands errors in a run."""
    error = pe_errors.ErrorOccurrence(
        id="error-id",
        errorType="PrettyBadError",
        createdAt=datetime(year=2024, month=4, day=4),
        detail="Things are not looking good.",
    )
    decoy.when(mock_run_data_manager.get_command_errors_count("run-id")).then_return(1)

    command_error_slice = CommandErrorSlice(
        cursor=1, total_length=3, commands_errors=[error]
    )

    decoy.when(
        mock_run_data_manager.get_command_error_slice(
            run_id="run-id",
            cursor=0,
            length=42,
        )
    ).then_return(command_error_slice)

    result = await get_run_commands_error(
        runId="run-id",
        run_data_manager=mock_run_data_manager,
        cursor=None,
        pageLength=42,
    )

    assert list(result.content.data) == [
        pe_errors.ErrorOccurrence(
            id="error-id",
            errorType="PrettyBadError",
            createdAt=datetime(year=2024, month=4, day=4),
            detail="Things are not looking good.",
        )
    ]
    assert result.content.meta == MultiBodyMeta(cursor=1, totalLength=3)
    assert result.status_code == 200


@pytest.mark.parametrize(
    "error_list, expected_cursor_result",
    [([], 0), ([pe_errors.ErrorOccurrence.model_construct(id="error-id")], 1)],
)
async def test_get_run_commands_errors_defualt_cursor(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    error_list: list[pe_errors.ErrorOccurrence],
    expected_cursor_result: int,
) -> None:
    """It should return a list of all commands errors in a run."""
    decoy.when(mock_run_data_manager.get_command_errors_count("run-id")).then_return(1)

    command_error_slice = CommandErrorSlice(
        cursor=expected_cursor_result, total_length=3, commands_errors=error_list
    )

    decoy.when(
        mock_run_data_manager.get_command_error_slice(
            run_id="run-id",
            cursor=0,
            length=42,
        )
    ).then_return(command_error_slice)

    result = await get_run_commands_error(
        runId="run-id",
        run_data_manager=mock_run_data_manager,
        cursor=None,
        pageLength=42,
    )

    assert list(result.content.data) == error_list
    assert result.content.meta == MultiBodyMeta(
        cursor=expected_cursor_result, totalLength=3
    )
    assert result.status_code == 200


async def test_get_current_state_success(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    mock_hardware_api: HardwareControlAPI,
) -> None:
    """It should return different state from the current run.

    - the active nozzle layout for a specific pipette.
    - place plate reader state for absorbance reader.
    """
    run_id = "test-run-id"

    decoy.when(mock_run_data_manager.get_tip_attached(run_id=run_id)).then_return(
        {"mock-pipette-id": True}
    )

    decoy.when(mock_run_data_manager.get_nozzle_maps(run_id=run_id)).then_return(
        {
            "mock-pipette-id": NozzleMap(
                configuration=NozzleConfigurationType.FULL,
                columns={"1": ["A1"]},
                rows={"A": ["A1"]},
                map_store={"A1": Point(0, 0, 0)},
                starting_nozzle="A1",
                valid_map_key="mock-key",
                full_instrument_map_store={},
                full_instrument_rows={},
            )
        }
    )
    command_pointer = CommandPointer(
        command_id="command-id",
        command_key="command-key",
        created_at=datetime(year=2024, month=4, day=4),
        index=101,
    )
    decoy.when(
        mock_run_data_manager.get_last_completed_command(run_id=run_id)
    ).then_return(command_pointer)
    decoy.when(mock_run_data_manager.get_current_command(run_id=run_id)).then_return(
        command_pointer
    )

    result = await get_current_state(
        runId=run_id,
        run_data_manager=mock_run_data_manager,
        hardware=mock_hardware_api,
        robot_type=RobotTypeEnum.FLEX,
    )

    assert result.status_code == 200
    assert result.content.data == RunCurrentState.model_construct(
        estopEngaged=False,
        activeNozzleLayouts={
            "mock-pipette-id": ActiveNozzleLayout(
                startingNozzle="A1",
                activeNozzles=["A1"],
                config=NozzleLayoutConfig.FULL,
            )
        },
        tipStates={"mock-pipette-id": TipState(hasTip=True)},
        placeLabwareState=None,
    )
    assert result.content.links == CurrentStateLinks(
        lastCompleted=CommandLinkNoMeta(
            href="/runs/test-run-id/commands/command-id",
            id="command-id",
        )
    )


async def test_get_current_state_run_not_current(
    decoy: Decoy,
    mock_run_data_manager: RunDataManager,
    mock_hardware_api: HardwareControlAPI,
) -> None:
    """It should raise RunStopped when the run is not current."""
    run_id = "non-current-run-id"

    decoy.when(mock_run_data_manager.get(run_id=run_id)).then_raise(
        RunNotCurrentError("Run is not current")
    )

    with pytest.raises(ApiError) as exc_info:
        await get_current_state(
            runId=run_id,
            run_data_manager=mock_run_data_manager,
            hardware=mock_hardware_api,
            robot_type=RobotTypeEnum.FLEX,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"
