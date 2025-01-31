"""Public protocol engine value types and models."""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
from pathlib import Path
from typing import (
    Any,
    Dict,
    FrozenSet,
    List,
    Mapping,
    NamedTuple,
    Optional,
    Tuple,
    Union,
)

from pydantic import (
    ConfigDict,
    BaseModel,
    Field,
    RootModel,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
)
from typing_extensions import Literal, TypeGuard

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.types import MountType, DeckSlotName, StagingSlotName
from opentrons.hardware_control.types import (
    TipStateType as HwTipStateType,
    InstrumentProbeType,
)
from opentrons.hardware_control.modules import (
    ModuleType as ModuleType,
)
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    ByTipTypeSetting,
)
from opentrons_shared_data.pipette.types import (  # noqa: F401
    # convenience re-export of LabwareUri type
    LabwareUri as LabwareUri,
)
from opentrons_shared_data.module.types import ModuleType as SharedDataModuleType


# todo(mm, 2024-06-24): This monolithic status field is getting to be a bit much.
# We should consider splitting this up into multiple fields.
class EngineStatus(str, Enum):
    """Current execution status of a ProtocolEngine.

    This is a high-level summary of what the robot is doing and what interactions are
    appropriate.
    """

    # Statuses for an ongoing run:

    IDLE = "idle"
    """The protocol has not been started yet.

    The robot may truly be idle, or it may be executing commands with `intent: "setup"`.
    """

    RUNNING = "running"
    """The engine is actively running the protocol."""

    PAUSED = "paused"
    """A pause has been requested. Activity is paused, or will pause soon.

    (There is currently no way to tell which.)
    """

    BLOCKED_BY_OPEN_DOOR = "blocked-by-open-door"
    """The robot's door is open. Activity is paused, or will pause soon."""

    STOP_REQUESTED = "stop-requested"
    """A stop has been requested. Activity will stop soon."""

    FINISHING = "finishing"
    """The robot is doing post-run cleanup, like homing and dropping tips."""

    # Statuses for error recovery mode:

    AWAITING_RECOVERY = "awaiting-recovery"
    """The engine is waiting for external input to recover from a nonfatal error.

    New commands with `intent: "fixit"` may be enqueued, which will run immediately.
    The run can't be paused in this state, but it can be canceled, or resumed from the
    next protocol command if recovery is complete.
    """

    AWAITING_RECOVERY_PAUSED = "awaiting-recovery-paused"
    """The engine is paused while in error recovery mode. Activity is paused, or will pause soon.

    This state is not possible to enter manually. It happens when an open door
    gets closed during error recovery.
    """

    AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR = "awaiting-recovery-blocked-by-open-door"
    """The robot's door is open while in recovery mode. Activity is paused, or will pause soon."""

    # Terminal statuses:

    STOPPED = "stopped"
    """All activity is over; it was stopped by an explicit external request."""

    FAILED = "failed"
    """All activity is over; there was a fatal error."""

    SUCCEEDED = "succeeded"
    """All activity is over; things completed without any fatal error."""


class DeckSlotLocation(BaseModel):
    """The location of something placed in a single deck slot."""

    slotName: DeckSlotName = Field(
        ...,
        description=(
            # This description should be kept in sync with LabwareOffsetLocation.slotName.
            "A slot on the robot's deck."
            "\n\n"
            'The plain numbers like `"5"` are for the OT-2,'
            ' and the coordinates like `"C2"` are for the Flex.'
            "\n\n"
            "When you provide one of these values, you can use either style."
            " It will automatically be converted to match the robot."
            "\n\n"
            "When one of these values is returned, it will always match the robot."
        ),
    )


class StagingSlotLocation(BaseModel):
    """The location of something placed in a single staging slot."""

    slotName: StagingSlotName = Field(
        ...,
        description=(
            # This description should be kept in sync with LabwareOffsetLocation.slotName.
            "A slot on the robot's staging area."
            "\n\n"
            "These apply only to the Flex. The OT-2 has no staging slots."
        ),
    )


class AddressableAreaLocation(BaseModel):
    """The location of something place in an addressable area. This is a superset of deck slots."""

    addressableAreaName: str = Field(
        ...,
        description=(
            "The name of the addressable area that you want to use."
            " Valid values are the `id`s of `addressableArea`s in the"
            " [deck definition](https://github.com/Opentrons/opentrons/tree/edge/shared-data/deck)."
        ),
    )


class ModuleLocation(BaseModel):
    """The location of something placed atop a hardware module."""

    moduleId: str = Field(
        ...,
        description="The ID of a loaded module from a prior `loadModule` command.",
    )


class OnLabwareLocation(BaseModel):
    """The location of something placed atop another labware."""

    labwareId: str = Field(
        ...,
        description="The ID of a loaded Labware from a prior `loadLabware` command.",
    )


