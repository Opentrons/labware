"""OT3 Hardware Controller Backend."""

from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from functools import wraps
import logging
from copy import deepcopy
from numpy import isclose
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    List,
    Optional,
    Tuple,
    Sequence,
    AsyncIterator,
    cast,
    Set,
    TypeVar,
    Iterator,
    KeysView,
    Union,
    Mapping,
)
from opentrons.config.types import OT3Config, GantryLoad
from opentrons.config import gripper_config
from .ot3utils import (
    axis_convert,
    create_move_group,
    axis_to_node,
    get_current_settings,
    create_home_groups,
    node_to_axis,
    sensor_node_for_mount,
    sensor_node_for_pipette,
    sensor_id_for_instrument,
    create_gripper_jaw_grip_group,
    create_gripper_jaw_home_group,
    create_gripper_jaw_hold_group,
    create_tip_action_group,
    create_tip_motor_home_group,
    motor_nodes,
    LIMIT_SWITCH_OVERTRAVEL_DISTANCE,
    map_pipette_type_to_sensor_id,
    moving_pipettes_in_move_group,
    gripper_jaw_state_from_fw,
    get_system_constraints,
    get_system_constraints_for_calibration,
    get_system_constraints_for_plunger_acceleration,
)
from .tip_presence_manager import TipPresenceManager

try:
    import aionotify  # type: ignore[import-untyped]
except (OSError, ModuleNotFoundError):
    aionotify = None


from opentrons_hardware.drivers import SystemDrivers
from opentrons_hardware.drivers.can_bus import CanMessenger, DriverSettings
from opentrons_hardware.drivers.can_bus.abstract_driver import AbstractCanDriver
from opentrons_hardware.drivers.can_bus.build import build_driver
from opentrons_hardware.drivers.binary_usb import (
    BinaryMessenger,
    SerialUsbDriver,
    build_rear_panel_driver,
)
from opentrons_hardware.drivers.eeprom import EEPROMDriver, EEPROMData
from opentrons_hardware.hardware_control.move_group_runner import MoveGroupRunner
from opentrons_hardware.hardware_control.motion_planning import (
    MoveManager,
    MoveTarget,
    ZeroLengthMoveError,
)
from opentrons_hardware.hardware_control.estop.detector import (
    EstopDetector,
)

from opentrons.hardware_control.backends.estop_state import EstopStateMachine

from opentrons_hardware.hardware_control.motor_enable_disable import (
    set_enable_motor,
    set_disable_motor,
    set_enable_tip_motor,
    set_disable_tip_motor,
    get_motor_enabled,
)
from opentrons_hardware.hardware_control.motor_position_status import (
    get_motor_position,
    update_motor_position_estimation,
)
from opentrons_hardware.hardware_control.limit_switches import get_limit_switches
from opentrons_hardware.hardware_control.current_settings import (
    set_run_current,
    set_hold_current,
    set_currents,
)
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    PipetteName as FirmwarePipetteName,
    ErrorCode,
    SensorId,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    StopRequest,
)
from opentrons_hardware.firmware_bindings.messages.payloads import EmptyPayload
from opentrons_hardware.hardware_control import status_bar

from opentrons_hardware.firmware_bindings.binary_constants import BinaryMessageId
from opentrons_hardware.firmware_bindings.messages.binary_message_definitions import (
    BinaryMessageDefinition,
    DoorSwitchStateInfo,
)
from opentrons_hardware.firmware_update import FirmwareUpdate
from opentrons_hardware.hardware_control import network, tools

from opentrons.hardware_control.module_control import AttachedModulesControl
from opentrons.hardware_control.types import (
    BoardRevision,
    Axis,
    AionotifyEvent,
    OT3Mount,
    OT3AxisMap,
    OT3AxisKind,
    CurrentConfig,
    MotorStatus,
    InstrumentProbeType,
    UpdateStatus,
    DoorState,
    SubSystemState,
    SubSystem,
    TipStateType,
    GripperJawState,
    HardwareFeatureFlags,
    EstopOverallStatus,
    EstopAttachLocation,
    EstopState,
    HardwareEventHandler,
    HardwareEventUnsubscriber,
    PipetteSensorId,
    PipetteSensorType,
    PipetteSensorData,
    PipetteSensorResponseQueue,
)
from opentrons.hardware_control.errors import (
    InvalidPipetteName,
    InvalidPipetteModel,
)
from opentrons_hardware.hardware_control.motion import (
    MoveStopCondition,
    MoveGroup,
)
from opentrons_hardware.hardware_control.types import (
    NodeMap,
    MotorPositionStatus,
    MoveCompleteAck,
)
from opentrons_hardware.hardware_control.tools import types as ohc_tool_types

from opentrons_hardware.hardware_control.tool_sensors import (
    capacitive_probe,
    capacitive_pass,
    liquid_probe,
    check_overpressure,
    grab_pressure,
)
from opentrons_hardware.hardware_control.rear_panel_settings import (
    get_door_state,
    set_deck_light,
    get_deck_light_state,
)
from opentrons_hardware.hardware_control.gripper_settings import (
    get_gripper_jaw_state,
)
from opentrons_hardware.hardware_control.hepa_uv_settings import (
    set_hepa_fan_state as set_hepa_fan_state_fw,
    get_hepa_fan_state as get_hepa_fan_state_fw,
    set_hepa_uv_state as set_hepa_uv_state_fw,
    get_hepa_uv_state as get_hepa_uv_state_fw,
)

from opentrons_hardware.drivers.gpio import OT3GPIO, RemoteOT3GPIO
from opentrons_shared_data.pipette.types import PipetteName
from opentrons_shared_data.pipette import (
    pipette_load_name_conversions as pipette_load_name,
    load_data as load_pipette_data,
)
from opentrons_shared_data.gripper.gripper_definition import GripForceProfile

from opentrons_shared_data.errors.exceptions import (
    EStopActivatedError,
    EStopNotPresentError,
    PipetteOverpressureError,
    FirmwareUpdateRequiredError,
    FailedGripperPickupError,
    PipetteLiquidNotFoundError,
    CommunicationError,
    PythonException,
    UnsupportedHardwareCommand,
)

from .subsystem_manager import SubsystemManager

from ..dev_types import (
    AttachedPipette,
    AttachedGripper,
    OT3AttachedInstruments,
)
from ..types import HepaFanState, HepaUVState, StatusBarState

from .types import HWStopCondition
from .flex_protocol import FlexBackend
from .status_bar_state import StatusBarStateController
from opentrons_hardware.sensors.types import SensorDataType

log = logging.getLogger(__name__)

MapPayload = TypeVar("MapPayload")
Wrapped = TypeVar("Wrapped", bound=Callable[..., Awaitable[Any]])


def requires_update(func: Wrapped) -> Wrapped:
    """Decorator that raises FirmwareUpdateRequiredError if the update_required flag is set."""

    @wraps(func)
    async def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
        if self.update_required and self.initialized:
            raise FirmwareUpdateRequiredError(
                func.__name__,
                self.subsystems_to_update,
            )
        return await func(self, *args, **kwargs)

    return cast(Wrapped, wrapper)


def requires_estop(func: Wrapped) -> Wrapped:
    """Decorator that raises an exception if the Estop is engaged."""

    @wraps(func)
    async def wrapper(self: OT3Controller, *args: Any, **kwargs: Any) -> Any:
        state = self._estop_state_machine.state
        if state == EstopState.NOT_PRESENT and self._feature_flags.require_estop:
            raise EStopNotPresentError(
                message="An Estop must be plugged in to move the robot."
            )
        if state == EstopState.LOGICALLY_ENGAGED:
            raise EStopActivatedError(
                message="Estop must be acknowledged and cleared to move the robot."
            )
        if state == EstopState.PHYSICALLY_ENGAGED:
            raise EStopActivatedError(
                message="Estop is currently engaged, robot cannot move."
            )
        return await func(self, *args, **kwargs)

    return cast(Wrapped, wrapper)


