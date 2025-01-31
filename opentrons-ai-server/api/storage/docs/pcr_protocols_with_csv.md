# PCR protocol examples

## 1. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the OT-2 robot according to the following description:

Requirements:

- requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

Modules:

- Temperature module GEN2 for samples in slot 1
- Temperature module GEN2 for mastermix in slot 3

Labware:

- Sample source: Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt on sample temperature module
- Mastermix source: Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt on mastermix temperature module
- Destination: Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt in slot 7
- Tips: Opentrons 96 Filter Tip Rack 20 uL in slot 4

Pipette:

- Left mount: P20 Multi-Channel Gen2

Sample Setup:

- Number of samples: 64 (8 columns)
- Well allocation: First 64 wells (column-wise) in all plates

Temperature Settings:

- Sample temperature: 4C
- Mastermix temperature: 10C

Protocol Steps:

1. Set temperature modules to specified temperatures
2. Transfer 7 uL mastermix to destination wells (reuse tip)
3. Transfer 5 uL sample to destination wells, mix 9 times with 12 uL total volume
   (use new tip for each transfer, blow out to destination well)
4. Deactivate both temperature modules
   </description>

<protocol>

```python
from opentrons import protocol_api

requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Module loading
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
```

</protocol>

## 2. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for OT-2 robot according to the following description:

Requirements:

- requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

Module:

- Temperature module GEN2 on slot 1

Labware:

- Sample Source: Opentrons 24 Well Aluminum Block with NEST 1.5 mL Snapcap on temperature module
- Mastermix Source: Opentrons 24 Tube Rack with NEST 1.5 mL Snapcap on slot 3
- Destination: Opentrons 96 Well Plate 200 uL PCR Full Skirt on slot 7
- Tips: Opentrons 96 Filter Tip Rack 20 uL on slot 4

Pipette:

- Right mount: P20 Single Channel GEN2

Sample Setup:

- Number of samples: 24
- Well allocation: First 24 wells (column-wise) in all plates

Protocol Steps:

1. Set temperature module to 4°C
2. Transfer 8 uL mastermix to destination wells (reuse same tip)
3. Transfer 7 uL sample to destination wells, mix 4 times with 15 uL total volume
   (use new tip for each transfer, blow out to destination well)
4. Deactivate temperature module
   </description>

<protocol>

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'OT-2',
    'apiLevel': '2.19'
}

def run(protocol: protocol_api.ProtocolContext):

    # Protocol parameters
    num_samples = 24
    sample_vol = 7  # uL
    mastermix_vol = 8  # uL
    mix_cycles = 4
    total_vol = sample_vol + mastermix_vol  # 15 uL total
    temp_celsius = 4

    # Load temperature module
    temp_module = protocol.load_module('temperature module gen2', 1)

    # Load labware
    source_samples = temp_module.load_labware('opentrons_24_aluminumblock_nest_1.5ml_snapcap')
    source_mastermix = protocol.load_labware('opentrons_24_tuberack_nest_1.5ml_snapcap', 3)
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 7)
    tiprack = protocol.load_labware('opentrons_96_filtertiprack_20ul', 4)

    # Load pipette
    p20_single = protocol.load_instrument('p20_single_gen2', 'right', tip_racks=[tiprack])

    # Define wells
    sample_wells = source_samples.wells()[:num_samples]
    mastermix_wells = source_mastermix.wells()[:num_samples]
    dest_wells = dest_plate.wells()[:num_samples]

    # Set temperature
    temp_module.set_temperature(temp_celsius)

    # Transfer mastermix
    p20_single.transfer(
        mastermix_vol,
        mastermix_wells,
        dest_wells,
        new_tip='once'
    )

    # Transfer samples and mix
    p20_single.transfer(
        sample_vol,
        sample_wells,
        dest_wells,
        mix_after=(mix_cycles, total_vol),
        blow_out=True,
        blowout_location='destination well',
        new_tip='always'
    )

    # Deactivate temperature module
    temp_module.deactivate()
