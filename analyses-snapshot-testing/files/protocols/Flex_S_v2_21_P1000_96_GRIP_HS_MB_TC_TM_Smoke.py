#############
# CHANGELOG #
#############

# ----
# 2.21
# ----

# - - Run protocols that use the Absorbance Plate Reader and check the status of the module on the robot details screen for your Flex.
# - - Run protocols that use the new Opentrons Tough PCR Auto-Sealing Lid with the Thermocycler Module GEN2. Stacks of these lids appear in a consolidated view when setting up labware.
# - - Error recovery now works in more situations and has more options - Gripper Errors, Drop Tip Errors, additional recovery options for tip errors,  disable error recovery entirely (8.2.0)

# ----
# 2.20
# ----

# - configure_nozzle_layout() now accepts row, single, and partial column layout constants. See Partial Tip Pickup.
# - You can now call ProtocolContext.define_liquid() without supplying a description or display_color.
# - You can now call ProtocolContext.liquid_presence_detection() or ProtocolContext.require_liquid_presence() to use LLD on instrument context or on well
# - You now have the option to set RTP using CSV files
# - Error Recovery will now initiate for miss tip pick up, overpressure on aspirate and dispense, and if liquid presence isn't detected (8.0.0)

# ----
# 2.19
# ----

# - NO FEATURES OR API CHANGES
# - New values for how much a tip overlaps with the pipette nozzle when the pipette picks up tips

# ----
# 2.18
# ----

# - labware.set_offset
# - Runtime Parameters added
# - TrashContainer.top() and Well.top() now return objects of the same type
# - pipette.drop_tip() if location argument not specified the tips will be dropped at different locations in the bin
# - pipette.drop_tip() if location is specified, the tips will be dropped in the same place every time

# ----
# 2.17
# ----

# NOTHING NEW
# This protocol is exactly the same as 2.16 Smoke Test V3
# The only difference is the API version in the metadata
# There were no new positive test cases for 2.17
# The negative test cases are captured in the 2.17 dispense changes protocol

# ----
# 2.16
# ----

# - prepare_to_aspirate added
# - fixed_trash property changed
# - instrument_context.trash_container property changed

# ----
# 2.15
# ----

# - move_labware added - Manual Deck State Modification
# - ProtocolContext.load_adapter added
# - OFF_DECK location added

from typing import List
from opentrons import protocol_api, types
from opentrons.protocol_api import Labware


metadata = {
    "protocolName": "Flex Smoke Test - v2.21",
    "author": "QA team",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.21",
}


#################
### CONSTANTS ###
#################

DeckSlots = [
    "A1",
    "A2",
    "A3",
    "A4",
    "B1",
    "B2",
    "B3",
    "B4",
    "C1",
    "C2",
    "C3",
    "C4",
    "D1",
    "D2",
    "D3",
    "D4",
]

HEATER_SHAKER_ADAPTER_NAME = "opentrons_96_pcr_adapter"
HEATER_SHAKER_NAME = "heaterShakerModuleV1"
MAGNETIC_BLOCK_NAME = "magneticBlockV1"
TEMPERATURE_MODULE_ADAPTER_NAME = "opentrons_96_well_aluminum_block"
TEMPERATURE_MODULE_NAME = "temperature module gen2"
THERMOCYCLER_NAME = "thermocycler module gen2"
ABSORBANCE_READER = "absorbanceReaderV1"
DECK_RISER_NAME = "opentrons_flex_deck_riser"
TC_LID = "opentrons_tough_pcr_auto_sealing_lid"
LID_COUNT = 5
TIPRACK_96_ADAPTER_NAME = "opentrons_flex_96_tiprack_adapter"
TIPRACK_96_NAME = "opentrons_flex_96_tiprack_1000ul"
PIPETTE_96_CHANNEL_NAME = "flex_96channel_1000"
WELL_PLATE_STARTING_POSITION = "C2"
RESERVOIR_STARTING_POSITION = "D2"


def comment_tip_rack_status(ctx, tip_rack):
    """
    Print out the tip status for each row in a tip rack.
    Each row (A-H) will print the well statuses for columns 1-12 in a single comment,
    with a '🟢' for present tips and a '❌' for missing tips.
    """
    range_A_to_H = [chr(i) for i in range(ord("A"), ord("H") + 1)]
    range_1_to_12 = range(1, 13)

    ctx.comment(f"Tip rack in {tip_rack.parent}")

    for row in range_A_to_H:
        status_line = f"{row}: "
        for col in range_1_to_12:
            well = f"{row}{col}"
            has_tip = tip_rack.wells_by_name()[well].has_tip
            status_emoji = "🟢" if has_tip else "❌"
            status_line += f"{well} {status_emoji}  "

        # Print the full status line for the row
        ctx.comment(status_line)


