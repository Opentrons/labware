"""Plate Filler Protocol for 96ch Complex Protocol."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)

metadata = {
    "protocolName": "DVT2ABR5 Liquids: 96ch Complex Protocol",
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

    reservoir = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "D2", "Reservoir"
    )  # Reservoir

    vol = 1000

    column_list = [
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "A9",
        "A10",
        "A11",
        "A12",
    ]
    p1000.pick_up_tip()
    for i in column_list:
        p1000.aspirate(vol, source_reservoir["A1"].bottom(z=0.5))
        p1000.dispense(vol, reservoir[i].top())
        p1000.blow_out(location=source_reservoir["A1"].top())
    p1000.return_tip()
