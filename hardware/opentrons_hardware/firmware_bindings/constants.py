"""Constants for can bus.

This file is used as a source for code generation, which does not run in a venv
by default. Please do not unconditionally import things outside the python standard
library.
"""

from enum import Enum, unique
from typing import Union, Dict, List


@unique
class NodeId(int, Enum):
    """Can bus arbitration id node id."""

    broadcast = 0x00
    host = 0x10
    pipette_left = 0x60
    pipette_right = 0x70
    gantry_x = 0x30
    gantry_y = 0x40
    head = 0x50
    head_l = 0x51
    head_r = 0x52
    gripper = 0x20
    gripper_z = 0x21
    gripper_g = 0x22
    hepa_uv = 0x32
    pipette_left_bootloader = pipette_left | 0xF
    pipette_right_bootloader = pipette_right | 0xF
    gantry_x_bootloader = gantry_x | 0xF
    gantry_y_bootloader = gantry_y | 0xF
    head_bootloader = head | 0xF
    gripper_bootloader = gripper | 0xF
    # We cant use bitwise & 0xF0 to determine the application Node because
    # the NodeId bitmask is only 7 bits long, which means we only have
    # 7 unique pairs of (node_id <-> bootloader_node_id). i.e,
    # head (0x50) <-> head_bootloader (0x5f). Since we have already
    # hit that limit we have to move away from categorizing nodes with
    # 0xf as the bootloader node and instead use an explicit map as defined
    # here to determine relationship between node and bootloader_node.
    hepa_uv_bootloader = hepa_uv | 0xE

    @classmethod
    def bootloader_map(cls) -> Dict["NodeId", List["NodeId"]]:
        """Mapping between bootloader_node and nodes.

        Note: The ordering of the Node list matters as the first element
        represents the core application node for that given node. For example

        NodeId.head_bootloader : [NodeId.head, NodeId.head_l, NodeId.head_r]

        The core node here is NodeId.head because its the first element.
        """
        return {
            NodeId.broadcast: [NodeId.broadcast],
            NodeId.host: [NodeId.host],
            NodeId.pipette_left_bootloader: [NodeId.pipette_left],
            NodeId.pipette_right_bootloader: [NodeId.pipette_right],
            NodeId.gantry_x_bootloader: [NodeId.gantry_x],
            NodeId.gantry_y_bootloader: [NodeId.gantry_y],
            NodeId.head_bootloader: [NodeId.head, NodeId.head_l, NodeId.head_r],
            NodeId.gripper_bootloader: [
                NodeId.gripper,
                NodeId.gripper_z,
                NodeId.gripper_g,
            ],
            NodeId.hepa_uv_bootloader: [NodeId.hepa_uv],
        }

    def is_bootloader(self) -> bool:
        """Whether this node ID is a bootloader."""
        return (
            self not in [NodeId.broadcast, NodeId.host]
            and self in NodeId.bootloader_map()
        )

    def bootloader_for(self) -> "NodeId":
        """The associated bootloader node ID for the node."""
        if self.is_bootloader():
            return self

        # Get the bootloader for the given node
        for bootloader, nodes in self.bootloader_map().items():
            if self in nodes:
                return bootloader
        raise ValueError(f"No bootloader node for {self.name}.")

    def application_for(self) -> "NodeId":
        """The associated core node ID for the node (i.e. head, not head_l).

        This is safe to call on any node ID, including non-core application
        node IDs like head_l, head_bootloader. It will always give the core node ID.
        """
        for bootloader, nodes in self.bootloader_map().items():
            # The core application node for any node is the first item in the node list
            if bootloader is self or self in nodes:
                return nodes[0]
        raise ValueError(f"No application node for {self.name}.")


# make these negative numbers so there is no chance they overlap with NodeId
@unique
class USBTarget(int, Enum):
    """List of firmware targets connected over usb."""

    rear_panel = -1

    def is_bootloader(self) -> bool:
        """Whether this is a bootloader id (always false)."""
        return False

    def application_for(self) -> "USBTarget":
        """The corresponding application id."""
        return self


FirmwareTarget = Union[NodeId, USBTarget]


@unique
class FunctionCode(int, Enum):
    """Can bus arbitration id function code."""

    network_management = 0x0
    sync = 0x1
    error = 0x2
    command = 0x3
    status = 0x4
    parameters = 0x5
    bootloader = 0x6
    heartbeat = 0x7


