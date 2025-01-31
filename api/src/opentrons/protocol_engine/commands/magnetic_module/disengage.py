"""Magnetic Module disengage command request, result, and implementation models."""


from __future__ import annotations

from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.execution import EquipmentHandler
    from opentrons.protocol_engine.state.state import StateView


DisengageCommandType = Literal["magneticModule/disengage"]


class DisengageParams(BaseModel):
    """Input data to disengage a Magnetic Module's magnets."""

    moduleId: str = Field(
        ...,
        description=(
            "The ID of the Magnetic Module whose magnets you want to disengage,"
            " from a prior `loadModule` command."
        ),
    )


class DisengageResult(BaseModel):
    """The result of a Magnetic Module disengage command."""

    pass


class DisengageImplementation(
    AbstractCommandImpl[DisengageParams, SuccessData[DisengageResult]]
):
    """The implementation of a Magnetic Module disengage command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: DisengageParams) -> SuccessData[DisengageResult]:
        """Execute a Magnetic Module disengage command.

        Raises:
            ModuleNotLoadedError: If the given module ID has not been loaded.
            WrongModuleTypeError: If the given module ID has been loaded,
                but it's not a Magnetic Module.
            ModuleNotAttachedError: If the given module ID points to a valid loaded
                Magnetic Module, but that module's hardware wasn't found attached.
        """
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        mag_module_substate = self._state_view.modules.get_magnetic_module_substate(
            module_id=params.moduleId
        )
        # Allow propagation of ModuleNotAttachedError.
        hardware_module = self._equipment.get_module_hardware_api(
            mag_module_substate.module_id
        )

        if hardware_module is not None:  # Not virtualizing modules.
            await hardware_module.deactivate()

        return SuccessData(
            public=DisengageResult(),
        )


class Disengage(BaseCommand[DisengageParams, DisengageResult, ErrorOccurrence]):
    """A command to disengage a Magnetic Module's magnets."""

    commandType: DisengageCommandType = "magneticModule/disengage"
    params: DisengageParams
    result: Optional[DisengageResult] = None

    _ImplementationCls: Type[DisengageImplementation] = DisengageImplementation


class DisengageCreate(BaseCommandCreate[DisengageParams]):
    """A request to create a Magnetic Module disengage command."""

    commandType: DisengageCommandType = "magneticModule/disengage"
    params: DisengageParams

    _CommandCls: Type[Disengage] = Disengage
