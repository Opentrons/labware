from typing import List, Tuple, Optional

from opentrons_shared_data.pipette.pipette_definition import (
    PipetteFunctionKeyType,
    SupportedTipsDefinition,
)
from opentrons_shared_data.pipette.types import UlPerMmAction

PIPETTING_FUNCTION_FALLBACK_VERSION: PipetteFunctionKeyType = "1"
PIPETTING_FUNCTION_LATEST_VERSION: PipetteFunctionKeyType = "2"


def calculate_ul_per_mm(
    ul: float,
    action: UlPerMmAction,
    active_tip_settings: SupportedTipsDefinition,
    requested_pipetting_version: Optional[PipetteFunctionKeyType] = None,
    shaft_ul_per_mm: Optional[float] = None,
) -> float:
    assumed_requested_pipetting_version = (
        requested_pipetting_version
        if requested_pipetting_version
        else PIPETTING_FUNCTION_LATEST_VERSION
    )
    if action == "aspirate":
        fallback = active_tip_settings.aspirate.default[
            PIPETTING_FUNCTION_FALLBACK_VERSION
        ]
        sequence = active_tip_settings.aspirate.default.get(
            assumed_requested_pipetting_version, fallback
        )
    elif action == "blowout" and shaft_ul_per_mm:
        return shaft_ul_per_mm
    else:
        fallback = active_tip_settings.dispense.default[
            PIPETTING_FUNCTION_FALLBACK_VERSION
        ]
        sequence = active_tip_settings.dispense.default.get(
            assumed_requested_pipetting_version, fallback
        )
    return piecewise_volume_conversion(ul, sequence)


def piecewise_volume_conversion(
    ul: float, sequence: List[Tuple[float, float, float]]
) -> float:
    """
    Takes a volume in microliters and a sequence representing a piecewise
    function for the slope and y-intercept of a ul/mm function, where each
    sub-list in the sequence contains:

      - the max volume for the piece of the function (minimum implied from the
        max of the previous item or 0
      - the slope of the segment
      - the y-intercept of the segment

    :return: the ul/mm value for the specified volume
    """
    # pick the first item from the seq for which the target is less than
    # the bracketing element
    for x in sequence:
        if ul <= x[0]:
            # use that element to calculate the movement distance in mm
            return x[1] * ul + x[2]

    # Compatibility with previous implementation of search.
    #  list(filter(lambda x: ul <= x[0], sequence))[0]
    raise IndexError()
