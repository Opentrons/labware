The following examples show casual descriptions and their corresponding potential protocols.

#### Example 1: PCR protocol

<description>
I want to run a PCR setup protocol with temperature control. I need to prepare 64 samples (that's 8 full columns) using both mastermix and samples. Let's keep the samples cold at 4°C and the mastermix at 10°C using temperature modules.

Here's what I want to do:

First, I'll use a multichannel P20 pipette mounted on the left side. I'll have three plates: one for samples (on the cold module), one for mastermix (on the slightly warmer module), and one destination plate where we'll mix everything together.

The steps should go like this:

1. Start by setting both temperature modules - 4°C for samples and 10°C for mastermix
2. Take one tip and use it to transfer 7 µL of mastermix to each destination well for all 64 samples
3. For the samples, I want to transfer 5 µL from each well to the corresponding destination well. Use fresh tips for each column, mix 9 times with 12 µL volume, and make sure to blow out into the destination well
4. When we're done, turn off both temperature modules

Remember to work column by column since we're using a multichannel pipette, and we'll be handling the first 8 columns of each plate.
</description>

<protocol>
from opentrons import protocol_api

requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext): # Module loading
temp_mod_sample = protocol.load_module('temperature module gen2', 1)
temp_mod_mastermix = protocol.load_module('temperature module gen2', 3)

    # Load thermal adapters
    sample_adapter = temp_mod_sample.load_adapter("opentrons_96_well_aluminum_block")
    mastermix_adapter = temp_mod_mastermix.load_adapter("opentrons_96_well_aluminum_block")

    # Load labware onto the adapters
    sample_plate = sample_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    mastermix_plate = mastermix_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')

    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 7)
    tiprack = protocol.load_labware('opentrons_96_filtertiprack_20ul', 4)

    # Pipette loading
    p20_single = protocol.load_instrument('p20_multi_gen2', 'left', tip_racks=[tiprack])

    # Well allocation
    num_samples = 64
    num_cols = num_samples // 8
    sample_wells = sample_plate.columns()[:num_cols]
    mastermix_wells = mastermix_plate.columns()[:num_cols]
    dest_wells = dest_plate.columns()[:num_cols]

    # Volume and temperature parameters
    sample_temp = 4  # Celsius
    mastermix_temp = 10  # Celsius
    mastermix_vol = 7  # uL
    sample_vol = 5  # uL
    mix_cycles = 9
    total_mix_vol = sample_vol + mastermix_vol  # 12 uL total

    # Execute commands in order specified in description
    # Command 1: Set sample temperature
    temp_mod_sample.set_temperature(sample_temp)

    # Command 2: Set mastermix temperature
    temp_mod_mastermix.set_temperature(mastermix_temp)

    # Command 3: Transfer mastermix
    p20_single.transfer(
        mastermix_vol,
        mastermix_wells,
        dest_wells,
        new_tip='once'
    )

    # Command 4: Transfer samples and mix
    p20_single.transfer(
        sample_vol,
        sample_wells,
        dest_wells,
        new_tip='always',
        mix_after=(mix_cycles, total_mix_vol),
        blow_out=True,
        blowout_location='destination well'
    )

    # Command 5 and 6: Deactivate temperature modules
    temp_mod_mastermix.deactivate()
    temp_mod_sample.deactivate()

</protocol>

#### Example 2: PCR protocol

<description>
I want to set up a PCR reaction plate using both single-channel and multi-channel pipettes. Here's what we need to do:

First, using the single-channel pipette on the right:

- We'll add 7 microliters of mastermix from tubes in the tube rack to specific wells in our destination plate. The source tubes and destination wells are listed in a CSV file. Let's use a fresh tip for each different mastermix tube we work with.

Then, using the 8-channel pipette on the left:

- We're going to transfer 3 microliters of samples in triplicate. Here's how:
- Take samples from column 1 of the source plate and transfer them to:
  - Column 1 of the destination plate (change tip)
  - Column 2 of the destination plate (change tip)
  - Column 3 of the destination plate
- Repeat this same pattern for the remaining columns in the source plate, always making three copies of each column and changing tips between transfers.
  </description>

<protocol>
from opentrons import protocol_api

requirements = {
'robotType': 'Flex',
'apiLevel': '2.15'
}

