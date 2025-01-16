import pytest
from opentrons.types import DeckSlotName, Point, Location
from opentrons.protocol_api.labware import Labware


def test_point_mul() -> None:
    a = Point(1, 2, 3)
    b: float = 2
    assert a * b == Point(2, 4, 6)

    b = 3.1
    assert a * b == Point(3.1, 6.2, 9.3)

    with pytest.raises(TypeError):
        a * a  # type: ignore[operator]


def test_point_rmul() -> None:
    a = Point(1, 2, 3)
    b: float = 2
    assert b * a == Point(2, 4, 6)

    b = 3.1
    assert b * a == Point(3.1, 6.2, 9.3)


def test_location_repr_labware(min_lw: Labware) -> None:
    """It should represent labware as Labware"""
    loc = Location(point=Point(x=1.1, y=2.1, z=3.5), labware=min_lw)
    assert (
        f"{loc}"
        == "Location(point=Point(x=1.1, y=2.1, z=3.5), labware=minimal labware on deck)"
    )


def test_location_repr_well(min_lw: Labware) -> None:
    """It should represent labware as Well"""
    loc = Location(point=Point(x=1, y=2, z=3), labware=min_lw.wells()[0])
    assert (
        f"{loc}"
        == "Location(point=Point(x=1, y=2, z=3), labware=A1 of minimal labware on deck)"
    )


def test_location_repr_slot() -> None:
    """It should represent labware as a slot"""
    loc = Location(point=Point(x=-1, y=2, z=3), labware="1")
    assert f"{loc}" == "Location(point=Point(x=-1, y=2, z=3), labware=1)"


@pytest.mark.parametrize(
    ("input", "expected_ot2_equivalent", "expected_ot3_equivalent"),
    [
        # Middle slot:
        (DeckSlotName.SLOT_5, DeckSlotName.SLOT_5, DeckSlotName.SLOT_C2),
        (DeckSlotName.SLOT_C2, DeckSlotName.SLOT_5, DeckSlotName.SLOT_C2),
        # Northwest corner:
        (DeckSlotName.SLOT_10, DeckSlotName.SLOT_10, DeckSlotName.SLOT_A1),
        (DeckSlotName.SLOT_A1, DeckSlotName.SLOT_10, DeckSlotName.SLOT_A1),
        # Northeast corner:
        (DeckSlotName.FIXED_TRASH, DeckSlotName.FIXED_TRASH, DeckSlotName.SLOT_A3),
        (DeckSlotName.SLOT_A3, DeckSlotName.FIXED_TRASH, DeckSlotName.SLOT_A3),
    ],
)
def test_deck_slot_name_equivalencies(
    input: DeckSlotName,
    expected_ot2_equivalent: DeckSlotName,
    expected_ot3_equivalent: DeckSlotName,
) -> None:
    assert (
        input.to_ot2_equivalent()
        == input.to_equivalent_for_robot_type("OT-2 Standard")
        == expected_ot2_equivalent
    )
    assert (
        input.to_ot3_equivalent()
        == input.to_equivalent_for_robot_type("OT-3 Standard")
        == expected_ot3_equivalent
    )


@pytest.mark.parametrize(
    ("input", "expected_int"),
    [
        (DeckSlotName.SLOT_5, 5),
        (DeckSlotName.SLOT_C2, 5),
    ],
)
def test_deck_slot_name_as_int(input: DeckSlotName, expected_int: int) -> None:
    assert input.as_int() == expected_int
