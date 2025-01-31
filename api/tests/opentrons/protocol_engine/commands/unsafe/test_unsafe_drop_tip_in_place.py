"""Test unsafe drop tip in place commands."""
from opentrons.protocol_engine.state.update_types import (
    PipetteTipStateUpdate,
    PipetteUnknownFluidUpdate,
    StateUpdate,
)
import pytest
from decoy import Decoy

from opentrons.types import MountType
from opentrons.protocol_engine.state.state import StateView

from opentrons.protocol_engine.execution import TipHandler

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.unsafe.unsafe_drop_tip_in_place import (
    UnsafeDropTipInPlaceParams,
    UnsafeDropTipInPlaceResult,
    UnsafeDropTipInPlaceImplementation,
)
from opentrons.protocol_engine.state.motion import PipetteLocationData
from opentrons.hardware_control import OT3HardwareControlAPI
from opentrons.hardware_control.types import Axis


@pytest.fixture
def mock_tip_handler(decoy: Decoy) -> TipHandler:
    """Get a mock TipHandler."""
    return decoy.mock(cls=TipHandler)


async def test_drop_tip_implementation(
    decoy: Decoy,
    mock_tip_handler: TipHandler,
    state_view: StateView,
    ot3_hardware_api: OT3HardwareControlAPI,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = UnsafeDropTipInPlaceImplementation(
        tip_handler=mock_tip_handler,
        state_view=state_view,
        hardware_api=ot3_hardware_api,
    )

    params = UnsafeDropTipInPlaceParams(pipetteId="abc", homeAfter=False)
    decoy.when(state_view.motion.get_pipette_location(pipette_id="abc")).then_return(
        PipetteLocationData(mount=MountType.LEFT, critical_point=None)
    )

    result = await subject.execute(params)

    assert result == SuccessData(
        public=UnsafeDropTipInPlaceResult(),
        state_update=StateUpdate(
            pipette_tip_state=PipetteTipStateUpdate(
                pipette_id="abc", tip_geometry=None
            ),
            pipette_aspirated_fluid=PipetteUnknownFluidUpdate(pipette_id="abc"),
        ),
    )

    decoy.verify(
        await ot3_hardware_api.update_axis_position_estimations([Axis.P_L]),
        await mock_tip_handler.drop_tip(pipette_id="abc", home_after=False),
        times=1,
    )