@unique
class MessageId(int, Enum):
    """Can bus arbitration id message id."""

    heartbeat_request = 0x3FF
    heartbeat_response = 0x3FE

    device_info_request = 0x302
    device_info_response = 0x303
    task_info_request = 0x304
    task_info_response = 0x305
    instrument_info_request = 0x306
    pipette_info_response = 0x307
    gripper_info_response = 0x308
    hepauv_info_response = 0x309
    set_serial_number = 0x30A
    get_motor_usage_request = 0x30B
    get_motor_usage_response = 0x30C

    stop_request = 0x00

    error_message = 0x02

    get_status_request = 0x01
    get_gear_status_response = 0x4
    get_status_response = 0x05

    enable_motor_request = 0x06
    disable_motor_request = 0x07

    move_request = 0x10

    write_eeprom = 0x201
    read_eeprom_request = 0x202
    read_eeprom_response = 0x203

    add_move_request = 0x15
    get_move_group_request = 0x16
    get_move_group_response = 0x17
    execute_move_group_request = 0x18
    clear_all_move_groups_request = 0x19
    home_request = 0x20
    add_sensor_move_request = 0x23
    move_completed = 0x13

    motor_position_request = 0x12
    motor_position_response = 0x14
    update_motor_position_estimation_request = 0x21
    update_motor_position_estimation_response = 0x22

    set_motion_constraints = 0x101
    get_motion_constraints_request = 0x102
    get_motion_constraints_response = 0x103

    write_motor_driver_register_request = 0x30
    read_motor_driver_register_request = 0x31
    read_motor_driver_register_response = 0x32
    write_motor_current_request = 0x33
    read_motor_current_request = 0x34
    read_motor_current_response = 0x35
    read_motor_driver_error_status_request = 0x36
    read_motor_driver_error_status_response = 0x37

    set_brushed_motor_vref_request = 0x40
    set_brushed_motor_pwm_request = 0x41
    gripper_grip_request = 0x42
    gripper_home_request = 0x43
    add_brushed_linear_move_request = 0x44
    brushed_motor_conf_request = 0x45
    brushed_motor_conf_response = 0x46
    set_gripper_error_tolerance = 0x47
    gripper_jaw_state_request = 0x48
    gripper_jaw_state_response = 0x49
    set_gripper_jaw_holdoff_request = 0x401
    gripper_jaw_holdoff_request = 0x402
    gripper_jaw_holdoff_response = 0x403

    acknowledgement = 0x50

    read_presence_sensing_voltage_request = 0x600
    read_presence_sensing_voltage_response = 0x601

    attached_tools_request = 0x700
    tools_detected_notification = 0x701
    tip_presence_notification = 0x702
    get_tip_status_request = 0x703

    fw_update_initiate = 0x60
    fw_update_data = 0x61
    fw_update_data_ack = 0x62
    fw_update_complete = 0x63
    fw_update_complete_ack = 0x64
    fw_update_status_request = 0x65
    fw_update_status_response = 0x66
    fw_update_start_app = 0x67
    fw_update_erase_app = 0x68
    fw_update_erase_app_ack = 0x69

    limit_sw_request = 0x08
    limit_sw_response = 0x09

    do_self_contained_tip_action_request = 0x501
    do_self_contained_tip_action_response = 0x502
    gear_enable_motor_request = 0x503
    gear_disable_motor_request = 0x504
    gear_set_current_request = 0x505
    gear_write_motor_driver_request = 0x506
    gear_read_motor_driver_request = 0x507

    max_sensor_value_request = 0x70
    max_sensor_value_response = 0x71

    batch_read_sensor_response = 0x81
    read_sensor_request = 0x82
    write_sensor_request = 0x83
    baseline_sensor_request = 0x84
    read_sensor_response = 0x85
    set_sensor_threshold_request = 0x86
    set_sensor_threshold_response = 0x87
    sensor_diagnostic_request = 0x88
    sensor_diagnostic_response = 0x89
    bind_sensor_output_request = 0x8A
    bind_sensor_output_response = 0x8B
    peripheral_status_request = 0x8C
    peripheral_status_response = 0x8D
    baseline_sensor_response = 0x8E
    send_accumulated_sensor_data = 0x8F

    set_hepa_fan_state_request = 0x90
    get_hepa_fan_state_request = 0x91
    get_hepa_fan_state_response = 0x92
    set_hepa_uv_state_request = 0x93
    get_hepa_uv_state_request = 0x94
    get_hepa_uv_state_response = 0x95


