import enum
from dataclasses import dataclass
from typing_extensions import Literal, TypedDict
from typing import Dict, List, Mapping, NewType, Union, Tuple, cast


# TODO(mc, 2022-06-16): remove type alias when able
# and when certain removal will not break any pickling
from ..labware.types import LabwareUri as LabwareUri

"""Pipette Definition V2 Types"""

# Needed for Int Comparison. Keeping it next to
# the Literal type for ease of readability
PipetteModelMajorVersion = [1, 2, 3]
PipetteModelMinorVersion = [0, 1, 2, 3, 4, 5, 6, 7]

# TODO Literals are only good for writing down
# exact values. Is there a better typing mechanism
# so we don't need to keep track of versions in two
# different places?
PipetteModelMajorVersionType = Literal[1, 2, 3]
PipetteModelMinorVersionType = Literal[0, 1, 2, 3, 4, 5, 6, 7]


class LiquidClasses(enum.Enum):
    default = enum.auto()
    lowVolumeDefault = enum.auto()


class PipetteTipType(enum.Enum):
    t10 = 10
    t20 = 20
    t50 = 50
    t200 = 200
    t300 = 300
    t1000 = 1000

    @classmethod
    def check_and_return_type(
        cls, working_volume: int, maximum_volume: int
    ) -> "PipetteTipType":
        try:
            return cls(working_volume)
        except ValueError:
            return cls(maximum_volume)


class PipetteChannelType(int, enum.Enum):
    SINGLE_CHANNEL = 1
    EIGHT_CHANNEL = 8
    NINETY_SIX_CHANNEL = 96

    def __str__(self) -> str:
        if self.value == 96:
            return "96"
        elif self.value == 8:
            return "multi"
        else:
            return "single"


class PipetteModelType(enum.Enum):
    p10 = "p10"
    p20 = "p20"
    p50 = "p50"
    p200 = "p200"
    p300 = "p300"
    p1000 = "p1000"


class PipetteGenerationType(enum.Enum):
    GEN1 = "GEN1"
    GEN2 = "GEN2"
    FLEX = "FLEX"


