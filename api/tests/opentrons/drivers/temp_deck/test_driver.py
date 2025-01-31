from mock import AsyncMock
import pytest

from opentrons.drivers.asyncio.communication.serial_connection import (
    SerialConnection,
)
from opentrons.drivers.asyncio.communication.errors import UnhandledGcode
from opentrons.drivers.temp_deck.driver import (
    TempDeckDriver,
    TEMP_DECK_COMMAND_TERMINATOR,
)
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.utils import TEMPDECK_GCODE_ROUNDING_PRECISION
from opentrons.drivers.types import Temperature


@pytest.fixture
def connection() -> AsyncMock:
    return AsyncMock(spec=SerialConnection)


@pytest.fixture
def driver(connection: AsyncMock) -> TempDeckDriver:
    connection.send_command.return_value = ""
    return TempDeckDriver(connection)


async def test_deactivate(driver: TempDeckDriver, connection: AsyncMock) -> None:
    """It should send a deactivate command"""
    await driver.deactivate()

    expected = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode("M18")

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_set_temperature(driver: TempDeckDriver, connection: AsyncMock) -> None:
    """It should send a set temperature command"""
    await driver.set_temperature(celsius=123.4444)

    expected = (
        CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR)
        .add_gcode("M104")
        .add_float(
            prefix="S", value=123.4444, precision=TEMPDECK_GCODE_ROUNDING_PRECISION
        )
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_get_temperature(driver: TempDeckDriver, connection: AsyncMock) -> None:
    """It should send a get temperature command and parse response"""
    connection.send_command.return_value = "T:132 C:25 ok\r\nok\r\n" ""

    response = await driver.get_temperature()

    expected = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode("M105")

    connection.send_command.assert_called_once_with(command=expected, retries=3)

    assert response == Temperature(current=25, target=132)


async def test_get_device_info_with_reset_reason(
    driver: TempDeckDriver, connection: AsyncMock
) -> None:
    """It should send a get device info command and parse response"""
    connection.send_command.return_value = "serial:s model:m version:v"

    response = await driver.get_device_info()

    device_info = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
        "M115"
    )
    reset_reason = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
        "M114"
    )

    connection.send_command.assert_any_call(command=device_info, retries=3)
    connection.send_command.assert_called_with(command=reset_reason, retries=3)

    assert response == {"serial": "s", "model": "m", "version": "v"}


async def test_get_device_info_no_reset_reason(
    driver: TempDeckDriver, connection: AsyncMock
) -> None:
    """It should send a get device info command and parse response"""

    async def fake_send_command(
        command: CommandBuilder, retries: int = 0, timeout: float | None = None
    ) -> str:
        if command.build().startswith("M114"):
            raise UnhandledGcode(
                port="fake port",
                response="ERR003: Unhandled Gcode",
                command=command.build(),
            )
        else:
            return "serial:s model:m version:v"

    connection.send_command.side_effect = fake_send_command

    response = await driver.get_device_info()

    device_info = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
        "M115"
    )
    reset_reason = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode(
        "M114"
    )

    connection.send_command.assert_any_call(command=device_info, retries=3)
    connection.send_command.assert_called_with(command=reset_reason, retries=3)

    assert response == {"serial": "s", "model": "m", "version": "v"}


async def test_enter_programming_mode(
    driver: TempDeckDriver, connection: AsyncMock
) -> None:
    """It should send an enter programming mode command"""
    await driver.enter_programming_mode()

    expected = CommandBuilder(terminator=TEMP_DECK_COMMAND_TERMINATOR).add_gcode("dfu")

    connection.send_command.assert_called_once_with(command=expected, retries=3)