```

</protocol>

## 3. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for Flex robot according to the following description:

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.19"}

Temperature Modules:

- Sample module: Temperature Module GEN2 on slot D1
- Mastermix module: Temperature Module GEN2 on slot D3

Module Adapters:

- Opentrons 96 Well Aluminum Block on both temperature modules

Labware:

1. Source Plates:
   - Sample plate: Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt on sample module
   - Mastermix plate: Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt on mastermix module
2. Destination:
   - Opentrons 96 Tough Well Plate 200 uL PCR Full Skirt on slot A1
3. Tips:
   - Opentrons Flex 96 Filter Tip Rack 1000 uL on slots C1 and C2

Pipettes:

- Left mount: Flex 8-Channel 1000 uL
- Right mount: Flex 8-Channel 50 uL

Sample Setup:

- Total samples: 72
- Well usage: First 72 wells (column-wise) in all plates

Protocol Steps:

1. Temperature Setup:
   a. Set sample module to 37°C
   b. Set mastermix module to 4°C

2. Mastermix Transfer:

   - Transfer 15 uL mastermix from source to destination wells
   - Use the same tip for all transfers

3. Sample Transfer:

   - Transfer 10 uL sample from source to destination wells
   - Mix 9 times with 25 uL total volume after each transfer
   - Use a new tip for each transfer
   - Blow out to destination well after each transfer

4. Module Shutdown:
   a. Deactivate mastermix temperature module
   b. Deactivate sample temperature module
   </description>

<protocol>

```python
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Trash
    trash = protocol.load_trash_bin("A3")

    # Protocol parameters
    num_samples = 72
    mastermix_vol = 15  # uL
    sample_vol = 10  # uL
    mix_cycles = 9
    total_vol = mastermix_vol + sample_vol

    # Temperature settings
    temp_mastermix = 4  # C
    temp_sample = 37  # C

    # Load temperature modules
    temp_mod_sample = protocol.load_module('temperature module gen2', 'D1')
    temp_mod_mastermix = protocol.load_module('temperature module gen2', 'D3')

    # Load module adapters
    block_sample = temp_mod_sample.load_adapter('opentrons_96_well_aluminum_block')
    block_mastermix = temp_mod_mastermix.load_adapter('opentrons_96_well_aluminum_block')

    # Load labware
    plate_sample = block_sample.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    plate_mastermix = block_mastermix.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    plate_dest = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'A1')

    # Load tip racks
    tips_1000 = protocol.load_labware('opentrons_flex_96_filtertiprack_1000ul', 'C1')
    tips_50 = protocol.load_labware('opentrons_flex_96_filtertiprack_1000ul', 'C2')

    # Load pipettes
    p50_multi = protocol.load_instrument('flex_8channel_50', 'right', tip_racks=[tips_50])
    p1000_multi = protocol.load_instrument('flex_8channel_1000', 'left', tip_racks=[tips_1000])

    # Set up well arrays
    source_mastermix = plate_mastermix.columns()[:num_samples//8]
    source_sample = plate_sample.columns()[:num_samples//8]
    wells_dest = plate_dest.columns()[:num_samples//8]

    # Step 1: Set temperatures
    temp_mod_sample.set_temperature(temp_sample)
    temp_mod_mastermix.set_temperature(temp_mastermix)

    # Step 2: Transfer mastermix
    p50_multi.transfer(
        mastermix_vol,
        source_mastermix,
        wells_dest,
        new_tip='once'
    )

    # Step 3: Transfer samples
    p1000_multi.transfer(
        sample_vol,
        source_sample,
        wells_dest,
        new_tip='always',
        mix_after=(mix_cycles, total_vol),
        blow_out=True,
        blowout_location='destination well'
    )

    # Step 4: Deactivate modules
    temp_mod_mastermix.deactivate()
    temp_mod_sample.deactivate()
```

</protocol>

## 4. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the Flex robot according to the following description:

Requirements:

- `requirements = {"robotType": "Flex", "apiLevel": "2.19"}`

Modules:

- No modules

Labware:

- The source sample labware, a Biorad 96 well plate 200ul full skirt, is placed in slot D1.
- The source mastermix labware, an opentrons 24 tuberack nest 2ml snap cap, is placed on slot C1.
- The destination labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed in slot B1.
- A 50 uL filter tip rack is used in slot A1.
- A 50 uL filter tip rack is used in slot A2.

Pipette Mount:

- Flex 1-Channel 50 uL Pipette is mounted on the right side
- Flex 8-Channel 50 uL Pipette is mounted on the left side

Well Allocation:

- For mastermix, the csv provided has source tube in the first column, and destination well in the second column.
- The number of sample columns is 3.

Commands:

- Using the single-chaneel pipette, for each row in the csv, aspirate 7ul of mastermix from the source tube in the tube rack (left column of csv) to the destination well (right column of csv) in the destination plate. Use one tip per mastermix tube.
- Using the multi-channel pipette, transfer 5ul of sample from the sample plate to the destination plate, column for column, up to the number of samples specified. Grab new tips for each column.

</description>

<protocol>

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'Flex',
    'apiLevel': '2.19'
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
    num_col = 3

    # Load labware
    mmx_tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dna_plate = protocol.load_labware('biorad_96_wellplate_200ul_pcr', 'D1')
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'B1')

    tiprack_single = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A1')
    tiprack_multi = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A2')

    # Load pipettes
    single_pip = protocol.load_instrument("flex_1channel_50", 'right', tip_racks=[tiprack_single])
    multi_pip = protocol.load_instrument("flex_8channel_50", 'left', tip_racks=[tiprack_multi])

    # Trash
    trash = protocol.load_trash_bin("A3")

    # 1. Transfer mastermix
    for source_tube, dest_well in csv_lines:
        single_pip.pick_up_tip()
        single_pip.transfer(7, source=mmx_tuberack[source_tube], dest=dest_plate[dest_well], new_tip='never')
        single_pip.drop_tip()

    # 2. Transfer sample
    for s, d in zip(dna_plate.rows()[0][:num_col], dest_plate.rows()[0][:num_col]):
        multi_pip.pick_up_tip()
        multi_pip.transfer(5, source=s, dest=d, new_tip='never')
        multi_pip.drop_tip()

```

</protocol>

## 5. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the Flex robot according to the following description:

Requirements:

- `requirements = {"robotType": "Flex", "apiLevel": "2.19"}`

Modules:

- Thermocycler module

Labware:

- The source sample labware, an biorad_96_wellplate_200ul_pcr, is placed in slot D1.
- The source mastermix labware, an opentrons 24 tuberack nest 2ml snap cap, is placed on slot C1.
- The destination labware, an opentrons_96_aluminumblock_nest_wellplate_100ul, is placed in thermocycler.
- A 50uL tip rack for the single channel pipette is in A2
- A 50uL tip rack for the single channel pipette is in B2

Pipette Mount:

- Flex 1-Channel 50 uL Pipette is mounted on the right side
- Flex 8-Channel 50 uL Pipette is mounted on the left side

Well Allocation:

- For mastermix, the csv provided has source tube in the first column, and destination well in the second column.
- The number of columns is 3.

Commands:

- Open the thermocycler lid.
- Set the thermocycler block temperature to 6C.
- Set the thermocycler lid temperature to 55C.
- For each row in the csv, aspirate 7ul of mastermix from the source tube in the tube rack (left column of csv) to the destination well (right column of csv) in the destination plate. Use one tip per mastermix tube.
- Using the multi-channel pipette, transfer 5ul of sample from the sample plate to the destination plate, column for column, up to the number of samples specified.
- Close the thermocycler lid.
- Execute the thermocycler with the following profile:
  - 74C for 65 seconds for 1 cycle, block max volume is sample and mastermix volume
- Execute the thermocycler with the following profile for 13 cycles:
  - 60C for 7 seconds,
  - 84C for 19 seconds,
  - 57C for 44 seconds,
    block max volume is sample and mastermix volume.
- Execute the thermocycler with the following profile:
  - 75C for 480 seconds for 1 cycle, block max volume is sample and mastermix volume
- Hold the thermocycler block at 4C.
- Open the thermocycler lid.
  </description>

<protocol>

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'Flex',
    'apiLevel': '2.19'
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

    num_col = 3
    sample_volume_ul = 5  # in microliters
    master_mix_volume_ul = 7  # in microliters
    total_mix_volume_ul = sample_volume_ul + sample_volume_ul

    # Thermocycler parameters
    lid_temperature_c = 55  # in Celsius
    initial_plate_temperature_c = 6  # in Celsius
    hold_temperature_c = 4  # in Celsius

    # Module
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')

    # Labware setup
    mmx_tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dna_plate = protocol.load_labware('biorad_96_wellplate_200ul_pcr', 'D1')
    dest_plate = thermocycler_module.load_labware('opentrons_96_aluminumblock_nest_wellplate_100ul')

    # Tip racks
    tiprack_for_single = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A2')
    tiprack_for_multi = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'B2')

    # Load pipettes
    single_pip = protocol.load_instrument("flex_1channel_50", 'right', tip_racks=[tiprack_for_single])
    multi_pip = protocol.load_instrument("flex_8channel_50", 'left', tip_racks=[tiprack_for_multi])

    # Trash
    trash = protocol.load_trash_bin("A3")

    # Open lid, set temperatures
    thermocycler_module.open_lid()
    thermocycler_module.set_block_temperature(initial_plate_temperature_c)
    thermocycler_module.set_lid_temperature(lid_temperature_c)

    # Transfer mastermix
    for source_tube, dest_well in csv_lines:
        single_pip.pick_up_tip()
        single_pip.transfer(master_mix_volume_ul, mmx_tuberack[source_tube], dest_plate[dest_well], new_tip='never')
        single_pip.drop_tip()

    # Transfer samples
    for s, d in zip(dna_plate.rows()[0][:num_col], dest_plate.rows()[0][:num_col]):
        multi_pip.pick_up_tip()
        multi_pip.transfer(sample_volume_ul, s, d, new_tip='never')
        multi_pip.drop_tip()

    # PCR cycling
    thermocycler_module.close_lid()
    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 74, 'hold_time_seconds': 65}
        ],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 60, 'hold_time_seconds': 7},
            {'temperature': 84, 'hold_time_seconds': 19},
            {'temperature': 57, 'hold_time_seconds': 44}
        ],
        repetitions=13,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[{'temperature': 75, 'hold_time_seconds': 480}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )
    # Thermo set temperature, open lid
    thermocycler_module.set_block_temperature(hold_temperature_c)
    thermocycler_module.open_lid()

