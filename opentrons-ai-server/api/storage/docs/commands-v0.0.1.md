####

Note when working with temperature module
PCR plate does not go directly on the module. We need thermal adapter.
Temperature Module White Paper suggests using the "PCR block" and a water.

Hence the following pattern:

```python
temp_module = protocol.load_module('temperature module gen2', 1)
adapter = temp_module.load_adapter("opentrons_96_well_aluminum_block")
plate = adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
```

####

A good example of using a `transfer` method:
The following is correct:

```python
p1000s.transfer(transfer_vol, src, dest_wells, new_tip='always')
```

The following is incorrect:

```python
for src in src_wells:
    p1000s.transfer(transfer_vol, src, dest_wells, new_tip='always')
```

Note that `transfer` function uses `for` operator implicitly.

####

Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 50 uL from wells A1, A2 in source labware 1
to B6, B7 in source labware 2. Reuse the same tip for each transfer.

The following is correct:

```python
transfer_vol_1 = 50 # setup volume

source_wells_1 = [source_1.wells_by_name()[wells] for wells in ['A1', 'A2']] # source setup wells
destination_wells_1 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']] # destination setup wells

p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once") # transfer function without any loop
```

The following is not correct since it calls transfer function twice rather than once:

```python
p300_single.transfer(50, source_labware_1.wells_by_name()['A1'], source_labware_2.wells_by_name()['B6'], new_tip='once')
p300_single.transfer(50, source_labware_1.wells_by_name()['A2'], source_labware_2.wells_by_name()['B7'], new_tip='never')
```

####

Use the left-mounted P1000 Single-Channel GEN2 pipette to transfer 200 uL of reagent from wells A7, A6, A5, A2, A3
of the source labware to the corresponding wells A5, A9, A1, A10, A2 of the destination labware. Use a new tip for each transfer.

```python
TRANSFER_VOL_1 = 200
SRC_WELL_1 = [source.wells_by_name()[well] for well in ['A7', 'A6', 'A5', 'A2', 'A3']]
DEST_WELL_1 = [destination.wells_by_name()[well] for well in ['A5', 'A9', 'A1', 'A10', 'A2']]

# command 1
p1000s_1.transfer(TRANSFER_VOL_1, SRC_WELL_1, DEST_WELL_1, new_tip="always")
```

####

Use the right-mounted P1000 Single-Channel GEN2 pipette to transfer 18 uL of liquid from wells A9, A12, A6, A10, A3
of the source labware to the corresponding wells A7, A11, A6, A3, A9 of the destination labware. Use the same tip for all transfers.

```python
TRANSFER_VOL_2 = 18
SRC_WELL_2 = [source.wells_by_name()[well] for well in ['A9', 'A12', 'A6', 'A10', 'A3']]
DEST_WELL_2 = [source.wells_by_name()[well] for well in ['A7', 'A11', 'A6', 'A3', 'A9']]

# command 2
p1000s_2.transfer(TRANSFER_VOL_2, SRC_WELL_2, DEST_WELL_2, new_tip="once")
```

####

Using P300 Single-Channel GEN2 pipette on the left mount, transfer 119 uL of reagent
from first well in source labware to E12, G12, B9, A6, D7 wells in the destination labware.
Use a new tip for each transfer.

```python
vol = 119
src_well = source.wells_by_name()['A1']
dest_wells = [destination.wells_by_name()[well] for well in ['E12', 'G12', 'B9', 'A6', 'D7']]

# commands
p300s.transfer(vol, src_well, dest_wells, new_tip="always")
```

####

Using P20 Single Channel, transfer 13ul of reagent from the first tube of the source rack to each well in the destination plate.
Use the same tip for each transfer.

```python
# parameters
vol = 13
src_well = source.wells_by_name()['A1']
dest_wells = destination.wells()

# commands
p20s.transfer(vol, src_well, dest_wells, new_tip='once')
```

####

Using P20 Single Channel GEN2 pipette on right mount, transfer 16 uL from the first well of source labware 1 to each well
in destination labware 1 and destination labware 2. Reuse the same tip

```python
# volumes setup
transfer_vol_1 = 16

# wells setup
source_wells_1 = source_1.wells_by_name()['A1']
destination_wells_1 = destination_1.wells()
destination_wells_2 = destination_2.wells()
all_destinations = destination_wells_1 + destination_wells_2

# commands
p20s.transfer(transfer_vol_1, source_wells_1, all_destinations, new_tip="once")
```

####

