import json

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.liquid_classes import load_definition
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
    PositionReference,
    Coordinate,
    Submerge,
    DelayParams,
    DelayProperties,
)


def test_load_liquid_class_schema_v1() -> None:
    fixture_data = load_shared_data("liquid-class/definitions/1/water.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    liquid_class_def_from_model = json.loads(
        liquid_class_model.model_dump_json(exclude_unset=True)
    )
    expected_liquid_class_def = json.loads(fixture_data)
    assert liquid_class_def_from_model == expected_liquid_class_def


def test_load_definition() -> None:
    water_definition = load_definition(name="water", version=1)
    assert type(water_definition) is LiquidClassSchemaV1
    assert water_definition.byPipette[0].pipetteModel == "flex_1channel_50"
    assert water_definition.byPipette[0].byTipType[0].aspirate.submerge == Submerge(
        positionReference=PositionReference.WELL_TOP,
        offset=Coordinate(x=0, y=0, z=2),
        speed=100,
        delay=DelayProperties(enable=False, params=DelayParams(duration=0)),
    )
