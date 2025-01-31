from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional, Mapping

from opentrons.drivers.flex_stacker.types import (
    Direction,
    LEDColor,
    LEDPattern,
    MoveParams,
    MoveResult,
    StackerAxis,
)
from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.drivers.flex_stacker.driver import (
    STACKER_MOTION_CONFIG,
    STALLGUARD_CONFIG,
    FlexStackerDriver,
)
from opentrons.drivers.flex_stacker.abstract import AbstractFlexStackerDriver
from opentrons.drivers.flex_stacker.simulator import SimulatingDriver
from opentrons.hardware_control.execution_manager import ExecutionManager
from opentrons.hardware_control.modules.errors import FlexStackerStallError
from opentrons.hardware_control.poller import Reader, Poller
from opentrons.hardware_control.modules import mod_abc, update
from opentrons.hardware_control.modules.types import (
    FlexStackerStatus,
    HopperDoorState,
    LatchState,
    ModuleDisconnectedCallback,
    ModuleType,
    PlatformState,
    StackerAxisState,
    UploadFunction,
    LiveData,
    FlexStackerData,
)

log = logging.getLogger(__name__)

POLL_PERIOD = 1.0
SIMULATING_POLL_PERIOD = POLL_PERIOD / 20.0

DFU_PID = "df11"

# Maximum distance in mm the axis can travel.
MAX_TRAVEL = {
    StackerAxis.X: 192.5,
    StackerAxis.Z: 136.0,
    StackerAxis.L: 23.0,
}

# The offset in mm to subtract from MAX_TRAVEL when moving an axis before we home.
# This lets us use `move_axis` to move fast, leaving the axis OFFSET mm
# from the limit switch. Then we can use `home_axis` to move the axis the rest
# of the way until we trigger the expected limit switch.
OFFSET_SM = 5.0
OFFSET_MD = 10.0
OFFSET_LG = 20.0

# height limit in mm of labware to use OFFSET_MD used when storing labware.
MEDIUM_LABWARE_Z_LIMIT = 20.0