```

</protocol>

## 6. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the Flex robot according to the following description:

Requirements:

- `requirements = {"robotType": "Flex", "apiLevel": "2.15"}`

Modules:

- The thermocycler module

Labware:

- The source sample labware, an biorad_96_wellplate_200ul_pcr, is placed in slot D3.
- The source mastermix labware, an opentrons 24 tuberack nest 2ml snap cap, is placed on slot C1.
- The destination labware, an opentrons_96_aluminumblock_nest_wellplate_100ul, is placed in thermocycler.
- A 50uL tip rack for the single channel pipette is in A2
- A 50uL tip rack for the single channel pipette is in B2

Pipette Mount:

- Flex 1-Channel 50 uL Pipette is mounted on the right side
- Flex 8-Channel 50 uL Pipette is mounted on the left side

Well Allocation:

- The number of sample columns is 3.
- For mastermix, the csv provided has source tube in the first column, and destination well in the second column.
  The mastermix volume for each destination well is also provided in each row of the csv, and is in the 3rd column.

Commands:

- Open the thermocycler lid.
- Set the thermocycler block temperature to 6C.
- Set the thermocycler lid temperature to 55C.
- For each row in the csv, there is the source tube, destination well, and transfer volume. Transfer the volume specified in the csv (3rd column of csv) of mastermix from the source tube in the tube rack (first column of csv)
  to the destination well (second column of csv) in the destination plate. Use one tip per mastermix tube.
- Using the multi-channel pipette, aspirate 5ul of sample from the sample plate to the destination plate, column for column, up to the number of columns specified.
- Close the thermocycler lid.
- Execute the thermocycler with the following profile:
  - 74C for 65 seconds for 1 cycle, block max volume is sample and mastermix volume
- Execute the thermocycler with the following profile:
  - 60C for 7 seconds,
  - 84C for 19 seconds,
  - 57C for 44 seconds for 13 cycles,  
    block max volume is sample and mastermix volume
- Execute the thermocycler with the following profile:
  - 75C for 480 seconds for 1 cycle, block max volume is sample and mastermix volume
- Hold the thermocycler block at 4C.
- Open the thermocycler lid.

</description>

<protocol>

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'Flex',
    'apiLevel': '2.15'
}


def run(protocol: protocol_api.ProtocolContext):

    csv_samp = """
        Primer Tube,Destination well,Transfer volume
        A1,A1,4
        B1,B1,4
        C1,C1,4
        D1,D1,4
        A2,E1,4
        B2,F1,4
        C2,G1,5
        D2,H1,5
        A3,A2,5
        B3,B2,5
        C3,C2,5
        D3,D2,5
        A4,E2,7
        B4,F2,7
        C4,G2,7
        D4,H2,7
        A5,A3,7
        B5,B3,3
        C5,C3,3
        D5,D3,4
        A6,E3,2
        B6,F3,8
        C6,G3,5
        D6,H3,20
    """
    # Convert to list
    csv_lines = [[val.strip() for val in line.split(',')]
                 for line in csv_samp.splitlines()
                 if line.split(',')[0].strip()][1:]
    num_col = 3
    sample_temperature_c = 4  # Temperature in Celsius
    sample_volume_ul = 5  # Volume in microliters
    total_mix_volume_ul = 10

    # Thermocycler parameters
    lid_temperature_c = 55  # Celsius
    initial_plate_temperature_c = 6  # in Celsius
    hold_temperature_c = 4  # in Celsius

    # Module
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')

    # Labware setup
    tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dna_plate = protocol.load_labware('biorad_96_wellplate_200ul_pcr', 'D3')
    dest_plate = thermocycler_module.load_labware('opentrons_96_aluminumblock_nest_wellplate_100ul')

    # Tip racks
    tiprack_for_single = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A2')
    tiprack_for_multi = protocol.load_labware('opentrons_flex_96_tiprack_50ul', "B2")

    # Load pipette
    single_pip = protocol.load_instrument("flex_1channel_50", 'right', tip_racks=[tiprack_for_single])
    multi_pip = protocol.load_instrument("flex_8channel_50", 'left', tip_racks=[tiprack_for_multi])

    thermocycler_module.open_lid()
    thermocycler_module.set_block_temperature(initial_plate_temperature_c)
    thermocycler_module.set_lid_temperature(lid_temperature_c)
    for source_tube, dest_well, transfer_vol in csv_lines:
        single_pip.pick_up_tip()
        single_pip.transfer(int(transfer_vol), tuberack[source_tube], dest_plate[dest_well], new_tip='never')
        single_pip.drop_tip()

    for s, d in zip(dna_plate.rows()[0][:num_col], dest_plate.rows()[0][:num_col]):
        multi_pip.pick_up_tip()
        multi_pip.transfer(sample_volume_ul, s, d, new_tip='never')
        multi_pip.drop_tip()

    # PCR cycling
    thermocycler_module.close_lid()
    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 74, 'hold_time_seconds': 65}
        ],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[
            {'temperature': 60, 'hold_time_seconds': 7},
            {'temperature': 84, 'hold_time_seconds': 19},
            {'temperature': 57, 'hold_time_seconds': 44}
        ],
        repetitions=13,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.execute_profile(
        steps=[{'temperature': 75, 'hold_time_seconds': 480}],
        repetitions=1,
        block_max_volume=total_mix_volume_ul
    )

    thermocycler_module.set_block_temperature(hold_temperature_c)
    thermocycler_module.open_lid()

```

