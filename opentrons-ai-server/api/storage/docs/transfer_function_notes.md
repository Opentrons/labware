<Transfer function notes>

**Introduction**

The `transfer` function in the Opentrons API v2 simplifies liquid handling operations by abstracting the complexities involved in pipetting tasks. It allows users to perform liquid transfers efficiently without the need to write explicit loops for iterating over wells or volumes. This manual provides a comprehensive guide on using the `transfer` function effectively, including best practices, common pitfalls, and practical examples. This updated version incorporates additional examples and clarifications based on real-world protocols, including the use of modules and dynamic data-driven transfers.

---

**Basic Usage of `transfer`**

The `transfer` function enables the movement of liquids from one location to another with optional parameters to control tip usage, mixing, air gaps, and more. Its basic syntax is:

```python
pipette.transfer(
    volume,         # Volume to transfer (single value or list)
    source,         # Source well(s)
    destination,    # Destination well(s)
    new_tip='always'  # Tip usage strategy ('always', 'once', or 'never')
    # Additional optional parameters...
)
```

- **Volume**: The amount of liquid to transfer, specified in microliters (µL). It can be a single value or a list of volumes.
- **Source**: The starting location(s) of the liquid, specified as a well or a list of wells.
- **Destination**: The target location(s) for the liquid, specified as a well or a list of wells.
- **`new_tip`**: Controls how tips are used during the transfer:
  - `'always'`: Change tips between each transfer step.
  - `'once'`: Use the same tip for all transfers.
  - `'never'`: Do not change tips (use with caution).

---

**Understanding Pipette Types**

Choosing the correct method for accessing wells or columns depends on the type of pipette used.

### Single-Channel Pipettes

Single-channel pipettes interact with individual wells. When using single-channel pipettes, access wells using the `wells()` method.

**Example:**

```python
source_wells = source_labware.wells()[:number_of_samples]
```

### Multi-Channel Pipettes

Multi-channel pipettes interact with rows or columns simultaneously. When using multi-channel pipettes, access columns using the `columns()` method.

**Example:**

```python
import math

number_of_samples = 48
number_of_columns = math.ceil(number_of_samples / 8)
source_columns = source_labware.columns()[:number_of_columns]
```

---

**Well Selection Methods**

Accurate well selection is crucial for successful liquid transfers.

### Accessing Wells

- **Access all wells**:

  ```python
  all_wells = labware.wells()
  ```

- **Access specific wells by name**:

  ```python
  well_a1 = labware.wells_by_name()['A1']
  ```

- **Access a list of wells by name**:

  ```python
  specific_wells = [labware.wells_by_name()[well] for well in ['A1', 'B2', 'C3']]
  ```

### Accessing Columns

- **Access all columns**:

  ```python
  all_columns = labware.columns()
  ```

- **Access specific columns by index (0-based)**:

  ```python
  first_three_columns = labware.columns()[:3]
  ```

- **Access columns by name (1-based)**:

  ```python
  column_one = labware.columns_by_name()['1']
  ```

- **Access multiple columns by name**:

  ```python
  specific_columns = [labware.columns_by_name()[idx] for idx in ['1', '3', '5']]
  ```

### Accessing Rows

- **Access all rows**:

  ```python
  all_rows = labware.rows()
  ```

- **Access specific rows by name**:

  ```python
  row_a = labware.rows_by_name()['A']
  ```

---

**Handling the `new_tip` Parameter**

The `new_tip` parameter controls tip usage during transfers.

- **`new_tip='always'`**: Use a new tip for each transfer. This is appropriate when avoiding cross-contamination is critical.

- **`new_tip='once'`**: Use the same tip for all transfers in the `transfer` function call. Use this when transferring from a single source to multiple destinations and cross-contamination is not a concern.

- **`new_tip='never'`**: Never change tips during the transfer. Use with caution, ensuring that cross-contamination will not occur.

**Important Note:** Do not use `new_tip='once'` inside a loop; instead, pass lists of wells to the `transfer` function and let it handle the iteration.

---

**Avoiding Unnecessary Loops**

**Incorrect Usage:**

