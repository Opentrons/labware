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
    prepare_for_aspirate,
)
from .movement_common import (
    LiquidHandlingWellLocationMixin,
    DestinationPositionResult,
    StallOrCollisionError,
    move_to_well,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)

from opentrons.hardware_control import HardwareControlAPI

from ..state.update_types import StateUpdate, CLEAR
from ..types import (
    WellLocation,
    WellOrigin,
    CurrentWell,
)

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
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._hardware_api = hardware_api
        self._command_note_adder = command_note_adder
        self._model_utils = model_utils

    async def execute(self, params: AspirateWhileTrackingParams) -> _ExecuteReturn:
        """Move to and aspirate from the requested well.

        Raises:
            TipNotAttachedError: if no tip is attached to the pipette.
        """
        pipette_id = params.pipetteId
        labware_id = params.labwareId
        well_name = params.wellName
        well_location = params.wellLocation

        state_update = StateUpdate()

        final_location = self._state_view.geometry.get_well_position(
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            operation_volume=-params.volume,
            pipette_id=pipette_id,
        )

        ready_to_aspirate = self._pipetting.get_is_ready_to_aspirate(
            pipette_id=pipette_id
        )

        current_well = None

        if not ready_to_aspirate:
            raise PipetteNotReadyToAspirateError(
                "Pipette cannot aspirate while tracking because of a previous blow out."
                " The first aspirate following a blow-out must be from a specific well"
                " so the plunger can be reset in a known safe position."
            )

        aspirate_result = await aspirate_while_tracking(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            volume=params.volume,
            flow_rate=params.flowRate,
            location_if_error={
                "retryLocation": (
                    move_result.public.position.x,
                    move_result.public.position.y,
                    move_result.public.position.z,
                )
            },
            command_note_adder=self._command_note_adder,
            pipetting=self._pipetting,
            model_utils=self._model_utils,
        )
        state_update.append(aspirate_result.state_update)
        if isinstance(aspirate_result, DefinedErrorData):
            state_update.set_liquid_operated(
                labware_id=labware_id,
                well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                    labware_id,
                    well_name,
                    params.pipetteId,
                ),
                volume_added=CLEAR,
            )
            return DefinedErrorData(
                public=aspirate_result.public, state_update=state_update
            )

        state_update.set_liquid_operated(
            labware_id=labware_id,
            well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                labware_id, well_name, pipette_id
            ),
            volume_added=-aspirate_result.public.volume
            * self._state_view.geometry.get_nozzles_per_well(
                labware_id,
                well_name,
                params.pipetteId,
            ),
        )

        return SuccessData(
            public=AspirateWhileTrackingResult(
                volume=aspirate_result.public.volume,
                position=move_result.public.position,
            ),
            state_update=state_update,
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
