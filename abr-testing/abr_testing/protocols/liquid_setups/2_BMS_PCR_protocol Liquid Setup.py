"""Plate Filler Protocol for Simple Normalize Long."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)


metadata = {
    "protocolName": "DVT1ABR2 Liquids: BMS PCR Protocol",
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
    pcr_plate_1 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C3", "PCR Plate 1"
    )
    snap_caps = protocol.load_labware(
        "opentrons_24_aluminumblock_nest_1.5ml_snapcap", "B3", "Snap Caps"
    )
    # Steps
    # Dispense into plate 1
    p1000.transfer(100, source_reservoir["A1"], pcr_plate_1.wells(), trash=False)

    # Dispense
    p1000.configure_nozzle_layout(protocol_api.SINGLE, start="H1", tip_racks=[tip_rack])
    p1000.transfer(1000, source_reservoir["A1"], snap_caps["B1"])
    p1000.transfer(1000, source_reservoir["A1"], snap_caps.rows()[0])
