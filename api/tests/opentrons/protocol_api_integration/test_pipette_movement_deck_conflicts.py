"""Tests for the APIs around deck conflicts during pipette movement."""

import pytest

from opentrons.protocol_api import COLUMN, ALL, SINGLE, ROW, ProtocolContext
from opentrons.protocol_api.core.engine.pipette_movement_conflict import (
    PartialTipMovementNotAllowedError,
)


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.16", "Flex")], indirect=True
)
def test_deck_conflicts_for_96_ch_a12_column_configuration(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should raise errors for the expected deck conflicts."""
    trash_labware = simulated_protocol_context.load_labware(
        "opentrons_1_trash_3200ml_fixed", "A3"
    )
    badly_placed_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "C2"
    )
    well_placed_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "C1"
    )
    tiprack_on_adapter = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul",
        "C3",
        adapter="opentrons_flex_96_tiprack_adapter",
    )

    thermocycler = simulated_protocol_context.load_module("thermocyclerModuleV2")
    tc_adjacent_plate = simulated_protocol_context.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "A2"
    )
    accessible_plate = thermocycler.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt"
    )

    instrument = simulated_protocol_context.load_instrument(
        "flex_96channel_1000", mount="left"
    )
    instrument.trash_container = trash_labware

    # ############  SHORT LABWARE  ################
    # These labware should be to the west of tall labware to avoid any partial tip deck conflicts
    badly_placed_labware = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "D2"
    )
    well_placed_labware = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "D3"
    )

    # ############ TALL LABWARE ##############
    simulated_protocol_context.load_labware(
        "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical", "D1"
    )

    # ########### Use Partial Nozzles #############
    instrument.configure_nozzle_layout(style=COLUMN, start="A12")

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.pick_up_tip(badly_placed_tiprack.wells_by_name()["A1"])

    instrument.pick_up_tip(well_placed_tiprack.wells_by_name()["A12"])
    instrument.aspirate(50, well_placed_labware.wells_by_name()["A4"])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot D1"
    ):
        instrument.dispense(50, badly_placed_labware.wells()[0])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with thermocycler lid"
    ):
        instrument.dispense(10, tc_adjacent_plate.wells_by_name()["A1"])

    instrument.dispense(10, tc_adjacent_plate.wells_by_name()["H2"])

    # No error cuz dispensing from high above plate, so it clears tuberack in west slot
    instrument.dispense(15, badly_placed_labware.wells_by_name()["A1"].top(150))

    thermocycler.open_lid()  # type: ignore[union-attr]

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="outside of robot bounds"
    ):
        # Dispensing to A1 in an east-most slot using a configuration with column 12 would
        # result in a collision with the side of the robot.
        instrument.dispense(25, accessible_plate.wells_by_name()["A1"])

    instrument.drop_tip()

    # ######## CHANGE CONFIG TO ALL #########
    instrument.configure_nozzle_layout(style=ALL, tip_racks=[tiprack_on_adapter])

    # No error because of full config
    instrument.pick_up_tip()

    # No error NOW because of full config
    instrument.aspirate(50, badly_placed_labware.wells_by_name()["A1"])

    # No error
    instrument.dispense(50, accessible_plate.wells_by_name()["A1"])


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.20", "Flex")], indirect=True
)
def test_close_shave_deck_conflicts_for_96_ch_a12_column_configuration(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """Shouldn't raise errors for "almost collision"s."""
    res12 = simulated_protocol_context.load_labware("nest_12_reservoir_15ml", "C3")

    # Mag block and tiprack adapter are very close to the destination reservoir labware
    simulated_protocol_context.load_module("magneticBlockV1", "D2")
    simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_200ul",
        "B3",
        adapter="opentrons_flex_96_tiprack_adapter",
    )
    tiprack_8 = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_200ul", "B2"
    )
    hs = simulated_protocol_context.load_module("heaterShakerModuleV1", "C1")
    hs_adapter = hs.load_adapter("opentrons_96_deep_well_adapter")
    deepwell = hs_adapter.load_labware("nest_96_wellplate_2ml_deep")
    simulated_protocol_context.load_trash_bin("A3")
    p1000_96 = simulated_protocol_context.load_instrument("flex_96channel_1000")
    p1000_96.configure_nozzle_layout(style=SINGLE, start="A12", tip_racks=[tiprack_8])

    hs.close_labware_latch()  # type: ignore[union-attr]
    # Note
    p1000_96.distribute(
        15,
        res12["A6"],
        deepwell.columns()[6],
        disposal_vol=0,
    )


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.16", "Flex")], indirect=True
)
def test_deck_conflicts_for_96_ch_a1_column_configuration(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should raise errors for expected deck conflicts."""
    instrument = simulated_protocol_context.load_instrument(
        "flex_96channel_1000", mount="left"
    )
    trash_labware = simulated_protocol_context.load_labware(
        "opentrons_1_trash_3200ml_fixed", "A3"
    )
    instrument.trash_container = trash_labware

    badly_placed_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "C2"
    )
    well_placed_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "A1"
    )
    tiprack_on_adapter = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul",
        "C3",
        adapter="opentrons_flex_96_tiprack_adapter",
    )

    # ############  SHORT LABWARE  ################
    # These labware should be to the east of tall labware to avoid any partial tip deck conflicts
    badly_placed_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "B1"
    )
    well_placed_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "B3"
    )

    # ############ TALL LABWARE ###############
    my_tuberack = simulated_protocol_context.load_labware(
        "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical", "B2"
    )

    # ########### Use Partial Nozzles #############
    instrument.configure_nozzle_layout(style=COLUMN, start="A1")

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.pick_up_tip(badly_placed_tiprack.wells_by_name()["H12"])

    # No error cuz within pipette extent bounds and no taller labware to right of tiprack
    instrument.pick_up_tip(well_placed_tiprack.wells_by_name()["A12"])

    # No error cuz no labware on right of plate, and also well A10 is juusst inside the right bound
    instrument.aspirate(25, well_placed_plate.wells_by_name()["A10"])

    # No error cuz dispensing from high above plate, so it clears tuberack on the right
    instrument.dispense(25, badly_placed_plate.wells_by_name()["A1"].top(150))

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.aspirate(25, badly_placed_plate.wells_by_name()["A10"])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="outside of robot bounds"
    ):
        # Moving the 96 channel in column configuration with column 1
        # is incompatible with moving to a plate in B3 in the right most
        # column.
        instrument.aspirate(25, well_placed_plate.wells_by_name()["A11"])

    # No error because we're moving to column 1 of the plate with
    # column 1 of the 96 channel.
    instrument.aspirate(25, well_placed_plate.wells_by_name()["A1"])

    # No error cuz no taller labware on the right
    instrument.aspirate(10, my_tuberack.wells_by_name()["A1"])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="outside of robot bounds"
    ):
        # Raises error because drop tip alternation makes the pipette drop the tips
        # near the trash bin labware's right edge, which is out of bounds for column1 nozzles
        # We should probably move this tip drop location within the nozzles' accessible area,
        # but since we do not recommend loading the trash as labware (there are other things
        # wrong with that approach), it is not a critical issue.
        instrument.drop_tip()

    instrument.trash_container = None  # type: ignore
    simulated_protocol_context.load_trash_bin("C1")

    # This doesn't raise an error because it now treats the trash bin as an addressable area
    # and the bounds check doesn't yet check moves to addressable areas.
    # The aim is to do checks for ALL moves, but also, fix the offset used for tip drop alternation.
    instrument.drop_tip()

    # ######## CHANGE CONFIG TO ALL #########
    instrument.configure_nozzle_layout(style=ALL, tip_racks=[tiprack_on_adapter])

    # No error because of full config
    instrument.pick_up_tip()

    # No error NOW because of full config
    instrument.aspirate(50, badly_placed_plate.wells_by_name()["A1"])

    # No error NOW because of full config
    instrument.dispense(50, badly_placed_plate.wells_by_name()["A1"].bottom())


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.20", "Flex")], indirect=True
)
def test_deck_conflicts_for_96_ch_and_reservoirs(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should raise errors for expected deck conflicts when moving to reservoirs.

    This test checks that the critical point of the pipette is taken into account,
    specifically when it differs from the primary nozzle.
    """
    instrument = simulated_protocol_context.load_instrument(
        "flex_96channel_1000", mount="left"
    )
    # trash_labware = protocol.load_labware("opentrons_1_trash_3200ml_fixed", "A3")
    # instrument.trash_container = trash_labware

    simulated_protocol_context.load_trash_bin("A3")
    right_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "C3"
    )
    front_tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D2"
    )
    # Tall deck item in B3
    simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul",
        "B3",
        adapter="opentrons_flex_96_tiprack_adapter",
    )
    # Tall deck item in B1
    simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul",
        "B1",
        adapter="opentrons_flex_96_tiprack_adapter",
    )

    # ############  RESERVOIRS  ################
    # These labware should be to the east of tall labware to avoid any partial tip deck conflicts
    reservoir_1_well = simulated_protocol_context.load_labware(
        "nest_1_reservoir_195ml", "C2"
    )
    reservoir_12_well = simulated_protocol_context.load_labware(
        "nest_12_reservoir_15ml", "B2"
    )

    # ########### Use COLUMN A1 Config #############
    instrument.configure_nozzle_layout(style=COLUMN, start="A1")

    instrument.pick_up_tip(front_tiprack.wells_by_name()["A12"])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.aspirate(10, reservoir_1_well.wells()[0])

    instrument.aspirate(25, reservoir_12_well.wells()[0])
    instrument.dispense(10, reservoir_12_well.wells()[1])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.dispense(15, reservoir_12_well.wells()[3])

    instrument.drop_tip()
    front_tiprack.reset()

    # ########### Use COLUMN A12 Config #############
    instrument.configure_nozzle_layout(style=COLUMN, start="A12")

    instrument.pick_up_tip(front_tiprack.wells_by_name()["A1"])
    instrument.aspirate(50, reservoir_1_well.wells()[0])
    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.dispense(10, reservoir_12_well.wells()[8])

    instrument.dispense(15, reservoir_12_well.wells()[11])
    instrument.dispense(10, reservoir_1_well.wells()[0])

    instrument.drop_tip()
    front_tiprack.reset()

    # ######## CHANGE CONFIG TO ROW H1 #########
    instrument.configure_nozzle_layout(style=ROW, start="H1", tip_racks=[front_tiprack])
    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.pick_up_tip(right_tiprack.wells_by_name()["A1"])

    instrument.pick_up_tip()
    instrument.aspirate(25, reservoir_1_well.wells()[0])

    instrument.drop_tip()
    front_tiprack.reset()

    # ######## CHANGE CONFIG TO ROW A1 #########
    instrument.configure_nozzle_layout(style=ROW, start="A1", tip_racks=[front_tiprack])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="outside of robot bounds"
    ):
        instrument.pick_up_tip()
    instrument.pick_up_tip(right_tiprack.wells_by_name()["H1"])

    with pytest.raises(
        PartialTipMovementNotAllowedError, match="collision with items in deck slot"
    ):
        instrument.aspirate(25, reservoir_1_well.wells()[0])

    instrument.drop_tip()
    front_tiprack.reset()
