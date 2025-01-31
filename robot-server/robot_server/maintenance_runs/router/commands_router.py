"""Router for /maintenance_runs commands endpoints."""
import textwrap
from typing import Annotated, Optional, Union
from typing_extensions import Final, Literal

from fastapi import Depends, Query, status
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.protocol_engine import (
    CommandPointer,
    commands as pe_commands,
)
from opentrons.protocol_engine.errors import CommandDoesNotExistError

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.service.json_api import (
    SimpleBody,
    MultiBody,
    MultiBodyMeta,
    PydanticResponse,
    RequestModel,
)
from robot_server.robot.control.dependencies import require_estop_in_good_state
from robot_server.runs.command_models import (
    CommandCollectionLinks,
    CommandLink,
    CommandLinkMeta,
)
from robot_server.runs.run_models import RunCommandSummary

from ..maintenance_run_models import MaintenanceRunNotFoundError
from ..maintenance_run_data_manager import MaintenanceRunDataManager
from ..maintenance_run_orchestrator_store import MaintenanceRunOrchestratorStore
from ..dependencies import (
    get_maintenance_run_orchestrator_store,
    get_maintenance_run_data_manager,
)
from .base_router import RunNotFound


_DEFAULT_COMMAND_LIST_LENGTH: Final = 20

commands_router = LightRouter()


class CommandNotFound(ErrorDetails):
    """An error if a given run command is not found."""

    id: Literal["CommandNotFound"] = "CommandNotFound"
    title: str = "Run Command Not Found"


class CommandNotAllowed(ErrorDetails):
    """An error if a given run command is not allowed."""

    id: Literal["CommandNotAllowed"] = "CommandNotAllowed"
    title: str = "Setup Command Not Allowed"


async def get_current_run_from_url(
    runId: str,
    run_orchestrator_store: Annotated[
        MaintenanceRunOrchestratorStore, Depends(get_maintenance_run_orchestrator_store)
    ],
) -> str:
    """Get run from url.

    Args:
        runId: Run ID to associate the command with.
        run_orchestrator_store: Engine store to pull current run ProtocolEngine.
    """
    if runId != run_orchestrator_store.current_run_id:
        raise RunNotFound(
            detail=f"Run {runId} not found. "
            f"Note that only one maintenance run can exist at a time."
        ).as_error(status.HTTP_404_NOT_FOUND)

    return runId


