"""A script for updating pre-existing V2 Pipette configurations."""
import os
import json
import argparse

from pathlib import Path
from typing import List, Dict, Tuple, Any, Iterator, Type

from pydantic import BaseModel
from pydantic.main import ModelMetaclass
from enum import Enum

from opentrons_shared_data import get_shared_data_root

from ..pipette_definition import (
    PipetteConfigurations,
    PipetteGeometryDefinition,
    PipettePhysicalPropertiesDefinition,
    PipetteLiquidPropertiesDefinition,
    PipetteModelVersionType,
    SupportedTipsDefinition,
)
from ..types import (
    PipetteModelType,
    PipetteChannelType,
    PipetteVersionType,
    PipetteTipType,
    PipetteModelMajorVersion,
    PipetteModelMinorVersion,
    LiquidClasses,
)
from ..load_data import _geometry, _physical, _liquid
from ..pipette_load_name_conversions import convert_pipette_model
from ..types import PipetteModel

"""
Instructions:

To run this script, you must be in `shared-data/python`. To invoke, use the command:

`pipenv run python -m opentrons_shared_data.pipette.scripts.update_configuration_files`

If you want to update all files, you can simply use the argument `--update_all_models`.

Make sure to run `make format-js` afterwards to ensure formatting of the json files
is good.

*Note* If you are adding a brand-new key, you MUST update the pydantic models
found in `python/pipette/pipette_definition.py` before running this script.

*Note* When you are entering in your data, please utilize the exact type. I.e. if it's a
list, you must input the list like: [1, 2, 3] or if it's a dict, like: {"data": 1}..

For now, we do not support updating pipetting functions in this script.
"""

ROOT = get_shared_data_root() / "pipette" / "definitions" / "2"
NOZZLE_LOCATION_CONFIGS = ["nozzle_offset", "nozzle_map"]


def _change_to_camel_case(c: str) -> str:
    # Tiny helper function to convert to camelCase.
    config_name = c.split("_")
    if len(config_name) == 1:
        return config_name[0]
    return f"{config_name[0]}" + "".join(s.capitalize() for s in config_name[1::])


def list_configuration_keys() -> Tuple[List[str], Dict[int, str]]:
    """List out the model keys available to modify at the top level."""
    lookup = {i: v for (i, v) in enumerate(PipetteConfigurations.model_fields)}
    return [
        f"{i}: {v}" for (i, v) in enumerate(PipetteConfigurations.model_fields)
    ], lookup


def list_available_enum(enum_type: Type[Enum]) -> List[str]:
    """List available pipette models"""
    return [f"{i}: {v}" for (i, v) in enumerate(enum_type)]


def handle_subclass_model(
    top_level_configuration: List[str], base_model: BaseModel, is_basemodel: bool
) -> List[str]:
    """Handle sub-classed basemodels and update the top level model as necessary."""
    if is_basemodel:
        if base_model.model_fields == SupportedTipsDefinition.model_fields:
            # pydantic does something weird with the types in ModelFields so
            # we cannot use isinstance checks to confirm if the base model
            # is a supported tips definition
            print(f"choose {PipetteTipType.__name__}:")
            for row in list_available_enum(PipetteTipType):
                print(f"\t{row}")
            tip_type = list(PipetteTipType)[
                int(input("select the tip volume size to modify"))
            ]
            top_level_configuration.append(tip_type.name)

        lookup = {i: v for (i, v) in enumerate(base_model.model_fields)}
        config_list = [f"{i}: {v}" for (i, v) in enumerate(base_model.model_fields)]
        print(f"you selected the basemodel {base_model.__name__}:")  # type: ignore[attr-defined]
        for row in config_list:
            print(f"\t{row}")

        configuration_to_update = lookup[
            int(input("select a specific configuration from above\n"))
        ]
        field_type = base_model.model_fields[
            configuration_to_update
        ].rebuild_annotation()
        is_basemodel = isinstance(field_type, ModelMetaclass)

        top_level_configuration.append(configuration_to_update)
        return handle_subclass_model(top_level_configuration, field_type, is_basemodel)
    else:
        return top_level_configuration


def check_from_version(version: str) -> str:
    """Check that the version requested is supported in the system."""
    version_int = [int(v) for v in version.split(".")]
    if version_int[0] not in PipetteModelMajorVersion:
        raise ValueError(f"Major version {version_int[0]} is not supported.")
    if version_int[1] not in PipetteModelMinorVersion:
        raise ValueError(f"Minor version {version_int[1]} is not supported.")
    return version


def save_data_to_file(
    directorypath: Path,
    file_name: str,
    data: Dict[str, Any],
) -> None:
    """
    Function used to save data to a file
    """
    directorypath.mkdir(parents=True, exist_ok=True)
    filepath = directorypath / f"{file_name}.json"
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def update(
    dict_to_update: Dict[str, Any], iter_of_configs: Iterator[str], value_to_update: Any
) -> Dict[str, Any]:
    """
    Recursively update the given dictionary to ensure no data is lost when updating.
    """
    next_key = next(iter_of_configs, None)
    if next_key and isinstance(dict_to_update.get(next_key), dict):
        dict_to_update[next_key] = update(
            dict_to_update.get(next_key, {}), iter_of_configs, value_to_update
        )
    elif next_key:
        dict_to_update[next_key] = value_to_update
    return dict_to_update


