"""Tests for /runs routes dealing with labware offsets and definitions."""

import pytest
from datetime import datetime
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import EngineStatus, types as pe_types
from opentrons.protocols.models import LabwareDefinition

from robot_server.errors.error_responses import ApiError
from robot_server.service.json_api import RequestModel, SimpleBody
from robot_server.runs.run_models import Run, LabwareDefinitionSummary
from robot_server.runs.run_data_manager import RunDataManager
from robot_server.runs.run_orchestrator_store import RunOrchestratorStore
from robot_server.runs.router.labware_router import (
    add_labware_offset,
    add_labware_definition,
    get_run_loaded_labware_definitions,
)
from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition as SD_LabwareDefinition,
)


@pytest.fixture()
def run() -> Run:
    """Get a fixture Run response data."""
    return Run(
        id="run-id",
        createdAt=datetime(year=2021, month=1, day=1),
        status=EngineStatus.IDLE,
        current=True,
        actions=[],
        errors=[],
        pipettes=[],
        labware=[],
        modules=[],
        labwareOffsets=[],
        protocolId=None,
        liquids=[],
        liquidClasses=[],
        outputFileIds=[],
        hasEverEnteredErrorRecovery=False,
    )


@pytest.fixture()
def labware_definition(minimal_labware_def: LabwareDefDict) -> LabwareDefinition:
    """Create a labware definition fixture."""
    return LabwareDefinition.model_validate(minimal_labware_def)


async def test_add_labware_offset(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    run: Run,
) -> None:
    """It should add the labware offset to the engine, assuming the run is current."""
    labware_offset_request = pe_types.LabwareOffsetCreate(
        definitionUri="namespace_1/load_name_1/123",
        location=pe_types.LabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        vector=pe_types.LabwareOffsetVector(x=1, y=2, z=3),
    )

    labware_offset = pe_types.LabwareOffset(
        id="labware-offset-id",
        createdAt=datetime(year=2022, month=2, day=2),
        definitionUri="labware-definition-uri",
        location=pe_types.LabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        vector=pe_types.LabwareOffsetVector(x=0, y=0, z=0),
    )

    decoy.when(
        mock_run_orchestrator_store.add_labware_offset(labware_offset_request)
    ).then_return(labware_offset)

    result = await add_labware_offset(
        request_body=RequestModel(data=labware_offset_request),
        run_orchestrator_store=mock_run_orchestrator_store,
        run=run,
    )

    assert result.content == SimpleBody(data=labware_offset)
    assert result.status_code == 201


async def test_add_labware_offset_not_current(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    run: Run,
) -> None:
    """It should 409 if the run is not current."""
    not_current_run = run.model_copy(update={"current": False})

    labware_offset_request = pe_types.LabwareOffsetCreate(
        definitionUri="namespace_1/load_name_1/123",
        location=pe_types.LabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        vector=pe_types.LabwareOffsetVector(x=1, y=2, z=3),
    )

    with pytest.raises(ApiError) as exc_info:
        await add_labware_offset(
            request_body=RequestModel(data=labware_offset_request),
            run_orchestrator_store=mock_run_orchestrator_store,
            run=not_current_run,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"


async def test_add_labware_definition(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    run: Run,
    labware_definition: LabwareDefinition,
) -> None:
    """It should be able to add a labware definition to the engine."""
    uri = pe_types.LabwareUri("some/definition/uri")

    decoy.when(
        mock_run_orchestrator_store.add_labware_definition(labware_definition)
    ).then_return(uri)

    result = await add_labware_definition(
        run_orchestrator_store=mock_run_orchestrator_store,
        run=run,
        request_body=RequestModel(data=labware_definition),
    )

    assert result.content.data == LabwareDefinitionSummary(definitionUri=uri)
    assert result.status_code == 201


async def test_add_labware_definition_not_current(
    decoy: Decoy,
    mock_run_orchestrator_store: RunOrchestratorStore,
    run: Run,
    labware_definition: LabwareDefinition,
) -> None:
    """It should 409 if the run is not current."""
    not_current_run = run.model_copy(update={"current": False})

    with pytest.raises(ApiError) as exc_info:
        await add_labware_definition(
            run_orchestrator_store=mock_run_orchestrator_store,
            run=not_current_run,
            request_body=RequestModel(data=labware_definition),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.content["errors"][0]["id"] == "RunStopped"


async def test_get_run_labware_definition(
    mock_run_data_manager: RunDataManager, decoy: Decoy
) -> None:
    """It should wrap the run's labware defintion in a response."""
    decoy.when(
        mock_run_data_manager.get_run_loaded_labware_definitions(run_id="run-id")
    ).then_return(
        [
            SD_LabwareDefinition.model_construct(namespace="test_1"),  # type: ignore[call-arg]
            SD_LabwareDefinition.model_construct(namespace="test_2"),  # type: ignore[call-arg]
        ]
    )

    result = await get_run_loaded_labware_definitions(
        runId="run-id", run_data_manager=mock_run_data_manager
    )

    assert result.content.data == [
        SD_LabwareDefinition.model_construct(namespace="test_1"),  # type: ignore[call-arg]
        SD_LabwareDefinition.model_construct(namespace="test_2"),  # type: ignore[call-arg]
    ]
    assert result.status_code == 200
