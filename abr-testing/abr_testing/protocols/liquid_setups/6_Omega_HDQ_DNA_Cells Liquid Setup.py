"""Plate Filler Protocol for Omega HDQ DNA Cell Protocol."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)

metadata = {
    "protocolName": "DVT2ABR6: Omega HDQ DNA Cells Protocol",
    "author": "Rhyann clarke <rhyann.clarke@opentrons.com>",
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
    deepwell_type = "nest_96_wellplate_2ml_deep"

    lysis_reservoir = protocol.load_labware(deepwell_type, "D2", "Lysis reservoir")
    bind_reservoir = protocol.load_labware(
        deepwell_type, "D3", "Beads and binding reservoir"
    )
    wash1_reservoir = protocol.load_labware(deepwell_type, "C3", "Wash 1 reservoir")
    wash2_reservoir = protocol.load_labware(deepwell_type, "B3", "Wash 2 reservoir")
    sample_plate = protocol.load_labware(deepwell_type, "B2", "Sample Plate")
    elution_plate = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "B1", "Elution Plate/ reservoir"
    )
    p1000.transfer(
        volume=350,
        source=source_reservoir["A1"].bottom(z=2),
        dest=lysis_reservoir.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
    p1000.transfer(
        440,
        source=source_reservoir["A1"].bottom(z=2),
        dest=bind_reservoir.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
    p1000.transfer(
        1300,
        source_reservoir["A1"].bottom(z=2),
        wash1_reservoir.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
    p1000.transfer(
        700,
        source_reservoir["A1"].bottom(z=2),
        wash2_reservoir.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
    p1000.transfer(
        180,
        source_reservoir["A1"].bottom(z=2),
        sample_plate.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
    p1000.transfer(
        100,
        source_reservoir["A1"].bottom(z=2),
        elution_plate.wells(),
        blow_out=True,
        blowout_location="source well",
        new_tip="once",
        trash=False,
    )