```python
for src, dest in zip(source_wells, destination_wells):
    pipette.transfer(volume, src, dest, new_tip='always')
```

**Issue:** This approach unnecessarily calls the `transfer` method multiple times and can lead to inefficiencies or errors.

**Correct Usage:**

```python
pipette.transfer(volume, source_wells, destination_wells, new_tip='always')
```

**Explanation:** The `transfer` function can handle lists of sources and destinations, automatically pairing them and iterating over them.

---

**Proper Use of `new_tip`**

**Incorrect Usage:**

Using `new_tip='once'` inside a loop when intending to reuse the same tip.

```python
for src, dest in zip(source_wells, destination_wells):
    pipette.transfer(volume, src, dest, new_tip='once')
```

**Correct Usage:**

```python
pipette.transfer(volume, source_wells, destination_wells, new_tip='once')
```

**Explanation:** When `new_tip='once'`, the pipette picks up a tip at the beginning of the transfer and uses it throughout. Using it inside a loop can cause the pipette to attempt to pick up a tip that is already in use, leading to errors.

---

**Preventing "Out of Tips" Errors**

- **Tip Rack Capacity:** Be mindful of the number of tips available in your tip racks. For example, a standard 96-tip rack cannot provide more than 96 tips.

- **Calculating Tip Usage:** Estimate the number of tips required based on the `new_tip` parameter and the number of transfers.

- **Loading Additional Tip Racks:** If your protocol requires more tips than are available in a single rack, load additional tip racks.

**Example:**

```python
tiprack1 = protocol.load_labware('opentrons_96_tiprack_300ul', 2)
tiprack2 = protocol.load_labware('opentrons_96_tiprack_300ul', 3)
pipette = protocol.load_instrument('p300_single_gen2', 'left', tip_racks=[tiprack1, tiprack2])
```

---

**Index Errors**

- **Labware Dimensions:** Ensure that your loops do not exceed the dimensions of the labware (e.g., a 96-well plate has 12 columns and 8 rows).

- **Valid Indices:** Adjust loop ranges to stay within valid indices.

**Incorrect Usage:**

```python
for i in range(13):  # Exceeds available columns (0-11)
    pipette.transfer(volume, source_columns[i], dest_columns[i])
```

**Correct Usage:**

```python
for i in range(12):  # Valid column indices for a 96-well plate
    pipette.transfer(volume, source_columns[i], dest_columns[i])
```

---

**Calculating Tip Usage**

- **Estimate in Advance:** Before running the protocol, calculate the number of tips required based on the number of transfers and the `new_tip` parameter.

- **Account for Pipette Type:** Remember that multi-channel pipettes use multiple tips per pick-up (e.g., an 8-channel pipette uses 8 tips per pick-up).

- **Example Calculation:**

  If you are transferring samples to 96 wells using a single-channel pipette with `new_tip='always'`, you will need 96 tips. If you are using a multi-channel pipette (8-channel) to transfer to 12 columns, you will need 12 tip pickups (12 columns x 8 tips per pickup = 96 tips).

---

**Optimizing Transfers**

- **Use Lists in `transfer`:** Provide lists of source and destination wells to the `transfer` function to leverage its built-in iteration.

- **Minimize Tip Usage:** When appropriate, reuse tips by setting `new_tip='once'` to conserve tips and reduce waste.

- **Avoid Unnecessary Loops:** Let the `transfer` function handle iteration over wells and volumes.

---

**Efficient Labware Access**

- **Match Pipette Type to Access Method:** Use `wells()` for single-channel pipettes and `columns()` for multi-channel pipettes.

- **Use Labware Methods Correctly:** Ensure you are accessing wells and columns using the correct methods to prevent errors.

---

**Example 1: Single Source to Multiple Destinations**

**Task:** Transfer 1 µL of reagent from tube A1 in the source rack to all wells in the destination plate using the same tip.

**Protocol:**

