"""
- Driver is responsible for providing an interface for the temp-deck
- Driver is the only system component that knows about the temp-deck's GCODES
  or how the temp-deck communications

- Driver is NOT responsible interpreting the temperatures or states in any way
  or knowing anything about what the device is being used for
"""

from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional
from enum import Enum

from opentrons.drivers import utils
from opentrons.drivers.types import Temperature
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.asyncio.communication import SerialConnection, UnhandledGcode
from opentrons.drivers.temp_deck.abstract import AbstractTempDeckDriver

log = logging.getLogger(__name__)

DEFAULT_TEMP_DECK_TIMEOUT = 1

DEFAULT_COMMAND_RETRIES = 3


class GCODE(str, Enum):
    GET_TEMP = "M105"
    SET_TEMP = "M104"
    DEVICE_INFO = "M115"
    GET_RESET_REASON = "M114"
    DISENGAGE = "M18"
    PROGRAMMING_MODE = "dfu"


TEMP_DECK_BAUDRATE = 115200

TEMP_DECK_COMMAND_TERMINATOR = "\r\n\r\n"
TEMP_DECK_ACK = "ok\r\nok\r\n"


class TempDeckError(Exception):
    pass


class TempDeckDriver(AbstractTempDeckDriver):
    @classmethod
    async def create(
        cls, port: str, loop: Optional[asyncio.AbstractEventLoop] = None
    ) -> TempDeckDriver:
        """
        Create a temp deck driver.

        Args:
            port: port or url of temp deck
            loop: optional event loop

        Returns: driver
        """
        connection = await SerialConnection.create(
            port=port,
            baud_rate=TEMP_DECK_BAUDRATE,
            timeout=DEFAULT_TEMP_DECK_TIMEOUT,
            ack=TEMP_DECK_ACK,
            loop=loop,
            reset_buffer_before_write=False,
        )
        return cls(connection=connection)

    def __init__(self, connection: SerialConnection) -> None:
        """
        Construct a temp deck driver

        Args:
            connection: Connection to the temp deck
        """
        self._connection = connection

    async def connect(self) -> None:
        """Connect to the temp deck."""
        await self._connection.open()

    async def disconnect(self) -> None:
        """Disconnect from temp deck"""
        await self._connection.close()

    async def is_connected(self) -> bool:
        """Check connected state"""
        return await self._connection.is_open()

    async def deactivate(self) -> None:
        """
        Send disengage command to temp deck

        Returns: None
        """
        c = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DISENGAGE
        )
        await self._send_command(command=c)

    async def set_temperature(self, celsius: float) -> None:
        """
        Send a set temperate command to temp deck

        Args:
            celsius: the target temperature

        Returns: None
        """
        c = (
            CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR)
            .add_gcode(gcode=GCODE.SET_TEMP)
            .add_float(
                prefix="S",
                value=celsius,
                precision=utils.TEMPDECK_GCODE_ROUNDING_PRECISION,
            )
        )
        await self._send_command(command=c)

    async def get_temperature(self) -> Temperature:
        """
        Send a get temperature command to the temp deck.

        Returns: Temperature object

        """
        c = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_TEMP
        )
        response = await self._send_command(command=c)
        return utils.parse_temperature_response(
            temperature_string=response,
            rounding_val=utils.TEMPDECK_GCODE_ROUNDING_PRECISION,
        )

    async def get_device_info(self) -> Dict[str, str]:
        """
        Queries Temp-Deck for its build version, model, and serial number

        returns: dict
            Where keys are the strings 'version', 'model', and 'serial',
            and each value is a string identifier

            {
                'serial': '1aa11bb22',
                'model': '1aa11bb22',
                'version': '1aa11bb22'
            }

        Example input from Temp-Deck's serial response:
            "serial:aa11bb22 model:aa11bb22 version:aa11bb22"
        """
        device_info = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEVICE_INFO
        )
        response = await self._send_command(command=device_info)

        reset_reason = CommandBuilder(
            terminator=TEMP_DECK_COMMAND_TERMINATOR
        ).add_gcode(gcode=GCODE.GET_RESET_REASON)
        try:
            await self._send_command(command=reset_reason)
        except UnhandledGcode:
            pass

        return utils.parse_device_information(device_info_string=response)

    async def enter_programming_mode(self) -> None:
        """
        Send command to enter programming mode.

        Returns: None
        """
        c = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.PROGRAMMING_MODE
        )
        await self._send_command(command=c)

    async def _send_command(self, command: CommandBuilder) -> str:
        """
        Send the command

        Args:
            command: command to send

        Returns:
            command response
        """
        response = await self._connection.send_command(
            command=command, retries=DEFAULT_COMMAND_RETRIES
        )
        return response
