import asyncio
from contextlib import contextmanager, ExitStack
import logging
from typing import Any, Dict, List, Optional, Tuple
try:
    import aionotify
except OSError:
    pass

from opentrons.drivers.smoothie_drivers import driver_3_0
from opentrons.drivers.rpi_drivers import gpio
import opentrons.config
from opentrons.types import Mount

from . import modules

MODULE_LOG = logging.getLogger(__name__)


class Controller:
    """ The concrete instance of the controller for actually controlling
    hardware.
    """

    def __init__(self, config):
        """ Build a Controller instance.

        If another controller is already instantiated on the system (or if
        this is instantiated somewhere other than a robot) then this method
        will raise a RuntimeError.
        """
        if not opentrons.config.IS_ROBOT:
            MODULE_LOG.warning(
                'This is intended to run on a robot, and while it can connect '
                'to a smoothie via a usb/serial adapter unexpected things '
                'using gpios (such as smoothie reset or light management) '
                'will fail')

        self.config = config or opentrons.config.robot_configs.load()
        # We handle our own locks in the hardware controller thank you
        self._smoothie_driver = driver_3_0.SmoothieDriver_3_0_0(
            config=self.config, handle_locks=False)
        self._cached_fw_version: Optional[str] = None
        self._module_watcher = aionotify.Watcher()
        self._module_watcher.watch(alias='modules',
                                   path='/dev',
                                   flags=(aionotify.Flags.CREATE | aionotify.Flags.DELETE))

    def update_position(self) -> Dict[str, float]:
        self._smoothie_driver.update_position()
        return self._smoothie_driver.position

    def move(self, target_position: Dict[str, float],
             home_flagged_axes: bool = True, speed: float = None,
             axis_max_speeds: Dict[str, float] = None):
        with ExitStack() as cmstack:
            if speed:
                cmstack.enter_context(
                    self._smoothie_driver.restore_speed(speed))
            if axis_max_speeds:
                cmstack.enter_context(
                    self._smoothie_driver.restore_axis_max_speed(
                        axis_max_speeds))
            self._smoothie_driver.move(
                target_position, home_flagged_axes=home_flagged_axes)

    def home(self, axes: List[str] = None) -> Dict[str, float]:
        if axes:
            args: Tuple[Any, ...] = (''.join(axes),)
        else:
            args = tuple()
        return self._smoothie_driver.home(*args)

    def fast_home(self, axis: str, margin: float) -> Dict[str, float]:
        return self._smoothie_driver.fast_home(axis, margin)

    def get_attached_instruments(
            self, expected: Dict[Mount, str])\
            -> Dict[Mount, Dict[str, Optional[str]]]:
        """ Find the instruments attached to our mounts.
        :param expected: is ignored, it is just meant to enforce
                          the same interface as the simulator, where
                          required instruments can be manipulated.

        :returns: A dict with mounts as the top-level keys. Each mount value is
            a dict with keys 'model' (containing an instrument model name or
            `None`) and 'id' (containing the serial number of the pipette
            attached to that mount, or `None`).
        """
        to_return: Dict[Mount, Dict[str, Optional[str]]] = {}
        for mount in Mount:
            found_model = self._smoothie_driver.read_pipette_model(
                mount.name.lower())
            found_id = self._smoothie_driver.read_pipette_id(
                mount.name.lower())
            to_return[mount] = {
                'model': found_model,
                'id': found_id}
        return to_return

    def set_active_current(self, axis, amp):
        """
        This method sets only the 'active' current, i.e., the current for an
        axis' movement. Smoothie driver automatically resets the current for
        pipette axis to a low current (dwelling current) after each move
        """
        self._smoothie_driver.set_active_current({axis.name: amp})

    @contextmanager
    def save_current(self):
        self._smoothie_driver.push_active_current()
        try:
            yield
        finally:
            self._smoothie_driver.pop_active_current()

    def set_pipette_speed(self, val: float):
        self._smoothie_driver.set_speed(val)

    def get_attached_modules(self) -> List[modules.ModuleAtPort]:
        return modules.discover()

    async def watch_modules(self, loop: asyncio.AbstractEventLoop, update_attached_modules):
        await self._module_watcher.setup(loop)

        initial_modules = modules.discover()
        await update_attached_modules(new_modules=initial_modules)
        MODULE_LOG.info(f'\n\nINIT MODULES: {initial_modules}\n\n')
        while not self._module_watcher.closed:
            event = await self._module_watcher.get_event()
            flags = aionotify.Flags.parse(event.flags)
            if 'ot_module' in event.name:
                maybe_module_at_port = modules.get_module_at_port(event.name)
                if maybe_module_at_port is not None and aionotify.Flags.DELETE in flags:
                    await update_attached_modules(
                        removed_modules=[maybe_module_at_port])
                    MODULE_LOG.info(f'Module Removed: {maybe_module_at_port}')
                if maybe_module_at_port is not None and aionotify.Flags.CREATE in flags:
                    await update_attached_modules(new_modules=[maybe_module_at_port])
                    MODULE_LOG.info(f'Module Added: {maybe_module_at_port}')

    async def build_module(self,
                           port: str,
                           model: str,
                           interrupt_callback) -> modules.AbstractModule:
        MODULE_LOG.info(f'\n\nBUILD Module {port}{model}')
        return await modules.build(
            port=port,
            which=model,
            simulating=False,
            interrupt_callback=interrupt_callback)

    async def update_module(
            self,
            module: modules.AbstractModule,
            firmware_file: str,
            loop: Optional[asyncio.AbstractEventLoop])\
            -> modules.AbstractModule:
        return await modules.update_firmware(
            module, firmware_file, loop)

    async def connect(self, port: str = None):
        self._smoothie_driver.connect(port)
        await self.update_fw_version()

    @property
    def axis_bounds(self) -> Dict[str, Tuple[float, float]]:
        """ The (minimum, maximum) bounds for each axis. """
        return {ax: (0, pos + .05) for ax, pos
                in self._smoothie_driver.homed_position.items()
                if ax not in 'BC'}

    @property
    def fw_version(self) -> Optional[str]:
        return self._cached_fw_version

    async def update_fw_version(self):
        self._cached_fw_version = self._smoothie_driver.get_fw_version()

    async def update_firmware(self,
                              filename: str,
                              loop: asyncio.AbstractEventLoop,
                              modeset: bool) -> str:
        msg = await self._smoothie_driver.update_firmware(
            filename, loop, modeset)
        await self.update_fw_version()
        return msg

    def engaged_axes(self) -> Dict[str, bool]:
        return self._smoothie_driver.engaged_axes

    def disengage_axes(self, axes: List[str]):
        self._smoothie_driver.disengage_axis(''.join(axes))

    def set_lights(self, button: Optional[bool], rails: Optional[bool]):
        if opentrons.config.IS_ROBOT:
            if button is not None:
                gpio.set_button_light(blue=button)
            if rails is not None:
                gpio.set_rail_lights(rails)

    def get_lights(self) -> Dict[str, bool]:
        if not opentrons.config.IS_ROBOT:
            return {}
        return {'button': gpio.get_button_light()[2],
                'rails': gpio.get_rail_lights()}

    def pause(self):
        self._smoothie_driver.pause()

    def resume(self):
        self._smoothie_driver.resume()

    def halt(self):
        self._smoothie_driver.kill()

    def hard_halt(self):
        self._smoothie_driver.hard_halt()

    def probe(self, axis: str, distance: float) -> Dict[str, float]:
        """ Run a probe and return the new position dict
        """
        return self._smoothie_driver.probe_axis(axis, distance)

    async def delay(self, duration_s: int):
        """ Pause and sleep
        """
        self.pause()
        await asyncio.sleep(duration_s)
        self.resume()

    def __exit__(self, exc_type, exc_value, traceback):
        self._module_watcher.close()
