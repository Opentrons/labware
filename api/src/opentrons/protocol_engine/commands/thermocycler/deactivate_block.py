"""Command models to stop heating a Thermocycler's block."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


DeactivateBlockCommandType = Literal["thermocycler/deactivateBlock"]


class DeactivateBlockParams(BaseModel):
    """Input parameters to unset a Thermocycler's target block temperature."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler.")


class DeactivateBlockResult(BaseModel):
    """Result data from unsetting a Thermocycler's target block temperature."""


class DeactivateBlockImpl(
    AbstractCommandImpl[DeactivateBlockParams, SuccessData[DeactivateBlockResult]]
):
    """Execution implementation of a Thermocycler's deactivate block command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self, params: DeactivateBlockParams
    ) -> SuccessData[DeactivateBlockResult]:
        """Unset a Thermocycler's target block temperature."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        if thermocycler_hardware is not None:
            await thermocycler_hardware.deactivate_block()

        return SuccessData(
            public=DeactivateBlockResult(),
        )


class DeactivateBlock(
    BaseCommand[DeactivateBlockParams, DeactivateBlockResult, ErrorOccurrence]
):
    """A command to unset a Thermocycler's target block temperature."""

    commandType: DeactivateBlockCommandType = "thermocycler/deactivateBlock"
    params: DeactivateBlockParams
    result: Optional[DeactivateBlockResult] = None

    _ImplementationCls: Type[DeactivateBlockImpl] = DeactivateBlockImpl


class DeactivateBlockCreate(BaseCommandCreate[DeactivateBlockParams]):
    """A request to create a Thermocycler's deactivate block command."""

    commandType: DeactivateBlockCommandType = "thermocycler/deactivateBlock"
    params: DeactivateBlockParams

    _CommandCls: Type[DeactivateBlock] = DeactivateBlock
