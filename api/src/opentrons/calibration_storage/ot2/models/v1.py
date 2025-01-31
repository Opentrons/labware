import typing

from typing_extensions import Literal
from pydantic import field_validator, BaseModel, Field, PlainSerializer
from datetime import datetime

from opentrons_shared_data.pipette.types import LabwareUri

from opentrons.types import Point
from opentrons.calibration_storage import types

DatetimeType = typing.Annotated[
    datetime,
    PlainSerializer(lambda x: x.isoformat(), when_used="json"),
]


class CalibrationStatus(BaseModel):
    markedBad: bool = False
    source: typing.Optional[types.SourceType] = None
    markedAt: typing.Optional[DatetimeType] = None


# Schemas used to store the data types
# TODO(lc 09-01-2022) We should ensure that all pydantic models are
# in camel case, but for now, the schemas are following the format
# they are currently saved in on the OT-2 to avoid a large migration.
class TipLengthModel(BaseModel):
    tipLength: float = Field(..., description="Tip length data found from calibration.")
    lastModified: DatetimeType = Field(
        ..., description="The last time this tip length was calibrated."
    )
    source: types.SourceType = Field(
        default=types.SourceType.factory, description="The source of calibration."
    )
    status: CalibrationStatus = Field(
        default_factory=CalibrationStatus,
        description="The status of the calibration data.",
    )
    # Old data may have a `uri` field, replaced later by `definitionHash`.
    # uri: typing.Union[LabwareUri, Literal[""]] = Field(
    #    ..., description="The tiprack URI associated with the tip length data."
    # )
    definitionHash: str = Field(
        ..., description="The tiprack hash associated with the tip length data."
    )

    @field_validator("tipLength")
    @classmethod
    def ensure_tip_length_positive(cls, tipLength: float) -> float:
        if tipLength < 0.0:
            raise ValueError("Tip Length must be a positive number")
        return tipLength


class DeckCalibrationModel(BaseModel):
    attitude: types.AttitudeMatrix = Field(
        ..., description="Attitude matrix for deck found from calibration."
    )
    last_modified: typing.Optional[DatetimeType] = Field(
        default=None, description="The last time this deck was calibrated."
    )
    source: types.SourceType = Field(
        default=types.SourceType.factory, description="The source of calibration."
    )
    pipette_calibrated_with: typing.Optional[str] = Field(
        default=None, description="The pipette id used to calibrate the deck."
    )
    tiprack: typing.Optional[str] = Field(
        default=None, description="The tiprack id used to calibrate the deck."
    )
    status: CalibrationStatus = Field(
        default_factory=CalibrationStatus,
        description="The status of the calibration data.",
    )


class InstrumentOffsetModel(BaseModel):
    offset: Point = Field(..., description="Instrument offset found from calibration.")
    tiprack: str = Field(..., description="Tiprack used to calibrate this offset")
    uri: str = Field(
        ..., description="The URI of the labware used for instrument offset"
    )
    last_modified: DatetimeType = Field(
        ..., description="The last time this instrument was calibrated."
    )
    source: types.SourceType = Field(
        default=types.SourceType.factory, description="The source of calibration."
    )
    status: CalibrationStatus = Field(
        default_factory=CalibrationStatus,
        description="The status of the calibration data.",
    )


# TODO(lc 09-19-2022) We need to refactor the calibration endpoints
# so that we only need to use one data model schema. This model is a
# temporary workaround to match with current behavior.
class PipetteOffsetCalibration(BaseModel):
    pipette: str = Field(..., description="Pipette id associated with calibration.")
    mount: str = Field(
        ..., description="The mount that this pipette was calibrated with."
    )
    offset: Point = Field(..., description="Instrument offset found from calibration.")
    tiprack: str = Field(..., description="Tiprack used to calibrate this offset")
    uri: str = Field(
        ..., description="The URI of the labware used for instrument offset"
    )
    last_modified: DatetimeType = Field(
        ..., description="The last time this instrument was calibrated."
    )
    source: types.SourceType = Field(
        default=types.SourceType.factory, description="The source of calibration."
    )
    status: CalibrationStatus = Field(
        default_factory=CalibrationStatus,
        description="The status of the calibration data.",
    )


# TODO(lc 09-19-2022) We need to refactor the calibration endpoints
# so that we only need to use one data model schema. This model is a
# temporary workaround to match with current behavior.
class TipLengthCalibration(BaseModel):
    pipette: str = Field(..., description="Pipette id associated with calibration.")
    tiprack: str = Field(
        ..., description="The tiprack hash associated with this tip length data."
    )
    tipLength: float = Field(..., description="Tip length data found from calibration.")
    lastModified: DatetimeType = Field(
        ..., description="The last time this tip length was calibrated."
    )
    source: types.SourceType = Field(
        default=types.SourceType.factory, description="The source of calibration."
    )
    status: CalibrationStatus = Field(
        default_factory=CalibrationStatus,
        description="The status of the calibration data.",
    )
    uri: typing.Union[LabwareUri, Literal[""]] = Field(
        ..., description="The tiprack URI associated with the tip length data."
    )

    @field_validator("tipLength")
    @classmethod
    def ensure_tip_length_positive(cls, tipLength: float) -> float:
        if tipLength < 0.0:
            raise ValueError("Tip Length must be a positive number")
        return tipLength
