"""Command models to wait for heating a Thermocycler's lid."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


WaitForLidTemperatureCommandType = Literal["thermocycler/waitForLidTemperature"]


class WaitForLidTemperatureParams(BaseModel):
    """Input parameters to wait for Thermocycler's lid temperature."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler Module.")


class WaitForLidTemperatureResult(BaseModel):
    """Result data from wait for Thermocycler's lid temperature."""


class WaitForLidTemperatureImpl(
    AbstractCommandImpl[
        WaitForLidTemperatureParams, SuccessData[WaitForLidTemperatureResult]
    ]
):
    """Execution implementation of Thermocycler's wait for lid temperature command."""

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
        params: WaitForLidTemperatureParams,
    ) -> SuccessData[WaitForLidTemperatureResult]:
        """Wait for a Thermocycler's lid temperature."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )

        # Raises error if no target temperature
        thermocycler_state.get_target_lid_temperature()

        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        if thermocycler_hardware is not None:
            await thermocycler_hardware.wait_for_lid_target()

        return SuccessData(
            public=WaitForLidTemperatureResult(),
        )


class WaitForLidTemperature(
    BaseCommand[
        WaitForLidTemperatureParams, WaitForLidTemperatureResult, ErrorOccurrence
    ]
):
    """A command to wait for a Thermocycler's lid temperature."""

    commandType: WaitForLidTemperatureCommandType = "thermocycler/waitForLidTemperature"
    params: WaitForLidTemperatureParams
    result: Optional[WaitForLidTemperatureResult] = None

    _ImplementationCls: Type[WaitForLidTemperatureImpl] = WaitForLidTemperatureImpl


class WaitForLidTemperatureCreate(BaseCommandCreate[WaitForLidTemperatureParams]):
    """A request to create Thermocycler's wait for lid temperature command."""

    commandType: WaitForLidTemperatureCommandType = "thermocycler/waitForLidTemperature"
    params: WaitForLidTemperatureParams

    _CommandCls: Type[WaitForLidTemperature] = WaitForLidTemperature
