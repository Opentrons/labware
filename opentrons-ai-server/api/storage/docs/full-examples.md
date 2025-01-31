## Below seven examples are shown in pairs: a description (<description>) and a corresponding protocol (<protocol>).

[1] Example
<description>
Application: Reagent Filling - One source to Multiple destinations
Robot: OT-2
API: 2.15

Modules:

- No modules

Labware:

- Source labware: Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt in slot 4
- Destination Labware: NEST 2 mL 96-Well Deep Well Plate, V Bottom in slot 9
- Tiprack: Opentrons OT-2 96 Tip Rack 300 uL in slot 1

Pipette mount:

- P300 Multi Channel is mounted on the right

Commands:

1. Transfer 50 uL of sample from each column of the source plate into the corresponding columns of the destination deep well plate.
   Change tips for each transfer.
   </description>

<protocol>
# metadata
metadata = {
    'protocolName': 'Reagent Transfer',
    'author': 'chatGPT',
    'description': 'Transfer reagent',
    'apiLevel': '2.15'
}

def run(protocol): # labware
tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', 1)
source = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 4)
destination = protocol.load_labware('nest_96_wellplate_2ml_deep', 9)

    # pipettes
    p300m = protocol.load_instrument('p300_multi_gen2', mount="right", tip_racks=[tiprack])

    # parameters
    TRANSFER_VOL = 50
    SRC_COLS = source.columns()
    DEST_COLS = destination.columns()

    # commands
    p300m.transfer(TRANSFER_VOL, SRC_COLS, DEST_COLS, new_tip='always')

</protocol>

[2] Example
<description>
Metadata:

- Application: Reagent transfer
- Robot: OT-2
- API: 2.15

Labware:

- Source Labware 1: NEST 1 Well Reservoir 195 mL is positioned in slot 7
- Destination Labware 1: Corning 96 Well Plate 360 uL Flat is positioned in slot 1
- Destination Labware 2: Corning 96 Well Plate 360 uL Flat is positioned in slot 2
- Tiprack 1: Opentrons 96 Tip Rack 300 uL is positioned in slot 10

Pipette Mount:

- Left Mount: P300 Multi-Channel GEN2

Commands:

1. Using P300 Multi-channel pipette on the left mount, transfer 50 uL of reagent from first column in the source labware 1
   to all the columns in destination labware 1. Keep the same set of tips for this entire set of transfers within this step.
2. Using P300 Multi-channel pipette on the left mount, transfer 100 uL from first column in the source labware 1
   to each column in destination labware 2. Keep the same set of tips for this entire set of transfers within this step.
   </description>

<protocol>
from opentrons import protocol_api

# metadata

metadata = {
"protocolName": "Reagent Transfer protocol",
"author": "Opentrons Generative AI",
"description": "Transfer reagents from multile source labware to multiple destination labware",
"apiLevel": "2.15"
}

def run(protocol: protocol_api.ProtocolContext): # labware
source_1 = protocol.load_labware("nest_1_reservoir_195ml", location=7)
destination_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location=1)
destination_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location=2)

    tiprack300 = protocol.load_labware("opentrons_96_tiprack_300ul", location=10)

    # pipettes
    p300m = protocol.load_instrument("p300_multi_gen2", mount="left", tip_racks=[tiprack300])

    # wells setup
    source_wells_1 = source_1.columns()[0]
    destination_wells_1 = destination_1.columns()
    destination_wells_2 = destination_2.columns()

    # volumes setup
    transfer_vol_1 = 50
    transfer_vol_2 = 100

    p300m.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
    p300m.transfer(transfer_vol_2, source_wells_1, destination_wells_2, new_tip="once")

</protocol>

[3] Example
<description>

- Application: Reagent transfer
- Robot: OT-2
- API: 2.15

Labware:

- Source Labware: Thermo Scientific Nunc 96 Well Plate 2000 uL in slot 7
- Destination Labware: Opentrons 24 Well Aluminum Block with NEST 0.5 mL Screwcap in slot 3
- Tiprack: Opentrons 96 Filter Tip Rack 1000 uL in slot 4

Pipette mount:

- P1000 Single-Channel GEN2 is mounted on the left

Commands:

1. Using P1000 Single-Channel GEN2 pipette on left mount, transfer 195.0 uL of reagent
   from H10, F12, D7, B1, C8 wells in source labware
   to first well in the destination labware. Use a new tip for each transfer.
   </description>

<protocol>
metadata = {
    'protocolName': 'Reagent Transfer',
    'author': 'chatGPT',
    'description': 'P1000 Single-Channel GEN2 transfer 195.0 ul',
    'apiLevel': '2.15'
}

def run(protocol):

    # labware
    tiprack = protocol.load_labware('opentrons_96_filtertiprack_1000ul', 4)
    source = protocol.load_labware('thermoscientificnunc_96_wellplate_2000ul', 7)
    destination = protocol.load_labware('opentrons_24_aluminumblock_nest_0.5ml_screwcap', 3)

    # pipettes
    p1000s = protocol.load_instrument('p1000_single_gen2', mount="left", tip_racks=[tiprack])

    # parameters
    TRANSFER_VOL = 195.0
    SRC_WELLS = ['H10', 'F12', 'D7', 'B1', 'C8']
    DEST_WELL = destination.wells()[0]

    # commands
    for src in SRC_WELLS:
        p1000s.transfer(TRANSFER_VOL, source.wells_by_name()[src], DEST_WELL, new_tip="always")

