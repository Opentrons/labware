"""Test update-position-estimator commands."""
from decoy import Decoy

from opentrons.protocol_engine.commands.unsafe.unsafe_engage_axes import (
    UnsafeEngageAxesParams,
    UnsafeEngageAxesResult,
    UnsafeEngageAxesImplementation,
)
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.execution import GantryMover
from opentrons.protocol_engine.types import MotorAxis
from opentrons.hardware_control import OT3HardwareControlAPI
from opentrons.hardware_control.types import Axis


async def test_engage_axes_implementation(
    decoy: Decoy, ot3_hardware_api: OT3HardwareControlAPI, gantry_mover: GantryMover
) -> None:
    """Test EngageAxes command execution."""
    subject = UnsafeEngageAxesImplementation(
        hardware_api=ot3_hardware_api, gantry_mover=gantry_mover
    )

    data = UnsafeEngageAxesParams(
        axes=[
            MotorAxis.LEFT_Z,
            MotorAxis.LEFT_PLUNGER,
            MotorAxis.X,
            MotorAxis.Y,
            MotorAxis.RIGHT_Z,
            MotorAxis.RIGHT_PLUNGER,
        ]
    )
    decoy.when(
        gantry_mover.motor_axes_to_present_hardware_axes(
            [
                MotorAxis.LEFT_Z,
                MotorAxis.LEFT_PLUNGER,
                MotorAxis.X,
                MotorAxis.Y,
                MotorAxis.RIGHT_Z,
                MotorAxis.RIGHT_PLUNGER,
            ]
        )
    ).then_return([Axis.Z_L, Axis.P_L, Axis.X, Axis.Y])

    decoy.when(
        await ot3_hardware_api.update_axis_position_estimations(
            [Axis.Z_L, Axis.P_L, Axis.X, Axis.Y]
        )
    ).then_return(None)

    result = await subject.execute(data)

    assert result == SuccessData(public=UnsafeEngageAxesResult())

    decoy.verify(
        await ot3_hardware_api.engage_axes([Axis.Z_L, Axis.P_L, Axis.X, Axis.Y]),
    )
