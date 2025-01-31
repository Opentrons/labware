"""Get next tip command request, result, and implementation models."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Any, Optional, Type, List, Literal, Union

from pydantic.json_schema import SkipJsonSchema

from opentrons.types import NozzleConfigurationType

from ..errors import ErrorOccurrence
from ..types import NextTipInfo, NoTipAvailable, NoTipReason
from .pipetting_common import PipetteIdMixin

from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
)

if TYPE_CHECKING:
    from ..state.state import StateView


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


GetNextTipCommandType = Literal["getNextTip"]


class GetNextTipParams(PipetteIdMixin):
    """Payload needed to resolve the next available tip."""

    labwareIds: List[str] = Field(
        ...,
        description="Labware ID(s) of tip racks to resolve next available tip(s) from"
        " Labware IDs will be resolved sequentially",
    )
    startingTipWell: str | SkipJsonSchema[None] = Field(
        None,
        description="Name of starting tip rack 'well'."
        " This only applies to the first tip rack in the list provided in labwareIDs",
        json_schema_extra=_remove_default,
    )


class GetNextTipResult(BaseModel):
    """Result data from the execution of a GetNextTip."""

    nextTipInfo: Union[NextTipInfo, NoTipAvailable] = Field(
        ...,
        description="Labware ID and well name of next available tip for a pipette,"
        " or information why no tip could be resolved.",
    )


class GetNextTipImplementation(
    AbstractCommandImpl[GetNextTipParams, SuccessData[GetNextTipResult]]
):
    """Get next tip command implementation."""

    def __init__(
        self,
        state_view: StateView,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view

    async def execute(self, params: GetNextTipParams) -> SuccessData[GetNextTipResult]:
        """Get the next available tip for the requested pipette."""
        pipette_id = params.pipetteId
        starting_tip_name = params.startingTipWell

        num_tips = self._state_view.tips.get_pipette_active_channels(pipette_id)
        nozzle_map = self._state_view.tips.get_pipette_nozzle_map(pipette_id)

        if (
            starting_tip_name is not None
            and nozzle_map.configuration != NozzleConfigurationType.FULL
        ):
            # This is to match the behavior found in PAPI, but also because we don't have logic to automatically find
            # the next tip with partial configuration and a starting tip. This will never work for a 96-channel due to
            # x-axis overlap, but could eventually work with 8-channel if we better define starting tip USED or CLEAN
            # state when starting a protocol to prevent accidental tip pick-up with starting non-full tip racks.
            return SuccessData(
                public=GetNextTipResult(
                    nextTipInfo=NoTipAvailable(
                        noTipReason=NoTipReason.STARTING_TIP_WITH_PARTIAL,
                        message="Cannot automatically resolve next tip with starting tip and partial tip configuration.",
                    )
                )
            )

        next_tip: Union[NextTipInfo, NoTipAvailable]
        for labware_id in params.labwareIds:
            well_name = self._state_view.tips.get_next_tip(
                labware_id=labware_id,
                num_tips=num_tips,
                starting_tip_name=starting_tip_name,
                nozzle_map=nozzle_map,
            )
            if well_name is not None:
                next_tip = NextTipInfo(labwareId=labware_id, tipStartingWell=well_name)
                break
            # After the first tip rack is exhausted, starting tip no longer applies
            starting_tip_name = None
        else:
            next_tip = NoTipAvailable(
                noTipReason=NoTipReason.NO_AVAILABLE_TIPS,
                message="No available tips for given pipette, nozzle configuration and provided tip racks.",
            )

        return SuccessData(public=GetNextTipResult(nextTipInfo=next_tip))


class GetNextTip(BaseCommand[GetNextTipParams, GetNextTipResult, ErrorOccurrence]):
    """Get next tip command model."""

    commandType: GetNextTipCommandType = "getNextTip"
    params: GetNextTipParams
    result: Optional[GetNextTipResult] = None

    _ImplementationCls: Type[GetNextTipImplementation] = GetNextTipImplementation


class GetNextTipCreate(BaseCommandCreate[GetNextTipParams]):
    """Get next tip command creation request model."""

    commandType: GetNextTipCommandType = "getNextTip"
    params: GetNextTipParams

    _CommandCls: Type[GetNextTip] = GetNextTip
