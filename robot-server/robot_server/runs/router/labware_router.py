"""Router for /runs endpoints dealing with labware offsets and definitions."""

import logging
from typing import Annotated, Union

from fastapi import Depends, status

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.protocol_engine import (
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    LabwareOffset,
)

from robot_server.errors.error_responses import ErrorBody
from robot_server.service.json_api import (
    RequestModel,
    SimpleBody,
    PydanticResponse,
)

from ..run_models import Run, LabwareDefinitionSummary
from ..run_data_manager import RunDataManager, RunNotCurrentError
from ..run_orchestrator_store import RunOrchestratorStore
from ..dependencies import get_run_orchestrator_store, get_run_data_manager
from .base_router import RunNotFound, RunStopped, RunNotIdle, get_run_data_from_url

log = logging.getLogger(__name__)
labware_router = LightRouter()


@PydanticResponse.wrap_route(
    labware_router.post,
    path="/runs/{runId}/labware_offsets",
    summary="Add a labware offset to a run",
    description=(
        "Add a labware offset to an existing run, returning the created offset."
        "\n\n"
        "There is no matching `GET /runs/{runId}/labware_offsets` endpoint."
        " To read the list of labware offsets currently on the run,"
        " see the run's `labwareOffsets` field."
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[LabwareOffset]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[Union[RunStopped, RunNotIdle]]},
    },
)
async def add_labware_offset(
    request_body: RequestModel[LegacyLabwareOffsetCreate | LabwareOffsetCreate],
    run_orchestrator_store: Annotated[
        RunOrchestratorStore, Depends(get_run_orchestrator_store)
    ],
    run: Annotated[Run, Depends(get_run_data_from_url)],
) -> PydanticResponse[SimpleBody[LabwareOffset]]:
    """Add a labware offset to a run.

    Args:
        request_body: New labware offset request data from request body.
        run_orchestrator_store: Engine storage interface.
        run: Run response data by ID from URL; ensures 404 if run not found.
    """
    if run.current is False:
        raise RunStopped(detail=f"Run {run.id} is not the current run").as_error(
            status.HTTP_409_CONFLICT
        )

    added_offset = run_orchestrator_store.add_labware_offset(request_body.data)
    log.info(f'Added labware offset "{added_offset.id}"' f' to run "{run.id}".')

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=added_offset),
        status_code=status.HTTP_201_CREATED,
    )


# TODO(mc, 2022-02-28): add complementary GET endpoint
# https://github.com/Opentrons/opentrons/issues/9427
@PydanticResponse.wrap_route(
    labware_router.post,
    path="/runs/{runId}/labware_definitions",
    summary="Add a labware definition to a run",
    description=(
        "Add a labware definition to a run, returning the added definition's URI."
    ),
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[LabwareDefinitionSummary]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[Union[RunStopped, RunNotIdle]]},
    },
)
async def add_labware_definition(
    request_body: RequestModel[LabwareDefinition],
    run_orchestrator_store: Annotated[
        RunOrchestratorStore, Depends(get_run_orchestrator_store)
    ],
    run: Annotated[Run, Depends(get_run_data_from_url)],
) -> PydanticResponse[SimpleBody[LabwareDefinitionSummary]]:
    """Add a labware offset to a run.

    Args:
        request_body: New labware offset request data from request body.
        run_orchestrator_store: Engine storage interface.
        run: Run response data by ID from URL; ensures 404 if run not found.
    """
    if run.current is False:
        raise RunStopped(detail=f"Run {run.id} is not the current run").as_error(
            status.HTTP_409_CONFLICT
        )

    uri = run_orchestrator_store.add_labware_definition(request_body.data)
    log.info(f'Added labware definition "{uri}"' f' to run "{run.id}".')

    return PydanticResponse(
        content=SimpleBody.model_construct(
            data=LabwareDefinitionSummary.model_construct(definitionUri=uri)
        ),
        status_code=status.HTTP_201_CREATED,
    )


@PydanticResponse.wrap_route(
    labware_router.get,
    path="/runs/{runId}/loaded_labware_definitions",
    summary="Get the definitions of a run's loaded labware",
    description=(
        "Get the definitions of all the labware that the given run has loaded so far."
        "\n\n"
        "When the run is first created, this list will be empty."
        " As it executes and goes through `loadLabware` commands, those commands'"
        " `result.definition`s will be added to this list."
        " Repeated definitions will be deduplicated."
    ),
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[list[LabwareDefinition]]},
        status.HTTP_409_CONFLICT: {"model": ErrorBody[RunStopped]},
    },
)
async def get_run_loaded_labware_definitions(
    runId: str,
    run_data_manager: Annotated[RunDataManager, Depends(get_run_data_manager)],
) -> PydanticResponse[SimpleBody[list[LabwareDefinition]]]:
    """Get a run's loaded labware definition by the run ID.

    Args:
        runId: Run ID pulled from URL.
        run_data_manager: Current and historical run data management.
    """
    try:
        labware_definitions = run_data_manager.get_run_loaded_labware_definitions(
            run_id=runId
        )
    except RunNotCurrentError as e:
        raise RunStopped(detail=str(e)).as_error(status.HTTP_409_CONFLICT) from e

    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=labware_definitions),
        status_code=status.HTTP_200_OK,
    )
