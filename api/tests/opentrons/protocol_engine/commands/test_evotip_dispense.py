"""Test evotip dispense in place commands."""
import json

import pytest
from decoy import Decoy

from opentrons.protocol_engine import (
    LiquidHandlingWellLocation,
    WellOrigin,
    WellOffset,
    DeckPoint,
)
from opentrons.types import Point
from opentrons.protocol_engine.execution import (
    PipettingHandler,
    GantryMover,
    MovementHandler,
)

from opentrons.protocols.models import LabwareDefinition
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.evotip_dispense import (
    EvotipDispenseParams,
    EvotipDispenseResult,
    EvotipDispenseImplementation,
)
from opentrons.protocol_engine.resources import ModelUtils
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state import update_types

from opentrons_shared_data import load_shared_data


@pytest.fixture
def evotips_definition() -> LabwareDefinition:
    """A fixturee of the evotips definition."""
    # TODO (chb 2025-01-29): When we migrate all labware to v3 we can clean this up
    return LabwareDefinition.model_validate(
        json.loads(
            load_shared_data(
                "labware/definitions/3/evotips_opentrons_96_labware/1.json"
            )
        )
    )


@pytest.fixture
def subject(
    pipetting: PipettingHandler,
    state_view: StateView,
    gantry_mover: GantryMover,
    model_utils: ModelUtils,
    movement: MovementHandler,
    **kwargs: object,
) -> EvotipDispenseImplementation:
    """Build a command implementation."""
    return EvotipDispenseImplementation(
        pipetting=pipetting,
        state_view=state_view,
        gantry_mover=gantry_mover,
        model_utils=model_utils,
        movement=movement,
    )


async def test_evotip_dispense_implementation(
    decoy: Decoy,
    movement: MovementHandler,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    state_view: StateView,
    subject: EvotipDispenseImplementation,
    evotips_definition: LabwareDefinition,
) -> None:
    """It should dispense in place."""
    well_location = LiquidHandlingWellLocation(
        origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=0)
    )

    data = EvotipDispenseParams(
        pipetteId="pipette-id-abc123",
        labwareId="labware-id-abc123",
        wellName="A3",
        volume=100,
        flowRate=456,
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id-abc123",
            labware_id="labware-id-abc123",
            well_name="A3",
            well_location=well_location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=1, y=2, z=3))

    decoy.when(state_view.labware.get_definition("labware-id-abc123")).then_return(
        evotips_definition
    )

    decoy.when(
        await pipetting.dispense_in_place(
            pipette_id="pipette-id-abc123", volume=100.0, flow_rate=456.0, push_out=None
        )
    ).then_return(100)

    decoy.when(await gantry_mover.get_position("pipette-id-abc123")).then_return(
        Point(1, 2, 3)
    )

    result = await subject.execute(data)

    assert result == SuccessData(
        public=EvotipDispenseResult(volume=100),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id-abc123",
                new_location=update_types.Well(
                    labware_id="labware-id-abc123",
                    well_name="A3",
                ),
                new_deck_point=DeckPoint.model_construct(x=1, y=2, z=3),
            ),
            pipette_aspirated_fluid=update_types.PipetteEjectedFluidUpdate(
                pipette_id="pipette-id-abc123", volume=100
            ),
        ),
    )
