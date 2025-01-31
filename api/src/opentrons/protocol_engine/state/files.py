"""Basic protocol engine create file data state and store."""
from dataclasses import dataclass
from typing import List

from opentrons.protocol_engine.actions.get_state_update import get_state_updates
from opentrons.protocol_engine.state import update_types

from ._abstract_store import HasState, HandlesActions
from ..actions import Action


@dataclass
class FileState:
    """State of Engine created files."""

    file_ids: List[str]


class FileStore(HasState[FileState], HandlesActions):
    """File state container."""

    _state: FileState

    def __init__(self) -> None:
        """Initialize a File store and its state."""
        self._state = FileState(file_ids=[])

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            self._handle_state_update(state_update)

    def _handle_state_update(self, state_update: update_types.StateUpdate) -> None:
        if state_update.files_added != update_types.NO_CHANGE:
            self._state.file_ids.extend(state_update.files_added.file_ids)


class FileView:
    """Read-only engine created file state view."""

    _state: FileState

    def __init__(self, state: FileState) -> None:
        """Initialize the view of file state.

        Arguments:
            state: File state dataclass used for tracking file creation status.
        """
        self._state = state

    def get_filecount(self) -> int:
        """Get the number of files currently created by the protocol."""
        return len(self._state.file_ids)

    def get_file_id_list(self) -> List[str]:
        """Get the list of files by file ID created by the protocol."""
        return self._state.file_ids
