"""OT3 Hardware Controller Backend."""

from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
import logging
from typing import (
    Dict,
    List,
    Optional,
    Tuple,
    Sequence,
    AsyncIterator,
    cast,
    Set,
    Union,
    Mapping,
)

from opentrons.config.types import OT3Config, GantryLoad
from opentrons.config import gripper_config

from opentrons.hardware_control.module_control import AttachedModulesControl
from opentrons.hardware_control import modules
from opentrons.hardware_control.types import (
    BoardRevision,
    Axis,
    HepaFanState,
    HepaUVState,
    OT3Mount,
    OT3AxisMap,
    CurrentConfig,
    InstrumentProbeType,
    MotorStatus,
    UpdateStatus,
    UpdateState,
    SubSystem,
    SubSystemState,
    TipStateType,
    GripperJawState,
    HardwareFeatureFlags,
    StatusBarState,
    EstopOverallStatus,
    EstopState,
    EstopPhysicalStatus,
    HardwareEventHandler,
    HardwareEventUnsubscriber,
    PipetteSensorResponseQueue,
)

from opentrons_shared_data.pipette.types import PipetteName, PipetteModel
from opentrons_shared_data.pipette import (
    pipette_load_name_conversions as pipette_load_name,
    load_data as load_pipette_data,
)
from opentrons_shared_data.gripper.gripper_definition import GripperModel
from opentrons.hardware_control.dev_types import (
    PipetteSpec,
    GripperSpec,
    AttachedPipette,
    AttachedGripper,
    OT3AttachedInstruments,
)
from opentrons.util.async_helpers import ensure_yield
from .types import HWStopCondition
from .flex_protocol import (
    FlexBackend,
)

log = logging.getLogger(__name__)

AXIS_TO_SUBSYSTEM = {
    Axis.X: SubSystem.gantry_x,
    Axis.Y: SubSystem.gantry_y,
    Axis.Z_L: SubSystem.head,
    Axis.Z_R: SubSystem.head,
    Axis.Z_G: SubSystem.gripper,
    Axis.G: SubSystem.gripper,
    Axis.P_L: SubSystem.pipette_left,
    Axis.P_R: SubSystem.pipette_right,
}


def coalesce_move_segments(
    origin: Dict[Axis, float], targets: List[Dict[Axis, float]]
) -> Dict[Axis, float]:
    for target in targets:
        for axis, increment in target.items():
            origin[axis] += increment
    return origin


def axis_pad(positions: Dict[Axis, float], default_value: float) -> Dict[Axis, float]:
    return {ax: positions.get(ax, default_value) for ax in Axis.node_axes()}