##############################
# Runtime Parameters Support #
##############################

# -------------------------- #
# Added in API version: 2.18 #
# -------------------------- #


def add_parameters(parameters: protocol_api.Parameters):
    """This is the standard use of parameters"""

    # We are using the defaults for every case.
    # Other tests cover regression testing for
    # other types of parameters and UI appearance
    # there are many tests in Analyses Battery that cover errors and edge cases

    parameters.add_str(
        variable_name="test_configuration",
        display_name="Test Configuration",
        description="Configuration of QA test to perform",
        default="full",
        choices=[{"display_name": "Full Smoke Test", "value": "full"}],
    )

    parameters.add_str(
        variable_name="reservoir_name",
        display_name="Reservoir Name",
        description="Name of the reservoir",
        default="nest_1_reservoir_290ml",
        choices=[{"display_name": "Nest 1 Well 290 mL", "value": "nest_1_reservoir_290ml"}],
    )

    parameters.add_str(
        variable_name="well_plate_name",
        display_name="Well Plate Name",
        description="Name of the well plate",
        default="opentrons_96_wellplate_200ul_pcr_full_skirt",
        choices=[{"display_name": "Opentrons Tough 96 Well 200 µL", "value": "opentrons_96_wellplate_200ul_pcr_full_skirt"}],
    )


def log_position(ctx, item):
    ctx.comment(f"Item {item.load_name} is at {item.parent}")


