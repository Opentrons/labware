"""CommandHistory state store tests."""
import pytest

from opentrons.ordered_set import OrderedSet

from opentrons.protocol_engine.errors.exceptions import CommandDoesNotExistError
from opentrons.protocol_engine.state.command_history import CommandHistory, CommandEntry
from opentrons.protocol_engine.commands import CommandIntent, CommandStatus

from .command_fixtures import (
    create_queued_command,
)


def create_queued_command_entry(
    command_id: str = "command-id",
    intent: CommandIntent = CommandIntent.PROTOCOL,
    index: int = 0,
) -> CommandEntry:
    """Create a command entry for a queued command."""
    return CommandEntry(
        create_queued_command(command_id=command_id, intent=intent), index
    )


def create_fixit_command_entry(
    command_id: str = "command-id", index: int = 0
) -> CommandEntry:
    """Create a command entry for a fixit command."""
    return CommandEntry(
        create_queued_command(command_id=command_id, intent=CommandIntent.FIXIT), index
    )


@pytest.fixture
def command_history() -> CommandHistory:
    """Instantiates a CommandHistory instance."""
    return CommandHistory()


def test_length(command_history: CommandHistory) -> None:
    """It should return the length of the command history."""
    assert command_history.length() == 0
    command_history._add("0", create_queued_command_entry())
    assert command_history.length() == 1


def test_has(command_history: CommandHistory) -> None:
    """It should return True if the command exists in the history, False otherwise."""
    assert not command_history.has("0")
    command_history._add("0", create_queued_command_entry())
    assert command_history.has("0")


def test_get(command_history: CommandHistory) -> None:
    """It should return the command entry for the given ID."""
    with pytest.raises(CommandDoesNotExistError):
        command_history.get("0")
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    assert command_history.get("0") == command_entry


def test_get_next(command_history: CommandHistory) -> None:
    """It should return the next command entry after the command associated with the given ID."""
    with pytest.raises(CommandDoesNotExistError):
        command_history.get_next("0")
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    assert command_history.get_next("0") == command_entry_2
    assert command_history.get_next("1") is None


def test_get_prev(command_history: CommandHistory) -> None:
    """It should return the previous command entry before the command associated with the given ID."""
    with pytest.raises(CommandDoesNotExistError):
        command_history.get_prev("0")
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    assert command_history.get_prev("0") is None
    assert command_history.get_prev("1") == command_entry_1


def test_get_all_commands(command_history: CommandHistory) -> None:
    """It should return a list of all commands."""
    assert command_history.get_all_commands() == []
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    assert command_history.get_all_commands() == [
        command_entry_1.command,
        command_entry_2.command,
    ]


def test_get_all_ids(command_history: CommandHistory) -> None:
    """It should return a list of all command IDs."""
    assert command_history.get_all_ids() == []
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    assert command_history.get_all_ids() == ["0", "1"]


def test_get_slice(command_history: CommandHistory) -> None:
    """It should return a slice of commands."""
    assert command_history.get_slice(0, 2) == []
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_entry_3 = create_queued_command_entry(index=2)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    command_history._add("2", command_entry_3)
    assert command_history.get_slice(1, 3) == [
        command_entry_2.command,
        command_entry_3.command,
    ]


def test_get_tail_command(command_history: CommandHistory) -> None:
    """It should return the tail command."""
    assert command_history.get_tail_command() is None
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    assert command_history.get_tail_command() == command_entry_2


def test_get_recently_dequeued_command(command_history: CommandHistory) -> None:
    """It should return the most recently dequeued command."""
    assert command_history.get_most_recently_completed_command() is None
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    command_history._set_most_recently_completed_command_id("0")
    assert command_history.get_most_recently_completed_command() == command_entry


def test_get_running_command(command_history: CommandHistory) -> None:
    """It should return the currently running command."""
    assert command_history.get_running_command() is None
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    command_history._set_running_command_id("0")
    assert command_history.get_running_command() == command_entry


def test_get_queue_ids(command_history: CommandHistory) -> None:
    """It should return the IDs of all commands in the queue."""
    assert command_history.get_queue_ids() == OrderedSet()
    command_history._add_to_queue("0")
    command_history._add_to_queue("1")
    assert command_history.get_queue_ids() == OrderedSet(["0", "1"])


def test_get_setup_queue_ids(command_history: CommandHistory) -> None:
    """It should return the IDs of all commands in the setup queue."""
    assert command_history.get_setup_queue_ids() == OrderedSet()
    command_history._add_to_setup_queue("0")
    command_history._add_to_setup_queue("1")
    assert command_history.get_setup_queue_ids() == OrderedSet(["0", "1"])


def test_get_fixit_queue_ids(command_history: CommandHistory) -> None:
    """It should return the IDs of all commands in the setup queue."""
    assert command_history.get_fixit_queue_ids() == OrderedSet()
    command_history._add_to_fixit_queue("0")
    command_history._add_to_fixit_queue("1")
    assert command_history.get_fixit_queue_ids() == OrderedSet(["0", "1"])


