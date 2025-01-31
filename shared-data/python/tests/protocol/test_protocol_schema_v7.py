import json
import pytest
from typing import Any, Dict
from pathlib import Path

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.protocol.models import protocol_schema_v7

from . import list_fixtures


@pytest.mark.parametrize("defpath", list_fixtures(7))
def test_v7_types(defpath: Path) -> None:
    def_data = load_shared_data(defpath)
    def_model = protocol_schema_v7.ProtocolSchemaV7.model_validate_json(def_data)
    def_dict_from_model = def_model.model_dump(
        exclude_unset=True,
        # 'schemaVersion' in python is '$schemaVersion' in JSON
        by_alias=True,
    )
    expected_def_dict = json.loads(def_data)
    delete_unexpected_results(expected_def_dict)
    assert def_dict_from_model == expected_def_dict


# TODO (Tamar and Max 3/16/22):
# Some of our v7 fixtures accidentally contain command "result" data,
# which is not part of the schema, and which we don't parse into our models.
# Here, we delete the extra junk from the fixtures.
# Remove this when the fixtures are corrected.
# https://github.com/Opentrons/opentrons/issues/9701
def delete_unexpected_results(protocol_fixture: Dict[str, Any]) -> None:
    for command_object_dict in protocol_fixture["commands"]:
        command_object_dict.pop("result", None)
        command_object_dict.pop("id", None)
