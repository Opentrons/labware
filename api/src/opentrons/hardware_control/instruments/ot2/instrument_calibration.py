import typing
from typing_extensions import Literal
from dataclasses import dataclass
from datetime import datetime
from opentrons.config.robot_configs import default_pipette_offset

from opentrons.calibration_storage import ot2 as calibration_storage
from opentrons.calibration_storage import types, helpers
from opentrons.types import Mount, Point
from opentrons.hardware_control.types import OT3Mount

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

if typing.TYPE_CHECKING:
    from opentrons_shared_data.pipette.types import LabwareUri
    from opentrons_shared_data.labware.types import (
        LabwareDefinition as TypeDictLabwareDef,
    )

# These type aliases aid typechecking in tests that work the same on this and
# the hardware_control.instruments.ot3 variant
SourceType = types.SourceType
CalibrationStatus = types.CalibrationStatus


@dataclass
class PipetteOffsetByPipetteMount:
    """
    Class to store pipette offset without pipette and mount info
    """

    offset: Point
    source: SourceType
    status: CalibrationStatus
    tiprack: typing.Optional[str] = None
    uri: typing.Optional[str] = None
    last_modified: typing.Optional[datetime] = None


@dataclass
class PipetteOffsetCalibration:
    """
    Class to store pipette offset calibration with pipette and mount info
    """

    pipette: str
    mount: str
    offset: Point
    tiprack: str
    uri: str
    last_modified: datetime
    source: SourceType
    status: CalibrationStatus


@dataclass
class TipLengthCalibration:
    tip_length: float
    source: SourceType
    status: CalibrationStatus
    pipette: str
    tiprack: str
    last_modified: datetime
    uri: typing.Union["LabwareUri", Literal[""]]


def load_pipette_offset(
    pip_id: typing.Optional[str], mount: typing.Union[Mount, OT3Mount]
) -> PipetteOffsetByPipetteMount:
    # load default if pipette offset data do not exist
    pip_cal_obj = PipetteOffsetByPipetteMount(
        offset=Point(*default_pipette_offset()),
        source=SourceType.default,
        status=CalibrationStatus(),
    )
    # TODO this can be removed once we switch to using
    # ot3 pipette types in the ot3 hardware controller.
    if isinstance(mount, OT3Mount):
        checked_mount = mount.to_mount()
    else:
        checked_mount = mount
    if pip_id:
        pip_offset_data = calibration_storage.get_pipette_offset(pip_id, checked_mount)
        if pip_offset_data:
            return PipetteOffsetByPipetteMount(
                offset=pip_offset_data.offset,
                tiprack=pip_offset_data.tiprack,
                last_modified=pip_offset_data.last_modified,
                uri=pip_offset_data.uri,
                source=pip_offset_data.source,
                status=types.CalibrationStatus(
                    markedAt=pip_offset_data.status.markedAt,
                    markedBad=pip_offset_data.status.markedBad,
                    source=pip_offset_data.status.source,
                ),
            )
    return pip_cal_obj


def save_pipette_offset_calibration(
    pip_id: typing.Optional[str],
    mount: typing.Union[Mount, OT3Mount],
    offset: Point,
    tiprack_hash: str,
    tiprack_uri: str,
) -> None:
    # TODO this can be removed once we switch to using
    # ot3 pipette types in the ot3 hardware controller.
    if isinstance(mount, OT3Mount):
        checked_mount = mount.to_mount()
    else:
        checked_mount = mount
    if pip_id:
        calibration_storage.save_pipette_calibration(
            offset, pip_id, checked_mount, tiprack_hash, tiprack_uri
        )


# TODO (lc 09-26-2022) We should ensure that only LabwareDefinition models are passed
# into this function instead of a mixture of TypeDicts and BaseModels
def load_tip_length_for_pipette(
    pipette_id: str, tiprack: typing.Union["TypeDictLabwareDef", LabwareDefinition]
) -> TipLengthCalibration:
    if isinstance(tiprack, LabwareDefinition):
        tiprack = typing.cast(
            "TypeDictLabwareDef",
            tiprack.model_dump(exclude_none=True, exclude_unset=True),
        )

    tip_length_data = calibration_storage.load_tip_length_calibration(
        pipette_id, tiprack
    )

    tiprack_uri = helpers.uri_from_definition(tiprack)

    return TipLengthCalibration(
        tip_length=tip_length_data.tipLength,
        source=tip_length_data.source,
        pipette=pipette_id,
        tiprack=tip_length_data.definitionHash,
        last_modified=tip_length_data.lastModified,
        uri=tiprack_uri,
        status=types.CalibrationStatus(
            markedAt=tip_length_data.status.markedAt,
            markedBad=tip_length_data.status.markedBad,
            source=tip_length_data.status.source,
        ),
    )
