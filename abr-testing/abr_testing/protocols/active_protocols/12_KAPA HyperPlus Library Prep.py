"""KAPA HyperPlus Library Preparation."""
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Labware,
    Well,
    InstrumentContext,
)
from opentrons import types
import math
from abr_testing.protocols import helpers
from opentrons.protocol_api.module_contexts import (
    TemperatureModuleContext,
    MagneticBlockContext,
    ThermocyclerContext,
)
from typing import List, Tuple, Dict

metadata = {
    "protocolName": "KAPA HyperPlus Library Preparation",
    "author": "Tony Ngumah <tony.ngumah@opentrons.com>",
}

requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    parameters.add_bool(
        variable_name="dry_run",
        display_name="Dry Run",
        description="Skip incubation delays and shorten mix steps.",
        default=False,
    )
    parameters.add_bool(
        variable_name="trash_tips",
        display_name="Trash tip",
        description="tip trashes after every use",
        default=False,
    )
    helpers.create_disposable_lid_parameter(parameters)
    helpers.create_tc_lid_deck_riser_parameter(parameters)
    helpers.create_two_pipette_mount_parameters(parameters)
    helpers.create_deactivate_modules_parameter(parameters)
    parameters.add_int(
        variable_name="num_samples",
        display_name="number of samples",
        description="How many samples to be perform for library prep",
        default=48,
        minimum=8,
        maximum=48,
    )
    parameters.add_int(
        variable_name="PCR_CYCLES",
        display_name="number of PCR Cycles",
        description="How many pcr cycles to be perform for library prep",
        default=2,
        minimum=2,
        maximum=16,
    )

    parameters.add_int(
        variable_name="Fragmentation_time",
        display_name="time on thermocycler",
        description="Fragmentation time in thermocycler",
        default=30,
        minimum=10,
        maximum=30,
    )


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    USE_GRIPPER = True
    deactivate_mods = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    trash_tips = protocol.params.trash_tips  # type: ignore[attr-defined]
    dry_run = protocol.params.dry_run  # type: ignore[attr-defined]
    pipette_1000_mount = protocol.params.pipette_mount_1  # type: ignore[attr-defined]
    pipette_50_mount = protocol.params.pipette_mount_2  # type: ignore[attr-defined]
    deck_riser = protocol.params.deck_riser  # type: ignore[attr-defined]
    helpers.comment_protocol_version(protocol, "01")

    REUSE_ETOH_TIPS = True
    REUSE_RSB_TIPS = (
        True  # Reuse tips for RSB buffer (adding RSB, mixing, and transferring)
    )
    REUSE_REMOVE_TIPS = True  # Reuse tips for supernatant removal
    num_samples = protocol.params.num_samples  # type: ignore[attr-defined]
    PCRCYCLES = protocol.params.PCR_CYCLES  # type: ignore[attr-defined]
    disposable_lid = protocol.params.disposable_lid  # type: ignore[attr-defined]
    Fragmentation_time = 10
    ligation_tc_time = 15
    used_lids: List[Labware] = []
    if dry_run:
        trash_tips = False

    num_cols = math.ceil(num_samples / 8)

    # Pre-set parameters
    # sample_vol = 35.0
    frag_vol = 15.0
    end_repair_vol = 10.0
    adapter_vol = 5.0
    ligation_vol = 45.0
    amplification_vol = 30.0
    bead_vol_1 = 88.0
    bead_vol_2 = 50.0
    # bead_vol = bead_vol_1 + bead_vol_2
    bead_inc = 2.0
    rsb_vol_1 = 25.0
    rsb_vol_2 = 20.0
    # rsb_vol = rsb_vol_1 + rsb_vol_2
    elution_vol = 20.0
    elution_vol_2 = 17.0
    # etoh_vol = 400.0

    # Importing Labware, Modules and Instruments
    magblock: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "D2"
    )  # type: ignore[assignment]
    temp_mod: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "B3"
    )  # type: ignore[assignment]
    temp_plate, temp_adapter = helpers.load_temp_adapter_and_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt",
        temp_mod,
        "Temp Module Reservoir Plate",
    )

    if not dry_run:
        temp_mod.set_temperature(4)
    tc_mod: ThermocyclerContext = protocol.load_module(helpers.tc_str)  # type: ignore[assignment]
    # Just in case
    tc_mod.open_lid()

    FLP_plate = magblock.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "FLP Plate"
    )
    samples_flp = FLP_plate.rows()[0][:num_cols]

    sample_plate = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "D1", "Sample Plate 1"
    )

    sample_plate_2 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "B2", "Sample Plate 2"
    )
    samples_2 = sample_plate_2.rows()[0][:num_cols]
    samples = sample_plate.rows()[0][:num_cols]
    reservoir = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "C2", "Beads + Buffer + Ethanol"
    )
    # Load tipracks
    tiprack_50_1 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "A3")
    tiprack_50_2 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", "A2")

    tiprack_200_1 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "C1")
    tiprack_200_2 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "C3")

    if trash_tips:
        protocol.load_waste_chute()

    unused_lids: List[Labware] = []
    # Load TC Lids
    if disposable_lid:
        unused_lids = helpers.load_disposable_lids(protocol, 5, ["C4"], deck_riser)
    # Import Global Variables

    global tip50
    global tip200
    global p50_rack_count
    global p200_rack_count
    tip_count = {1000: 0, 50: 0}

    p200 = protocol.load_instrument(
        "flex_8channel_1000",
        pipette_1000_mount,
        tip_racks=[tiprack_200_1, tiprack_200_2],
    )
    p50 = protocol.load_instrument(
        "flex_8channel_50", pipette_50_mount, tip_racks=[tiprack_50_1, tiprack_50_2]
    )

    # Load Reagent Locations in Reservoirs
    lib_amplification_wells: List[Well] = temp_plate.columns()[num_cols + 3]
    amplification_res = lib_amplification_wells[0]
    adapters = temp_plate.rows()[0][:num_cols]  # used for filling liquids
    end_repair_cols: List[Well] = temp_plate.columns()[
        num_cols
    ]  # used for filling liquids
    er_res = end_repair_cols[0]
    frag: List[Well] = temp_plate.columns()[num_cols + 1]
    frag_res = frag[0]
    ligation: List[Well] = temp_plate.columns()[num_cols + 2]
    ligation_res = ligation[0]
    # Room Temp Res (deepwell)
    bead = reservoir.columns()[0]
    bead_res = bead[0]
    rsb = reservoir.columns()[3]
    rsb_res = rsb[0]
    etoh1 = reservoir.columns()[4]
    etoh1_res = etoh1[0]
    etoh2 = reservoir.columns()[5]
    etoh2_res = etoh2[0]

    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Samples": [{"well": sample_plate.wells()[: 8 * num_cols], "volume": 35.0}],
        "Final Library": [
            {"well": sample_plate_2.wells()[: 8 * num_cols], "volume": 17.0}
        ],
        "Adapters": [{"well": adapters, "volume": 10.0}],
        "End Repair Mix": [
            {"well": temp_plate.wells()[: 8 * num_cols], "volume": 61.0}
        ],
        "Fragmentation Mix": [{"well": frag, "volume": 91.5}],
        "Ligation Mix": [{"well": ligation, "volume": 200.0}],
        "Amplification Mix": [{"well": lib_amplification_wells, "volume": 183.0}],
        "Ampure Beads": [{"well": bead, "volume": 910.8}],
        "Resuspension Buffer": [{"well": rsb, "volume": 297.0}],
        "Ethanol 80%": [
            {"well": etoh1, "volume": 2000.0},
            {"well": etoh2, "volume": 2000.0},
        ],
    }
    waste1 = reservoir.columns()[6]
    waste1_res = waste1[0]

    waste2 = reservoir.columns()[7]
    waste2_res = waste2[0]

    helpers.find_liquid_height_of_loaded_liquids(protocol, liquid_vols_and_wells, p50)

    def tip_track(pipette: InstrumentContext, tip_count: Dict) -> None:
        """Track tip usage."""
        # Get the current tip count for the pipette
        current_tips = tip_count[pipette.max_volume]

        # Check if tip count exceeds the maximum tips per rack
        if current_tips >= (96 * 2):
            tip_count[pipette.max_volume] = 0
            pipette.reset_tipracks()

        # Pick up a new tip and update the count
        if not pipette._has_tip:
            pipette.pick_up_tip()
            tip_count[
                pipette.max_volume
            ] += 8  # Adjust increment based on multi-channel pipette

    def run_tag_profile(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Run Tag Profile."""
        # Presetting Thermocycler Temps
        protocol.comment(
            "****Starting Fragmentation Profile (37C for 10 minutes with 100C lid)****"
        )
        tc_mod.set_lid_temperature(100)
        tc_mod.set_block_temperature(37)

        # Move Plate to TC
        protocol.comment("****Moving Plate to Pre-Warmed TC Module Block****")
        protocol.move_labware(sample_plate, tc_mod, use_gripper=USE_GRIPPER)

        if disposable_lid:
            lid_on_plate, unused_lids, used_lids = helpers.use_disposable_lid_with_tc(
                protocol, unused_lids, used_lids, sample_plate, tc_mod
            )
        else:
            tc_mod.close_lid()
        tc_mod.set_block_temperature(
            temperature=37, hold_time_minutes=Fragmentation_time, block_max_volume=50
        )
        tc_mod.open_lid()

        if disposable_lid:
            if len(used_lids) <= 1:
                protocol.move_labware(lid_on_plate, "D4", use_gripper=True)
            else:
                protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)
        # #Move Plate to H-S
        protocol.comment("****Moving Plate off of TC****")

        protocol.move_labware(sample_plate, "D1", use_gripper=USE_GRIPPER)
        return unused_lids, used_lids

    def run_er_profile(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """End Repair Profile."""
        # Presetting Thermocycler Temps
        protocol.comment(
            "****Starting End Repair Profile (65C for 30 minutes with 100C lid)****"
        )
        tc_mod.set_lid_temperature(100)
        tc_mod.set_block_temperature(65)

        # Move Plate to TC
        protocol.comment("****Moving Plate to Pre-Warmed TC Module Block****")
        protocol.move_labware(sample_plate, tc_mod, use_gripper=USE_GRIPPER)

        if disposable_lid:
            lid_on_plate, unused_lids, used_lids = helpers.use_disposable_lid_with_tc(
                protocol, unused_lids, used_lids, sample_plate, tc_mod
            )
        else:
            tc_mod.close_lid()
        tc_mod.set_block_temperature(
            temperature=65, hold_time_minutes=30, block_max_volume=50
        )

        tc_mod.deactivate_block()
        tc_mod.open_lid()

        if disposable_lid:
            # move lid
            if len(used_lids) <= 1:
                protocol.move_labware(lid_on_plate, "C4", use_gripper=True)
            else:
                protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)
        # #Move Plate to H-S
        protocol.comment("****Moving Plate off of TC****")

        protocol.move_labware(sample_plate, "D1", use_gripper=USE_GRIPPER)
        return unused_lids, used_lids

    def run_ligation_profile(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Run Ligation Profile."""
        # Presetting Thermocycler Temps
        protocol.comment(
            "****Starting Ligation Profile (20C for 15 minutes with 100C lid)****"
        )
        tc_mod.set_lid_temperature(100)
        tc_mod.set_block_temperature(20)

        # Move Plate to TC
        protocol.comment("****Moving Plate to Pre-Warmed TC Module Block****")

        protocol.move_labware(sample_plate, tc_mod, use_gripper=USE_GRIPPER)

        if disposable_lid:
            lid_on_plate, unused_lids, used_lids = helpers.use_disposable_lid_with_tc(
                protocol, unused_lids, used_lids, sample_plate, tc_mod
            )
        else:
            tc_mod.close_lid()
        tc_mod.set_block_temperature(
            temperature=20, hold_time_minutes=ligation_tc_time, block_max_volume=50
        )

        tc_mod.deactivate_block()

        tc_mod.open_lid()
        # Move lid
        tc_mod.open_lid()
        if disposable_lid:
            if len(used_lids) <= 1:
                protocol.move_labware(lid_on_plate, "C4", use_gripper=True)
            else:
                protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)

        # #Move Plate to H-S
        protocol.comment("****Moving Plate off of TC****")

        protocol.move_labware(sample_plate, "D1", use_gripper=USE_GRIPPER)
        return unused_lids, used_lids

    def run_amplification_profile(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Run Amplification Profile."""
        # Presetting Thermocycler Temps
        protocol.comment(
            "Amplification Profile (37C for 5 min, 50C for 5 min with 100C lid)"
        )
        tc_mod.set_lid_temperature(100)
        tc_mod.set_block_temperature(98)

        # Move Plate to TC
        protocol.comment("****Moving Sample Plate onto TC****")
        protocol.move_labware(sample_plate_2, tc_mod, use_gripper=USE_GRIPPER)

        if not dry_run:
            tc_mod.set_lid_temperature(105)
        if disposable_lid:
            lid_on_plate, unused_lids, used_lids = helpers.use_disposable_lid_with_tc(
                protocol, unused_lids, used_lids, sample_plate_2, tc_mod
            )
        else:
            tc_mod.close_lid()
        if not dry_run:
            helpers.perform_pcr(
                protocol,
                tc_mod,
                initial_denature_time_sec=45,
                denaturation_time_sec=15,
                anneal_time_sec=30,
                extension_time_sec=30,
                cycle_repetitions=PCRCYCLES,
                final_extension_time_min=1,
            )
            tc_mod.set_block_temperature(4)
        tc_mod.open_lid()
        if disposable_lid:
            if len(used_lids) <= 1:
                protocol.move_labware(lid_on_plate, "C4", use_gripper=True)
            else:
                protocol.move_labware(lid_on_plate, used_lids[-2], use_gripper=True)

        # Move Sample Plate to H-S
        protocol.comment("****Moving Sample Plate back to H-S****")
        protocol.move_labware(sample_plate_2, "D1", use_gripper=USE_GRIPPER)
        # get FLP plate out of the way
        protocol.comment("****Moving FLP Plate back to TC****")
        protocol.move_labware(FLP_plate, tc_mod, use_gripper=USE_GRIPPER)
        return unused_lids, used_lids

    def mix_beads(
        pip: InstrumentContext, res: Well, vol: float, reps: int, col: int
    ) -> None:
        """Mix beads function."""
        # Multiplier tells
        mix_vol = (num_cols - col) * vol
        if pip == p50:
            if mix_vol > 50:
                mix_vol = 50
        if pip == p200:
            if mix_vol > 200:
                mix_vol = 200

        if res == bead_res:
            width = res.width
        else:
            width = res.diameter
        if width:
            move = (width / 2) - 1

        loc_center_a = res.bottom().move(types.Point(x=0, y=0, z=0.5))
        loc_center_d = res.bottom().move(types.Point(x=0, y=0, z=0.5))
        loc1 = res.bottom().move(types.Point(x=move, y=0, z=5))
        loc2 = res.bottom().move(types.Point(x=0, y=move, z=5))
        loc3 = res.bottom().move(types.Point(x=-move, y=0, z=5))
        loc4 = res.bottom().move(types.Point(x=0, y=-move, z=5))
        loc5 = res.bottom().move(types.Point(x=move / 2, y=move / 2, z=5))
        loc6 = res.bottom().move(types.Point(x=-move / 2, y=move / 2, z=5))
        loc7 = res.bottom().move(types.Point(x=-move / 2, y=-move / 2, z=5))
        loc8 = res.bottom().move(types.Point(x=move / 2, y=-move / 2, z=5))

        loc = [loc_center_d, loc1, loc5, loc2, loc6, loc3, loc7, loc4, loc8]
        if not pip._has_tip:
            tip_track(pip, tip_count)
        pip.aspirate(
            mix_vol, res.bottom().move(types.Point(x=0, y=0, z=10))
        )  # Blow bubbles to start
        pip.dispense(mix_vol, loc_center_d)
        for x in range(reps):
            pip.aspirate(mix_vol, loc_center_a)
            pip.dispense(mix_vol, loc[x])
        pip.flow_rate.aspirate = 10
        pip.flow_rate.dispense = 10
        pip.aspirate(mix_vol, loc_center_a)
        pip.dispense(mix_vol, loc_center_d)
        pip.flow_rate.aspirate = 150
        pip.flow_rate.dispense = 150

    def remove_supernatant(well: Well, vol: float, waste_: Well, column: int) -> None:
        """Remove supernatant."""
        protocol.comment("-------Removing " + str(vol) + "ul of Supernatant-------")
        p200.flow_rate.aspirate = 15
        num_trans = math.ceil(vol / 190)
        vol_per_trans = vol / num_trans
        tip_track(p200, tip_count)
        for x in range(num_trans):
            p200.aspirate(vol_per_trans / 2, well.bottom(0.2))
            protocol.delay(seconds=1)
            p200.aspirate(vol_per_trans / 2, well.bottom(0.2))
            p200.air_gap(10)
            p200.dispense(p200.current_volume, waste_)
            p200.air_gap(10)
            if REUSE_REMOVE_TIPS:
                p200.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")
            else:
                if trash_tips:
                    p200.drop_tip()
                    protocol.comment("****Dropping Tip in Waste shoot****")
                else:
                    p200.return_tip()
                    protocol.comment("****Dropping Tip Back in Tip Box****")
        p200.flow_rate.aspirate = 150

    def Fragmentation(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Fragmentation Function."""
        protocol.comment("-------Starting Fragmentation-------")

        for i in range(num_cols):

            protocol.comment("Mixing and Transfering beads to column " + str(i + 1))

            p50.flow_rate.dispense = 15
            tip_track(p50, tip_count)
            p50.aspirate(frag_vol, frag_res)
            p50.dispense(p50.current_volume, samples[i])
            p50.flow_rate.dispense = 150
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 15
                    p50.flow_rate.dispense = 15
                p50.aspirate(frag_vol, samples[i].bottom(1))
                p50.dispense(p50.current_volume, samples[i].bottom(5))
            p50.flow_rate.aspirate = 150
            p50.flow_rate.dispense = 150
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        unused_lids, used_lids = run_tag_profile(
            unused_lids, used_lids
        )  # Heats TC --> moves plate to TC --> TAG Profile --> removes plate from TC
        return unused_lids, used_lids

    def end_repair(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """End Repair Function."""
        protocol.comment("-------Starting end_repair-------")

        for i in range(num_cols):

            protocol.comment(
                "**** Mixing and Transfering beads to column " + str(i + 1) + " ****"
            )

            p50.flow_rate.dispense = 15
            tip_track(p50, tip_count)
            p50.aspirate(end_repair_vol, er_res)
            p50.dispense(p50.current_volume, samples[i])
            p50.flow_rate.dispense = 150
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 15
                    p50.flow_rate.dispense = 15
                p50.aspirate(end_repair_vol, samples[i].bottom(1))
                p50.dispense(p50.current_volume, samples[i].bottom(5))
            p50.flow_rate.aspirate = 150
            p50.flow_rate.dispense = 150
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        unused_lids, used_lids = run_er_profile(
            unused_lids, used_lids
        )  # Heats TC --> moves plate to TC --> TAG Profile --> removes plate from TC
        return unused_lids, used_lids

    # Index Ligation

    def index_ligation(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Index Ligation."""
        protocol.comment("-------Ligating Indexes-------")
        protocol.comment("-------Adding and Mixing ELM-------")
        for i in samples:
            tip_track(p50, tip_count)
            p50.aspirate(ligation_vol, ligation_res)
            p50.dispense(p50.current_volume, i)
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 75
                    p50.flow_rate.dispense = 75
                p50.aspirate(ligation_vol - 10, i)
                p50.dispense(p50.current_volume, i.bottom(8))
            p50.flow_rate.aspirate = 150
            p50.flow_rate.dispense = 150
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        # Add and mix adapters
        protocol.comment("-------Adding and Mixing Adapters-------")
        for i_well, x_well in zip(samples, adapters):
            tip_track(p50, tip_count)
            p50.aspirate(adapter_vol, x_well)
            p50.dispense(p50.current_volume, i_well)
            for y in range(10 if not dry_run else 1):
                if y == 9:
                    p50.flow_rate.aspirate = 75
                    p50.flow_rate.dispense = 75
                p50.aspirate(40, i_well)
                p50.dispense(40, i_well.bottom(8))
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        p50.flow_rate.aspirate = 150
        p50.flow_rate.dispense = 150

        unused_lids, used_lids = run_ligation_profile(unused_lids, used_lids)
        return unused_lids, used_lids

    def lib_cleanup() -> None:
        """Litigation Clean up."""
        protocol.comment("-------Starting Cleanup-------")
        protocol.comment("-------Adding and Mixing Cleanup Beads-------")

        # Move FLP plate off magnetic module if it's there
        if FLP_plate.parent == magblock:
            protocol.comment("****Moving FLP Plate off Magnetic Module****")
            protocol.move_labware(FLP_plate, tc_mod, use_gripper=USE_GRIPPER)

        for x, i in enumerate(samples):
            mix_beads(p200, bead_res, bead_vol_1, 7 if x == 0 else 2, x)
            p200.aspirate(bead_vol_1, bead_res)
            p200.dispense(bead_vol_1, i)
            mix_beads(p200, i, bead_vol_1, 7 if not dry_run else 1, num_cols - 1)
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p200.flow_rate.aspirate = 75
                    p200.flow_rate.dispense = 75
                p200.aspirate(bead_vol_1, i)
                p200.dispense(bead_vol_1, i.bottom(8))
            p200.flow_rate.aspirate = 150
            p200.flow_rate.dispense = 150
            if trash_tips:
                p200.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p200.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        protocol.delay(
            minutes=bead_inc,
            msg="Please wait "
            + str(bead_inc)
            + " minutes while samples incubate at RT.",
        )

        protocol.comment("****Moving Labware to Magnet for Pelleting****")
        protocol.move_labware(sample_plate, magblock, use_gripper=USE_GRIPPER)

        protocol.delay(minutes=4.5, msg="Time for Pelleting")

        for col, i in enumerate(samples):
            remove_supernatant(i, 130, waste1_res, col)
        samp_list = samples

        # Wash 2 x with 80% Ethanol
        p200.flow_rate.aspirate = 75
        p200.flow_rate.dispense = 75
        for y in range(2 if not dry_run else 1):
            protocol.comment(f"-------Wash # {y+1} with Ethanol-------")
            if y == 0:  # First wash
                this_res = etoh1_res
                this_waste_res = waste1_res
            else:  # Second Wash
                this_res = etoh2_res
                this_waste_res = waste2_res
                tip_track(p200, tip_count)
                p200.aspirate(150, this_res)
                p200.air_gap(10)
                p200.dispense(p200.current_volume, i.top())
                protocol.delay(seconds=1)
                p200.air_gap(10)
                if not REUSE_ETOH_TIPS:
                    p200.drop_tip() if trash_tips else p200.return_tip()

            protocol.delay(seconds=10)
            # Remove the ethanol wash
            for x, i in enumerate(samp_list):
                tip_track(p200, tip_count)
                p200.aspirate(155, i)
                p200.air_gap(10)
                p200.dispense(p200.current_volume, this_waste_res)
                protocol.delay(seconds=1)
                p200.air_gap(10)
                if trash_tips:
                    p200.drop_tip()
                    protocol.comment("****Dropping Tip in Waste shoot****")
                else:
                    p200.return_tip()
                    protocol.comment("****Dropping Tip Back in Tip Box****")

        p200.flow_rate.aspirate = 150
        p200.flow_rate.dispense = 150

        # Wash complete, move on to drying steps.
        protocol.delay(minutes=2, msg="Allow 3 minutes for residual ethanol to dry")

        # Return Plate to H-S from Magnet

        protocol.comment("****Moving sample plate off of Magnet****")
        protocol.move_labware(sample_plate, "D1", use_gripper=USE_GRIPPER)

        # Adding RSB and Mixing

        for col, i in enumerate(samp_list):
            protocol.comment(f"****Adding RSB to Columns: {col+1}****")
            tip_track(p50, tip_count)
            p50.aspirate(rsb_vol_1, rsb_res)
            p50.air_gap(5)
            p50.dispense(p50.current_volume, i)
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 15
                    p50.flow_rate.dispense = 15
                p50.aspirate(15, i.bottom(1))
                p50.dispense(15, i.bottom(4))
            p50.flow_rate.aspirate = 100
            p50.flow_rate.dispense = 100
            p50.air_gap(5)
            if REUSE_RSB_TIPS:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")
            else:
                if trash_tips:
                    p50.drop_tip()
                    protocol.comment("****Dropping Tip in Waste shoot****")
                else:
                    p50.return_tip()
                    protocol.comment("****Dropping Tip Back in Tip Box****")

        protocol.delay(
            minutes=3, msg="Allow 3 minutes for incubation and liquid aggregation."
        )

        protocol.comment("****Move Samples to Magnet for Pelleting****")
        protocol.move_labware(sample_plate, magblock, use_gripper=USE_GRIPPER)

        protocol.delay(minutes=2, msg="Please allow 2 minutes for beads to pellet.")

        p200.flow_rate.aspirate = 10
        for i_int, (s, e) in enumerate(zip(samp_list, samples_2)):
            tip_track(p50, tip_count)
            p50.aspirate(elution_vol, s)
            p50.air_gap(5)
            p50.dispense(p50.current_volume, e.bottom(1), push_out=3)
            p50.air_gap(5)
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        # move new sample plate to D1 or heatershaker
        protocol.comment("****Moving sample plate off of Magnet****")
        protocol.move_labware(sample_plate_2, "D1", use_gripper=USE_GRIPPER)

        # Keep Sample PLate 1 to B2
        protocol.comment("****Moving Sample_plate_1 Plate off magnet to B2****")
        protocol.move_labware(sample_plate, "B2", use_gripper=USE_GRIPPER)

        protocol.comment("****Moving FLP Plate off TC****")
        protocol.move_labware(FLP_plate, magblock, use_gripper=USE_GRIPPER)

    def lib_amplification(
        unused_lids: List[Labware], used_lids: List[Labware]
    ) -> Tuple[List[Labware], List[Labware]]:
        """Library Amplification."""
        protocol.comment("-------Starting lib_amplification-------")

        for i in range(num_cols):

            protocol.comment(
                "**** Mixing and Transfering beads to column " + str(i + 1) + " ****"
            )
            mix_beads(
                p50, amplification_res, amplification_vol, 7 if i == 0 else 2, i
            )  # 5 reps for first mix in reservoir
            p50.flow_rate.dispense = 15
            tip_track(p50, tip_count)
            p50.aspirate(amplification_vol, amplification_res)
            p50.dispense(p50.current_volume, samples_2[i])
            p50.flow_rate.dispense = 150
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 15
                    p50.flow_rate.dispense = 15
                p50.aspirate(amplification_vol, samples_2[i].bottom(1))
                p50.dispense(p50.current_volume, samples_2[i].bottom(5))
            p50.flow_rate.aspirate = 150
            p50.flow_rate.dispense = 150
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        unused_lids, used_lids = run_amplification_profile(
            unused_lids, used_lids
        )  # moves plate to TC --> TAG Profile --> removes plate from TC
        return unused_lids, used_lids

    def lib_cleanup_2() -> None:
        """Final Library Clean up."""
        protocol.comment("-------Starting Cleanup-------")
        protocol.comment("-------Adding and Mixing Cleanup Beads-------")
        for x, i in enumerate(samples_2):
            mix_beads(p200, bead_res, bead_vol_2, 7 if x == 0 else 2, x)
            tip_track(p200, tip_count)
            p200.aspirate(bead_vol_2, bead_res)
            p200.dispense(bead_vol_2, i)
            p200.return_tip()
            mix_beads(p200, i, bead_vol_2, 7 if not dry_run else 1, num_cols - 1)
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p200.flow_rate.aspirate = 75
                    p200.flow_rate.dispense = 75
                p200.aspirate(bead_vol_2, i)
                p200.dispense(bead_vol_2, i.bottom(8))
            p200.flow_rate.aspirate = 150
            p200.flow_rate.dispense = 150
            if trash_tips:
                p200.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p200.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        protocol.delay(
            minutes=bead_inc,
            msg="Please wait "
            + str(bead_inc)
            + " minutes while samples incubate at RT.",
        )

        protocol.comment("****Moving Labware to Magnet for Pelleting****")
        protocol.move_labware(sample_plate_2, magblock, use_gripper=USE_GRIPPER)

        protocol.delay(minutes=4.5, msg="Time for Pelleting")

        for col, i in enumerate(samples_2):
            remove_supernatant(i, 130, waste1_res, col)
        samp_list_2 = samples_2
        # Wash 2 x with 80% Ethanol

        p200.flow_rate.aspirate = 75
        p200.flow_rate.dispense = 75
        for y in range(2 if not dry_run else 1):
            protocol.comment(f"-------Wash # {y+1} with Ethanol-------")
            if y == 0:  # First wash
                this_res = etoh1_res
                this_waste_res = waste1_res
            else:  # Second Wash
                this_res = etoh2_res
                this_waste_res = waste2_res
                tip_track(p200, tip_count)
                p200.aspirate(150, this_res)
                p200.air_gap(10)
                p200.dispense(p200.current_volume, i.top())
                protocol.delay(seconds=1)
                p200.air_gap(10)
                if not REUSE_ETOH_TIPS:
                    p200.drop_tip() if trash_tips else p200.return_tip()

            protocol.delay(seconds=10)
            # Remove the ethanol wash
            for x, i in enumerate(samp_list_2):
                tip_track(p200, tip_count)
                p200.aspirate(155, i)
                p200.air_gap(10)
                p200.dispense(p200.current_volume, this_waste_res)
                protocol.delay(seconds=1)
                p200.air_gap(10)
                if trash_tips:
                    p200.drop_tip()
                    protocol.comment("****Dropping Tip in Waste shoot****")
                else:
                    p200.return_tip()
                    protocol.comment("****Dropping Tip Back in Tip Box****")

        p200.flow_rate.aspirate = 150
        p200.flow_rate.dispense = 150

        # Washes Complete, Move on to Drying Steps

        protocol.delay(minutes=3, msg="Allow 3 minutes for residual ethanol to dry")

        protocol.comment("****Moving sample plate off of Magnet****")
        protocol.move_labware(sample_plate_2, "D1", use_gripper=USE_GRIPPER)

        # Adding RSB and Mixing

        for col, i in enumerate(samp_list_2):
            protocol.comment(f"****Adding RSB to Columns: {col+1}****")
            tip_track(p50, tip_count)
            p50.aspirate(rsb_vol_2, rsb_res)
            p50.air_gap(5)
            p50.dispense(p50.current_volume, i)
            for x in range(10 if not dry_run else 1):
                if x == 9:
                    p50.flow_rate.aspirate = 15
                    p50.flow_rate.dispense = 15
                p50.aspirate(15, i.bottom(1))
                p50.dispense(15, i.bottom(4))
            p50.flow_rate.aspirate = 100
            p50.flow_rate.dispense = 100
            p50.air_gap(5)
            if REUSE_RSB_TIPS:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")
            else:
                if trash_tips:
                    p50.drop_tip()
                    protocol.comment("****Dropping Tip in Waste shoot****")
                else:
                    p50.return_tip()
                    protocol.comment("****Dropping Tip Back in Tip Box****")

        protocol.delay(
            minutes=3, msg="Allow 3 minutes for incubation and liquid aggregation."
        )

        protocol.comment("****Move Samples to Magnet for Pelleting****")
        protocol.move_labware(sample_plate_2, magblock, use_gripper=USE_GRIPPER)

        protocol.delay(minutes=2, msg="Please allow 2 minutes for beads to pellet.")

        p200.flow_rate.aspirate = 10
        for i_int, (s, e) in enumerate(zip(samp_list_2, samples_flp)):
            tip_track(p50, tip_count)
            p50.aspirate(elution_vol_2, s)
            p50.air_gap(5)
            p50.dispense(p50.current_volume, e.bottom(1), push_out=3)
            p50.air_gap(5)
            if trash_tips:
                p50.drop_tip()
                protocol.comment("****Dropping Tip in Waste shoot****")
            else:
                p50.return_tip()
                protocol.comment("****Dropping Tip Back in Tip Box****")

        # Set Block Temp for Final Plate
        tc_mod.set_block_temperature(4)

    unused_lids, used_lids = Fragmentation(unused_lids, used_lids)
    unused_lids, used_lids = end_repair(unused_lids, used_lids)
    unused_lids, used_lids = index_ligation(unused_lids, used_lids)
    lib_cleanup()
    unused_lids, used_lids = lib_amplification(unused_lids, used_lids)
    lib_cleanup_2()

    # Probe liquid waste
    reservoir.label = "Liquid Waste"  # type: ignore[attr-defined]
    waste1 = reservoir.columns()[6]
    waste1_res = waste1[0]

    waste2 = reservoir.columns()[7]
    waste2_res = waste2[0]

    end_probed_wells = [waste1_res, waste2_res]
    helpers.find_liquid_height_of_all_wells(protocol, p50, end_probed_wells)
    if deactivate_mods:
        helpers.deactivate_modules(protocol)
