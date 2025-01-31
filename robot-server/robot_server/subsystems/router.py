"""The router for the /subsystems endpoints."""

from datetime import datetime
from typing import Annotated, Optional, TYPE_CHECKING

from fastapi import status, Depends, Response, Request
from typing_extensions import Literal

from server_utils.fastapi_utils.light_router import LightRouter

from robot_server.service.json_api import (
    SimpleMultiBody,
    PydanticResponse,
    MultiBodyMeta,
    SimpleBody,
)

from .firmware_update_manager import (
    FirmwareUpdateManager,
    UpdateIdNotFound as _UpdateIdNotFound,
    UpdateIdExists as _UpdateIdExists,
    UpdateInProgress as _UpdateInProgress,
    NoOngoingUpdate as _NoOngoingUpdate,
    SubsystemNotFound as _SubsystemNotFound,
)

from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.errors.robot_errors import NotSupportedOnOT2
from robot_server.errors.global_errors import IDNotFound
from robot_server.hardware import (
    get_firmware_update_manager,
    get_ot3_hardware,
    get_thread_manager,
)

from robot_server.service.dependencies import get_unique_id, get_current_time


from .models import (
    UpdateProgressData,
    UpdateProgressSummary,
    SubSystem,
    PresentSubsystem,
)
from opentrons.hardware_control import ThreadManagedHardware

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API  # noqa: F401

subsystems_router = LightRouter()


def status_route_for(subsystem: SubSystem) -> str:
    """Get the status route for a subsystem prefilled with its route parameters."""
    return f"/subsystems/status/{subsystem.value}"


def update_route_for(subsystem: SubSystem) -> str:
    """Get the update route for a subsystem prefilled with its route parameters."""
    return f"/subsystems/updates/{subsystem.value}"


def _error_str(maybe_err: Optional[BaseException]) -> Optional[str]:
    if maybe_err:
        return str(maybe_err)
    return None


class NoUpdateAvailable(ErrorDetails):
    """An error if no update is available for the specified mount."""

    id: Literal["NoUpdateAvailable"] = "NoUpdateAvailable"
    title: str = "No Update Available"


class UpdateInProgress(ErrorDetails):
    """An error thrown if there is already an update in progress."""

    id: Literal["UpdateInProgress"] = "UpdateInProgress"
    title: str = "An update is already in progress."


class FirmwareUpdateFailed(ErrorDetails):
    """An error if a firmware update failed for some reason."""

    id: Literal["FirmwareUpdateFailed"] = "FirmwareUpdateFailed"
    title: str = "Firmware Update Failed"


class SubsystemNotPresent(ErrorDetails):
    """An error if a subsystem that is not present is requested."""

    id: Literal["SubsystemNotPresent"] = "SubsystemNotPresent"
    title: str = "Subsystem Not Present"


class InvalidSubsystem(ErrorDetails):
    """An error if a subsystem name is invalid."""

    id: Literal["InvalidSubsystem"] = "InvalidSubsystem"
    title: str = "Invalid Subsystem"


