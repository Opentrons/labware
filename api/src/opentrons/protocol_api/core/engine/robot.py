from typing import Optional, Dict, Union
from opentrons.hardware_control import SyncHardwareAPI

from opentrons.types import Mount, MountType, Point, AxisType, AxisMapType
from opentrons_shared_data.pipette import types as pip_types
from opentrons.protocol_api._types import PipetteActionTypes, PlungerPositionTypes
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine.types import DeckPoint, MotorAxis

from opentrons.protocol_api.core.robot import AbstractRobot


_AXIS_TYPE_TO_MOTOR_AXIS = {
    AxisType.X: MotorAxis.X,
    AxisType.Y: MotorAxis.Y,
    AxisType.P_L: MotorAxis.LEFT_PLUNGER,
    AxisType.P_R: MotorAxis.RIGHT_PLUNGER,
    AxisType.Z_L: MotorAxis.LEFT_Z,
    AxisType.Z_R: MotorAxis.RIGHT_Z,
    AxisType.Z_G: MotorAxis.EXTENSION_Z,
    AxisType.G: MotorAxis.EXTENSION_JAW,
    AxisType.Q: MotorAxis.AXIS_96_CHANNEL_CAM,
}


class RobotCore(AbstractRobot):
    """Robot API core using a ProtocolEngine.

    Args:
        engine_client: A client to the ProtocolEngine that is executing the protocol.
        api_version: The Python Protocol API versionat which  this core is operating.
        sync_hardware: A SynchronousAdapter-wrapped Hardware Control API.
    """

    def __init__(
        self, engine_client: EngineClient, sync_hardware_api: SyncHardwareAPI
    ) -> None:
        self._engine_client = engine_client
        self._sync_hardware_api = sync_hardware_api

    def _convert_to_engine_mount(self, axis_map: AxisMapType) -> Dict[MotorAxis, float]:
        return {_AXIS_TYPE_TO_MOTOR_AXIS[ax]: dist for ax, dist in axis_map.items()}

    def get_pipette_type_from_engine(
        self, mount: Union[Mount, str]
    ) -> Optional[pip_types.PipetteNameType]:
        """Get the pipette attached to the given mount."""
        if isinstance(mount, Mount):
            engine_mount = MountType[mount.name]
        else:
            if mount.lower() == "right":
                engine_mount = MountType.RIGHT
            else:
                engine_mount = MountType.LEFT
        maybe_pipette = self._engine_client.state.pipettes.get_by_mount(engine_mount)
        return maybe_pipette.pipetteName if maybe_pipette else None

    def get_plunger_position_from_name(
        self, mount: Mount, position_name: PlungerPositionTypes
    ) -> float:
        engine_mount = MountType[mount.name]
        maybe_pipette = self._engine_client.state.pipettes.get_by_mount(engine_mount)
        if not maybe_pipette:
            return 0.0
        return self._engine_client.state.pipettes.lookup_plunger_position_name(
            maybe_pipette.id, position_name.value
        )

    def get_plunger_position_from_volume(
        self, mount: Mount, volume: float, action: PipetteActionTypes, robot_type: str
    ) -> float:
        engine_mount = MountType[mount.name]
        maybe_pipette = self._engine_client.state.pipettes.get_by_mount(engine_mount)
        if not maybe_pipette:
            raise RuntimeError(
                f"Cannot load plunger position as no pipette is attached to {mount}"
            )
        convert_volume = (
            self._engine_client.state.pipettes.lookup_volume_to_mm_conversion(
                maybe_pipette.id, volume, action.value
            )
        )
        plunger_bottom = (
            self._engine_client.state.pipettes.lookup_plunger_position_name(
                maybe_pipette.id, "bottom"
            )
        )
        mm = volume / convert_volume
        if robot_type == "OT-2 Standard":
            position = plunger_bottom + mm
        else:
            position = plunger_bottom - mm
        return round(position, 6)

    def move_to(self, mount: Mount, destination: Point, speed: Optional[float]) -> None:
        engine_mount = MountType[mount.name]
        engine_destination = DeckPoint(
            x=destination.x, y=destination.y, z=destination.z
        )
        self._engine_client.execute_command(
            cmd.robot.MoveToParams(
                mount=engine_mount, destination=engine_destination, speed=speed
            )
        )

    def move_axes_to(
        self,
        axis_map: AxisMapType,
        critical_point: Optional[AxisMapType],
        speed: Optional[float],
    ) -> None:
        axis_engine_map = self._convert_to_engine_mount(axis_map)
        if critical_point:
            critical_point_engine = self._convert_to_engine_mount(critical_point)
        else:
            critical_point_engine = None

        self._engine_client.execute_command(
            cmd.robot.MoveAxesToParams(
                axis_map=axis_engine_map,
                critical_point=critical_point_engine,
                speed=speed,
            )
        )

    def move_axes_relative(self, axis_map: AxisMapType, speed: Optional[float]) -> None:
        axis_engine_map = self._convert_to_engine_mount(axis_map)
        self._engine_client.execute_command(
            cmd.robot.MoveAxesRelativeParams(axis_map=axis_engine_map, speed=speed)
        )

    def release_grip(self) -> None:
        self._engine_client.execute_command(cmd.robot.openGripperJawParams())

    def close_gripper(self, force: Optional[float] = None) -> None:
        self._engine_client.execute_command(
            cmd.robot.closeGripperJawParams(force=force)
        )
