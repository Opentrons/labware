import asyncio
import contextlib
from dataclasses import replace
from functools import partial
import logging
import pathlib
from collections import OrderedDict
from typing import (
    Callable,
    Dict,
    Union,
    List,
    Optional,
    Tuple,
    Sequence,
    Set,
    Any,
    TypeVar,
    Mapping,
    cast,
)

from opentrons_shared_data.errors.exceptions import (
    PositionUnknownError,
    UnsupportedHardwareCommand,
)
from opentrons_shared_data.pipette import (
    pipette_load_name_conversions as pipette_load_name,
)
from opentrons_shared_data.pipette.types import PipetteName
from opentrons_shared_data.robot.types import RobotType
from opentrons import types as top_types
from opentrons.config import robot_configs
from opentrons.config.types import RobotConfig, OT3Config
from opentrons.drivers.rpi_drivers.types import USBPort, PortGroup

from .util import use_or_initialize_loop, check_motion_bounds, ot2_axis_to_string
from .instruments.ot2.pipette import (
    generate_hardware_configs,
    load_from_config_and_check_skip,
)
from .backends import Controller, Simulator
from .execution_manager import ExecutionManagerProvider
from .pause_manager import PauseManager
from .module_control import AttachedModulesControl
from .types import (
    Axis,
    CriticalPoint,
    DoorState,
    DoorStateNotification,
    ErrorMessageNotification,
    HardwareEventHandler,
    HardwareAction,
    MotionChecks,
    PauseType,
    StatusBarState,
    EstopState,
    SubSystem,
    SubSystemState,
    HardwareFeatureFlags,
)
from . import modules
from .robot_calibration import (
    RobotCalibrationProvider,
    RobotCalibration,
)
from .protocols import HardwareControlInterface
from .instruments.ot2.pipette_handler import PipetteHandlerProvider
from .instruments.ot2.instrument_calibration import load_pipette_offset
from .motion_utilities import (
    target_position_from_absolute,
    target_position_from_relative,
    target_position_from_plunger,
    deck_from_machine,
    machine_from_deck,
)


mod_log = logging.getLogger(__name__)

AttachedModuleSpec = Dict[str, List[Union[str, Tuple[str, str]]]]


