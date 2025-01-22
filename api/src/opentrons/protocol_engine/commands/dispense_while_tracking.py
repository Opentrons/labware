"""Dispense command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union, Any
from typing_extensions import Literal


from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from ..state.update_types import StateUpdate, CLEAR
from .pipetting_common import (
    PipetteIdMixin,
    DispenseVolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
    OverpressureError,
    dispense_while_tracking,
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

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView


DispenseWhileTrackingCommandType = Literal["dispenseWhileTracking"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class DispenseWhileTrackingParams(
    PipetteIdMixin,
    DispenseVolumeMixin,
    FlowRateMixin,
    LiquidHandlingWellLocationMixin,
):
    """Payload required to dispense to a specific well."""

    pushOut: float | SkipJsonSchema[None] = Field(
        None,
        description="push the plunger a small amount farther than necessary for accurate low-volume dispensing",
        json_schema_extra=_remove_default,
    )


class DispenseWhileTrackingResult(BaseLiquidHandlingResult, DestinationPositionResult):
    """Result data from the execution of a Dispense command."""

    pass


_ExecuteReturn = Union[
    SuccessData[DispenseWhileTrackingResult],
    DefinedErrorData[OverpressureError] | DefinedErrorData[StallOrCollisionError],
]


class DispenseWhileTrackingImplementation(
    AbstractCommandImpl[DispenseWhileTrackingParams, _ExecuteReturn]
):
    """Dispense command implementation."""

    def __init__(
        self,
        state_view: StateView,
        pipetting: PipettingHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._pipetting = pipetting
        self._model_utils = model_utils

    async def execute(self, params: DispenseWhileTrackingParams) -> _ExecuteReturn:
        """Move to and dispense to the requested well."""
        well_location = params.wellLocation
        labware_id = params.labwareId
        well_name = params.wellName

        # TODO(pbm, 10-15-24): call self._state_view.geometry.validate_dispense_volume_into_well()

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
        dispense_result = await dispense_while_tracking(
            pipette_id=params.pipetteId,
            labware_id=labware_id,
            well_name=well_name,
            volume=params.volume,
            flow_rate=params.flowRate,
            push_out=params.pushOut,
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

        if isinstance(dispense_result, DefinedErrorData):
            return DefinedErrorData(
                public=dispense_result.public,
                state_update=(
                    StateUpdate.reduce(
                        move_result.state_update, dispense_result.state_update
                    ).set_liquid_operated(
                        labware_id=labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            labware_id, well_name, params.pipetteId
                        ),
                        volume_added=CLEAR,
                    )
                ),
                state_update_if_false_positive=StateUpdate.reduce(
                    move_result.state_update,
                    dispense_result.state_update_if_false_positive,
                ),
            )
        else:
            volume_added = (
                self._state_view.pipettes.get_liquid_dispensed_by_ejecting_volume(
                    pipette_id=params.pipetteId, volume=dispense_result.public.volume
                )
            )
            if volume_added is not None:
                volume_added *= self._state_view.geometry.get_nozzles_per_well(
                    labware_id, well_name, params.pipetteId
                )
            return SuccessData(
                public=DispenseWhileTrackingResult(
                    volume=dispense_result.public.volume,
                    position=move_result.public.position,
                ),
                state_update=(
                    StateUpdate.reduce(
                        move_result.state_update, dispense_result.state_update
                    ).set_liquid_operated(
                        labware_id=labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            labware_id, well_name, params.pipetteId
                        ),
                        volume_added=volume_added
                        if volume_added is not None
                        else CLEAR,
                    )
                ),
            )


class DispenseWhileTracking(
    BaseCommand[
        DispenseWhileTrackingParams,
        DispenseWhileTrackingResult,
        OverpressureError | StallOrCollisionError,
    ]
):
    """Dispense command model."""

    commandType: DispenseWhileTrackingCommandType = "dispenseWhileTracking"
    params: DispenseWhileTrackingParams
    result: Optional[DispenseWhileTrackingResult] = None

    _ImplementationCls: Type[
        DispenseWhileTrackingImplementation
    ] = DispenseWhileTrackingImplementation


class DispenseWhileTrackingCreate(BaseCommandCreate[DispenseWhileTrackingParams]):
    """Create dispenseWhileTracking command request model."""

    commandType: DispenseWhileTrackingCommandType = "dispenseWhileTracking"
    params: DispenseWhileTrackingParams

    _CommandCls: Type[DispenseWhileTracking] = DispenseWhileTracking
