"""Addressable area state view tests.

DEPRECATED: Testing AddressableAreaView independently of AddressableAreaStore is no
longer helpful. Try to add new tests to test_addressable_area_state.py, where they can be
tested together, treating AddressableAreaState as a private implementation detail.
"""

import inspect
from unittest.mock import sentinel

import pytest
from decoy import Decoy
from typing import Dict, Set, Optional, cast

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons.types import Point, DeckSlotName

from opentrons.protocol_engine.errors import (
    AreaNotInDeckConfigurationError,
    IncompatibleAddressableAreaError,
    SlotDoesNotExistError,
    AddressableAreaDoesNotExistError,
)
from opentrons.protocol_engine.resources import deck_configuration_provider
from opentrons.protocol_engine.state.addressable_areas import (
    AddressableAreaState,
    AddressableAreaView,
)
from opentrons.protocol_engine.types import (
    AddressableArea,
    AreaType,
    DeckConfigurationType,
    PotentialCutoutFixture,
    Dimensions,
    DeckPoint,
    AddressableOffsetVector,
)


@pytest.fixture(autouse=True)
def patch_mock_deck_configuration_provider(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out deck_configuration_provider.py functions."""
    for name, func in inspect.getmembers(
        deck_configuration_provider, inspect.isfunction
    ):
        monkeypatch.setattr(deck_configuration_provider, name, decoy.mock(func=func))


def get_addressable_area_view(
    loaded_addressable_areas_by_name: Optional[Dict[str, AddressableArea]] = None,
    potential_cutout_fixtures_by_cutout_id: Optional[
        Dict[str, Set[PotentialCutoutFixture]]
    ] = None,
    deck_definition: Optional[DeckDefinitionV5] = None,
    deck_configuration: Optional[DeckConfigurationType] = None,
    robot_type: RobotType = "OT-3 Standard",
    use_simulated_deck_config: bool = False,
) -> AddressableAreaView:
    """Get a labware view test subject."""
    state = AddressableAreaState(
        loaded_addressable_areas_by_name=loaded_addressable_areas_by_name or {},
        potential_cutout_fixtures_by_cutout_id=potential_cutout_fixtures_by_cutout_id
        or {},
        deck_definition=deck_definition or cast(DeckDefinitionV5, {"otId": "fake"}),
        robot_definition={
            "displayName": "OT-3",
            "robotType": "OT-3 Standard",
            "models": ["OT-3 Standard"],
            "extents": [477.2, 493.8, 0.0],
            "paddingOffsets": {
                "rear": -177.42,
                "front": 51.8,
                "leftSide": 31.88,
                "rightSide": -80.32,
            },
            "mountOffsets": {
                "left": [-13.5, -60.5, 255.675],
                "right": [40.5, -60.5, 255.675],
                "gripper": [84.55, -12.75, 93.85],
            },
        },
        deck_configuration=deck_configuration or [],
        robot_type=robot_type,
        use_simulated_deck_config=use_simulated_deck_config,
    )

    return AddressableAreaView(state=state)


def test_get_all_cutout_fixtures_simulated_deck_config() -> None:
    """It should return no cutout fixtures when the deck config is simulated."""
    subject = get_addressable_area_view(
        deck_configuration=None,
        use_simulated_deck_config=True,
    )
    assert subject.get_all_cutout_fixtures() is None


def test_get_all_cutout_fixtures_non_simulated_deck_config() -> None:
    """It should return the cutout fixtures from the deck config, if it's not simulated."""
    subject = get_addressable_area_view(
        deck_configuration=[
            ("cutout-id-1", "cutout-fixture-id-1", None),
            ("cutout-id-2", "cutout-fixture-id-2", None),
        ],
        use_simulated_deck_config=False,
    )
    assert subject.get_all_cutout_fixtures() == [
        "cutout-fixture-id-1",
        "cutout-fixture-id-2",
    ]


def test_get_loaded_addressable_area() -> None:
    """It should get the loaded addressable area."""
    addressable_area = AddressableArea(
        area_name="area",
        area_type=AreaType.SLOT,
        base_slot=DeckSlotName.SLOT_D3,
        display_name="fancy name",
        bounding_box=Dimensions(x=1, y=2, z=3),
        position=AddressableOffsetVector(x=7, y=8, z=9),
        compatible_module_types=["magneticModuleType"],
    )
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={"abc": addressable_area}
    )

    assert subject.get_addressable_area("abc") is addressable_area


def test_get_loaded_addressable_area_raises() -> None:
    """It should raise if the addressable area does not exist."""
    subject = get_addressable_area_view()

    with pytest.raises(AreaNotInDeckConfigurationError):
        subject.get_addressable_area("abc")