class NoOngoingUpdate(ErrorDetails):
    """An error if there is no ongoing update for a subsystem."""

    id: Literal["NoOngoingUpdate"] = "NoOngoingUpdate"
    title: str = "No Ongoing Update"


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/status",
    summary="Get all attached subsystems",
    description="Get the details of all hardware subsystems attached to the robot.",
    responses={
        status.HTTP_200_OK: {"model": SimpleMultiBody[PresentSubsystem]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
    },
)
async def get_attached_subsystems(
    thread_manager: Annotated[ThreadManagedHardware, Depends(get_thread_manager)],
) -> PydanticResponse[SimpleMultiBody[PresentSubsystem]]:
    """Return all subsystems currently present on the machine."""
    hardware = get_ot3_hardware(thread_manager)
    data = [
        PresentSubsystem.model_construct(
            name=SubSystem.from_hw(subsystem_id),
            ok=subsystem_details.ok,
            current_fw_version=str(subsystem_details.current_fw_version),
            next_fw_version=str(subsystem_details.next_fw_version),
            fw_update_needed=subsystem_details.fw_update_needed,
            revision=str(subsystem_details.pcba_revision),
        )
        for subsystem_id, subsystem_details in hardware.attached_subsystems.items()
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(data=data, meta=meta)
    )


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/status/{subsystem}",
    summary="Get a specific attached subsystem",
    description="Get the details of a single hardware subsystem attached to the robot.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[PresentSubsystem]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[SubsystemNotPresent]},
    },
)
async def get_attached_subsystem(
    subsystem: SubSystem,
    thread_manager: Annotated[ThreadManagedHardware, Depends(get_thread_manager)],
) -> PydanticResponse[SimpleBody[PresentSubsystem]]:
    """Return the status of a single attached subsystem.

    Response: A subsystem status, if the subsystem is present. Otherwise, an appropriate error.
    """
    hardware = get_ot3_hardware(thread_manager)
    subsystem_status = hardware.attached_subsystems.get(subsystem.to_hw(), None)
    if not subsystem_status:
        raise SubsystemNotPresent(detail=subsystem.value).as_error(
            status.HTTP_404_NOT_FOUND
        )
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=PresentSubsystem.model_construct(
                name=subsystem,
                ok=subsystem_status.ok,
                current_fw_version=str(subsystem_status.current_fw_version),
                next_fw_version=str(subsystem_status.next_fw_version),
                fw_update_needed=subsystem_status.fw_update_needed,
                revision=str(subsystem_status.pcba_revision),
            )
        )
    )


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/updates/current",
    summary="Get all ongoing subsystem updates",
    description=(
        "Get a list of currently-running subsystem firmware updates."
        " This is a good snapshot of what, if anything, is currently being updated"
        " and may block other robot work. To guarantee data about an update you were"
        " previously interested in, get its `id` using `/subsystems/updates/all`."
    ),
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[UpdateProgressSummary]}},
)
async def get_subsystem_updates(
    update_manager: Annotated[
        FirmwareUpdateManager, Depends(get_firmware_update_manager)
    ],
) -> PydanticResponse[SimpleMultiBody[UpdateProgressSummary]]:
    """Return all currently-running firmware update process summaries."""
    handles = await update_manager.all_ongoing_processes()
    data = [
        UpdateProgressSummary.model_construct(
            id=handle.process_details.update_id,
            subsystem=handle.process_details.subsystem,
            updateStatus=handle.cached_state,
            createdAt=handle.process_details.created_at,
        )
        for handle in handles
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(data=data, meta=meta)
    )


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/updates/current/{subsystem}",
    summary="Get the ongoing update for a specific subsystem",
    description="As `/subsystems/updates/current`, but filtered by the route parameter.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[NoOngoingUpdate]},
    },
)
async def get_subsystem_update(
    subsystem: SubSystem,
    update_manager: Annotated[
        FirmwareUpdateManager, Depends(get_firmware_update_manager)
    ],
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Return full data about a specific currently-running update process."""
    try:
        handle = await update_manager.get_ongoing_update_process_handle_by_subsystem(
            subsystem
        )
    except _NoOngoingUpdate as e:
        raise NoOngoingUpdate(detail=subsystem.value).as_error(
            status.HTTP_404_NOT_FOUND
        ) from e
    progress = await handle.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=UpdateProgressData.model_construct(
                id=handle.process_details.update_id,
                createdAt=handle.process_details.created_at,
                subsystem=handle.process_details.subsystem,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        )
    )


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/updates/all",
    summary="Get all subsystem updates",
    description=(
        "Get a list of all updates, including both ongoing updates and updates that"
        " started since the last boot but are now complete."
        "\n\n"
        " While an update might complete and therefore disappear from"
        "`/subsystems/updates/current`, you can always find that update in the response"
        " to this endpoint by its `id`."
    ),
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[UpdateProgressData]}},
)
async def get_update_processes(
    update_manager: Annotated[
        FirmwareUpdateManager, Depends(get_firmware_update_manager)
    ],
) -> PydanticResponse[SimpleMultiBody[UpdateProgressSummary]]:
    """Return summaries of all past (since robot boot) or present update processes."""
    data = [
        UpdateProgressSummary(
            id=update.process_details.update_id,
            subsystem=update.process_details.subsystem,
            updateStatus=update.cached_state,
            createdAt=update.process_details.created_at,
        )
        for update in update_manager.all_update_processes()
    ]
    meta = MultiBodyMeta(cursor=0, totalLength=len(data))
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(data=data, meta=meta)
    )


@PydanticResponse.wrap_route(
    subsystems_router.get,
    path="/subsystems/updates/all/{id}",
    summary="Get a specific subsystem update",
    description="As `/subsystems/updates/all`, but returning only one resource: the one with the `id` matching the route parameter (if it exists).",
    responses={status.HTTP_200_OK: {"model": SimpleBody[UpdateProgressData]}},
)
async def get_update_process(
    id: str,
    update_manager: Annotated[
        FirmwareUpdateManager, Depends(get_firmware_update_manager)
    ],
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Return the progress of a specific past or present update process."""
    try:
        handle = update_manager.get_update_process_handle_by_id(id)
    except _UpdateIdNotFound as e:
        raise IDNotFound(detail=id).as_error(status.HTTP_404_NOT_FOUND) from e
    progress = await handle.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=UpdateProgressData.model_construct(
                id=handle.process_details.update_id,
                subsystem=handle.process_details.subsystem,
                createdAt=handle.process_details.created_at,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        )
    )