Using P20 Single Channel GEN2 pipette on right mount, transfer 23 uL from each well in source labware 2 to
each well in the destination labware 1. Reuse the same tip.

```python
# volumes setup
transfer_vol_2 = 23

# wells setup
source_wells_2 = source_2.wells()
destination_wells_1 = destination_1.wells()

# commands
p20s.transfer(transfer_vol_2, source_wells_2, destination_wells_1, new_tip="once")
```

####

Using P20 Multi-Channel GEN2 pipette on the right mount, transfer 5 uL of reagent
from first column in source labware to columns 5, 9, 1, 10, and 2 in the destination labware.
Use the same tip everytime.

```python
# parameters
vol = 5
src_col = source.columns_by_name()['1']
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p20m.transfer(vol, src_col, dest_cols, new_tip="once")
```

####

Using P20 Multi-Channel GEN2 pipette on the left mount, transfer 24 uL of reagent
from columns 4, 3, 6, 1, 11 in source labware to columns 5, 9, 1, 10, 2 in the same source labware.
Use a new tip everytime.

```python
# parameters
vol = 24
src = [source.columns_by_name()[idx] for idx in ['4', '3', '6', '1', '11']]
dest = [source.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p20m.transfer(vol, src, dest, new_tip="always")
```

####

Using P300 Multi Channel, transfer 55 uL of sample from each column of the source plate
into the corresponding columns of the destination deep well plate.
Change tips for each transfer.

```python
# parameters
vol = 55
src_cols = source.columns()
dest_cols = destination.columns()

# commands
p300m.transfer(vol, src_cols, dest_cols, new_tip='always')
```

####

Using P300 Single Channel GEN2, transfer 70ul of reagent from the first tube of the source rack to each well in the destination plate.
Keep the same tip for each transfer.

```python
# parameters
vol = 70
src_well = source.wells_by_name()['A1']
dest_wells = destination.wells()

# commands
p300s.transfer(vol, src_well, dest_wells, new_tip='once')
```

####

Using P300 Single Channel GEN2, transfer 75ul of samples from each tube in the source tube rack to each well of the destination plate.
Use a new tip for each transfer.

```python
# parameters
vol = 75
src_wells = source.wells()
dest_wells = destination.wells()

# commands
p300s.transfer(vol, src_wells, dest_wells, new_tip='always')
```

####

Using P300 Multi-channel pipette on the left mount, transfer 65 uL of reagent from first column in the source labware 1
to all the columns in destination labware 1. Keep the same set of tips for this entire set of transfers within this step.

```python
transfer_vol_1 = 65

# wells setup
source_wells_1 = source_1.columns_by_name()['1']
destination_wells_1 = destination_1.columns()

p300m.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using P1000 Single-Channel GEN2 pipette on left mount, transfer 175.0 uL of reagent
from H10, F12, D7, B1, C8 wells in source labware
to first well in the destination labware. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 175.0
src_wells = [source.wells_by_name()[well] for well in ['H10', 'F12', 'D7', 'B1', 'C8']]
dest_well = destination.wells_by_name()['A1']

# commands
p1000s.transfer(transfer_vol, src_wells, dest_well, new_tip="always")
```

####

Using P300 Single-channel GEN2 pipette on left mount, transfer 51 uL from wells A1, A2 in source labware 1
to B6, B7 in source labware 2. Reuse the same tip.

```python
# volume setup
transfer_vol_1 = 51

# well setup
source_wells_1 = [source_1.wells_by_name()[wells] for wells in ['A1', 'A2']]
destination_wells_1 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]

# commands
p300s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using P20 Single-channel GEN2 pipetet on right mount, transfer 14 uL from wells C4, C6 in source labware 2
to A3, A4 in source labware 1. Reuse the same tip.

```python
# volume setup
transfer_vol_2 = 14

# well setup
source_wells_2 = [source_2.wells_by_name()[wells] for wells in ['C4', 'C6']]
destination_wells_2 = [source_1.wells_by_name()[wells] for wells in ['A3', 'A4']]

# commands
p20s.transfer(transfer_vol_2, source_wells_2, destination_wells_2, new_tip="once")
```

####

Using P20 Single-channel GEN2 pipette on right mount, transfer 17 uL from wells B6, B7 in source labware 2
to A1, B1 in destination labware 1. Use a new tip each time.

```python
# volume setup
transfer_vol = 17
# well setup
source_wells_2 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]
destination_wells_1 = [destination_1.wells_by_name()[wells] for wells in ['A1', 'B1']]
# commands
p20s.transfer(transfer_vol, source_wells_2, destination_wells_1, new_tip="always")
```

####

Using P20 Single-channel GEN2 pipette on right mount, transfer 15 uL from wells C4, C6 in source labware 2
to A1, B1 in destination labware 2. Use a new tip each time.

```python
# volume setup
transfer_vol = 15