_OffDeckLocationType = Literal["offDeck"]
OFF_DECK_LOCATION: _OffDeckLocationType = "offDeck"

LabwareLocation = Union[
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    _OffDeckLocationType,
    AddressableAreaLocation,
]
"""Union of all locations where it's legal to keep a labware."""

OnDeckLabwareLocation = Union[
    DeckSlotLocation, ModuleLocation, OnLabwareLocation, AddressableAreaLocation
]

NonStackedLocation = Union[
    DeckSlotLocation, AddressableAreaLocation, ModuleLocation, _OffDeckLocationType
]
"""Union of all locations where it's legal to keep a labware that can't be stacked on another labware"""


class WellOrigin(str, Enum):
    """Origin of WellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
        MENISCUS: the meniscus-center of the well
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"
    MENISCUS = "meniscus"


class PickUpTipWellOrigin(str, Enum):
    """The origin of a PickUpTipWellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"


class DropTipWellOrigin(str, Enum):
    """The origin of a DropTipWellLocation offset.

    Props:
        TOP: the top-center of the well
        BOTTOM: the bottom-center of the well
        CENTER: the middle-center of the well
        DEFAULT: the default drop-tip location of the well,
            based on pipette configuration and length of the tip.
    """

    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"
    DEFAULT = "default"


# This is deliberately a separate type from Vec3f to let components default to 0.
class WellOffset(BaseModel):
    """An offset vector in (x, y, z)."""

    x: float = 0
    y: float = 0
    z: float = 0


class WellLocation(BaseModel):
    """A relative location in reference to a well's location."""

    origin: WellOrigin = WellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)
    volumeOffset: float = Field(
        default=0.0,
        description="""A volume of liquid, in µL, to offset the z-axis offset.""",
    )


class LiquidHandlingWellLocation(BaseModel):
    """A relative location in reference to a well's location.

    To be used with commands that handle liquids.
    """

    origin: WellOrigin = WellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)
    volumeOffset: Union[float, Literal["operationVolume"]] = Field(
        default=0.0,
        description="""A volume of liquid, in µL, to offset the z-axis offset. When "operationVolume" is specified, this volume is pulled from the command volume parameter.""",
    )


class PickUpTipWellLocation(BaseModel):
    """A relative location in reference to a well's location.

    To be used for picking up tips.
    """

    origin: PickUpTipWellOrigin = PickUpTipWellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)


class DropTipWellLocation(BaseModel):
    """Like WellLocation, but for dropping tips.

    Unlike a typical WellLocation, the location for a drop tip
    defaults to location based on the tip length rather than the well's top.
    """

    origin: DropTipWellOrigin = DropTipWellOrigin.DEFAULT
    offset: WellOffset = Field(default_factory=WellOffset)


@dataclass(frozen=True)
class Dimensions:
    """Dimensions of an object in deck-space."""

    x: float
    y: float
    z: float


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class DeckPoint(BaseModel):
    """Coordinates of a point in deck space."""

    x: float
    y: float
    z: float


# TODO(mm, 2023-05-10): Deduplicate with constants in
# opentrons.protocols.api_support.deck_type
# and consider moving to shared-data.
class DeckType(str, Enum):
    """Types of deck available."""

    OT2_STANDARD = "ot2_standard"
    OT2_SHORT_TRASH = "ot2_short_trash"
    OT3_STANDARD = "ot3_standard"


class LoadedPipette(BaseModel):
    """A pipette that has been loaded."""

    id: str
    pipetteName: PipetteNameType
    mount: MountType


@dataclass
class FlowRates:
    """Default and current flow rates for a pipette."""

    default_blow_out: Dict[str, float]
    default_aspirate: Dict[str, float]
    default_dispense: Dict[str, float]


@dataclass(frozen=True)
class CurrentWell:
    """The latest well that the robot has accessed."""

    pipette_id: str
    labware_id: str
    well_name: str


class LoadedVolumeInfo(BaseModel):
    """A well's liquid volume, initialized by a LoadLiquid, updated by Aspirate and Dispense."""

    volume: Optional[float] = None
    last_loaded: datetime
    operations_since_load: int


class ProbedHeightInfo(BaseModel):
    """A well's liquid height, initialized by a LiquidProbe, cleared by Aspirate and Dispense."""

    height: Optional[float] = None
    last_probed: datetime


class ProbedVolumeInfo(BaseModel):
    """A well's liquid volume, initialized by a LiquidProbe, updated by Aspirate and Dispense."""

    volume: Optional[float] = None
    last_probed: datetime
    operations_since_probe: int


class WellInfoSummary(BaseModel):
    """Payload for a well's liquid info in StateSummary."""

    labware_id: str
    well_name: str
    loaded_volume: Optional[float] = None
    probed_height: Optional[float] = None
    probed_volume: Optional[float] = None


