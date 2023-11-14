""" opentrons.calibration_storage.file_operators: functions that
manipulate the file system.

These methods should only be imported inside the calibration_storage
module, except in the special case of v2 labware support in
the v1 API.
"""
import json
import datetime
import typing
from pydantic import BaseModel
from pathlib import Path

from .encoder_decoder import DateTimeEncoder, DateTimeDecoder


DecoderType = typing.Type[json.JSONDecoder]
EncoderType = typing.Type[json.JSONEncoder]


# TODO(mc, 2022-06-07): replace with Path.unlink(missing_ok=True)
# when we are on Python >= 3.8
def delete_file(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


# TODO: This is private but used by other files.
def _remove_json_files_in_directories(p: Path) -> None:
    """Delete .json files in the given directory and its subdirectories."""
    for item in p.iterdir():
        if item.is_dir():
            _remove_json_files_in_directories(item)
        elif item.suffix == ".json":
            delete_file(item)


def _assert_last_modified_value(calibration_dict: typing.Dict[str, typing.Any]) -> None:
    last_modified = calibration_dict.get("lastModified")
    if last_modified:
        assert isinstance(calibration_dict["lastModified"], datetime.datetime), (
            "invalid decoded value type for lastModified: got "
            f"{type(calibration_dict['lastModified']).__name__},"
            "expected datetime"
        )


def read_cal_file(
    file_path: Path, decoder: DecoderType = DateTimeDecoder
) -> typing.Dict[str, typing.Any]:
    """
    Function used to read data from a file

    :param file_path: path to look for data at
    :param decoder: if there is any specialized decoder needed.
    The default decoder is the date time decoder.
    :return: Data from the file
    """
    # TODO(6/16): We should use tagged unions for
    # both the calibration and tip length dicts to better
    # categorize the Typed Dicts used here.
    # This can be done when the labware endpoints
    # are refactored to grab tip length calibration
    # from the correct locations.
    with open(file_path, "r", encoding="utf-8") as f:
        calibration_data = typing.cast(
            typing.Dict[str, typing.Any],
            json.load(f, cls=decoder),
        )
    if isinstance(calibration_data.values(), dict):
        _assert_last_modified_value(dict(calibration_data.values()))
    else:
        _assert_last_modified_value(calibration_data)
    return calibration_data


def save_to_file(
    directory_path: Path,
    # todo(mm, 2023-11-15): This file_name argument does not include the file
    # extension, which is inconsistent with read_cal_file(). The two should match.
    file_name: str,
    data: typing.Union[BaseModel, typing.Dict[str, typing.Any], typing.Any],
    encoder: EncoderType = DateTimeEncoder,
) -> None:
    """
    Function used to save data to a file

    :param directory_path: path to the directory in which to save the data
    :param file_name: name of the file within the directory, *without the extension*.
    :param data: data to save
    :param encoder: if there is any specialized encoder needed.
    The default encoder is the date time encoder.
    """
    directory_path.mkdir(parents=True, exist_ok=True)
    file_path = directory_path / f"{file_name}.json"
    json_data = (
        data.json() if isinstance(data, BaseModel) else json.dumps(data, cls=encoder)
    )
    file_path.write_text(json_data, encoding="utf-8")
