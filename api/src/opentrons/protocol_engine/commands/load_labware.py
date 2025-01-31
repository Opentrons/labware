"""Load labware command request, result, and implementation models."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema
from typing_extensions import Literal, TypeGuard

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from ..errors import LabwareIsNotAllowedInLocationError
from ..resources import labware_validation, fixture_validation
from ..types import (
    LabwareLocation,
    ModuleLocation,
    ModuleModel,
    OnLabwareLocation,
    DeckSlotLocation,
    AddressableAreaLocation,
    LoadedModule,
    OFF_DECK_LOCATION,
)

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from .labware_handling_common import LabwareHandlingResultMixin
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import EquipmentHandler


LoadLabwareCommandType = Literal["loadLabware"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class LoadLabwareParams(BaseModel):
    """Payload required to load a labware into a slot."""

    location: LabwareLocation = Field(
        ...,
        description="Location the labware should be loaded into.",
    )
    loadName: str = Field(
        ...,
        description="Name used to reference a labware definition.",
    )
    namespace: str = Field(
        ...,
        description="The namespace the labware definition belongs to.",
    )
    version: int = Field(
        ...,
        description="The labware definition version.",
    )
    labwareId: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional ID to assign to this labware. If None, an ID "
        "will be generated.",
        json_schema_extra=_remove_default,
    )
    displayName: str | SkipJsonSchema[None] = Field(
        None,
        description="An optional user-specified display name "
        "or label for this labware.",
        # NOTE: v4/5 JSON protocols will always have a displayName which will be the
        #  user-specified label OR the displayName property of the labware's definition.
        # TODO: Make sure v6 JSON protocols don't do that.
        json_schema_extra=_remove_default,
    )


class LoadLabwareResult(LabwareHandlingResultMixin):
    """Result data from the execution of a LoadLabware command."""

    definition: LabwareDefinition = Field(
        ...,
        description="The full definition data for this labware.",
    )


class LoadLabwareImplementation(
    AbstractCommandImpl[LoadLabwareParams, SuccessData[LoadLabwareResult]]
):
    """Load labware command implementation."""

    def __init__(
        self, equipment: EquipmentHandler, state_view: StateView, **kwargs: object
    ) -> None:
        self._equipment = equipment
        self._state_view = state_view

    def _is_loading_to_module(
        self, location: LabwareLocation, module_model: ModuleModel
    ) -> TypeGuard[ModuleLocation]:
        if not isinstance(location, ModuleLocation):
            return False

        module: LoadedModule = self._state_view.modules.get(location.moduleId)
        return module.model == module_model

    async def execute(  # noqa: C901
        self, params: LoadLabwareParams
    ) -> SuccessData[LoadLabwareResult]:
        """Load definition and calibration data necessary for a labware."""
        state_update = StateUpdate()

        # TODO (tz, 8-15-2023): extend column validation to column 1 when working
        # on https://opentrons.atlassian.net/browse/RSS-258 and completing
        # https://opentrons.atlassian.net/browse/RSS-255
        if (
            labware_validation.is_flex_trash(params.loadName)
            and isinstance(params.location, DeckSlotLocation)
            and self._state_view.geometry.get_slot_column(params.location.slotName) != 3
        ):
            raise LabwareIsNotAllowedInLocationError(
                f"{params.loadName} is not allowed in slot {params.location.slotName}"
            )

        if isinstance(params.location, AddressableAreaLocation):
            area_name = params.location.addressableAreaName
            if not (
                fixture_validation.is_deck_slot(params.location.addressableAreaName)
                or fixture_validation.is_abs_reader(params.location.addressableAreaName)
            ):
                raise LabwareIsNotAllowedInLocationError(
                    f"Cannot load {params.loadName} onto addressable area {area_name}"
                )
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                area_name
            )
            state_update.set_addressable_area_used(area_name)
        elif isinstance(params.location, DeckSlotLocation):
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                params.location.slotName.id
            )
            state_update.set_addressable_area_used(params.location.slotName.id)

        verified_location: LabwareLocation
        if (
            self._is_loading_to_module(
                params.location, ModuleModel.FLEX_STACKER_MODULE_V1
            )
            and not self._state_view.modules.get_flex_stacker_substate(
                params.location.moduleId
            ).in_static_mode
        ):
            # labware loaded to the flex stacker hopper is considered offdeck. This is
            # a temporary solution until the hopper can be represented as non-addressable
            # addressable area in the deck configuration.
            verified_location = OFF_DECK_LOCATION
        else:
            verified_location = self._state_view.geometry.ensure_location_not_occupied(
                params.location
            )

        loaded_labware = await self._equipment.load_labware(
            load_name=params.loadName,
            namespace=params.namespace,
            version=params.version,
            location=verified_location,
            labware_id=params.labwareId,
        )

        state_update.set_loaded_labware(
            labware_id=loaded_labware.labware_id,
            offset_id=loaded_labware.offsetId,
            definition=loaded_labware.definition,
            location=verified_location,
            display_name=params.displayName,
        )

        # TODO(jbl 2023-06-23) these validation checks happen after the labware is loaded, because they rely on
        #   on the definition. In practice this will not cause any issues since they will raise protocol ending
        #   exception, but for correctness should be refactored to do this check beforehand.
        if isinstance(verified_location, OnLabwareLocation):
            self._state_view.labware.raise_if_labware_cannot_be_stacked(
                top_labware_definition=loaded_labware.definition,
                bottom_labware_id=verified_location.labwareId,
            )
            # Validate load location is valid for lids
            if (
                labware_validation.validate_definition_is_lid(
                    definition=loaded_labware.definition
                )
                and loaded_labware.definition.compatibleParentLabware is not None
                and self._state_view.labware.get_load_name(verified_location.labwareId)
                not in loaded_labware.definition.compatibleParentLabware
            ):
                raise ValueError(
                    f"Labware Lid {params.loadName} may not be loaded on parent labware {self._state_view.labware.get_display_name(verified_location.labwareId)}."
                )

        # Validate labware for the absorbance reader
        if self._is_loading_to_module(
            params.location, ModuleModel.ABSORBANCE_READER_V1
        ):
            self._state_view.labware.raise_if_labware_incompatible_with_plate_reader(
                loaded_labware.definition
            )

        if self._is_loading_to_module(
            params.location, ModuleModel.FLEX_STACKER_MODULE_V1
        ):
            state_update.load_flex_stacker_hopper_labware(
                module_id=params.location.moduleId,
                labware_id=loaded_labware.labware_id,
            )
        return SuccessData(
            public=LoadLabwareResult(
                labwareId=loaded_labware.labware_id,
                definition=loaded_labware.definition,
                offsetId=loaded_labware.offsetId,
                locationSequence=self._state_view.geometry.get_predicted_location_sequence(
                    params.location
                ),
            ),
            state_update=state_update,
        )


class LoadLabware(BaseCommand[LoadLabwareParams, LoadLabwareResult, ErrorOccurrence]):
    """Load labware command resource model."""

    commandType: LoadLabwareCommandType = "loadLabware"
    params: LoadLabwareParams
    result: Optional[LoadLabwareResult] = None

    _ImplementationCls: Type[LoadLabwareImplementation] = LoadLabwareImplementation


class LoadLabwareCreate(BaseCommandCreate[LoadLabwareParams]):
    """Load labware command creation request."""

    commandType: LoadLabwareCommandType = "loadLabware"
    params: LoadLabwareParams

    _CommandCls: Type[LoadLabware] = LoadLabware
