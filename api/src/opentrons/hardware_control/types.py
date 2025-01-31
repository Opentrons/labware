from asyncio import Queue
import enum
import logging
from dataclasses import dataclass
from typing import cast, Tuple, Union, List, Callable, Dict, TypeVar, Type
from typing_extensions import Literal
from opentrons import types as top_types
from opentrons_shared_data.pipette.types import PipetteChannelType
from opentrons.config import feature_flags

MODULE_LOG = logging.getLogger(__name__)


class MotionChecks(enum.Enum):
    NONE = 0
    LOW = 1
    HIGH = 2
    BOTH = 3


class OT3Mount(enum.Enum):
    LEFT = top_types.Mount.LEFT.value
    RIGHT = top_types.Mount.RIGHT.value
    GRIPPER = enum.auto()

    @classmethod
    def from_mount(
        cls,
        mount: Union[
            top_types.Mount, top_types.MountType, top_types.OT3MountType, "OT3Mount"
        ],
    ) -> "OT3Mount":
        if mount == top_types.Mount.EXTENSION or mount == top_types.MountType.EXTENSION:
            return OT3Mount.GRIPPER
        return cls[mount.name]

    def to_mount(self) -> top_types.Mount:
        if self.value == self.GRIPPER.value:
            return top_types.Mount.EXTENSION
        return top_types.Mount[self.name]

    @classmethod
    def pipette_mounts(cls) -> List["Literal[OT3Mount.LEFT, OT3Mount.RIGHT]"]:
        return [cls.LEFT, cls.RIGHT]


class OT3AxisKind(enum.Enum):
    """An enum of the different kinds of axis we have.

    The machine may have different numbers of specific axes implementing
    each axis kind.
    """

    X = 0
    #: Gantry X axis
    Y = 1
    #: Gantry Y axis
    Z = 2
    #: Z axis (of the left and right)
    P = 3
    #: Plunger axis (of the left and right pipettes)
    Z_G = 4
    #: Gripper Z axis
    Q = 6
    #: High-throughput tip grabbing axis
    OTHER = 6
    #: The internal axes of high throughput pipettes, for instance

    def __str__(self) -> str:
        return self.name

    def is_z_axis(self) -> bool:
        return self in [OT3AxisKind.Z, OT3AxisKind.Z_G]


