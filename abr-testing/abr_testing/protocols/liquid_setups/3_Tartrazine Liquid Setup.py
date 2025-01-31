"""Plate Filler Protocol for Tartrazine Protocol."""
from opentrons import protocol_api
from abr_testing.protocols import helpers

metadata = {
    "protocolName": "DVT1ABR3 Liquids: Tartrazine Protocol",
    "author": "Rhyann clarke <rhyann.clarke@opentrons.com>",
    "source": "Protocol Library",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


def add_parameters(parameters: protocol_api.ParameterContext) -> None:
    """Add parameters."""
    parameters.add_int(
        variable_name="number_of_plates",
        display_name="Number of Plates",
        default=4,
        minimum=1,
        maximum=4,
    )
    helpers.create_channel_parameter(parameters)


def run(protocol: protocol_api.ProtocolContext) -> None:
    """Protocol."""
    number_of_plates = protocol.params.number_of_plates  # type: ignore [attr-defined]
    channels = protocol.params.channels  # type: ignore [attr-defined]
    # Initiate Labware
    (
        source_reservoir,
        tip_rack,
        p1000,
    ) = helpers.load_common_liquid_setup_labware_and_instruments(protocol)
    if channels == "1channel":
        reagent_tube = protocol.load_labware(
            "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical", "D3", "Reagent Tube"
        )
        p1000.configure_nozzle_layout(
            style=protocol_api.SINGLE, start="H1", tip_racks=[tip_rack]
        )
        # Transfer Liquid
        p1000.transfer(
            45000,
            source_reservoir["A1"],
            reagent_tube["B3"].top(),
            blowout=True,
            blowout_location="source well",
        )
        p1000.transfer(
            45000,
            source_reservoir["A1"],
            reagent_tube["A4"].top(),
            blowout=True,
            blowout_location="source well",
        )
    elif channels == "8channel":
        reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D3", "Reservoir")
        water_max_vol = reservoir["A1"].max_volume - 500
        reservoir_wells = reservoir.wells()[
            1:
        ]  # Skip A1 as it's reserved for tartrazine
        # NEEDED WATER
        needed_water: float = (
            float(number_of_plates) * 96.0 * 250.0
        )  # loading extra as a safety factor
        # CALCULATING NEEDED # OF WATER WELLS
        needed_wells = round(needed_water / water_max_vol)
        water_wells = []
        for i in range(needed_wells + 1):
            water_wells.append(reservoir_wells[i])
        # Create lists of volumes and source that matches wells to fill
        water_max_vol_list = [water_max_vol] * len(water_wells)
        source_list = [source_reservoir["A1"]] * len(water_wells)
        p1000.transfer(
            water_max_vol_list,
            source_list,
            water_wells,
            blowout=True,
            blowout_locaiton="source",
            trash=False,
        )