def run(ctx: protocol_api.ProtocolContext) -> None:

    ################
    ### FIXTURES ###
    ################

    waste_chute = ctx.load_waste_chute()

    ###############
    ### MODULES ###
    ###############
    deck_riser_adapter = ctx.load_adapter(DECK_RISER_NAME, "A4")
    thermocycler = ctx.load_module(THERMOCYCLER_NAME)  # A1 & B1
    magnetic_block = ctx.load_module(MAGNETIC_BLOCK_NAME, "A3")
    heater_shaker = ctx.load_module(HEATER_SHAKER_NAME, "C1")
    temperature_module = ctx.load_module(TEMPERATURE_MODULE_NAME, "D1")
    absorbance_module = ctx.load_module(ABSORBANCE_READER, "B3")

    lids: List[Labware] = [deck_riser_adapter.load_labware(TC_LID)]
    for i in range(LID_COUNT - 1):
        lids.append(lids[-1].load_labware(TC_LID))
    lids.reverse()

    thermocycler.open_lid()
    heater_shaker.open_labware_latch()
    absorbance_module.close_lid()
    absorbance_module.initialize("single", [600], 450)
    absorbance_module.open_lid()

    #######################
    ### MODULE ADAPTERS ###
    #######################

    temperature_module_adapter = temperature_module.load_adapter(TEMPERATURE_MODULE_ADAPTER_NAME)
    heater_shaker_adapter = heater_shaker.load_adapter(HEATER_SHAKER_ADAPTER_NAME)
    adapters = [temperature_module_adapter, heater_shaker_adapter]

    ###############
    ### LABWARE ###
    ###############

    # Load these directly with the RTP
    source_reservoir = ctx.load_labware(ctx.params.reservoir_name, RESERVOIR_STARTING_POSITION)
    dest_pcr_plate = ctx.load_labware(ctx.params.well_plate_name, WELL_PLATE_STARTING_POSITION)

    tip_rack_1 = ctx.load_labware(TIPRACK_96_NAME, "A2", adapter=TIPRACK_96_ADAPTER_NAME)
    tip_rack_adapter = tip_rack_1.parent

    tip_rack_2 = ctx.load_labware(TIPRACK_96_NAME, "C3")
    tip_rack_3 = ctx.load_labware(TIPRACK_96_NAME, "C4")
    tip_rack_5 = ctx.load_labware(TIPRACK_96_NAME, protocol_api.OFF_DECK)

    tip_racks = [tip_rack_1, tip_rack_2, tip_rack_3]

    ##########################
    ### PIPETTE DEFINITION ###
    ##########################

    pipette_96_channel = ctx.load_instrument(PIPETTE_96_CHANNEL_NAME, mount="left", tip_racks=tip_racks, liquid_presence_detection=True)
    pipette_96_channel.trash_container = waste_chute

    assert isinstance(pipette_96_channel.trash_container, protocol_api.WasteChute)

    ########################
    ### LOAD SOME LIQUID ###
    ########################

    water = ctx.define_liquid(name="water", description="High Quality H₂O", display_color="#42AB2D")
    source_reservoir.wells_by_name()["A1"].load_liquid(liquid=water, volume=29000)

    ################################
    ### GRIPPER LABWARE MOVEMENT ###
    ################################

    log_position(ctx, dest_pcr_plate)
    ctx.move_labware(dest_pcr_plate, thermocycler, use_gripper=True)
    log_position(ctx, dest_pcr_plate)
    # Move it back to the deck
    ctx.move_labware(dest_pcr_plate, "C2", use_gripper=True)
    log_position(ctx, dest_pcr_plate)

    # Other important moves?

    # manual move
    log_position(ctx, source_reservoir)
    ctx.move_labware(source_reservoir, "D4", use_gripper=False)
    log_position(ctx, source_reservoir)
    ctx.move_labware(source_reservoir, RESERVOIR_STARTING_POSITION, use_gripper=True)
    log_position(ctx, source_reservoir)

    # Other important manual moves?

    # 96 channel column pickup
    pipette_96_channel.configure_nozzle_layout(style=protocol_api.COLUMN, start="A12")
    pipette_96_channel.pick_up_tip(tip_rack_2["A1"])
    comment_tip_rack_status(ctx, tip_rack_2)
    pipette_96_channel.aspirate(5, source_reservoir["A1"])
    pipette_96_channel.touch_tip()
    pipette_96_channel.dispense(5, dest_pcr_plate[f"A1"])
    pipette_96_channel.drop_tip(waste_chute)

    # 96 channel single pickup
    pipette_96_channel.configure_nozzle_layout(style=protocol_api.SINGLE, start="H12")
    pipette_96_channel.pick_up_tip(tip_rack_2)
    pipette_96_channel.aspirate(5, source_reservoir["A1"])
    pipette_96_channel.touch_tip()
    pipette_96_channel.dispense(5, source_reservoir["A1"])
    pipette_96_channel.aspirate(500, source_reservoir["A1"])
    pipette_96_channel.dispense(500, source_reservoir["A1"])
    pipette_96_channel.drop_tip(waste_chute)
    comment_tip_rack_status(ctx, tip_rack_2)

    # put the tip rack in the trash
    # since it cannot have a row pickup
    ctx.move_labware(tip_rack_2, waste_chute, use_gripper=True)
    ctx.move_labware(tip_rack_3, "C3", use_gripper=True)

    # 96 channel row pickup
    pipette_96_channel.configure_nozzle_layout(style=protocol_api.ROW, start="H1")
    pipette_96_channel.pick_up_tip(tip_rack_3)
    pipette_96_channel.mix(3, 500, source_reservoir["A1"])
    pipette_96_channel.drop_tip(waste_chute)
    comment_tip_rack_status(ctx, tip_rack_3)

    # 96 channel full rack pickup
    pipette_96_channel.configure_nozzle_layout(style=protocol_api.ALL, start="A1")
    pipette_96_channel.pick_up_tip(tip_rack_1["A1"])
    comment_tip_rack_status(ctx, tip_rack_1)
    pipette_96_channel.aspirate(5, source_reservoir["A1"])
    pipette_96_channel.touch_tip()
    pipette_96_channel.air_gap(height=30)
    pipette_96_channel.blow_out(waste_chute)
    pipette_96_channel.prepare_to_aspirate()
    pipette_96_channel.aspirate(5, source_reservoir["A1"])
    pipette_96_channel.touch_tip()
    pipette_96_channel.air_gap(height=30)
    pipette_96_channel.blow_out(waste_chute)
    pipette_96_channel.prepare_to_aspirate()
    pipette_96_channel.aspirate(10, source_reservoir["A1"])
    pipette_96_channel.touch_tip()
    pipette_96_channel.dispense(10, dest_pcr_plate["A1"])
    pipette_96_channel.mix(repetitions=5, volume=15)
    pipette_96_channel.return_tip()
    comment_tip_rack_status(ctx, tip_rack_1)
    pipette_96_channel.pick_up_tip(tip_rack_1["A1"])
    pipette_96_channel.transfer(
        volume=10,
        source=source_reservoir["A1"],
        dest=dest_pcr_plate["A1"],
        new_tip="never",
        touch_tip=True,
        blow_out=True,
        blowout_location="trash",
        mix_before=(3, 5),
        mix_after=(1, 5),
    )
    comment_tip_rack_status(ctx, tip_rack_1)
    pipette_96_channel.return_tip(home_after=False)
    comment_tip_rack_status(ctx, tip_rack_1)
    ctx.comment("I think the above should not be empty?")
    # Thermocycler lid moves
    ctx.move_labware(dest_pcr_plate, thermocycler, use_gripper=True)
    ctx.move_labware(lids[0], dest_pcr_plate, use_gripper=True)  # we reversed this list earlier
    thermocycler.close_lid()
    thermocycler.set_block_temperature(38, hold_time_seconds=5.0)
    thermocycler.set_lid_temperature(38)
    thermocycler.open_lid()
    ctx.move_labware(lids[0], waste_chute, use_gripper=True)
    thermocycler.deactivate()

    heater_shaker.open_labware_latch()
    ctx.move_labware(dest_pcr_plate, heater_shaker_adapter, use_gripper=True)
    heater_shaker.close_labware_latch()

    heater_shaker.set_target_temperature(38)
    heater_shaker.set_and_wait_for_shake_speed(777)
    heater_shaker.wait_for_temperature()

    heater_shaker.deactivate_heater()
    heater_shaker.deactivate_shaker()
    heater_shaker.open_labware_latch()

    ctx.move_labware(dest_pcr_plate, temperature_module_adapter, use_gripper=True)
    temperature_module.set_temperature(38)
    temperature_module.deactivate()

    ctx.move_labware(dest_pcr_plate, absorbance_module, use_gripper=True)
    absorbance_module.close_lid()

    result = absorbance_module.read(export_filename="smoke_APR_data.csv")
    msg = f"single: {result}"
    ctx.comment(msg=msg)
    ctx.pause(msg=msg)
    absorbance_module.open_lid()
    ctx.move_labware(dest_pcr_plate, "C2", use_gripper=True)

    # ######################
    # # labware.set_offset #
    # ######################

    # # -------------------------- #
    # # Added in API version: 2.18 #
    # # -------------------------- #

    SET_OFFSET_AMOUNT = 10.0
    ctx.move_labware(labware=source_reservoir, new_location=protocol_api.OFF_DECK, use_gripper=False)
    pipette_96_channel.pick_up_tip(tip_rack_1["A1"])
    pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

    ctx.pause("Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be at the LPC calibrated height.")

    dest_pcr_plate.set_offset(
        x=0.0,
        y=0.0,
        z=SET_OFFSET_AMOUNT,
    )

    pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())
    ctx.pause(
        "Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be 10mm higher than the LPC calibrated height."
    )

    ctx.move_labware(labware=dest_pcr_plate, new_location="D2", use_gripper=False)
    pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

    ctx.pause("Is the pipette tip in the middle of the PCR Plate, well A1, in slot D2? It should be at the LPC calibrated height.")

    dest_pcr_plate.set_offset(
        x=0.0,
        y=0.0,
        z=SET_OFFSET_AMOUNT,
    )

    pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())
    ctx.pause(
        "Is the pipette tip in the middle of the PCR Plate, well A1, in slot D2? It should be 10mm higher than the LPC calibrated height."
    )

    ctx.move_labware(labware=dest_pcr_plate, new_location="C2", use_gripper=False)
    pipette_96_channel.move_to(dest_pcr_plate.wells_by_name()["A1"].top())

    ctx.pause(
        "Is the pipette tip in the middle of the PCR Plate, well A1, in slot C2? It should be 10mm higher than the LPC calibrated height."
    )

    ctx.move_labware(labware=source_reservoir, new_location="D2", use_gripper=False)
    pipette_96_channel.move_to(source_reservoir.wells_by_name()["A1"].top())

    ctx.pause("Is the pipette tip in the middle of the reservoir , well A1, in slot D2? It should be at the LPC calibrated height.")

    pipette_96_channel.return_tip()
    ctx.move_labware(tip_rack_3, waste_chute, use_gripper=True)

    ctx.pause("!!!!!!!!!!YOU NEED TO REDO LPC!!!!!!!!!!")

    # Test the unique top() methods for TrashBin and WasteChute.
    # Well objects should remain the same

    ########################
    # unique top() methods #
    ########################

    # ---------------------------- #
    # Changed in API version: 2.18 #
    # ---------------------------- #

    assert isinstance(waste_chute.top(), protocol_api.WasteChute)
    assert isinstance(source_reservoir.wells_by_name()["A1"].top(), types.Location)
