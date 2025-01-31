import json
from pathlib import Path
from logging import getLogger

from typing import Dict, Any, Union, Optional, List, Iterator
from typing_extensions import Literal
from functools import lru_cache

from .. import load_shared_data, get_shared_data_root

from .pipette_definition import (
    PipetteConfigurations,
    PipetteLiquidPropertiesDefinition,
    ValidNozzleMaps,
)
from .model_constants import MOUNT_CONFIG_LOOKUP_TABLE, _MAP_KEY_TO_V2
from .types import (
    PipetteChannelType,
    PipetteModelType,
    PipetteGenerationType,
    PipetteVersionType,
    PipetteModelMajorVersion,
    PipetteModelMinorVersion,
    LiquidClasses,
    PipetteOEMType,
)


LoadedConfiguration = Dict[str, Union[str, Dict[str, Any]]]

LOG = getLogger(__name__)


def _get_configuration_dictionary(
    config_type: Literal["general", "geometry", "liquid"],
    channels: PipetteChannelType,
    model: PipetteModelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
    liquid_class: Optional[LiquidClasses] = None,
) -> LoadedConfiguration:
    oem_extension = f"_{oem.value}" if oem != PipetteOEMType.OT else ""
    if liquid_class:
        config_path = (
            get_shared_data_root()
            / "pipette"
            / "definitions"
            / "2"
            / config_type
            / f"{channels.name.lower()}{oem_extension}"
            / model.value
            / liquid_class.name
            / f"{version.major}_{version.minor}.json"
        )
    else:
        config_path = (
            get_shared_data_root()
            / "pipette"
            / "definitions"
            / "2"
            / config_type
            / f"{channels.name.lower()}{oem_extension}"
            / model.value
            / f"{version.major}_{version.minor}.json"
        )
    return json.loads(load_shared_data(config_path))


