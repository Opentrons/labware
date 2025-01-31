"""Shared utilities for ot3 hardware control."""
from typing import Dict, Iterable, List, Set, Tuple, TypeVar, cast, Sequence, Optional
from typing_extensions import Literal
from logging import getLogger
from opentrons.config.defaults_ot3 import (
    DEFAULT_CALIBRATION_AXIS_MAX_SPEED,
    DEFAULT_EMULSIFYING_PIPETTE_AXIS_MAX_SPEED,
)
from opentrons.config.types import OT3MotionSettings, OT3CurrentSettings, GantryLoad
from opentrons.hardware_control.types import (
    Axis,
    OT3AxisKind,
    OT3AxisMap,
    CurrentConfig,
    SubSystem,
    OT3Mount,
    InstrumentProbeType,
    PipetteSubType,
    UpdateState,
    UpdateStatus,
    GripperJawState,
)
import numpy as np

from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    FirmwareTarget,
    PipetteType,
    SensorId,
    PipetteTipActionType,
    USBTarget,
    GripperJawState as FirmwareGripperjawState,
)
from opentrons_hardware.firmware_update.types import FirmwareUpdateStatus, StatusElement
from opentrons_hardware.hardware_control import network
from opentrons_hardware.hardware_control.motion_planning import (
    AxisConstraints,
    SystemConstraints,
    Coordinates,
    Move,
    CoordinateValue,
)
from opentrons_hardware.hardware_control.tool_sensors import (
    InstrumentProbeTarget,
    PipetteProbeTarget,
)
from opentrons_hardware.hardware_control.motion_planning.move_utils import (
    unit_vector_multiplication,
)
from opentrons_hardware.hardware_control.motion import (
    create_step,
    NodeIdMotionValues,
    create_home_step,
    create_backoff_step,
    create_tip_action_backoff_step,
    MoveGroup,
    MoveType,
    MoveStopCondition,
    create_gripper_jaw_step,
    create_tip_action_step,
)
from opentrons_hardware.hardware_control.constants import interrupts_per_sec

GRIPPER_JAW_HOME_TIME: float = 10
GRIPPER_JAW_GRIP_TIME: float = 10

LIMIT_SWITCH_OVERTRAVEL_DISTANCE: float = 1

PipetteAction = Literal["clamp", "home"]

# TODO: These methods exist to defer uses of NodeId to inside
# method bodies, which won't be evaluated until called. This is needed
# because the robot server doesn't have opentrons_ot3_firmware as a dep
# which is where they're defined, and therefore you can't have references
# to NodeId that are interpreted at import time because then the robot
# server tests fail when importing hardware controller. This is obviously
# terrible and needs to be fixed.

SUBSYSTEM_NODEID: Dict[SubSystem, NodeId] = {
    SubSystem.gantry_x: NodeId.gantry_x,
    SubSystem.gantry_y: NodeId.gantry_y,
    SubSystem.head: NodeId.head,
    SubSystem.pipette_left: NodeId.pipette_left,
    SubSystem.pipette_right: NodeId.pipette_right,
    SubSystem.gripper: NodeId.gripper,
    SubSystem.hepa_uv: NodeId.hepa_uv,
}

NODEID_SUBSYSTEM = {node: subsystem for subsystem, node in SUBSYSTEM_NODEID.items()}

SUBSYSTEM_USB: Dict[SubSystem, USBTarget] = {SubSystem.rear_panel: USBTarget.rear_panel}

USB_SUBSYSTEM = {target: subsystem for subsystem, target in SUBSYSTEM_USB.items()}

LOG = getLogger(__name__)


def axis_nodes() -> List["NodeId"]:
    return [
        NodeId.gantry_x,
        NodeId.gantry_y,
        NodeId.head_l,
        NodeId.head_r,
        NodeId.pipette_left,
        NodeId.pipette_right,
        NodeId.gripper_z,
        NodeId.gripper_g,
    ]


def node_axes() -> List[Axis]:
    return Axis.node_axes()


def home_axes() -> List[Axis]:
    return [
        Axis.P_L,
        Axis.P_R,
        Axis.G,
        Axis.Z_L,
        Axis.Z_R,
        Axis.Z_G,
        Axis.X,
        Axis.Y,
    ]


