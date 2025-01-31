"""Test blow-out command."""

from datetime import datetime

from decoy import Decoy, matchers
import pytest

from opentrons.protocol_engine.commands.pipetting_common import OverpressureError
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.types import Point
from opentrons.protocol_engine import (
    WellLocation,
    WellOrigin,
    WellOffset,
    DeckPoint,
)
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.commands import (
    BlowOutResult,
    BlowOutImplementation,
    BlowOutParams,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.execution import (
    MovementHandler,
    PipettingHandler,
)
from opentrons.hardware_control import HardwareControlAPI
from opentrons_shared_data.errors.exceptions import (
    PipetteOverpressureError,
    StallOrCollisionDetectedError,
)


@pytest.fixture
def subject(
    state_view: StateView,
    hardware_api: HardwareControlAPI,
    movement: MovementHandler,
    model_utils: ModelUtils,
    pipetting: PipettingHandler,
) -> BlowOutImplementation:
    """Get the impelementation subject."""
    return BlowOutImplementation(
        state_view=state_view,
        movement=movement,
        hardware_api=hardware_api,
        pipetting=pipetting,
        model_utils=model_utils,
    )


async def test_blow_out_implementation(
    decoy: Decoy,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: BlowOutImplementation,
) -> None:
    """Test BlowOut command execution."""
    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = BlowOutParams(
        pipetteId="pipette-id",
        labwareId="labware-id",
        wellName="C6",
        wellLocation=location,
        flowRate=1.234,
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="C6",
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=1, y=2, z=3))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=BlowOutResult(position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(
                    labware_id="labware-id",
                    well_name="C6",
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="pipette-id"
            ),
        ),
    )

    decoy.verify(
        await pipetting.blow_out_in_place(pipette_id="pipette-id", flow_rate=1.234),
        times=1,
    )


async def test_overpressure_error(
    decoy: Decoy,
    pipetting: PipettingHandler,
    subject: BlowOutImplementation,
    model_utils: ModelUtils,
    movement: MovementHandler,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = BlowOutParams(
        pipetteId="pipette-id",
        labwareId="labware-id",
        wellName="C6",
        wellLocation=location,
        flowRate=1.234,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

    decoy.when(
        await pipetting.blow_out_in_place(pipette_id="pipette-id", flow_rate=1.234)
    ).then_raise(PipetteOverpressureError())

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)
    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="C6",
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=1, y=2, z=3))

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=OverpressureError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
            errorInfo={"retryLocation": (1, 2, 3)},
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(
                    labware_id="labware-id",
                    well_name="C6",
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="pipette-id"
            ),
        ),
        state_update_if_false_positive=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(
                    labware_id="labware-id",
                    well_name="C6",
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
        ),
    )


async def test_stall_error(
    decoy: Decoy,
    pipetting: PipettingHandler,
    subject: BlowOutImplementation,
    model_utils: ModelUtils,
    movement: MovementHandler,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "C6"
    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = BlowOutParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=location,
        flowRate=1.234,
    )

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)
    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_raise(StallOrCollisionDetectedError())

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
        ),
    )
