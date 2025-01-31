"""Base router for /runs endpoints.

Contains routes dealing primarily with `Run` models.
"""
import logging
from datetime import datetime
from pathlib import Path
from textwrap import dedent
from typing import Annotated, Callable, Final, Literal, Optional, Union

from fastapi import Depends, status, Query
from pydantic import BaseModel, Field
from server_utils.fastapi_utils.light_router import LightRouter


from opentrons_shared_data.errors import ErrorCodes
from opentrons_shared_data.robot.types import RobotTypeEnum
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules.absorbance_reader import AbsorbanceReader
from opentrons.hardware_control.types import EstopState
from opentrons.protocol_engine.commands.absorbance_reader import CloseLid, OpenLid
from opentrons.protocol_engine.commands.move_labware import MoveLabware
from opentrons.protocol_engine.types import CSVRuntimeParamPaths, DeckSlotLocation
from opentrons.protocol_engine import (
    errors as pe_errors,
)

from robot_server.data_files.models import FileIdNotFound, FileIdNotFoundError
from robot_server.data_files.dependencies import (
    get_data_files_directory,
    get_data_files_store,
)
from robot_server.data_files.data_files_store import DataFilesStore
from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.robot.control.dependencies import require_estop_in_good_state
from robot_server.hardware import get_hardware, get_robot_type_enum

from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    SimpleEmptyBody,
    SimpleMultiBody,
    MultiBody,
    MultiBodyMeta,
    ResourceLink,
    PydanticResponse,
    Body,
)

from robot_server.protocols.dependencies import get_protocol_store
from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolNotFoundError,
)
from robot_server.protocols.router import ProtocolNotFound

from ..run_models import (
    PlaceLabwareState,
    RunNotFoundError,
    ActiveNozzleLayout,
    RunCurrentState,
    CommandLinkNoMeta,
    NozzleLayoutConfig,
    TipState,
)
from ..run_auto_deleter import RunAutoDeleter
from ..run_models import Run, BadRun, RunCreate, RunUpdate
from ..run_orchestrator_store import RunConflictError
from ..run_data_manager import (
    RunDataManager,
    RunNotCurrentError,
)
from ..dependencies import (
    get_run_data_manager,
    get_run_auto_deleter,
    get_quick_transfer_run_auto_deleter,
)

from robot_server.deck_configuration.fastapi_dependencies import (
    get_deck_configuration_store,
)
from robot_server.deck_configuration.store import DeckConfigurationStore
from robot_server.file_provider.fastapi_dependencies import (
    get_file_provider,
)
from opentrons.protocol_engine.resources.file_provider import FileProvider
from robot_server.service.notifications import get_pe_notify_publishers

log = logging.getLogger(__name__)
base_router = LightRouter()

_DEFAULT_COMMAND_ERROR_LIST_LENGTH: Final = 20


class RunNotFound(ErrorDetails):
    """An error if a given run is not found."""

    id: Literal["RunNotFound"] = "RunNotFound"
    title: str = "Run Not Found"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class RunAlreadyActive(ErrorDetails):
    """An error if one tries to create a new run while one is already active."""

    id: Literal["RunAlreadyActive"] = "RunAlreadyActive"
    title: str = "Run Already Active"
    errorCode: str = ErrorCodes.ROBOT_IN_USE.value.code


class RunNotIdle(ErrorDetails):
    """An error if one tries to delete a run that is not idle."""

    id: Literal["RunNotIdle"] = "RunNotIdle"
    title: str = "Run is not idle."
    detail: str = (
        "Run is currently active. Allow the run to finish or"
        " stop it with a `stop` action before attempting to modify it."
    )
    errorCode: str = ErrorCodes.ROBOT_IN_USE.value.code


class RunStopped(ErrorDetails):
    """An error if one tries to modify a stopped run."""

    id: Literal["RunStopped"] = "RunStopped"
    title: str = "Run Stopped"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class AllRunsLinks(BaseModel):
    """Links returned along with a collection of runs."""

    current: Optional[ResourceLink] = Field(
        None,
        description="Path to the currently active run, if a run is active.",
    )


class CurrentStateLinks(BaseModel):
    """Links returned with the current state of a run."""

    lastCompleted: Optional[CommandLinkNoMeta] = Field(
        None,
        description="Path to the last completed command when current state was reported, if any.",
    )


