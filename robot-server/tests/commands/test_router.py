"""Tests for robot_server.commands.router."""
import pytest
from datetime import datetime
from decoy import Decoy

from opentrons.protocol_engine import (
    CommandSlice,
    CommandPointer,
    commands as pe_commands,
)
from opentrons.protocol_engine.errors import CommandDoesNotExistError
from opentrons.protocol_runner import RunOrchestrator

from robot_server.service.json_api import MultiBodyMeta, RequestModel
from robot_server.errors.error_responses import ApiError
from robot_server.commands.router import (
    create_command,
    get_commands_list,
    get_command,
)


@pytest.fixture()
def run_orchestrator(decoy: Decoy) -> RunOrchestrator:
    """Get a mocked out RunOrchestrator."""
    return decoy.mock(cls=RunOrchestrator)


async def test_create_command(
    decoy: Decoy,
    run_orchestrator: RunOrchestrator,
) -> None:
    """It should be able to create a command."""
    command_create = pe_commands.HomeCreate(params=pe_commands.HomeParams())
    queued_command = pe_commands.Home(
        id="abc123",
        key="command-key",
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_commands.CommandStatus.QUEUED,
        params=pe_commands.HomeParams(),
        result=None,
    )

    def _stub_queued_command_state(*_a: object, **_k: object) -> pe_commands.Command:
        decoy.when(run_orchestrator.get_command("abc123")).then_return(queued_command)
        return queued_command

    decoy.when(
        await run_orchestrator.add_command_and_wait_for_interval(
            command=pe_commands.HomeCreate(
                params=pe_commands.HomeParams(),
                intent=pe_commands.CommandIntent.SETUP,
            ),
            wait_until_complete=False,
            timeout=42,
        )
    ).then_do(_stub_queued_command_state)

    result = await create_command(
        RequestModel(data=command_create),
        waitUntilComplete=False,
        timeout=42,
        orchestrator=run_orchestrator,
    )

    assert result.content.data == queued_command
    assert result.status_code == 201


async def test_create_command_wait_for_complete(
    decoy: Decoy,
    run_orchestrator: RunOrchestrator,
) -> None:
    """It should be able to create a command."""
    command_create = pe_commands.HomeCreate(
        params=pe_commands.HomeParams(),
        intent=pe_commands.CommandIntent.SETUP,
    )

    completed_command = pe_commands.Home(
        id="abc123",
        key="command-key",
        createdAt=datetime(year=2021, month=1, day=1),
        completedAt=datetime(year=2022, month=2, day=2),
        status=pe_commands.CommandStatus.SUCCEEDED,
        params=pe_commands.HomeParams(),
        result=None,
    )

    decoy.when(
        await run_orchestrator.add_command_and_wait_for_interval(
            command=command_create,
            wait_until_complete=True,
            timeout=42,
        )
    ).then_return(completed_command)

    decoy.when(run_orchestrator.get_command("abc123")).then_return(completed_command)

    result = await create_command(
        RequestModel(data=command_create),
        waitUntilComplete=True,
        timeout=42,
        orchestrator=run_orchestrator,
    )

    assert result.content.data == completed_command
    assert result.status_code == 201


async def test_get_commands_list(
    decoy: Decoy,
    run_orchestrator: RunOrchestrator,
) -> None:
    """It should get a list of commands."""
    command_1 = pe_commands.Home(
        id="abc123",
        key="command-key-1",
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_commands.CommandStatus.QUEUED,
        params=pe_commands.HomeParams(),
    )
    command_2 = pe_commands.Home(
        id="def456",
        key="command-key-2",
        createdAt=datetime(year=2022, month=2, day=2),
        status=pe_commands.CommandStatus.QUEUED,
        params=pe_commands.HomeParams(),
    )

    decoy.when(run_orchestrator.get_current_command()).then_return(
        CommandPointer(
            command_id="abc123",
            command_key="command-key-1",
            created_at=datetime(year=2021, month=1, day=1),
            index=0,
        )
    )
    decoy.when(
        run_orchestrator.get_command_slice(
            cursor=1337, length=42, include_fixit_commands=True
        )
    ).then_return(
        CommandSlice(commands=[command_1, command_2], cursor=0, total_length=2)
    )

    result = await get_commands_list(
        orchestrator=run_orchestrator,
        cursor=1337,
        pageLength=42,
    )

    assert result.content.data == [command_1, command_2]
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=2)
    assert result.status_code == 200


async def test_get_command(
    decoy: Decoy,
    run_orchestrator: RunOrchestrator,
) -> None:
    """It should get a single command by ID."""
    command_1 = pe_commands.Home(
        id="abc123",
        key="command-key-1",
        createdAt=datetime(year=2021, month=1, day=1),
        status=pe_commands.CommandStatus.QUEUED,
        params=pe_commands.HomeParams(),
    )

    decoy.when(run_orchestrator.get_command("abc123")).then_return(command_1)

    result = await get_command(commandId="abc123", orchestrator=run_orchestrator)

    assert result.content.data == command_1
    assert result.status_code == 200


async def test_get_command_not_found(
    decoy: Decoy,
    run_orchestrator: RunOrchestrator,
) -> None:
    """It should raise a 404 if command is not found."""
    decoy.when(run_orchestrator.get_command("abc123")).then_raise(
        CommandDoesNotExistError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await get_command(commandId="abc123", orchestrator=run_orchestrator)

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "StatelessCommandNotFound"
