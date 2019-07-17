from opentrons import types


def run(ctx):
    ctx.home()
    tr = ctx.load_labware_by_name('opentrons_96_tiprack_300ul', 1)
    right = ctx.load_instrument('p300_single', types.Mount.RIGHT, [tr])
    lw = ctx.load_labware_by_name('corning_96_wellplate_360ul_flat', 2)
    right.pick_up_tip()
    right.aspirate(10, lw.wells()[0].bottom())
    right.dispense(10, lw.wells()[1].bottom())
    right.drop_tip(tr.wells()[-1].top())