def run(protocol: protocol_api.ProtocolContext):

    csv_samp = """
        Primer Tube,Destination well
        A1,A1
        B1,B1
        C1,C1
        D1,D1
        A2,E1
        B2,F1
        C2,G1
        D2,H1
        A3,A2
        B3,B2
        C3,C2
        D3,D2
        A4,E2
        B4,F2
        C4,G2
        D4,H2
        A5,A3
        B5,B3
        C5,C3
        D5,D3
        A6,E3
        B6,F3
        C6,G3
        D6,H3
    """
    # Convert to list
    csv_lines = [[val.strip() for val in line.split(',')]
                 for line in csv_samp.splitlines()
                 if line.split(',')[0].strip()][1:]

    NUM_COL = 3
    STRIDE = 3

    # Load labware
    tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dna_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'D3')
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'D1')

    tiprack_single = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A2')
    tiprack_multi = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'B2')

    # Load pipette
    single_pip = protocol.load_instrument("flex_1channel_50", 'right', tip_racks=[tiprack_single])
    multi_pip = protocol.load_instrument("flex_8channel_50", 'left', tip_racks=[tiprack_multi])

    # transfer mastermix
    for source_tube, dest_well in csv_lines:
        single_pip.pick_up_tip()
        single_pip.transfer(7, tuberack[source_tube], dest_plate[dest_well], new_tip='never')
        single_pip.drop_tip()

    # Transfer in triplicate
    col_ctr = 0
    for s in dna_plate.rows()[0][:NUM_COL]:
        multi_pip.pick_up_tip()
        multi_pip.transfer(3, s, dest_plate.rows()[0][col_ctr], new_tip='never')
        multi_pip.drop_tip()

        multi_pip.pick_up_tip()
        multi_pip.transfer(3, s, dest_plate.rows()[0][col_ctr+1], new_tip='never')
        multi_pip.drop_tip()

        multi_pip.pick_up_tip()
        multi_pip.transfer(3, s, dest_plate.rows()[0][col_ctr+2], new_tip='never')
        multi_pip.drop_tip()

        col_ctr += STRIDE

</protocol>

#### Example 3: Transfer reagent protocol

<description>
I want to do a series of liquid transfers using two different pipettes. Here's what we need to do:

First, using the P20 single-channel pipette on the right:

- Take 15 microliters from the first well of our reservoir and transfer it to every well in both of our destination plates. We can use the same tip for all these transfers.
- Then, transfer 20 microliters from each well of our 384-well source plate to the corresponding wells in our first destination plate (the 384-well plate). We can keep using the same tip for these transfers too.

Next, using the P300 single-channel pipette on the left:

- Transfer 100 microliters from each well of our 96-well source plate to the corresponding wells in our second destination plate (the 96-well plate). For this step, we'll need to use a fresh tip for each transfer.
  </description>

<protocol>
from opentrons import protocol_api

# metadata

metadata = {
"protocolName": "Reagent Transfer ",
"author": "OGA",
"description": "Transfer reagents from multile source labware to multiple destination labware",
"apiLevel": "2.16",
}

def run(protocol: protocol_api.ProtocolContext): # labware
source_1 = protocol.load_labware("nest_1_reservoir_195ml", location=7)
source_2 = protocol.load_labware("biorad_384_wellplate_50ul", location=8)
source_3 = protocol.load_labware("biorad_96_wellplate_200ul_pcr", location=9)
destination_1 = protocol.load_labware("corning_384_wellplate_112ul_flat", location=1)
destination_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location=2)

    tiprack300 = protocol.load_labware("opentrons_96_tiprack_300ul", location=10)
    tiprack20 = protocol.load_labware("opentrons_96_tiprack_20ul", location=11)

    # pipettes
    p300s = protocol.load_instrument("p300_single_gen2", mount="left", tip_racks=[tiprack300])
    p20s = protocol.load_instrument("p20_single_gen2", mount="right", tip_racks=[tiprack20])

    # volumes setup
    transfer_vol_1 = 15
    transfer_vol_2 = 20
    transfer_vol_3 = 100

    # wells setup
    source_wells_1 = source_1.wells_by_name()['A1']
    source_wells_2 = source_2.wells()
    source_wells_3 = source_3.wells()
    destination_wells_1 = destination_1.wells()
    destination_wells_2 = destination_2.wells()
    all_destinations = destination_wells_1 + destination_wells_2

    # commands
    p20s.transfer(transfer_vol_1, source_wells_1, all_destinations, new_tip="once")
    p20s.transfer(transfer_vol_2, source_wells_2, destination_wells_1, new_tip="once")
    p300s.transfer(transfer_vol_3, source_wells_3, destination_wells_2, new_tip="always")

