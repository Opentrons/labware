"""Test deck configuration provider."""

from typing import List, Set

import pytest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.types import DeckDefinitionV5

from opentrons.types import DeckSlotName

from opentrons.protocol_engine.errors import (
    FixtureDoesNotExistError,
    CutoutDoesNotExistError,
    AddressableAreaDoesNotExistError,
)
from opentrons.protocol_engine.types import (
    AddressableArea,
    AreaType,
    PotentialCutoutFixture,
    DeckPoint,
    Dimensions,
    AddressableOffsetVector,
)
from opentrons.protocols.api_support.deck_type import (
    SHORT_TRASH_DECK,
    STANDARD_OT2_DECK,
    STANDARD_OT3_DECK,
)

from opentrons.protocol_engine.resources import deck_configuration_provider as subject


@pytest.fixture(scope="session")
def ot2_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT2_DECK, 5)


@pytest.fixture(scope="session")
def ot2_short_trash_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(SHORT_TRASH_DECK, 5)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 5)


@pytest.mark.parametrize(
    ("cutout_id", "expected_deck_point", "deck_def"),
    [
        (
            "cutout5",
            DeckPoint(x=132.5, y=90.5, z=0.0),
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "cutout5",
            DeckPoint(x=132.5, y=90.5, z=0.0),
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "cutoutC2",
            DeckPoint(x=164.0, y=107, z=0.0),
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_cutout_position(
    cutout_id: str,
    expected_deck_point: DeckPoint,
    deck_def: DeckDefinitionV5,
) -> None:
    """It should get the deck position for the requested cutout id."""
    cutout_position = subject.get_cutout_position(cutout_id, deck_def)
    assert cutout_position == expected_deck_point


def test_get_cutout_position_raises(
    ot3_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should raise if there is no cutout with that ID in the deck definition."""
    with pytest.raises(CutoutDoesNotExistError):
        subject.get_cutout_position("theFunCutout", ot3_standard_deck_def)


@pytest.mark.parametrize(
    ("cutout_fixture_id", "expected_display_name", "deck_def"),
    [
        ("singleStandardSlot", "Standard Slot", lazy_fixture("ot2_standard_deck_def")),
        (
            "singleStandardSlot",
            "Standard Slot",
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "singleRightSlot",
            "Standard Slot Right",
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_cutout_fixture(
    cutout_fixture_id: str,
    expected_display_name: str,
    deck_def: DeckDefinitionV5,
) -> None:
    """It should get the cutout fixture given the cutout fixture id."""
    cutout_fixture = subject.get_cutout_fixture(cutout_fixture_id, deck_def)
    assert cutout_fixture["displayName"] == expected_display_name


def test_get_cutout_fixture_raises(
    ot3_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should raise if the given cutout fixture id does not exist."""
    with pytest.raises(FixtureDoesNotExistError):
        subject.get_cutout_fixture("theFunFixture", ot3_standard_deck_def)


@pytest.mark.parametrize(
    ("cutout_fixture_id", "cutout_id", "expected_areas", "deck_def"),
    [
        (
            "singleStandardSlot",
            "cutout1",
            ["1"],
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "singleStandardSlot",
            "cutout1",
            ["1"],
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "stagingAreaRightSlot",
            "cutoutD3",
            ["D3", "D4"],
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_provided_addressable_area_names(
    cutout_fixture_id: str,
    cutout_id: str,
    expected_areas: List[str],
    deck_def: DeckDefinitionV5,
) -> None:
    """It should get the provided addressable area for the cutout fixture and cutout."""
    provided_addressable_areas = subject.get_provided_addressable_area_names(
        cutout_fixture_id, cutout_id, deck_def
    )
    assert provided_addressable_areas == expected_areas


@pytest.mark.parametrize(
    (
        "addressable_area_name",
        "expected_cutout_id",
        "expected_potential_fixtures",
        "deck_def",
    ),
    [
        (
            "3",
            "cutout3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutout3",
                    cutout_fixture_id="singleStandardSlot",
                    provided_addressable_areas=frozenset({"3"}),
                )
            },
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "3",
            "cutout3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutout3",
                    cutout_fixture_id="singleStandardSlot",
                    provided_addressable_areas=frozenset({"3"}),
                )
            },
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "D3",
            "cutoutD3",
            {
                PotentialCutoutFixture(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="singleRightSlot",
                    provided_addressable_areas=frozenset({"D3"}),
                ),
                PotentialCutoutFixture(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="stagingAreaRightSlot",
                    provided_addressable_areas=frozenset({"D3", "D4"}),
                ),
                PotentialCutoutFixture(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="flexStackerModuleV1",
                    provided_addressable_areas=frozenset(
                        {"D3", "flexStackerModuleV1D4"}
                    ),
                ),
                PotentialCutoutFixture(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="flexStackerModuleV1WithWasteChuteRightAdapterCovered",
                    provided_addressable_areas=frozenset(
                        {
                            "1ChannelWasteChute",
                            "8ChannelWasteChute",
                            "flexStackerModuleV1D4",
                            "D3",
                        }
                    ),
                ),
                PotentialCutoutFixture(
                    cutout_id="cutoutD3",
                    cutout_fixture_id="flexStackerModuleV1WithWasteChuteRightAdapterNoCover",
                    provided_addressable_areas=frozenset(
                        {
                            "1ChannelWasteChute",
                            "8ChannelWasteChute",
                            "96ChannelWasteChute",
                            "gripperWasteChute",
                            "flexStackerModuleV1D4",
                            "D3",
                        }
                    ),
                ),
            },
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_potential_cutout_fixtures(
    addressable_area_name: str,
    expected_cutout_id: str,
    expected_potential_fixtures: Set[PotentialCutoutFixture],
    deck_def: DeckDefinitionV5,
) -> None:
    """It should get a cutout id and a set of potential cutout fixtures for an addressable area name."""
    cutout_id, potential_fixtures = subject.get_potential_cutout_fixtures(
        addressable_area_name, deck_def
    )
    assert cutout_id == expected_cutout_id
    assert potential_fixtures == expected_potential_fixtures


def test_get_potential_cutout_fixtures_raises(
    ot3_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should raise if there is no fixtures that provide the requested area."""
    with pytest.raises(AddressableAreaDoesNotExistError):
        subject.get_potential_cutout_fixtures("theFunArea", ot3_standard_deck_def)


# TODO put in fixed trash for OT2 decks
@pytest.mark.parametrize(
    ("addressable_area_name", "expected_addressable_area", "deck_def"),
    [
        (
            "1",
            AddressableArea(
                area_name="1",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_1,
                display_name="Slot 1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[
                    "magneticModuleType",
                    "temperatureModuleType",
                    "heaterShakerModuleType",
                ],
            ),
            lazy_fixture("ot2_standard_deck_def"),
        ),
        (
            "1",
            AddressableArea(
                area_name="1",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_1,
                display_name="Slot 1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[
                    "magneticModuleType",
                    "temperatureModuleType",
                    "heaterShakerModuleType",
                ],
            ),
            lazy_fixture("ot2_short_trash_deck_def"),
        ),
        (
            "D1",
            AddressableArea(
                area_name="D1",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_D1,
                display_name="Slot D1",
                bounding_box=Dimensions(x=128.0, y=86.0, z=0),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            "movableTrashB3",
            AddressableArea(
                area_name="movableTrashB3",
                area_type=AreaType.MOVABLE_TRASH,
                base_slot=DeckSlotName.SLOT_B3,
                display_name="Trash Bin in B3",
                bounding_box=Dimensions(x=225, y=78, z=40),
                position=AddressableOffsetVector(x=-5.25, y=6, z=3),
                compatible_module_types=[],
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            "gripperWasteChute",
            AddressableArea(
                area_name="gripperWasteChute",
                area_type=AreaType.WASTE_CHUTE,
                base_slot=DeckSlotName.SLOT_D3,
                display_name="Waste Chute",
                bounding_box=Dimensions(x=0, y=0, z=0),
                position=AddressableOffsetVector(x=65, y=31, z=139.5),
                compatible_module_types=[],
            ),
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_addressable_area_from_name(
    addressable_area_name: str,
    expected_addressable_area: AddressableArea,
    deck_def: DeckDefinitionV5,
) -> None:
    """It should get the deck position for the requested cutout id."""
    addressable_area = subject.get_addressable_area_from_name(
        addressable_area_name, DeckPoint(x=1, y=2, z=3), deck_def
    )
    assert addressable_area == expected_addressable_area


def test_get_addressable_area_from_name_raises(
    ot3_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should raise if there is no addressable area by that name in the deck."""
    with pytest.raises(AddressableAreaDoesNotExistError):
        subject.get_addressable_area_from_name(
            "theFunArea",
            DeckPoint(x=1, y=2, z=3),
            ot3_standard_deck_def,
        )