class FlexStacker(mod_abc.AbstractModule):
    """Hardware control interface for an attached Flex-Stacker module."""

    MODULE_TYPE = ModuleType.FLEX_STACKER

    @classmethod
    async def build(
        cls,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        hw_control_loop: asyncio.AbstractEventLoop,
        poll_interval_seconds: Optional[float] = None,
        simulating: bool = False,
        sim_model: Optional[str] = None,
        sim_serial_number: Optional[str] = None,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> "FlexStacker":
        """
        Build a FlexStacker

        Args:
            port: The port to connect to
            usb_port: USB Port
            execution_manager: Execution manager.
            hw_control_loop: The event loop running in the hardware control thread.
            poll_interval_seconds: Poll interval override.
            simulating: whether to build a simulating driver
            loop: Loop
            sim_model: The model name used by simulator
            disconnected_callback: Callback to inform the module controller that the device was disconnected

        Returns:
            FlexStacker instance
        """
        driver: AbstractFlexStackerDriver
        if not simulating:
            driver = await FlexStackerDriver.create(port=port, loop=hw_control_loop)
            poll_interval_seconds = poll_interval_seconds or POLL_PERIOD
        else:
            driver = SimulatingDriver(serial_number=sim_serial_number)
            poll_interval_seconds = poll_interval_seconds or SIMULATING_POLL_PERIOD

        reader = FlexStackerReader(driver=driver)
        poller = Poller(reader=reader, interval=poll_interval_seconds)
        module = cls(
            port=port,
            usb_port=usb_port,
            driver=driver,
            reader=reader,
            poller=poller,
            device_info=(await driver.get_device_info()).to_dict(),
            hw_control_loop=hw_control_loop,
            execution_manager=execution_manager,
            disconnected_callback=disconnected_callback,
        )

        # Enable stallguard
        for axis in StackerAxis:
            config = STALLGUARD_CONFIG[axis]
            await driver.set_stallguard_threshold(
                axis, config.enabled, config.threshold
            )

        try:
            await poller.start()
        except Exception:
            log.exception(f"First read of Flex-Stacker on port {port} failed")

        return module

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        driver: AbstractFlexStackerDriver,
        reader: FlexStackerReader,
        poller: Poller,
        device_info: Mapping[str, str],
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ):
        super().__init__(
            port=port,
            usb_port=usb_port,
            hw_control_loop=hw_control_loop,
            execution_manager=execution_manager,
            disconnected_callback=disconnected_callback,
        )
        self._device_info = device_info
        self._driver = driver
        self._reader = reader
        self._poller = poller
        self._stacker_status = FlexStackerStatus.IDLE
        self._stall_detected = False

    async def cleanup(self) -> None:
        """Stop the poller task"""
        await self._poller.stop()
        await self._driver.disconnect()

    @classmethod
    def name(cls) -> str:
        """Used for picking up serial port symlinks"""
        return "flexstacker"

    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        return "flex-stacker"

    @staticmethod
    def _model_from_revision(revision: Optional[str]) -> str:
        """Defines the revision -> model mapping"""
        return "flexStackerModuleV1"

    def model(self) -> str:
        return self._model_from_revision(self._device_info.get("model"))

    @property
    def latch_state(self) -> LatchState:
        """The state of the latch."""
        return LatchState.from_state(self.limit_switch_status[StackerAxis.L])

    @property
    def platform_state(self) -> PlatformState:
        """The state of the platform."""
        return self._reader.platform_state

    @property
    def hopper_door_state(self) -> HopperDoorState:
        """The status of the hopper door."""
        return HopperDoorState.from_state(self._reader.hopper_door_closed)

    @property
    def limit_switch_status(self) -> Dict[StackerAxis, StackerAxisState]:
        """The status of the Limit switches."""
        return self._reader.limit_switch_status

    @property
    def device_info(self) -> Mapping[str, str]:
        return self._device_info

    @property
    def status(self) -> FlexStackerStatus:
        """Module status or error state details."""
        return self._stacker_status

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    @property
    def live_data(self) -> LiveData:
        data: FlexStackerData = {
            "latchState": self.latch_state.value,
            "platformState": self.platform_state.value,
            "hopperDoorState": self.hopper_door_state.value,
            "axisStateX": self.limit_switch_status[StackerAxis.X].value,
            "axisStateZ": self.limit_switch_status[StackerAxis.Z].value,
            "errorDetails": self._reader.error,
        }
        return {"status": self.status.value, "data": data}

    async def prep_for_update(self) -> str:
        await self._poller.stop()
        await self._driver.stop_motors()
        await self._driver.enter_programming_mode()
        # flex stacker has three unique "devices" over DFU
        dfu_info = await update.find_dfu_device(pid=DFU_PID, expected_device_count=3)
        return dfu_info

    def bootloader(self) -> UploadFunction:
        return update.upload_via_dfu

    async def deactivate(self, must_be_running: bool = True) -> None:
        await self._driver.stop_motors()

    async def reset_stall_detected(self) -> None:
        """Sets the statusbar to normal."""
        if self._stall_detected:
            await self.set_led_state(0.5, LEDColor.GREEN, LEDPattern.STATIC)
            self._stall_detected = False

    async def set_led_state(
        self,
        power: float,
        color: Optional[LEDColor] = None,
        pattern: Optional[LEDPattern] = None,
        duration: Optional[int] = None,
        reps: Optional[int] = None,
    ) -> bool:
        """Sets the statusbar state."""
        return await self._driver.set_led(
            power, color=color, pattern=pattern, duration=duration, reps=reps
        )

    async def move_axis(
        self,
        axis: StackerAxis,
        direction: Direction,
        distance: float,
        speed: Optional[float] = None,
        acceleration: Optional[float] = None,
        current: Optional[float] = None,
    ) -> bool:
        """Move the axis in a direction by the given distance in mm."""
        await self.reset_stall_detected()
        motion_params = STACKER_MOTION_CONFIG[axis]["move"]
        await self._driver.set_run_current(axis, current or motion_params.current or 0)
        if any([speed, acceleration, current]):
            motion_params = self._reader.motion_params[axis]
            motion_params.current = current or motion_params.current
            motion_params.max_speed = speed or motion_params.max_speed
            motion_params.acceleration = acceleration or motion_params.acceleration
        distance = direction.distance(distance)
        res = await self._driver.move_in_mm(axis, distance, params=motion_params)
        if res == MoveResult.STALL_ERROR:
            self._stall_detected = True
            raise FlexStackerStallError(self.device_info["serial"], axis)
        return res == MoveResult.NO_ERROR

    async def home_axis(
        self,
        axis: StackerAxis,
        direction: Direction,
        speed: Optional[float] = None,
        acceleration: Optional[float] = None,
        current: Optional[float] = None,
    ) -> bool:
        await self.reset_stall_detected()
        motion_params = STACKER_MOTION_CONFIG[axis]["home"]
        await self._driver.set_run_current(axis, current or motion_params.current or 0)
        # Set the max hold current for the Z axis
        if axis == StackerAxis.Z:
            await self._driver.set_ihold_current(axis, 1.8)
        if any([speed, acceleration]):
            motion_params.max_speed = speed or motion_params.max_speed
            motion_params.acceleration = acceleration or motion_params.acceleration
        success = await self._driver.move_to_limit_switch(
            axis=axis, direction=direction, params=motion_params
        )
        if success == MoveResult.STALL_ERROR:
            self._stall_detected = True
            raise FlexStackerStallError(self.device_info["serial"], axis)
        return success == MoveResult.NO_ERROR

    async def close_latch(
        self,
        velocity: Optional[float] = None,
        acceleration: Optional[float] = None,
    ) -> bool:
        """Close the latch, dropping any labware its holding."""
        # Dont move the latch if its already closed.
        if self.limit_switch_status[StackerAxis.L] == StackerAxisState.EXTENDED:
            return True
        motion_params = STACKER_MOTION_CONFIG[StackerAxis.L]["move"]
        speed = velocity or motion_params.max_speed
        accel = acceleration or motion_params.acceleration
        success = await self.home_axis(
            StackerAxis.L,
            Direction.RETRACT,
            speed=speed,
            acceleration=accel,
        )
        # Check that the latch is closed.
        await self._reader.get_limit_switch_status()
        return (
            success
            and self.limit_switch_status[StackerAxis.L] == StackerAxisState.EXTENDED
        )

    async def open_latch(
        self,
        velocity: Optional[float] = None,
        acceleration: Optional[float] = None,
    ) -> bool:
        """Open the latch."""
        # Dont move the latch if its already opened.
        if self.limit_switch_status[StackerAxis.L] == StackerAxisState.RETRACTED:
            return True
        motion_params = STACKER_MOTION_CONFIG[StackerAxis.L]["move"]
        speed = velocity or motion_params.max_speed
        accel = acceleration or motion_params.acceleration
        distance = MAX_TRAVEL[StackerAxis.L]
        # The latch only has one limit switch, so we have to travel a fixed distance
        # to open the latch.
        success = await self.move_axis(
            StackerAxis.L,
            Direction.EXTEND,
            distance=distance,
            speed=speed,
            acceleration=accel,
        )
        # Check that the latch is opened.
        await self._reader.get_limit_switch_status()
        axis_state = self.limit_switch_status[StackerAxis.L]
        return success and axis_state == StackerAxisState.RETRACTED

    async def dispense_labware(self, labware_height: float) -> bool:
        """Dispenses the next labware in the stacker."""
        await self._prepare_for_action()

        # Move platform along the X then Z axis
        await self._move_and_home_axis(StackerAxis.X, Direction.RETRACT, OFFSET_SM)
        await self._move_and_home_axis(StackerAxis.Z, Direction.EXTEND, OFFSET_SM)

        # Transfer
        await self.open_latch()
        await self.move_axis(StackerAxis.Z, Direction.RETRACT, (labware_height / 2) + 2)
        await self.close_latch()

        # Move platform along the Z then X axis
        offset = labware_height / 2 + OFFSET_MD
        await self._move_and_home_axis(StackerAxis.Z, Direction.RETRACT, offset)
        await self._move_and_home_axis(StackerAxis.X, Direction.EXTEND, OFFSET_SM)
        return True

    async def store_labware(self, labware_height: float) -> bool:
        """Stores a labware in the stacker."""
        await self._prepare_for_action()

        # Move X then Z axis
        offset = OFFSET_MD if labware_height < MEDIUM_LABWARE_Z_LIMIT else OFFSET_LG * 2
        distance = MAX_TRAVEL[StackerAxis.Z] - (labware_height / 2) - offset
        await self._move_and_home_axis(StackerAxis.X, Direction.RETRACT, OFFSET_SM)
        await self.move_axis(StackerAxis.Z, Direction.EXTEND, distance)

        # Transfer
        await self.open_latch()
        z_speed = (STACKER_MOTION_CONFIG[StackerAxis.Z]["move"].max_speed or 0) / 2
        await self.move_axis(
            StackerAxis.Z, Direction.EXTEND, (labware_height / 2), z_speed
        )
        await self.home_axis(StackerAxis.Z, Direction.EXTEND, z_speed)
        await self.close_latch()

        # Move Z then X axis
        await self._move_and_home_axis(StackerAxis.Z, Direction.RETRACT, OFFSET_LG)
        await self._move_and_home_axis(StackerAxis.X, Direction.EXTEND, OFFSET_SM)
        return True

    async def _move_and_home_axis(
        self, axis: StackerAxis, direction: Direction, offset: float = 0
    ) -> bool:
        distance = MAX_TRAVEL[axis] - offset
        await self.move_axis(axis, direction, distance)
        return await self.home_axis(axis, direction)

    async def _prepare_for_action(self) -> bool:
        """Helper to prepare axis for dispensing or storing labware."""
        # TODO: check if we need to home first
        await self.home_axis(StackerAxis.X, Direction.EXTEND)
        await self.home_axis(StackerAxis.Z, Direction.RETRACT)
        await self.close_latch()
        return True


