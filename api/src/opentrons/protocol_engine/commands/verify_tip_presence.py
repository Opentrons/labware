"""Verify tip presence command request, result and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import Field, BaseModel
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal

from .pipetting_common import PipetteIdMixin
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

from ..types import TipPresenceStatus, InstrumentSensorId

if TYPE_CHECKING:
    from ..execution import TipHandler


VerifyTipPresenceCommandType = Literal["verifyTipPresence"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class VerifyTipPresenceParams(PipetteIdMixin):
    """Payload required for a VerifyTipPresence command."""

    expectedState: TipPresenceStatus = Field(
        ..., description="The expected tip presence status on the pipette."
    )
    followSingularSensor: InstrumentSensorId | SkipJsonSchema[None] = Field(
        default=None,
        description="The sensor id to follow if the other can be ignored.",
        json_schema_extra=_remove_default,
    )


class VerifyTipPresenceResult(BaseModel):
    """Result data from the execution of a VerifyTipPresence command."""

    pass


class VerifyTipPresenceImplementation(
    AbstractCommandImpl[VerifyTipPresenceParams, SuccessData[VerifyTipPresenceResult]]
):
    """VerifyTipPresence command implementation."""

    def __init__(
        self,
        tip_handler: TipHandler,
        **kwargs: object,
    ) -> None:
        self._tip_handler = tip_handler

    async def execute(
        self, params: VerifyTipPresenceParams
    ) -> SuccessData[VerifyTipPresenceResult]:
        """Verify if tip presence is as expected for the requested pipette."""
        pipette_id = params.pipetteId
        expected_state = params.expectedState
        follow_singular_sensor = (
            InstrumentSensorId.to_instrument_probe_type(params.followSingularSensor)
            if params.followSingularSensor
            else None
        )

        await self._tip_handler.verify_tip_presence(
            pipette_id=pipette_id,
            expected=expected_state,
            follow_singular_sensor=follow_singular_sensor,
        )

        return SuccessData(
            public=VerifyTipPresenceResult(),
        )


class VerifyTipPresence(
    BaseCommand[VerifyTipPresenceParams, VerifyTipPresenceResult, ErrorOccurrence]
):
    """VerifyTipPresence command model."""

    commandType: VerifyTipPresenceCommandType = "verifyTipPresence"
    params: VerifyTipPresenceParams
    result: Optional[VerifyTipPresenceResult] = None

    _ImplementationCls: Type[
        VerifyTipPresenceImplementation
    ] = VerifyTipPresenceImplementation


class VerifyTipPresenceCreate(BaseCommandCreate[VerifyTipPresenceParams]):
    """VerifyTipPresence command creation request model."""

    commandType: VerifyTipPresenceCommandType = "verifyTipPresence"
    params: VerifyTipPresenceParams

    _CommandCls: Type[VerifyTipPresence] = VerifyTipPresence
