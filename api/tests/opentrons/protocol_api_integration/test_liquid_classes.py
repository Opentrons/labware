"""Tests for the APIs around liquid classes."""
import pytest

from opentrons.protocol_api import ProtocolContext


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_liquid_class_creation_and_property_fetching(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should create the liquid class and provide access to its properties."""
    pipette_load_name = "flex_8channel_50"
    p50 = simulated_protocol_context.load_instrument(pipette_load_name, mount="left")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    water = simulated_protocol_context.define_liquid_class("water")

    assert water.name == "water"
    assert water.display_name == "Water"

    # TODO (spp, 2024-10-17): update this to fetch pipette load name from instrument context
    assert (
        water.get_for(p50, tiprack).dispense.flow_rate_by_volume.get_for_volume(1) == 50
    )
    assert water.get_for(pipette_load_name, tiprack.uri).aspirate.submerge.speed == 100

    with pytest.raises(
        ValueError,
        match="No properties found for non-existent-pipette in water liquid class",
    ):
        water.get_for("non-existent-pipette", tiprack.uri)

    with pytest.raises(AttributeError):
        water.name = "foo"  # type: ignore

    with pytest.raises(AttributeError):
        water.display_name = "bar"  # type: ignore

    with pytest.raises(ValueError, match="Liquid class definition not found"):
        simulated_protocol_context.define_liquid_class("non-existent-liquid")