@dataclass
class WellLiquidInfo:
    """Tracked and sensed information about liquid in a well."""

    probed_height: Optional[ProbedHeightInfo]
    loaded_volume: Optional[LoadedVolumeInfo]
    probed_volume: Optional[ProbedVolumeInfo]


@dataclass(frozen=True)
class CurrentAddressableArea:
    """The latest addressable area the robot has accessed."""

    pipette_id: str
    addressable_area_name: str


CurrentPipetteLocation = Union[CurrentWell, CurrentAddressableArea]


@dataclass(frozen=True)
class TipGeometry:
    """Tip geometry data.

    Props:
        length: The effective length (total length minus overlap) of a tip in mm.
        diameter: Tip diameter in mm.
        volume: Maximum volume in µL.
    """

    length: float
    diameter: float
    volume: float


class FluidKind(str, Enum):
    """A kind of fluid that can be inside a pipette."""

    LIQUID = "LIQUID"
    AIR = "AIR"


@dataclass(frozen=True)
class AspiratedFluid:
    """Fluid inside a pipette."""

    kind: FluidKind
    volume: float


class MovementAxis(str, Enum):
    """Axis on which to issue a relative movement."""

    X = "x"
    Y = "y"
    Z = "z"


class MotorAxis(str, Enum):
    """Motor axis on which to issue a home command."""

    X = "x"
    Y = "y"
    LEFT_Z = "leftZ"
    RIGHT_Z = "rightZ"
    LEFT_PLUNGER = "leftPlunger"
    RIGHT_PLUNGER = "rightPlunger"
    EXTENSION_Z = "extensionZ"
    EXTENSION_JAW = "extensionJaw"
    AXIS_96_CHANNEL_CAM = "axis96ChannelCam"


# TODO(mc, 2022-01-18): use opentrons_shared_data.module.types.ModuleModel
class ModuleModel(str, Enum):
    """All available modules' models."""

    TEMPERATURE_MODULE_V1 = "temperatureModuleV1"
    TEMPERATURE_MODULE_V2 = "temperatureModuleV2"
    MAGNETIC_MODULE_V1 = "magneticModuleV1"
    MAGNETIC_MODULE_V2 = "magneticModuleV2"
    THERMOCYCLER_MODULE_V1 = "thermocyclerModuleV1"
    THERMOCYCLER_MODULE_V2 = "thermocyclerModuleV2"
    HEATER_SHAKER_MODULE_V1 = "heaterShakerModuleV1"
    MAGNETIC_BLOCK_V1 = "magneticBlockV1"
    ABSORBANCE_READER_V1 = "absorbanceReaderV1"

    def as_type(self) -> ModuleType:
        """Get the ModuleType of this model."""
        if ModuleModel.is_temperature_module_model(self):
            return ModuleType.TEMPERATURE
        elif ModuleModel.is_magnetic_module_model(self):
            return ModuleType.MAGNETIC
        elif ModuleModel.is_thermocycler_module_model(self):
            return ModuleType.THERMOCYCLER
        elif ModuleModel.is_heater_shaker_module_model(self):
            return ModuleType.HEATER_SHAKER
        elif ModuleModel.is_magnetic_block(self):
            return ModuleType.MAGNETIC_BLOCK
        elif ModuleModel.is_absorbance_reader(self):
            return ModuleType.ABSORBANCE_READER

        assert False, f"Invalid ModuleModel {self}"

    @classmethod
    def is_temperature_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[TemperatureModuleModel]:
        """Whether a given model is a Temperature Module."""
        return model in [cls.TEMPERATURE_MODULE_V1, cls.TEMPERATURE_MODULE_V2]

    @classmethod
    def is_magnetic_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[MagneticModuleModel]:
        """Whether a given model is a Magnetic Module."""
        return model in [cls.MAGNETIC_MODULE_V1, cls.MAGNETIC_MODULE_V2]

    @classmethod
    def is_thermocycler_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[ThermocyclerModuleModel]:
        """Whether a given model is a Thermocycler Module."""
        return model in [cls.THERMOCYCLER_MODULE_V1, cls.THERMOCYCLER_MODULE_V2]

    @classmethod
    def is_heater_shaker_module_model(
        cls, model: ModuleModel
    ) -> TypeGuard[HeaterShakerModuleModel]:
        """Whether a given model is a Heater-Shaker Module."""
        return model == cls.HEATER_SHAKER_MODULE_V1

    @classmethod
    def is_magnetic_block(cls, model: ModuleModel) -> TypeGuard[MagneticBlockModel]:
        """Whether a given model is a Magnetic block."""
        return model == cls.MAGNETIC_BLOCK_V1

    @classmethod
    def is_absorbance_reader(
        cls, model: ModuleModel
    ) -> TypeGuard[AbsorbanceReaderModel]:
        """Whether a given model is an Absorbance Plate Reader."""
        return model == cls.ABSORBANCE_READER_V1