</protocol>

[4] Example
<description>
Metadata and requirements:

- Application: Reagent transfer
- Robot: Flex
- API: 2.15

Labware:

- Source Labware 1: Corning 96 Well Plate 360 uL Flat is positioned in slot C1
- Source Labware 1: Corning 96 Well Plate 360 uL Flat is positioned in slot C2
- Destination Labware 1: Corning 96 Well Plate 360 uL Flat is positioned in slot D1
- Destination Labware 2: Corning 96 Well Plate 360 uL Flat is positioned in slot D2
- Tiprack 1: Opentrons Flex 96 Filter Tip Rack 200 uL is positioned in slot B2
- Tiprack 2: Opentrons Flex 96 Filter Tip Rack 50 uL is positioned in slot A2

Pipette Mount:

- Flex 1-Channel 1000 uL Pipette is mounted on the left side
- Flex 1-Channel 50 uL Pipette is mounted on the right side

Commands:

1. Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 50 uL from wells A1, A2 in source labware 1
   to B6, B7 in source labware 2. Reuse the same tip for each transfer.
2. Using Flex 1-Channel 50 uL Pipette on right mount, transfer 15 uL from wells C4, C6 in source labware 2
   to A3, A4 in source labware 1. Reuse the same tip for each transfer.
3. Using Flex 1-Channel 50 uL Pipette on right mount, transfer 10 uL from wells B6, B7 in source labware 2
   to A1, B1 in destination labware 1. Use a new tip each time for each transfer.
4. Using Flex 1-Channel 50 uL Pipette on right mount, transfer 10 uL from wells C4, C6 in source labware 2
   to A1, B1 in destination labware 2. Use a new tip each time for each transfer.
   </description>

<protocol>
from opentrons import protocol_api

# metadata

metadata = {
'protocolName': 'Reagent Transfer',
'author': 'Opentrons Generative AI',
}
requirements = {"robotType": "Flex", "apiLevel": "2.15"}

# protocol run function

def run(protocol: protocol_api.ProtocolContext):

    # labware
    source_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C1')
    source_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C2')
    destination_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='D1')
    destination_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='D2')
    tiprack200 = protocol.load_labware("opentrons_flex_96_filtertiprack_200ul", location='B2')
    tiprack50 = protocol.load_labware("opentrons_flex_96_filtertiprack_50ul", location='A2')

    # pipettes
    p1000s = protocol.load_instrument("flex_1channel_1000", mount="left", tip_racks=[tiprack200])
    p50s = protocol.load_instrument("flex_1channel_50", mount="right", tip_racks=[tiprack50])

    # well setup
    source_wells_1 = [source_1[wells] for wells in ['A1', 'A2']]
    source_wells_2 = [source_2[wells] for wells in ['C4', 'C6']]
    source_wells_3 = [source_2[wells] for wells in ['B6', 'B7']]
    source_wells_4 = [source_2[wells] for wells in ['C4', 'C6']]
    destination_wells_1 = [source_2[wells] for wells in ['B6', 'B7']]
    destination_wells_2 = [source_1[wells] for wells in ['A3', 'A4']]
    destination_wells_3 = [destination_1[wells] for wells in ['A1', 'B1']]
    destination_wells_4 = [destination_2[wells] for wells in ['A1', 'B1']]

    # volume setup
    transfer_vol_1 = 50
    transfer_vol_2 = 15
    transfer_vol_3 = 10
    transfer_vol_4 = 10

    # commands
    p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
    p50s.transfer(transfer_vol_2, source_wells_2, destination_wells_2, new_tip="once")
    p50s.transfer(transfer_vol_3, source_wells_3, destination_wells_3, new_tip="always")
    p50s.transfer(transfer_vol_4, source_wells_4, destination_wells_4, new_tip="always")

</protocol>

[5] Example
<description>
Metadata and requirements:

- Application: Reagent transfer
- Robot: Flex
- API: 2.15

Labware:

- Source Labware: Opentrons 96 Flat Bottom Adapter with NEST 96 Well Plate 200 uL Flat on slot D1
- Destination Labware: Opentrons 96 Flat Bottom Adapter with NEST 96 Well Plate 200 uL Flat on slot C2
- Tiprack: Opentrons Flex 96 Filter Tip Rack 50 uL on slot C1

Pipette Mount:

- Flex 8-Channel 50 uL Pipette is mounted on the right side

Commands:

1. Using Flex 8-Channel 50 uL Pipette on right mount, transfer 8 uL of reagent from 4, 3, 6, 1, 11 columns in source labware
   to 5, 9, 1, 10, 2 columns in the destination labware. Using the same tip for all transfers.
   </description>

<protocol>
from opentrons import protocol_api

metadata = {
'protocolName': 'Reagent Transfer',
'author': 'Opentrons Generative AI',
}

requirements = {"robotType": "Flex", "apiLevel": "2.15"}

