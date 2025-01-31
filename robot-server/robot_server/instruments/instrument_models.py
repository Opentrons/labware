"""Request and response models for /instruments endpoints."""
from __future__ import annotations

from typing_extensions import Literal
from typing import Optional, TypeVar, Union, Generic, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field


from opentrons.calibration_storage.types import SourceType
from opentrons.protocol_engine.types import Vec3f
from opentrons_shared_data.pipette.types import (
    PipetteName,
    PipetteModel,
    ChannelCount,
)
from opentrons_shared_data.gripper.gripper_definition import GripperModelStr
from robot_server.subsystems.models import SubSystem

InstrumentModelT = TypeVar(
    "InstrumentModelT", bound=Union[GripperModelStr, PipetteModel]
)
InstrumentDataT = TypeVar("InstrumentDataT", bound=BaseModel)

InstrumentType = Literal["pipette", "gripper"]


class InconsistentCalibrationFailure(BaseModel):
    """Pipette offsets are very different from each other.

    This indicates that one of the pipettes (though we can't tell which one)
    was likely calibrated with its calibration probe not fully attached, and
    should be redone. However, it's possible that the pipettes are in fact
    calibrated correctly and their offsets look strange, so this should be
    taken as an advisory.
    """

    kind: Literal["inconsistent-pipette-offset"] = "inconsistent-pipette-offset"
    offsets: Dict[str, Vec3f]
    limit: float


class _GenericInstrument(BaseModel, Generic[InstrumentModelT, InstrumentDataT]):
    """Base instrument response."""

    mount: str = Field(..., description="The mount this instrument is attached to.")
    instrumentType: InstrumentType = Field(
        ..., description="Type of instrument- either a pipette or a gripper."
    )
    instrumentModel: InstrumentModelT = Field(..., description="Instrument model.")
    serialNumber: str = Field(..., description="Instrument hardware serial number.")
    subsystem: Optional[SubSystem] = Field(
        default=None,
        description="The subsystem corresponding to this instrument.",
    )
    ok: Literal[True] = Field(
        ..., description="Whether this instrument is OK and ready to go"
    )
    firmwareVersion: Optional[str] = Field(
        default=None,
        description="The firmware version of this instrument (if applicable)",
    )
    data: InstrumentDataT


class InstrumentCalibrationData(BaseModel):
    """An instrument's calibration data."""

    offset: Vec3f
    source: SourceType
    last_modified: Optional[datetime] = None
    reasonability_check_failures: List[Union[InconsistentCalibrationFailure]]


class GripperData(BaseModel):
    """Data from attached gripper."""

    jawState: str = Field(..., description="Gripper Jaw state.")
    calibratedOffset: Optional[InstrumentCalibrationData] = Field(
        default=None, description="Calibrated gripper offset."
    )


class PipetteData(BaseModel):
    """Data from attached pipette."""

    channels: ChannelCount = Field(..., description="Number of pipette channels.")
    min_volume: float = Field(..., description="Minimum pipette volume.")
    max_volume: float = Field(..., description="Maximum pipette volume.")
    calibratedOffset: Optional[InstrumentCalibrationData] = Field(
        default=None, description="Calibrated pipette offset."
    )


class PipetteState(BaseModel):
    """State from an attached pipette."""

    tipDetected: Optional[bool] = Field(
        None,
        description="Physical state of the tip photointerrupter on the Flex. Null for OT-2",
        alias="tip_detected",
    )


class Pipette(_GenericInstrument[PipetteModel, PipetteData]):
    """Attached pipette info & configuration."""

    instrumentType: Literal["pipette"] = "pipette"
    instrumentName: PipetteName
    instrumentModel: PipetteModel
    data: PipetteData
    state: Optional[PipetteState] = None


class Gripper(_GenericInstrument[GripperModelStr, GripperData]):
    """Attached gripper info & configuration."""

    instrumentType: Literal["gripper"] = "gripper"
    instrumentModel: GripperModelStr
    data: GripperData


class _BadInstrument(BaseModel):
    """Represents something that is physically connected but broken in some way. Must be updated."""

    subsystem: SubSystem = Field(
        ..., description="The hardware subsystem for this instrument"
    )
    status: str = Field(
        ...,
        description="A route on this server to more information about the status of the hardware",
    )
    update: str = Field(
        ..., description="A route on this server to begin an update of the instrument"
    )
    ok: Literal[False] = Field(
        ...,
        description="If the instrument is not OK, a previous update was interrupted. It must be updated again.",
    )


class BadGripper(_BadInstrument):
    """Represents a gripper that is physically connected but not ready to operate."""

    instrumentType: Literal["gripper"] = "gripper"


class BadPipette(_BadInstrument):
    """Represents a pipette that is physically connected but not ready to operate."""

    instrumentType: Literal["pipette"] = "pipette"


AttachedItem = Union[Pipette, Gripper, BadPipette, BadGripper]