class Axis(enum.Enum):
    X = 0  # gantry
    Y = 1
    Z_L = 2  # left pipette mount Z
    Z_R = 3  # right pipette mount Z
    Z_G = 4  # gripper mount Z
    P_L = 5  # left pipette plunger
    P_R = 6  # right pipette plunger
    Q = 7  # hi-throughput pipette tiprack grab
    G = 8  # gripper grab

    # OT2 axes' aliases:
    Z = Z_L  # left pipette mount Z
    A = Z_R  # right pipette mount Z
    B = P_L  # left pipette plunger
    C = P_R  # right pipette plunger

    @classmethod
    def by_mount(cls, mount: Union[top_types.Mount, OT3Mount]) -> "Axis":
        bm = {
            top_types.Mount.LEFT: cls.Z_L,
            top_types.Mount.RIGHT: cls.Z_R,
            top_types.Mount.EXTENSION: cls.Z_G,
            OT3Mount.LEFT: cls.Z_L,
            OT3Mount.RIGHT: cls.Z_R,
            OT3Mount.GRIPPER: cls.Z_G,
        }
        return bm[mount]

    @classmethod
    def pipette_axes(cls) -> Tuple["Axis", "Axis"]:
        """The axes which are used for moving plunger motors."""
        return cls.P_L, cls.P_R

    @classmethod
    def mount_axes(cls) -> None:
        """The axes which are used for moving instruments up and down."""
        raise NotImplementedError(
            "`Axis.mount_axes` has been removed. Use `Axis.ot2_mount_axes` or "
            "`Axis.ot3_mount_axes` instead."
        )

    @classmethod
    def ot2_mount_axes(cls) -> Tuple["Axis", "Axis"]:
        """The OT2 axes which are used for moving instruments up and down."""
        # TODO (spp, 2023-07-14): make this a separate function outside of Axis
        # Does this need to be Z_R, Z_L ?
        return cls.Z_L, cls.Z_R

    @classmethod
    def ot3_mount_axes(cls) -> Tuple["Axis", "Axis", "Axis"]:
        """The OT3 axes which are used for moving instruments up and down."""
        # TODO (spp, 2023-07-14): make this a separate function outside of Axis
        return cls.Z_R, cls.Z_L, cls.Z_G

    @classmethod
    def gantry_axes(
        cls,
    ) -> Tuple["Axis", "Axis", "Axis", "Axis", "Axis"]:
        """The axes which are tied to the gantry and require the deck
        calibration transform
        """
        return cls.X, cls.Y, cls.Z_L, cls.Z_R, cls.Z_G

    @classmethod
    def of_main_tool_actuator(cls, mount: Union[top_types.Mount, OT3Mount]) -> "Axis":
        if isinstance(mount, top_types.Mount):
            checked_mount = OT3Mount.from_mount(mount)
        else:
            checked_mount = mount
        pm = {OT3Mount.LEFT: cls.P_L, OT3Mount.RIGHT: cls.P_R, OT3Mount.GRIPPER: cls.G}
        return pm[checked_mount]

    @classmethod
    def to_kind(cls, axis: "Axis") -> OT3AxisKind:
        kind_map: Dict[Axis, OT3AxisKind] = {
            cls.P_L: OT3AxisKind.P,
            cls.P_R: OT3AxisKind.P,
            cls.X: OT3AxisKind.X,
            cls.Y: OT3AxisKind.Y,
            cls.Z_L: OT3AxisKind.Z,
            cls.Z_R: OT3AxisKind.Z,
            cls.Z_G: OT3AxisKind.Z_G,
            cls.Q: OT3AxisKind.Q,
            cls.G: OT3AxisKind.OTHER,
        }
        return kind_map[axis]

    @classmethod
    def of_kind(cls, kind: OT3AxisKind) -> List["Axis"]:
        kind_map: Dict[OT3AxisKind, List[Axis]] = {
            OT3AxisKind.P: [cls.P_R, cls.P_L],
            OT3AxisKind.X: [cls.X],
            OT3AxisKind.Y: [cls.Y],
            OT3AxisKind.Z: [cls.Z_L, cls.Z_R],
            OT3AxisKind.Z_G: [cls.Z_G],
            OT3AxisKind.Q: [cls.Q],
            OT3AxisKind.OTHER: [cls.Q, cls.G],
        }
        return kind_map[kind]

    @classmethod
    def to_ot2_mount(cls, inst: "Axis") -> top_types.Mount:
        # TODO (spp, 2023-07-14): make this a separate function outside of Axis
        return {
            cls.Z: top_types.Mount.LEFT,
            cls.A: top_types.Mount.RIGHT,
            cls.B: top_types.Mount.LEFT,
            cls.C: top_types.Mount.RIGHT,
        }[inst]

    @classmethod
    def to_ot3_mount(cls, inst: "Axis") -> OT3Mount:
        # TODO (spp, 2023-07-14): make this a separate function outside of Axis
        return {
            cls.Z_R: OT3Mount.RIGHT,
            cls.Z_L: OT3Mount.LEFT,
            cls.P_L: OT3Mount.LEFT,
            cls.P_R: OT3Mount.RIGHT,
            cls.Z_G: OT3Mount.GRIPPER,
            cls.G: OT3Mount.GRIPPER,
        }[inst]

    def __str__(self) -> str:
        return self.name

    def of_point(self, point: top_types.Point) -> float:
        if Axis.to_kind(self).is_z_axis():
            return point.z
        elif self == Axis.X:
            return point.x
        elif self == Axis.Y:
            return point.y
        else:
            raise KeyError(self)

    def set_in_point(self, point: top_types.Point, position: float) -> top_types.Point:
        if Axis.to_kind(self).is_z_axis():
            return point._replace(z=position)
        elif self == Axis.X:
            return point._replace(x=position)
        elif self == Axis.Y:
            return point._replace(y=position)
        else:
            raise KeyError(self)

    @classmethod
    def ot2_axes(cls) -> List["Axis"]:
        """Returns only OT2 axes."""
        # TODO (spp, 2023-07-14): make this a separate function outside of Axis
        return [axis for axis in Axis if axis not in [Axis.Z_G, Axis.Q, Axis.G]]

    @classmethod
    def of_plunger(cls, mount: top_types.Mount) -> "Axis":
        """Get plunger axes.

        Same as `of_main_tool_actuator` but for OT2 backwards compatibility.
        """
        return cls.of_main_tool_actuator(mount)

    @classmethod
    def node_axes(cls) -> List["Axis"]:
        """
        Get a list of axes that are backed by flex canbus nodes.
        """
        return [cls.X, cls.Y, cls.Z_L, cls.Z_R, cls.P_L, cls.P_R, cls.Z_G, cls.G]


