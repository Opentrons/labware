"""FastAPI endpoint functions to implement `/errorRecovery/settings`."""


from typing import Annotated

import fastapi
from server_utils.fastapi_utils.light_router import LightRouter

from robot_server.service.json_api import PydanticResponse, RequestModel, SimpleBody
from .models import RequestData, ResponseData
from .store import ErrorRecoverySettingStore, get_error_recovery_setting_store


router = LightRouter()
_PATH = "/errorRecovery/settings"


@PydanticResponse.wrap_route(
    router.get,
    path=_PATH,
    summary="Get current error recovery settings",
)
async def get_error_recovery_settings(  # noqa: D103
    store: Annotated[
        ErrorRecoverySettingStore, fastapi.Depends(get_error_recovery_setting_store)
    ]
) -> PydanticResponse[SimpleBody[ResponseData]]:
    return await _get_current_response(store)


@PydanticResponse.wrap_route(
    router.patch,
    path=_PATH,
    summary="Set error recovery settings",
)
async def patch_error_recovery_settings(  # noqa: D103
    request_body: RequestModel[RequestData],
    store: Annotated[
        ErrorRecoverySettingStore, fastapi.Depends(get_error_recovery_setting_store)
    ],
) -> PydanticResponse[SimpleBody[ResponseData]]:
    if request_body.data.enabled is not None:
        store.set_is_enabled(request_body.data.enabled)
    return await _get_current_response(store)


@PydanticResponse.wrap_route(
    router.delete,
    path=_PATH,
    summary="Reset error recovery settings to defaults",
)
async def delete_error_recovery_settings(  # noqa: D103
    store: Annotated[
        ErrorRecoverySettingStore, fastapi.Depends(get_error_recovery_setting_store)
    ],
) -> PydanticResponse[SimpleBody[ResponseData]]:
    store.set_is_enabled(None)
    return await _get_current_response(store)


async def _get_current_response(
    store: ErrorRecoverySettingStore,
) -> PydanticResponse[SimpleBody[ResponseData]]:
    is_enabled = store.get_is_enabled()
    return await PydanticResponse.create(
        SimpleBody.model_construct(
            data=ResponseData.model_construct(enabled=is_enabled)
        )
    )
