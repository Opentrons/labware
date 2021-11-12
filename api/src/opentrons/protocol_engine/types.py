"""Public protocol engine value types and models."""
from enum import Enum
from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import Optional, Union

from opentrons.types import MountType, DeckSlotName


class EngineStatus(str, Enum):
    """Current execution status of a ProtocolEngine."""

    IDLE = "idle"
    RUNNING = "running"
    PAUSE_REQUESTED = "pause-requested"
    PAUSED = "paused"
    STOP_REQUESTED = "stop-requested"
    STOPPED = "stopped"
    FAILED = "failed"
    SUCCEEDED = "succeeded"


class DeckSlotLocation(BaseModel):
    """The location of something placed in a single deck slot."""

    slotName: DeckSlotName


LabwareLocation = Union[DeckSlotLocation]
"""Union of all locations where it's legal to load a labware."""


class WellOrigin(str, Enum):
    """Origin of WellLocation offset."""

    TOP = "top"
    BOTTOM = "bottom"


class WellOffset(BaseModel):
    """An offset vector in (x, y, z)."""

    x: float = 0
    y: float = 0
    z: float = 0


class WellLocation(BaseModel):
    """A relative location in reference to a well's location."""

    origin: WellOrigin = WellOrigin.TOP
    offset: WellOffset = Field(default_factory=WellOffset)


@dataclass(frozen=True)
class Dimensions:
    """Dimensions of an object in deck-space."""

    x: float
    y: float
    z: float


class DeckPoint(BaseModel):
    """Coordinates of a point in deck space."""

    x: float
    y: float
    z: float


# TODO(mc, 2021-04-16): reconcile with opentrons_shared_data
# shared-data/python/opentrons_shared_data/pipette/dev_types.py
class PipetteName(str, Enum):
    """Pipette load name values."""

    P10_SINGLE = "p10_single"
    P10_MULTI = "p10_multi"
    P20_SINGLE_GEN2 = "p20_single_gen2"
    P20_MULTI_GEN2 = "p20_multi_gen2"
    P50_SINGLE = "p50_single"
    P50_MULTI = "p50_multi"
    P300_SINGLE = "p300_single"
    P300_MULTI = "p300_multi"
    P300_SINGLE_GEN2 = "p300_single_gen2"
    P300_MULTI_GEN2 = "p300_multi_gen2"
    P1000_SINGLE = "p1000_single"
    P1000_SINGLE_GEN2 = "p1000_single_gen2"


class LoadedPipette(BaseModel):
    """A pipette that has been loaded."""

    id: str
    pipetteName: PipetteName
    mount: MountType


class MovementAxis(str, Enum):
    """Axis on which to issue a relative movement."""

    X = "x"
    Y = "y"
    Z = "z"


class LabwareOffsetVector(BaseModel):
    """Offset, in deck coordinates from nominal to actual position."""

    x: float
    y: float
    z: float


class LabwareOffset(BaseModel):
    """An offset that the robot adds to a pipette's position when it moves to a labware.

    During the run, if a labware is loaded whose definition URI and location
    both match what's found here, the given offset will be added to all
    pipette movements that use that labware as a reference point.
    """

    id: str = Field(..., description="Unique labware offset record identifier.")
    definitionUri: str = Field(..., description="The URI for the labware's definition.")
    location: LabwareLocation = Field(
        ...,
        description="Where the labware is located on the robot.",
    )
    # todo(mm, 2021-11-11): Messy terminology. Is an "offset" a 3D vector, or is
    # it this whole record, which the 3D vector is part of?
    offset: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )


class LabwareOffsetCreate(BaseModel):
    """Create request data for a labware offset."""

    definitionUri: str = Field(..., description="The URI for the labware's definition.")
    location: LabwareLocation = Field(
        ...,
        description="Where the labware is located on the robot.",
    )
    offset: LabwareOffsetVector = Field(
        ...,
        description="The offset applied to matching labware.",
    )

    def to_labware_offset(self, id: str) -> LabwareOffset:
        """Add an ID, converting the request to a fulfilled LabwareOffset."""
        return LabwareOffset(
            id=id,
            definitionUri=self.definitionUri,
            location=self.location,
            offset=self.offset,
        )


class LoadedLabware(BaseModel):
    """A labware that has been loaded."""

    id: str
    loadName: str
    definitionUri: str
    location: LabwareLocation
    # Field(...) to require offsetId to be provided even when None.
    offsetId: Optional[str] = Field(...)