class SubSystem(enum.Enum):
    """An enumeration of ot3 components.

    This is a complete list of unique firmware nodes in the ot3.
    """

    gantry_x = 0
    gantry_y = 1
    head = 2
    pipette_left = 3
    pipette_right = 4
    gripper = 5
    rear_panel = 6
    motor_controller_board = 7
    hepa_uv = 8

    def __str__(self) -> str:
        return self.name

    @classmethod
    def of_mount(
        cls: "Type[SubSystem]", mount: Union[top_types.Mount, OT3Mount]
    ) -> "Literal[SubSystem.pipette_left, SubSystem.pipette_right, SubSystem.gripper]":
        return cast(
            Literal[SubSystem.pipette_left, SubSystem.pipette_right, SubSystem.gripper],
            {
                top_types.Mount.LEFT: cls.pipette_left,
                top_types.Mount.RIGHT: cls.pipette_right,
                OT3Mount.LEFT: cls.pipette_left,
                OT3Mount.RIGHT: cls.pipette_right,
                OT3Mount.GRIPPER: cls.gripper,
            }[mount],
        )


OT3SubSystem = SubSystem


class PipetteSubType(enum.Enum):
    """Pipette type to map from lower level PipetteType."""

    pipette_single = 1
    pipette_multi = 2
    pipette_96 = 3

    def __str__(self) -> str:
        return self.name

    @classmethod
    def from_channels(cls, channels: PipetteChannelType) -> "PipetteSubType":
        pipette_subtype_lookup = {
            PipetteChannelType.SINGLE_CHANNEL: cls.pipette_single,
            PipetteChannelType.EIGHT_CHANNEL: cls.pipette_multi,
            PipetteChannelType.NINETY_SIX_CHANNEL: cls.pipette_96,
        }
        return pipette_subtype_lookup[channels]


class UpdateState(enum.Enum):
    """Update state to map from lower level FirmwareUpdateStatus"""

    queued = "queued"
    updating = "updating"
    done = "done"

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class UpdateStatus:
    subsystem: SubSystem
    state: UpdateState
    progress: int


@dataclass
class SubSystemState:
    ok: bool
    current_fw_version: int
    next_fw_version: int
    fw_update_needed: bool
    current_fw_sha: str
    pcba_revision: str
    update_state: Union[UpdateState, None]


BCAxes = Axis  # This doesn't seem to be used. Remove?
AxisMapValue = TypeVar("AxisMapValue")
OT3AxisMap = Dict[Axis, AxisMapValue]


@dataclass
class CurrentConfig:
    hold_current: float
    run_current: float

    def as_tuple(self) -> Tuple[float, float]:
        return self.hold_current, self.run_current


@dataclass(frozen=True)
class MotorStatus:
    motor_ok: bool
    encoder_ok: bool


class DoorState(enum.Enum):
    OPEN = False
    CLOSED = True

    def __str__(self) -> str:
        return self.name.lower()


class EstopState(enum.Enum):
    """Enumerated state machine for the estop status."""

    PHYSICALLY_ENGAGED = enum.auto()
    LOGICALLY_ENGAGED = enum.auto()
    DISENGAGED = enum.auto()
    NOT_PRESENT = enum.auto()


