import pytest
from typing import Callable

from opentrons.protocols.models import json_protocol


@pytest.mark.parametrize(
    argnames=["version", "name"],
    argvalues=[
        ["5", "simpleV5"],
        ["4", "simpleV4"],
        ["4", "testModulesProtocol"],
        ["3", "simple"],
        ["3", "testAllAtomicSingleV3"],
    ],
)
def test_json_protocol_model(
    get_json_protocol_fixture: Callable[..., object],
    version: str,
    name: str,
) -> None:
    """It should be parsed and validated correctly."""
    fx = get_json_protocol_fixture(
        fixture_version=version, fixture_name=name, decode=True
    )

    # Create the model
    d = json_protocol.Model.model_validate(fx)

    # Compare the dict created by pydantic to the loaded json
    assert d.model_dump(exclude_unset=True, by_alias=True) == fx
