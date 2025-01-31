"""Command models for moving any robot mount to a destination point."""
from __future__ import annotations
from typing import Literal, Type, Optional, TYPE_CHECKING, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.types import MountType

from ..movement_common import DestinationPositionResult
from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
)
from opentrons.protocol_engine.types import DeckPoint
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence


if TYPE_CHECKING:
    from opentrons.protocol_engine.execution import MovementHandler


MoveToCommandType = Literal["robot/moveTo"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class MoveToParams(BaseModel):
    """Payload required to move to a destination position."""

    mount: MountType = Field(
        ...,
        description="The mount to move to the destination point.",
    )
    destination: DeckPoint = Field(
        ...,
        description="X, Y and Z coordinates in mm from deck's origin location (left-front-bottom corner of work space)",
    )
    speed: float | SkipJsonSchema[None] = Field(
        default=None,
        description="The max velocity to move the axes at. Will fall to hardware defaults if none provided.",
        json_schema_extra=_remove_default,
    )


class MoveToResult(DestinationPositionResult):
    """Result data from the execution of a MoveTo command."""

    pass


class MoveToImplementation(
    AbstractCommandImpl[MoveToParams, SuccessData[MoveToResult]]
):
    """MoveTo command implementation."""

    def __init__(
        self,
        movement: MovementHandler,
        **kwargs: object,
    ) -> None:
        self._movement = movement

    async def execute(self, params: MoveToParams) -> SuccessData[MoveToResult]:
        """Move to a given destination on a flex."""
        x, y, z = await self._movement.move_mount_to(
            mount=params.mount, destination=params.destination, speed=params.speed
        )
        return SuccessData(
            public=MoveToResult(position=DeckPoint(x=x, y=y, z=z)),
        )


class MoveTo(BaseCommand[MoveToParams, MoveToResult, ErrorOccurrence]):
    """MoveTo command model."""

    commandType: MoveToCommandType = "robot/moveTo"
    params: MoveToParams
    result: Optional[MoveToResult] = None

    _ImplementationCls: Type[MoveToImplementation] = MoveToImplementation


class MoveToCreate(BaseCommandCreate[MoveToParams]):
    """MoveTo command request model."""

    commandType: MoveToCommandType = "robot/moveTo"
    params: MoveToParams

    _CommandCls: Type[MoveTo] = MoveTo