class EstopAttachLocation(enum.Enum):
    """Enumerated estop attach locations."""

    LEFT = enum.auto()
    RIGHT = enum.auto()


class EstopPhysicalStatus(enum.Enum):
    """Possible status of an estop."""

    ENGAGED = enum.auto()
    DISENGAGED = enum.auto()
    NOT_PRESENT = enum.auto()


class HardwareEventType(enum.Enum):
    DOOR_SWITCH_CHANGE = enum.auto()
    ERROR_MESSAGE = enum.auto()
    ESTOP_CHANGE = enum.auto()


@dataclass
class EstopOverallStatus:
    state: EstopState
    left_physical_state: EstopPhysicalStatus
    right_physical_state: EstopPhysicalStatus


@dataclass
class HepaFanState:
    fan_on: bool
    duty_cycle: int


@dataclass
class HepaUVState:
    light_on: bool
    uv_duration_s: int
    remaining_time_s: int


@dataclass(frozen=True)
class DoorStateNotification:
    event: Literal[
        HardwareEventType.DOOR_SWITCH_CHANGE
    ] = HardwareEventType.DOOR_SWITCH_CHANGE
    new_state: DoorState = DoorState.CLOSED


@dataclass(frozen=True)
class EstopStateNotification:
    event: Literal[HardwareEventType.ESTOP_CHANGE] = HardwareEventType.ESTOP_CHANGE
    old_state: EstopState = EstopState.NOT_PRESENT
    new_state: EstopState = EstopState.NOT_PRESENT


@dataclass(frozen=True)
class ErrorMessageNotification:
    message: str
    event: Literal[HardwareEventType.ERROR_MESSAGE] = HardwareEventType.ERROR_MESSAGE


# new event types get new dataclasses
# when we add more event types we add them here
HardwareEvent = Union[
    DoorStateNotification, ErrorMessageNotification, EstopStateNotification
]

HardwareEventHandler = Callable[[HardwareEvent], None]
HardwareEventUnsubscriber = Callable[[], None]


RevisionLiteral = Literal["2.1", "A", "B", "C", "UNKNOWN"]


class BoardRevision(enum.Enum):
    UNKNOWN = enum.auto()
    OG = enum.auto()
    A = enum.auto()
    B = enum.auto()
    C = enum.auto()
    FLEX_B2 = enum.auto()

    @classmethod
    def by_bits(cls, rev_bits: Tuple[bool, bool]) -> "BoardRevision":
        br = {
            (True, True): cls.OG,
            (False, True): cls.A,
            (True, False): cls.B,
            (False, False): cls.C,
        }
        return br[rev_bits]

    def real_name(self) -> Union[RevisionLiteral, Literal["UNKNOWN"]]:
        rn = "2.1" if self.name == "OG" else self.name
        return cast(Union[RevisionLiteral, Literal["UNKNOWN"]], rn)

    def __str__(self) -> str:
        return self.real_name()


