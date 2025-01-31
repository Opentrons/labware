"""Tests for /runs routes dealing with labware offsets and definitions."""
import pytest
from datetime import datetime
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import EngineStatus, types as pe_types
from opentrons.protocols.models import LabwareDefinition

from robot_server.service.json_api import RequestModel, SimpleBody
from robot_server.maintenance_runs.maintenance_run_models import (
    MaintenanceRun,
    LabwareDefinitionSummary,
)
from robot_server.maintenance_runs.maintenance_run_orchestrator_store import (
    MaintenanceRunOrchestratorStore,
)
from robot_server.maintenance_runs.router.labware_router import (
    add_labware_offset,
    add_labware_definition,
)


@pytest.fixture()
def run() -> MaintenanceRun:
    """Get a fixture Run response data."""
    return MaintenanceRun(
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
        liquids=[],
        liquidClasses=[],
        hasEverEnteredErrorRecovery=False,
    )


@pytest.fixture()
def labware_definition(minimal_labware_def: LabwareDefDict) -> LabwareDefinition:
    """Create a labware definition fixture."""
    return LabwareDefinition.model_validate(minimal_labware_def)


async def test_add_labware_offset(
    decoy: Decoy,
    mock_maintenance_run_orchestrator_store: MaintenanceRunOrchestratorStore,
    run: MaintenanceRun,
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
        mock_maintenance_run_orchestrator_store.add_labware_offset(
            labware_offset_request
        )
    ).then_return(labware_offset)

    result = await add_labware_offset(
        request_body=RequestModel(data=labware_offset_request),
        run_orchestrator_store=mock_maintenance_run_orchestrator_store,
        run=run,
    )

    assert result.content == SimpleBody(data=labware_offset)
    assert result.status_code == 201


async def test_add_labware_definition(
    decoy: Decoy,
    mock_maintenance_run_orchestrator_store: MaintenanceRunOrchestratorStore,
    run: MaintenanceRun,
    labware_definition: LabwareDefinition,
) -> None:
    """It should be able to add a labware definition to the engine."""
    uri = pe_types.LabwareUri("some/definition/uri")

    decoy.when(
        mock_maintenance_run_orchestrator_store.add_labware_definition(
            labware_definition
        )
    ).then_return(uri)

    result = await add_labware_definition(
        run_orchestrator_store=mock_maintenance_run_orchestrator_store,
        run=run,
        request_body=RequestModel(data=labware_definition),
    )

    assert result.content.data == LabwareDefinitionSummary(definitionUri=uri)
    assert result.status_code == 201
