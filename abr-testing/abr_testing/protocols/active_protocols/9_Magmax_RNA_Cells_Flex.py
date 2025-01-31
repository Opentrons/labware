"""Thermo MagMax RNA Extraction: Cells Multi-Channel."""
import math
from opentrons import types
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Well,
    InstrumentContext,
)
from typing import List
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    MagneticBlockContext,
    TemperatureModuleContext,
)

import numpy as np
from abr_testing.protocols import helpers
from typing import Dict

metadata = {
    "author": "Zach Galluzzo <zachary.galluzzo@opentrons.com>",
    "protocolName": "Thermo MagMax RNA Extraction: Cells Multi-Channel",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}
"""
Slot A1: Tips 200
Slot A2: Tips 200
Slot A3: Temperature module (gen2) with 96 well PCR block and Armadillo 96 well PCR Plate
** Plate gets 55 ul per well in each well of the entire plate
Slot B1: Tips 200
Slot B2: Tips 200
Slot B3: Nest 1 Well Reservoir
Slot C1: Magblock
Slot C2:
Slot C3:
Slot D1: H-S with Nest 96 Well Deepwell and DW Adapter
Slot D2: Nest 12 well 15 ml Reservoir
Slot D3: Trash

Reservoir 1:
Well 1 - 8120 ul
Well 2 - 8120 ul
Well 3 - 12800 ul
Well 4-12 - 9500 ul

"""

whichwash = 0
tip_pick_up = 0
drop_count = 0
waste_vol = 0
wash_volume_tracker = 0.0