# well setup
source_wells_2 = [source_2.wells_by_name()[wells] for wells in ['C4', 'C6']]
destination_wells_2 = [destination_2.wells_by_name()[wells] for wells in ['A1', 'B1']]

# commands
p20s.transfer(transfer_vol, source_wells_2, destination_wells_2, new_tip="always")
```

####

Using the P300 Single-Channel GEN2, pool [transfer_vol]ul from all tubes in source labware into A1 of the destination labware.
Change tips between each tube.

```python
# well setup
source_wells = source.wells()
destination_wells = [destination.wells_by_name()[wells] for wells in ['A1']]
# Transfer samples
p300_single.transfer(transfer_vol, source_wells, destination_wells, new_tip='always')
```

####

Using P300 single-channel GEN2 pipette, pool 95 uL of liquid from all the wells in source labware 1 to
the first well in destination labware 1. Use the same tip throughout.

```python
# volume setup
transfer_vol_1 = 95
# wells setup
source_wells_1 = source_1.wells()
destination_wells_1 = destination_1.wells_by_name()['A1']

# commands
p300s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using the P20 Multi-Channel GEN2 pipette on the right mount, transfer 3 uL of reagent from the first column in the source labware
to columns 5, 9, 1, 10, 2 in the destination labware. Use a new set of tips for each transfer.

```python
# parameters
transfer_vol = 3
src_col = source.columns_by_name()['1']
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p20m.transfer(transfer_vol, src_col, dest_cols, new_tip='always')
```

####

Using the P20 Multi-Channel GEN2 pipette on the right mount, transfer 8 uL of reagent from source columns 4, 3, 6, 1,
and 11 to columns 5, 9, 1, 10, and 2 in the destination labware. Use the same set of tips for all transfers.

```python
# parameters
transfer_vol = 8
src_cols = [source.columns_by_name()[idx] for idx in ['4', '3', '6', '1', '11']]
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p20m.transfer(transfer_vol, src_cols, dest_cols, new_tip="once")
```

####

Using P300 Multi-Channel GEN2 pipette on the left mount, transfer 38 uL of reagent from 4, 3, 6, 1, 11
columns in the source labware to 5, 9, 1, 10, 2 columns in the destination labware. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 38
src_cols = [source.columns_by_name()[idx] for idx in ['4', '3', '6', '1', '11']]
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9',  '1',  '10',  '2']]

# commands
p300m.transfer(transfer_vol, src_cols, dest_cols, new_tip="always")
```

####

Using P20 Single GEN2 pipette on the right mount, transfer 10 uL of reagent
from the first well of source labware 2 to all the wells in the destination labware. Reuse the same tip.

```python
# volumes setup
transfer_vol_1 = 10
# wells setup
source_wells_2 = source_labware_2.wells_by_name()['A1']
destination_wells_1 = [dest.wells() for dest in destination_list] # a list of destinations
# commands
p20s.transfer(transfer_vol_1, source_wells_2, destination_wells_1, new_tip="once")
```

####

Using P300 Single GEN2 on the left mount, perform a well to well transfer of 90 uL from source
labware to the destination labware. Use a new tip each time.

```python
# volumes setup
transfer_vol
# wells setup
source_wells = [src.wells() for src in source_labware]
destination_wells = [dest.wells() for dest in destination_list] # a list of destinations
# commands
p300s.transfer([transfer_vol], source_wells, destination_wells, new_tip="always")
```

####

Using Flex 1-Channel 1000 uL Pipette on left mount,
transfer 186.0 uL of reagent from A7, A6, A5, A2, A3 of the source labware to A5, A9, A1, A10, A2 the destination labware.
Use a new tip for all transfers.

```python
# parameters
TRANSFER_VOL = 186.0
SRC_WELLS = [source.wells_by_name()[well] for well in ['A7', 'A6', 'A5', 'A2', 'A3']]
DEST_WELLS = [destination.wells_by_name()[well] for well in ['A5', 'A9', 'A1', 'A10', 'A2']]

