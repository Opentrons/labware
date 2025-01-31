"""Touch tip command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from typing_extensions import Literal
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.types import Point

from ..errors import (
    TouchTipDisabledError,
    TouchTipIncompatibleArgumentsError,
    LabwareIsTipRackError,
)
from ..types import DeckPoint
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
    DefinedErrorData,
)
from .pipetting_common import (
    PipetteIdMixin,
)
from .movement_common import (
    WellLocationMixin,
    DestinationPositionResult,
    StallOrCollisionError,
    move_to_well,
)

if TYPE_CHECKING:
    from ..execution import MovementHandler, GantryMover
    from ..state.state import StateView
    from ..resources.model_utils import ModelUtils


TouchTipCommandType = Literal["touchTip"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class TouchTipParams(PipetteIdMixin, WellLocationMixin):
    """Payload needed to touch a pipette tip the sides of a specific well."""

    radius: float = Field(
        1.0,
        description=(
            "The proportion of the target well's radius the pipette tip will move towards."
        ),
    )

    mmFromEdge: float | SkipJsonSchema[None] = Field(
        None,
        description="Offset away from the the well edge, in millimeters."
        "Incompatible when a radius is included as a non 1.0 value.",
        json_schema_extra=_remove_default,
    )

    speed: float | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Override the travel speed in mm/s."
            " This controls the straight linear speed of motion."
        ),
        json_schema_extra=_remove_default,
    )


class TouchTipResult(DestinationPositionResult):
    """Result data from the execution of a TouchTip."""

    pass


class TouchTipImplementation(
    AbstractCommandImpl[
        TouchTipParams,
        SuccessData[TouchTipResult] | DefinedErrorData[StallOrCollisionError],
    ]
):
    """Touch tip command implementation."""

    def __init__(
        self,
        state_view: StateView,
        movement: MovementHandler,
        gantry_mover: GantryMover,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._movement = movement
        self._gantry_mover = gantry_mover
        self._model_utils = model_utils

    async def execute(
        self, params: TouchTipParams
    ) -> SuccessData[TouchTipResult] | DefinedErrorData[StallOrCollisionError]:
        """Touch tip to sides of a well using the requested pipette."""
        pipette_id = params.pipetteId
        labware_id = params.labwareId
        well_name = params.wellName

        if params.radius != 1.0 and params.mmFromEdge is not None:
            raise TouchTipIncompatibleArgumentsError(
                "Cannot use mmFromEdge with a radius that is not 1.0"
            )

        if self._state_view.labware.get_has_quirk(labware_id, "touchTipDisabled"):
            raise TouchTipDisabledError(
                f"Touch tip not allowed on labware {labware_id}"
            )

        if self._state_view.labware.is_tiprack(labware_id):
            raise LabwareIsTipRackError("Cannot touch tip on tip rack")

        center_result = await move_to_well(
            movement=self._movement,
            model_utils=self._model_utils,
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=params.wellLocation,
        )
        if isinstance(center_result, DefinedErrorData):
            return center_result

        touch_speed = self._state_view.pipettes.get_movement_speed(
            pipette_id, params.speed
        )

        mm_from_edge = params.mmFromEdge if params.mmFromEdge is not None else 0
        touch_waypoints = self._state_view.motion.get_touch_tip_waypoints(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            radius=params.radius,
            mm_from_edge=mm_from_edge,
            center_point=Point(
                center_result.public.position.x,
                center_result.public.position.y,
                center_result.public.position.z,
            ),
        )

        final_point = await self._gantry_mover.move_to(
            pipette_id=pipette_id,
            waypoints=touch_waypoints,
            speed=touch_speed,
        )
        final_deck_point = DeckPoint.model_construct(
            x=final_point.x, y=final_point.y, z=final_point.z
        )
        state_update = center_result.state_update.set_pipette_location(
            pipette_id=pipette_id,
            new_labware_id=labware_id,
            new_well_name=well_name,
            new_deck_point=final_deck_point,
        )

        return SuccessData(
            public=TouchTipResult(position=final_deck_point),
            state_update=state_update,
        )


class TouchTip(BaseCommand[TouchTipParams, TouchTipResult, StallOrCollisionError]):
    """Touch up tip command model."""

    commandType: TouchTipCommandType = "touchTip"
    params: TouchTipParams
    result: Optional[TouchTipResult] = None

    _ImplementationCls: Type[TouchTipImplementation] = TouchTipImplementation


class TouchTipCreate(BaseCommandCreate[TouchTipParams]):
    """Touch tip command creation request model."""

    commandType: TouchTipCommandType = "touchTip"
    params: TouchTipParams

    _CommandCls: Type[TouchTip] = TouchTip
