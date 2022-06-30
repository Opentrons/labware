from __future__ import annotations
from dataclasses import dataclass
import logging
from typing import List, Tuple, Optional

from opentrons_shared_data.gripper import load_definition
from opentrons_shared_data.gripper.dev_types import (
    GripperCustomizableFloat,
    GripperOffset,
    GripperSchemaVersion,
    GripperModel,
    GripperName,
)
from .types import Offset

log = logging.getLogger(__name__)

DEFAULT_GRIPPER_CALIBRATION_OFFSET = [0.0, 0.0, 0.0]


@dataclass(frozen=True)
class GripperConfig:
    display_name: str
    name: GripperName
    model: GripperModel
    z_idle_current: float
    z_active_current: float
    jaw_reference_voltage: float
    jaw_force_per_duty_cycle: List[Tuple[float, int]]
    base_offset_from_mount: Offset
    jaw_center_offset_from_base: Offset
    pin_one_offset_from_base: Offset
    pin_two_offset_from_base: Offset
    quirks: List[str]


def _verify_value(
    def_specs: GripperCustomizableFloat, override: Optional[float] = None
) -> float:
    if override and def_specs.min <= override <= def_specs.max:
        return override
    return def_specs.default_value


def _get_offset(def_offset: GripperOffset) -> Offset:
    return (def_offset.x, def_offset.y, def_offset.z)


def info_num_to_model(num: int) -> GripperModel:
    model_map = {0: GripperModel.V1, 1: GripperModel.V1}
    return model_map[num]


def load(
    gripper_model: GripperModel, gripper_id: Optional[str] = None
) -> GripperConfig:
    gripper_def = load_definition(version=GripperSchemaVersion.V1, model=gripper_model)
    return GripperConfig(
        name="gripper",
        display_name=gripper_def.display_name,
        model=gripper_def.model,
        z_idle_current=_verify_value(gripper_def.z_idle_current),
        z_active_current=_verify_value(gripper_def.z_active_current),
        jaw_reference_voltage=_verify_value(gripper_def.jaw_reference_voltage),
        jaw_force_per_duty_cycle=gripper_def.jaw_force_per_duty_cycle,
        base_offset_from_mount=_get_offset(gripper_def.base_offset_from_mount),
        jaw_center_offset_from_base=_get_offset(
            gripper_def.jaw_center_offset_from_base
        ),
        pin_one_offset_from_base=_get_offset(gripper_def.pin_one_offset_from_base),
        pin_two_offset_from_base=_get_offset(gripper_def.pin_two_offset_from_base),
        quirks=gripper_def.quirks,
    )


def piecewise_force_conversion(newton: float, sequence: List[List[float]]) -> float:
    """
    Takes a force in newton and a sequence representing a piecewise
    function for the slope and y-intercept of a force/duty-cycle function, where each
    sub-list in the sequence contains:

      - the max volume for the piece of the function (minimum implied from the
        max of the previous item or 0
      - the slope of the segment
      - the y-intercept of the segment

    :return: the force/duty-cycle value for the specified volume
    """
    # pick the first item from the seq for which the target is less than
    # the bracketing element
    for x in sequence:
        if newton <= x[0]:
            # use that element to calculate the movement distance in mm
            return x[1] * newton + x[2]

    # Compatibility with previous implementation of search.
    #  list(filter(lambda x: ul <= x[0], sequence))[0]
    raise IndexError()