def test_get_addressable_area_for_simulation_already_loaded() -> None:
    """It should get the addressable area for a simulation that has not been loaded yet."""
    addressable_area = AddressableArea(
        area_name="area",
        area_type=AreaType.SLOT,
        base_slot=DeckSlotName.SLOT_D3,
        display_name="fancy name",
        bounding_box=Dimensions(x=1, y=2, z=3),
        position=AddressableOffsetVector(x=7, y=8, z=9),
        compatible_module_types=["magneticModuleType"],
    )
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={"abc": addressable_area},
        use_simulated_deck_config=True,
    )

    assert subject.get_addressable_area("abc") is addressable_area


def test_get_addressable_area_for_simulation_not_loaded(decoy: Decoy) -> None:
    """It should get the addressable area for a simulation that has not been loaded yet."""
    subject = get_addressable_area_view(
        potential_cutout_fixtures_by_cutout_id={
            "cutoutA1": {
                PotentialCutoutFixture(
                    cutout_id="cutoutA1",
                    cutout_fixture_id="blah",
                    provided_addressable_areas=frozenset(),
                )
            }
        },
        use_simulated_deck_config=True,
        deck_definition=sentinel.deck_definition,
    )

    addressable_area = AddressableArea(
        area_name="area",
        area_type=AreaType.SLOT,
        base_slot=DeckSlotName.SLOT_D3,
        display_name="fancy name",
        bounding_box=Dimensions(x=1, y=2, z=3),
        position=AddressableOffsetVector(x=7, y=8, z=9),
        compatible_module_types=["magneticModuleType"],
    )

    decoy.when(
        deck_configuration_provider.get_potential_cutout_fixtures(
            "abc",
            sentinel.deck_definition,
        )
    ).then_return(
        (
            "cutoutA1",
            {
                PotentialCutoutFixture(
                    cutout_id="cutoutA1",
                    cutout_fixture_id="blah",
                    provided_addressable_areas=frozenset(),
                )
            },
        )
    )

    decoy.when(
        deck_configuration_provider.get_cutout_position(
            "cutoutA1",
            sentinel.deck_definition,
        )
    ).then_return(DeckPoint(x=1, y=2, z=3))

    decoy.when(
        deck_configuration_provider.get_addressable_area_from_name(
            "abc",
            DeckPoint(x=1, y=2, z=3),
            sentinel.deck_definition,
        )
    ).then_return(addressable_area)

    assert subject.get_addressable_area("abc") is addressable_area


def test_get_addressable_area_for_simulation_raises(decoy: Decoy) -> None:
    """It should raise if the requested addressable area is incompatible with loaded ones."""
    subject = get_addressable_area_view(
        potential_cutout_fixtures_by_cutout_id={
            "123": {
                PotentialCutoutFixture(
                    cutout_id="789",
                    cutout_fixture_id="bleh",
                    provided_addressable_areas=frozenset(),
                )
            }
        },
        use_simulated_deck_config=True,
        deck_definition=sentinel.deck_definition,
    )

    decoy.when(
        deck_configuration_provider.get_potential_cutout_fixtures(
            "abc", sentinel.deck_definition
        )
    ).then_return(
        (
            "123",
            {
                PotentialCutoutFixture(
                    cutout_id="123",
                    cutout_fixture_id="blah",
                    provided_addressable_areas=frozenset(),
                )
            },
        )
    )

    decoy.when(
        deck_configuration_provider.get_provided_addressable_area_names(
            "bleh", "789", sentinel.deck_definition
        )
    ).then_return([])

    with pytest.raises(IncompatibleAddressableAreaError):
        subject.get_addressable_area("abc")


def test_get_addressable_area_position() -> None:
    """It should get the absolute location of the addressable area."""
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={
            "abc": AddressableArea(
                area_name="area",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_D3,
                display_name="fancy name",
                bounding_box=Dimensions(x=10, y=20, z=30),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
            )
        }
    )

    result = subject.get_addressable_area_position("abc")
    assert result == Point(1, 2, 3)


def test_get_addressable_area_move_to_location() -> None:
    """It should get the absolute location of an addressable area's move to location."""
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={
            "abc": AddressableArea(
                area_name="area",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_D3,
                display_name="fancy name",
                bounding_box=Dimensions(x=10, y=20, z=30),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
            )
        }
    )

    result = subject.get_addressable_area_move_to_location("abc")
    assert result == Point(6, 12, 33)


def test_get_addressable_area_center() -> None:
    """It should get the absolute location of an addressable area's center."""
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={
            "abc": AddressableArea(
                area_name="area",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_D3,
                display_name="fancy name",
                bounding_box=Dimensions(x=10, y=20, z=30),
                position=AddressableOffsetVector(x=1, y=2, z=3),
                compatible_module_types=[],
            )
        }
    )

    result = subject.get_addressable_area_center("abc")
    assert result == Point(6, 12, 3)


