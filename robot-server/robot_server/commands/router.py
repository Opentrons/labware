"""Router for top-level /commands endpoints."""
from typing import Annotated, Final, List, Literal, Optional, cast

from fastapi import Depends, Query, status
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.protocol_engine import CommandIntent
from opentrons.protocol_engine.errors import CommandDoesNotExistError

from opentrons.protocol_runner import RunOrchestrator

from opentrons_shared_data.errors import ErrorCodes

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.service.json_api import (
    MultiBodyMeta,
    RequestModel,
    SimpleBody,
    SimpleMultiBody,
    PydanticResponse,
)

from .get_default_orchestrator import get_default_orchestrator, RunActive
from .stateless_commands import StatelessCommand, StatelessCommandCreate

_DEFAULT_COMMAND_LIST_LENGTH: Final = 20


commands_router = LightRouter()


class CommandNotFound(ErrorDetails):
    """An error returned if the given command cannot be found."""

    id: Literal["StatelessCommandNotFound"] = "StatelessCommandNotFound"
    title: str = "Stateless Command Not Found"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


@commands_router.post(
    path="/commands",
    summary="Add a command to be executed",
    description=(
        "Run a single command on the robot. This endpoint is meant for"
        " simple, stateless control of the robot. For complex control,"
        " create a run with ``POST /runs`` and issue commands on that run."
    ),
    response_model=SimpleBody[StatelessCommand],
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[StatelessCommand]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunActive]},
    },
)
async def create_command(
    request_body: RequestModel[StatelessCommandCreate],
    orchestrator: Annotated[RunOrchestrator, Depends(get_default_orchestrator)],
    waitUntilComplete: Annotated[
        bool,
        Query(
            description=(
                "If `false`, return immediately, while the new command is still queued."
                " If `true`, only return once the new command succeeds or fails,"
                " or when the timeout is reached. See the `timeout` query parameter."
            ),
        ),
    ] = False,
    timeout: Annotated[
        Optional[int],
        Query(
            gt=0,
            description=(
                "If `waitUntilComplete` is `true`,"
                " the maximum time in milliseconds to wait before returning."
                " The default is infinite."
                "\n\n"
                "The timer starts as soon as you enqueue the new command with this request,"
                " *not* when the new command starts running. So if there are other commands"
                " in the queue before the new one, they will also count towards the"
                " timeout."
                "\n\n"
                "If the timeout elapses before the command succeeds or fails,"
                " the command will be returned with its current status."
                "\n\n"
                "Compatibility note: on robot software v6.2.0 and older,"
                " the default was 30 seconds, not infinite."
            ),
        ),
    ] = None,
) -> PydanticResponse[SimpleBody[StatelessCommand]]:
    """Enqueue and execute a command.

    Arguments:
        request_body: The request containing the command that the client wants
            to enqueue.
        waitUntilComplete: If True, return only once the command is completed.
            Else, return immediately. Comes from a query parameter in the URL.
        timeout: The maximum time, in seconds, to wait before returning.
            Comes from a query parameter in the URL.
        orchestrator: The `RunOrchestrator` handling engine for command to be enqueued.
    """
    command_create = request_body.data.model_copy(
        update={"intent": CommandIntent.SETUP}
    )
    command = await orchestrator.add_command_and_wait_for_interval(
        command=command_create, wait_until_complete=waitUntilComplete, timeout=timeout
    )

    response_data = cast(StatelessCommand, orchestrator.get_command(command.id))

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=response_data),
        status_code=status.HTTP_201_CREATED,
    )


@commands_router.get(
    path="/commands",
    summary="Get a list of queued and executed commands",
    description=(
        "Get a list of commands that have been run on the device since boot."
        " Only returns command run via the `/commands` endpoint."
    ),
    response_model=SimpleMultiBody[StatelessCommand],
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[StatelessCommand]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunActive]},
    },
)
async def get_commands_list(
    orchestrator: Annotated[RunOrchestrator, Depends(get_default_orchestrator)],
    cursor: Annotated[
        Optional[int],
        Query(
            description=(
                "The starting index of the desired first command in the list."
                " If unspecified, a cursor will be selected automatically"
                " based on the currently running or most recently executed command."
            ),
        ),
    ] = None,
    pageLength: Annotated[
        int,
        Query(
            description="The maximum number of commands in the list to return.",
        ),
    ] = _DEFAULT_COMMAND_LIST_LENGTH,
) -> PydanticResponse[SimpleMultiBody[StatelessCommand]]:
    """Get a list of stateless commands.

    Arguments:
        orchestrator: Run orchestrator with commands.
        cursor: Cursor index for the collection response.
        pageLength: Maximum number of items to return.
    """
    cmd_slice = orchestrator.get_command_slice(
        cursor=cursor, length=pageLength, include_fixit_commands=True
    )
    commands = cast(List[StatelessCommand], cmd_slice.commands)
    meta = MultiBodyMeta(cursor=cmd_slice.cursor, totalLength=cmd_slice.total_length)

    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(data=commands, meta=meta),
        status_code=status.HTTP_200_OK,
    )


@commands_router.get(
    path="/commands/{commandId}",
    summary="Get a single stateless command.",
    description=(
        "Get a single stateless command that has been queued or executed."
        " Only returns command run via the `/commands` endpoint."
    ),
    response_model=SimpleBody[StatelessCommand],
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[StatelessCommand]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[CommandNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunActive]},
    },
)
async def get_command(
    commandId: str,
    orchestrator: Annotated[RunOrchestrator, Depends(get_default_orchestrator)],
) -> PydanticResponse[SimpleBody[StatelessCommand]]:
    """Get a single stateless command.

    Arguments:
        commandId: Command identifier from the URL parameter.
        orchestrator: Run orchestrator with commands.
    """
    try:
        command = orchestrator.get_command(commandId)

    except CommandDoesNotExistError as e:
        raise CommandNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=cast(StatelessCommand, command)),
        status_code=status.HTTP_200_OK,
    )