</protocol>

#### Example 4: Transfer reagent protocol

<description>
I want to pool samples from multiple tube racks into a deep well plate. I'll be using a single-channel P300 pipette mounted on the right side.

Here's what we need to do:

1. Take 20 µL from each tube in the first tube rack and pool them all into well A1 of the deep well plate. We'll use a fresh tip for each tube.

2. Then, take 20 µL from each tube in the second tube rack and pool them all into well B1 of the deep well plate. Again, use a fresh tip for each tube.

3. Next, take 20 µL from each tube in the third tube rack and pool them all into well C1 of the deep well plate. Use a fresh tip for each tube.

4. Finally, take 20 µL from each tube in the fourth tube rack and pool them all into well D1 of the deep well plate. Use a fresh tip for each tube.
   </description>

<protocol>
from opentrons import protocol_api

metadata = {
'protocolName': 'Sample Aliquoting & Plate Prep',
'author': 'ChatGPT',
'apiLevel': '2.16'
}

def run(protocol: protocol_api.ProtocolContext):

    # Load labware
    source_labware1 = protocol.load_labware('opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap', 1)
    source_labware2 = protocol.load_labware('opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap', 2)
    source_labware3 = protocol.load_labware('opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap', 4)
    source_labware4 = protocol.load_labware('opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap', 5)
    destination_labware = protocol.load_labware('nest_96_wellplate_2ml_deep', 3)

    tiprack1 = protocol.load_labware('opentrons_96_filtertiprack_200ul', 7)
    tiprack2 = protocol.load_labware('opentrons_96_filtertiprack_200ul', 8)

    # Load pipette
    p300_single = protocol.load_instrument('p300_single_gen2', 'right', tip_racks=[tiprack1, tiprack2])

    # Transfer samples
    p300_single.transfer(20, source_labware1.wells(), destination_labware.wells_by_name()['A1'], new_tip='always')
    p300_single.transfer(20, source_labware2.wells(), destination_labware.wells_by_name()['B1'], new_tip='always')
    p300_single.transfer(20, source_labware3.wells(), destination_labware.wells_by_name()['C1'], new_tip='always')
    p300_single.transfer(20, source_labware4.wells(), destination_labware.wells_by_name()['D1'], new_tip='always')

</protocol>

#### Example 5: Reagent transfer protocol

<description>
I want to perform a series of liquid transfers using two different single-channel pipettes. Here's what we need to do:

First, using the 50 µL pipette mounted on the left:

- Take 15 µL from the reservoir and transfer it to every well in both our 384-well and 96-well destination plates. We can use the same tip for all these transfers.
- Then, transfer 20 µL from each well of our 384-well source plate to the corresponding wells in our 384-well destination plate. We can keep using the same tip for these transfers too.

Finally, using the 1000 µL pipette mounted on the right:

- Transfer 100 µL from each well of our 96-well source plate to the corresponding wells in our 96-well destination plate. For this step, we'll need to use a fresh tip for each transfer.
  </description>

<protocol>
from opentrons import protocol_api

# metadata

metadata = {
"protocolName": "Reagent Transfer ",
"author": "Opentrons Generative AI",
"description": "Transfer reagents from multile source labware to multiple destination labware",
}

requirements = {"robotType": "Flex", "apiLevel": "2.16"}

