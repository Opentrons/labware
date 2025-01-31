"""Test robot.move-axes-relative commands."""
from decoy import Decoy

from opentrons.hardware_control import HardwareControlAPI

from opentrons.protocol_engine.execution import GantryMover
from opentrons.protocol_engine.types import MotorAxis
from opentrons.hardware_control.protocols.types import FlexRobotType

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.robot.move_axes_relative import (
    MoveAxesRelativeParams,
    MoveAxesRelativeResult,
    MoveAxesRelativeImplementation,
)


async def test_move_axes_to_implementation(
    decoy: Decoy,
    gantry_mover: GantryMover,
    ot3_hardware_api: HardwareControlAPI,
) -> None:
    """Test the `robot.moveAxesRelative` implementation.

    It should call `MovementHandler.move_mount_to` with the
    correct coordinates.
    """
    subject = MoveAxesRelativeImplementation(
        gantry_mover=gantry_mover,
        hardware_api=ot3_hardware_api,
    )

    params = MoveAxesRelativeParams(
        axis_map={MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20},
        speed=567.8,
    )

    # Flex shape
    decoy.when(ot3_hardware_api.get_robot_type()).then_return(FlexRobotType)
    decoy.when(
        await gantry_mover.move_axes(
            axis_map=params.axis_map, speed=params.speed, relative_move=True
        )
    ).then_return({MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20})

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=MoveAxesRelativeResult(
            position={MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20}
        )
    )
