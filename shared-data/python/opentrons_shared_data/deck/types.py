"""
opentrons_shared_data.deck.types: types for deck defs

This should only be imported if typing.TYPE_CHECKING is True
"""

from typing import Any, Dict, List, NewType, Union
from typing_extensions import Literal, TypedDict

from ..module.types import ModuleType


DeckSchemaVersion6 = Literal[6]
DeckSchemaVersion5 = Literal[5]
DeckSchemaVersion4 = Literal[4]
DeckSchemaVersion3 = Literal[3]
DeckSchemaVersion2 = Literal[2]
DeckSchemaVersion1 = Literal[1]

DeckSchema = NewType("DeckSchema", Dict[str, Any])

DeckSchemaId = Literal[
    "opentronsDeckSchemaV3",
    "opentronsDeckSchemaV4",
    "opentronsDeckSchemaV5",
    "opentronsDeckSchemaV6",
]
RobotModel = Union[Literal["OT-2 Standard"], Literal["OT-3 Standard"]]


class Metadata(TypedDict, total=False):
    displayName: str
    tags: List[str]


class Robot(TypedDict):
    model: RobotModel


class BoundingBox(TypedDict):
    xDimension: float
    yDimension: float
    zDimension: float


class SlotDefV3(TypedDict, total=False):
    id: str
    position: List[float]
    boundingBox: BoundingBox
    displayName: str
    compatibleModuleTypes: List[ModuleType]
    matingSurfaceUnitVector: List[Union[Literal[1], Literal[-1]]]


class CalibrationPoint(TypedDict):
    id: str
    position: List[float]
    displayName: str


class INode(TypedDict):
    name: str
    type: str
    value: str
    attributes: Dict[str, str]
    # this should be a recursive call to INode but we need to upgrade mypy
    children: List[Dict[str, Any]]


class FixedLabwareBySlot(TypedDict):
    id: str
    displayName: str
    labware: str
    slot: str


class FixedLabwareByPosition(TypedDict):
    id: str
    displayName: str
    labware: str
    position: List[float]


class FixedVolumeBySlot(TypedDict):
    id: str
    displayName: str
    boundingBox: BoundingBox
    slot: str


class FixedVolumeByPosition(TypedDict):
    id: str
    displayName: str
    boundingBox: BoundingBox
    position: List[float]


class LocatingFeature(TypedDict):
    locatingFeatureId: str
    offsetVector: List[float]


class _RequiredAddressableArea(TypedDict):
    id: str
    areaType: str
    offsetFromCutoutFixture: List[float]
    boundingBox: BoundingBox
    displayName: str


class AddressableAreaV4(_RequiredAddressableArea, total=False):
    compatibleModuleTypes: List[ModuleType]
    matingSurfaceUnitVector: List[Union[Literal[1], Literal[-1]]]
    ableToDropTips: bool
    ableToDropLabware: bool


class AddressableAreaV6(_RequiredAddressableArea, total=False):
    compatibleModuleTypes: List[ModuleType]
    locatingFeatures: List[LocatingFeature]
    ableToDropTips: bool
    ableToDropLabware: bool


class Cutout(TypedDict):
    id: str
    position: List[float]
    displayName: str


class CutoutFixture(TypedDict):
    id: str
    expectOpentronsModuleSerialNumber: bool
    mayMountTo: List[str]
    displayName: str
    providesAddressableAreas: Dict[str, List[str]]
    fixtureGroup: Dict[str, List[Dict[str, str]]]
    height: float


Fixture = Union[
    FixedLabwareBySlot, FixedLabwareByPosition, FixedVolumeBySlot, FixedVolumeByPosition
]


class LocationsV3(TypedDict):
    orderedSlots: List[SlotDefV3]
    calibrationPoints: List[CalibrationPoint]
    fixtures: List[Fixture]


class LocationsV4(TypedDict):
    addressableAreas: List[AddressableAreaV4]
    calibrationPoints: List[CalibrationPoint]
    cutouts: List[Cutout]
    legacyFixtures: List[Fixture]


class LocationsV6(TypedDict):
    addressableAreas: List[AddressableAreaV6]
    calibrationPoints: List[CalibrationPoint]
    cutouts: List[Cutout]
    legacyFixtures: List[Fixture]


class NamedOffset(TypedDict):
    x: float
    y: float
    z: float


class GripperOffsets(TypedDict):
    pickUpOffset: NamedOffset
    dropOffset: NamedOffset


class _RequiredDeckDefinitionV3(TypedDict):
    otId: str
    schemaVersion: Literal[3]
    cornerOffsetFromOrigin: List[float]
    dimensions: List[float]
    metadata: Metadata
    robot: Robot
    locations: LocationsV3
    layers: List[INode]


class DeckDefinitionV3(_RequiredDeckDefinitionV3, total=False):
    gripperOffsets: Dict[str, GripperOffsets]


class _RequiredDeckDefinitionV4(TypedDict):
    otId: str
    schemaVersion: Literal[4]
    cornerOffsetFromOrigin: List[float]
    dimensions: List[float]
    metadata: Metadata
    robot: Robot
    locations: LocationsV4
    cutoutFixtures: List[CutoutFixture]


class DeckDefinitionV4(_RequiredDeckDefinitionV4, total=False):
    gripperOffsets: Dict[str, GripperOffsets]


class _RequiredDeckDefinitionV5(TypedDict):
    otId: str
    schemaVersion: Literal[5]
    cornerOffsetFromOrigin: List[float]
    dimensions: List[float]
    metadata: Metadata
    robot: Robot
    locations: LocationsV4
    cutoutFixtures: List[CutoutFixture]


class DeckDefinitionV5(_RequiredDeckDefinitionV5, total=False):
    gripperOffsets: Dict[str, GripperOffsets]


class _RequiredDeckDefinitionV6(TypedDict):
    otId: str
    schemaVersion: Literal[6]
    cornerOffsetFromOrigin: List[float]
    dimensions: List[float]
    metadata: Metadata
    robot: Robot
    locations: LocationsV6
    cutoutFixtures: List[CutoutFixture]


class DeckDefinitionV6(_RequiredDeckDefinitionV6, total=False):
    gripperOffsets: Dict[str, GripperOffsets]


DeckDefinition = Union[
    DeckDefinitionV3, DeckDefinitionV4, DeckDefinitionV5, DeckDefinitionV6
]
