import json
import typing
import logging
from pydantic import ValidationError

from opentrons import config, types

from .. import file_operators as io, types as local_types

from .models import v1

from opentrons.types import Mount, Point
from opentrons.util import helpers

log = logging.getLogger(__name__)

# Delete Pipette Offset Calibrations


def delete_pipette_offset_file(pipette: typing.Optional[str], mount: Mount) -> None:
    """
    Delete pipette offset file based on mount and pipette serial number

    :param pipette: pipette serial number
    :param mount: pipette mount
    """
    offset_dir = config.get_opentrons_path("pipette_calibration_dir")
    offset_path = offset_dir / mount.name.lower() / f"{pipette}.json"
    io.delete_file(offset_path)


def clear_pipette_offset_calibrations() -> None:
    """
    Delete all pipette offset calibration files.
    """
    io._remove_json_files_in_directories(
        config.get_opentrons_path("pipette_calibration_dir")
    )


# Save Pipette Offset Calibrations


def save_pipette_calibration(
    offset: Point,
    pip_id: typing.Optional[str],
    mount: Mount,
    tiprack_hash: str,
    tiprack_uri: str,
    calibration_status: typing.Optional[v1.CalibrationStatus]
) -> None:
    pip_dir = config.get_opentrons_path("pipette_calibration_dir") / mount.name.lower()

    pipette_calibration = v1.InstrumentOffsetModel(
        offset=offset,
        tiprack=tiprack_hash,
        uri=tiprack_uri,
        last_modified=helpers.utc_now(),
        source=local_types.SourceType.user,
        status=calibration_status or v1.CalibrationStatus(),
    )
    io.save_to_file(pip_dir, pip_id, pipette_calibration)


# Get Pipette Offset Calibrations


def get_pipette_offset(
    pipette_id: typing.Optional[str], mount: Mount
) -> typing.Optional[v1.InstrumentOffsetModel]:
    try:
        pipette_calibration_filepath = (
            config.get_opentrons_path("pipette_calibration_dir")
            / mount.name.lower()
            / f"{pipette_id}.json"
        )
        return v1.InstrumentOffsetModel(
            **io.read_cal_file(pipette_calibration_filepath)
        )
    except FileNotFoundError:
        log.warning(f"Calibrations for {pipette_id} on {mount} does not exist.")
        return None
    except (json.JSONDecodeError, ValidationError):
        log.warning(
            f"Malformed calibrations for {pipette_id} on {mount}. Please factory reset your calibrations."
        )
        return None


def get_all_pipette_offset_calibrations() -> typing.List[v1.PipetteOffsetCalibration]:
    """
    A helper function that will list all of the pipette offset
    calibrations.

    :return: A list of dictionary objects representing all of the
    pipette offset calibration files found on the robot.
    """
    pipette_calibration_dir = config.get_opentrons_path("pipette_calibration_dir")
    pipette_calibration_list = []
    for filepath in pipette_calibration_dir.glob("**/*.json"):
        pipette_id = filepath.stem
        mount = Mount.string_to_mount(filepath.parent.stem)
        calibration = get_pipette_offset(pipette_id, mount)
        if calibration:
            pipette_calibration_list.append(
                v1.PipetteOffsetCalibration(
                    pipette=pipette_id,
                    mount=mount.name.lower(),
                    offset=types.Point(*calibration.offset),
                    tiprack=calibration.tiprack,
                    uri=calibration.uri,
                    last_modified=calibration.last_modified,
                    source=calibration.source,
                    status=calibration.status,
                )
            )
    return pipette_calibration_list
