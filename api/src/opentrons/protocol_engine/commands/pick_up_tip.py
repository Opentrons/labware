"""Pick up tip command request, result, and implementation models."""

from __future__ import annotations
from opentrons_shared_data.errors import ErrorCodes
from pydantic import Field
from typing import TYPE_CHECKING, Optional, Type, Union
from typing_extensions import Literal


from ..errors import ErrorOccurrence, PickUpTipTipNotAttachedError
from ..resources import ModelUtils
from ..state import update_types
from ..types import PickUpTipWellLocation
from .pipetting_common import (
    PipetteIdMixin,
)
from .movement_common import (
    DestinationPositionResult,
    StallOrCollisionError,
    move_to_well,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import MovementHandler, TipHandler


PickUpTipCommandType = Literal["pickUpTip"]


class PickUpTipParams(PipetteIdMixin):
    """Payload needed to move a pipette to a specific well."""

    labwareId: str = Field(..., description="Identifier of labware to use.")
    wellName: str = Field(..., description="Name of well to use in labware.")
    wellLocation: PickUpTipWellLocation = Field(
        default_factory=PickUpTipWellLocation,
        description="Relative well location at which to pick up the tip.",
    )


class PickUpTipResult(DestinationPositionResult):
    """Result data from the execution of a PickUpTip."""

    # Tip volume has a default ONLY for parsing data from earlier versions, which did not include this in the result
    tipVolume: float = Field(
        0,
        description="Maximum volume of liquid that the picked up tip can hold, in µL.",
        ge=0,
    )

    tipLength: float = Field(
        0,
        description="The length of the tip in mm.",
        ge=0,
    )

    tipDiameter: float = Field(
        0,
        description="The diameter of the tip in mm.",
        ge=0,
    )


class TipPhysicallyMissingError(ErrorOccurrence):
    """Returned when sensors determine that no tip was physically picked up.

    That space in the tip rack is marked internally as not having any tip,
    as if the tip were consumed by a pickup.

    The pipette will act as if no tip was picked up. So, you won't be able to aspirate
    anything, and movement commands will assume there is no tip hanging off the bottom
    of the pipette.
    """

    # The thing above about marking the tips as used makes it so that
    # when the protocol is resumed and the Python Protocol API calls
    # `get_next_tip()`, we'll move on to other tips as expected.

    isDefined: bool = True
    errorType: Literal["tipPhysicallyMissing"] = "tipPhysicallyMissing"
    errorCode: str = ErrorCodes.TIP_PICKUP_FAILED.value.code
    detail: str = "No Tip Detected"


_ExecuteReturn = Union[
    SuccessData[PickUpTipResult],
    DefinedErrorData[TipPhysicallyMissingError]
    | DefinedErrorData[StallOrCollisionError],
]


class PickUpTipImplementation(AbstractCommandImpl[PickUpTipParams, _ExecuteReturn]):
    """Pick up tip command implementation."""

    def __init__(
        self,
        state_view: StateView,
        tip_handler: TipHandler,
        model_utils: ModelUtils,
        movement: MovementHandler,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._tip_handler = tip_handler
        self._model_utils = model_utils
        self._movement = movement

    async def execute(
        self, params: PickUpTipParams
    ) -> Union[SuccessData[PickUpTipResult], _ExecuteReturn]:
        """Move to and pick up a tip using the requested pipette."""
        pipette_id = params.pipetteId
        labware_id = params.labwareId
        well_name = params.wellName

        well_location = self._state_view.geometry.convert_pick_up_tip_well_location(
            well_location=params.wellLocation
        )
        move_result = await move_to_well(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        if isinstance(move_result, DefinedErrorData):
            return move_result

        try:
            tip_geometry = await self._tip_handler.pick_up_tip(
                pipette_id=pipette_id,
                labware_id=labware_id,
                well_name=well_name,
            )
        except PickUpTipTipNotAttachedError as e:
            state_update_if_false_positive = (
                update_types.StateUpdate.reduce(
                    update_types.StateUpdate(), move_result.state_update
                )
                .update_pipette_tip_state(
                    pipette_id=pipette_id,
                    tip_geometry=e.tip_geometry,
                )
                .set_fluid_empty(pipette_id=pipette_id)
                .mark_tips_as_used(
                    pipette_id=pipette_id, labware_id=labware_id, well_name=well_name
                )
            )
            state_update = (
                update_types.StateUpdate.reduce(
                    update_types.StateUpdate(), move_result.state_update
                )
                .mark_tips_as_used(
                    pipette_id=pipette_id, labware_id=labware_id, well_name=well_name
                )
                .set_fluid_unknown(pipette_id=pipette_id)
            )
            return DefinedErrorData(
                public=TipPhysicallyMissingError(
                    id=self._model_utils.generate_id(),
                    createdAt=self._model_utils.get_timestamp(),
                    wrappedErrors=[
                        ErrorOccurrence.from_failed(
                            id=self._model_utils.generate_id(),
                            createdAt=self._model_utils.get_timestamp(),
                            error=e,
                        )
                    ],
                ),
                state_update=state_update,
                state_update_if_false_positive=state_update_if_false_positive,
            )
        else:
            state_update = (
                move_result.state_update.update_pipette_tip_state(
                    pipette_id=pipette_id,
                    tip_geometry=tip_geometry,
                )
                .mark_tips_as_used(
                    pipette_id=pipette_id, labware_id=labware_id, well_name=well_name
                )
                .set_fluid_empty(pipette_id=pipette_id)
            )
            return SuccessData(
                public=PickUpTipResult(
                    tipVolume=tip_geometry.volume,
                    tipLength=tip_geometry.length,
                    tipDiameter=tip_geometry.diameter,
                    position=move_result.public.position,
                ),
                state_update=state_update,
            )


class PickUpTip(
    BaseCommand[
        PickUpTipParams,
        PickUpTipResult,
        TipPhysicallyMissingError | StallOrCollisionError,
    ]
):
    """Pick up tip command model."""

    commandType: PickUpTipCommandType = "pickUpTip"
    params: PickUpTipParams
    result: Optional[PickUpTipResult] = None

    _ImplementationCls: Type[PickUpTipImplementation] = PickUpTipImplementation


class PickUpTipCreate(BaseCommandCreate[PickUpTipParams]):
    """Pick up tip command creation request model."""

    commandType: PickUpTipCommandType = "pickUpTip"
    params: PickUpTipParams

    _CommandCls: Type[PickUpTip] = PickUpTip
