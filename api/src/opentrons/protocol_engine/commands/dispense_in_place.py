"""Dispense-in-place command request, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from pydantic import Field

from .pipetting_common import (
    PipetteIdMixin,
    VolumeMixin,
    FlowRateMixin,
    BaseLiquidHandlingResult,
)
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate

if TYPE_CHECKING:
    from ..execution import PipettingHandler


DispenseInPlaceCommandType = Literal["dispenseInPlace"]


class DispenseInPlaceParams(PipetteIdMixin, VolumeMixin, FlowRateMixin):
    """Payload required to dispense in place."""

    pushOut: Optional[float] = Field(
        None, description="perform a small blow out for accurate dispensing"
    )


class DispenseInPlaceResult(BaseLiquidHandlingResult):
    """Result data from the execution of a DispenseInPlace command."""

    pass


class DispenseInPlaceImplementation(
    AbstractCommandImpl[DispenseInPlaceParams, DispenseInPlaceResult]
):
    """DispenseInPlace command implementation."""

    def __init__(self, pipetting: PipettingHandler, **kwargs: object) -> None:
        self._pipetting = pipetting

    async def execute(self, params: DispenseInPlaceParams) -> DispenseInPlaceResult:
        """Dispense without moving the pipette."""
        volume = await self._pipetting.dispense_in_place(
            pipette_id=params.pipetteId,
            volume=params.volume,
            flow_rate=params.flowRate,
            push_out=params.pushOut,
        )
        return DispenseInPlaceResult(volume=volume)


class DispenseInPlace(BaseCommand[DispenseInPlaceParams, DispenseInPlaceResult]):
    """DispenseInPlace command model."""

    commandType: DispenseInPlaceCommandType = "dispenseInPlace"
    params: DispenseInPlaceParams
    result: Optional[DispenseInPlaceResult]

    _ImplementationCls: Type[
        DispenseInPlaceImplementation
    ] = DispenseInPlaceImplementation


class DispenseInPlaceCreate(BaseCommandCreate[DispenseInPlaceParams]):
    """DispenseInPlace command request model."""

    commandType: DispenseInPlaceCommandType = "dispenseInPlace"
    params: DispenseInPlaceParams

    _CommandCls: Type[DispenseInPlace] = DispenseInPlace
