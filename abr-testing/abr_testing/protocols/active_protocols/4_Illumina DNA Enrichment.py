"""DVT1ABR4: Illumina DNA Enrichment."""
from opentrons.protocol_api import (
    ParameterContext,
    ProtocolContext,
    Labware,
    Well,
    InstrumentContext,
)
from opentrons import types
from abr_testing.protocols import helpers
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    MagneticBlockContext,
    ThermocyclerContext,
    TemperatureModuleContext,
)
from opentrons.hardware_control.modules.types import ThermocyclerStep
from typing import List, Dict


metadata = {
    "protocolName": "Illumina DNA Enrichment v4 with TC Auto Sealing Lid",
    "author": "Opentrons <protocols@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}

# SCRIPT SETTINGS
DRYRUN = False  # True = skip incubation times, shorten mix, for testing purposes
USE_GRIPPER = True  # True = Uses Gripper, False = Manual Move
TIP_TRASH = False  # True = Used tips go in Trash, False = Used tips go back into rack
HYBRID_PAUSE = True  # True = sets a pause on the Hybridization

# PROTOCOL SETTINGS
COLUMNS = 4  # 1-4
HYBRIDDECK = True
HYBRIDTIME = 1.6  # Hours

# PROTOCOL BLOCKS
STEP_VOLPOOL = 0
STEP_HYB = 0
STEP_CAPTURE = 1
STEP_WASH = 1
STEP_PCR = 1
STEP_PCRDECK = 1
STEP_CLEANUP = 1

p200_tips = 0
p50_tips = 0
total_waste_volume = 0.0


RUN = 1


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    helpers.create_hs_speed_parameter(parameters)
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_disposable_lid_parameter(parameters)
    helpers.create_tc_lid_deck_riser_parameter(parameters)
    helpers.create_disposable_lid_trash_location(parameters)
    helpers.create_deactivate_modules_parameter(parameters)


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    heater_shaker_speed = protocol.params.heater_shaker_speed  # type: ignore[attr-defined]
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]
    disposable_lid = protocol.params.disposable_lid  # type: ignore[attr-defined]
    deck_riser = protocol.params.deck_riser  # type: ignore[attr-defined]
    trash_lid = protocol.params.trash_lid  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    helpers.comment_protocol_version(protocol, "01")

    unused_lids: List[Labware] = []
    used_lids: List[Labware] = []
    global p200_tips
    global p50_tips

    protocol.comment("THIS IS A DRY RUN") if DRYRUN else protocol.comment(
        "THIS IS A REACTION RUN"
    )
    protocol.comment("USED TIPS WILL GO IN TRASH") if TIP_TRASH else protocol.comment(
        "USED TIPS WILL BE RE-RACKED"
    )

    # DECK SETUP AND LABWARE
    # ========== FIRST ROW ===========
    heatershaker: HeaterShakerContext = protocol.load_module(
        helpers.hs_str, "1"
    )  # type: ignore[assignment]
    heatershaker.close_labware_latch()
    sample_plate_2 = heatershaker.load_labware(
        "thermoscientificnunc_96_wellplate_1300ul"
    )
    reservoir = protocol.load_labware("nest_96_wellplate_2ml_deep", "2", "Liquid Waste")
    temp_block: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "3"
    )  # type: ignore[assignment]
    reagent_plate, temp_adapter = helpers.load_temp_adapter_and_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", temp_block, "Reagent Plate"
    )
    # ========== SECOND ROW ==========
    MAG_PLATE_SLOT: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "C1"
    )  # type: ignore[assignment]
    tiprack_200_1 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "5")
    tiprack_50_1 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "6")
    # Opentrons tough pcr auto sealing lids
    if disposable_lid:
        unused_lids = helpers.load_disposable_lids(protocol, 3, ["C4"], deck_riser)
    # ========== THIRD ROW ===========
    thermocycler: ThermocyclerContext = protocol.load_module(
        helpers.tc_str
    )  # type: ignore[assignment]
    sample_plate_1 = thermocycler.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt"
    )
    thermocycler.open_lid()
    tiprack_200_2 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "8")
    tiprack_50_2 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "9")
    # ========== FOURTH ROW ==========
    tiprack_200_3 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "11")
    trash_bin = protocol.load_trash_bin("A3")
    # reagent
    AMPure = reservoir["A1"]
    SMB = reservoir["A2"]

    EtOH = reservoir["A4"]
    RSB = reservoir["A5"]
    Liquid_trash_well_1 = reservoir["A9"]
    Liquid_trash_well_2 = reservoir["A10"]
    Liquid_trash_well_3 = reservoir["A11"]
    Liquid_trash_well_4 = reservoir["A12"]
    liquid_trash_list = {
        Liquid_trash_well_1: 0.0,
        Liquid_trash_well_2: 0.0,
        Liquid_trash_well_3: 0.0,
        Liquid_trash_well_4: 0.0,
    }

    def trash_liquid(
        protocol: ProtocolContext,
        pipette: InstrumentContext,
        vol_to_trash: float,
        liquid_trash_list: Dict[Well, float],
    ) -> None:
        """Determine which wells to use as liquid waste."""
        remaining_volume = vol_to_trash
        max_capacity = 1500.0
        # Determine liquid waste location depending on current total volume
        # Distribute the liquid volume sequentially
        for well, current_volume in liquid_trash_list.items():
            if remaining_volume <= 0.0:
                break
            available_capacity = max_capacity - current_volume
            if available_capacity < remaining_volume:
                continue
            pipette.dispense(remaining_volume, well.top())
            protocol.delay(minutes=0.1)
            pipette.blow_out(well.top())
            liquid_trash_list[well] += remaining_volume
            if pipette.current_volume <= 0.0:
                break

    # Will Be distributed during the protocol
    EEW_1 = sample_plate_2.wells_by_name()["A9"]
    EEW_2 = sample_plate_2.wells_by_name()["A10"]
    EEW_3 = sample_plate_2.wells_by_name()["A11"]
    EEW_4 = sample_plate_2.wells_by_name()["A12"]

    NHB2 = reagent_plate.wells_by_name()["A1"]
    Panel = reagent_plate.wells_by_name()["A2"]
    EHB2 = reagent_plate.wells_by_name()["A3"]
    Elute = reagent_plate.wells_by_name()["A4"]
    ET2 = reagent_plate.wells_by_name()["A5"]
    PPC = reagent_plate.wells_by_name()["A6"]
    EPM = reagent_plate.wells_by_name()["A7"]

    # pipette
    p1000 = protocol.load_instrument(
        "flex_8channel_1000",
        "left",
        tip_racks=[tiprack_200_1, tiprack_200_2, tiprack_200_3],
    )
    p50 = protocol.load_instrument(
        "flex_8channel_50", "right", tip_racks=[tiprack_50_1, tiprack_50_2]
    )
    reagent_plate.columns()[3]
    # Load liquids and probe
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Reagents": [
            {"well": reagent_plate.columns()[3], "volume": 75.0},
            {"well": reagent_plate.columns()[4], "volume": 15.0},
            {"well": reagent_plate.columns()[5], "volume": 20.0},
            {"well": reagent_plate.columns()[6], "volume": 65.0},
        ],
        "AMPure": [{"well": reservoir.columns()[0], "volume": 120.0}],
        "SMB": [{"well": reservoir.columns()[1], "volume": 750.0}],
        "EtOH": [{"well": reservoir.columns()[3], "volume": 900.0}],
        "RSB": [{"well": reservoir.columns()[4], "volume": 96.0}],
        "Wash": [
            {"well": sample_plate_2.columns()[8], "volume": 1000.0},
            {"well": sample_plate_2.columns()[9], "volume": 1000.0},
            {"well": sample_plate_2.columns()[10], "volume": 1000.0},
            {"well": sample_plate_2.columns()[11], "volume": 1000.0},
        ],
        "Samples": [{"well": sample_plate_1.wells(), "volume": 150.0}],
    }
    helpers.find_liquid_height_of_loaded_liquids(protocol, liquid_vols_and_wells, p50)
    # tip and sample tracking
    if COLUMNS == 1:
        column_1_list = ["A1"]  # Plate 1
        column_2_list = ["A1"]  # Plate 2
        column_3_list = ["A4"]  # Plate 2
        column_4_list = ["A4"]  # Plate 1
        column_5_list = ["A7"]  # Plate 2
        column_6_list = ["A7"]  # Plate 1
        WASHES = [EEW_1]
    if COLUMNS == 2:
        column_1_list = ["A1", "A2"]  # Plate 1
        column_2_list = ["A1", "A2"]  # Plate 2
        column_3_list = ["A4", "A5"]  # Plate 2
        column_4_list = ["A4", "A5"]  # Plate 1
        column_5_list = ["A7", "A8"]  # Plate 2
        column_6_list = ["A7", "A8"]  # Plate 1
        WASHES = [EEW_1, EEW_2]
    if COLUMNS == 3:
        column_1_list = ["A1", "A2", "A3"]  # Plate 1
        column_2_list = ["A1", "A2", "A3"]  # Plate 2
        column_3_list = ["A4", "A5", "A6"]  # Plate 2
        column_4_list = ["A4", "A5", "A6"]  # Plate 1
        column_5_list = ["A7", "A8", "A9"]  # Plate 2
        column_6_list = ["A7", "A8", "A9"]  # Plate 1
        WASHES = [EEW_1, EEW_2, EEW_3]
    if COLUMNS == 4:
        column_1_list = ["A1", "A2", "A3", "A4"]  # Plate 1
        column_2_list = ["A1", "A2", "A3", "A4"]  # Plate 2
        column_3_list = ["A5", "A6", "A7", "A8"]  # Plate 2
        column_4_list = ["A5", "A6", "A7", "A8"]  # Plate 1
        column_5_list = ["A9", "A10", "A11", "A12"]  # Plate 2
        column_6_list = ["A9", "A10", "A11", "A12"]  # Plate 1
        WASHES = [EEW_1, EEW_2, EEW_3, EEW_4]

    def tipcheck() -> None:
        """Tip tracking function."""
        if p200_tips >= 3 * 12:
            p1000.reset_tipracks()
            p200_tips == 0
        if p50_tips >= 2 * 12:
            p50.reset_tipracks()
            p50_tips == 0

    # commands
    for loop in range(RUN):
        thermocycler.open_lid()
        heatershaker.open_labware_latch()
        if DRYRUN is False:
            if STEP_HYB == 1:
                protocol.comment("SETTING THERMO and TEMP BLOCK Temperature")
                thermocycler.set_block_temperature(4)
                thermocycler.set_lid_temperature(100)
                temp_block.set_temperature(4)
            else:
                protocol.comment("SETTING THERMO and TEMP BLOCK Temperature")
                thermocycler.set_block_temperature(58)
                thermocycler.set_lid_temperature(58)
                heatershaker.set_and_wait_for_temperature(58)
        heatershaker.close_labware_latch()

        # Sample Plate contains 30ul  of DNA

        if STEP_VOLPOOL == 1:
            protocol.comment("==============================================")
            protocol.comment("--> Quick Vol Pool")
            protocol.comment("==============================================")

        if STEP_HYB == 1:
            protocol.comment("==============================================")
            protocol.comment("--> HYB")
            protocol.comment("==============================================")

            protocol.comment("--> Adding NHB2")
            NHB2Vol = 50
            for loop, X in enumerate(column_1_list):
                p50.pick_up_tip()
                p50.aspirate(NHB2Vol, NHB2.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    NHB2Vol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("--> Adding Panel")
            PanelVol = 10
            for loop, X in enumerate(column_1_list):
                p50.pick_up_tip()
                p50.aspirate(PanelVol, Panel.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    PanelVol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("--> Adding EHB2")
            EHB2Vol = 10
            EHB2MixRep = 10 if DRYRUN is False else 1
            EHB2MixVol = 90
            for loop, X in enumerate(column_1_list):
                p1000.pick_up_tip()
                p1000.aspirate(EHB2Vol, EHB2.bottom(z=dot_bottom))  # original = ()
                p1000.dispense(
                    EHB2Vol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p1000.move_to(sample_plate_1[X].bottom(z=dot_bottom))  # original = ()
                p1000.mix(EHB2MixRep, EHB2MixVol)
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p50_tips += 1
                tipcheck()

            if HYBRIDDECK:
                protocol.comment("Hybridize on Deck")
                if disposable_lid:
                    (
                        lid_on_plate,
                        unused_lids,
                        used_lids,
                    ) = helpers.use_disposable_lid_with_tc(
                        protocol, unused_lids, used_lids, sample_plate_1, thermocycler
                    )
                else:
                    thermocycler.close_lid()
                if DRYRUN is False:
                    profile_TAGSTOP: List[ThermocyclerStep] = [
                        {"temperature": 98, "hold_time_minutes": 5},
                        {"temperature": 97, "hold_time_minutes": 1},
                        {"temperature": 95, "hold_time_minutes": 1},
                        {"temperature": 93, "hold_time_minutes": 1},
                        {"temperature": 91, "hold_time_minutes": 1},
                        {"temperature": 89, "hold_time_minutes": 1},
                        {"temperature": 87, "hold_time_minutes": 1},
                        {"temperature": 85, "hold_time_minutes": 1},
                        {"temperature": 83, "hold_time_minutes": 1},
                        {"temperature": 81, "hold_time_minutes": 1},
                        {"temperature": 79, "hold_time_minutes": 1},
                        {"temperature": 77, "hold_time_minutes": 1},
                        {"temperature": 75, "hold_time_minutes": 1},
                        {"temperature": 73, "hold_time_minutes": 1},
                        {"temperature": 71, "hold_time_minutes": 1},
                        {"temperature": 69, "hold_time_minutes": 1},
                        {"temperature": 67, "hold_time_minutes": 1},
                        {"temperature": 65, "hold_time_minutes": 1},
                        {"temperature": 63, "hold_time_minutes": 1},
                        {"temperature": 62, "hold_time_minutes": HYBRIDTIME * 60},
                    ]
                    thermocycler.execute_profile(
                        steps=profile_TAGSTOP, repetitions=1, block_max_volume=100
                    )
                    thermocycler.set_block_temperature(62)
                    if HYBRID_PAUSE:
                        protocol.comment("HYBRIDIZATION PAUSED")
                    thermocycler.set_block_temperature(10)
                thermocycler.open_lid()
                if disposable_lid:
                    if trash_lid:
                        protocol.move_labware(lid_on_plate, trash_bin, use_gripper=True)
                    elif len(used_lids) <= 1:
                        protocol.move_labware(lid_on_plate, "B4", use_gripper=True)
                    else:
                        protocol.move_labware(
                            lid_on_plate, used_lids[-2], use_gripper=True
                        )
            else:
                protocol.comment("Hybridize off Deck")

        if STEP_CAPTURE == 1:
            protocol.comment("==============================================")
            protocol.comment("--> Capture")
            protocol.comment("==============================================")
            # Standard Setup

            if DRYRUN is False:
                protocol.comment("SETTING THERMO and TEMP BLOCK Temperature")
                thermocycler.set_block_temperature(58)
                thermocycler.set_lid_temperature(58)

            if DRYRUN is False:
                heatershaker.set_and_wait_for_temperature(58)

            protocol.comment("--> Transfer Hybridization")
            TransferSup = 100
            for loop, X in enumerate(column_1_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_1[X].bottom(z=0.5))
                p1000.aspirate(TransferSup + 1, rate=0.25)
                p1000.dispense(
                    TransferSup + 1, sample_plate_2[column_2_list[loop]].bottom(z=1)
                )
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()
            if disposable_lid:
                (
                    lid_on_plate,
                    unused_lids,
                    used_lids,
                ) = helpers.use_disposable_lid_with_tc(
                    protocol,
                    unused_lids,
                    used_lids,
                    sample_plate_1,
                    thermocycler,
                )
            else:
                thermocycler.close_lid()

            protocol.comment("--> ADDING SMB")
            SMBVol = 250
            SMBMixRPM = heater_shaker_speed
            SMBMixRep = 5.0 if DRYRUN is False else 0.1  # minutes
            SMBPremix = 3 if DRYRUN is False else 1
            # ==============================
            for loop, X in enumerate(column_2_list):
                p1000.pick_up_tip()
                p1000.mix(SMBPremix, 200, SMB.bottom(z=1))
                p1000.aspirate(SMBVol / 2, SMB.bottom(z=1), rate=0.25)
                p1000.dispense(SMBVol / 2, sample_plate_2[X].top(z=-7), rate=0.25)
                p1000.aspirate(SMBVol / 2, SMB.bottom(z=1), rate=0.25)
                p1000.dispense(SMBVol / 2, sample_plate_2[X].bottom(z=1), rate=0.25)
                p1000.default_speed = 5
                p1000.move_to(sample_plate_2[X].bottom(z=5))
                for Mix in range(2):
                    p1000.aspirate(100, rate=0.5)
                    p1000.move_to(sample_plate_2[X].bottom(z=1))
                    p1000.aspirate(80, rate=0.5)
                    p1000.dispense(80, rate=0.5)
                    p1000.move_to(sample_plate_2[X].bottom(z=5))
                    p1000.dispense(100, rate=0.5)
                    Mix += 1
                p1000.blow_out(sample_plate_2[X].top(z=-7))
                p1000.default_speed = 400
                p1000.move_to(sample_plate_2[X].top(z=5))
                p1000.move_to(sample_plate_2[X].top(z=0))
                p1000.move_to(sample_plate_2[X].top(z=5))
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()
            # ==============================
            helpers.set_hs_speed(protocol, heatershaker, SMBMixRPM, SMBMixRep, True)

            # GRIPPER MOVE sample_plate_2 FROM heatershaker TO MAGPLATE
            helpers.move_labware_from_hs_to_destination(
                protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
            )

            thermocycler.open_lid()
            if disposable_lid:
                if trash_lid:
                    protocol.move_labware(lid_on_plate, trash_bin, use_gripper=True)
                elif len(used_lids) <= 1:
                    protocol.move_labware(lid_on_plate, "B4", use_gripper=True)
                else:
                    protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)

            if DRYRUN is False:
                protocol.delay(minutes=2)

            protocol.comment("==============================================")
            protocol.comment("--> WASH")
            protocol.comment("==============================================")
            # Setting Labware to Resume at Cleanup 1

            protocol.comment("--> Remove SUPERNATANT")
            for loop, X in enumerate(column_2_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_2[X].bottom(4))
                p1000.aspirate(200, rate=0.25)
                trash_liquid(protocol, p1000, 200.0, liquid_trash_list)
                p1000.move_to(sample_plate_2[X].bottom(0.5))
                p1000.aspirate(200, rate=0.25)
                trash_liquid(protocol, p1000, 200.0, liquid_trash_list)
                p1000.aspirate(20)
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            # GRIPPER MOVE sample_plate_2 FROM MAGPLATE TO heatershaker
            helpers.move_labware_to_hs(
                protocol, sample_plate_2, heatershaker, heatershaker
            )

            protocol.comment("--> Repeating 6 washes")
            washreps = 6
            washcount = 0
            for wash in range(washreps):

                protocol.comment("--> Adding EEW")
                EEWVol = 200
                for loop, X in enumerate(column_2_list):
                    p1000.pick_up_tip()
                    p1000.aspirate(
                        EEWVol, WASHES[loop].bottom(z=dot_bottom)
                    )  # original = ()
                    p1000.dispense(
                        EEWVol, sample_plate_2[X].bottom(z=dot_bottom)
                    )  # original = ()
                    p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                    p200_tips += 1
                    tipcheck()
                helpers.set_hs_speed(
                    protocol, heatershaker, int(heater_shaker_speed * 0.9), 4.0, True
                )
                heatershaker.open_labware_latch()

                if DRYRUN is False:
                    protocol.delay(seconds=5 * 60)

                # GRIPPER MOVE sample_plate_2 FROM heatershaker TO MAGPLATE
                helpers.move_labware_from_hs_to_destination(
                    protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
                )

                if DRYRUN is False:
                    protocol.delay(seconds=1 * 60)

                protocol.comment("--> Removing Supernatant")
                RemoveSup = 200
                for loop, X in enumerate(column_2_list):
                    p1000.pick_up_tip()
                    p1000.move_to(sample_plate_2[X].bottom(z=3.5))
                    p1000.aspirate(RemoveSup - 100, rate=0.25)
                    protocol.delay(minutes=0.1)
                    p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                    p1000.aspirate(100, rate=0.25)
                    trash_liquid(protocol, p1000, RemoveSup, liquid_trash_list)
                    p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                    p200_tips += 1
                    tipcheck()

                # ============================================================================================
                # GRIPPER MOVE sample_plate_2 FROM MAGPLATE TO heatershaker
                helpers.move_labware_to_hs(
                    protocol, sample_plate_2, heatershaker, heatershaker
                )
                washcount += 1

            protocol.comment("--> Adding EEW")
            EEWVol = 200
            for loop, X in enumerate(column_2_list):
                p1000.pick_up_tip()
                p1000.aspirate(
                    EEWVol, WASHES[loop].bottom(z=dot_bottom)
                )  # original = ()
                p1000.dispense(
                    EEWVol, sample_plate_2[X].bottom(z=dot_bottom)
                )  # original = ()
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            helpers.set_hs_speed(
                protocol, heatershaker, int(heater_shaker_speed * 0.9), 4.0, True
            )

            if DRYRUN is False:
                protocol.delay(seconds=1 * 60)

            protocol.comment("--> Transfer Hybridization")
            TransferSup = 200
            for loop, X in enumerate(column_2_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                p1000.aspirate(TransferSup, rate=0.25)
                p1000.dispense(
                    TransferSup, sample_plate_2[column_3_list[loop]].bottom(z=1)
                )
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            if DRYRUN is False:
                protocol.delay(seconds=5 * 60)

            # GRIPPER MOVE sample_plate_2 FROM heatershaker TO MAGPLATE
            helpers.move_labware_from_hs_to_destination(
                protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
            )
            if DRYRUN is False:
                protocol.delay(seconds=1 * 60)

            protocol.comment("--> Removing Supernatant")
            RemoveSup = 200
            for loop, X in enumerate(column_3_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_2[X].bottom(z=3.5))
                p1000.aspirate(RemoveSup - 100, rate=0.25)
                protocol.delay(minutes=0.1)
                p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                p1000.aspirate(100, rate=0.25)
                p1000.move_to(sample_plate_2[X].top(z=0.5))
                trash_liquid(protocol, p1000, 100, liquid_trash_list)
                p1000.aspirate(20)
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            protocol.comment("--> Removing Residual")
            for loop, X in enumerate(column_3_list):
                p50.pick_up_tip()
                p50.move_to(sample_plate_2[X].bottom(z=dot_bottom))  # original = z=0
                p50.aspirate(50, rate=0.25)
                p50.default_speed = 200
                trash_liquid(protocol, p50, 50, liquid_trash_list)
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("==============================================")
            protocol.comment("--> ELUTE")
            protocol.comment("==============================================")

            protocol.comment("--> Adding Elute")
            EluteVol = 23
            for loop, X in enumerate(column_3_list):
                p50.pick_up_tip()
                p50.aspirate(EluteVol, Elute.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    EluteVol, sample_plate_2[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            # ============================================================================================
            # GRIPPER MOVE sample_plate_2 FROM MAGPLATE TO heatershaker
            helpers.move_labware_to_hs(
                protocol, sample_plate_2, heatershaker, heatershaker
            )
            # ============================================================================================
            helpers.set_hs_speed(
                protocol, heatershaker, int(heater_shaker_speed * 0.9), 2.0, True
            )
            heatershaker.open_labware_latch()

            if DRYRUN is False:
                protocol.delay(minutes=2)

            # ============================================================================================
            # GRIPPER MOVE sample_plate_2 FROM heatershaker TO MAGPLATE
            helpers.move_labware_from_hs_to_destination(
                protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
            )
            protocol.comment("--> Transfer Elution")
            TransferSup = 21
            for loop, X in enumerate(column_3_list):
                p50.pick_up_tip()
                p50.move_to(sample_plate_2[X].bottom(z=0.5))
                p50.aspirate(TransferSup + 1, rate=0.25)
                p50.dispense(
                    TransferSup + 1, sample_plate_1[column_4_list[loop]].bottom(z=1)
                )
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("--> Adding ET2")
            ET2Vol = 4
            ET2MixRep = 10 if DRYRUN is False else 1
            ET2MixVol = 20
            for loop, X in enumerate(column_4_list):
                p50.pick_up_tip()
                p50.aspirate(ET2Vol, ET2.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    ET2Vol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.move_to(sample_plate_1[X].bottom(z=dot_bottom))  # original = ()
                p50.mix(ET2MixRep, ET2MixVol)
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

        if STEP_PCR == 1:
            protocol.comment("==============================================")
            protocol.comment("--> AMPLIFICATION")
            protocol.comment("==============================================")

            protocol.comment("--> Adding PPC")
            PPCVol = 5
            for loop, X in enumerate(column_4_list):
                p50.pick_up_tip()
                p50.aspirate(PPCVol, PPC.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    PPCVol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("--> Adding EPM")
            EPMVol = 20
            EPMMixRep = 10 if DRYRUN is False else 1
            EPMMixVol = 45
            for loop, X in enumerate(column_4_list):
                p50.pick_up_tip()
                p50.aspirate(EPMVol, EPM.bottom(z=dot_bottom))  # original = ()
                p50.dispense(
                    EPMVol, sample_plate_1[X].bottom(z=dot_bottom)
                )  # original = ()
                p50.move_to(sample_plate_1[X].bottom(z=dot_bottom))  # original = ()
                p50.mix(EPMMixRep, EPMMixVol)
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

        if DRYRUN is False:
            heatershaker.deactivate_heater()

        if STEP_PCRDECK == 1:
            if DRYRUN is False:
                if DRYRUN is False:
                    if disposable_lid:
                        (
                            lid_on_plate,
                            unused_lids,
                            used_lids,
                        ) = helpers.use_disposable_lid_with_tc(
                            protocol,
                            unused_lids,
                            used_lids,
                            sample_plate_1,
                            thermocycler,
                        )
                    else:
                        thermocycler.close_lid()
                    profile_PCR_1: List[ThermocyclerStep] = [
                        {"temperature": 98, "hold_time_seconds": 45}
                    ]
                    thermocycler.execute_profile(
                        steps=profile_PCR_1, repetitions=1, block_max_volume=50
                    )
                    profile_PCR_2: List[ThermocyclerStep] = [
                        {"temperature": 98, "hold_time_seconds": 30},
                        {"temperature": 60, "hold_time_seconds": 30},
                        {"temperature": 72, "hold_time_seconds": 30},
                    ]
                    thermocycler.execute_profile(
                        steps=profile_PCR_2, repetitions=12, block_max_volume=50
                    )
                    profile_PCR_3: List[ThermocyclerStep] = [
                        {"temperature": 72, "hold_time_minutes": 1}
                    ]
                    thermocycler.execute_profile(
                        steps=profile_PCR_3, repetitions=1, block_max_volume=50
                    )
                    thermocycler.set_block_temperature(10)

                thermocycler.open_lid()
                if disposable_lid:
                    if trash_lid:
                        protocol.move_labware(lid_on_plate, trash_bin, use_gripper=True)
                    elif len(used_lids) <= 1:
                        protocol.move_labware(lid_on_plate, "B4", use_gripper=True)
                    else:
                        protocol.move_labware(
                            lid_on_plate, used_lids[-2], use_gripper=True
                        )

        if STEP_CLEANUP == 1:
            protocol.comment("==============================================")
            protocol.comment("--> Cleanup")
            protocol.comment("==============================================")

            # GRIPPER MOVE sample_plate_2 FROM MAGPLATE TO heatershaker
            helpers.move_labware_to_hs(
                protocol, sample_plate_2, heatershaker, heatershaker
            )

            protocol.comment("--> Transfer Elution")
            TransferSup = 45
            for loop, X in enumerate(column_4_list):
                p50.pick_up_tip()
                p50.move_to(sample_plate_1[X].bottom(z=0.5))
                p50.aspirate(TransferSup + 1, rate=0.25)
                p50.dispense(
                    TransferSup + 1, sample_plate_2[column_5_list[loop]].bottom(z=1)
                )
                p50.return_tip() if TIP_TRASH is False else p50.drop_tip()
                p50_tips += 1
                tipcheck()

            protocol.comment("--> ADDING AMPure (0.8x)")
            AMPureVol = 40.5
            AMPureMixRep = 5.0 if DRYRUN is False else 0.1
            AMPurePremix = 3 if DRYRUN is False else 1
            # ========NEW SINGLE TIP DISPENSE===========
            for loop, X in enumerate(column_5_list):
                p1000.pick_up_tip()
                p1000.mix(AMPurePremix, AMPureVol + 10, AMPure.bottom(z=1))
                p1000.aspirate(AMPureVol, AMPure.bottom(z=1), rate=0.25)
                p1000.dispense(AMPureVol, sample_plate_2[X].bottom(z=1), rate=0.25)
                p1000.default_speed = 5
                p1000.move_to(sample_plate_2[X].bottom(z=5))
                for Mix in range(2):
                    p1000.aspirate(60, rate=0.5)
                    p1000.move_to(sample_plate_2[X].bottom(z=1))
                    p1000.aspirate(60, rate=0.5)
                    p1000.dispense(60, rate=0.5)
                    p1000.move_to(sample_plate_2[X].bottom(z=5))
                    p1000.dispense(30, rate=0.5)
                    Mix += 1
                p1000.blow_out(sample_plate_2[X].top(z=2))
                p1000.default_speed = 400
                p1000.move_to(sample_plate_2[X].top(z=5))
                p1000.move_to(sample_plate_2[X].top(z=0))
                p1000.move_to(sample_plate_2[X].top(z=5))
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()
            # ========NEW HS MIX=========================
            helpers.set_hs_speed(
                protocol,
                heatershaker,
                int(heater_shaker_speed * 0.9),
                AMPureMixRep,
                True,
            )

            # GRIPPER MOVE PLATE FROM HEATER SHAKER TO MAG PLATE
            helpers.move_labware_from_hs_to_destination(
                protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
            )

            if DRYRUN is False:
                protocol.delay(minutes=4)

            protocol.comment("--> Removing Supernatant")
            RemoveSup = 200
            for loop, X in enumerate(column_5_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_2[X].bottom(z=3.5))
                p1000.aspirate(RemoveSup - 100, rate=0.25)
                protocol.delay(minutes=0.1)
                p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                p1000.aspirate(100, rate=0.25)
                p1000.default_speed = 5
                p1000.move_to(sample_plate_2[X].top(z=2))
                p1000.default_speed = 200
                trash_liquid(protocol, p1000, 200, liquid_trash_list)
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            for X_times in range(2):
                protocol.comment("--> ETOH Wash")
                ETOHMaxVol = 150
                for loop, X in enumerate(column_5_list):
                    p1000.pick_up_tip()
                    p1000.aspirate(ETOHMaxVol, EtOH.bottom(z=1))
                    p1000.move_to(EtOH.top(z=0))
                    p1000.move_to(EtOH.top(z=-5))
                    p1000.move_to(EtOH.top(z=0))
                    p1000.move_to(sample_plate_2[X].top(z=-2))
                    p1000.dispense(ETOHMaxVol, rate=1)
                    protocol.delay(minutes=0.1)
                    p1000.blow_out()
                    p1000.move_to(sample_plate_2[X].top(z=5))
                    p1000.move_to(sample_plate_2[X].top(z=0))
                    p1000.move_to(sample_plate_2[X].top(z=5))
                    p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                    p200_tips += 1
                    tipcheck()

                if DRYRUN is False:
                    protocol.delay(minutes=0.5)

                protocol.comment("--> Remove ETOH Wash")
                for loop, X in enumerate(column_5_list):
                    p1000.pick_up_tip()
                    p1000.move_to(sample_plate_2[X].bottom(z=3.5))
                    p1000.aspirate(RemoveSup - 100, rate=0.25)
                    protocol.delay(minutes=0.1)
                    p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                    p1000.aspirate(100, rate=0.25)
                    p1000.default_speed = 5
                    p1000.move_to(sample_plate_2[X].top(z=2))
                    p1000.default_speed = 200
                    trash_liquid(protocol, p1000, RemoveSup, liquid_trash_list)
                    p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                    p200_tips += 1
                    tipcheck()

            if DRYRUN is False:
                protocol.delay(minutes=2)

            protocol.comment("--> Removing Residual ETOH")
            for loop, X in enumerate(column_5_list):
                p1000.pick_up_tip()
                p1000.move_to(
                    sample_plate_2[X].bottom(z=dot_bottom)
                )  # original = (z=0)
                p1000.aspirate(50, rate=0.25)
                p1000.default_speed = 200
                trash_liquid(protocol, p1000, 50, liquid_trash_list)
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()

            if DRYRUN is False:
                protocol.delay(minutes=1)

            # GRIPPER MOVE PLATE FROM MAG PLATE TO HEATER SHAKER
            helpers.move_labware_to_hs(
                protocol, sample_plate_2, heatershaker, heatershaker
            )

            protocol.comment("--> Adding RSB")
            RSBVol = 32
            RSBMixRep = 1.0 if DRYRUN is False else 0.1  # minutes
            for loop, X in enumerate(column_5_list):
                p1000.pick_up_tip()
                p1000.aspirate(RSBVol, RSB.bottom(z=1))

                p1000.move_to(
                    (
                        sample_plate_2.wells_by_name()[X]
                        .center()
                        .move(types.Point(x=1.3 * 0.8, y=0, z=-4))
                    )
                )
                p1000.dispense(RSBVol, rate=1)
                p1000.move_to(sample_plate_2.wells_by_name()[X].bottom(z=1))
                p1000.aspirate(RSBVol, rate=1)
                p1000.move_to(
                    (
                        sample_plate_2.wells_by_name()[X]
                        .center()
                        .move(types.Point(x=0, y=1.3 * 0.8, z=-4))
                    )
                )
                p1000.dispense(RSBVol, rate=1)
                p1000.move_to(sample_plate_2.wells_by_name()[X].bottom(z=1))
                p1000.aspirate(RSBVol, rate=1)
                p1000.move_to(
                    (
                        sample_plate_2.wells_by_name()[X]
                        .center()
                        .move(types.Point(x=1.3 * -0.8, y=0, z=-4))
                    )
                )
                p1000.dispense(RSBVol, rate=1)
                p1000.move_to(sample_plate_2.wells_by_name()[X].bottom(z=1))
                p1000.aspirate(RSBVol, rate=1)
                p1000.move_to(
                    (
                        sample_plate_2.wells_by_name()[X]
                        .center()
                        .move(types.Point(x=0, y=1.3 * -0.8, z=-4))
                    )
                )
                p1000.dispense(RSBVol, rate=1)
                p1000.move_to(sample_plate_2.wells_by_name()[X].bottom(z=1))
                p1000.aspirate(RSBVol, rate=1)
                p1000.dispense(RSBVol, rate=1)

                p1000.blow_out(sample_plate_2.wells_by_name()[X].center())
                p1000.move_to(sample_plate_2.wells_by_name()[X].top(z=5))
                p1000.move_to(sample_plate_2.wells_by_name()[X].top(z=0))
                p1000.move_to(sample_plate_2.wells_by_name()[X].top(z=5))
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()
                if DRYRUN is False:
                    helpers.set_hs_speed(
                        protocol,
                        heatershaker,
                        int(heater_shaker_speed * 0.8),
                        RSBMixRep,
                        True,
                    )

            # GRIPPER MOVE PLATE FROM HEATER SHAKER TO MAG PLATE
            helpers.move_labware_from_hs_to_destination(
                protocol, sample_plate_2, heatershaker, MAG_PLATE_SLOT
            )

            if DRYRUN is False:
                protocol.delay(minutes=3)

            protocol.comment("--> Transferring Supernatant")
            TransferSup = 30
            for loop, X in enumerate(column_5_list):
                p1000.pick_up_tip()
                p1000.move_to(sample_plate_2[X].bottom(z=0.5))
                p1000.aspirate(TransferSup + 1, rate=0.25)
                p1000.dispense(
                    TransferSup + 1, sample_plate_1[column_6_list[loop]].bottom(z=1)
                )
                p1000.return_tip() if TIP_TRASH is False else p1000.drop_tip()
                p200_tips += 1
                tipcheck()
    liquids_to_probe_at_end = [
        Liquid_trash_well_1,
        Liquid_trash_well_2,
        Liquid_trash_well_3,
        Liquid_trash_well_4,
    ]
    helpers.find_liquid_height_of_all_wells(protocol, p50, liquids_to_probe_at_end)
    if deactivate_modules_bool:
        helpers.deactivate_modules(protocol)
