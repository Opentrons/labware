"""Implementation, request models, and response models for the load module command."""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal

from opentrons_shared_data.robot.dev_types import RobotType
from pydantic import BaseModel, Field

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate
from ..types import DeckSlotLocation, ModuleModel, ModuleDefinition

if TYPE_CHECKING:
    from ..execution import EquipmentHandler


LoadModuleCommandType = Literal["loadModule"]


class LoadModuleParams(BaseModel):
    """Payload required to load a module."""

    model: ModuleModel = Field(
        ...,
        description=(
            "The model name of the module to load."
            "\n\n"
            "Protocol Engine will look for a connected module that either"
            " exactly matches this one, or is compatible."
            "\n\n"
            " For example, if you request a `temperatureModuleV1` here,"
            " Protocol Engine might load a `temperatureModuleV1` or a `temperatureModuleV2`."
            "\n\n"
            " The model that it finds connected will be available through `result.model`."
        ),
    )

    # Note: Our assumption here that a module's position can be boiled down to a
    # single deck slot precludes loading a Thermocycler in its special "shifted slightly
    # to the left" position. This is okay for now because neither the Python Protocol
    # API nor Protocol Designer attempt to support it, either.
    location: DeckSlotLocation = Field(
        ...,
        description=(
            "The location into which this module should be loaded."
            "\n\n"
            "For the Thermocycler Module, which occupies multiple deck slots,"
            " this should be the front-most occupied slot (normally slot 7)."
        ),
    )

    moduleId: Optional[str] = Field(
        None,
        description=(
            "An optional ID to assign to this module."
            " If None, an ID will be generated."
        ),
    )

    def canonicalize(self, robot_type: RobotType) -> LoadModuleParams:
        return self.copy(
            update={
                "location": DeckSlotLocation.construct(
                    slotName=self.location.slotName.to_equivalent_by_robot_type(
                        robot_type
                    )
                )
            }
        )


class LoadModuleResult(BaseModel):
    """The results of loading a module."""

    moduleId: str = Field(
        description="An ID to reference this module in subsequent commands."
    )

    # TODO(mm, 2023-04-13): Remove this field. Jira RSS-221.
    definition: ModuleDefinition = Field(
        deprecated=True,
        description=(
            "The definition of the connected module."
            " This field is an implementation detail. We might change or remove it without warning."
            " Do not access it or rely on it being present."
        ),
    )

    model: ModuleModel = Field(
        ...,
        description=(
            "The hardware model of the connected module."
            " This can be different from the exact model that this command requested."
            " See `params.model`."
            "\n\n"
            "This field is only meaningful in the run's actual execution,"
            " not in the protocol's analysis."
            " In analysis, it will be an arbitrary placeholder."
        ),
    )

    serialNumber: str = Field(
        ...,
        description="Hardware serial number of the connected module.",
    )


class LoadModuleImplementation(AbstractCommandImpl[LoadModuleParams, LoadModuleResult]):
    """The implementation of the load module command."""

    def __init__(self, equipment: EquipmentHandler, **kwargs: object) -> None:
        self._equipment = equipment

    async def execute(self, params: LoadModuleParams) -> LoadModuleResult:
        """Check that the requested module is attached and assign its identifier."""
        loaded_module = await self._equipment.load_module(
            model=params.model,
            location=params.location,
            module_id=params.moduleId,
        )

        return LoadModuleResult(
            moduleId=loaded_module.module_id,
            serialNumber=loaded_module.serial_number,
            model=loaded_module.definition.model,
            definition=loaded_module.definition,
        )


class LoadModule(BaseCommand[LoadModuleParams, LoadModuleResult]):
    """The model for a load module command."""

    commandType: LoadModuleCommandType = "loadModule"
    params: LoadModuleParams
    result: Optional[LoadModuleResult]

    _ImplementationCls: Type[LoadModuleImplementation] = LoadModuleImplementation


class LoadModuleCreate(BaseCommandCreate[LoadModuleParams]):
    """The model for a creation request for a load module command."""

    commandType: LoadModuleCommandType = "loadModule"
    params: LoadModuleParams

    _CommandCls: Type[LoadModule] = LoadModule

    def normalize(self, robot_type: RobotType) -> LoadModuleCreate:
        return self.copy(update={"params": self.params.canonicalize(robot_type)})
