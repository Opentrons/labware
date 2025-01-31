"""Utilities for calculating motion correctly."""
from logging import getLogger

from functools import lru_cache
from typing import Callable, Dict, Union, Optional, cast
from collections import OrderedDict

from opentrons_shared_data.robot.types import RobotType

from opentrons.types import Mount, Point
from opentrons.calibration_storage.types import AttitudeMatrix
from opentrons.util import linal

from .types import Axis, OT3Mount

log = getLogger(__name__)

# TODO: The offset_for_mount function should be defined with an overload
# set, as with other functions in this module. Unfortunately, mypy < 0.920
# has an internal crash when you mix overloads and particular kinds of decorators
# ( https://github.com/python/mypy/pull/11630 fixes it ) so instead it's defined
# with unions and therefore requires a bit of casting.
# @overload
# def offset_for_mount(
#     primary_mount: Mount,
#     left_mount_offset: Point,
#     right_mount_offset: Point,
#     gripper_mount_offset: None,
# ) -> Point:
#     ...


# @overload
# def offset_for_mount(
#     primary_mount: OT3Mount,
#     left_mount_offset: Point,
#     right_mount_offset: Point,
#     gripper_mount_offset: Point,
# ) -> Point:
#     ...

EMPTY_ORDERED_DICT = OrderedDict(
    (
        (Axis.X, 0.0),
        (Axis.Y, 0.0),
        (Axis.Z_L, 0.0),
        (Axis.Z_R, 0.0),
        (Axis.Z_G, 0.0),
        (Axis.P_L, 0.0),
        (Axis.P_R, 0.0),
        (Axis.Q, 0.0),
    )
)


@lru_cache(4)
def offset_for_mount(
    primary_mount: Union[OT3Mount, Mount],
    left_mount_offset: Point,
    right_mount_offset: Point,
    gripper_mount_offset: Optional[Point] = None,
) -> Point:
    offsets = {
        Mount.LEFT: left_mount_offset,
        Mount.RIGHT: right_mount_offset,
        OT3Mount.LEFT: left_mount_offset,
        OT3Mount.RIGHT: right_mount_offset,
        OT3Mount.GRIPPER: cast(Point, gripper_mount_offset),
    }
    return offsets[primary_mount]


def target_position_from_absolute(
    mount: Union[Mount, OT3Mount],
    abs_position: Point,
    get_critical_point: Callable[[Union[Mount, OT3Mount]], Point],
    left_mount_offset: Point,
    right_mount_offset: Point,
    gripper_mount_offset: Optional[Point] = None,
) -> "OrderedDict[Axis, float]":
    """Create a target position for all specified machine axes."""
    offset = offset_for_mount(
        mount, left_mount_offset, right_mount_offset, gripper_mount_offset
    )
    primary_cp = get_critical_point(mount)
    primary_z = Axis.by_mount(mount)

    target_position = OrderedDict(
        (
            (Axis.X, abs_position.x - offset.x - primary_cp.x),
            (Axis.Y, abs_position.y - offset.y - primary_cp.y),
            (primary_z, abs_position.z - offset.z - primary_cp.z),
        )
    )
    return target_position


def target_position_from_relative(
    mount: Union[Mount, OT3Mount],
    delta: Point,
    current_position: Dict[Axis, float],
) -> "OrderedDict[Axis, float]":
    """Create a target position for all specified machine axes."""
    primary_z = Axis.by_mount(mount)
    x_ax = Axis.X
    y_ax = Axis.Y
    target_position = OrderedDict(
        (
            (x_ax, current_position[x_ax] + delta[0]),
            (y_ax, current_position[y_ax] + delta[1]),
            (primary_z, current_position[primary_z] + delta[2]),
        )
    )
    return target_position


def target_axis_map_from_absolute(
    primary_mount: Union[OT3Mount, Mount],
    axis_map: Dict[Axis, float],
    get_critical_point: Callable[[Union[Mount, OT3Mount]], Point],
    left_mount_offset: Point,
    right_mount_offset: Point,
    gripper_mount_offset: Optional[Point] = None,
) -> "OrderedDict[Axis, float]":
    """Create an absolute target position for all specified machine axes."""
    keys_for_target_position = list(axis_map.keys())

    offset = offset_for_mount(
        primary_mount, left_mount_offset, right_mount_offset, gripper_mount_offset
    )
    primary_cp = get_critical_point(primary_mount)
    primary_z = Axis.by_mount(primary_mount)
    target_position = OrderedDict()

    if Axis.X in keys_for_target_position:
        target_position[Axis.X] = axis_map[Axis.X] - offset.x - primary_cp.x
    if Axis.Y in keys_for_target_position:
        target_position[Axis.Y] = axis_map[Axis.Y] - offset.y - primary_cp.y
    if primary_z in keys_for_target_position:
        # Since this function is intended to be used in conjunction with `API.move_axes`
        # we must leave out the carriage offset subtraction from the target position as
        # `move_axes` already does this calculation.
        target_position[primary_z] = axis_map[primary_z] - primary_cp.z

    target_position.update(
        {ax: val for ax, val in axis_map.items() if ax not in Axis.gantry_axes()}
    )
    return target_position


