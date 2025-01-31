"""Test Flex Stacker retrieve command implementation."""
import pytest
from decoy import Decoy
from contextlib import nullcontext as does_not_raise
from typing import ContextManager, Any

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.hardware_control.modules import FlexStacker

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.update_types import (
    StateUpdate,
    FlexStackerStateUpdate,
    FlexStackerRetrieveLabware,
    LabwareLocationUpdate,
)
from opentrons.protocol_engine.state.module_substates import (
    FlexStackerSubState,
    FlexStackerId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import flex_stacker
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.flex_stacker.retrieve import RetrieveImpl
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    Dimensions,
    ModuleLocation,
    LoadedLabware,
    OverlapOffset,
)
from opentrons.protocol_engine.errors import CannotPerformModuleAction
from opentrons.types import DeckSlotName

from opentrons_shared_data.labware.labware_definition import LabwareDefinition


@pytest.mark.parametrize(
    "in_static_mode,expectation",
    [
        (
            True,
            pytest.raises(
                CannotPerformModuleAction,
                match="Cannot retrieve labware from Flex Stacker while in static mode",
            ),
        ),
        (False, does_not_raise()),
    ],
)
async def test_retrieve(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
    in_static_mode: bool,
    expectation: ContextManager[Any],
    tiprack_lid_def: LabwareDefinition,
) -> None:
    """It should be able to retrieve a labware."""
    subject = RetrieveImpl(state_view=state_view, equipment=equipment)
    data = flex_stacker.RetrieveParams(moduleId="flex-stacker-id")

    fs_module_substate = FlexStackerSubState(
        module_id=FlexStackerId("flex-stacker-id"),
        in_static_mode=in_static_mode,
        hopper_labware_ids=["labware-id"],
    )
    fs_hardware = decoy.mock(cls=FlexStacker)

    decoy.when(
        state_view.modules.get_flex_stacker_substate(module_id="flex-stacker-id")
    ).then_return(fs_module_substate)
    decoy.when(state_view.labware.get("labware-id")).then_return(
        LoadedLabware(
            id="labware-id",
            loadName="tiprack",
            definitionUri=uri_from_details(namespace="a", load_name="b", version=1),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            offsetId=None,
            lid_id="lid-id",
            displayName="Labware",
        )
    )

    decoy.when(state_view.labware.get_dimensions(labware_id="labware-id")).then_return(
        Dimensions(x=1, y=1, z=1)
    )

    decoy.when(state_view.labware.get_definition("lid-id")).then_return(tiprack_lid_def)

    decoy.when(
        state_view.labware.get_labware_overlap_offsets(tiprack_lid_def, "tiprack")
    ).then_return(OverlapOffset(x=0, y=0, z=14))

    decoy.when(
        equipment.get_module_hardware_api(FlexStackerId("flex-stacker-id"))
    ).then_return(fs_hardware)

    with expectation:
        result = await subject.execute(data)

    if not in_static_mode:
        decoy.verify(await fs_hardware.dispense_labware(labware_height=4), times=1)

        assert result == SuccessData(
            public=flex_stacker.RetrieveResult(labware_id="labware-id"),
            state_update=StateUpdate(
                labware_location=LabwareLocationUpdate(
                    labware_id="labware-id",
                    new_location=ModuleLocation(moduleId="flex-stacker-id"),
                    offset_id=None,
                ),
                flex_stacker_state_update=FlexStackerStateUpdate(
                    module_id="flex-stacker-id",
                    hopper_labware_update=FlexStackerRetrieveLabware(
                        labware_id="labware-id"
                    ),
                ),
            ),
        )