@lru_cache(maxsize=None)
def _geometry(
    channels: PipetteChannelType,
    model: PipetteModelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> LoadedConfiguration:
    return _get_configuration_dictionary("geometry", channels, model, version, oem)


@lru_cache(maxsize=None)
def _liquid(
    channels: PipetteChannelType,
    model: PipetteModelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> Dict[str, LoadedConfiguration]:
    liquid_dict = {}
    for liquid_class in LiquidClasses:
        try:
            liquid_dict[liquid_class.name] = _get_configuration_dictionary(
                "liquid", channels, model, version, oem, liquid_class
            )
        except FileNotFoundError:
            continue

    return liquid_dict


@lru_cache(maxsize=None)
def _physical(
    channels: PipetteChannelType,
    model: PipetteModelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> LoadedConfiguration:
    return _get_configuration_dictionary("general", channels, model, version, oem)


def _dirs_in(path: Path) -> Iterator[Path]:
    for child in path.iterdir():
        if child.is_dir():
            yield child


@lru_cache(maxsize=None)
def load_serial_lookup_table() -> Dict[str, str]:
    """Load a serial abbreviation lookup table mapped to model name."""
    config_path = get_shared_data_root() / "pipette" / "definitions" / "2" / "general"
    _lookup_table = {}
    _channel_shorthand = {
        "eight_channel": "M",
        "single_channel": "S",
        "ninety_six_channel": "H",
        "eight_channel_em": "P",
    }
    _channel_model_str = {
        "single_channel": "single",
        "ninety_six_channel": "96",
        "eight_channel": "multi",
        "eight_channel_em": "multi_em",
    }
    _model_shorthand = {"p1000": "p1k", "p300": "p3h"}
    for channel_dir in _dirs_in(config_path):
        for model_dir in _dirs_in(channel_dir):
            for version_file in model_dir.iterdir():
                if version_file.suffix != ".json":
                    continue
                try:
                    version_list = version_file.stem.split("_")
                    built_model = f"{model_dir.stem}_{_channel_model_str[channel_dir.stem]}_v{version_list[0]}.{version_list[1]}"
                except IndexError:
                    LOG.warning(f"Pipette def with bad name {version_file} ignored")
                    continue
                model_shorthand = _model_shorthand.get(model_dir.stem, model_dir.stem)
                if (
                    model_dir.stem == "p300"
                    and int(version_list[0]) == 1
                    and int(version_list[1]) == 0
                ):
                    # Well apparently, we decided to switch the shorthand of the p300 depending
                    # on whether it's a "V1" model or not...so...here is the lovely workaround.
                    model_shorthand = model_dir.stem
                serial_shorthand = f"{model_shorthand.upper()}{_channel_shorthand[channel_dir.stem]}V{version_list[0]}{version_list[1]}"
                _lookup_table[serial_shorthand] = built_model
    return _lookup_table


def load_liquid_model(
    model: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> Dict[str, PipetteLiquidPropertiesDefinition]:
    liquid_dict = _liquid(channels, model, version, oem)
    return {
        k: PipetteLiquidPropertiesDefinition.model_validate(v)
        for k, v in liquid_dict.items()
    }


def _change_to_camel_case(c: str) -> str:
    # Tiny helper function to convert to camelCase.
    config_name = c.split("_")
    if len(config_name) == 1:
        return config_name[0]
    return f"{config_name[0]}" + "".join(s.capitalize() for s in config_name[1::])


def _edit_non_quirk_with_lc_override(
    mutable_config_key: str,
    new_mutable_value: Any,
    base_dict: Dict[str, Any],
    liquid_class: Optional[LiquidClasses],
) -> None:
    def _do_edit_non_quirk(
        new_value: Any, existing: Dict[Any, Any], keypath: List[Any]
    ) -> None:
        thiskey: Any = keypath[0]
        if thiskey in [lc.name for lc in LiquidClasses]:
            if liquid_class:
                thiskey = liquid_class
            else:
                thiskey = LiquidClasses[thiskey]
        if len(keypath) > 1:
            restkeys = keypath[1:]
            if thiskey == "##EACHTIP##":
                for key in existing.keys():
                    _do_edit_non_quirk(new_value, existing[key], restkeys)
            else:
                _do_edit_non_quirk(new_value, existing[thiskey], restkeys)
        else:
            # This was the last key
            if thiskey == "##EACHTIP##":
                for key in existing.keys():
                    existing[key] = new_value
            else:
                existing[thiskey] = new_value

    new_names = _MAP_KEY_TO_V2[mutable_config_key]
    _do_edit_non_quirk(new_mutable_value, base_dict, new_names)


def update_pipette_configuration(
    base_configurations: PipetteConfigurations,
    v1_configuration_changes: Dict[str, Any],
    liquid_class: Optional[LiquidClasses] = None,
) -> PipetteConfigurations:
    """Helper function to update 'V1' format configurations (left over from PipetteDict).

    #TODO (lc 7-14-2023) Remove once the pipette config dict is eliminated.
    Given an input of v1 mutable configs, look up the equivalent keyed
    value of that configuration."""
    quirks_list = []
    dict_of_base_model = base_configurations.model_dump(by_alias=True)

    for c, v in v1_configuration_changes.items():
        lookup_key = _change_to_camel_case(c)
        if c == "quirks" and isinstance(v, dict):
            quirks_list.extend([b.name for b in v.values() if b.value])
        else:
            _edit_non_quirk_with_lc_override(
                lookup_key, v, dict_of_base_model, liquid_class
            )

    dict_of_base_model["quirks"] = list(
        set(dict_of_base_model["quirks"]) - set(quirks_list)
    )

    # re-serialization is not great for this nested enum so we need
    # to perform this workaround.
    if not liquid_class:
        liquid_class = LiquidClasses.default
    dict_of_base_model["liquid_properties"][liquid_class]["supportedTips"] = {
        k.name: v
        for k, v in dict_of_base_model["liquid_properties"][liquid_class][
            "supportedTips"
        ].items()
    }
    dict_of_base_model["liquid_properties"] = {
        k.name: v for k, v in dict_of_base_model["liquid_properties"].items()
    }
    dict_of_base_model["plungerPositionsConfigurations"] = {
        k.name: v
        for k, v in dict_of_base_model["plungerPositionsConfigurations"].items()
    }
    return PipetteConfigurations.model_validate(dict_of_base_model)


def load_definition(
    model: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> PipetteConfigurations:
    if (
        version.major not in PipetteModelMajorVersion
        or version.minor not in PipetteModelMinorVersion
    ):
        raise KeyError("Pipette version not found.")

    geometry_dict = _geometry(channels, model, version, oem)
    physical_dict = _physical(channels, model, version, oem)
    liquid_dict = _liquid(channels, model, version, oem)

    generation = PipetteGenerationType(physical_dict["displayCategory"])
    mount_configs = MOUNT_CONFIG_LOOKUP_TABLE[generation][channels]

    return PipetteConfigurations.model_validate(
        {
            **geometry_dict,
            **physical_dict,
            "liquid_properties": liquid_dict,
            "version": version,
            "mount_configurations": mount_configs,
        }
    )


def load_valid_nozzle_maps(
    model: PipetteModelType,
    channels: PipetteChannelType,
    version: PipetteVersionType,
    oem: PipetteOEMType,
) -> ValidNozzleMaps:
    if (
        version.major not in PipetteModelMajorVersion
        or version.minor not in PipetteModelMinorVersion
    ):
        raise KeyError("Pipette version not found.")

    physical_dict = _physical(channels, model, version, oem)
    return ValidNozzleMaps.model_validate(physical_dict["validNozzleMaps"])
