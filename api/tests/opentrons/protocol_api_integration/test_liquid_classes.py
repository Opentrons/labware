"""Tests for the APIs around liquid classes."""
import pytest
from decoy import Decoy
from opentrons_shared_data.robot.types import RobotTypeEnum

from opentrons.protocol_api import ProtocolContext
from opentrons.config import feature_flags as ff


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.20", "Flex")], indirect=True
)
def test_liquid_class_creation_and_property_fetching(
    decoy: Decoy,
    mock_feature_flags: None,
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should create the liquid class and provide access to its properties."""
    decoy.when(ff.allow_liquid_classes(RobotTypeEnum.FLEX)).then_return(True)
    pipette_load_name = "flex_8channel_50"
    simulated_protocol_context.load_instrument(pipette_load_name, mount="left")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    water = simulated_protocol_context.define_liquid_class("water")

    assert water.name == "water"
    assert water.display_name == "Water"

    # TODO (spp, 2024-10-17): update this to fetch pipette load name from instrument context
    assert (
        water.get_for(
            pipette_load_name, tiprack.load_name
        ).dispense.flow_rate_by_volume.get_for_volume(1)
        == 50
    )
    assert (
        water.get_for(pipette_load_name, tiprack.load_name).aspirate.submerge.speed
        == 100
    )

    with pytest.raises(
        ValueError,
        match="No properties found for non-existent-pipette in water liquid class",
    ):
        water.get_for("non-existent-pipette", tiprack.load_name)

    with pytest.raises(AttributeError):
        water.name = "foo"  # type: ignore

    with pytest.raises(AttributeError):
        water.display_name = "bar"  # type: ignore

    with pytest.raises(ValueError, match="Liquid class definition not found"):
        simulated_protocol_context.define_liquid_class("non-existent-liquid")


@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.20", "OT-2")], indirect=True
)
def test_liquid_class_feature_flag(simulated_protocol_context: ProtocolContext) -> None:
    """It should raise a not implemented error without the allowLiquidClass flag set."""
    with pytest.raises(NotImplementedError):
        simulated_protocol_context.define_liquid_class("water")
