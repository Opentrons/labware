from opentrons.types import Location, Mount, AxisMapType
from .helpers import stringify_location
from . import types as command_types
from typing import Optional


def move_to(
    mount: Mount, location: Location, speed: Optional[float]
) -> command_types.RobotMoveToCommand:
    location_text = stringify_location(location)
    text = f"Moving to {location_text} at {speed}"
    return {
        "name": command_types.ROBOT_MOVE_TO,
        "payload": {"mount": mount, "location": location, "text": text},
    }


def move_axis_to(
    axis_map: AxisMapType, speed: Optional[float]
) -> command_types.RobotMoveAxisToCommand:
    text = f"Moving to the provided absolute axis map {axis_map} at {speed}."
    return {
        "name": command_types.ROBOT_MOVE_AXES_TO,
        "payload": {"absolute_axes": axis_map, "text": text},
    }


def move_axis_relative(
    axis_map: AxisMapType, speed: Optional[float]
) -> command_types.RobotMoveAxisRelativeCommand:
    text = f"Moving to the provided relative axis map {axis_map} as {speed}"
    return {
        "name": command_types.ROBOT_MOVE_RELATIVE_TO,
        "payload": {"relative_axes": axis_map, "text": text},
    }


def open_gripper() -> command_types.RobotOpenGripperJawCommand:
    text = "Opening the gripper jaw."
    return {
        "name": command_types.ROBOT_OPEN_GRIPPER_JAW,
        "payload": {"text": text},
    }


def close_gripper(force: Optional[float]) -> command_types.RobotCloseGripperJawCommand:
    text = f"Closing the gripper jaw with force {force}."
    return {
        "name": command_types.ROBOT_CLOSE_GRIPPER_JAW,
        "payload": {"text": text},
    }