</protocol>

## 7. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the Flex robot according to the following description:

Requirements:

- `requirements = {"robotType": "Flex", "apiLevel": "2.15"}`

Modules:

- No modules

Labware:

- The source sample labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed in slot D3.
- The source mastermix labware, an opentrons 24 tuberack nest 2ml snap cap, is placed on slot C1.
- The destination labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed in slot B1.
- Tiprack 1: opentrons_flex_96_tiprack_50ul is in A2
- Tiprack 2: opentrons_flex_96_tiprack_50ul is in B2

Pipette Mount:

- Flex 1-Channel 50 uL Pipette is mounted on the right side
- Flex 8-Channel 50 uL Pipette is mounted on the left side

Well Allocation:

- For mastermix, the csv provided has source tube in the first column, and destination well in the second column.
- 3 columns of samples.

Commands:

- For each row in the csv, transfer 7ul of mastermix from the source tube in the tube rack (left column of csv) to the destination well (right column of csv) in the destination plate. Use one tip per mastermix tube.
- For each column in the source plate, we are going to the destination plate in duplicate, changing tips between each column. For example, using the multi-channel pipette, transfer 3ul of sample from the sample plate column 1 to the destination plate plate column 1, change tip, then aspirate from sample plate column 1 to destination plate column 2. Then, transfer 3ul of sample from the sample plate column 2 to the destination plate plate column 3, change tip, then transfer from sample plate column 2 to destination plate column 4. Repeat this pattern for the remainder of the source columns

