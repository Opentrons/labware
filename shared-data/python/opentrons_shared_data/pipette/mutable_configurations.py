import logging
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Any, cast

from .pipette_definition import PipetteConfigurations, PipetteModelVersionType
from .model_constants import (
    MUTABLE_CONFIGS_V1,
    VALID_QUIRKS,
    _MAP_KEY_TO_V2,
    _MIN_MAX_LOOKUP,
    _TYPE_LOOKUP,
    _UNITS_LOOKUP,
)
from .load_data import load_definition, load_serial_lookup_table
from .types import (
    MutableConfig,
    Quirks,
    QuirkConfig,
    TypeOverrides,
    OverrideType,
    LiquidClasses,
)
from .pipette_load_name_conversions import (
    convert_pipette_model,
    convert_to_pipette_name_type,
)
from .file_operation_helpers import (
    MutableConfigurationEncoder,
    MutableConfigurationDecoder,
)
from .dev_types import PipetteModel, PipetteName


log = logging.getLogger(__name__)

PIPETTE_SERIAL_MODEL_LOOKUP = load_serial_lookup_table()
SERIAL_STUB_REGEX = re.compile(r"P[0-9]{1,3}[KSMHV]{1,2}V[0-9]{2}")
LIQUID_CLASS = LiquidClasses.default


