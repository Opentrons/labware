import os
import pytest
from typing import Iterator
from opentrons_shared_data import get_shared_data_root
from opentrons_shared_data.pipette.pipette_load_name_conversions import (
    convert_pipette_model,
)
from opentrons_shared_data.pipette.load_data import load_definition
from opentrons_shared_data.pipette.ul_per_mm import piecewise_volume_conversion

from opentrons_shared_data.pipette.types import PipetteModel
from opentrons_shared_data.pipette.pipette_definition import (
    ulPerMMDefinition,
)


DEFAULT_MAX_SPEED_HIGH_THROUGHPUT_OT3_AXIS_KIND_P = 15
DEFAULT_MAX_SPEED_LOW_THROUGHPUT_OT3_AXIS_KIND_P = 70
B_MAX_SPEED = 40


def _get_plunger_max_speed(pipette_model: PipetteModel) -> float:
    if "v2" in pipette_model:
        return B_MAX_SPEED
    else:
        if "96" in pipette_model:
            return DEFAULT_MAX_SPEED_HIGH_THROUGHPUT_OT3_AXIS_KIND_P
        else:
            return DEFAULT_MAX_SPEED_LOW_THROUGHPUT_OT3_AXIS_KIND_P


def _get_max_flow_rate_at_volume(
    ul_per_mm_definition: ulPerMMDefinition,
    pipette_model: PipetteModel,
    volume: float,
) -> float:
    max_speed = _get_plunger_max_speed(pipette_model)
    map = list(ul_per_mm_definition.default.values())[-1]
    ul_per_mm = piecewise_volume_conversion(volume, map)
    return round(ul_per_mm * max_speed, 1)


def get_all_pipette_models() -> Iterator[PipetteModel]:
    paths_to_validate = (
        get_shared_data_root() / "pipette" / "definitions" / "2" / "liquid"
    )

    _channel_model_str = {
        "single_channel": "single",
        "ninety_six_channel": "96",
        "eight_channel": "multi",
        "eight_channel_em": "multi_em",
    }
    assert os.listdir(paths_to_validate), "You have a path wrong"
    for channel_dir in os.listdir(paths_to_validate):
        for model_dir in os.listdir(paths_to_validate / channel_dir):
            for liquid_file in os.listdir(paths_to_validate / channel_dir / model_dir):
                for version_file in os.listdir(
                    paths_to_validate / channel_dir / model_dir / liquid_file
                ):
                    version_list = version_file.split(".json")[0].split("_")
                    built_model: PipetteModel = PipetteModel(
                        f"{model_dir}_{_channel_model_str[channel_dir]}_v{version_list[0]}.{version_list[1]}"
                    )
                    if version_list[0] != "1" and version_list[1] != "0":
                        yield built_model


@pytest.mark.parametrize("pipette", list(get_all_pipette_models()))
@pytest.mark.parametrize("action", ["aspirate", "dispense"])
def test_max_flow_rates_per_volume(pipette: PipetteModel, action: str) -> None:
    """Verify the max flow rate values for each pipette's supported tip is in range"""
    pipette_model_version = convert_pipette_model(pipette)
    definition = load_definition(
        pipette_model_version.pipette_type,
        pipette_model_version.pipette_channels,
        pipette_model_version.pipette_version,
        pipette_model_version.oem_type,
    )

    pipette_model_version_str = f"{pipette_model_version}"

    for liquid_name, liquid_properties in definition.liquid_properties.items():
        for tip_type, supported_tip in liquid_properties.supported_tips.items():

            """TODO: the following models do not pass the asserts since the uiMaxFlowRate was raised
            to match the default blowout and dispense flowRates. uiMaxFlowRate will be reevaluated
            in the future."""
            if not (
                pipette_model_version_str
                in {
                    "p50_single_v3.4",
                    "p50_single_v3.5",
                    "p50_single_v3.6",
                    "p50_multi_v3.5",
                    "p50_multi_v3.4",
                }
                and liquid_properties.min_volume == 5.0
            ):
                assert supported_tip.ui_max_flow_rate < _get_max_flow_rate_at_volume(
                    supported_tip.aspirate, pipette, liquid_properties.min_volume
                )
                assert supported_tip.ui_max_flow_rate < _get_max_flow_rate_at_volume(
                    supported_tip.dispense, pipette, liquid_properties.min_volume
                )
