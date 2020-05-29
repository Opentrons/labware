import asyncio
from contextlib import contextmanager, ExitStack
import logging
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING
try:
    import aionotify  # type: ignore
except OSError:
    aionotify = None  # type: ignore

from opentrons.drivers.smoothie_drivers import driver_3_0
from opentrons.drivers.rpi_drivers import build_gpio_chardev
import opentrons.config
from opentrons.types import Mount

from . import modules
from .execution_manager import ExecutionManager
from .types import BoardRevision

if TYPE_CHECKING:
    from .dev_types import RegisterModules  # noqa (F501)
    from opentrons.drivers.rpi_drivers.dev_types\
        import GPIODriverLike  # noqa(F501)

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

        self._gpio_chardev = build_gpio_chardev('gpiochip0')
        self._board_revision = BoardRevision.UNKNOWN
        # We handle our own locks in the hardware controller thank you
        self._smoothie_driver = driver_3_0.SmoothieDriver_3_0_0(
            config=self.config, gpio_chardev=self._gpio_chardev,
            handle_locks=False)
        self._cached_fw_version: Optional[str] = None
        try:
            self._module_watcher = aionotify.Watcher()
            self._module_watcher.watch(
                alias='modules',
                path='/dev',
                flags=(aionotify.Flags.CREATE | aionotify.Flags.DELETE))
        except AttributeError:
            MODULE_LOG.warning(
                'Failed to initiate aionotify, cannot watch modules '
                'or door, likely because not running on linux')

    @property
    def gpio_chardev(self) -> 'GPIODriverLike':
        return self._gpio_chardev

    @property
    def board_revision(self) -> BoardRevision:
        return self._board_revision

    async def setup_gpio_chardev(self):
        self.gpio_chardev.config_by_board_rev()
        self._board_revision = self.gpio_chardev.board_rev
        await self.gpio_chardev.setup()

    def start_gpio_door_watcher(self, **kargs):
        self.gpio_chardev.start_door_switch_watcher(**kargs)

    def update_position(self) -> Dict[str, float]:
        self._smoothie_driver.update_position()
        return self._smoothie_driver.position

    def move(self, target_position: Dict[str, float],
             home_flagged_axes: bool = True, speed: float = None,
             axis_max_speeds: Dict[str, float] = None):
        with ExitStack() as cmstack:
            if axis_max_speeds:
                cmstack.enter_context(
                    self._smoothie_driver.restore_axis_max_speed(
                        axis_max_speeds))
            self._smoothie_driver.move(
                target_position, home_flagged_axes=home_flagged_axes,
                speed=speed)

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

    async def _handle_watch_event(self, register_modules: 'RegisterModules'):
        try:
            event = await self._module_watcher.get_event()
        except asyncio.IncompleteReadError:
            MODULE_LOG.debug("incomplete read error when quitting watcher")
            return
        flags = aionotify.Flags.parse(event.flags)
        if event is not None and 'ot_module' in event.name:
            maybe_module_at_port = modules.get_module_at_port(event.name)
            new_modules = None
            removed_modules = None
            if maybe_module_at_port is not None:
                if aionotify.Flags.DELETE in flags:
                    removed_modules = [maybe_module_at_port]
                    MODULE_LOG.info(
                        f'Module Removed: {maybe_module_at_port}')
                elif aionotify.Flags.CREATE in flags:
                    new_modules = [maybe_module_at_port]
                    MODULE_LOG.info(
                        f'Module Added: {maybe_module_at_port}')
                try:
                    await register_modules(
                        removed_mods_at_ports=removed_modules,
                        new_mods_at_ports=new_modules,
                    )
                except Exception:
                    MODULE_LOG.exception(
                        'Exception in Module registration')

    async def watch_modules(self, loop: asyncio.AbstractEventLoop,
                            register_modules: 'RegisterModules'):
        can_watch = aionotify is not None
        if can_watch:
            await self._module_watcher.setup(loop)

        initial_modules = modules.discover()
        try:
            await register_modules(new_mods_at_ports=initial_modules)
        except Exception:
            MODULE_LOG.exception('Exception in Module registration')
        while can_watch and (not self._module_watcher.closed):
            await self._handle_watch_event(register_modules)

    async def build_module(
            self,
            port: str,
            model: str,
            interrupt_callback: modules.InterruptCallback,
            loop: asyncio.AbstractEventLoop,
            execution_manager: ExecutionManager) -> modules.AbstractModule:
        return await modules.build(
            port=port,
            which=model,
            simulating=False,
            interrupt_callback=interrupt_callback,
            loop=loop,
            execution_manager=execution_manager)

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
                self.gpio_chardev.set_button_light(blue=button)
            if rails is not None:
                self.gpio_chardev.set_rail_lights(rails)

    def get_lights(self) -> Dict[str, bool]:
        if not opentrons.config.IS_ROBOT:
            return {}
        return {'button': self.gpio_chardev.get_button_light()[2],
                'rails': self.gpio_chardev.get_rail_lights()}

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

    def clean_up(self):
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            return
        if hasattr(self, '_module_watcher'):
            if loop.is_running() and self._module_watcher:
                self._module_watcher.close()
        if hasattr(self, 'gpio_chardev'):
            try:
                if not loop.is_closed():
                    self.gpio_chardev.stop_door_switch_watcher(loop)
            except RuntimeError:
                pass

    def __del__(self):
        self.clean_up()
