"""Test blow-out-in-place commands."""
from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons.protocol_engine.commands.pipetting_common import OverpressureError
from opentrons.protocol_engine.execution.gantry_mover import GantryMover
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.commands.blow_out_in_place import (
    BlowOutInPlaceParams,
    BlowOutInPlaceResult,
    BlowOutInPlaceImplementation,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.execution import (
    PipettingHandler,
)
from opentrons.hardware_control import HardwareControlAPI
from opentrons.types import Point
from opentrons_shared_data.errors.exceptions import PipetteOverpressureError


@pytest.fixture
def subject(
    pipetting: PipettingHandler,
    state_view: StateView,
    hardware_api: HardwareControlAPI,
    model_utils: ModelUtils,
    gantry_mover: GantryMover,
) -> BlowOutInPlaceImplementation:
    """Get the impelementation subject."""
    return BlowOutInPlaceImplementation(
        pipetting=pipetting,
        hardware_api=hardware_api,
        state_view=state_view,
        model_utils=model_utils,
        gantry_mover=gantry_mover,
    )


async def test_blow_out_in_place_implementation(
    decoy: Decoy,
    gantry_mover: GantryMover,
    subject: BlowOutInPlaceImplementation,
    pipetting: PipettingHandler,
) -> None:
    """Test BlowOut command execution."""
    data = BlowOutInPlaceParams(
        pipetteId="pipette-id",
        flowRate=1.234,
    )
    decoy.when(await gantry_mover.get_position("pipette-id")).then_return(
        Point(1, 2, 3)
    )

    result = await subject.execute(data)
    assert result == SuccessData(
        public=BlowOutInPlaceResult(),
        state_update=update_types.StateUpdate(
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="pipette-id"
            )
        ),
    )

    decoy.verify(
        await pipetting.blow_out_in_place(pipette_id="pipette-id", flow_rate=1.234)
    )


async def test_overpressure_error(
    decoy: Decoy,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    subject: BlowOutInPlaceImplementation,
    model_utils: ModelUtils,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"

    position = Point(x=1, y=2, z=3)

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    data = BlowOutInPlaceParams(
        pipetteId=pipette_id,
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
    decoy.when(await gantry_mover.get_position(pipette_id)).then_return(position)

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=OverpressureError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
            errorInfo={"retryLocation": (position.x, position.y, position.z)},
        ),
        state_update=update_types.StateUpdate(
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="pipette-id"
            )
        ),
    )
