import pytest

from pydantic import ValidationError
from opentrons_shared_data.labware import load_definition
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from . import get_ot_defs


def test_loadname_regex_applied() -> None:
    defdict = load_definition(*get_ot_defs()[0])
    defdict["parameters"]["loadName"] = "ALSJHDAKJLA"
    with pytest.raises(ValidationError):
        LabwareDefinition.model_validate(defdict)


def test_namespace_regex_applied() -> None:
    defdict = load_definition(*get_ot_defs()[0])
    defdict["namespace"] = "ALSJHDAKJLA"
    with pytest.raises(ValidationError):
        LabwareDefinition.model_validate(defdict)
