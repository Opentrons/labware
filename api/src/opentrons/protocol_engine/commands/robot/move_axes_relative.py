"""Command models for moving any robot axis relative."""

from __future__ import annotations
from typing import Literal, Type, Optional, TYPE_CHECKING, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema
from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_engine.resources import ensure_ot3_hardware

from .common import MotorAxisMapType, DestinationRobotPositionResult

from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
)
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.execution import GantryMover


MoveAxesRelativeCommandType = Literal["robot/moveAxesRelative"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class MoveAxesRelativeParams(BaseModel):
    """Payload required to move axes relative to position."""

    axis_map: MotorAxisMapType = Field(
        ..., description="A dictionary mapping axes to relative movements in mm."
    )
    speed: float | SkipJsonSchema[None] = Field(
        default=None,
        description="The max velocity to move the axes at. Will fall to hardware defaults if none provided.",
        json_schema_extra=_remove_default,
    )


class MoveAxesRelativeResult(DestinationRobotPositionResult):
    """Result data from the execution of a MoveAxesRelative command."""

    pass


class MoveAxesRelativeImplementation(
    AbstractCommandImpl[MoveAxesRelativeParams, SuccessData[MoveAxesRelativeResult]]
):
    """MoveAxesRelative command implementation."""

    def __init__(
        self,
        gantry_mover: GantryMover,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._gantry_mover = gantry_mover
        self._hardware_api = hardware_api

    async def execute(
        self, params: MoveAxesRelativeParams
    ) -> SuccessData[MoveAxesRelativeResult]:
        """Move the axes on a flex a relative distance."""
        # TODO (lc 08-16-2024) implement `move_axes` for OT 2 hardware controller
        # and then we can remove this validation.
        ensure_ot3_hardware(self._hardware_api)

        current_position = await self._gantry_mover.move_axes(
            axis_map=params.axis_map, speed=params.speed, relative_move=True
        )
        return SuccessData(
            public=MoveAxesRelativeResult(position=current_position),
        )


class MoveAxesRelative(
    BaseCommand[MoveAxesRelativeParams, MoveAxesRelativeResult, ErrorOccurrence]
):
    """MoveAxesRelative command model."""

    commandType: MoveAxesRelativeCommandType = "robot/moveAxesRelative"
    params: MoveAxesRelativeParams
    result: Optional[MoveAxesRelativeResult] = None

    _ImplementationCls: Type[
        MoveAxesRelativeImplementation
    ] = MoveAxesRelativeImplementation


class MoveAxesRelativeCreate(BaseCommandCreate[MoveAxesRelativeParams]):
    """MoveAxesRelative command request model."""

    commandType: MoveAxesRelativeCommandType = "robot/moveAxesRelative"
    params: MoveAxesRelativeParams

    _CommandCls: Type[MoveAxesRelative] = MoveAxesRelative
