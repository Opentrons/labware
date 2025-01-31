"""Evotip Dispense-in-place command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal

from opentrons.protocol_engine.errors import UnsupportedLabwareForActionError
from .pipetting_common import (
    PipetteIdMixin,
    FlowRateMixin,
    DispenseVolumeMixin,
    BaseLiquidHandlingResult,
    dispense_in_place,
)
from .movement_common import (
    LiquidHandlingWellLocationMixin,
    StallOrCollisionError,
    move_to_well,
)

from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ..state.update_types import StateUpdate
from ..resources import labware_validation
from ..errors import ProtocolEngineError

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover, MovementHandler
    from ..resources import ModelUtils
    from ..state.state import StateView


EvotipDispenseCommandType = Literal["evotipDispense"]


class EvotipDispenseParams(
    PipetteIdMixin, DispenseVolumeMixin, FlowRateMixin, LiquidHandlingWellLocationMixin
):
    """Payload required to dispense in place."""

    pass


class EvotipDispenseResult(BaseLiquidHandlingResult):
    """Result data from the execution of a DispenseInPlace command."""

    pass


_ExecuteReturn = Union[
    SuccessData[EvotipDispenseResult],
    DefinedErrorData[StallOrCollisionError],
]


class EvotipDispenseImplementation(
    AbstractCommandImpl[EvotipDispenseParams, _ExecuteReturn]
):
    """DispenseInPlace command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        state_view: StateView,
        gantry_mover: GantryMover,
        model_utils: ModelUtils,
        movement: MovementHandler,
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._gantry_mover = gantry_mover
        self._model_utils = model_utils
        self._movement = movement

    async def execute(self, params: EvotipDispenseParams) -> _ExecuteReturn:
        """Move to and dispense to the requested well."""
        well_location = params.wellLocation
        labware_id = params.labwareId
        well_name = params.wellName

        labware_definition = self._state_view.labware.get_definition(params.labwareId)
        if not labware_validation.is_evotips(labware_definition.parameters.loadName):
            raise UnsupportedLabwareForActionError(
                f"Cannot use command: `EvotipDispense` with labware: {labware_definition.parameters.loadName}"
            )
        move_result = await move_to_well(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=params.pipetteId,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        if isinstance(move_result, DefinedErrorData):
            return move_result

        current_position = await self._gantry_mover.get_position(params.pipetteId)
        result = await dispense_in_place(
            pipette_id=params.pipetteId,
            volume=params.volume,
            flow_rate=params.flowRate,
            push_out=None,
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
            # TODO (chb, 2025-01-29): Remove this and the OverpressureError returns once disabled for this function
            raise ProtocolEngineError(
                message="Overpressure Error during Resin Tip Dispense Command."
            )
        return SuccessData(
            public=EvotipDispenseResult(volume=result.public.volume),
            state_update=StateUpdate.reduce(
                move_result.state_update, result.state_update
            ),
        )


class EvotipDispense(
    BaseCommand[
        EvotipDispenseParams,
        EvotipDispenseResult,
        StallOrCollisionError,
    ]
):
    """DispenseInPlace command model."""

    commandType: EvotipDispenseCommandType = "evotipDispense"
    params: EvotipDispenseParams
    result: Optional[EvotipDispenseResult] = None

    _ImplementationCls: Type[
        EvotipDispenseImplementation
    ] = EvotipDispenseImplementation


class EvotipDispenseCreate(BaseCommandCreate[EvotipDispenseParams]):
    """DispenseInPlace command request model."""

    commandType: EvotipDispenseCommandType = "evotipDispense"
    params: EvotipDispenseParams

    _CommandCls: Type[EvotipDispense] = EvotipDispense
