"""Command models to stop heating Heater-Shaker Module."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


DeactivateHeaterCommandType = Literal["heaterShaker/deactivateHeater"]


class DeactivateHeaterParams(BaseModel):
    """Input parameters to unset a Heater-Shaker's target temperature."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")


class DeactivateHeaterResult(BaseModel):
    """Result data from unsetting a Heater-Shaker's target temperature."""


class DeactivateHeaterImpl(
    AbstractCommandImpl[DeactivateHeaterParams, SuccessData[DeactivateHeaterResult]]
):
    """Execution implementation of a Heater-Shaker's deactivate heater command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: DeactivateHeaterParams
    ) -> SuccessData[DeactivateHeaterResult]:
        """Unset a Heater-Shaker's target temperature."""
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.deactivate_heater()

        return SuccessData(
            public=DeactivateHeaterResult(),
        )


class DeactivateHeater(
    BaseCommand[DeactivateHeaterParams, DeactivateHeaterResult, ErrorOccurrence]
):
    """A command to unset a Heater-Shaker's target temperature."""

    commandType: DeactivateHeaterCommandType = "heaterShaker/deactivateHeater"
    params: DeactivateHeaterParams
    result: Optional[DeactivateHeaterResult] = None

    _ImplementationCls: Type[DeactivateHeaterImpl] = DeactivateHeaterImpl


class DeactivateHeaterCreate(BaseCommandCreate[DeactivateHeaterParams]):
    """A request to create a Heater-Shaker's deactivate heater command."""

    commandType: DeactivateHeaterCommandType = "heaterShaker/deactivateHeater"
    params: DeactivateHeaterParams

    _CommandCls: Type[DeactivateHeater] = DeactivateHeater
