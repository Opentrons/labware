import pytest
from typing import Dict, Any, cast
from opentrons_shared_data.pipette import (
    load_data,
    pipette_load_name_conversions,
    types,
)
from opentrons_shared_data.pipette.types import (
    PipetteChannelType,
    PipetteModelType,
    PipetteVersionType,
    PipetteOEMType,
    PipetteTipType,
    Quirks,
    LiquidClasses,
)


def test_load_pipette_definition() -> None:
    pipette_config_one = load_data.load_definition(
        PipetteModelType.p50,
        PipetteChannelType.SINGLE_CHANNEL,
        PipetteVersionType(major=3, minor=3),
        PipetteOEMType.OT,
    )

    assert pipette_config_one.channels == 1
    assert pipette_config_one.pipette_type.value == "p50"
    assert pipette_config_one.nozzle_offset == [-8.0, -22.0, -259.15]

    assert (
        pipette_config_one.liquid_properties[LiquidClasses.default]
        .supported_tips[PipetteTipType.t50]
        .default_aspirate_flowrate.default
        == 8.0
    )

    assert pipette_config_one.quirks == []
    pipette_config_two = load_data.load_definition(
        PipetteModelType.p50,
        PipetteChannelType.SINGLE_CHANNEL,
        PipetteVersionType(major=1, minor=0),
        PipetteOEMType.OT,
    )

    assert pipette_config_two.channels == 1
    assert pipette_config_two.pipette_type.value == "p50"
    assert pipette_config_two.nozzle_offset == [0.0, 0.0, 25.0]
    assert (
        pipette_config_two.liquid_properties[LiquidClasses.default]
        .supported_tips[PipetteTipType.t200]
        .default_aspirate_flowrate.default
        == 25.0
    )
    assert pipette_config_two.quirks == [Quirks.dropTipShake]


@pytest.mark.parametrize(
    argnames=["key_spot_check", "value_spot_check"],
    argvalues=[
        ["P1KSV10", "p1000_single_v1.0"],
        ["P1KHV33", "p1000_96_v3.3"],
        ["P20MV21", "p20_multi_v2.1"],
        ["P300MV10", "p300_multi_v1.0"],
        ["P3HMV14", "p300_multi_v1.4"],
    ],
)
def test_build_serial_number_lookup(key_spot_check: str, value_spot_check: str) -> None:
    lookup_table = load_data.load_serial_lookup_table()
    assert lookup_table[key_spot_check] == value_spot_check


@pytest.mark.parametrize(
    argnames=["pipette_model", "v1_configuration_changes"],
    argvalues=[
        ["p300_multi_v1.4", {"max_volume": 200, "min_volume": 10}],
        ["p1000_96_v3.3", {"tip_length": 40, "min_volume": 300}],
    ],
)
def test_update_pipette_configuration(
    pipette_model: str, v1_configuration_changes: Dict[str, Any]
) -> None:

    liquid_class = LiquidClasses.default
    model_name = pipette_load_name_conversions.convert_pipette_model(
        cast(types.PipetteModel, pipette_model)
    )
    base_configurations = load_data.load_definition(
        model_name.pipette_type,
        model_name.pipette_channels,
        model_name.pipette_version,
        model_name.oem_type,
    )

    updated_configurations = load_data.update_pipette_configuration(
        base_configurations, v1_configuration_changes, liquid_class
    )

    updated_configurations_dict = updated_configurations.model_dump()
    for k, v in v1_configuration_changes.items():
        if k == "tip_length":
            for i in updated_configurations_dict["liquid_properties"][liquid_class][
                "supported_tips"
            ].values():
                assert i["default_tip_length"] == v
        else:
            assert (
                updated_configurations_dict["liquid_properties"][liquid_class][k] == v
            )