TemperatureModuleModel = Literal[
    ModuleModel.TEMPERATURE_MODULE_V1, ModuleModel.TEMPERATURE_MODULE_V2
]
MagneticModuleModel = Literal[
    ModuleModel.MAGNETIC_MODULE_V1, ModuleModel.MAGNETIC_MODULE_V2
]
ThermocyclerModuleModel = Literal[
    ModuleModel.THERMOCYCLER_MODULE_V1, ModuleModel.THERMOCYCLER_MODULE_V2
]
HeaterShakerModuleModel = Literal[ModuleModel.HEATER_SHAKER_MODULE_V1]
MagneticBlockModel = Literal[ModuleModel.MAGNETIC_BLOCK_V1]
AbsorbanceReaderModel = Literal[ModuleModel.ABSORBANCE_READER_V1]


class ModuleDimensions(BaseModel):
    """Dimension type for modules."""

    bareOverallHeight: float
    overLabwareHeight: float
    lidHeight: Optional[float] = None


class Vec3f(BaseModel):
    """A 3D vector of floats."""

    x: float
    y: float
    z: float


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class ModuleCalibrationPoint(BaseModel):
    """Calibration Point type for module definition."""

    x: float
    y: float
    z: float


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class LabwareOffsetVector(BaseModel):
    """Offset, in deck coordinates from nominal to actual position."""

    x: float
    y: float
    z: float

    def __add__(self, other: Any) -> LabwareOffsetVector:
        """Adds two vectors together."""
        if not isinstance(other, LabwareOffsetVector):
            return NotImplemented
        return LabwareOffsetVector(
            x=self.x + other.x, y=self.y + other.y, z=self.z + other.z
        )

    def __sub__(self, other: Any) -> LabwareOffsetVector:
        """Subtracts two vectors."""
        if not isinstance(other, LabwareOffsetVector):
            return NotImplemented
        return LabwareOffsetVector(
            x=self.x - other.x, y=self.y - other.y, z=self.z - other.z
        )


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class InstrumentOffsetVector(BaseModel):
    """Instrument Offset from home position to robot deck."""

    x: float
    y: float
    z: float


# TODO(mm, 2022-11-07): Deduplicate with Vec3f.
class ModuleOffsetVector(BaseModel):
    """Offset, in deck coordinates, from nominal to actual position of labware on a module."""

    x: float
    y: float
    z: float


@dataclass
class ModuleOffsetData:
    """Module calibration offset data."""

    moduleOffsetVector: ModuleOffsetVector
    location: DeckSlotLocation


class OverlapOffset(Vec3f):
    """Offset representing overlap space of one labware on top of another labware or module."""


class AddressableOffsetVector(Vec3f):
    """Offset, in deck coordinates, from nominal to actual position of an addressable area."""


class LabwareMovementOffsetData(BaseModel):
    """Offsets to be used during labware movement."""

    pickUpOffset: LabwareOffsetVector
    dropOffset: LabwareOffsetVector


# TODO(mm, 2023-04-13): Move to shared-data, so this binding can be maintained alongside the JSON
# schema that it's sourced from. We already do that for labware definitions and JSON protocols.
class ModuleDefinition(BaseModel):
    """A module definition conforming to module definition schema v3."""

    # Note: This field is misleading.
    #
    # This class only models v3 definitions ("module/schemas/3"), not v2 ("module/schemas/2").
    # labwareOffset is required to have a z-component, for example.
    #
    # When parsing from a schema v3 JSON definition into this model,
    # the definition's `"$otSharedSchema": "module/schemas/3"` field will be thrown away
    # because it has a dollar sign, which doesn't match this field.
    # Then, this field will default to "module/schemas/2", because no value was provided.
    #
    # We should fix this field once Jira RSS-221 is resolved. RSS-221 makes it difficult to fix
    # because robot-server has been storing and loading these bad fields in its database.
    otSharedSchema: str = Field("module/schemas/2", description="The current schema.")

    moduleType: ModuleType = Field(
        ...,
        description="Module type (Temperature/Magnetic/Thermocycler)",
    )

    model: ModuleModel = Field(..., description="Model name of the module")

    labwareOffset: LabwareOffsetVector = Field(
        ...,
        description="Labware offset in x, y, z.",
    )

    dimensions: ModuleDimensions = Field(..., description="Module dimension")

    calibrationPoint: ModuleCalibrationPoint = Field(
        ...,
        description="Calibration point of module.",
    )

    displayName: str = Field(..., description="Display name.")

    quirks: List[str] = Field(..., description="Module quirks")

    # In releases prior to https://github.com/Opentrons/opentrons/pull/11873 (v6.3.0),
    # the matrices in slotTransforms were 3x3.
    # After, they are 4x4, even though there was no schema version bump.
    #
    # Because old objects of this class, with the 3x3 matrices, were stored in robot-server's
    # database, this field needs to stay typed loosely enough to support both sizes.
    # We can fix this once Jira RSS-221 is resolved.
    slotTransforms: Dict[str, Any] = Field(
        ...,
        description="Dictionary of transforms for each slot.",
    )

    compatibleWith: List[ModuleModel] = Field(
        ...,
        description="List of module models this model is compatible with.",
    )
    gripperOffsets: Optional[Dict[str, LabwareMovementOffsetData]] = Field(
        default_factory=dict,
        description="Offsets to use for labware movement using gripper",
    )