# command 1
p1000s_1.transfer(TRANSFER_VOL, SRC_WELLS, DEST_WELLS, new_tip="always")
```

####

Use Flex 1-Channel 1000 uL Pipette on right mount,
transfer 10 uL of liquid from A9, A12, A6, A10, A3 of source labware to A7, A11, A6, A3, A9 of the destination labware.
Use the same tip for all transfers.

```python
# parameters
TRANSFER_VOL = 10
# well setup
SRC_WELLS = [source.wells_by_name()[well] for well in ['A9', 'A12', 'A6', 'A10', 'A3']]
 = [destination.wells_by_name()[well] for well in ['A7', 'A11', 'A6', 'A3', 'A9']]

# command 1
[pipette object].transfer(TRANSFER_VOL, SRC_WELLS, DEST_WELLS, new_tip="once")
```

####

Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 127.0 uL of reagent from the first well in source labware
to E12, G12, B9, A6, D7 wells in the destination labware. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 127.0
src_well = source.wells_by_name()['A1']
dest_wells = [destination[well] for well in ['E12', 'G12', 'B9', 'A6', 'D7']]

# commands
[pipette object].transfer(transfer_vol, src_well, dest_wells, new_tip="always")
```

####

Using Flex 1-Channel 50 uL Pipette, transfer 2ul of reagent from the first tube of the source rack to each well in the destination plate.
Use the same tip for each transfer.

```python
# parameters
transfer_vol = 2
src_well = source.wells_by_name()['A1']
dest_wells = destination.wells()

# commands
p50s.transfer(transfer_vol, src_well, dest_wells, new_tip='once')
```

####

Using the Flex 1-Channel 50 uL Pipette, transfer 25 uL from the first well of source labware 1 to each well
in destination labware 1 and destination labware 2. Use the same tip for each transfer.

```python
# volumes setup
transfer_vol_1 = 25

# wells setup
source_wells_1 = source_1.wells_by_name()['A1']
destination_wells_1 = destination_1.wells()
destination_wells_2 = destination_2.wells()
all_dest = destination_wells_1+destination_wells_2

# commands
p50s.transfer(transfer_vol_1, source_wells_1, all_dest, new_tip="once")
```

####

Using Flex 8-Channel 50 uL Pipette on right mount, transfer 5 uL of reagent from the first column in source labware
to columns 4, 8, 1, 9, and 2 in the destination labware. Use the same tip for all transfers.

```python
# parameters
transfer_vol = 5
src_col = source.columns_by_name()['1']
dest_cols = [destination.columns_by_name()[idx] for idx in ['4', '8', '1', '9', '2']]

# commands
p50m.transfer(transfer_vol, src_col, dest_cols, new_tip="once")
```

####

Using Flex 8-Channel 50 uL Pipette on left mount, transfer 24.0 uL of reagent from columns 3, 2, 5, 1, 10
to columns 4, 8, 1, 9, 2 in the same source labware. Use a new tip for each transfer.

```python
#parameters
transfer_vol = 24.0
src_cols = [source.columns_by_name()[idx] for idx in ['3', '2', '5', '1', '10']]
dest_cols = [source.columns_by_name()[idx] for idx in ['4', '8', '1', '9', '2']]

# commands
p50m.transfer(transfer_vol, src_cols, dest_cols, new_tip="always")
```

####

Using Flex 8-Channel 1000 uL Pipette , transfer 70ul of sample from each well of the first column of the source plate into the first column of
the destination plate. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 70
src_col = source.columns_by_name()['1']
dest_col = destination.columns_by_name()['1']

# commands
p1000m.transfer(transfer_vol, src_col, dest_col, new_tip='always')
```

####

Transfer 80ul of reagent from the first tube of the source rack to each well in the destination plate.
Use the same tip for each transfer.

```python
# parameters
transfer_vol = 80
src_well = source.wells_by_name()['A1']
dest_wells = destination.wells()

# commands
p1000s.transfer(transfer_vol, src_well, dest_wells, new_tip='once')
```

####

Using Flex 1-Channel 1000 uL Pipette, aliquot 190 ul of samples from each tube in the source tube rack to
all wells of the destination plate evenly. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 190
src_wells = source.wells()
dest_wells = destination.wells()

# commands
p1000s.transfer(transfer_vol, src_wells, dest_wells, new_tip='always')
```

####

Using Flex 8-Channel 1000 uL Pipette on left mount, transfer 40 uL from the first column in the source labware 1
to the first column in destination labware 1. Keep the same tip for this entire set of transfers within this step.

