"""Move relative (jog) command payload, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal


from ..types import MovementAxis
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from .movement_common import (
    DestinationPositionResult,
    move_relative,
    StallOrCollisionError,
)

if TYPE_CHECKING:
    from ..execution import MovementHandler
    from ..resources.model_utils import ModelUtils


MoveRelativeCommandType = Literal["moveRelative"]


class MoveRelativeParams(BaseModel):
    """Payload required for a MoveRelative command."""

    pipetteId: str = Field(..., description="Pipette to move.")
    axis: MovementAxis = Field(..., description="Axis along which to move.")
    distance: float = Field(
        ...,
        description=(
            "Distance to move in millimeters. A positive number will move"
            " towards the right (x), back (y), top (z) of the deck."
        ),
    )


class MoveRelativeResult(DestinationPositionResult):
    """Result data from the execution of a MoveRelative command."""

    pass


class MoveRelativeImplementation(
    AbstractCommandImpl[
        MoveRelativeParams,
        SuccessData[MoveRelativeResult] | DefinedErrorData[StallOrCollisionError],
    ]
):
    """Move relative command implementation."""

    def __init__(
        self, movement: MovementHandler, model_utils: ModelUtils, **kwargs: object
    ) -> None:
        self._movement = movement
        self._model_utils = model_utils

    async def execute(
        self, params: MoveRelativeParams
    ) -> SuccessData[MoveRelativeResult] | DefinedErrorData[StallOrCollisionError]:
        """Move (jog) a given pipette a relative distance."""
        result = await move_relative(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=params.pipetteId,
            axis=params.axis,
            distance=params.distance,
        )
        if isinstance(result, DefinedErrorData):
            return result
        else:
            return SuccessData(
                public=MoveRelativeResult(position=result.public.position),
                state_update=result.state_update,
            )


class MoveRelative(
    BaseCommand[MoveRelativeParams, MoveRelativeResult, StallOrCollisionError]
):
    """Command to move (jog) a given pipette a relative distance."""

    commandType: MoveRelativeCommandType = "moveRelative"
    params: MoveRelativeParams
    result: Optional[MoveRelativeResult] = None

    _ImplementationCls: Type[MoveRelativeImplementation] = MoveRelativeImplementation


class MoveRelativeCreate(BaseCommandCreate[MoveRelativeParams]):
    """Data to create a MoveRelative command."""

    commandType: MoveRelativeCommandType = "moveRelative"
    params: MoveRelativeParams

    _CommandCls: Type[MoveRelative] = MoveRelative