def axis_to_node(axis: Axis) -> "NodeId":
    anm = {
        Axis.X: NodeId.gantry_x,
        Axis.Y: NodeId.gantry_y,
        Axis.Z_L: NodeId.head_l,
        Axis.Z_R: NodeId.head_r,
        Axis.P_L: NodeId.pipette_left,
        Axis.P_R: NodeId.pipette_right,
        Axis.Z_G: NodeId.gripper_z,
        Axis.G: NodeId.gripper_g,
        Axis.Q: NodeId.pipette_left,
    }
    return anm[axis]


def node_to_axis(node: "NodeId") -> Axis:
    nam = {
        NodeId.gantry_x: Axis.X,
        NodeId.gantry_y: Axis.Y,
        NodeId.head_l: Axis.Z_L,
        NodeId.head_r: Axis.Z_R,
        NodeId.pipette_left: Axis.P_L,
        NodeId.pipette_right: Axis.P_R,
        NodeId.gripper_z: Axis.Z_G,
        NodeId.gripper_g: Axis.G,
    }
    return nam[node]


def node_is_axis(node: "NodeId") -> bool:
    try:
        node_to_axis(node)
        return True
    except KeyError:
        return False


def axis_is_node(axis: Axis) -> bool:
    try:
        axis_to_node(axis)
        return True
    except KeyError:
        return False


def sub_system_to_nodeid(sub_sys: SubSystem) -> "NodeId":
    """Convert a sub system to a NodeId."""
    return SUBSYSTEM_NODEID[sub_sys]


def node_id_to_subsystem(node_id: NodeId) -> "SubSystem":
    """Convert a NodeId to a Subsystem"""
    return NODEID_SUBSYSTEM[node_id.application_for()]


def usb_to_subsystem(target: USBTarget) -> SubSystem:
    return USB_SUBSYSTEM[target]


def subsystem_to_usb(subsystem: SubSystem) -> USBTarget:
    return SUBSYSTEM_USB[subsystem]


def target_to_subsystem(target: FirmwareTarget) -> SubSystem:
    if isinstance(target, USBTarget):
        return usb_to_subsystem(target)
    elif isinstance(target, NodeId):
        return node_id_to_subsystem(target)
    else:
        raise KeyError(target)


def subsystem_to_target(subsystem: SubSystem) -> FirmwareTarget:
    try:
        return sub_system_to_nodeid(subsystem)
    except KeyError:
        return subsystem_to_usb(subsystem)


def get_current_settings(
    config: OT3CurrentSettings,
    gantry_load: GantryLoad,
) -> OT3AxisMap[CurrentConfig]:
    conf_by_pip = config.by_gantry_load(gantry_load)
    currents = {}
    for axis_kind in conf_by_pip["hold_current"].keys():
        for axis in Axis.of_kind(axis_kind):
            currents[axis] = CurrentConfig(
                hold_current=conf_by_pip["hold_current"][axis_kind],
                run_current=conf_by_pip["run_current"][axis_kind],
            )
    if gantry_load == GantryLoad.HIGH_THROUGHPUT:
        # In high-throughput configuration, the right mount doesn't do anything: the
        # lead screw nut is disconnected from the carriage, and it just hangs out
        # up at the top of the axis. We should therefore not give it a lot of current.
        # TODO: think of a better way to do this
        lt_config = config.by_gantry_load(GantryLoad.LOW_THROUGHPUT)
        currents[Axis.Z_R] = CurrentConfig(
            hold_current=lt_config["hold_current"][OT3AxisKind.Z],
            # not a typo: keep that current low
            run_current=lt_config["hold_current"][OT3AxisKind.Z],
        )
    return currents


def get_system_constraints(
    config: OT3MotionSettings,
    gantry_load: GantryLoad,
) -> "SystemConstraints[Axis]":
    conf_by_pip = config.by_gantry_load(gantry_load)
    constraints = {}
    axis_kind_list = [
        OT3AxisKind.P,
        OT3AxisKind.X,
        OT3AxisKind.Y,
        OT3AxisKind.Z,
        OT3AxisKind.Z_G,
    ]
    if gantry_load == GantryLoad.HIGH_THROUGHPUT:
        axis_kind_list.append(OT3AxisKind.Q)
    for axis_kind in axis_kind_list:
        for axis in Axis.of_kind(axis_kind):
            constraints[axis] = AxisConstraints.build(
                conf_by_pip["acceleration"][axis_kind],
                conf_by_pip["max_speed_discontinuity"][axis_kind],
                conf_by_pip["direction_change_speed_discontinuity"][axis_kind],
                conf_by_pip["default_max_speed"][axis_kind],
            )
    return constraints