```python
def run(protocol):
    # Labware
    tiprack = protocol.load_labware('opentrons_96_tiprack_20ul', 2)
    source_rack = protocol.load_labware('opentrons_24_tuberack_nest_1.5ml_snapcap', 3)
    dest_plate = protocol.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt', 9)

    # Pipette
    p20 = protocol.load_instrument('p20_single_gen2', mount='right', tip_racks=[tiprack])

    # Wells
    src_well = source_rack.wells_by_name()['A1']
    dest_wells = dest_plate.wells()

    # Transfer
    p20.transfer(1, src_well, dest_wells, new_tip='once')
```

---

**Example 2: Well-to-Well Transfers with Reused Tips**

**Task:** Transfer 50 µL from wells A1 and A2 in source labware 1 to wells B6 and B7 in source labware 2 using the same tip.

**Protocol:**

```python
def run(protocol):
    # Labware
    source_labware_1 = protocol.load_labware('source_labware_1_definition', 1)
    source_labware_2 = protocol.load_labware('source_labware_2_definition', 2)
    tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', 3)

    # Pipette
    p300 = protocol.load_instrument('p300_single_gen2', mount='left', tip_racks=[tiprack])

    # Wells
    source_wells = [source_labware_1.wells_by_name()[well] for well in ['A1', 'A2']]
    destination_wells = [source_labware_2.wells_by_name()[well] for well in ['B6', 'B7']]

    # Transfer
    p300.transfer(50, source_wells, destination_wells, new_tip='once')
```

---

**Example 3: Column-wise Transfers with Multi-Channel Pipette**

**Task:** Using a P300 Multi-Channel pipette, transfer 55 µL of sample from each column of the source plate into the corresponding columns of the destination plate, changing tips between each transfer.

**Protocol:**

```python
def run(protocol):
    # Labware
    source_plate = protocol.load_labware('source_plate_definition', 1)
    destination_plate = protocol.load_labware('destination_plate_definition', 2)
    tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', 3)

    # Pipette
    p300_multi = protocol.load_instrument('p300_multi_gen2', mount='left', tip_racks=[tiprack])

    # Columns
    src_cols = source_plate.columns()
    dest_cols = destination_plate.columns()

    # Transfer
    p300_multi.transfer(55, src_cols, dest_cols, new_tip='always')
```

---

**Example 4: Complex Transfers with Different Pipettes**

**Task:** Transfer 15 µL from wells C4 and C6 in source labware 2 to wells A3 and A4 in source labware 1 using the same tip.

**Protocol:**

```python
def run(protocol):
    # Labware
    source_1 = protocol.load_labware('source_labware_1_definition', 1)
    source_2 = protocol.load_labware('source_labware_2_definition', 2)
    tiprack = protocol.load_labware('opentrons_96_tiprack_20ul', 3)

    # Pipette
    p20 = protocol.load_instrument('p20_single_gen2', mount='right', tip_racks=[tiprack])

    # Wells
    src_wells = [source_2.wells_by_name()[well] for well in ['C4', 'C6']]
    dest_wells = [source_1.wells_by_name()[well] for well in ['A3', 'A4']]

    # Transfer
    p20.transfer(15, src_wells, dest_wells, new_tip='once')
```

---

**Example 5: Transfers Involving Modules**

**Task:** Perform transfers involving thermocycler and temperature modules, handling temperature settings and PCR amplification steps.

**Protocol:**

