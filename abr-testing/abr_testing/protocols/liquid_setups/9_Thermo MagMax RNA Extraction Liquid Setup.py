"""Plate Filler Protocol for Thermo MagMax RNA Extraction."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)


metadata = {
    "protocolName": "PVT1ABR9 Liquids: Thermo MagMax RNA Extraction",
    "author": "Rhyann Clarke <rhyann.clarke@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


def run(protocol: protocol_api.ProtocolContext) -> None:
    """Protocol."""
    # Initiate Labware
    (
        source_reservoir,
        tip_rack,
        p1000,
    ) = load_common_liquid_setup_labware_and_instruments(protocol)
    res1 = protocol.load_labware("nest_12_reservoir_15ml", "D2", "Reservoir")
    elution_plate = protocol.load_labware(
        "opentrons_96_wellplate_200ul_pcr_full_skirt", "C3", "Elution Plate"
    )
    sample_plate = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "B3", "Sample Plate"
    )

    # Volumes
    lysis = 8120 / 8
    stop_reaction_vol = 6400 / 8
    elution_vol = 55
    well4_12 = 9500 / 8
    sample_vol = 100

    # Reservoir
    p1000.transfer(
        volume=[
            lysis,
            lysis,
            stop_reaction_vol,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
            well4_12,
        ],
        source=source_reservoir["A1"].bottom(z=0.2),
        dest=[
            res1["A1"].top(),
            res1["A2"].top(),
            res1["A3"].top(),
            res1["A4"].top(),
            res1["A5"].top(),
            res1["A6"].top(),
            res1["A7"].top(),
            res1["A8"].top(),
            res1["A9"].top(),
            res1["A10"].top(),
            res1["A11"].top(),
            res1["A12"].top(),
        ],
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )
    # Elution Plate
    p1000.transfer(
        volume=[
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
            elution_vol,
        ],
        source=source_reservoir["A1"].bottom(z=0.2),
        dest=[
            elution_plate["A1"].bottom(z=0.3),
            elution_plate["A2"].bottom(z=0.3),
            elution_plate["A3"].bottom(z=0.3),
            elution_plate["A4"].bottom(z=0.3),
            elution_plate["A5"].bottom(z=0.3),
            elution_plate["A6"].bottom(z=0.3),
            elution_plate["A7"].bottom(z=0.3),
            elution_plate["A8"].bottom(z=0.3),
            elution_plate["A9"].bottom(z=0.3),
            elution_plate["A10"].bottom(z=0.3),
            elution_plate["A11"].bottom(z=0.3),
            elution_plate["A12"].bottom(z=0.3),
        ],
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )
    # Sample Plate
    p1000.transfer(
        volume=[
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
            sample_vol,
        ],
        source=source_reservoir["A1"].bottom(z=0.2),
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
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )
