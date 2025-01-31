import typing
from datetime import datetime
from enum import Enum

from pydantic import Field

from opentrons.calibration_storage.types import SourceType
from robot_server.service.json_api import (
    DeprecatedResponseModel,
    DeprecatedMultiResponseModel,
    DeprecatedResponseDataModel,
)
from robot_server.service.shared_models import calibration as cal_model

OffsetVector = typing.Tuple[float, float, float]


class MountType(str, Enum):
    """Pipette mount type"""

    left = "left"
    right = "right"


class PipetteOffsetCalibration(DeprecatedResponseDataModel):
    """
    A model describing pipette calibration based on the mount and
    the pipette's serial number
    """

    pipette: str = Field(..., description="The pipette ID")
    mount: str = Field(..., description="The pipette mount")
    offset: typing.List[float] = Field(
        ..., description="The pipette offset vector", max_length=3, min_length=3
    )
    tiprack: str = Field(
        ...,
        description="A hash of the labware definition of the tip rack"
        " that was used in this calibration."
        " This is deprecated because it was prone to bugs where semantically identical"
        " definitions had different hashes. Use `tiprackUri` instead.",
    )
    tiprackUri: str = Field(
        ...,
        description="The standard labware uri of the tiprack "
        "used in this calibration",
    )
    lastModified: datetime = Field(
        ..., description="When this calibration was last modified"
    )
    source: SourceType = Field(..., description="The calibration source")
    status: cal_model.CalibrationStatus = Field(
        ..., description="The status of this calibration"
    )


MultipleCalibrationsResponse = DeprecatedMultiResponseModel[PipetteOffsetCalibration]

SingleCalibrationResponse = DeprecatedResponseModel[PipetteOffsetCalibration]
