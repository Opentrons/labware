"""The liquidProbe and tryLiquidProbe commands."""

from __future__ import annotations
from typing import TYPE_CHECKING, NamedTuple, Optional, Type, Union, Any

from typing_extensions import Literal
from pydantic import Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.errors.exceptions import (
    MustHomeError,
    PipetteNotReadyToAspirateError,
    TipNotEmptyError,
    IncompleteLabwareDefinitionError,
    TipNotAttachedError,
)
from opentrons.types import MountType
from opentrons_shared_data.errors.exceptions import (
    PipetteLiquidNotFoundError,
    UnsupportedHardwareCommand,
    PipetteOverpressureError,
)

from ..types import DeckPoint
from .pipetting_common import (
    LiquidNotFoundError,
    PipetteIdMixin,
    OverpressureError,
)
from .movement_common import (
    WellLocationMixin,
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

from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import MovementHandler, PipettingHandler, GantryMover
    from ..resources import ModelUtils
    from ..state.state import StateView


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


LiquidProbeCommandType = Literal["liquidProbe"]
TryLiquidProbeCommandType = Literal["tryLiquidProbe"]


# Both command variants should have identical parameters.
# But we need two separate parameter model classes because
# `command_unions.CREATE_TYPES_BY_PARAMS_TYPE` needs to be a 1:1 mapping.
class _CommonParams(PipetteIdMixin, WellLocationMixin):
    pass


class LiquidProbeParams(_CommonParams):
    """Parameters required for a `liquidProbe` command."""

    pass


class TryLiquidProbeParams(_CommonParams):
    """Parameters required for a `tryLiquidProbe` command."""

    pass


class LiquidProbeResult(DestinationPositionResult):
    """Result data from the execution of a `liquidProbe` command."""

    z_position: float = Field(
        ..., description="The Z coordinate, in mm, of the found liquid in deck space."
    )
    # New fields should use camelCase. z_position is snake_case for historical reasons.


class TryLiquidProbeResult(DestinationPositionResult):
    """Result data from the execution of a `tryLiquidProbe` command."""

    z_position: float | SkipJsonSchema[None] = Field(
        ...,
        description=(
            "The Z coordinate, in mm, of the found liquid in deck space."
            " If no liquid was found, `null` or omitted."
        ),
        json_schema_extra=_remove_default,
    )


_LiquidProbeExecuteReturn = Union[
    SuccessData[LiquidProbeResult],
    DefinedErrorData[LiquidNotFoundError]
    | DefinedErrorData[StallOrCollisionError]
    | DefinedErrorData[OverpressureError],
]
_TryLiquidProbeExecuteReturn = (
    SuccessData[TryLiquidProbeResult]
    | DefinedErrorData[StallOrCollisionError]
    | DefinedErrorData[OverpressureError]
)


class _ExecuteCommonResult(NamedTuple):
    # If the probe succeeded, the z_pos that it returned.
    # Or, if the probe found no liquid, the error representing that,
    # so calling code can propagate those details up.
    z_pos_or_error: float | PipetteLiquidNotFoundError | PipetteOverpressureError

    state_update: update_types.StateUpdate
    deck_point: DeckPoint


async def _execute_common(  # noqa: C901
    state_view: StateView,
    movement: MovementHandler,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
    params: _CommonParams,
) -> _ExecuteCommonResult | DefinedErrorData[StallOrCollisionError] | DefinedErrorData[
    OverpressureError
]:
    pipette_id = params.pipetteId
    labware_id = params.labwareId
    well_name = params.wellName
    if (
        "pressure"
        not in state_view.pipettes.get_config(pipette_id).available_sensors.sensors
    ):
        raise UnsupportedHardwareCommand(
            "Pressure sensor not available for this pipette"
        )

    if not state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id):
        raise TipNotAttachedError(
            "Either the front right or back left nozzle must have a tip attached to probe liquid height."
        )

    # May raise TipNotAttachedError.
    aspirated_volume = state_view.pipettes.get_aspirated_volume(pipette_id)

    if aspirated_volume is None:
        # Theoretically, we could avoid raising an error by automatically preparing
        # to aspirate above the well like AspirateImplementation does. However, the
        # only way for this to happen is if someone tries to do a liquid probe with
        # a tip that's previously held liquid, which they should avoid anyway.
        raise PipetteNotReadyToAspirateError(
            "The pipette cannot probe liquid because of a previous blow out."
            " The plunger must be reset while the tip is somewhere away from liquid."
        )
    elif aspirated_volume != 0:
        raise TipNotEmptyError(
            message="The pipette cannot probe for liquid when the tip has liquid in it."
        )

    if await movement.check_for_valid_position(mount=MountType.LEFT) is False:
        raise MustHomeError(
            message="Current position of pipette is invalid. Please home."
        )

    # liquid_probe process start position
    move_result = await move_to_well(
        movement=movement,
        model_utils=model_utils,
        pipette_id=pipette_id,
        labware_id=labware_id,
        well_name=well_name,
        well_location=params.wellLocation,
    )
    if isinstance(move_result, DefinedErrorData):
        return move_result
    try:
        current_position = await gantry_mover.get_position(params.pipetteId)
        z_pos = await pipetting.liquid_probe_in_place(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=params.wellLocation,
        )
    except PipetteLiquidNotFoundError as exception:
        return _ExecuteCommonResult(
            z_pos_or_error=exception,
            state_update=move_result.state_update,
            deck_point=move_result.public.position,
        )
    except PipetteOverpressureError as e:
        return DefinedErrorData(
            public=OverpressureError(
                id=model_utils.generate_id(),
                createdAt=model_utils.get_timestamp(),
                wrappedErrors=[
                    ErrorOccurrence.from_failed(
                        id=model_utils.generate_id(),
                        createdAt=model_utils.get_timestamp(),
                        error=e,
                    )
                ],
                errorInfo=(
                    {
                        # This is here bc its not optional in the type but we are not using the retry location for this case
                        "retryLocation": (
                            current_position.x,
                            current_position.y,
                            current_position.z,
                        )
                    }
                ),
            ),
            state_update=move_result.state_update.set_fluid_unknown(
                pipette_id=pipette_id
            ),
        )
    else:
        return _ExecuteCommonResult(
            z_pos_or_error=z_pos,
            state_update=move_result.state_update,
            deck_point=move_result.public.position,
        )