class FlexStackerReader(Reader):
    error: Optional[str]

    def __init__(self, driver: AbstractFlexStackerDriver) -> None:
        self.error: Optional[str] = None
        self._driver = driver
        self.limit_switch_status = {
            axis: StackerAxisState.UNKNOWN for axis in StackerAxis
        }
        self.platform_state = PlatformState.UNKNOWN
        self.hopper_door_closed = False
        self.motion_params = {axis: MoveParams(axis=axis) for axis in StackerAxis}
        self.get_config = True

    async def read(self) -> None:
        await self.get_limit_switch_status()
        await self.get_platform_sensor_state()
        await self.get_door_closed()
        if self.get_config:
            await self.get_motion_parameters()
            self.get_config = False
        self._set_error(None)

    async def get_limit_switch_status(self) -> None:
        """Get the limit switch status."""
        status = await self._driver.get_limit_switches_status()
        self.limit_switch_status = {
            axis: StackerAxisState.from_status(status, axis) for axis in StackerAxis
        }

    async def get_motion_parameters(self) -> None:
        """Get the motion parameters used by the axis motors."""
        self.motion_params = {
            axis: await self._driver.get_motion_params(axis) for axis in StackerAxis
        }

    async def get_platform_sensor_state(self) -> None:
        """Get the platform state."""
        status = await self._driver.get_platform_status()
        self.platform_state = PlatformState.from_status(status)

    async def get_door_closed(self) -> None:
        """Check if the hopper door is closed."""
        self.hopper_door_closed = await self._driver.get_hopper_door_closed()

    def on_error(self, exception: Exception) -> None:
        self._driver.reset_serial_buffers()
        self._set_error(exception)

    def _set_error(self, exception: Optional[Exception]) -> None:
        if exception is None:
            self.error = None
        else:
            try:
                self.error = str(exception.args[0])
            except Exception:
                self.error = repr(exception)
