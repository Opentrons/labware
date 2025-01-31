"""Tests for LiquidClass properties and related functions."""
import pytest
from opentrons_shared_data import load_shared_data
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
    Coordinate,
)

from opentrons.protocol_api._liquid_properties import (
    build_aspirate_properties,
    build_single_dispense_properties,
    build_multi_dispense_properties,
    LiquidHandlingPropertyByVolume,
)


def test_build_aspirate_settings() -> None:
    """It should convert the shared data aspirate settings to the PAPI type."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    aspirate_data = liquid_class_model.byPipette[0].byTipType[0].aspirate

    aspirate_properties = build_aspirate_properties(aspirate_data)

    assert aspirate_properties.submerge.position_reference.value == "liquid-meniscus"
    assert aspirate_properties.submerge.offset == Coordinate(x=0, y=0, z=-5)
    assert aspirate_properties.submerge.speed == 100
    assert aspirate_properties.submerge.delay.enabled is True
    assert aspirate_properties.submerge.delay.duration == 1.5

    assert aspirate_properties.retract.position_reference.value == "well-top"
    assert aspirate_properties.retract.offset == Coordinate(x=0, y=0, z=5)
    assert aspirate_properties.retract.speed == 100
    assert aspirate_properties.retract.air_gap_by_volume.as_dict() == {
        5.0: 3.0,
        10.0: 4.0,
    }
    assert aspirate_properties.retract.touch_tip.enabled is True
    assert aspirate_properties.retract.touch_tip.z_offset == 2
    assert aspirate_properties.retract.touch_tip.mm_to_edge == 1
    assert aspirate_properties.retract.touch_tip.speed == 50
    assert aspirate_properties.retract.delay.enabled is True
    assert aspirate_properties.retract.delay.duration == 1

    assert aspirate_properties.position_reference.value == "well-bottom"
    assert aspirate_properties.offset == Coordinate(x=0, y=0, z=-5)
    assert aspirate_properties.flow_rate_by_volume.as_dict() == {10: 50.0}
    assert aspirate_properties.correction_by_volume.as_dict() == {
        1.0: -2.5,
        10.0: 3,
    }
    assert aspirate_properties.pre_wet is True
    assert aspirate_properties.mix.enabled is True
    assert aspirate_properties.mix.repetitions == 3
    assert aspirate_properties.mix.volume == 15
    assert aspirate_properties.delay.enabled is True
    assert aspirate_properties.delay.duration == 2
    assert aspirate_properties.as_shared_data_model() == aspirate_data


def test_build_single_dispense_settings() -> None:
    """It should convert the shared data single dispense settings to the PAPI type."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    single_dispense_data = liquid_class_model.byPipette[0].byTipType[0].singleDispense

    single_dispense_properties = build_single_dispense_properties(single_dispense_data)

    assert (
        single_dispense_properties.submerge.position_reference.value
        == "liquid-meniscus"
    )
    assert single_dispense_properties.submerge.offset == Coordinate(x=0, y=0, z=-5)
    assert single_dispense_properties.submerge.speed == 100
    assert single_dispense_properties.submerge.delay.enabled is True
    assert single_dispense_properties.submerge.delay.duration == 1.5

    assert single_dispense_properties.retract.position_reference.value == "well-top"
    assert single_dispense_properties.retract.offset == Coordinate(x=0, y=0, z=5)
    assert single_dispense_properties.retract.speed == 100
    assert single_dispense_properties.retract.air_gap_by_volume.as_dict() == {
        5.0: 3.0,
        10.0: 4.0,
    }
    assert single_dispense_properties.retract.touch_tip.enabled is True
    assert single_dispense_properties.retract.touch_tip.z_offset == 2
    assert single_dispense_properties.retract.touch_tip.mm_to_edge == 1
    assert single_dispense_properties.retract.touch_tip.speed == 50
    assert single_dispense_properties.retract.blowout.enabled is True
    assert single_dispense_properties.retract.blowout.location is not None
    assert single_dispense_properties.retract.blowout.location.value == "trash"
    assert single_dispense_properties.retract.blowout.flow_rate == 100
    assert single_dispense_properties.retract.delay.enabled is True
    assert single_dispense_properties.retract.delay.duration == 1

    assert single_dispense_properties.position_reference.value == "well-bottom"
    assert single_dispense_properties.offset == Coordinate(x=0, y=0, z=-5)
    assert single_dispense_properties.flow_rate_by_volume.as_dict() == {
        10.0: 40.0,
        20.0: 30.0,
    }
    assert single_dispense_properties.correction_by_volume.as_dict() == {
        2.0: -1.5,
        20.0: 2,
    }
    assert single_dispense_properties.mix.enabled is True
    assert single_dispense_properties.mix.repetitions == 3
    assert single_dispense_properties.mix.volume == 15
    assert single_dispense_properties.push_out_by_volume.as_dict() == {
        10.0: 7.0,
        20.0: 10.0,
    }
    assert single_dispense_properties.delay.enabled is True
    assert single_dispense_properties.delay.duration == 2.5
    assert single_dispense_properties.as_shared_data_model() == single_dispense_data


