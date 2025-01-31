"""Tests for am ChildThreadTransport."""

import threading
from asyncio import get_running_loop
from datetime import datetime
from functools import partial
from typing import Any

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.protocol_engine import ProtocolEngine, commands, DeckPoint
from opentrons.protocol_engine.errors import ProtocolCommandFailedError, ErrorOccurrence
from opentrons.protocol_engine.clients.transports import ChildThreadTransport


@pytest.fixture
async def engine(decoy: Decoy) -> ProtocolEngine:
    """Get a stubbed out ProtocolEngine."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
async def subject(
    engine: ProtocolEngine,
) -> ChildThreadTransport:
    """Get a ChildThreadTransport test subject."""
    return ChildThreadTransport(engine=engine, loop=get_running_loop())


async def test_execute_command(
    decoy: Decoy,
    engine: ProtocolEngine,
    subject: ChildThreadTransport,
) -> None:
    """It should execute a command synchronously in a child thread."""
    cmd_data = commands.MoveToWellParams(
        pipetteId="pipette-id",
        labwareId="labware-id",
        wellName="A1",
    )
    cmd_result = commands.MoveToWellResult(position=DeckPoint(x=1, y=2, z=3))
    cmd_request = commands.MoveToWellCreate(params=cmd_data)

    decoy.when(await engine.add_and_execute_command(request=cmd_request)).then_return(
        commands.MoveToWell(
            id="cmd-id",
            key="cmd-key",
            status=commands.CommandStatus.SUCCEEDED,
            params=cmd_data,
            result=cmd_result,
            createdAt=datetime.now(),
        )
    )

    task = partial(subject.execute_command, request=cmd_request)
    result = await get_running_loop().run_in_executor(None, task)

    assert result == cmd_result


async def test_execute_command_failure(
    decoy: Decoy,
    engine: ProtocolEngine,
    subject: ChildThreadTransport,
) -> None:
    """It should execute a load labware command."""
    cmd_data = commands.MoveToWellParams(
        pipetteId="pipette-id",
        labwareId="labware-id",
        wellName="A1",
    )
    cmd_request = commands.MoveToWellCreate(params=cmd_data)
    error = ErrorOccurrence(
        id="error-id",
        errorType="PrettyBadError",
        createdAt=datetime(year=2021, month=1, day=1),
        detail="Things are not looking good.",
        errorCode="1234",
    )

    decoy.when(await engine.add_and_execute_command(request=cmd_request)).then_return(
        commands.MoveToWell(
            id="cmd-id",
            key="cmd-key",
            params=cmd_data,
            status=commands.CommandStatus.FAILED,
            error=error,
            createdAt=datetime.now(),
        )
    )

    task = partial(subject.execute_command, request=cmd_request)

    with pytest.raises(ProtocolCommandFailedError):
        await get_running_loop().run_in_executor(None, task)


async def test_call_method(
    decoy: Decoy,
    engine: ProtocolEngine,
    subject: ChildThreadTransport,
) -> None:
    """It should call a synchronous method in a thread-safe manner."""
    labware_def = LabwareDefinition.model_construct(namespace="hello")  # type: ignore[call-arg]
    labware_uri = LabwareUri("hello/world/123")
    calling_thread_id = None

    def _record_calling_thread(*args: Any, **kwargs: Any) -> LabwareUri:
        nonlocal calling_thread_id
        calling_thread_id = threading.current_thread().ident
        return labware_uri

    decoy.when(engine.add_labware_definition(labware_def)).then_do(
        _record_calling_thread
    )

    _act = partial(
        subject.call_method, "add_labware_definition", definition=labware_def
    )

    result = await get_running_loop().run_in_executor(None, _act)
    assert result == labware_uri
    assert calling_thread_id == threading.current_thread().ident
