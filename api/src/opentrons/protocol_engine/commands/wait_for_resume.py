"""Wait for resume command request, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import RunControlHandler


# NOTE: multiple values accepted for backwards compatibility
# with the 6.0.0-beta.0 release, which used `pause`
WaitForResumeCommandType = Literal["waitForResume", "pause"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class WaitForResumeParams(BaseModel):
    """Payload required to pause the protocol."""

    message: str | SkipJsonSchema[None] = Field(
        None,
        description="A user-facing message associated with the pause",
        json_schema_extra=_remove_default,
    )


class WaitForResumeResult(BaseModel):
    """Result data from the execution of a WaitForResume command."""


class WaitForResumeImplementation(
    AbstractCommandImpl[WaitForResumeParams, SuccessData[WaitForResumeResult]]
):
    """Wait for resume command implementation."""

    def __init__(self, run_control: RunControlHandler, **kwargs: object) -> None:
        self._run_control = run_control

    async def execute(
        self, params: WaitForResumeParams
    ) -> SuccessData[WaitForResumeResult]:
        """Dispatch a PauseAction to the store to pause the protocol."""
        await self._run_control.wait_for_resume()
        return SuccessData(
            public=WaitForResumeResult(),
        )


class WaitForResume(
    BaseCommand[WaitForResumeParams, WaitForResumeResult, ErrorOccurrence]
):
    """Wait for resume command model."""

    commandType: WaitForResumeCommandType = "waitForResume"
    params: WaitForResumeParams
    result: Optional[WaitForResumeResult] = None

    _ImplementationCls: Type[WaitForResumeImplementation] = WaitForResumeImplementation


class WaitForResumeCreate(BaseCommandCreate[WaitForResumeParams]):
    """Wait for resume command request model."""

    commandType: WaitForResumeCommandType = "waitForResume"
    params: WaitForResumeParams

    _CommandCls: Type[WaitForResume] = WaitForResume
