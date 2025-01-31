"""Command models to close a Thermocycler's lid."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...state import update_types
from opentrons.protocol_engine.types import MotorAxis

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler, MovementHandler


CloseLidCommandType = Literal["thermocycler/closeLid"]


class CloseLidParams(BaseModel):
    """Input parameters to close a Thermocycler's lid."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler.")


class CloseLidResult(BaseModel):
    """Result data from closing a Thermocycler's lid."""


class CloseLidImpl(AbstractCommandImpl[CloseLidParams, SuccessData[CloseLidResult]]):
    """Execution implementation of a Thermocycler's close lid command."""

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

    async def execute(self, params: CloseLidParams) -> SuccessData[CloseLidResult]:
        """Close a Thermocycler's lid."""
        state_update = update_types.StateUpdate()

        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        # move the pipettes and gantry over the trash
        # do not home plunger axes because pipettes may be holding liquid
        axes_to_home = [
            MotorAxis.X,
            MotorAxis.Y,
        ] + self._state_view.motion.get_robot_mount_axes()
        await self._movement.home(axes=axes_to_home)
        state_update.clear_all_pipette_locations()

        if thermocycler_hardware is not None:
            await thermocycler_hardware.close()

        return SuccessData(public=CloseLidResult(), state_update=state_update)


class CloseLid(BaseCommand[CloseLidParams, CloseLidResult, ErrorOccurrence]):
    """A command to close a Thermocycler's lid."""

    commandType: CloseLidCommandType = "thermocycler/closeLid"
    params: CloseLidParams
    result: Optional[CloseLidResult] = None

    _ImplementationCls: Type[CloseLidImpl] = CloseLidImpl


class CloseLidCreate(BaseCommandCreate[CloseLidParams]):
    """A request to close a Thermocycler's lid."""

    commandType: CloseLidCommandType = "thermocycler/closeLid"
    params: CloseLidParams

    _CommandCls: Type[CloseLid] = CloseLid
