"""Basic liquid data state and store."""
from dataclasses import dataclass
from typing import Dict, List
from opentrons.protocol_engine.types import Liquid, LiquidId

from ._abstract_store import HasState, HandlesActions
from ..actions import Action, AddLiquidAction
from ..errors import LiquidDoesNotExistError, InvalidLiquidError


@dataclass
class LiquidState:
    """State of all loaded liquids."""

    liquids_by_id: Dict[str, Liquid]


class LiquidStore(HasState[LiquidState], HandlesActions):
    """Liquid state container."""

    _state: LiquidState

    def __init__(self) -> None:
        """Initialize a liquid store and its state."""
        self._state = LiquidState(liquids_by_id={})

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        if isinstance(action, AddLiquidAction):
            self._add_liquid(action)

    def _add_liquid(self, action: AddLiquidAction) -> None:
        """Add liquid to protocol liquids."""
        self._state.liquids_by_id[action.liquid.id] = action.liquid


class LiquidView:
    """Read-only liquid state view."""

    _state: LiquidState

    def __init__(self, state: LiquidState) -> None:
        """Initialize the computed view of liquid state.

        Arguments:
            state: Liquid state dataclass used for all calculations.
        """
        self._state = state

    def get_all(self) -> List[Liquid]:
        """Get all protocol liquids."""
        return list(self._state.liquids_by_id.values())

    def validate_liquid_id(self, liquid_id: LiquidId) -> LiquidId:
        """Check if liquid_id exists in liquids."""
        is_empty = liquid_id == "EMPTY"
        if is_empty:
            return liquid_id
        has_liquid = liquid_id in self._state.liquids_by_id
        if not has_liquid:
            raise LiquidDoesNotExistError(
                f"Supplied liquidId: {liquid_id} does not exist in the loaded liquids."
            )
        return liquid_id

    def validate_liquid_allowed(self, liquid: Liquid) -> Liquid:
        """Validate that a liquid is legal to load."""
        is_empty = liquid.id == "EMPTY"
        if is_empty:
            raise InvalidLiquidError(
                message='Protocols may not define a liquid with the special id "EMPTY".'
            )
        return liquid