class LoadedModule(BaseModel):
    """A module that has been loaded."""

    id: str
    model: ModuleModel
    location: Optional[DeckSlotLocation] = None
    serialNumber: Optional[str] = None


class LabwareOffsetLocation(BaseModel):
    """Parameters describing when a given offset may apply to a given labware load."""

    slotName: DeckSlotName = Field(
        ...,
        description=(
            "The deck slot where the protocol will load the labware."
            " Or, if the protocol will load the labware on a module,"
            " the deck slot where the protocol will load that module."
            "\n\n"
            # This description should be kept in sync with DeckSlotLocation.slotName.
            'The plain numbers like `"5"` are for the OT-2,'
            ' and the coordinates like `"C2"` are for the Flex.'
            "\n\n"
            "When you provide one of these values, you can use either style."
            " It will automatically be converted to match the robot."
            "\n\n"
            "When one of these values is returned, it will always match the robot."
        ),
    )
    moduleModel: Optional[ModuleModel] = Field(
        None,
        description=(
            "The model of the module that the labware will be loaded onto,"
            " if applicable."
            "\n\n"
            "Because of module compatibility, the model that the protocol requests"
            " may not be exactly the same"
            " as what it will find physically connected during execution."
            " For this labware offset to apply,"
            " this field must be the *requested* model, not the connected one."
            " You can retrieve this from a `loadModule` command's `params.model`"
            " in the protocol's analysis."
        ),
    )
    definitionUri: Optional[str] = Field(
        None,
        description=(
            "The definition URI of a labware that a labware can be loaded onto,"
            " if applicable."
            "\n\n"
            "This can be combined with moduleModel if the labware is loaded on top of"
            " an adapter that is loaded on a module."
        ),
    )


class LabwareOffset(BaseModel):
    """An offset that the robot adds to a pipette's position when it moves to a labware.

    During the run, if a labware is loaded whose definition URI and location
    both match what's found here, the given offset will be added to all
    pipette movements that use that labware as a reference point.
    """

    id: str = Field(..., description="Unique labware offset record identifier.")
    createdAt: datetime = Field(..., description="When this labware offset was added.")
    definitionUri: str = Field(..., description="The URI for the labware's definition.")
    location: LabwareOffsetLocation = Field(
        ...,
        description="Where the labware is located on the robot.",
    )
    vector: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )


class LabwareOffsetCreate(BaseModel):
    """Create request data for a labware offset."""

    definitionUri: str = Field(..., description="The URI for the labware's definition.")
    location: LabwareOffsetLocation = Field(
        ...,
        description="Where the labware is located on the robot.",
    )
    vector: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )


class LoadedLabware(BaseModel):
    """A labware that has been loaded."""

    id: str
    loadName: str
    definitionUri: str
    location: LabwareLocation = Field(
        ..., description="The labware's current location."
    )
    lid_id: Optional[str] = Field(
        None,
        description=("Labware ID of a Lid currently loaded on top of the labware."),
    )
    offsetId: Optional[str] = Field(
        None,
        description=(
            "An ID referencing the labware offset"
            " that applies to this labware placement."
            " Null or undefined means no offset was provided for this load,"
            " so the default of (0, 0, 0) will be used."
        ),
    )
    displayName: Optional[str] = Field(
        None,
        description="A user-specified display name for this labware, if provided.",
    )


class HexColor(RootModel[str]):
    """Hex color representation."""

    root: str = Field(pattern=r"^#(?:[0-9a-fA-F]{3,4}){1,2}$")


EmptyLiquidId = Literal["EMPTY"]
LiquidId = str | EmptyLiquidId


class Liquid(BaseModel):
    """Payload required to create a liquid."""

    id: str
    displayName: str
    description: str
    displayColor: Optional[HexColor] = None


