"""AirGap in place command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal

from opentrons_shared_data.errors.exceptions import PipetteOverpressureError

from opentrons.hardware_control import HardwareControlAPI

from .pipetting_common import (
    PipetteIdMixin,
    AspirateVolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
    OverpressureError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ..errors.error_occurrence import ErrorOccurrence
from ..errors.exceptions import PipetteNotReadyToAspirateError
from ..state.update_types import StateUpdate
from ..types import AspiratedFluid, FluidKind

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView
    from ..notes import CommandNoteAdder

AirGapInPlaceCommandType = Literal["airGapInPlace"]


class AirGapInPlaceParams(PipetteIdMixin, AspirateVolumeMixin, FlowRateMixin):
    """Payload required to air gap in place."""

    pass


class AirGapInPlaceResult(BaseLiquidHandlingResult):
    """Result data from the execution of a AirGapInPlace command."""

    pass


_ExecuteReturn = Union[
    SuccessData[AirGapInPlaceResult],
    DefinedErrorData[OverpressureError],
]


class AirGapInPlaceImplementation(
    AbstractCommandImpl[AirGapInPlaceParams, _ExecuteReturn]
):
    """AirGapInPlace command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        hardware_api: HardwareControlAPI,
        state_view: StateView,
        command_note_adder: CommandNoteAdder,
        model_utils: ModelUtils,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._hardware_api = hardware_api
        self._command_note_adder = command_note_adder
        self._model_utils = model_utils
        self._gantry_mover = gantry_mover

    async def execute(self, params: AirGapInPlaceParams) -> _ExecuteReturn:
        """Air gap without moving the pipette.

        Raises:
            TipNotAttachedError: if no tip is attached to the pipette.
            PipetteNotReadyToAirGapError: pipette plunger is not ready.
        """
        ready_to_aspirate = self._pipetting.get_is_ready_to_aspirate(
            pipette_id=params.pipetteId,
        )

        if not ready_to_aspirate:
            raise PipetteNotReadyToAspirateError(
                "Pipette cannot air gap in place because of a previous blow out."
                " The first aspirate following a blow-out must be from a specific well"
                " so the plunger can be reset in a known safe position."
            )

        state_update = StateUpdate()

        try:
            current_position = await self._gantry_mover.get_position(params.pipetteId)
            volume = await self._pipetting.aspirate_in_place(
                pipette_id=params.pipetteId,
                volume=params.volume,
                flow_rate=params.flowRate,
                command_note_adder=self._command_note_adder,
            )
        except PipetteOverpressureError as e:
            return DefinedErrorData(
                public=OverpressureError(
                    id=self._model_utils.generate_id(),
                    createdAt=self._model_utils.get_timestamp(),
                    wrappedErrors=[
                        ErrorOccurrence.from_failed(
                            id=self._model_utils.generate_id(),
                            createdAt=self._model_utils.get_timestamp(),
                            error=e,
                        )
                    ],
                    errorInfo=(
                        {
                            "retryLocation": (
                                current_position.x,
                                current_position.y,
                                current_position.z,
                            )
                        }
                    ),
                ),
                state_update=state_update,
            )
        else:
            state_update.set_fluid_aspirated(
                pipette_id=params.pipetteId,
                fluid=AspiratedFluid(kind=FluidKind.AIR, volume=volume),
            )
            return SuccessData(
                public=AirGapInPlaceResult(volume=volume),
                state_update=state_update,
            )


class AirGapInPlace(
    BaseCommand[AirGapInPlaceParams, AirGapInPlaceResult, OverpressureError]
):
    """AirGapInPlace command model."""

    commandType: AirGapInPlaceCommandType = "airGapInPlace"
    params: AirGapInPlaceParams
    result: Optional[AirGapInPlaceResult] = None

    _ImplementationCls: Type[AirGapInPlaceImplementation] = AirGapInPlaceImplementation


class AirGapInPlaceCreate(BaseCommandCreate[AirGapInPlaceParams]):
    """AirGapInPlace command request model."""

    commandType: AirGapInPlaceCommandType = "airGapInPlace"
    params: AirGapInPlaceParams

    _CommandCls: Type[AirGapInPlace] = AirGapInPlace
