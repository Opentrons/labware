"""Command models to start heating a Temperature Module."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

SetTargetTemperatureCommandType = Literal["temperatureModule/setTargetTemperature"]


class SetTargetTemperatureParams(BaseModel):
    """Input parameters to set a Temperature Module's target temperature."""

    moduleId: str = Field(..., description="Unique ID of the Temperature Module.")
    celsius: float = Field(..., description="Target temperature in °C.")


class SetTargetTemperatureResult(BaseModel):
    """Result data from setting a Temperature Module's target temperature."""

    targetTemperature: float = Field(
        ...,
        description="The target temperature that was set after validation "
        "and type conversion (if any).",
    )


class SetTargetTemperatureImpl(
    AbstractCommandImpl[
        SetTargetTemperatureParams, SuccessData[SetTargetTemperatureResult]
    ]
):
    """Execution implementation of a Temperature Module's set temperature command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: SetTargetTemperatureParams
    ) -> SuccessData[SetTargetTemperatureResult]:
        """Set a Temperature Module's target temperature."""
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        module_substate = self._state_view.modules.get_temperature_module_substate(
            module_id=params.moduleId
        )

        # Verify temperature from temperature module view
        validated_temp = module_substate.validate_target_temperature(params.celsius)

        # Allow propagation of ModuleNotAttachedError.
        temp_hardware_module = self._equipment.get_module_hardware_api(
            module_substate.module_id
        )

        if temp_hardware_module is not None:
            await temp_hardware_module.start_set_temperature(celsius=validated_temp)
        return SuccessData(
            public=SetTargetTemperatureResult(targetTemperature=validated_temp),
        )


class SetTargetTemperature(
    BaseCommand[SetTargetTemperatureParams, SetTargetTemperatureResult, ErrorOccurrence]
):
    """A command to set a Temperature Module's target temperature."""

    commandType: SetTargetTemperatureCommandType = (
        "temperatureModule/setTargetTemperature"
    )
    params: SetTargetTemperatureParams
    result: Optional[SetTargetTemperatureResult] = None

    _ImplementationCls: Type[SetTargetTemperatureImpl] = SetTargetTemperatureImpl


class SetTargetTemperatureCreate(BaseCommandCreate[SetTargetTemperatureParams]):
    """A request to create a Temperature Module's set temperature command."""

    commandType: SetTargetTemperatureCommandType = (
        "temperatureModule/setTargetTemperature"
    )
    params: SetTargetTemperatureParams

    _CommandCls: Type[SetTargetTemperature] = SetTargetTemperature
