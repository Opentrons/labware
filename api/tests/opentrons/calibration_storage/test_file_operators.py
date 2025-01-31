import json
import typing
from pathlib import Path

import pydantic
import pytest

from opentrons.calibration_storage import file_operators as io


class DummyModel(pydantic.BaseModel):
    integer_field: int
    aliased_field: str = pydantic.Field(alias="! aliased field !")


@pytest.fixture
def calibration() -> typing.Dict[str, typing.Any]:
    return {
        "attitude": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        "lastModified": "2022-10-27T15:21:43.195599+00:00",
        "source": "user",
        "pipette_calibrated_with": "pip1",
        "tiprack": "mytiprack",
        "status": {"markedBad": False, "source": None, "markedAt": None},
    }


@pytest.fixture
def malformed_calibration() -> typing.Dict[str, typing.Any]:
    return {
        "attitude": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        "lastModified": "blah",
        "source": "user",
        "pipette_calibrated_with": "pip1",
        "tiprack": "mytiprack",
        "status": {"markedBad": False, "source": None, "markedAt": None},
    }


def test_save_delete_file(
    tmp_path: Path, calibration: typing.Dict[str, typing.Any]
) -> None:
    """
    Test saving, reading and deleting a correctly formed calibration blob.
    """
    my_calpath = tmp_path / "calibrations"
    io.save_to_file(my_calpath, "my_calibration", calibration)
    file_to_delete = my_calpath / "my_calibration.json"
    assert io.read_cal_file(file_to_delete)

    io.delete_file(file_to_delete)

    with pytest.raises(FileNotFoundError):
        io.read_cal_file(file_to_delete)


def test_malformed_calibration(
    tmp_path: Path, malformed_calibration: typing.Dict[str, typing.Any]
) -> None:
    """
    Test saving and reading a malformed calibration blob. Note, malformed here only means
    datetime abnormalities.
    """
    malformed_calibration_dir = tmp_path / "calibrations"
    malformed_calibration_path = malformed_calibration_dir / "my_bad_calibration.json"

    # TODO (lc 10-27-2022) We don't actually throw an error when we're saving bad calibration data.
    # Probably before this point, we should make sure that we're passin in a validated pydantic
    # model because otherwise we could potentially be saving malformed data which would fail on
    # a read file.
    io.save_to_file(
        malformed_calibration_dir, "my_bad_calibration", malformed_calibration
    )

    malformed_calibration_dir.mkdir(parents=True, exist_ok=True)
    malformed_calibration_path.write_text(
        json.dumps(malformed_calibration), encoding="utf-8"
    )
    with pytest.raises(AssertionError):
        io.read_cal_file(malformed_calibration_path)


def test_deserialize_pydantic_model_valid() -> None:
    serialized = b'{"integer_field": 123, "! aliased field !": "abc"}'
    assert io.deserialize_pydantic_model(
        serialized, DummyModel
    ) == DummyModel.model_construct(integer_field=123, aliased_field="abc")


def test_deserialize_pydantic_model_invalid_as_json() -> None:
    serialized = "😾".encode("utf-8")
    assert io.deserialize_pydantic_model(serialized, DummyModel) is None
    # Ideally we would assert that the subject logged a message saying "not valid JSON",
    # but the opentrons.simulate and opentrons.execute tests interfere with the process's logger
    # settings and prevent that message from showing up in pytest's caplog fixture.


def test_read_pydantic_model_from_file_invalid_model(tmp_path: Path) -> None:
    serialized = b'{"integer_field": "not an integer"}'
    assert io.deserialize_pydantic_model(serialized, DummyModel) is None
    # Ideally we would assert that the subject logged a message saying "does not match model",
    # but the opentrons.simulate and opentrons.execute tests interfere with the process's logger
    # settings and prevent that message from showing up in pytest's caplog fixture.
