"""Command models to close the Heater-Shaker Module's labware latch."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


CloseLabwareLatchCommandType = Literal["heaterShaker/closeLabwareLatch"]


class CloseLabwareLatchParams(BaseModel):
    """Input parameters to close a Heater-Shaker Module's labware latch."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")


class CloseLabwareLatchResult(BaseModel):
    """Result data from closing a Heater-Shaker's labware latch."""


class CloseLabwareLatchImpl(
    AbstractCommandImpl[CloseLabwareLatchParams, SuccessData[CloseLabwareLatchResult]]
):
    """Execution implementation of a Heater-Shaker's close labware latch command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: CloseLabwareLatchParams
    ) -> SuccessData[CloseLabwareLatchResult]:
        """Close a Heater-Shaker's labware latch."""
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.close_labware_latch()

        return SuccessData(
            public=CloseLabwareLatchResult(),
        )


class CloseLabwareLatch(
    BaseCommand[CloseLabwareLatchParams, CloseLabwareLatchResult, ErrorOccurrence]
):
    """A command to close a Heater-Shaker's latch."""

    commandType: CloseLabwareLatchCommandType = "heaterShaker/closeLabwareLatch"
    params: CloseLabwareLatchParams
    result: Optional[CloseLabwareLatchResult] = None

    _ImplementationCls: Type[CloseLabwareLatchImpl] = CloseLabwareLatchImpl


class CloseLabwareLatchCreate(BaseCommandCreate[CloseLabwareLatchParams]):
    """A request to create a Heater-Shaker's close latch command."""

    commandType: CloseLabwareLatchCommandType = "heaterShaker/closeLabwareLatch"
    params: CloseLabwareLatchParams

    _CommandCls: Type[CloseLabwareLatch] = CloseLabwareLatch
