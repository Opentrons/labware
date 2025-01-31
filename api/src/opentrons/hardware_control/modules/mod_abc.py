import abc
import asyncio
import logging
import re
from typing import ClassVar, Mapping, Optional, TypeVar
from packaging.version import InvalidVersion, parse, Version
from opentrons.config import IS_ROBOT, ROBOT_FIRMWARE_DIR
from opentrons.drivers.rpi_drivers.types import USBPort

from ..execution_manager import ExecutionManager
from .types import (
    BundledFirmware,
    ModuleDisconnectedCallback,
    UploadFunction,
    LiveData,
    ModuleType,
)

mod_log = logging.getLogger(__name__)

TaskPayload = TypeVar("TaskPayload")


def parse_fw_version(version: str) -> Version:
    try:
        device_version = parse(version)
        # This is a patch for older versions of packaging - they would try and parse old
        # kidns of versions and return a LegacyVersion object. We can't check for that
        # explicitly because they removed it in modern versions of packaging.
        if not isinstance(device_version, Version):
            raise InvalidVersion()
    except InvalidVersion:
        device_version = parse("v0.0.0")
    return device_version


class AbstractModule(abc.ABC):
    """Defines the common methods of a module."""

    MODULE_TYPE: ClassVar[ModuleType]

    @classmethod
    @abc.abstractmethod
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
    ) -> "AbstractModule":
        """Modules should always be created using this factory.

        This lets the (perhaps blocking) work of connecting to and initializing
        a module be in a place that can be async.
        """

    def __init__(
        self,
        port: str,
        usb_port: USBPort,
        execution_manager: ExecutionManager,
        hw_control_loop: asyncio.AbstractEventLoop,
        disconnected_callback: ModuleDisconnectedCallback = None,
    ) -> None:
        self._port = port
        self._usb_port = usb_port
        self._loop = hw_control_loop
        self._execution_manager = execution_manager
        self._bundled_fw: Optional[BundledFirmware] = self.get_bundled_fw()
        self._disconnected_callback = disconnected_callback
        self._updating = False

    @staticmethod
    def sort_key(inst: "AbstractModule") -> int:
        usb_port = inst.usb_port

        primary_port = usb_port.port_number

        if usb_port.hub_port is not None:
            secondary_port = usb_port.hub_port
        else:
            secondary_port = 0

        return primary_port * 1000 + secondary_port

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        return self._loop

    @property
    def updating(self) -> bool:
        """The device is updating is True."""
        return self._updating

    def disconnected_callback(self) -> None:
        """Called from within the module object to signify the object is no longer connected"""
        if self._disconnected_callback is not None:
            self._disconnected_callback(self.port, self.serial_number)

    def get_bundled_fw(self) -> Optional[BundledFirmware]:
        """Get absolute path to bundled version of module fw if available."""
        if not IS_ROBOT:
            return None
        file_prefix = self.firmware_prefix()

        MODULE_FW_RE = re.compile(f"^{file_prefix}@v(.*)[.](hex|bin|byoup)$")
        for fw_resource in ROBOT_FIRMWARE_DIR.iterdir():  # type: ignore
            matches = MODULE_FW_RE.search(fw_resource.name)
            if matches:
                return BundledFirmware(version=matches.group(1), path=fw_resource)

        mod_log.info(f"no available fw file found for: {file_prefix}")
        return None

    def has_available_update(self) -> bool:
        """Return whether a newer firmware file is available"""
        if self.device_info and self._bundled_fw:
            device_version = parse_fw_version(self.device_info["version"])
            available_version = parse_fw_version(self._bundled_fw.version)
            return available_version > device_version
        return False

    async def wait_for_is_running(self) -> None:
        if not self.is_simulated:
            await self._execution_manager.wait_for_is_running()

    def make_cancellable(self, task: "asyncio.Task[TaskPayload]") -> None:
        self._execution_manager.register_cancellable_task(task)

    @abc.abstractmethod
    async def deactivate(self, must_be_running: bool = True) -> None:
        """Deactivate the module.

        Contains an override to the `wait_for_is_running` step in cases where the
        module must be deactivated regardless of context."""
        pass

    @property
    @abc.abstractmethod
    def status(self) -> str:
        """Return some string describing status."""
        pass

    @property
    @abc.abstractmethod
    def device_info(self) -> Mapping[str, str]:
        """Return a dict of the module's static information (serial, etc)"""
        pass

    @property
    @abc.abstractmethod
    def live_data(self) -> LiveData:
        """Return a dict of the module's dynamic information"""
        pass

    @property
    @abc.abstractmethod
    def is_simulated(self) -> bool:
        """True if >this is a simulated module."""
        pass

    @property
    def port(self) -> str:
        """The virtual port where the module is connected."""
        return self._port

    @property
    def usb_port(self) -> USBPort:
        """The physical port where the module is connected."""
        return self._usb_port

    @property
    def serial_number(self) -> Optional[str]:
        """The usb serial number of this device."""
        return self.device_info.get("serial")

    @abc.abstractmethod
    async def prep_for_update(self) -> str:
        """Prepare for an update.

        By the time this coroutine completes, the hardware should be ready
        to take an update. This implicitly tears down the module instance;
        it does not need to be either working or recoverable after this
        coroutine completes.

        :returns str: The port we're running on.
        """
        pass

    @property
    def bundled_fw(self) -> Optional[BundledFirmware]:
        return self._bundled_fw

    @abc.abstractmethod
    def model(self) -> str:
        """A name for this specific module, matching module defs"""
        pass

    @classmethod
    @abc.abstractmethod
    def name(cls) -> str:
        """A shortname used for matching usb ports, among other things"""
        pass

    @abc.abstractmethod
    def firmware_prefix(self) -> str:
        """The prefix used for looking up firmware"""
        pass

    @abc.abstractmethod
    def bootloader(self) -> UploadFunction:
        """Method used to upload file to this module's bootloader."""
        pass

    async def cleanup(self) -> None:
        """Clean up the module instance.

        Clean up, i.e. stop pollers, disconnect serial, etc in preparation for
        object destruction.
        """
        pass