```python
# volumes setup
transfer_vol_1 = 40
# wells setup
source_wells_1 = source_1.columns_by_name()['1']
destination_wells_1 = destination_1.columns_by_name()['1']
p1000m.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 197 uL of reagent
from H10, F12, D7, B1, C8 wells in source labware to the first well in the destination labware.
Use a new tip for each transfer.

```python
# parameters
transfer_vol = 197
src_wells = [source.wells_by_name()[well] for well in ['H10', 'F12', 'D7', 'B1', 'C8']]
dest_well = destination.wells_by_name()['A1']

# commands
p1000s.transfer(transfer_vol, src_wells, dest_well, new_tip="always")
```

####

Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 52 uL from wells A1, A2 in source labware 1
to B6, B7 in source labware 2. Reuse the same tip for each transfer.

```python
# volume setup
transfer_vol_1 = 52

# well setup
source_wells_1 = [source_1.wells_by_name()[wells] for wells in ['A1', 'A2']]
destination_wells_1 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]

# commands
p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using Flex 1-Channel 50 uL Pipette on right mount, transfer 20 uL from wells B6, B7 in source labware 2
to A1, B1 in destination labware 1. Use a new tip for each transfer.

```python
# volume setup
transfer_vol_3 = 20

# well setup
source_wells_3 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]
destination_wells_3 = [destination_1.wells_by_name()[wells] for wells in ['A1', 'B1']]

# commands
p50s.transfer(transfer_vol_3, source_wells_3, destination_wells_3, new_tip="always")
```

####

Using Flex 1-Channel 1000 uL Pipette , pool 25ul from all tubes in source labware1 into A1 of the destination labware.
Change tips between each tube.

```python
vol = 25
source_wells = source_labware1.wells()
dest_well = destination_labware.wells_by_name()['A1']

p1000s.transfer(vol, source_wells, dest_well, new_tip='always')
```

####

Using Flex 1-Channel 1000 uL Pipette, pool 90 uL of liquid from all the wells in source labware 1 to
the first well in destination labware 1. Reuse the same tip.

```python
# volume setup
transfer_vol_1 = 90
# wells setup
source_wells_1 = source_1.wells()
destination_wells_1 = destination_1.wells_by_name()['A1']
# commands
p1000s.transfer(transfer_vol_1, source_wells_1, destination_wells_1, new_tip="once")
```

####

Using Flex 8-Channel 50 uL Pipette on right mount, transfer 7 uL of reagent from the first column in source labware to
4, 8, 1, 9, and 2 columns in the destination labware. Use a new tip for each transfer.

```python
#parameters
transfer_vol = 7
src_col = source.columns_by_name()['1']
dest_cols = [destination.columns_by_name()[idx] for idx in ['4', '8', '1', '9', '2']]

# commands
p50m.transfer(transfer_vol, src_col, dest_cols, new_tip="always")
```

####

Using Flex 8-Channel 50 uL Pipette on right mount, transfer 6 uL of reagent from 4, 3, 6, 1, 11 columns in source labware
to 5, 9, 1, 10, 2 columns in the destination labware. Using the same tip for all transfers.

```python
# parameters
transfer_vol = 6
src_cols = [source.columns_by_name()[idx] for idx in ['4', '3', '6', '1', '11']]
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p50m.transfer(transfer_vol, src_cols, dest_cols, new_tip="once")
```

####

Using Flex 8-Channel 1000 uL Pipette on left mount, transfer 78 uL of reagent from 4, 3, 6, 1, 11 columns in the source labware
to 5, 9, 1, 10, 2 columns in the destination labware. Use a new tip for each transfer.

```python
# parameters
transfer_vol = 78
src_cols = [source.columns_by_name()[idx] for idx in ['4', '3', '6', '1', '11']]
dest_cols = [destination.columns_by_name()[idx] for idx in ['5', '9', '1', '10', '2']]

# commands
p1000m.transfer(transfer_vol, src_cols, dest_cols, new_tip="always")
```

####

Using Flex 1-Channel 50 uL Pipette on right mount, transfer 25 uL of reagent
from the first well of source labware 2 to all wells in destination labware. Reuse the same tip.

```python
# volumes setup
transfer_vol_1 = 25

# wells setup
source_wells_2 = source_labware_2.wells_by_name()['A1']
destination_wells_1 = [dest.wells() for dest in destination]

# commands
p50s.transfer(transfer_vol_1, source_wells_2, destination_wells_1, new_tip="once")
```

####

- when command says 'Use a new tip for each transfer', or something similar,
  set the `new_tip` parameter to "always": `new_tip='always'`.
- when command says 'Use the same tip for all transfers.', 'reuse the same tip' or something similar.
  set the `new_tip` parameter to "once": `new_tip='once'`.

