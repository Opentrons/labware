from typing import Optional
import pytest
from mock import AsyncMock
from opentrons.drivers.asyncio.communication.serial_connection import (
    AsyncResponseSerialConnection,
)
from opentrons.drivers.thermocycler import driver
from opentrons.drivers.command_builder import CommandBuilder
from opentrons.drivers.types import Temperature, PlateTemperature, ThermocyclerLidStatus
from opentrons.drivers.utils import TC_GCODE_ROUNDING_PRECISION


@pytest.fixture
def connection() -> AsyncMock:
    return AsyncMock(spec=AsyncResponseSerialConnection)


@pytest.fixture
def subject(connection: AsyncMock) -> driver.ThermocyclerDriverV2:
    connection.send_command.return_value = ""
    return driver.ThermocyclerDriverV2(connection)


async def test_open_lid(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send an open lid command."""
    await subject.open_lid()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M126"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_close_lid(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a close lid command."""
    await subject.close_lid()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M127"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_plate_lift(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a Plate Lift command."""
    await subject.lift_plate()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M128"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_get_lid_status(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a get lid status command and parse response."""
    connection.send_command.return_value = "M119 Lid:open Seal:engaged OK\n"

    response = await subject.get_lid_status()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M119"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)
    assert response == ThermocyclerLidStatus.OPEN


@pytest.mark.parametrize(
    argnames=["requested_temp", "actual_temp"],
    argvalues=[
        [driver.LID_TARGET_MIN + 5, driver.LID_TARGET_MIN + 5],
        [driver.LID_TARGET_MIN - 5, driver.LID_TARGET_MIN],
        [driver.LID_TARGET_MAX + 5, driver.LID_TARGET_MAX],
    ],
)
async def test_set_lid_temp(
    subject: driver.ThermocyclerDriverV2,
    connection: AsyncMock,
    requested_temp: float,
    actual_temp: float,
) -> None:
    """It should send a set lid temperature command honoring the min/max."""
    await subject.set_lid_temperature(temp=requested_temp)

    expected = (
        CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR)
        .add_gcode(gcode="M140")
        .add_float(prefix="S", value=actual_temp, precision=TC_GCODE_ROUNDING_PRECISION)
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_get_lid_temp(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a get lid temperature command and parse response."""
    connection.send_command.return_value = "M141 T:100.000 C:22.041 OK\n'"

    response = await subject.get_lid_temperature()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M141"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)
    assert response == Temperature(target=100, current=22.04)


@pytest.mark.parametrize(
    argnames=["temp", "hold_time", "volume", "expected_body"],
    argvalues=[
        [50, 2, 32, "S50 H2 V32"],
        [50, None, None, "S50"],
        [50, 2, None, "S50 H2"],
        [50, None, 32, "S50 V32"],
        [-5, 2, 32, "S0 H2 V32"],
        [102, 2, 32, "S99 H2 V32"],
    ],
)
async def test_set_plate_temp(
    subject: driver.ThermocyclerDriverV2,
    connection: AsyncMock,
    temp: float,
    hold_time: Optional[float],
    volume: Optional[float],
    expected_body: str,
) -> None:
    """It should send a set plate temperature command."""
    await subject.set_plate_temperature(temp=temp, hold_time=hold_time, volume=volume)

    expected = (
        CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR)
        .add_gcode(gcode="M104")
        .add_element(element=expected_body)
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_get_plate_temp(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a command to get the plate temperature and parse the response."""
    connection.send_command.return_value = (
        "M105 T:30.000 C:23.317 H:120 Total_H:120 At_target?:0 OK\n"
    )

    response = await subject.get_plate_temperature()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M105"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)
    assert response == PlateTemperature(target=30, current=23.32, hold=120)


async def test_set_ramp_rate(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should not send a set ramp rate command."""
    await subject.set_ramp_rate(ramp_rate=22)

    assert not connection.send_command.called


async def test_deactivate_all(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a deactivate all command."""
    await subject.deactivate_all()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M18"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_deactivate_lid(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a deactivate lid command."""
    await subject.deactivate_lid()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M108"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_deactivate_block(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a deactivate block command."""
    await subject.deactivate_block()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M14"
    )

    connection.send_command.assert_called_once_with(command=expected, retries=3)


async def test_device_info(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send a get device info command and parse response."""
    connection.send_command.return_value = (
        "M115 FW:(dev)--b4eeff7 HW:Opentrons-thermocycler-gen2 SerialNo:EMPTYSN OK\n"
    )

    device_info = await subject.get_device_info()

    get_device_info = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M115"
    )
    reset_reason = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="M114"
    )

    connection.send_command.assert_any_call(command=get_device_info, retries=3)
    connection.send_command.assert_called_with(command=reset_reason, retries=3)

    assert device_info == {
        "serial": "EMPTYSN",
        "model": "Opentrons-thermocycler-gen2",
        "version": "(dev)--b4eeff7",
    }


async def test_enter_bootloader(
    subject: driver.ThermocyclerDriverV2, connection: AsyncMock
) -> None:
    """It should send the bootloader command and close the connection"""

    await subject.enter_programming_mode()

    expected = CommandBuilder(terminator=driver.TC_COMMAND_TERMINATOR).add_gcode(
        gcode="dfu"
    )

    connection.send_dfu_command.assert_called_once_with(command=expected)

    assert connection.close.called