class CriticalPoint(enum.Enum):
    """Possibilities for the point to move in a move call.

    The active critical point determines the offsets that are added to the
    gantry position when moving a pipette around.
    """

    MOUNT = enum.auto()
    """
    For legacy reasons, the position of the end of a P300 single. The default
    when no pipette is attached, and used for consistent behavior in certain
    contexts (like change pipette) when a variety of different pipettes might
    be attached.
    """

    NOZZLE = enum.auto()
    """
    The end of the nozzle of a single pipette or the end of the back-most
    nozzle of a multipipette. Only relevant when a pipette is present.
    """

    TIP = enum.auto()
    """
    The end of the tip of a single pipette or the end of the back-most
    tip of a multipipette. Only relevant when a pipette is present and
    a tip with known tip length is attached.
    """

    XY_CENTER = enum.auto()
    """
    Separately from the z component of the critical point, XY_CENTER means
    the critical point under consideration is the XY center of the pipette.
    This changes nothing for single pipettes, but makes multipipettes
    move their centers - so between channels 4 and 5 - to the specified
    point. This is the same as the GRIPPER_JAW_CENTER for grippers.
    """

    INSTRUMENT_XY_CENTER = enum.auto()
    """
    The INSTRUMENT_XY_CENTER means the critical point under consideration is
    the XY center of the entire pipette, regardless of configuration.
    No pipettes, single or multi, will change their instrument center point.
    """

    FRONT_NOZZLE = enum.auto()
    """
    The end of the front-most nozzle of a multipipette with a tip attached.
    Only relevant when a multichannel pipette is present.
    """

    GRIPPER_JAW_CENTER = enum.auto()
    """
    The center of the gripper jaw engagement zone, such that if this critical
    point is moved to the center of a labware the gripper will be ready to
    grip it.
    """

    GRIPPER_FRONT_CALIBRATION_PIN = enum.auto()
    """
    The center of the bottom face of a calibration pin inserted in the gripper's
    front calibration pin slot.
    """

    GRIPPER_REAR_CALIBRATION_PIN = enum.auto()
    """
    The center of the bottom face of a calibration pin inserted in the gripper's
    back calibration pin slot.
    """

    Y_CENTER = enum.auto()
    """
    Y_CENTER means the critical point under consideration is at the same X
    coordinate as the default nozzle point (i.e. TIP | NOZZLE | FRONT_NOZZLE)
    but halfway in between the Y axis bounding box of the pipette - it is the
    XY center of the first column in the pipette. It's really only relevant for
    the 96; it will produce the same position as XY_CENTER on an eight or one
    channel pipette.
    """


class ExecutionState(enum.Enum):
    RUNNING = enum.auto()
    PAUSED = enum.auto()
    CANCELLED = enum.auto()

    def __str__(self) -> str:
        return self.name


class HardwareAction(enum.Enum):
    DROPTIP = enum.auto()
    ASPIRATE = enum.auto()
    DISPENSE = enum.auto()
    BLOWOUT = enum.auto()
    PREPARE_ASPIRATE = enum.auto()
    LIQUID_PROBE = enum.auto()

    def __str__(self) -> str:
        return self.name


class PauseType(enum.Enum):
    PAUSE = 0
    DELAY = 1


class StatusBarState(enum.Enum):
    """Semantic status bar states.

    These mostly correspond to cases listed out in the Flex manual.
    """

    IDLE = enum.auto()
    RUNNING = enum.auto()
    PAUSED = enum.auto()
    HARDWARE_ERROR = enum.auto()
    SOFTWARE_ERROR = enum.auto()
    ERROR_RECOVERY = enum.auto()
    CONFIRMATION = enum.auto()
    RUN_COMPLETED = enum.auto()
    UPDATING = enum.auto()
    ACTIVATION = enum.auto()
    DISCO = enum.auto()
    OFF = enum.auto()

    def transient(self) -> bool:
        return self.value in {
            StatusBarState.CONFIRMATION.value,
            StatusBarState.RUN_COMPLETED.value,
            StatusBarState.ACTIVATION.value,
            StatusBarState.DISCO.value,
        }


@dataclass
class AionotifyEvent:
    flags: enum.EnumMeta
    name: str

    @classmethod
    def build(cls, name: str, flags: List[enum.Enum]) -> "AionotifyEvent":
        # See https://github.com/python/mypy/issues/5317
        # as to why mypy cannot detect that list
        # comprehension or variables cannot be dynamically
        # determined to meet the argument criteria for
        # enums. Hence, the type ignore below.
        flag_list = [f.name for f in flags]
        Flag = enum.Enum("Flag", flag_list)  # type: ignore
        return cls(flags=Flag, name=name)


class GripperJawState(enum.Enum):
    UNHOMED = enum.auto()
    #: the gripper must be homed before it can do anything
    HOMED_READY = enum.auto()
    #: the gripper has been homed and is at its fully-open homed position
    GRIPPING = enum.auto()
    #: the gripper is actively force-control gripping something
    HOLDING = enum.auto()
    #: the gripper is in position-control mode
    STOPPED = enum.auto()
    #: the gripper has been homed before but is stopped now


class InstrumentProbeType(enum.Enum):
    PRIMARY = enum.auto()
    SECONDARY = enum.auto()
    BOTH = enum.auto()