@unique
class ErrorSeverity(int, Enum):
    """Error Severity levels."""

    none = 0x0
    warning = 0x1
    recoverable = 0x2
    unrecoverable = 0x3


@unique
class ErrorCode(int, Enum):
    """Common error codes."""

    ok = 0x00
    invalid_size = 0x01
    bad_checksum = 0x02
    invalid_byte_count = 0x03
    invalid_input = 0x04
    hardware = 0x05
    timeout = 0x06
    estop_detected = 0x07
    collision_detected = 0x08
    labware_dropped = 0x09
    estop_released = 0x0A
    motor_busy = 0x0B
    stop_requested = 0x0C
    over_pressure = 0x0D
    door_open = 0x0E
    reed_open = 0x0F
    motor_driver_error_detected = 0x10
    safety_relay_inactive = 0x11


@unique
class MotorDriverErrorCode(int, Enum):
    """Motor driver error codes."""

    over_temperature = 0x2000000
    short_circuit = 0x18000000
    open_circuit = 0x60000000


@unique
class ToolType(int, Enum):
    """Tool types detected on Head."""

    pipette = 0x00
    gripper = 0x01
    nothing_attached = 0x02
    tool_error = 0x03


@unique
class SensorType(int, Enum):
    """Sensor types available."""

    tip = 0x00
    capacitive = 0x01
    environment = 0x02
    pressure = 0x03
    pressure_temperature = 0x04
    humidity = 0x05
    temperature = 0x06


@unique
class SensorId(int, Enum):
    """Sensor IDs available.

    Not to be confused with SensorType. This is the ID value that separate
    two or more of the same type of sensor within a system.
    """

    S0 = 0x0
    S1 = 0x1
    UNUSED = 0x2
    BOTH = 0x3


@unique
class PipetteName(int, Enum):
    """High-level name of pipette."""

    p1000_single = 0x00
    p1000_multi = 0x01
    p50_single = 0x02
    p50_multi = 0x03
    p1000_96 = 0x04
    p50_96 = 0x05
    p200_96 = 0x06
    p1000_multi_em = 0x07
    unknown = 0xFFFF


@unique
class PipetteType(int, Enum):
    """High-level type of pipette."""

    pipette_single = 1
    pipette_multi = 2
    pipette_96 = 3


@unique
class SensorOutputBinding(int, Enum):
    """Links sensor threshold triggers to pins."""

    none = 0x0
    sync = 0x01
    report = 0x02
    max_threshold_sync = 0x04
    auto_baseline_report = 0x08
    multi_sensor_sync = 0x10


@unique
class SensorThresholdMode(int, Enum):
    """How a sensor's threshold should be interpreted."""

    absolute = 0x0
    auto_baseline = 0x1


@unique
class GearMotorId(int, Enum):
    """Tip action types."""

    left = 0x0
    right = 0x01


@unique
class PipetteTipActionType(int, Enum):
    """Tip action types."""

    clamp = 0x0
    home = 0x01


@unique
class MotorPositionFlags(Enum):
    """Flags for motor position validity."""

    # Referring to the position in microsteps reported by firmware, which is
    # an open-loop accumulation of all moves since the last homing event.
    stepper_position_ok = 0x1
    # Referring to the closed-loop encoder on the relevant axis.
    # Generally only unset if the motor board has not homed since power-on.
    encoder_position_ok = 0x2


@unique
class MoveStopCondition(int, Enum):
    """Move Stop Condition."""

    none = 0x0
    limit_switch = 0x1
    sync_line = 0x2
    encoder_position = 0x4
    gripper_force = 0x8
    stall = 0x10
    ignore_stalls = 0x20
    limit_switch_backoff = 0x40
    sensor_report = 0x80


@unique
class MotorUsageValueType(int, Enum):
    """Type of motor Usage value types."""

    linear_motor_distance = 0x0
    left_gear_motor_distance = 0x1
    right_gear_motor_distance = 0x2
    force_application_time = 0x3
    total_error_count = 0x4


class MoveAckId(int, Enum):
    """Move Ack IDs."""

    complete_without_condition = 0x1
    stopped_by_condition = 0x2
    timeout = 0x3
    position_error = 0x4


@unique
class GripperJawState(int, Enum):
    """Gripper jaw states."""

    unhomed = 0x0
    force_controlling_home = 0x1
    force_controlling = 0x2
    position_controlling = 0x3
    stopped = 0x4
