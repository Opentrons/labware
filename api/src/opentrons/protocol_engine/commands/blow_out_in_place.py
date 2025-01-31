"""Blow-out in place command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal
from pydantic import BaseModel

from .pipetting_common import (
    OverpressureError,
    PipetteIdMixin,
    FlowRateMixin,
    blow_out_in_place,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..errors.error_occurrence import ErrorOccurrence

from opentrons.hardware_control import HardwareControlAPI


if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..state.state import StateView
    from ..resources import ModelUtils


BlowOutInPlaceCommandType = Literal["blowOutInPlace"]


class BlowOutInPlaceParams(PipetteIdMixin, FlowRateMixin):
    """Payload required to blow-out in place."""

    pass


class BlowOutInPlaceResult(BaseModel):
    """Result data from the execution of a BlowOutInPlace command."""

    pass


_ExecuteReturn = Union[
    SuccessData[BlowOutInPlaceResult],
    DefinedErrorData[OverpressureError],
]


class BlowOutInPlaceImplementation(
    AbstractCommandImpl[BlowOutInPlaceParams, _ExecuteReturn]
):
    """BlowOutInPlace command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        model_utils: ModelUtils,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._hardware_api = hardware_api
        self._model_utils = model_utils
        self._gantry_mover = gantry_mover

    async def execute(self, params: BlowOutInPlaceParams) -> _ExecuteReturn:
        """Blow-out without moving the pipette."""
        current_position = await self._gantry_mover.get_position(params.pipetteId)
        result = await blow_out_in_place(
            pipette_id=params.pipetteId,
            flow_rate=params.flowRate,
            location_if_error={
                "retryLocation": (
                    current_position.x,
                    current_position.y,
                    current_position.z,
                )
            },
            pipetting=self._pipetting,
            model_utils=self._model_utils,
        )
        if isinstance(result, DefinedErrorData):
            return result
        return SuccessData(
            public=BlowOutInPlaceResult(), state_update=result.state_update
        )


class BlowOutInPlace(
    BaseCommand[BlowOutInPlaceParams, BlowOutInPlaceResult, ErrorOccurrence]
):
    """BlowOutInPlace command model."""

    commandType: BlowOutInPlaceCommandType = "blowOutInPlace"
    params: BlowOutInPlaceParams
    result: Optional[BlowOutInPlaceResult] = None

    _ImplementationCls: Type[
        BlowOutInPlaceImplementation
    ] = BlowOutInPlaceImplementation


class BlowOutInPlaceCreate(BaseCommandCreate[BlowOutInPlaceParams]):
    """BlowOutInPlace command request model."""

    commandType: BlowOutInPlaceCommandType = "blowOutInPlace"
    params: BlowOutInPlaceParams

    _CommandCls: Type[BlowOutInPlace] = BlowOutInPlace