class API(
    ExecutionManagerProvider,
    RobotCalibrationProvider,
    PipetteHandlerProvider[top_types.Mount],
    # This MUST be kept last in the inheritance list so that it is
    # deprioritized in the method resolution order; otherwise, invocations
    # of methods that are present in the protocol will call the (empty,
    # do-nothing) methods in the protocol. This will happily make all the
    # tests fail.
    HardwareControlInterface[RobotCalibration, top_types.Mount, RobotConfig],
):
    """This API is the primary interface to the hardware controller.

    Because the hardware manager controls access to the system's hardware
    as a whole, it is designed as a class of which only one should be
    instantiated at a time. This class's methods should be the only method
    of external access to the hardware. Each method may be minimal - it may
    only delegate the call to another submodule of the hardware manager -
    but its purpose is to be gathered here to provide a single interface.

    This implements the protocols in opentrons.hardware_control.protocols,
    and longer method docstrings may be found there. Docstrings for the
    methods in this class only note where their behavior is different or
    extended from that described in the protocol.
    """

    CLS_LOG = mod_log.getChild("API")

    def __init__(
        self,
        backend: Union[Controller, Simulator],
        loop: asyncio.AbstractEventLoop,
        config: RobotConfig,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> None:
        """Initialize an API instance.

        This should rarely be explicitly invoked by an external user; instead,
        one of the factory methods build_hardware_controller or
        build_hardware_simulator should be used.
        """
        self._log = self.CLS_LOG.getChild(str(id(self)))
        self._config = config
        self._backend = backend
        self._loop = loop
        # If no feature flag set is defined, we will use the default values
        self._feature_flags = feature_flags or HardwareFeatureFlags()

        self._callbacks: Set[HardwareEventHandler] = set()
        # {'X': 0.0, 'Y': 0.0, 'Z': 0.0, 'A': 0.0, 'B': 0.0, 'C': 0.0}
        self._current_position: Dict[Axis, float] = {}

        self._last_moved_mount: Optional[top_types.Mount] = None
        # The motion lock synchronizes calls to long-running physical tasks
        # involved in motion. This fixes issue where for instance a move()
        # or home() call is in flight and something else calls
        # current_position(), which will not be updated until the move() or
        # home() call succeeds or fails.
        self._motion_lock = asyncio.Lock()
        self._door_state = DoorState.CLOSED
        self._pause_manager = PauseManager()
        ExecutionManagerProvider.__init__(self, isinstance(backend, Simulator))
        RobotCalibrationProvider.__init__(self)
        PipetteHandlerProvider.__init__(
            self, {top_types.Mount.LEFT: None, top_types.Mount.RIGHT: None}
        )

    @property
    def door_state(self) -> DoorState:
        return self._door_state

    @door_state.setter
    def door_state(self, door_state: DoorState) -> None:
        self._door_state = door_state

    def _update_door_state(self, door_state: DoorState) -> None:
        mod_log.info(f"Updating the window switch status: {door_state}")
        self.door_state = door_state
        for cb in self._callbacks:
            hw_event = DoorStateNotification(new_state=door_state)
            try:
                cb(hw_event)
            except Exception:
                mod_log.exception("Errored during door state event callback")

    def _reset_last_mount(self) -> None:
        self._last_moved_mount = None

    def get_deck_from_machine(
        self, machine_pos: Dict[Axis, float]
    ) -> Dict[Axis, float]:
        return deck_from_machine(
            machine_pos=machine_pos,
            attitude=self._robot_calibration.deck_calibration.attitude,
            offset=top_types.Point(0, 0, 0),
            robot_type=cast(RobotType, "OT-2 Standard"),
        )

    @classmethod
    async def build_hardware_controller(  # noqa: C901
        cls,
        config: Union[RobotConfig, OT3Config, None] = None,
        port: Optional[str] = None,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        firmware: Optional[Tuple[pathlib.Path, str]] = None,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> "API":
        """Build a hardware controller that will actually talk to hardware.

        This method should not be used outside of a real robot, and on a
        real robot only one true hardware controller may be active at one
        time.

        :param config: A config to preload. If not specified, load the default.
        :param port: A port to connect to. If not specified, the default port
                     (found by scanning for connected FT232Rs).
        :param loop: An event loop to use. If not specified, use the result of
                     :py:meth:`asyncio.get_event_loop`.
        """
        checked_loop = use_or_initialize_loop(loop)
        if isinstance(config, RobotConfig):
            checked_config = config
        else:
            checked_config = robot_configs.load_ot2()
        backend = await Controller.build(checked_config)
        backend.set_lights(button=None, rails=False)

        async def blink() -> None:
            while True:
                backend.set_lights(button=True, rails=None)
                await asyncio.sleep(0.5)
                backend.set_lights(button=False, rails=None)
                await asyncio.sleep(0.5)

        blink_task = checked_loop.create_task(blink())
        try:
            try:
                await backend.connect(port)
                fw_version = backend.fw_version
            except Exception:
                mod_log.exception(
                    "Motor driver could not connect, reprogramming if possible"
                )
                fw_version = None

            if firmware is not None:
                if fw_version != firmware[1]:
                    await backend.update_firmware(str(firmware[0]), checked_loop, True)
                    await backend.connect(port)
            elif firmware is None and fw_version is None:
                msg = (
                    "Motor controller could not be connected and no "
                    "firmware was provided for (re)programming"
                )
                mod_log.error(msg)
                raise RuntimeError(msg)

            api_instance = cls(
                backend,
                loop=checked_loop,
                config=checked_config,
                feature_flags=feature_flags,
            )
            await api_instance.cache_instruments()
            module_controls = await AttachedModulesControl.build(
                api_instance, board_revision=backend.board_revision
            )
            backend.module_controls = module_controls
            checked_loop.create_task(backend.watch(loop=checked_loop))
            backend.start_gpio_door_watcher(
                loop=checked_loop, update_door_state=api_instance._update_door_state
            )
            return api_instance
        finally:
            blink_task.cancel()
            try:
                await blink_task
            except asyncio.CancelledError:
                pass

    @classmethod
    async def build_hardware_simulator(
        cls,
        attached_instruments: Optional[
            Dict[top_types.Mount, Dict[str, Optional[str]]]
        ] = None,
        attached_modules: Optional[Dict[str, List[modules.SimulatingModule]]] = None,
        config: Optional[Union[RobotConfig, OT3Config]] = None,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        strict_attached_instruments: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> "API":
        """Build a simulating hardware controller.

        This method may be used both on a real robot and on dev machines.
        Multiple simulating hardware controllers may be active at one time.
        """

        if None is attached_instruments:
            attached_instruments = {}

        if None is attached_modules:
            attached_modules = {}

        checked_loop = use_or_initialize_loop(loop)
        if isinstance(config, RobotConfig):
            checked_config = config
        else:
            checked_config = robot_configs.load_ot2()
        backend = await Simulator.build(
            attached_instruments,
            attached_modules,
            checked_config,
            checked_loop,
            strict_attached_instruments,
        )
        api_instance = cls(
            backend,
            loop=checked_loop,
            config=checked_config,
            feature_flags=feature_flags,
        )
        await api_instance.cache_instruments()
        module_controls = await AttachedModulesControl.build(
            api_instance, board_revision=backend.board_revision
        )
        backend.module_controls = module_controls
        await backend.watch()
        return api_instance

    def __repr__(self) -> str:
        return "<{} using backend {}>".format(type(self), type(self._backend))

    async def get_serial_number(self) -> Optional[str]:
        return await self._backend.get_serial_number()

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        """The event loop used by this instance."""
        return self._loop

    @property
    def is_simulator(self) -> bool:
        """`True` if this is a simulator; `False` otherwise."""
        return isinstance(self._backend, Simulator)

    def register_callback(self, cb: HardwareEventHandler) -> Callable[[], None]:
        """Allows the caller to register a callback, and returns a closure
        that can be used to unregister the provided callback
        """
        self._callbacks.add(cb)

        def unregister() -> None:
            self._callbacks.remove(cb)

        return unregister

    def get_fw_version(self) -> str:
        """
        Return the firmware version of the connected motor control board.

        The version is a string retrieved directly from the attached hardware
        (or possibly simulator).
        """
        from_backend = self._backend.fw_version
        if from_backend is None:
            return "unknown"
        else:
            return from_backend

    @property
    def fw_version(self) -> str:
        return self.get_fw_version()

    @property
    def board_revision(self) -> str:
        return str(self._backend.board_revision)

    @property
    def attached_subsystems(self) -> Dict[SubSystem, SubSystemState]:
        return {}

    # Incidentals (i.e. not motion) API

    async def set_lights(
        self, button: Optional[bool] = None, rails: Optional[bool] = None
    ) -> None:
        """Control the robot lights."""
        self._backend.set_lights(button, rails)

    async def get_lights(self) -> Dict[str, bool]:
        """Return the current status of the robot lights.

        :returns: A dict of the lights: `{'button': bool, 'rails': bool}`
        """
        return self._backend.get_lights()

    async def identify(self, duration_s: int = 5) -> None:
        """Blink the button light to identify the robot."""
        count = duration_s * 4
        on = False
        for sec in range(count):
            then = self._loop.time()
            await self.set_lights(button=on)
            on = not on
            now = self._loop.time()
            await asyncio.sleep(max(0, 0.25 - (now - then)))
        await self.set_lights(button=True)

    async def set_status_bar_state(self, state: StatusBarState) -> None:
        """The status bar does not exist on OT-2!"""
        return None

    async def set_status_bar_enabled(self, enabled: bool) -> None:
        """The status bar does not exist on OT-2!"""
        return None

    def get_status_bar_state(self) -> StatusBarState:
        """There is no status bar on OT-2, return IDLE at all times."""
        return StatusBarState.IDLE

    @ExecutionManagerProvider.wait_for_running
    async def delay(self, duration_s: float) -> None:
        """Delay execution by pausing and sleeping."""
        self.pause(PauseType.DELAY)
        try:
            await self.do_delay(duration_s)
        finally:
            self.resume(PauseType.DELAY)

    @property
    def attached_modules(self) -> List[modules.AbstractModule]:
        return self._backend.module_controls.available_modules

    async def update_firmware(
        self,
        firmware_file: str,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        explicit_modeset: bool = True,
    ) -> str:
        """Update the firmware on the motor controller board.

        :param firmware_file: The path to the firmware file.
        :param explicit_modeset: `True` to force the smoothie into programming
                                 mode; `False` to assume it is already in
                                 programming mode.
        :param loop: An asyncio event loop to use; if not specified, the one
                     associated with this instance will be used.
        :returns: The stdout of the tool used to update the smoothie
        """
        if None is loop:
            checked_loop = self._loop
        else:
            checked_loop = loop
        return await self._backend.update_firmware(
            firmware_file, checked_loop, explicit_modeset
        )

    def has_gripper(self) -> bool:
        return False

    async def cache_instruments(
        self,
        require: Optional[Dict[top_types.Mount, PipetteName]] = None,
        skip_if_would_block: bool = False,
    ) -> None:
        """
        Scan the attached instruments, take necessary configuration actions,
        and set up hardware controller internal state if necessary.
        """
        self._log.info("Updating instrument model cache")
        checked_require = require or {}
        for mount, name in checked_require.items():
            if not pipette_load_name.supported_pipette(name):
                raise RuntimeError(f"{name} is not a valid pipette name")
        async with self._motion_lock:
            found = await self._backend.get_attached_instruments(checked_require)
        for mount, instrument_data in found.items():
            config = instrument_data.get("config")
            req_instr = checked_require.get(mount, None)
            pip_id = instrument_data.get("id")
            pip_offset_cal = load_pipette_offset(pip_id, mount)
            p, may_skip = load_from_config_and_check_skip(
                config,
                self._attached_instruments[mount],
                req_instr,
                pip_id,
                pip_offset_cal,
                self._feature_flags.use_old_aspiration_functions,
            )
            self._attached_instruments[mount] = p
            if req_instr and p:
                converted_name = pipette_load_name.convert_to_pipette_name_type(
                    req_instr
                )
                p.act_as(converted_name)

            if may_skip:
                self._log.info(f"Skipping configuration on {mount.name}")
                continue

            self._log.info(f"Doing full configuration on {mount.name}")
            hw_config = generate_hardware_configs(
                p, self._config, self._backend.board_revision
            )
            await self._backend.configure_mount(mount, hw_config)
        self._log.info("Instruments found: {}".format(self._attached_instruments))

    # Global actions API
    def pause(self, pause_type: PauseType) -> None:
        """
        Pause motion of the robot after a current motion concludes.
        """
        self._pause_manager.pause(pause_type)

        async def _chained_calls() -> None:
            await self._execution_manager.pause()
            self._backend.pause()

        asyncio.run_coroutine_threadsafe(_chained_calls(), self._loop)

    def pause_with_message(self, message: str) -> None:
        """As pause, but providing a message to registered callbacks."""
        self._log.warning(f"Pause with message: {message}")
        notification = ErrorMessageNotification(message=message)
        for cb in self._callbacks:
            cb(notification)
        self.pause(PauseType.PAUSE)

    def resume(self, pause_type: PauseType) -> None:
        """Resume motion after a call to pause."""
        self._pause_manager.resume(pause_type)

        if self._pause_manager.should_pause:
            return

        # Resume must be called immediately to awaken thread running hardware
        #  methods (ThreadManager)
        self._backend.resume()

        async def _chained_calls() -> None:
            # mirror what happens API.pause.
            await self._execution_manager.resume()
            self._backend.resume()

        asyncio.run_coroutine_threadsafe(_chained_calls(), self._loop)

    async def halt(self, disengage_before_stopping: bool = False) -> None:
        """Immediately stop motion, cancel execution manager and cancel running tasks.

        After this call, the smoothie will be in a bad state until a call to
        :py:meth:`stop`.
        """
        if disengage_before_stopping:
            await self._backend.hard_halt()
        await self._backend.halt()

    async def stop(self, home_after: bool = True) -> None:
        """
        Stop motion as soon as possible, reset, and optionally home.

        This will cancel motion (after the current call to :py:meth:`move`;
        see :py:meth:`pause` for more detail), then home and reset the
        robot. After this call, no further recovery is necessary.
        """
        await self._backend.halt()  # calls smoothie_driver.kill()
        await self.cancel_execution_and_running_tasks()
        self._log.info("Recovering from halt")
        await self.reset()
        await self.cache_instruments()

        if home_after:
            await self.home()

    def is_movement_execution_taskified(self) -> bool:
        return self.taskify_movement_execution

    def should_taskify_movement_execution(self, taskify: bool) -> None:
        self.taskify_movement_execution = taskify

    async def cancel_execution_and_running_tasks(self) -> None:
        await self._execution_manager.cancel()

    async def reset(self) -> None:
        """Reset the stored state of the system."""
        self._pause_manager.reset()
        await self._execution_manager.reset()
        await PipetteHandlerProvider.reset(self)

    # Gantry/frame (i.e. not pipette) action API
    async def home_z(
        self,
        mount: Optional[top_types.Mount] = None,
        allow_home_other: bool = True,
    ) -> None:
        """Home the Z-stage(s) of the instrument mounts.

        If given a mount, will try to only home that mount.
        However, if the other mount is currently extended,
        both mounts will be homed, unless `allow_home_other`
        is explicitly set to `False`.

        Setting `allow_home_other` to `False` is a bad idea,
        but the option exists for strict backwards compatibility.
        """
        if mount is not None and (
            self._last_moved_mount in [mount, None] or allow_home_other is False
        ):
            axes = [Axis.by_mount(mount)]
        else:
            axes = [Axis.Z, Axis.A]

        await self.home(axes)

    async def _do_plunger_home(
        self,
        axis: Optional[Axis] = None,
        mount: Optional[top_types.Mount] = None,
        acquire_lock: bool = True,
    ) -> None:
        assert (axis is not None) ^ (mount is not None), "specify either axis or mount"
        if axis:
            checked_axis = axis
            checked_mount = Axis.to_ot2_mount(checked_axis)
        if mount:
            checked_mount = mount
            checked_axis = Axis.of_plunger(checked_mount)
        instr = self.hardware_instruments[checked_mount]
        if not instr:
            return
        async with contextlib.AsyncExitStack() as stack:
            if acquire_lock:
                await stack.enter_async_context(self._motion_lock)
            with self._backend.save_current():
                self._backend.set_active_current(
                    {checked_axis: instr.plunger_motor_current.run}
                )
                await self._backend.home([ot2_axis_to_string(checked_axis)])
                # either we were passed False for our acquire_lock and we
                # should pass it on, or we acquired the lock above and
                # shouldn't do it again
                target_pos = target_position_from_plunger(
                    checked_mount,
                    instr.plunger_positions.bottom,
                    self._current_position,
                )
                await self._move(
                    target_pos,
                    acquire_lock=False,
                    home_flagged_axes=False,
                )

    @ExecutionManagerProvider.wait_for_running
    async def home_plunger(self, mount: top_types.Mount) -> None:
        """
        Home the plunger motor for a mount, and then return it to the 'bottom'
        position.
        """
        await self.current_position(mount=mount, refresh=True)
        await self._do_plunger_home(mount=mount, acquire_lock=True)

    @ExecutionManagerProvider.wait_for_running
    async def home(self, axes: Optional[List[Axis]] = None) -> None:
        """Home the entire robot and initialize current position."""
        # Should we assert/ raise an error or just remove non-ot2 axes and log warning?
        # No internal code passes OT3 axes as arguments on an OT2. But a user/ client
        # can still explicitly specify an OT3 axis even when working on an OT2.
        # Adding this check in order to prevent misuse of axes types.
        if axes:
            unsupported = list(axis not in Axis.ot2_axes() for axis in axes)
            if any(unsupported):
                raise UnsupportedHardwareCommand(
                    message=f"At least one axis in {axes} is not supported on the OT2.",
                    detail={"unsupported_axes": str(unsupported)},
                )
        self._reset_last_mount()
        # Initialize/update current_position
        checked_axes = axes or [ax for ax in Axis.ot2_axes()]
        gantry = [ax for ax in checked_axes if ax in Axis.gantry_axes()]
        smoothie_gantry = [ot2_axis_to_string(ax) for ax in gantry]
        smoothie_pos = {}
        plungers = [ax for ax in checked_axes if ax not in Axis.gantry_axes()]

        async with self._motion_lock:
            if smoothie_gantry:
                smoothie_pos.update(await self._backend.home(smoothie_gantry))
                self._current_position = self.get_deck_from_machine(
                    self._axis_map_from_string_map(smoothie_pos)
                )
            for plunger in plungers:
                await self._do_plunger_home(axis=plunger, acquire_lock=False)

    async def current_position(
        self,
        mount: top_types.Mount,
        critical_point: Optional[CriticalPoint] = None,
        refresh: bool = False,
        # TODO(mc, 2021-11-15): combine with `refresh` for more reliable
        # position reporting when motors are not homed
        fail_on_not_homed: bool = False,
    ) -> Dict[Axis, float]:
        """Return the postion (in deck coords) of the critical point of the
        specified mount.
        """
        z_ax = Axis.by_mount(mount)
        plunger_ax = Axis.of_plunger(mount)
        position_axes = [Axis.X, Axis.Y, z_ax, plunger_ax]

        if fail_on_not_homed:
            if not self._current_position:
                raise PositionUnknownError(
                    message=f"Current position of {str(mount)} pipette is unknown,"
                    " please home.",
                    detail={"mount": str(mount), "missing_axes": str(position_axes)},
                )
            axes_str = [ot2_axis_to_string(a) for a in position_axes]
            if not self._backend.is_homed(axes_str):
                unhomed = self._backend._unhomed_axes(axes_str)
                raise PositionUnknownError(
                    message=f"{str(mount)} pipette axes ({unhomed}) must be homed.",
                    detail={"mount": str(mount), "unhomed_axes": str(unhomed)},
                )
        elif not self._current_position and not refresh:
            raise PositionUnknownError(
                message="Current position is unknown; please home motors."
            )
        async with self._motion_lock:
            if refresh:
                smoothie_pos = await self._backend.update_position()
                self._current_position = self.get_deck_from_machine(
                    self._axis_map_from_string_map(smoothie_pos)
                )
            if mount == top_types.Mount.RIGHT:
                offset = top_types.Point(0, 0, 0)
            else:
                offset = top_types.Point(*self._config.left_mount_offset)

            cp = self.critical_point_for(mount, critical_point)
            return {
                Axis.X: self._current_position[Axis.X] + offset[0] + cp.x,
                Axis.Y: self._current_position[Axis.Y] + offset[1] + cp.y,
                z_ax: self._current_position[z_ax] + offset[2] + cp.z,
                plunger_ax: self._current_position[plunger_ax],
            }

    async def gantry_position(
        self,
        mount: top_types.Mount,
        critical_point: Optional[CriticalPoint] = None,
        refresh: bool = False,
        # TODO(mc, 2021-11-15): combine with `refresh` for more reliable
        # position reporting when motors are not homed
        fail_on_not_homed: bool = False,
    ) -> top_types.Point:
        """Return the position of the critical point for only gantry axes."""
        cur_pos = await self.current_position(
            mount,
            critical_point,
            refresh,
            fail_on_not_homed,
        )
        return top_types.Point(
            x=cur_pos[Axis.X], y=cur_pos[Axis.Y], z=cur_pos[Axis.by_mount(mount)]
        )

    # TODO(mc, 2022-05-13): return resulting gantry position
    async def move_to(
        self,
        mount: top_types.Mount,
        abs_position: top_types.Point,
        speed: Optional[float] = None,
        critical_point: Optional[CriticalPoint] = None,
        max_speeds: Optional[Dict[Axis, float]] = None,
    ) -> None:
        """
        Move the critical point of the specified mount to a location
        relative to the deck, at the specified speed.
        """
        if not self._current_position:
            await self.home()

        target_position = target_position_from_absolute(
            mount,
            abs_position,
            partial(self.critical_point_for, cp_override=critical_point),
            top_types.Point(*self._config.left_mount_offset),
            top_types.Point(0, 0, 0),
        )

        await self.prepare_for_mount_movement(mount)
        await self._move(target_position, speed=speed, max_speeds=max_speeds)

    async def move_axes(
        self,
        position: Mapping[Axis, float],
        speed: Optional[float] = None,
        max_speeds: Optional[Dict[Axis, float]] = None,
        expect_stalls: bool = False,
    ) -> None:
        """Moves the effectors of the specified axis to the specified position.
        The effector of the x,y axis is the center of the carriage.
        The effector of the pipette mount axis are the mount critical points but only in z.
        """
        raise UnsupportedHardwareCommand(
            message="move_axes is not supported on the OT-2.",
            detail={"axes_commanded": str(list(position.keys()))},
        )

    async def move_rel(
        self,
        mount: top_types.Mount,
        delta: top_types.Point,
        speed: Optional[float] = None,
        max_speeds: Optional[Dict[Axis, float]] = None,
        check_bounds: MotionChecks = MotionChecks.NONE,
        fail_on_not_homed: bool = False,
    ) -> None:
        """Move the critical point of the specified mount by a specified
        displacement in a specified direction, at the specified speed.
        """

        # TODO: Remove the fail_on_not_homed and make this the behavior all the time.
        # Having the optional arg makes the bug stick around in existing code and we
        # really want to fix it when we're not gearing up for a release.
        if not self._current_position:
            if fail_on_not_homed:
                raise PositionUnknownError(
                    message="Cannot make a relative move because absolute position"
                    " is unknown.",
                    detail={
                        "mount": str(mount),
                        "fail_on_not_homed": str(fail_on_not_homed),
                    },
                )
            else:
                await self.home()

        target_position = target_position_from_relative(
            mount, delta, self._current_position
        )

        axes_moving = [Axis.X, Axis.Y, Axis.by_mount(mount)]
        axes_str = [ot2_axis_to_string(a) for a in axes_moving]
        if fail_on_not_homed and not self._backend.is_homed(axes_str):
            unhomed = self._backend._unhomed_axes(axes_str)
            raise PositionUnknownError(
                message=f"{str(mount)} pipette axes ({unhomed}) must be homed.",
                detail={"mount": str(mount), "unhomed_axes": str(unhomed)},
            )

        await self.prepare_for_mount_movement(mount)
        await self._move(
            target_position,
            speed=speed,
            max_speeds=max_speeds,
            check_bounds=check_bounds,
        )

    async def _cache_and_maybe_retract_mount(self, mount: top_types.Mount) -> None:
        """Retract the 'other' mount if necessary

        If `mount` does not match the value in :py:attr:`_last_moved_mount`
        (and :py:attr:`_last_moved_mount` exists) then retract the mount
        in :py:attr:`_last_moved_mount`. Also unconditionally update
        :py:attr:`_last_moved_mount` to contain `mount`.
        """
        if mount != self._last_moved_mount and self._last_moved_mount:
            await self.retract(self._last_moved_mount, 10)
        self._last_moved_mount = mount

    async def prepare_for_mount_movement(self, mount: top_types.Mount) -> None:
        await self._cache_and_maybe_retract_mount(mount)

    @ExecutionManagerProvider.wait_for_running
    async def _move(
        self,
        target_position: "OrderedDict[Axis, float]",
        speed: Optional[float] = None,
        home_flagged_axes: bool = True,
        max_speeds: Optional[Dict[Axis, float]] = None,
        acquire_lock: bool = True,
        check_bounds: MotionChecks = MotionChecks.NONE,
    ) -> None:
        """Worker function to apply robot motion.

        Robot motion means the kind of motions that are relevant to the robot,
        i.e. only one pipette plunger and mount move at the same time, and an
        XYZ move in the coordinate frame of one of the pipettes.

        ``target_position`` should be an ordered dict (ordered by XYZABC)
        of deck calibrated values, containing any specified XY motion and
        at most one of a ZA or BC components. The frame in which to move
        is identified by the presence of (ZA) or (BC).
        """
        machine_pos = self._string_map_from_axis_map(
            machine_from_deck(
                deck_pos=target_position,
                attitude=self._robot_calibration.deck_calibration.attitude,
                offset=top_types.Point(0, 0, 0),
                robot_type=cast(RobotType, "OT-2 Standard"),
            )
        )

        bounds = self._backend.axis_bounds
        to_check = {
            ax: machine_pos[ot2_axis_to_string(ax)]
            for idx, ax in enumerate(target_position.keys())
            if ax in Axis.gantry_axes()
        }

        check_motion_bounds(to_check, target_position, bounds, check_bounds)
        checked_maxes = max_speeds or {}
        str_maxes = {ot2_axis_to_string(ax): val for ax, val in checked_maxes.items()}
        async with contextlib.AsyncExitStack() as stack:
            if acquire_lock:
                await stack.enter_async_context(self._motion_lock)
            try:
                await self._backend.move(
                    machine_pos,
                    speed=speed,
                    home_flagged_axes=home_flagged_axes,
                    axis_max_speeds=str_maxes,
                )
            except Exception:
                self._log.exception("Move failed")
                self._current_position.clear()
                raise
            else:
                self._current_position.update(target_position)

    def get_engaged_axes(self) -> Dict[Axis, bool]:
        """Which axes are engaged and holding."""
        return {Axis[ax]: eng for ax, eng in self._backend.engaged_axes().items()}

    @property
    def engaged_axes(self) -> Dict[Axis, bool]:
        return self.get_engaged_axes()

    async def disengage_axes(self, which: List[Axis]) -> None:
        await self._backend.disengage_axes([ot2_axis_to_string(ax) for ax in which])

    def axis_is_present(self, axis: Axis) -> bool:
        is_ot2 = axis in Axis.ot2_axes()
        if not is_ot2:
            return False
        if axis in Axis.pipette_axes():
            mount = Axis.to_ot2_mount(axis)
            if self.attached_pipettes.get(mount) is None:
                return False
        return True

    @ExecutionManagerProvider.wait_for_running
    async def _fast_home(self, axes: Sequence[str], margin: float) -> Dict[str, float]:
        converted_axes = "".join(axes)
        return await self._backend.fast_home(converted_axes, margin)

    async def retract(self, mount: top_types.Mount, margin: float = 10) -> None:
        """Pull the specified mount up to its home position.

        Works regardless of critical point or home status.
        """
        await self.retract_axis(Axis.by_mount(mount), margin)

    async def retract_axis(self, axis: Axis, margin: float = 10) -> None:
        """Pull the specified axis up to its home position.

        Works regardless of critical point or home status.
        """
        smoothie_ax = (ot2_axis_to_string(axis),)

        async with self._motion_lock:
            smoothie_pos = await self._fast_home(smoothie_ax, margin)
            self._current_position = self.get_deck_from_machine(
                self._axis_map_from_string_map(smoothie_pos)
            )

    # Gantry/frame (i.e. not pipette) config API
    @property
    def config(self) -> RobotConfig:
        """Get the robot's configuration object.

        :returns .RobotConfig: The object.
        """
        return self._config

    @config.setter
    def config(self, config: Union[RobotConfig, OT3Config]) -> None:
        """Replace the currently-loaded config"""
        if isinstance(config, RobotConfig):
            self._config = config
        else:
            self._log.error("Cannot use an OT-3 config on an OT-2")

    def get_config(self) -> RobotConfig:
        """
        Get the robot's configuration object.

        :returns .RobotConfig: The object.
        """
        return self.config

    def set_config(self, config: Union[OT3Config, RobotConfig]) -> None:
        """Replace the currently-loaded config"""
        if isinstance(config, RobotConfig):
            self.config = config
        else:
            self._log.error("Cannot use an OT-3 config on an OT-2")

    async def update_config(self, **kwargs: Any) -> None:
        """Update values of the robot's configuration.

        `kwargs` should contain keys of the robot's configuration. For
        instance, `update_config(log_level='debug)` would change the API
        server log level to :py:attr:`logging.DEBUG`.

        Documentation on keys can be found in the documentation for
        :py:class:`.RobotConfig`.
        """
        self._config = replace(self._config, **kwargs)

    @property
    def hardware_feature_flags(self) -> HardwareFeatureFlags:
        return self._feature_flags

    @hardware_feature_flags.setter
    def hardware_feature_flags(self, feature_flags: HardwareFeatureFlags) -> None:
        self._feature_flags = feature_flags

    async def update_deck_calibration(self, new_transform: RobotCalibration) -> None:
        pass

    # Pipette action API
    async def prepare_for_aspirate(
        self, mount: top_types.Mount, rate: float = 1.0
    ) -> None:
        """
        Prepare the pipette for aspiration.
        """
        instrument = self.get_pipette(mount)
        self.ready_for_tip_action(instrument, HardwareAction.PREPARE_ASPIRATE, mount)

        if instrument.current_volume == 0:
            speed = self.plunger_speed(
                instrument, instrument.blow_out_flow_rate, "aspirate"
            )
            bottom = instrument.plunger_positions.bottom
            target = target_position_from_plunger(mount, bottom, self._current_position)
            await self._move(
                target,
                speed=(speed * rate),
                home_flagged_axes=False,
            )
            instrument.ready_to_aspirate = True

    async def aspirate(
        self,
        mount: top_types.Mount,
        volume: Optional[float] = None,
        rate: float = 1.0,
    ) -> None:
        """
        Aspirate a volume of liquid (in microliters/uL) using this pipette.
        """
        aspirate_spec = self.plan_check_aspirate(mount, volume, rate)
        if not aspirate_spec:
            return
        target_pos = target_position_from_plunger(
            mount,
            aspirate_spec.plunger_distance,
            self._current_position,
        )
        try:
            self._backend.set_active_current(
                {aspirate_spec.axis: aspirate_spec.current}
            )
            await self._move(
                target_pos,
                speed=aspirate_spec.speed,
                home_flagged_axes=False,
            )
        except Exception:
            self._log.exception("Aspirate failed")
            aspirate_spec.instr.set_current_volume(0)
            raise
        else:
            aspirate_spec.instr.add_current_volume(aspirate_spec.volume)

    async def dispense(
        self,
        mount: top_types.Mount,
        volume: Optional[float] = None,
        rate: float = 1.0,
        push_out: Optional[float] = None,
    ) -> None:
        """
        Dispense a volume of liquid in microliters(uL) using this pipette.
        """

        dispense_spec = self.plan_check_dispense(mount, volume, rate, push_out)
        if not dispense_spec:
            return
        target_pos = target_position_from_plunger(
            mount,
            dispense_spec.plunger_distance,
            self._current_position,
        )

        try:
            self._backend.set_active_current(
                {dispense_spec.axis: dispense_spec.current}
            )
            await self._move(
                target_pos,
                speed=dispense_spec.speed,
                home_flagged_axes=False,
            )
        except Exception:
            self._log.exception("Dispense failed")
            dispense_spec.instr.set_current_volume(0)
            raise
        else:
            dispense_spec.instr.remove_current_volume(dispense_spec.volume)

    async def blow_out(
        self, mount: top_types.Mount, volume: Optional[float] = None
    ) -> None:
        """
        Force any remaining liquid to dispense. The liquid will be dispensed at
        the current location of pipette
        """
        blowout_spec = self.plan_check_blow_out(mount)
        self._backend.set_active_current({blowout_spec.axis: blowout_spec.current})
        target_pos = target_position_from_plunger(
            mount,
            blowout_spec.plunger_distance,
            self._current_position,
        )

        try:
            await self._move(
                target_pos,
                speed=blowout_spec.speed,
                home_flagged_axes=False,
            )
        except Exception:
            self._log.exception("Blow out failed")
            raise
        finally:
            blowout_spec.instr.set_current_volume(0)
            blowout_spec.instr.ready_to_aspirate = False

    async def update_nozzle_configuration_for_mount(
        self,
        mount: top_types.Mount,
        back_left_nozzle: Optional[str],
        front_right_nozzle: Optional[str],
        starting_nozzle: Optional[str] = None,
    ) -> None:
        """
        Update a nozzle configuration for a given pipette.

        The expectation of this function is that the back_left_nozzle/front_right_nozzle are the two corners
        of a rectangle of nozzles. A call to this function that does not follow that schema will result
        in an error.

        :param mount: A robot mount that the instrument is on.
        :param back_left_nozzle: A string representing a nozzle name of the form <LETTER><NUMBER> such as 'A1'.
        :param front_right_nozzle: A string representing a nozzle name of the form <LETTER><NUMBER> such as 'A1'.
        :param starting_nozzle: A string representing the starting nozzle which will be used as the critical point
        of the pipette nozzle configuration. By default, the back left nozzle will be the starting nozzle if
        none is provided.
        :return: None.

        If none of the nozzle parameters are provided, the nozzle configuration will be reset to default.
        """
        if not back_left_nozzle and not front_right_nozzle and not starting_nozzle:
            await self.reset_nozzle_configuration(mount)
        else:
            assert back_left_nozzle and front_right_nozzle
            await self.update_nozzle_configuration(
                mount, back_left_nozzle, front_right_nozzle, starting_nozzle
            )

    async def tip_pickup_moves(
        self,
        mount: top_types.Mount,
        presses: Optional[int] = None,
        increment: Optional[float] = None,
    ) -> None:
        spec, _ = self.plan_check_pick_up_tip(
            mount=mount, presses=presses, increment=increment
        )
        self._backend.set_active_current(spec.plunger_currents)
        target_absolute = target_position_from_plunger(
            mount, spec.plunger_prep_pos, self._current_position
        )
        await self._move(
            target_absolute,
            home_flagged_axes=False,
        )

        for press in spec.presses:
            with self._backend.save_current():
                self._backend.set_active_current(press.current)
                target_down = target_position_from_relative(
                    mount, press.relative_down, self._current_position
                )
                await self._move(target_down, speed=press.speed)
            target_up = target_position_from_relative(
                mount, press.relative_up, self._current_position
            )
            await self._move(target_up)
        # neighboring tips tend to get stuck in the space between
        # the volume chamber and the drop-tip sleeve on p1000.
        # This extra shake ensures those tips are removed
        for rel_point, speed in spec.shake_off_list:
            await self.move_rel(mount, rel_point, speed=speed)

        await self.retract(mount, spec.retract_target)

    async def pick_up_tip(
        self,
        mount: top_types.Mount,
        tip_length: float,
        presses: Optional[int] = None,
        increment: Optional[float] = None,
        prep_after: bool = True,
    ) -> None:
        """
        Pick up tip from current location.
        """

        spec, _add_tip_to_instrs = self.plan_check_pick_up_tip(
            mount=mount, presses=presses, increment=increment, tip_length=tip_length
        )
        self._backend.set_active_current(spec.plunger_currents)
        target_absolute = target_position_from_plunger(
            mount, spec.plunger_prep_pos, self._current_position
        )
        await self._move(
            target_absolute,
            home_flagged_axes=False,
        )

        for press in spec.presses:
            with self._backend.save_current():
                self._backend.set_active_current(press.current)
                target_down = target_position_from_relative(
                    mount, press.relative_down, self._current_position
                )
                await self._move(target_down, speed=press.speed)
            target_up = target_position_from_relative(
                mount, press.relative_up, self._current_position
            )
            await self._move(target_up)
        # neighboring tips tend to get stuck in the space between
        # the volume chamber and the drop-tip sleeve on p1000.
        # This extra shake ensures those tips are removed
        for rel_point, speed in spec.shake_off_list:
            await self.move_rel(mount, rel_point, speed=speed)

        await self.retract(mount, spec.retract_target)
        _add_tip_to_instrs()

        if prep_after:
            await self.prepare_for_aspirate(mount)

    async def tip_drop_moves(
        self,
        mount: top_types.Mount,
        home_after: bool = True,
        ignore_plunger: bool = False,
    ) -> None:
        spec, _ = self.plan_check_drop_tip(mount, home_after)

        for move in spec.drop_moves:
            self._backend.set_active_current(move.current)
            target_pos = target_position_from_plunger(
                mount, move.target_position, self._current_position
            )
            await self._move(
                target_pos,
                speed=move.speed,
                home_flagged_axes=False,
            )
            if move.home_after:
                smoothie_pos = await self._fast_home(
                    axes=[ot2_axis_to_string(ax) for ax in move.home_axes],
                    margin=move.home_after_safety_margin,
                )
                self._current_position = self.get_deck_from_machine(
                    self._axis_map_from_string_map(smoothie_pos)
                )

        for shake in spec.shake_moves:
            await self.move_rel(mount, shake[0], speed=shake[1])

        self._backend.set_active_current(spec.ending_current)

    async def drop_tip(self, mount: top_types.Mount, home_after: bool = True) -> None:
        """Drop tip at the current location."""
        await self.tip_drop_moves(mount, home_after)

        # todo(mm, 2024-10-17): Ideally, callers would be able to replicate the behavior
        # of this method via self.drop_tip_moves() plus other public methods. This
        # currently prevents that: there is no public equivalent for
        # instrument.set_current_volume().
        instrument = self.get_pipette(mount)
        instrument.set_current_volume(0)

        self.set_current_tiprack_diameter(mount, 0.0)
        self.remove_tip(mount)

    async def create_simulating_module(
        self,
        model: modules.types.ModuleModel,
    ) -> modules.AbstractModule:
        """Get a simulating module hardware API interface for the given model."""
        assert (
            self.is_simulator
        ), "Cannot build simulating module from non-simulating hardware control API"

        return await self._backend.module_controls.build_module(
            port="",
            usb_port=USBPort(name="", port_number=1, port_group=PortGroup.MAIN),
            type=modules.ModuleType.from_model(model),
            sim_model=model.value,
        )

    def get_instrument_max_height(
        self, mount: top_types.Mount, critical_point: Optional[CriticalPoint] = None
    ) -> float:
        return PipetteHandlerProvider.instrument_max_height(
            self, mount, self._config.z_retract_distance, critical_point
        )

    async def clean_up(self) -> None:
        """Get the API ready to stop cleanly."""
        await self._backend.clean_up()

    MapPayload = TypeVar("MapPayload")

    @staticmethod
    def _axis_map_from_string_map(
        input_map: Dict[str, "API.MapPayload"]
    ) -> Dict[Axis, "API.MapPayload"]:
        return {Axis[k]: v for k, v in input_map.items()}

    def _string_map_from_axis_map(
        self, input_map: Dict[Axis, "API.MapPayload"]
    ) -> Dict[str, "API.MapPayload"]:
        return {ot2_axis_to_string(k): v for k, v in input_map.items()}

    def get_estop_state(self) -> EstopState:
        return EstopState.DISENGAGED