####

Note that when command says `Use the same tip for all transfers` or similar.
Do not use new_tip='once' inside loop as shown below

```python
for src, dest in LIST:
    p50_multi_right.transfer(transfer_vol, src, dest, new_tip='once')
```

Instead, remove `for` and use like so:

```python
p50_multi_right.transfer(transfer_vol, src, dest, new_tip='once')
```

Note that no `for` loop is used.

####

Source labware is ['labware name'], placed on [temperature module] on slot 3

```python
# modules
temperature_module = protocol.load_module(['temperature module gen2'], 3)

# labware
source = temperature_module.load_labware(['labware name'])
```

####

Thermocycler module GEN 2 is present on slot A1+B1. `A1+B1` referes to 7, please use the slot number 7.

Correct thermocycler load:

```python
thermocycler = protocol.load_module('thermocyclerModuleV2') # by default slot number is 7
```

Incorrect thermocycler load:

```python
thermocycler = protocol.load_module('thermocyclerModuleV2', 'A1+B1')
```

####

- Sample temperature module GEN 2 is placed on slot D1
- Opentrons 96 Well Aluminum Block adapter is placed on sample temperature module GEN 2

Corresponding protocol

```python
temp_mod_sample = protocol.load_module('temperature module gen2', 'D1')
temp_sample_adapter = temp_mod_sample.load_adapter('opentrons_96_well_aluminum_block')
```

####

Open thermocycler lid

```python
[thermocycler_object].open_lid()
```

####

Set the thermocycler block temperature to 1 C.

```python
plate_temperature_c = 1
[thermocycler_object].set_block_temperature(plate_temperature_c)
```

####

Set the thermocycler lid temperature to 50 C.

```python
lid_temperature_c = 50
[thermocycler_object].set_lid_temperature(lid_temperature_c)
```

####

Set the sample temperature module to 3 C.

```python
sample_temperature_c = 3
[temperature_module].set_temperature(sample_temperature_c)
```

####

Transfer 17 uL of mastermix from the mastermix source wells to the destination wells.
Use the same pipette tip for all transfers.

```python
[pippette_object].transfer(
    17,
    master_mix_source_wells,
    master_mix_destination_wells,
    new_tip='once'
)
```

####

Transfer 4 uL of the sample from the source to the destination.
Mix the sample and mastermix for a total volume of 15 uL 10 times.
Blow out to 'destination well' after each transfer. Use a new tip for each transfer.

