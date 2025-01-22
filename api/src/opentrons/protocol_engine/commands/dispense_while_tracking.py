"""Dispense command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union, Any
from typing_extensions import Literal


from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from ..state.update_types import CLEAR
from ..types import CurrentWell, DeckPoint
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
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._pipetting = pipetting
        self._model_utils = model_utils
        self._gantry_mover = gantry_mover

    async def execute(self, params: DispenseWhileTrackingParams) -> _ExecuteReturn:
        """Move to and dispense to the requested well."""
        labware_id = params.labwareId
        well_name = params.wellName

        # TODO(pbm, 10-15-24): call self._state_view.geometry.validate_dispense_volume_into_well()

        current_location = self._state_view.pipettes.get_current_location()
        current_position = await self._gantry_mover.get_position(params.pipetteId)
        dispense_result = await dispense_while_tracking(
            pipette_id=params.pipetteId,
            labware_id=labware_id,
            well_name=well_name,
            volume=params.volume,
            flow_rate=params.flowRate,
            push_out=params.pushOut,
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
        position_after_dispense = await self._gantry_mover.get_position(
            params.pipetteId
        )
        result_deck_point = DeckPoint.model_construct(
            x=position_after_dispense.x,
            y=position_after_dispense.y,
            z=position_after_dispense.z,
        )

        if isinstance(dispense_result, DefinedErrorData):
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                return DefinedErrorData(
                    public=dispense_result.public,
                    state_update=dispense_result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=CLEAR,
                    ),
                    state_update_if_false_positive=dispense_result.state_update_if_false_positive,
                )
            else:
                return dispense_result
        else:
            if (
                isinstance(current_location, CurrentWell)
                and current_location.pipette_id == params.pipetteId
            ):
                volume_added = (
                    self._state_view.pipettes.get_liquid_dispensed_by_ejecting_volume(
                        pipette_id=params.pipetteId,
                        volume=dispense_result.public.volume,
                    )
                )
                if volume_added is not None:
                    volume_added *= self._state_view.geometry.get_nozzles_per_well(
                        current_location.labware_id,
                        current_location.well_name,
                        params.pipetteId,
                    )
                return SuccessData(
                    public=DispenseWhileTrackingResult(
                        volume=dispense_result.public.volume,
                        position=result_deck_point,
                    ),
                    state_update=dispense_result.state_update.set_liquid_operated(
                        labware_id=current_location.labware_id,
                        well_names=self._state_view.geometry.get_wells_covered_by_pipette_with_active_well(
                            current_location.labware_id,
                            current_location.well_name,
                            params.pipetteId,
                        ),
                        volume_added=volume_added
                        if volume_added is not None
                        else CLEAR,
                    ),
                )
            else:
                return SuccessData(
                    public=DispenseWhileTrackingResult(
                        volume=dispense_result.public.volume,
                        position=result_deck_point,
                    ),
                    state_update=dispense_result.state_update,
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
