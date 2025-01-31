"""Blow-out command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal


from .pipetting_common import (
    OverpressureError,
    PipetteIdMixin,
    FlowRateMixin,
    blow_out_in_place,
)
from .movement_common import (
    WellLocationMixin,
    DestinationPositionResult,
    move_to_well,
    StallOrCollisionError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..state.update_types import StateUpdate

from opentrons.hardware_control import HardwareControlAPI


if TYPE_CHECKING:
    from ..execution import MovementHandler, PipettingHandler
    from ..state.state import StateView
    from ..resources import ModelUtils


BlowOutCommandType = Literal["blowout"]


class BlowOutParams(PipetteIdMixin, FlowRateMixin, WellLocationMixin):
    """Payload required to blow-out a specific well."""

    pass


class BlowOutResult(DestinationPositionResult):
    """Result data from the execution of a blow-out command."""

    pass


_ExecuteReturn = Union[
    SuccessData[BlowOutResult],
    DefinedErrorData[OverpressureError] | DefinedErrorData[StallOrCollisionError],
]


class BlowOutImplementation(AbstractCommandImpl[BlowOutParams, _ExecuteReturn]):
    """BlowOut command implementation."""

    def __init__(
        self,
        movement: MovementHandler,
        pipetting: PipettingHandler,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._movement = movement
        self._pipetting = pipetting
        self._state_view = state_view
        self._hardware_api = hardware_api
        self._model_utils = model_utils

    async def execute(self, params: BlowOutParams) -> _ExecuteReturn:
        """Move to and blow-out the requested well."""
        move_result = await move_to_well(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=params.pipetteId,
            labware_id=params.labwareId,
            well_name=params.wellName,
            well_location=params.wellLocation,
        )
        if isinstance(move_result, DefinedErrorData):
            return move_result
        blow_out_result = await blow_out_in_place(
            pipette_id=params.pipetteId,
            flow_rate=params.flowRate,
            location_if_error={
                "retryLocation": (
                    move_result.public.position.x,
                    move_result.public.position.y,
                    move_result.public.position.z,
                )
            },
            pipetting=self._pipetting,
            model_utils=self._model_utils,
        )
        if isinstance(blow_out_result, DefinedErrorData):
            return DefinedErrorData(
                public=blow_out_result.public,
                state_update=StateUpdate.reduce(
                    move_result.state_update, blow_out_result.state_update
                ),
                state_update_if_false_positive=StateUpdate.reduce(
                    move_result.state_update,
                    blow_out_result.state_update_if_false_positive,
                ),
            )
        else:
            return SuccessData(
                public=BlowOutResult(position=move_result.public.position),
                state_update=StateUpdate.reduce(
                    move_result.state_update, blow_out_result.state_update
                ),
            )


class BlowOut(
    BaseCommand[
        BlowOutParams,
        BlowOutResult,
        OverpressureError | StallOrCollisionError,
    ]
):
    """Blow-out command model."""

    commandType: BlowOutCommandType = "blowout"
    params: BlowOutParams
    result: Optional[BlowOutResult] = None

    _ImplementationCls: Type[BlowOutImplementation] = BlowOutImplementation


class BlowOutCreate(BaseCommandCreate[BlowOutParams]):
    """Create blow-out command request model."""

    commandType: BlowOutCommandType = "blowout"
    params: BlowOutParams

    _CommandCls: Type[BlowOut] = BlowOut
