import json
import pytest
from pathlib import Path

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.protocol.models import protocol_schema_v8

from . import list_fixtures


@pytest.mark.parametrize("defpath", list_fixtures(8))
def test_v8_types(defpath: Path) -> None:
    def_data = load_shared_data(defpath)
    def_model = protocol_schema_v8.ProtocolSchemaV8.model_validate_json(def_data)
    def_dict_from_model = def_model.model_dump(by_alias=True, exclude_unset=True)
    expected_def_dict = json.loads(def_data)
    assert def_dict_from_model == expected_def_dict