def run(protocol: protocol_api.ProtocolContext):

    # labware
    tiprack = protocol.load_labware('opentrons_flex_96_filtertiprack_50ul', 'C1')
    source = protocol.load_labware('opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat', 'D1')
    destination = protocol.load_labware('opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat', 'C2')

    # pipettes
    p50m = protocol.load_instrument('flex_8channel_50', mount="right", tip_racks=[tiprack])

    # parameters
    transfer_vol = 8
    src_cols = [3, 2, 5, 0, 10]
    dest_cols = [4, 8, 0, 9, 1]

    # commands
    p50m.pick_up_tip()
    for src_col, dest_col in zip(src_cols, dest_cols):
        p50m.transfer(transfer_vol, source.columns()[src_col], destination.columns()[dest_col], new_tip="never")
    p50m.drop_tip()

</protocol>

[6] Example
<description>
Metadata:

- Author: Bob
- Protocol Name: PCR

Requirements:

- `requirements = {"robotType": "OT-2", "apiLevel": "2.15"}`

Modules:

- The thermocycler module is located in slot 7.
- The sample temperature module is positioned in slot 1.
- The mastermix temperature module is positioned in slot 3.

Labware:

- The source sample labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed on the temperature module in slot 1.
- The source mastermix labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed on the temperature module in slot 3.
- The destination labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed on the thermocycler module in slot 7.
- A 20 uL filter tip rack is used in slot 4.

Pipette Mount:

- A P20 Multi-Channel Gen2 pipette is mounted on the left side.

Well Allocation:

- Sample source wells: the first 64 wells column-wise in the sample source plate.
- Mastermix source wells: the first 64 wells column-wise in the mastermix plate.
- Destination wells: the first 64 wells column-wise in the thermocycler.

Commands:

1. Set the total number of samples to 64.
2. Open the thermocycler lid.
3. Set the thermocycler block temperature to 6C.
4. Set the thermocycler lid temperature to 55C.
5. Set the sample temperature module to 4C.
6. Set the mastermix temperature module to 10C.
7. Transfer 7 uL of mastermix from the mastermix source wells to the destination wells. Use the same pipette tip for all transfers.
8. Transfer 5 uL of the sample from the source to the destination. Mix the sample and mastermix for a total volume of 12 uL 9 times.
   Blow out to `destination well` after each transfer. Use a new tip for each transfer.
9. Close the thermocycler lid.
10. Execute the thermocycler with the following profile:
    - 74C for 65 seconds for 1 cycle, block max volume is sample and mastermix volume
11. Execute the thermocycler with the following profile:
    - 60C for 7 seconds, 84C for 19 seconds, 57C for 44 seconds for 13 cycles, block max volume is sample and mastermix volume
12. Execute the thermocycler with the following profile:
    - 75C for 480 seconds for 1 cycle, block max volume is sample and mastermix volume
13. Hold the thermocycler block at 4C.
14. Open the thermocycler lid.
15. Deactivate the mastermix temperature module.
16. Deactivate the sample temperature module.
    </description>

<protocol>
import math
from opentrons import protocol_api

metadata = {
'protocol_name': 'QIAGEN OneStep RT-PCR Kit PCR Amplification',
'author': 'chatGPT',
'description': 'Amplification using QIAGEN OneStep RT-PCR Kit with 13 cycles',
'apiLevel': '2.15'
}

