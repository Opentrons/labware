"""KAPA HyperPlus Library Preparation Liquid Setup."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)


metadata = {
    "protocolName": "PVT1ABR12: KAPA HyperPlus Library Preparation Liquid Setup",
    "author": "Rhyann Clarke <rhyann.clarke@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


def run(protocol: protocol_api.ProtocolContext) -> None:
    """Protocol."""
    (
        source_reservoir,
        tip_rack,
        p1000,
    ) = load_common_liquid_setup_labware_and_instruments(protocol)

    reservoir = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "D2", "Beads + Buffer + Ethanol"
    )  # Reservoir
    temp_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt",
        "B3",
        "Temp Module Reservoir Plate",
    )
    sample_plate_1 = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "D3", "Sample Plate 1"
    )  # Sample Plate
    sample_plate_2 = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "C3", "Sample Plate 2"
    )  # Sample Plate

    # Sample Plate 1 Prep: dispense 17 ul into column 1 total 136 ul
    p1000.transfer(
        volume=[35, 35, 35, 35, 35, 35],
        source=source_reservoir["A1"].bottom(z=2),
        dest=[
            sample_plate_1["A1"].top(),
            sample_plate_1["A2"].top(),
            sample_plate_1["A3"].top(),
            sample_plate_1["A4"].top(),
            sample_plate_1["A5"].top(),
            sample_plate_1["A6"].top(),
        ],
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )

    # Sample Plate 2 Prep: dispense 17 ul into column 1 total 136 ul
    p1000.transfer(
        volume=[17, 17, 17, 17, 17, 17],
        source=source_reservoir["A1"].bottom(z=2),
        dest=[
            sample_plate_2["A1"].top(),
            sample_plate_2["A2"].top(),
            sample_plate_2["A3"].top(),
            sample_plate_2["A4"].top(),
            sample_plate_2["A5"].top(),
            sample_plate_2["A6"].top(),
        ],
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )

    # Reservoir Plate Prep:
    p1000.transfer(
        volume=[910.8, 297, 2000, 2000],
        source=source_reservoir["A1"].bottom(z=2),
        dest=[
            reservoir["A1"].top(),
            reservoir["A4"].top(),
            reservoir["A5"].top(),
            reservoir["A6"].top(),
        ],
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )

    # Temp Module Res Prep: dispense 30 and 200 ul into columns 1 and 3 - total 1840 ul
    # adapters

    # Rest of liquids
    p1000.transfer(
        volume=[10, 10, 10, 10, 10, 10, 61, 91.5, 200, 183],
        source=source_reservoir["A1"].bottom(z=2),
        dest=[
            temp_plate["A1"].top(),
            temp_plate["A2"].top(),
            temp_plate["A3"].top(),
            temp_plate["A4"].top(),
            temp_plate["A5"].top(),
            temp_plate["A6"].top(),
            temp_plate["A7"].top(),
            temp_plate["A8"].top(),
            temp_plate["A9"].top(),
            temp_plate["A10"].top(),
        ],
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