</description>

<protocol>

```python
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
    # Convert to nested list
    csv_lines = [[val.strip() for val in line.split(',')]
                 for line in csv_samp.splitlines()
                 if line.split(',')[0].strip()][1:]

    NUM_COL = 3
    STRIDE = 2

    # Load labware
    tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dna_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'D3')
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 'B1')

    tiprack_single = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'A2')
    tiprack_multi = protocol.load_labware('opentrons_flex_96_tiprack_50ul', 'B2')

    # Load pipette
    single_pip = protocol.load_instrument("flex_1channel_50", 'right', tip_racks=[tiprack_single])
    multi_pip = protocol.load_instrument("flex_8channel_50", 'left', tip_racks=[tiprack_multi])

    # Transfer mastermix
    for source_tube, dest_well in csv_lines:
        single_pip.pick_up_tip()
        single_pip.transfer(7, tuberack[source_tube], dest_plate[dest_well], new_tip='never')
        single_pip.drop_tip()

    # transfer in duplicate
    col_ctr = 0
    for s in dna_plate.rows()[0][:NUM_COL]:
        multi_pip.pick_up_tip()
        multi_pip.transfer(3, s, dest_plate.rows()[0][col_ctr], new_tip='never')
        multi_pip.drop_tip()

        multi_pip.pick_up_tip()
        multi_pip.transfer(3, s, dest_plate.rows()[0][col_ctr+1], new_tip='never')
        multi_pip.drop_tip()

        col_ctr += STRIDE

```

