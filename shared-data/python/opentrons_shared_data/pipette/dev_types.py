"""
opentrons_shared_data.pipette.types: types for pipette config that
require typing_extensions.

This module should only be imported if typing.TYPE_CHECKING is True.
"""
from enum import Enum
from typing import Dict, List, NewType, Union

from typing_extensions import Literal, TypedDict

# TODO(mc, 2022-06-16): remove type alias when able
# and when certain removal will not break any pickling
from ..labware.types import LabwareUri as LabwareUri


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
    "p1000_multi_em",
    "p1000_96",
    "p200_96",
]


class PipetteNameType(str, Enum):
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
    P1000_MULTI_EM = "p1000_multi_em"
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
