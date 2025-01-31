"""Test protocol engine types."""
import pytest
from pydantic import ValidationError

from opentrons.protocol_engine.types import HexColor


@pytest.mark.parametrize("hex_color", ["#F00", "#FFCC00CC", "#FC0C", "#98e2d1"])
def test_hex_validation(hex_color: str) -> None:
    """Should allow creating a HexColor."""
    # make sure noting is raised when instantiating this class
    assert HexColor(hex_color)
    assert HexColor.model_validate_json(f'"{hex_color}"')


@pytest.mark.parametrize("invalid_hex_color", ["true", "null", "#123456789"])
def test_handles_invalid_hex(invalid_hex_color: str) -> None:
    """Should raise a validation error."""
    with pytest.raises(ValidationError):
        HexColor(invalid_hex_color)
    with pytest.raises(ValidationError):
        HexColor.model_validate_json(f'"{invalid_hex_color}"')