class LiquidClassRecord(ByTipTypeSetting, frozen=True):
    """LiquidClassRecord is our internal representation of an (immutable) liquid class.

    Conceptually, a liquid class record is the tuple (name, pipette, tip, transfer properties).
    We consider two liquid classes to be the same if every entry in that tuple is the same; and liquid
    classes are different if any entry in the tuple is different.

    This class defines the tuple via inheritance so that we can reuse the definitions from shared_data.
    """

    liquidClassName: str = Field(
        ...,
        description="Identifier for the liquid of this liquid class, e.g. glycerol50.",
    )
    pipetteModel: str = Field(
        ...,
        description="Identifier for the pipette of this liquid class.",
    )
    # The other fields like tiprack ID, aspirate properties, etc. are pulled in from ByTipTypeSetting.

    def __hash__(self) -> int:
        """Hash function for LiquidClassRecord."""
        # Within the Protocol Engine, LiquidClassRecords are immutable, and we'd like to be able to
        # look up LiquidClassRecords by value, which involves hashing. However, Pydantic does not
        # generate a usable hash function if any of the subfields (like Coordinate) are not frozen.
        # So we have to implement the hash function ourselves.
        # Our strategy is to recursively convert this object into a list of (key, value) tuples.
        def dict_to_tuple(d: dict[str, Any]) -> tuple[tuple[str, Any], ...]:
            return tuple(
                (
                    field_name,
                    dict_to_tuple(value)
                    if isinstance(value, dict)
                    else tuple(value)
                    if isinstance(value, list)
                    else value,
                )
                for field_name, value in d.items()
            )

        return hash(dict_to_tuple(self.model_dump()))


class LiquidClassRecordWithId(LiquidClassRecord, frozen=True):
    """A LiquidClassRecord with its ID, for use in summary lists."""

    liquidClassId: str = Field(
        ...,
        description="Unique identifier for this liquid class.",
    )


class SpeedRange(NamedTuple):
    """Minimum and maximum allowed speeds for a shaking module."""

    min: int
    max: int


class TemperatureRange(NamedTuple):
    """Minimum and maximum allowed temperatures for a heating module."""

    min: float
    max: float


class HeaterShakerLatchStatus(Enum):
    """Heater-Shaker latch status for determining pipette and labware movement errors."""

    CLOSED = "closed"
    OPEN = "open"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class HeaterShakerMovementRestrictors:
    """Shaking status, latch status and slot location for determining movement restrictions."""

    plate_shaking: bool
    latch_status: HeaterShakerLatchStatus
    deck_slot: int


class LabwareMovementStrategy(str, Enum):
    """Strategy to use for labware movement."""

    USING_GRIPPER = "usingGripper"
    MANUAL_MOVE_WITH_PAUSE = "manualMoveWithPause"
    MANUAL_MOVE_WITHOUT_PAUSE = "manualMoveWithoutPause"


@dataclass(frozen=True)
class PotentialCutoutFixture:
    """Cutout and cutout fixture id associated with a potential cutout fixture that can be on the deck."""

    cutout_id: str
    cutout_fixture_id: str
    provided_addressable_areas: FrozenSet[str]


class AreaType(Enum):
    """The type of addressable area."""

    SLOT = "slot"
    STAGING_SLOT = "stagingSlot"
    MOVABLE_TRASH = "movableTrash"
    FIXED_TRASH = "fixedTrash"
    WASTE_CHUTE = "wasteChute"
    THERMOCYCLER = "thermocycler"
    HEATER_SHAKER = "heaterShaker"
    TEMPERATURE = "temperatureModule"
    MAGNETICBLOCK = "magneticBlock"
    ABSORBANCE_READER = "absorbanceReader"
    LID_DOCK = "lidDock"


@dataclass(frozen=True)
class AddressableArea:
    """Addressable area that has been loaded."""

    area_name: str
    area_type: AreaType
    base_slot: DeckSlotName
    display_name: str
    bounding_box: Dimensions
    position: AddressableOffsetVector
    compatible_module_types: List[SharedDataModuleType]


class PostRunHardwareState(Enum):
    """State of robot gantry & motors after a stop is performed and the hardware API is reset.

    HOME_AND_STAY_ENGAGED: home the gantry and keep all motors engaged. This allows the
        robot to continue performing movement actions without re-homing
    HOME_THEN_DISENGAGE: home the gantry and then disengage motors.
        Reduces current consumption of the motors and prevents coil heating.
        Re-homing is required to re-engage the motors and resume robot movement.
    STAY_ENGAGED_IN_PLACE: do not home after the stop and keep the motors engaged.
        Keeps gantry in the same position as prior to `stop()` execution
        and allows the robot to execute movement commands without requiring to re-home first.
    DISENGAGE_IN_PLACE: disengage motors and do not home the robot
    Probable states for pipette:
        - for 1- or 8-channel:
            - HOME_AND_STAY_ENGAGED after protocol runs
            - STAY_ENGAGED_IN_PLACE after maintenance runs
        - for 96-channel:
            - HOME_THEN_DISENGAGE after protocol runs
            - DISENGAGE_IN_PLACE after maintenance runs
    """

    HOME_AND_STAY_ENGAGED = "homeAndStayEngaged"
    HOME_THEN_DISENGAGE = "homeThenDisengage"
    STAY_ENGAGED_IN_PLACE = "stayEngagedInPlace"
    DISENGAGE_IN_PLACE = "disengageInPlace"