```python
[pippette_object].transfer(
    4,
    [sample_source_wells],`
    [sample_destination_wells],
    new_tip='always',
    mix_after=(10, 15),
    blow_out=True,
    blowout_location='destination well'
)
```

####

Close the thermocycler lid.

```python
[thermocycler_module].close_lid()
```

####

Execute the thermocycler with the following profile:

- 75 C for 66 seconds for 1 cycle (repetition).

```python
[thermocycler_module].execute_profile(
    steps=[{'temperature': 75, 'hold_time_seconds': 66}],
    repetitions=1,
    block_max_volume=[total_mix_volume_ul]
)
```

Note that you must calculate `block_max_volume` based on the whole prompt context.

####

Execute the thermocycler with the following profile:

- 61C for 8 seconds, 85°C for 20 seconds, 58°C for 45 seconds for 14 cycles.

```python
[thermocycler_module].execute_profile(
    steps=[
        {'temperature': temp, 'hold_time_seconds': duration}
        for temp, duration in zip([61, 85, 58], [8, 20, 45])
    ],
    repetitions=14,
    block_max_volume=[total_mix_volume_ul]
)
```

Note that you must calculate `block_max_volume` based on the whole prompt context.

####

Hold the thermocycler block at 4°C.

```python
hold_temperature_c = 10
[thermocycler_module].set_block_temperature(hold_temperature_c)
```

####

Deactivate the mastermix temperature module.

```python
[master_mix_temperature_module].deactivate()
```

####

Sample source wells: the first 48 wells column-wise in the sample source plate.
Note that the pipette is a single channel.

Use `[source_labware].wells()`. For example,

```python
number_of_samples = 48
source_wells = sample_plate.wells()[:number_of_samples]
```

####

Sample source wells: the first 48 wells column-wise in the sample source plate.
Note that the pipette is a multi-channel.

- Estimate the columns using the number samples

```python
number_of_samples = 48
number_of_columns = math.ceil(number_of_samples / 8)
```

- Then, use `[source_labware].columns()` method to access the columns.
  For example,

```python
source_wells = sample_plate.columns()[:number_of_columns]
```

####

When a command says `move destination labware` or something, use `move_labware`.
We need to specify two arguments:

- labware: The labware object you want to move.
- new_location: The destination where you want to move the labware.

This can be any empty deck slot or a module that is ready to accept labware.
Example for the slot,

```python
protocol.move_labware([labware]], ['C4'], use_gripper=True)
```

Example for the module,

```python
protocol.move_labware([labware]], [thermocycler], use_gripper=True)
```

####

Pause the protocol

```python
protocol.pause("Pause please")
```

####

Transfer 21 uL of liquid from 6 mm below the top surface of mastermix well to 3 mm above the bottom of destination well.
Use the same tip for each transfer.

```python
[pipette_object].transfer(21, mastermix_well.top(-6), dest.bottom(3), new_tip='once')
```

####

5 mm above the top of the well

```python
plate['A1'].top(z=5)
```

5 mm below the top of the well

```python
plate['A1'].top(z=-5)
```

5 mm above the bottom of the well

```python
plate['A1'].bottom(z=1)
```

5 mm below the bottom of the well

```python
plate['A1'].bottom(z=-5)
```

Transfer 20 uL of liquid from 5 mm below the top surface of the mastermix well to 2 mm above the bottom of the destination well.
Use the same tip for each transfer.

```python
pipette_96channel.transfer(20, mastermix_source_well.top(-5), destination_wells.bottom(2), new_tip='once')
```

####

Remove the tip slowly out of the well at 5 mm/s speed

```python
pipette.move_to([well].top(), speed=5)
```

Move to the top of the well at 5 mm/s speed

```python
pipette.move_to([well].top(), speed=5)
```

Move to 2 mm below the top of well A1

```python
pipette.move_to(plate['A1'].top(z=-2))
```

Move to 2 mm above the bottom of well A1

```python
pipette.move_to(plate['A1'].bottom(z=2))
```

####

Transfer 20 ul of liquid from 3 mm above the source well bottom to destination well 7 mm beneath the top surface. Flow rate is at half the default.
Mix the sample and mastermix of 40 ul total volume 5 times. Remove the tip slowly out of the well at 5 mm/s speed. Use the same tip for each transfer.

```python
pipette_96channel.pick_up_tip()
pipette_96channel.aspirate(20, sample_source_wells.bottom(3), rate=0.5)
pipette_96channel.dispense(20, destination_wells.top(-7), rate=0.5)
pipette_96channel.mix(5, 40)
pipette_96channel.move_to(destination_wells.top(), speed=5)
pipette_96channel.drop_tip()
```

####

Load three opentrons_flex_96_filtertiprack_50ul tip racks in slots A2, B2, and C2

```python
tips_50ul = [
    protocol.load_labware(
        'opentrons_flex_96_filtertiprack_50ul',
        slot
    )
    for slot in ['A2', 'B2', 'C2']
]
```

or

```python
tips_50ul_a = protocol.load_labware('opentrons_flex_96_filtertiprack_50ul', 'A2')
tips_50ul_b = protocol.load_labware('opentrons_flex_96_filtertiprack_50ul', 'B2')
tips_50ul_c = protocol.load_labware('opentrons_flex_96_filtertiprack_50ul', 'C2')
tips_50ul = [tips_50ul_a, tips_50ul_b, tips_50ul_c]
```

####

Move the destination labware to the thermocycler using a gripper.

```python
protocol.move_labware(destination_plate, thermocycler_module, use_gripper=True)
```

####

I am going to be running a protocol on my Opentrons Flex.
I have a 96-channel pipette on the system. My destination plates will be
4 'nest_96_wellplate_2ml_deep' plates. My source labware will be
a 'nest_1_reservoir_195ml'.

```python
pipette_96_channel = protocol.load_instrument(
        'flex_96channel_1000', mount='left'
    )
