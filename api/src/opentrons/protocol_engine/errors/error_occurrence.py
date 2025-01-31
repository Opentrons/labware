"""Models for concrete occurrences of specific errors."""
from logging import getLogger

from datetime import datetime
from textwrap import dedent
from typing import Any, Dict, Mapping, List, Type, Union, Optional, Sequence
from pydantic import BaseModel, Field, ConfigDict
from opentrons_shared_data.errors.codes import ErrorCodes
from .exceptions import ProtocolEngineError
from opentrons_shared_data.errors.exceptions import EnumeratedError

log = getLogger(__name__)


class ErrorOccurrence(BaseModel):
    """An occurrence of a specific error during protocol execution."""

    @classmethod
    def from_failed(
        cls: Type["ErrorOccurrence"],
        id: str,
        createdAt: datetime,
        error: Union[ProtocolEngineError, EnumeratedError],
    ) -> "ErrorOccurrence":
        """Build an ErrorOccurrence from the details available from a FailedAction or FinishAction."""
        if isinstance(error, ProtocolCommandFailedError) and error.original_error:
            wrappedErrors = [error.original_error]
        else:
            wrappedErrors = [
                cls.from_failed(id, createdAt, err) for err in error.wrapping
            ]
        return cls.model_construct(
            id=id,
            createdAt=createdAt,
            errorType=type(error).__name__,
            detail=error.message or str(error),
            errorInfo=error.detail,
            errorCode=error.code.value.code,
            wrappedErrors=wrappedErrors,
        )

    @staticmethod
    def schema_extra(schema: Dict[str, Any], model: object) -> None:
        """Append the schema to make the errorCode appear required.

        `errorCode`, `wrappedErrors`, and `errorInfo` have defaults because they are not included in earlier
        versions of this model, _and_ this model is loaded directly from
        the on-robot store. That means that, without a default, it will
        fail to parse. Once a default is defined, the automated schema will
        mark this as a non-required field, which is misleading as this is
        a response from the server to the client and it will always have an
        errorCode defined. This hack is required because it informs the client
        that it does not, in fact, have to account for a missing errorCode, wrappedError, or errorInfo.
        """
        schema["required"].extend(["errorCode", "wrappedErrors", "errorInfo"])

    id: str = Field(..., description="Unique identifier of this error occurrence.")
    createdAt: datetime = Field(..., description="When the error occurred.")

    # Our Python should probably always set this to False--if we want it to be True,
    # we should probably be using a more specific subclass of ErrorOccurrence anyway.
    # However, we can't make this Literal[False], because we want this class to be able
    # to act as a catch-all for parsing defined errors that might be missing some
    # `errorInfo` fields because they were serialized by older software.
    isDefined: bool = Field(
        # default=False for database backwards compatibility, so we can parse objects
        # serialized before isDefined existed.
        default=False,
        description=dedent(
            """\
            Whether this error is *defined.*

            *Defined* errors have a strictly defined cause and effect, and we generally
            design them to be recoverable. For example, a `pickUpTip` command might
            return a `tipPhysicallyMissing` error, which is defined, and which you can
            recover from by doing a new `pickUpTip` in a different location.

            The `errorType` and `errorInfo` fields are useful for reacting to defined
            errors.

            *Undefined* errors are everything else. They could represent more obscure
            hardware failures that we aren't handling yet, or just bugs in our software.
            You can continue issuing commands to a run after it encounters an undefined
            error, but the robot may not behave well. For example, if a movement command
            fails with an undefined error, it could leave the robot in a messed-up
            state, and the next movement command could have bad path planning that
            collides the pipettes with stuff on the deck. We allow you to take this risk
            because it's sometimes better than safely stopping the run, which can
            waste time and reagents.
            """
        ),
    )

    errorType: str = Field(
        ...,
        description=dedent(
            """\
            This field has two meanings.

            When `isDefined` is `true`, this is a machine- and developer-readable
            identifier for what kind of error this is. You can use this to implement
            interactive error recovery flows, like watching for `"overpressure"` errors
            so you can tell the operator to unclog the tip.

            When `isDefined` is `false`, this is deprecated. For historical reasons,
            it will be the Python class name of some internal exception,
            like `"KeyError"` or `"UnexpectedProtocolError"`. The string values are not
            stable across software versions. If you're looking for something to show to
            robot operators, use `errorCode` and `detail` instead.
            """
        ),
    )

    errorCode: str = Field(
        default=ErrorCodes.GENERAL_ERROR.value.code,
        description=dedent(
            """\
            An enumerated error code for the error type.
            This is intended to be shown to the robot operator to direct them to the
            correct rough area for troubleshooting.
            """
        ),
    )

    detail: str = Field(
        ...,
        description=dedent(
            """\
            A short human-readable message about the error.

            This is intended to provide the robot operator with more specific details than
            `errorCode` alone. It should be no longer than a couple of sentences,
            and it should not contain internal newlines or indentation.

            It should not internally repeat `errorCode`, but it may internally repeat `errorType`
            if it helps the message make sense when it's displayed in its own separate block.
            """
        ),
    )

    errorInfo: Mapping[str, object] = Field(
        default={},
        description=dedent(
            """\
            Specific structured details about the error that may be useful for
            determining what happened.

            This might contain the same information as `detail` in a more structured form.
            It might also contain additional information that was too verbose or technical
            to put in `detail`.

            If `isDefined` is `true`, this object may have guaranteed contents, depending
            on `errorType`. If `isDefined` is `false`, you should not rely on any
            particular contents.
            """
        ),
    )

    wrappedErrors: List["ErrorOccurrence"] = Field(
        default=[], description="Errors that may have caused this one."
    )

    model_config = ConfigDict(json_schema_extra=schema_extra)


# TODO (tz, 7-12-23): move this to exceptions.py when we stop relaying on ErrorOccurrence.
class ProtocolCommandFailedError(ProtocolEngineError):
    """Raised if a fatal command execution error has occurred."""

    def __init__(
        self,
        original_error: Optional[ErrorOccurrence] = None,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ProtocolCommandFailedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)
        self.original_error = original_error


ErrorOccurrence.model_rebuild()
