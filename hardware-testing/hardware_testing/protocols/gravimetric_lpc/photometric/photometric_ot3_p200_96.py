"""Gravimetric OT3 P200."""
from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_api._types import OffDeckType

metadata = {"protocolName": "photometric-ot3-p200-96"}
requirements = {"robotType": "Flex", "apiLevel": "2.15"}

SLOTS_TIPRACK = {
    50: [5, 6, 8, 9, 11],
    200: [5, 6, 8, 9, 11],
}
SLOT_PLATE = 3
SLOT_RESERVOIR = 2

RESERVOIR_LABWARE = "nest_1_reservoir_195ml"
PHOTOPLATE_LABWARE = "corning_96_wellplate_360ul_flat"


def run(ctx: ProtocolContext) -> None:
    """Run."""
    reservoir = ctx.load_labware(RESERVOIR_LABWARE, SLOT_RESERVOIR)
    plate = ctx.load_labware(PHOTOPLATE_LABWARE, SLOT_PLATE)
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
            pipette.aspirate(10, reservoir["A1"].top())
            pipette.dispense(10, plate["A1"].top())
            pipette.drop_tip(home_after=False)

        for rack in tipracks:
            ctx.move_labware(
                rack,
                new_location=OffDeckType.OFF_DECK,
                use_gripper=False,
            )
