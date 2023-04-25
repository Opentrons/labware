"""Gravimetric OT3 P1000."""
from opentrons.protocol_api import ProtocolContext

metadata = {"protocolName": "gravimetric-ot3-p1000-multi-50ul-tip"}
# FIXME: bump to v2.14 to utilize protocol engine
requirements = {"robotType": "OT-3", "apiLevel": "2.13"}

SLOT_VIAL = 4
SLOTS_TIPRACK = {
    50: [2, 3, 5, 6, 7, 8, 9, 10, 11],
}


def run(ctx: ProtocolContext) -> None:
    """Run."""
    tipracks = [
        ctx.load_labware(f"opentrons_ot3_96_tiprack_{size}uL", slot)
        for size, slots in SLOTS_TIPRACK.items()
        for slot in slots
    ]
    vial = ctx.load_labware("radwag_pipette_calibration_vial", SLOT_VIAL)
    pipette = ctx.load_instrument("p1000_multi_gen3", "left")
    for rack in tipracks:
        pipette.pick_up_tip(rack["A1"])
        pipette.aspirate(pipette.min_volume, vial["A1"].top())
        pipette.dispense(pipette.min_volume, vial["A1"].top())
        pipette.drop_tip(home_after=False)
