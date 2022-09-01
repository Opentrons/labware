""" opentrons.calibration_storage.modify: functions for modifying
calibration storage

This module has functions that you can import to save robot or
labware calibration to its designated file location.
"""
import typing
from dataclasses import asdict

from opentrons import config
from opentrons.types import Mount, Point
from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.util.helpers import utc_now

from . import (
    file_operators as io,
    types as local_types,
    helpers,
    cache as calibration_cache,
)

if typing.TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition


def create_tip_length_data(
    definition: "LabwareDefinition",
    length: float,
    cal_status: typing.Optional[local_types.CalibrationStatus] = None,
) -> "PipTipLengthCalibration":
    """
    Function to correctly format tip length data.

    :param definition: full labware definition
    :param length: the tip length to save
    """
    labware_hash = helpers.hash_labware_def(definition)
    labware_uri = helpers.uri_from_definition(definition)
    if cal_status:
        status = cal_status
    else:
        status = local_types.CalibrationStatus()
    status_dict: "CalibrationStatusDict" = helpers.convert_to_dict(  # type: ignore[assignment]
        status
    )

    tip_length_data: "TipLengthCalibration" = {
        "tipLength": length,
        "lastModified": utc_now(),
        "source": local_types.SourceType.user,
        "status": status_dict,
        "uri": labware_uri,
    }

    if not definition.get("namespace") == OPENTRONS_NAMESPACE:
        _save_custom_tiprack_definition(labware_uri, definition)

    data = {labware_hash: tip_length_data}
    return data


def _save_custom_tiprack_definition(
    labware_uri: str,
    definition: "LabwareDefinition",
) -> None:
    namespace, load_name, version = labware_uri.split("/")
    custom_tr_dir_path = config.get_custom_tiprack_def_path()
    custom_namespace_dir = custom_tr_dir_path / f"{namespace}/{load_name}"
    custom_namespace_dir.mkdir(parents=True, exist_ok=True)

    custom_tr_def_path = custom_namespace_dir / f"{version}.json"
    io.save_to_file(custom_tr_def_path, definition)


def save_tip_length_calibration(
    pip_id: str, tip_length_cal: "PipTipLengthCalibration"
) -> None:
    """
    Function used to save tip length calibration to file.

    :param pip_id: pipette id to associate with this tip length
    :param tip_length_cal: results of the data created using
           :meth:`create_tip_length_data`
    """
    tip_length_dir_path = config.get_tip_length_cal_path()
    tip_length_dir_path.mkdir(parents=True, exist_ok=True)
    pip_tip_length_path = tip_length_dir_path / f"{pip_id}.json"

    all_tip_lengths = calibration_cache.tip_lengths_for_pipette(pip_id)

    all_tip_lengths.update(tip_length_cal)

    io.save_to_file(pip_tip_length_path, all_tip_lengths)
    calibration_cache._tip_length_calibrations.cache_clear()


def save_robot_deck_attitude(
    transform: local_types.AttitudeMatrix,
    pip_id: typing.Optional[str],
    lw_hash: typing.Optional[str],
    source: typing.Optional[local_types.SourceType] = None,
    cal_status: typing.Optional[local_types.CalibrationStatus] = None,
) -> None:
    robot_dir = config.get_opentrons_path("robot_calibration_dir")
    robot_dir.mkdir(parents=True, exist_ok=True)
    gantry_path = robot_dir / "deck_calibration.json"
    if cal_status:
        status = cal_status
    else:
        status = local_types.CalibrationStatus()
    status_dict: "CalibrationStatusDict" = helpers.convert_to_dict(  # type: ignore[assignment]
        status
    )

    gantry_dict: "DeckCalibrationData" = {
        "attitude": transform,
        "pipette_calibrated_with": pip_id,
        "last_modified": utc_now(),
        "tiprack": lw_hash,
        "source": source or local_types.SourceType.user,
        "status": status_dict,
    }
    io.save_to_file(gantry_path, gantry_dict)
    calibration_cache._deck_calibration.cache_clear()


def save_pipette_calibration(
    offset: Point,
    pip_id: str,
    mount: Mount,
    tiprack_hash: str,
    tiprack_uri: str,
    cal_status: typing.Optional[local_types.CalibrationStatus] = None,
) -> None:
    pip_dir = config.get_opentrons_path("pipette_calibration_dir") / mount.name.lower()
    pip_dir.mkdir(parents=True, exist_ok=True)
    status = cal_status or local_types.CalibrationStatus()
    status_dict: "CalibrationStatusDict" = helpers.convert_to_dict(  # type: ignore[assignment]
        status
    )
    offset_path = pip_dir / f"{pip_id}.json"
    offset_dict: "PipetteCalibrationData" = {
        "offset": [offset.x, offset.y, offset.z],
        "tiprack": tiprack_hash,
        "uri": tiprack_uri,
        "last_modified": utc_now(),
        "source": local_types.SourceType.user,
        "status": status_dict,
    }
    io.save_to_file(offset_path, offset_dict)
    calibration_cache._pipette_offset_calibrations.cache_clear()


def save_gripper_calibration(
    offset: Point,
    gripper_id: str,
    cal_status: typing.Optional[local_types.CalibrationStatus] = None,
) -> None:
    gripper_dir = config.get_opentrons_path("gripper_calibration_dir")
    gripper_dir.mkdir(parents=True, exist_ok=True)
    gripper_path = gripper_dir / f"{gripper_id}.json"
    if cal_status:
        status = cal_status
    else:
        status = local_types.CalibrationStatus()
    status_dict: "CalibrationStatusDict" = helpers.convert_to_dict(  # type: ignore[assignment]
        status
    )

    offset_dict: "GripperCalibrationData" = {
        "offset": [offset.x, offset.y, offset.z],
        "last_modified": utc_now(),
        "source": local_types.SourceType.user,
        "status": status_dict,
    }
    io.save_to_file(gripper_path, offset_dict)
    calibration_cache._gripper_offset_calibrations.cache_clear()


@typing.overload
def mark_bad(
    calibration: local_types.DeckCalibration, source_marked_bad: local_types.SourceType
) -> local_types.DeckCalibration:
    ...


@typing.overload
def mark_bad(
    calibration: local_types.PipetteOffsetCalibration,
    source_marked_bad: local_types.SourceType,
) -> local_types.PipetteOffsetCalibration:
    ...


@typing.overload
def mark_bad(
    calibration: local_types.TipLengthCalibration,
    source_marked_bad: local_types.SourceType,
) -> local_types.TipLengthCalibration:
    ...


def mark_bad(
    calibration: typing.Union[
        local_types.DeckCalibration,
        local_types.PipetteOffsetCalibration,
        local_types.TipLengthCalibration,
    ],
    source_marked_bad: local_types.SourceType,
) -> typing.Union[
    local_types.DeckCalibration,
    local_types.PipetteOffsetCalibration,
    local_types.TipLengthCalibration,
]:
    caldict = asdict(calibration)
    # remove current status key
    del caldict["status"]
    status = local_types.CalibrationStatus(
        markedBad=True, source=source_marked_bad, markedAt=utc_now()
    )
    return type(calibration)(**caldict, status=status)
