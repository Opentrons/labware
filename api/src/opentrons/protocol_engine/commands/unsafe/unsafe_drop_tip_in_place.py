"""Command models to drop tip in place while plunger positions are unknown."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import Field, BaseModel
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import Axis

from opentrons.protocol_engine.state.update_types import StateUpdate
from ..pipetting_common import PipetteIdMixin
from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...resources import ensure_ot3_hardware

if TYPE_CHECKING:
    from ...execution import TipHandler
    from ...state.state import StateView


UnsafeDropTipInPlaceCommandType = Literal["unsafe/dropTipInPlace"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class UnsafeDropTipInPlaceParams(PipetteIdMixin):
    """Payload required to drop a tip in place even if the plunger position is not known."""

    homeAfter: bool | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Whether to home this pipette's plunger after dropping the tip."
            " You should normally leave this unspecified to let the robot choose"
            " a safe default depending on its hardware."
        ),
        json_schema_extra=_remove_default,
    )


class UnsafeDropTipInPlaceResult(BaseModel):
    """Result data from the execution of an UnsafeDropTipInPlace command."""

    pass


class UnsafeDropTipInPlaceImplementation(
    AbstractCommandImpl[
        UnsafeDropTipInPlaceParams, SuccessData[UnsafeDropTipInPlaceResult]
    ]
):
    """Unsafe drop tip in place command implementation."""

    def __init__(
        self,
        tip_handler: TipHandler,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._tip_handler = tip_handler
        self._hardware_api = hardware_api

    async def execute(
        self, params: UnsafeDropTipInPlaceParams
    ) -> SuccessData[UnsafeDropTipInPlaceResult]:
        """Drop a tip using the requested pipette, even if the plunger position is not known."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        pipette_location = self._state_view.motion.get_pipette_location(
            params.pipetteId
        )
        await ot3_hardware_api.update_axis_position_estimations(
            [Axis.of_main_tool_actuator(pipette_location.mount.to_hw_mount())]
        )
        await self._tip_handler.drop_tip(
            pipette_id=params.pipetteId, home_after=params.homeAfter
        )

        state_update = StateUpdate()
        state_update.update_pipette_tip_state(
            pipette_id=params.pipetteId, tip_geometry=None
        )
        state_update.set_fluid_unknown(pipette_id=params.pipetteId)

        return SuccessData(
            public=UnsafeDropTipInPlaceResult(), state_update=state_update
        )


class UnsafeDropTipInPlace(
    BaseCommand[UnsafeDropTipInPlaceParams, UnsafeDropTipInPlaceResult, ErrorOccurrence]
):
    """Drop tip in place command model."""

    commandType: UnsafeDropTipInPlaceCommandType = "unsafe/dropTipInPlace"
    params: UnsafeDropTipInPlaceParams
    result: Optional[UnsafeDropTipInPlaceResult] = None

    _ImplementationCls: Type[
        UnsafeDropTipInPlaceImplementation
    ] = UnsafeDropTipInPlaceImplementation


class UnsafeDropTipInPlaceCreate(BaseCommandCreate[UnsafeDropTipInPlaceParams]):
    """Drop tip in place command creation request model."""

    commandType: UnsafeDropTipInPlaceCommandType = "unsafe/dropTipInPlace"
    params: UnsafeDropTipInPlaceParams

    _CommandCls: Type[UnsafeDropTipInPlace] = UnsafeDropTipInPlace
