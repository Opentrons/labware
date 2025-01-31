"""Command models to open a Thermocycler's lid."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...state import update_types
from ...errors.error_occurrence import ErrorOccurrence
from opentrons.protocol_engine.types import MotorAxis

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler, MovementHandler


OpenLidCommandType = Literal["thermocycler/openLid"]


class OpenLidParams(BaseModel):
    """Input parameters to open a Thermocycler's lid."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler.")


class OpenLidResult(BaseModel):
    """Result data from opening a Thermocycler's lid."""


class OpenLidImpl(AbstractCommandImpl[OpenLidParams, SuccessData[OpenLidResult]]):
    """Execution implementation of a Thermocycler's open lid command."""

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

    async def execute(self, params: OpenLidParams) -> SuccessData[OpenLidResult]:
        """Open a Thermocycler's lid."""
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
            await thermocycler_hardware.open()

        return SuccessData(public=OpenLidResult(), state_update=state_update)


class OpenLid(BaseCommand[OpenLidParams, OpenLidResult, ErrorOccurrence]):
    """A command to open a Thermocycler's lid."""

    commandType: OpenLidCommandType = "thermocycler/openLid"
    params: OpenLidParams
    result: Optional[OpenLidResult] = None

    _ImplementationCls: Type[OpenLidImpl] = OpenLidImpl


class OpenLidCreate(BaseCommandCreate[OpenLidParams]):
    """A request to open a Thermocycler's lid."""

    commandType: OpenLidCommandType = "thermocycler/openLid"
    params: OpenLidParams

    _CommandCls: Type[OpenLid] = OpenLid
