"""Simple Normalize Long with LPD and Single Tip."""
from opentrons.protocol_api import (
    ProtocolContext,
    ParameterContext,
    Labware,
    SINGLE,
    ALL,
    InstrumentContext,
    Well,
)
from abr_testing.protocols import helpers
from typing import List, Dict

metadata = {
    "protocolName": "Simple Normalize Long with LPD and Single Tip",
    "author": "Opentrons <protocols@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {"robotType": "Flex", "apiLevel": "2.21"}


def add_parameters(parameters: ParameterContext) -> None:
    """Parameters."""
    helpers.create_single_pipette_mount_parameter(parameters)
    helpers.create_csv_parameter(parameters)
    helpers.create_dot_bottom_parameter(parameters)


def get_next_tip_by_row(tip_rack: Labware, pipette: InstrumentContext) -> Well | None:
    """Get next tip by row.

    This function returns the well name of the next tip to pick up for a given
    tiprack with row-bias. Returns None if the pipette is out of tips
    """
    if tip_rack.is_tiprack:
        if pipette.channels == 8:
            for passes in range(
                0, int(len(tip_rack.columns()[0]) / pipette.active_channels)
            ):
                for column in tip_rack.columns():
                    # When the pipette's starting channels is H1, consume tips starting at top row.
                    if pipette._core.get_nozzle_map().starting_nozzle == "H1":
                        active_column = column
                    else:
                        # We reverse our tiprack reference to consume tips starting at bottom.
                        active_column = column[::-1]

                    if len(active_column) >= (
                        ((pipette.active_channels * passes) + pipette.active_channels)
                    ) and all(
                        well.has_tip is True
                        for well in active_column[
                            (pipette.active_channels * passes) : (
                                (
                                    (pipette.active_channels * passes)
                                    + pipette.active_channels
                                )
                            )
                        ]
                    ):
                        return active_column[
                            (
                                (pipette.active_channels * passes)
                                + (pipette.active_channels - 1)
                            )
                        ]
            # No valid tips were found for current pipette configuration in provided tip rack.
            return None
        else:
            raise ValueError(
                "Parameter 'pipette' of get_next_tip_by_row must be an 8 Channel Pipette."
            )
    else:
        raise ValueError(
            "Parameter 'tip_rack' of get_next_tip_by_row must be a recognized Tip Rack labware."
        )


def run(protocol: ProtocolContext) -> None:
    """Protocol."""
    dot_bottom = protocol.params.dot_bottom  # type: ignore[attr-defined]
    mount_pos = protocol.params.pipette_mount  # type: ignore[attr-defined]
    all_data = protocol.params.parameters_csv.parse_as_csv()  # type: ignore[attr-defined]
    data = all_data[1:]
    helpers.comment_protocol_version(protocol, "01")
    # DECK SETUP AND LABWARE
    protocol.comment("THIS IS A NO MODULE RUN")
    tiprack_x_1 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
    tiprack_x_2 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D2")
    tiprack_x_3 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "A1")
    sample_plate_1 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "D3"
    )

    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "B3")
    waste_reservoir = protocol.load_labware(
        "nest_1_reservoir_195ml", "C1", "Liquid Waste"
    )
    sample_plate_2 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )
    sample_plate_3 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "B2"
    )
    sample_plate_4 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "A2"
    )
    protocol.load_trash_bin("A3")

    # reagentg146
    Dye_1 = reservoir["A1"]
    Dye_2 = reservoir["A2"]
    Dye_3 = reservoir["A3"]
    Diluent_1 = reservoir["A4"]
    Diluent_2 = reservoir["A5"]
    Diluent_3 = reservoir["A6"]

    # pipette
    p1000 = protocol.load_instrument(
        "flex_8channel_1000", mount_pos, liquid_presence_detection=True
    )
    p1000_single = protocol.load_instrument(
        "flex_1channel_1000",
        "right",
        liquid_presence_detection=True,
        tip_racks=[tiprack_x_2, tiprack_x_3],
    )
    # LOAD LIQUIDS
    liquid_volumes = [675.0, 675.0, 675.0, 675.0, 675.0]
    wells = [Dye_1, Dye_2, Dye_3, Diluent_1, Diluent_2, Diluent_3]
    helpers.load_wells_with_water(protocol, wells, liquid_volumes)
    liquid_vols_and_wells: Dict[str, List[Dict[str, Well | List[Well] | float]]] = {
        "Dye": [{"well": [Dye_1, Dye_2, Dye_3], "volume": 675.0}],
        "Diluent": [{"well": [Diluent_1, Diluent_2, Diluent_3], "volume": 675.0}],
    }
    current_rack = tiprack_x_1
    # CONFIGURE SINGLE LAYOUT
    p1000.configure_nozzle_layout(style=SINGLE, start="H1", tip_racks=[tiprack_x_1])
    helpers.find_liquid_height_of_loaded_liquids(
        protocol, liquid_vols_and_wells, p1000_single
    )

    for X in range(1):
        protocol.comment("==============================================")
        protocol.comment("Adding Dye Sample Plate 1")
        protocol.comment("==============================================")

        current = 0

        well = get_next_tip_by_row(current_rack, p1000)
        p1000.pick_up_tip(well)
        while current < len(data):
            CurrentWell = str(data[current][0])
            DyeVol = float(data[current][1])
            if DyeVol != 0 and DyeVol < 100:
                p1000.liquid_presence_detection = False
                p1000.transfer(
                    DyeVol,
                    Dye_1.bottom(z=2),
                    sample_plate_1.wells_by_name()[CurrentWell].top(z=1),
                    new_tip="never",
                )
                if DyeVol > 20:
                    wells.append(sample_plate_1.wells_by_name()[CurrentWell])
            current += 1
        p1000.blow_out(location=waste_reservoir["A1"])
        p1000.touch_tip()
        p1000.drop_tip()
        p1000.liquid_presence_detection = True

        protocol.comment("==============================================")
        protocol.comment("Adding Diluent Sample Plate 1")
        protocol.comment("==============================================")

        current = 0
        while current < len(data):
            CurrentWell = str(data[current][0])
            DilutionVol = float(data[current][2])
            if DilutionVol != 0 and DilutionVol < 100:
                well = get_next_tip_by_row(current_rack, p1000)
                p1000.pick_up_tip(well)
                p1000.aspirate(DilutionVol, Diluent_1.bottom(z=dot_bottom))
                p1000.dispense(
                    DilutionVol, sample_plate_1.wells_by_name()[CurrentWell].top(z=0.2)
                )
                if DilutionVol > 20:
                    wells.append(sample_plate_1.wells_by_name()[CurrentWell])
                p1000.blow_out(location=waste_reservoir["A1"])
                p1000.touch_tip()
                p1000.drop_tip()
            current += 1

        protocol.comment("Changing pipette configuration to 8ch.")

        protocol.comment("==============================================")
        protocol.comment("Adding Dye Sample Plate 2")
        protocol.comment("==============================================")
        current = 0
        p1000_single.pick_up_tip()
        while current < len(data):
            CurrentWell = str(data[current][0])
            DyeVol = float(data[current][1])
            if DyeVol != 0 and DyeVol < 100:
                p1000_single.transfer(
                    DyeVol,
                    Dye_2.bottom(z=2),
                    sample_plate_2.wells_by_name()[CurrentWell].top(z=1),
                    new_tip="never",
                )
                if DyeVol > 20:
                    wells.append(sample_plate_2.wells_by_name()[CurrentWell])
            current += 1
        p1000_single.blow_out(location=waste_reservoir["A1"])
        p1000_single.touch_tip()
        p1000_single.return_tip()

        protocol.comment("==============================================")
        protocol.comment("Adding Diluent Sample Plate 2")
        protocol.comment("==============================================")

        current = 0
        while current < len(data):
            CurrentWell = str(data[current][0])
            DilutionVol = float(data[current][2])
            if DilutionVol != 0 and DilutionVol < 100:
                p1000_single.pick_up_tip()
                p1000_single.aspirate(DilutionVol, Diluent_2.bottom(z=dot_bottom))
                p1000_single.dispense(
                    DilutionVol, sample_plate_2.wells_by_name()[CurrentWell].top(z=0.2)
                )
                if DilutionVol > 20:
                    wells.append(sample_plate_2.wells_by_name()[CurrentWell])
                p1000_single.blow_out(location=waste_reservoir["A1"])
                p1000_single.touch_tip()
                p1000_single.return_tip()
            current += 1

        protocol.comment("==============================================")
        protocol.comment("Adding Dye Sample Plate 3")
        protocol.comment("==============================================")

        current = 0
        p1000_single.pick_up_tip()
        while current < len(data):
            CurrentWell = str(data[current][0])
            DyeVol = float(data[current][1])
            if DyeVol != 0 and DyeVol < 100:
                p1000_single.liquid_presence_detection = False
                p1000_single.transfer(
                    DyeVol,
                    Dye_3.bottom(z=2),
                    sample_plate_3.wells_by_name()[CurrentWell].top(z=1),
                    blow_out=True,
                    blowout_location="destination well",
                    new_tip="never",
                )
                if DyeVol > 20:
                    wells.append(sample_plate_3.wells_by_name()[CurrentWell])
            current += 1
        p1000_single.liquid_presence_detection = True
        p1000_single.blow_out(location=waste_reservoir["A1"])
        p1000_single.touch_tip()
        p1000_single.return_tip()
        protocol.comment("==============================================")
        protocol.comment("Adding Diluent Sample Plate 3")
        protocol.comment("==============================================")
        current = 0
        while current < len(data):
            CurrentWell = str(data[current][0])
            DilutionVol = float(data[current][2])
            if DilutionVol != 0 and DilutionVol < 100:
                p1000_single.pick_up_tip()
                p1000_single.aspirate(DilutionVol, Diluent_3.bottom(z=dot_bottom))
                p1000_single.dispense(
                    DilutionVol, sample_plate_3.wells_by_name()[CurrentWell].top(z=0.2)
                )
                if DilutionVol > 20:
                    wells.append(sample_plate_3.wells_by_name()[CurrentWell])
                p1000_single.blow_out(location=waste_reservoir["A1"])
                p1000_single.touch_tip()
                p1000_single.return_tip()
            current += 1

        protocol.comment("==============================================")
        protocol.comment("Adding Dye Sample Plate 4")
        protocol.comment("==============================================")
        p1000_single.reset_tipracks()
        current = 0
        p1000_single.pick_up_tip()
        while current < len(data):
            CurrentWell = str(data[current][0])
            DyeVol = float(data[current][1])
            if DyeVol != 0 and DyeVol < 100:
                p1000_single.liquid_presence_detection = False
                p1000_single.transfer(
                    DyeVol,
                    Dye_3.bottom(z=2),
                    sample_plate_4.wells_by_name()[CurrentWell].top(z=1),
                    blow_out=True,
                    blowout_location="destination well",
                    new_tip="never",
                )
                if DyeVol > 20:
                    wells.append(sample_plate_4.wells_by_name()[CurrentWell])
            current += 1
        p1000_single.liquid_presence_detection = True
        p1000_single.blow_out(location=waste_reservoir["A1"])
        p1000_single.touch_tip()
        p1000_single.return_tip()
        protocol.comment("==============================================")
        protocol.comment("Adding Diluent Sample Plate 4")
        protocol.comment("==============================================")
        current = 0
        while current < len(data):
            CurrentWell = str(data[current][0])
            DilutionVol = float(data[current][2])
            if DilutionVol != 0 and DilutionVol < 100:
                p1000_single.pick_up_tip()
                p1000_single.aspirate(DilutionVol, Diluent_3.bottom(z=dot_bottom))
                p1000_single.dispense(
                    DilutionVol, sample_plate_4.wells_by_name()[CurrentWell].top(z=0.2)
                )
                if DilutionVol > 20:
                    wells.append(sample_plate_4.wells_by_name()[CurrentWell])
                p1000_single.blow_out(location=waste_reservoir["A1"])
                p1000_single.touch_tip()
                p1000_single.return_tip()
            current += 1

        current = 0
    # Probe heights
    p1000.configure_nozzle_layout(style=ALL, tip_racks=[tiprack_x_3])
    helpers.clean_up_plates(
        p1000,
        [sample_plate_1, sample_plate_2, sample_plate_3, sample_plate_4],
        waste_reservoir["A1"],
        200,
    )
    helpers.find_liquid_height_of_all_wells(
        protocol, p1000_single, [waste_reservoir["A1"]]
    )
