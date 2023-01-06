"""Request and response models for /instruments endpoints."""
from typing import Optional, TypeVar, Union, Generic
from enum import Enum
from pydantic import BaseModel, Field
from pydantic.generics import GenericModel

from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    GripperCalibrationOffset,
)
from opentrons.hardware_control.types import GripperJawState

from opentrons_shared_data.pipette.dev_types import (
    PipetteName,
    PipetteModel,
    ChannelCount,
)
from opentrons_shared_data.gripper.dev_types import (
    GripperName,
    GripperModel,
)

InstrumentT = TypeVar("InstrumentT", bound=Union[GripperName, PipetteName])
InstrumentModelT = TypeVar("InstrumentModelT", bound=Union[GripperModel, PipetteModel])
InstrumentDataT = TypeVar("InstrumentDataT", bound=BaseModel)


# TODO (spp, 2023-01-03): use MountType from opentrons.types once it has extension type
class MountType(str, Enum):
    """Available mount types."""

    LEFT = "left"
    RIGHT = "right"
    EXTENSION = "extension"


class GenericInstrument(
    GenericModel, Generic[InstrumentT, InstrumentModelT, InstrumentDataT]
):
    """Base instrument response."""

    mount: MountType = Field(
        ..., description="The mount this instrument is attached to."
    )
    instrumentName: Union[PipetteName, GripperName] = Field(
        ..., description="Name of the instrument."
    )
    instrumentModel: Union[PipetteModel, GripperModel] = Field(
        ..., description="Instrument model."
    )
    instrumentSerial: str = Field(..., description="Instrument hardware serial number.")
    data: InstrumentDataT


class GripperData(BaseModel):
    """Data from attached gripper."""

    jawState: GripperJawState = Field(..., description="Gripper Jaw state.")
    # TODO (spp, 2023-01-03): update calibration field as decided after
    #  spike https://opentrons.atlassian.net/browse/RSS-167
    calibratedOffset: Optional[GripperCalibrationOffset] = Field(
        None, description="Calibrated gripper offset."
    )


class PipetteData(BaseModel):
    """Data from attached pipette."""

    channels: ChannelCount = Field(..., description="Number of pipette channels.")
    min_volume: float = Field(..., description="Minimum pipette volume.")
    max_volume: float = Field(..., description="Maximum pipette volume.")
    # TODO (spp, 2022-12-20): update/ add fields according to client needs and
    #  add calibration data as decided by https://opentrons.atlassian.net/browse/RSS-167


class Pipette(GenericInstrument[PipetteName, PipetteModel, PipetteData]):
    """Attached gripper info & configuration."""

    instrumentName: PipetteName
    instrumentModel: PipetteModel
    instrumentSerial: str
    data: PipetteData


class Gripper(GenericInstrument[GripperName, GripperModel, GripperData]):
    """Attached gripper info & configuration."""

    instrumentName: GripperName
    instrumentModel: GripperModel
    instrumentSerial: str
    data: GripperData


AttachedInstrument = Union[Pipette, Gripper]
