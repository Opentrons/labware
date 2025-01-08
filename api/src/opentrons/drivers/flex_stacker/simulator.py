from typing import List, Optional

from opentrons.util.async_helpers import ensure_yield

from .abstract import AbstractFlexStackerDriver
from .types import (
    LEDColor,
    StackerAxis,
    PlatformStatus,
    Direction,
    StackerInfo,
    HardwareRevision,
    MoveParams,
    LimitSwitchStatus,
)


class SimulatingDriver(AbstractFlexStackerDriver):
    """FLEX Stacker driver simulator."""

    def __init__(self, serial_number: Optional[str] = None) -> None:
        self._sn = serial_number or "dummySerialFS"
        self._limit_switch_status = LimitSwitchStatus(False, False, False, False, False)
        self._platform_sensor_status = PlatformStatus(False, False)
        self._door_closed = True

    def set_limit_switch(self, status: LimitSwitchStatus) -> bool:
        self._limit_switch_status = status
        return True

    def set_platform_sensor(self, status: PlatformStatus) -> bool:
        self._platform_sensor_status = status
        return True

    def set_door_closed(self, door_closed: bool) -> bool:
        self._door_closed = door_closed
        return True

    @ensure_yield
    async def connect(self) -> None:
        """Connect to stacker."""
        pass

    @ensure_yield
    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        pass

    @ensure_yield
    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        return True

    @ensure_yield
    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        return StackerInfo(fw="stacker-fw", hw=HardwareRevision.EVT, sn=self._sn)

    @ensure_yield
    async def set_serial_number(self, sn: str) -> bool:
        """Set Serial Number."""
        return True

    async def enable_motors(self, axis: List[StackerAxis]) -> bool:
        """Enables the axis motor if present, disables it otherwise."""
        return True

    @ensure_yield
    async def stop_motors(self) -> bool:
        """Stop all motor movement."""
        return True

    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        return MoveParams(axis, 1, 1, 1)

    @ensure_yield
    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        return self._limit_switch_status.get(axis, direction)

    @ensure_yield
    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        return self._limit_switch_status

    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor status.

        :return: True if platform is present, False otherwise
        """
        return True

    async def get_platform_status(self) -> PlatformStatus:
        """Get platform status."""
        return self._platform_sensor_status

    @ensure_yield
    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        return self._door_closed

    @ensure_yield
    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> bool:
        """Move axis."""
        return True

    @ensure_yield
    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> bool:
        """Move until limit switch is triggered."""
        return True

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> bool:
        """Home axis."""
        return True

    async def set_led(
        self, power: float, color: LEDColor | None = None, external: bool | None = None
    ) -> bool:
        """Set LED color."""
        return True

    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        pass
