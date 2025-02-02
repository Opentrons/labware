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
    assert aspirate_properties.retract.touch_tip.mm_from_edge == 1
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


def test_aspirate_settings_overrides() -> None:
    """It should allow aspirate properties to be overridden with new values."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    aspirate_data = liquid_class_model.byPipette[0].byTipType[0].aspirate

    aspirate_properties = build_aspirate_properties(aspirate_data)

    aspirate_properties.submerge.position_reference = "well-bottom"  # type: ignore[assignment]
    assert aspirate_properties.submerge.position_reference.value == "well-bottom"
    aspirate_properties.submerge.offset = 5, 0, 0  # type: ignore[assignment]
    assert aspirate_properties.submerge.offset == Coordinate(x=5, y=0, z=0)
    aspirate_properties.submerge.speed = 123
    assert aspirate_properties.submerge.speed == 123
    aspirate_properties.submerge.delay.enabled = False
    assert aspirate_properties.submerge.delay.enabled is False
    aspirate_properties.submerge.delay.duration = 5.1
    assert aspirate_properties.submerge.delay.duration == 5.1

    aspirate_properties.retract.position_reference = "well-center"  # type: ignore[assignment]
    assert aspirate_properties.retract.position_reference.value == "well-center"
    aspirate_properties.retract.offset = 0, 50, 0  # type: ignore[assignment]
    assert aspirate_properties.retract.offset == Coordinate(x=0, y=50, z=0)
    aspirate_properties.retract.speed = 987
    assert aspirate_properties.retract.speed == 987
    aspirate_properties.retract.touch_tip.enabled = False
    assert aspirate_properties.retract.touch_tip.enabled is False
    aspirate_properties.retract.touch_tip.z_offset = 2.34
    assert aspirate_properties.retract.touch_tip.z_offset == 2.34
    aspirate_properties.retract.touch_tip.mm_from_edge = 4.56
    assert aspirate_properties.retract.touch_tip.mm_from_edge == 4.56
    aspirate_properties.retract.touch_tip.speed = 501
    assert aspirate_properties.retract.touch_tip.speed == 501
    aspirate_properties.retract.delay.enabled = False
    assert aspirate_properties.retract.delay.enabled is False
    aspirate_properties.retract.delay.duration = 0.5
    assert aspirate_properties.retract.delay.duration == 0.5

    aspirate_properties.position_reference = "liquid-meniscus"  # type: ignore[assignment]
    assert aspirate_properties.position_reference.value == "liquid-meniscus"
    aspirate_properties.offset = -1, -2, -3  # type: ignore[assignment]
    assert aspirate_properties.offset == Coordinate(x=-1, y=-2, z=-3)
    aspirate_properties.pre_wet = False
    assert aspirate_properties.pre_wet is False
    aspirate_properties.mix.enabled = False
    assert aspirate_properties.mix.enabled is False
    aspirate_properties.mix.repetitions = 33
    assert aspirate_properties.mix.repetitions == 33
    aspirate_properties.mix.volume = 51
    assert aspirate_properties.mix.volume == 51
    aspirate_properties.delay.enabled = False
    assert aspirate_properties.delay.enabled is False
    aspirate_properties.delay.duration = 2.3
    assert aspirate_properties.delay.duration == 2.3


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
    assert single_dispense_properties.retract.touch_tip.mm_from_edge == 1
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


def test_single_dispense_settings_override() -> None:
    """It should allow single dispense properties to be overridden with new values."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    single_dispense_data = liquid_class_model.byPipette[0].byTipType[0].singleDispense

    single_dispense_properties = build_single_dispense_properties(single_dispense_data)

    single_dispense_properties.submerge.position_reference = "well-bottom"  # type: ignore[assignment]
    assert single_dispense_properties.submerge.position_reference.value == "well-bottom"
    single_dispense_properties.submerge.offset = 3, -2, 1  # type: ignore[assignment]
    assert single_dispense_properties.submerge.offset == Coordinate(x=3, y=-2, z=1)
    single_dispense_properties.submerge.speed = 111
    assert single_dispense_properties.submerge.speed == 111
    single_dispense_properties.submerge.delay.enabled = False
    assert single_dispense_properties.submerge.delay.enabled is False
    single_dispense_properties.submerge.delay.duration = 5.1
    assert single_dispense_properties.submerge.delay.duration == 5.1

    single_dispense_properties.retract.position_reference = "well-center"  # type: ignore[assignment]
    assert single_dispense_properties.retract.position_reference.value == "well-center"
    single_dispense_properties.retract.offset = -9, -8, -7  # type: ignore[assignment]
    assert single_dispense_properties.retract.offset == Coordinate(x=-9, y=-8, z=-7)
    single_dispense_properties.retract.speed = 222
    assert single_dispense_properties.retract.speed == 222
    single_dispense_properties.retract.touch_tip.enabled = False
    assert single_dispense_properties.retract.touch_tip.enabled is False
    single_dispense_properties.retract.touch_tip.z_offset = 2.34
    assert single_dispense_properties.retract.touch_tip.z_offset == 2.34
    single_dispense_properties.retract.touch_tip.mm_from_edge = 1.11
    assert single_dispense_properties.retract.touch_tip.mm_from_edge == 1.11
    single_dispense_properties.retract.touch_tip.speed = 543
    assert single_dispense_properties.retract.touch_tip.speed == 543
    single_dispense_properties.retract.blowout.enabled = False
    assert single_dispense_properties.retract.blowout.enabled is False
    single_dispense_properties.retract.blowout.location = "destination"  # type: ignore[assignment]
    assert single_dispense_properties.retract.blowout.location
    assert single_dispense_properties.retract.blowout.location.value == "destination"
    single_dispense_properties.retract.blowout.flow_rate = 3.21
    assert single_dispense_properties.retract.blowout.flow_rate == 3.21
    single_dispense_properties.retract.delay.enabled = False
    assert single_dispense_properties.retract.delay.enabled is False
    single_dispense_properties.retract.delay.duration = 0.1
    assert single_dispense_properties.retract.delay.duration == 0.1

    single_dispense_properties.position_reference = "liquid-meniscus"  # type: ignore[assignment]
    assert single_dispense_properties.position_reference.value == "liquid-meniscus"
    single_dispense_properties.offset = 11, 22, -33  # type: ignore[assignment]
    assert single_dispense_properties.offset == Coordinate(x=11, y=22, z=-33)
    single_dispense_properties.mix.enabled = False
    assert single_dispense_properties.mix.enabled is False
    single_dispense_properties.mix.repetitions = 15
    assert single_dispense_properties.mix.repetitions == 15
    single_dispense_properties.mix.volume = 3
    assert single_dispense_properties.mix.volume == 3
    single_dispense_properties.delay.enabled = False
    assert single_dispense_properties.delay.enabled is False
    single_dispense_properties.delay.duration = 25.25
    assert single_dispense_properties.delay.duration == 25.25


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
    assert multi_dispense_properties.retract.touch_tip.mm_from_edge == 1
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