```python
def run(protocol):
    import math

    # Sample preparation parameters
    number_of_samples = 64
    sample_volume_ul = 5
    master_mix_volume_ul = 7
    mixing_cycles = 9
    total_mix_volume_ul = sample_volume_ul + master_mix_volume_ul

    # Modules
    thermocycler_module = protocol.load_module('thermocyclerModuleV2')
    sample_temp_module = protocol.load_module('temperature module gen2', 1)
    master_mix_temp_module = protocol.load_module('temperature module gen2', 3)

    # Labware
    tips_20ul = protocol.load_labware('opentrons_96_filtertiprack_20ul', 4)
    pcr_plate = thermocycler_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    sample_plate = sample_temp_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')
    master_mix_plate = master_mix_temp_module.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')

    # Pipette
    p20_multi = protocol.load_instrument('p20_multi_gen2', 'left', tip_racks=[tips_20ul])

    # Well allocation
    number_of_columns = math.ceil(number_of_samples / 8)
    sample_source_wells = sample_plate.columns()[:number_of_columns]
    sample_destination_wells = pcr_plate.columns()[:number_of_columns]
    master_mix_source_wells = master_mix_plate.columns()[:number_of_columns]
    master_mix_destination_wells = pcr_plate.columns()[:number_of_columns]

    # Set temperatures
    sample_temp_module.set_temperature(4)
    master_mix_temp_module.set_temperature(10)

    # Transfer master mix
    p20_multi.transfer(
        master_mix_volume_ul,
        master_mix_source_wells,
        master_mix_destination_wells,
        new_tip='once'
    )

    # Transfer samples and mix
    p20_multi.transfer(
        sample_volume_ul,
        sample_source_wells,
        sample_destination_wells,
        new_tip='always',
        mix_after=(mixing_cycles, total_mix_volume_ul),
        blow_out=True,
        blowout_location='destination well'
    )

    # PCR cycling steps (simplified for brevity)
    thermocycler_module.close_lid()
    thermocycler_module.execute_profile(
        steps=[
            {{'temperature': 74, 'hold_time_seconds': 65}},
            {{'temperature': 60, 'hold_time_seconds': 7}},
            {{'temperature': 84, 'hold_time_seconds': 19}},
            {{'temperature': 57, 'hold_time_seconds': 44}}
        ],
        repetitions=13,
        block_max_volume=total_mix_volume_ul
    )
    thermocycler_module.open_lid()

    # Deactivate modules
    master_mix_temp_module.deactivate()
    sample_temp_module.deactivate()
```

---

**Example 6: Dynamic Transfers Using CSV Data**

**Task:** Perform transfers based on data provided in a CSV file, without using the thermocycler.

**Protocol:**

```python
def run(protocol):
    # CSV data as a multi-line string
    csv_data = '''
    Primer Tube,Destination well
    A1,A1
    B1,B1
    C1,C1
    D1,D1
    A2,E1
    B2,F1
    C2,G1
    D2,H1
    '''

    # Parse CSV data
    csv_lines = [line.strip().split(',') for line in csv_data.strip().splitlines() if line.strip()]
    headers = csv_lines[0]
    data = csv_lines[1:]

    # Labware
    tuberack = protocol.load_labware('opentrons_24_tuberack_nest_2ml_snapcap', 'C1')
    dest_plate = protocol.load_labware('biorad_96_wellplate_200ul_pcr', 'B1')
    tiprack_single = [protocol.load_labware('opentrons_96_tiprack_50ul', slot) for slot in ['A1']]
    p50 = protocol.load_instrument('p50_single', 'right', tip_racks=tiprack_single)

    # Transfers based on CSV data
    for row in data:
        source_tube = row[0]
        dest_well = row[1]
        p50.transfer(7, tuberack.wells_by_name()[source_tube], dest_plate.wells_by_name()[dest_well], new_tip='always')
```

---

**Additional Examples**

**Example 7: Transfer with Heater-Shaker Module**

**Task:** Transfer liquids between a reservoir, a PCR plate, and a heater-shaker module's plate, including shaking the plate.

**Protocol:**

```python
def run(protocol):
    # Modules
    heater_shaker_module = protocol.load_module('heaterShakerModuleV1', 'D1')
    heater_shaker_plate = heater_shaker_module.load_labware('corning_96_wellplate_360ul_flat')

    # Labware
    reservoir = protocol.load_labware('nest_1_reservoir_195ml', 'C1')
    pcr_plate = protocol.load_labware('nest_96_wellplate_200ul_flat', 'D2')
    tiprack_200ul = protocol.load_labware('opentrons_96_tiprack_200ul', 'A2')
    tiprack_50ul = protocol.load_labware('opentrons_96_tiprack_50ul', 'C2')

    # Pipette
    pipette = protocol.load_instrument('p300_multi', mount='left', tip_racks=[tiprack_200ul, tiprack_50ul])

    # Steps
    heater_shaker_module.open_labware_latch()
    protocol.pause("Please place the plate on the Heater-Shaker Module.")
    heater_shaker_module.close_labware_latch()

    # Transfer 70 µL from reservoir to heater-shaker plate
    pipette.transfer(70, reservoir['A1'], heater_shaker_plate['A1'], new_tip='always')

    # Transfer 10 µL from PCR plate to heater-shaker plate
    pipette.transfer(10, pcr_plate['A1'], heater_shaker_plate['A1'], new_tip='always')

    # Shake the plate
    heater_shaker_module.set_and_wait_for_shake_speed(rpm=2000)
    protocol.delay(minutes=1)
    heater_shaker_module.deactivate_shaker()
```

