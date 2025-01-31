"""Move to addressable area for drop tip command request, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any
from typing_extensions import Literal

from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from ..errors import LocationNotAccessibleByPipetteError
from ..types import AddressableOffsetVector
from ..resources import fixture_validation
from .pipetting_common import (
    PipetteIdMixin,
)
from .movement_common import (
    MovementMixin,
    DestinationPositionResult,
    move_to_addressable_area,
    StallOrCollisionError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)

if TYPE_CHECKING:
    from ..execution import MovementHandler
    from ..state.state import StateView
    from ..resources.model_utils import ModelUtils

MoveToAddressableAreaForDropTipCommandType = Literal["moveToAddressableAreaForDropTip"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class MoveToAddressableAreaForDropTipParams(PipetteIdMixin, MovementMixin):
    """Payload required to move a pipette to a specific addressable area.

    An *addressable area* is a space in the robot that may or may not be usable depending on how
    the robot's deck is configured. For example, if a Flex is configured with a waste chute, it will
    have additional addressable areas representing the opening of the waste chute, where tips and
    labware can be dropped.

    This moves the pipette so all of its nozzles are centered over the addressable area.
    If the pipette is currently configured with a partial tip layout, this centering is over all
    the pipette's physical nozzles, not just the nozzles that are active.

    The z-position will be chosen to put the bottom of the tips---or the bottom of the nozzles,
    if there are no tips---level with the top of the addressable area.

    When this command is executed, Protocol Engine will make sure the robot's deck is configured
    such that the requested addressable area actually exists. For example, if you request
    the addressable area B4, it will make sure the robot is set up with a B3/B4 staging area slot.
    If that's not the case, the command will fail.
    """

    addressableAreaName: str = Field(
        ...,
        description=(
            "The name of the addressable area that you want to use."
            " Valid values are the `id`s of `addressableArea`s in the"
            " [deck definition](https://github.com/Opentrons/opentrons/tree/edge/shared-data/deck)."
        ),
    )
    offset: AddressableOffsetVector = Field(
        AddressableOffsetVector(x=0, y=0, z=0),
        description="Relative offset of addressable area to move pipette's critical point.",
    )
    alternateDropLocation: bool | SkipJsonSchema[None] = Field(
        False,
        description=(
            "Whether to alternate location where tip is dropped within the addressable area."
            " If True, this command will ignore the offset provided and alternate"
            " between dropping tips at two predetermined locations inside the specified"
            " labware well."
            " If False, the tip will be dropped at the top center of the area."
        ),
        json_schema_extra=_remove_default,
    )
    ignoreTipConfiguration: bool | SkipJsonSchema[None] = Field(
        True,
        description=(
            "Whether to utilize the critical point of the tip configuraiton when moving to an addressable area."
            " If True, this command will ignore the tip configuration and use the center of the entire instrument"
            " as the critical point for movement."
            " If False, this command will use the critical point provided by the current tip configuration."
        ),
        json_schema_extra=_remove_default,
    )


class MoveToAddressableAreaForDropTipResult(DestinationPositionResult):
    """Result data from the execution of a MoveToAddressableAreaForDropTip command."""

    pass


_ExecuteReturn = (
    SuccessData[MoveToAddressableAreaForDropTipResult]
    | DefinedErrorData[StallOrCollisionError]
)


class MoveToAddressableAreaForDropTipImplementation(
    AbstractCommandImpl[MoveToAddressableAreaForDropTipParams, _ExecuteReturn]
):
    """Move to addressable area for drop tip command implementation."""

    def __init__(
        self,
        movement: MovementHandler,
        state_view: StateView,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._movement = movement
        self._state_view = state_view
        self._model_utils = model_utils

    async def execute(
        self, params: MoveToAddressableAreaForDropTipParams
    ) -> _ExecuteReturn:
        """Move the requested pipette to the requested addressable area in preperation of a drop tip."""
        self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
            params.addressableAreaName
        )

        if fixture_validation.is_staging_slot(params.addressableAreaName):
            raise LocationNotAccessibleByPipetteError(
                f"Cannot move pipette to staging slot {params.addressableAreaName}"
            )

        if params.alternateDropLocation:
            offset = self._state_view.geometry.get_next_tip_drop_location_for_addressable_area(
                addressable_area_name=params.addressableAreaName,
                pipette_id=params.pipetteId,
            )
        else:
            offset = params.offset

        result = await move_to_addressable_area(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=params.pipetteId,
            addressable_area_name=params.addressableAreaName,
            offset=offset,
            force_direct=params.forceDirect,
            minimum_z_height=params.minimumZHeight,
            speed=params.speed,
            ignore_tip_configuration=params.ignoreTipConfiguration,
        )
        if isinstance(result, DefinedErrorData):
            return result
        else:
            return SuccessData(
                public=MoveToAddressableAreaForDropTipResult(
                    position=result.public.position,
                ),
                state_update=result.state_update,
            )


class MoveToAddressableAreaForDropTip(
    BaseCommand[
        MoveToAddressableAreaForDropTipParams,
        MoveToAddressableAreaForDropTipResult,
        StallOrCollisionError,
    ]
):
    """Move to addressable area for drop tip command model."""

    commandType: MoveToAddressableAreaForDropTipCommandType = (
        "moveToAddressableAreaForDropTip"
    )
    params: MoveToAddressableAreaForDropTipParams
    result: Optional[MoveToAddressableAreaForDropTipResult] = None

    _ImplementationCls: Type[
        MoveToAddressableAreaForDropTipImplementation
    ] = MoveToAddressableAreaForDropTipImplementation


class MoveToAddressableAreaForDropTipCreate(
    BaseCommandCreate[MoveToAddressableAreaForDropTipParams]
):
    """Move to addressable area for drop tip command creation request model."""

    commandType: MoveToAddressableAreaForDropTipCommandType = (
        "moveToAddressableAreaForDropTip"
    )
    params: MoveToAddressableAreaForDropTipParams

    _CommandCls: Type[MoveToAddressableAreaForDropTip] = MoveToAddressableAreaForDropTip
