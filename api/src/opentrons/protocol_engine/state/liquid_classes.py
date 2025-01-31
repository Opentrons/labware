"""A data store of liquid classes."""

from __future__ import annotations

import dataclasses
from typing import Dict
from typing_extensions import Optional

from .. import errors
from ..actions import Action, get_state_updates
from ..types import LiquidClassRecord
from . import update_types
from ._abstract_store import HasState, HandlesActions


@dataclasses.dataclass
class LiquidClassState:
    """Our state is a bidirectional mapping between IDs <-> LiquidClassRecords."""

    # We use the bidirectional map to see if we've already assigned an ID to a liquid class when the
    # engine is asked to store a new liquid class.
    liquid_class_record_by_id: Dict[str, LiquidClassRecord]
    liquid_class_record_to_id: Dict[LiquidClassRecord, str]


class LiquidClassStore(HasState[LiquidClassState], HandlesActions):
    """Container for LiquidClassState."""

    _state: LiquidClassState

    def __init__(self) -> None:
        self._state = LiquidClassState(
            liquid_class_record_by_id={},
            liquid_class_record_to_id={},
        )

    def handle_action(self, action: Action) -> None:
        """Update the state in response to the action."""
        for state_update in get_state_updates(action):
            if state_update.liquid_class_loaded != update_types.NO_CHANGE:
                self._handle_liquid_class_loaded_update(
                    state_update.liquid_class_loaded
                )

    def _handle_liquid_class_loaded_update(
        self, state_update: update_types.LiquidClassLoadedUpdate
    ) -> None:
        # We're just a data store. All the validation and ID generation happens in the command implementation.
        self._state.liquid_class_record_by_id[
            state_update.liquid_class_id
        ] = state_update.liquid_class_record
        self._state.liquid_class_record_to_id[
            state_update.liquid_class_record
        ] = state_update.liquid_class_id


class LiquidClassView:
    """Read-only view of the LiquidClassState."""

    _state: LiquidClassState

    def __init__(self, state: LiquidClassState) -> None:
        self._state = state

    def get(self, liquid_class_id: str) -> LiquidClassRecord:
        """Get the LiquidClassRecord with the given identifier."""
        try:
            return self._state.liquid_class_record_by_id[liquid_class_id]
        except KeyError as e:
            raise errors.LiquidClassDoesNotExistError(
                f"Liquid class ID {liquid_class_id} not found."
            ) from e

    def get_id_for_liquid_class_record(
        self, liquid_class_record: LiquidClassRecord
    ) -> Optional[str]:
        """See if the given LiquidClassRecord if already in the store, and if so, return its identifier."""
        return self._state.liquid_class_record_to_id.get(liquid_class_record)

    def get_all(self) -> Dict[str, LiquidClassRecord]:
        """Get all the LiquidClassRecords in the store."""
        return self._state.liquid_class_record_by_id.copy()