def test_build_multi_dispense_settings() -> None:
    """It should convert the shared data multi dispense settings to the PAPI type."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    multi_dispense_data = liquid_class_model.byPipette[0].byTipType[0].multiDispense

    assert multi_dispense_data is not None
    multi_dispense_properties = build_multi_dispense_properties(multi_dispense_data)
    assert multi_dispense_properties is not None

    assert (
        multi_dispense_properties.submerge.position_reference.value == "liquid-meniscus"
    )
    assert multi_dispense_properties.submerge.offset == Coordinate(x=0, y=0, z=-5)
    assert multi_dispense_properties.submerge.speed == 100
    assert multi_dispense_properties.submerge.delay.enabled is True
    assert multi_dispense_properties.submerge.delay.duration == 1.5

    assert multi_dispense_properties.retract.position_reference.value == "well-top"
    assert multi_dispense_properties.retract.offset == Coordinate(x=0, y=0, z=5)
    assert multi_dispense_properties.retract.speed == 100
    assert multi_dispense_properties.retract.air_gap_by_volume.as_dict() == {
        5.0: 3.0,
        10.0: 4.0,
    }
    assert multi_dispense_properties.retract.touch_tip.enabled is True
    assert multi_dispense_properties.retract.touch_tip.z_offset == 2
    assert multi_dispense_properties.retract.touch_tip.mm_to_edge == 1
    assert multi_dispense_properties.retract.touch_tip.speed == 50
    assert multi_dispense_properties.retract.blowout.enabled is False
    assert multi_dispense_properties.retract.blowout.location is None
    assert multi_dispense_properties.retract.blowout.flow_rate is None
    assert multi_dispense_properties.retract.delay.enabled is True
    assert multi_dispense_properties.retract.delay.duration == 1

    assert multi_dispense_properties.position_reference.value == "well-bottom"
    assert multi_dispense_properties.offset == Coordinate(x=0, y=0, z=-5)
    assert multi_dispense_properties.flow_rate_by_volume.as_dict() == {
        10.0: 40.0,
        20.0: 30.0,
    }
    assert multi_dispense_properties.correction_by_volume.as_dict() == {
        3.0: -0.5,
        30.0: 1,
    }
    assert multi_dispense_properties.conditioning_by_volume.as_dict() == {
        5.0: 5.0,
    }
    assert multi_dispense_properties.disposal_by_volume.as_dict() == {
        5.0: 3.0,
    }
    assert multi_dispense_properties.delay.enabled is True
    assert multi_dispense_properties.delay.duration == 1
    assert multi_dispense_properties.as_shared_data_model() == multi_dispense_data


def test_build_multi_dispense_settings_none(
    minimal_liquid_class_def2: LiquidClassSchemaV1,
) -> None:
    """It should return None if there are no multi dispense properties in the model."""
    transfer_settings = minimal_liquid_class_def2.byPipette[0].byTipType[0]
    assert build_multi_dispense_properties(transfer_settings.multiDispense) is None


def test_liquid_handling_property_by_volume() -> None:
    """It should create a class that can interpolate values and add and delete new points."""
    subject = LiquidHandlingPropertyByVolume([(5.0, 50.0), (10.0, 250.0)])
    assert subject.as_dict() == {5.0: 50, 10.0: 250}
    assert subject.get_for_volume(7) == 130.0
    assert subject.as_list_of_tuples() == [(5.0, 50.0), (10.0, 250.0)]

    subject.set_for_volume(volume=7, value=175.5)
    assert subject.as_dict() == {
        5.0: 50,
        10.0: 250,
        7.0: 175.5,
    }
    assert subject.get_for_volume(7) == 175.5

    subject.delete_for_volume(7)
    assert subject.as_dict() == {5.0: 50, 10.0: 250}
    assert subject.get_for_volume(7) == 130.0

    with pytest.raises(KeyError, match="No value set for volume"):
        subject.delete_for_volume(7)

    # Test bounds
    assert subject.get_for_volume(1) == 50.0
    assert subject.get_for_volume(1000) == 250.0