</protocol>

## 8. PCR protocol

<description>
Write a protocol using the Opentrons Python Protocol API v2 for the Flex robot according to the following description:

Requirements:

- `requirements = {"robotType": "Flex", "apiLevel": "2.15"}`

Modules:

- No modules

Labware:

- The source sample labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed in slot D3.
- The source mastermix labware, an opentrons 24 tuberack nest 2ml snap cap, is placed on slot C1.
- The destination labware, an Opentrons Tough 96 Well Plate 200 uL PCR Full Skirt, is placed in slot D1.
- Tiprack in A2: opentrons_flex_96_tiprack_50ul
- Tiprack in B2: opentrons_flex_96_tiprack_50ul

Pipette Mount:

- Flex 1-Channel 50 uL Pipette is mounted on the right side
- Flex 8-Channel 50 uL Pipette is mounted on the left side

Well Allocation:

- For mastermix, the csv provided has source tube in the first column, and destination well in the second column.
- 3 columns of samples.

Commands:

- For each row in the csv, aspirate 7 ul of mastermix from the source tube in the tube rack (left column of csv) to the destination well (right column of csv) in the destination plate. Use one tip per mastermix tube.
- For each column in the source plate, we are going to the destination plate in triplicate, changing tips between each column. For example, using the multi-channel pipette,
  transfer 3 ul of sample from the sample plate column 1 to the destination plate plate column 1, change tip, then aspirate from sample plate column 1 to destination plate column 2, change tip, then aspirate form sample plate column 1 to destination plate column 3. Repeat this pattern for the remainder of the source columns

</description>

<protocol>

```python
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
```

</protocol>
