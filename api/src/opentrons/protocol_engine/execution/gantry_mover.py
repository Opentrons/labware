"""Gantry movement wrapper for hardware and simulation based movement."""
from logging import getLogger
from opentrons.config.types import OT3Config
from functools import partial
from typing import Optional, List, Dict, Tuple
from typing_extensions import Protocol as TypingProtocol

from opentrons.types import Point, Mount, MountType

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import Axis as HardwareAxis, CriticalPoint
from opentrons.hardware_control.motion_utilities import (
    target_axis_map_from_relative,
    target_axis_map_from_absolute,
)
from opentrons_shared_data.errors.exceptions import PositionUnknownError

from opentrons.motion_planning import Waypoint

from ..state.state import StateView
from ..types import MotorAxis, CurrentWell
from ..errors import MustHomeError, InvalidAxisForRobotType

log = getLogger(__name__)


_MOTOR_AXIS_TO_HARDWARE_AXIS: Dict[MotorAxis, HardwareAxis] = {
    MotorAxis.X: HardwareAxis.X,
    MotorAxis.Y: HardwareAxis.Y,
    MotorAxis.LEFT_Z: HardwareAxis.Z,
    MotorAxis.RIGHT_Z: HardwareAxis.A,
    MotorAxis.LEFT_PLUNGER: HardwareAxis.B,
    MotorAxis.RIGHT_PLUNGER: HardwareAxis.C,
    MotorAxis.EXTENSION_Z: HardwareAxis.Z_G,
    MotorAxis.EXTENSION_JAW: HardwareAxis.G,
    MotorAxis.AXIS_96_CHANNEL_CAM: HardwareAxis.Q,
}

_MOTOR_AXIS_TO_HARDWARE_MOUNT: Dict[MotorAxis, Mount] = {
    MotorAxis.LEFT_Z: Mount.LEFT,
    MotorAxis.RIGHT_Z: Mount.RIGHT,
    MotorAxis.EXTENSION_Z: Mount.EXTENSION,
}

_HARDWARE_MOUNT_MOTOR_AXIS_TO: Dict[Mount, MotorAxis] = {
    Mount.LEFT: MotorAxis.LEFT_Z,
    Mount.RIGHT: MotorAxis.RIGHT_Z,
    Mount.EXTENSION: MotorAxis.EXTENSION_Z,
}

_HARDWARE_AXIS_TO_MOTOR_AXIS: Dict[HardwareAxis, MotorAxis] = {
    HardwareAxis.X: MotorAxis.X,
    HardwareAxis.Y: MotorAxis.Y,
    HardwareAxis.Z: MotorAxis.LEFT_Z,
    HardwareAxis.A: MotorAxis.RIGHT_Z,
    HardwareAxis.B: MotorAxis.LEFT_PLUNGER,
    HardwareAxis.C: MotorAxis.RIGHT_PLUNGER,
    HardwareAxis.P_L: MotorAxis.LEFT_PLUNGER,
    HardwareAxis.P_R: MotorAxis.RIGHT_PLUNGER,
    HardwareAxis.Z_L: MotorAxis.LEFT_Z,
    HardwareAxis.Z_R: MotorAxis.RIGHT_Z,
    HardwareAxis.Z_G: MotorAxis.EXTENSION_Z,
    HardwareAxis.G: MotorAxis.EXTENSION_JAW,
    HardwareAxis.Q: MotorAxis.AXIS_96_CHANNEL_CAM,
}


# The height of the bottom of the pipette nozzle at home position without any tips.
# We rely on this being the same for every OT-3 pipette.
#
# We found this number by peeking at the height that OT3Simulator returns for these pipettes:
#   * Flex Single- and 8-Channel P50
#   * Flex Single-, 8-, and 96-channel P1000
#
# That OT3Simulator return value is what Protocol Engine uses for simulation when Protocol Engine
# is configured to not virtualize pipettes, so this number should match it.
VIRTUAL_MAX_OT3_HEIGHT = 248.0
# This number was found by using the longest pipette's P1000V2 default configuration values.
VIRTUAL_MAX_OT2_HEIGHT = 268.14


