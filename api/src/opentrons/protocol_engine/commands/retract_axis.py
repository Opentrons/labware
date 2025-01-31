"""Retract Axis command payload, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from ..state import update_types
from ..types import MotorAxis
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import MovementHandler

RetractAxisCommandType = Literal["retractAxis"]


class RetractAxisParams(BaseModel):
    """Payload required for a Retract Axis command."""

    axis: MotorAxis = Field(
        ...,
        description=(
            "Axis to retract to its home position as quickly as safely possible."
            " The difference between retracting an axis and homing an axis using the"
            " home command is that a home will always probe the limit switch and"
            " will work as the first motion command a robot will need to execute;"
            " On the other hand, retraction will rely on this previously determined "
            " home position to move to it as fast as safely possible."
            " So on the Flex, it will move (fast) the axis to the previously recorded home position"
            " and on the OT2, it will move (fast) the axis a safe distance from the previously"
            " recorded home position, and then slowly approach the limit switch."
        ),
    )


class RetractAxisResult(BaseModel):
    """Result data from the execution of a Rectract Axis command."""


class RetractAxisImplementation(
    AbstractCommandImpl[RetractAxisParams, SuccessData[RetractAxisResult]]
):
    """Retract Axis command implementation."""

    def __init__(self, movement: MovementHandler, **kwargs: object) -> None:
        self._movement = movement

    async def execute(
        self, params: RetractAxisParams
    ) -> SuccessData[RetractAxisResult]:
        """Retract the specified axis."""
        state_update = update_types.StateUpdate()
        await self._movement.retract_axis(axis=params.axis)
        state_update.clear_all_pipette_locations()
        return SuccessData(public=RetractAxisResult(), state_update=state_update)


class RetractAxis(BaseCommand[RetractAxisParams, RetractAxisResult, ErrorOccurrence]):
    """Command to retract the specified axis to its home position."""

    commandType: RetractAxisCommandType = "retractAxis"
    params: RetractAxisParams
    result: Optional[RetractAxisResult] = None

    _ImplementationCls: Type[RetractAxisImplementation] = RetractAxisImplementation


class RetractAxisCreate(BaseCommandCreate[RetractAxisParams]):
    """Data to create a Retract Axis command."""

    commandType: RetractAxisCommandType = "retractAxis"
    params: RetractAxisParams

    _CommandCls: Type[RetractAxis] = RetractAxis
