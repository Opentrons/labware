"""Get tip presence command request, result and implementation models."""
from __future__ import annotations

from pydantic import Field, BaseModel
from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from .pipetting_common import PipetteIdMixin
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

from ..types import TipPresenceStatus

if TYPE_CHECKING:
    from ..execution import TipHandler


GetTipPresenceCommandType = Literal["getTipPresence"]


class GetTipPresenceParams(PipetteIdMixin):
    """Payload required for a GetTipPresence command."""

    pass


class GetTipPresenceResult(BaseModel):
    """Result data from the execution of a GetTipPresence command."""

    status: TipPresenceStatus = Field(
        ...,
        description=(
            "Whether or not a tip is attached on the pipette. This only works on"
            " on FLEX because OT-2 pipettes do not possess tip presence sensors,"
            " hence, will always return TipPresenceStatus.UNKNOWN."
        ),
    )


class GetTipPresenceImplementation(
    AbstractCommandImpl[GetTipPresenceParams, SuccessData[GetTipPresenceResult]]
):
    """GetTipPresence command implementation."""

    def __init__(
        self,
        tip_handler: TipHandler,
        **kwargs: object,
    ) -> None:
        self._tip_handler = tip_handler

    async def execute(
        self, params: GetTipPresenceParams
    ) -> SuccessData[GetTipPresenceResult]:
        """Verify if tip presence is as expected for the requested pipette."""
        pipette_id = params.pipetteId

        result = await self._tip_handler.get_tip_presence(
            pipette_id=pipette_id,
        )

        return SuccessData(
            public=GetTipPresenceResult(status=result),
        )


class GetTipPresence(
    BaseCommand[GetTipPresenceParams, GetTipPresenceResult, ErrorOccurrence]
):
    """GetTipPresence command model."""

    commandType: GetTipPresenceCommandType = "getTipPresence"
    params: GetTipPresenceParams
    result: Optional[GetTipPresenceResult] = None

    _ImplementationCls: Type[
        GetTipPresenceImplementation
    ] = GetTipPresenceImplementation


class GetTipPresenceCreate(BaseCommandCreate[GetTipPresenceParams]):
    """GetTipPresence command creation request model."""

    commandType: GetTipPresenceCommandType = "getTipPresence"
    params: GetTipPresenceParams

    _CommandCls: Type[GetTipPresence] = GetTipPresence
