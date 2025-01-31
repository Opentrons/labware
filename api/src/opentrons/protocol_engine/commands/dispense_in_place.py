"""Dispense-in-place command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Union, Any
from typing_extensions import Literal
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from .pipetting_common import (
    PipetteIdMixin,
    DispenseVolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
    OverpressureError,
    dispense_in_place,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from ..state.update_types import CLEAR
from ..types import CurrentWell

if TYPE_CHECKING:
    from ..execution import PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView


DispenseInPlaceCommandType = Literal["dispenseInPlace"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class DispenseInPlaceParams(PipetteIdMixin, DispenseVolumeMixin, FlowRateMixin):
    """Payload required to dispense in place."""

    pushOut: float | SkipJsonSchema[None] = Field(
        None,
        description="push the plunger a small amount farther than necessary for accurate low-volume dispensing",
        json_schema_extra=_remove_default,
    )


class DispenseInPlaceResult(BaseLiquidHandlingResult):
    """Result data from the execution of a DispenseInPlace command."""

    pass


_ExecuteReturn = Union[
    SuccessData[DispenseInPlaceResult],
    DefinedErrorData[OverpressureError],
]


class DispenseInPlaceImplementation(
    AbstractCommandImpl[DispenseInPlaceParams, _ExecuteReturn]
):
    """DispenseInPlace command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        state_view: StateView,
        gantry_mover: GantryMover,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._gantry_mover = gantry_mover
        self._model_utils = model_utils

    async def execute(self, params: DispenseInPlaceParams) -> _ExecuteReturn:
        """Dispense without moving the pipette."""
        current_location = self._state_view.pipettes.get_current_location()
        current_position = await self._gantry_mover.get_position(params.pipetteId)
        result = await dispense_in_place(
            pipette_id=params.pipetteId,
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
                volume_added = (
                    self._state_view.pipettes.get_liquid_dispensed_by_ejecting_volume(
                        pipette_id=params.pipetteId, volume=result.public.volume
                    )
                )
                if volume_added is not None:
                    volume_added *= self._state_view.geometry.get_nozzles_per_well(
                        current_location.labware_id,
                        current_location.well_name,
                        params.pipetteId,
                    )
                return SuccessData(
                    public=DispenseInPlaceResult(volume=result.public.volume),
                    state_update=result.state_update.set_liquid_operated(
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
                    public=DispenseInPlaceResult(volume=result.public.volume),
                    state_update=result.state_update,
                )


class DispenseInPlace(
    BaseCommand[DispenseInPlaceParams, DispenseInPlaceResult, OverpressureError]
):
    """DispenseInPlace command model."""

    commandType: DispenseInPlaceCommandType = "dispenseInPlace"
    params: DispenseInPlaceParams
    result: Optional[DispenseInPlaceResult] = None

    _ImplementationCls: Type[
        DispenseInPlaceImplementation
    ] = DispenseInPlaceImplementation


class DispenseInPlaceCreate(BaseCommandCreate[DispenseInPlaceParams]):
    """DispenseInPlace command request model."""

    commandType: DispenseInPlaceCommandType = "dispenseInPlace"
    params: DispenseInPlaceParams

    _CommandCls: Type[DispenseInPlace] = DispenseInPlace
