import re
from typing import List, Dict, Tuple, Optional, Annotated, Literal, TypeVar
from pydantic import (
    field_validator,
    BaseModel,
    Field,
    BeforeValidator,
    PlainSerializer,
)
from dataclasses import dataclass

from . import types as pip_types, types

# The highest and lowest existing overlap version values.
TIP_OVERLAP_VERSION_MINIMUM = 0
TIP_OVERLAP_VERSION_MAXIMUM = 3

PLUNGER_CURRENT_MINIMUM = 0.1
PLUNGER_CURRENT_MAXIMUM = 1.5

NOZZLE_MAP_NAMES = re.compile(r"(?P<row>[A-Z]+)(?P<column>[0-9]+)")
COLUMN_NAMES = re.compile(r"[0-9]+")
ROW_NAMES = re.compile(r"[A-Z]+")
OT_TIPRACK_NAMES = re.compile(r"opentrons/[a-z0-9._]+/[0-9]")


def validate_opentrons_tiprack(v: str) -> str:
    if not OT_TIPRACK_NAMES.match(v):
        raise ValueError("{v} is not a valid tiprack name.")
    return v


EnumType = TypeVar("EnumType")
EnumSerializer = Annotated[EnumType, PlainSerializer(lambda v: v.value)]


# TODO (lc 12-5-2022) Ideally we can deprecate this
# at somepoint once we load pipettes by channels and type
@dataclass
class PipetteNameType:
    pipette_type: pip_types.PipetteModelType
    pipette_channels: pip_types.PipetteChannelType
    pipette_generation: pip_types.PipetteGenerationType
    oem_type: pip_types.PipetteOEMType

    def __repr__(self) -> str:
        oem_name = (
            f"_{self.oem_type.value}"
            if self.oem_type != pip_types.PipetteOEMType.OT
            else ""
        )
        base_name = f"{self.pipette_type.name}_{str(self.pipette_channels)}{oem_name}"
        if self.pipette_generation == pip_types.PipetteGenerationType.GEN1:
            return base_name
        elif self.pipette_channels == pip_types.PipetteChannelType.NINETY_SIX_CHANNEL:
            return base_name
        else:
            return f"{base_name}_{self.pipette_generation.name.lower()}"

    def get_version(self) -> pip_types.PipetteVersionType:
        if self.pipette_generation == pip_types.PipetteGenerationType.FLEX:
            return pip_types.PipetteVersionType(3, 0)
        elif self.pipette_generation == pip_types.PipetteGenerationType.GEN2:
            return pip_types.PipetteVersionType(2, 0)
        else:
            return pip_types.PipetteVersionType(1, 0)


@dataclass
class PipetteModelVersionType:
    pipette_type: pip_types.PipetteModelType
    pipette_channels: pip_types.PipetteChannelType
    pipette_version: pip_types.PipetteVersionType
    oem_type: pip_types.PipetteOEMType

    def __repr__(self) -> str:
        oem_name = (
            f"_{self.oem_type.value}"
            if self.oem_type != pip_types.PipetteOEMType.OT
            else ""
        )
        base_name = f"{self.pipette_type.name}_{str(self.pipette_channels)}{oem_name}"

        return f"{base_name}_v{self.pipette_version}"


class FlowRateDefinition(BaseModel):
    default: float = Field(..., description="Highest API level default fallback.")
    values_by_api_level: Dict[str, float] = Field(
        ..., description="flow rates keyed by API level.", alias="valuesByApiLevel"
    )


PipetteFunctionKeyType = Literal["1", "2", "3"]
ulPerMMType = Dict[PipetteFunctionKeyType, List[Tuple[float, float, float]]]


class ulPerMMDefinition(BaseModel):
    default: ulPerMMType


