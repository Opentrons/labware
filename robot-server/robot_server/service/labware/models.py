import typing
from datetime import datetime

from functools import partial
from pydantic import ConfigDict, BaseModel, Field

from robot_server.service.json_api import (
    DeprecatedResponseDataModel,
    DeprecatedMultiResponseModel,
)

# NOTE: this would be more accurately typed as
# a typing.Tuple[float, float, float], but tuple is
# not able to be expressed in OpenAPI Spec
OffsetVector = typing.Sequence[float]

OffsetVectorField = partial(
    Field, ..., description="A labware offset vector in deck coordinates (x, y, z)"
)


class OffsetData(BaseModel):
    value: OffsetVector = OffsetVectorField()
    lastModified: datetime = Field(
        ..., description="When this calibration was last modified"
    )


class TipData(BaseModel):
    """
    A model for tip length calibration data
    """

    value: typing.Optional[float] = Field(
        ..., description="The tip length of a labware"
    )
    lastModified: typing.Optional[datetime] = Field(
        ..., description="When this calibration was last modified"
    )


class CalibrationData(BaseModel):
    """
    A model for labware calibration data
    """

    offset: OffsetData = Field(..., description="An array of XYZ offset data.")
    tipLength: TipData = Field(
        ..., description="The tip length of a labware, if relevant."
    )


class LabwareCalibration(DeprecatedResponseDataModel):
    """
    A model describing labware calibrations (tiplength and offset)
    """

    calibrationData: CalibrationData = Field(
        ...,
        description="A dictionary of calibration data"
        "including tip length and offsets",
    )
    loadName: str = Field(..., description="The loadname of the labware definition.")
    namespace: str = Field(
        ..., description="The namespace location of the labware definition"
    )
    version: int = Field(..., description="The labware definition version")
    parent: str = Field(
        ...,
        description="The module associated with this offset or an empty"
        " string if the offset is associated with a slot",
    )
    definitionHash: str = Field(
        ..., description="The sha256 hash of key labware definition details"
    )
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "calibrationData": {
                        "tipLength": {
                            "value": 10,
                            "lastModified": "2020-07-10T12:50:47.156321",
                        },
                        "offset": {
                            "value": [1, -2, 10],
                            "lastModified": "2020-07-10T12:40:17.05",
                        },
                    },
                    "version": "1",
                    "parent": "",
                    "namespace": "opentrons",
                    "loadName": "opentrons_96_tiprack_300ul",
                },
                {
                    "calibrationData": {
                        "tipLength": {
                            "value": 10,
                            "lastModified": "2020-07-10T12:50:47.156321",
                        },
                        "offset": {
                            "value": [1, -2, 10],
                            "lastModified": "2020-07-10T12:40:17.05",
                        },
                    },
                    "version": "1",
                    "parent": "temperatureModuleV2",
                    "namespace": "opentrons",
                    "loadName": "corning_96_wellPlate_384ul",
                },
            ]
        }
    )


MultipleCalibrationsResponse = DeprecatedMultiResponseModel[LabwareCalibration]