def test_set_command_entry(command_history: CommandHistory) -> None:
    """It should set the command entry for the given ID."""
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    assert command_history.get("0") == command_entry


def test_set_recent_dequeued_command_id(command_history: CommandHistory) -> None:
    """It should set the ID of the most recently dequeued command."""
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    command_history._set_most_recently_completed_command_id("0")
    assert command_history.get_most_recently_completed_command() == command_entry


def test_set_running_command_id(command_history: CommandHistory) -> None:
    """It should set the ID of the currently running command."""
    command_entry = create_queued_command_entry()
    command_history._add("0", command_entry)
    command_history._set_running_command_id("0")
    assert command_history.get_running_command() == command_entry


def test_set_fixit_running_command_id(command_history: CommandHistory) -> None:
    """It should set the ID of the currently running fixit command."""
    command_entry = create_queued_command()
    command_history.append_queued_command(command_entry)
    running_command = command_entry.model_copy(
        update={
            "status": CommandStatus.RUNNING,
        }
    )
    command_history.set_command_running(running_command)
    finished_command = command_entry.model_copy(
        update={
            "status": CommandStatus.SUCCEEDED,
        }
    )
    command_history.set_command_succeeded(finished_command)
    fixit_command_entry = create_queued_command(
        command_id="fixit-id", intent=CommandIntent.FIXIT
    )
    command_history.append_queued_command(fixit_command_entry)
    fixit_running_command = fixit_command_entry.model_copy(
        update={
            "status": CommandStatus.RUNNING,
        }
    )
    command_history.set_command_running(fixit_running_command)
    current_running_command = command_history.get_running_command()
    assert current_running_command is not None
    assert current_running_command.command == fixit_running_command
    assert command_history.get_all_commands() == [
        finished_command,
        fixit_running_command,
    ]


def test_add_to_queue(command_history: CommandHistory) -> None:
    """It should add the given ID to the queue."""
    command_history._add_to_queue("0")
    assert command_history.get_queue_ids() == OrderedSet(["0"])


def test_add_to_setup_queue(command_history: CommandHistory) -> None:
    """It should add the given ID to the setup queue."""
    command_history._add_to_setup_queue("0")
    assert command_history.get_setup_queue_ids() == OrderedSet(["0"])


def test_add_to_fixit_queue(command_history: CommandHistory) -> None:
    """It should add the given ID to the setup queue."""
    fixit_command = create_queued_command(intent=CommandIntent.FIXIT)
    command_history.append_queued_command(fixit_command)
    assert command_history.get_fixit_queue_ids() == OrderedSet(["command-id"])


def test_remove_id_from_queue(command_history: CommandHistory) -> None:
    """It should remove the given ID from the queue."""
    command_history._add_to_queue("0")
    command_history._add_to_queue("1")
    command_history._remove_queue_id("0")
    assert command_history.get_queue_ids() == OrderedSet(["1"])


def test_remove_id_from_setup_queue(command_history: CommandHistory) -> None:
    """It should remove the given ID from the setup queue."""
    command_history._add_to_setup_queue("0")
    command_history._add_to_setup_queue("1")
    command_history._remove_setup_queue_id("0")
    assert command_history.get_setup_queue_ids() == OrderedSet(["1"])


def test_get_filtered_commands(command_history: CommandHistory) -> None:
    """It should return a list of all commands without fixit commands."""
    assert (
        list(command_history.get_filtered_command_ids(include_fixit_commands=False))
        == []
    )
    command_entry_1 = create_queued_command(command_id="0")
    command_entry_2 = create_queued_command(command_id="1")
    fixit_command_entry_1 = create_queued_command(
        intent=CommandIntent.FIXIT, command_id="fixit-1"
    )
    command_history.append_queued_command(command_entry_1)
    command_history.append_queued_command(command_entry_2)
    command_history.append_queued_command(fixit_command_entry_1)
    assert list(
        command_history.get_filtered_command_ids(include_fixit_commands=False)
    ) == ["0", "1"]


def test_get_all_filtered_commands(command_history: CommandHistory) -> None:
    """It should return a list of all commands without fixit commands."""
    assert (
        list(command_history.get_filtered_command_ids(include_fixit_commands=False))
        == []
    )
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1, intent=CommandIntent.SETUP)
    fixit_command_entry_1 = create_queued_command_entry(intent=CommandIntent.FIXIT)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    command_history._add("fixit-1", fixit_command_entry_1)
    assert list(
        command_history.get_filtered_command_ids(include_fixit_commands=True)
    ) == ["0", "1", "fixit-1"]


def test_get_slice_with_filtered_list(command_history: CommandHistory) -> None:
    """It should return a slice of filtered commands."""
    assert command_history.get_slice(0, 2) == []
    command_entry_1 = create_queued_command_entry()
    command_entry_2 = create_queued_command_entry(index=1)
    command_entry_3 = create_queued_command_entry(index=2)
    command_history._add("0", command_entry_1)
    command_history._add("1", command_entry_2)
    command_history._add("2", command_entry_3)
    filtered_list = ["0", "1"]
    assert command_history.get_slice(1, 3, command_ids=filtered_list) == [
        command_entry_2.command,
    ]
