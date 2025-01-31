# TODO(mc, 2021-05-10): delete this file; these models have been moved to
# robot_server/errors/error_responses.py and robot_server/errors/global_errors.py
# Note: (2024-07-18): this file does not actually seem to be safe to delete
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Dict, Optional, Sequence, Tuple
from starlette import status as status_codes

from opentrons_shared_data.errors import ErrorCodes

from robot_server.errors.error_responses import (
    ApiError,
    ErrorSource,
    ErrorDetails,
    ErrorBody,
)
from robot_server.service.json_api import ResourceLinks


@dataclass(frozen=True)
class ErrorCreateDef:
    status_code: int
    title: str
    format_string: str
    error_code: str


class ErrorDef(ErrorCreateDef, Enum):
    """An enumeration of ErrorCreateDef Error definitions for use by
    RobotServerError"""

    def __init__(self, e) -> None:
        super().__init__(**(asdict(e)))


class RobotServerError(ApiError):
    """A BaseRobotServerError that uses an ErrorDef enum.

    .. deprecated::
        Use `robot_server.errors.ErrorDetails(...).as_error(status_code)` instead.
    """

    def __init__(
        self,
        definition: ErrorCreateDef,
        error_id: str = "UncategorizedError",
        links: Optional[ResourceLinks] = None,
        source: Optional[ErrorSource] = None,
        meta: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[BaseException]] = None,
        *fmt_args,
        **fmt_kw_args
    ):
        """
        Constructor.

        :param definition: The ErrorDef enum defining error
        :param error_id: optional error id
        :param links: optional links
        :param meta: optional metadata about error
        :param fmt_args: format_string args
        :param fmt_kw_args: format_string kw_args
        """
        checked_wrapping = wrapping or []
        wrapped_details: Tuple[ErrorDetails, ...] = tuple(
            ErrorDetails.from_exc(exc) for exc in checked_wrapping
        )

        content = ErrorBody(
            errors=(
                ErrorDetails(
                    id=error_id,
                    title=definition.title,
                    detail=definition.format_string.format(*fmt_args, **fmt_kw_args),
                    source=source,
                    meta=meta,
                    errorCode=definition.error_code,
                ),
                *wrapped_details,
            ),
            links=links,
        ).model_dump(exclude_none=True)

        super().__init__(
            status_code=definition.status_code,
            content=content,
        )


class CommonErrorDef(ErrorDef):
    """Generic common defined errors"""

    INTERNAL_SERVER_ERROR = ErrorCreateDef(
        status_code=status_codes.HTTP_500_INTERNAL_SERVER_ERROR,
        title="Internal Server Error",
        format_string="{error}",
        error_code=ErrorCodes.GENERAL_ERROR.value.code,
    )
    NOT_IMPLEMENTED = ErrorCreateDef(
        status_code=status_codes.HTTP_501_NOT_IMPLEMENTED,
        title="Not implemented",
        format_string="Method not implemented. {error}",
        error_code=ErrorCodes.GENERAL_ERROR.value.code,
    )
    RESOURCE_NOT_FOUND = ErrorCreateDef(
        status_code=status_codes.HTTP_404_NOT_FOUND,
        title="Resource Not Found",
        format_string="Resource type '{resource}' with id '{id}' was not found",
        error_code=ErrorCodes.GENERAL_ERROR.value.code,
    )
    ACTION_FORBIDDEN = ErrorCreateDef(
        status_code=status_codes.HTTP_403_FORBIDDEN,
        title="Action Forbidden",
        format_string="{reason}",
        error_code=ErrorCodes.GENERAL_ERROR.value.code,
    )
    RESOURCE_ALREADY_EXISTS = ErrorCreateDef(
        status_code=status_codes.HTTP_403_FORBIDDEN,
        title="Resource Exists",
        format_string="A '{resource}' with id '{id}' already exists",
        error_code=ErrorCodes.GENERAL_ERROR.value.code,
    )
