"""Drop tip command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from typing_extensions import Literal

from opentrons.protocol_engine.errors.exceptions import TipAttachedError
from opentrons.protocol_engine.resources.model_utils import ModelUtils

from ..state.update_types import StateUpdate
from ..types import DropTipWellLocation
from .pipetting_common import (
    PipetteIdMixin,
    TipPhysicallyAttachedError,
)
from .movement_common import (
    DestinationPositionResult,
    move_to_well,
    StallOrCollisionError,
)
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import MovementHandler, TipHandler


DropTipCommandType = Literal["dropTip"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class DropTipParams(PipetteIdMixin):
    """Payload required to drop a tip in a specific well."""

    labwareId: str = Field(..., description="Identifier of labware to use.")
    wellName: str = Field(..., description="Name of well to use in labware.")
    wellLocation: DropTipWellLocation = Field(
        default_factory=DropTipWellLocation,
        description="Relative well location at which to drop the tip.",
    )
    homeAfter: bool | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Whether to home this pipette's plunger after dropping the tip."
            " You should normally leave this unspecified to let the robot choose"
            " a safe default depending on its hardware."
        ),
        json_schema_extra=_remove_default,
    )
    alternateDropLocation: bool | SkipJsonSchema[None] = Field(
        False,
        description=(
            "Whether to alternate location where tip is dropped within the labware."
            " If True, this command will ignore the wellLocation provided and alternate"
            " between dropping tips at two predetermined locations inside the specified"
            " labware well."
            " If False, the tip will be dropped at the top center of the well."
        ),
        json_schema_extra=_remove_default,
    )


class DropTipResult(DestinationPositionResult):
    """Result data from the execution of a DropTip command."""

    pass


_ExecuteReturn = (
    SuccessData[DropTipResult]
    | DefinedErrorData[TipPhysicallyAttachedError]
    | DefinedErrorData[StallOrCollisionError]
)


class DropTipImplementation(AbstractCommandImpl[DropTipParams, _ExecuteReturn]):
    """Drop tip command implementation."""

    def __init__(
        self,
        state_view: StateView,
        tip_handler: TipHandler,
        movement: MovementHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._tip_handler = tip_handler
        self._movement_handler = movement
        self._model_utils = model_utils

    async def execute(self, params: DropTipParams) -> _ExecuteReturn:
        """Move to and drop a tip using the requested pipette."""
        pipette_id = params.pipetteId
        labware_id = params.labwareId
        well_name = params.wellName
        home_after = params.homeAfter

        if params.alternateDropLocation:
            well_location = self._state_view.geometry.get_next_tip_drop_location(
                labware_id=labware_id,
                well_name=well_name,
                pipette_id=pipette_id,
            )
        else:
            well_location = params.wellLocation

        is_partially_configured = self._state_view.pipettes.get_is_partially_configured(
            pipette_id=pipette_id
        )
        tip_drop_location = self._state_view.geometry.get_checked_tip_drop_location(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_location=well_location,
            partially_configured=is_partially_configured,
        )

        move_result = await move_to_well(
            movement=self._movement_handler,
            model_utils=self._model_utils,
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=tip_drop_location,
        )
        if isinstance(move_result, DefinedErrorData):
            return move_result

        try:
            await self._tip_handler.drop_tip(
                pipette_id=pipette_id, home_after=home_after
            )
        except TipAttachedError as exception:
            error = TipPhysicallyAttachedError(
                id=self._model_utils.generate_id(),
                createdAt=self._model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=self._model_utils.generate_id(),
                        createdAt=self._model_utils.get_timestamp(),
                        error=exception,
                    )
                ],
                errorInfo={
                    "retryLocation": (
                        move_result.public.position.x,
                        move_result.public.position.y,
                        move_result.public.position.z,
                    )
                },
            )
            return DefinedErrorData(
                public=error,
                state_update=StateUpdate.reduce(
                    StateUpdate(), move_result.state_update
                ).set_fluid_unknown(pipette_id=pipette_id),
                state_update_if_false_positive=move_result.state_update.update_pipette_tip_state(
                    pipette_id=params.pipetteId, tip_geometry=None
                ),
            )
        else:
            return SuccessData(
                public=DropTipResult(position=move_result.public.position),
                state_update=move_result.state_update.set_fluid_unknown(
                    pipette_id=pipette_id
                ).update_pipette_tip_state(
                    pipette_id=params.pipetteId, tip_geometry=None
                ),
            )


class DropTip(
    BaseCommand[
        DropTipParams, DropTipResult, TipPhysicallyAttachedError | StallOrCollisionError
    ]
):
    """Drop tip command model."""

    commandType: DropTipCommandType = "dropTip"
    params: DropTipParams
    result: Optional[DropTipResult] = None

    _ImplementationCls: Type[DropTipImplementation] = DropTipImplementation


class DropTipCreate(BaseCommandCreate[DropTipParams]):
    """Drop tip command creation request model."""

    commandType: DropTipCommandType = "dropTip"
    params: DropTipParams

    _CommandCls: Type[DropTip] = DropTip