@PydanticResponse.wrap_route(
    subsystems_router.post,
    path="/subsystems/updates/{subsystem}",
    summary="Start an update for a subsystem",
    description="Begin a firmware update for a given subsystem.",
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_303_SEE_OTHER: {"model": SimpleBody[UpdateProgressData]},
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[SubsystemNotPresent]},
        status.HTTP_412_PRECONDITION_FAILED: {"model": ErrorBody[NoUpdateAvailable]},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorBody[FirmwareUpdateFailed]
        },
    },
)
async def begin_subsystem_update(
    subsystem: SubSystem,
    response: Response,
    request: Request,
    update_manager: Annotated[
        FirmwareUpdateManager, Depends(get_firmware_update_manager)
    ],
    update_process_id: Annotated[str, Depends(get_unique_id)],
    created_at: Annotated[datetime, Depends(get_current_time)],
) -> PydanticResponse[SimpleBody[UpdateProgressData]]:
    """Update the firmware of the OT3 instrument on the specified mount."""
    try:
        summary = await update_manager.start_update_process(
            update_process_id,
            subsystem,
            created_at,
        )
    except _SubsystemNotFound as e:
        raise SubsystemNotPresent(
            detail=str(e),
        ).as_error(status.HTTP_404_NOT_FOUND) from e
    except _UpdateInProgress as e:
        response.headers["Location"] = str(
            request.url.replace(
                path=f"/subsystems/updates/current/{subsystem.value}",
            )
        )
        raise UpdateInProgress(
            detail=f"{subsystem.value} is already either queued for update"
            f" or is currently updating"
        ).as_error(status.HTTP_303_SEE_OTHER) from e
    except _UpdateIdExists:
        raise UpdateInProgress(
            detail="An update is already ongoing with this ID."
        ).as_error(status.HTTP_500_INTERNAL_SERVER_ERROR)

    response.headers["Location"] = str(
        request.url.replace(path=f"/subsystems/updates/current/{subsystem.value}")
    )
    progress = await summary.get_progress()
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=UpdateProgressData.model_construct(
                id=summary.process_details.update_id,
                createdAt=summary.process_details.created_at,
                subsystem=subsystem,
                updateStatus=progress.state,
                updateProgress=progress.progress,
                updateError=_error_str(progress.error),
            )
        ),
        status_code=status.HTTP_201_CREATED,
    )