NOZZLE_NAME_REGEX = r"[A-Z]\d{1,2}"
PRIMARY_NOZZLE_LITERAL = Literal["A1", "H1", "A12", "H12"]


class AllNozzleLayoutConfiguration(BaseModel):
    """All basemodel to represent a reset to the nozzle configuration. Sending no parameters resets to default."""

    style: Literal["ALL"] = "ALL"


class SingleNozzleLayoutConfiguration(BaseModel):
    """Minimum information required for a new nozzle configuration."""

    style: Literal["SINGLE"] = "SINGLE"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class RowNozzleLayoutConfiguration(BaseModel):
    """Minimum information required for a new nozzle configuration."""

    style: Literal["ROW"] = "ROW"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class ColumnNozzleLayoutConfiguration(BaseModel):
    """Information required for nozzle configurations of type ROW and COLUMN."""

    style: Literal["COLUMN"] = "COLUMN"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )


class QuadrantNozzleLayoutConfiguration(BaseModel):
    """Information required for nozzle configurations of type QUADRANT."""

    style: Literal["QUADRANT"] = "QUADRANT"
    primaryNozzle: PRIMARY_NOZZLE_LITERAL = Field(
        ...,
        description="The primary nozzle to use in the layout configuration. This nozzle will update the critical point of the current pipette. For now, this is also the back left corner of your rectangle.",
    )
    frontRightNozzle: str = Field(
        ...,
        pattern=NOZZLE_NAME_REGEX,
        description="The front right nozzle in your configuration.",
    )
    backLeftNozzle: str = Field(
        ...,
        pattern=NOZZLE_NAME_REGEX,
        description="The back left nozzle in your configuration.",
    )


NozzleLayoutConfigurationType = Union[
    AllNozzleLayoutConfiguration,
    SingleNozzleLayoutConfiguration,
    ColumnNozzleLayoutConfiguration,
    RowNozzleLayoutConfiguration,
    QuadrantNozzleLayoutConfiguration,
]

# TODO make the below some sort of better type
# TODO This should instead contain a proper cutout fixture type
DeckConfigurationType = List[
    Tuple[str, str, Optional[str]]
]  # cutout_id, cutout_fixture_id, opentrons_module_serial_number


class InstrumentSensorId(str, Enum):
    """Primary and secondary sensor ids."""

    PRIMARY = "primary"
    SECONDARY = "secondary"
    BOTH = "both"

    def to_instrument_probe_type(self) -> InstrumentProbeType:
        """Convert to InstrumentProbeType."""
        return {
            InstrumentSensorId.PRIMARY: InstrumentProbeType.PRIMARY,
            InstrumentSensorId.SECONDARY: InstrumentProbeType.SECONDARY,
            InstrumentSensorId.BOTH: InstrumentProbeType.BOTH,
        }[self]


class TipPresenceStatus(str, Enum):
    """Tip presence status reported by a pipette."""

    PRESENT = "present"
    ABSENT = "absent"
    UNKNOWN = "unknown"

    def to_hw_state(self) -> HwTipStateType:
        """Convert to hardware tip state."""
        assert self != TipPresenceStatus.UNKNOWN
        return {
            TipPresenceStatus.PRESENT: HwTipStateType.PRESENT,
            TipPresenceStatus.ABSENT: HwTipStateType.ABSENT,
        }[self]

    @classmethod
    def from_hw_state(cls, state: HwTipStateType) -> "TipPresenceStatus":
        """Convert from hardware tip state."""
        return {
            HwTipStateType.PRESENT: TipPresenceStatus.PRESENT,
            HwTipStateType.ABSENT: TipPresenceStatus.ABSENT,
        }[state]


class NextTipInfo(BaseModel):
    """Next available tip labware and well name data."""

    labwareId: str = Field(
        ...,
        description="The labware ID of the tip rack where the next available tip(s) are located.",
    )
    tipStartingWell: str = Field(
        ..., description="The (starting) well name of the next available tip(s)."
    )


class NoTipReason(Enum):
    """The cause of no tip being available for a pipette and tip rack(s)."""

    NO_AVAILABLE_TIPS = "noAvailableTips"
    STARTING_TIP_WITH_PARTIAL = "startingTipWithPartial"
    INCOMPATIBLE_CONFIGURATION = "incompatibleConfiguration"


class NoTipAvailable(BaseModel):
    """No available next tip data."""

    noTipReason: NoTipReason = Field(
        ..., description="The reason why no next available tip could be provided."
    )
    message: Optional[str] = Field(
        None, description="Optional message explaining why a tip wasn't available."
    )


