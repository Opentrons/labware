"""Command models to open the Heater-Shaker Module's labware latch."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type
from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...state import update_types

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler, MovementHandler

OpenLabwareLatchCommandType = Literal["heaterShaker/openLabwareLatch"]


class OpenLabwareLatchParams(BaseModel):
    """Input parameters to open a Heater-Shaker Module's labware latch."""

    moduleId: str = Field(..., description="Unique ID of the Heater-Shaker Module.")


class OpenLabwareLatchResult(BaseModel):
    """Result data from opening a Heater-Shaker's labware latch."""

    pipetteRetracted: bool = Field(
        ...,
        description=(
            "Whether this command automatically retracted the pipettes"
            " before opening the latch, to avoid a potential collision."
        ),
    )


class OpenLabwareLatchImpl(
    AbstractCommandImpl[OpenLabwareLatchParams, SuccessData[OpenLabwareLatchResult]]
):
    """Execution implementation of a Heater-Shaker's open latch labware command."""

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

    async def execute(
        self, params: OpenLabwareLatchParams
    ) -> SuccessData[OpenLabwareLatchResult]:
        """Open a Heater-Shaker's labware latch."""
        state_update = update_types.StateUpdate()

        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        hs_module_substate = self._state_view.modules.get_heater_shaker_module_substate(
            module_id=params.moduleId
        )

        hs_module_substate.raise_if_shaking()

        pipette_should_retract = (
            self._state_view.motion.check_pipette_blocking_hs_latch(
                hs_module_substate.module_id
            )
        )
        if pipette_should_retract:
            # Move pipette away if it is close to the heater-shaker
            # TODO(jbl 2022-07-28) replace home movement with a retract movement
            await self._movement.home(
                axes=self._state_view.motion.get_robot_mount_axes()
            )
            state_update.clear_all_pipette_locations()

        # Allow propagation of ModuleNotAttachedError.
        hs_hardware_module = self._equipment.get_module_hardware_api(
            hs_module_substate.module_id
        )

        if hs_hardware_module is not None:
            await hs_hardware_module.open_labware_latch()

        return SuccessData(
            public=OpenLabwareLatchResult(pipetteRetracted=pipette_should_retract),
            state_update=state_update,
        )


class OpenLabwareLatch(
    BaseCommand[OpenLabwareLatchParams, OpenLabwareLatchResult, ErrorOccurrence]
):
    """A command to open a Heater-Shaker's labware latch."""

    commandType: OpenLabwareLatchCommandType = "heaterShaker/openLabwareLatch"
    params: OpenLabwareLatchParams
    result: Optional[OpenLabwareLatchResult] = None

    _ImplementationCls: Type[OpenLabwareLatchImpl] = OpenLabwareLatchImpl


class OpenLabwareLatchCreate(BaseCommandCreate[OpenLabwareLatchParams]):
    """A request to create a Heater-Shaker's open labware latch command."""

    commandType: OpenLabwareLatchCommandType = "heaterShaker/openLabwareLatch"
    params: OpenLabwareLatchParams

    _CommandCls: Type[OpenLabwareLatch] = OpenLabwareLatch
