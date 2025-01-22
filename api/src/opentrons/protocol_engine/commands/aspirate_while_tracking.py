"""Aspirate command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal

from .pipetting_common import (
    OverpressureError,
    PipetteIdMixin,
    AspirateVolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
    aspirate_while_tracking,
)
from .movement_common import (
    LiquidHandlingWellLocationMixin,
    DestinationPositionResult,
    StallOrCollisionError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..errors.exceptions import PipetteNotReadyToAspirateError
from opentrons.hardware_control import HardwareControlAPI
from ..state.update_types import CLEAR
from ..types import CurrentWell, DeckPoint

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView
    from ..notes import CommandNoteAdder


AspirateWhileTrackingCommandType = Literal["aspirateWhileTracking"]


class AspirateWhileTrackingParams(
    PipetteIdMixin,
    AspirateVolumeMixin,
    FlowRateMixin,
    LiquidHandlingWellLocationMixin,
):
    """Parameters required to aspirate from a specific well."""

    pass


class AspirateWhileTrackingResult(BaseLiquidHandlingResult, DestinationPositionResult):
    """Result data from execution of an Aspirate command."""

    pass


_ExecuteReturn = Union[
    SuccessData[AspirateWhileTrackingResult],
    DefinedErrorData[OverpressureError] | DefinedErrorData[StallOrCollisionError],
]


class AspirateWhileTrackingImplementation(
    AbstractCommandImpl[AspirateWhileTrackingParams, _ExecuteReturn]
):
    """AspirateWhileTracking command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
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

    async def execute(self, params: AspirateWhileTrackingParams) -> _ExecuteReturn:
        """Move to and aspirate from the requested well.

        Raises:
            TipNotAttachedError: if no tip is attached to the pipette.
            PipetteNotReadyToAspirateError: pipette plunger is not ready.
        """
        ready_to_aspirate = self._pipetting.get_is_ready_to_aspirate(
            pipette_id=params.pipetteId,
        )
        if not ready_to_aspirate:
            raise PipetteNotReadyToAspirateError(
                "Pipette cannot aspirate while tracking because of a previous blow out."
                " The first aspirate following a blow-out must be from a specific well"
                " so the plunger can be reset in a known safe position."
            )

        current_position = await self._gantry_mover.get_position(params.pipetteId)
        current_location = self._state_view.pipettes.get_current_location()

        aspirate_result = await aspirate_while_tracking(
            pipette_id=params.pipetteId,
            labware_id=params.labwareId,
            well_name=params.wellName,
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
        position_after_aspirate = await self._gantry_mover.get_position(
            params.pipetteId
        )
        result_deck_point = DeckPoint.model_construct(
            x=position_after_aspirate.x,
            y=position_after_aspirate.y,
            z=position_after_aspirate.z,
        )
        if isinstance(aspirate_result, DefinedErrorData):
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                return DefinedErrorData(
                    public=aspirate_result.public,
                    state_update=aspirate_result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=CLEAR,
                    ),
                    state_update_if_false_positive=aspirate_result.state_update_if_false_positive,
                )
            else:
                return aspirate_result
        else:
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                return SuccessData(
                    public=AspirateWhileTrackingResult(
                        volume=aspirate_result.public.volume,
                        position=result_deck_point,
                    ),
                    state_update=aspirate_result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=-aspirate_result.public.volume
                        * self._state_view.geometry.get_nozzles_per_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                    ),
                )
            else:
                return SuccessData(
                    public=AspirateWhileTrackingResult(
                        volume=aspirate_result.public.volume,
                        position=result_deck_point,
                    ),
                    state_update=aspirate_result.state_update,
                )


class AspirateWhileTracking(
    BaseCommand[
        AspirateWhileTrackingParams,
        AspirateWhileTrackingResult,
        OverpressureError | StallOrCollisionError,
    ]
):
    """AspirateWhileTracking command model."""

    commandType: AspirateWhileTrackingCommandType = "aspirateWhileTracking"
    params: AspirateWhileTrackingParams
    result: Optional[AspirateWhileTrackingResult] = None

    _ImplementationCls: Type[
        AspirateWhileTrackingImplementation
    ] = AspirateWhileTrackingImplementation


class AspirateWhileTrackingCreate(BaseCommandCreate[AspirateWhileTrackingParams]):
    """Create aspirateWhileTracking command request model."""

    commandType: AspirateWhileTrackingCommandType = "aspirateWhileTracking"
    params: AspirateWhileTrackingParams

    _CommandCls: Type[AspirateWhileTracking] = AspirateWhileTracking