---

**Advanced Usage**

Advanced features of the `transfer` function include specifying aspiration and dispense locations, mixing, air gaps, blow out, and using modules with `transfer`.

---

**Specifying Aspiration and Dispense Locations**

You can specify precise locations within wells for aspiration and dispensing.

**Example:**

```python
pipette.transfer(
    20,
    source_well.bottom(3),  # 3 mm above the bottom
    destination_well.top(-7),  # 7 mm below the top
    new_tip='once'
)
```

---

**Using Mix After/Before**

Mixing can be performed before or after the transfer.

**Example:**

```python
pipette.transfer(
    10,
    source_well,
    destination_well,
    mix_after=(5, 10)  # Mix 5 times with a volume of 10 µL after dispensing
)
```

---

**Handling Air Gaps and Blow Out**

Air gaps and blow-out can prevent dripping and ensure complete dispensing.

**Example:**

```python
pipette.transfer(
    10,
    source_well,
    destination_well,
    air_gap=5,  # Add a 5 µL air gap after aspiration
    blow_out=True,
    blowout_location='destination well'
)
```

---

**Using Modules with `transfer`**

The `transfer` function can be used effectively with various modules like the thermocycler, temperature modules, and heater-shaker modules. When using modules:

- **Set Module Temperatures Before Transfers:** Ensure that temperature modules are set to the desired temperature before performing transfers.

- **Load Labware on Modules:** Use the module's `load_labware` or `load_adapter` method to place labware on the module.

**Example:**

```python
# Load modules
temp_module = protocol.load_module('temperature module gen2', '1')
thermocycler_module = protocol.load_module('thermocyclerModuleV2')

# Load labware on modules
temp_plate = temp_module.load_labware('opentrons_96_aluminumblock_biorad_wellplate_200ul')
pcr_plate = thermocycler_module.load_labware('nest_96_wellplate_100ul_pcr_full_skirt')

# Set temperatures
temp_module.set_temperature(4)
thermocycler_module.set_block_temperature(95)
```

---

**Dynamic Transfers Based on Data**

For protocols that require dynamic transfers based on external data (e.g., CSV files), you can parse the data and use it to control the `transfer` function.

- **Parsing CSV Data:** Use Python's built-in functions or the `csv` module to read and parse CSV data.

- **Using Parsed Data in Transfers:** Use the parsed data to define source wells, destination wells, and volumes.

**Example:**

```python
import csv
from io import StringIO

def run(protocol):
    # CSV data as a string
    csv_data = '''
    Source Well,Destination Well,Volume
    A1,B1,50
    A2,B2,100
    A3,B3,150
    '''

    # Parse CSV data
    reader = csv.DictReader(StringIO(csv_data.strip()))
    transfers = list(reader)

    # Labware
    source_plate = protocol.load_labware('nest_96_wellplate_200ul_flat', '1')
    dest_plate = protocol.load_labware('nest_96_wellplate_200ul_flat', '2')
    tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', '3')
    pipette = protocol.load_instrument('p300_single', 'left', tip_racks=[tiprack])

    # Perform transfers based on CSV data
    for transfer in transfers:
        source_well = source_plate.wells_by_name()[transfer['Source Well']]
        dest_well = dest_plate.wells_by_name()[transfer['Destination Well']]
        volume = float(transfer['Volume'])
        pipette.transfer(volume, source_well, dest_well, new_tip='always')

```

</Transfer function notes>