def get_system_constraints_for_calibration(
    config: OT3MotionSettings,
    gantry_load: GantryLoad,
) -> "SystemConstraints[Axis]":
    conf_by_pip = config.by_gantry_load(gantry_load)
    constraints = {}
    for axis_kind in [
        OT3AxisKind.P,
        OT3AxisKind.X,
        OT3AxisKind.Y,
        OT3AxisKind.Z,
        OT3AxisKind.Z_G,
    ]:
        for axis in Axis.of_kind(axis_kind):
            constraints[axis] = AxisConstraints.build(
                conf_by_pip["acceleration"][axis_kind],
                conf_by_pip["max_speed_discontinuity"][axis_kind],
                conf_by_pip["direction_change_speed_discontinuity"][axis_kind],
                DEFAULT_CALIBRATION_AXIS_MAX_SPEED,
            )
    return constraints


def get_system_constraints_for_plunger_acceleration(
    config: OT3MotionSettings,
    gantry_load: GantryLoad,
    mount: OT3Mount,
    acceleration: float,
    high_speed_pipette: bool = False,
) -> "SystemConstraints[Axis]":
    old_constraints = config.by_gantry_load(gantry_load)
    new_constraints = {}
    axis_kinds = set([k for _, v in old_constraints.items() for k in v.keys()])

    def _get_axis_max_speed(ax: Axis) -> float:
        if ax == Axis.of_main_tool_actuator(mount) and high_speed_pipette:
            _max_speed = float(DEFAULT_EMULSIFYING_PIPETTE_AXIS_MAX_SPEED)
        else:
            _max_speed = old_constraints["default_max_speed"][axis_kind]
        return _max_speed

    for axis_kind in axis_kinds:
        for axis in Axis.of_kind(axis_kind):
            _default_max_speed = _get_axis_max_speed(axis)
            if axis == Axis.of_main_tool_actuator(mount):
                _accel = acceleration
            else:
                _accel = old_constraints["acceleration"][axis_kind]
            new_constraints[axis] = AxisConstraints.build(
                _accel,
                old_constraints["max_speed_discontinuity"][axis_kind],
                old_constraints["direction_change_speed_discontinuity"][axis_kind],
                _default_max_speed,
            )
    return new_constraints


def get_system_constraints_for_emulsifying_pipette(
    config: OT3MotionSettings,
    gantry_load: GantryLoad,
    mount: OT3Mount,
) -> "SystemConstraints[Axis]":
    old_constraints = config.by_gantry_load(gantry_load)
    new_constraints = {}
    axis_kinds = set([k for _, v in old_constraints.items() for k in v.keys()])
    for axis_kind in axis_kinds:
        for axis in Axis.of_kind(axis_kind):
            if axis == Axis.of_main_tool_actuator(mount):
                _max_speed = float(DEFAULT_EMULSIFYING_PIPETTE_AXIS_MAX_SPEED)
            else:
                _max_speed = old_constraints["default_max_speed"][axis_kind]
            new_constraints[axis] = AxisConstraints.build(
                max_acceleration=old_constraints["acceleration"][axis_kind],
                max_speed_discont=old_constraints["max_speed_discontinuity"][axis_kind],
                max_direction_change_speed_discont=old_constraints[
                    "direction_change_speed_discontinuity"
                ][axis_kind],
                max_speed=_max_speed,
            )
    return new_constraints


def _convert_to_node_id_dict(
    axis_pos: Coordinates[Axis, CoordinateValue],
) -> NodeIdMotionValues:
    target: NodeIdMotionValues = {}
    for axis, pos in axis_pos.items():
        if axis_is_node(axis):
            target[axis_to_node(axis)] = np.float64(pos)
    return target


