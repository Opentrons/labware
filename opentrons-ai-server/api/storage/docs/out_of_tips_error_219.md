# Preventing "Out of Tips" and Index Errors in Opentrons Protocols

"Out of tips" and index errors are common issues that can halt the execution of protocols on Opentrons robots. These errors occur when the protocol attempts to use more pipette tips than are available or when it tries to access wells beyond the labware's dimensions. Proper planning and understanding of tip consumption and labware indexing are essential to prevent such errors and ensure smooth laboratory operations.

## Common Scenarios Leading to Errors

### 1. Single Pipette Exceeds Tip Rack Capacity

**Scenario:**
A single-channel pipette performs repeated operations using tips from a single tip rack without accounting for tip depletion.

**Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Single Tip Rack Exhaustion Example',
    'author': 'Opentrons',
    'description': 'A protocol that runs out of tips after exceeding tip rack capacity',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack = protocol.load_labware('opentrons_96_tiprack_300ul', '2')

    # Load pipette
    pipette = protocol.load_instrument('p300_single', 'left', tip_racks=[tip_rack])

    # Perform operations
    for _ in range(100):
        pipette.pick_up_tip()
        pipette.aspirate(100, plate['A1'])
        pipette.dispense(100, plate['B1'])
        pipette.drop_tip()
```

**Issue Explanation:**
The protocol attempts 100 tip pickups using a single tip rack containing only 96 tips. After 96 successful pickups, the pipette runs out of tips, resulting in an error on the 97th attempt.

---

### 2. Multi-Channel Pipette with Insufficient Tip Racks

**Scenario:**
A multi-channel pipette uses tips from a single tip rack but requires more tips than are available due to the number of channels used per operation.

**Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Multi-Channel Tip Rack Exhaustion Example',
    'author': 'Opentrons',
    'description': 'A protocol where a multi-channel pipette runs out of tips',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack = protocol.load_labware('opentrons_96_tiprack_300ul', '2')

    # Load pipette
    pipette = protocol.load_instrument('p300_multi', 'right', tip_racks=[tip_rack])

    # Perform operations
    for i in range(20):
        pipette.pick_up_tip()
        pipette.aspirate(100, plate.rows()[0][i])
        pipette.dispense(100, plate.rows()[1][i])
        pipette.drop_tip()
```

**Issue Explanation:**
A multi-channel pipette uses 8 tips per pick-up. Over 20 iterations, it requires 160 tips (20 iterations × 8 tips). A single 96-tip rack is exhausted after 12 iterations (96 tips / 8 tips per iteration), causing an error during the 13th iteration. Additionally, attempting to access `plate.rows()[0][i]` where `i` exceeds 11 (the maximum index for 12 columns) results in an index error.

**Solution:**

- **Load Additional Tip Racks:** Introduce more tip racks to provide enough tips for all operations.
- **Validate Index Ranges:** Ensure that the loop indices do not exceed the labware dimensions.

**Corrected Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Multi-Channel Tip Rack Exhaustion Example - Solved',
    'author': 'Opentrons',
    'description': 'Multi-channel pipette avoids running out of tips and index errors',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack1 = protocol.load_labware('opentrons_96_tiprack_300ul', '2')
    tip_rack2 = protocol.load_labware('opentrons_96_tiprack_300ul', '3')

    # Load pipette
    pipette = protocol.load_instrument('p300_multi', 'right', tip_racks=[tip_rack1, tip_rack2])

    # Perform operations within available columns range
    for i in range(12):  # Restrict to 12 columns
        pipette.pick_up_tip()
        pipette.aspirate(100, plate.columns()[i][0])
        pipette.dispense(100, plate.columns()[i][1])
        pipette.drop_tip()
```

---

### 3. Nested Loops Causing Excessive Tip Usage

**Scenario:**
Nested loops in the protocol lead to a higher number of tip pickups than anticipated, exhausting the available tips.

**Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Nested Loops Tip Exhaustion Example',
    'author': 'Opentrons',
    'description': 'A protocol demonstrating tip exhaustion due to nested loops',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack = protocol.load_labware('opentrons_96_tiprack_300ul', '2')

    # Load pipette
    pipette = protocol.load_instrument('p300_single', 'left', tip_racks=[tip_rack])

    # Perform operations
    for row in range(8):
        for col in range(12):
            for _ in range(2):
                pipette.pick_up_tip()
                pipette.aspirate(100, plate.rows()[row][col])
                pipette.dispense(100, plate.rows()[row][(col + 1) % 12])
                pipette.drop_tip()
```