@PydanticResponse.wrap_route(
    commands_router.post,
    path="/maintenance_runs/{runId}/commands",
    summary="Enqueue a command",
    description=textwrap.dedent(
        """
        Add a single command to the maintenance run.

        These commands will execute immediately and in the order they are
        enqueued. The execution of these commands cannot be paused,
        but a maintenance run can be deleted at any point, as long as there
        are no commands running.
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[pe_commands.Command]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[CommandNotAllowed]},
    },
)
async def create_run_command(
    request_body: RequestModel[pe_commands.CommandCreate],
    run_orchestrator_store: Annotated[
        MaintenanceRunOrchestratorStore, Depends(get_maintenance_run_orchestrator_store)
    ],
    run_id: Annotated[str, Depends(get_current_run_from_url)],
    check_estop: Annotated[bool, Depends(require_estop_in_good_state)],
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
) -> PydanticResponse[SimpleBody[pe_commands.Command]]:
    """Enqueue a protocol command.

    Arguments:
        request_body: The request containing the command that the client wants
            to enqueue.
        waitUntilComplete: If True, return only once the command is completed.
            Else, return immediately. Comes from a query parameter in the URL.
        timeout: The maximum time, in seconds, to wait before returning.
            Comes from a query parameter in the URL.
        run_orchestrator_store: The run's `EngineStore` on which the new
            command will be enqueued.
        check_estop: Dependency to verify the estop is in a valid state.
        run_id: Run identification to attach command to.
    """
    # TODO(mc, 2022-05-26): increment the HTTP API version so that default
    # behavior is to pass through `command_intent` without overriding it
    command_intent = pe_commands.CommandIntent.SETUP
    command_create = request_body.data.model_copy(update={"intent": command_intent})
    command = await run_orchestrator_store.add_command_and_wait_for_interval(
        request=command_create, wait_until_complete=waitUntilComplete, timeout=timeout
    )

    response_data = run_orchestrator_store.get_command(command.id)

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=response_data),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    commands_router.get,
    path="/maintenance_runs/{runId}/commands",
    summary="Get a list of all commands in the run",
    description=(
        "Get a list of all commands in the run and their statuses. "
        "This endpoint returns command summaries. Use "
        "`GET /maintenance_runs/{runId}/commands/{commandId}` to get all "
        "information available for a given command."
    ),
    responses={
        status.HTTP_200_OK: {
            "model": MultiBody[RunCommandSummary, CommandCollectionLinks]
        },
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def get_run_commands(
    runId: str,
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
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
) -> PydanticResponse[MultiBody[RunCommandSummary, CommandCollectionLinks]]:
    """Get a summary of a set of commands in a run.

    Arguments:
        runId: Requested run ID, from the URL
        cursor: Cursor index for the collection response.
        pageLength: Maximum number of items to return.
        run_data_manager: Run data retrieval interface.
    """
    try:
        command_slice = run_data_manager.get_commands_slice(
            run_id=runId,
            cursor=cursor,
            length=pageLength,
        )
    except MaintenanceRunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    current_command = run_data_manager.get_current_command(run_id=runId)
    recovery_target_command = run_data_manager.get_recovery_target_command(run_id=runId)

    data = [
        RunCommandSummary.model_construct(
            id=c.id,
            key=c.key,
            commandType=c.commandType,
            intent=c.intent,
            status=c.status,
            createdAt=c.createdAt,
            startedAt=c.startedAt,
            completedAt=c.completedAt,
            params=c.params,
            error=c.error,
            failedCommandId=c.failedCommandId,
        )
        for c in command_slice.commands
    ]

    meta = MultiBodyMeta(
        cursor=command_slice.cursor,
        totalLength=command_slice.total_length,
    )

    links = CommandCollectionLinks.model_construct(
        current=_make_command_link(runId, current_command),
        currentlyRecoveringFrom=_make_command_link(runId, recovery_target_command),
    )

    return await PydanticResponse.create(
        content=MultiBody.model_construct(data=data, meta=meta, links=links),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    commands_router.get,
    path="/maintenance_runs/{runId}/commands/{commandId}",
    summary="Get full details about a specific command in the run",
    description=(
        "Get a command along with any associated payload, result, and "
        "execution information."
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[pe_commands.Command]},
        status.HTTP_404_NOT_FOUND: {
            "model": Union[ErrorBody[RunNotFound], ErrorBody[CommandNotFound]]
        },
    },
)
async def get_run_command(
    runId: str,
    commandId: str,
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
) -> PydanticResponse[SimpleBody[pe_commands.Command]]:
    """Get a specific command from a run.

    Arguments:
        runId: Run identifier, pulled from route parameter.
        commandId: Command identifier, pulled from route parameter.
        run_data_manager: Run data retrieval.
    """
    try:
        command = run_data_manager.get_command(run_id=runId, command_id=commandId)
    except MaintenanceRunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e
    except CommandDoesNotExistError as e:
        raise CommandNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=command),
        status_code=status.HTTP_200_OK,
    )


def _make_command_link(
    run_id: str, command_pointer: Optional[CommandPointer]
) -> Optional[CommandLink]:
    return (
        CommandLink.model_construct(
            href=f"/maintenance_runs/{run_id}/commands/{command_pointer.command_id}",
            meta=CommandLinkMeta(
                runId=run_id,
                commandId=command_pointer.command_id,
                index=command_pointer.index,
                key=command_pointer.command_key,
                createdAt=command_pointer.created_at,
            ),
        )
        if command_pointer is not None
        else None
    )
