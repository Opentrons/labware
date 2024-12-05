"""Basic lid state data state and store."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from opentrons.protocol_engine.state import update_types
from opentrons_shared_data.pipette.types import LabwareUri

from opentrons.protocols.models import LabwareDefinition

from .. import errors
from ..types import LabwareLocation
from ..actions import (
    Action,
    get_state_updates,
)
from ._abstract_store import HasState, HandlesActions


@dataclass
class LidStackState:
    """State of all loaded lid stacks."""

    # List of IDs within stack indexed by location
    lid_stack_by_location: Dict[LabwareLocation, List[str]]
    definition_by_location: Dict[LabwareLocation, LabwareDefinition]


class LidStackStore(HasState[LidStackState], HandlesActions):
    """Lid Stack state container."""

    _state: LidStackState

    def __init__(
        self,
    ) -> None:
        """Initialize a lid stack store and its state."""
        self._state = LidStackState(
            lid_stack_by_location={}, definition=LabwareDefinition()
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            self._add_loaded_lid_stack(state_update)

    def _add_loaded_lid_stack(self, state_update: update_types.StateUpdate) -> None:
        loaded_lid_stack_update = state_update.loaded_lid_stack
        if loaded_lid_stack_update != update_types.NO_CHANGE:
            location = loaded_lid_stack_update.new_location

            self._state.definition_by_location[location] = loaded_lid_stack_update.definition
            self._state.lid_stack_by_location[location] = loaded_lid_stack_update.labware_ids


class LidStackView(HasState[LidStackState]):
    """Read-only labware state view."""

    _state: LidStackState

    def __init__(self, state: LidStackState) -> None:
        """Initialize the computed view of lid stack state.

        Arguments:
            state: Lid Stack state dataclass used for all calculations.
        """
        self._state = state

    def get_stack_by_location(self, location: LabwareLocation) -> List[str]:
        """Return the list of Labware Lid IDs by location."""
        try:
            return self._state.lid_stack_by_location[location]
        except KeyError:
            raise errors.exceptions.LabwareNotLoadedError(
                f"There is no Lid Stack loaded on {location}."
            )

    def get_top_of_stack_at_location(self, location: LabwareLocation) -> str:
        """Return the ID of the lid from the top of the stack at a location."""
        try:
            stack = self._state.lid_stack_by_location[location]
            return stack[-1]
        except KeyError:
            raise errors.exceptions.LabwareNotLoadedError(
                f"There is no Lid Stack loaded on {location}."
            )
        
    def get_definition_by_stack_location(self, location: LabwareLocation) -> LabwareDefinition:
        """Return the Labware Definition for a stack at a given location."""
        try:
            return self._state.definition_by_location[location]
        except KeyError:
            raise errors.exceptions.LabwareNotLoadedError(
                f"There is no Lid Stack loaded on {location}."
            )
