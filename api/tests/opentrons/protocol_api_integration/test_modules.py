"""Tests for modules."""

import typing
import pytest

from opentrons import protocol_api


@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.21", "Flex")], indirect=True
)
def test_absorbance_reader_labware_load_conflict(
    simulated_protocol_context: protocol_api.ProtocolContext,
) -> None:
    """It should prevent loading a labware onto a closed absorbance reader."""
    module = simulated_protocol_context.load_module("absorbanceReaderV1", "A3")

    # The lid should be treated as initially closed.
    with pytest.raises(Exception):
        module.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt")

    module.open_lid()  # type: ignore[union-attr]
    # Should not raise after opening the lid.
    labware_1 = module.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt")

    simulated_protocol_context.move_labware(labware_1, protocol_api.OFF_DECK)

    # Should raise after closing the lid again.
    module.close_lid()  # type: ignore[union-attr]
    with pytest.raises(Exception):
        module.load_labware("opentrons_96_wellplate_200ul_pcr_full_skirt")


@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.21", "Flex")], indirect=True
)
def test_absorbance_reader_labware_move_conflict(
    simulated_protocol_context: protocol_api.ProtocolContext,
) -> None:
    """It should prevent moving a labware onto a closed absorbance reader."""
    module = simulated_protocol_context.load_module("absorbanceReaderV1", "A3")
    labware = simulated_protocol_context.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "A1"
    )

    with pytest.raises(Exception):
        # The lid should be treated as initially closed.
        simulated_protocol_context.move_labware(labware, module, use_gripper=True)

    module.open_lid()  # type: ignore[union-attr]
    # Should not raise after opening the lid.
    simulated_protocol_context.move_labware(labware, module, use_gripper=True)

    simulated_protocol_context.move_labware(labware, "A1", use_gripper=True)

    # Should raise after closing the lid again.
    module.close_lid()  # type: ignore[union-attr]
    with pytest.raises(Exception):
        simulated_protocol_context.move_labware(labware, module, use_gripper=True)


@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.21", "Flex")], indirect=True
)
def test_absorbance_reader_read_preconditions(
    simulated_protocol_context: protocol_api.ProtocolContext,
) -> None:
    """Test the preconditions for triggering an absorbance reader read."""
    module = typing.cast(
        protocol_api.AbsorbanceReaderContext,
        simulated_protocol_context.load_module("absorbanceReaderV1", "A3"),
    )

    with pytest.raises(Exception, match="initialize"):
        module.read()  # .initialize() must be called first.

    with pytest.raises(Exception, match="close"):
        module.initialize("single", [500])  # .close_lid() must be called first.

    module.close_lid()
    module.initialize("single", [500])

    module.read()  # Should not raise now.
