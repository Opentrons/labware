"""Endpoint functions for the `/clientData` endpoints."""

import textwrap
from typing import Annotated, Literal

import fastapi
from server_utils.fastapi_utils.light_router import LightRouter

from robot_server.client_data.store import (
    ClientData,
    ClientDataStore,
    get_client_data_store,
)
from robot_server.errors.error_responses import ErrorBody, ErrorDetails
from robot_server.service.json_api.request import RequestModel
from robot_server.service.json_api.response import SimpleBody, SimpleEmptyBody
from robot_server.service.notifications.publishers.client_data_publisher import (
    ClientDataPublisher,
    get_client_data_publisher,
)

router = LightRouter()


Key = Annotated[
    str,
    fastapi.Path(
        pattern="^[a-zA-Z0-9-_]*$",
        description=(
            "A key for storing and retrieving the piece of data."
            " This should be chosen to avoid colliding with other clients,"
            " and to unambiguously identify the data stored inside."
            " The allowed characters are restricted to avoid any that"
            " are special in URLs or MQTT topics."
        ),
        examples=["exampleOrganization-userNotes-v2"],
    ),
]


class ClientDataKeyDoesNotExist(ErrorDetails):
    """An error returned if trying to access a client data key that doesn't exist."""

    id: Literal["ClientDataKeyDoesNotExist"] = "ClientDataKeyDoesNotExist"
    title: str = "Client Data Key Does Not Exist"


@router.put(
    path="/clientData/{key}",
    summary="Store client-defined data",
    description=textwrap.dedent(
        """\
        Store a small amount of arbitrary client-defined data.

        This endpoint is experimental and may be changed or removed without warning.

        This is intended to help coordinate between multiple clients accessing the same
        robot, and to help clients pick up from where they left off if they're closed
        and reopened. For example, suppose your client shows a user interface for
        physically setting up the deck with labware, step by step. You could use this
        to store which step the user is currently on.

        The data is cleared when the robot reboots.
        """
    ),
)
async def put_client_data(  # noqa: D103
    key: Key,
    request_body: RequestModel[ClientData],
    store: Annotated[ClientDataStore, fastapi.Depends(get_client_data_store)],
    client_data_publisher: Annotated[
        ClientDataPublisher, fastapi.Depends(get_client_data_publisher)
    ],
) -> SimpleBody[ClientData]:
    store.put(key, request_body.data)
    client_data_publisher.publish_client_data(key)
    return SimpleBody.model_construct(data=store.get(key))


@router.get(
    path="/clientData/{key}",
    summary="Get client-defined data",
    description="Return the currently-stored client data at the given key. See `PUT /clientData` for background.",
    responses={
        fastapi.status.HTTP_200_OK: {"model": SimpleBody[ClientData]},
        fastapi.status.HTTP_404_NOT_FOUND: {
            "model": ErrorBody[ClientDataKeyDoesNotExist]
        },
    },
)
async def get_client_data(  # noqa: D103
    key: Key,
    store: Annotated[ClientDataStore, fastapi.Depends(get_client_data_store)],
) -> SimpleBody[ClientData]:
    try:
        return SimpleBody.model_construct(data=store.get(key))
    except KeyError as e:
        raise ClientDataKeyDoesNotExist.from_exc(e).as_error(
            fastapi.status.HTTP_404_NOT_FOUND
        ) from e


@router.delete(
    path="/clientData/{key}",
    summary="Delete client-defined data",
    description="Delete the client-defined data at the given key. See `PUT /clientData` for background.",
    responses={
        fastapi.status.HTTP_200_OK: {"model": SimpleBody[ClientData]},
        fastapi.status.HTTP_404_NOT_FOUND: {
            "model": ErrorBody[ClientDataKeyDoesNotExist]
        },
    },
)
async def delete_client_data(  # noqa: D103
    key: Key,
    store: Annotated[ClientDataStore, fastapi.Depends(get_client_data_store)],
    client_data_publisher: Annotated[
        ClientDataPublisher, fastapi.Depends(get_client_data_publisher)
    ],
) -> SimpleEmptyBody:
    try:
        store.delete(key)
    except KeyError as e:
        raise ClientDataKeyDoesNotExist.from_exc(e).as_error(
            fastapi.status.HTTP_404_NOT_FOUND
        ) from e
    else:
        client_data_publisher.publish_client_data(key)
        return SimpleEmptyBody.model_construct()


@router.delete(
    path="/clientData",
    summary="Delete all client-defined data",
    description="Delete all client-defined data. See `PUT /clientData` for background.",
)
async def delete_all_client_data(  # noqa: D103
    store: Annotated[ClientDataStore, fastapi.Depends(get_client_data_store)],
    client_data_publisher: Annotated[
        ClientDataPublisher, fastapi.Depends(get_client_data_publisher)
    ],
) -> SimpleEmptyBody:
    keys_that_will_be_deleted = store.get_keys()
    store.delete_all()
    for deleted_key in keys_that_will_be_deleted:
        client_data_publisher.publish_client_data(deleted_key)
    return SimpleEmptyBody.model_construct()