def run(protocol: protocol_api.ProtocolContext): # Sample preparation parameters
number_of_samples = 64
sample_volume_ul = 5 # Volume in microliters
master_mix_volume_ul = 7 # Volume in microliters
mixing_cycles = 9
total_mix_volume_ul = sample_volume_ul + master_mix_volume_ul
master_mix_temperature_c = 10 # Temperature in Celsius
sample_temperature_c = 4 # Temperature in Celsius

    # Thermocycler parameters
    lid_temperature_c = 55  # Lid temperature in Celsius
    initial_plate_temperature_c = 6  # Initial plate temperature in Celsius
    hold_temperature_c = 4  # Hold temperature in Celsius for infinite hold

    # Modules loading
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')
    sample_temperature_module = protocol.load_module('temperature module gen2', 1)
    master_mix_temperature_module = protocol.load_module('temperature module gen2', 3)

    # Labware loading
    tips_20ul = protocol.load_labware('opentrons_96_filtertiprack_20ul', 4)
    pcr_plate = thermocycler_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    sample_plate = sample_temperature_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    master_mix_plate = master_mix_temperature_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')

    # Pipette loading
    multi_channel_pipette = protocol.load_instrument('p20_multi_gen2', 'left', tip_racks=[tips_20ul])

    # Well allocation
    number_of_columns = math.ceil(number_of_samples / 8)
    sample_source_wells = sample_plate.columns()[:number_of_columns]
    sample_destination_wells = pcr_plate.columns()[:number_of_columns]
    master_mix_source_wells = master_mix_plate.columns()[:number_of_columns]
    master_mix_destination_wells = pcr_plate.columns()[:number_of_columns]

    # Command 2: Open lid
    thermocycler_module.open_lid()

    # Command 3: Set initial plate temperature
    thermocycler_module.set_block_temperature(initial_plate_temperature_c)

    # Command 4: Set lid temperature
    thermocycler_module.set_lid_temperature(lid_temperature_c)

    # Command 5: Set sample temperature
    sample_temperature_module.set_temperature(sample_temperature_c)

    # Command 6: Set master mix temperature
    master_mix_temperature_module.set_temperature(master_mix_temperature_c)

    # Command 7: Transfer master mix to destination wells
    multi_channel_pipette.transfer(
        master_mix_volume_ul,
        master_mix_source_wells,
        master_mix_destination_wells,
        new_tip='once'
    )

    # Command 8: Transfer samples to destination wells and mix
    multi_channel_pipette.transfer(
        sample_volume_ul,
        sample_source_wells,
        sample_destination_wells,
        new_tip='always',
        mix_after=(mixing_cycles, total_mix_volume_ul),
        blow_out=True,
        blowout_location='destination well'
    )

    # Command 9: Close lid
    thermocycler_module.close_lid()

    # Commands 10-12: PCR cycling
    thermocycler_module.execute_profile(
        steps=[{'temperature': 74, 'hold_time_seconds': 65}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )
    thermocycler_module.execute_profile(
        steps=[
            {'temperature': temp, 'hold_time_seconds': duration}
            for temp, duration in zip([60, 84, 57], [7, 19, 44])
        ],
        repetitions=13,
        block_max_volume=total_mix_volume_ul
    )
    thermocycler_module.execute_profile(
        steps=[{'temperature': 75, 'hold_time_seconds': 480}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )

    # Command 13: Set final hold temperature
    thermocycler_module.set_block_temperature(hold_temperature_c)

    # Command 14: Open lid post-PCR
    thermocycler_module.open_lid()

    # Commands 15 & 16: Deactivate temperature modules
    master_mix_temperature_module.deactivate()
    sample_temperature_module.deactivate()

</protocol>

[7] Example
<description>
Metadata:

- Author: Bob
- ProtocolName: PCR

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.15"}

Modules:

- Thermocycler module GEN 2 is present on slot A1+B1
- Temperature module GEN 2 is placed on slot D1
- Mastermix temperature module GEN 2 is placed on slot D3

Adapter:

- Opentrons 96 Well Aluminum Block adapter is placed on the temperature module GEN 2
- Opentrons 96 Well Aluminum Block adapter is placed on the mastermix temperature module GEN 2

Labware:

- Source labware: `Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt` placed on the temperature module
- Source mastermix labware: `Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt` placed on temperature module
- Destination labware: `Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt`, placed on C3
- Load three `opentrons_flex_96_filtertiprack_50ul` tip racks on `opentrons_flex_96_tiprack_adapter` adapters in slots A2, B2, and C2

Pipette mount:

- `Flex 96-Channel 1000 uL Pipette` is mounted on the left side

Well Allocation:

- source well: A1 well of source labware
- destination well: A1 well of destination labware
- mastermix well: A1 well of mastermix labware

Commands:

1. Set the thermocycler block temperature to 22 C.
2. Open the thermocycler lid.
3. Set the thermocycler lid temperature to 95 C.
4. Set the temperature module to 37 C.
5. Set master mix temperature module to 10 C.
6. Transfer 20 uL of liquid from 5 mm below the top surface of mastermix well to 2 mm above the bottom of destination well. Use the same tip for each transfer.
7. Transfer 20 ul of liquid from 3 mm above the source well bottom to destination well 7 mm beneath the top surface. Flow rate is at half the default.
   Mix the sample and mastermix of 40 ul total volume 5 times. Remove the tip slowly out of the well at 5 mm/s speed. Use the same tip for each transfer.
8. Move the destination labware to the thermocycler using gripper.
9. Close the thermocycler lid.
10. Execute the thermocycle using the following profile:

- 74 degree C for 65 seconds for 1 cycle, block max volume is sample and mastermix volume

11. Execute the thermocycle using the following profile:

- 60 degree C for 7 seconds, 84 degree C for 19 seconds, 57 degree C for 44 seconds for 25 cycles, block max volume is sample and mastermix volume

12. Execute the thermocycle using the following profile:

- 75 degree C for 480 seconds for 1 cycle, block max volume is sample and mastermix volume

13. Hold thermocycler block at 4 C.
14. Open thermocycler lid.
15. Move the destination labware from thermocycler back to its original slot C3 using gripper.
16. Pause the protocol and tell the user to pick up the destination plate, seal it and refrigerate it at 4 C.
17. Deactivate the temperature modules.
18. Deactivate the mastermix temperature modules.
    </description>

<protocol>
from opentrons import protocol_api
metadata = {
    'protocol_name': 'PCR Amplification protocol',
    'author': 'Opentrons Generative AI',
    'description': 'PCR Amplification protocol with 25 cycles',
}

requirements = {"robotType": "Flex", "apiLevel": "2.15"}

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

## Common rules for transfer

================= COMMON RULES for TRANSFER =================

- when we allocate wells for source and destination, we need to pay attention to pipette type.
  For example, see the command below

```
Sample source wells: the first 64 well column-wise in the sample source plate.
```

- <Multi-channel> pipette (eg., Flex 8-Channel 1000 uL Pipette), given the number of wells
  we need to estimate the columns and use method `labware.columns()` to access the columns.
  For example,

```python
number_of_columns = math.ceil([number_of_samples] / 8)
source_wells = labware.columns()[:number_of_columns]
```

- <Single or one channel> pipette (eg., Flex 1-Channel 1000 uL Pipette),
  we use `labware.wells()`. For example,

```python
source_wells = labware.wells()[:[number_of_samples]]
```

- If prompt says row-wise, we need to use `rows()`
- If prompt does not mention column-wise, we use `wells()` since it is default.
- If the number of samples are not specified, then use all wells.

```python
source_wells = sample_plate.wells()
```

- If `blowout_location` location is mentioned explicitly, then incorporate to transfer method.
- Avoid using `for` with transfer
  the following is incorrect:

```python
source_columns = [source_labware.columns_by_name()[str(index)] for index in [3, 2, 5, 1, 10]]
destination_columns = [source_labware.columns_by_name()[str(index)] for index in [4, 8, 1, 9, 2]]

# Transfer reagents
for src, dest in zip(source_columns, destination_columns):
    pipette.transfer(14.0, src, dest, new_tip='always')
```

The correct:

```python
source_columns = [source_labware.columns_by_name()[str(index)] for index in [3, 2, 5, 1, 10]]
destination_columns = [source_labware.columns_by_name()[str(index)] for index in [4, 8, 1, 9, 2]]

# Transfer reagents
pipette.transfer(14.0, source_columns, destination_columns, new_tip='always')
```

## Other Examples with More Explanation

### First Example

**Description**

Write a protocol using the Opentrons Python Protocol API v2 for the OT-2 robot based on the following details:

**Labware:**

- **Source Labware:** `Opentrons 24 Tube Rack with NEST 1.5 mL Snapcap` placed in slot 3.
- **Destination Labware:** `Opentrons Tough 96 Well Plate 200 µL PCR Full Skirt` placed in slot 9.
- **Tip Rack:** `Opentrons OT-2 96 Tip Rack 20 µL` placed in slot 2.

**Pipette Mount:**

- A **P20 Single Channel** pipette is mounted on the **right** side.

**Commands:**

1. Using the P20 Single Channel pipette, **transfer 1 µL** of reagent from the **first tube (A1)** of the source rack to **each well** in the destination plate.
2. **Use the same tip** for each transfer (do not change tips between transfers).

**Protocol**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Reagent Transfer',
    'author': 'Your Name',
    'description': 'Transfer 1 µL of reagent from source tube A1 to all wells in the destination plate using the same tip.',
}
requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tiprack = protocol.load_labware('opentrons_96_tiprack_20ul', 2)
    source_rack = protocol.load_labware('opentrons_24_tuberack_nest_1.5ml_snapcap', 3)
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 9)

    # Load pipette
    p20 = protocol.load_instrument('p20_single_gen2', mount='right', tip_racks=[tiprack])

    # Define source and destination wells
    source_well = source_rack.wells_by_name()['A1']
    destination_wells = dest_plate.wells()

    # Perform transfer
    p20.transfer(
        1,  # Volume in µL
        source_well,  # Source well
        destination_wells,  # List of destination wells
        new_tip='once'  # Use the same tip for all transfers
    )
