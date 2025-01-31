"""Protocol Engine CommandStore sub-state."""
from collections import OrderedDict
from dataclasses import dataclass
from typing import Dict, List, Optional

from opentrons.ordered_set import OrderedSet
from opentrons.protocol_engine.errors.exceptions import CommandDoesNotExistError

from ..commands import Command, CommandStatus, CommandIntent


@dataclass(frozen=True)
class CommandEntry:
    """A command entry in state, including its index in the list."""

    command: Command
    index: int


@dataclass  # dataclass for __eq__() autogeneration.
class CommandHistory:
    """Provides O(1) amortized access to commands of interest."""

    _all_command_ids: List[str]
    """All command IDs, in insertion order."""

    _all_failed_command_ids: List[str]
    """All failed command IDs, in insertion order."""

    _all_command_ids_but_fixit_command_ids: List[str]
    """All command IDs besides fixit command intents, in insertion order."""

    _commands_by_id: Dict[str, CommandEntry]
    """All command resources, in insertion order, mapped by their unique IDs."""

    _queued_command_ids: OrderedSet[str]
    """The IDs of queued commands, in FIFO order"""

    _queued_setup_command_ids: OrderedSet[str]
    """The IDs of queued setup commands, in FIFO order"""

    _queued_fixit_command_ids: OrderedSet[str]
    """The IDs of queued fixit commands, in FIFO order"""

    _running_command_id: Optional[str]
    """The ID of the currently running command, if any"""

    _most_recently_completed_command_id: Optional[str]
    """ID of the most recent command that SUCCEEDED or FAILED, if any"""

    def __init__(self) -> None:
        self._all_command_ids = []
        self._all_failed_command_ids = []
        self._all_command_ids_but_fixit_command_ids = []
        self._queued_command_ids = OrderedSet()
        self._queued_setup_command_ids = OrderedSet()
        self._queued_fixit_command_ids = OrderedSet()
        self._commands_by_id = OrderedDict()
        self._running_command_id = None
        self._most_recently_completed_command_id = None

    def length(self) -> int:
        """Get the length of all elements added to the history."""
        return len(self._commands_by_id)

    def has(self, command_id: str) -> bool:
        """Returns whether a command is in the history."""
        return command_id in self._commands_by_id

    def get(self, command_id: str) -> CommandEntry:
        """Get a command entry if present, otherwise raise an exception."""
        try:
            return self._commands_by_id[command_id]
        except KeyError:
            raise CommandDoesNotExistError(f"Command {command_id} does not exist")

    def get_next(self, command_id: str) -> Optional[CommandEntry]:
        """Get the command which follows the command associated with the given ID, if any."""
        index = self.get(command_id).index
        try:
            return self._commands_by_id[self._all_command_ids[index + 1]]
        except KeyError:
            raise CommandDoesNotExistError(f"Command {command_id} does not exist")
        except IndexError:
            return None

    def get_prev(self, command_id: str) -> Optional[CommandEntry]:
        """Get the command which precedes the command associated with the given ID, if any.

        Returns None if the command_id corresponds to the first element in the history.
        """
        index = self.get(command_id).index
        try:
            prev_command = self._commands_by_id[self._all_command_ids[index - 1]]
            return prev_command if index != 0 else None
        except KeyError:
            raise CommandDoesNotExistError(f"Command {command_id} does not exist")
        except IndexError:
            return None

    def get_all_commands(self) -> List[Command]:
        """Get all commands."""
        return [
            self._commands_by_id[command_id].command
            for command_id in self._all_command_ids
        ]

    def get_all_failed_commands(self) -> List[Command]:
        """Get all failed commands."""
        return [
            self._commands_by_id[command_id].command
            for command_id in self._all_failed_command_ids
        ]

    def get_filtered_command_ids(self, include_fixit_commands: bool) -> List[str]:
        """Get all fixit command IDs."""
        if include_fixit_commands:
            return self._all_command_ids
        else:
            return self._all_command_ids_but_fixit_command_ids

    def get_all_ids(self) -> List[str]:
        """Get all command IDs."""
        return self._all_command_ids

    def get_slice(
        self, start: int, stop: int, command_ids: Optional[list[str]] = None
    ) -> List[Command]:
        """Get a list of commands between start and stop.""" """Get a list of commands between start and stop."""
        commands = self._all_command_ids[start:stop]
        selected_command_ids = (
            command_ids if command_ids is not None else self._all_command_ids
        )
        commands = selected_command_ids[start:stop]
        return [self._commands_by_id[command].command for command in commands]

    def get_tail_command(self) -> Optional[CommandEntry]:
        """Get the command most recently added."""
        if self._commands_by_id:
            return next(reversed(self._commands_by_id.values()))
        else:
            return None

    def get_most_recently_completed_command(self) -> Optional[CommandEntry]:
        """Get the command most recently marked as SUCCEEDED or FAILED."""
        if self._most_recently_completed_command_id is not None:
            return self._commands_by_id[self._most_recently_completed_command_id]
        else:
            return None

    def get_running_command(self) -> Optional[CommandEntry]:
        """Get the command currently running, if any."""
        if self._running_command_id is None:
            return None
        else:
            return self._commands_by_id[self._running_command_id]

    def get_queue_ids(self) -> OrderedSet[str]:
        """Get the IDs of all queued protocol commands, in FIFO order."""
        return self._queued_command_ids

    def get_setup_queue_ids(self) -> OrderedSet[str]:
        """Get the IDs of all queued setup commands, in FIFO order."""
        return self._queued_setup_command_ids

    def get_fixit_queue_ids(self) -> OrderedSet[str]:
        """Get the IDs of all queued fixit commands, in FIFO order."""
        return self._queued_fixit_command_ids

    def append_queued_command(self, command: Command) -> None:
        """Validate and mark a command as queued in the command history."""
        assert command.status == CommandStatus.QUEUED
        assert not self.has(command.id)

        next_index = self.length()
        updated_command = CommandEntry(
            index=next_index,
            command=command,
        )
        self._add(command.id, updated_command)

        if command.intent == CommandIntent.SETUP:
            self._add_to_setup_queue(command.id)
        elif command.intent == CommandIntent.FIXIT:
            self._add_to_fixit_queue(command.id)
        else:
            self._add_to_queue(command.id)

    def set_command_running(self, command: Command) -> None:
        """Validate and mark a command as running in the command history."""
        prev_entry = self.get(command.id)

        assert prev_entry.command.status == CommandStatus.QUEUED
        assert command.status == CommandStatus.RUNNING

        self._add(
            command.id,
            CommandEntry(index=prev_entry.index, command=command),
        )

        assert self.get_running_command() is None
        self._set_running_command_id(command.id)

        self._remove_queue_id(command.id)
        self._remove_setup_queue_id(command.id)
        self._remove_fixit_queue_id(command.id)

    def set_command_succeeded(self, command: Command) -> None:
        """Validate and mark a command as succeeded in the command history."""
        prev_entry = self.get(command.id)
        assert prev_entry.command.status == CommandStatus.RUNNING
        assert command.status == CommandStatus.SUCCEEDED

        self._add(
            command.id,
            CommandEntry(
                index=prev_entry.index,
                command=command,
            ),
        )

        running_command_entry = self.get_running_command()
        assert running_command_entry is not None
        assert running_command_entry.command.id == command.id
        self._set_running_command_id(None)

        self._remove_queue_id(command.id)
        self._remove_setup_queue_id(command.id)
        self._set_most_recently_completed_command_id(command.id)

    def set_command_failed(self, command: Command) -> None:
        """Validate and mark a command as failed in the command history."""
        prev_entry = self.get(command.id)
        assert (
            prev_entry.command.status == CommandStatus.RUNNING
            or prev_entry.command.status == CommandStatus.QUEUED
        )
        assert command.status == CommandStatus.FAILED

        index = self.get(command.id).index
        self._add(
            command_id=command.id,
            command_entry=CommandEntry(index=index, command=command),
        )

        running_command_entry = self.get_running_command()
        if (
            running_command_entry is not None
            and running_command_entry.command.id == command.id
        ):
            self._set_running_command_id(None)

        self._remove_queue_id(command.id)
        self._remove_setup_queue_id(command.id)
        self._set_most_recently_completed_command_id(command.id)
        self._all_failed_command_ids.append(command.id)

    def _add(self, command_id: str, command_entry: CommandEntry) -> None:
        """Create or update a command entry."""
        if command_id not in self._commands_by_id:
            self._all_command_ids.append(command_id)
            if command_entry.command.intent != CommandIntent.FIXIT:
                self._all_command_ids_but_fixit_command_ids.append(command_id)
        self._commands_by_id[command_id] = command_entry

    def _add_to_queue(self, command_id: str) -> None:
        """Add new ID to the queued."""
        self._queued_command_ids.add(command_id)

    def _add_to_setup_queue(self, command_id: str) -> None:
        """Add a new ID to the queued setup."""
        self._queued_setup_command_ids.add(command_id)

    def _add_to_fixit_queue(self, command_id: str) -> None:
        """Add a new ID to the queued fixit."""
        self._queued_fixit_command_ids.add(command_id)

    def _remove_queue_id(self, command_id: str) -> None:
        """Remove a specific command from the queued command ids structure."""
        self._queued_command_ids.discard(command_id)

    def _remove_setup_queue_id(self, command_id: str) -> None:
        """Remove a specific command from the queued setup command ids structure."""
        self._queued_setup_command_ids.discard(command_id)

    def _remove_fixit_queue_id(self, command_id: str) -> None:
        """Remove a specific command from the queued fixit command ids structure."""
        self._queued_fixit_command_ids.discard(command_id)

    def _set_most_recently_completed_command_id(self, command_id: str) -> None:
        """Set the ID of the most recently dequeued command."""
        self._most_recently_completed_command_id = command_id

    def _set_running_command_id(self, command_id: Optional[str]) -> None:
        """Set the ID of the currently running command."""
        self._running_command_id = command_id
