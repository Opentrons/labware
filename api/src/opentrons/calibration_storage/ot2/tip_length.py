import json
import typing
import logging
from pydantic import ValidationError
from dataclasses import asdict

from opentrons import config

from .. import file_operators as io, helpers, types as local_types
from opentrons_shared_data.pipette.types import LabwareUri

from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.util.helpers import utc_now


from .models import v1

if typing.TYPE_CHECKING:
    from opentrons_shared_data.labware.types import LabwareDefinition


log = logging.getLogger(__name__)
# Get Tip Length Calibration


def _convert_tip_length_model_to_dict(
    to_dict: typing.Dict[LabwareUri, v1.TipLengthModel],
) -> typing.Dict[LabwareUri, typing.Any]:
    # TODO[pydantic]: supported in Pydantic V2
    # This is a workaround since pydantic doesn't have a nice way to
    # add encoders when converting to a dict.
    dict_of_tip_lengths = {}
    for key, item in to_dict.items():
        dict_of_tip_lengths[key] = json.loads(item.model_dump_json())
    return dict_of_tip_lengths


def tip_lengths_for_pipette(
    pipette_id: str,
) -> typing.Dict[LabwareUri, v1.TipLengthModel]:
    try:
        tip_length_filepath = config.get_tip_length_cal_path() / f"{pipette_id}.json"
        all_tip_lengths_for_pipette = io.read_cal_file(tip_length_filepath)
    except FileNotFoundError:
        log.debug(f"Tip length calibrations not found for {pipette_id}")
        return {}
    except json.JSONDecodeError:
        log.warning(
            f"Tip length calibration is malformed for {pipette_id}", exc_info=True
        )
        return {}

    tip_lengths: typing.Dict[LabwareUri, v1.TipLengthModel] = {}

    for tiprack_identifier, data in all_tip_lengths_for_pipette.items():
        # We normally key these calibrations by their tip rack URI,
        # but older software had them keyed by their tip rack hash.
        # Migrate from the old format, if necessary.
        tiprack_identifier_is_uri = "/" in tiprack_identifier
        if not tiprack_identifier_is_uri:
            data["definitionHash"] = tiprack_identifier
            uri = data.pop("uri", None)
            if uri is None:
                # We don't have a way to migrate old records without a URI,
                # so skip over them.
                continue
            else:
                tiprack_identifier = uri

        try:
            tip_lengths[LabwareUri(tiprack_identifier)] = v1.TipLengthModel(**data)
        except ValidationError:
            log.warning(
                f"Tip length calibration is malformed for {tiprack_identifier} on {pipette_id}",
                exc_info=True,
            )
    return tip_lengths


def load_tip_length_calibration(
    pip_id: str, definition: "LabwareDefinition"
) -> v1.TipLengthModel:
    """
    Function used to grab the current tip length associated
    with a particular tiprack.

    :param pip_id: pipette you are using
    :param definition: full definition of the tiprack
    """
    labware_uri = helpers.uri_from_definition(definition)
    load_name = definition["parameters"]["loadName"]
    try:
        return tip_lengths_for_pipette(pip_id)[labware_uri]
    except KeyError as e:
        raise local_types.TipLengthCalNotFound(
            f"Tip length of {load_name} has not been "
            f"calibrated for this pipette: {pip_id} and cannot"
            "be loaded"
        ) from e


def get_all_tip_length_calibrations() -> typing.List[v1.TipLengthCalibration]:
    """
    A helper function that will list all of the tip length calibrations.

    :return: A list of dictionary objects representing all of the
    tip length calibration files found on the robot.
    """
    all_tip_lengths_available = []
    tip_length_dir_path = config.get_tip_length_cal_path()
    for filepath in tip_length_dir_path.glob("**/*.json"):
        if filepath.stem == "index":
            continue
        tip_lengths = tip_lengths_for_pipette(filepath.stem)
        for tiprack_uri, tip_length in tip_lengths.items():
            all_tip_lengths_available.append(
                v1.TipLengthCalibration(
                    pipette=filepath.stem,
                    tiprack=tip_length.definitionHash,
                    tipLength=tip_length.tipLength,
                    lastModified=tip_length.lastModified,
                    source=tip_length.source,
                    status=tip_length.status,
                    uri=tiprack_uri,
                )
            )
    return all_tip_lengths_available


def get_custom_tiprack_definition_for_tlc(labware_uri: str) -> "LabwareDefinition":
    """
    Return the custom tiprack definition saved in the custom tiprack directory
    during tip length calibration
    """
    custom_tiprack_dir = config.get_custom_tiprack_def_path()
    custom_tiprack_path = custom_tiprack_dir / f"{labware_uri}.json"
    try:
        with open(custom_tiprack_path, "rb") as f:
            return typing.cast(
                "LabwareDefinition",
                json.loads(f.read().decode("utf-8")),
            )
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Custom tiprack {labware_uri} not found in the custom tiprack"
            "directory on the robot. Please recalibrate tip length and "
            "pipette offset with this tiprack before performing calibration "
            "health check."
        )


