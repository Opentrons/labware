"""Tests for LiquidClass methods."""
import pytest

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)
from opentrons.protocol_api import LiquidClass


def test_create_liquid_class(
    minimal_liquid_class_def1: LiquidClassSchemaV1,
) -> None:
    """It should create a LiquidClass from provided definition."""
    assert LiquidClass.create(minimal_liquid_class_def1) == LiquidClass(
        _name="water1", _display_name="water 1", _by_pipette_setting={}
    )


def test_get_for_pipette_and_tip(
    minimal_liquid_class_def2: LiquidClassSchemaV1,
) -> None:
    """It should get the properties for the specified pipette and tip."""
    liq_class = LiquidClass.create(minimal_liquid_class_def2)
    result = liq_class.get_for("flex_1channel_50", "opentrons_flex_96_tiprack_50ul")
    assert result.aspirate.flow_rate_by_volume.as_dict() == {
        10.0: 40.0,
        20.0: 30.0,
    }


def test_get_for_raises_for_incorrect_pipette_or_tip(
    minimal_liquid_class_def2: LiquidClassSchemaV1,
) -> None:
    """It should raise an error when accessing non-existent properties."""
    liq_class = LiquidClass.create(minimal_liquid_class_def2)

    with pytest.raises(ValueError):
        liq_class.get_for("flex_1channel_50", "no_such_tiprack")

    with pytest.raises(ValueError):
        liq_class.get_for("no_such_pipette", "opentrons_flex_96_tiprack_50ul")