def replace_head_node(targets: Set[FirmwareTarget]) -> Set[FirmwareTarget]:
    """Replace the head core node with its two sides.

    The node ID for the head central controller is what shows up in a network probe,
    but what we actually send commands to an overwhelming majority of the time is
    the head_l and head_r synthetic node IDs, and those are what we want in the
    network map.
    """
    if NodeId.head in targets:
        targets.remove(NodeId.head)
        targets.add(NodeId.head_r)
        targets.add(NodeId.head_l)
    return targets


def replace_gripper_node(targets: Set[FirmwareTarget]) -> Set[FirmwareTarget]:
    """Replace the gripper core node with its two axes.

    The node ID for the gripper controller is what shows up in a network probe,
    but what we actually send most commands to is the gripper_z and gripper_g
    synthetic nodes, so we should have them in the network map instead.
    """
    if NodeId.gripper in targets:
        targets.remove(NodeId.gripper)
        targets.add(NodeId.gripper_z)
        targets.add(NodeId.gripper_g)
    return targets


def motor_nodes(devices: Set[FirmwareTarget]) -> Set[NodeId]:
    # do the replacement of head and gripper devices
    motor_nodes = replace_gripper_node(devices)
    motor_nodes = replace_head_node(motor_nodes)
    bootloader_nodes = {
        NodeId.pipette_left_bootloader,
        NodeId.pipette_right_bootloader,
        NodeId.gantry_x_bootloader,
        NodeId.gantry_y_bootloader,
        NodeId.head_bootloader,
        NodeId.gripper_bootloader,
    }
    hepa_uv_nodes = {
        NodeId.hepa_uv,
        NodeId.hepa_uv_bootloader,
    }
    # remove any bootloader nodes
    motor_nodes -= bootloader_nodes
    motor_nodes -= hepa_uv_nodes
    # filter out usb nodes
    return {NodeId(target) for target in motor_nodes if target in NodeId}


def create_move_group(
    origin: Coordinates[Axis, CoordinateValue],
    moves: List[Move[Axis]],
    present_nodes: Iterable[NodeId],
    stop_condition: MoveStopCondition = MoveStopCondition.none,
) -> Tuple[MoveGroup, Dict[NodeId, float]]:
    pos = _convert_to_node_id_dict(origin)
    move_group: MoveGroup = []
    for move in moves:
        unit_vector = move.unit_vector
        for block in move.blocks:
            if block.time < (3.0 / interrupts_per_sec):
                LOG.info(
                    f"Skipping move block with time {block.time} (<{3.0/interrupts_per_sec})"
                )
                continue
            distances = unit_vector_multiplication(unit_vector, block.distance)
            node_id_distances = _convert_to_node_id_dict(distances)
            velocities = unit_vector_multiplication(unit_vector, block.initial_speed)
            accelerations = unit_vector_multiplication(unit_vector, block.acceleration)
            step = create_step(
                distance=node_id_distances,
                velocity=_convert_to_node_id_dict(velocities),
                acceleration=_convert_to_node_id_dict(accelerations),
                duration=block.time,
                present_nodes=present_nodes,
                stop_condition=stop_condition,
            )
            for ax in pos.keys():
                pos[ax] += node_id_distances.get(ax, 0)
            move_group.append(step)
    return move_group, {k: float(v) for k, v in pos.items()}


def create_home_groups(
    distance: Dict[Axis, float], velocity: Dict[Axis, float]
) -> List[MoveGroup]:
    node_id_distances = _convert_to_node_id_dict(distance)
    node_id_velocities = _convert_to_node_id_dict(velocity)
    home_group = [
        create_home_step(distance=node_id_distances, velocity=node_id_velocities)
    ]
    # halve the homing speed for backoff
    backoff_velocities = {k: v / 2 for k, v in node_id_velocities.items()}
    backoff_group = [create_backoff_step(backoff_velocities)]
    return [home_group, backoff_group]


def create_tip_action_group(
    moves: Sequence[Move[Axis]],
    present_nodes: Iterable[NodeId],
    action: str,
) -> MoveGroup:
    move_group: MoveGroup = []
    for move in moves:
        unit_vector = move.unit_vector
        for block in move.blocks:
            if block.time < (3.0 / interrupts_per_sec):
                continue
            velocities = unit_vector_multiplication(unit_vector, block.initial_speed)
            accelerations = unit_vector_multiplication(unit_vector, block.acceleration)
            step = create_tip_action_step(
                velocity=_convert_to_node_id_dict(velocities),
                acceleration=_convert_to_node_id_dict(accelerations),
                duration=block.time,
                present_nodes=present_nodes,
                action=PipetteTipActionType[action],
            )
            move_group.append(step)
    return move_group


