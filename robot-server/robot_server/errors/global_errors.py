"""Global error types."""
from typing_extensions import Literal
from typing import Type, Any

from .error_responses import ErrorDetails
from opentrons_shared_data.errors import ErrorCodes


class UnexpectedError(ErrorDetails):
    """An error returned when an unhandled exception occurs."""

    id: Literal["UnexpectedError"] = "UnexpectedError"
    title: str = "Unexpected Internal Error"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class BadRequest(ErrorDetails):
    """An error returned when the framework rejects the request."""

    id: Literal["BadRequest"] = "BadRequest"
    title: str = "Bad Request"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class InvalidRequest(ErrorDetails):
    """An error returned when the request fails validation."""

    id: Literal["InvalidRequest"] = "InvalidRequest"
    title: str = "Invalid Request"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class IDNotFound(ErrorDetails):
    """An error returned when an ID is specified incorrectly."""

    id: Literal["IDNotFound"] = "IDNotFound"
    title: str = "ID Not Found"
    errorCode: str = ErrorCodes.GENERAL_ERROR.value.code


class FirmwareUpdateRequired(ErrorDetails):
    """An error returned when a command requests to interact with hardware that requires an update."""

    id: Literal["FirmwareUpdateRequired"] = "FirmwareUpdateRequired"
    title: str = "Firmware Update Required"
    errorCode: str = ErrorCodes.FIRMWARE_UPDATE_REQUIRED.value.code

    @classmethod
    def from_exc(
        cls: Type["FirmwareUpdateRequired"],
        exc: BaseException,
        **supplemental_kwargs: Any
    ) -> "FirmwareUpdateRequired":
        """Build a FirmwareUpdateRequired from a specific exception. Preserves metadata."""
        parent_inst = ErrorDetails.from_exc(exc, **supplemental_kwargs)
        inst = FirmwareUpdateRequired(**parent_inst.model_dump())
        if not inst.meta:
            inst.meta = {"update_url": "/subsystems/update"}
        else:
            inst.meta["update_url"] = "/subsystems/update"
        return inst
