"""Command models to wait for a Heater-Shaker Module's target temperature."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING, Any

from typing_extensions import Literal, Type
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


WaitForTemperatureCommandType = Literal["heaterShaker/waitForTemperature"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class WaitForTemperatureParams(BaseModel):
    """Input parameters to wait for a Heater-Shaker's target temperature."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")
    celsius: float | SkipJsonSchema[None] = Field(
        None,
        description="Target temperature in °C. If not specified, will "
        "default to the module's target temperature. "
        "Specifying a celsius parameter other than the target temperature "
        "could lead to unpredictable behavior and hence is not "
        "recommended for use. This parameter can be removed in a "
        "future version without prior notice.",
        json_schema_extra=_remove_default,
    )


class WaitForTemperatureResult(BaseModel):
    """Result data from waiting for a Heater-Shaker's target temperature."""


class WaitForTemperatureImpl(
    AbstractCommandImpl[WaitForTemperatureParams, SuccessData[WaitForTemperatureResult]]
):
    """Execution implementation of a Heater-Shaker's wait for temperature command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: WaitForTemperatureParams
    ) -> SuccessData[WaitForTemperatureResult]:
        """Wait for a Heater-Shaker's target temperature to be reached."""
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        if params.celsius is None:
            # Raises error if no target temperature
            target_temp = hs_module_substate.get_plate_target_temperature()
        else:
            target_temp = hs_module_substate.validate_target_temperature(params.celsius)

        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.await_temperature(awaiting_temperature=target_temp)

        return SuccessData(
            public=WaitForTemperatureResult(),
        )


class WaitForTemperature(
    BaseCommand[WaitForTemperatureParams, WaitForTemperatureResult, ErrorOccurrence]
):
    """A command to wait for a Heater-Shaker's target temperature to be reached."""

    commandType: WaitForTemperatureCommandType = "heaterShaker/waitForTemperature"
    params: WaitForTemperatureParams
    result: Optional[WaitForTemperatureResult] = None

    _ImplementationCls: Type[WaitForTemperatureImpl] = WaitForTemperatureImpl


class WaitForTemperatureCreate(BaseCommandCreate[WaitForTemperatureParams]):
    """A request to create a Heater-Shaker's wait for temperature command."""

    commandType: WaitForTemperatureCommandType = "heaterShaker/waitForTemperature"
    params: WaitForTemperatureParams

    _CommandCls: Type[WaitForTemperature] = WaitForTemperature