def run(protocol: protocol_api.ProtocolContext): # labware
source_1 = protocol.load_labware("nest_1_reservoir_195ml", location='B1')
source_2 = protocol.load_labware("biorad_384_wellplate_50ul", location='B2')
source_3 = protocol.load_labware("biorad_96_wellplate_200ul_pcr", location='B3')
destination_1 = protocol.load_labware("corning_384_wellplate_112ul_flat", location='D1')
destination_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='D2')

    tip1000 = protocol.load_labware('opentrons_flex_96_filtertiprack_200ul', 'A1')
    tip50 = protocol.load_labware("opentrons_flex_96_filtertiprack_50ul", location='A2')

    # pipettes
    p1000s = protocol.load_instrument('flex_1channel_1000','right',tip_racks = [tip1000])
    p50s = protocol.load_instrument('flex_1channel_50','left',tip_racks = [tip50])

    # load trash bin
    trash = protocol.load_trash_bin('A3')

    # volumes setup
    transfer_vol_1 = 15
    transfer_vol_2 = 20
    transfer_vol_3 = 100

    # wells setup
    source_wells_1 = source_1.wells_by_name()['A1']
    source_wells_2 = source_2.wells()
    source_wells_3 = source_3.wells()
    destination_wells_1 = destination_1.wells()
    destination_wells_2 = destination_2.wells()

    # commands
    p50s.transfer(transfer_vol_1, source_wells_1, destination_wells_1+destination_wells_2, new_tip="once")
    p50s.transfer(transfer_vol_2, source_wells_2, destination_wells_1, new_tip="once")
    p1000s.transfer(transfer_vol_3, source_wells_3, destination_wells_2, new_tip="always")

</protocol>

#### Example 6: Reagent transfer protocol

<description>
I want to pool samples from two different plates into a reservoir using a single-channel pipette mounted on the left side. Here's what we need to do:

First, let's pool samples from our first source plate:

- Take 100 µL from each well in the first plate and transfer it to the first well of our reservoir
- We can use the same tip for all these transfers to save time

Then, for our second source plate:

- Again, take 100 µL from each well and add it to the same well in our reservoir where we pooled the first set
- Keep using the same tip for these transfers too

Remember, we're treating these as two separate steps, but both are basically pooling samples from different source plates into the same destination well.
</description>

<protocol>
from opentrons import protocol_api

# metadata

metadata = {
'protocolName': 'Reagent Transfer',
'author': 'Opentrons Generative AI',
}

requirements = {"robotType": "Flex", "apiLevel": "2.16"}

# protocol run function

def run(protocol: protocol_api.ProtocolContext): # labware
source_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C1')
source_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C2')
destination_1 = protocol.load_labware("nest_1_reservoir_195ml", location='D1')

    tiprack200 = protocol.load_labware("opentrons_flex_96_filtertiprack_200ul", location='B2')

    # pipettes
    p1000s = protocol.load_instrument("flex_1channel_1000", mount="left", tip_racks=[tiprack200])

    # load trash bin
    trash = protocol.load_trash_bin('A3')

    # volume setup
    transfer_vol_1 = 100
    transfer_vol_2 = 100

    # wells setup
    source_wells_1 = source_1.wells()
    source_wells_2 = source_2.wells()
    destination_wells_1 = destination_1.wells_by_name()['A1']

    # commands
    p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")

    p1000s.transfer(transfer_vol_2, source_wells_2, destination_wells_1, new_tip="once")

</protocol>

#### Example 7: PCR protocol

<description>
I want to run a PCR protocol using three temperature-controlled modules: a thermocycler and two temperature modules (one for samples and one for mastermix). Here's what we need to do:

First, let's set up our temperatures:

- Set the thermocycler block to 22°C and its lid to 95°C
- Warm up the sample temperature module to 37°C
- Cool down the mastermix module to 10°C

For the liquid handling steps, using our 96-channel pipette:

1. Transfer 20 µL of mastermix, taking it from 5mm below the liquid surface and dispensing it 2mm from the bottom of the destination wells. We can use the same tip for this.

2. Next, transfer 20 µL of sample, aspirating from 3mm above the well bottom and dispensing 7mm from the top of the destination wells. Do this at half the normal flow rate. Mix everything well - 5 cycles with the total 40 µL volume. When finished, pull the tips out slowly at 5 mm/s. Use the same tip for this transfer.

For the PCR cycling:

1. Move our plate to the thermocycler and close the lid
2. Run these steps:
   - One cycle at 74°C for 65 seconds
   - 25 cycles of:
     - 60°C for 7 seconds
     - 84°C for 19 seconds
     - 57°C for 44 seconds
   - One final cycle at 75°C for 8 minutes
   - Hold everything at 4°C

Finally:

