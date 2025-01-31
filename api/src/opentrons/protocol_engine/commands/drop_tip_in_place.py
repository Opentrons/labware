"""Drop tip in place command request, result, and implementation models."""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import Field, BaseModel
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from .pipetting_common import PipetteIdMixin, TipPhysicallyAttachedError
from ..errors.exceptions import TipAttachedError
from ..errors.error_occurrence import ErrorOccurrence
from ..resources.model_utils import ModelUtils
from ..state import update_types

if TYPE_CHECKING:
    from ..execution import TipHandler, GantryMover


DropTipInPlaceCommandType = Literal["dropTipInPlace"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class DropTipInPlaceParams(PipetteIdMixin):
    """Payload required to drop a tip in place."""

    homeAfter: bool | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Whether to home this pipette's plunger after dropping the tip."
            " You should normally leave this unspecified to let the robot choose"
            " a safe default depending on its hardware."
        ),
        json_schema_extra=_remove_default,
    )


class DropTipInPlaceResult(BaseModel):
    """Result data from the execution of a DropTipInPlace command."""

    pass


_ExecuteReturn = (
    SuccessData[DropTipInPlaceResult] | DefinedErrorData[TipPhysicallyAttachedError]
)


class DropTipInPlaceImplementation(
    AbstractCommandImpl[DropTipInPlaceParams, _ExecuteReturn]
):
    """Drop tip in place command implementation."""

    def __init__(
        self,
        tip_handler: TipHandler,
        model_utils: ModelUtils,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._tip_handler = tip_handler
        self._model_utils = model_utils
        self._gantry_mover = gantry_mover

    async def execute(self, params: DropTipInPlaceParams) -> _ExecuteReturn:
        """Drop a tip using the requested pipette."""
        state_update = update_types.StateUpdate()

        retry_location = await self._gantry_mover.get_position(params.pipetteId)

        try:
            await self._tip_handler.drop_tip(
                pipette_id=params.pipetteId, home_after=params.homeAfter
            )
        except TipAttachedError as exception:
            state_update_if_false_positive = update_types.StateUpdate()
            state_update_if_false_positive.update_pipette_tip_state(
                pipette_id=params.pipetteId, tip_geometry=None
            )
            state_update.set_fluid_unknown(pipette_id=params.pipetteId)
            error = TipPhysicallyAttachedError(
                id=self._model_utils.generate_id(),
                createdAt=self._model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=self._model_utils.generate_id(),
                        createdAt=self._model_utils.get_timestamp(),
                        error=exception,
                    )
                ],
                errorInfo={"retryLocation": retry_location},
            )
            return DefinedErrorData(
                public=error,
                state_update=state_update,
                state_update_if_false_positive=state_update_if_false_positive,
            )
        else:
            state_update.set_fluid_unknown(pipette_id=params.pipetteId)
            state_update.update_pipette_tip_state(
                pipette_id=params.pipetteId, tip_geometry=None
            )
            return SuccessData(public=DropTipInPlaceResult(), state_update=state_update)


class DropTipInPlace(
    BaseCommand[DropTipInPlaceParams, DropTipInPlaceResult, TipPhysicallyAttachedError]
):
    """Drop tip in place command model."""

    commandType: DropTipInPlaceCommandType = "dropTipInPlace"
    params: DropTipInPlaceParams
    result: Optional[DropTipInPlaceResult] = None

    _ImplementationCls: Type[
        DropTipInPlaceImplementation
    ] = DropTipInPlaceImplementation


class DropTipInPlaceCreate(BaseCommandCreate[DropTipInPlaceParams]):
    """Drop tip in place command creation request model."""

    commandType: DropTipInPlaceCommandType = "dropTipInPlace"
    params: DropTipInPlaceParams

    _CommandCls: Type[DropTipInPlace] = DropTipInPlace