class SupportedTipsDefinition(BaseModel):
    """Tip parameters available for every tip size."""

    default_aspirate_flowrate: FlowRateDefinition = Field(
        ...,
        description="The flowrate used in aspirations by default. For lowVolumeDefault only, the flowrate matches uiMaxFlowRate for ui purposes, it does not change physical behavior.",
        alias="defaultAspirateFlowRate",
    )
    default_dispense_flowrate: FlowRateDefinition = Field(
        ...,
        description="The flowrate used in dispenses by default. For lowVolumeDefault only, the flowrate matches uiMaxFlowRate for ui purposes, it does not change physical behavior.",
        alias="defaultDispenseFlowRate",
    )
    default_blowout_flowrate: FlowRateDefinition = Field(
        ...,
        description="The flowrate used in blowouts by default. For lowVolumeDefault only, the flowrate matches uiMaxFlowRate for ui purposes, it does not change physical behavior.",
        alias="defaultBlowOutFlowRate",
    )
    default_flow_acceleration: float = Field(
        float("inf"),  # no default works for all pipettes
        description="The acceleration used during aspirate/dispense/blowout in ul/s^2.",
        alias="defaultFlowAcceleration",
    )
    default_tip_length: float = Field(
        ...,
        description="The default tip length associated with this tip type.",
        alias="defaultTipLength",
    )
    default_return_tip_height: float = Field(
        default=0.5,
        description="The height to return a tip to its tiprack.",
        alias="defaultReturnTipHeight",
    )
    aspirate: ulPerMMDefinition = Field(
        ..., description="The default pipetting functions list for aspirate."
    )
    dispense: ulPerMMDefinition = Field(
        ..., description="The default pipetting functions list for dispensing."
    )
    default_push_out_volume: float = Field(
        ...,
        description="The default volume for a push-out during dispense.",
        alias="defaultPushOutVolume",
    )
    ui_max_flow_rate: float = Field(
        float(
            "inf"
        ),  # some pipettes (GEN1, unreleased prototype models) don't have a max flow rate
        description="The lowest volume max flow rate for a pipette's given supported tip, minus 2 percent for safety.",
        alias="uiMaxFlowRate",
    )


class MotorConfigurations(BaseModel):
    idle: float = Field(
        ..., description="The plunger motor current to use during idle states."
    )
    run: float = Field(
        ..., description="The plunger motor current to use during active states."
    )


class PlungerPositions(BaseModel):
    top: float = Field(
        ...,
        description="The plunger position that describes max available volume of a pipette in mm.",
    )
    bottom: float = Field(
        ...,
        description="The plunger position that describes min available volume of a pipette in mm.",
    )
    blow_out: float = Field(
        ...,
        description="The plunger position past 0 volume to blow out liquid.",
        alias="blowout",
    )
    drop_tip: float = Field(
        ..., description="The plunger position used to drop tips.", alias="drop"
    )


class PlungerHomingConfigurations(BaseModel):
    current: float = Field(
        default=0.0,
        description="The current to move the plunger axis for homing.",
    )
    speed: float = Field(
        ...,
        description="The speed to move the plunger axis for homing.",
    )


class ValidNozzleMaps(BaseModel):
    maps: Dict[str, List[str]] = Field(
        ...,
        description="Dictionary of predetermined nozzle maps for partial tip configurations.",
    )


class PressAndCamConfigurationValues(BaseModel):
    speed: float = Field(
        ...,
        description="The speed to move the Z axis for each force pickup of a given tip configuration for a given tip type.",
    )
    distance: float = Field(
        ...,
        description="The starting distance to begin a pick up tip from, based on tip configuration and tip type.",
    )
    current: float = Field(
        ...,
        description="The current used by a given tip configuration by tip type.",
    )
    versioned_tip_overlap_dictionary: Dict[str, Dict[str, float]] = Field(
        ...,
        description="Versioned default tip overlap dictionaries associated with this tip type by configuration.",
        alias="tipOverlaps",
    )


class PressFitPickUpTipConfiguration(BaseModel):
    presses: int = Field(
        ...,
        description="The number of times to force pickup (incrementally more each time by increment)",
    )
    increment: float = Field(
        ...,
        description="The increment to move the pipette down on each force tip pickup press",
    )
    configuration_by_nozzle_map: Dict[
        str, Dict[str, PressAndCamConfigurationValues]
    ] = Field(
        ...,
        description="The speed, distance, current and tip overlap configurations for a given pipette configuration. Double dictionary is keyed by Valid Nozzle Map Key and Tip Type.",
        alias="configurationsByNozzleMap",
    )


