"""JSON API errors and response models."""
from pydantic import BaseModel, Field
from typing import Any, Dict, Generic, Optional, Sequence, TypeVar, Type

from robot_server.service.json_api import BaseResponseBody, ResourceLinks
from opentrons_shared_data.errors import EnumeratedError, PythonException, ErrorCodes


class ApiError(Exception):
    """An exception to throw when an endpoint should respond with an error."""

    def __init__(self, status_code: int, content: Dict[str, Any]) -> None:
        """Initialize the exception.

        Arguments:
            status_code: The status code of the response
            content: The JSON response body
        """
        self.status_code = status_code
        self.content = content


class BaseErrorBody(BaseResponseBody):
    """Base class for error response bodies."""

    def as_error(self, status_code: int) -> ApiError:
        """Serialize the response as an API error to raise in a handler."""
        return ApiError(status_code=status_code, content=self.model_dump())


class ErrorSource(BaseModel):
    """An object containing references to the source of the error."""

    pointer: Optional[str] = Field(
        default=None,
        description=(
            "A JSON Pointer [RFC6901] to the associated entity in the request document."
        ),
    )
    parameter: Optional[str] = Field(
        default=None,
        description="a string indicating which URI query parameter caused the error.",
    )
    header: Optional[str] = Field(
        default=None,
        description="A string indicating which header caused the error.",
    )


class ErrorDetails(BaseErrorBody):
    """An error response with error type and occurrence details.

    Extend this class to create specific error responses, and use it in your
    route handlers.

    Example:
        from fastapi import status
        from typing_extensions import Literal
        from robot_server.errors.error_responses import ErrorResponse, ErrorDetails

        class BadRequest(ErrorDetails):
            id: Literal["BadRequest"] = "BadRequest"
            title: str = "Bad Request"

        # ...

        @router.get(
            path="/some/path",
            response_model=SomeModel,
            responses={
                status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse[BadRequest]},
            }
        )
        def get_some_model():
            # ...
            raise BadRequest.as_error(status.HTTP_400_BAD_REQUEST)
    """

    id: str = Field(
        ...,
        description="A unique identifier for this type of error.",
    )
    title: str = Field(
        ...,
        description="A short, human readable name for this type of error",
    )
    detail: str = Field(
        ...,
        description=(
            "A human-readable message describing this specific occurrence "
            "of the error."
        ),
    )
    source: Optional[ErrorSource] = Field(
        default=None,
        description="An object containing references to the source of the error.",
    )
    meta: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "An object containing non-standard information about this "
            "occurrence of the error"
        ),
    )
    errorCode: str = Field(
        default=ErrorCodes.GENERAL_ERROR.value.code,
        description=("The Opentrons error code associated with the error"),
    )

    @classmethod
    def from_exc(
        cls: Type["ErrorDetailsT"], exc: BaseException, **supplemental_kwargs: Any
    ) -> "ErrorDetailsT":
        """Build an ErrorDetails model from an exception.

        To allow for custom child models of the ErrorDetails base setting separate
        defaults, if a default is set for a given field it won't be set from the
        exception unless override_defaults is True.
        """
        values = {k: v for k, v in supplemental_kwargs.items()}
        if not isinstance(exc, EnumeratedError):
            checked_exc: EnumeratedError = PythonException(exc)
        else:
            checked_exc = exc
        values["detail"] = checked_exc.message.strip()
        values["errorCode"] = checked_exc.code.value.code

        def _exc_to_meta(exc_val: EnumeratedError) -> Dict[str, Any]:
            return {
                "type": exc_val.detail.get("class", exc_val.__class__.__name__),
                "code": exc_val.code.value.code,
                "message": exc_val.message.strip(),
                "detail": {k: v for k, v in exc_val.detail.items()},
                "wrapping": [_exc_to_meta(wrapped) for wrapped in exc_val.wrapping],
            }

        values["meta"] = _exc_to_meta(checked_exc)
        return cls(**values)

    def as_error(self, status_code: int) -> ApiError:
        """Serial this ErrorDetails as an ApiError from an ErrorResponse."""
        return ErrorBody(errors=(self,)).as_error(status_code)


ErrorDetailsT = TypeVar("ErrorDetailsT", bound=ErrorDetails)


class LegacyErrorResponse(BaseErrorBody):
    """An error response with a human readable message."""

    message: str = Field(
        ...,
        description="A human-readable message describing the error.",
    )
    errorCode: str = Field(
        ..., description="The Opentrons error code associated with the error"
    )

    @classmethod
    def from_exc(
        cls: Type["LegacyErrorResponse"], exc: BaseException
    ) -> "LegacyErrorResponse":
        """Build a response from an exception, preserving some detail."""
        if not isinstance(exc, EnumeratedError):
            checked_exc: EnumeratedError = PythonException(exc)
        else:
            checked_exc = exc

        return cls(
            message=checked_exc.message.strip(), errorCode=checked_exc.code.value.code
        )


class ErrorBody(BaseErrorBody, Generic[ErrorDetailsT]):
    """A response body for a single error."""

    errors: Sequence[ErrorDetailsT] = Field(..., description="Error details.")
    links: Optional[ResourceLinks] = Field(
        default=None,
        description=(
            "Links that leads to further details about "
            "this particular occurrence of the problem."
        ),
    )


class MultiErrorResponse(BaseErrorBody, Generic[ErrorDetailsT]):
    """An response body for multiple errors."""

    errors: Sequence[ErrorDetailsT] = Field(..., description="Error details.")
    links: Optional[ResourceLinks] = Field(
        default=None,
        description=(
            "Links that leads to further details about "
            "this particular occurrence of the problem."
        ),
    )