**Issue Explanation:**
The nested loops result in 192 tip pickups (8 rows × 12 columns × 2 repetitions). With only 96 tips available, the protocol runs out of tips halfway through, causing an error.

**Solution:**
Introduce additional tip racks to provide enough tips for all operations.

**Corrected Protocol Example:**

```python
def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack1 = protocol.load_labware('opentrons_96_tiprack_300ul', '2')
    tip_rack2 = protocol.load_labware('opentrons_96_tiprack_300ul', '3')

    # Load pipette
    pipette = protocol.load_instrument('p300_single', 'left', tip_racks=[tip_rack1, tip_rack2])

    # Perform operations (same as above)
```

---

## Calculating Tip Usage in Many-to-Many Transfers

In protocols involving many-to-many transfers, it's crucial to calculate the number of tips required accurately to avoid "out of tips" errors.

### Guidelines for Many-to-Many Transfers

- **Even Divisibility:** Ensure the number of wells in the larger group (source or destination) is evenly divisible by the number of wells in the smaller group.
- **Stretching the Smaller Group:** Conceptually "stretch" the smaller group of wells to match the length of the larger group. Each well in the smaller group may be used multiple times.
- **Tip Requirement:** The number of tips required is always equal to the number of wells in the larger group.
- **Multi-Channel Pipettes:** For multi-channel pipettes, remember that each operation uses multiple tips (e.g., 8 tips for an 8-channel pipette). If using a 96-channel pipette, each operation consumes 96 tips.

### Example Calculation

- **Scenario:** Transfer from 24 source wells to 96 destination wells.
- **Process:**
  - The 24 source wells are stretched to match the 96 destination wells.
  - Each source well is used multiple times to cover all destination wells.
  - **Total Transfers:** 96.
  - **Tips Required:**
    - **Single-Channel Pipette:** 96 tips (one per transfer).
    - **Multi-Channel Pipette (8-channel):** 12 transfers (96 wells / 8 channels), using 8 tips per transfer, totaling 96 tips.

---

## Key Points to Avoid Index Errors

- **Validate Access Ranges:** Always ensure that your loops and operations do not exceed the dimensions of the labware being used. For example, a 96-well plate has 12 columns and 8 rows; accessing an index beyond these ranges will cause an error.
- **Sufficient Resources:** Make sure the number of loaded tip racks can handle the total number of operations required by the protocol.

**Example Problem:**

A multi-channel pipette runs out of tips after 12 operations due to using 8 tips per operation, and the code attempts to access non-existent column indices beyond the 12 columns available in a 96-well plate.

**Incorrect Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Multi-Channel Index Error Example',
    'author': 'Opentrons',
    'description': 'A protocol that causes index errors due to invalid column access',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack = protocol.load_labware('opentrons_96_tiprack_300ul', '2')

    # Load pipette
    pipette = protocol.load_instrument('p300_multi', 'right', tip_racks=[tip_rack])

    # Perform operations
    for i in range(20):  # Exceeds available columns
        pipette.pick_up_tip()
        pipette.aspirate(100, plate.columns()[i][0])
        pipette.dispense(100, plate.columns()[i][1])
        pipette.drop_tip()
