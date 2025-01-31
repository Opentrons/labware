"""Command models to blow out in place while plunger positions are unknown."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from pydantic import BaseModel

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..pipetting_common import PipetteIdMixin, FlowRateMixin
from ...resources import ensure_ot3_hardware
from ...errors.error_occurrence import ErrorOccurrence
from ...state import update_types

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import Axis

if TYPE_CHECKING:
    from ...execution import PipettingHandler
    from ...state.state import StateView


UnsafeBlowOutInPlaceCommandType = Literal["unsafe/blowOutInPlace"]


class UnsafeBlowOutInPlaceParams(PipetteIdMixin, FlowRateMixin):
    """Payload required to blow-out in place while position is unknown."""

    pass


class UnsafeBlowOutInPlaceResult(BaseModel):
    """Result data from an UnsafeBlowOutInPlace command."""

    pass


class UnsafeBlowOutInPlaceImplementation(
    AbstractCommandImpl[
        UnsafeBlowOutInPlaceParams, SuccessData[UnsafeBlowOutInPlaceResult]
    ]
):
    """UnsafeBlowOutInPlace command implementation."""

    def __init__(
        self,
        pipetting: PipettingHandler,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._pipetting = pipetting
        self._state_view = state_view
        self._hardware_api = hardware_api

    async def execute(
        self, params: UnsafeBlowOutInPlaceParams
    ) -> SuccessData[UnsafeBlowOutInPlaceResult]:
        """Blow-out without moving the pipette even when position is unknown."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        pipette_location = self._state_view.motion.get_pipette_location(
            params.pipetteId
        )
        await ot3_hardware_api.update_axis_position_estimations(
            [Axis.of_main_tool_actuator(pipette_location.mount.to_hw_mount())]
        )
        await self._pipetting.blow_out_in_place(
            pipette_id=params.pipetteId, flow_rate=params.flowRate
        )
        state_update = update_types.StateUpdate()
        state_update.set_fluid_empty(pipette_id=params.pipetteId)

        return SuccessData(
            public=UnsafeBlowOutInPlaceResult(), state_update=state_update
        )


class UnsafeBlowOutInPlace(
    BaseCommand[UnsafeBlowOutInPlaceParams, UnsafeBlowOutInPlaceResult, ErrorOccurrence]
):
    """UnsafeBlowOutInPlace command model."""

    commandType: UnsafeBlowOutInPlaceCommandType = "unsafe/blowOutInPlace"
    params: UnsafeBlowOutInPlaceParams
    result: Optional[UnsafeBlowOutInPlaceResult] = None

    _ImplementationCls: Type[
        UnsafeBlowOutInPlaceImplementation
    ] = UnsafeBlowOutInPlaceImplementation


class UnsafeBlowOutInPlaceCreate(BaseCommandCreate[UnsafeBlowOutInPlaceParams]):
    """UnsafeBlowOutInPlace command request model."""

    commandType: UnsafeBlowOutInPlaceCommandType = "unsafe/blowOutInPlace"
    params: UnsafeBlowOutInPlaceParams

    _CommandCls: Type[UnsafeBlowOutInPlace] = UnsafeBlowOutInPlace
