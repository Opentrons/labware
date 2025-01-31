"""setRailLights command request, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import RailLightsHandler

SetRailLightsCommandType = Literal["setRailLights"]


class SetRailLightsParams(BaseModel):
    """Payload required to set the rail lights on or off."""

    on: bool = Field(
        ...,
        description="The field that determines if the light is turned off or on.",
    )


class SetRailLightsResult(BaseModel):
    """Result data from the execution of a setRailLights command."""

    pass


class SetRailLightsImplementation(
    AbstractCommandImpl[SetRailLightsParams, SuccessData[SetRailLightsResult]]
):
    """setRailLights command implementation."""

    def __init__(self, rail_lights: RailLightsHandler, **kwargs: object) -> None:
        self._rail_lights = rail_lights

    async def execute(
        self, params: SetRailLightsParams
    ) -> SuccessData[SetRailLightsResult]:
        """Dispatch a set lights command setting the state of the rail lights."""
        await self._rail_lights.set_rail_lights(params.on)
        return SuccessData(
            public=SetRailLightsResult(),
        )


class SetRailLights(
    BaseCommand[SetRailLightsParams, SetRailLightsResult, ErrorOccurrence]
):
    """setRailLights command model."""

    commandType: SetRailLightsCommandType = "setRailLights"
    params: SetRailLightsParams
    result: Optional[SetRailLightsResult] = None

    _ImplementationCls: Type[SetRailLightsImplementation] = SetRailLightsImplementation


class SetRailLightsCreate(BaseCommandCreate[SetRailLightsParams]):
    """setRailLights command request model."""

    commandType: SetRailLightsCommandType = "setRailLights"
    params: SetRailLightsParams

    _CommandCls: Type[SetRailLights] = SetRailLights
