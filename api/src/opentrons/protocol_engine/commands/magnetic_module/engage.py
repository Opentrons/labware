"""Magnetic Module engage command request, result, and implementation models."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.execution import EquipmentHandler
    from opentrons.protocol_engine.state.state import StateView


EngageCommandType = Literal["magneticModule/engage"]


class EngageParams(BaseModel):
    """Input data to engage a Magnetic Module."""

    moduleId: str = Field(
        ...,
        description=(
            "The ID of the Magnetic Module whose magnets you want to raise,"
            " from a prior `loadModule` command."
        ),
    )

    height: float = Field(
        ...,
        description=(
            "How high, in millimeters, to raise the magnets."
            "\n\n"
            "Zero means the tops of the magnets are level with the ledge"
            " that the labware rests on."
            " This will be slightly above the magnets' minimum height,"
            " the hardware home position."
            " Negative values are allowed, to put the magnets below the ledge."
            "\n\n"
            "Units are always true millimeters."
            " This is unlike certain labware definitions,"
            " engage commands in the Python Protocol API,"
            " and engage commands in older versions of the JSON protocol schema."
            " Take care to convert properly."
        ),
    )


class EngageResult(BaseModel):
    """The result of a Magnetic Module engage command."""

    pass


class EngageImplementation(
    AbstractCommandImpl[EngageParams, SuccessData[EngageResult]]
):
    """The implementation of a Magnetic Module engage command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: EngageParams) -> SuccessData[EngageResult]:
        """Execute a Magnetic Module engage command.

        Raises:
            ModuleNotLoadedError: If the given module ID doesn't point to a
                module that's already been loaded.
            WrongModuleTypeError: If the given module ID points to a non-Magnetic
                module.
            ModuleNotAttachedError: If the given module ID points to a valid loaded
                Magnetic Module, but that module's hardware wasn't found attached.
            EngageHeightOutOfRangeError: If the given height is unreachable.
        """
        # Allow propagation of ModuleNotLoadedError and WrongModuleTypeError.
        mag_module_substate = self._state_view.modules.get_magnetic_module_substate(
            module_id=params.moduleId
        )
        # Allow propagation of EngageHeightOutOfRangeError.
        hardware_height = mag_module_substate.calculate_magnet_hardware_height(
            mm_from_base=params.height,
        )
        # Allow propagation of ModuleNotAttachedError.
        hardware_module = self._equipment.get_module_hardware_api(
            mag_module_substate.module_id
        )

        if hardware_module is not None:  # Not virtualizing modules.
            await hardware_module.engage(height=hardware_height)

        return SuccessData(
            public=EngageResult(),
        )


class Engage(BaseCommand[EngageParams, EngageResult, ErrorOccurrence]):
    """A command to engage a Magnetic Module's magnets."""

    commandType: EngageCommandType = "magneticModule/engage"
    params: EngageParams
    result: Optional[EngageResult] = None

    _ImplementationCls: Type[EngageImplementation] = EngageImplementation


class EngageCreate(BaseCommandCreate[EngageParams]):
    """A request to create a Magnetic Module engage command."""

    commandType: EngageCommandType = "magneticModule/engage"
    params: EngageParams

    _CommandCls: Type[Engage] = Engage