class CamActionPickUpTipConfiguration(BaseModel):
    prep_move_distance: float = Field(
        ..., description="How far to move the cams to engage the rack"
    )
    prep_move_speed: float = Field(
        ..., description="How fast to move the cams when moving to the rack"
    )
    connect_tiprack_distance_mm: float = Field(
        description="The distance to move the head down to connect with the tiprack before clamping.",
        alias="connectTiprackDistanceMM",
    )
    configuration_by_nozzle_map: Dict[
        str, Dict[str, PressAndCamConfigurationValues]
    ] = Field(
        ...,
        description="The speed, distance, current and overlap configurations for a given partial tip configuration by tip type.",
        alias="configurationsByNozzleMap",
    )


class PlungerEjectDropTipConfiguration(BaseModel):
    current: float = Field(
        ..., description="The current to use on the plunger motor when dropping a tip"
    )
    speed: float = Field(
        ..., description="How fast to move the plunger motor when dropping a tip"
    )


class CamActionDropTipConfiguration(BaseModel):
    current: float = Field(
        ..., description="The current to use on the cam motors when dropping tips"
    )
    distance: float = Field(
        ..., description="The distance to move the cams when dropping tips"
    )
    speed: float = Field(
        ..., description="How fast to move the cams when dropping tips"
    )
    prep_move_distance: float = Field(
        ..., description="How far to move the cams after disengaging"
    )
    prep_move_speed: float = Field(
        ..., description="How fast to move the cams after disengaging"
    )


class DropTipConfigurations(BaseModel):
    plunger_eject: Optional[PlungerEjectDropTipConfiguration] = Field(
        None,
        description="Configuration for tip drop via plunger eject",
        alias="plungerEject",
    )
    cam_action: Optional[CamActionDropTipConfiguration] = Field(
        None, description="Configuration for tip drop via cam action", alias="camAction"
    )


class PickUpTipConfigurations(BaseModel):
    press_fit: PressFitPickUpTipConfiguration = Field(
        description="Configuration for tip pickup via press fit", alias="pressFit"
    )
    cam_action: Optional[CamActionPickUpTipConfiguration] = Field(
        default=None,
        description="Configuration for tip pickup via cam action",
        alias="camAction",
    )


class AvailableSensorDefinition(BaseModel):
    """The number and type of sensors available in the pipette."""

    sensors: List[str] = Field(..., description="")


class PartialTipDefinition(BaseModel):
    partial_tip_supported: bool = Field(
        ...,
        description="Whether partial tip pick up is supported.",
        alias="partialTipSupported",
    )
    available_configurations: Optional[List[int]] = Field(
        default=None,
        description="A list of the types of partial tip configurations supported, listed by channel ints",
        alias="availableConfigurations",
    )