def target_axis_map_from_relative(
    axis_map: Dict[Axis, float],
    current_position: Dict[Axis, float],
) -> "OrderedDict[Axis, float]":
    """Create a target position for all specified machine axes."""
    target_position = OrderedDict(
        (
            (ax, current_position[ax] + axis_map[ax])
            for ax in EMPTY_ORDERED_DICT.keys()
            if ax in axis_map.keys()
        )
    )
    log.info(f"Current position {current_position} and axis map delta {axis_map}")
    log.info(f"Relative move target {target_position}")
    return target_position


def target_position_from_plunger(
    mount: Union[Mount, OT3Mount],
    delta: float,
    current_position: Dict[Axis, float],
) -> "OrderedDict[Axis, float]":
    """Create a target position for machine axes including plungers.

    Axis positions other than the plunger are identical to current
    position.
    """
    x_ax = Axis.X
    y_ax = Axis.Y
    all_axes_pos = OrderedDict(
        (
            (x_ax, current_position[x_ax]),
            (y_ax, current_position[y_ax]),
        )
    )
    plunger_pos = OrderedDict()
    z_ax = Axis.by_mount(mount)
    plunger = Axis.of_main_tool_actuator(mount)
    all_axes_pos[z_ax] = current_position[z_ax]
    plunger_pos[plunger] = delta
    all_axes_pos.update(plunger_pos)
    return all_axes_pos


def deck_point_from_machine_point(
    machine_point: Point, attitude: AttitudeMatrix, offset: Point
) -> Point:
    return Point(
        *linal.apply_reverse(
            attitude,
            machine_point - offset,
        )
    )


def machine_point_from_deck_point(
    deck_point: Point, attitude: AttitudeMatrix, offset: Point
) -> Point:
    return Point(*linal.apply_transform(attitude, deck_point)) + offset


def machine_from_deck(
    deck_pos: Dict[Axis, float],
    attitude: AttitudeMatrix,
    offset: Point,
    robot_type: RobotType,
) -> Dict[Axis, float]:
    """Build a machine-axis position from a deck position"""
    try:
        mount_axes = (
            Axis.ot2_mount_axes()
            if robot_type == "OT-2 Standard"
            else Axis.ot3_mount_axes()
        )
        point_for_z_axis = {
            axe: Point(x=deck_pos[type(axe).X], y=deck_pos[type(axe).Y], z=pos)
            for axe, pos in deck_pos.items()
            if axe in mount_axes
        }
    except KeyError:
        raise ValueError(
            "Moves must specify either exactly an x, y, and (z or a) or none of them"
        )

    # Pre-fill the dict we’ll send to the backend with the axes we don’t
    # need to transform
    machine_pos = {
        ax: pos for ax, pos in deck_pos.items() if ax not in ax.gantry_axes()
    }

    transformed = {
        axes: machine_point_from_deck_point(deck_point, attitude, offset)
        for axes, deck_point in point_for_z_axis.items()
    }

    to_check = {}
    for axis, point in transformed.items():
        to_check[axis] = point.z
        to_check[type(axis).X] = point.x
        to_check[type(axis).Y] = point.y

    machine_pos.update({ax: pos for ax, pos in to_check.items()})
    return machine_pos


def deck_from_machine(
    machine_pos: Dict[Axis, float],
    attitude: AttitudeMatrix,
    offset: Point,
    robot_type: RobotType,
) -> Dict[Axis, float]:
    """Build a deck-abs position store from the machine's position"""
    plunger_axes: Dict[Axis, float] = {
        k: v for k, v in machine_pos.items() if k not in k.gantry_axes()
    }
    mount_axes: Dict[Axis, float]
    to_mount: Callable[[Axis], Union[Mount, OT3Mount]]
    if robot_type == "OT-2 Standard":
        mount_axes = {k: v for k, v in machine_pos.items() if k in k.ot2_mount_axes()}
        to_mount = Axis.to_ot2_mount
    else:
        mount_axes = {k: v for k, v in machine_pos.items() if k in k.ot3_mount_axes()}
        to_mount = Axis.to_ot3_mount
    deck_positions_by_mount = {
        to_mount(axis): deck_point_from_machine_point(
            Point(machine_pos[Axis.X], machine_pos[Axis.Y], value),
            attitude,
            offset,
        )
        for axis, value in mount_axes.items()
    }
    position_for_gantry = next(iter(deck_positions_by_mount.values()))
    deck_pos = {
        Axis.X: position_for_gantry[0],
        Axis.Y: position_for_gantry[1],
    }
    for mount, pos in deck_positions_by_mount.items():
        deck_pos[Axis.by_mount(mount)] = pos[2]

    deck_pos.update(plunger_axes)
    return deck_pos


def machine_vector_from_deck_vector(
    machine_vector: Point, attitude: AttitudeMatrix
) -> Point:
    """Take a vector and pass it through the attitude matrix."""
    return machine_point_from_deck_point(machine_vector, attitude, Point(0, 0, 0))