```

**Solution:**

- **Restrict Loop Indices:** Adjust the loop to stay within the valid column indices (0 to 11 for a 96-well plate).
- **Load Additional Tip Racks:** Ensure enough tips are available for all operations.

**Corrected Protocol Example:**

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Multi-Channel Index Error Example - Solved',
    'author': 'Opentrons',
    'description': 'A protocol that avoids index errors by validating column indices',
    'apiLevel': '2.13'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    plate = protocol.load_labware('corning_96_wellplate_360ul_flat', '1')
    tip_rack1 = protocol.load_labware('opentrons_96_tiprack_300ul', '2')
    tip_rack2 = protocol.load_labware('opentrons_96_tiprack_300ul', '3')

    # Load pipette
    pipette = protocol.load_instrument('p300_multi', 'right', tip_racks=[tip_rack1, tip_rack2])

    # Perform operations within available columns range
    for i in range(12):  # Valid column indices for a 96-well plate
        pipette.pick_up_tip()
        pipette.aspirate(100, plate.columns()[i][0])
        pipette.dispense(100, plate.columns()[i][1])
        pipette.drop_tip()
```

---

## Best Practices to Avoid "Out of Tips" and Index Errors

### 1. Calculate Required Tips in Advance

- **Estimate Operations:** Calculate the total number of pipetting actions that require new tips, including loops and many-to-many transfers.
- **Consider Multiple Pipettes:** Calculate tip requirements separately for each pipette, accounting for their specific usage patterns.

### 2. Load Sufficient Tip Racks

- **Tip Rack Capacity:** Standard 96-tip racks hold 96 tips. Ensure the total number of tips available meets or exceeds your calculated requirement.
- **Add Buffers:** Include extra tip racks to handle unexpected needs or minor calculation errors.

### 3. Validate Labware Indexing

- **Check Labware Dimensions:** Before accessing wells or columns in loops, confirm the dimensions of your labware to avoid index errors.
- **Adjust Loop Ranges:** Ensure that loop indices do not exceed the maximum indices of the labware being used.

### 4. Associate Tip Racks with Pipettes

- **Specify Tip Racks:** Explicitly associate each pipette with its corresponding tip racks for efficient tip tracking.
- **Multiple Tip Racks:** Use multiple tip racks for pipettes with high tip consumption.

### 5. Implement Tip Replenishment Strategies

- **Dynamic Replenishment:** Use commands like `move_labware()` to swap in fresh tip racks during long protocols.
- **Manual Replenishment:** Plan steps within the protocol to allow for manual replacement of tip racks if automatic replenishment isn't feasible.

### 6. Optimize Tip Usage

- **Reuse Tips When Appropriate:** If protocol requirements allow, reuse the same tip for multiple transfers to reduce tip consumption.
- **Minimize Tip Pickups:** Combine transfers when possible to limit the number of tip pickups.

### 7. Handle Special Cases Carefully

- **Multi-Channel Pipettes:** Remember that multi-channel pipettes consume multiple tips per pickup. Adjust tip rack quantities accordingly.
- **Nested Loops:** Be cautious with nested loops, as they can exponentially increase tip usage. Validate tip requirements before execution.
- **Many-to-Many Transfers:** Apply the specific calculations for many-to-many transfers to determine accurate tip usage.

### 8. Implement Error Handling and Testing

- **Catch Errors Early:** Incorporate checks to detect potential "out of tips" or index errors before they cause runtime issues.
- **Conduct Dry Runs:** Perform simulations or test runs to ensure all logical paths are covered and tip requirements are met.

---

## Example when using serial dilution protocol

Below protocol produces `OutofTips` error, since it excauts all tips by using `plate.rows()`:
(One needs to be careful)

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'OT-2',
    'apiLevel': '2.16'
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', 1)
    reservoir = protocol.load_labware('nest_12_reservoir_15ml', 2)
    plate = protocol.load_labware('nest_96_wellplate_200ul_flat', 3)

    # Load pipette
    p300 = protocol.load_instrument('p300_single_gen2', 'left', tip_racks=[tiprack])

    # Distribute diluent
    p300.transfer(100, reservoir['A1'], plate.wells())

    # Perform serial dilution
    for row in plate.rows():
        # Transfer and mix solution from reservoir to first well
        p300.transfer(100, reservoir['A2'], row[0], mix_after=(3, 50), new_tip='always')

        # Serial dilution within the row
        p300.transfer(100, row[:11], row[1:], mix_after=(3, 50), new_tip='always')

```

Correct way is follows:

```python
from opentrons import protocol_api

requirements = {
    'robotType': 'OT-2',
    'apiLevel': '2.16'
}

def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)
    left_pipette = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tips])

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
```
