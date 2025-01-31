"""Command models for moving any robot axis to an absolute position."""
from __future__ import annotations
from typing import Literal, Optional, Type, TYPE_CHECKING, Any

from pydantic import Field, BaseModel
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


MoveAxesToCommandType = Literal["robot/moveAxesTo"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class MoveAxesToParams(BaseModel):
    """Payload required to move axes to absolute position."""

    axis_map: MotorAxisMapType = Field(
        ..., description="The specified axes to move to an absolute deck position with."
    )
    critical_point: MotorAxisMapType | SkipJsonSchema[None] = Field(
        default=None,
        description="The critical point to move the mount with.",
        json_schema_extra=_remove_default,
    )
    speed: float | SkipJsonSchema[None] = Field(
        default=None,
        description="The max velocity to move the axes at. Will fall to hardware defaults if none provided.",
        json_schema_extra=_remove_default,
    )


class MoveAxesToResult(DestinationRobotPositionResult):
    """Result data from the execution of a MoveAxesTo command."""

    pass


class MoveAxesToImplementation(
    AbstractCommandImpl[MoveAxesToParams, SuccessData[MoveAxesToResult]]
):
    """MoveAxesTo command implementation."""

    def __init__(
        self,
        gantry_mover: GantryMover,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._gantry_mover = gantry_mover
        self._hardware_api = hardware_api

    async def execute(self, params: MoveAxesToParams) -> SuccessData[MoveAxesToResult]:
        """Move the axes on a flex an absolute distance."""
        # TODO (lc 08-16-2024) implement `move_axes` for OT 2 hardware controller
        # and then we can remove this validation.
        ensure_ot3_hardware(self._hardware_api)
        current_position = await self._gantry_mover.move_axes(
            axis_map=params.axis_map,
            speed=params.speed,
            critical_point=params.critical_point,
        )
        return SuccessData(
            public=MoveAxesToResult(position=current_position),
        )


class MoveAxesTo(BaseCommand[MoveAxesToParams, MoveAxesToResult, ErrorOccurrence]):
    """MoveAxesTo command model."""

    commandType: MoveAxesToCommandType = "robot/moveAxesTo"
    params: MoveAxesToParams
    result: Optional[MoveAxesToResult] = None

    _ImplementationCls: Type[MoveAxesToImplementation] = MoveAxesToImplementation


class MoveAxesToCreate(BaseCommandCreate[MoveAxesToParams]):
    """MoveAxesTo command request model."""

    commandType: MoveAxesToCommandType = "robot/moveAxesTo"
    params: MoveAxesToParams

    _CommandCls: Type[MoveAxesTo] = MoveAxesTo
