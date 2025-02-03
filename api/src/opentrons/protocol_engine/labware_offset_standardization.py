"""Convert labware offset creation requests and stored elements between legacy and new."""

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck.types import DeckDefinitionV5
from .errors import (
    OffsetLocationInvalidError,
    FixtureDoesNotExistError,
)
from .types import (
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    LabwareOffsetCreateInternal,
    LegacyLabwareOffsetLocation,
    LabwareOffsetLocationSequence,
    OnLabwareOffsetLocationSequenceComponent,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    ModuleModel,
)
from .resources import deck_configuration_provider


def standardize_labware_offset_create(
    request: LabwareOffsetCreate | LegacyLabwareOffsetCreate,
    robot_type: RobotType,
    deck_definition: DeckDefinitionV5,
) -> LabwareOffsetCreateInternal:
    """Turn a union of old and new labware offset create requests into a new one."""
    location_sequence, legacy_location = _locations_for_create(
        request, robot_type, deck_definition
    )
    return LabwareOffsetCreateInternal(
        definitionUri=request.definitionUri,
        locationSequence=location_sequence,
        legacyLocation=legacy_location,
        vector=request.vector,
    )


def legacy_offset_location_to_offset_location_sequence(
    location: LegacyLabwareOffsetLocation, deck_definition: DeckDefinitionV5
) -> LabwareOffsetLocationSequence:
    """Convert a legacy location to a new-style sequence."""
    sequence: LabwareOffsetLocationSequence = []
    if location.definitionUri:
        sequence.append(
            OnLabwareOffsetLocationSequenceComponent(labwareUri=location.definitionUri)
        )
    if location.moduleModel:
        sequence.append(
            OnModuleOffsetLocationSequenceComponent(moduleModel=location.moduleModel)
        )
        cutout_id = deck_configuration_provider.get_cutout_id_by_deck_slot_name(
            location.slotName
        )
        possible_cutout_fixture_id = location.moduleModel.value
        try:
            addressable_area = deck_configuration_provider.get_labware_hosting_addressable_area_name_for_cutout_and_cutout_fixture(
                cutout_id, possible_cutout_fixture_id, deck_definition
            )
            sequence.append(
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName=addressable_area
                )
            )
        except FixtureDoesNotExistError:
            # this is an OT-2 (or this module isn't supported in the deck definition) and we should use a
            # slot addressable area name
            sequence.append(
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName=location.slotName.value
                )
            )

    else:
        # Slight hack: we should have a more formal association here. However, since the slot
        # name is already standardized, and since the addressable areas for slots are just the
        # name of the slots, we can rely on this.
        sequence.append(
            OnAddressableAreaOffsetLocationSequenceComponent(
                addressableAreaName=location.slotName.value
            )
        )
    return sequence


def _offset_location_sequence_head_to_labware_and_module(
    location_sequence: LabwareOffsetLocationSequence,
) -> tuple[ModuleModel | None, str | None]:
    labware_uri: str | None = None
    module_model: ModuleModel | None = None
    for location in location_sequence:
        if isinstance(location, OnAddressableAreaOffsetLocationSequenceComponent):
            raise OffsetLocationInvalidError(
                "Addressable areas may only be the final element of an offset location."
            )
        elif isinstance(location, OnLabwareOffsetLocationSequenceComponent):
            if labware_uri is not None:
                # We only take the first location
                continue
            if module_model is not None:
                # Labware can't be underneath modules
                raise OffsetLocationInvalidError(
                    "Labware must not be underneath a module."
                )
            labware_uri = location.labwareUri
        elif isinstance(location, OnModuleOffsetLocationSequenceComponent):
            if module_model is not None:
                # Bad, somebody put more than one module in here
                raise OffsetLocationInvalidError(
                    "Only one module location may exist in an offset location."
                )
            module_model = location.moduleModel
        else:
            raise OffsetLocationInvalidError(
                f"Invalid location component in offset location: {repr(location)}"
            )
    return module_model, labware_uri


def _offset_location_sequence_to_legacy_offset_location(
    location_sequence: LabwareOffsetLocationSequence, deck_definition: DeckDefinitionV5
) -> LegacyLabwareOffsetLocation:
    if len(location_sequence) == 0:
        raise OffsetLocationInvalidError(
            "Offset locations must contain at least one component."
        )
    last_element = location_sequence[-1]
    if not isinstance(last_element, OnAddressableAreaOffsetLocationSequenceComponent):
        raise OffsetLocationInvalidError(
            "Offset locations must end with an addressable area."
        )
    module_model, labware_uri = _offset_location_sequence_head_to_labware_and_module(
        location_sequence[:-1]
    )
    (
        cutout_id,
        cutout_fixtures,
    ) = deck_configuration_provider.get_potential_cutout_fixtures(
        last_element.addressableAreaName, deck_definition
    )
    slot_name = deck_configuration_provider.get_deck_slot_for_cutout_id(cutout_id)
    return LegacyLabwareOffsetLocation(
        slotName=slot_name, moduleModel=module_model, definitionUri=labware_uri
    )


def _locations_for_create(
    request: LabwareOffsetCreate | LegacyLabwareOffsetCreate,
    robot_type: RobotType,
    deck_definition: DeckDefinitionV5,
) -> tuple[LabwareOffsetLocationSequence, LegacyLabwareOffsetLocation]:
    if isinstance(request, LabwareOffsetCreate):
        return (
            request.locationSequence,
            _offset_location_sequence_to_legacy_offset_location(
                request.locationSequence, deck_definition
            ),
        )
    else:
        normalized = request.location.model_copy(
            update={
                "slotName": request.location.slotName.to_equivalent_for_robot_type(
                    robot_type
                )
            }
        )
        return (
            legacy_offset_location_to_offset_location_sequence(
                normalized, deck_definition
            ),
            normalized,
        )
