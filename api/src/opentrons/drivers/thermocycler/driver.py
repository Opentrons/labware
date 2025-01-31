from __future__ import annotations

import asyncio
import logging
from enum import Enum
from typing import Optional, Dict, Union

from opentrons.drivers import utils
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.asyncio.communication import (
    SerialConnection,
    AsyncResponseSerialConnection,
    AsyncSerial,
    UnhandledGcode,
)
from opentrons.drivers.thermocycler.abstract import AbstractThermocyclerDriver
from opentrons.drivers.types import Temperature, PlateTemperature, ThermocyclerLidStatus

log = logging.getLogger(__name__)


class GCODE(str, Enum):
    OPEN_LID = "M126"
    CLOSE_LID = "M127"
    PLATE_LIFT = "M128"
    GET_LID_STATUS = "M119"
    SET_LID_TEMP = "M140"
    GET_LID_TEMP = "M141"
    EDIT_PID_PARAMS = "M301"
    SET_PLATE_TEMP = "M104"
    GET_PLATE_TEMP = "M105"
    SET_RAMP_RATE = "M566"
    DEACTIVATE_ALL = "M18"
    DEACTIVATE_LID = "M108"
    DEACTIVATE_BLOCK = "M14"
    DEVICE_INFO = "M115"
    GET_RESET_REASON = "M114"
    ENTER_PROGRAMMING = "dfu"


LID_TARGET_DEFAULT = 105  # Degree celsius (floats)
LID_TARGET_MIN = 37
LID_TARGET_MAX = 110
BLOCK_TARGET_MIN = 0
BLOCK_TARGET_MAX = 99
BLOCK_VOL_MIN = 0
BLOCK_VOL_MAX = 100
TEMP_UPDATE_RETRIES = 50
TEMP_BUFFER_MAX_LEN = 10


TC_BAUDRATE = 115200
TC_BOOTLOADER_BAUDRATE = 1200
# TODO (Laura 20190327) increased the thermocycler command timeout
# temporarily until we can change the firmware to asynchronously handle
# the lid being open and closed
SERIAL_ACK = "\r\n"
TC_COMMAND_TERMINATOR = SERIAL_ACK
TC_ACK = "ok" + SERIAL_ACK + "ok" + SERIAL_ACK
DEFAULT_TC_TIMEOUT = 40
DEFAULT_COMMAND_RETRIES = 3

# The ACK for Gen2 will never contain a carriage return.
TC_GEN2_SERIAL_ACK = "\n"
TC_GEN2_ACK = " OK" + TC_GEN2_SERIAL_ACK
TC_GEN2_ERROR_WORD = "ERR"
TC_GEN2_ASYNC_ERROR_ACK = "async"

SerialKind = Union[AsyncResponseSerialConnection, SerialConnection]


class ThermocyclerDriverFactory:
    @staticmethod
    async def create(
        port: str, loop: Optional[asyncio.AbstractEventLoop]
    ) -> ThermocyclerDriver:
        """
        Create a thermocycler driver.

        Args:
            port: port or url of thermocycler
            loop: optional event loop

        Returns: driver
        """
        serial_port = await AsyncSerial.create(
            port=port,
            baud_rate=TC_BAUDRATE,
            timeout=DEFAULT_TC_TIMEOUT,
            loop=loop,
            reset_buffer_before_write=False,
        )
        connection_temp = SerialConnection(
            serial=serial_port,
            port=port,
            name=port,
            ack=TC_GEN2_SERIAL_ACK,
            retry_wait_time_seconds=0.1,
            error_keyword="err",
            alarm_keyword="alarm",
        )

        is_gen2 = await ThermocyclerDriverFactory.is_gen2_thermocycler(connection_temp)
        # Must reset input data because the old setting of the ACK did
        # not necessarily capture the entire response.
        serial_port.reset_input_buffer()

        if is_gen2:
            async_connection = AsyncResponseSerialConnection(
                serial=serial_port,
                port=port,
                name=port,
                ack=TC_GEN2_ACK,
                retry_wait_time_seconds=0.1,
                error_keyword=TC_GEN2_ERROR_WORD,
                alarm_keyword="alarm",
                async_error_ack=TC_GEN2_ASYNC_ERROR_ACK,
            )
            return ThermocyclerDriverV2(async_connection)
        else:
            connection = SerialConnection(
                serial=serial_port,
                port=port,
                name=port,
                ack=TC_ACK,
                retry_wait_time_seconds=0.1,
                error_keyword="error",
                alarm_keyword="alarm",
            )
            return ThermocyclerDriver(connection)

    @staticmethod
    async def is_gen2_thermocycler(connection: SerialConnection) -> bool:
        """
        Send a message through a connection to check if the connected
        thermocycler is a Gen1 or Gen2 model
        """

        # The DEVICE_INFO response will disambiguate which version of
        # TC is connected. Gen1 TC responses do not include the command code
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEVICE_INFO
        )
        response = await connection.send_command(
            command=c, retries=DEFAULT_COMMAND_RETRIES
        )

        return response.startswith(GCODE.DEVICE_INFO)


class ThermocyclerDriver(AbstractThermocyclerDriver):
    def __init__(
        self,
        connection: SerialKind,
    ) -> None:
        """
        Constructor

        Args:
            connection: SerialConnection to the thermocycler
        """
        self._connection = connection

    async def connect(self) -> None:
        """Connect to thermocycler"""
        await self._connection.open()

    async def disconnect(self) -> None:
        """Disconnect from thermocycler"""
        await self._connection.close()

    async def is_connected(self) -> bool:
        """Check connection"""
        return await self._connection.is_open()

    async def open_lid(self) -> None:
        """Send open lid command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.OPEN_LID
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def close_lid(self) -> None:
        """Send close lid command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.CLOSE_LID
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def get_lid_status(self) -> ThermocyclerLidStatus:
        """Send get lid status command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_LID_STATUS
        )
        response = await self._connection.send_command(
            command=c, retries=DEFAULT_COMMAND_RETRIES
        )
        return ThermocyclerLidStatus(utils.parse_key_values(value=response)["Lid"])

    async def set_lid_temperature(self, temp: float) -> None:
        """Set the lid temperature"""
        temp = min(LID_TARGET_MAX, max(LID_TARGET_MIN, temp))
        c = (
            CommandBuilder(terminator=TC_COMMAND_TERMINATOR)
            .add_gcode(gcode=GCODE.SET_LID_TEMP)
            .add_float(
                prefix="S", value=temp, precision=utils.TC_GCODE_ROUNDING_PRECISION
            )
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def get_lid_temperature(self) -> Temperature:
        """Send a get lid temperature command."""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_LID_TEMP
        )
        response = await self._connection.send_command(
            command=c, retries=DEFAULT_COMMAND_RETRIES
        )
        return utils.parse_temperature_response(
            temperature_string=response, rounding_val=utils.TC_GCODE_ROUNDING_PRECISION
        )

    async def set_plate_temperature(
        self,
        temp: float,
        hold_time: Optional[float] = None,
        volume: Optional[float] = None,
    ) -> None:
        """Send set plate temperature command"""
        temp = min(BLOCK_TARGET_MAX, max(BLOCK_TARGET_MIN, temp))

        c = (
            CommandBuilder(terminator=TC_COMMAND_TERMINATOR)
            .add_gcode(gcode=GCODE.SET_PLATE_TEMP)
            .add_float(
                prefix="S", value=temp, precision=utils.TC_GCODE_ROUNDING_PRECISION
            )
        )
        if hold_time is not None:
            c = c.add_float(
                prefix="H", value=hold_time, precision=utils.TC_GCODE_ROUNDING_PRECISION
            )
        if volume is not None:
            c = c.add_float(
                prefix="V", value=volume, precision=utils.TC_GCODE_ROUNDING_PRECISION
            )

        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def get_plate_temperature(self) -> PlateTemperature:
        """Send a get plate temperature command."""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_PLATE_TEMP
        )
        response = await self._connection.send_command(
            command=c, retries=DEFAULT_COMMAND_RETRIES
        )
        return utils.parse_plate_temperature_response(
            temperature_string=response, rounding_val=utils.TC_GCODE_ROUNDING_PRECISION
        )

    async def set_ramp_rate(self, ramp_rate: float) -> None:
        """Send a set ramp rate command"""
        c = (
            CommandBuilder(terminator=TC_COMMAND_TERMINATOR)
            .add_gcode(gcode=GCODE.SET_RAMP_RATE)
            .add_float(
                prefix="S", value=ramp_rate, precision=utils.TC_GCODE_ROUNDING_PRECISION
            )
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def deactivate_all(self) -> None:
        """Send deactivate all command."""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEACTIVATE_ALL
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def deactivate_lid(self) -> None:
        """Send deactivate lid command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEACTIVATE_LID
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def deactivate_block(self) -> None:
        """Send deactivate block command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEACTIVATE_BLOCK
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def get_device_info(self) -> Dict[str, str]:
        """Send get device info command"""
        device_info = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEVICE_INFO
        )
        response = await self._connection.send_command(
            command=device_info, retries=DEFAULT_COMMAND_RETRIES
        )

        return utils.parse_device_information(device_info_string=response)

    async def enter_programming_mode(self) -> None:
        """Enter programming mode."""
        trigger_connection = await AsyncSerial.create(
            self._connection.port, TC_BOOTLOADER_BAUDRATE, timeout=1
        )
        await asyncio.sleep(0.05)
        await trigger_connection.close()
        await self._connection.close()

    async def lift_plate(self) -> None:
        """Send the Plate Lift command.

        NOT SUPPORTED on TC Gen1."""
        raise NotImplementedError(
            "Gen1 Thermocyclers do not support the Plate Lift command."
        )

    async def jog_lid(self, angle: float) -> None:
        """Send the Jog Lid command.

        NOT SUPPORTED on TC Gen1."""
        raise NotImplementedError(
            "Gen1 Thermocyclers do not support the Jog Lid command."
        )


class ThermocyclerDriverV2(ThermocyclerDriver):
    """
    This driver is for Thermocycler model Gen2.
    """

    def __init__(self, connection: AsyncResponseSerialConnection) -> None:
        """
        Constructor

        Args:
            connection: SerialConnection to the thermocycler
        """
        super().__init__(connection)

    async def set_ramp_rate(self, ramp_rate: float) -> None:
        """Send a set ramp rate command"""
        # This command is fully unsupported on TC Gen2
        return None

    async def get_device_info(self) -> Dict[str, str]:
        """Send get device info command"""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEVICE_INFO
        )
        response = await self._connection.send_command(
            command=c, retries=DEFAULT_COMMAND_RETRIES
        )

        reset_reason = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_RESET_REASON
        )
        try:
            await self._connection.send_command(
                command=reset_reason, retries=DEFAULT_COMMAND_RETRIES
            )
        except UnhandledGcode:
            pass

        return utils.parse_hs_device_information(device_info_string=response)

    async def enter_programming_mode(self) -> None:
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.ENTER_PROGRAMMING
        )
        # No response expected, USB connection should terminate after this
        await self._connection.send_dfu_command(command=c)
        await self._connection.close()

    async def lift_plate(self) -> None:
        """Send the Plate Lift command."""
        c = CommandBuilder(terminator=TC_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.PLATE_LIFT
        )
        await self._connection.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    async def jog_lid(self, angle: float) -> None:
        """Send the Jog Lid command."""
        c = (
            CommandBuilder(terminator=TC_COMMAND_TERMINATOR)
            .add_gcode(gcode="M240.D")
            .add_float(prefix="", value=angle, precision=2)
            .add_element("O")
        )
        await self._connection.send_command(command=c, retries=1)
