from __future__ import annotations

import asyncio
import logging
from typing import Optional, Mapping

from opentrons.drivers.rpi_drivers.types import USBPort
from opentrons.drivers.flex_stacker.driver import FlexStackerDriver
from opentrons.drivers.flex_stacker.abstract import AbstractFlexStackerDriver
from opentrons.drivers.flex_stacker.simulator import SimulatingDriver
from opentrons.hardware_control.execution_manager import ExecutionManager
from opentrons.hardware_control.poller import Reader, Poller
from opentrons.hardware_control.modules import mod_abc, update
from opentrons.hardware_control.modules.types import (
    ModuleDisconnectedCallback,
    ModuleType,
    UploadFunction,
    LiveData,
)

log = logging.getLogger(__name__)

POLL_PERIOD = 1.0
SIMULATING_POLL_PERIOD = POLL_PERIOD / 20.0

DFU_PID = "df11"


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
        return "flexStackerV1"

    def model(self) -> str:
        return self._model_from_revision(self._device_info.get("model"))

    def bootloader(self) -> UploadFunction:
        return update.upload_via_dfu

    @property
    def device_info(self) -> Mapping[str, str]:
        return self._device_info

    @property
    def live_data(self) -> LiveData:
        return {
            "status": self.status,
            "data": {
                "errorDetails": self._reader.error,
            },
        }

    @property
    def status(self) -> str:
        """Module status or error state details."""
        return "idle"

    @property
    def is_simulated(self) -> bool:
        return isinstance(self._driver, SimulatingDriver)

    async def prep_for_update(self) -> str:
        await self._poller.stop()
        await self._driver.enter_programming_mode()
        dfu_info = await update.find_dfu_device(pid=DFU_PID, expected_device_count=2)
        return dfu_info


class FlexStackerReader(Reader):
    error: Optional[str]

    def __init__(self, driver: AbstractFlexStackerDriver) -> None:
        self.error: Optional[str] = None
        self._driver = driver

    async def read(self) -> None:
        self._set_error(None)

    def on_error(self, exception: Exception) -> None:
        self._set_error(exception)

    def _set_error(self, exception: Optional[Exception]) -> None:
        if exception is None:
            self.error = None
        else:
            try:
                self.error = str(exception.args[0])
            except Exception:
                self.error = repr(exception)
