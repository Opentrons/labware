"""Wait for duration command request, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import RunControlHandler


WaitForDurationCommandType = Literal["waitForDuration"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class WaitForDurationParams(BaseModel):
    """Payload required to pause the protocol."""

    seconds: float = Field(..., description="Duration, in seconds, to wait for.")
    message: str | SkipJsonSchema[None] = Field(
        None,
        description="A user-facing message associated with the pause",
        json_schema_extra=_remove_default,
    )


class WaitForDurationResult(BaseModel):
    """Result data from the execution of a wait for duration command."""


class WaitForDurationImplementation(
    AbstractCommandImpl[WaitForDurationParams, SuccessData[WaitForDurationResult]]
):
    """Wait for duration command implementation."""

    def __init__(self, run_control: RunControlHandler, **kwargs: object) -> None:
        self._run_control = run_control

    async def execute(
        self, params: WaitForDurationParams
    ) -> SuccessData[WaitForDurationResult]:
        """Wait for a duration of time."""
        await self._run_control.wait_for_duration(params.seconds)
        return SuccessData(
            public=WaitForDurationResult(),
        )


class WaitForDuration(
    BaseCommand[WaitForDurationParams, WaitForDurationResult, ErrorOccurrence]
):
    """Wait for duration command model."""

    commandType: WaitForDurationCommandType = "waitForDuration"
    params: WaitForDurationParams
    result: Optional[WaitForDurationResult] = None

    _ImplementationCls: Type[
        WaitForDurationImplementation
    ] = WaitForDurationImplementation


class WaitForDurationCreate(BaseCommandCreate[WaitForDurationParams]):
    """Wait for duration command request model."""

    commandType: WaitForDurationCommandType = "waitForDuration"
    params: WaitForDurationParams

    _CommandCls: Type[WaitForDuration] = WaitForDuration