def _migrate_to_v2_configurations(
    base_configurations: PipetteConfigurations,
    v1_mutable_configs: OverrideType,
) -> PipetteConfigurations:
    """Helper function to migration V1 Configs to the V2 format.

    Given an input of v1 mutable configs, look up the equivalent keyed
    value of that configuration."""
    quirks_list = []
    dict_of_base_model = base_configurations.dict(by_alias=True)
    for c, v in v1_mutable_configs.items():
        if isinstance(v, str):
            # ignore the saved model
            continue
        if isinstance(v, bool):
            # ignore any accidental top level quirks.
            continue
        if c == "quirks" and isinstance(v, dict):
            quirks_list.extend([b.name for b in v.values() if b.value])
        else:
            new_names = _MAP_KEY_TO_V2[c]
            top_name = new_names["top_level_name"]
            nested_name = new_names["nested_name"]
            if c == "tipLength" and isinstance(v, MutableConfig):
                # This is only a concern for OT-2 configs and I think we can
                # be less smart about handling multiple tip types by updating
                # all tips.
                for k in dict_of_base_model["liquid_properties"][LIQUID_CLASS][
                    new_names["top_level_name"]
                ].keys():
                    dict_of_base_model["liquid_properties"][LIQUID_CLASS][top_name][k][
                        nested_name
                    ] = v
            elif new_names.get("liquid_class") and isinstance(v, MutableConfig):
                _class = LiquidClasses[new_names["liquid_class"]]
                dict_of_base_model[top_name][_class][nested_name] = v.value
            elif isinstance(v, MutableConfig):
                # isinstances are needed for type checking.
                dict_of_base_model[top_name][nested_name] = v.value
    dict_of_base_model["quirks"] = list(
        set(dict_of_base_model["quirks"]).union(set(quirks_list))
    )

    # re-serialization is not great for this nested enum so we need
    # to perform this workaround.
    dict_of_base_model["liquid_properties"][LIQUID_CLASS]["supportedTips"] = {
        k.name: v
        for k, v in dict_of_base_model["liquid_properties"][LIQUID_CLASS][
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
    return PipetteConfigurations.parse_obj(dict_of_base_model)


def _load_available_overrides(
    pipette_serial_number: str, pipette_override_path: Path
) -> OverrideType:
    """Load the available overrides from disk."""
    pipette_override = pipette_override_path / f"{pipette_serial_number}.json"
    try:
        with open(pipette_override, "r") as f:
            return json.load(f, cls=MutableConfigurationDecoder)
    except json.JSONDecodeError as e:
        log.warning(f"pipette override for {pipette_serial_number} is corrupt: {e}")
        pipette_override.unlink()
        raise FileNotFoundError()


def _list_all_mutable_configs(
    on_disk_overrides: OverrideType, base_configurations: Dict[str, Any]
) -> OverrideType:
    """Get all available mutable configurations"""
    all_mutable_configs = set([*MUTABLE_CONFIGS_V1, *VALID_QUIRKS]) - set(["quirks"])
    on_disk_configs = set(
        [
            v.name
            for v in on_disk_overrides.values()
            if isinstance(v, MutableConfig) or isinstance(v, QuirkConfig)
        ]
    )

    missing_configurations = all_mutable_configs.difference(on_disk_configs)

    default_configurations: OverrideType = {"quirks": {}}
    for c in missing_configurations:
        if c in VALID_QUIRKS:
            if Quirks(c) in base_configurations["quirks"]:
                default_configurations["quirks"][c] = QuirkConfig.validate_and_build(  # type: ignore
                    c, True
                )
        else:
            default_configurations[c] = _find_default(c, base_configurations)
    default_configurations.update(on_disk_overrides)
    return default_configurations


def _find_default(name: str, configs: Dict[str, Any]) -> MutableConfig:
    """Find the default value from the configs and return it as a mutable config."""
    lookup_dict = _MAP_KEY_TO_V2[name]
    nested_name = lookup_dict["nested_name"]

    min_max_dict = _MIN_MAX_LOOKUP[nested_name]
    type_lookup = _TYPE_LOOKUP[nested_name]
    units_lookup = _UNITS_LOOKUP[nested_name]
    if name == "tipLength":
        # This is only a concern for OT-2 configs and I think we can
        # be less smart about handling multiple tip types. Instead, just
        # get the max tip type.
        tip_list = list(
            configs["liquid_properties"][LIQUID_CLASS][
                lookup_dict["top_level_name"]
            ].keys()
        )
        tip_list.sort(key=lambda o: o.value)
        default_value = configs["liquid_properties"][LIQUID_CLASS][
            lookup_dict["top_level_name"]
        ][tip_list[-1]][nested_name]
    elif lookup_dict.get("liquid_class"):
        _class = LiquidClasses[lookup_dict["liquid_class"]]
        default_value = configs[lookup_dict["top_level_name"]][_class][nested_name]
    else:
        default_value = configs[lookup_dict["top_level_name"]][nested_name]
    return MutableConfig(
        value=default_value,
        default=default_value,
        min=min_max_dict["min"],
        max=min_max_dict["max"],
        type=type_lookup,
        units=units_lookup,
        name=name,
    )


def known_pipettes(pipette_override_path: Path) -> List[str]:
    """List pipette IDs for which we have known overrides"""
    return [
        fi.stem
        for fi in pipette_override_path.iterdir()
        if fi.is_file() and ".json" in fi.suffixes
    ]


def list_mutable_configs(
    pipette_serial_number: str, pipette_override_path: Path
) -> OverrideType:
    """
    Returns dict of mutable configs only.
    """

    mutable_configs: OverrideType = {}

    try:
        mutable_configs = _load_available_overrides(
            pipette_serial_number, pipette_override_path
        )
    except FileNotFoundError:
        log.info(f"Pipette id {pipette_serial_number} not found")
        # This is mimicing behavior from the original file
        # which returned an empty dict if no on disk value was found.
        return mutable_configs
    else:
        serial_key_match = SERIAL_STUB_REGEX.match(pipette_serial_number)

        if serial_key_match:
            serial_key = serial_key_match.group(0)
        else:
            serial_key = ""
        pipette_model = convert_pipette_model(
            cast(PipetteModel, PIPETTE_SERIAL_MODEL_LOOKUP[serial_key])
        )

        base_configs = load_definition(
            pipette_model.pipette_type,
            pipette_model.pipette_channels,
            pipette_model.pipette_version,
        )
        base_configs_dict = base_configs.dict(by_alias=True)
        full_mutable_configs = _list_all_mutable_configs(
            mutable_configs, base_configs_dict
        )

        if not full_mutable_configs.get("name"):
            full_mutable_configs["name"] = str(
                convert_to_pipette_name_type(cast(PipetteName, str(pipette_model)))
            )

        if not full_mutable_configs.get("model"):
            full_mutable_configs["model"] = str(pipette_model)

        return full_mutable_configs


def load_with_mutable_configurations(
    pipette_model: PipetteModelVersionType,
    pipette_override_path: Path,
    pipette_serial_number: Optional[str] = None,
) -> PipetteConfigurations:
    """
    Load pipette config data with any overrides available.

    This function reads from disk each time, so changes to the overrides
    will be picked up in subsequent calls.

    :param str pipette_model: The pipette model name (i.e. "p10_single_v1.3")
                              for which to load configuration
    :param pipette_serial_number: An (optional) unique ID for the pipette to locate
                       config overrides. If the ID is not specified, the system
                       assumes this is a simulated pipette and does not
                       save settings. If the ID is specified but no overrides
                       corresponding to the ID are found, the system creates a
                       new overrides file for it.
    :type pipette_serial_number: str or None
    :raises KeyError: if ``pipette_model`` is not in the top-level keys of
                      the pipetteModelSpecs.json file (and therefore not in
                      :py:attr:`configs`)

    :returns PipetteConfig: The configuration, loaded and checked
    """
    base_configurations = load_definition(
        pipette_model.pipette_type,
        pipette_model.pipette_channels,
        pipette_model.pipette_version,
    )
    # Load overrides if we have a pipette id
    if pipette_serial_number:
        try:
            override = _load_available_overrides(
                pipette_serial_number, pipette_override_path
            )
        except FileNotFoundError:
            pass
        else:
            base_configurations = _migrate_to_v2_configurations(
                base_configurations, override
            )
    # the ulPerMm functions are structured in pipetteModelSpecs.json as
    # a list sorted from oldest to newest. That means the latest functions
    # are always the last element and, as of right now, the older ones are
    # the first element (for models that only have one function, the first
    # and last elements are the same, which is fine). If we add more in the
    # future, we’ll have to change this code to select items more
    # intelligently
    # TODO (lc 06/27) Handle versioned ul per mm

    return base_configurations


def _add_new_overrides_to_existing(  # noqa: C901
    base_configs_dict: Dict[str, Any],
    existing_overrides: OverrideType,
    overrides: TypeOverrides,
) -> OverrideType:
    """Helper function to add new overrides to the existing ones"""
    # FIXME remove the validation here for the file save and rely
    # on the validation in the robot server. We unfortunately have
    # to keep the validation here until we decide to fully wipe/migrate
    # files saved on disk because some of them have unexpected
    # data entries.
    if not existing_overrides.get("quirks"):
        existing_overrides["quirks"] = {}
    for key, value in overrides.items():
        # If an existing override is saved as null from endpoint, remove from
        # overrides file
        if value is None and existing_overrides.get(key):
            del existing_overrides[key]
        elif isinstance(value, bool):
            if key in VALID_QUIRKS:
                existing_overrides["quirks"][key] = QuirkConfig.validate_and_build(  # type: ignore
                    key, value
                )
            elif key not in MUTABLE_CONFIGS_V1:
                # Unfortunately, some of the files got corrupted,
                # so we have to check that the key doesn't exist
                # in mutable configs before throwing an error.
                raise ValueError(
                    f"{value} is invalid for {key} or {key} is not a supported quirk."
                )
            elif existing_overrides.get(key):
                del existing_overrides[key]
        elif value:
            if existing_overrides.get(key):
                existing_overrides[key].validate_and_add(value)  # type: ignore
            else:
                new_mutable_config = _find_default(key, base_configs_dict)
                new_mutable_config.validate_and_add(value)
                existing_overrides[key] = new_mutable_config
    return existing_overrides


def save_overrides(
    pipette_serial_number: str, overrides: TypeOverrides, pipette_override_path: Path
) -> None:
    """
    Save overrides for the pipette.

    :param pipette_id: The pipette id
    :param overrides: The incoming values
    :return: None
    """
    # need to load defaults
    serial_key_match = SERIAL_STUB_REGEX.match(pipette_serial_number)
    if serial_key_match:
        serial_key = serial_key_match.group(0)
    else:
        serial_key = ""
    pipette_model = convert_pipette_model(
        cast(PipetteModel, PIPETTE_SERIAL_MODEL_LOOKUP[serial_key])
    )

    base_configs = load_definition(
        pipette_model.pipette_type,
        pipette_model.pipette_channels,
        pipette_model.pipette_version,
    )
    base_configs_dict = base_configs.dict(by_alias=True)
    try:
        existing_overrides = _load_available_overrides(
            pipette_serial_number, pipette_override_path
        )
    except FileNotFoundError:
        existing_overrides = {"quirks": {}}

    updated_overrides = _add_new_overrides_to_existing(
        base_configs_dict, existing_overrides, overrides
    )

    if not updated_overrides.get("model"):
        updated_overrides["model"] = str(pipette_model)

    with open(pipette_override_path / f"{pipette_serial_number}.json", "w") as file:
        json.dump(updated_overrides, file, cls=MutableConfigurationEncoder)
