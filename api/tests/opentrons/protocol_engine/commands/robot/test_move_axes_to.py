"""Test robot.move-axes-to commands."""
from decoy import Decoy

from opentrons.hardware_control import HardwareControlAPI

from opentrons.protocol_engine.execution import GantryMover
from opentrons.protocol_engine.types import MotorAxis
from opentrons.hardware_control.protocols.types import FlexRobotType

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.robot.move_axes_to import (
    MoveAxesToParams,
    MoveAxesToResult,
    MoveAxesToImplementation,
)


async def test_move_axes_to_implementation(
    decoy: Decoy,
    gantry_mover: GantryMover,
    ot3_hardware_api: HardwareControlAPI,
) -> None:
    """Test the `robot.moveAxesTo` implementation.

    It should call `MovementHandler.move_mount_to` with the
    correct coordinates.
    """
    subject = MoveAxesToImplementation(
        gantry_mover=gantry_mover,
        hardware_api=ot3_hardware_api,
    )

    params = MoveAxesToParams(
        axis_map={MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20},
        critical_point={MotorAxis.X: 1, MotorAxis.Y: 1, MotorAxis.EXTENSION_Z: 0},
        speed=567.8,
    )

    # Flex shape
    decoy.when(ot3_hardware_api.get_robot_type()).then_return(FlexRobotType)
    decoy.when(
        await gantry_mover.move_axes(
            axis_map=params.axis_map,
            speed=params.speed,
            critical_point=params.critical_point,
        )
    ).then_return({MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20})
    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=MoveAxesToResult(
            position={MotorAxis.X: 10, MotorAxis.Y: 10, MotorAxis.EXTENSION_Z: 20}
        )
    )