1. Open the thermocycler lid and move the plate back to its original position
2. We'll pause here - you'll need to seal the plate and put it in the fridge at 4°C
3. Turn off all the temperature modules
   </description>

<protocol>
from opentrons import protocol_api

metadata = {
'protocol_name': 'PCR Amplification protocol',
'author': 'Opentrons Generative AI',
'description': 'PCR Amplification protocol with 25 cycles',
}

requirements = {"robotType": "Flex", "apiLevel": "2.16"}

def run(protocol: protocol_api.ProtocolContext): # Sample parameters
sample_volume_ul = 20
master_mix_volume_ul = 20
mix_cycles = 5
total_mix_volume_ul = sample_volume_ul + master_mix_volume_ul
return_slot = 'C3'

    master_mix_temperature_c = 10
    sample_temperature_c = 37
    step1_cycles = 1
    step2_cycles = 25
    step3_cycles = 1

    # Thermocycler parameters
    lid_temperature_c = 95
    initial_block_temperature_c = 22
    final_hold_temperature_c = 4

    # Modules
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')
    sample_temperature_module = protocol.load_module('temperature module gen2', 'D1')
    master_mix_temperature_module = protocol.load_module('temperature module gen2', 'D3')

    # Adapters
    sample_adapter = sample_temperature_module.load_adapter('opentrons_96_well_aluminum_block')
    master_mix_adapter = master_mix_temperature_module.load_adapter('opentrons_96_well_aluminum_block')

    # Labware
    sample_plate = sample_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    master_mix_plate = master_mix_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    destination_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'C3')
    tips_50ul = [
        protocol.load_labware(
            'opentrons_flex_96_filtertiprack_50ul',
            slot,
            adapter="opentrons_flex_96_tiprack_adapter"
        )
        for slot in ['A2', 'B2', 'C2']
    ]

    # Pipette
    pipette_96channel = protocol.load_instrument('flex_96channel_1000', 'left', tip_racks=tips_50ul)
    # load trash bin
    trash = protocol.load_trash_bin('A3')

    # Well allocation
    sample_source_wells = sample_plate['A1']
    destination_wells = destination_plate['A1']
    master_mix_source_well = master_mix_plate['A1']

    # Set thermocycler block and lid temperature
    thermocycler_module.set_block_temperature(initial_block_temperature_c)
    thermocycler_module.open_lid()
    thermocycler_module.set_lid_temperature(lid_temperature_c)

    # Temperature module setup
    sample_temperature_module.set_temperature(sample_temperature_c)
    master_mix_temperature_module.set_temperature(master_mix_temperature_c)

    # Master mix transfer
    pipette_96channel.transfer(
        master_mix_volume_ul,
        master_mix_source_well.top(-5),
        destination_wells.bottom(2),
        new_tip='once'
    )

    # Sample transfer
    pipette_96channel.pick_up_tip()
    pipette_96channel.aspirate(sample_volume_ul, sample_source_wells.bottom(3), rate=0.5)
    pipette_96channel.dispense(sample_volume_ul, destination_wells.top(-7), rate=0.5)
    pipette_96channel.mix(mix_cycles, total_mix_volume_ul)
    pipette_96channel.move_to(destination_wells.top(), speed=5)
    pipette_96channel.drop_tip()

    # Moving the plate to the thermocycler
    protocol.move_labware(destination_plate, thermocycler_module, use_gripper=True)

    # PCR cycling
    thermocycler_module.close_lid()
    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 74, 'hold_time_seconds': 65}
        ],
        repetitions=step1_cycles,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 60, 'hold_time_seconds': 7},
            {'temperature': 84, 'hold_time_seconds': 19},
            {'temperature': 57, 'hold_time_seconds': 44}
        ],
        repetitions=step2_cycles,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[{'temperature': 75, 'hold_time_seconds': 480}],
        repetitions=step3_cycles,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.set_block_temperature(final_hold_temperature_c)
    thermocycler_module.open_lid()

    # Moving the plate back to its original location
    protocol.move_labware(destination_plate, return_slot, use_gripper=True)

    # Optional: pause for manual intervention
    protocol.pause("Pick up the destination plate, seal it, and refrigerate at 4C.")

    # Deactivate temperature modules at the end of the protocol
    master_mix_temperature_module.deactivate()
    sample_temperature_module.deactivate()

</protocol>

