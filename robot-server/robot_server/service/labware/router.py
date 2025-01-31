"""Deprecated calibration routes.

As of the v5 software release, these endpoints do not function.
All labware offsets are set via `/run` endpoints.
"""
from typing import Annotated, Optional
from typing_extensions import Literal, NoReturn

from fastapi import Depends, status
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons_shared_data.errors import ErrorCodes
from robot_server.errors.error_responses import ErrorDetails, ErrorBody
from robot_server.versioning import get_requested_version
from robot_server.service.labware import models as lw_models
from robot_server.service.errors import RobotServerError, CommonErrorDef


router = LightRouter()


class LabwareCalibrationEndpointsRemoved(ErrorDetails):
    """An error if you try to use the deprecated Labware Calibration endpoints."""

    id: Literal[
        "LabwareCalibrationEndpointsRemoved"
    ] = "LabwareCalibrationEndpointsRemoved"
    title: str = "Labware Calibration Endpoints Removed"
    detail: str = "Use the `/runs` endpoints to manage labware offsets."
    errorCode: str = ErrorCodes.API_REMOVED.value.code


@router.get(
    "/labware/calibrations",
    summary="Fetch all saved labware calibrations from the robot",
    description=(
        "This endpoint has been removed."
        " Use the `/runs` endpoints to manage labware offsets."
    ),
    deprecated=True,
    response_model=None,
    responses={
        status.HTTP_200_OK: {"model": lw_models.MultipleCalibrationsResponse},
        status.HTTP_410_GONE: {"model": ErrorBody[LabwareCalibrationEndpointsRemoved]},
    },
)
async def get_all_labware_calibrations(
    requested_version: Annotated[int, Depends(get_requested_version)],
    loadName: Optional[str] = None,
    namespace: Optional[str] = None,
    version: Optional[int] = None,
    parent: Optional[str] = None,
) -> lw_models.MultipleCalibrationsResponse:
    if requested_version <= 3:
        return lw_models.MultipleCalibrationsResponse(data=[], links=None)

    raise LabwareCalibrationEndpointsRemoved().as_error(status.HTTP_410_GONE)


@router.get(
    "/labware/calibrations/{calibrationId}",
    summary="Get a saved labware calibration by ID",
    description=(
        "This endpoint has been removed."
        " Use the `/runs` endpoints to manage labware offsets."
    ),
    deprecated=True,
    response_model=None,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody},
        status.HTTP_410_GONE: {"model": ErrorBody[LabwareCalibrationEndpointsRemoved]},
    },
)
async def get_specific_labware_calibration(
    calibrationId: str,
    requested_version: Annotated[int, Depends(get_requested_version)],
) -> NoReturn:
    if requested_version <= 3:
        raise RobotServerError(
            definition=CommonErrorDef.RESOURCE_NOT_FOUND,
            resource="calibration",
            id=calibrationId,
        )

    raise LabwareCalibrationEndpointsRemoved().as_error(status.HTTP_410_GONE)


@router.delete(
    "/labware/calibrations/{calibrationId}",
    summary="Remove a saved labware calibration by ID",
    description=(
        "This endpoint has been removed."
        " Use the `/runs` endpoints to manage labware offsets."
    ),
    deprecated=True,
    response_model=None,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody},
        status.HTTP_410_GONE: {"model": ErrorBody[LabwareCalibrationEndpointsRemoved]},
    },
)
async def delete_specific_labware_calibration(
    calibrationId: str,
    requested_version: Annotated[int, Depends(get_requested_version)],
) -> NoReturn:
    if requested_version <= 3:
        raise RobotServerError(
            definition=CommonErrorDef.RESOURCE_NOT_FOUND,
            resource="calibration",
            id=calibrationId,
        )

    raise LabwareCalibrationEndpointsRemoved().as_error(status.HTTP_410_GONE)
