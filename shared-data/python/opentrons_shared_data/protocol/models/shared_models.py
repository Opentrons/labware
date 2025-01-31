from typing import Optional, List, Dict, Any, Literal
from enum import Enum
from pydantic import BaseModel


class Dimensions(BaseModel):
    xDimension: float
    yDimension: float
    zDimension: float


class GroupMetadata(BaseModel):
    pass


class Group(BaseModel):
    metadata: GroupMetadata
    wells: List[str]


class Shape(Enum):
    circular = "circular"
    rectangular = "rectangular"


class WellDefinition(BaseModel):
    depth: float
    totalLiquidVolume: int
    shape: Shape
    x: float
    y: float
    z: float
    diameter: Optional[float] = None
    yDimension: Optional[float] = None
    xDimension: Optional[float] = None


class Metadata(BaseModel):
    protocolName: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    created: Optional[int] = None
    lastModified: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None


class Module(BaseModel):
    model: str


class Pipette(BaseModel):
    name: str


class Robot(BaseModel):
    model: Literal["OT-2 Standard", "OT-3 Standard"]
    deckId: str


class DesignerApplication(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class CommandAnnotation(BaseModel):
    commandIds: List[str]
    annotationType: str


class OffsetVector(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None


class Location(BaseModel):
    slotName: Optional[str] = None
    moduleId: Optional[str] = None
    labwareId: Optional[str] = None
    addressableAreaName: Optional[str] = None


class ProfileStep(BaseModel):
    celsius: float
    holdSeconds: float


class WellLocation(BaseModel):
    origin: Optional[str] = None
    offset: Optional[OffsetVector] = None


class Liquid(BaseModel):
    displayName: str
    description: str
    displayColor: Optional[str] = None


class Labware(BaseModel):
    displayName: Optional[str] = None
    definitionId: str


class NozzleConfigurationParams(BaseModel):
    style: str
    primaryNozzle: Optional[str] = None
    frontRightNozzle: Optional[str] = None
