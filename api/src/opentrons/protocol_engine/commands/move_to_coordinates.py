"""Move to coordinates command request, result, and implementation models."""
from __future__ import annotations

from pydantic import Field
from typing import Optional, Type, TYPE_CHECKING
from typing_extensions import Literal


from ..types import DeckPoint
from .pipetting_common import PipetteIdMixin
from .movement_common import (
    MovementMixin,
    DestinationPositionResult,
    move_to_coordinates,
    StallOrCollisionError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)

if TYPE_CHECKING:
    from ..execution import MovementHandler
    from ..resources.model_utils import ModelUtils


MoveToCoordinatesCommandType = Literal["moveToCoordinates"]


class MoveToCoordinatesParams(PipetteIdMixin, MovementMixin):
    """Payload required to move a pipette to coordinates."""

    coordinates: DeckPoint = Field(
        ...,
        description="X, Y and Z coordinates in mm from deck's origin location (left-front-bottom corner of work space)",
    )


class MoveToCoordinatesResult(DestinationPositionResult):
    """Result data from the execution of a MoveToCoordinates command."""

    pass


_ExecuteReturn = (
    SuccessData[MoveToCoordinatesResult] | DefinedErrorData[StallOrCollisionError]
)


class MoveToCoordinatesImplementation(
    AbstractCommandImpl[MoveToCoordinatesParams, _ExecuteReturn]
):
    """Move to coordinates command implementation."""

    def __init__(
        self,
        movement: MovementHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._movement = movement
        self._model_utils = model_utils

    async def execute(self, params: MoveToCoordinatesParams) -> _ExecuteReturn:
        """Move the requested pipette to the requested coordinates."""
        result = await move_to_coordinates(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=params.pipetteId,
            deck_coordinates=params.coordinates,
            direct=params.forceDirect,
            additional_min_travel_z=params.minimumZHeight,
            speed=params.speed,
        )
        if isinstance(result, DefinedErrorData):
            return result
        else:
            return SuccessData(
                public=MoveToCoordinatesResult(position=result.public.position),
                state_update=result.state_update,
            )


class MoveToCoordinates(
    BaseCommand[MoveToCoordinatesParams, MoveToCoordinatesResult, StallOrCollisionError]
):
    """Move to well command model."""

    commandType: MoveToCoordinatesCommandType = "moveToCoordinates"
    params: MoveToCoordinatesParams
    result: Optional[MoveToCoordinatesResult] = None

    _ImplementationCls: Type[
        MoveToCoordinatesImplementation
    ] = MoveToCoordinatesImplementation


class MoveToCoordinatesCreate(BaseCommandCreate[MoveToCoordinatesParams]):
    """Move to coordinates command creation request model."""

    commandType: MoveToCoordinatesCommandType = "moveToCoordinates"
    params: MoveToCoordinatesParams

    _CommandCls: Type[MoveToCoordinates] = MoveToCoordinates