def build_nozzle_map(
    nozzle_offset: List[float], channels: PipetteChannelType
) -> Dict[str, List[float]]:
    Y_OFFSET = -9
    X_OFFSET = 9
    if channels == PipetteChannelType.SINGLE_CHANNEL:
        return {"A1": nozzle_offset}
    elif channels == PipetteChannelType.EIGHT_CHANNEL:
        return {
            f"{chr(ord('A') + 1*row)}1": [
                nozzle_offset[0],
                nozzle_offset[1] + Y_OFFSET * row,
                nozzle_offset[2],
            ]
            for row in range(8)
        }
    elif channels == PipetteChannelType.NINETY_SIX_CHANNEL:
        return {
            f"{chr(ord('A') + 1*row)}{1 + 1*col}": [
                nozzle_offset[0] + X_OFFSET * col,
                nozzle_offset[1] + Y_OFFSET * row,
                nozzle_offset[2],
            ]
            for row in range(8)
            for col in range(12)
        }
    raise ValueError(f"Unsupported channel type {channels}")


def load_and_update_file_from_config(
    config_to_update: List[str],
    value_to_update: Any,
    model_to_update: PipetteModelVersionType,
) -> None:
    """Update the requested config and save to disk.

    Load the requested config sub type (physical, geometry or liquid). Then
    update the current file and save to disk.

    """
    camel_list_to_update = iter([_change_to_camel_case(i) for i in config_to_update])

    if config_to_update[0] in PipetteGeometryDefinition.model_fields:
        geometry = _geometry(
            model_to_update.pipette_channels,
            model_to_update.pipette_type,
            model_to_update.pipette_version,
        )
        if config_to_update[0] == "nozzle_map":
            nozzle_to_use = (
                value_to_update if value_to_update else geometry["nozzleOffset"]
            )
            geometry["nozzleMap"] = build_nozzle_map(
                nozzle_to_use, model_to_update.pipette_channels
            )
        elif config_to_update[0] == "nozzle_offset":
            geometry["nozzleMap"] = build_nozzle_map(
                value_to_update, model_to_update.pipette_channels
            )
            geometry["nozzleOffset"] = value_to_update
        else:
            geometry = update(geometry, camel_list_to_update, value_to_update)
        PipetteGeometryDefinition.model_validate(geometry)

        filepath = (
            ROOT
            / "geometry"
            / model_to_update.pipette_channels.name.lower()
            / model_to_update.pipette_type.value
        )
        save_data_to_file(
            filepath,
            f"{model_to_update.pipette_version.major}_{model_to_update.pipette_version.minor}",
            geometry,
        )
    elif config_to_update[0] in PipettePhysicalPropertiesDefinition.model_fields:
        physical = _physical(
            model_to_update.pipette_channels,
            model_to_update.pipette_type,
            model_to_update.pipette_version,
        )

        physical = update(physical, camel_list_to_update, value_to_update)

        PipettePhysicalPropertiesDefinition.model_validate(physical)
        filepath = (
            ROOT
            / "general"
            / model_to_update.pipette_channels.name.lower()
            / model_to_update.pipette_type.value
        )
        save_data_to_file(
            filepath,
            f"{model_to_update.pipette_version.major}_{model_to_update.pipette_version.minor}",
            physical,
        )
    elif config_to_update[0] == "liquid_properties":
        next(camel_list_to_update)
        liquid = _liquid(
            model_to_update.pipette_channels,
            model_to_update.pipette_type,
            model_to_update.pipette_version,
        )

        print(
            "Please select what liquid class you wish to update.\n If you want to update all liquid classes then type 'all'.\n"
        )

        print(f"choose {LiquidClasses.__name__} or type 'all':")
        for row in list_available_enum(LiquidClasses):
            print(f"\t{row}")
        liquid_classes = input("liquid class: ")
        if liquid_classes == "all":
            for c in LiquidClasses:
                liquid = update(
                    liquid[c.name.lower()], camel_list_to_update, value_to_update
                )

                PipetteLiquidPropertiesDefinition.model_validate(liquid)
                filepath = (
                    ROOT
                    / "liquid"
                    / model_to_update.pipette_channels.name.lower()
                    / model_to_update.pipette_type.value
                    / c.name.lower()
                )
                save_data_to_file(
                    filepath,
                    f"{model_to_update.pipette_version.major}_{model_to_update.pipette_version.minor}",
                    liquid,
                )
        else:
            lc = list(LiquidClasses)[int(liquid_classes)]
            liquid = update(
                liquid[lc.name.lower()], camel_list_to_update, value_to_update
            )
            PipetteLiquidPropertiesDefinition.model_validate(liquid)

            filepath = (
                ROOT
                / "liquid"
                / model_to_update.pipette_channels.name.lower()
                / model_to_update.pipette_type.value
                / lc.name.lower()
            )
            save_data_to_file(
                filepath,
                f"{model_to_update.pipette_version.major}_{model_to_update.pipette_version.minor}",
                liquid,
            )
    else:
        raise KeyError(
            f"{config_to_update} is not saved to a file. Check `pipette_definition.py` for more information."
        )