#### Example 8: Serial dilution protocol

<description>
I want to perform a serial dilution using an 8-channel pipette mounted on the right side. Here's what we need to do:

First, let's set up our key measurements:

- We're doing a 1:3 dilution series with 10 dilution steps
- We'll work with a total volume of 150 µL in each well
- This means we'll transfer 50 µL between wells and add 100 µL of diluent
- We'll use a 10 µL air gap for all our transfers

Here's the step-by-step process:

1. Start by adding diluent to our plate:

   - Using one tip, transfer 100 µL of diluent (green liquid) from the reservoir to wells A2 through A11
   - Keep using the same tip and remember to use the air gap for each transfer

2. Now for the serial dilution:

   - Get a fresh tip
   - Starting with well A1 (which has our red sample), transfer 50 µL to well A2
   - Mix well - 5 times with 75 µL
   - Continue this pattern down the row:
     - Transfer 50 µL from A2 to A3, mix
     - A3 to A4, mix
     - And so on until you reach A11
   - Use the same tip for all these transfers and remember the air gap

3. Finally, let's add our blank:
   - Get a fresh tip
   - Transfer 100 µL of diluent to well A12
   - Use the air gap for this transfer too
     </description>

<protocol>
metadata = {
    'protocolName': 'Customizable Serial Dilution',
    'author': 'Opentrons <protocols@opentrons.com>',
    'source': 'Protocol Library'
}

requirements = {
"robotType": "Flex",
"apiLevel": "2.19"
}

def run(protocol):

    # Constants
    DILUTION_FACTOR = 3
    NUM_DILUTIONS = 10
    TOTAL_MIXING_VOLUME = 150.0
    AIR_GAP_VOLUME = 10

    # Calculated volumes
    transfer_volume = TOTAL_MIXING_VOLUME / DILUTION_FACTOR
    diluent_volume = TOTAL_MIXING_VOLUME - transfer_volume

    # Labware setup
    trough = protocol.load_labware('nest_12_reservoir_15ml', 'D2')
    plate = protocol.load_labware('nest_96_wellplate_200ul_flat', 'D3')
    tip_name = "opentrons_flex_96_filtertiprack_1000ul"
    tipracks = [
        protocol.load_labware(tip_name, slot)
        for slot in ["C1", "D1"]
    ]

    # Pipette setup
    pipette = protocol.load_instrument('flex_8channel_1000', 'right', tipracks)

    # Waste setup
    trash = protocol.load_trash_bin("A3")

    # Reagent setup
    diluent = trough.wells()[0]
    source = plate.columns()[0]

    # Define and load liquids
    diluent_liquid = protocol.define_liquid(
        name="Dilutent",
        description="Diluent liquid is filled in the reservoir",
        display_color="#33FF33"
    )
    sample_liquid = protocol.define_liquid(
        name="Sample",
        description="Non-diluted samples are loaded in the 1st column",
        display_color="#FF0000"
    )

    diluent.load_liquid(liquid=diluent_liquid, volume=0.8 * diluent.max_volume)
    for well in source:
        well.load_liquid(liquid=sample_liquid, volume=TOTAL_MIXING_VOLUME)

    # Set up dilution destinations
    dilution_destination_sets = [[row] for row in plate.rows()[0][1:NUM_DILUTIONS+1]]
    dilution_source_sets = [[row] for row in plate.rows()[0][:NUM_DILUTIONS]]
    blank_set = [plate.rows()[0][NUM_DILUTIONS+1]]

    # 1. Distribute diluent
    all_diluent_destinations = [well for wells in dilution_destination_sets for well in wells]
    pipette.pick_up_tip()
    for dest in all_diluent_destinations:
        pipette.transfer(
            diluent_volume,
            diluent,
            dest,
            air_gap=AIR_GAP_VOLUME,
            new_tip='never'
        )
    pipette.drop_tip()

    # 2. Perform serial dilutions
    pipette.pick_up_tip()
    for source_set, dest_set in zip(dilution_source_sets, dilution_destination_sets):
        for s, d in zip(source_set, dest_set):
            pipette.transfer(
                transfer_volume,
                s,
                d,
                air_gap=AIR_GAP_VOLUME,
                mix_after=(5, TOTAL_MIXING_VOLUME/2),
                new_tip='never'
            )
    pipette.drop_tip()

    # 3. Add blank
    pipette.pick_up_tip()
    for blank_well in blank_set:
        pipette.transfer(
            diluent_volume,
            diluent,
            blank_well,
            air_gap=AIR_GAP_VOLUME,
            new_tip='never'
        )
    pipette.drop_tip()

