"""Gravimetric OT3 P200."""
from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_api._types import OffDeckType

metadata = {"protocolName": "gravimetric-ot3-p200-96"}
requirements = {"robotType": "Flex", "apiLevel": "2.21"}

SLOT_SCALE = 4
SLOTS_TIPRACK = {
    # TODO: add slot 12 when tipracks are disposable
    50: [2, 3, 5, 6, 7, 8, 9, 10, 11],
    200: [2, 3, 5, 6, 7, 8, 9, 10, 11],
}
LABWARE_ON_SCALE = "nest_1_reservoir_195ml"


def run(ctx: ProtocolContext) -> None:
    """Run."""
    scale_labware = ctx.load_labware(LABWARE_ON_SCALE, SLOT_SCALE)
    pipette = ctx.load_instrument("flex_96channel_200", "left")
    adapters = [
        ctx.load_adapter("opentrons_flex_96_tiprack_adapter", slot)
        for slot in SLOTS_TIPRACK[50]
    ]
    for tip_size in SLOTS_TIPRACK.keys():
        tipracks = [
            adapter.load_labware(f"opentrons_flex_96_tiprack_{tip_size}uL")
            for adapter in adapters
        ]
        for rack in tipracks:
            pipette.pick_up_tip(rack)
            pipette.aspirate(10, scale_labware["A1"].top())
            pipette.dispense(10, scale_labware["A1"].top())
            pipette.drop_tip(home_after=False)

        for rack in tipracks:
            ctx.move_labware(
                rack,
                new_location=OffDeckType.OFF_DECK,
                use_gripper=False,
            )