class PipettePhysicalPropertiesDefinition(BaseModel):
    """The physical properties definition of a pipette."""

    display_name: str = Field(
        ...,
        description="The display or full product name of the pipette.",
        alias="displayName",
    )
    pipette_backcompat_names: List[types.PipetteName] = Field(
        ...,
        description="A list of pipette names that are compatible with this pipette.",
        alias="backCompatNames",
    )
    pipette_type: EnumSerializer[pip_types.PipetteModelType] = Field(
        ...,
        description="The pipette model type (related to number of channels).",
        alias="model",
    )
    display_category: EnumSerializer[pip_types.PipetteGenerationType] = Field(
        ..., description="The product model of the pipette.", alias="displayCategory"
    )
    pick_up_tip_configurations: PickUpTipConfigurations = Field(
        ..., alias="pickUpTipConfigurations"
    )
    drop_tip_configurations: DropTipConfigurations = Field(
        ..., alias="dropTipConfigurations"
    )
    plunger_homing_configurations: PlungerHomingConfigurations = Field(
        ..., alias="plungerHomingConfigurations"
    )
    plunger_motor_configurations: MotorConfigurations = Field(
        ..., alias="plungerMotorConfigurations"
    )
    plunger_positions_configurations: Dict[
        pip_types.LiquidClasses, PlungerPositions
    ] = Field(..., alias="plungerPositionsConfigurations")
    available_sensors: AvailableSensorDefinition = Field(..., alias="availableSensors")
    partial_tip_configurations: PartialTipDefinition = Field(
        ..., alias="partialTipConfigurations"
    )
    channels: EnumSerializer[pip_types.PipetteChannelType] = Field(
        ..., description="The maximum number of channels on the pipette."
    )
    shaft_diameter: float = Field(
        ..., description="The diameter of the pipette shaft.", alias="shaftDiameter"
    )
    shaft_ul_per_mm: float = Field(
        ...,
        description="The conversion rate between uL dispensed and mm of motor movement.",
        alias="shaftULperMM",
    )
    backlash_distance: float = Field(
        ...,
        description="The distance of backlash on the plunger motor.",
        alias="backlashDistance",
    )
    quirks: List[EnumSerializer[pip_types.Quirks]] = Field(
        ..., description="The list of quirks available for the loaded configuration"
    )
    tip_presence_check_distance_mm: float = Field(
        default=0,
        description="The distance the high throughput tip motors will travel to check tip status.",
        alias="tipPresenceCheckDistanceMM",
    )
    end_tip_action_retract_distance_mm: float = Field(
        default=0.0,
        description="The distance to move the head up after a tip drop or pickup.",
        alias="endTipActionRetractDistanceMM",
    )

    @field_validator("pipette_type", mode="before")
    @classmethod
    def convert_pipette_model_string(cls, v: str) -> pip_types.PipetteModelType:
        return pip_types.PipetteModelType(v)

    @field_validator("channels", mode="before")
    @classmethod
    def convert_channels(cls, v: int) -> pip_types.PipetteChannelType:
        return pip_types.PipetteChannelType(v)

    @field_validator("display_category", mode="before")
    @classmethod
    def convert_display_category(cls, v: str) -> pip_types.PipetteGenerationType:
        if not v:
            return pip_types.PipetteGenerationType.GEN1
        return pip_types.PipetteGenerationType(v)

    @field_validator("quirks", mode="before")
    @classmethod
    def convert_quirks(cls, v: List[str]) -> List[pip_types.Quirks]:
        return [pip_types.Quirks(q) for q in v]

    @field_validator("plunger_positions_configurations", mode="before")
    @classmethod
    def convert_plunger_positions(
        cls, v: Dict[str, PlungerPositions]
    ) -> Dict[pip_types.LiquidClasses, PlungerPositions]:
        return {pip_types.LiquidClasses[key]: value for key, value in v.items()}


class PipetteRowDefinition(BaseModel):
    key: str
    ordered_nozzles: List[str] = Field(..., alias="orderedNozzles")

    @field_validator("key")
    @classmethod
    def check_key_is_row(cls, v: str) -> str:
        if not ROW_NAMES.search(v):
            raise ValueError(f"{v} is not a valid row name")
        return v


class PipetteColumnDefinition(BaseModel):
    key: str
    ordered_nozzles: List[str] = Field(..., alias="orderedNozzles")

    @field_validator("key")
    @classmethod
    def check_key_is_column(cls, v: str) -> str:
        if not COLUMN_NAMES.search(v):
            raise ValueError(f"{v} is not a valid column name")
        return v


class PipetteBoundingBoxOffsetDefinition(BaseModel):
    back_left_corner: List[float] = Field(..., alias="backLeftCorner")
    front_right_corner: List[float] = Field(..., alias="frontRightCorner")


