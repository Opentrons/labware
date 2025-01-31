"""Aspirate in place command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal

from opentrons.hardware_control import HardwareControlAPI

from .pipetting_common import (
    PipetteIdMixin,
    AspirateVolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
    OverpressureError,
    aspirate_in_place,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ..errors.exceptions import PipetteNotReadyToAspirateError
from ..state.update_types import CLEAR
from ..types import CurrentWell

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView
    from ..notes import CommandNoteAdder

AspirateInPlaceCommandType = Literal["aspirateInPlace"]


class AspirateInPlaceParams(PipetteIdMixin, AspirateVolumeMixin, FlowRateMixin):
    """Payload required to aspirate in place."""

    pass


class AspirateInPlaceResult(BaseLiquidHandlingResult):
    """Result data from the execution of a AspirateInPlace command."""

    pass


_ExecuteReturn = Union[
    SuccessData[AspirateInPlaceResult],
    DefinedErrorData[OverpressureError],
]


class AspirateInPlaceImplementation(
    AbstractCommandImpl[AspirateInPlaceParams, _ExecuteReturn]
):
    """AspirateInPlace command implementation."""

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

    async def execute(self, params: AspirateInPlaceParams) -> _ExecuteReturn:
        """Aspirate without moving the pipette.

        Raises:
            TipNotAttachedError: if no tip is attached to the pipette.
            PipetteNotReadyToAspirateError: pipette plunger is not ready.
        """
        ready_to_aspirate = self._pipetting.get_is_ready_to_aspirate(
            pipette_id=params.pipetteId,
        )
        if not ready_to_aspirate:
            raise PipetteNotReadyToAspirateError(
                "Pipette cannot aspirate in place because of a previous blow out."
                " The first aspirate following a blow-out must be from a specific well"
                " so the plunger can be reset in a known safe position."
            )

        current_position = await self._gantry_mover.get_position(params.pipetteId)
        current_location = self._state_view.pipettes.get_current_location()

        result = await aspirate_in_place(
            pipette_id=params.pipetteId,
            volume=params.volume,
            flow_rate=params.flowRate,
            location_if_error={
                "retryLocation": (
                    current_position.x,
                    current_position.y,
                    current_position.z,
                )
            },
            command_note_adder=self._command_note_adder,
            pipetting=self._pipetting,
            model_utils=self._model_utils,
        )
        if isinstance(result, DefinedErrorData):
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                return DefinedErrorData(
                    public=result.public,
                    state_update=result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=CLEAR,
                    ),
                    state_update_if_false_positive=result.state_update_if_false_positive,
                )
            else:
                return result
        else:
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                return SuccessData(
                    public=AspirateInPlaceResult(volume=result.public.volume),
                    state_update=result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=-result.public.volume
                        * self._state_view.geometry.get_nozzles_per_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                    ),
                )
            else:
                return SuccessData(
                    public=AspirateInPlaceResult(volume=result.public.volume),
                    state_update=result.state_update,
                )


class AspirateInPlace(
    BaseCommand[AspirateInPlaceParams, AspirateInPlaceResult, OverpressureError]
):
    """AspirateInPlace command model."""

    commandType: AspirateInPlaceCommandType = "aspirateInPlace"
    params: AspirateInPlaceParams
    result: Optional[AspirateInPlaceResult] = None

    _ImplementationCls: Type[
        AspirateInPlaceImplementation
    ] = AspirateInPlaceImplementation


class AspirateInPlaceCreate(BaseCommandCreate[AspirateInPlaceParams]):
    """AspirateInPlace command request model."""

    commandType: AspirateInPlaceCommandType = "aspirateInPlace"
    params: AspirateInPlaceParams

    _CommandCls: Type[AspirateInPlace] = AspirateInPlace
