import pytest
from typing import Any, TYPE_CHECKING

from opentrons import config
from opentrons.calibration_storage import (
    types as cs_types,
    helpers,
    file_operators as io,
)

from opentrons.calibration_storage.ot2 import (
    create_tip_length_data,
    save_tip_length_calibration,
    tip_lengths_for_pipette,
    load_tip_length_calibration,
    delete_tip_length_calibration,
    clear_tip_length_calibration,
    models,
)
from opentrons_shared_data.pipette.types import LabwareUri

if TYPE_CHECKING:
    from opentrons_shared_data.labware.types import LabwareDefinition


@pytest.fixture
def starting_calibration_data(
    ot_config_tempdir: Any,
    minimal_labware_def: "LabwareDefinition",
    minimal_labware_def2: "LabwareDefinition",
) -> None:
    """
    Starting calibration data fixture.

    Adds dummy data to a temporary directory to test delete commands against.
    """
    tip_length1 = create_tip_length_data(minimal_labware_def, 22.0)
    tip_length2 = create_tip_length_data(minimal_labware_def, 31.0)
    tip_length3 = create_tip_length_data(minimal_labware_def2, 31.0)
    save_tip_length_calibration("pip1", tip_length1)
    save_tip_length_calibration("pip2", tip_length2)
    save_tip_length_calibration("pip1", tip_length3)
    inside_data = tip_length3[LabwareUri("dummy_namespace/minimal_labware_def/1")]
    data = {
        inside_data.definitionHash: {
            "tipLength": 27,
            "lastModified": inside_data.lastModified.isoformat(),
            "source": inside_data.source,
            "status": inside_data.status.model_dump(),
            "uri": "dummy_namespace/minimal_labware_def/1",
        }
    }
    tip_length_dir_path = config.get_tip_length_cal_path()
    io.save_to_file(tip_length_dir_path, "pip2", data)


def test_save_tip_length_calibration(
    ot_config_tempdir: Any, minimal_labware_def: "LabwareDefinition"
) -> None:
    """
    Test saving tip length calibrations.
    """
    assert tip_lengths_for_pipette("pip1") == {}
    assert tip_lengths_for_pipette("pip2") == {}
    tip_rack_uri = helpers.uri_from_definition(minimal_labware_def)
    tip_length1 = create_tip_length_data(minimal_labware_def, 22.0)
    tip_length2 = create_tip_length_data(minimal_labware_def, 31.0)
    save_tip_length_calibration("pip1", tip_length1)
    save_tip_length_calibration("pip2", tip_length2)
    assert tip_lengths_for_pipette("pip1")[tip_rack_uri].tipLength == 22.0
    assert tip_lengths_for_pipette("pip2")[tip_rack_uri].tipLength == 31.0


def test_get_tip_length_calibration(
    starting_calibration_data: Any, minimal_labware_def: "LabwareDefinition"
) -> None:
    """
    Test ability to get a tip length calibration model.
    """
    tip_length_data = load_tip_length_calibration("pip1", minimal_labware_def)
    tip_rack_hash = helpers.hash_labware_def(minimal_labware_def)
    assert tip_length_data == models.v1.TipLengthModel(
        tipLength=22.0,
        source=cs_types.SourceType.user,
        lastModified=tip_length_data.lastModified,
        definitionHash=tip_rack_hash,
    )

    with pytest.raises(cs_types.TipLengthCalNotFound):
        load_tip_length_calibration("nopipette", minimal_labware_def)


def test_delete_specific_tip_calibration(
    starting_calibration_data: Any, minimal_labware_def: "LabwareDefinition"
) -> None:
    """
    Test delete a specific tip length calibration.
    """
    assert len(tip_lengths_for_pipette("pip1").keys()) == 2
    assert tip_lengths_for_pipette("pip2") != {}
    tip_rack_uri = helpers.uri_from_definition(minimal_labware_def)
    delete_tip_length_calibration("pip1", tiprack_uri=tip_rack_uri)
    assert len(tip_lengths_for_pipette("pip1").keys()) == 1
    assert tip_lengths_for_pipette("pip2") != {}


def test_delete_all_tip_calibration(starting_calibration_data: Any) -> None:
    """
    Test delete all tip length calibration.
    """
    assert tip_lengths_for_pipette("pip1") != {}
    assert tip_lengths_for_pipette("pip2") != {}
    clear_tip_length_calibration()
    assert tip_lengths_for_pipette("pip1") == {}
    assert tip_lengths_for_pipette("pip2") == {}


def test_uriless_calibrations_are_dropped(ot_config_tempdir: object) -> None:
    """Legacy records without a `uri` field should be silently ignored."""

    data = {
        "ed323db6ca1ddf197aeb20667c1a7a91c89cfb2f931f45079d483928da056812": {
            "tipLength": 123,
            "lastModified": "2021-01-11T00:34:29.291073+00:00",
            "source": "user",
            "status": {"markedBad": False},
        },
        "130e17bb7b2f0c0472dcc01c1ff6f600ca1a6f9f86a90982df56c4bf43776824": {
            "tipLength": 456,
            "lastModified": "2021-05-12T22:16:14.249567+00:00",
            "source": "user",
            "status": {"markedBad": False},
            "uri": "opentrons/opentrons_96_filtertiprack_200ul/1",
        },
    }

    io.save_to_file(config.get_tip_length_cal_path(), "pipette1234", data)
    result = tip_lengths_for_pipette("pipette1234")
    assert len(result) == 1
    assert (
        result[LabwareUri("opentrons/opentrons_96_filtertiprack_200ul/1")].tipLength
        == 456
    )
