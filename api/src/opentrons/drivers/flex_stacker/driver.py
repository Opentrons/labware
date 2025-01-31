import asyncio
import re
from typing import List, Optional

from opentrons.drivers.asyncio.communication.errors import MotorStall
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.asyncio.communication import AsyncResponseSerialConnection

from .abstract import AbstractFlexStackerDriver
from .types import (
    GCODE,
    LEDPattern,
    MoveResult,
    StackerAxis,
    PlatformStatus,
    Direction,
    StackerInfo,
    HardwareRevision,
    MoveParams,
    LimitSwitchStatus,
    LEDColor,
    StallGuardParams,
)


FS_BAUDRATE = 115200
DEFAULT_FS_TIMEOUT = 1
FS_MOVE_TIMEOUT = 20
FS_ACK = "OK\n"
FS_ERROR_KEYWORD = "err"
FS_ASYNC_ERROR_ACK = "async"
DEFAULT_COMMAND_RETRIES = 0
GCODE_ROUNDING_PRECISION = 2

# LED animation range values
MIN_DURATION_MS = 25  # 25ms
MAX_DURATION_MS = 10000  # 10s
MAX_REPS = 10

# Stallguard defaults
STALLGUARD_CONFIG = {
    StackerAxis.X: StallGuardParams(StackerAxis.X, True, 2),
    StackerAxis.Z: StallGuardParams(StackerAxis.Z, True, 2),
    StackerAxis.L: StallGuardParams(StackerAxis.L, True, 2),
}

STACKER_MOTION_CONFIG = {
    StackerAxis.X: {
        "home": MoveParams(
            StackerAxis.X,
            max_speed=10.0,  # mm/s
            acceleration=100.0,  # mm/s^2
            max_speed_discont=40,  # mm/s
            current=1.5,  # mAmps
        ),
        "move": MoveParams(
            StackerAxis.X,
            max_speed=200.0,
            acceleration=1500.0,
            max_speed_discont=40,
            current=1.0,
        ),
    },
    StackerAxis.Z: {
        "home": MoveParams(
            StackerAxis.Z,
            max_speed=10.0,
            acceleration=100.0,
            max_speed_discont=40,
            current=1.5,
        ),
        "move": MoveParams(
            StackerAxis.Z,
            max_speed=200.0,
            acceleration=500.0,
            max_speed_discont=40,
            current=1.5,
        ),
    },
    StackerAxis.L: {
        "home": MoveParams(
            StackerAxis.L,
            max_speed=100.0,
            acceleration=800.0,
            max_speed_discont=40,
            current=0.8,
        ),
        "move": MoveParams(
            StackerAxis.L,
            max_speed=100.0,
            acceleration=800.0,
            max_speed_discont=40,
            current=0.6,
        ),
    },
}