```

**Explanation:**

- **Labware Setup:**
  - **Tip Rack:** Loaded into slot 2 for the P20 pipette to pick up tips.
  - **Source Rack:** Contains the reagent in tube A1, placed in slot 3.
  - **Destination Plate:** The 96-well plate where the reagent will be dispensed, placed in slot 9.
- **Pipette Initialization:**
  - The P20 Single Channel pipette is initialized on the right mount with the specified tip rack.
- **Transfer Details:**
  - **Volume:** 1 µL is transferred from the source to each destination well.
  - **Source Well:** Tube A1 in the source rack.
  - **Destination Wells:** All wells in the 96-well plate.
  - **Tip Usage:** `new_tip='once'` ensures the same tip is used throughout the entire transfer process.
- **Method Used:**
  - The `transfer` method is used without any explicit loops because it inherently handles the iteration over the list of destination wells.

---

### Second Example

**Description**

Using a **Flex 1-Channel 1000 µL Pipette** mounted on the **left** side, transfer **150 µL** from wells **A1** and **A2** in **source labware 1** to wells **B6** and **B7** in **source labware 2**. **Use the same tip** for each transfer.

**Protocol**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Multiple Well Transfer',
    'author': 'Your Name',
    'description': 'Transfer 150 µL from specific source wells to specific destination wells using the same tip.',
}
requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    source_labware_1 = protocol.load_labware('source_labware_1_definition', slot=1)
    source_labware_2 = protocol.load_labware('source_labware_2_definition', slot=2)
    tiprack = protocol.load_labware('opentrons_96_tiprack_1000ul', slot=3)

    # Load pipette
    p1000 = protocol.load_instrument('flex_1channel_1000', mount='left', tip_racks=[tiprack])

    # Define source and destination wells
    source_wells = [source_labware_1.wells_by_name()[well] for well in ['A1', 'A2']]
    destination_wells = [source_labware_2.wells_by_name()[well] for well in ['B6', 'B7']]

    # Perform transfer
    p1000.transfer(
        150,  # Volume in µL
        source_wells,  # List of source wells
        destination_wells,  # List of destination wells
        new_tip='once'  # Use the same tip for all transfers
    )
```

