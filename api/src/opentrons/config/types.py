from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, Tuple, TypeVar, Generic, List
from typing_extensions import TypedDict, Literal


class AxisDict(TypedDict):
    X: float
    Y: float
    Z: float
    A: float
    B: float
    C: float


class GeneralizeableAxisDict(TypedDict, total=False):
    X: float
    Y: float
    Z: float
    P: float


Vt = TypeVar("Vt")


class PipetteKind(Enum):
    HIGH_THROUGHPUT = "high_throughput"
    LOW_THROUGHPUT = "low_throughput"
    TWO_LOW_THROUGHPUT = "two_low_throughput"
    NONE = "none"
    GRIPPER = "gripper"


@dataclass
class ByPipetteKind(Generic[Vt]):
    high_throughput: Vt
    low_throughput: Vt
    two_low_throughput: Vt
    none: Vt
    gripper: Vt

    def __getitem__(self, key: PipetteKind):
        return asdict(self)[key.value]


PerPipetteAxisSettings = ByPipetteKind[GeneralizeableAxisDict]


class CurrentDictDefault(TypedDict):
    default: AxisDict


CurrentDictModelEntries = TypedDict(
    "CurrentDictModelEntries",
    {"2.1": AxisDict, "A": AxisDict, "B": AxisDict, "C": AxisDict},
    total=False,
)


class CurrentDict(CurrentDictDefault, CurrentDictModelEntries):
    pass


Offset = Tuple[float, float, float]


@dataclass
class RobotConfig:
    model: Literal["OT-2 Standard"]
    name: str
    version: int
    gantry_steps_per_mm: Dict[str, float]
    acceleration: Dict[str, float]
    serial_speed: int
    default_pipette_configs: Dict[str, float]
    default_current: CurrentDict
    low_current: CurrentDict
    high_current: CurrentDict
    default_max_speed: AxisDict
    log_level: str
    z_retract_distance: float
    left_mount_offset: Offset


OT3Transform = List[List[float]]


@dataclass
class OT3SpeedSettings:
    default_max_speed: PerPipetteAxisSettings
    acceleration: PerPipetteAxisSettings
    max_speed_discontinuity: PerPipetteAxisSettings
    direction_change_speed_discontinuity: PerPipetteAxisSettings

    def by_pipette_kind(self, pipette_kind: PipetteKind) -> Dict[str, AxisDict]:
        return {
            'default_max_speed': self.default_max_speed.none,
            'acceleration': self.acceleration.none,
            'max_speed_discontinuity': self.max_speed_discontinuity.none,
            'direction_change_speed_discontinuity': self.direction_change_speed_discontinuity.none
        }


@dataclass
class OT3Config:
    model: Literal["OT-3 Standard"]
    name: str
    version: int
    log_level: str
    speed_settings: OT3SpeedSettings
    holding_current: PerPipetteAxisSettings
    normal_motion_current: PerPipetteAxisSettings
    z_retract_distance: float
    deck_transform: OT3Transform
    carriage_offset: Offset
    left_mount_offset: Offset
    right_mount_offset: Offset
    gripper_mount_offset: Offset
