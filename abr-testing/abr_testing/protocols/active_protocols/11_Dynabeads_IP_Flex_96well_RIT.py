"""Immunoprecipitation by Dynabeads."""
from opentrons.protocol_api import ProtocolContext, ParameterContext, Well, Labware
from opentrons.protocol_api.module_contexts import (
    HeaterShakerContext,
    TemperatureModuleContext,
    MagneticBlockContext,
)
from abr_testing.protocols import helpers
from typing import List, Dict, Union

metadata = {
    "protocolName": "Immunoprecipitation by Dynabeads - (Reagents in 15 mL tubes)",
    "author": "Boren Lin, Opentrons",
    "description": "Isolates protein from liquid samples using protein A /G coupled magnetic beads",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


def add_parameters(parameters: ParameterContext) -> None:
    """Define parameters."""
    helpers.create_hs_speed_parameter(parameters)
    helpers.create_two_pipette_mount_parameters(parameters)
    helpers.create_dot_bottom_parameter(parameters)
    helpers.create_deactivate_modules_parameter(parameters)


NUM_COL = 12

MAG_DELAY_MIN = 1

BEADS_VOL = 50
AB_VOL = 50
SAMPLE_VOL = 200
WASH_TIMES = 6
WASH_VOL = 200
ELUTION_VOL = 50

WASTE_VOL_MAX = 275000

READY_FOR_SDSPAGE = 0

waste_vol_chk = 0.0
waste_vol = 0.0

TIP_TRASH = False


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    # defining variables inside def run
    heater_shaker_speed = protocol.params.heater_shaker_speed  # type: ignore[attr-defined]
    ASP_HEIGHT = protocol.params.dot_bottom  # type: ignore[attr-defined]
    single_channel_mount = protocol.params.pipette_mount_1  # type: ignore[attr-defined]
    eight_channel_mount = protocol.params.pipette_mount_2  # type: ignore[attr-defined]
    deactivate_modules_bool = protocol.params.deactivate_modules  # type: ignore[attr-defined]
    helpers.comment_protocol_version(protocol, "01")

    MIX_SPEED = heater_shaker_speed
    MIX_SEC = 10

    # if on deck:
    INCUBATION_SPEED = heater_shaker_speed * 0.5
    INCUBATION_MIN = 60
    # load labware

    sample_plate_1 = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "B2", "sample plate 1"
    )
    sample_plate_2 = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "C4", "sample plate 2"
    )

    wash_res = protocol.load_labware("nest_12_reservoir_15ml", "B1", "wash")
    reagent_res = protocol.load_labware(
        "opentrons_15_tuberack_nest_15ml_conical", "C3", "reagents"
    )
    waste_res = protocol.load_labware("nest_1_reservoir_290ml", "D2", "Liquid Waste")

    tips = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "B3")
    tips_sample = protocol.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "A2", "sample tips"
    )
    tips_sample_loc = tips_sample.wells()[:95]
    if READY_FOR_SDSPAGE == 0:
        tips_elu = protocol.load_labware(
            "opentrons_flex_96_tiprack_1000ul", "A1", "elution tips"
        )
        tips_elu_loc = tips_elu.wells()[:95]
    tips_reused = protocol.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "C2", "reused tips"
    )
    tips_reused_loc = tips_reused.wells()[:95]
    p1000 = protocol.load_instrument(
        "flex_8channel_1000", eight_channel_mount, tip_racks=[tips]
    )
    p1000_single = protocol.load_instrument(
        "flex_1channel_1000", single_channel_mount, tip_racks=[tips]
    )
    h_s: HeaterShakerContext = protocol.load_module(
        helpers.hs_str, "D1"
    )  # type: ignore[assignment]
    working_plate, h_s_adapter = helpers.load_hs_adapter_and_labware(
        "nest_96_wellplate_2ml_deep", h_s, "Working Plate"
    )

    if READY_FOR_SDSPAGE == 0:
        temp: TemperatureModuleContext = protocol.load_module(
            helpers.temp_str, "D3"
        )  # type: ignore[assignment]
        final_plate, temp_adapter = helpers.load_temp_adapter_and_labware(
            "nest_96_wellplate_2ml_deep", temp, "Final Plate"
        )
    mag: MagneticBlockContext = protocol.load_module(
        helpers.mag_str, "C1"
    )  # type: ignore[assignment]

    # liquids
    samples1 = sample_plate_1.rows()[0][:NUM_COL]  # 1
    samples2 = sample_plate_2.rows()[0][:NUM_COL]  # 1
    beads = reagent_res.wells()[0]  # 2
    ab = reagent_res.wells()[1]  # 3
    elu = reagent_res.wells()[2]  # 4
    wash = wash_res.rows()[0][:NUM_COL]  # 5
    waste = waste_res.wells()[0]
    working_cols = working_plate.rows()[0][:NUM_COL]  # 6
    working_wells = working_plate.wells()[: NUM_COL * 8]  # 6
    if READY_FOR_SDSPAGE == 0:
        final_cols = final_plate.rows()[0][:NUM_COL]
    # Define Liquids
    liquid_vols_and_wells: Dict[
        str, List[Dict[str, Union[Well, List[Well], float]]]
    ] = {
        "Beads": [{"well": beads, "volume": 9800.0}],
        "AB": [{"well": ab, "volume": 9800.0}],
        "Elution": [{"well": elu, "volume": 9800.0}],
        "Wash": [{"well": wash, "volume": 1500.0}],
        "Samples 1": [{"well": samples1, "volume": 250.0}],
        "Samples 2": [{"well": samples2, "volume": 250.0}],
    }
    helpers.find_liquid_height_of_loaded_liquids(
        protocol, liquid_vols_and_wells, p1000_single
    )

    def transfer_plate_to_plate(
        vol1: float, start: List[Well], end: List[Well], liquid: int
    ) -> None:
        """Transfer from plate to plate."""
        for i in range(NUM_COL):
            if liquid == 1:
                p1000.pick_up_tip(tips_sample_loc[i * 8])
            else:
                p1000.pick_up_tip(tips_elu_loc[i * 8])
            start_loc = start[i]
            end_loc = end[i]
            p1000.aspirate(vol1, start_loc.bottom(z=ASP_HEIGHT), rate=2)
            p1000.air_gap(10)
            p1000.dispense(vol1 + 10, end_loc.bottom(z=15), rate=2)
            p1000.blow_out()
            p1000.touch_tip()
            p1000.return_tip() if not TIP_TRASH else p1000.drop_tip()

    def transfer_well_to_plate(
        vol2: float,
        start: Union[List[Well], Well],
        end: List[Well],
        liquid: int,
        drop_height: int = -20,
    ) -> None:
        """Transfer from well to plate."""
        if liquid == 5 and type(start) == List:
            p1000.pick_up_tip()
            for j in range(NUM_COL):
                start_loc = start[j]
                p1000.require_liquid_presence(start_loc)
                end_loc = end[j]
                p1000.aspirate(vol2, start_loc.bottom(z=ASP_HEIGHT), rate=2)
                p1000.air_gap(10)
                p1000.dispense(vol2 + 10, end_loc.top(z=drop_height), rate=2)
                p1000.blow_out()
            p1000.return_tip() if not TIP_TRASH else p1000.drop_tip()

        elif type(start) == Well:
            p1000_single.pick_up_tip()
            vol = vol2 * 8
            p1000_single.mix(5, vol * 0.75, start.bottom(z=ASP_HEIGHT * 5), rate=2)
            p1000_single.mix(5, vol * 0.75, start.bottom(z=ASP_HEIGHT * 20), rate=2)
            for j in range(NUM_COL):
                end_loc_gap = end[j * 8]
                if liquid == 2:
                    p1000_single.mix(
                        2, vol * 0.75, start.bottom(z=ASP_HEIGHT * 5), rate=2
                    )
                p1000_single.require_liquid_presence(start)
                p1000_single.aspirate(vol, start.bottom(z=ASP_HEIGHT * 5), rate=2)
                p1000_single.air_gap(10)
                p1000_single.dispense(10, end_loc_gap.top(z=-5))
                for jj in range(8):
                    end_loc = end[j * 8 + jj]
                    p1000_single.dispense(vol2, end_loc.bottom(z=10), rate=0.75)
                p1000_single.touch_tip()
            p1000_single.blow_out()
            p1000_single.return_tip() if not TIP_TRASH else p1000.drop_tip()

    def discard(vol3: float, start: List[Well]) -> None:
        """Discard function."""
        global waste_vol
        global waste_vol_chk
        waste_vol = 0.0
        for k in range(NUM_COL):
            p1000.pick_up_tip(tips_reused_loc[k * 8])
            start_loc = start[k]
            end_loc = waste
            p1000.aspirate(vol3, start_loc.bottom(z=ASP_HEIGHT), rate=0.3)
            p1000.air_gap(10)
            p1000.dispense(vol3 + 10, end_loc.top(z=-5), rate=2)
            p1000.blow_out()
            p1000.return_tip()
        waste_vol = vol3 * NUM_COL * 8.0
        waste_vol_chk = waste_vol_chk + waste_vol

    # protocol
    def run(sample_plate: Labware) -> None:
        """Protocol."""
        # Add beads, samples and antibody solution
        samples = sample_plate.rows()[0][:NUM_COL]  # 1
        h_s.close_labware_latch()
        transfer_well_to_plate(BEADS_VOL, beads, working_wells, 2)

        helpers.move_labware_from_hs_to_destination(protocol, working_plate, h_s, mag)

        protocol.delay(minutes=MAG_DELAY_MIN)
        discard(BEADS_VOL * 1.1, working_cols)

        helpers.move_labware_to_hs(protocol, working_plate, h_s, h_s_adapter)

        transfer_plate_to_plate(SAMPLE_VOL, samples, working_cols, 1)
        transfer_well_to_plate(AB_VOL, ab, working_wells, 3)

        h_s.set_and_wait_for_shake_speed(rpm=MIX_SPEED)
        protocol.delay(seconds=MIX_SEC)

        h_s.set_and_wait_for_shake_speed(rpm=INCUBATION_SPEED)
        protocol.delay(seconds=INCUBATION_MIN * 60)
        h_s.deactivate_shaker()

        helpers.move_labware_from_hs_to_destination(protocol, working_plate, h_s, mag)

        protocol.delay(minutes=MAG_DELAY_MIN)
        vol_total = SAMPLE_VOL + AB_VOL
        discard(vol_total * 1.1, working_cols)

        # Wash
        for _ in range(WASH_TIMES):
            helpers.move_labware_to_hs(protocol, working_plate, h_s, h_s_adapter)

            transfer_well_to_plate(WASH_VOL, wash, working_cols, 5)
            helpers.set_hs_speed(protocol, h_s, MIX_SPEED, MIX_SEC / 60, True)
            helpers.move_labware_from_hs_to_destination(
                protocol, working_plate, h_s, mag
            )
            protocol.delay(minutes=MAG_DELAY_MIN)
            discard(WASH_VOL * 1.1, working_cols)
        # Elution
        helpers.move_labware_to_hs(protocol, working_plate, h_s, h_s_adapter)
        transfer_well_to_plate(ELUTION_VOL, elu, working_wells, 4)
        if READY_FOR_SDSPAGE == 1:
            protocol.pause("Seal the Working Plate")
            h_s.set_and_wait_for_temperature(70)
            helpers.set_hs_speed(protocol, h_s, MIX_SPEED, (MIX_SEC / 60) + 10, True)
            h_s.deactivate_heater()
            h_s.open_labware_latch()
            protocol.pause("Protocol Complete")
        elif READY_FOR_SDSPAGE == 0:
            helpers.set_hs_speed(protocol, h_s, MIX_SPEED, (MIX_SEC / 60) + 2, True)

            temp.set_temperature(4)
            helpers.move_labware_from_hs_to_destination(
                protocol, working_plate, h_s, mag
            )
            protocol.delay(minutes=MAG_DELAY_MIN)
            transfer_plate_to_plate(ELUTION_VOL * 1.1, working_cols, final_cols, 6)
            temp.deactivate()
        helpers.clean_up_plates(p1000_single, [sample_plate], waste, 1000)
        helpers.move_labware_to_hs(protocol, working_plate, h_s, h_s_adapter)

    run(sample_plate_1)
    # swap plates
    protocol.move_labware(sample_plate_1, "B4", True)
    protocol.move_labware(sample_plate_2, "B2", True)
    run(sample_plate_2)

    helpers.clean_up_plates(p1000_single, [wash_res], waste, 1000)
    helpers.find_liquid_height_of_all_wells(protocol, p1000_single, [waste_res["A1"]])
    if deactivate_modules_bool:
        helpers.deactivate_modules(protocol)