</protocol>

#### Example 9: Serial dilution

<description>
I want to perform a serial dilution protocol using a multi-channel P300 pipette mounted on the left side. We'll be working with a temperature-controlled setup and need to achieve a 1.5x dilution factor across 10 wells, with a total mixing volume of 150 µL per well.

Here's what we need to do:

First, let's calculate our volumes:

- Transfer volume will be 150 µL divided by 1.5
- Diluent volume will be 150 µL minus our transfer volume

Now for the actual steps:

1. Let's start by adding diluent to our dilution wells:

   - Take diluent from the first reservoir well and add our calculated diluent volume to wells 2 through 10 in the first row of our temperature-controlled plate
   - Use a 10 µL air gap for each transfer
   - Use fresh tips for each well

2. Now for the serial dilution:

   - Starting from well 1, we'll transfer our calculated transfer volume to well 2
   - After each transfer, mix 5 times using (150 µL - 5 µL)
   - Keep using a 10 µL air gap
   - Use new tips for each transfer
   - Continue this pattern, moving from well to well until we reach well 10

3. Finally, add a blank to the last well:
   - Transfer our calculated diluent volume from the first reservoir well to well 10
   - Use a 10 µL air gap
   - Use a fresh tip for this transfer
     </description>

<protocol>
metadata = {
    'protocolName': 'Serial Dilution for Eskil',
    'author': 'John C. Lynch',
    'source': 'Custom Protocol Request',
    'apiLevel': '2.19'
}

def run(protocol):

    # Constants
    PLATE_TYPE = 'opentrons_96_aluminumblock_nest_wellplate_100ul'
    DILUTION_FACTOR = 1.5
    NUM_DILUTIONS = 10
    TOTAL_MIXING_VOLUME = 150

    # Calculated volumes
    transfer_volume = TOTAL_MIXING_VOLUME / DILUTION_FACTOR
    diluent_volume = TOTAL_MIXING_VOLUME - transfer_volume

    # Load temperature module and labware
    temp_module = protocol.load_module('temperature module gen2', '4')
    reservoir = protocol.load_labware('nest_12_reservoir_15ml', '1')
    dilution_plate = temp_module.load_labware(PLATE_TYPE)

    # Load tipracks
    tipracks = [
        protocol.load_labware('opentrons_96_tiprack_300ul', slot)
        for slot in ['2', '3']
    ]

    # Load pipette
    pipette = protocol.load_instrument(
        'p300_multi_gen2',
        mount='left',
        tip_racks=tipracks
    )

    # 1. Distribute diluent
    pipette.transfer(
        diluent_volume,
        reservoir.wells()[0],
        dilution_plate.rows()[0][1:NUM_DILUTIONS],
        air_gap=10,
        new_tip='always'
    )

    # 2. Perform serial dilutions
    sources = dilution_plate.rows()[0][:NUM_DILUTIONS-1]
    dests = dilution_plate.rows()[0][1:NUM_DILUTIONS]

    pipette.transfer(
        transfer_volume,
        sources,
        dests,
        air_gap=10,
        mix_after=(5, TOTAL_MIXING_VOLUME-5),
        new_tip='always'
    )

    # 3. Add blank
    pipette.transfer(
        diluent_volume,
        reservoir.wells()[0],
        dilution_plate.rows()[0][-1],
        air_gap=10,
        new_tip='always'
    )

</protocol>

#### Example 10

<description>
I want to perform a serial dilution using a single-channel pipette mounted on the left side. Here's what we need to do:

First, let's add our diluent:

- Take 100 µL of diluent from the first well of our reservoir and distribute it to every well in our plate.

Then, for the serial dilution:

- For each of the 8 rows in our plate:
  1. Start by transferring 100 µL of our solution from well A2 of the reservoir to the first well of the row
  2. Mix it well - 3 times with 50 µL
  3. Then move along the row from left to right:
     - Transfer 100 µL from each well to the next well
     - Mix 3 times with 50 µL after each transfer
     - Continue this pattern for 11 transfers to complete the row
  4. Repeat this process for all 8 rows
     </description>