def create_tip_motor_home_group(
    distance: float,
    velocity: float,
    backoff: Optional[bool] = False,
) -> MoveGroup:
    move_group: MoveGroup = []
    home_step = create_tip_action_step(
        velocity={NodeId.pipette_left: np.float64(-1 * velocity)},
        acceleration={NodeId.pipette_left: np.float64(0)},
        duration=np.float64(distance / velocity),
        present_nodes=[NodeId.pipette_left],
        action=PipetteTipActionType.home,
    )
    move_group.append(home_step)

    if backoff:
        backoff_group = create_tip_action_backoff_step(
            velocity={
                node_id: np.float64(velocity / 2) for node_id in [NodeId.pipette_left]
            }
        )
        move_group.append(backoff_group)
    return move_group


def create_gripper_jaw_grip_group(
    duty_cycle: float,
    stop_condition: MoveStopCondition = MoveStopCondition.none,
    stay_engaged: bool = True,
) -> MoveGroup:
    step = create_gripper_jaw_step(
        duration=np.float64(GRIPPER_JAW_GRIP_TIME),
        duty_cycle=np.float32(round(duty_cycle)),
        stop_condition=stop_condition,
        move_type=MoveType.grip,
        stay_engaged=stay_engaged,
    )
    move_group: MoveGroup = [step]
    return move_group


def create_gripper_jaw_home_group(dc: float) -> MoveGroup:
    step = create_gripper_jaw_step(
        duration=np.float64(GRIPPER_JAW_HOME_TIME),
        duty_cycle=np.float32(dc),
        stop_condition=MoveStopCondition.limit_switch,
        move_type=MoveType.home,
    )
    move_group: MoveGroup = [step]
    return move_group


def create_gripper_jaw_hold_group(encoder_position_um: int) -> MoveGroup:
    step = create_gripper_jaw_step(
        duration=np.float64(GRIPPER_JAW_GRIP_TIME),
        duty_cycle=np.float32(0),
        encoder_position_um=np.int32(encoder_position_um),
        stop_condition=MoveStopCondition.encoder_position,
        move_type=MoveType.linear,
    )
    move_group: MoveGroup = [step]
    return move_group


def moving_pipettes_in_move_group(
    all_nodes: Set[NodeId], moving_nodes: Set[NodeId]
) -> List[NodeId]:
    """Utility function to get which pipette nodes are moving either in z or their plunger."""
    pipettes_moving: List[NodeId] = [
        k for k in moving_nodes if k in [NodeId.pipette_left, NodeId.pipette_right]
    ]
    if NodeId.head_l in moving_nodes and NodeId.pipette_left in all_nodes:
        pipettes_moving.append(NodeId.pipette_left)
    if NodeId.head_r in moving_nodes and NodeId.pipette_right in all_nodes:
        pipettes_moving.append(NodeId.pipette_right)
    return pipettes_moving


AxisMapPayload = TypeVar("AxisMapPayload")


def axis_convert(
    axis_map: Dict["NodeId", AxisMapPayload], default_value: AxisMapPayload
) -> OT3AxisMap[AxisMapPayload]:
    ret: OT3AxisMap[AxisMapPayload] = {k: default_value for k in node_axes()}
    for node, value in axis_map.items():
        if node_is_axis(node):
            ret[node_to_axis(node)] = value
    return ret


_sensor_node_lookup: Dict[OT3Mount, InstrumentProbeTarget] = {
    OT3Mount.LEFT: NodeId.pipette_left,
    OT3Mount.RIGHT: NodeId.pipette_right,
    OT3Mount.GRIPPER: NodeId.gripper,
}

_sensor_node_lookup_pipettes_only: Dict[OT3Mount, PipetteProbeTarget] = {
    OT3Mount.LEFT: NodeId.pipette_left,
    OT3Mount.RIGHT: NodeId.pipette_right,
}


