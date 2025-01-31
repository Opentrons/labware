"""Command models to deactivate shaker for the Heater-Shaker Module."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

DeactivateShakerCommandType = Literal["heaterShaker/deactivateShaker"]


class DeactivateShakerParams(BaseModel):
    """Input parameters to deactivate shaker for a Heater-Shaker Module."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")


class DeactivateShakerResult(BaseModel):
    """Result data from deactivating shaker for a Heater-Shaker."""


class DeactivateShakerImpl(
    AbstractCommandImpl[DeactivateShakerParams, SuccessData[DeactivateShakerResult]]
):
    """Execution implementation of a Heater-Shaker's deactivate shaker command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: DeactivateShakerParams
    ) -> SuccessData[DeactivateShakerResult]:
        """Deactivate shaker for a Heater-Shaker."""
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        hs_module_substate.raise_if_labware_latch_not_closed()

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.deactivate_shaker()

        return SuccessData(
            public=DeactivateShakerResult(),
        )


class DeactivateShaker(
    BaseCommand[DeactivateShakerParams, DeactivateShakerResult, ErrorOccurrence]
):
    """A command to deactivate shaker for a Heater-Shaker."""

    commandType: DeactivateShakerCommandType = "heaterShaker/deactivateShaker"
    params: DeactivateShakerParams
    result: Optional[DeactivateShakerResult] = None

    _ImplementationCls: Type[DeactivateShakerImpl] = DeactivateShakerImpl


class DeactivateShakerCreate(BaseCommandCreate[DeactivateShakerParams]):
    """A request to create a Heater-Shaker's deactivate shaker command."""

    commandType: DeactivateShakerCommandType = "heaterShaker/deactivateShaker"
    params: DeactivateShakerParams

    _CommandCls: Type[DeactivateShaker] = DeactivateShaker