source_reservoir = protocol.load_labware('nest_1_reservoir_195ml', '1')
destination_plates = [
    protocol.load_labware('nest_96_wellplate_2ml_deep', slot)
    for slot in ['2', '3', '4', '5']
]
```

#### Example 5

Transfer 25 uL from multiple source wells to a single destination well, use a new tip every time, and touch the tip after dispense.

```python
pipette.transfer(25, source_wells, dest_well, new_tip='always', touch_tip=True)
```

####

Transfer 10 uL from source to destination, with an air gap of 5 uL after aspiration.

```python
pipette.transfer(10, source_well, dest_well, air_gap=5)
```

####

Transfer 200 uL from source to destination, blowing out in the source well after dispensing. Use the same tip for each transfer.

```python
pipette.transfer(200, source_well, dest_well, trash=False, blow_out=True, blowout_location='source well')
```

####

Transfer 12 uL from source to destination, mix the destination well 5 times with 10 uL after dispensing, and do not touch the tip.

```python
pipette.transfer(12, source_well, dest_well, mix_after=(5, 10))
```

####

Transfer 30 uL from one source to multiple destinations, after each aspirate and touch tip after dispensing.

```python
pipette.transfer(30, source_well, dest_wells, air_gap=10, touch_tip=True)
```

####

Flex 1-Channel 1000 uL Pipette is mounted on the left side.
mastermix source wells: first N wells column-wise in mastermix plate.
Note that the pipette is a single channel.

```python
pipette = protocol.load_instrument('flex_1channel_1000', 'left', tip_racks=[tips_1000ul])
sample_source_wells = sample_plate.wells()[:N]
```

####

Source Labware: `Opentrons 96 Flat Bottom Heater-Shaker Adapter with NEST 96 Well Plate 200 uL Flat` in slot D1

```python
source = protocol.load_labware('opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat', 'D1')
```

####

Using Flex 1-Channel 1000 uL Pipette on left mount, transfer 150 uL from wells `A1, A2` in source labware 1
to `B6, B7` in source labware 2. Use the same tip for each transfer.

First collect all wells for source and destination.

```python
source_wells_1 = [source_1.wells_by_name()[wells] for wells in ['A1', 'A2']]
destination_wells_1 = [source_2.wells_by_name()[wells] for wells in ['B6', 'B7']]
```

Then use a transfer method like so:

```python
p1000s.transfer(150, source_wells_1, destination_wells_1, new_tip="once")
```

Note that we are using a single transfer function for multiple wells.

The following is totally wrong:

```python
pipette_1000ul.transfer(50, source_labware_1.wells_by_name()['A1'], source_labware_2.wells_by_name()['B6'], new_tip='once')
pipette_1000ul.transfer(50, source_labware_1.wells_by_name()['A2'], source_labware_2.wells_by_name()['B7'], new_tip='never')
```

####

Using the multi-channel pipette, transfer 3ul of sample from each column in the source plate to
the destination plate in duplicate. Changing tips between each column. Duplicate means that
aspirate the sample from the sample plate column 1 to the destination plate column 1, change tip,
then aspirate from sample plate column 1 to destination plate column 2. Then, transfer the sample
from the sample plate column 2 to the destination plate column 3, change tip, then transfer
the sample from sample plate column 2 to destination plate column 4. Repeat this pattern for
the remainder of the source columns.

```python
source_columns = source_plate.columns()[:number_of_columns]
destination_columns = destination_plate.columns()[:number_of_columns * 2]  # Twice the number for duplicates

for col_ctr, s in enumerate(source_columns, start=0):
    dest_index = 2 * col_ctr
    pipette_multi.transfer(3, s, destination_columns[dest_index], new_tip='always')
    pipette_multi.transfer(3, s, destination_columns[dest_index + 1], new_tip='always')
```

Note that two transfer methods is used to account for duplication. 'for' loop is used since description
says change tip for each column.

####

Using the multi-channel pipette, transfer 3ul of sample from each column in the source plate to
the destination plate in triplicate. Changing tips between each column.
The triplicate means that for first source columns,
aspirate the sample from the source column 1 to the destination plate column 1, change tip,
then aspirate from source column 1 to destination plate column 2, change tip,
then aspirate from source column 1 to destination plate column 3, change tip.
For second source column,
aspirate the sample from the source column 2 to the destination column 4, change tip,
then aspirate the sample from source column 2 to destination column 5, change tip,
then aspirate the sample from source column 2 to destination column 6, change tip.

Repeat this pattern for the remainder of the source columns.

```python
source_columns = source_plate.columns()[:number_of_columns]
destination_columns = destination_plate.columns()[:number_of_columns * 2]  # Twice the number for duplicates

for col_ctr, s in enumerate(source_columns, start=0):
    dest_index = 2 * col_ctr
    pipette_multi.transfer(3, s, destination_columns[dest_index], new_tip='always')
    pipette_multi.transfer(3, s, destination_columns[dest_index + 1], new_tip='always')
    pipette_multi.transfer(3, s, destination_columns[dest_index + 2], new_tip='always')
```

Note that two transfer methods is used to account for duplication. 'for' loop is used since description
says change tip for each column.