class OT3Controller(FlexBackend):
    """OT3 Hardware Controller Backend."""

    _initialized: bool
    _messenger: CanMessenger
    _usb_messenger: Optional[BinaryMessenger]
    _position: Dict[NodeId, float]
    _encoder_position: Dict[NodeId, float]
    _motor_status: Dict[NodeId, MotorStatus]
    _subsystem_manager: SubsystemManager
    _engaged_axes: OT3AxisMap[bool]

    @classmethod
    async def build(
        cls,
        config: OT3Config,
        use_usb_bus: bool = False,
        check_updates: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> OT3Controller:
        """Create the OT3Controller instance.

        Args:
            config: Robot configuration

        Returns:
            Instance.
        """
        driver = await build_driver(DriverSettings())
        usb_driver = None
        if use_usb_bus:
            try:
                usb_driver = await build_rear_panel_driver()
            except IOError as e:
                log.error(
                    "No rear panel device found, probably an EVT bot, disable rearPanelIntegration feature flag if it is"
                )
                raise e
        inst = cls(
            config,
            driver=driver,
            usb_driver=usb_driver,
            check_updates=check_updates,
            feature_flags=feature_flags,
        )
        await inst._subsystem_manager.start()
        return inst

    def __init__(
        self,
        config: OT3Config,
        driver: AbstractCanDriver,
        usb_driver: Optional[SerialUsbDriver] = None,
        eeprom_driver: Optional[EEPROMDriver] = None,
        check_updates: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> None:
        """Construct.

        Args:
            config: Robot configuration
            driver: The Can Driver
        """
        self._configuration = config
        self._module_controls: Optional[AttachedModulesControl] = None
        self._messenger = CanMessenger(driver=driver)
        self._messenger.start()
        self._drivers = self._build_system_hardware(
            self._messenger, usb_driver, eeprom_driver
        )
        self._feature_flags = feature_flags or HardwareFeatureFlags()
        self._usb_messenger = self._drivers.usb_messenger
        self._gpio_dev = self._drivers.gpio_dev
        self._subsystem_manager = SubsystemManager(
            self._messenger,
            self._usb_messenger,
            tools.detector.ToolDetector(self._messenger),
            network.NetworkInfo(self._messenger, self._usb_messenger),
            FirmwareUpdate(),
        )
        self._estop_detector: Optional[EstopDetector] = None
        self._estop_state_machine = EstopStateMachine(detector=None)
        self._position = self._get_home_position()
        self._gear_motor_position: Dict[NodeId, float] = {}
        self._encoder_position = self._get_home_position()
        self._motor_status = {}
        self._engaged_axes = {}
        self._check_updates = check_updates
        self._initialized = False
        self._status_bar = status_bar.StatusBar(messenger=self._usb_messenger)
        self._status_bar_controller = StatusBarStateController(self._status_bar)

        try:
            self._event_watcher = self._build_event_watcher()
        except AttributeError:
            log.warning(
                "Failed to initiate aionotify, cannot watch modules "
                "or door, likely because not running on linux"
            )
        self._current_settings: Optional[OT3AxisMap[CurrentConfig]] = None
        self._tip_presence_manager = TipPresenceManager(self._messenger)
        self._move_manager = MoveManager(
            constraints=get_system_constraints(
                self._configuration.motion_settings, GantryLoad.LOW_THROUGHPUT
            )
        )
        self._pressure_sensor_available: Dict[NodeId, bool] = {}

    @asynccontextmanager
    async def restore_system_constraints(self) -> AsyncIterator[None]:
        old_system_constraints = deepcopy(self._move_manager.get_constraints())
        try:
            yield
        finally:
            self._move_manager.update_constraints(old_system_constraints)
            log.debug(f"Restore previous system constraints: {old_system_constraints}")

    @asynccontextmanager
    async def grab_pressure(
        self, channels: int, mount: OT3Mount
    ) -> AsyncIterator[None]:
        tool = axis_to_node(Axis.of_main_tool_actuator(mount))
        async with grab_pressure(channels, tool, self._messenger):
            yield

    def set_pressure_sensor_available(
        self, pipette_axis: Axis, available: bool
    ) -> None:
        pip_node = axis_to_node(pipette_axis)
        self._pressure_sensor_available[pip_node] = available

    def get_pressure_sensor_available(self, pipette_axis: Axis) -> bool:
        pip_node = axis_to_node(pipette_axis)
        return self._pressure_sensor_available[pip_node]

    def update_constraints_for_calibration_with_gantry_load(
        self,
        gantry_load: GantryLoad,
    ) -> None:
        self._move_manager.update_constraints(
            get_system_constraints_for_calibration(
                self._configuration.motion_settings, gantry_load
            )
        )
        log.debug(
            f"Set system constraints for calibration: {self._move_manager.get_constraints()}"
        )

    def update_constraints_for_gantry_load(self, gantry_load: GantryLoad) -> None:
        self._move_manager.update_constraints(
            get_system_constraints(self._configuration.motion_settings, gantry_load)
        )

    def update_constraints_for_plunger_acceleration(
        self,
        mount: OT3Mount,
        acceleration: float,
        gantry_load: GantryLoad,
        high_speed_pipette: bool = False,
    ) -> None:
        new_constraints = get_system_constraints_for_plunger_acceleration(
            self._configuration.motion_settings,
            gantry_load,
            mount,
            acceleration,
            high_speed_pipette,
        )
        self._move_manager.update_constraints(new_constraints)

    async def get_serial_number(self) -> Optional[str]:
        if not self.initialized:
            return None
        return self.eeprom_data.serial_number

    @property
    def initialized(self) -> bool:
        """True when the hardware controller has initialized and is ready."""
        return self._initialized

    @initialized.setter
    def initialized(self, value: bool) -> None:
        self._initialized = value

    @property
    def subsystems(self) -> Dict[SubSystem, SubSystemState]:
        return self._subsystem_manager.subsystems

    @property
    def fw_version(self) -> Dict[SubSystem, int]:
        """Get the firmware version."""
        return {
            subsystem: info.current_fw_version
            for subsystem, info in self.subsystems.items()
        }

    @property
    def eeprom_driver(self) -> EEPROMDriver:
        """The eeprom driver interface."""
        return self._drivers.eeprom

    @property
    def eeprom_data(self) -> EEPROMData:
        """Get the data on the eeprom."""
        return self._drivers.eeprom.data

    @property
    def update_required(self) -> bool:
        return self._subsystem_manager.update_required and self._check_updates

    @property
    def subsystems_to_update(self) -> List[SubSystem]:
        return self._subsystem_manager.subsystems_to_update

    @staticmethod
    def _build_system_hardware(
        can_messenger: CanMessenger,
        usb_driver: Optional[SerialUsbDriver],
        eeprom_driver: Optional[EEPROMDriver],
    ) -> SystemDrivers:
        gpio = OT3GPIO("hardware_control")
        eeprom_driver = eeprom_driver or EEPROMDriver(gpio)
        eeprom_driver.setup()
        gpio_dev: Union[OT3GPIO, RemoteOT3GPIO] = gpio
        usb_messenger: Optional[BinaryMessenger] = None
        if usb_driver:
            usb_messenger = BinaryMessenger(usb_driver)
            usb_messenger.start()
            gpio_dev = RemoteOT3GPIO(usb_messenger)
        return SystemDrivers(
            can_messenger,
            gpio_dev,
            eeprom_driver,
            usb_messenger=usb_messenger,
        )

    @property
    def gear_motor_position(self) -> Optional[float]:
        return self._gear_motor_position.get(NodeId.pipette_left, None)

    def _motor_nodes(self) -> Set[NodeId]:
        """Get a list of the motor controller nodes of all attached and ok devices."""
        return motor_nodes(self._subsystem_manager.targets)

    async def update_firmware(
        self,
        subsystems: Set[SubSystem],
        force: bool = False,
    ) -> AsyncIterator[UpdateStatus]:
        """Updates the firmware on the OT3."""
        async for update in self._subsystem_manager.update_firmware(subsystems, force):
            yield update

    def get_current_settings(
        self, gantry_load: GantryLoad
    ) -> OT3AxisMap[CurrentConfig]:
        return get_current_settings(self._configuration.current_settings, gantry_load)

    async def update_to_default_current_settings(self, gantry_load: GantryLoad) -> None:
        self._current_settings = self.get_current_settings(gantry_load)
        await self.set_default_currents()

    def update_feature_flags(self, feature_flags: HardwareFeatureFlags) -> None:
        """Update the hardware feature flags used by the hardware controller."""
        self._feature_flags = feature_flags

    async def update_motor_status(self) -> None:
        """Retreieve motor and encoder status and position from all present nodes"""
        motor_nodes = self._motor_nodes()
        assert len(motor_nodes)
        response = await get_motor_position(self._messenger, motor_nodes)
        self._handle_motor_status_response(response)

    async def update_motor_estimation(self, axes: Sequence[Axis]) -> None:
        """Update motor position estimation for commanded nodes, and update cache of data."""
        nodes = set([axis_to_node(a) for a in axes])
        response = await update_motor_position_estimation(self._messenger, nodes)
        self._handle_motor_status_response(response)

    @property
    def grip_force_profile(self) -> Optional[GripForceProfile]:
        return self._gripper_force_settings

    @grip_force_profile.setter
    def grip_force_profile(self, profile: Optional[GripForceProfile]) -> None:
        self._gripper_force_settings = profile

    @property
    def motor_run_currents(self) -> OT3AxisMap[float]:
        assert self._current_settings
        run_currents: OT3AxisMap[float] = {}
        for axis, settings in self._current_settings.items():
            run_currents[axis] = settings.run_current
        return run_currents

    @property
    def motor_hold_currents(self) -> OT3AxisMap[float]:
        assert self._current_settings
        hold_currents: OT3AxisMap[float] = {}
        for axis, settings in self._current_settings.items():
            hold_currents[axis] = settings.hold_current
        return hold_currents

    @property
    def gpio_chardev(self) -> Union[OT3GPIO, RemoteOT3GPIO]:
        """Get the GPIO device."""
        return self._gpio_dev

    @property
    def board_revision(self) -> BoardRevision:
        """Get the board revision"""
        return BoardRevision.FLEX_B2

    @property
    def module_controls(self) -> AttachedModulesControl:
        """Get the module controls."""
        if self._module_controls is None:
            raise AttributeError("Module controls not found.")
        return self._module_controls

    @module_controls.setter
    def module_controls(self, module_controls: AttachedModulesControl) -> None:
        """Set the module controls"""
        self._module_controls = module_controls

    def _get_motor_status(
        self, axes: Sequence[Axis]
    ) -> Dict[Axis, Optional[MotorStatus]]:
        return {ax: self._motor_status.get(axis_to_node(ax)) for ax in axes}

    def get_invalid_motor_axes(self, axes: Sequence[Axis]) -> List[Axis]:
        """Get axes that currently do not have the motor-ok flag."""
        return [
            ax
            for ax, status in self._get_motor_status(axes).items()
            if not status or not status.motor_ok
        ]

    def get_invalid_encoder_axes(self, axes: Sequence[Axis]) -> List[Axis]:
        """Get axes that currently do not have the encoder-ok flag."""
        return [
            ax
            for ax, status in self._get_motor_status(axes).items()
            if not status or not status.encoder_ok
        ]

    def check_motor_status(self, axes: Sequence[Axis]) -> bool:
        return len(self.get_invalid_motor_axes(axes)) == 0

    def check_encoder_status(self, axes: Sequence[Axis]) -> bool:
        return len(self.get_invalid_encoder_axes(axes)) == 0

    async def update_position(self) -> OT3AxisMap[float]:
        """Get the current position."""
        return axis_convert(self._position, 0.0)

    async def update_encoder_position(self) -> OT3AxisMap[float]:
        """Get the encoder current position."""
        return axis_convert(self._encoder_position, 0.0)

    def _handle_motor_status_response(
        self, response: NodeMap[MotorPositionStatus], handle_gear_move: bool = False
    ) -> None:
        for axis, pos in response.items():
            if handle_gear_move and axis == NodeId.pipette_left:
                self._gear_motor_position = {axis: pos.motor_position}
            else:
                self._position.update({axis: pos.motor_position})
                self._encoder_position.update({axis: pos.encoder_position})
                # TODO (FPS 6-01-2023): Remove this once the Feature Flag to ignore stall detection is removed.
                # This check will latch the motor status for an axis at "true" if it was ever set to true.
                # To account for the case where a motor axis has its power reset, we also depend on the
                # "encoder_ok" flag staying set (it will only be False if the motor axis has not been
                # homed since a power cycle)
                motor_ok_latch = (
                    (not self._feature_flags.stall_detection_enabled)
                    and (
                        (axis in self._motor_status)
                        and self._motor_status[axis].motor_ok
                    )
                    and self._motor_status[axis].encoder_ok
                )
                self._motor_status.update(
                    {
                        axis: MotorStatus(
                            motor_ok=(pos.motor_ok or motor_ok_latch),
                            encoder_ok=pos.encoder_ok,
                        )
                    }
                )

    def _build_move_node_axis_runner(
        self,
        origin: Dict[Axis, float],
        target: Dict[Axis, float],
        speed: float,
        stop_condition: HWStopCondition,
        nodes_in_moves_only: bool,
    ) -> Tuple[Optional[MoveGroupRunner], bool]:
        if not target:
            return None, False
        move_target = MoveTarget.build(position=target, max_speed=speed)
        try:
            _, movelist = self._move_manager.plan_motion(
                origin=origin, target_list=[move_target]
            )
        except ZeroLengthMoveError as zme:
            log.debug(f"Not moving because move was zero length {str(zme)}")
            return None, False
        moves = movelist[0]
        log.debug(
            f"move: machine coordinates {target} from origin: machine coordinates {origin} at speed: {speed} requires {moves}"
        )

        ordered_nodes = self._motor_nodes()
        if nodes_in_moves_only:
            moving_axes = {
                axis_to_node(ax) for move in moves for ax in move.unit_vector.keys()
            }
            ordered_nodes = ordered_nodes.intersection(moving_axes)

        move_group, _ = create_move_group(
            origin, moves, ordered_nodes, MoveStopCondition[stop_condition.name]
        )
        return (
            MoveGroupRunner(
                move_groups=[move_group],
                ignore_stalls=True
                if not self._feature_flags.stall_detection_enabled
                else False,
            ),
            False,
        )

    def _build_move_gear_axis_runner(
        self,
        possible_q_axis_origin: Optional[float],
        possible_q_axis_target: Optional[float],
        speed: float,
        nodes_in_moves_only: bool,
    ) -> Tuple[Optional[MoveGroupRunner], bool]:
        if possible_q_axis_origin is None or possible_q_axis_target is None:
            return None, True
        tip_motor_move_group = self._build_tip_action_group(
            possible_q_axis_origin, [(possible_q_axis_target, speed)]
        )
        if nodes_in_moves_only:
            ordered_nodes = self._motor_nodes()

            ordered_nodes.intersection({axis_to_node(Axis.Q)})
        return (
            MoveGroupRunner(
                move_groups=[tip_motor_move_group],
                ignore_stalls=True
                if not self._feature_flags.stall_detection_enabled
                else False,
            ),
            True,
        )

    @requires_update
    @requires_estop
    async def move(
        self,
        origin: Dict[Axis, float],
        target: Dict[Axis, float],
        speed: float,
        stop_condition: HWStopCondition = HWStopCondition.none,
        nodes_in_moves_only: bool = True,
    ) -> None:
        """Move to a position.

        Args:
            origin: The starting point of the move
            moves: List of moves.
            stop_condition: The stop condition.
            nodes_in_moves_only: Default is True. If False, also send empty moves to
                                 nodes that are present but not defined in moves.

        .. caution::
            Setting `nodes_in_moves_only` to False will enable *all* present motors in
            the system. DO NOT USE when you want to keep one of the axes disabled.

        Returns:
            None
        """
        possible_q_axis_origin = origin.pop(Axis.Q, None)
        possible_q_axis_target = target.pop(Axis.Q, None)

        maybe_runners = (
            self._build_move_node_axis_runner(
                origin, target, speed, stop_condition, nodes_in_moves_only
            ),
            self._build_move_gear_axis_runner(
                possible_q_axis_origin,
                possible_q_axis_target,
                speed,
                nodes_in_moves_only,
            ),
        )
        log.debug(f"The move groups are {maybe_runners}.")

        gather_moving_nodes = set()
        all_moving_nodes = set()
        for runner, _ in maybe_runners:
            if runner:
                for n in runner.all_nodes():
                    gather_moving_nodes.add(n)
                for n in runner.all_moving_nodes():
                    all_moving_nodes.add(n)

        pipettes_moving = moving_pipettes_in_move_group(
            gather_moving_nodes, all_moving_nodes
        )

        async def _runner_coroutine(
            runner: MoveGroupRunner, is_gear_move: bool
        ) -> Tuple[Dict[NodeId, MotorPositionStatus], bool]:
            positions = await runner.run(can_messenger=self._messenger)
            return positions, is_gear_move

        coros = [
            _runner_coroutine(runner, is_gear_move)
            for runner, is_gear_move in maybe_runners
            if runner
        ]
        checked_moving_pipettes = self._pipettes_to_monitor_pressure(pipettes_moving)
        async with self._monitor_overpressure(checked_moving_pipettes):
            all_positions = await asyncio.gather(*coros)

        for positions, handle_gear_move in all_positions:
            self._handle_motor_status_response(positions, handle_gear_move)

    def _get_axis_home_distance(self, axis: Axis) -> float:
        if self.check_motor_status([axis]):
            return -1 * (
                self._position[axis_to_node(axis)] + LIMIT_SWITCH_OVERTRAVEL_DISTANCE
            )
        else:
            return -1 * self.axis_bounds[axis][1] - self.axis_bounds[axis][0]

    def _build_axes_home_groups(
        self, axes: Sequence[Axis], speed_settings: Dict[OT3AxisKind, float]
    ) -> List[MoveGroup]:
        present_axes = [ax for ax in axes if self.axis_is_present(ax)]
        if not present_axes:
            return []
        else:
            distances = {ax: self._get_axis_home_distance(ax) for ax in present_axes}
            velocities = {
                ax: -1 * speed_settings[Axis.to_kind(ax)] for ax in present_axes
            }
            return create_home_groups(distances, velocities)

    def _build_home_pipettes_runner(
        self,
        axes: Sequence[Axis],
        gantry_load: GantryLoad,
    ) -> Optional[MoveGroupRunner]:
        pipette_axes = [ax for ax in axes if ax in Axis.pipette_axes()]
        if not pipette_axes:
            return None

        speed_settings = self._configuration.motion_settings.max_speed_discontinuity[
            gantry_load
        ]
        move_groups: List[MoveGroup] = self._build_axes_home_groups(
            pipette_axes, speed_settings
        )
        return MoveGroupRunner(move_groups=move_groups)

    def _build_home_gantry_z_runner(
        self,
        axes: Sequence[Axis],
        gantry_load: GantryLoad,
    ) -> Optional[MoveGroupRunner]:
        gantry_axes = [ax for ax in axes if ax in Axis.gantry_axes()]
        if not gantry_axes:
            return None

        speed_settings = self._configuration.motion_settings.max_speed_discontinuity[
            gantry_load
        ]

        # first home all the present mount axes
        z_axes = list(filter(lambda ax: ax in Axis.ot3_mount_axes(), gantry_axes))
        z_groups = self._build_axes_home_groups(z_axes, speed_settings)

        # home X axis before Y axis, to avoid collision with thermo-cycler lid
        # that could be in the back-left corner
        x_groups = (
            self._build_axes_home_groups([Axis.X], speed_settings)
            if Axis.X in gantry_axes
            else []
        )
        y_groups = (
            self._build_axes_home_groups([Axis.Y], speed_settings)
            if Axis.Y in gantry_axes
            else []
        )

        move_groups = [*z_groups, *x_groups, *y_groups]
        if move_groups:
            return MoveGroupRunner(move_groups=move_groups)
        return None

    @requires_update
    @requires_estop
    async def home(
        self, axes: Sequence[Axis], gantry_load: GantryLoad
    ) -> OT3AxisMap[float]:
        """Home each axis passed in, and reset the positions to 0.

        Args:
            axes: List[Axis]

        Returns:
            A dictionary containing the new positions of each axis
        """
        checked_axes = [axis for axis in axes if self.axis_is_present(axis)]
        assert Axis.G not in checked_axes, "Please home G axis using gripper_home_jaw()"
        if not checked_axes:
            return {}

        maybe_runners = (
            self._build_home_gantry_z_runner(checked_axes, gantry_load),
            self._build_home_pipettes_runner(checked_axes, gantry_load),
        )
        coros = [
            runner.run(can_messenger=self._messenger)
            for runner in maybe_runners
            if runner
        ]
        moving_pipettes = [
            axis_to_node(ax) for ax in checked_axes if ax in Axis.pipette_axes()
        ]
        checked_moving_pipettes = self._pipettes_to_monitor_pressure(moving_pipettes)
        async with self._monitor_overpressure(checked_moving_pipettes):
            positions = await asyncio.gather(*coros)
        # TODO(CM): default gear motor homing routine to have some acceleration
        if Axis.Q in checked_axes:
            await self.home_tip_motors(
                distance=self.axis_bounds[Axis.Q][1] - self.axis_bounds[Axis.Q][0],
                velocity=self._configuration.motion_settings.max_speed_discontinuity.high_throughput[
                    Axis.to_kind(Axis.Q)
                ],
            )

        for position in positions:
            self._handle_motor_status_response(position)
        return axis_convert(self._position, 0.0)

    def _pipettes_to_monitor_pressure(self, pipettes: List[NodeId]) -> List[NodeId]:
        return [pip for pip in pipettes if self._pressure_sensor_available[pip]]

    def _filter_move_group(self, move_group: MoveGroup) -> MoveGroup:
        new_group: MoveGroup = []
        for step in move_group:
            new_group.append(
                {
                    node: axis_step
                    for node, axis_step in step.items()
                    if node in self._motor_nodes()
                }
            )
        return new_group

    async def home_tip_motors(
        self,
        distance: float,
        velocity: float,
        back_off: bool = True,
    ) -> None:
        move_group = create_tip_motor_home_group(distance, velocity, back_off)

        runner = MoveGroupRunner(
            move_groups=[move_group],
            ignore_stalls=True
            if not self._feature_flags.stall_detection_enabled
            else False,
        )
        try:
            positions = await runner.run(can_messenger=self._messenger)
            if NodeId.pipette_left in positions:
                self._gear_motor_position = {
                    NodeId.pipette_left: positions[NodeId.pipette_left].motor_position
                }
            else:
                log.debug("no position returned from NodeId.pipette_left")
                self._gear_motor_position = {}
        except Exception as e:
            log.error("Clearing tip motor position due to failed movement")
            self._gear_motor_position = {}
            raise e

    def _build_tip_action_group(
        self, origin: float, targets: List[Tuple[float, float]]
    ) -> MoveGroup:
        move_targets = [
            MoveTarget.build({Axis.Q: target_pos}, speed)
            for target_pos, speed in targets
        ]
        _, moves = self._move_manager.plan_motion(
            origin={Axis.Q: origin}, target_list=move_targets
        )

        return create_tip_action_group(moves[0], [NodeId.pipette_left], "clamp")

    async def tip_action(
        self, origin: float, targets: List[Tuple[float, float]]
    ) -> None:
        move_group = self._build_tip_action_group(origin, targets)
        runner = MoveGroupRunner(
            move_groups=[move_group],
            ignore_stalls=True
            if not self._feature_flags.stall_detection_enabled
            else False,
        )
        try:
            positions = await runner.run(can_messenger=self._messenger)
            if NodeId.pipette_left in positions:
                self._gear_motor_position = {
                    NodeId.pipette_left: positions[NodeId.pipette_left].motor_position
                }
            else:
                log.debug("no position returned from NodeId.pipette_left")
                self._gear_motor_position = {}
        except Exception as e:
            log.error("Clearing tip motor position due to failed movement")
            self._gear_motor_position = {}
            raise e

    @requires_update
    @requires_estop
    async def gripper_grip_jaw(
        self,
        duty_cycle: float,
        expected_displacement: float,  # not used on real hardware
        stop_condition: HWStopCondition = HWStopCondition.none,
        stay_engaged: bool = True,
    ) -> None:
        move_group = create_gripper_jaw_grip_group(
            duty_cycle, MoveStopCondition[stop_condition.name], stay_engaged
        )
        runner = MoveGroupRunner(move_groups=[move_group])
        positions = await runner.run(can_messenger=self._messenger)
        self._handle_motor_status_response(positions)

    @requires_update
    @requires_estop
    async def gripper_hold_jaw(
        self,
        encoder_position_um: int,
    ) -> None:
        move_group = create_gripper_jaw_hold_group(encoder_position_um)
        runner = MoveGroupRunner(move_groups=[move_group])
        positions = await runner.run(can_messenger=self._messenger)
        self._handle_motor_status_response(positions)

    @requires_update
    @requires_estop
    async def gripper_home_jaw(self, duty_cycle: float) -> None:
        move_group = create_gripper_jaw_home_group(duty_cycle)
        runner = MoveGroupRunner(move_groups=[move_group])
        positions = await runner.run(can_messenger=self._messenger)
        self._handle_motor_status_response(positions)

    async def get_jaw_state(self) -> GripperJawState:
        res = await get_gripper_jaw_state(self._messenger)
        return gripper_jaw_state_from_fw(res)

    @staticmethod
    def _lookup_serial_key(pipette_name: FirmwarePipetteName) -> str:
        lookup_name = {
            FirmwarePipetteName.p1000_single: "P1KS",
            FirmwarePipetteName.p1000_multi: "P1KM",
            FirmwarePipetteName.p1000_multi_em: "P1KP",
            FirmwarePipetteName.p50_single: "P50S",
            FirmwarePipetteName.p50_multi: "P50M",
            FirmwarePipetteName.p1000_96: "P1KH",
            FirmwarePipetteName.p50_96: "P50H",
            FirmwarePipetteName.p200_96: "P2HH",
        }
        return lookup_name[pipette_name]

    @staticmethod
    def _combine_serial_number(pipette_info: ohc_tool_types.PipetteInformation) -> str:
        serialized_name = OT3Controller._lookup_serial_key(pipette_info.name)
        version = pipette_load_name.version_from_string(pipette_info.model)
        return f"{serialized_name}V{version.major}{version.minor}{pipette_info.serial}"

    @staticmethod
    def _build_attached_pip(
        attached: ohc_tool_types.PipetteInformation, mount: OT3Mount
    ) -> AttachedPipette:
        if attached.name == FirmwarePipetteName.unknown:
            raise InvalidPipetteName(name=attached.name_int, mount=mount.name)
        try:
            # TODO (lc 12-8-2022) We should return model as an int rather than
            # a string.
            # TODO (lc 12-6-2022) We should also provide the full serial number
            # for PipetteInformation.serial so we don't have to use
            # helper methods to convert the serial back to what was flashed
            # on the eeprom.
            converted_name = pipette_load_name.convert_pipette_name(
                cast(PipetteName, attached.name.name), attached.model
            )
            return {
                "config": load_pipette_data.load_definition(
                    converted_name.pipette_type,
                    converted_name.pipette_channels,
                    converted_name.pipette_version,
                    converted_name.oem_type,
                ),
                "id": OT3Controller._combine_serial_number(attached),
            }
        except KeyError:
            raise InvalidPipetteModel(
                name=attached.name.name, model=attached.model, mount=mount.name
            )

    @staticmethod
    def _build_attached_gripper(
        attached: ohc_tool_types.GripperInformation,
    ) -> AttachedGripper:
        model = gripper_config.info_num_to_model(attached.model)
        serial = attached.serial
        return {
            "config": gripper_config.load(model),
            "id": f"GRPV{attached.model.replace('.', '')}{serial}",
        }

    @staticmethod
    def _generate_attached_instrs(
        attached: ohc_tool_types.ToolSummary,
    ) -> Iterator[Tuple[OT3Mount, OT3AttachedInstruments]]:
        if attached.left:
            yield (
                OT3Mount.LEFT,
                OT3Controller._build_attached_pip(attached.left, OT3Mount.LEFT),
            )
        if attached.right:
            yield (
                OT3Mount.RIGHT,
                OT3Controller._build_attached_pip(attached.right, OT3Mount.RIGHT),
            )
        if attached.gripper:
            yield (
                OT3Mount.GRIPPER,
                OT3Controller._build_attached_gripper(attached.gripper),
            )

    async def get_attached_instruments(
        self, expected: Mapping[OT3Mount, PipetteName]
    ) -> Dict[OT3Mount, OT3AttachedInstruments]:
        """Get attached instruments.

        Args:
            expected: Which mounts are expected.

        Returns:
            A map of mount to instrument name.
        """
        return dict(
            OT3Controller._generate_attached_instrs(self._subsystem_manager.tools)
        )

    async def get_limit_switches(self) -> OT3AxisMap[bool]:
        """Get the state of the gantry's limit switches on each axis."""
        motor_nodes = self._motor_nodes()
        assert motor_nodes, "No nodes available to read limit switch status from"
        res = await get_limit_switches(self._messenger, motor_nodes)
        return {node_to_axis(node): bool(val) for node, val in res.items()}

    @staticmethod
    def _tip_motor_nodes(axis_current_keys: KeysView[Axis]) -> List[NodeId]:
        return [axis_to_node(Axis.Q)] if Axis.Q in axis_current_keys else []

    async def set_default_currents(self) -> None:
        """Set both run and hold currents from robot config to each node."""
        assert self._current_settings, "Invalid current settings"
        await set_currents(
            self._messenger,
            self._axis_map_to_present_nodes(
                {k: v.as_tuple() for k, v in self._current_settings.items()}
            ),
            use_tip_motor_message_for=self._tip_motor_nodes(
                self._current_settings.keys()
            ),
        )

    @requires_update
    async def set_active_current(self, axis_currents: OT3AxisMap[float]) -> None:
        """Set the active current.

        Args:
            axis_currents: Axes' currents

        Returns:
            None
        """
        assert self._current_settings, "Invalid current settings"
        await set_run_current(
            self._messenger,
            self._axis_map_to_present_nodes(axis_currents),
            use_tip_motor_message_for=self._tip_motor_nodes(axis_currents.keys()),
        )
        for axis, current in axis_currents.items():
            self._current_settings[axis].run_current = current

    @requires_update
    async def set_hold_current(self, axis_currents: OT3AxisMap[float]) -> None:
        """Set the hold current for motor.

        Args:
            axis_currents: Axes' currents

        Returns:
            None
        """
        assert self._current_settings, "Invalid current settings"
        await set_hold_current(
            self._messenger,
            self._axis_map_to_present_nodes(axis_currents),
            use_tip_motor_message_for=self._tip_motor_nodes(axis_currents.keys()),
        )
        for axis, current in axis_currents.items():
            self._current_settings[axis].hold_current = current

    @asynccontextmanager
    async def motor_current(
        self,
        run_currents: Optional[OT3AxisMap[float]] = None,
        hold_currents: Optional[OT3AxisMap[float]] = None,
    ) -> AsyncIterator[None]:
        """Update and restore current."""
        assert self._current_settings
        old_settings = deepcopy(self._current_settings)
        if run_currents:
            await self.set_active_current(run_currents)
        if hold_currents:
            await self.set_hold_current(hold_currents)
        try:
            yield
        finally:
            if run_currents:
                await self.set_active_current(
                    {ax: old_settings[ax].run_current for ax in run_currents.keys()}
                )
            if hold_currents:
                await self.set_hold_current(
                    {ax: old_settings[ax].hold_current for ax in hold_currents.keys()}
                )
            if not run_currents and not hold_currents:
                self._current_settings = old_settings
                await self.set_default_currents()

    @asynccontextmanager
    async def restore_z_r_run_current(self) -> AsyncIterator[None]:
        """
        Temporarily restore the active current ONLY when homing or
        retracting the Z_R axis while the 96-channel is attached.
        """
        assert self._current_settings
        high_throughput_settings = deepcopy(self._current_settings)
        conf = self.get_current_settings(GantryLoad.LOW_THROUGHPUT)[Axis.Z_R]
        # outside of homing and retracting, Z_R run current should
        # be reduced to its hold current
        await self.set_active_current({Axis.Z_R: conf.run_current})
        try:
            yield
        finally:
            await self.set_active_current(
                {Axis.Z_R: high_throughput_settings[Axis.Z_R].run_current}
            )

    @asynccontextmanager
    async def increase_z_l_hold_current(self) -> AsyncIterator[None]:
        """
        Temporarily increase the hold current when engaging the Z_L axis
        while the 96-channel is attached
        """
        assert self._current_settings
        high_throughput_settings = deepcopy(self._current_settings)
        await self.set_hold_current(
            {Axis.Z_L: high_throughput_settings[Axis.Z_L].run_current}
        )
        try:
            yield
        finally:
            await self.set_hold_current(
                {Axis.Z_L: high_throughput_settings[Axis.Z_L].hold_current}
            )

    @staticmethod
    def _build_event_watcher() -> aionotify.Watcher:
        watcher = aionotify.Watcher()
        watcher.watch(
            alias="modules",
            path="/dev",
            flags=(
                aionotify.Flags.CREATE
                | aionotify.Flags.DELETE
                | aionotify.Flags.MOVED_FROM
                | aionotify.Flags.MOVED_TO
            ),
        )
        return watcher

    async def _handle_watch_event(self) -> None:
        try:
            event = await self._event_watcher.get_event()
        except asyncio.IncompleteReadError:
            log.debug("incomplete read error when quitting watcher")
            return
        if event is not None:
            flags = aionotify.Flags.parse(event.flags)
            log.debug(f"aionotify: {flags} {event.name}")
            if "ot_module" in event.name:
                event_name = event.name
                event_description = AionotifyEvent.build(event_name, flags)
                await self.module_controls.handle_module_appearance(event_description)

    async def watch(self, loop: asyncio.AbstractEventLoop) -> None:
        can_watch = aionotify is not None
        if can_watch:
            await self._event_watcher.setup(loop)

        while can_watch and (not self._event_watcher.closed):
            await self._handle_watch_event()

    @property
    def axis_bounds(self) -> OT3AxisMap[Tuple[float, float]]:
        """Get the axis bounds."""
        # TODO (AL, 2021-11-18): The bounds need to be defined
        return {
            Axis.Z_L: (0, 300),
            Axis.Z_R: (0, 300),
            Axis.P_L: (0, 200),
            Axis.P_R: (0, 200),
            Axis.X: (0, 550),
            Axis.Y: (0, 550),
            Axis.Z_G: (0, 300),
            Axis.Q: (0, 200),
        }

    def engaged_axes(self) -> OT3AxisMap[bool]:
        """Get engaged axes."""
        return self._engaged_axes

    async def update_engaged_axes(self) -> None:
        """Update engaged axes."""
        motor_nodes = self._motor_nodes()
        results = await get_motor_enabled(self._messenger, motor_nodes)
        for node, status in results.items():
            self._engaged_axes[node_to_axis(node)] = status

    async def is_motor_engaged(self, axis: Axis) -> bool:
        node = axis_to_node(axis)
        result = await get_motor_enabled(self._messenger, {node})
        try:
            engaged = result[node]
        except KeyError as ke:
            raise CommunicationError(
                message=f"No response from {node.name} for motor engagement query",
                detail={"node": node.name},
                wrapping=[PythonException(ke)],
            ) from ke
        self._engaged_axes.update({axis: engaged})
        return engaged

    async def disengage_axes(self, axes: List[Axis]) -> None:
        """Disengage axes."""
        if Axis.Q in axes:
            await set_disable_tip_motor(self._messenger, {axis_to_node(Axis.Q)})
            self._engaged_axes[Axis.Q] = False
            axes = [ax for ax in axes if ax is not Axis.Q]

        if len(axes) > 0:
            await set_disable_motor(self._messenger, {axis_to_node(ax) for ax in axes})
        for ax in axes:
            self._engaged_axes[ax] = False

    async def engage_axes(self, axes: List[Axis]) -> None:
        """Engage axes."""
        if Axis.Q in axes:
            await set_enable_tip_motor(self._messenger, {axis_to_node(Axis.Q)})
            self._engaged_axes[Axis.Q] = True
            axes = [ax for ax in axes if ax is not Axis.Q]

        if len(axes) > 0:
            await set_enable_motor(self._messenger, {axis_to_node(ax) for ax in axes})
        for ax in axes:
            self._engaged_axes[ax] = True

    @requires_update
    async def set_lights(self, button: Optional[bool], rails: Optional[bool]) -> None:
        """Set the light states."""
        if rails is not None:
            await set_deck_light(1 if rails else 0, self._usb_messenger)

    @requires_update
    async def get_lights(self) -> Dict[str, bool]:
        """Get the light state."""
        return {
            "rails": await get_deck_light_state(self._usb_messenger),
            "button": False,
        }

    def pause(self) -> None:
        """Pause the controller activity."""
        return None

    def resume(self) -> None:
        """Resume the controller activity."""
        return None

    async def halt(self) -> None:
        """Halt the motors."""
        error = await self._messenger.ensure_send(
            NodeId.broadcast, StopRequest(payload=EmptyPayload())
        )
        if error != ErrorCode.ok:
            log.warning(f"Halt stop request failed: {error}")

    async def probe(self, axis: Axis, distance: float) -> OT3AxisMap[float]:
        """Probe."""
        return {}

    async def clean_up(self) -> None:
        """Clean up."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            return

        if hasattr(self, "_event_watcher"):
            if loop.is_running() and self._event_watcher:
                self._event_watcher.close()

        messenger = getattr(self, "_messenger", None)
        if messenger:
            await messenger.stop()

        usb_messenger = getattr(self, "_usb_messenger", None)
        if usb_messenger:
            await usb_messenger.stop()

        return None

    @staticmethod
    def _get_home_position() -> Dict[NodeId, float]:
        return {
            NodeId.head_l: 0,
            NodeId.head_r: 0,
            NodeId.gantry_x: 0,
            NodeId.gantry_y: 0,
            NodeId.pipette_left: 0,
            NodeId.pipette_right: 0,
            NodeId.gripper_z: 0,
            NodeId.gripper_g: 0,
        }

    @staticmethod
    def home_position() -> OT3AxisMap[float]:
        return {
            node_to_axis(k): v for k, v in OT3Controller._get_home_position().items()
        }

    async def probe_network(self, timeout: float = 5.0) -> None:
        """Update the list of nodes present on the network.

        The stored result is used to make sure that move commands include entries
        for all present axes, so none incorrectly move before the others are ready.
        """
        await self._subsystem_manager.refresh()

    def axis_is_present(self, axis: Axis) -> bool:
        try:
            return axis_to_node(axis) in self._motor_nodes()
        except KeyError:
            # Currently unhandled axis
            return False

    def _axis_map_to_present_nodes(
        self, to_xform: OT3AxisMap[MapPayload]
    ) -> NodeMap[MapPayload]:
        by_node = {axis_to_node(k): v for k, v in to_xform.items()}
        return {k: v for k, v in by_node.items() if k in self._motor_nodes()}

    @asynccontextmanager
    async def _monitor_overpressure(self, mounts: List[NodeId]) -> AsyncIterator[None]:
        msg = "The pressure sensor on the {} mount has exceeded operational limits."
        if self._feature_flags.overpressure_detection_enabled and mounts:
            tools_with_id = map_pipette_type_to_sensor_id(
                mounts, self._subsystem_manager.device_info
            )
            # FIXME we should switch the sensor type based on the channel
            # used when partial tip pick up is implemented.
            provided_context_manager = await check_overpressure(
                self._messenger, tools_with_id
            )
            errors: asyncio.Queue[Tuple[NodeId, ErrorCode]] = asyncio.Queue()

            async with provided_context_manager() as errors:
                try:
                    yield
                finally:

                    def _pop_queue() -> Optional[Tuple[NodeId, ErrorCode]]:
                        try:
                            return errors.get_nowait()
                        except asyncio.QueueEmpty:
                            return None

                    q_msg = _pop_queue()
                    if q_msg:
                        mount = Axis.to_ot3_mount(node_to_axis(q_msg[0]))
                        raise PipetteOverpressureError(
                            message=msg.format(str(mount)),
                            detail={"mount": str(mount)},
                        )
        else:
            yield

    async def liquid_probe(
        self,
        mount: OT3Mount,
        max_p_distance: float,
        mount_speed: float,
        plunger_speed: float,
        threshold_pascals: float,
        plunger_impulse_time: float,
        num_baseline_reads: int,
        z_offset_for_plunger_prep: float,
        probe: InstrumentProbeType = InstrumentProbeType.PRIMARY,
        force_both_sensors: bool = False,
        response_queue: Optional[PipetteSensorResponseQueue] = None,
    ) -> float:
        head_node = axis_to_node(Axis.by_mount(mount))
        tool = sensor_node_for_pipette(OT3Mount(mount.value))
        if tool not in self._pipettes_to_monitor_pressure([tool]):
            raise UnsupportedHardwareCommand(
                "Liquid Presence Detection not available on this pipette."
            )

        if response_queue is None:
            response_capture: Optional[
                Callable[[Dict[SensorId, List[SensorDataType]]], None]
            ] = None
        else:

            def response_capture(data: Dict[SensorId, List[SensorDataType]]) -> None:
                response_queue.put_nowait(
                    {
                        PipetteSensorId(sensor_id.value): [
                            PipetteSensorData(
                                sensor_type=PipetteSensorType(packet.sensor_type.value),
                                _as_int=packet.to_int,
                                _as_float=packet.to_float(),
                            )
                            for packet in packets
                        ]
                        for sensor_id, packets in data.items()
                    }
                )

        positions = await liquid_probe(
            messenger=self._messenger,
            tool=tool,
            head_node=head_node,
            max_p_distance=max_p_distance,
            plunger_speed=plunger_speed,
            mount_speed=mount_speed,
            threshold_pascals=threshold_pascals,
            plunger_impulse_time=plunger_impulse_time,
            num_baseline_reads=num_baseline_reads,
            z_offset_for_plunger_prep=z_offset_for_plunger_prep,
            sensor_id=sensor_id_for_instrument(probe),
            force_both_sensors=force_both_sensors,
            emplace_data=response_capture,
        )
        for node, point in positions.items():
            self._position.update({node: point.motor_position})
            self._encoder_position.update({node: point.encoder_position})
        if (
            head_node not in positions
            or positions[head_node].move_ack
            == MoveCompleteAck.complete_without_condition
        ):
            raise PipetteLiquidNotFoundError(
                "Liquid not found during probe.",
                {
                    str(node_to_axis(node)): str(point.motor_position)
                    for node, point in positions.items()
                },
            )
        return self._position[axis_to_node(Axis.by_mount(mount))]

    async def capacitive_probe(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        sensor_threshold_pf: float,
        probe: InstrumentProbeType = InstrumentProbeType.PRIMARY,
    ) -> bool:
        status = await capacitive_probe(
            messenger=self._messenger,
            tool=sensor_node_for_mount(mount),
            mover=axis_to_node(moving),
            distance=distance_mm,
            mount_speed=speed_mm_per_s,
            sensor_id=sensor_id_for_instrument(probe),
            relative_threshold_pf=sensor_threshold_pf,
        )

        self._position[axis_to_node(moving)] = status.motor_position
        return status.move_ack == MoveCompleteAck.stopped_by_condition

    async def capacitive_pass(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        probe: InstrumentProbeType,
    ) -> List[float]:
        data = await capacitive_pass(
            self._messenger,
            sensor_node_for_mount(mount),
            axis_to_node(moving),
            distance_mm,
            speed_mm_per_s,
            sensor_id_for_instrument(probe),
        )
        self._position[axis_to_node(moving)] += distance_mm
        return data

    async def release_estop(self) -> None:
        if self._gpio_dev is None:
            log.error("no gpio control available")
            raise IOError("no gpio control")
        elif isinstance(self._gpio_dev, RemoteOT3GPIO):
            await self._gpio_dev.deactivate_estop()
        else:
            self._gpio_dev.deactivate_estop()

    async def engage_estop(self) -> None:
        if self._gpio_dev is None:
            log.error("no gpio control available")
            raise IOError("no gpio control")
        elif isinstance(self._gpio_dev, RemoteOT3GPIO):
            await self._gpio_dev.activate_estop()
        else:
            self._gpio_dev.activate_estop()

    async def release_sync(self) -> None:
        if self._gpio_dev is None:
            log.error("no gpio control available")
            raise IOError("no gpio control")
        elif isinstance(self._gpio_dev, RemoteOT3GPIO):
            await self._gpio_dev.deactivate_nsync_out()
        else:
            self._gpio_dev.deactivate_nsync_out()

    async def engage_sync(self) -> None:
        if self._gpio_dev is None:
            log.error("no gpio control available")
            raise IOError("no gpio control")
        elif isinstance(self._gpio_dev, RemoteOT3GPIO):
            await self._gpio_dev.activate_nsync_out()
        else:
            self._gpio_dev.activate_nsync_out()

    async def door_state(self) -> DoorState:
        door_open = await get_door_state(self._usb_messenger)
        return DoorState.OPEN if door_open else DoorState.CLOSED

    def add_door_state_listener(self, callback: Callable[[DoorState], None]) -> None:
        def _door_listener(msg: BinaryMessageDefinition) -> None:
            door_state = (
                DoorState.OPEN
                if cast(DoorSwitchStateInfo, msg).door_open.value
                else DoorState.CLOSED
            )
            callback(door_state)

        if self._usb_messenger is not None:
            self._usb_messenger.add_listener(
                _door_listener,
                lambda message_id: bool(
                    message_id == BinaryMessageId.door_switch_state_info
                ),
            )

    async def build_estop_detector(self) -> bool:
        """Must be called to set up the estop detector & state machine."""
        if self._drivers.usb_messenger is None:
            return False
        self._estop_detector = await EstopDetector.build(
            usb_messenger=self._drivers.usb_messenger
        )
        self._estop_state_machine.subscribe_to_detector(self._estop_detector)
        return True

    @property
    def tip_presence_manager(self) -> TipPresenceManager:
        return self._tip_presence_manager

    async def update_tip_detector(self, mount: OT3Mount, sensor_count: int) -> None:
        """Build indiviudal tip detector for a mount."""
        await self.teardown_tip_detector(mount)
        await self._tip_presence_manager.build_detector(mount, sensor_count)

    async def teardown_tip_detector(self, mount: OT3Mount) -> None:
        await self._tip_presence_manager.clear_detector(mount)

    async def get_tip_status(
        self,
        mount: OT3Mount,
        follow_singular_sensor: Optional[InstrumentProbeType] = None,
    ) -> TipStateType:
        return await self.tip_presence_manager.get_tip_status(
            mount, follow_singular_sensor
        )

    def current_tip_state(self, mount: OT3Mount) -> Optional[bool]:
        return self.tip_presence_manager.current_tip_state(mount)

    async def set_status_bar_state(self, state: StatusBarState) -> None:
        await self._status_bar_controller.set_status_bar_state(state)

    async def set_status_bar_enabled(self, enabled: bool) -> None:
        await self._status_bar_controller.set_enabled(enabled)

    def get_status_bar_state(self) -> StatusBarState:
        return self._status_bar_controller.get_current_state()

    @property
    def estop_status(self) -> EstopOverallStatus:
        return EstopOverallStatus(
            state=self._estop_state_machine.state,
            left_physical_state=self._estop_state_machine.get_physical_status(
                EstopAttachLocation.LEFT
            ),
            right_physical_state=self._estop_state_machine.get_physical_status(
                EstopAttachLocation.RIGHT
            ),
        )

    def estop_acknowledge_and_clear(self) -> EstopOverallStatus:
        """Attempt to acknowledge an Estop event and clear the status.

        Returns the estop status after clearing the status."""
        self._estop_state_machine.acknowledge_and_clear()
        return self.estop_status

    def get_estop_state(self) -> EstopState:
        return self._estop_state_machine.state

    def add_estop_callback(self, cb: HardwareEventHandler) -> HardwareEventUnsubscriber:
        return self._estop_state_machine.add_listener(cb)

    def check_gripper_position_within_bounds(
        self,
        expected_grip_width: float,
        grip_width_uncertainty_wider: float,
        grip_width_uncertainty_narrower: float,
        jaw_width: float,
        max_allowed_grip_error: float,
        hard_limit_lower: float,
        hard_limit_upper: float,
    ) -> None:
        """
        Check if the gripper is at the expected location.

        While this doesn't seem like it belongs here, it needs to act differently
        when we're simulating, so it does.
        """
        expected_gripper_position_min = (
            expected_grip_width - grip_width_uncertainty_narrower
        )
        expected_gripper_position_max = (
            expected_grip_width + grip_width_uncertainty_wider
        )
        current_gripper_position = jaw_width
        if isclose(current_gripper_position, hard_limit_lower):
            raise FailedGripperPickupError(
                message="Failed to grip: jaws all the way closed",
                details={
                    "failure-type": "jaws-all-the-way-closed",
                    "actual-jaw-width": current_gripper_position,
                },
            )
        if isclose(current_gripper_position, hard_limit_upper):
            raise FailedGripperPickupError(
                message="Failed to grip: jaws all the way open",
                details={
                    "failure-type": "jaws-all-the-way-open",
                    "actual-jaw-width": current_gripper_position,
                },
            )
        if (
            current_gripper_position - expected_gripper_position_min
            < -max_allowed_grip_error
        ):
            raise FailedGripperPickupError(
                message="Failed to grip: jaws closed too far",
                details={
                    "failure-type": "jaws-more-closed-than-expected",
                    "lower-bound-labware-width": expected_grip_width
                    - grip_width_uncertainty_narrower,
                    "actual-jaw-width": current_gripper_position,
                },
            )
        if (
            current_gripper_position - expected_gripper_position_max
            > max_allowed_grip_error
        ):
            raise FailedGripperPickupError(
                message="Failed to grip: jaws could not close far enough",
                details={
                    "failure-type": "jaws-more-open-than-expected",
                    "upper-bound-labware-width": expected_grip_width
                    - grip_width_uncertainty_narrower,
                    "actual-jaw-width": current_gripper_position,
                },
            )

    async def set_hepa_fan_state(self, fan_on: bool, duty_cycle: int) -> bool:
        return await set_hepa_fan_state_fw(self._messenger, fan_on, duty_cycle)

    async def get_hepa_fan_state(self) -> Optional[HepaFanState]:
        res = await get_hepa_fan_state_fw(self._messenger)
        return (
            HepaFanState(
                fan_on=res.fan_on,
                duty_cycle=res.duty_cycle,
            )
            if res
            else None
        )

    async def set_hepa_uv_state(self, light_on: bool, uv_duration_s: int) -> bool:
        return await set_hepa_uv_state_fw(self._messenger, light_on, uv_duration_s)

    async def get_hepa_uv_state(self) -> Optional[HepaUVState]:
        res = await get_hepa_uv_state_fw(self._messenger)
        return (
            HepaUVState(
                light_on=res.uv_light_on,
                uv_duration_s=res.uv_duration_s,
                remaining_time_s=res.remaining_time_s,
            )
            if res
            else None
        )

    def _update_tip_state(self, mount: OT3Mount, status: bool) -> None:
        """This is something we only use in the simulator.
        It is required so that PE simulations using ot3api don't break."""
        pass
