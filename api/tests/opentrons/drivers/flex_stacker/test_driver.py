import pytest
from mock import AsyncMock
from opentrons.drivers.asyncio.communication.serial_connection import (
    AsyncResponseSerialConnection,
)
from opentrons.drivers.flex_stacker.driver import FS_MOVE_TIMEOUT, FlexStackerDriver
from opentrons.drivers.flex_stacker import types


@pytest.fixture
def connection() -> AsyncMock:
    return AsyncMock(spec=AsyncResponseSerialConnection)


@pytest.fixture
def subject(connection: AsyncMock) -> FlexStackerDriver:
    connection.send_command.return_value = ""
    return FlexStackerDriver(connection)


async def test_get_device_info(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get device info command"""
    connection.send_command.side_effect = [
        "M115 FW:0.0.1 HW:Opentrons-flex-stacker-a1 SerialNo:STCA120230605001",
        "M114 R:0",
    ]
    response = await subject.get_device_info()
    assert response == types.StackerInfo(
        fw="0.0.1",
        hw=types.HardwareRevision.EVT,
        sn="STCA120230605001",
        rr=0,
    )

    device_info = types.GCODE.DEVICE_INFO.build_command()
    reset_reason = types.GCODE.GET_RESET_REASON.build_command()
    connection.send_command.assert_any_call(device_info)
    connection.send_command.assert_called_with(reset_reason)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.side_effect = [
        "M115 FW:0.0.1 SerialNo:STCA120230605001",
        "M114 R:0",
    ]

    # This should raise ValueError
    with pytest.raises(ValueError):
        response = await subject.get_device_info()

    device_info = types.GCODE.DEVICE_INFO.build_command()
    connection.send_command.assert_any_call(device_info)
    # M115 response is invalid, so we dont send M114.
    connection.send_command.assert_called_once()


async def test_stop_motors(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a stop motors command"""
    connection.send_command.return_value = "M0"
    response = await subject.stop_motors()
    assert response

    stop_motors = types.GCODE.STOP_MOTORS.build_command()
    connection.send_command.assert_any_call(stop_motors)
    connection.reset_mock()

    # This should raise ValueError
    with pytest.raises(ValueError):
        await subject.get_device_info()


async def test_get_motion_params(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get motion params command."""
    connection.send_command.return_value = "M120 M:X V:200.000 A:1500.000 D:5.000"
    response = await subject.get_motion_params(types.StackerAxis.X)
    assert response == types.MoveParams(
        axis=types.StackerAxis.X,
        acceleration=1500.0,
        max_speed=200.0,
        max_speed_discont=5.0,
    )

    command = types.GCODE.GET_MOVE_PARAMS.build_command().add_element(
        types.StackerAxis.X.name
    )
    response = await connection.send_command(command)
    connection.send_command.assert_any_call(command)
    connection.reset_mock()


async def test_set_serial_number(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a set serial number command"""
    connection.send_command.return_value = "M996"

    serial_number = "FSTA1020250119001"
    response = await subject.set_serial_number(serial_number)
    assert response

    set_serial_number = types.GCODE.SET_SERIAL_NUMBER.build_command().add_element(
        serial_number
    )
    connection.send_command.assert_any_call(set_serial_number)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M9nn"
    with pytest.raises(ValueError):
        response = await subject.set_serial_number(serial_number)

    set_serial_number = types.GCODE.SET_SERIAL_NUMBER.build_command().add_element(
        serial_number
    )
    connection.send_command.assert_any_call(set_serial_number)
    connection.reset_mock()

    # Test invalid serial number
    with pytest.raises(ValueError):
        response = await subject.set_serial_number("invalid")

    connection.send_command.assert_not_called()
    connection.reset_mock()


async def test_enable_motors(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a enable motors command"""
    connection.send_command.return_value = "M17"
    response = await subject.enable_motors([types.StackerAxis.X])
    assert response

    move_to = types.GCODE.ENABLE_MOTORS.build_command().add_element(
        types.StackerAxis.X.value
    )
    connection.send_command.assert_any_call(move_to)
    connection.reset_mock()

    # Test no arg to disable all motors
    response = await subject.enable_motors(list(types.StackerAxis))
    assert response

    move_to = types.GCODE.ENABLE_MOTORS.build_command()
    move_to.add_element(types.StackerAxis.X.value)
    move_to.add_element(types.StackerAxis.Z.value)
    move_to.add_element(types.StackerAxis.L.value)

    print("MOVE TO", move_to)
    connection.send_command.assert_any_call(move_to)
    connection.reset_mock()


async def test_get_limit_switch(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get limit switch command and return the boolean of one."""
    connection.send_command.return_value = "M119 XE:1 XR:0 ZE:0 ZR:1 LR:1"
    response = await subject.get_limit_switch(
        types.StackerAxis.X, types.Direction.EXTEND
    )
    assert response

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)
    connection.reset_mock()


async def test_get_limit_switches_status(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get limit switch status and return LimitSwitchStatus."""
    connection.send_command.return_value = "M119 XE:1 XR:0 ZE:0 ZR:1 LR:1"
    response = await subject.get_limit_switches_status()
    assert response == types.LimitSwitchStatus(
        XE=True,
        XR=False,
        ZE=False,
        ZR=True,
        LR=True,
    )

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M119 XE:b XR:0 ZE:a ZR:1 LR:n"
    with pytest.raises(ValueError):
        response = await subject.get_limit_switches_status()

    limit_switch_status = types.GCODE.GET_LIMIT_SWITCH.build_command()
    connection.send_command.assert_any_call(limit_switch_status)


async def test_get_platform_sensor(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get platform sensor command return status of specified sensor."""
    connection.send_command.return_value = "M121 E:1 R:1"
    response = await subject.get_platform_sensor(types.Direction.EXTEND)
    assert response

    platform_sensor = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_sensor)
    connection.reset_mock()


async def test_get_platform_status(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """it should send a get platform sensors status."""
    connection.send_command.return_value = "M121 E:0 R:1"
    response = await subject.get_platform_status()
    assert response == types.PlatformStatus(
        E=False,
        R=True,
    )

    platform_status = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_status)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M121 E:0 R:1 something"
    with pytest.raises(ValueError):
        response = await subject.get_platform_status()

    platform_status = types.GCODE.GET_PLATFORM_SENSOR.build_command()
    connection.send_command.assert_any_call(platform_status)


async def test_get_hopper_door_closed(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a get door closed command."""
    connection.send_command.return_value = "M122 D:1"
    response = await subject.get_hopper_door_closed()
    assert response

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()

    # Test door open
    connection.send_command.return_value = "M122 D:0"
    response = await subject.get_hopper_door_closed()
    assert not response

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()

    # Test invalid response
    connection.send_command.return_value = "M122 78gybhjk"

    with pytest.raises(ValueError):
        response = await subject.get_hopper_door_closed()

    door_closed = types.GCODE.GET_DOOR_SWITCH.build_command()
    connection.send_command.assert_any_call(door_closed)
    connection.reset_mock()


async def test_move_in_mm(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a move to command"""
    connection.send_command.return_value = "G0"
    response = await subject.move_in_mm(types.StackerAxis.X, 10)
    assert response

    move_to = types.GCODE.MOVE_TO.build_command().add_float("X", 10)
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


async def test_move_to_switch(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should send a move to switch command"""
    connection.send_command.return_value = "G5"
    axis = types.StackerAxis.X
    direction = types.Direction.EXTEND
    response = await subject.move_to_limit_switch(axis, direction)
    assert response

    move_to = types.GCODE.MOVE_TO_SWITCH.build_command().add_int(
        axis.name, direction.value
    )
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


async def test_home_axis(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a home axis command"""
    connection.send_command.return_value = "G28"
    axis = types.StackerAxis.X
    direction = types.Direction.EXTEND
    response = await subject.home_axis(axis, direction)
    assert response

    move_to = types.GCODE.HOME_AXIS.build_command().add_int(axis.name, direction.value)
    connection.send_command.assert_any_call(move_to, timeout=FS_MOVE_TIMEOUT)
    connection.reset_mock()


async def test_set_led(subject: FlexStackerDriver, connection: AsyncMock) -> None:
    """It should send a set led command"""
    connection.send_command.return_value = "M200"
    response = await subject.set_led(1, types.LEDColor.RED)
    assert response

    set_led = types.GCODE.SET_LED.build_command().add_float("P", 1).add_int("C", 1)
    connection.send_command.assert_any_call(set_led)
    connection.reset_mock()

    # test setting only external leds
    response = await subject.set_led(1, types.LEDColor.RED, external=True)
    assert response

    set_led = (
        types.GCODE.SET_LED.build_command()
        .add_float("P", 1)
        .add_int("C", 1)
        .add_int("K", 1)
    )
    connection.send_command.assert_any_call(set_led)
    connection.reset_mock()


async def test_get_stallguard_threshold(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should get the stallguard threshold."""
    connection.send_command.return_value = "M911 Z:1 T:2"
    response = await subject.get_stallguard_threshold(types.StackerAxis.Z)
    assert response == types.StallGuardParams(types.StackerAxis.Z, True, 2)

    get_theshold = types.GCODE.GET_STALLGUARD_THRESHOLD.build_command().add_element(
        types.StackerAxis.Z.name
    )
    connection.send_command.assert_any_call(get_theshold)
    connection.reset_mock()


async def test_set_stallguard_threshold(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should set the stallguard threshold."""
    axis = types.StackerAxis.Z
    enable = True
    threshold = 2
    connection.send_command.return_value = "M910"
    response = await subject.set_stallguard_threshold(axis, enable, threshold)
    assert response

    set_threshold = (
        types.GCODE.SET_STALLGUARD.build_command()
        .add_int(axis.name, int(enable))
        .add_int("T", threshold)
    )
    connection.send_command.assert_any_call(set_threshold)
    connection.reset_mock()

    # test invalid threshold
    with pytest.raises(ValueError):
        response = await subject.set_stallguard_threshold(axis, enable, 1000)

    connection.send_command.assert_not_called()
    connection.reset_mock()


async def test_get_motor_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should get the motor driver register."""
    connection.send_command.return_value = "M920 Z:1 V:2"
    response = await subject.get_motor_driver_register(types.StackerAxis.Z, 1)
    assert response == 2

    get_register = types.GCODE.GET_MOTOR_DRIVER_REGISTER.build_command().add_int(
        types.StackerAxis.Z.name, 1
    )
    connection.send_command.assert_any_call(get_register)
    connection.reset_mock()


async def test_set_motor_driver_register(
    subject: FlexStackerDriver, connection: AsyncMock
) -> None:
    """It should set the motor driver register."""
    connection.send_command.return_value = "M921"
    response = await subject.set_motor_driver_register(types.StackerAxis.Z, 1, 2)
    assert response

    set_register = (
        types.GCODE.SET_MOTOR_DRIVER_REGISTER.build_command()
        .add_int(types.StackerAxis.Z.name, 1)
        .add_element(str(2))
    )
    connection.send_command.assert_any_call(set_register)
    connection.reset_mock()
