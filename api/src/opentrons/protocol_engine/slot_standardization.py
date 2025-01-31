"""Convert deck slots into the preferred style for a robot.

The deck slots on an OT-2 are labeled like "1", "2", ..., and on an OT-3 they're labeled like
"D1," "D2", ....

When Protocol Engine takes a deck slot as input, we generally want it to accept either style
of label. This helps make protocols more portable across robot types.

But, Protocol Engine should then immediately convert it to the "correct" style for the robot that
it's controlling or simulating. This makes it simpler to consume the robot's HTTP API,
and it makes it easier for us to reason about Protocol Engine's internal state.

This module does that conversion, for any Protocol Engine input that contains a reference to a
deck slot.
"""


from typing import Any, Callable, Dict, Type

from opentrons_shared_data.robot.types import RobotType

from . import commands
from .types import (
    OFF_DECK_LOCATION,
    DeckSlotLocation,
    LabwareLocation,
    AddressableAreaLocation,
    LabwareOffsetCreate,
    ModuleLocation,
    OnLabwareLocation,
)


def standardize_labware_offset(
    original: LabwareOffsetCreate, robot_type: RobotType
) -> LabwareOffsetCreate:
    """Convert the deck slot in the given `LabwareOffsetCreate` to match the given robot type."""
    return original.model_copy(
        update={
            "location": original.location.model_copy(
                update={
                    "slotName": original.location.slotName.to_equivalent_for_robot_type(
                        robot_type
                    )
                }
            )
        }
    )


def standardize_command(
    original: commands.CommandCreate, robot_type: RobotType
) -> commands.CommandCreate:
    """Convert any deck slots in the given `CommandCreate` to match the given robot type."""
    try:
        standardize = _standardize_command_functions[type(original)]
    except KeyError:
        return original
    else:
        return standardize(original, robot_type)


# Command-specific standardization:
#
# Our use of .copy(update=...) in these implementations, instead of .construct(...), is a tradeoff.
# .construct() would give us better type-checking for the fields that we set,
# but .copy(update=...) avoids the hazard of forgetting to set fields that have defaults.


def _standardize_load_labware(
    original: commands.LoadLabwareCreate, robot_type: RobotType
) -> commands.LoadLabwareCreate:
    params = original.params.model_copy(
        update={
            "location": _standardize_labware_location(
                original.params.location, robot_type
            )
        }
    )
    return original.model_copy(update={"params": params})


def _standardize_load_module(
    original: commands.LoadModuleCreate, robot_type: RobotType
) -> commands.LoadModuleCreate:
    params = original.params.model_copy(
        update={
            "location": _standardize_deck_slot_location(
                original.params.location, robot_type
            )
        }
    )
    return original.model_copy(update={"params": params})


def _standardize_move_labware(
    original: commands.MoveLabwareCreate, robot_type: RobotType
) -> commands.MoveLabwareCreate:
    params = original.params.model_copy(
        update={
            "newLocation": _standardize_labware_location(
                original.params.newLocation, robot_type
            )
        }
    )
    return original.model_copy(update={"params": params})


_standardize_command_functions: Dict[
    Type[commands.CommandCreate], Callable[[Any, RobotType], commands.CommandCreate]
] = {
    commands.LoadLabwareCreate: _standardize_load_labware,
    commands.LoadModuleCreate: _standardize_load_module,
    commands.MoveLabwareCreate: _standardize_move_labware,
}


# Helpers:


def _standardize_labware_location(
    original: LabwareLocation, robot_type: RobotType
) -> LabwareLocation:
    if isinstance(original, DeckSlotLocation):
        return _standardize_deck_slot_location(original, robot_type)
    elif (
        isinstance(
            original, (ModuleLocation, OnLabwareLocation, AddressableAreaLocation)
        )
        or original == OFF_DECK_LOCATION
    ):
        return original


def _standardize_deck_slot_location(
    original: DeckSlotLocation, robot_type: RobotType
) -> DeckSlotLocation:
    return original.model_copy(
        update={"slotName": original.slotName.to_equivalent_for_robot_type(robot_type)}
    )
