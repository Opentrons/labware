"""Deck configuration resource provider."""

from typing import List, Set, Tuple

from opentrons_shared_data.deck.types import (
    DeckDefinitionV5,
    CutoutFixture,
)

from opentrons.types import DeckSlotName

from ..types import (
    AddressableArea,
    AreaType,
    PotentialCutoutFixture,
    DeckPoint,
    Dimensions,
    AddressableOffsetVector,
)
from ..errors import (
    CutoutDoesNotExistError,
    FixtureDoesNotExistError,
    AddressableAreaDoesNotExistError,
    SlotDoesNotExistError,
)


def get_cutout_position(cutout_id: str, deck_definition: DeckDefinitionV5) -> DeckPoint:
    """Get the base position of a cutout on the deck."""
    for cutout in deck_definition["locations"]["cutouts"]:
        if cutout_id == cutout["id"]:
            position = cutout["position"]
            return DeckPoint(x=position[0], y=position[1], z=position[2])
    else:
        raise CutoutDoesNotExistError(f"Could not find cutout with name {cutout_id}")


def get_cutout_fixture(
    cutout_fixture_id: str, deck_definition: DeckDefinitionV5
) -> CutoutFixture:
    """Gets cutout fixture from deck that matches the cutout fixture ID provided."""
    for cutout_fixture in deck_definition["cutoutFixtures"]:
        if cutout_fixture["id"] == cutout_fixture_id:
            return cutout_fixture
    raise FixtureDoesNotExistError(
        f"Could not find cutout fixture with name {cutout_fixture_id}"
    )


def get_provided_addressable_area_names(
    cutout_fixture_id: str, cutout_id: str, deck_definition: DeckDefinitionV5
) -> List[str]:
    """Gets a list of the addressable areas provided by the cutout fixture on the cutout."""
    cutout_fixture = get_cutout_fixture(cutout_fixture_id, deck_definition)
    try:
        return cutout_fixture["providesAddressableAreas"][cutout_id]
    except KeyError:
        return []


def get_addressable_area_display_name(
    addressable_area_name: str, deck_definition: DeckDefinitionV5
) -> str:
    """Get the display name for an addressable area name."""
    for addressable_area in deck_definition["locations"]["addressableAreas"]:
        if addressable_area["id"] == addressable_area_name:
            return addressable_area["displayName"]
    raise AddressableAreaDoesNotExistError(
        f"Could not find addressable area with name {addressable_area_name}"
    )


def get_potential_cutout_fixtures(
    addressable_area_name: str, deck_definition: DeckDefinitionV5
) -> Tuple[str, Set[PotentialCutoutFixture]]:
    """Given an addressable area name, gets the cutout ID associated with it and a set of potential fixtures."""
    potential_fixtures = []
    for cutout_fixture in deck_definition["cutoutFixtures"]:
        for cutout_id, provided_areas in cutout_fixture[
            "providesAddressableAreas"
        ].items():
            if addressable_area_name in provided_areas:
                potential_fixtures.append(
                    PotentialCutoutFixture(
                        cutout_id=cutout_id,
                        cutout_fixture_id=cutout_fixture["id"],
                        provided_addressable_areas=frozenset(provided_areas),
                    )
                )
    # This following logic is making the assumption that every addressable area can only go on one cutout, though
    # it may have multiple cutout fixtures that supply it on that cutout. If this assumption changes, some of the
    # following logic will have to be readjusted
    if not potential_fixtures:
        raise AddressableAreaDoesNotExistError(
            f"{addressable_area_name} is not provided by any cutout fixtures"
            f" in deck definition {deck_definition['otId']}"
        )
    cutout_id = potential_fixtures[0].cutout_id
    assert all(cutout_id == fixture.cutout_id for fixture in potential_fixtures)
    return cutout_id, set(potential_fixtures)


def get_addressable_area_from_name(
    addressable_area_name: str,
    cutout_position: DeckPoint,
    deck_definition: DeckDefinitionV5,
) -> AddressableArea:
    """Given a name and a cutout position, get an addressable area on the deck."""
    for addressable_area in deck_definition["locations"]["addressableAreas"]:
        if addressable_area["id"] == addressable_area_name:
            cutout_id, _ = get_potential_cutout_fixtures(
                addressable_area_name, deck_definition
            )
            base_slot = get_deck_slot_for_cutout_id(cutout_id)
            area_offset = addressable_area["offsetFromCutoutFixture"]
            position = AddressableOffsetVector(
                x=area_offset[0] + cutout_position.x,
                y=area_offset[1] + cutout_position.y,
                z=area_offset[2] + cutout_position.z,
            )
            bounding_box = Dimensions(
                x=addressable_area["boundingBox"]["xDimension"],
                y=addressable_area["boundingBox"]["yDimension"],
                z=addressable_area["boundingBox"]["zDimension"],
            )

            return AddressableArea(
                area_name=addressable_area["id"],
                area_type=AreaType(addressable_area["areaType"]),
                base_slot=base_slot,
                display_name=addressable_area["displayName"],
                bounding_box=bounding_box,
                position=position,
                compatible_module_types=addressable_area.get(
                    "compatibleModuleTypes", []
                ),
            )
    raise AddressableAreaDoesNotExistError(
        f"Could not find addressable area with name {addressable_area_name}"
    )


