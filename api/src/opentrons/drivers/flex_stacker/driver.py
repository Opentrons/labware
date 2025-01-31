import asyncio
import re
from typing import Optional

from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.asyncio.communication import AsyncResponseSerialConnection

from .abstract import AbstractStackerDriver
from .types import (
    GCODE,
    StackerAxis,
    PlatformStatus,
    Direction,
    StackerInfo,
    HardwareRevision,
    MoveParams,
    LimitSwitchStatus,
    LEDColor,
)


FS_BAUDRATE = 115200
DEFAULT_FS_TIMEOUT = 40
FS_ACK = "OK\n"
FS_ERROR_KEYWORD = "err"
FS_ASYNC_ERROR_ACK = "async"
DEFAULT_COMMAND_RETRIES = 0
GCODE_ROUNDING_PRECISION = 2


class FlexStackerDriver(AbstractStackerDriver):
    """FLEX Stacker driver."""

    @classmethod
    def parse_device_info(cls, response: str) -> StackerInfo:
        """Parse stacker info."""
        # TODO: Validate serial number format once established
        _RE = re.compile(
            f"^{GCODE.DEVICE_INFO} FW:(?P<fw>\\S+) HW:Opentrons-flex-stacker-(?P<hw>\\S+) SerialNo:(?P<sn>\\S+)$"
        )
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for device info: {response}")
        return StackerInfo(
            m.group("fw"), HardwareRevision(m.group("hw")), m.group("sn")
        )

    @classmethod
    def parse_limit_switch_status(cls, response: str) -> LimitSwitchStatus:
        """Parse limit switch statuses."""
        field_names = LimitSwitchStatus.get_fields()
        pattern = r"\s".join([rf"{name}:(?P<{name}>\d)" for name in field_names])
        _RE = re.compile(f"^{GCODE.GET_LIMIT_SWITCH} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for limit switch status: {response}")
        return LimitSwitchStatus(*(bool(int(m.group(name))) for name in field_names))

    @classmethod
    def parse_platform_sensor_status(cls, response: str) -> PlatformStatus:
        """Parse platform statuses."""
        field_names = PlatformStatus.get_fields()
        pattern = r"\s".join([rf"{name}:(?P<{name}>\d)" for name in field_names])
        _RE = re.compile(f"^{GCODE.GET_PLATFORM_SENSOR} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for platform status: {response}")
        return PlatformStatus(*(bool(int(m.group(name))) for name in field_names))

    @classmethod
    def parse_door_closed(cls, response: str) -> bool:
        """Parse door closed."""
        _RE = re.compile(r"^M122 D:(\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(f"Incorrect Response for door closed: {response}")
        return bool(int(match.group(1)))

    @classmethod
    def append_move_params(
        cls, command: CommandBuilder, params: MoveParams | None
    ) -> CommandBuilder:
        """Append move params."""
        if params is not None:
            if params.max_speed is not None:
                command.add_float("V", params.max_speed, GCODE_ROUNDING_PRECISION)
            if params.acceleration is not None:
                command.add_float("A", params.acceleration, GCODE_ROUNDING_PRECISION)
            if params.max_speed_discont is not None:
                command.add_float(
                    "D", params.max_speed_discont, GCODE_ROUNDING_PRECISION
                )
        return command

    @classmethod
    async def create(
        cls, port: str, loop: Optional[asyncio.AbstractEventLoop]
    ) -> "FlexStackerDriver":
        """Create a FLEX Stacker driver."""
        connection = await AsyncResponseSerialConnection.create(
            port=port,
            baud_rate=FS_BAUDRATE,
            timeout=DEFAULT_FS_TIMEOUT,
            number_of_retries=DEFAULT_COMMAND_RETRIES,
            ack=FS_ACK,
            loop=loop,
            error_keyword=FS_ERROR_KEYWORD,
            async_error_ack=FS_ASYNC_ERROR_ACK,
        )
        return cls(connection)

    def __init__(self, connection: AsyncResponseSerialConnection) -> None:
        """
        Constructor

        Args:
            connection: Connection to the FLEX Stacker
        """
        self._connection = connection

    async def connect(self) -> None:
        """Connect to stacker."""
        await self._connection.open()

    async def disconnect(self) -> None:
        """Disconnect from stacker."""
        await self._connection.close()

    async def is_connected(self) -> bool:
        """Check connection to stacker."""
        return await self._connection.is_open()

    async def get_device_info(self) -> StackerInfo:
        """Get Device Info."""
        response = await self._connection.send_command(
            GCODE.DEVICE_INFO.build_command()
        )
        await self._connection.send_command(GCODE.GET_RESET_REASON.build_command())
        return self.parse_device_info(response)

    async def set_serial_number(self, sn: str) -> bool:
        """Set Serial Number."""
        # TODO: validate the serial number format
        resp = await self._connection.send_command(
            GCODE.SET_SERIAL_NUMBER.build_command().add_element(sn)
        )
        if not re.match(rf"^{GCODE.SET_SERIAL_NUMBER}$", resp):
            raise ValueError(f"Incorrect Response for set serial number: {resp}")
        return True

    async def stop_motors(self) -> bool:
        """Stop all motor movement."""
        resp = await self._connection.send_command(GCODE.STOP_MOTORS.build_command())
        if not re.match(rf"^{GCODE.STOP_MOTORS}$", resp):
            raise ValueError(f"Incorrect Response for stop motors: {resp}")
        return True

    async def get_limit_switch(self, axis: StackerAxis, direction: Direction) -> bool:
        """Get limit switch status.

        :return: True if limit switch is triggered, False otherwise
        """
        response = await self.get_limit_switches_status()
        return response.get(axis, direction)

    async def get_limit_switches_status(self) -> LimitSwitchStatus:
        """Get limit switch statuses for all axes."""
        response = await self._connection.send_command(
            GCODE.GET_LIMIT_SWITCH.build_command()
        )
        return self.parse_limit_switch_status(response)

    async def get_platform_sensor(self, direction: Direction) -> bool:
        """Get platform sensor at one direction."""
        response = await self.get_platform_status()
        return response.get(direction)

    async def get_platform_status(self) -> PlatformStatus:
        """Get platform sensor status.

        :return: True if platform is detected, False otherwise
        """
        response = await self._connection.send_command(
            GCODE.GET_PLATFORM_SENSOR.build_command()
        )
        return self.parse_platform_sensor_status(response)

    async def get_hopper_door_closed(self) -> bool:
        """Get whether or not door is closed.

        :return: True if door is closed, False otherwise
        """
        response = await self._connection.send_command(
            GCODE.GET_DOOR_SWITCH.build_command()
        )
        return self.parse_door_closed(response)

    async def move_in_mm(
        self, axis: StackerAxis, distance: float, params: MoveParams | None = None
    ) -> bool:
        """Move axis."""
        command = self.append_move_params(
            GCODE.MOVE_TO.build_command().add_float(
                axis.name, distance, GCODE_ROUNDING_PRECISION
            ),
            params,
        )
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.MOVE_TO}$", resp):
            raise ValueError(f"Incorrect Response for move to: {resp}")
        return True

    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> bool:
        """Move until limit switch is triggered."""
        command = self.append_move_params(
            GCODE.MOVE_TO_SWITCH.build_command().add_int(axis.name, direction.value),
            params,
        )
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.MOVE_TO_SWITCH}$", resp):
            raise ValueError(f"Incorrect Response for move to switch: {resp}")
        return True

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> bool:
        """Home axis."""
        resp = await self._connection.send_command(
            GCODE.HOME_AXIS.build_command().add_int(axis.name, direction.value)
        )
        if not re.match(rf"^{GCODE.HOME_AXIS}$", resp):
            raise ValueError(f"Incorrect Response for home axis: {resp}")
        return True

    async def set_led(
        self, power: float, color: LEDColor | None = None, external: bool | None = None
    ) -> bool:
        """Set LED color.

        :param power: Power of the LED (0-1.0), 0 is off, 1 is full power
        :param color: Color of the LED
        :param external: True if external LED, False if internal LED
        """
        power = max(0, min(power, 1.0))
        command = GCODE.SET_LED.build_command().add_float(
            "P", power, GCODE_ROUNDING_PRECISION
        )
        if color is not None:
            command.add_int("C", color.value)
        if external is not None:
            command.add_int("E", external)
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.SET_LED}$", resp):
            raise ValueError(f"Incorrect Response for set led: {resp}")
        return True

    async def update_firmware(self, firmware_file_path: str) -> None:
        """Updates the firmware on the device."""
        # TODO: Implement firmware update
        pass
