"""Plate Filler Protocol for HDQ DNA Bacteria Extraction."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)


metadata = {
    "protocolName": "PVT1ABR7 Liquids: HDQ DNA Bacteria Extraction",
    "author": "Rhyann Clarke <rhyann.clarke@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


def run(protocol: protocol_api.ProtocolContext) -> None:
    """Protocol."""
    # Deck Setup
    (
        source_reservoir,
        tip_rack,
        p1000,
    ) = load_common_liquid_setup_labware_and_instruments(protocol)

    sample_plate = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "C3", "Sample Plate"
    )
    elution_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "B3", "Elution Plate"
    )
    res1 = protocol.load_labware("nest_12_reservoir_15ml", "D2", "reagent reservoir 1")
    # Label Reservoirs
    well1 = res1["A1"].top()
    well2 = res1["A2"].top()
    well3 = res1["A3"].top()
    well4 = res1["A4"].top()
    well5 = res1["A5"].top()
    well6 = res1["A6"].top()
    well7 = res1["A7"].top()
    well8 = res1["A8"].top()
    well9 = res1["A9"].top()
    well10 = res1["A10"].top()
    well11 = res1["A11"].top()
    well12 = res1["A12"].top()
    # Volumes
    wash = 600
    binding = 320
    beads = 230
    pk = 230
    lysis = 230

    # Sample Plate
    p1000.transfer(
        volume=200,
        source=source_reservoir["A1"].bottom(z=0.5),
        dest=[
            sample_plate["A1"].top(),
            sample_plate["A2"].top(),
            sample_plate["A3"].top(),
            sample_plate["A4"].top(),
            sample_plate["A5"].top(),
            sample_plate["A6"].top(),
            sample_plate["A7"].top(),
            sample_plate["A8"].top(),
            sample_plate["A9"].top(),
            sample_plate["A10"].top(),
            sample_plate["A11"].top(),
            sample_plate["A12"].top(),
        ],
        blowout=True,
        blowout_location="source well",
        trash=False,
    )
    # Elution Plate
    p1000.transfer(
        volume=100,
        source=source_reservoir["A1"].bottom(z=0.5),
        dest=[
            elution_plate["A1"].top(),
            elution_plate["A2"].top(),
            elution_plate["A3"].top(),
            elution_plate["A4"].top(),
            elution_plate["A5"].top(),
            elution_plate["A6"].top(),
            elution_plate["A7"].top(),
            elution_plate["A8"].top(),
            elution_plate["A9"].top(),
            elution_plate["A10"].top(),
            elution_plate["A11"].top(),
            elution_plate["A12"].top(),
        ],
        blowout=True,
        blowout_location="source well",
        trash=False,
    )
    # Res 1
    p1000.transfer(
        volume=[
            binding,
            beads,
            binding,
            beads,
            lysis,
            pk,
            wash,
            wash,
            wash,
            wash,
            wash,
            wash,
            wash,
            wash,
            wash,
        ],
        source=source_reservoir["A1"].bottom(z=0.5),
        dest=[
            well1,
            well1,
            well2,
            well2,
            well3,
            well3,
            well4,
            well5,
            well6,
            well7,
            well8,
            well9,
            well10,
            well11,
            well12,
        ],
        blowout=True,
        blowout_location="source well",
        trash=False,
    )