@dataclass(frozen=True)
class PipetteVersionType:
    major: PipetteModelMajorVersionType
    minor: PipetteModelMinorVersionType

    @classmethod
    def convert_from_float(cls, version: float) -> "PipetteVersionType":
        major = cast(PipetteModelMajorVersionType, int(version // 1))
        minor = cast(PipetteModelMinorVersionType, int(round((version % 1), 2) * 10))
        return cls(major=major, minor=minor)

    def __str__(self) -> str:
        if self.major == 1 and self.minor == 0:
            # Maintain the format of V1 pipettes that
            # do not contain a minor version at all.
            return f"{self.major}"
        else:
            return f"{self.major}.{self.minor}"

    @property
    def as_tuple(
        self,
    ) -> Tuple[PipetteModelMajorVersionType, PipetteModelMinorVersionType]:
        return (self.major, self.minor)


"""Mutable Configs Types"""


class Quirks(enum.Enum):
    pickupTipShake = "pickupTipShake"
    dropTipShake = "dropTipShake"
    doubleDropTip = "doubleDropTip"
    needsUnstick = "needsUnstick"
    highSpeed = "highSpeed"


class PipetteOEMType(enum.Enum):
    OT = "ot"  # opentrons type
    EM = "em"  # Emulsifying Pipette

    @classmethod
    def get_oem_from_quirks(cls, quirks: List[Quirks]) -> "PipetteOEMType":
        """Return an oem type if true based on the quirks."""
        return cls.EM if Quirks.highSpeed in quirks else cls.OT

    @classmethod
    def get_oem_from_model_str(cls, model_str: str) -> "PipetteOEMType":
        """Return an oem type if true based on the model string."""
        return cls.EM if "multi_em" in model_str else cls.OT


class AvailableUnits(enum.Enum):
    mm = "mm"
    amps = "amps"
    speed = "mm/s"
    presses = "presses"


@dataclass
class RobotMountConfigs:
    stepsPerMM: float
    homePosition: float
    travelDistance: float


@dataclass
class MutableConfig:
    value: Union[int, float]
    default: Union[int, float]
    units: AvailableUnits
    type: str
    min: float
    max: float
    name: str

    @classmethod
    def build(
        cls,
        value: Union[int, float],
        default: Union[int, float],
        units: str,
        type: str,
        min: float,
        max: float,
        name: str,
    ) -> "MutableConfig":
        if units == "mm/sec":
            units = "mm/s"
        return cls(
            value=value,
            default=default,
            units=AvailableUnits(units),
            type=type,
            min=min,
            max=max,
            name=name,
        )

    def validate_and_add(self, new_value: Union[int, float]) -> None:
        if new_value < self.min or new_value > self.max:
            raise ValueError(f"{self.name} out of range with {new_value}")
        self.value = new_value

    def dict_for_encode(self) -> Dict[str, Union[int, float, str]]:
        return {
            "value": self.value,
            "default": self.default,
            "units": self.units.value,
            "type": self.type,
            "min": self.min,
            "max": self.max,
        }


@dataclass
class QuirkConfig:
    value: bool
    name: Quirks

    @classmethod
    def validate_and_build(cls, name: str, value: bool) -> "QuirkConfig":
        quirk_name = Quirks(name)
        cls.validate(name, value)
        return cls(value=value, name=quirk_name)

    @classmethod
    def validate(cls, name: str, value: bool) -> None:
        if not isinstance(value, bool):
            raise ValueError(f"{value} is invalid for {name}")

    def dict_for_encode(self) -> bool:
        return self.value


TypeOverrides = Mapping[str, Union[float, bool, None]]

OverrideType = Dict[str, Union[Dict[str, QuirkConfig], MutableConfig, str]]


PipetteName = Literal[
    "p10_single",
    "p10_multi",
    "p20_single_gen2",
    "p20_multi_gen2",
    "p50_single",
    "p50_multi",
    "p50_single_flex",
    "p50_multi_flex",
    "p300_single",
    "p300_multi",
    "p300_single_gen2",
    "p300_multi_gen2",
    "p1000_single",
    "p1000_single_gen2",
    "p1000_single_flex",
    "p1000_multi_flex",
    "p1000_multi_em_flex",
    "p1000_96",
    "p200_96",
]


class PipetteNameType(str, enum.Enum):
    """Pipette load name values."""

    value: PipetteName

    P10_SINGLE = "p10_single"
    P10_MULTI = "p10_multi"
    P20_SINGLE_GEN2 = "p20_single_gen2"
    P20_MULTI_GEN2 = "p20_multi_gen2"
    P50_SINGLE = "p50_single"
    P50_MULTI = "p50_multi"
    P50_SINGLE_FLEX = "p50_single_flex"
    P50_MULTI_FLEX = "p50_multi_flex"
    P300_SINGLE = "p300_single"
    P300_MULTI = "p300_multi"
    P300_SINGLE_GEN2 = "p300_single_gen2"
    P300_MULTI_GEN2 = "p300_multi_gen2"
    P1000_SINGLE = "p1000_single"
    P1000_SINGLE_GEN2 = "p1000_single_gen2"
    P1000_SINGLE_FLEX = "p1000_single_flex"
    P1000_MULTI_FLEX = "p1000_multi_flex"
    P1000_MULTI_EM = "p1000_multi_em_flex"
    P1000_96 = "p1000_96"
    P200_96 = "p200_96"


# Generic NewType for models because we get new ones frequently and theres
# a huge number of them
PipetteModel = NewType("PipetteModel", str)

DisplayCategory = Literal["GEN1", "GEN2", "FLEX"]

# todo(mm, 2022-03-18):
# The JSON schema defines this as any string, not as an enum of string literals.
# Check if it's safe to simplify this to just str.
ConfigUnit = Literal[
    "mm",
    "amps",
    "mm/sec",
    "mm/s",  # todo(mm, 2022-03-18): Standardize specs to mm/sec or mm/s.
    "presses",
]

Quirk = NewType("Quirk", str)

ChannelCount = Literal[1, 8, 96]

UlPerMmAction = Literal["aspirate", "dispense", "blowout"]


class PipetteConfigElement(TypedDict):
    value: float
    min: float
    max: float


class PipetteConfigElementWithPerApiLevelValue(TypedDict):
    value: float
    min: float
    max: float
    valuesByApiLevel: Dict[str, float]


# TypedDicts can't be generic sadly
class PipetteCustomizableConfigElementFloat(TypedDict):
    value: float
    min: float
    max: float
    units: ConfigUnit
    type: Literal["float"]


class PipetteCustomizableConfigElementInt(TypedDict):
    value: int
    min: int
    max: int
    units: ConfigUnit
    type: Literal["int"]


PipetteCustomizableConfigElement = Union[
    PipetteCustomizableConfigElementFloat, PipetteCustomizableConfigElementInt
]

SmoothieConfigs = TypedDict(
    "SmoothieConfigs",
    {"stepsPerMM": float, "homePosition": float, "travelDistance": float},
)


class PipetteNameSpec(TypedDict):
    displayName: str
    displayCategory: DisplayCategory
    minVolume: Union[float, int]
    maxVolume: Union[float, int]
    channels: ChannelCount
    defaultAspirateFlowRate: PipetteConfigElementWithPerApiLevelValue
    defaultDispenseFlowRate: PipetteConfigElementWithPerApiLevelValue
    defaultBlowOutFlowRate: PipetteConfigElementWithPerApiLevelValue
    smoothieConfigs: SmoothieConfigs
    defaultTipracks: List[LabwareUri]


PipetteNameSpecs = Dict[PipetteName, PipetteNameSpec]

UlPerMm = Dict[UlPerMmAction, List[List[float]]]


class PipetteModelSpec(TypedDict, total=False):
    name: PipetteName
    top: PipetteCustomizableConfigElementFloat
    bottom: PipetteCustomizableConfigElementFloat
    blowout: PipetteCustomizableConfigElementFloat
    dropTip: PipetteCustomizableConfigElementFloat
    pickUpCurrent: PipetteCustomizableConfigElementFloat
    pickUpDistance: PipetteCustomizableConfigElementFloat
    pickUpIncrement: PipetteCustomizableConfigElementFloat
    pickUpPresses: PipetteCustomizableConfigElementInt
    pickUpSpeed: PipetteCustomizableConfigElementFloat
    plungerCurrent: PipetteCustomizableConfigElementFloat
    dropTipCurrent: PipetteCustomizableConfigElementFloat
    dropTipSpeed: PipetteCustomizableConfigElementFloat
    modelOffset: List[float]
    nozzleOffset: List[float]
    ulPerMm: List[UlPerMm]
    tipOverlap: Dict[str, float]
    tipLength: PipetteCustomizableConfigElementFloat
    quirks: List[Quirk]
    # these keys are not present in some pipette definitions
    backCompatNames: List[PipetteName]
    idleCurrent: float
    returnTipHeight: float


class PipetteFusedSpec(PipetteNameSpec, PipetteModelSpec, total=False):
    pass


class PipetteModelSpecs(TypedDict):
    config: Dict[PipetteModel, PipetteModelSpec]
    mutableConfigs: List[str]
    validQuirks: List[str]
