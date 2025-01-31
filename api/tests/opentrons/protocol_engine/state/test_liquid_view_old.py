"""Liquid view tests.

DEPRECATED: Testing LiquidView independently of LiquidStore is no longer helpful.
Try to add new tests to test_liquid_state.py, where they can be tested together,
treating LiquidState as a private implementation detail.
"""
import pytest

from opentrons.protocol_engine.state.liquids import LiquidState, LiquidView
from opentrons.protocol_engine import Liquid
from opentrons.protocol_engine.errors import LiquidDoesNotExistError, InvalidLiquidError


@pytest.fixture
def subject() -> LiquidView:
    """Get a liquid view test subject."""
    state = LiquidState(
        liquids_by_id={
            "water-id": Liquid(
                id="water-id", displayName="water", description="water desc"
            )
        }
    )

    return LiquidView(state)


def test_get_all(subject: LiquidView) -> None:
    """Should return a list of liquids."""
    assert subject.get_all() == [
        Liquid(id="water-id", displayName="water", description="water desc")
    ]


def test_has_liquid(subject: LiquidView) -> None:
    """Should return true if an item exists in the liquids list."""
    assert subject.validate_liquid_id("water-id") == "water-id"

    with pytest.raises(LiquidDoesNotExistError):
        subject.validate_liquid_id("no-id")


def test_validate_liquid_prevents_empty(subject: LiquidView) -> None:
    """It should not allow loading a liquid with the special id EMPTY."""
    with pytest.raises(InvalidLiquidError):
        subject.validate_liquid_allowed(
            Liquid(id="EMPTY", displayName="empty", description="nothing")
        )


def test_validate_liquid_allows_non_empty(subject: LiquidView) -> None:
    """It should allow a valid liquid."""
    valid_liquid = Liquid(
        id="some-id",
        displayName="some-display-name",
        description="some-description",
        displayColor=None,
    )
    assert subject.validate_liquid_allowed(valid_liquid) == valid_liquid