def _update_single_model(configuration_to_update: List[str]) -> None:
    """Helper function to update single model."""
    print(f"choose {PipetteModelType.__name__}:")
    for row in list_available_enum(PipetteModelType):
        print(f"\t{row}")
    model = list(PipetteModelType)[int(input("Please select from above\n"))]

    print(f"choose {PipetteChannelType.__name__}:")
    for row in list_available_enum(PipetteChannelType):
        print(f"\t{row}")
    channels = list(PipetteChannelType)[int(input("Please select from above\n"))]

    version = PipetteVersionType.convert_from_float(
        float(check_from_version(input("Please input the version of the model\n")))
    )

    built_model: PipetteModel = PipetteModel(
        f"{model.name}_{str(channels)}_v{version.major}.{version.minor}"
    )

    if configuration_to_update[0] == NOZZLE_LOCATION_CONFIGS[1]:
        print(
            "You selected nozzle_map to edit. If you wish to update the nozzle offset, enter it on the next line.\n"
        )
        print("Otherwise, please type 'null' on the next line.\n")

    value_to_update = json.loads(
        input(
            f"Please select what you would like to update {configuration_to_update[-1]} to for {built_model}\n"
        )
    )

    model_version = convert_pipette_model(built_model)

    load_and_update_file_from_config(
        configuration_to_update, value_to_update, model_version
    )


def _update_all_models(configuration_to_update: List[str]) -> None:
    paths_to_validate = ROOT / "general"
    _channel_model_str = {
        "single_channel": "single",
        "ninety_six_channel": "96",
        "eight_channel": "multi",
        "eight_channel_em": "multi_em",
    }

    for channel_dir in os.listdir(paths_to_validate):
        for model_dir in os.listdir(paths_to_validate / channel_dir):
            for version_file in os.listdir(paths_to_validate / channel_dir / model_dir):
                version_list = version_file.split(".json")[0].split("_")
                built_model: PipetteModel = PipetteModel(
                    f"{model_dir}_{_channel_model_str[channel_dir]}_v{version_list[0]}.{version_list[1]}"
                )

                if configuration_to_update[0] == NOZZLE_LOCATION_CONFIGS[1]:
                    print(
                        "You selected nozzle_map to edit. If you wish to update the nozzle offset, enter it on the next line.\n"
                    )
                    print("Otherwise, please type 'null' on the next line.\n")

                value_to_update = json.loads(
                    input(
                        f"Please select what you would like to update {configuration_to_update} to for {built_model}\n"
                    )
                )

                model_version = convert_pipette_model(built_model)
                load_and_update_file_from_config(
                    configuration_to_update, value_to_update, model_version
                )


def determine_models_to_update(update_all_models: bool) -> None:
    try:
        while True:
            print(f"choose {PipetteConfigurations.__name__}:")
            config_list, table_lookup = list_configuration_keys()
            for row in config_list:
                print(f"\t{row}")

            configuration_to_update = [
                table_lookup[int(input("select a configuration from above\n"))]
            ]

            if configuration_to_update[0] == NOZZLE_LOCATION_CONFIGS[0]:
                print(
                    f"NOTE: updating the {configuration_to_update[0]} will automatically update the {NOZZLE_LOCATION_CONFIGS[1]}\n"
                )

            field_type = PipetteConfigurations.model_fields[
                configuration_to_update[0]
            ].rebuild_annotation()
            is_basemodel = isinstance(field_type, ModelMetaclass)

            configuration_to_update = handle_subclass_model(
                configuration_to_update, field_type, is_basemodel
            )
            if update_all_models:
                _update_all_models(configuration_to_update)
            else:
                _update_single_model(configuration_to_update)
    except KeyboardInterrupt:
        print("Finished updating! Validate that your files updated successfully.")


def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description="96 channel tip handling testing script."
    )
    parser.add_argument(
        "--update_all_models",
        type=bool,
        help="update all",
        default=False,
    )

    args = parser.parse_args()

    determine_models_to_update(args.update_all_models)


if __name__ == "__main__":
    """
    A script to automate building a pipette configuration definition.

    This script can either perform migrations from a v1 -> v2 schema format
    or build a brand new script from scratch.

    When building a new pipette configuration model, you will either need
    to provide CSVs or use command line inputs.

    If you choose CSVs you will need one CSV for the general pipette configuration
    data (such as pipette model or number of channels) and one for every tip
    type that this pipette model can support.
    """
    main()
