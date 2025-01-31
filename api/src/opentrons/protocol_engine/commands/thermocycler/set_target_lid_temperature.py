"""Command models to start heating a Thermocycler's lid."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


SetTargetLidTemperatureCommandType = Literal["thermocycler/setTargetLidTemperature"]


class SetTargetLidTemperatureParams(BaseModel):
    """Input parameters to set a Thermocycler's target lid temperature."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler Module.")
    celsius: float = Field(..., description="Target temperature in °C.")


class SetTargetLidTemperatureResult(BaseModel):
    """Result data from setting a Thermocycler's target lid temperature."""

    targetLidTemperature: float = Field(
        ...,
        description="The target lid temperature that was set after validation.",
    )


class SetTargetLidTemperatureImpl(
    AbstractCommandImpl[
        SetTargetLidTemperatureParams, SuccessData[SetTargetLidTemperatureResult]
    ]
):
    """Execution implementation of a Thermocycler's set lid temperature command."""

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
        params: SetTargetLidTemperatureParams,
    ) -> SuccessData[SetTargetLidTemperatureResult]:
        """Set a Thermocycler's target lid temperature."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        target_temperature = thermocycler_state.validate_target_lid_temperature(
            params.celsius
        )
        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        if thermocycler_hardware is not None:
            await thermocycler_hardware.set_target_lid_temperature(target_temperature)

        return SuccessData(
            public=SetTargetLidTemperatureResult(
                targetLidTemperature=target_temperature
            ),
        )


class SetTargetLidTemperature(
    BaseCommand[
        SetTargetLidTemperatureParams, SetTargetLidTemperatureResult, ErrorOccurrence
    ]
):
    """A command to set a Thermocycler's target lid temperature."""

    commandType: SetTargetLidTemperatureCommandType = (
        "thermocycler/setTargetLidTemperature"
    )
    params: SetTargetLidTemperatureParams
    result: Optional[SetTargetLidTemperatureResult] = None

    _ImplementationCls: Type[SetTargetLidTemperatureImpl] = SetTargetLidTemperatureImpl


class SetTargetLidTemperatureCreate(BaseCommandCreate[SetTargetLidTemperatureParams]):
    """A request to create a Thermocycler's set lid temperature command."""

    commandType: SetTargetLidTemperatureCommandType = (
        "thermocycler/setTargetLidTemperature"
    )
    params: SetTargetLidTemperatureParams

    _CommandCls: Type[SetTargetLidTemperature] = SetTargetLidTemperature
