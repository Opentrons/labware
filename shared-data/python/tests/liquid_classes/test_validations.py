"""Tests that validate the built-in liquid class definitions."""
import pytest
from typing import List

from opentrons_shared_data import get_shared_data_root
from opentrons_shared_data.liquid_classes import load_definition


def _get_all_liquid_classes() -> List[str]:
    return [
        deffile.stem
        for deffile in (
            get_shared_data_root() / "liquid-class" / "definitions" / "1"
        ).iterdir()
    ]


@pytest.mark.parametrize("liquid_class_name", list(_get_all_liquid_classes()))
def test_validate_unique_pipette_keys(liquid_class_name: str) -> None:
    """A liquid class definition should contain only one set of properties per pipette model."""
    definition_dict = load_definition(liquid_class_name, version=1)
    pipette_models = [prop.pipetteModel for prop in definition_dict.byPipette]
    assert len(pipette_models) == len(set(pipette_models))


@pytest.mark.parametrize("liquid_class_name", list(_get_all_liquid_classes()))
def test_validate_unique_tip_keys(liquid_class_name: str) -> None:
    """A liquid class definition should contain only one set of properties per tip type."""
    definition_dict = load_definition(liquid_class_name, version=1)

    for by_pip_prop in definition_dict.byPipette:
        tipracks = [tip_prop.tiprack for tip_prop in by_pip_prop.byTipType]
        assert len(tipracks) == len(set(tipracks))