**Explanation:**

- **Labware Setup:**
  - **Source Labware 1:** Contains the initial samples in wells A1 and A2, loaded into slot 1.
  - **Source Labware 2:** Will receive the transferred samples in wells B6 and B7, loaded into slot 2.
  - **Tip Rack:** Loaded into slot 3 for the pipette to pick up tips.
- **Pipette Initialization:**
  - The Flex 1-Channel 1000 µL pipette is initialized on the left mount with the specified tip rack.
- **Defining Wells:**
  - **Source Wells:** A list containing wells A1 and A2 from source labware 1.
  - **Destination Wells:** A list containing wells B6 and B7 from source labware 2.
- **Transfer Details:**
  - **Volume:** 150 µL is transferred from each source well to the corresponding destination well.
  - **Tip Usage:** `new_tip='once'` ensures the same tip is used for all transfers.
- **Method Used:**
  - The `transfer` method is used with lists of source and destination wells. This method pairs each source well with its corresponding destination well, eliminating the need for explicit loops.

**Note:** The use of a single `transfer` function with lists allows for multiple transfers in a streamlined manner.

---

By using the `transfer` method effectively, we can simplify the protocol code and make it more readable. The method automatically handles the pairing and iteration over wells, so explicit loops are unnecessary. Additionally, specifying `new_tip='once'` optimizes the protocol by reducing tip usage when appropriate.

## Best Practices for Optimizing the transfer Method in Pipetting Automation

1. **Optimizing `transfer` Usage Without Loops**

   - **Issue**: Using the `transfer` method inside a `for` loop is unnecessary because `transfer` can handle lists implicitly.
   - **Solution**: Remove the `for` loop and use the `transfer` method directly with lists for efficient code.

   **Example:**

   - _Inefficient Code (Excerpt-1):_

     ```python
     for source_well, destination_well in zip(source_wells, destination_wells):
         pipette.pick_up_tip()
         pipette.transfer(TRANSFER_VOL, source_well, destination_well, new_tip='never')
         pipette.drop_tip()
     ```

   - _Optimized Code (Excerpt-2):_
     ```python
     pipette.transfer(TRANSFER_VOL, source_wells, destination_wells, new_tip='always')
     ```

2. **Correct Use of `new_tip='once'`**

   - **Note**: When instructed to "Use the same tip for all transfers" or similar, avoid using `new_tip='once'` inside a `for` loop, as this is incorrect.
   - **Solution**: Use the `transfer` method without a `for` loop to ensure the same tip is used throughout.

   **Incorrect Usage:**

   ```python
   for src, dest in zip(source_columns, destination_columns):
       pipette.transfer(transfer_vol, src, dest, new_tip='once')
   ```

   **Correct Usage:**

   ```python
   pipette.transfer(transfer_vol, source_columns, destination_columns, new_tip='once')
   ```

3. **Importing Necessary Libraries**

   - **Reminder**: Always import necessary libraries, such as `math`, when using functions like `ceil` or other mathematical methods.

     ```python
     import math
     ```

4. **Using `columns` Method with Multi-Channel Pipettes**

   - **Guideline**: For multi-channel pipettes (e.g., P20 Multi-Channel Gen2), utilize the `columns` method to access labware columns effectively.

     **Example:**

     ```python
     source_columns = source_plate.columns()
     destination_columns = destination_plate.columns()
     ```

---

### Another Example

```python
"from opentrons import protocol_api

# metadata
metadata = {
    'protocolName': 'Reagent Transfer',
    'author': 'Opentrons Generative AI',
}

requirements = {"robotType": "Flex", "apiLevel": "2.19"}


def run(protocol: protocol_api.ProtocolContext):
    # labware
    source_labware_1 = [protocol.load_labware("corning_96_wellplate_360ul_flat", location=slot) for slot in ['D1', 'D2', 'D3']]
    source_labware_2 = protocol.load_labware("nest_1_reservoir_195ml", location='A1')
    destination = [protocol.load_labware("corning_96_wellplate_360ul_flat", location=slot) for slot in ['C1', 'C2', 'C3']]
    tiprack200 = [protocol.load_labware("opentrons_flex_96_filtertiprack_200ul", location=slot) for slot in ['B1', 'B2', 'B3']]
    tiprack50 = protocol.load_labware("opentrons_flex_96_filtertiprack_50ul", location='A2')

    # pipettes
    p50s = protocol.load_instrument("flex_1channel_50", mount="right", tip_racks=[tiprack50])
    p1000s = protocol.load_instrument("flex_1channel_1000", mount="left", tip_racks=[*tiprack200])
    # load trash bin
    trash = protocol.load_trash_bin('A3')

    # volumes setup
    transfer_vol_1 = 20
    transfer_vol_2 = 100

    # wells setup
    source_wells_1 = [src.wells() for src in source_labware_1]
    source_wells_2 = source_labware_2.wells_by_name()['A1']
    destination_wells_1 = [dest.wells() for dest in destination]

    # commands
    p50s.transfer(transfer_vol_1, source_wells_2, destination_wells_1, new_tip="once")
    p1000s.transfer(transfer_vol_2, source_wells_1, destination_wells_1, new_tip="always")
```

