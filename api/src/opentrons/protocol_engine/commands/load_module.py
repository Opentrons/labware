"""Implementation, request models, and response models for the load module command."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any
from typing_extensions import Literal
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.protocol_engine.state.update_types import StateUpdate

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..types import (
    DeckSlotLocation,
    ModuleType,
    ModuleModel,
    ModuleDefinition,
)
from opentrons.types import DeckSlotName

from opentrons.protocol_engine.resources import deck_configuration_provider


if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import EquipmentHandler


LoadModuleCommandType = Literal["loadModule"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


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

    moduleId: str | SkipJsonSchema[None] = Field(
        None,
        description=(
            "An optional ID to assign to this module."
            " If None, an ID will be generated."
        ),
        json_schema_extra=_remove_default,
    )


class LoadModuleResult(BaseModel):
    """The results of loading a module."""

    moduleId: str = Field(
        description="An ID to reference this module in subsequent commands."
    )

    # TODO(mm, 2023-04-13): Remove this field. Jira RSS-221.
    definition: ModuleDefinition = Field(
        json_schema_extra={"deprecated": True},
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

    serialNumber: Optional[str] = Field(
        None,
        description="Hardware serial number of the connected module. "
        "Will be `None` if a module is not electrically connected to the robot (like the Magnetic Block).",
    )


class LoadModuleImplementation(
    AbstractCommandImpl[LoadModuleParams, SuccessData[LoadModuleResult]]
):
    """The implementation of the load module command."""

    def __init__(
        self, equipment: EquipmentHandler, state_view: StateView, **kwargs: object
    ) -> None:
        self._equipment = equipment
        self._state_view = state_view

    async def execute(self, params: LoadModuleParams) -> SuccessData[LoadModuleResult]:
        """Check that the requested module is attached and assign its identifier."""
        state_update = StateUpdate()

        module_type = params.model.as_type()
        self._ensure_module_location(params.location.slotName, module_type)

        # todo(mm, 2024-12-03): Theoretically, we should be able to deal with
        # addressable areas and deck configurations the same way between OT-2 and Flex.
        # Can this be simplified?
        if self._state_view.config.robot_type == "OT-2 Standard":
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                params.location.slotName.id
            )
        else:
            addressable_area_provided_by_module = (
                self._state_view.modules.ensure_and_convert_module_fixture_location(
                    deck_slot=params.location.slotName,
                    model=params.model,
                )
            )
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                addressable_area_provided_by_module
            )

        verified_location = self._state_view.geometry.ensure_location_not_occupied(
            params.location
        )
        state_update.set_addressable_area_used(
            addressable_area_name=params.location.slotName.id
        )

        if params.model == ModuleModel.MAGNETIC_BLOCK_V1:
            loaded_module = await self._equipment.load_magnetic_block(
                model=params.model,
                location=verified_location,
                module_id=params.moduleId,
            )
        else:
            loaded_module = await self._equipment.load_module(
                model=params.model,
                location=verified_location,
                module_id=params.moduleId,
            )

        return SuccessData(
            public=LoadModuleResult(
                moduleId=loaded_module.module_id,
                serialNumber=loaded_module.serial_number,
                model=loaded_module.definition.model,
                definition=loaded_module.definition,
            ),
            state_update=state_update,
        )

    def _ensure_module_location(
        self, slot: DeckSlotName, module_type: ModuleType
    ) -> None:
        # todo(mm, 2024-12-03): Theoretically, we should be able to deal with
        # addressable areas and deck configurations the same way between OT-2 and Flex.
        # Can this be simplified?
        if self._state_view.config.robot_type == "OT-2 Standard":
            slot_def = self._state_view.addressable_areas.get_slot_definition(slot.id)
            compatible_modules = slot_def["compatibleModuleTypes"]
            if module_type.value not in compatible_modules:
                raise ValueError(
                    f"A {module_type.value} cannot be loaded into slot {slot}"
                )
        else:
            cutout_fixture_id = ModuleType.to_module_fixture_id(module_type)
            module_fixture = deck_configuration_provider.get_cutout_fixture(
                cutout_fixture_id,
                self._state_view.labware.get_deck_definition(),
            )
            cutout_id = (
                self._state_view.addressable_areas.get_cutout_id_by_deck_slot_name(slot)
            )
            if cutout_id not in module_fixture["mayMountTo"]:
                raise ValueError(
                    f"A {module_type.value} cannot be loaded into slot {slot}"
                )


class LoadModule(BaseCommand[LoadModuleParams, LoadModuleResult, ErrorOccurrence]):
    """The model for a load module command."""

    commandType: LoadModuleCommandType = "loadModule"
    params: LoadModuleParams
    result: Optional[LoadModuleResult] = None

    _ImplementationCls: Type[LoadModuleImplementation] = LoadModuleImplementation


class LoadModuleCreate(BaseCommandCreate[LoadModuleParams]):
    """The model for a creation request for a load module command."""

    commandType: LoadModuleCommandType = "loadModule"
    params: LoadModuleParams

    _CommandCls: Type[LoadModule] = LoadModule
