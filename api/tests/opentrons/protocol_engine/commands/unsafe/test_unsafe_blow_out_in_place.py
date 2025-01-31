"""Test blow-out-in-place commands."""
from decoy import Decoy

from opentrons.types import MountType
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.commands.unsafe.unsafe_blow_out_in_place import (
    UnsafeBlowOutInPlaceParams,
    UnsafeBlowOutInPlaceResult,
    UnsafeBlowOutInPlaceImplementation,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.execution import (
    PipettingHandler,
)
from opentrons.protocol_engine.state.motion import PipetteLocationData
from opentrons.hardware_control import OT3HardwareControlAPI
from opentrons.hardware_control.types import Axis


async def test_blow_out_in_place_implementation(
    decoy: Decoy,
    state_view: StateView,
    ot3_hardware_api: OT3HardwareControlAPI,
    pipetting: PipettingHandler,
) -> None:
    """Test UnsafeBlowOut command execution."""
    subject = UnsafeBlowOutInPlaceImplementation(
        state_view=state_view,
        hardware_api=ot3_hardware_api,
        pipetting=pipetting,
    )

    data = UnsafeBlowOutInPlaceParams(
        pipetteId="pipette-id",
        flowRate=1.234,
    )

    decoy.when(
        state_view.motion.get_pipette_location(pipette_id="pipette-id")
    ).then_return(PipetteLocationData(mount=MountType.LEFT, critical_point=None))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=UnsafeBlowOutInPlaceResult(),
        state_update=update_types.StateUpdate(
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="pipette-id"
            )
        ),
    )

    decoy.verify(
        await ot3_hardware_api.update_axis_position_estimations([Axis.P_L]),
        await pipetting.blow_out_in_place(pipette_id="pipette-id", flow_rate=1.234),
    )
