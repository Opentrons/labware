"""Base router for /maintenance_runs endpoints.

Contains routes dealing primarily with `Maintenance Run` models.
"""
import logging
from datetime import datetime
from textwrap import dedent
from typing import Annotated, Optional, Callable
from typing_extensions import Literal

from fastapi import Depends, status
from pydantic import BaseModel, Field
from server_utils.fastapi_utils.light_router import LightRouter

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.robot.control.dependencies import require_estop_in_good_state

from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    SimpleEmptyBody,
    ResourceLink,
    PydanticResponse,
    Body,
)

from robot_server.runs.dependencies import get_is_okay_to_create_maintenance_run

from ..maintenance_run_models import (
    MaintenanceRun,
    MaintenanceRunCreate,
    MaintenanceRunNotFoundError,
)
from ..maintenance_run_orchestrator_store import RunConflictError
from ..maintenance_run_data_manager import MaintenanceRunDataManager
from ..dependencies import get_maintenance_run_data_manager

from robot_server.deck_configuration.fastapi_dependencies import (
    get_deck_configuration_store,
)
from robot_server.deck_configuration.store import DeckConfigurationStore
from robot_server.service.notifications import get_pe_notify_publishers

log = logging.getLogger(__name__)
base_router = LightRouter()


# TODO (spp, 2023-04-10): move all error types from maintenance & regular runs
#  to a shared location
class RunNotFound(ErrorDetails):
    """An error if a given run is not found."""

    id: Literal["RunNotFound"] = "RunNotFound"
    title: str = "Run Not Found"


class NoCurrentRunFound(ErrorDetails):
    """An error if there is no current run to fetch."""

    id: Literal["NoCurrentRunFound"] = "NoCurrentRunFound"
    title: str = "No current run found"


class RunAlreadyActive(ErrorDetails):
    """An error if one tries to create a new run while one is already active."""

    id: Literal["RunAlreadyActive"] = "RunAlreadyActive"
    title: str = "Run Already Active"


class ProtocolRunIsActive(ErrorDetails):
    """An error if one tries to create a maintenance run while a protocol run is active."""

    id: Literal["ProtocolRunIsActive"] = "ProtocolRunIsActive"
    title: str = "Protocol Run Is Active"


class RunNotIdle(ErrorDetails):
    """An error if one tries to delete a run that is not idle."""

    id: Literal["RunNotIdle"] = "RunNotIdle"
    title: str = "Run is not idle."
    detail: str = (
        "Run is currently active. Allow the run to finish or"
        " stop it with a `stop` action before attempting to modify it."
    )


class RunStopped(ErrorDetails):
    """An error if one tries to modify a stopped run."""

    id: Literal["RunStopped"] = "RunStopped"
    title: str = "Run Stopped"


class AllRunsLinks(BaseModel):
    """Links returned along with a collection of runs."""

    current: Optional[ResourceLink] = Field(
        None,
        description="Path to the currently active run, if a run is active.",
    )


