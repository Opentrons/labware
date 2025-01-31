"""96 ch Test Single Tip and Gripper Moves."""
from opentrons.protocol_api import (
    COLUMN,
    SINGLE,
    ALL,
    ParameterContext,
    ProtocolContext,
    Labware,
)
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    ThermocyclerContext,
    TemperatureModuleContext,
)
from abr_testing.protocols import helpers
from typing import List

metadata = {
    "protocolName": "96ch protocol with modules gripper moves and SINGLE tip pickup",
    "author": "Derek Maggio <derek.maggio@opentrons.com>",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


# prefer to move off deck, instead of waste chute disposal, if possible
PREFER_MOVE_OFF_DECK = False


PCR_PLATE_96_NAME = "armadillo_96_wellplate_200ul_pcr_full_skirt"
RESERVOIR_NAME = "nest_96_wellplate_2ml_deep"
TIPRACK_96_ADAPTER_NAME = "opentrons_flex_96_tiprack_adapter"
PIPETTE_96_CHANNEL_NAME = "flex_96channel_1000"

USING_GRIPPER = True
RESET_AFTER_EACH_MOVE = True


def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    helpers.create_tip_size_parameter(parameters)
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_disposable_lid_parameter(parameters)
    helpers.create_tc_lid_deck_riser_parameter(parameters)
    helpers.create_deactivate_modules_parameter(parameters)


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    b = protocol.params.dot_bottom  # type: ignore[attr-defined]
    TIPRACK_96_NAME = protocol.params.tip_size  # type: ignore[attr-defined]
    disposable_lid = protocol.params.disposable_lid  # type: ignore[attr-defined]
    deck_riser = protocol.params.deck_riser  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]

    waste_chute = protocol.load_waste_chute()
    helpers.comment_protocol_version(protocol, "01")

    thermocycler: ThermocyclerContext = protocol.load_module(
        helpers.tc_str
    )  # type: ignore[assignment]
    h_s: HeaterShakerContext = protocol.load_module(
        helpers.hs_str, "D1"
    )  # type: ignore[assignment]
    temperature_module: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "C1"
    )  # type: ignore[assignment]
    if disposable_lid:
        unused_lids = helpers.load_disposable_lids(protocol, 3, ["A2"], deck_riser)
    used_lids: List[Labware] = []
    thermocycler.open_lid()
    h_s.open_labware_latch()

    temperature_module_adapter = temperature_module.load_adapter(
        "opentrons_96_well_aluminum_block"
    )
    h_s_adapter = h_s.load_adapter("opentrons_96_pcr_adapter")

    adapters = [temperature_module_adapter, h_s_adapter]

    source_reservoir = protocol.load_labware(RESERVOIR_NAME, "D2")
    dest_pcr_plate = protocol.load_labware(PCR_PLATE_96_NAME, "C2")
    liquid_waste = protocol.load_labware("nest_1_reservoir_195ml", "B2", "Liquid Waste")

    tip_rack_1 = protocol.load_labware(
        TIPRACK_96_NAME, "A3", adapter="opentrons_flex_96_tiprack_adapter"
    )
    tip_rack_2 = protocol.load_labware(TIPRACK_96_NAME, "C3")
    tip_rack_3 = protocol.load_labware(TIPRACK_96_NAME, "C4")

    tip_racks = [
        tip_rack_1,
        tip_rack_2,
        tip_rack_3,
    ]

    pipette_96_channel = protocol.load_instrument(
        PIPETTE_96_CHANNEL_NAME,
        mount="left",
        tip_racks=tip_racks,
        liquid_presence_detection=True,
    )

    water = protocol.define_liquid(
        name="water", description="H₂O", display_color="#42AB2D"
    )
    source_reservoir.wells_by_name()["A1"].load_liquid(liquid=water, volume=29000)

    def run_moves(
        labware: Labware, move_sequences: List, reset_location: str, use_gripper: bool
    ) -> None:
        """Perform a series of moves for a given labware using specified move sequences.

        Will perform 2 versions of the moves:
            1.Moves to each location, resetting to the reset location after each move.
            2.Moves to each location, resetting to the reset location after all moves.
        """

        def move_to_locations(
            labware_to_move: Labware,
            move_locations: List,
            reset_after_each_move: bool,
            use_gripper: bool,
            reset_location: str,
        ) -> None:
            """Move labware to specific destinations."""

            def reset_labware() -> None:
                """Reset the labware to the reset location."""
                protocol.move_labware(
                    labware_to_move, reset_location, use_gripper=use_gripper
                )

            if len(move_locations) == 0:
                return

            for location in move_locations:
                protocol.move_labware(
                    labware_to_move, location, use_gripper=use_gripper
                )

                if reset_after_each_move:
                    reset_labware()

            if not reset_after_each_move:
                reset_labware()

        for move_sequence in move_sequences:
            move_to_locations(
                labware,
                move_sequence,
                RESET_AFTER_EACH_MOVE,
                use_gripper,
                reset_location,
            )
            move_to_locations(
                labware,
                move_sequence,
                not RESET_AFTER_EACH_MOVE,
                use_gripper,
                reset_location,
            )

    def test_gripper_moves() -> None:
        """Function to test the movement of the gripper in various locations."""

        def deck_moves(labware: Labware, reset_location: str) -> None:
            """Function to perform the movement of labware."""
            deck_move_sequence = [
                ["B3"],  # Deck Moves
                ["C3"],  # Staging Area Slot 3 Moves
                ["C4", "D4"],  # Staging Area Slot 4 Moves
                [
                    thermocycler,
                    temperature_module_adapter,
                    h_s_adapter,
                ],  # Module Moves
            ]

            run_moves(labware, deck_move_sequence, reset_location, USING_GRIPPER)

        def staging_area_slot_3_moves(labware: Labware, reset_location: str) -> None:
            """Function to perform the movement of labware, starting w/ staging area slot 3."""
            staging_area_slot_3_move_sequence = [
                ["B3", "C2"],  # Deck Moves
                [],  # Don't have Staging Area Slot 3 open
                ["C4", "D4"],  # Staging Area Slot 4 Moves
                [
                    thermocycler,
                    temperature_module_adapter,
                    h_s_adapter,
                ],  # Module Moves
            ]

            run_moves(
                labware,
                staging_area_slot_3_move_sequence,
                reset_location,
                USING_GRIPPER,
            )

        def staging_area_slot_4_moves(labware: Labware, reset_location: str) -> None:
            """Function to perform the movement of labware, starting with staging area slot 4."""
            staging_area_slot_4_move_sequence = [
                ["C2", "B3"],  # Deck Moves
                ["C3"],  # Staging Area Slot 3 Moves
                ["C4"],  # Staging Area Slot 4 Moves
                [
                    thermocycler,
                    temperature_module_adapter,
                    h_s_adapter,
                ],  # Module Moves
            ]

            run_moves(
                labware,
                staging_area_slot_4_move_sequence,
                reset_location,
                USING_GRIPPER,
            )

        def module_moves(labware: Labware, module_locations: List) -> None:
            """Function to perform the movement of labware, starting on a module."""
            module_move_sequence = [
                ["C2", "B3"],  # Deck Moves
                ["C3"],  # Staging Area Slot 3 Moves
                ["C4", "D4"],  # Staging Area Slot 4 Moves
            ]

            for module_starting_location in module_locations:
                labware_move_to_locations = module_locations.copy()
                labware_move_to_locations.remove(module_starting_location)
                all_sequences = module_move_sequence.copy()
                all_sequences.append(labware_move_to_locations)
                protocol.move_labware(
                    labware, module_starting_location, use_gripper=USING_GRIPPER
                )
                run_moves(
                    labware, all_sequences, module_starting_location, USING_GRIPPER
                )

        DECK_MOVE_RESET_LOCATION = "C2"
        STAGING_AREA_SLOT_3_RESET_LOCATION = "C3"
        STAGING_AREA_SLOT_4_RESET_LOCATION = "D4"

        deck_moves(dest_pcr_plate, DECK_MOVE_RESET_LOCATION)

        protocol.move_labware(
            dest_pcr_plate,
            STAGING_AREA_SLOT_3_RESET_LOCATION,
            use_gripper=USING_GRIPPER,
        )
        staging_area_slot_3_moves(dest_pcr_plate, STAGING_AREA_SLOT_3_RESET_LOCATION)

        protocol.move_labware(
            dest_pcr_plate,
            STAGING_AREA_SLOT_4_RESET_LOCATION,
            use_gripper=USING_GRIPPER,
        )
        staging_area_slot_4_moves(dest_pcr_plate, STAGING_AREA_SLOT_4_RESET_LOCATION)

        module_locations = [thermocycler] + adapters
        module_moves(dest_pcr_plate, module_locations)
        protocol.move_labware(dest_pcr_plate, thermocycler, use_gripper=USING_GRIPPER)

    def test_manual_moves() -> None:
        """Test manual moves."""
        protocol.move_labware(source_reservoir, "D4", use_gripper=USING_GRIPPER)

    def test_pipetting() -> None:
        """Test pipetting."""

        def test_single_tip_pickup_usage() -> None:
            """Test Single Tip Pick Up."""
            pipette_96_channel.configure_nozzle_layout(style=SINGLE, start="H12")
            pipette_96_channel.liquid_presence_detection = True
            tip_count = 0  # Tip counter to ensure proper tip usage
            rows = ["A", "B", "C", "D", "E", "F", "G", "H"]  # 8 rows
            columns = range(1, 13)  # 12 columns
            for row in rows:
                for col in columns:
                    well_position = f"{row}{col}"
                    pipette_96_channel.pick_up_tip(tip_rack_2)

                    pipette_96_channel.aspirate(45, source_reservoir[well_position])
                    pipette_96_channel.air_gap(5)

                    pipette_96_channel.dispense(
                        25, dest_pcr_plate[well_position].bottom(b)
                    )
                    pipette_96_channel.blow_out(location=liquid_waste["A1"])
                    pipette_96_channel.drop_tip()
                    tip_count += 1
            # leave this dropping in waste chute, do not use get_disposal_preference
            # want to test partial drop
            protocol.move_labware(tip_rack_2, waste_chute, use_gripper=USING_GRIPPER)

        def test_column_tip_rack_usage() -> None:
            """Column Tip Pick Up."""
            list_of_columns = list(range(1, 13))
            pipette_96_channel.configure_nozzle_layout(
                style=COLUMN, start="A12", tip_racks=[tip_rack_3]
            )
            protocol.comment("------------------------------")
            protocol.comment(f"channels {pipette_96_channel.active_channels}")
            protocol.move_labware(tip_rack_3, "C3", use_gripper=USING_GRIPPER)
            for well in list_of_columns:
                tiprack_well = "A" + str(well)
                well_name = "A" + str(well)
                pipette_96_channel.liquid_presence_detection = True
                pipette_96_channel.pick_up_tip(tip_rack_3[tiprack_well])
                pipette_96_channel.aspirate(45, source_reservoir[well_name])
                pipette_96_channel.liquid_presence_detection = False
                pipette_96_channel.air_gap(5)
                pipette_96_channel.dispense(25, dest_pcr_plate[tiprack_well].bottom(b))
                pipette_96_channel.blow_out(location=liquid_waste["A1"])
                pipette_96_channel.drop_tip()
            protocol.move_labware(tip_rack_3, waste_chute, use_gripper=USING_GRIPPER)

        def test_full_tip_rack_usage() -> None:
            """Full Tip Pick Up."""
            pipette_96_channel.configure_nozzle_layout(
                style=ALL, tip_racks=[tip_rack_1]
            )
            protocol.comment(f"channels {pipette_96_channel.active_channels}")
            pipette_96_channel.liquid_presence_detection = True
            pipette_96_channel.pick_up_tip()
            pipette_96_channel.aspirate(45, source_reservoir["A1"])
            pipette_96_channel.liquid_presence_detection = False
            pipette_96_channel.air_gap(5)
            pipette_96_channel.dispense(25, dest_pcr_plate["A1"].bottom(b))
            pipette_96_channel.blow_out(location=liquid_waste["A1"])
            pipette_96_channel.return_tip()
            pipette_96_channel.reset_tipracks()

        test_single_tip_pickup_usage()
        test_column_tip_rack_usage()
        test_full_tip_rack_usage()

    def test_module_usage(unused_lids: List[Labware], used_lids: List[Labware]) -> None:
        """Test Module Use."""

        def test_thermocycler(
            unused_lids: List[Labware], used_lids: List[Labware]
        ) -> None:
            if disposable_lid:
                (
                    lid_on_plate,
                    unused_lids,
                    used_lids,
                ) = helpers.use_disposable_lid_with_tc(
                    protocol, unused_lids, used_lids, dest_pcr_plate, thermocycler
                )
            thermocycler.set_block_temperature(4)
            thermocycler.set_lid_temperature(105)
            # Close lid
            thermocycler.close_lid()
            helpers.perform_pcr(
                protocol,
                thermocycler,
                initial_denature_time_sec=45,
                denaturation_time_sec=30,
                anneal_time_sec=30,
                extension_time_sec=10,
                cycle_repetitions=30,
                final_extension_time_min=5,
            )
            # Cool to 4°
            thermocycler.set_block_temperature(4)
            thermocycler.set_lid_temperature(105)
            # Open lid
            thermocycler.open_lid()
            if disposable_lid:
                if len(used_lids) <= 1:
                    protocol.move_labware(lid_on_plate, waste_chute, use_gripper=True)
                else:
                    protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)
            thermocycler.deactivate()

        def test_h_s() -> None:
            """Tests heatershaker."""
            h_s.open_labware_latch()
            h_s.close_labware_latch()

            h_s.set_target_temperature(75.0)
            h_s.set_and_wait_for_shake_speed(1000)
            h_s.wait_for_temperature()

            h_s.deactivate_heater()
            h_s.deactivate_shaker()

        def test_temperature_module() -> None:
            """Tests temperature module."""
            temperature_module.set_temperature(80)
            temperature_module.set_temperature(10)
            temperature_module.deactivate()

        test_thermocycler(unused_lids, used_lids)
        test_h_s()
        test_temperature_module()

    test_pipetting()
    test_gripper_moves()
    test_module_usage(unused_lids, used_lids)
    test_manual_moves()
    protocol.move_labware(source_reservoir, "C2", use_gripper=True)
    helpers.clean_up_plates(
        pipette_96_channel, [dest_pcr_plate, source_reservoir], liquid_waste["A1"], 50
    )
    pipette_96_channel.reset_tipracks()
    helpers.find_liquid_height_of_all_wells(
        protocol, pipette_96_channel, [liquid_waste["A1"]]
    )
    if deactivate_modules_bool:
        helpers.deactivate_modules(protocol)