#### another example

```python
from opentrons import protocol_api

# metadata
metadata = {
    'protocolName': 'Reagent Transfer',
    'author': 'Opentrons Generative AI',
}

requirements = {"robotType": "Flex", "apiLevel": "2.19"}


def run(protocol: protocol_api.ProtocolContext):

    # labware
    source_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C1')
    source_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='C2')
    destination_1 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='D1')
    destination_2 = protocol.load_labware("corning_96_wellplate_360ul_flat", location='D2')
    tiprack200 = protocol.load_labware("opentrons_flex_96_filtertiprack_200ul", location='B2')
    tiprack50 = protocol.load_labware("opentrons_flex_96_filtertiprack_50ul", location='A2')

    # pipettes
    p1000s = protocol.load_instrument("flex_1channel_1000", mount="left", tip_racks=[tiprack200])
    p50s = protocol.load_instrument("flex_1channel_50", mount="right", tip_racks=[tiprack50])
    # load trash bin
    trash = protocol.load_trash_bin('A3')
    # volume setup
    transfer_vol_1 = 50
    transfer_vol_2 = 15
    transfer_vol_3 = 10
    transfer_vol_4 = 10

    # well setup
    source_wells_1 = [source_1.wells_by_name()[wells] for wells in ['A1', 'A2']]
    source_wells_2 = [source_2.wells_by_name()[wells] for wells in ['C4', 'C6']]
    source_wells_3 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]
    source_wells_4 = [source_2.wells_by_name()[wells] for wells in ['C4', 'C6']]
    destination_wells_1 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]
    destination_wells_2 = [source_1.wells_by_name()[wells] for wells in ['A3', 'A4']]
    destination_wells_3 = [destination_1.wells_by_name()[wells] for wells in ['A1', 'B1']]
    destination_wells_4 = [destination_2.wells_by_name()[wells] for wells in ['A1', 'B1']]

    # commands
    p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
    p50s.transfer(transfer_vol_2, source_wells_2, destination_wells_2, new_tip="once")
    p50s.transfer(transfer_vol_3, source_wells_3, destination_wells_3, new_tip="always")
    p50s.transfer(transfer_vol_4, source_wells_4, destination_wells_4, new_tip="always")
```

### pcr example

```python
import math
from opentrons import protocol_api

metadata = {
    'protocol_name': 'QIAGEN OneStep RT-PCR Kit PCR Amplification',
    'author': 'chatGPT',
    'description': 'Amplification using QIAGEN OneStep RT-PCR Kit with 13 cycles',
    'apiLevel': '2.16'
}


def run(protocol: protocol_api.ProtocolContext):
    # Sample preparation parameters
    number_of_samples = 64
    sample_volume_ul = 5  # Volume in microliters
    master_mix_volume_ul = 7  # Volume in microliters
    mixing_cycles = 9
    total_mix_volume_ul = sample_volume_ul + master_mix_volume_ul
    master_mix_temperature_c = 10  # Temperature in Celsius
    sample_temperature_c = 4  # Temperature in Celsius

    # Thermocycler parameters
    lid_temperature_c = 55  # Lid temperature in Celsius
    initial_plate_temperature_c = 6  # Initial plate temperature in Celsius
    hold_temperature_c = 4  # Hold temperature in Celsius for infinite hold

    # Modules loading
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')
    sample_temperature_module = protocol.load_module('temperature module gen2', 1)
    master_mix_temperature_module = protocol.load_module('temperature module gen2', 3)

    # Labware loading
    tips_20ul = protocol.load_labware('opentrons_96_filtertiprack_20ul', 4)
    pcr_plate = thermocycler_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    sample_plate = sample_temperature_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    master_mix_plate = master_mix_temperature_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')

    # Pipette loading
    multi_channel_pipette = protocol.load_instrument('p20_multi_gen2', 'left', tip_racks=[tips_20ul])

    # Well allocation
    number_of_columns = math.ceil(number_of_samples / 8)
    sample_source_wells = sample_plate.columns()[:number_of_columns]
    sample_destination_wells = pcr_plate.columns()[:number_of_columns]
    master_mix_source_wells = master_mix_plate.columns()[:number_of_columns]
    master_mix_destination_wells = pcr_plate.columns()[:number_of_columns]

    # Command 2: Open lid
    thermocycler_module.open_lid()

    # Command 3: Set initial plate temperature
    thermocycler_module.set_block_temperature(initial_plate_temperature_c)

    # Command 4: Set lid temperature
    thermocycler_module.set_lid_temperature(lid_temperature_c)

    # Command 5: Set sample temperature
    sample_temperature_module.set_temperature(sample_temperature_c)

    # Command 6: Set master mix temperature
    master_mix_temperature_module.set_temperature(master_mix_temperature_c)

    # Command 7: Transfer master mix to destination wells
    multi_channel_pipette.transfer(
        master_mix_volume_ul,
        master_mix_source_wells,
        master_mix_destination_wells,
        new_tip='once'
    )

    # Command 8: Transfer samples to destination wells and mix
    multi_channel_pipette.transfer(
        sample_volume_ul,
        sample_source_wells,
        sample_destination_wells,
        new_tip='always',
        mix_after=(mixing_cycles, total_mix_volume_ul),
        blow_out=True,
        blowout_location='destination well'
    )

    # Command 9: Close lid
    thermocycler_module.close_lid()

    # Commands 10-12: PCR cycling
    thermocycler_module.execute_profile(
        steps=[{'temperature': 74, 'hold_time_seconds': 65}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )
    thermocycler_module.execute_profile(
        steps=[
            {'temperature': temp, 'hold_time_seconds': duration}
            for temp, duration in zip([60, 84, 57], [7, 19, 44])
        ],
        repetitions=13,
        block_max_volume=total_mix_volume_ul
    )
    thermocycler_module.execute_profile(
        steps=[{'temperature': 75, 'hold_time_seconds': 480}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )

    # Command 13: Set final hold temperature
    thermocycler_module.set_block_temperature(hold_temperature_c)

    # Command 14: Open lid post-PCR
    thermocycler_module.open_lid()

    # Commands 15 & 16: Deactivate temperature modules
    master_mix_temperature_module.deactivate()
    sample_temperature_module.deactivate()

```

