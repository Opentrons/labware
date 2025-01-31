"""Plate Filler Protocol for Simple Normalize Long."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)

metadata = {
    "protocolName": "DVT1ABR1 Liquids: Simple Normalize Long",
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
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2", "Reservoir")
    # Transfer Liquid
    vol = 6175 / 8
    columns = ["A1", "A2", "A3", "A4", "A5"]
    for i in columns:
        p1000.transfer(
            vol,
            source=source_reservoir["A1"].bottom(z=2),
            dest=reservoir[i].top(),
            blowout=True,
            blowout_location="source well",
            trash=False,
        )
    p1000.transfer(
        8500 / 8,
        source=source_reservoir["A1"].bottom(z=2),
        dest=reservoir["A6"],
        blowout=True,
        blowout_location="source well",
        trash=False,
    )