class FlexStackerDriver(AbstractFlexStackerDriver):
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
    def parse_reset_reason(cls, response: str) -> int:
        """Parse the reset reason"""
        _RE = re.compile(rf"^{GCODE.GET_RESET_REASON} R:(?P<R>\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(f"Incorrect Response for reset reason: {response}")
        return int(match.group("R"))

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
        _RE = re.compile(rf"^{GCODE.GET_DOOR_SWITCH} D:(\d)$")
        match = _RE.match(response)
        if not match:
            raise ValueError(f"Incorrect Response for door closed: {response}")
        return bool(int(match.group(1)))

    @classmethod
    def parse_move_params(cls, response: str) -> MoveParams:
        """Parse move params."""
        field_names = MoveParams.get_fields()
        pattern = r"\s".join(
            [
                rf"{f}:(?P<{f}>(\d*\.)?\d+)" if f != "M" else rf"{f}:(?P<{f}>[XZL])"
                for f in field_names
            ]
        )
        _RE = re.compile(f"^{GCODE.GET_MOVE_PARAMS} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for move params: {response}")
        return MoveParams(
            axis=StackerAxis(m.group("M")),
            max_speed=float(m.group("V")),
            acceleration=float(m.group("A")),
            max_speed_discont=float(m.group("D")),
        )

    @classmethod
    def parse_stallguard_params(cls, response: str) -> StallGuardParams:
        """Parse stallguard params."""
        pattern = r"(?P<M>[XZL]):(?P<E>\d) T:(?P<T>\d+)"
        _RE = re.compile(f"^{GCODE.GET_STALLGUARD_THRESHOLD} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(f"Incorrect Response for stallfguard params: {response}")
        return StallGuardParams(
            axis=StackerAxis(m.group("M")),
            enabled=bool(int(m.group("E"))),
            threshold=int(m.group("T")),
        )

    @classmethod
    def parse_get_motor_register(cls, response: str) -> int:
        """Parse get register value."""
        pattern = r"(?P<M>[XZL]):(?P<R>\d+) V:(?P<V>\d+)"
        _RE = re.compile(f"^{GCODE.GET_MOTOR_DRIVER_REGISTER} {pattern}$")
        m = _RE.match(response)
        if not m:
            raise ValueError(
                f"Incorrect Response for get motor driver register: {response}"
            )
        return int(m.group("V"))

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
        device_info = self.parse_device_info(response)
        reason_resp = await self._connection.send_command(
            GCODE.GET_RESET_REASON.build_command()
        )
        reason = self.parse_reset_reason(reason_resp)
        device_info.rr = reason
        return device_info

    async def set_serial_number(self, sn: str) -> bool:
        """Set Serial Number."""
        if not re.match(r"^FST[\w]{1}[\d]{2}[\d]{8}[\d]+$", sn):
            raise ValueError(
                f"Invalid serial number: ({sn}) expected format: FSTA1020250119001"
            )

        resp = await self._connection.send_command(
            GCODE.SET_SERIAL_NUMBER.build_command().add_element(sn)
        )
        if not re.match(rf"^{GCODE.SET_SERIAL_NUMBER}$", resp):
            raise ValueError(f"Incorrect Response for set serial number: {resp}")
        return True

    async def enable_motors(self, axis: List[StackerAxis]) -> bool:
        """Enables the axis motor if present, disables it otherwise."""
        command = GCODE.ENABLE_MOTORS.build_command()
        for a in axis:
            command.add_element(a.name)
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.ENABLE_MOTORS}$", resp):
            raise ValueError(f"Incorrect Response for enable motors: {resp}")
        return True

    async def stop_motors(self) -> bool:
        """Stop all motor movement."""
        resp = await self._connection.send_command(GCODE.STOP_MOTORS.build_command())
        if not re.match(rf"^{GCODE.STOP_MOTORS}$", resp):
            raise ValueError(f"Incorrect Response for stop motors: {resp}")
        return True

    async def set_run_current(self, axis: StackerAxis, current: float) -> bool:
        """Set axis peak run current in amps."""
        resp = await self._connection.send_command(
            GCODE.SET_RUN_CURRENT.build_command().add_float(axis.name, current)
        )
        if not re.match(rf"^{GCODE.SET_RUN_CURRENT}$", resp):
            raise ValueError(f"Incorrect Response for set run current: {resp}")
        return True

    async def set_ihold_current(self, axis: StackerAxis, current: float) -> bool:
        """Set axis hold current in amps."""
        resp = await self._connection.send_command(
            GCODE.SET_IHOLD_CURRENT.build_command().add_float(axis.name, current)
        )
        if not re.match(rf"^{GCODE.SET_IHOLD_CURRENT}$", resp):
            raise ValueError(f"Incorrect Response for set ihold current: {resp}")
        return True

    async def set_stallguard_threshold(
        self, axis: StackerAxis, enable: bool, threshold: int
    ) -> bool:
        """Enables and sets the stallguard threshold for the given axis motor."""
        if not -64 < threshold < 63:
            raise ValueError(
                f"Threshold value ({threshold}) should be between -64 and 63."
            )

        resp = await self._connection.send_command(
            GCODE.SET_STALLGUARD.build_command()
            .add_int(axis.name, int(enable))
            .add_int("T", threshold)
        )
        if not re.match(rf"^{GCODE.SET_STALLGUARD}$", resp):
            raise ValueError(f"Incorrect Response for set stallguard threshold: {resp}")
        return True

    async def set_motor_driver_register(
        self, axis: StackerAxis, reg: int, value: int
    ) -> bool:
        """Set the register of the given motor axis driver to the given value."""
        resp = await self._connection.send_command(
            GCODE.SET_MOTOR_DRIVER_REGISTER.build_command()
            .add_int(axis.name, reg)
            .add_element(str(value))
        )
        if not re.match(rf"^{GCODE.SET_MOTOR_DRIVER_REGISTER}$", resp):
            raise ValueError(
                f"Incorrect Response for set motor driver register: {resp}"
            )
        return True

    async def get_motor_driver_register(self, axis: StackerAxis, reg: int) -> int:
        """Gets the register value of the given motor axis driver."""
        response = await self._connection.send_command(
            GCODE.GET_MOTOR_DRIVER_REGISTER.build_command().add_int(axis.name, reg)
        )
        return self.parse_get_motor_register(response)

    async def get_motion_params(self, axis: StackerAxis) -> MoveParams:
        """Get the motion parameters used by the given axis motor."""
        response = await self._connection.send_command(
            GCODE.GET_MOVE_PARAMS.build_command().add_element(axis.name)
        )
        return self.parse_move_params(response)

    async def get_stallguard_threshold(self, axis: StackerAxis) -> StallGuardParams:
        """Get the stallguard parameters by the given axis motor."""
        response = await self._connection.send_command(
            GCODE.GET_STALLGUARD_THRESHOLD.build_command().add_element(axis.name)
        )
        return self.parse_stallguard_params(response)

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
    ) -> MoveResult:
        """Move axis by the given distance in mm."""
        command = self.append_move_params(
            GCODE.MOVE_TO.build_command().add_float(
                axis.name, distance, GCODE_ROUNDING_PRECISION
            ),
            params,
        )
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
            if not re.match(rf"^{GCODE.MOVE_TO}$", resp):
                raise ValueError(f"Incorrect Response for move to: {resp}")
        except MotorStall:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        return MoveResult.NO_ERROR

    async def move_to_limit_switch(
        self, axis: StackerAxis, direction: Direction, params: MoveParams | None = None
    ) -> MoveResult:
        """Move until limit switch is triggered."""
        command = self.append_move_params(
            GCODE.MOVE_TO_SWITCH.build_command().add_int(axis.name, direction.value),
            params,
        )
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
            if not re.match(rf"^{GCODE.MOVE_TO_SWITCH}$", resp):
                raise ValueError(f"Incorrect Response for move to switch: {resp}")
        except MotorStall:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        return MoveResult.NO_ERROR

    async def home_axis(self, axis: StackerAxis, direction: Direction) -> MoveResult:
        """Home axis."""
        command = GCODE.HOME_AXIS.build_command().add_int(axis.name, direction.value)
        try:
            resp = await self._connection.send_command(command, timeout=FS_MOVE_TIMEOUT)
        except MotorStall:
            self.reset_serial_buffers()
            return MoveResult.STALL_ERROR
        if not re.match(rf"^{GCODE.HOME_AXIS}$", resp):
            raise ValueError(f"Incorrect Response for home axis: {resp}")
        return MoveResult.NO_ERROR

    async def set_led(
        self,
        power: float,
        color: Optional[LEDColor] = None,
        external: Optional[bool] = None,
        pattern: Optional[LEDPattern] = None,
        duration: Optional[int] = None,
        reps: Optional[int] = None,
    ) -> bool:
        """Set LED Status bar color and pattern.

        :param power: Power of the LED (0-1.0), 0 is off, 1 is full power
        :param color: Color of the LED
        :param external: True if external LED, False if internal LED
        :param pattern: Animation pattern of the LED status bar
        :param duration: Animation duration in milliseconds (25-10000), 10s max
        :param reps: Number of times to repeat the animation (-1 - 10), -1 is forever.
        """
        power = max(0, min(power, 1.0))
        command = GCODE.SET_LED.build_command().add_float(
            "P", power, GCODE_ROUNDING_PRECISION
        )
        if color is not None:
            command.add_int("C", color.value)
        if external is not None:
            command.add_int("K", int(external))
        if pattern is not None:
            command.add_int("A", pattern.value)
        if duration is not None:
            duration = max(MIN_DURATION_MS, min(duration, MAX_DURATION_MS))
            command.add_int("D", duration)
        if reps is not None:
            command.add_int("R", max(-1, min(reps, MAX_REPS)))
        resp = await self._connection.send_command(command)
        if not re.match(rf"^{GCODE.SET_LED}$", resp):
            raise ValueError(f"Incorrect Response for set led: {resp}")
        return True

    async def enter_programming_mode(self) -> None:
        """Reboot into programming mode"""
        command = GCODE.ENTER_BOOTLOADER.build_command()
        await self._connection.send_dfu_command(command)
        await self._connection.close()

    def reset_serial_buffers(self) -> None:
        """Reset the input and output serial buffers."""
        self._connection._serial.reset_input_buffer()
        self._connection._serial.reset_output_buffer()