class GantryMover(TypingProtocol):
    """Abstract class for gantry movement handler."""

    async def get_position(
        self,
        pipette_id: str,
        current_well: Optional[CurrentWell] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry."""
        ...

    async def get_position_from_mount(
        self,
        mount: Mount,
        critical_point: Optional[CriticalPoint] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry based on the given mount."""
        ...

    def get_max_travel_z(self, pipette_id: str) -> float:
        """Get the maximum allowed z-height for pipette movement."""
        ...

    def get_max_travel_z_from_mount(self, mount: MountType) -> float:
        """Get the maximum allowed z-height for mount movement."""
        ...

    async def move_axes(
        self,
        axis_map: Dict[MotorAxis, float],
        critical_point: Optional[Dict[MotorAxis, float]] = None,
        speed: Optional[float] = None,
        relative_move: bool = False,
        expect_stalls: bool = False,
    ) -> Dict[MotorAxis, float]:
        """Move a set of axes a given distance."""
        ...

    async def move_to(
        self, pipette_id: str, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the hardware gantry to a waypoint."""
        ...

    async def move_mount_to(
        self, mount: Mount, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the provided hardware mount to a waypoint."""
        ...

    async def move_relative(
        self,
        pipette_id: str,
        delta: Point,
        speed: Optional[float],
    ) -> Point:
        """Move the hardware gantry in a relative direction by delta."""
        ...

    async def home(self, axes: Optional[List[MotorAxis]]) -> None:
        """Home the gantry."""
        ...

    async def retract_axis(self, axis: MotorAxis) -> None:
        """Retract the specified axis to its home position."""
        ...

    async def prepare_for_mount_movement(self, mount: Mount) -> None:
        """Retract the 'idle' mount if necessary."""
        ...

    def motor_axis_to_hardware_axis(self, motor_axis: MotorAxis) -> HardwareAxis:
        """Transform an engine motor axis into a hardware axis."""
        ...

    def pick_mount_from_axis_map(self, axis_map: Dict[MotorAxis, float]) -> Mount:
        """Find a mount axis in the axis_map if it exists otherwise default to left mount."""
        ...

    def motor_axes_to_present_hardware_axes(
        self, motor_axes: List[MotorAxis]
    ) -> List[HardwareAxis]:
        """Transform a list of engine axes into a list of hardware axes, filtering out non-present axes."""
        ...


class HardwareGantryMover(GantryMover):
    """Hardware API based gantry movement handler."""

    def __init__(self, hardware_api: HardwareControlAPI, state_view: StateView) -> None:
        self._hardware_api = hardware_api
        self._state_view = state_view

    def motor_axes_to_present_hardware_axes(
        self, motor_axes: List[MotorAxis]
    ) -> List[HardwareAxis]:
        """Get hardware axes from engine axes while filtering out non-present axes."""
        return [
            self.motor_axis_to_hardware_axis(motor_axis)
            for motor_axis in motor_axes
            if self._hardware_api.axis_is_present(
                self.motor_axis_to_hardware_axis(motor_axis)
            )
        ]

    def motor_axis_to_hardware_axis(self, motor_axis: MotorAxis) -> HardwareAxis:
        """Transform an engine motor axis into a hardware axis."""
        return _MOTOR_AXIS_TO_HARDWARE_AXIS[motor_axis]

    def _hardware_axis_to_motor_axis(self, motor_axis: HardwareAxis) -> MotorAxis:
        """Transform an hardware axis into a engine motor axis."""
        return _HARDWARE_AXIS_TO_MOTOR_AXIS[motor_axis]

    def _convert_axis_map_for_hw(
        self, axis_map: Dict[MotorAxis, float]
    ) -> Dict[HardwareAxis, float]:
        """Transform an engine motor axis map to a hardware axis map."""
        return {_MOTOR_AXIS_TO_HARDWARE_AXIS[ax]: dist for ax, dist in axis_map.items()}

    def _critical_point_for(
        self, mount: Mount, cp_override: Optional[Dict[MotorAxis, float]] = None
    ) -> Point:
        if cp_override:
            return Point(
                x=cp_override[MotorAxis.X],
                y=cp_override[MotorAxis.Y],
                z=cp_override[_HARDWARE_MOUNT_MOTOR_AXIS_TO[mount]],
            )
        else:
            return self._hardware_api.critical_point_for(mount)

    def _get_gantry_offsets_for_robot_type(
        self,
    ) -> Tuple[Point, Point, Optional[Point]]:
        if isinstance(self._hardware_api.config, OT3Config):
            return (
                Point(*self._hardware_api.config.left_mount_offset),
                Point(*self._hardware_api.config.right_mount_offset),
                Point(*self._hardware_api.config.gripper_mount_offset),
            )
        else:
            return (
                Point(*self._hardware_api.config.left_mount_offset),
                Point(0, 0, 0),
                None,
            )

    def pick_mount_from_axis_map(self, axis_map: Dict[MotorAxis, float]) -> Mount:
        """Find a mount axis in the axis_map if it exists otherwise default to left mount."""
        found_mount = Mount.LEFT
        mounts = list(_MOTOR_AXIS_TO_HARDWARE_MOUNT.keys())
        for k in axis_map.keys():
            if k in mounts:
                found_mount = _MOTOR_AXIS_TO_HARDWARE_MOUNT[k]
                break
        return found_mount

    async def get_position(
        self,
        pipette_id: str,
        current_well: Optional[CurrentWell] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry.

        Args:
            pipette_id: Pipette ID to get location data for.
            current_well: Optional parameter for getting pipette location data, effects critical point.
            fail_on_not_homed: Raise PositionUnknownError if gantry position is not known.
        """
        pipette_location = self._state_view.motion.get_pipette_location(
            pipette_id=pipette_id,
            current_location=current_well,
        )
        point = await self.get_position_from_mount(
            mount=pipette_location.mount.to_hw_mount(),
            critical_point=pipette_location.critical_point,
            fail_on_not_homed=fail_on_not_homed,
        )
        return point

    async def get_position_from_mount(
        self,
        mount: Mount,
        critical_point: Optional[CriticalPoint] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry based on the mount.

        Args:
            mount: The mount to get the position for.
            critical_point: Optional parameter for getting instrument location data, effects critical point.
            fail_on_not_homed: Raise PositionUnknownError if gantry position is not known.
        """
        try:
            point = await self._hardware_api.gantry_position(
                mount=mount,
                critical_point=critical_point,
                fail_on_not_homed=fail_on_not_homed,
            )
            return point
        except PositionUnknownError as e:
            raise MustHomeError(message=str(e), wrapping=[e])

    def get_max_travel_z(self, pipette_id: str) -> float:
        """Get the maximum allowed z-height for pipette movement.

        Args:
            pipette_id: Pipette ID to get max travel z-height for.
        """
        mount = self._state_view.pipettes.get_mount(pipette_id)
        return self.get_max_travel_z_from_mount(mount=mount)

    def get_max_travel_z_from_mount(self, mount: MountType) -> float:
        """Get the maximum allowed z-height for any mount movement.

        Args:
            mount: Mount to get max travel z-height for.
        """
        return self._hardware_api.get_instrument_max_height(mount=mount.to_hw_mount())

    async def move_to(
        self, pipette_id: str, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the hardware gantry to a waypoint."""
        assert len(waypoints) > 0, "Must have at least one waypoint"

        hw_mount = self._state_view.pipettes.get_mount(pipette_id).to_hw_mount()

        for waypoint in waypoints:
            await self._hardware_api.move_to(
                mount=hw_mount,
                abs_position=waypoint.position,
                critical_point=waypoint.critical_point,
                speed=speed,
            )

        return waypoints[-1].position

    async def move_mount_to(
        self, mount: Mount, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the given hardware mount to a waypoint."""
        assert len(waypoints) > 0, "Must have at least one waypoint"
        for waypoint in waypoints:
            log.info(f"The current waypoint moving is {waypoint}")
            await self._hardware_api.move_to(
                mount=mount,
                abs_position=waypoint.position,
                critical_point=waypoint.critical_point,
                speed=speed,
            )

        return waypoints[-1].position

    async def move_axes(
        self,
        axis_map: Dict[MotorAxis, float],
        critical_point: Optional[Dict[MotorAxis, float]] = None,
        speed: Optional[float] = None,
        relative_move: bool = False,
        expect_stalls: bool = False,
    ) -> Dict[MotorAxis, float]:
        """Move a set of axes a given distance.

        Args:
            axis_map: The mapping of axes to command.
            critical_point: A critical point override for axes
            speed: Optional speed parameter for the move.
            relative_move: Whether the axis map needs to be converted from a relative to absolute move.
            expect_stalls: Whether it is expected that the move triggers a stall error.
        """
        try:
            pos_hw = self._convert_axis_map_for_hw(axis_map)
            mount = self.pick_mount_from_axis_map(axis_map)
            if relative_move:
                current_position = await self._hardware_api.current_position(
                    mount, refresh=True
                )
                log.info(f"The current position of the robot is: {current_position}.")
                converted_current_position_deck = (
                    self._hardware_api.get_deck_from_machine(current_position)
                )
                log.info(f"The current position of the robot is: {current_position}.")

                pos_hw = target_axis_map_from_relative(pos_hw, current_position)
                log.info(
                    f"The absolute position is: {pos_hw} and hw pos map is {pos_hw}."
                )
            log.info(f"The calculated move {pos_hw} and {mount}")
            (
                left_offset,
                right_offset,
                gripper_offset,
            ) = self._get_gantry_offsets_for_robot_type()
            absolute_pos = target_axis_map_from_absolute(
                mount,
                pos_hw,
                partial(self._critical_point_for, cp_override=critical_point),
                left_mount_offset=left_offset,
                right_mount_offset=right_offset,
                gripper_mount_offset=gripper_offset,
            )
            log.info(f"The prepped abs {absolute_pos}")
            await self._hardware_api.move_axes(
                position=absolute_pos,
                speed=speed,
                expect_stalls=expect_stalls,
            )

        except PositionUnknownError as e:
            raise MustHomeError(message=str(e), wrapping=[e])

        current_position = await self._hardware_api.current_position(
            mount, refresh=True
        )
        converted_current_position_deck = self._hardware_api.get_deck_from_machine(
            current_position
        )
        return {
            self._hardware_axis_to_motor_axis(ax): pos
            for ax, pos in converted_current_position_deck.items()
        }

    async def move_relative(
        self,
        pipette_id: str,
        delta: Point,
        speed: Optional[float],
    ) -> Point:
        """Move the hardware gantry in a relative direction by delta.

        Args:
            pipette_id: Not used in hardware implementation.
            delta: Relative X/Y/Z distance to move gantry.
            speed: Optional speed parameter for the move.
        """
        pipette_location = self._state_view.motion.get_pipette_location(
            pipette_id=pipette_id,
        )
        critical_point = pipette_location.critical_point
        hw_mount = pipette_location.mount.to_hw_mount()
        try:
            await self._hardware_api.move_rel(
                mount=hw_mount,
                delta=delta,
                fail_on_not_homed=True,
                speed=speed,
            )
            point = await self._hardware_api.gantry_position(
                mount=hw_mount,
                critical_point=critical_point,
                fail_on_not_homed=True,
            )
        except PositionUnknownError as e:
            raise MustHomeError(message=str(e), wrapping=[e])

        return point

    async def home(self, axes: Optional[List[MotorAxis]]) -> None:
        """Home the gantry."""
        # TODO(mc, 2022-12-01): this is overly complicated
        # https://opentrons.atlassian.net/browse/RET-1287
        if axes is None:
            await self._hardware_api.home()
        elif axes == [MotorAxis.LEFT_PLUNGER]:
            await self._hardware_api.home_plunger(Mount.LEFT)
        elif axes == [MotorAxis.RIGHT_PLUNGER]:
            await self._hardware_api.home_plunger(Mount.RIGHT)
        elif axes == [MotorAxis.LEFT_Z, MotorAxis.LEFT_PLUNGER]:
            await self._hardware_api.home_z(Mount.LEFT)
            await self._hardware_api.home_plunger(Mount.LEFT)
        elif axes == [MotorAxis.RIGHT_Z, MotorAxis.RIGHT_PLUNGER]:
            await self._hardware_api.home_z(Mount.RIGHT)
            await self._hardware_api.home_plunger(Mount.RIGHT)
        else:
            hardware_axes = [_MOTOR_AXIS_TO_HARDWARE_AXIS[a] for a in axes]
            if self._state_view.config.robot_type == "OT-2 Standard" and any(
                axis not in HardwareAxis.ot2_axes() for axis in hardware_axes
            ):
                raise InvalidAxisForRobotType(
                    f"{axes} includes axes that are not valid for OT-2 Standard robot type"
                )
            # Hardware API will raise error if invalid axes are passed for the type of robot
            await self._hardware_api.home(axes=hardware_axes)

    async def retract_axis(self, axis: MotorAxis) -> None:
        """Retract specified axis."""
        hardware_axis = _MOTOR_AXIS_TO_HARDWARE_AXIS[axis]
        if (
            self._state_view.config.robot_type == "OT-2 Standard"
            and hardware_axis not in HardwareAxis.ot2_axes()
        ):
            raise InvalidAxisForRobotType(
                f"{axis} is not valid for OT-2 Standard robot type"
            )
        await self._hardware_api.retract_axis(axis=hardware_axis)

    async def prepare_for_mount_movement(self, mount: Mount) -> None:
        """Retract the 'idle' mount if necessary."""
        await self._hardware_api.prepare_for_mount_movement(mount)


class VirtualGantryMover(GantryMover):
    """State store based gantry movement handler for simulation/analysis."""

    def __init__(self, state_view: StateView) -> None:
        self._state_view = state_view

    def motor_axis_to_hardware_axis(self, motor_axis: MotorAxis) -> HardwareAxis:
        """Transform an engine motor axis into a hardware axis."""
        return _MOTOR_AXIS_TO_HARDWARE_AXIS[motor_axis]

    def pick_mount_from_axis_map(self, axis_map: Dict[MotorAxis, float]) -> Mount:
        """Find a mount axis in the axis_map if it exists otherwise default to left mount."""
        found_mount = Mount.LEFT
        mounts = list(_MOTOR_AXIS_TO_HARDWARE_MOUNT.keys())
        for k in axis_map.keys():
            if k in mounts:
                found_mount = _MOTOR_AXIS_TO_HARDWARE_MOUNT[k]
                break
        return found_mount

    async def get_position(
        self,
        pipette_id: str,
        current_well: Optional[CurrentWell] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry.

        Args:
            pipette_id: Pipette ID to get position for.
            current_well: Not used in virtual implementation.
            fail_on_not_homed: Not used in virtual implementation.
        """
        origin_deck_point = self._state_view.pipettes.get_deck_point(pipette_id)
        if origin_deck_point is not None:
            origin = Point(
                x=origin_deck_point.x, y=origin_deck_point.y, z=origin_deck_point.z
            )
        else:
            origin = Point(x=0, y=0, z=0)
        return origin

    async def get_position_from_mount(
        self,
        mount: Mount,
        critical_point: Optional[CriticalPoint] = None,
        fail_on_not_homed: bool = False,
    ) -> Point:
        """Get the current position of the gantry based on the mount.

        Args:
            mount: The mount to get the position for.
            critical_point: Optional parameter for getting instrument location data, effects critical point.
            fail_on_not_homed: Raise PositionUnknownError if gantry position is not known.
        """
        pipette = self._state_view.pipettes.get_by_mount(MountType[mount.name])
        origin_deck_point = (
            self._state_view.pipettes.get_deck_point(pipette.id) if pipette else None
        )
        if origin_deck_point is not None:
            origin = Point(
                x=origin_deck_point.x, y=origin_deck_point.y, z=origin_deck_point.z
            )
        else:
            origin = Point(x=0, y=0, z=0)
        return origin

    def get_max_travel_z(self, pipette_id: str) -> float:
        """Get the maximum allowed z-height for pipette movement.

        Args:
            pipette_id: Pipette ID to get instrument height and tip length for.
        """
        if self._state_view.config.robot_type == "OT-2 Standard":
            instrument_height = self._state_view.pipettes.get_instrument_max_height_ot2(
                pipette_id
            )
        else:
            instrument_height = VIRTUAL_MAX_OT3_HEIGHT

        tip = self._state_view.pipettes.get_attached_tip(pipette_id=pipette_id)
        tip_length = tip.length if tip is not None else 0
        return instrument_height - tip_length

    def get_max_travel_z_from_mount(self, mount: MountType) -> float:
        """Get the maximum allowed z-height for mount."""
        pipette = self._state_view.pipettes.get_by_mount(mount)
        if self._state_view.config.robot_type == "OT-2 Standard":
            instrument_height = (
                self._state_view.pipettes.get_instrument_max_height_ot2(pipette.id)
                if pipette
                else VIRTUAL_MAX_OT2_HEIGHT
            )
        else:
            instrument_height = VIRTUAL_MAX_OT3_HEIGHT
        if pipette:
            tip = self._state_view.pipettes.get_attached_tip(pipette_id=pipette.id)
            tip_length = tip.length if tip is not None else 0.0
        else:
            tip_length = 0.0
        return instrument_height - tip_length

    async def move_axes(
        self,
        axis_map: Dict[MotorAxis, float],
        critical_point: Optional[Dict[MotorAxis, float]] = None,
        speed: Optional[float] = None,
        relative_move: bool = False,
        expect_stalls: bool = False,
    ) -> Dict[MotorAxis, float]:
        """Move the give axes map. No-op in virtual implementation."""
        mount = self.pick_mount_from_axis_map(axis_map)
        current_position = await self.get_position_from_mount(mount)
        updated_position = {}
        if relative_move:
            updated_position[MotorAxis.X] = (
                axis_map.get(MotorAxis.X, 0.0) + current_position[0]
            )
            updated_position[MotorAxis.Y] = (
                axis_map.get(MotorAxis.Y, 0.0) + current_position[1]
            )
            if mount == Mount.RIGHT:
                updated_position[MotorAxis.RIGHT_Z] = (
                    axis_map.get(MotorAxis.RIGHT_Z, 0.0) + current_position[2]
                )
            elif mount == Mount.EXTENSION:
                updated_position[MotorAxis.EXTENSION_Z] = (
                    axis_map.get(MotorAxis.EXTENSION_Z, 0.0) + current_position[2]
                )
            else:
                updated_position[MotorAxis.LEFT_Z] = (
                    axis_map.get(MotorAxis.LEFT_Z, 0.0) + current_position[2]
                )
        else:
            critical_point = critical_point or {}
            updated_position = {
                ax: pos - critical_point.get(ax, 0.0) for ax, pos in axis_map.items()
            }
        return updated_position

    async def move_mount_to(
        self, mount: Mount, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the hardware mount to a waypoint. No-op in virtual implementation."""
        assert len(waypoints) > 0, "Must have at least one waypoint"
        return waypoints[-1].position

    async def move_to(
        self, pipette_id: str, waypoints: List[Waypoint], speed: Optional[float]
    ) -> Point:
        """Move the hardware gantry to a waypoint. No-op in virtual implementation."""
        assert len(waypoints) > 0, "Must have at least one waypoint"
        return waypoints[-1].position

    async def move_relative(
        self,
        pipette_id: str,
        delta: Point,
        speed: Optional[float],
    ) -> Point:
        """Move the hardware gantry in a relative direction by delta.

        Args:
            pipette_id: Pipette ID to get position of for virtual move.
            delta: Relative X/Y/Z distance to move gantry.
            speed: Not used in virtual implementation.
        """
        origin = await self.get_position(pipette_id)
        return origin + delta

    async def home(self, axes: Optional[List[MotorAxis]]) -> None:
        """Home the gantry. No-op in virtual implementation."""
        pass

    async def retract_axis(self, axis: MotorAxis) -> None:
        """Retract the specified axis. No-op in virtual implementation."""
        pass

    async def prepare_for_mount_movement(self, mount: Mount) -> None:
        """Retract the 'idle' mount if necessary."""
        pass

    def motor_axes_to_present_hardware_axes(
        self, motor_axes: List[MotorAxis]
    ) -> List[HardwareAxis]:
        """Get present hardware axes from a list of engine axes. In simulation, all axes are present."""
        return [
            self.motor_axis_to_hardware_axis(motor_axis) for motor_axis in motor_axes
        ]


def create_gantry_mover(
    state_view: StateView, hardware_api: HardwareControlAPI
) -> GantryMover:
    """Create a gantry mover."""
    return (
        HardwareGantryMover(hardware_api=hardware_api, state_view=state_view)
        if state_view.config.use_virtual_pipettes is False
        else VirtualGantryMover(state_view=state_view)
    )
