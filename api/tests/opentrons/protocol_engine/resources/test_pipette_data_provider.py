"""Test pipette data provider."""
from typing import Dict
from sys import maxsize
import pytest
from opentrons_shared_data.pipette.types import PipetteNameType, PipetteModel
from opentrons_shared_data.pipette import pipette_definition, types as pip_types
from opentrons_shared_data.pipette.pipette_definition import (
    PipetteBoundingBoxOffsetDefinition,
    TIP_OVERLAP_VERSION_MAXIMUM,
    AvailableSensorDefinition,
)

from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocol_engine.types import FlowRates
from opentrons.protocol_engine.resources.pipette_data_provider import (
    LoadedStaticPipetteData,
    VirtualPipetteDataProvider,
    validate_and_default_tip_overlap_version,
    get_latest_tip_overlap_before_version,
)

from opentrons.protocol_engine.resources import pipette_data_provider as subject
from opentrons.protocol_engine.errors.exceptions import InvalidLoadPipetteSpecsError
from ..pipette_fixtures import get_default_nozzle_map
from opentrons.types import Point


@pytest.fixture
def available_sensors() -> AvailableSensorDefinition:
    """Provide a list of sensors."""
    return AvailableSensorDefinition(sensors=["pressure", "capacitive", "environment"])


@pytest.fixture
def subject_instance() -> VirtualPipetteDataProvider:
    """Instance of a VirtualPipetteDataProvider for test."""
    return VirtualPipetteDataProvider()