def test_multi_dispense_settings_override() -> None:
    """It should allow multi dispense properties to be overridden with new values."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    multi_dispense_data = liquid_class_model.byPipette[0].byTipType[0].multiDispense
    assert multi_dispense_data is not None
    multi_dispense_properties = build_multi_dispense_properties(multi_dispense_data)
    assert multi_dispense_properties is not None

    multi_dispense_properties.submerge.position_reference = "well-bottom"  # type: ignore[assignment]
    assert multi_dispense_properties.submerge.position_reference.value == "well-bottom"
    multi_dispense_properties.submerge.offset = 3, -2, 1  # type: ignore[assignment]
    assert multi_dispense_properties.submerge.offset == Coordinate(x=3, y=-2, z=1)
    multi_dispense_properties.submerge.speed = 111
    assert multi_dispense_properties.submerge.speed == 111
    multi_dispense_properties.submerge.delay.enabled = False
    assert multi_dispense_properties.submerge.delay.enabled is False
    multi_dispense_properties.submerge.delay.duration = 5.1
    assert multi_dispense_properties.submerge.delay.duration == 5.1

    multi_dispense_properties.retract.position_reference = "well-center"  # type: ignore[assignment]
    assert multi_dispense_properties.retract.position_reference.value == "well-center"
    multi_dispense_properties.retract.offset = -9, -8, -7  # type: ignore[assignment]
    assert multi_dispense_properties.retract.offset == Coordinate(x=-9, y=-8, z=-7)
    multi_dispense_properties.retract.speed = 222
    assert multi_dispense_properties.retract.speed == 222
    multi_dispense_properties.retract.touch_tip.enabled = False
    assert multi_dispense_properties.retract.touch_tip.enabled is False
    multi_dispense_properties.retract.touch_tip.z_offset = 2.34
    assert multi_dispense_properties.retract.touch_tip.z_offset == 2.34
    multi_dispense_properties.retract.touch_tip.mm_from_edge = 1.11
    assert multi_dispense_properties.retract.touch_tip.mm_from_edge == 1.11
    multi_dispense_properties.retract.touch_tip.speed = 543
    assert multi_dispense_properties.retract.touch_tip.speed == 543
    multi_dispense_properties.retract.blowout.enabled = False
    assert multi_dispense_properties.retract.blowout.enabled is False
    multi_dispense_properties.retract.blowout.location = "destination"  # type: ignore[assignment]
    assert multi_dispense_properties.retract.blowout.location
    assert multi_dispense_properties.retract.blowout.location.value == "destination"
    multi_dispense_properties.retract.blowout.flow_rate = 3.21
    assert multi_dispense_properties.retract.blowout.flow_rate == 3.21
    multi_dispense_properties.retract.delay.enabled = False
    assert multi_dispense_properties.retract.delay.enabled is False
    multi_dispense_properties.retract.delay.duration = 0.1
    assert multi_dispense_properties.retract.delay.duration == 0.1

    multi_dispense_properties.position_reference = "liquid-meniscus"  # type: ignore[assignment]
    assert multi_dispense_properties.position_reference.value == "liquid-meniscus"
    multi_dispense_properties.offset = 11, 22, -33  # type: ignore[assignment]
    assert multi_dispense_properties.offset == Coordinate(x=11, y=22, z=-33)
    multi_dispense_properties.delay.enabled = False
    assert multi_dispense_properties.delay.enabled is False
    multi_dispense_properties.delay.duration = 25.25
    assert multi_dispense_properties.delay.duration == 25.25


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


def test_non_existent_property_raises_error() -> None:
    """It should raise an attribute error if the set property does not exist."""
    fixture_data = load_shared_data("liquid-class/fixtures/1/fixture_glycerol50.json")
    liquid_class_model = LiquidClassSchemaV1.model_validate_json(fixture_data)
    aspirate_data = liquid_class_model.byPipette[0].byTipType[0].aspirate

    aspirate_properties = build_aspirate_properties(aspirate_data)

    with pytest.raises(AttributeError):
        aspirate_properties.mix.enable = True  # type: ignore[attr-defined]