class GripperProbe(enum.Enum):
    FRONT = enum.auto()
    REAR = enum.auto()

    @classmethod
    def to_type(cls, gp: "GripperProbe") -> InstrumentProbeType:
        if gp == cls.FRONT:
            return InstrumentProbeType.SECONDARY
        else:
            return InstrumentProbeType.PRIMARY


class TipStateType(enum.Enum):
    ABSENT = 0
    PRESENT = 1

    def __str__(self) -> str:
        return self.name


@dataclass
class HardwareFeatureFlags:
    """
    Hardware configuration options that can be passed to API instances.
    Some options may not be relevant to every robot.

    These generally map to the feature flag options in the opentrons.config
    module.
    """

    use_old_aspiration_functions: bool = (
        False  # To support pipette backwards compatability
    )
    require_estop: bool = True
    stall_detection_enabled: bool = True
    overpressure_detection_enabled: bool = True

    @classmethod
    def build_from_ff(cls) -> "HardwareFeatureFlags":
        """Build from the feature flags configuration file on disc.

        Note that, if this class is built from the default constructor, the values
        of all of the flags are just the default values instead of the values in the
        feature_flags file or environment variables. Use this constructor to ensure
        the right values are pulled in.
        """
        return HardwareFeatureFlags(
            use_old_aspiration_functions=feature_flags.use_old_aspiration_functions(),
            require_estop=feature_flags.require_estop(),
            stall_detection_enabled=feature_flags.stall_detection_enabled(),
            overpressure_detection_enabled=feature_flags.overpressure_detection_enabled(),
        )


class EarlyLiquidSenseTrigger(RuntimeError):
    """Error raised if sensor threshold reached before minimum probing distance."""

    def __init__(
        self, triggered_at: Dict[Axis, float], min_z_pos: Dict[Axis, float]
    ) -> None:
        """Initialize EarlyLiquidSenseTrigger error."""
        super().__init__(
            f"Liquid threshold triggered early at z={triggered_at}mm, "
            f"minimum z position = {min_z_pos}"
        )


class FailedTipStateCheck(RuntimeError):
    """Error raised if the tip ejector state does not match the expected value."""

    def __init__(
        self, expected_state: TipStateType, actual_state: TipStateType
    ) -> None:
        """Initialize FailedTipStateCheck error."""
        super().__init__(
            f"Expected tip state {expected_state}, but received {actual_state}."
        )


@enum.unique
class PipetteSensorId(int, enum.Enum):
    """Sensor IDs available.

    Not to be confused with SensorType. This is the ID value that separate
    two or more of the same type of sensor within a system.

    Note that this is a copy of an enum defined in opentrons_hardware.firmware_bindings.constants. That version
    is authoritative; this version is here because this data is exposed above the hardware control layer and
    therefore needs a typing source here so that we don't create a dependency on the internal hardware package.
    """

    S0 = 0x0
    S1 = 0x1
    UNUSED = 0x2
    BOTH = 0x3


@enum.unique
class PipetteSensorType(int, enum.Enum):
    """Sensor types available.

    Note that this is a copy of an enum defined in opentrons_hardware.firmware_bindings.constants. That version
    is authoritative; this version is here because this data is exposed above the hardware control layer and
    therefore needs a typing source here so that we don't create a dependency on the internal hardware package.
    """

    tip = 0x00
    capacitive = 0x01
    environment = 0x02
    pressure = 0x03
    pressure_temperature = 0x04
    humidity = 0x05
    temperature = 0x06


@dataclass(frozen=True)
class PipetteSensorData:
    """Sensor data from a monitored sensor.

    Note that this is a copy of an enum defined in opentrons_hardware.firmware_bindings.constants. That version
    is authoritative; this version is here because this data is exposed above the hardware control layer and
    therefore needs a typing source here so that we don't create a dependency on the internal hardware package.
    """

    sensor_type: PipetteSensorType
    _as_int: int
    _as_float: float

    def to_float(self) -> float:
        return self._as_float

    @property
    def to_int(self) -> int:
        return self._as_int


PipetteSensorResponseQueue = Queue[Dict[PipetteSensorId, List[PipetteSensorData]]]
