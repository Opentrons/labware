"""The HTTP API for getting and setting the robot's current deck configuration."""


from datetime import datetime
from typing import Annotated, Union

import fastapi
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons_shared_data.deck.types import DeckDefinitionV5

from robot_server.errors.error_responses import ErrorBody
from robot_server.hardware import get_deck_definition
from robot_server.service.dependencies import get_current_time
from robot_server.service.json_api import PydanticResponse, RequestModel, SimpleBody

from . import models
from . import validation
from . import validation_mapping
from .fastapi_dependencies import get_deck_configuration_store
from .store import DeckConfigurationStore


router = LightRouter()


@PydanticResponse.wrap_route(
    router.put,
    path="/deck_configuration",
    summary="Set the Flex deck configuration",
    description=(
        "Inform the robot how its deck is physically set up."
        "\n\n"
        "When you use the `/runs` and `/maintenance_runs` endpoints to command the robot to move,"
        " the robot will automatically dodge the obstacles that you declare here."
        "\n\n"
        "If a run command tries to do something that inherently conflicts with this deck"
        " configuration, such as loading a labware into a staging area slot that this deck"
        " configuration doesn't provide, the run command will fail with an error."
        "\n\n"
        "After you set the deck configuration, it will persist, even across reboots,"
        " until you set it to something else."
        "\n\n"
        "**Warning:**"
        " Currently, you can call this endpoint at any time, even while there is an active run."
        " However, the robot can't adapt to deck configuration changes in the middle of a run."
        " The robot will effectively take a snapshot of the deck configuration when the run is"
        " first played. In the future, this endpoint may error if you try to call it in the middle"
        " of an active run, so don't rely on being able to do that."
        "\n\n"
        "**Warning:** Only use this on Flex robots, never OT-2 robots. The behavior on"
        " OT-2 robots is currently undefined and it may interfere with protocol execution."
    ),
    responses={
        fastapi.status.HTTP_200_OK: {
            "model": SimpleBody[models.DeckConfigurationResponse]
        },
        fastapi.status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorBody[models.InvalidDeckConfiguration]
        },
    },
)
async def put_deck_configuration(  # noqa: D103
    request_body: RequestModel[models.DeckConfigurationRequest],
    store: Annotated[
        DeckConfigurationStore, fastapi.Depends(get_deck_configuration_store)
    ],
    now: Annotated[datetime, fastapi.Depends(get_current_time)],
    deck_definition: Annotated[DeckDefinitionV5, fastapi.Depends(get_deck_definition)],
) -> PydanticResponse[
    Union[
        SimpleBody[models.DeckConfigurationResponse],
        ErrorBody[models.InvalidDeckConfiguration],
    ]
]:
    placements = validation_mapping.map_in(request_body.data)
    validation_errors = validation.get_configuration_errors(deck_definition, placements)
    if len(validation_errors) == 0:
        success_data = await store.set(request=request_body.data, last_modified_at=now)
        return await PydanticResponse.create(
            content=SimpleBody.model_construct(data=success_data)
        )
    else:
        error_data = validation_mapping.map_out(validation_errors)
        return await PydanticResponse.create(
            content=ErrorBody.model_construct(errors=error_data),
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        )


@PydanticResponse.wrap_route(
    router.get,
    path="/deck_configuration",
    summary="Get the Flex deck configuration",
    description=(
        "Get the robot's current deck configuration."
        " See `PUT /deck_configuration` for background information."
        "\n\n"
        "**Warning:** The behavior of this endpoint is currently only defined for Flex"
        " robots, not OT-2 robots."
    ),
    responses={
        fastapi.status.HTTP_200_OK: {
            "model": SimpleBody[models.DeckConfigurationResponse]
        },
    },
)
async def get_deck_configuration(  # noqa: D103
    store: Annotated[
        DeckConfigurationStore, fastapi.Depends(get_deck_configuration_store)
    ],
) -> PydanticResponse[SimpleBody[models.DeckConfigurationResponse]]:
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(data=await store.get())
    )
