"""Router for /runs commands endpoints."""
import textwrap
from typing import Annotated, Final, Literal, Optional, Union

from fastapi import Depends, Query, status
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.protocol_engine import (
    CommandPointer,
    commands as pe_commands,
    errors as pe_errors,
)

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.service.json_api import (
    SimpleBody,
    MultiBody,
    MultiBodyMeta,
    PydanticResponse,
    SimpleMultiBody,
    RequestModel,
)
from robot_server.robot.control.dependencies import require_estop_in_good_state

from ..command_models import (
    CommandCollectionLinks,
    CommandLink,
    CommandLinkMeta,
)
from ..run_models import RunCommandSummary
from ..run_data_manager import (
    RunDataManager,
    PreSerializedCommandsNotAvailableError,
)
from ..run_orchestrator_store import RunOrchestratorStore
from ..run_store import CommandNotFoundError, RunStore
from ..run_models import RunNotFoundError
from ..dependencies import (
    get_run_orchestrator_store,
    get_run_data_manager,
    get_run_store,
)
from .base_router import RunNotFound, RunStopped


_DEFAULT_COMMAND_LIST_LENGTH: Final = 20

commands_router = LightRouter()


class CommandNotFound(ErrorDetails):
    """An error if a given run command is not found."""

    id: Literal["CommandNotFound"] = "CommandNotFound"
    title: str = "Run Command Not Found"


class SetupCommandNotAllowed(ErrorDetails):
    """An error if a given run setup command is not allowed."""

    id: Literal["SetupCommandNotAllowed"] = "SetupCommandNotAllowed"
    title: str = "Setup Command Not Allowed"


class CommandNotAllowed(ErrorDetails):
    """An error if a given run command is not allowed."""

    id: Literal["CommandNotAllowed"] = "CommandNotAllowed"
    title: str = "Command Not Allowed"


class PreSerializedCommandsNotAvailable(ErrorDetails):
    """An error if one tries to fetch pre-serialized commands before they are written to the database."""

    id: Literal[
        "PreSerializedCommandsNotAvailable"
    ] = "PreSerializedCommandsNotAvailable"
    title: str = "Pre-Serialized commands not available."
    detail: str = (
        "Pre-serialized commands are only available once a run has finished running."
    )


async def get_current_run_from_url(
    runId: str,
    run_orchestrator_store: Annotated[
        RunOrchestratorStore, Depends(get_run_orchestrator_store)
    ],
    run_store: Annotated[RunStore, Depends(get_run_store)],
) -> str:
    """Get run from url.

    Args:
        runId: Run ID to associate the command with.
        run_orchestrator_store: Engine store to pull current run ProtocolEngine.
        run_store: Run data storage.
    """
    if not run_store.has(runId):
        raise RunNotFound(detail=f"Run {runId} not found.").as_error(
            status.HTTP_404_NOT_FOUND
        )

    if runId != run_orchestrator_store.current_run_id:
        raise RunStopped(detail=f"Run {runId} is not the current run").as_error(
            status.HTTP_409_CONFLICT
        )

    return runId


