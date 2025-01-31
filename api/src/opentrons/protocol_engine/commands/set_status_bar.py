"""setStatusBar command request, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal
import enum

from opentrons.hardware_control.types import StatusBarState
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import StatusBarHandler

SetStatusBarCommandType = Literal["setStatusBar"]


class StatusBarAnimation(enum.Enum):
    """Status Bar animation options."""

    IDLE = "idle"
    CONFIRM = "confirm"
    UPDATING = "updating"
    DISCO = "disco"
    OFF = "off"


def _animation_to_status_bar_state(animation: StatusBarAnimation) -> StatusBarState:
    return {
        StatusBarAnimation.IDLE: StatusBarState.IDLE,
        StatusBarAnimation.CONFIRM: StatusBarState.CONFIRMATION,
        StatusBarAnimation.UPDATING: StatusBarState.UPDATING,
        StatusBarAnimation.DISCO: StatusBarState.DISCO,
        StatusBarAnimation.OFF: StatusBarState.OFF,
    }[animation]


class SetStatusBarParams(BaseModel):
    """Payload required to set the status bar to run an animation."""

    animation: StatusBarAnimation = Field(
        ...,
        description="The animation that should be executed on the status bar.",
    )


class SetStatusBarResult(BaseModel):
    """Result data from the execution of a SetStatusBar command."""


class SetStatusBarImplementation(
    AbstractCommandImpl[SetStatusBarParams, SuccessData[SetStatusBarResult]]
):
    """setStatusBar command implementation."""

    def __init__(self, status_bar: StatusBarHandler, **kwargs: object) -> None:
        self._status_bar = status_bar

    async def execute(
        self, params: SetStatusBarParams
    ) -> SuccessData[SetStatusBarResult]:
        """Execute the setStatusBar command."""
        if not self._status_bar.status_bar_should_not_be_changed():
            state = _animation_to_status_bar_state(params.animation)
            await self._status_bar.set_status_bar(state)
        return SuccessData(
            public=SetStatusBarResult(),
        )


class SetStatusBar(
    BaseCommand[SetStatusBarParams, SetStatusBarResult, ErrorOccurrence]
):
    """setStatusBar command model."""

    commandType: SetStatusBarCommandType = "setStatusBar"
    params: SetStatusBarParams
    result: Optional[SetStatusBarResult] = None

    _ImplementationCls: Type[SetStatusBarImplementation] = SetStatusBarImplementation


class SetStatusBarCreate(BaseCommandCreate[SetStatusBarParams]):
    """setStatusBar command request model."""

    commandType: SetStatusBarCommandType = "setStatusBar"
    params: SetStatusBarParams

    _CommandCls: Type[SetStatusBar] = SetStatusBar
