"""Command models to start heating a Heater-Shaker Module."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


SetTargetTemperatureCommandType = Literal["heaterShaker/setTargetTemperature"]


class SetTargetTemperatureParams(BaseModel):
    """Input parameters to set a Heater-Shaker's target temperature."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")
    celsius: float = Field(..., description="Target temperature in °C.")


class SetTargetTemperatureResult(BaseModel):
    """Result data from setting a Heater-Shaker's target temperature."""


class SetTargetTemperatureImpl(
    AbstractCommandImpl[
        SetTargetTemperatureParams, SuccessData[SetTargetTemperatureResult]
    ]
):
    """Execution implementation of a Heater-Shaker's set temperature command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self,
        params: SetTargetTemperatureParams,
    ) -> SuccessData[SetTargetTemperatureResult]:
        """Set a Heater-Shaker's target temperature."""
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        # Verify temperature from hs module view
        validated_temp = hs_module_substate.validate_target_temperature(params.celsius)

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.start_set_temperature(validated_temp)

        return SuccessData(
            public=SetTargetTemperatureResult(),
        )


class SetTargetTemperature(
    BaseCommand[SetTargetTemperatureParams, SetTargetTemperatureResult, ErrorOccurrence]
):
    """A command to set a Heater-Shaker's target temperature."""

    commandType: SetTargetTemperatureCommandType = "heaterShaker/setTargetTemperature"
    params: SetTargetTemperatureParams
    result: Optional[SetTargetTemperatureResult] = None

    _ImplementationCls: Type[SetTargetTemperatureImpl] = SetTargetTemperatureImpl


class SetTargetTemperatureCreate(BaseCommandCreate[SetTargetTemperatureParams]):
    """A request to create a Heater-Shaker's set temperature command."""

    commandType: SetTargetTemperatureCommandType = "heaterShaker/setTargetTemperature"
    params: SetTargetTemperatureParams

    _CommandCls: Type[SetTargetTemperature] = SetTargetTemperature
