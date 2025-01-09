from typing import Dict, Tuple, List, Optional

from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.protocol_engine.state.labware import LabwareLoadParams


# Default versions of Opentrons standard labware definitions in Python Protocol API
# v2.14 and above. Labware not explicitly listed here default to 1.
#
# TODO(jbl 2023-08-01) this needs to be done more holistically, both to find the version and make sure that
#   it corresponds to the API level is was released with
_APILEVEL_2_14_OT_DEFAULT_VERSIONS: Dict[str, int] = {
    # v1 of many labware definitions have wrong `zDimension`s. (Jira RSS-202.)
    # For "opentrons_96_aluminumblock_generic_pcr_strip_200ul" and
    # "opentrons_24_aluminumblock_generic_2ml_screwcap", they're wrong enough to
    # easily cause collisions. (Jira RSS-197.)
    "opentrons_24_aluminumblock_generic_2ml_screwcap": 2,
    "opentrons_96_aluminumblock_generic_pcr_strip_200ul": 2,
    # The following labware definitions have had a version bump due to using new properties
    # introduced in an inplace schema v2 update
    "armadillo_96_wellplate_200ul_pcr_full_skirt": 2,
    "biorad_96_wellplate_200ul_pcr": 2,
    "biorad_384_wellplate_50ul": 2,
    "corning_12_wellplate_6.9ml_flat": 2,
    "corning_384_wellplate_112ul_flat": 2,
    "corning_48_wellplate_1.6ml_flat": 2,
    "corning_96_wellplate_360ul_flat": 2,
    "nest_1_reservoir_195ml": 2,
    "nest_96_wellplate_100ul_pcr_full_skirt": 2,
    "nest_96_wellplate_200ul_flat": 2,
    "nest_96_wellplate_2ml_deep": 2,
    "opentrons_96_wellplate_200ul_pcr_full_skirt": 2,
    "corning_6_wellplate_16.8ml_flat": 2,
    "corning_24_wellplate_3.4ml_flat": 2,
}

_APILEVEL_2_21_OT_DEFAULT_VERSIONS: Dict[str, int] = {
    "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical": 2,
    "opentrons_24_tuberack_nest_2ml_screwcap": 2,
    "opentrons_24_tuberack_nest_1.5ml_screwcap": 2,
    "nest_1_reservoir_290ml": 2,
    "opentrons_24_tuberack_nest_2ml_snapcap": 2,
    "nest_96_wellplate_2ml_deep": 3,
    "opentrons_24_tuberack_nest_1.5ml_snapcap": 2,
    "nest_12_reservoir_15ml": 2,
    "nest_1_reservoir_195ml": 3,
    "opentrons_24_tuberack_nest_0.5ml_screwcap": 2,
    "opentrons_96_wellplate_200ul_pcr_full_skirt": 3,
    "nest_96_wellplate_100ul_pcr_full_skirt": 3,
    "nest_96_wellplate_200ul_flat": 3,
    "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical": 2,
    "usascientific_12_reservoir_22ml": 2,
    "thermoscientificnunc_96_wellplate_2000ul": 2,
    "usascientific_96_wellplate_2.4ml_deep": 2,
    "agilent_1_reservoir_290ml": 2,
    "opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap": 2,
    "thermoscientificnunc_96_wellplate_1300ul": 2,
    "corning_12_wellplate_6.9ml_flat": 3,
    "corning_24_wellplate_3.4ml_flat": 3,
    "corning_6_wellplate_16.8ml_flat": 3,
    "corning_48_wellplate_1.6ml_flat": 3,
    "biorad_96_wellplate_200ul_pcr": 3,
    "axygen_1_reservoir_90ml": 2,
    "corning_384_wellplate_112ul_flat": 3,
    "corning_96_wellplate_360ul_flat": 3,
    "biorad_384_wellplate_50ul": 3,
    "appliedbiosystemsmicroamp_384_wellplate_40ul": 2,
    "opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap": 2,
    "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical": 2,
    "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical": 2,
}


class AmbiguousLoadLabwareParamsError(RuntimeError):
    """Error raised when specific labware parameters cannot be found due to multiple matching labware definitions."""


def resolve(
    load_name: str,
    namespace: Optional[str],
    version: Optional[int],
    custom_load_labware_params: List[LabwareLoadParams],
    api_level: Optional[Tuple[int, int]] = None,
    schema_version: Optional[int] = 2,
) -> Tuple[str, int]:
    """Resolve the load labware parameters that best matches any custom labware, or default to opentrons standards

    Args:
        load_name: Load name of the labware.
        namespace: Optionally provided labware definition namespace
        version: Optionally provided labware definition version
        custom_load_labware_params: List of load labware parameters associated with custom labware that
                                    match given parameters
        api_level: Current api level.
        schema_version: The desired labware schema version to draw a definition from.

    Returns:
        A tuple of the resolved namespace and version
    """

    def matches_params(custom_params: LabwareLoadParams) -> bool:
        matches_load_name = custom_params.load_name == load_name
        matches_namespace = namespace is None or custom_params.namespace == namespace
        matches_version = version is None or custom_params.version == version
        return matches_load_name and matches_namespace and matches_version

    if namespace is not None and version is not None:
        return namespace, version

    filtered_custom_params = [
        params for params in custom_load_labware_params if matches_params(params)
    ]

    if not filtered_custom_params:
        # No custom labware matches the input, but some standard labware might.
        # Use the Opentrons defaults for anything not explicitly provided.
        #
        # If the provided namespace was OPENTRONS_NAMESPACE, there would have been no
        # custom labware matching that namespace, so we will always take this path in
        # that case.
        resolved_namespace = namespace if namespace is not None else OPENTRONS_NAMESPACE
        api_level = api_level if api_level else (2, 14)
        schema_version = schema_version if schema_version else 2
        resolved_version = (
            version
            if version is not None
            else _get_default_version_for_standard_labware(
                load_name=load_name,
                current_api_level=api_level,
                schema_version=schema_version,
            )
        )

    elif len(filtered_custom_params) > 1:
        # Multiple custom labware match the input.
        raise AmbiguousLoadLabwareParamsError(
            f"Multiple custom labware associated with load name {load_name}."
        )

    else:
        # Exactly one custom labware matches the input. Return it.
        resolved_namespace = filtered_custom_params[0].namespace
        resolved_version = filtered_custom_params[0].version

    return resolved_namespace, resolved_version


def _get_default_version_for_standard_labware(
    load_name: str,
    current_api_level: Tuple[int, int] = (2, 14),
    schema_version: int = 2,
) -> int:
    # We know the protocol is running at least apiLevel 2.14 by this point because
    # apiLevel 2.13 and below has its own separate code path for resolving labware.
    if current_api_level >= (2, 21) and schema_version == 3:
        found_version = _APILEVEL_2_21_OT_DEFAULT_VERSIONS.get(load_name, None)
        if found_version:
            return found_version
    return _APILEVEL_2_14_OT_DEFAULT_VERSIONS.get(load_name, 1)
