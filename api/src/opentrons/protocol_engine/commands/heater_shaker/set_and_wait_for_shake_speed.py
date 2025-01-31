"""Command models to set and wait for a shake speed for a Heater-Shaker Module."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type
from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler, MovementHandler

SetAndWaitForShakeSpeedCommandType = Literal["heaterShaker/setAndWaitForShakeSpeed"]


class SetAndWaitForShakeSpeedParams(BaseModel):
    """Input parameters to set and wait for a shake speed for a Heater-Shaker Module."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")
    rpm: float = Field(..., description="Target speed in rotations per minute.")


class SetAndWaitForShakeSpeedResult(BaseModel):
    """Result data from setting and waiting for a Heater-Shaker's shake speed."""

    pipetteRetracted: bool = Field(
        ...,
        description=(
            "Whether this command automatically retracted the pipettes"
            " before starting the shake, to avoid a potential collision."
        ),
    )


class SetAndWaitForShakeSpeedImpl(
    AbstractCommandImpl[
        SetAndWaitForShakeSpeedParams, SuccessData[SetAndWaitForShakeSpeedResult]
    ]
):
    """Execution implementation of Heater-Shaker's set and wait shake speed command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        movement: MovementHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment
        self._movement = movement

    async def execute(
        self,
        params: SetAndWaitForShakeSpeedParams,
    ) -> SuccessData[SetAndWaitForShakeSpeedResult]:
        """Set and wait for a Heater-Shaker's target shake speed."""
        state_update = update_types.StateUpdate()

        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        hs_module_substate.raise_if_labware_latch_not_closed()

        # Verify speed from hs module view
        validated_speed = hs_module_substate.validate_target_speed(params.rpm)

        pipette_should_retract = (
            self._state_view.motion.check_pipette_blocking_hs_shaker(
                hs_module_substate.module_id
            )
        )
        if pipette_should_retract:
            # Move pipette away if it is close to the heater-shaker
            # TODO(jbl 2022-07-28) replace home movement with a retract movement
            await self._movement.home(
                axes=self._state_view.motion.get_robot_mount_axes()
            )
            state_update.clear_all_pipette_locations()

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.set_speed(rpm=validated_speed)

        return SuccessData(
            public=SetAndWaitForShakeSpeedResult(
                pipetteRetracted=pipette_should_retract
            ),
            state_update=state_update,
        )


class SetAndWaitForShakeSpeed(
    BaseCommand[
        SetAndWaitForShakeSpeedParams, SetAndWaitForShakeSpeedResult, ErrorOccurrence
    ]
):
    """A command to set and wait for a Heater-Shaker's shake speed."""

    commandType: SetAndWaitForShakeSpeedCommandType = (
        "heaterShaker/setAndWaitForShakeSpeed"
    )
    params: SetAndWaitForShakeSpeedParams
    result: Optional[SetAndWaitForShakeSpeedResult] = None

    _ImplementationCls: Type[SetAndWaitForShakeSpeedImpl] = SetAndWaitForShakeSpeedImpl


class SetAndWaitForShakeSpeedCreate(BaseCommandCreate[SetAndWaitForShakeSpeedParams]):
    """A request to create a Heater-Shaker's set and wait for shake speed command."""

    commandType: SetAndWaitForShakeSpeedCommandType = (
        "heaterShaker/setAndWaitForShakeSpeed"
    )
    params: SetAndWaitForShakeSpeedParams

    _CommandCls: Type[SetAndWaitForShakeSpeed] = SetAndWaitForShakeSpeed