class PipetteGeometryDefinition(BaseModel):
    """The geometry properties definition of a pipette."""

    nozzle_offset: List[float] = Field(..., alias="nozzleOffset")
    path_to_3D: str = Field(
        ...,
        description="The shared data relative path to the 3D representation of the pipette model.",
        alias="pathTo3D",
    )
    nozzle_map: Dict[str, List[float]] = Field(..., alias="nozzleMap")
    pipette_bounding_box_offsets: PipetteBoundingBoxOffsetDefinition = Field(
        ..., alias="pipetteBoundingBoxOffsets"
    )
    ordered_columns: List[PipetteColumnDefinition] = Field(..., alias="orderedColumns")
    ordered_rows: List[PipetteRowDefinition] = Field(..., alias="orderedRows")
    lld_settings: Dict[str, Dict[str, float]] = Field(..., alias="lldSettings")

    @field_validator("nozzle_map", mode="before")
    @classmethod
    def check_nonempty_strings(
        cls, v: Dict[str, List[float]]
    ) -> Dict[str, List[float]]:
        # Note, the key should be able to be a regex but I think
        # we're not on a pydantic version that supports that.
        for k in v.keys():
            if not NOZZLE_MAP_NAMES.match(k):
                raise ValueError("{k} is not a valid key entry for nozzle map.")
        return v


class PipetteLiquidPropertiesDefinition(BaseModel):
    """The liquid properties definition of a pipette."""

    supported_tips: Dict[pip_types.PipetteTipType, SupportedTipsDefinition] = Field(
        ..., alias="supportedTips"
    )
    max_volume: int = Field(
        ...,
        description="The maximum supported volume of the pipette.",
        alias="maxVolume",
    )
    min_volume: float = Field(
        ...,
        description="The minimum supported volume of the pipette.",
        alias="minVolume",
    )
    default_tipracks: List[
        Annotated[str, BeforeValidator(validate_opentrons_tiprack)]
    ] = Field(
        ...,
        description="A list of default tiprack paths.",
        alias="defaultTipracks",
    )

    @field_validator("supported_tips", mode="before")
    @classmethod
    def convert_aspirate_key_to_channel_type(
        cls, v: Dict[str, SupportedTipsDefinition]
    ) -> Dict[pip_types.PipetteTipType, SupportedTipsDefinition]:
        return {pip_types.PipetteTipType[key]: value for key, value in v.items()}


class PipetteConfigurations(
    PipetteGeometryDefinition,
    PipettePhysicalPropertiesDefinition,
):
    """The full pipette configurations of a given model and version."""

    version: pip_types.PipetteVersionType = Field(
        ..., description="The version of the configuration loaded."
    )
    mount_configurations: pip_types.RobotMountConfigs = Field(
        ...,
    )
    liquid_properties: Dict[
        pip_types.LiquidClasses, PipetteLiquidPropertiesDefinition
    ] = Field(
        ..., description="A dictionary of liquid properties keyed by liquid classes."
    )

    @field_validator("liquid_properties", mode="before")
    @classmethod
    def convert_liquid_properties_key(
        cls, v: Dict[str, PipetteLiquidPropertiesDefinition]
    ) -> Dict[pip_types.LiquidClasses, PipetteLiquidPropertiesDefinition]:
        return {pip_types.LiquidClasses[key]: value for key, value in v.items()}


def liquid_class_for_volume_between_default_and_defaultlowvolume(
    volume: float,
    current_liquid_class_name: pip_types.LiquidClasses,
    available_liquid_classes: Dict[
        pip_types.LiquidClasses, PipetteLiquidPropertiesDefinition
    ],
) -> pip_types.LiquidClasses:
    """Determine the appropriate liquid class to use for a volume.

    This function has such a weird name because it is hardcoded to only use the liquid
    classes default and defaultLowVolume. It should no longer be used when those liquid
    classes change.
    """
    # For now, until we add more liquid classes, we're going to hardcode the default
    # and lowVolumeDefault liquid classes as the ones to switch between.
    has_lvd = pip_types.LiquidClasses.lowVolumeDefault in available_liquid_classes

    if not has_lvd:
        return pip_types.LiquidClasses.default
    if volume >= available_liquid_classes[pip_types.LiquidClasses.default].min_volume:
        return pip_types.LiquidClasses.default
    return pip_types.LiquidClasses.lowVolumeDefault


def default_tip_for_liquid_class(
    liquid_class_config: PipetteLiquidPropertiesDefinition,
) -> pip_types.PipetteTipType:
    """Provide a "default tip", the one with the largest volume."""
    tip_names = liquid_class_config.supported_tips.keys()
    return sorted(tip_names, key=lambda tip: tip.value)[-1]
