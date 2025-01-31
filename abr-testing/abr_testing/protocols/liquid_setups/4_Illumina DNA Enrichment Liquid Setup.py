"""Illumina DNA Enrichment Liquid Set up."""
from opentrons import protocol_api
from abr_testing.protocols.helpers import (
    load_common_liquid_setup_labware_and_instruments,
)

metadata = {
    "protocolName": "DVT1ABR4/8: Illumina DNA Enrichment Liquid Set Up",
    "author": "Tony Ngumah <tony.ngumah@opentrons.com>",
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

    reservoir_1 = protocol.load_labware(
        "nest_96_wellplate_2ml_deep", "D2", "Reservoir 1"
    )  # Reservoir
    sample_plate_2 = protocol.load_labware(
        "thermoscientificnunc_96_wellplate_1300ul", "D3", "Sample Plate 2"
    )  # Reservoir
    sample_plate_1 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C3", "Sample Plate 1"
    )  # Sample Plate
    reagent_plate_1 = protocol.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "B3", "Reagent Plate"
    )  # reagent Plate

    # Reagent Plate Prep: dispense liquid into columns 4 - 7 - total 156 ul
    p1000.transfer(
        volume=[75, 15, 20, 65],
        source=source_reservoir["A1"].bottom(z=0.5),
        dest=[
            reagent_plate_1["A4"],
            reagent_plate_1["A5"],
            reagent_plate_1["A6"],
            reagent_plate_1["A7"],
        ],
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )

    # Reservoir 1 Plate Prep: dispense liquid into columns 1, 2, 4, 5 total 1866 ul
    p1000.transfer(
        volume=[120, 750, 900, 96],
        source=source_reservoir["A1"],
        dest=[
            reservoir_1["A1"].top(),  # AMPure
            reservoir_1["A2"].top(),  # SMB
            reservoir_1["A4"].top(),  # EtOH
            reservoir_1["A5"].top(),  # RSB
        ],
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )

    # Reservoir 2 Plate Prep: dispense liquid into columns 1-9 total 3690 ul
    reservoir_2_wells = sample_plate_1.wells()
    list_of_locations = [well_location.top() for well_location in reservoir_2_wells]
    p1000.transfer(
        volume=[150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150],
        source=source_reservoir["A1"],
        dest=list_of_locations,
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )

    # Sample Plate Prep: total 303
    dest_list = [
        sample_plate_2["A9"],
        sample_plate_2["A10"],
        sample_plate_2["A11"],
        sample_plate_2["A12"],
    ]
    p1000.transfer(
        volume=[1000, 1000, 1000, 1000],
        source=source_reservoir["A1"],
        dest=dest_list,
        blow_out=True,
        blowout_location="source well",
        trash=False,
    )