def test_get_fixture_height(decoy: Decoy) -> None:
    """It should return the height of the requested fixture."""
    subject = get_addressable_area_view(deck_definition=sentinel.deck_definition)
    decoy.when(
        deck_configuration_provider.get_cutout_fixture(
            "someShortCutoutFixture", sentinel.deck_definition
        )
    ).then_return(
        {
            "height": 10,
            # These values don't matter:
            "id": "id",
            "expectOpentronsModuleSerialNumber": False,
            "fixtureGroup": {},
            "mayMountTo": [],
            "displayName": "",
            "providesAddressableAreas": {},
        }
    )

    decoy.when(
        deck_configuration_provider.get_cutout_fixture(
            "someTallCutoutFixture", sentinel.deck_definition
        )
    ).then_return(
        {
            "height": 9000.1,
            # These values don't matter:
            "id": "id",
            "expectOpentronsModuleSerialNumber": False,
            "fixtureGroup": {},
            "mayMountTo": [],
            "displayName": "",
            "providesAddressableAreas": {},
        }
    )

    assert subject.get_fixture_height("someShortCutoutFixture") == 10
    assert subject.get_fixture_height("someTallCutoutFixture") == 9000.1


def test_get_slot_definition() -> None:
    """It should return a deck slot's definition."""
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={
            "6": AddressableArea(
                area_name="area",
                area_type=AreaType.SLOT,
                base_slot=DeckSlotName.SLOT_D3,
                display_name="fancy name",
                bounding_box=Dimensions(x=1, y=2, z=3),
                position=AddressableOffsetVector(x=7, y=8, z=9),
                compatible_module_types=["magneticModuleType"],
            )
        }
    )

    result = subject.get_slot_definition(DeckSlotName.SLOT_6.id)

    assert result == {
        "id": "area",
        "position": [7, 8, 9],
        "boundingBox": {
            "xDimension": 1,
            "yDimension": 2,
            "zDimension": 3,
        },
        "displayName": "fancy name",
        "compatibleModuleTypes": ["magneticModuleType"],
    }


def test_get_slot_definition_raises_with_bad_slot_name(decoy: Decoy) -> None:
    """It should raise a SlotDoesNotExistError if a bad slot name is given."""
    deck_definition = cast(DeckDefinitionV5, {"otId": "fake"})
    subject = get_addressable_area_view(
        deck_definition=deck_definition,
    )

    decoy.when(
        deck_configuration_provider.get_potential_cutout_fixtures(
            "foo", deck_definition
        )
    ).then_raise(AddressableAreaDoesNotExistError())

    with pytest.raises(SlotDoesNotExistError):
        subject.get_slot_definition("foo")


def test_raise_if_area_not_in_deck_configuration_on_robot(decoy: Decoy) -> None:
    """It should raise if the requested addressable area name is not loaded in state."""
    subject = get_addressable_area_view(
        loaded_addressable_areas_by_name={"real": decoy.mock(cls=AddressableArea)}
    )

    subject.raise_if_area_not_in_deck_configuration("real")

    with pytest.raises(AreaNotInDeckConfigurationError):
        subject.raise_if_area_not_in_deck_configuration("fake")


def test_raise_if_area_not_in_deck_configuration_simulated_config(decoy: Decoy) -> None:
    """It should raise if the requested addressable area name is not loaded in state."""
    subject = get_addressable_area_view(
        use_simulated_deck_config=True,
        potential_cutout_fixtures_by_cutout_id={
            "waluigi": {
                PotentialCutoutFixture(
                    cutout_id="fire flower",
                    cutout_fixture_id="1up",
                    provided_addressable_areas=frozenset(),
                )
            },
            "wario": {
                PotentialCutoutFixture(
                    cutout_id="mushroom",
                    cutout_fixture_id="star",
                    provided_addressable_areas=frozenset(),
                )
            },
        },
        deck_definition=sentinel.deck_definition,
    )

    decoy.when(
        deck_configuration_provider.get_potential_cutout_fixtures(
            "mario", sentinel.deck_definition
        )
    ).then_return(
        (
            "wario",
            {
                PotentialCutoutFixture(
                    cutout_id="mushroom",
                    cutout_fixture_id="star",
                    provided_addressable_areas=frozenset(),
                )
            },
        )
    )

    subject.raise_if_area_not_in_deck_configuration("mario")

    decoy.when(
        deck_configuration_provider.get_potential_cutout_fixtures(
            "luigi", sentinel.deck_definition
        )
    ).then_return(
        (
            "waluigi",
            {
                PotentialCutoutFixture(
                    cutout_id="mushroom",
                    cutout_fixture_id="star",
                    provided_addressable_areas=frozenset(),
                )
            },
        )
    )

    decoy.when(
        deck_configuration_provider.get_provided_addressable_area_names(
            "1up", "fire flower", sentinel.deck_definition
        )
    ).then_return([])

    decoy.when(
        deck_configuration_provider.get_addressable_area_display_name(
            "luigi", sentinel.deck_definition
        )
    ).then_return("super luigi")

    with pytest.raises(IncompatibleAddressableAreaError):
        subject.raise_if_area_not_in_deck_configuration("luigi")
