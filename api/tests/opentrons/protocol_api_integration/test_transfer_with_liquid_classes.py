"""Tests for the transfer APIs using liquid classes."""
import pytest
import mock

from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_api.core.engine import InstrumentCore
from opentrons.protocol_api.core.engine.transfer_components_executor import (
    TransferType,
    LiquidAndAirGapPair,
)


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_water_transfer_with_volume_more_than_tip_max(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with mock.patch.object(
        InstrumentCore,
        "pick_up_tip",
        side_effect=InstrumentCore.pick_up_tip,
        autospec=True,
    ) as patched_pick_up_tip:
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")

        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=60,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="always",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 24
        patched_pick_up_tip.reset_mock()

        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=100,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="per source",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 12
        patched_pick_up_tip.reset_mock()

        pipette_1k.pick_up_tip()
        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=50,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="never",
            trash_location=trash,
        )
        pipette_1k.drop_tip()
        assert patched_pick_up_tip.call_count == 1


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_transfer_steps(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.transfer_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.rows()[0][:2],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert len(mock_manager.mock_calls) == 9
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_transfer_steps_with_no_new_tips(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    pipette_50.pick_up_tip()
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.transfer_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.rows()[0][:2],
            new_tip="never",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0.1)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=False,
                trash_location=mock.ANY,
            ),
        ]
        assert len(mock_manager.mock_calls) == len(expected_calls)
        assert mock_manager.mock_calls[2] == expected_calls[2]
