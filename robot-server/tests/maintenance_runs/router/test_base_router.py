"""Tests for base /runs routes."""

import pytest
from datetime import datetime
from decoy import Decoy

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import types as pe_types

from robot_server.errors.error_responses import ApiError
from robot_server.service.json_api import (
    RequestModel,
    SimpleEmptyBody,
    ResourceLink,
)


from robot_server.maintenance_runs.maintenance_run_models import (
    MaintenanceRun,
    MaintenanceRunCreate,
    MaintenanceRunNotFoundError,
)
from robot_server.maintenance_runs.maintenance_run_orchestrator_store import (
    RunConflictError,
)
from robot_server.maintenance_runs.maintenance_run_data_manager import (
    MaintenanceRunDataManager,
)

from robot_server.maintenance_runs.router.base_router import (
    create_run,
    get_run_data_from_url,
    get_run,
    remove_run,
    get_current_run,
    AllRunsLinks,
)

from robot_server.deck_configuration.store import DeckConfigurationStore


def mock_notify_publishers() -> None:
    """A mock notify_publishers."""
    return None


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
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
    labware_offset_create: pe_types.LabwareOffsetCreate,
    mock_deck_configuration_store: DeckConfigurationStore,
) -> None:
    """It should be able to create a basic run."""
    run_id = "run-id"
    run_created_at = datetime(year=2021, month=1, day=1)

    expected_response = MaintenanceRun(
        id=run_id,
        createdAt=run_created_at,
        current=True,
        errors=[],
        actions=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        status=pe_types.EngineStatus.IDLE,
        liquids=[],
        liquidClasses=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])
    decoy.when(
        await mock_maintenance_run_data_manager.create(
            run_id=run_id,
            created_at=run_created_at,
            labware_offsets=[labware_offset_create],
            deck_configuration=[],
            notify_publishers=mock_notify_publishers,
        )
    ).then_return(expected_response)

    result = await create_run(
        request_body=RequestModel(
            data=MaintenanceRunCreate(labwareOffsets=[labware_offset_create])
        ),
        run_data_manager=mock_maintenance_run_data_manager,
        run_id=run_id,
        created_at=run_created_at,
        is_ok_to_create_maintenance_run=True,
        deck_configuration_store=mock_deck_configuration_store,
        notify_publishers=mock_notify_publishers,
        check_estop=True,
    )

    assert result.content.data == expected_response
    assert result.status_code == 201


async def test_create_maintenance_run_with_protocol_run_conflict(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
    mock_deck_configuration_store: DeckConfigurationStore,
) -> None:
    """It should respond with a conflict error if protocol run is active during maintenance run creation."""
    created_at = datetime(year=2021, month=1, day=1)
    decoy.when(
        await mock_deck_configuration_store.get_deck_configuration()
    ).then_return([])
    with pytest.raises(ApiError) as exc_info:
        await create_run(
            run_id="run-id",
            created_at=created_at,
            request_body=None,
            run_data_manager=mock_maintenance_run_data_manager,
            is_ok_to_create_maintenance_run=False,
            deck_configuration_store=mock_deck_configuration_store,
            check_estop=True,
            notify_publishers=mock_notify_publishers,
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolRunIsActive"


async def test_get_run_data_from_url(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should be able to get a run by ID."""
    expected_response = MaintenanceRun(
        id="run-id",
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_types.EngineStatus.IDLE,
        current=False,
        errors=[],
        actions=[],
        pipettes=[],
        modules=[],
        labware=[],
        labwareOffsets=[],
        liquids=[],
        liquidClasses=[],
        hasEverEnteredErrorRecovery=False,
    )

    decoy.when(mock_maintenance_run_data_manager.get("run-id")).then_return(
        expected_response
    )

    result = await get_run_data_from_url(
        runId="run-id",
        run_data_manager=mock_maintenance_run_data_manager,
    )

    assert result == expected_response


async def test_get_run_with_missing_id(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should 404 if the run ID does not exist."""
    not_found_error = MaintenanceRunNotFoundError(run_id="run-id")

    decoy.when(mock_maintenance_run_data_manager.get(run_id="run-id")).then_raise(
        not_found_error
    )

    with pytest.raises(ApiError) as exc_info:
        await get_run_data_from_url(
            runId="run-id",
            run_data_manager=mock_maintenance_run_data_manager,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_get_run() -> None:
    """It should wrap the run data in a response."""
    run_data = MaintenanceRun(
        id="run-id",
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
        hasEverEnteredErrorRecovery=False,
    )

    result = await get_run(run_data=run_data)

    assert result.content.data == run_data
    assert result.status_code == 200


async def test_get_current_run(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should wrap the current run data in a response."""
    current_run_data = MaintenanceRun(
        id="current-run-id",
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
        hasEverEnteredErrorRecovery=False,
    )
    decoy.when(mock_maintenance_run_data_manager.current_run_id).then_return(
        "current-run-id"
    )
    decoy.when(mock_maintenance_run_data_manager.get("current-run-id")).then_return(
        current_run_data
    )

    result = await get_current_run(run_data_manager=mock_maintenance_run_data_manager)

    assert result.content.data == current_run_data
    assert result.content.links == AllRunsLinks(
        current=ResourceLink(href="/maintenance_runs/current-run-id")
    )
    assert result.status_code == 200


async def test_get_no_current_run(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should return an empty collection response when no current run exists."""
    decoy.when(mock_maintenance_run_data_manager.current_run_id).then_return(None)

    with pytest.raises(ApiError) as exc_info:
        await get_current_run(run_data_manager=mock_maintenance_run_data_manager)

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "NoCurrentRunFound"


async def test_delete_run_by_id(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should be able to remove a run by ID."""
    result = await remove_run(
        runId="run-id", run_data_manager=mock_maintenance_run_data_manager
    )

    decoy.verify(await mock_maintenance_run_data_manager.delete("run-id"), times=1)

    assert result.content == SimpleEmptyBody()
    assert result.status_code == 200


async def test_delete_run_with_bad_id(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should 404 if the run ID does not exist."""
    decoy.when(await mock_maintenance_run_data_manager.delete("run-id")).then_raise(
        MaintenanceRunNotFoundError("uh oh")
    )

    with pytest.raises(ApiError) as exc_info:
        await remove_run(
            runId="run-id", run_data_manager=mock_maintenance_run_data_manager
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "RunNotFound"


async def test_delete_active_run(
    decoy: Decoy,
    mock_maintenance_run_data_manager: MaintenanceRunDataManager,
) -> None:
    """It should 409 if the run is not finished."""
    decoy.when(await mock_maintenance_run_data_manager.delete("run-id")).then_raise(
        RunConflictError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await remove_run(
            runId="run-id", run_data_manager=mock_maintenance_run_data_manager
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunNotIdle"