def test_get_virtual_pipette_static_config(
    subject_instance: VirtualPipetteDataProvider,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return config data given a pipette name."""
    result = subject_instance.get_virtual_pipette_static_config(
        PipetteNameType.P20_SINGLE_GEN2.value, "some-id", "v0"
    )

    assert result == LoadedStaticPipetteData(
        model="p20_single_v2.2",
        display_name="P20 Single-Channel GEN2",
        min_volume=1,
        max_volume=20.0,
        channels=1,
        nozzle_offset_z=10.45,
        home_position=172.15,
        flow_rates=FlowRates(
            default_aspirate={"2.0": 3.78, "2.6": 7.56},
            default_dispense={"2.0": 3.78, "2.6": 7.56},
            default_blow_out={"2.0": 3.78, "2.6": 7.56},
        ),
        tip_configuration_lookup_table=result.tip_configuration_lookup_table,
        nominal_tip_overlap={
            "default": 8.25,
            "opentrons/eppendorf_96_tiprack_10ul_eptips/1": 8.4,
            "opentrons/geb_96_tiprack_10ul/1": 8.3,
            "opentrons/opentrons_96_filtertiprack_10ul/1": 8.25,
            "opentrons/opentrons_96_filtertiprack_20ul/1": 8.25,
            "opentrons/opentrons_96_tiprack_10ul/1": 8.25,
            "opentrons/opentrons_96_tiprack_20ul/1": 8.25,
        },
        nozzle_map=result.nozzle_map,
        back_left_corner_offset=Point(0, 0, 10.45),
        front_right_corner_offset=Point(0, 0, 10.45),
        pipette_lld_settings={},
        plunger_positions={
            "top": 19.5,
            "bottom": -8.5,
            "blow_out": -13.0,
            "drop_tip": -27.0,
        },
        shaft_ul_per_mm=0.785,
        available_sensors=AvailableSensorDefinition(sensors=[]),
    )


def test_configure_virtual_pipette_for_volume(
    subject_instance: VirtualPipetteDataProvider,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return an updated config if the liquid class changes."""
    result1 = subject_instance.get_virtual_pipette_static_config(
        PipetteNameType.P50_SINGLE_FLEX.value, "my-pipette", "v0"
    )
    assert result1 == LoadedStaticPipetteData(
        model="p50_single_v3.6",
        display_name="Flex 1-Channel 50 μL",
        min_volume=5,
        max_volume=50.0,
        channels=1,
        nozzle_offset_z=-259.15,
        home_position=230.15,
        flow_rates=FlowRates(
            default_blow_out={"2.14": 57},
            default_aspirate={"2.14": 35},
            default_dispense={"2.14": 57},
        ),
        tip_configuration_lookup_table=result1.tip_configuration_lookup_table,
        nominal_tip_overlap=result1.nominal_tip_overlap,
        nozzle_map=result1.nozzle_map,
        back_left_corner_offset=Point(-8.0, -22.0, -259.15),
        front_right_corner_offset=Point(-8.0, -22.0, -259.15),
        pipette_lld_settings={"t50": {"minHeight": 1.0, "minVolume": 0.0}},
        plunger_positions={
            "top": 0.0,
            "bottom": 71.5,
            "blow_out": 76.5,
            "drop_tip": 90.5,
        },
        shaft_ul_per_mm=0.785,
        available_sensors=available_sensors,
    )
    subject_instance.configure_virtual_pipette_for_volume(
        "my-pipette", 1, result1.model
    )
    result2 = subject_instance.get_virtual_pipette_static_config(
        PipetteNameType.P50_SINGLE_FLEX.value, "my-pipette", "v0"
    )
    assert result2 == LoadedStaticPipetteData(
        model="p50_single_v3.6",
        display_name="Flex 1-Channel 50 μL",
        min_volume=1,
        max_volume=30,
        channels=1,
        nozzle_offset_z=-259.15,
        home_position=230.15,
        flow_rates=FlowRates(
            default_blow_out={"2.14": 26.7},
            default_aspirate={"2.14": 26.7},
            default_dispense={"2.14": 26.7},
        ),
        tip_configuration_lookup_table=result2.tip_configuration_lookup_table,
        nominal_tip_overlap=result2.nominal_tip_overlap,
        nozzle_map=result2.nozzle_map,
        back_left_corner_offset=Point(-8.0, -22.0, -259.15),
        front_right_corner_offset=Point(-8.0, -22.0, -259.15),
        pipette_lld_settings={"t50": {"minHeight": 1.0, "minVolume": 0.0}},
        plunger_positions={
            "top": 0.0,
            "bottom": 61.5,
            "blow_out": 76.5,
            "drop_tip": 90.5,
        },
        shaft_ul_per_mm=0.785,
        available_sensors=available_sensors,
    )


def test_load_virtual_pipette_by_model_string(
    subject_instance: VirtualPipetteDataProvider,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return config data given a pipette model."""
    result = subject_instance.get_virtual_pipette_static_config_by_model_string(
        "p300_multi_v2.1", "my-pipette", "v0"
    )
    assert result == LoadedStaticPipetteData(
        model="p300_multi_v2.1",
        display_name="P300 8-Channel GEN2",
        min_volume=20.0,
        max_volume=300,
        channels=8,
        nozzle_offset_z=35.52,
        home_position=155.75,
        flow_rates=FlowRates(
            default_blow_out={"2.0": 94.0},
            default_aspirate={"2.0": 94.0},
            default_dispense={"2.0": 94.0},
        ),
        tip_configuration_lookup_table=result.tip_configuration_lookup_table,
        nominal_tip_overlap=result.nominal_tip_overlap,
        nozzle_map=result.nozzle_map,
        back_left_corner_offset=Point(-16.0, 43.15, 35.52),
        front_right_corner_offset=Point(16.0, -43.15, 35.52),
        pipette_lld_settings={},
        plunger_positions={
            "top": 19.5,
            "bottom": -14.5,
            "blow_out": -19.0,
            "drop_tip": -33.4,
        },
        shaft_ul_per_mm=9.621,
        available_sensors=AvailableSensorDefinition(sensors=[]),
    )


def test_load_virtual_pipette_nozzle_layout(
    subject_instance: VirtualPipetteDataProvider,
) -> None:
    """It should return a NozzleMap object."""
    subject_instance.configure_virtual_pipette_nozzle_layout(
        "my-pipette", "p300_multi_v2.1", "D1", "H1", "H1"
    )
    result = subject_instance.get_nozzle_layout_for_pipette("my-pipette")
    assert result.configuration.value == "COLUMN"
    assert result.starting_nozzle == "H1"
    assert result.front_right == "H1"
    assert result.back_left == "D1"

    subject_instance.configure_virtual_pipette_nozzle_layout(
        "my-pipette", "p300_multi_v2.1"
    )
    result = subject_instance.get_nozzle_layout_for_pipette("my-pipette")
    assert result.configuration.value == "FULL"

    subject_instance.configure_virtual_pipette_nozzle_layout(
        "my-96-pipette", "p1000_96_v3.6", "A1", "A12", "A1"
    )
    result = subject_instance.get_nozzle_layout_for_pipette("my-96-pipette")
    assert result.configuration.value == "ROW"

    subject_instance.configure_virtual_pipette_nozzle_layout(
        "my-96-pipette", "p1000_96_v3.6", "A1", "A1"
    )
    result = subject_instance.get_nozzle_layout_for_pipette("my-96-pipette")
    assert result.configuration.value == "SINGLE"

    subject_instance.configure_virtual_pipette_nozzle_layout(
        "my-96-pipette", "p1000_96_v3.6", "A1", "H1"
    )
    result = subject_instance.get_nozzle_layout_for_pipette("my-96-pipette")
    assert result.configuration.value == "COLUMN"


@pytest.fixture
def pipette_dict(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> PipetteDict:
    """Get a pipette dict."""
    return {
        "name": "p300_single_gen2",
        "min_volume": 20,
        "max_volume": 300,
        "channels": 1,
        "aspirate_flow_rate": 46.43,
        "dispense_flow_rate": 46.43,
        "pipette_id": "P3HSV202020060308",
        "current_volume": 0.0,
        "display_name": "P300 Single-Channel GEN2",
        "tip_length": 0.0,
        "model": PipetteModel("p300_single_v2.0"),
        "blow_out_flow_rate": 46.43,
        "working_volume": 300,
        "tip_overlap": {
            "default": 8.2,
            "opentrons/opentrons_96_tiprack_300ul/1": 8.2,
            "opentrons/opentrons_96_filtertiprack_200ul/1": 8.2,
        },
        "versioned_tip_overlap": {
            "v0": {
                "default": 8.2,
            },
            "v2": {"default": 9.3},
        },
        "available_volume": 300.0,
        "return_tip_height": 0.5,
        "default_aspirate_flow_rates": {"2.0": 46.43, "2.1": 92.86},
        "default_blow_out_flow_rates": {"2.0": 46.43, "2.2": 92.86},
        "default_dispense_flow_rates": {"2.0": 46.43, "2.3": 92.86},
        "back_compat_names": ["p300_single"],
        "has_tip": False,
        "aspirate_speed": 5.021202,
        "dispense_speed": 5.021202,
        "blow_out_speed": 5.021202,
        "ready_to_aspirate": False,
        "default_blow_out_speeds": {"2.0": 5.021202, "2.6": 10.042404},
        "default_dispense_speeds": {"2.0": 5.021202, "2.6": 10.042404},
        "default_aspirate_speeds": {"2.0": 5.021202, "2.6": 10.042404},
        "default_push_out_volume": 3,
        "supported_tips": {pip_types.PipetteTipType.t300: supported_tip_fixture},
        "current_nozzle_map": get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
        "pipette_bounding_box_offsets": PipetteBoundingBoxOffsetDefinition(
            backLeftCorner=[10, 20, 30],
            frontRightCorner=[40, 50, 60],
        ),
        "lld_settings": {
            "t50": {"minHeight": 0.5, "minVolume": 0},
            "t200": {"minHeight": 0.5, "minVolume": 0},
            "t1000": {"minHeight": 0.5, "minVolume": 0},
        },
        "plunger_positions": {"top": 100, "bottom": 20, "blow_out": 10, "drop_tip": 0},
        "shaft_ul_per_mm": 5.0,
        "available_sensors": available_sensors,
    }


@pytest.mark.parametrize(
    "tip_overlap_version,overlap_data",
    [
        ("v0", {"default": 8.2}),
        ("v1", {"default": 8.2}),
        ("v2", {"default": 9.3}),
        ("v10000", {"default": 9.3}),
    ],
)
def test_get_pipette_static_config(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    pipette_dict: PipetteDict,
    tip_overlap_version: str,
    overlap_data: Dict[str, float],
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return config data given a PipetteDict."""
    result = subject.get_pipette_static_config(pipette_dict, tip_overlap_version)

    assert result == LoadedStaticPipetteData(
        model="p300_single_v2.0",
        display_name="P300 Single-Channel GEN2",
        min_volume=20,
        max_volume=300,
        channels=1,
        flow_rates=FlowRates(
            default_aspirate={"2.0": 46.43, "2.1": 92.86},
            default_dispense={"2.0": 46.43, "2.3": 92.86},
            default_blow_out={"2.0": 46.43, "2.2": 92.86},
        ),
        tip_configuration_lookup_table={300: supported_tip_fixture},
        nominal_tip_overlap=overlap_data,
        # TODO(mc, 2023-02-28): these two values are not present in PipetteDict
        # https://opentrons.atlassian.net/browse/RCORE-655
        nozzle_offset_z=0,
        home_position=0,
        nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
        back_left_corner_offset=Point(10, 20, 30),
        front_right_corner_offset=Point(40, 50, 60),
        pipette_lld_settings={
            "t50": {"minHeight": 0.5, "minVolume": 0},
            "t200": {"minHeight": 0.5, "minVolume": 0},
            "t1000": {"minHeight": 0.5, "minVolume": 0},
        },
        plunger_positions={"top": 100, "bottom": 20, "blow_out": 10, "drop_tip": 0},
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )


@pytest.mark.parametrize(
    "version",
    [
        "",
        "qwe",
        "v",
        "v-1",
        "vab",
    ],
)
def test_validate_bad_tip_overlap_versions(version: str) -> None:
    """Raise for bad tip overlap version specs."""
    with pytest.raises(InvalidLoadPipetteSpecsError):
        validate_and_default_tip_overlap_version(version)


def test_default_tip_overlap_versions() -> None:
    """Default None tip overlap version specs."""
    assert (
        validate_and_default_tip_overlap_version(None)
        == f"v{TIP_OVERLAP_VERSION_MAXIMUM}"
    )


@pytest.mark.parametrize("version", ["v0", "v1", f"v{maxsize+1}"])
def test_pass_valid_tip_overlap_versions(version: str) -> None:
    """Pass valid tip overlap specs."""
    assert validate_and_default_tip_overlap_version(version) == version


@pytest.mark.parametrize(
    "version,target_data",
    [
        ("v0", {"default": 123.0}),
        ("v1", {"default": 321.1}),
        ("v3", {"default": 333.5}),
        ("v9999", {"default": 4414.99}),
    ],
)
def test_get_latest_tip_overlap(version: str, target_data: Dict[str, float]) -> None:
    """Test the search function for latest offset."""
    overlap = {
        "v0": {"default": 123.0},
        "v1": {"default": 321.1},
        "v2": {"default": 333.5},
        "v1231": {"default": 4414.99},
    }
    assert get_latest_tip_overlap_before_version(overlap, version) == target_data
