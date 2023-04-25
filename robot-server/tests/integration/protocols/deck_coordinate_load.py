metadata = {
    "protocolName": "Deck Coordinate PAPIv2 Test",
}

requirements = {"robotType": "OT-2", "apiLevel": "2.14"}


def run(context):
    pipette = context.load_instrument("p1000_single_gen2", mount="left")
    labware = context.load_labware("armadillo_96_wellplate_200ul_pcr_full_skirt", "d3")
    module = context.load_module("temperatureModuleV2", "A1")

    pipette.move_to(labware.wells()[0].top())
    module.set_temperature(42)