def get_deck_slot_for_cutout_id(cutout_id: str) -> DeckSlotName:
    """Get the corresponding deck slot for an addressable area."""
    try:
        return CUTOUT_TO_DECK_SLOT_MAP[cutout_id]
    except KeyError:
        raise CutoutDoesNotExistError(f"Could not find data for cutout {cutout_id}")


def get_cutout_id_by_deck_slot_name(slot_name: DeckSlotName) -> str:
    """Get the Cutout ID of a given Deck Slot by Deck Slot Name."""
    try:
        return DECK_SLOT_TO_CUTOUT_MAP[slot_name]
    except KeyError:
        raise SlotDoesNotExistError(f"Could not find data for slot {slot_name.value}")


def get_labware_hosting_addressable_area_name_for_cutout_and_cutout_fixture(
    cutout_id: str, cutout_fixture_id: str, deck_definition: DeckDefinitionV5
) -> str:
    """Get the first addressable area that can contain labware for a cutout and fixture.

    This probably isn't relevant outside of labware offset locations, where (for now) nothing
    provides more than one labware-containing addressable area.
    """
    for cutoutFixture in deck_definition["cutoutFixtures"]:
        if cutoutFixture["id"] != cutout_fixture_id:
            continue
        provided_aas = cutoutFixture["providesAddressableAreas"].get(cutout_id, None)
        if provided_aas is None:
            raise CutoutDoesNotExistError(
                f"{cutout_fixture_id} does not go in {cutout_id}"
            )
        for aa_id in provided_aas:
            for addressable_area in deck_definition["locations"]["addressableAreas"]:
                if addressable_area["id"] != aa_id:
                    continue
                # TODO: In deck def v6 this will be easier, but as of right now there isn't really
                # a way to tell from an addressable area whether it takes labware so let's take the
                # first one
                return aa_id
            raise AddressableAreaDoesNotExistError(
                f"Could not find an addressable area that allows labware from cutout fixture {cutout_fixture_id} in cutout {cutout_id}"
            )

    raise FixtureDoesNotExistError(f"Could not find entry for {cutout_fixture_id}")


# This is a temporary shim while Protocol Engine's conflict-checking code
# can only take deck slots as input.
# Long-term solution: Check for conflicts based on bounding boxes, not slot adjacencies.
# Shorter-term: Change the conflict-checking code to take cutouts instead of deck slots.
CUTOUT_TO_DECK_SLOT_MAP: dict[str, DeckSlotName] = {
    # OT-2
    "cutout1": DeckSlotName.SLOT_1,
    "cutout2": DeckSlotName.SLOT_2,
    "cutout3": DeckSlotName.SLOT_3,
    "cutout4": DeckSlotName.SLOT_4,
    "cutout5": DeckSlotName.SLOT_5,
    "cutout6": DeckSlotName.SLOT_6,
    "cutout7": DeckSlotName.SLOT_7,
    "cutout8": DeckSlotName.SLOT_8,
    "cutout9": DeckSlotName.SLOT_9,
    "cutout10": DeckSlotName.SLOT_10,
    "cutout11": DeckSlotName.SLOT_11,
    "cutout12": DeckSlotName.FIXED_TRASH,
    # Flex
    "cutoutA1": DeckSlotName.SLOT_A1,
    "cutoutA2": DeckSlotName.SLOT_A2,
    "cutoutA3": DeckSlotName.SLOT_A3,
    "cutoutB1": DeckSlotName.SLOT_B1,
    "cutoutB2": DeckSlotName.SLOT_B2,
    "cutoutB3": DeckSlotName.SLOT_B3,
    "cutoutC1": DeckSlotName.SLOT_C1,
    "cutoutC2": DeckSlotName.SLOT_C2,
    "cutoutC3": DeckSlotName.SLOT_C3,
    "cutoutD1": DeckSlotName.SLOT_D1,
    "cutoutD2": DeckSlotName.SLOT_D2,
    "cutoutD3": DeckSlotName.SLOT_D3,
}
DECK_SLOT_TO_CUTOUT_MAP = {
    deck_slot: cutout for cutout, deck_slot in CUTOUT_TO_DECK_SLOT_MAP.items()
}