# Start protocol
def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_single_pipette_mount_parameter(parameters)
    helpers.create_hs_speed_parameter(parameters)
    helpers.create_deactivate_modules_parameter(parameters)


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    dry_run = False
    inc_lysis = True
    res_type = "nest_12_reservoir_15ml"
    TIP_TRASH = False
    num_samples = 96
    wash_vol = 150.0
    lysis_vol = 140.0
    stop_vol = 100.0
    elution_vol = dnase_vol = 55.0
    heater_shaker_speed = protocol.params.heater_shaker_speed  # type: ignore[attr-defined]
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]
    pipette_mount = protocol.params.pipette_mount  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    helpers.comment_protocol_version(protocol, "01")

    # Protocol Parameters
    deepwell_type = "nest_96_wellplate_2ml_deep"
    if not dry_run:
        settling_time = 2.0
        lysis_time = 1.0
        drybeads = 2.0  # Number of minutes you want to dry for
        bind_time = wash_time = 5.0
        dnase_time = 10.0
        stop_time = elute_time = 3.0
    else:
        settling_time = 0.25
        lysis_time = 0.25
        drybeads = elute_time = 0.25
        bind_time = wash_time = dnase_time = stop_time = 0.25
    bead_vol = 20.0
    protocol.load_trash_bin("A3")
    h_s: HeaterShakerContext = protocol.load_module(
        helpers.hs_str, "D1"
    )  # type: ignore[assignment]
    sample_plate, h_s_adapter = helpers.load_hs_adapter_and_labware(
        deepwell_type, h_s, "Sample Plate"
    )
    h_s.close_labware_latch()
    temp: TemperatureModuleContext = protocol.load_module(
        helpers.temp_str, "D3"
    )  # type: ignore[assignment]
    elutionplate, temp_adapter = helpers.load_temp_adapter_and_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", temp, "Elution Plate"
    )
    temp.set_temperature(4)
    magblock: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "C1"
    )  # type: ignore[assignment]
    waste_reservoir = protocol.load_labware(
        "nest_1_reservoir_195ml", "B3", "Liquid Waste"
    )
    waste = waste_reservoir.wells()[0].top()
    res1 = protocol.load_labware(res_type, "D2", "reagent reservoir 1")
    num_cols = math.ceil(num_samples / 8)

    # Load tips and combine all similar boxes
    tips200 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "A1", "Tips 1")
    tips201 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "A2", "Tips 2")
    tips202 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "B1", "Tips 3")
    tips203 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "B2", "Tips 4")
    tips204 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "C2", "Tips 5")

    tips_sn = tips200.wells()[:num_samples]

    # load P1000M pipette
    m1000 = protocol.load_instrument(
        "flex_8channel_1000",
        pipette_mount,
        tip_racks=[tips200, tips201, tips202, tips203, tips204],
    )

    # Load Liquid Locations in Reservoir
    elution_solution = elutionplate.rows()[0][:num_cols]
    dnase1 = elutionplate.rows()[0][:num_cols]
    lysis_ = res1.wells()[0:2]
    stopreaction = res1.wells()[2]
    wash1 = res1.wells()[3]
    wash2 = res1.wells()[4]
    wash3 = res1.wells()[5]
    wash4 = res1.wells()[6]
    wash5 = res1.wells()[7]
    wash6 = res1.wells()[8]
    wash7 = res1.wells()[9]
    wash8 = res1.wells()[10]
    wash9 = res1.wells()[11]
    all_washes = res1.wells()[3:12]
    """
    Here is where you can define the locations of your reagents.
    """
    samples_m = sample_plate.rows()[0][:num_cols]  # 20ul beads each well
    cells_m = sample_plate.rows()[0][:num_cols]
    elution_samples_m = elutionplate.rows()[0][:num_cols]
    # Do the same for color mapping
    beads_ = sample_plate.wells()[: (8 * num_cols)]
    cells_ = sample_plate.wells()[(8 * num_cols) : (16 * num_cols)]
    elution_samps = elutionplate.wells()[: (8 * num_cols)]
    dnase1_ = elutionplate.wells()[(8 * num_cols) : (16 * num_cols)]

    # Add liquids to non-reservoir labware
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Beads": [{"well": beads_, "volume": bead_vol}],
        "Sample": [{"well": cells_, "volume": 0.0}],
        "DNAse": [{"well": dnase1_, "volume": dnase_vol}],
        "Elution Buffer": [{"well": elution_samps, "volume": elution_vol}],
        "Lysis": [{"well": lysis_, "volume": 8120.0}],
        "Stop": [{"well": stopreaction, "volume": 6400.0}],
        "Wash 1": [{"well": wash1, "volume": 9500.0}],
        "Wash 2": [{"well": wash2, "volume": 9500.0}],
        "Wash 3": [{"well": wash3, "volume": 9500.0}],
        "Wash 4": [{"well": wash4, "volume": 9500.0}],
        "Wash 5": [{"well": wash5, "volume": 9500.0}],
        "Wash 6": [{"well": wash6, "volume": 9500.0}],
        "Wash 7": [{"well": wash7, "volume": 9500.0}],
        "Wash 8": [{"well": wash8, "volume": 9500.0}],
        "Wash 9": [{"well": wash9, "volume": 9500.0}],
    }

    helpers.find_liquid_height_of_loaded_liquids(protocol, liquid_vols_and_wells, m1000)

    m1000.flow_rate.aspirate = 50
    m1000.flow_rate.dispense = 150
    m1000.flow_rate.blow_out = 300

    def tiptrack(pip: InstrumentContext) -> None:
        """Tip Track."""
        global tip_pick_up
        global drop_count
        pip.pick_up_tip()
        tip_pick_up += 1
        drop_count = drop_count + 8
        if drop_count >= 250:
            drop_count = 0
            if TIP_TRASH:
                protocol.pause("Empty Trash bin.")
        if tip_pick_up >= 59:
            pip.reset_tipracks()

    def remove_supernatant(vol: float) -> None:
        """Remove Supernatant."""
        protocol.comment("-----Removing Supernatant-----")
        m1000.flow_rate.aspirate = 30
        num_trans = math.ceil(vol / 180)
        vol_per_trans = vol / num_trans

        for i, m in enumerate(samples_m):
            m1000.pick_up_tip(tips_sn[8 * i])
            loc = m.bottom(dot_bottom)
            for _ in range(num_trans):
                if m1000.current_volume > 0:
                    # void air gap if necessary
                    m1000.dispense(m1000.current_volume, m.top())
                m1000.move_to(m.center())
                m1000.transfer(vol_per_trans, loc, waste, new_tip="never", air_gap=20)
                m1000.blow_out(waste)
                m1000.air_gap(20)
            m1000.drop_tip(tips_sn[8 * i]) if TIP_TRASH else m1000.return_tip()
        m1000.flow_rate.aspirate = 300
        # Move Plate From Magnet to H-S
        helpers.move_labware_to_hs(protocol, sample_plate, h_s, h_s_adapter)

    def bead_mixing(
        well: Well, pip: InstrumentContext, mvol: float, reps: int = 8
    ) -> None:
        """Bead Mixing.

        'mixing' will mix liquid that contains beads. This will be done by
        aspirating from the bottom of the well and dispensing from the top as to
        mix the beads with the other liquids as much as possible. Aspiration and
        dispensing will also be reversed for a short to to ensure maximal mixing.
        param well: The current well that the mixing will occur in.
        param pip: The pipet that is currently attached/ being used.
        param mvol: The volume that is transferred before the mixing steps.
        param reps: The number of mix repetitions that should occur. Note~
        During each mix rep, there are 2 cycles of aspirating from bottom,
        dispensing at the top and 2 cycles of aspirating from middle,
        dispensing at the bottom
        """
        center = well.top().move(types.Point(x=0, y=0, z=5))
        aspbot = well.bottom().move(types.Point(x=0, y=0, z=1))
        asptop = well.bottom().move(types.Point(x=2, y=-2, z=1))
        disbot = well.bottom().move(types.Point(x=-2, y=1.5, z=2))
        distop = well.bottom().move(types.Point(x=0, y=0, z=6))

        if mvol > 1000:
            mvol = 1000

        vol = mvol * 0.9

        pip.flow_rate.aspirate = 500
        pip.flow_rate.dispense = 500

        pip.move_to(center)
        for _ in range(reps):
            pip.aspirate(vol, aspbot)
            pip.dispense(vol, distop)
            pip.aspirate(vol, asptop)
            pip.dispense(vol, disbot)
            if _ == reps - 1:
                pip.flow_rate.aspirate = 100
                pip.flow_rate.dispense = 75
                pip.aspirate(vol, aspbot)
                pip.dispense(vol, aspbot)

        pip.flow_rate.aspirate = 300
        pip.flow_rate.dispense = 300

    def mixing(well: Well, pip: InstrumentContext, mvol: float, reps: int = 8) -> None:
        """Mixing.

        'mixing' will mix liquid that contains beads. This will be done by
        aspirating from the bottom of the well and dispensing from the top as to
        mix the beads with the other liquids as much as possible. Aspiration and
        dispensing will also be reversed for a short to to ensure maximal mixing.
        param well: The current well that the mixing will occur in.
        param pip: The pipet that is currently attached/ being used.
        param mvol: The volume that is transferred before the mixing steps.
        param reps: The number of mix repetitions that should occur. Note~
        During each mix rep, there are 2 cycles of aspirating from bottom,
        dispensing at the top and 2 cycles of aspirating from middle,
        dispensing at the bottom
        """
        center = well.top(5)
        asp = well.bottom(dot_bottom)
        disp = well.top(-8)

        if mvol > 1000:
            mvol = 1000

        vol = mvol * 0.9

        pip.flow_rate.aspirate = 500
        pip.flow_rate.dispense = 500

        pip.move_to(center)
        for _ in range(reps):
            pip.aspirate(vol, asp)
            pip.dispense(vol, disp)
            pip.aspirate(vol, asp)
            pip.dispense(vol, disp)
            if _ == reps - 1:
                pip.flow_rate.aspirate = 100
                pip.flow_rate.dispense = 75
                pip.aspirate(vol, asp)
                pip.dispense(vol, asp)

        pip.flow_rate.aspirate = 300
        pip.flow_rate.dispense = 300

    def lysis(vol: float, source: List[Well]) -> None:
        """Lysis Steps."""
        tvol_total = 0.0
        protocol.comment("-----Beginning lysis steps-----")
        num_transfers = math.ceil(vol / 180)
        tiptrack(m1000)
        src = source[0]
        for i in range(num_cols):
            tvol = vol / num_transfers
            for t in range(num_transfers):
                m1000.require_liquid_presence(src)
                m1000.aspirate(tvol, src.bottom(1))
                m1000.dispense(m1000.current_volume, cells_m[i].top(-3))
                tvol_total += tvol * 8
                if tvol_total > 8000.0:
                    protocol.comment("-----Changing to second lysis well.------")
                    src = source[1]
                    protocol.comment(f"new source {src}")
                    tvol_total = 0.0

        # mix after adding all reagent to wells with cells
        for i in range(num_cols):
            if i != 0:
                tiptrack(m1000)
            for x in range(8 if not dry_run else 1):
                m1000.aspirate(tvol * 0.75, cells_m[i].bottom(dot_bottom))
                m1000.dispense(tvol * 0.75, cells_m[i].bottom(8))
                if x == 3:
                    protocol.delay(minutes=0.0167)
                    m1000.blow_out(cells_m[i].bottom(1))
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, lysis_time, True)

    def bind() -> None:
        """Bind.

        `bind` will perform magnetic bead binding on each sample in the
        deepwell plate. Each channel of binding beads will be mixed before
        transfer, and the samples will be mixed with the binding beads after
        the transfer. The magnetic deck activates after the addition to all
        samples, and the supernatant is removed after bead binding.
        :param vol (float): The amount of volume to aspirate from the elution
                            buffer source and dispense to each well containing
                            beads.
        :param park (boolean): Whether to save sample-corresponding tips
                               between adding elution buffer and transferring
                               supernatant to the final clean elutions PCR
                               plate.
        """
        protocol.comment("-----Beginning bind steps-----")
        for i, well in enumerate(samples_m):
            # Transfer cells+lysis/bind to wells with beads
            tiptrack(m1000)
            m1000.aspirate(185, cells_m[i].bottom(dot_bottom))
            m1000.air_gap(10)
            m1000.dispense(m1000.current_volume, well.bottom(8))
            # Mix after transfer
            bead_mixing(well, m1000, 130, reps=5 if not dry_run else 1)
            m1000.air_gap(10)
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()
        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, bind_time, True)

        # Transfer from H-S plate to Magdeck plate
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magblock
        )

        for bindi in np.arange(
            settling_time, 0, -0.5
        ):  # Settling time delay with countdown timer
            protocol.delay(
                minutes=0.5,
                msg="There are " + str(bindi) + " minutes left in the incubation.",
            )

        # remove initial supernatant
        remove_supernatant(180)

    def wash(vol: float, source: List[Well]) -> None:
        """Wash Function."""
        global whichwash  # Defines which wash the protocol is on to log on the app
        protocol.comment("-----Now starting Wash #" + str(whichwash) + "-----")
        global wash_volume_tracker
        tiptrack(m1000)
        num_trans = math.ceil(vol / 180)
        vol_per_trans = vol / num_trans
        for i, m in enumerate(samples_m):
            src = source[whichwash]
            for n in range(num_trans):
                m1000.aspirate(vol_per_trans, src)
                m1000.air_gap(10)
                m1000.dispense(m1000.current_volume, m.top(-2))
                protocol.delay(seconds=2)
                m1000.blow_out(m.top(-2))
                wash_volume_tracker += vol_per_trans * 8
                if wash_volume_tracker > 9600:
                    whichwash += 1
                    src = source[whichwash]
                    protocol.comment(f"new wash source {whichwash}")
                    wash_volume_tracker = 0.0
            m1000.air_gap(10)
        m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        # Shake for 5 minutes to mix wash with beads
        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, wash_time, True)

        # Transfer from H-S plate to Magdeck plate
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magblock
        )

        for washi in np.arange(
            settling_time, 0, -0.5
        ):  # settling time timer for washes
            protocol.delay(
                minutes=0.5,
                msg="There are "
                + str(washi)
                + " minutes left in wash "
                + str(whichwash)
                + " incubation.",
            )

        remove_supernatant(vol)
        protocol.comment(f"final wash source {whichwash}")

    def dnase(vol: float, source: List[Well]) -> None:
        """Steps for DNAseI."""
        protocol.comment("-----DNAseI Steps Beginning-----")
        num_trans = math.ceil(vol / 180)
        vol_per_trans = vol / num_trans
        tiptrack(m1000)
        for i, m in enumerate(samples_m):
            src = source[i]
            m1000.flow_rate.aspirate = 10
            for n in range(num_trans):
                if m1000.current_volume > 0:
                    m1000.dispense(m1000.current_volume, src.top())
                m1000.aspirate(vol_per_trans, src.bottom(dot_bottom))
                m1000.dispense(vol_per_trans, m.top(-3))
            m1000.blow_out(m.top(-3))
            m1000.air_gap(20)

        m1000.flow_rate.aspirate = 300

        # Is this mixing needed? \/\/\/
        for i in range(num_cols):
            if i != 0:
                tiptrack(m1000)
            mixing(samples_m[i], m1000, 45, reps=5 if not dry_run else 1)
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        # Shake for 10 minutes to mix DNAseI
        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, dnase_time, True)

    def stop_reaction(vol: float, source: Well) -> None:
        """Adding stop solution."""
        protocol.comment("-----Adding Stop Solution-----")
        tiptrack(m1000)
        num_trans = math.ceil(vol / 180)
        vol_per_trans = vol / num_trans
        for i, m in enumerate(samples_m):
            src = source
            for n in range(num_trans):
                if m1000.current_volume > 0:
                    m1000.dispense(m1000.current_volume, src.top())
                m1000.transfer(vol_per_trans, src, m.top(), air_gap=20, new_tip="never")
            m1000.blow_out(m.top(-3))
            m1000.air_gap(20)

        m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        # Shake for 3 minutes to mix wash with beads
        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, stop_time, True)

        # Transfer from H-S plate to Magdeck plate
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magblock
        )

        for stop in np.arange(settling_time, 0, -0.5):
            protocol.delay(
                minutes=0.5,
                msg="There are " + str(stop) + " minutes left in this incubation.",
            )

        remove_supernatant(vol + 50)

    def elute(vol: float) -> None:
        """Elution."""
        protocol.comment("-----Elution Beginning-----")
        tiptrack(m1000)
        m1000.flow_rate.aspirate = 10
        for i, m in enumerate(samples_m):
            loc = m.top(-2)
            m1000.aspirate(vol, elution_solution[i])
            m1000.air_gap(10)
            m1000.dispense(m1000.current_volume, loc)
            m1000.blow_out(m.top(-3))
            m1000.air_gap(10)

        m1000.flow_rate.aspirate = 300

        # Is this mixing needed? \/\/\/
        for i in range(num_cols):
            if i != 0:
                tiptrack(m1000)
            for mixes in range(10):
                m1000.aspirate(elution_vol - 10, samples_m[i])
                m1000.dispense(elution_vol - 10, samples_m[i].bottom(10))
                if mixes == 9:
                    m1000.flow_rate.dispense = 20
                    m1000.aspirate(elution_vol - 10, samples_m[i])
                    m1000.dispense(elution_vol - 10, samples_m[i].bottom(10))
                    m1000.flow_rate.dispense = 300
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

        # Shake for 3 minutes to mix wash with beads
        helpers.set_hs_speed(protocol, h_s, heater_shaker_speed, elute_time, True)

        # Transfer from H-S plate to Magdeck plate
        helpers.move_labware_from_hs_to_destination(
            protocol, sample_plate, h_s, magblock
        )

        for elutei in np.arange(settling_time, 0, -0.5):
            protocol.delay(
                minutes=0.5,
                msg="Incubating on MagDeck for " + str(elutei) + " more minutes.",
            )

        protocol.comment("-----Trasnferring Sample to Elution Plate-----")
        for i, (m, e) in enumerate(zip(samples_m, elution_samples_m)):
            tiptrack(m1000)
            loc = m.bottom(dot_bottom)
            m1000.transfer(vol, loc, e.bottom(5), air_gap=20, new_tip="never")
            m1000.blow_out(e.top(-2))
            m1000.air_gap(20)
            m1000.drop_tip() if TIP_TRASH else m1000.return_tip()

    """
    Here is where you can call the methods defined above to fit your specific
    protocol. The normal sequence is:
    """
    if inc_lysis:
        lysis(lysis_vol, lysis_)
    bind()
    wash(wash_vol, all_washes)
    wash(wash_vol, all_washes)
    wash(wash_vol, all_washes)
    # dnase1 treatment
    dnase(dnase_vol, dnase1)
    stop_reaction(stop_vol, stopreaction)
    # Resume washes
    wash(wash_vol, all_washes)
    wash(wash_vol, all_washes)
    wash(wash_vol, all_washes)

    for beaddry in np.arange(drybeads, 0, -0.5):
        protocol.delay(
            minutes=0.5,
            msg="There are " + str(beaddry) + " minutes left in the drying step.",
        )
    elute(elution_vol)
    end_list_of_wells_to_probe = [waste_reservoir["A1"]]
    helpers.clean_up_plates(
        m1000, [elutionplate, sample_plate], waste_reservoir["A1"], 200
    )
    helpers.find_liquid_height_of_all_wells(protocol, m1000, end_list_of_wells_to_probe)
    if deactivate_modules_bool:
        helpers.deactivate_modules(protocol)