### Liquid transfer with Heater Shaker module

<description>
Write a protocol using the Opentrons Python Protocol API v2.19 for Opentrons Flex robot for the following description:

Metadata:

- Author: User
- ProtocolName: Liquid Transfer with Heater Shaker
- Description: Transfer liquids between reservoir, PCR plate, and heater shaker module's plate.

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.19"}

Labware:

- Trash: Load a trash bin in slot A3
- Heater Shaker Module: Load in slot D1 with a Corning 96 Well Plate 360 µL Flat
- Reservoir: NEST 1 Well Reservoir 195 mL in slot C1
- PCR Plate: NEST 96 Well Plate 200 µL Flat in slot D2
- Tipracks:
  - Opentrons Flex 96 Tiprack 200 µL in slot A2
  - Opentrons Flex 96 Tiprack 1000 µL in slot B2
  - Opentrons Flex 96 Tiprack 50 µL in slot C2
    All tipracks should use the Opentrons Flex 96 Tiprack Adapter

Pipette:

- Flex 96-Channel 1000 µL pipette mounted on the left

Steps:

1. Open the Heater Shaker Module's labware latch
2. Pause the protocol and prompt the user to load the Corning 96 well plate
3. Close the Heater Shaker Module's labware latch
4. Using the 96-channel pipette with 200 µL tips, transfer 70 µL from the reservoir (A1) to the Heater Shaker plate (A1)
5. Using the 96-channel pipette with 50 µL tips, transfer 10 µL from the PCR plate (A1) to the Heater Shaker plate (A1)
6. Shake the plate on the Heater Shaker Module at 2000 rpm for 1 minute
7. Deactivate the shaker

Notes:

- Use new tips for each transfer
- The protocol includes comments and pauses for user interaction
  </description>

<protocol>

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Liquid Transfer with Heater Shaker',
    'author': 'User',
    'description': 'Transfer liquids between reservoir, PCR plate, and heater shaker module\'s plate.'
}

requirements = {
    'robotType': 'Flex',
    'apiLevel': '2.19'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load trash bin
    trash = protocol.load_trash_bin('A3')

    # Load modules
    heater_shaker = protocol.load_module('heaterShakerModuleV1', 'D1')

    # Load labware
    heater_shaker_plate = heater_shaker.load_labware('corning_96_wellplate_360ul_flat')
    reservoir = protocol.load_labware('nest_1_reservoir_195ml', 'C1')
    pcr_plate = protocol.load_labware('nest_96_wellplate_200ul_flat', 'D2')

    # Load tipracks with adapters
    tiprack_200 = protocol.load_labware('opentrons_flex_96_tiprack_200ul', 'A2', adapter='opentrons_flex_96_tiprack_adapter')
    tiprack_1000 = protocol.load_labware('opentrons_flex_96_tiprack_1000ul', 'B2', adapter='opentrons_flex_96_tiprack_adapter')
    tiprack_50 = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'C2', adapter='opentrons_flex_96_tiprack_adapter')

    # Load pipette
    pipette = protocol.load_instrument('flex_96channel_1000', 'left', tip_racks=[tiprack_200, tiprack_1000, tiprack_50])

    # Protocol steps
    # 1. Open the Heater Shaker Module's labware latch
    heater_shaker.open_labware_latch()

    # 2. Pause for user to load the plate
    protocol.pause('Please load the Corning 96 well plate onto the Heater Shaker Module and resume the protocol.')

    # 3. Close the Heater Shaker Module's labware latch
    heater_shaker.close_labware_latch()

    # 4. Transfer 70 µL from reservoir to Heater Shaker plate
    pipette.transfer(70, reservoir['A1'], heater_shaker_plate['A1'], new_tip='always')

    # 5. Transfer 10 µL from PCR plate to Heater Shaker plate
    pipette.transfer(10, pcr_plate['A1'], heater_shaker_plate['A1'], new_tip='always')

    # 6. Shake the plate
    heater_shaker.set_and_wait_for_shake_speed(rpm=2000)
    protocol.delay(minutes=1)

    # 7. Deactivate the shaker
    heater_shaker.deactivate_shaker()
```

</protocol>
