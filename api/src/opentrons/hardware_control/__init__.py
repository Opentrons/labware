"""
hardware_control: The sole authority for controlling the hardware of an OT2.

The hardware_control module presents a unified api for the lowest level of
hardware command that takes into account the robot as a whole. For instance,
it presents an API for moving a specific pipette mount (not a specific motor
or axis)  to a deck-absolute point (not a Smoothie-coordinate point).

This module is not for use outside the opentrons api module. Higher-level
functions are available elsewhere.
"""
from .adapters import SynchronousAdapter
from .api import API
from .pause_manager import PauseManager
from .backends import Controller, Simulator
from .types import CriticalPoint, ExecutionState, OT3Mount
from .constants import DROP_TIP_RELEASE_DISTANCE
from .thread_manager import ThreadManager
from .execution_manager import ExecutionManager
from .threaded_async_lock import ThreadedAsyncLock, ThreadedAsyncForbidden
from .protocols import HardwareControlInterface, FlexHardwareControlInterface
from .instruments import AbstractInstrument, Gripper
from typing import Union
from .ot3_calibration import OT3Transforms
from .robot_calibration import RobotCalibration
from opentrons.config.types import RobotConfig, OT3Config

from opentrons.types import Mount

# TODO (lc 12-05-2022) We should 1. figure out if we need
# to globally export a class that is strictly used in the hardware controller
# and 2. how to properly export an ot2 and ot3 pipette.
from .instruments.ot2.pipette import Pipette

OT2HardwareControlAPI = HardwareControlInterface[RobotCalibration, Mount, RobotConfig]
OT3HardwareControlAPI = FlexHardwareControlInterface[
    OT3Transforms, Union[Mount, OT3Mount], OT3Config
]
HardwareControlAPI = Union[OT2HardwareControlAPI, OT3HardwareControlAPI]

ThreadManagedHardware = ThreadManager[HardwareControlAPI]
SyncHardwareAPI = SynchronousAdapter[HardwareControlAPI]

__all__ = [
    "API",
    "AbstractInstrument",
    "Controller",
    "Simulator",
    "Pipette",
    "Gripper",
    "PauseManager",
    "SynchronousAdapter",
    "HardwareControlAPI",
    "CriticalPoint",
    "DROP_TIP_RELEASE_DISTANCE",
    "ThreadManager",
    "ExecutionManager",
    "ExecutionState",
    "ThreadedAsyncLock",
    "ThreadedAsyncForbidden",
    "ThreadManagedHardware",
    "SyncHardwareAPI",
    "OT2HardwareControlAPI",
    "OT3HardwareControlAPI",
]
