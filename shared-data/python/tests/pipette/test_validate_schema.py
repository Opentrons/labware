import os
import json
from typing import Iterator
from opentrons_shared_data import get_shared_data_root

from opentrons_shared_data.pipette.pipette_definition import (
    PipetteConfigurations,
)
from opentrons_shared_data.pipette.load_data import (
    load_definition,
    load_valid_nozzle_maps,
)
from opentrons_shared_data.pipette.pipette_load_name_conversions import (
    convert_pipette_model,
)
from opentrons_shared_data.pipette import types


def iterate_models() -> Iterator[types.PipetteModel]:
    """Get an iterator of all pipette models."""
    _channel_model_str = {
        "single_channel": "single",
        "ninety_six_channel": "96",
        "eight_channel": "multi",
        "eight_channel_em": "multi_em",
    }
    defn_root = get_shared_data_root() / "pipette" / "definitions" / "2" / "liquid"
    assert os.listdir(defn_root), "A path is wrong"
    for channel_dir in defn_root.iterdir():
        for model_dir in channel_dir.iterdir():
            for lc_dir in model_dir.iterdir():
                for version_file in lc_dir.iterdir():
                    version_list = version_file.stem.split("_")
                    yield types.PipetteModel(
                        f"{model_dir.stem}_{_channel_model_str[channel_dir.stem]}_v{version_list[0]}.{version_list[1]}"
                    )


def test_check_all_models_are_valid() -> None:
    """Make sure each model can be loaded."""
    for model in iterate_models():
        model_version = convert_pipette_model(model)
        try:
            loaded_model = load_definition(
                model_version.pipette_type,
                model_version.pipette_channels,
                model_version.pipette_version,
                model_version.oem_type,
            )
        except json.JSONDecodeError:
            print(
                f"Failed to parse {model_version.pipette_type} {model_version.pipette_channels} {model_version.pipette_version}"
            )
            raise

        assert isinstance(loaded_model, PipetteConfigurations)


def test_pick_up_configs_configuration_by_nozzle_map_keys() -> None:
    """Verify that for every nozzle map the pickUpTipConfigurations have a valid configuration set."""
    paths_to_validate = (
        get_shared_data_root() / "pipette" / "definitions" / "2" / "general"
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
            for version_file in os.listdir(paths_to_validate / channel_dir / model_dir):
                print(version_file)
                version_list = version_file.split(".json")[0].split("_")
                built_model: types.PipetteModel = types.PipetteModel(
                    f"{model_dir}_{_channel_model_str[channel_dir]}_v{version_list[0]}.{version_list[1]}"
                )

                model_version = convert_pipette_model(built_model)
                loaded_model = load_definition(
                    model_version.pipette_type,
                    model_version.pipette_channels,
                    model_version.pipette_version,
                    model_version.oem_type,
                )
                valid_nozzle_maps = load_valid_nozzle_maps(
                    model_version.pipette_type,
                    model_version.pipette_channels,
                    model_version.pipette_version,
                    model_version.oem_type,
                )

                pipette_maps = list(
                    loaded_model.pick_up_tip_configurations.press_fit.configuration_by_nozzle_map.keys()
                )
                if loaded_model.pick_up_tip_configurations.cam_action is not None:
                    pipette_maps += list(
                        loaded_model.pick_up_tip_configurations.cam_action.configuration_by_nozzle_map.keys()
                    )
                assert pipette_maps == list(valid_nozzle_maps.maps.keys())


def test_pick_up_configs_configuration_ordered_from_smallest_to_largest() -> None:
    """Verify that ValidNozzleMaps and PickUpTipConfigurations are ordered from smallest nozzle configuration to largest, ensuring mutable config compliancy."""
    paths_to_validate = (
        get_shared_data_root() / "pipette" / "definitions" / "2" / "general"
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
            for version_file in os.listdir(paths_to_validate / channel_dir / model_dir):
                version_list = version_file.split(".json")[0].split("_")
                built_model: types.PipetteModel = types.PipetteModel(
                    f"{model_dir}_{_channel_model_str[channel_dir]}_v{version_list[0]}.{version_list[1]}"
                )

                model_version = convert_pipette_model(built_model)
                loaded_model = load_definition(
                    model_version.pipette_type,
                    model_version.pipette_channels,
                    model_version.pipette_version,
                    model_version.oem_type,
                )
                valid_nozzle_maps = load_valid_nozzle_maps(
                    model_version.pipette_type,
                    model_version.pipette_channels,
                    model_version.pipette_version,
                    model_version.oem_type,
                )

                map_keys = list(valid_nozzle_maps.maps.keys())
                for key in map_keys:
                    for i in range(map_keys.index(key)):
                        assert len(valid_nozzle_maps.maps[map_keys[i]]) <= len(
                            valid_nozzle_maps.maps[key]
                        )

                pipette_maps = list(
                    loaded_model.pick_up_tip_configurations.press_fit.configuration_by_nozzle_map.keys()
                )
                for key in pipette_maps:
                    for i in range(pipette_maps.index(key)):
                        assert len(valid_nozzle_maps.maps[pipette_maps[i]]) <= len(
                            valid_nozzle_maps.maps[key]
                        )


def test_serializer() -> None:
    """Verify that the serializer works as expected."""

    loaded_model = load_definition(
        types.PipetteModelType.p1000,
        types.PipetteChannelType.NINETY_SIX_CHANNEL,
        types.PipetteVersionType(3, 3),
        types.PipetteOEMType.OT,
    )
    quirk_0 = types.Quirks.pickupTipShake
    quirk_1 = types.Quirks.dropTipShake
    loaded_model.quirks = [quirk_0, quirk_1]

    assert loaded_model.pipette_type == types.PipetteModelType.p1000
    assert loaded_model.display_category == types.PipetteGenerationType.FLEX
    assert loaded_model.channels == types.PipetteChannelType.NINETY_SIX_CHANNEL

    model_dict = loaded_model.model_dump()
    # each field should be the value of the enum class
    assert (
        isinstance(model_dict["pipette_type"], str)
        and model_dict["pipette_type"] == loaded_model.pipette_type.value
    )
    assert (
        isinstance(model_dict["display_category"], str)
        and model_dict["display_category"] == loaded_model.display_category.value
    )
    assert (
        isinstance(model_dict["channels"], int)
        and model_dict["channels"] == loaded_model.channels.value
    )

    assert len(model_dict["quirks"]) == 2
    dict_quirk_0 = model_dict["quirks"][0]
    dict_quirk_1 = model_dict["quirks"][1]
    assert isinstance(dict_quirk_0, str) and dict_quirk_0 == quirk_0.value
    assert isinstance(dict_quirk_1, str) and dict_quirk_1 == quirk_1.value


# TODO: (AA, 4/9/2024) we should add a test to validate the dumped json to make
# sure we can re-load it as the BaseModel class. But we haven't added serializer
# for other enums yet, such as LiquidClass, and since we haven't been
# creating the definition files using model_dump/model_dump_json, it is okay to
# skip this for now.