# Delete Tip Length Calibration


def delete_tip_length_calibration(
    pipette_id: str,
    tiprack_uri: typing.Optional[LabwareUri] = None,
    tiprack_hash: typing.Optional[str] = None,
) -> None:
    """
    Delete tip length calibration based on an optional tiprack uri or
    tiprack hash and pipette serial number.

    :param tiprack_uri: tiprack uri
    :param tiprack_hash: tiprack uri
    :param pipette: pipette serial number
    """
    tip_lengths = tip_lengths_for_pipette(pipette_id)
    tip_length_dir = config.get_tip_length_cal_path()
    if tiprack_uri in tip_lengths:
        # maybe make modify and delete same file?
        del tip_lengths[tiprack_uri]

        if tip_lengths:
            dict_of_tip_lengths = _convert_tip_length_model_to_dict(tip_lengths)
            io.save_to_file(tip_length_dir, pipette_id, dict_of_tip_lengths)
        else:
            io.delete_file(tip_length_dir / f"{pipette_id}.json")
    elif tiprack_hash and any(
        tiprack_hash in v.model_dump() for v in tip_lengths.values()
    ):
        # NOTE this is for backwards compatibilty only
        # TODO delete this check once the tip_length DELETE router
        # no longer depends on a tiprack hash
        for k, v in tip_lengths.items():
            if tiprack_hash in v.model_dump():
                tip_lengths.pop(k)
        if tip_lengths:
            dict_of_tip_lengths = _convert_tip_length_model_to_dict(tip_lengths)
            io.save_to_file(tip_length_dir, pipette_id, dict_of_tip_lengths)
        else:
            io.delete_file(tip_length_dir / f"{pipette_id}.json")
    else:
        raise local_types.TipLengthCalNotFound(
            f"Tip length for uri {tiprack_uri} and hash {tiprack_hash} has not been "
            f"calibrated for this pipette: {pipette_id} and cannot"
            "be loaded"
        )


def clear_tip_length_calibration() -> None:
    """
    Delete all tip length calibration files.
    """
    offset_dir = config.get_tip_length_cal_path()
    try:
        io._remove_json_files_in_directories(offset_dir)
    except FileNotFoundError:
        pass


# Save Tip Length Calibration


def create_tip_length_data(
    definition: "LabwareDefinition",
    length: float,
    cal_status: typing.Optional[
        typing.Union[local_types.CalibrationStatus, v1.CalibrationStatus]
    ] = None,
) -> typing.Dict[LabwareUri, v1.TipLengthModel]:
    """
    Function to correctly format tip length data.

    :param definition: full labware definition
    :param length: the tip length to save
    """
    labware_hash = helpers.hash_labware_def(definition)
    labware_uri = helpers.uri_from_definition(definition)

    if isinstance(cal_status, local_types.CalibrationStatus):
        cal_status_model = v1.CalibrationStatus(**asdict(cal_status))
    elif isinstance(cal_status, v1.CalibrationStatus):
        cal_status_model = cal_status
    else:
        cal_status_model = v1.CalibrationStatus()
    tip_length_data = v1.TipLengthModel(
        tipLength=length,
        lastModified=utc_now(),
        source=local_types.SourceType.user,
        status=cal_status_model,
        definitionHash=labware_hash,
    )

    if not definition.get("namespace") == OPENTRONS_NAMESPACE:
        _save_custom_tiprack_definition(labware_uri, definition)

    data = {labware_uri: tip_length_data}
    return data


def _save_custom_tiprack_definition(
    labware_uri: str,
    definition: "LabwareDefinition",
) -> None:
    namespace, load_name, version = labware_uri.split("/")
    custom_tr_dir_path = config.get_custom_tiprack_def_path()
    custom_namespace_dir = custom_tr_dir_path / f"{namespace}/{load_name}"

    io.save_to_file(custom_namespace_dir, version, definition)


def save_tip_length_calibration(
    pip_id: str,
    tip_length_cal: typing.Dict[LabwareUri, v1.TipLengthModel],
) -> None:
    """
    Function used to save tip length calibration to file.

    :param pip_id: pipette id to associate with this tip length
    :param tip_length_cal: results of the data created using
           :meth:`create_tip_length_data`
    """
    tip_length_dir_path = config.get_tip_length_cal_path()

    all_tip_lengths = tip_lengths_for_pipette(pip_id)

    all_tip_lengths.update(tip_length_cal)

    dict_of_tip_lengths = _convert_tip_length_model_to_dict(all_tip_lengths)
    io.save_to_file(tip_length_dir_path, pip_id, dict_of_tip_lengths)
