from datetime import datetime

from pydantic import Field

from opentrons.calibration_storage.types import SourceType
from robot_server.service.json_api import (
    DeprecatedResponseModel,
    DeprecatedMultiResponseModel,
    DeprecatedResponseDataModel,
)
from robot_server.service.shared_models import calibration as cal_model


class TipLengthCalibration(DeprecatedResponseDataModel):
    """
    A model describing tip length calibration
    """

    tipLength: float = Field(..., description="The tip length value in mm")
    tiprack: str = Field(
        ...,
        description="A hash of the labware definition of the tip rack that"
        " was used in this calibration."
        " This is deprecated because it was prone to bugs where semantically identical"
        " definitions had different hashes."
        " Use `uri` instead.",
        json_schema_extra={"deprecated": True},
    )
    pipette: str = Field(..., description="The pipette ID")
    lastModified: datetime = Field(
        ..., description="When this calibration was last modified"
    )
    source: SourceType = Field(..., description="The calibration source")
    status: cal_model.CalibrationStatus = Field(
        ..., description="The status of this calibration"
    )
    uri: str = Field(..., description="The uri of the tiprack")


MultipleCalibrationsResponse = DeprecatedMultiResponseModel[TipLengthCalibration]

SingleCalibrationResponse = DeprecatedResponseModel[TipLengthCalibration]
