"""Prepare to aspirate command request, result, and implementation models."""

from __future__ import annotations
from pydantic import BaseModel
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal

from .pipetting_common import OverpressureError, PipetteIdMixin, prepare_for_aspirate
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils


PrepareToAspirateCommandType = Literal["prepareToAspirate"]


class PrepareToAspirateParams(PipetteIdMixin):
    """Parameters required to prepare a specific pipette for aspiration."""

    pass


class PrepareToAspirateResult(BaseModel):
    """Result data from execution of an PrepareToAspirate command."""

    pass


_ExecuteReturn = Union[
    SuccessData[PrepareToAspirateResult],
    DefinedErrorData[OverpressureError],
]


class PrepareToAspirateImplementation(
    AbstractCommandImpl[PrepareToAspirateParams, _ExecuteReturn]
):
    """Prepare for aspirate command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        model_utils: ModelUtils,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._pipetting_handler = pipetting
        self._model_utils = model_utils
        self._gantry_mover = gantry_mover

    def _transform_result(
        self, result: SuccessData[BaseModel]
    ) -> SuccessData[PrepareToAspirateResult]:
        return SuccessData(
            public=PrepareToAspirateResult(), state_update=result.state_update
        )

    async def execute(self, params: PrepareToAspirateParams) -> _ExecuteReturn:
        """Prepare the pipette to aspirate."""
        current_position = await self._gantry_mover.get_position(params.pipetteId)
        prepare_result = await prepare_for_aspirate(
            pipette_id=params.pipetteId,
            pipetting=self._pipetting_handler,
            model_utils=self._model_utils,
            location_if_error={
                "retryLocation": (
                    current_position.x,
                    current_position.y,
                    current_position.z,
                )
            },
        )
        if isinstance(prepare_result, DefinedErrorData):
            return prepare_result
        else:
            return SuccessData(
                public=PrepareToAspirateResult(),
                state_update=prepare_result.state_update,
            )


class PrepareToAspirate(
    BaseCommand[PrepareToAspirateParams, PrepareToAspirateResult, ErrorOccurrence]
):
    """Prepare for aspirate command model."""

    commandType: PrepareToAspirateCommandType = "prepareToAspirate"
    params: PrepareToAspirateParams
    result: Optional[PrepareToAspirateResult] = None

    _ImplementationCls: Type[
        PrepareToAspirateImplementation
    ] = PrepareToAspirateImplementation


class PrepareToAspirateCreate(BaseCommandCreate[PrepareToAspirateParams]):
    """Prepare for aspirate command creation request model."""

    commandType: PrepareToAspirateCommandType = "prepareToAspirate"
    params: PrepareToAspirateParams

    _CommandCls: Type[PrepareToAspirate] = PrepareToAspirate
