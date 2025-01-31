import pytest
from mock import AsyncMock
from opentrons.drivers.asyncio.communication.serial_connection import (
    AsyncResponseSerialConnection,
)
from opentrons.drivers.heater_shaker import driver
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.types import Temperature, RPM, HeaterShakerLabwareLatchStatus


@pytest.fixture
def connection() -> AsyncMock:
    return AsyncMock(spec=AsyncResponseSerialConnection)


@pytest.fixture
def subject(connection: AsyncMock) -> driver.HeaterShakerDriver:
    connection.send_command.return_value = ""
    return driver.HeaterShakerDriver(connection)


async def test_open_lock(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send an open plate lock command"""
    connection.send_command.return_value = "M242 ok\n"
    await subject.open_labware_latch()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="M242"
    )
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_close_lock(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a close plate lock command"""
    connection.send_command.return_value = "M243 ok\n"
    await subject.close_labware_latch()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="M243"
    )
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_get_lock_status(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a get plate lock status command and parse response."""
    connection.send_command.return_value = "M241 STATUS:IDLE_UNKNOWN ok\n"

    response = await subject.get_labware_latch_status()

    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="M241"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=0)
    assert response == HeaterShakerLabwareLatchStatus.IDLE_UNKNOWN


async def test_set_temperature(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a set temperature command"""
    connection.send_command.return_value = "M104 ok\n"
    await subject.set_temperature(temperature=65.02)
    expected = (
        CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR)
        .add_gcode(gcode="M104")
        .add_float(prefix="S", value=65.02, precision=2)
    )
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_get_temperature(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a get temperature command and parse the response"""

    connection.send_command.return_value = "M105 T:91.25 C:54.02 ok\n"
    response = await subject.get_temperature()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode("M105")
    connection.send_command.assert_called_once_with(command=expected, retries=0)
    assert response == Temperature(current=54.02, target=91.25)


async def test_set_rpm(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a set rpm command"""
    connection.send_command.return_value = "M3 ok\n"
    await subject.set_rpm(2500)
    expected = (
        CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR)
        .add_gcode(gcode="M3")
        .add_int(prefix="S", value=2500)
    )
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_get_rpm(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a get rpm command and parse the response"""
    connection.send_command.return_value = "M123 T:2200 C:2100 ok\n"
    response = await subject.get_rpm()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode("M123")
    connection.send_command.assert_called_once_with(command=expected, retries=0)
    assert response == RPM(current=2100, target=2200)


async def test_home(subject: driver.HeaterShakerDriver, connection: AsyncMock) -> None:
    """It should send a home command"""
    connection.send_command.return_value = "G28 ok\n"
    await subject.home()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode("G28")
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_deactivate_heater(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a deactivate-heater command"""
    connection.send_command.return_value = "M106 ok\n"
    await subject.deactivate_heater()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode("M106")
    connection.send_command.assert_called_once_with(command=expected, retries=0)


async def test_get_device_info(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should send a get device info command"""
    connection.send_command.return_value = (
        "M115 FW:21.2.1 HW:A SerialNo:TC2101010A2 ok\n"
    )
    response = await subject.get_device_info()
    assert response == {"serial": "TC2101010A2", "model": "A", "version": "21.2.1"}
    device_info = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="M115"
    )
    reset_reason = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="M114"
    )
    connection.send_command.assert_any_call(command=device_info, retries=0)
    connection.send_command.assert_called_with(command=reset_reason, retries=0)


async def test_enter_bootloader(
    subject: driver.HeaterShakerDriver, connection: AsyncMock
) -> None:
    """It should enter the bootloader"""
    connection.send_dfu_command.return_value = None
    await subject.enter_programming_mode()
    expected = CommandBuilder(terminator=driver.HS_COMMAND_TERMINATOR).add_gcode(
        gcode="dfu"
    )
    connection.send_dfu_command.assert_called_once_with(command=expected)
    connection.close.assert_called_once()
