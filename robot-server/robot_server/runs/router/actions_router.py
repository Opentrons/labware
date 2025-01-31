"""Router for /runs actions endpoints."""
import logging

from datetime import datetime
from typing import Annotated, Literal, Union

from fastapi import Depends, status
from server_utils.fastapi_utils.light_router import LightRouter

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.service.json_api import RequestModel, SimpleBody, PydanticResponse
from robot_server.service.task_runner import TaskRunner, get_task_runner
from robot_server.robot.control.dependencies import require_estop_in_good_state
from robot_server.deck_configuration.fastapi_dependencies import (
    get_deck_configuration_store,
)
from robot_server.deck_configuration.store import DeckConfigurationStore
from opentrons.protocol_engine.types import DeckConfigurationType

from ..run_orchestrator_store import RunOrchestratorStore
from ..run_store import RunStore
from ..run_models import RunNotFoundError
from ..run_controller import RunController, RunActionNotAllowedError
from ..action_models import RunAction, RunActionCreate, RunActionType
from ..dependencies import get_run_orchestrator_store, get_run_store
from .base_router import RunNotFound, RunStopped
from robot_server.maintenance_runs.maintenance_run_orchestrator_store import (
    MaintenanceRunOrchestratorStore,
)
from robot_server.maintenance_runs.dependencies import (
    get_maintenance_run_orchestrator_store,
)
from robot_server.service.notifications import (
    get_runs_publisher,
    get_maintenance_runs_publisher,
    RunsPublisher,
    MaintenanceRunsPublisher,
)

log = logging.getLogger(__name__)
actions_router = LightRouter()


class RunActionNotAllowed(ErrorDetails):
    """An error if one tries to issue an unsupported run action."""

    id: Literal["RunActionNotAllowed"] = "RunActionNotAllowed"
    title: str = "Run Action Not Allowed"


async def get_run_controller(
    runId: str,
    task_runner: Annotated[TaskRunner, Depends(get_task_runner)],
    run_orchestrator_store: Annotated[
        RunOrchestratorStore, Depends(get_run_orchestrator_store)
    ],
    run_store: Annotated[RunStore, Depends(get_run_store)],
    runs_publisher: Annotated[RunsPublisher, Depends(get_runs_publisher)],
    maintenance_runs_publisher: Annotated[
        MaintenanceRunsPublisher, Depends(get_maintenance_runs_publisher)
    ],
) -> RunController:
    """Get a RunController for the current run.

    This ensures that a run exists and is current at the time the request is
    received. Dependents should not assume that condition will necessarily
    hold throughout the lifetime of the request handler.
    """
    if not run_store.has(runId):
        raise RunNotFound(detail=f"Run {runId} not found.").as_error(
            status.HTTP_404_NOT_FOUND
        )

    if runId != run_orchestrator_store.current_run_id:
        raise RunStopped(detail=f"Run {runId} is not the current run").as_error(
            status.HTTP_409_CONFLICT
        )

    return RunController(
        run_id=runId,
        task_runner=task_runner,
        run_orchestrator_store=run_orchestrator_store,
        run_store=run_store,
        runs_publisher=runs_publisher,
        maintenance_runs_publisher=maintenance_runs_publisher,
    )


@PydanticResponse.wrap_route(
    actions_router.post,
    path="/runs/{runId}/actions",
    summary="Issue a control action to the run",
    description="Provide an action in order to control execution of the run.",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[RunAction]},
        status.HTTP_409_CONFLICT: {
            "model": ErrorBody[Union[RunActionNotAllowed, RunStopped]],
        },
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def create_run_action(
    runId: str,
    request_body: RequestModel[RunActionCreate],
    run_controller: Annotated[RunController, Depends(get_run_controller)],
    action_id: Annotated[str, Depends(get_unique_id)],
    created_at: Annotated[datetime, Depends(get_current_time)],
    maintenance_run_orchestrator_store: Annotated[
        MaintenanceRunOrchestratorStore, Depends(get_maintenance_run_orchestrator_store)
    ],
    deck_configuration_store: Annotated[
        DeckConfigurationStore, Depends(get_deck_configuration_store)
    ],
    check_estop: Annotated[bool, Depends(require_estop_in_good_state)],
) -> PydanticResponse[SimpleBody[RunAction]]:
    """Create a run control action.

    When a play action is issued to a protocol run while a maintenance run is active,
    the protocol run is given priority and the maintenance run is deleted before
    executing the protocol run play action.

    Arguments:
        runId: Run ID pulled from the URL.
        request_body: Input payload from the request body.
        run_orchestrator_store: Dependency to fetch the engine store.
        run_controller: Run controller bound to the given run ID.
        action_id: Generated ID to assign to the control action.
        created_at: Timestamp to attach to the control action.
        maintenance_run_orchestrator_store: The maintenance run's EngineStore
        deck_configuration_store: The deck configuration store
        check_estop: Dependency to verify the estop is in a valid state.
        deck_configuration_store: Dependency to fetch the deck configuration.
    """
    action_type = request_body.data.actionType
    if (
        action_type == RunActionType.PLAY
        and maintenance_run_orchestrator_store.current_run_id is not None
    ):
        await maintenance_run_orchestrator_store.clear()
    try:
        deck_configuration: DeckConfigurationType = []
        if action_type == RunActionType.PLAY:
            deck_configuration = await deck_configuration_store.get_deck_configuration()
        action = run_controller.create_action(
            action_id=action_id,
            action_type=action_type,
            created_at=created_at,
            action_payload=deck_configuration,
        )

    except RunActionNotAllowedError as e:
        raise RunActionNotAllowed.from_exc(e).as_error(status.HTTP_409_CONFLICT) from e

    except RunNotFoundError as e:
        raise RunNotFound.from_exc(e).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=action),
        status_code=status.HTTP_201_CREATED,
    )