class BaseCommandAnnotation(BaseModel):
    """Optional annotations for protocol engine commands."""

    commandKeys: List[str] = Field(
        ..., description="Command keys to which this annotation applies"
    )
    annotationType: str = Field(
        ..., description="The type of annotation (for machine parsing)"
    )


class SecondOrderCommandAnnotation(BaseCommandAnnotation):
    """Annotates a group of atomic commands which were the direct result of a second order command.

    Examples of second order commands would be transfer, consolidate, mix, etc.
    """

    annotationType: Literal["secondOrderCommand"] = "secondOrderCommand"
    params: Dict[str, Any] = Field(
        ...,
        description="Key value pairs of the parameters passed to the second order command that this annotates.",
    )
    machineReadableName: str = Field(
        ...,
        description="The name of the second order command in the form that the generating software refers to it",
    )
    userSpecifiedName: Optional[str] = Field(
        None, description="The optional user-specified name of the second order command"
    )
    userSpecifiedDescription: Optional[str] = Field(
        None,
        description="The optional user-specified description of the second order command",
    )


class CustomCommandAnnotation(BaseCommandAnnotation):
    """Annotates a group of atomic commands in some manner that Opentrons software does not anticipate or originate."""

    annotationType: Literal["custom"] = "custom"
    model_config = ConfigDict(extra="allow")


CommandAnnotation = Union[SecondOrderCommandAnnotation, CustomCommandAnnotation]


# TODO (spp, 2024-04-02): move all RTP types to runner
class RTPBase(BaseModel):
    """Parameters defined in a protocol."""

    displayName: StrictStr = Field(..., description="Display string for the parameter.")
    variableName: StrictStr = Field(
        ..., description="Python variable name of the parameter."
    )
    description: Optional[StrictStr] = Field(
        None, description="Detailed description of the parameter."
    )
    suffix: Optional[StrictStr] = Field(
        None,
        description="Units (like mL, mm/sec, etc) or a custom suffix for the parameter.",
    )


class NumberParameter(RTPBase):
    """An integer parameter defined in a protocol."""

    type: Literal["int", "float"] = Field(
        ..., description="String specifying whether the number is an int or float type."
    )
    min: Union[StrictInt, StrictFloat] = Field(
        ..., description="Minimum value that the number param is allowed to have."
    )
    max: Union[StrictInt, StrictFloat] = Field(
        ..., description="Maximum value that the number param is allowed to have."
    )
    value: Union[StrictInt, StrictFloat] = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: Union[StrictInt, StrictFloat] = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class BooleanParameter(RTPBase):
    """A boolean parameter defined in a protocol."""

    type: Literal["bool"] = Field(
        default="bool", description="String specifying the type of this parameter"
    )
    value: StrictBool = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: StrictBool = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class EnumChoice(BaseModel):
    """Components of choices used in RTP Enum Parameters."""

    displayName: StrictStr = Field(
        ..., description="Display string for the param's choice."
    )
    value: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ..., description="Enum value of the param's choice."
    )


class EnumParameter(RTPBase):
    """A string enum defined in a protocol."""

    type: Literal["int", "float", "str"] = Field(
        ...,
        description="String specifying whether the parameter is an int or float or string type.",
    )
    choices: List[EnumChoice] = Field(
        ..., description="List of valid choices for this parameter."
    )
    value: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ...,
        description="The value assigned to the parameter; if not supplied by the client, will be assigned the default value.",
    )
    default: Union[StrictInt, StrictFloat, StrictStr] = Field(
        ...,
        description="Default value of the parameter, to be used when there is no client-specified value.",
    )


class FileInfo(BaseModel):
    """A file UUID descriptor."""

    id: str = Field(
        ...,
        description="The UUID identifier of the file stored on the robot.",
    )
    name: str = Field(..., description="Name of the file, including the extension.")


class CSVParameter(RTPBase):
    """A CSV file parameter defined in a protocol."""

    type: Literal["csv_file"] = Field(
        default="csv_file", description="String specifying the type of this parameter"
    )
    file: Optional[FileInfo] = Field(
        default=None,
        description="ID of the CSV file stored on the robot; to be used for fetching the CSV file."
        " For local analysis this will most likely be empty.",
    )


RunTimeParameter = Union[NumberParameter, EnumParameter, BooleanParameter, CSVParameter]

PrimitiveRunTimeParamValuesType = Mapping[
    StrictStr, Union[StrictInt, StrictFloat, StrictBool, StrictStr]
]  # update value types as more RTP types are added

CSVRunTimeParamFilesType = Mapping[StrictStr, StrictStr]
CSVRuntimeParamPaths = Dict[str, Path]


ABSMeasureMode = Literal["single", "multi"]