class OT3Simulator(FlexBackend):
    """OT3 Hardware Controller Backend."""

    _position: Dict[Axis, float]
    _encoder_position: Dict[Axis, float]
    _motor_status: Dict[Axis, MotorStatus]
    _engaged_axes: Dict[Axis, bool]

    @classmethod
    async def build(
        cls,
        attached_instruments: Dict[OT3Mount, Dict[str, Optional[str]]],
        attached_modules: Dict[str, List[modules.SimulatingModule]],
        config: OT3Config,
        loop: asyncio.AbstractEventLoop,
        strict_attached_instruments: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> OT3Simulator:
        """Create the OT3Simulator instance.

        Args:
            config: Robot configuration

        Returns:
            Instance.
        """
        return cls(
            attached_instruments,
            attached_modules,
            config,
            loop,
            strict_attached_instruments,
            feature_flags,
        )

    def __init__(
        self,
        attached_instruments: Dict[OT3Mount, Dict[str, Optional[str]]],
        attached_modules: Dict[str, List[modules.SimulatingModule]],
        config: OT3Config,
        loop: asyncio.AbstractEventLoop,
        strict_attached_instruments: bool = True,
        feature_flags: Optional[HardwareFeatureFlags] = None,
    ) -> None:
        """Construct.

        Args:
            config: Robot configuration
            driver: The Can Driver
        """
        self._configuration = config
        self._loop = loop
        self._strict_attached = bool(strict_attached_instruments)
        self._stubbed_attached_modules = attached_modules
        self._update_required = False
        self._initialized = False
        self._lights = {"button": False, "rails": False}
        self._gear_motor_position: Dict[Axis, float] = {}
        self._engaged_axes: Dict[Axis, bool] = {}
        self._feature_flags = feature_flags or HardwareFeatureFlags()

        def _sanitize_attached_instrument(
            mount: OT3Mount, passed_ai: Optional[Dict[str, Optional[str]]] = None
        ) -> Union[PipetteSpec, GripperSpec]:
            if mount is OT3Mount.GRIPPER:
                gripper_spec: GripperSpec = {"model": None, "id": None}
                if passed_ai and passed_ai.get("model"):
                    gripper_spec["model"] = GripperModel.v1
                    gripper_spec["id"] = passed_ai.get("id")
                return gripper_spec

            # TODO (lc 12-5-2022) need to not always pass in defaults here
            # but doing it to satisfy linter errors for now.
            pipette_spec: PipetteSpec = {"model": None, "id": None}
            if not passed_ai or not passed_ai.get("model"):
                return pipette_spec

            if pipette_load_name.supported_pipette(
                cast(PipetteModel, passed_ai["model"])
            ):
                pipette_spec["model"] = cast(PipetteModel, passed_ai.get("model"))
                pipette_spec["id"] = passed_ai.get("id")
                return pipette_spec
            # TODO (lc 12-05-2022) When the time comes we should properly
            # support backwards compatibility
            raise KeyError(
                "If you specify attached_instruments, the model "
                "should be pipette names or pipette models, but "
                f'{passed_ai["model"]} is not'
            )

        self._attached_instruments = {
            m: _sanitize_attached_instrument(m, attached_instruments.get(m))
            for m in OT3Mount
        }
        self._module_controls: Optional[AttachedModulesControl] = None
        self._position = self._get_home_position()
        self._encoder_position = self._get_home_position()
        self._motor_status = {}
        axes = set((Axis.Z_L, Axis.Z_R, Axis.X, Axis.Y))
        if self._attached_instruments[OT3Mount.LEFT].get("model", None):
            axes.add(Axis.P_L)
        if self._attached_instruments[OT3Mount.RIGHT].get("model", None):
            axes.add(Axis.P_L)
        if self._attached_instruments.get(
            OT3Mount.GRIPPER
        ) and self._attached_instruments[OT3Mount.GRIPPER].get("model", None):
            axes.update((Axis.G, Axis.Z_G))
        self._present_axes = axes
        self._current_settings: Optional[OT3AxisMap[CurrentConfig]] = None
        self._sim_jaw_state = GripperJawState.HOMED_READY
        self._sim_tip_state: Dict[OT3Mount, Optional[bool]] = {
            mount: False if self._attached_instruments[mount] else None
            for mount in [OT3Mount.LEFT, OT3Mount.RIGHT]
        }
        self._sim_gantry_load = GantryLoad.LOW_THROUGHPUT
        self._sim_status_bar_state = StatusBarState.IDLE
        self._sim_estop_state = EstopState.DISENGAGED
        self._sim_estop_left_state = EstopPhysicalStatus.DISENGAGED
        self._sim_estop_right_state = EstopPhysicalStatus.DISENGAGED

    async def get_serial_number(self) -> Optional[str]:
        return "simulator"

    @asynccontextmanager
    async def restore_system_constraints(self) -> AsyncIterator[None]:
        log.debug("Simulating saving system constraints")
        try:
            yield
        finally:
            log.debug("Simulating restoring system constraints")

    def update_constraints_for_gantry_load(self, gantry_load: GantryLoad) -> None:
        self._sim_gantry_load = gantry_load

    def update_constraints_for_calibration_with_gantry_load(
        self,
        gantry_load: GantryLoad,
    ) -> None:
        self._sim_gantry_load = gantry_load

    def update_constraints_for_plunger_acceleration(
        self,
        mount: OT3Mount,
        acceleration: float,
        gantry_load: GantryLoad,
        high_speed_pipette: bool = False,
    ) -> None:
        self._sim_gantry_load = gantry_load

    @property
    def initialized(self) -> bool:
        """True when the hardware controller has initialized and is ready."""
        return self._initialized

    @initialized.setter
    def initialized(self, value: bool) -> None:
        self._initialized = value

    @property
    def gear_motor_position(self) -> Optional[float]:
        return self._gear_motor_position.get(Axis.Q, None)

    @property
    def board_revision(self) -> BoardRevision:
        """Get the board revision"""
        return BoardRevision.UNKNOWN

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

    @ensure_yield
    async def update_to_default_current_settings(self, gantry_load: GantryLoad) -> None:
        self._gantry_load = gantry_load

    def update_feature_flags(self, feature_flags: HardwareFeatureFlags) -> None:
        """Update the hardware feature flags used by the hardware controller."""
        self._feature_flags = feature_flags

    def _handle_motor_status_update(self, response: Dict[Axis, float]) -> None:
        self._position.update(response)
        self._encoder_position.update(response)
        self._motor_status.update(
            (node, MotorStatus(True, True)) for node in response.keys()
        )

    @ensure_yield
    async def update_motor_status(self) -> None:
        """Retreieve motor and encoder status and position from all present devices"""
        if not self._motor_status:
            # Simulate condition at boot, status would not be ok
            self._motor_status.update(
                (axis, MotorStatus(False, False)) for axis in self._present_axes
            )
        else:
            self._motor_status.update(
                (axis, MotorStatus(True, True)) for axis in self._present_axes
            )

    @ensure_yield
    async def update_motor_estimation(self, axes: Sequence[Axis]) -> None:
        """Update motor position estimation for commanded axes, and update cache of data."""
        # Simulate conditions as if there are no stalls, aka do nothing
        return None

    def _get_motor_status(
        self, axes: Sequence[Axis]
    ) -> Dict[Axis, Optional[MotorStatus]]:
        return {ax: self._motor_status.get(ax) for ax in axes}

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
        return axis_pad(self._position, 0.0)

    async def update_encoder_position(self) -> OT3AxisMap[float]:
        """Get the encoder current position."""
        return axis_pad(self._encoder_position, 0.0)

    @ensure_yield
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
        z_axis = Axis.by_mount(mount)
        pos = self._position
        self._position.update(pos)
        self._encoder_position.update(pos)
        return self._position[z_axis]

    @ensure_yield
    async def move(
        self,
        origin: Dict[Axis, float],
        target: Dict[Axis, float],
        speed: Optional[float] = None,
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
        for ax in origin:
            self._engaged_axes[ax] = True
        self._position.update(target)
        self._encoder_position.update(target)

    @ensure_yield
    async def home(
        self, axes: Sequence[Axis], gantry_load: GantryLoad
    ) -> OT3AxisMap[float]:
        """Home axes.

        Args:
            axes: Optional list of axes.

        Returns:
            Homed position.
        """
        if axes:
            homed = axes
        else:
            homed = list(iter(self._position.keys()))
        for h in homed:
            self._position[h] = self._get_home_position()[h]
            self._motor_status[h] = MotorStatus(True, True)
            self._engaged_axes[h] = True
        return axis_pad(self._position, 0.0)

    @ensure_yield
    async def gripper_grip_jaw(
        self,
        duty_cycle: float,
        expected_displacement: float,
        stop_condition: HWStopCondition = HWStopCondition.none,
        stay_engaged: bool = True,
    ) -> None:
        """Move gripper inward."""
        self._sim_jaw_state = GripperJawState.GRIPPING
        self._encoder_position[Axis.G] = expected_displacement

    @ensure_yield
    async def gripper_home_jaw(self, duty_cycle: float) -> None:
        """Move gripper outward."""
        self._motor_status[Axis.G] = MotorStatus(True, True)
        self._encoder_position[Axis.G] = self._get_home_position()[Axis.G]
        self._sim_jaw_state = GripperJawState.HOMED_READY

    @ensure_yield
    async def gripper_hold_jaw(
        self,
        encoder_position_um: int,
    ) -> None:
        self._encoder_position[Axis.G] = encoder_position_um / 1000.0
        self._sim_jaw_state = GripperJawState.HOLDING

    async def get_jaw_state(self) -> GripperJawState:
        """Get the state of the gripper jaw."""
        return self._sim_jaw_state

    async def tip_action(
        self, origin: float, targets: List[Tuple[float, float]]
    ) -> None:
        self._gear_motor_position.update(
            coalesce_move_segments(
                {Axis.Q: origin}, [{Axis.Q: target[0]} for target in targets]
            )
        )
        await asyncio.sleep(0)

    async def home_tip_motors(
        self,
        distance: float,
        velocity: float,
        back_off: bool = True,
    ) -> None:
        pass

    def _attached_to_mount(
        self, mount: OT3Mount, expected_instr: Optional[PipetteName]
    ) -> OT3AttachedInstruments:
        init_instr = self._attached_instruments.get(mount, {"model": None, "id": None})
        if mount is OT3Mount.GRIPPER:
            return self._attached_gripper_to_mount(cast(GripperSpec, init_instr))
        return self._attached_pipette_to_mount(
            mount, cast(PipetteSpec, init_instr), expected_instr
        )

    def _attached_gripper_to_mount(self, init_instr: GripperSpec) -> AttachedGripper:
        found_model = init_instr["model"]
        if found_model:
            return {
                "config": gripper_config.load(GripperModel.v1),
                "id": init_instr["id"],
            }
        else:
            return {"config": None, "id": None}

    def _attached_pipette_to_mount(
        self,
        mount: OT3Mount,
        init_instr: PipetteSpec,
        expected_instr: Optional[PipetteName],
    ) -> AttachedPipette:
        found_model = init_instr["model"]

        # TODO (lc 12-05-2022) When the time comes, we should think about supporting
        # backwards compatability -- hopefully not relying on config keys only,
        # but TBD.
        if expected_instr and not pipette_load_name.supported_pipette(
            cast(PipetteModel, expected_instr)
        ):
            raise RuntimeError(
                f"mount {mount.name} requested a {expected_instr} which is not supported on the OT3"
            )
        if found_model and expected_instr and (expected_instr not in found_model):
            if self._strict_attached:
                raise RuntimeError(
                    "mount {}: expected instrument {} but got {}".format(
                        mount.name, expected_instr, found_model
                    )
                )
            else:
                converted_name = pipette_load_name.convert_pipette_name(expected_instr)
                return {
                    "config": load_pipette_data.load_definition(
                        converted_name.pipette_type,
                        converted_name.pipette_channels,
                        converted_name.pipette_version,
                        converted_name.oem_type,
                    ),
                    "id": None,
                }
        if found_model and init_instr["id"] is not None:
            # Instrument detected matches instrument expected (note:
            # "instrument detected" means passed as an argument to the
            # constructor of this class)

            # OR Instrument detected and no expected instrument specified

            found_model_version = ""
            if found_model.find("flex") > -1:
                found_model = found_model.replace("_flex", "")  # type: ignore
                found_model_version = f"{init_instr['id'][4]}.{init_instr['id'][5]}"
            converted_name = pipette_load_name.convert_pipette_model(
                found_model, found_model_version
            )
            return {
                "config": load_pipette_data.load_definition(
                    converted_name.pipette_type,
                    converted_name.pipette_channels,
                    converted_name.pipette_version,
                    converted_name.oem_type,
                ),
                "id": init_instr["id"],
            }
        elif expected_instr:
            # Expected instrument specified and no instrument detected
            converted_name = pipette_load_name.convert_pipette_name(expected_instr)
            return {
                "config": load_pipette_data.load_definition(
                    converted_name.pipette_type,
                    converted_name.pipette_channels,
                    converted_name.pipette_version,
                    converted_name.oem_type,
                ),
                "id": None,
            }
        else:
            # No instrument detected or expected
            return {"config": None, "id": None}

    @ensure_yield
    async def get_attached_instruments(
        self, expected: Mapping[OT3Mount, Optional[PipetteName]]
    ) -> Mapping[OT3Mount, OT3AttachedInstruments]:
        """Get attached instruments.

        Args:
            expected: Which mounts are expected.

        Returns:
            A map of mount to pipette name.
        """
        return {
            mount: self._attached_to_mount(mount, expected.get(mount))
            for mount in OT3Mount
        }

    @ensure_yield
    async def get_limit_switches(self) -> OT3AxisMap[bool]:
        """Get the state of the gantry's limit switches on each axis."""
        return {}

    @ensure_yield
    async def set_active_current(self, axis_currents: OT3AxisMap[float]) -> None:
        """Set the active current.

        Args:
            axis_currents: Axes' currents

        Returns:
            None
        """
        return None

    @asynccontextmanager
    async def motor_current(
        self,
        run_currents: Optional[OT3AxisMap[float]] = None,
        hold_currents: Optional[OT3AxisMap[float]] = None,
    ) -> AsyncIterator[None]:
        """Save the current."""
        yield

    @asynccontextmanager
    async def restore_z_r_run_current(self) -> AsyncIterator[None]:
        """
        Temporarily restore the active current ONLY when homing or
        retracting the Z_R axis while the 96-channel is attached.
        """
        yield

    @asynccontextmanager
    async def increase_z_l_hold_current(self) -> AsyncIterator[None]:
        """
        Temporarily increase the hold current when engaging the Z_L axis
        while the 96-channel is attached
        """
        yield

    @ensure_yield
    async def watch(self, loop: asyncio.AbstractEventLoop) -> None:
        new_mods_at_ports = []
        for mod_name, list_of_modules in self._stubbed_attached_modules.items():
            for module_details in list_of_modules:
                new_mods_at_ports.append(
                    modules.SimulatingModuleAtPort(
                        port=f"/dev/ot_module_sim_{mod_name}{str(module_details.serial_number)}",
                        name=mod_name,
                        serial_number=module_details.serial_number,
                        model=module_details.model,
                    )
                )
        await self.module_controls.register_modules(new_mods_at_ports=new_mods_at_ports)

    @property
    def axis_bounds(self) -> OT3AxisMap[Tuple[float, float]]:
        """Get the axis bounds."""
        # TODO (AL, 2021-11-18): The bounds need to be defined
        phony_bounds = (0, 10000)
        return {
            Axis.Z_R: phony_bounds,
            Axis.Z_L: phony_bounds,
            Axis.P_L: phony_bounds,
            Axis.P_R: phony_bounds,
            Axis.Y: phony_bounds,
            Axis.X: phony_bounds,
            Axis.Z_G: phony_bounds,
            Axis.Q: phony_bounds,
        }

    @property
    def fw_version(self) -> Dict[SubSystem, int]:
        """Get the firmware version."""
        return {AXIS_TO_SUBSYSTEM[axis]: 0 for axis in self._present_axes}

    def axis_is_present(self, axis: Axis) -> bool:
        return axis in self._present_axes

    @property
    def update_required(self) -> bool:
        return self._update_required

    @update_required.setter
    def update_required(self, value: bool) -> None:
        if value != self._update_required:
            log.info(f"Firmware Update Flag set {self._update_required} -> {value}")
            self._update_required = value

    async def update_firmware(
        self,
        subsystems: Set[SubSystem],
        force: bool = False,
    ) -> AsyncIterator[UpdateStatus]:
        """Updates the firmware on the OT3."""
        for subsystem in subsystems:
            yield UpdateStatus(
                subsystem=subsystem, state=UpdateState.done, progress=100
            )

    def engaged_axes(self) -> OT3AxisMap[bool]:
        """Get engaged axes."""
        return self._engaged_axes

    async def update_engaged_axes(self) -> None:
        """Update engaged axes."""
        return None

    async def is_motor_engaged(self, axis: Axis) -> bool:
        if axis not in self._engaged_axes.keys():
            return False
        return self._engaged_axes[axis]

    @ensure_yield
    async def disengage_axes(self, axes: List[Axis]) -> None:
        """Disengage axes."""
        for ax in axes:
            self._engaged_axes.update({ax: False})
        return None

    @ensure_yield
    async def engage_axes(self, axes: List[Axis]) -> None:
        """Engage axes."""
        for ax in axes:
            self._engaged_axes.update({ax: True})
        return None

    @ensure_yield
    async def set_lights(self, button: Optional[bool], rails: Optional[bool]) -> None:
        """Set the light states."""
        # Simulate how the real driver does this - there's no button so it's always false
        if rails is not None:
            self._lights["rails"] = rails

    @ensure_yield
    async def get_lights(self) -> Dict[str, bool]:
        """Get the light state."""
        return self._lights

    def pause(self) -> None:
        """Pause the controller activity."""
        return None

    def resume(self) -> None:
        """Resume the controller activity."""
        return None

    @ensure_yield
    async def halt(self) -> None:
        """Halt the motors."""
        return None

    @ensure_yield
    async def probe(self, axis: Axis, distance: float) -> OT3AxisMap[float]:
        """Probe."""
        return {}

    @ensure_yield
    async def clean_up(self) -> None:
        """Clean up."""
        pass

    @staticmethod
    def _get_home_position() -> Dict[Axis, float]:
        return {
            Axis.Z_L: 0,
            Axis.Z_R: 0,
            Axis.X: 0,
            Axis.Y: 0,
            Axis.P_L: 0,
            Axis.P_R: 0,
            Axis.Z_G: 0,
            Axis.G: 0,
        }

    @staticmethod
    def home_position() -> OT3AxisMap[float]:
        return OT3Simulator._get_home_position()

    @ensure_yield
    async def capacitive_probe(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        sensor_threshold_pf: float,
        probe: InstrumentProbeType = InstrumentProbeType.PRIMARY,
    ) -> bool:
        self._position[moving] += distance_mm
        return True

    @ensure_yield
    async def capacitive_pass(
        self,
        mount: OT3Mount,
        moving: Axis,
        distance_mm: float,
        speed_mm_per_s: float,
        probe: InstrumentProbeType,
    ) -> List[float]:
        self._position[moving] += distance_mm
        return []

    @property
    def subsystems(self) -> Dict[SubSystem, SubSystemState]:
        return {
            AXIS_TO_SUBSYSTEM[axis]: SubSystemState(
                ok=True,
                current_fw_version=1,
                next_fw_version=1,
                fw_update_needed=False,
                current_fw_sha="simulated",
                pcba_revision="A1",
                update_state=None,
            )
            for axis in self._present_axes
        }

    async def get_tip_status(
        self,
        mount: OT3Mount,
        follow_singular_sensor: Optional[InstrumentProbeType] = None,
    ) -> TipStateType:
        return TipStateType(self._sim_tip_state[mount])

    def current_tip_state(self, mount: OT3Mount) -> Optional[bool]:
        return self._sim_tip_state[mount]

    async def update_tip_detector(self, mount: OT3Mount, sensor_count: int) -> None:
        pass

    async def teardown_tip_detector(self, mount: OT3Mount) -> None:
        pass

    async def set_status_bar_state(self, state: StatusBarState) -> None:
        self._sim_status_bar_state = state
        await asyncio.sleep(0)

    async def set_status_bar_enabled(self, enabled: bool) -> None:
        await asyncio.sleep(0)

    def get_status_bar_state(self) -> StatusBarState:
        return self._sim_status_bar_state

    @property
    def estop_status(self) -> EstopOverallStatus:
        return EstopOverallStatus(
            state=self._sim_estop_state,
            left_physical_state=self._sim_estop_left_state,
            right_physical_state=self._sim_estop_right_state,
        )

    def estop_acknowledge_and_clear(self) -> EstopOverallStatus:
        """Attempt to acknowledge an Estop event and clear the status.

        Returns the estop status after clearing the status."""
        self._sim_estop_state = EstopState.DISENGAGED
        self._sim_estop_left_state = EstopPhysicalStatus.DISENGAGED
        self._sim_estop_right_state = EstopPhysicalStatus.DISENGAGED
        return self.estop_status

    def get_estop_state(self) -> EstopState:
        return self._sim_estop_state

    def add_estop_callback(self, cb: HardwareEventHandler) -> HardwareEventUnsubscriber:
        return lambda: None

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
        # This is a (pretty bad) simulation of the gripper actually gripping something,
        # but it should work.
        self._encoder_position[Axis.G] = (hard_limit_upper - jaw_width) / 2

    async def set_hepa_fan_state(self, fan_on: bool, duty_cycle: int) -> bool:
        return False

    async def get_hepa_fan_state(self) -> Optional[HepaFanState]:
        return None

    async def set_hepa_uv_state(self, light_on: bool, timeout_s: int) -> bool:
        return False

    async def get_hepa_uv_state(self) -> Optional[HepaUVState]:
        return None

    def _update_tip_state(self, mount: OT3Mount, status: bool) -> None:
        """This is something we only use in the simulator.
        It is required so that PE simulations using ot3api don't break."""
        self._sim_tip_state[mount] = status