class LiquidProbeImplementation(
    AbstractCommandImpl[LiquidProbeParams, _LiquidProbeExecuteReturn]
):
    """The implementation of a `liquidProbe` command."""

    def __init__(
        self,
        state_view: StateView,
        movement: MovementHandler,
        gantry_mover: GantryMover,
        pipetting: PipettingHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._movement = movement
        self._gantry_mover = gantry_mover
        self._pipetting = pipetting
        self._model_utils = model_utils

    async def execute(self, params: _CommonParams) -> _LiquidProbeExecuteReturn:
        """Move to and liquid probe the requested well.

        Return the z-position of the found liquid.
        If no liquid is found, return a LiquidNotFoundError as a defined error.

        Raises:
            TipNotAttachedError: as an undefined error, if there is not tip attached to
                the pipette.
            TipNotEmptyError: as an undefined error, if the tip starts with liquid
                in it.
            PipetteNotReadyToAspirateError: as an undefined error, if the plunger is not
                in a safe position to do the liquid probe.
            MustHomeError: as an undefined error, if the plunger is not in a valid
                position.
        """
        result = await _execute_common(
            state_view=self._state_view,
            movement=self._movement,
            gantry_mover=self._gantry_mover,
            pipetting=self._pipetting,
            model_utils=self._model_utils,
            params=params,
        )
        if isinstance(result, DefinedErrorData):
            return result
        z_pos_or_error, state_update, deck_point = result
        if isinstance(
            z_pos_or_error, (PipetteLiquidNotFoundError, PipetteOverpressureError)
        ):
            state_update.set_liquid_probed(
                labware_id=params.labwareId,
                well_name=params.wellName,
                height=update_types.CLEAR,
                volume=update_types.CLEAR,
                last_probed=self._model_utils.get_timestamp(),
            )
            return DefinedErrorData(
                public=LiquidNotFoundError(
                    id=self._model_utils.generate_id(),
                    createdAt=self._model_utils.get_timestamp(),
                    wrappedErrors=[
                        ErrorOccurrence.from_failed(
                            id=self._model_utils.generate_id(),
                            createdAt=self._model_utils.get_timestamp(),
                            error=z_pos_or_error,
                        )
                    ],
                ),
                state_update=state_update,
            )
        else:
            try:
                well_volume: float | update_types.ClearType = (
                    self._state_view.geometry.get_well_volume_at_height(
                        labware_id=params.labwareId,
                        well_name=params.wellName,
                        height=z_pos_or_error,
                    )
                )
            except IncompleteLabwareDefinitionError:
                well_volume = update_types.CLEAR
            state_update.set_liquid_probed(
                labware_id=params.labwareId,
                well_name=params.wellName,
                height=z_pos_or_error,
                volume=well_volume,
                last_probed=self._model_utils.get_timestamp(),
            )
            return SuccessData(
                public=LiquidProbeResult(
                    z_position=z_pos_or_error, position=deck_point
                ),
                state_update=state_update,
            )


class TryLiquidProbeImplementation(
    AbstractCommandImpl[TryLiquidProbeParams, _TryLiquidProbeExecuteReturn]
):
    """The implementation of a `tryLiquidProbe` command."""

    def __init__(
        self,
        state_view: StateView,
        movement: MovementHandler,
        gantry_mover: GantryMover,
        pipetting: PipettingHandler,
        model_utils: ModelUtils,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._movement = movement
        self._gantry_mover = gantry_mover
        self._pipetting = pipetting
        self._model_utils = model_utils

    async def execute(self, params: _CommonParams) -> _TryLiquidProbeExecuteReturn:
        """Execute a `tryLiquidProbe` command.

        `tryLiquidProbe` is identical to `liquidProbe`, except that if no liquid is
        found, `tryLiquidProbe` returns a success result with `z_position=null` instead
        of a defined error.
        """
        result = await _execute_common(
            state_view=self._state_view,
            movement=self._movement,
            gantry_mover=self._gantry_mover,
            pipetting=self._pipetting,
            model_utils=self._model_utils,
            params=params,
        )
        if isinstance(result, DefinedErrorData):
            return result
        z_pos_or_error, state_update, deck_point = result

        if isinstance(
            z_pos_or_error, (PipetteLiquidNotFoundError, PipetteOverpressureError)
        ):
            z_pos = None
            well_volume: float | update_types.ClearType = update_types.CLEAR
        else:
            z_pos = z_pos_or_error
            try:
                well_volume = self._state_view.geometry.get_well_volume_at_height(
                    labware_id=params.labwareId, well_name=params.wellName, height=z_pos
                )
            except IncompleteLabwareDefinitionError:
                well_volume = update_types.CLEAR

        state_update.set_liquid_probed(
            labware_id=params.labwareId,
            well_name=params.wellName,
            height=z_pos if z_pos is not None else update_types.CLEAR,
            volume=well_volume,
            last_probed=self._model_utils.get_timestamp(),
        )

        return SuccessData(
            public=TryLiquidProbeResult(
                z_position=z_pos,
                position=deck_point,
            ),
            state_update=state_update,
        )


class LiquidProbe(
    BaseCommand[
        LiquidProbeParams,
        LiquidProbeResult,
        LiquidNotFoundError | StallOrCollisionError | OverpressureError,
    ]
):
    """The model for a full `liquidProbe` command."""

    commandType: LiquidProbeCommandType = "liquidProbe"
    params: LiquidProbeParams
    result: Optional[LiquidProbeResult] = None

    _ImplementationCls: Type[LiquidProbeImplementation] = LiquidProbeImplementation


class TryLiquidProbe(
    BaseCommand[
        TryLiquidProbeParams,
        TryLiquidProbeResult,
        StallOrCollisionError | OverpressureError,
    ]
):
    """The model for a full `tryLiquidProbe` command."""

    commandType: TryLiquidProbeCommandType = "tryLiquidProbe"
    params: TryLiquidProbeParams
    result: Optional[TryLiquidProbeResult] = None

    _ImplementationCls: Type[
        TryLiquidProbeImplementation
    ] = TryLiquidProbeImplementation


class LiquidProbeCreate(BaseCommandCreate[LiquidProbeParams]):
    """The request model for a `liquidProbe` command."""

    commandType: LiquidProbeCommandType = "liquidProbe"
    params: LiquidProbeParams

    _CommandCls: Type[LiquidProbe] = LiquidProbe


class TryLiquidProbeCreate(BaseCommandCreate[TryLiquidProbeParams]):
    """The request model for a `tryLiquidProbe` command."""

    commandType: TryLiquidProbeCommandType = "tryLiquidProbe"
    params: TryLiquidProbeParams

    _CommandCls: Type[TryLiquidProbe] = TryLiquidProbe