<protocol>
from opentrons import protocol_api

metadata = {
"protocolName": "Serial Dilution Tutorial – Flex 1-channel",
"description": """serial dilution""",
"author": "New API User"
}

requirements = {
"robotType": "Flex",
"apiLevel": "2.16"
}

def run(protocol: protocol_api.ProtocolContext):
tips = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2")
plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D3")
trash = protocol.load_trash_bin("A3")
left_pipette = protocol.load_instrument("flex_1channel_1000", "left", tip_racks=[tips])

    # distribute diluent
    left_pipette.transfer(100, reservoir["A1"], plate.wells())

    # loop through each row
    for i in range(8):

        # save the destination row to a variable
        row = plate.rows()[i]

        # transfer solution to first well in column
        left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))

        # dilute the sample down the row
        left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))

</protocol>

#### Example 11

<description>
Liquid Transfer with Heater-Shaker

prompt description:

```text
Hi, please help me write a protocol for Flex.
Pipette: 96 channel
Decklayout:
Slot C1: Nest 195 1 well reservoir
Slot D1: Heater shaker module with corning 96 well flat bottom plate
Slot A2: 200 ul tiprack
Slot B2: 1000 ul tiprack for flex
Slot C2: 50 ul tiprack
Slot D2: PCR plate Steps:

Open the labware latch and allow the user to load the plate
Close the labware latch
Using 200 ul tip transfer 70 ul liquid from slot c1 to d1.
Using 50 ul tip transfer 10 ul liquid from slot d2 to D1.
shake the plate at 2000 rpm for 1 minute
```

</description>

<protocol>

```python
from opentrons import protocol_api

metadata = {{
    'protocolName': 'Liquid Transfer with Heater Shaker',
    'author': 'User',
    'description': "Transfer liquids between reservoir, PCR plate, and heater shaker module's plate."
}}
requirements = {{"robotType": "Flex", "apiLevel": "2.19"}}

def run(protocol: protocol_api.ProtocolContext):
    # Load trash before commands
    # use a waste chute or a trashbin depending on the setup
    trash = protocol.load_trash_bin("A3")
    #chute = protocol.load_waste_chute()

    # Modules
    heater_shaker_module = protocol.load_module('heaterShakerModuleV1', 'D1')
    heater_shaker_plate = heater_shaker_module.load_labware('corning_96_wellplate_360ul_flat')

    # Labware
    reservoir = protocol.load_labware('nest_1_reservoir_195ml', 'C1')
    pcr_plate = protocol.load_labware('nest_96_wellplate_200ul_flat', 'D2')
    tiprack_200ul = protocol.load_labware('opentrons_flex_96_tiprack_200ul', 'A2', adapter = "opentrons_flex_96_tiprack_adapter")
    tiprack_1000ul = protocol.load_labware('opentrons_flex_96_tiprack_1000ul', 'B2', adapter = "opentrons_flex_96_tiprack_adapter")
    tiprack_50ul = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'C2', adapter = "opentrons_flex_96_tiprack_adapter")

    # Pipettes
    pip96 = protocol.load_instrument('flex_96channel_1000', mount='left', tip_racks=[tiprack_200ul, tiprack_50ul])

    # Steps
    # 1. Open the labware latch and allow the user to load the plate
    heater_shaker_module.open_labware_latch()


    protocol.pause("Please put the Corning 96 well plate and press continue")
    # 2. Close the labware latch
    heater_shaker_module.close_labware_latch()
    protocol.comment("Just a message is displayed. This step is")
    # 3. Using 200 ul tip transfer 70 ul liquid from slot c1 to d1.

    pip96.transfer(70, reservoir['A1'], heater_shaker_plate['A1'], new_tip='always')

    # 4. Using 50 ul tip transfer 10 ul liquid from slot d2 to D1.
    pip96.transfer(10, pcr_plate['A1'], heater_shaker_plate['A1'], new_tip='always')

    # 5. Shake the plate at 2000 rpm for 1 minute
    heater_shaker_module.set_and_wait_for_shake_speed(rpm=2000)
    protocol.delay(minutes=1)
    heater_shaker_module.deactivate_shaker()
```

</protocol>
