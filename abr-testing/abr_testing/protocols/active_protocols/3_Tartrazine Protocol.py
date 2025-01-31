"""Tartrazine Protocol."""
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Well,
    InstrumentContext,
)
from abr_testing.protocols import helpers
from opentrons.protocol_api.module_contexts import (
    AbsorbanceReaderContext,
    HeaterShakerContext,
)
from datetime import datetime
from typing import Dict, List
import statistics

metadata = {
    "protocolName": "Tartrazine Protocol",
    "author": "Opentrons <protocols@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    parameters.add_int(
        variable_name="number_of_plates",
        display_name="Number of Plates",
        default=1,
        minimum=1,
        maximum=4,
    )
    helpers.create_channel_parameter(parameters)
    helpers.create_plate_reader_compatible_labware_parameter(parameters)


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    # Load parameters
    number_of_plates = protocol.params.number_of_plates  # type: ignore [attr-defined]
    channels = protocol.params.channels  # type: ignore [attr-defined]
    plate_type = protocol.params.labware_plate_reader_compatible  # type: ignore [attr-defined]

    helpers.comment_protocol_version(protocol, "01")
    # Plate Reader
    plate_reader: AbsorbanceReaderContext = protocol.load_module(
        helpers.abs_mod_str, "A3"
    )  # type: ignore[assignment]
    hs: HeaterShakerContext = protocol.load_module(helpers.hs_str, "A1")  # type: ignore[assignment]
    # Load Plates based off of number_of_plates parameter
    available_deck_slots = ["D1", "D2", "C1", "B1"]
    sample_plate_list = []
    for plate_num, slot in zip(range(number_of_plates), available_deck_slots):
        plate = protocol.load_labware(plate_type, slot, f"Sample Plate {plate_num + 1}")
        sample_plate_list.append(plate)
    available_tip_rack_slots = ["D3", "C3", "B3", "B2"]
    # LOAD PIPETTES AND TIP RACKS
    # 50 CHANNEL
    tip_racks_50 = []
    for plate_num, slot_2 in zip(range(number_of_plates), available_tip_rack_slots):
        tiprack_50 = protocol.load_labware("opentrons_flex_96_tiprack_50ul", slot_2)
        tip_racks_50.append(tiprack_50)
    p50 = protocol.load_instrument(
        f"flex_{channels}_50", "left", tip_racks=tip_racks_50
    )
    # 1000 CHANNEL
    tiprack_1000_1 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "A2")
    p1000 = protocol.load_instrument(
        f"flex_{channels}_1000", "right", tip_racks=[tiprack_1000_1]
    )
    # DETERMINE RESERVOIR BASED OFF # OF PIPETTE CHANNELS
    # 1 CHANNEL = TUBE RACK
    if p50.active_channels == 1:
        reservoir = protocol.load_labware(
            "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical", "C2", "Reservoir"
        )
        water_max_vol = reservoir["A3"].max_volume - 500
        reservoir_wells = reservoir.wells()[6:]  # Skip first 4 bc they are 15ml
    else:
        # 8 CHANNEL = 12 WELL RESERVOIR
        reservoir = protocol.load_labware("nest_12_reservoir_15ml", "C2", "Reservoir")
        water_max_vol = reservoir["A1"].max_volume - 500
        reservoir_wells = reservoir.wells()[
            1:
        ]  # Skip A1 as it's reserved for tartrazine

    # LABEL RESERVOIR WELLS AND DETERMINE NEEDED LIQUID
    tartrazine_well = reservoir["A1"]
    # NEEDED TARTRAZINE
    needed_tartrazine: float = (
        float(number_of_plates) * 96.0
    ) * 10.0 + 1000.0  # loading extra as a safety factor
    # NEEDED WATER
    needed_water: float = (
        float(number_of_plates) * 96.0 * 250
    )  # loading extra as a safety factor
    # CALCULATING NEEDED # OF WATER WELLS
    needed_wells = round(needed_water / water_max_vol)
    water_wells = []
    for i in range(needed_wells + 1):
        water_wells.append(reservoir_wells[i])

    def _mix_tartrazine(pipette: InstrumentContext, well_to_probe: Well) -> None:
        """Mix Tartrazine."""
        # Mix step is needed to ensure tartrazine does not settle between plates.
        pipette.pick_up_tip()
        top_of_tartrazine = helpers.find_liquid_height(pipette, well_to_probe)
        for i in range(20):
            p50.aspirate(1, well_to_probe.bottom(z=1))
            p50.dispense(1, well_to_probe.bottom(z=top_of_tartrazine + 1))
        pipette.return_tip()

    # LOAD LIQUIDS AND PROBE WELLS
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Tartrazine": [{"well": tartrazine_well, "volume": needed_tartrazine}],
        "Water": [{"well": water_wells, "volume": water_max_vol}],
    }
    helpers.find_liquid_height_of_loaded_liquids(protocol, liquid_vols_and_wells, p50)
    tip_count = 1 * p50.active_channels  # number of 50 ul tip uses.
    p50.reset_tipracks()
    i = 0
    all_percent_error_dict = {}
    cv_dict = {}
    vol = 0.0  # counter to track available water volume
    water_tip_count = 0 * p1000.active_channels  # number of 1000 ul tip uses
    well_num = 0  # index of well being used for water
    for sample_plate in sample_plate_list[:number_of_plates]:
        return_location = sample_plate.parent
        # Mix Tartrazine to ensure no settling as occurred
        _mix_tartrazine(p50, tartrazine_well)
        tip_count += 1 * p50.active_channels
        # Determine list of wells to probe
        if p50.active_channels == 1:
            well_list = sample_plate.wells()
        elif p50.active_channels == 8:
            well_list = sample_plate.rows()[0]
        for well in well_list:
            p1000.pick_up_tip()
            # Determine which water well to aspirate from.
            if vol < water_max_vol - 6000:
                well_of_choice = water_wells[well_num]
            else:
                well_num += 1
                well_of_choice = water_wells[well_num]
                vol = 0.0
            p50.pick_up_tip()
            p1000.aspirate(190, well_of_choice)
            p1000.air_gap(10)
            p1000.dispense(10, well.top())
            p1000.dispense(190, well)
            # Two blow outs ensures water is completely removed from pipette
            p1000.blow_out(well.top())
            protocol.delay(minutes=0.1)
            p1000.blow_out(well.top())
            vol += 190 * p1000.active_channels
            # Probe to find liquid height of tartrazine to ensure correct amount is aspirated
            height = helpers.find_liquid_height(p50, tartrazine_well)
            if height <= 0.0:
                # If a negative tartrazine height is found,
                # the protocol will pause, prompt a refill, and reprobe.
                protocol.pause("Fill tartrazine")
                height = helpers.find_liquid_height(p50, tartrazine_well)
            p50.aspirate(10, tartrazine_well.bottom(z=height), rate=0.15)
            p50.air_gap(5)
            p50.dispense(5, well.top())
            p50.dispense(10, well.bottom(z=0.5), rate=0.15)
            p50.blow_out()
            protocol.delay(minutes=0.1)
            p50.blow_out()
            p50.return_tip()
            tip_count += p50.active_channels
            if tip_count >= (96 * len(tip_racks_50)):
                p50.reset_tipracks()
                tip_count = 0
            p1000.return_tip()
            water_tip_count += p1000.active_channels
            if water_tip_count >= 96:
                p1000.reset_tipracks()
                water_tip_count = 0
        # Move labware to heater shaker to be mixed
        helpers.move_labware_to_hs(protocol, sample_plate, hs, hs)
        helpers.set_hs_speed(protocol, hs, 1500, 2.0, True)
        hs.open_labware_latch()
        # Initialize plate reader
        plate_reader.close_lid()
        plate_reader.initialize("single", [450])
        plate_reader.open_lid()
        # Move sample plate into plate reader
        protocol.move_labware(sample_plate, plate_reader, use_gripper=True)
        sample_plate_name = "sample plate_" + str(i + 1)
        csv_string = sample_plate_name + "_" + str(datetime.now())
        plate_reader.close_lid()
        result = plate_reader.read(csv_string)
        # Calculate CV and % error of expected value.
        for wavelength in result:
            dict_of_wells = result[wavelength]
            readings_and_wells = dict_of_wells.items()
            readings = dict_of_wells.values()
            avg = statistics.mean(readings)
            # Check if every average is within +/- 5% of 2.85
            percent_error_dict = {}
            percent_error_sum = 0.0
            for reading in readings_and_wells:
                well_name = str(reading[0])
                measurement = reading[1]
                percent_error = (measurement - 2.85) / 2.85 * 100
                percent_error_dict[well_name] = percent_error
                percent_error_sum += percent_error
            avg_percent_error = percent_error_sum / 96.0
            standard_deviation = statistics.stdev(readings)
            try:
                cv = standard_deviation / avg
            except ZeroDivisionError:
                cv = 0.0
            cv_percent = cv * 100
            cv_dict[sample_plate_name] = {
                "CV": cv_percent,
                "Mean": avg,
                "SD": standard_deviation,
                "Avg Percent Error": avg_percent_error,
            }
        # Move Plate back to original location
        all_percent_error_dict[sample_plate_name] = percent_error_dict
        plate_reader.open_lid()
        protocol.comment(
            f"------plate {sample_plate}. {cv_dict[sample_plate_name]}------"
        )
        protocol.move_labware(sample_plate, return_location, use_gripper=True)
        i += 1
    # Print percent error dictionary
    protocol.comment("Percent Error: " + str(all_percent_error_dict))
    # Print cv dictionary
    protocol.comment("Plate Reader Result: " + str(cv_dict))