@PydanticResponse.wrap_route(
    commands_router.post,
    path="/runs/{runId}/commands",
    summary="Enqueue a command",
    description=textwrap.dedent(
        """
        Add a single command to the run. You can add commands to a run
        for three reasons:

        - Setup commands (`data.source == "setup"`)
        - Protocol commands (`data.source == "protocol"`)
        - Fixit commands (`data.source == "fixit"`)

        Setup commands may be enqueued before the run has been started.
        You could use setup commands to prepare a module or
        run labware calibration procedures.

        Protocol commands may be enqueued anytime using this endpoint.
        You can create a protocol purely over HTTP using protocol commands.
        If you are running a protocol from a file(s), then you will likely
        not need to enqueue protocol commands using this endpoint.

        Fixit commands may be enqueued while the run is `awaiting-recovery` state.
        These commands are intended to fix a failed command.
        They will be executed right after the failed command
        and only if the run is in a `awaiting-recovery` state.

        Once enqueued, setup commands will execute immediately with priority,
        while protocol commands will wait until a `play` action is issued.
        A play action may be issued while setup commands are still queued,
        in which case all setup commands will finish executing before
        the run moves on to protocol commands.

        If you are running a protocol file(s), use caution with this endpoint,
        as added commands may interfere with commands added by the protocol
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[pe_commands.Command]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {
            "model": ErrorBody[Union[RunStopped, SetupCommandNotAllowed]]
        },
        status.HTTP_400_BAD_REQUEST: {"model": ErrorBody[CommandNotAllowed]},
    },
)
async def create_run_command(
    request_body: RequestModel[pe_commands.CommandCreate],
    run_orchestrator_store: Annotated[
        RunOrchestratorStore, Depends(get_run_orchestrator_store)
    ],
    check_estop: Annotated[bool, Depends(require_estop_in_good_state)],
    run_id: Annotated[str, Depends(get_current_run_from_url)],
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
    failedCommandId: Annotated[
        Optional[str],
        Query(
            description=(
                "FIXIT command use only. Reference of the failed command id we are trying to fix."
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
        failedCommandId: FIXIT command use only.
            Reference of the failed command id we are trying to fix.
        run_orchestrator_store: The run's `EngineStore` on which the new
            command will be enqueued.
        check_estop: Dependency to verify the estop is in a valid state.
        run_id: Run identification to attach command to.
    """
    # TODO(mc, 2022-05-26): increment the HTTP API version so that default
    # behavior is to pass through `command_intent` without overriding it
    command_intent = request_body.data.intent or pe_commands.CommandIntent.SETUP
    command_create = request_body.data.model_copy(update={"intent": command_intent})

    try:
        command = await run_orchestrator_store.add_command_and_wait_for_interval(
            request=command_create,
            failed_command_id=failedCommandId,
            wait_until_complete=waitUntilComplete,
            timeout=timeout,
        )

    except pe_errors.SetupCommandNotAllowedError as e:
        raise SetupCommandNotAllowed.from_exc(e).as_error(status.HTTP_409_CONFLICT)
    except pe_errors.RunStoppedError as e:
        raise RunStopped.from_exc(e).as_error(status.HTTP_409_CONFLICT)
    except pe_errors.CommandNotAllowedError as e:
        raise CommandNotAllowed.from_exc(e).as_error(status.HTTP_400_BAD_REQUEST)

    response_data = run_orchestrator_store.get_command(command.id)

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=response_data),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    commands_router.get,
    path="/runs/{runId}/commands",
    summary="Get a list of all protocol commands in the run",
    description=(
        "Get a list of all commands in the run and their statuses. "
        "\n\n"
        "The commands are returned in order from oldest to newest."
        "\n\n"
        "This endpoint returns command summaries. Use "
        "`GET /runs/{runId}/commands/{commandId}` to get all "
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
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
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
    includeFixitCommands: bool = Query(
        True,
        description="If `true`, return all commands (protocol, setup, fixit)."
        " If `false`, only return safe commands (protocol, setup).",
    ),
) -> PydanticResponse[MultiBody[RunCommandSummary, CommandCollectionLinks]]:
    """Get a summary of a set of commands in a run.

    Arguments:
        runId: Requested run ID, from the URL
        cursor: Cursor index for the collection response.
        pageLength: Maximum number of items to return.
        run_data_manager: Run data retrieval interface.
        includeFixitCommands: If `true`, return all commands."
            " If `false`, only return safe commands.
    """
    try:
        command_slice = run_data_manager.get_commands_slice(
            run_id=runId,
            cursor=cursor,
            length=pageLength,
            include_fixit_commands=includeFixitCommands,
        )
    except RunNotFoundError as e:
        raise RunNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e

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
            notes=c.notes,
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


# TODO (spp, 2024-05-01): explore alternatives to returning commands as list of strings.
#                Options: 1. JSON Lines
#                         2. Simple de-serialized commands list w/o pydantic model conversion
@PydanticResponse.wrap_route(
    commands_router.get,
    path="/runs/{runId}/commandsAsPreSerializedList",
    summary="Get all commands of a completed run as a list of pre-serialized commands",
    description=(
        "Get all commands of a completed run as a list of pre-serialized commands."
        "**Warning:** This endpoint is experimental. We may change or remove it without warning."
        "\n\n"
        "The commands list will only be available after a run has completed"
        " (whether successful, failed or stopped) and its data has been committed to the database."
        " If a request is received before the run is completed, it will return a 503 Unavailable error."
        " This is a faster alternative to fetching the full commands list using"
        " `GET /runs/{runId}/commands`. For large protocols (10k+ commands), the above"
        " endpoint can take minutes to respond, whereas this one should only take a few seconds."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorBody[PreSerializedCommandsNotAvailable]
        },
    },
)
async def get_run_commands_as_pre_serialized_list(
    runId: str,
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
    includeFixitCommands: bool = Query(
        True,
        description="If `true`, return all commands (protocol, setup, fixit)."
        " If `false`, only return safe commands (protocol, setup).",
    ),
) -> PydanticResponse[SimpleMultiBody[str]]:
    """Get all commands of a completed run as a list of pre-serialized (string encoded) commands.

    Arguments:
        runId: Requested run ID, from the URL
        run_data_manager: Run data retrieval interface.
        includeFixitCommands: If `true`, return all commands."
            " If `false`, only return safe commands.
    """
    try:
        commands = run_data_manager.get_all_commands_as_preserialized_list(
            run_id=runId, include_fixit_commands=includeFixitCommands
        )
    except RunNotFoundError as e:
        raise RunNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e
    except PreSerializedCommandsNotAvailableError as e:
        raise PreSerializedCommandsNotAvailable.from_exc(e).as_error(
            status.HTTP_503_SERVICE_UNAVAILABLE
        ) from e
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(
            data=commands, meta=MultiBodyMeta(cursor=0, totalLength=len(commands))
        )
    )


@PydanticResponse.wrap_route(
    commands_router.get,
    path="/runs/{runId}/commands/{commandId}",
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
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> PydanticResponse[SimpleBody[pe_commands.Command]]:
    """Get a specific command from a run.

    Arguments:
        runId: Run identifier, pulled from route parameter.
        commandId: Command identifier, pulled from route parameter.
        run_data_manager: Run data retrieval.
    """
    try:
        command = run_data_manager.get_command(run_id=runId, command_id=commandId)
    except RunNotFoundError as e:
        raise RunNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e
    except CommandNotFoundError as e:
        raise CommandNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=command),
        status_code=status.HTTP_200_OK,
    )


def _make_command_link(
    run_id: str, command_pointer: Optional[CommandPointer]
) -> Optional[CommandLink]:
    return (
        CommandLink.model_construct(
            href=f"/runs/{run_id}/commands/{command_pointer.command_id}",
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
