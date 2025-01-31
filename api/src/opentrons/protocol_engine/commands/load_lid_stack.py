"""Load lid stack command request, result, and implementation models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, Type, List
from typing_extensions import Literal

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from ..errors import LabwareIsNotAllowedInLocationError, ProtocolEngineError
from ..resources import fixture_validation, labware_validation
from ..types import (
    LabwareLocation,
    OnLabwareLocation,
    DeckSlotLocation,
    AddressableAreaLocation,
)

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate

if TYPE_CHECKING:
    from ..state.state import StateView
    from ..execution import EquipmentHandler


LoadLidStackCommandType = Literal["loadLidStack"]

_LID_STACK_PE_LABWARE = "protocol_engine_lid_stack_object"
_LID_STACK_PE_NAMESPACE = "opentrons"
_LID_STACK_PE_VERSION = 1


class LoadLidStackParams(BaseModel):
    """Payload required to load a lid stack onto a location."""

    location: LabwareLocation = Field(
        ...,
        description="Location the lid stack should be loaded into.",
    )
    loadName: str = Field(
        ...,
        description="Name used to reference a lid labware definition.",
    )
    namespace: str = Field(
        ...,
        description="The namespace the lid labware definition belongs to.",
    )
    version: int = Field(
        ...,
        description="The lid labware definition version.",
    )
    quantity: int = Field(
        ...,
        description="The quantity of lids to load.",
    )


class LoadLidStackResult(BaseModel):
    """Result data from the execution of a LoadLidStack command."""

    stackLabwareId: str = Field(
        ...,
        description="An ID to reference the Protocol Engine Labware Lid Stack in subsequent commands.",
    )
    labwareIds: List[str] = Field(
        ...,
        description="A list of lid labware IDs to reference the lids in this stack by. The first ID is the bottom of the stack.",
    )
    definition: LabwareDefinition = Field(
        ...,
        description="The full definition data for this lid labware.",
    )
    location: LabwareLocation = Field(
        ..., description="The Location that the stack of lid labware has been loaded."
    )


class LoadLidStackImplementation(
    AbstractCommandImpl[LoadLidStackParams, SuccessData[LoadLidStackResult]]
):
    """Load lid stack command implementation."""

    def __init__(
        self, equipment: EquipmentHandler, state_view: StateView, **kwargs: object
    ) -> None:
        self._equipment = equipment
        self._state_view = state_view

    async def execute(
        self, params: LoadLidStackParams
    ) -> SuccessData[LoadLidStackResult]:
        """Load definition and calibration data necessary for a lid stack."""
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
        elif isinstance(params.location, DeckSlotLocation):
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                params.location.slotName.id
            )

        verified_location = self._state_view.geometry.ensure_location_not_occupied(
            params.location
        )

        lid_stack_object = await self._equipment.load_labware(
            load_name=_LID_STACK_PE_LABWARE,
            namespace=_LID_STACK_PE_NAMESPACE,
            version=_LID_STACK_PE_VERSION,
            location=verified_location,
            labware_id=None,
        )
        if not labware_validation.validate_definition_is_system(
            lid_stack_object.definition
        ):
            raise ProtocolEngineError(
                message="Lid Stack Labware Object Labware Definition does not contain required allowed role 'system'."
            )

        loaded_lid_labwares = await self._equipment.load_lids(
            load_name=params.loadName,
            namespace=params.namespace,
            version=params.version,
            location=OnLabwareLocation(labwareId=lid_stack_object.labware_id),
            quantity=params.quantity,
        )
        loaded_lid_locations_by_id = {}
        load_location = OnLabwareLocation(labwareId=lid_stack_object.labware_id)
        for loaded_lid in loaded_lid_labwares:
            loaded_lid_locations_by_id[loaded_lid.labware_id] = load_location
            load_location = OnLabwareLocation(labwareId=loaded_lid.labware_id)

        state_update = StateUpdate()
        state_update.set_loaded_lid_stack(
            stack_id=lid_stack_object.labware_id,
            stack_object_definition=lid_stack_object.definition,
            stack_location=verified_location,
            labware_ids=list(loaded_lid_locations_by_id.keys()),
            labware_definition=loaded_lid_labwares[0].definition,
            locations=loaded_lid_locations_by_id,
        )

        if isinstance(verified_location, OnLabwareLocation):
            self._state_view.labware.raise_if_labware_cannot_be_stacked(
                top_labware_definition=loaded_lid_labwares[
                    params.quantity - 1
                ].definition,
                bottom_labware_id=verified_location.labwareId,
            )

        return SuccessData(
            public=LoadLidStackResult(
                stackLabwareId=lid_stack_object.labware_id,
                labwareIds=list(loaded_lid_locations_by_id.keys()),
                definition=loaded_lid_labwares[0].definition,
                location=params.location,
            ),
            state_update=state_update,
        )


class LoadLidStack(
    BaseCommand[LoadLidStackParams, LoadLidStackResult, ErrorOccurrence]
):
    """Load lid stack command resource model."""

    commandType: LoadLidStackCommandType = "loadLidStack"
    params: LoadLidStackParams
    result: Optional[LoadLidStackResult] = None

    _ImplementationCls: Type[LoadLidStackImplementation] = LoadLidStackImplementation


class LoadLidStackCreate(BaseCommandCreate[LoadLidStackParams]):
    """Load lid stack command creation request."""

    commandType: LoadLidStackCommandType = "loadLidStack"
    params: LoadLidStackParams

    _CommandCls: Type[LoadLidStack] = LoadLidStack
