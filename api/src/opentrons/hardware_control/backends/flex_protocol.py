import asyncio
from contextlib import asynccontextmanager
from typing import (
    Protocol,
    Dict,
    Optional,
    List,
    Mapping,
    AsyncIterator,
    Sequence,
    Tuple,
    Set,
    TypeVar,
)
from opentrons_shared_data.pipette.types import (
    PipetteName,
)
from opentrons.config.types import GantryLoad
from opentrons.hardware_control.types import (
    BoardRevision,
    Axis,
    OT3Mount,
    OT3AxisMap,
    InstrumentProbeType,
    MotorStatus,
    UpdateStatus,
    SubSystem,
    SubSystemState,
    TipStateType,
    GripperJawState,
    HardwareFeatureFlags,
    EstopOverallStatus,
    EstopState,
    HardwareEventHandler,
    HardwareEventUnsubscriber,
    HepaFanState,
    HepaUVState,
    StatusBarState,
    PipetteSensorResponseQueue,
)
from opentrons.hardware_control.module_control import AttachedModulesControl
from ..dev_types import OT3AttachedInstruments
from .types import HWStopCondition

Cls = TypeVar("Cls")


class FlexBackend(Protocol):
    """Flex backend mypy protocol."""

    async def get_serial_number(self) -> Optional[str]:
        ...

    @asynccontextmanager
    def restore_system_constraints(self) -> AsyncIterator[None]:
        ...

    @asynccontextmanager
    def grab_pressure(self, channels: int, mount: OT3Mount) -> AsyncIterator[None]:
        ...

    def set_pressure_sensor_available(
        self, pipette_axis: Axis, available: bool
    ) -> None:
        ...

    def get_pressure_sensor_available(self, pipette_axis: Axis) -> bool:
        ...

    def update_constraints_for_gantry_load(self, gantry_load: GantryLoad) -> None:
        ...

    def update_constraints_for_calibration_with_gantry_load(
        self,
        gantry_load: GantryLoad,
    ) -> None:
        ...

    def update_constraints_for_plunger_acceleration(
        self,
        mount: OT3Mount,
        acceleration: float,
        gantry_load: GantryLoad,
        high_speed_pipette: bool = False,
    ) -> None:
        ...

    @property
    def initialized(self) -> bool:
        """True when the hardware controller has initialized and is ready."""
        ...

    @initialized.setter
    def initialized(self, value: bool) -> None:
        ...

    @property
    def gear_motor_position(self) -> Optional[float]:
        ...

    @property
    def board_revision(self) -> BoardRevision:
        """Get the board revision"""
        ...

    @property
    def module_controls(self) -> AttachedModulesControl:
        """Get the module controls."""
        ...

    @module_controls.setter
    def module_controls(self, module_controls: AttachedModulesControl) -> None:
        """Set the module controls"""
        ...

    async def update_to_default_current_settings(self, gantry_load: GantryLoad) -> None:
        ...

    def update_feature_flags(self, feature_flags: HardwareFeatureFlags) -> None:
        """Update the hardware feature flags used by the hardware controller."""
        ...

    async def update_motor_status(self) -> None:
        """Retreieve motor and encoder status and position from all present devices"""
        ...

    async def update_motor_estimation(self, axes: Sequence[Axis]) -> None:
        """Update motor position estimation for commanded axes, and update cache of data."""
        # Simulate conditions as if there are no stalls, aka do nothing
        ...

    def _get_motor_status(
        self, axes: Sequence[Axis]
    ) -> Dict[Axis, Optional[MotorStatus]]:
        ...

    def get_invalid_motor_axes(self, axes: Sequence[Axis]) -> List[Axis]:
        """Get axes that currently do not have the motor-ok flag."""
        ...

    def get_invalid_encoder_axes(self, axes: Sequence[Axis]) -> List[Axis]:
        """Get axes that currently do not have the encoder-ok flag."""
        ...

    def check_motor_status(self, axes: Sequence[Axis]) -> bool:
        ...

    def check_encoder_status(self, axes: Sequence[Axis]) -> bool:
        ...

    async def update_position(self) -> OT3AxisMap[float]:
        """Get the current position."""
        ...

    async def update_encoder_position(self) -> OT3AxisMap[float]:
        """Get the encoder current position."""
        ...

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
        ...

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
            target_position: Map of axis to position.
            home_flagged_axes: Whether to home afterwords.
            speed: Optional speed
            axis_max_speeds: Optional map of axis to speed.

        Returns:
            None
        """
        ...

    async def home(
        self, axes: Sequence[Axis], gantry_load: GantryLoad
    ) -> OT3AxisMap[float]:
        """Home axes.

        Args:
            axes: Optional list of axes.

        Returns:
            Homed position.
        """
        ...

    async def gripper_grip_jaw(
        self,
        duty_cycle: float,
        expected_displacement: float,
        stop_condition: HWStopCondition = HWStopCondition.none,
        stay_engaged: bool = True,
    ) -> None:
        """Move gripper inward."""
        ...

    async def gripper_home_jaw(self, duty_cycle: float) -> None:
        """Move gripper outward."""
        ...

    async def gripper_hold_jaw(
        self,
        encoder_position_um: int,
    ) -> None:
        ...

    async def get_jaw_state(self) -> GripperJawState:
        """Get the state of the gripper jaw."""
        ...

    async def tip_action(
        self, origin: float, targets: List[Tuple[float, float]]
    ) -> None:
        ...

    async def home_tip_motors(
        self,
        distance: float,
        velocity: float,
        back_off: bool = True,
    ) -> None:
        ...

    async def get_attached_instruments(
        self, expected: Mapping[OT3Mount, PipetteName]
    ) -> Mapping[OT3Mount, OT3AttachedInstruments]:
        """Get attached instruments.

        Args:
            expected: Which mounts are expected.

        Returns:
            A map of mount to pipette name.
        """
        ...

    async def get_limit_switches(self) -> OT3AxisMap[bool]:
        """Get the state of the gantry's limit switches on each axis."""
        ...

    async def set_active_current(self, axis_currents: OT3AxisMap[float]) -> None:
        """Set the active current.

        Args:
            axis_currents: Axes' currents

        Returns:
            None
        """
        ...

    @asynccontextmanager
    def motor_current(
        self,
        run_currents: Optional[OT3AxisMap[float]] = None,
        hold_currents: Optional[OT3AxisMap[float]] = None,
    ) -> AsyncIterator[None]:
        """Save the current."""
        ...

    @asynccontextmanager
    def restore_z_r_run_current(self) -> AsyncIterator[None]:
        """
        Temporarily restore the active current ONLY when homing or
        retracting the Z_R axis while the 96-channel is attached.
        """
        ...

    @asynccontextmanager
    def increase_z_l_hold_current(self) -> AsyncIterator[None]:
        """
        Temporarily increase the hold current when engaging the Z_L axis
        while the 96-channel is attached
        """
        ...

    async def watch(self, loop: asyncio.AbstractEventLoop) -> None:
        ...

    @property
    def axis_bounds(self) -> OT3AxisMap[Tuple[float, float]]:
        """Get the axis bounds."""
        ...

    @property
    def fw_version(self) -> Dict[SubSystem, int]:
        """Get the firmware version."""
        ...

    def axis_is_present(self, axis: Axis) -> bool:
        ...

    @property
    def update_required(self) -> bool:
        ...

    def update_firmware(
        self,
        subsystems: Set[SubSystem],
        force: bool = False,
    ) -> AsyncIterator[UpdateStatus]:
        """Updates the firmware on the OT3."""
        ...

    def engaged_axes(self) -> OT3AxisMap[bool]:
        """Get engaged axes."""
        ...

    async def update_engaged_axes(self) -> None:
        """Update engaged axes."""
        ...

    async def is_motor_engaged(self, axis: Axis) -> bool:
        """Check if axis is enabled."""
        ...

    async def disengage_axes(self, axes: List[Axis]) -> None:
        """Disengage axes."""
        ...

    async def engage_axes(self, axes: List[Axis]) -> None:
        """Engage axes."""
        ...

    async def set_lights(self, button: Optional[bool], rails: Optional[bool]) -> None:
        """Set the light states."""
        ...

    async def get_lights(self) -> Dict[str, bool]:
        """Get the light state."""
        ...

    def pause(self) -> None:
        """Pause the controller activity."""
        ...

    def resume(self) -> None:
        """Resume the controller activity."""
        ...

    async def halt(self) -> None:
        """Halt the motors."""
        ...

    async def probe(self, axis: Axis, distance: float) -> OT3AxisMap[float]:
        """Probe."""
        ...

    async def clean_up(self) -> None:
        """Clean up."""
        ...

    @staticmethod
    def home_position() -> OT3AxisMap[float]:
        ...

    async def capacitive_probe(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        sensor_threshold_pf: float,
        probe: InstrumentProbeType = InstrumentProbeType.PRIMARY,
    ) -> bool:
        ...

    async def capacitive_pass(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        probe: InstrumentProbeType,
    ) -> List[float]:
        ...

    @property
    def subsystems(self) -> Dict[SubSystem, SubSystemState]:
        ...

    async def get_tip_status(
        self, mount: OT3Mount, ht_operation_sensor: Optional[InstrumentProbeType] = None
    ) -> TipStateType:
        ...

    def current_tip_state(self, mount: OT3Mount) -> Optional[bool]:
        ...

    async def update_tip_detector(self, mount: OT3Mount, sensor_count: int) -> None:
        ...

    async def teardown_tip_detector(self, mount: OT3Mount) -> None:
        ...

    async def set_status_bar_state(self, state: StatusBarState) -> None:
        ...

    async def set_status_bar_enabled(self, enabled: bool) -> None:
        ...

    def get_status_bar_state(self) -> StatusBarState:
        ...

    @property
    def estop_status(self) -> EstopOverallStatus:
        ...

    def estop_acknowledge_and_clear(self) -> EstopOverallStatus:
        ...

    def get_estop_state(self) -> EstopState:
        ...

    def add_estop_callback(self, cb: HardwareEventHandler) -> HardwareEventUnsubscriber:
        ...

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
        ...

    async def set_hepa_fan_state(self, fan_on: bool, duty_cycle: int) -> bool:
        """Sets the state and duty cycle of the Hepa/UV module."""
        ...

    async def get_hepa_fan_state(self) -> Optional[HepaFanState]:
        ...

    async def set_hepa_uv_state(self, light_on: bool, uv_duration_s: int) -> bool:
        """Sets the state and duration (seconds) of the UV light for the Hepa/UV module."""
        ...

    async def get_hepa_uv_state(self) -> Optional[HepaUVState]:
        ...