async def get_run_data_from_url(
    runId: str,
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> Union[Run, BadRun]:
    """Get the data of a run.

    Args:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        run_data = run_data_manager.get(runId)
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return run_data


@PydanticResponse.wrap_route(
    base_router.post,
    path="/runs",
    summary="Create a run",
    description=dedent(
        """
        Create a new run to track robot interaction.

        When too many runs already exist, old ones will be automatically deleted
        to make room for the new one.
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[Run]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[ProtocolNotFound]},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorBody[FileIdNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunAlreadyActive]},
    },
)
async def create_run(  # noqa: C901
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
    protocol_store: Annotated[ProtocolStore, Depends(get_protocol_store)],
    run_id: Annotated[str, Depends(get_unique_id)],
    created_at: Annotated[datetime, Depends(get_current_time)],
    run_auto_deleter: Annotated[RunAutoDeleter, Depends(get_run_auto_deleter)],
    data_files_directory: Annotated[Path, Depends(get_data_files_directory)],
    data_files_store: Annotated[DataFilesStore, Depends(get_data_files_store)],
    quick_transfer_run_auto_deleter: Annotated[
        RunAutoDeleter, Depends(get_quick_transfer_run_auto_deleter)
    ],
    check_estop: Annotated[bool, Depends(require_estop_in_good_state)],
    deck_configuration_store: Annotated[
        DeckConfigurationStore, Depends(get_deck_configuration_store)
    ],
    file_provider: Annotated[FileProvider, Depends(get_file_provider)],
    notify_publishers: Annotated[Callable[[], None], Depends(get_pe_notify_publishers)],
    request_body: Optional[RequestModel[RunCreate]] = None,
) -> PydanticResponse[SimpleBody[Union[Run, BadRun]]]:
    """Create a new run.

    Arguments:
        request_body: Optional request body with run creation data.
        run_data_manager: Current and historical run data management.
        protocol_store: Protocol resource storage.
        run_id: Generated ID to assign to the run.
        created_at: Timestamp to attach to created run.
        run_auto_deleter: An interface to delete old resources to make room for
            the new run.
        quick_transfer_run_auto_deleter: An interface to delete old quick-transfer
        data_files_directory: Persistence directory for data files.
        data_files_store: Database of data file resources.
        resources to make room for the new run.
        check_estop: Dependency to verify the estop is in a valid state.
        deck_configuration_store: Dependency to fetch the deck configuration.
        file_provider: Dependency to provide access to file Reading and Writing to Protocol engine.
        notify_publishers: Utilized by the engine to notify publishers of state changes.
    """
    protocol_id = request_body.data.protocolId if request_body is not None else None
    offsets = request_body.data.labwareOffsets if request_body is not None else []
    rtp_values = (
        request_body.data.runTimeParameterValues if request_body is not None else None
    )
    rtp_files = (
        request_body.data.runTimeParameterFiles if request_body is not None else None
    )

    rtp_paths: Optional[CSVRuntimeParamPaths] = None
    try:
        if rtp_files:
            rtp_paths = {
                name: data_files_directory
                / file_id
                / data_files_store.get(file_id).name
                for name, file_id in rtp_files.items()
            }
    except FileIdNotFoundError as e:
        raise FileIdNotFound(detail=str(e)).as_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    protocol_resource = None

    deck_configuration = await deck_configuration_store.get_deck_configuration()

    # TODO (tz, 5-16-22): same error raised twice.
    #  Check if we can consolidate to one place.
    if protocol_id is not None:
        try:
            protocol_resource = protocol_store.get(protocol_id=protocol_id)
        except ProtocolNotFoundError as e:
            raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    # TODO(mc, 2022-05-13): move inside `RunDataManager` or return data
    # to pass to `RunDataManager.create`. Right now, runs may be deleted
    # even if a new create is unable to succeed due to a conflict
    run_deleter: RunAutoDeleter = run_auto_deleter
    if (
        protocol_resource
        and protocol_resource.protocol_kind == ProtocolKind.QUICK_TRANSFER
    ):
        run_deleter = quick_transfer_run_auto_deleter
    run_deleter.make_room_for_new_run()

    try:
        run_data = await run_data_manager.create(
            run_id=run_id,
            created_at=created_at,
            labware_offsets=offsets,
            deck_configuration=deck_configuration,
            file_provider=file_provider,
            run_time_param_values=rtp_values,
            run_time_param_paths=rtp_paths,
            protocol=protocol_resource,
            notify_publishers=notify_publishers,
        )
    except RunConflictError as e:
        raise RunAlreadyActive(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e
    except ProtocolNotFoundError as e:
        raise ProtocolNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    log.info(f'Created protocol run "{run_id}" from protocol "{protocol_id}".')

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=run_data),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/runs",
    summary="Get all runs",
    description=(
        "Get a list of all active and inactive runs, in order from oldest to newest."
    ),
    responses={
        status.HTTP_200_OK: {"model": MultiBody[Union[Run, BadRun], AllRunsLinks]},
    },
)
async def get_runs(
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
    pageLength: Annotated[
        Optional[int],
        Query(
            description=(
                "The maximum number of runs to return."
                " If this is less than the total number of runs,"
                " the most-recently created runs will be returned."
                " If this is omitted or `null`, all runs will be returned."
            ),
        ),
    ] = None,
) -> PydanticResponse[MultiBody[Union[Run, BadRun], AllRunsLinks]]:
    """Get all runs, in order from least-recently to most-recently created.

    Args:
        pageLength: Maximum number of items to return.
        run_data_manager: Current and historical run data management.
    """
    data = run_data_manager.get_all(length=pageLength)
    current_run_id = run_data_manager.current_run_id
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    links = AllRunsLinks(
        current=ResourceLink.model_construct(href=f"/runs/{current_run_id}")
        if current_run_id is not None
        else None
    )

    return await PydanticResponse.create(
        content=MultiBody.model_construct(data=data, links=links, meta=meta),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/runs/{runId}",
    summary="Get a run",
    description="Get a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[Union[Run, BadRun]]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def get_run(
    run_data: Annotated[Run, Depends(get_run_data_from_url)],
) -> PydanticResponse[SimpleBody[Union[Run, BadRun]]]:
    """Get a run by its ID.

    Args:
        run_data: Data of the run specified in the runId url parameter.
    """
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=run_data),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.delete,
    path="/runs/{runId}",
    summary="Delete a run",
    description="Delete a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleEmptyBody},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def remove_run(
    runId: str,
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> PydanticResponse[SimpleEmptyBody]:
    """Delete a run by its ID.

    Arguments:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        await run_data_manager.delete(runId)

    except RunConflictError as e:
        raise RunNotIdle().as_error(status.HTTP_409_CONFLICT) from e

    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleEmptyBody.model_construct(),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.patch,
    path="/runs/{runId}",
    summary="Update a run",
    description="Update a specific run, returning the updated resource.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[Run]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[Union[RunStopped, RunNotIdle]]},
    },
)
async def update_run(
    runId: str,
    request_body: RequestModel[RunUpdate],
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> PydanticResponse[SimpleBody[Union[Run, BadRun]]]:
    """Update a run by its ID.

    Args:
        runId: Run ID pulled from URL.
        request_body: Update data from request body.
        run_data_manager: Current and historical run data management.
    """
    try:
        run_data = await run_data_manager.update(
            runId, current=request_body.data.current
        )
    except RunConflictError as e:
        raise RunNotIdle(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e
    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=run_data),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/runs/{runId}/commandErrors",
    summary="Get a list of all command errors in the run",
    description=(
        "Get a list of all command errors in the run. "
        "\n\n"
        "The errors are returned in order from oldest to newest."
        "\n\n"
        "This endpoint returns the command error. Use "
        "`GET /runs/{runId}/commands/{commandId}` to get all "
        "information available for a given command."
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[pe_errors.ErrorOccurrence]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunStopped]},
    },
)
async def get_run_commands_error(
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
    runId: str,
    pageLength: Annotated[
        int,
        Query(
            description="The maximum number of command errors in the list to return.",
        ),
    ] = _DEFAULT_COMMAND_ERROR_LIST_LENGTH,
    cursor: Annotated[
        Optional[int],
        Query(
            description=(
                "The starting index of the desired first command error in the list."
                " If unspecified, a cursor will be selected automatically"
                " based on the last error added."
            ),
        ),
    ] = None,
) -> PydanticResponse[SimpleMultiBody[pe_errors.ErrorOccurrence]]:
    """Get a summary of a set of command errors in a run.

    Arguments:
        runId: Requested run ID, from the URL
        cursor: Cursor index for the collection response.
        pageLength: Maximum number of items to return.
        run_data_manager: Run data retrieval interface.
    """
    try:
        all_errors_count = run_data_manager.get_command_errors_count(run_id=runId)

        if cursor is None:
            if all_errors_count > 0:
                # Get the most recent error,
                # which we can find just at the end of the list.
                cursor = all_errors_count - 1
            else:
                cursor = 0

        command_error_slice = run_data_manager.get_command_error_slice(
            run_id=runId,
            cursor=cursor,
            length=pageLength,
        )
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e

    meta = MultiBodyMeta(
        cursor=command_error_slice.cursor,
        totalLength=command_error_slice.total_length,
    )

    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(
            data=command_error_slice.commands_errors,
            meta=meta,
        ),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/runs/{runId}/currentState",
    summary="Get a run's current state.",
    description=dedent(
        """
        Get current state associated with a run if the run is current.
        "\n\n"
        Note that this endpoint is experimental and subject to change.
        """
    ),
    responses={
        status.HTTP_200_OK: {"model": Body[RunCurrentState, CurrentStateLinks]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunStopped]},
    },
)
async def get_current_state(  # noqa: C901
    runId: str,
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    robot_type: Annotated[RobotTypeEnum, Depends(get_robot_type_enum)],
) -> PydanticResponse[Body[RunCurrentState, CurrentStateLinks]]:
    """Get current state associated with a run if the run is current.

    Arguments:
        runId: Run ID pulled from URL.
        run_data_manager: Run data retrieval interface.
        hardware: Hardware control interface.
        robot_type: The type of robot.
    """
    try:
        run = run_data_manager.get(run_id=runId)
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT)

    active_nozzle_maps = run_data_manager.get_nozzle_maps(run_id=runId)
    nozzle_layouts = {
        pipetteId: ActiveNozzleLayout.model_construct(
            startingNozzle=nozzle_map.starting_nozzle,
            activeNozzles=nozzle_map.active_nozzles,
            config=NozzleLayoutConfig(nozzle_map.configuration.value.lower()),
        )
        for pipetteId, nozzle_map in active_nozzle_maps.items()
    }

    tip_states = {
        pipette_id: TipState.model_construct(hasTip=has_tip)
        for pipette_id, has_tip in run_data_manager.get_tip_attached(
            run_id=runId
        ).items()
    }

    current_command = run_data_manager.get_current_command(run_id=runId)

    estop_engaged = False
    place_labware = None
    if robot_type == RobotTypeEnum.FLEX:
        estop_engaged = hardware.get_estop_state() in [
            EstopState.PHYSICALLY_ENGAGED,
            EstopState.LOGICALLY_ENGAGED,
        ]

        command = (
            run_data_manager.get_command(runId, current_command.command_id)
            if current_command
            else None
        )

        # Labware state when estop is engaged
        if isinstance(command, MoveLabware):
            location = command.params.newLocation
            if isinstance(location, DeckSlotLocation):
                for labware in run.labware:
                    if labware.id == command.params.labwareId:
                        place_labware = PlaceLabwareState(
                            location=location,
                            labwareURI=labware.definitionUri,
                            shouldPlaceDown=False,
                        )
                        break
        # Handle absorbance reader lid
        elif isinstance(command, (OpenLid, CloseLid)):
            for mod in run.modules:
                if (
                    not isinstance(mod, AbsorbanceReader)
                    and mod.id != command.params.moduleId
                ):
                    continue
                for hw_mod in hardware.attached_modules:
                    if (
                        mod.location is not None
                        and hw_mod.serial_number == mod.serialNumber
                    ):
                        location = mod.location
                        # TODO: Not the best location for this, we should
                        # remove this once we are no longer defining the plate reader lid
                        # as a labware.
                        labware_uri = "opentrons/opentrons_flex_lid_absorbance_plate_reader_module/1"
                        place_labware = PlaceLabwareState(
                            location=location,
                            labwareURI=labware_uri,
                            shouldPlaceDown=estop_engaged,
                        )
                        break
                if place_labware:
                    break

    last_completed_command = run_data_manager.get_last_completed_command(run_id=runId)
    links = CurrentStateLinks.model_construct(
        lastCompleted=CommandLinkNoMeta.model_construct(
            id=last_completed_command.command_id,
            href=f"/runs/{runId}/commands/{last_completed_command.command_id}",
        )
        if last_completed_command is not None
        else None
    )

    return await PydanticResponse.create(
        content=Body.model_construct(
            data=RunCurrentState.model_construct(
                estopEngaged=estop_engaged,
                activeNozzleLayouts=nozzle_layouts,
                tipStates=tip_states,
                placeLabwareState=place_labware,
            ),
            links=links,
        ),
        status_code=status.HTTP_200_OK,
    )
