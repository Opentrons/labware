from typing import List, Optional, Protocol

from .types import (
    LEDPattern,
    LimitSwitchStatus,
    MoveResult,
    StackerAxis,
    PlatformStatus,
    Direction,
    MoveParams,
    StackerInfo,
    LEDColor,
    StallGuardParams,
)


class AbstractFlexStackerDriver(Protocol):
    """Protocol for the Stacker driver."""

    async def connect(self) -> None:
        """Connect to stacker."""
        ...

    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        ...

    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        ...

    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        ...

    async def set_serial_number(self, sn: str) -> bool:
        """Set Serial Number."""
        ...

    async def enable_motors(self, axis: List[StackerAxis]) -> bool:
        """Enables the axis motor if present, disables it otherwise."""
        ...

    async def stop_motors(self) -> bool:
        """Stop all motor movement."""
        ...

    async def set_run_current(self, axis: StackerAxis, current: float) -> bool:
        """Set axis peak run current in amps."""
        ...

    async def set_ihold_current(self, axis: StackerAxis, current: float) -> bool:
        """Set axis hold current in amps."""
        ...

    async def set_stallguard_threshold(
        self, axis: StackerAxis, enable: bool, threshold: int
    ) -> bool:
        """Enables and sets the stallguard threshold for the given axis motor."""
        ...

    async def set_motor_driver_register(
        self, axis: StackerAxis, reg: int, value: int
    ) -> bool:
        """Set the register of the given motor axis driver to the given value."""
        ...

    async def get_motor_driver_register(self, axis: StackerAxis, reg: int) -> int:
        """Gets the register value of the given motor axis driver."""
        ...

    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        ...

    async def get_stallguard_threshold(self, axis: StackerAxis) -> StallGuardParams:
        """Get the stallguard parameters by the given axis motor."""
        ...

    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        ...

    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        ...

    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor status.

        :return: True if platform is present, False otherwise
        """
        ...

    async def get_platform_status(self) -> PlatformStatus:
        """Get platform status."""
        ...

    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        ...

    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> MoveResult:
        """Move axis by the given distance in mm."""
        ...

    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> MoveResult:
        """Move until limit switch is triggered."""
        ...

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> MoveResult:
        """Home axis."""
        ...

    async def set_led(
        self,
        power: float,
        color: Optional[LEDColor] = None,
        external: Optional[bool] = None,
        pattern: Optional[LEDPattern] = None,
        duration: Optional[int] = None,
        reps: Optional[int] = None,
    ) -> bool:
        """Set LED Status bar color and pattern."""
        ...

    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        ...

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        ...
