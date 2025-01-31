import pytest
import typeguard

from opentrons_shared_data.labware import load_definition
from opentrons_shared_data.labware.types import LabwareDefinition

from . import get_ot_defs


@pytest.mark.parametrize("loadname,version", get_ot_defs())
def test_opentrons_definition_types(loadname: str, version: int) -> None:
    defdict = load_definition(loadname, version)
    typeguard.check_type(defdict, LabwareDefinition)