def sensor_node_for_mount(mount: OT3Mount) -> InstrumentProbeTarget:
    return _sensor_node_lookup[mount]


def sensor_node_for_pipette(mount: OT3Mount) -> PipetteProbeTarget:
    return _sensor_node_lookup_pipettes_only[mount]


_instr_sensor_id_lookup: Dict[InstrumentProbeType, SensorId] = {
    InstrumentProbeType.PRIMARY: SensorId.S0,
    InstrumentProbeType.SECONDARY: SensorId.S1,
    InstrumentProbeType.BOTH: SensorId.BOTH,
}


def sensor_id_for_instrument(probe: InstrumentProbeType) -> SensorId:
    return _instr_sensor_id_lookup[probe]


_pipette_channels_to_sensor_map = {
    PipetteType.pipette_single: [SensorId.S0],
    PipetteType.pipette_multi: [SensorId.S0, SensorId.S1],
    PipetteType.pipette_96: [SensorId.S0, SensorId.S1],
}


def map_pipette_type_to_sensor_id(
    available_instruments: List[NodeId],
    device_info: Dict[SubSystem, network.DeviceInfoCache],
) -> Dict[PipetteProbeTarget, List[SensorId]]:
    return_map = {}
    for node in available_instruments:
        node_info = device_info[node_id_to_subsystem(node)]
        return_map[cast(PipetteProbeTarget, node)] = _pipette_channels_to_sensor_map[
            PipetteType(node_info.subidentifier)
        ]
    return return_map


_pipette_subtype_lookup = {
    PipetteSubType.pipette_single: PipetteType.pipette_single,
    PipetteSubType.pipette_multi: PipetteType.pipette_multi,
    PipetteSubType.pipette_96: PipetteType.pipette_96,
}


def pipette_type_for_subtype(pipette_subtype: PipetteSubType) -> PipetteType:
    return _pipette_subtype_lookup[pipette_subtype]


_update_state_lookup = {
    FirmwareUpdateStatus.queued: UpdateState.queued,
    FirmwareUpdateStatus.updating: UpdateState.updating,
    FirmwareUpdateStatus.done: UpdateState.done,
}


def fw_update_state_from_status(state: FirmwareUpdateStatus) -> UpdateState:
    return _update_state_lookup[state]


class UpdateProgress:
    """Class to keep track of Update progress."""

    def __init__(self, targets: Set[FirmwareTarget]):
        self._tracker: Dict[FirmwareTarget, UpdateStatus] = {}
        self._total_progress = 0
        for target in targets:
            subsystem = (
                node_id_to_subsystem(NodeId(target))
                if isinstance(target, NodeId)
                else SubSystem.rear_panel
            )
            self._tracker[target] = UpdateStatus(subsystem, UpdateState.queued, 0)

    @property
    def targets(self) -> Set[FirmwareTarget]:
        """Gets the set of update Targets queued or updating."""
        return set(self._tracker)

    def get_progress(self) -> Set[UpdateStatus]:
        """Gets the update status and total progress"""
        return set(self._tracker.values())

    def update(
        self, target: FirmwareTarget, status_element: StatusElement
    ) -> Set[UpdateStatus]:
        """Update internal states/progress of firmware updates."""
        fw_update_status, progress = status_element
        subsystem = (
            node_id_to_subsystem(NodeId(target))
            if isinstance(target, NodeId)
            else SubSystem.rear_panel
        )
        state = fw_update_state_from_status(fw_update_status)
        progress = int(progress * 100)
        self._tracker[target] = UpdateStatus(subsystem, state, progress)
        return set(self._tracker.values())


_gripper_jaw_state_lookup: Dict[FirmwareGripperjawState, GripperJawState] = {
    FirmwareGripperjawState.unhomed: GripperJawState.UNHOMED,
    FirmwareGripperjawState.force_controlling_home: GripperJawState.HOMED_READY,
    FirmwareGripperjawState.force_controlling: GripperJawState.GRIPPING,
    FirmwareGripperjawState.position_controlling: GripperJawState.HOLDING,
    FirmwareGripperjawState.stopped: GripperJawState.STOPPED,
}


def gripper_jaw_state_from_fw(state: FirmwareGripperjawState) -> GripperJawState:
    return _gripper_jaw_state_lookup[state]