async def get_run_data_from_url(
    runId: str,
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
) -> MaintenanceRun:
    """Get the data of a maintenance run.

    Args:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        run_data = run_data_manager.get(runId)
    except MaintenanceRunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND)

    return run_data


@PydanticResponse.wrap_route(
    base_router.post,
    path="/maintenance_runs",
    summary="Create a maintenance run",
    description=dedent(
        """
        Create a new maintenance run to track robot interaction.

        If a maintenance run already exists, it will be cleared
        and a new one will be created.

        Will raise an error if a *protocol* run exists and is not idle.
        """
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[MaintenanceRun]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[ProtocolRunIsActive]},
    },
)
async def create_run(
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
    run_id: Annotated[str, Depends(get_unique_id)],
    created_at: Annotated[datetime, Depends(get_current_time)],
    is_ok_to_create_maintenance_run: Annotated[
        bool, Depends(get_is_okay_to_create_maintenance_run)
    ],
    check_estop: Annotated[bool, Depends(require_estop_in_good_state)],
    deck_configuration_store: Annotated[
        DeckConfigurationStore, Depends(get_deck_configuration_store)
    ],
    notify_publishers: Annotated[Callable[[], None], Depends(get_pe_notify_publishers)],
    request_body: Optional[RequestModel[MaintenanceRunCreate]] = None,
) -> PydanticResponse[SimpleBody[MaintenanceRun]]:
    """Create a new maintenance run.

    Arguments:
        request_body: Optional request body with run creation data.
        run_data_manager: Current run data management.
        run_id: Generated ID to assign to the run.
        created_at: Timestamp to attach to created run.
        is_ok_to_create_maintenance_run: Verify if a maintenance run may be created if a protocol run exists.
        check_estop: Dependency to verify the estop is in a valid state.
        deck_configuration_store: Dependency to fetch the deck configuration.
        notify_publishers: Utilized by the engine to notify publishers of state changes.
    """
    if not is_ok_to_create_maintenance_run:
        raise ProtocolRunIsActive(
            detail="Cannot create maintenance run when " "a protocol run is active."
        ).as_error(status.HTTP_409_CONFLICT)

    offsets = request_body.data.labwareOffsets if request_body is not None else []
    deck_configuration = await deck_configuration_store.get_deck_configuration()

    run_data = await run_data_manager.create(
        run_id=run_id,
        created_at=created_at,
        labware_offsets=offsets,
        deck_configuration=deck_configuration,
        notify_publishers=notify_publishers,
    )

    log.info(f'Created an empty run "{run_id}"".')
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=run_data),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/maintenance_runs/current_run",
    summary="Get the current maintenance run",
    description="Get the currently active maintenance run, if any",
    responses={
        status.HTTP_200_OK: {"model": Body[MaintenanceRun, AllRunsLinks]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[NoCurrentRunFound]},
    },
)
async def get_current_run(
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
) -> PydanticResponse[Body[MaintenanceRun, AllRunsLinks]]:
    """Get the current maintenance run.

    Args:
        run_data_manager: Current run data management.
    """
    current_run_id = run_data_manager.current_run_id
    if current_run_id is None:
        raise NoCurrentRunFound(
            detail="No maintenance run currently running."
        ).as_error(status.HTTP_404_NOT_FOUND)

    data = run_data_manager.get(current_run_id)
    links = AllRunsLinks(
        current=ResourceLink.model_construct(href=f"/maintenance_runs/{current_run_id}")
    )

    return await PydanticResponse.create(
        content=Body.model_construct(data=data, links=links),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.get,
    path="/maintenance_runs/{runId}",
    summary="Get a maintenance run",
    description="Get a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[MaintenanceRun]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def get_run(
    run_data: Annotated[MaintenanceRun, Depends(get_run_data_from_url)],
) -> PydanticResponse[SimpleBody[MaintenanceRun]]:
    """Get a maintenance run by its ID.

    Args:
        run_data: Data of the run specified in the runId url parameter.
    """
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=run_data),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    base_router.delete,
    path="/maintenance_runs/{runId}",
    summary="Delete a run",
    description="Delete a specific run by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"model": SimpleEmptyBody},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def remove_run(
    runId: str,
    run_data_manager: Annotated[
        MaintenanceRunDataManager, Depends(get_maintenance_run_data_manager)
    ],
) -> PydanticResponse[SimpleEmptyBody]:
    """Delete a maintenance run by its ID.

    Arguments:
        runId: Run ID pulled from URL.
        run_data_manager: Current run data management.
    """
    try:
        await run_data_manager.delete(runId)

    except RunConflictError as e:
        raise RunNotIdle().as_error(status.HTTP_409_CONFLICT) from e
    except MaintenanceRunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleEmptyBody.model_construct(),
        status_code=status.HTTP_200_OK,
    )
