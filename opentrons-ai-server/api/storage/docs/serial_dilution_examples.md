# Tutorial: Creating a Serial Dilution Protocol

## Introduction

This tutorial will guide you through creating a Python protocol file from scratch. At the end of this process you'll have a complete protocol that can run on a Flex or an OT-2 robot.

### What You'll Automate

The lab task that you'll automate in this tutorial is serial dilution: taking a solution and progressively diluting it by transferring it stepwise across a plate from column 1 to column 12. With just a dozen or so lines of code, you can instruct your robot to perform the hundreds of individual pipetting actions necessary to fill an entire 96-well plate. And all of those liquid transfers will be done automatically, so you'll have more time to do other work in your lab.

### Hardware and Labware

Before running a protocol, you'll want to have the right kind of hardware and labware ready for your Flex or OT-2.

- **Flex users** Most Flex code examples will use a Flex 1-Channel 1000 μL pipette.
- **OT-2 users** You can use either a single-channel or 8-channel pipette for this tutorial. Most OT-2 code examples will use a P300 Single-Channel GEN2 pipette.

The Flex and OT-2 use similar labware for serial dilution. The tutorial code will use the labware listed in the table below, but as long as you have labware of each type you can modify the code to run with your labware.

| Labware type  | Labware name                   | API load name                     |
| ------------- | ------------------------------ | --------------------------------- |
| Reservoir     | NEST 12 Well Reservoir 15 mL   | `nest_12_reservoir_15ml`          |
| Well plate    | NEST 96 Well Plate 200 µL Flat | `nest_96_wellplate_200ul_flat`    |
| Flex tip rack | Opentrons Flex Tips, 200 µL    | `opentrons_flex_96_tiprack_200ul` |
| OT-2 tip rack | Opentrons 96 Tip Rack          | `opentrons_96_tiprack_300ul`      |

For the liquids, you can use plain water as the diluent and water dyed with food coloring as the solution.

## Create a Protocol File

Let's start from scratch to create your serial dilution protocol. Open up a new file in your editor and start with the line:

```python
from opentrons import protocol_api
```

Throughout this documentation, you'll see protocols that begin with the `import` statement shown above. It identifies your code as an Opentrons protocol. This statement is not required, but including it is a good practice and allows most code editors to provide helpful autocomplete suggestions.

Everything else in the protocol file is required. Next, you'll specify the version of the API you're using. Then comes the core of the protocol: defining a single `run()` function that provides the locations of your labware, states which kind of pipettes you'll use, and finally issues the commands that the robot will perform.

For this tutorial, you'll write very little Python outside of the `run()` function. But for more complex applications it's worth remembering that your protocol file _is_ a Python script, so any Python code that can run on your robot can be a part of a protocol.

### Metadata

Every protocol needs to have a metadata dictionary with information about the protocol. At minimum, you need to specify what version of the API the protocol requires. The scripts for this tutorial were validated against API version 2.16, so specify:

```python
metadata = {"apiLevel": "2.16"}
```

You can include any other information you like in the metadata dictionary. The fields `protocolName`, `description`, and `author` are all displayed in the Opentrons App, so it's a good idea to expand the dictionary to include them:

```python
metadata = {
    "apiLevel": "2.16",
    "protocolName": "Serial Dilution Tutorial",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
}
```

### Requirements

The `requirements` code block can appear before _or_ after the `metadata` code block in a Python protocol. It uses the following syntax and accepts two arguments: `robotType` and `apiLevel`.

Whether you need a `requirements` block depends on your robot model and API version.

- **Flex:** The `requirements` block is always required. And, the API version does not go in the `metadata` section. The API version belongs in the `requirements`. For example:

```python
requirements = {"robotType": "Flex", "apiLevel": "2.16"}
```

- **OT-2:** The `requirements` block is optional, but including it is a recommended best practice, particularly if you're using API version 2.15 or greater. If you do use it, remember to remove the API version from the `metadata`. For example:

```python
requirements = {"robotType": "OT-2", "apiLevel": "2.16"}
```

### The `run()` function

Now it's time to actually instruct the Flex or OT-2 how to perform serial dilution. All of this information is contained in a single Python function, which has to be named `run`. This function takes one argument, which is the _protocol context_. Many examples in these docs use the argument name `protocol`, and sometimes they specify the argument's type:

```python
def run(protocol: protocol_api.ProtocolContext):
```

With the protocol context argument named and typed, you can start calling methods on `protocol` to add labware and hardware.

#### Labware

For serial dilution, you need to load a tip rack, reservoir, and 96-well plate on the deck of your Flex or OT-2. Loading labware is done with the `load_labware()` method of the protocol context, which takes two arguments: the standard labware name as defined in the Opentrons Labware Library, and the position where you'll place the labware on the robot's deck.

##### Flex

Here's how to load the labware on a Flex in slots D1, D2, and D3:

```python
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2")
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D3")
```

If you're using a different model of labware, find its name in the Labware Library and replace it in your code.

##### OT-2

Here's how to load the labware on an OT-2 in slots 1, 2, and 3:

```python
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)
```

If you're using a different model of labware, find its name in the Labware Library and replace it in your code.

You may notice that these deck maps don't show where the liquids will be at the start of the protocol. Liquid definitions aren't required in Python protocols, unlike protocols made in Protocol Designer. If you want to identify liquids, see Labeling Liquids in Wells. (Sneak peek: you'll put the diluent in column 1 of the reservoir and the solution in column 2 of the reservoir.)

#### Trash Bin

Flex and OT-2 both come with a trash bin for disposing used tips.

The OT-2 trash bin is fixed in slot 12. Since it can't go anywhere else on the deck, you don't need to write any code to tell the API where it is.

Flex lets you put a trash bin in multiple locations on the deck. You can even have more than one trash bin, or none at all (if you use the waste chute instead, or if your protocol never trashes any tips). For serial dilution, you'll need to dispose used tips, so you also need to tell the API where the trash container is located on your robot. Loading a trash bin on Flex is done with the `load_trash_bin()` method, which takes one argument: its location. Here's how to load the trash in slot A3:

```python
trash = protocol.load_trash_bin("A3")
```

#### Pipettes

Next you'll specify what pipette to use in the protocol. Loading a pipette is done with the `load_instrument()` method, which takes three arguments: the name of the pipette, the mount it's installed in, and the tip racks it should use when performing transfers. Load whatever pipette you have installed in your robot by using its standard pipette name. Here's how to load the pipette in the left mount and instantiate it as a variable named `left_pipette`:

For Flex:

```python
left_pipette = protocol.load_instrument("flex_1channel_1000", "left", tip_racks=[tips])
```

For OT-2:

```python
left_pipette = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tips])
```

Since the pipette is so fundamental to the protocol, it might seem like you should have specified it first. But there's a good reason why pipettes are loaded after labware: you need to have already loaded `tips` in order to tell the pipette to use it. And now you won't have to reference `tips` again in your code — it's assigned to the `left_pipette` and the robot will know to use it when commanded to pick up tips.

Note: You may notice that the value of `tip_racks` is in brackets, indicating that it's a list. This serial dilution protocol only uses one tip rack, but some protocols require more tips, so you can assign them to a pipette all at once, like `tip_racks=[tips1, tips2]`.

#### Steps

Finally, all of your labware and hardware is in place, so it's time to give the robot pipetting steps (also known as commands). The required steps of the serial dilution process break down into three main phases:

1. Measure out equal amounts of diluent from the reservoir to every well on the plate.
2. Measure out equal amounts of solution from the reservoir into wells in the first column of the plate.
3. Move a portion of the combined liquid from column 1 to 2, then from column 2 to 3, and so on all the way to column 12.

Thanks to the flexibility of the API's `transfer()` method, which combines many building block commands into one call, each of these phases can be accomplished with a single line of code! You'll just have to write a few more lines of code to repeat the process for as many rows as you want to fill.

Let's start with the diluent. This phase takes a larger quantity of liquid and spreads it equally to many wells. `transfer()` can handle this all at once, because it accepts either a single well or a list of wells for its source and destination:

```python
left_pipette.transfer(100, reservoir["A1"], plate.wells())
```

Breaking down these single lines of code shows the power of complex commands. The first argument is the amount to transfer to each destination, 100 µL. The second argument is the source, column 1 of the reservoir (which is still specified with grid-style coordinates as `A1` — a reservoir only has an A row). The third argument is the destination. Here, calling the `wells()` method of `plate` returns a list of _every well_, and the command will apply to all of them.

In plain English, you've instructed the robot, "For every well on the plate, aspirate 100 µL of fluid from column 1 of the reservoir and dispense it in the well." That's how we understand this line of code as scientists, yet the robot will understand and execute it as nearly 200 discrete actions.

Now it's time to start mixing in the solution. To do this row by row, nest the commands in a `for` loop:

```python
for i in range(8):
    row = plate.rows()[i]
```

Using Python's built-in `range` class is an easy way to repeat this block 8 times, once for each row. This also lets you use the repeat index `i` with `plate.rows()` to keep track of the current row.

In each row, you first need to add solution. This will be similar to what you did with the diluent, but putting it only in column 1 of the plate. It's best to mix the combined solution and diluent thoroughly, so add the optional `mix_after` argument to `transfer()`:

```python
left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))
```

As before, the first argument specifies to transfer 100 µL. The second argument is the source, column 2 of the reservoir. The third argument is the destination, the element at index 0 of the current `row`. Since Python lists are zero-indexed, but columns on labware start numbering at 1, this will be well A1 on the first time through the loop, B1 the second time, and so on. The fourth argument specifies to mix 3 times with 50 µL of fluid each time.

Finally, it's time to dilute the solution down the row. One approach would be to nest another `for` loop here, but instead let's use another feature of the `transfer()` method, taking lists as the source and destination arguments:

```python
left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

There's some Python shorthand here, so let's unpack it. You can get a range of indices from a list using the colon `:` operator, and omitting it at either end means "from the beginning" or "until the end" of the list. So the source is `row[:11]`, from the beginning of the row until its 11th item. And the destination is `row[1:]`, from index 1 (column 2!) until the end. Since both of these lists have 11 items, `transfer()` will _step through them in parallel_, and they're constructed so when the source is 0, the destination is 1; when the source is 1, the destination is 2; and so on. This condenses all of the subsequent transfers down the row into a single line of code.

All that remains is for the loop to repeat these steps, filling each row down the plate.

That's it! If you're using a single-channel pipette, you're ready to try out your protocol.

#### 8-Channel Pipette

If you're using an 8-channel pipette, you'll need to make a couple tweaks to the single-channel code from above. Most importantly, whenever you target a well in row A of a plate with an 8-channel pipette, it will move its topmost tip to row A, lining itself up over the entire column.

Thus, when adding the diluent, instead of targeting every well on the plate, you should only target the top row:

```python
left_pipette.transfer(100, reservoir["A1"], plate.rows()[0])
```

And by accessing an entire column at once, the 8-channel pipette effectively implements the `for` loop in hardware, so you'll need to remove it:

```python
row = plate.rows()[0]
left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))
left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

Instead of tracking the current row in the `row` variable, this code sets it to always be row A (index 0).

## Complete Protocol Examples

Here are the complete protocols for both single-channel and 8-channel configurations:

### Single-Channel Protocol (Flex)

```python
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.16"}

metadata = {
    "protocolName": "Serial Dilution Tutorial",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tips = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2")
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D3")
    trash = protocol.load_trash_bin("A3")

    # Load pipette
    left_pipette = protocol.load_instrument(
        "flex_1channel_1000",
        "left",
        tip_racks=[tips]
    )

    # Distribute diluent
    left_pipette.transfer(100, reservoir["A1"], plate.wells())

    # Perform serial dilution
    for i in range(8):
        row = plate.rows()[i]
        # Add solution to first well of row
        left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))
        # Perform dilution down the row
        left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

### 8-Channel Protocol (OT-2)

```python
from opentrons import protocol_api

requirements = {"robotType": "OT-2", "apiLevel": "2.16"}

metadata = {
    "protocolName": "Serial Dilution Tutorial",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)

    # Load pipette
    left_pipette = protocol.load_instrument(
        "p300_single_gen2",
        "left",
        tip_racks=[tips]
    )

    # Distribute diluent to top row (8-channel will handle all rows)
    left_pipette.transfer(100, reservoir["A1"], plate.rows()[0])

    # Perform serial dilution using only the top row
    row = plate.rows()[0]
    left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))
    left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

These complete examples show how to implement the entire serial dilution workflow for both Flex and OT-2 robots, using either single-channel or 8-channel pipettes. The protocols will:

1. Load all necessary labware and pipettes
2. Distribute diluent to all wells
3. Add solution to the first column
4. Perform serial dilution across the plate
5. Mix thoroughly at each step

The key difference between single-channel and 8-channel implementations is that the 8-channel pipette naturally handles all rows simultaneously, eliminating the need for the row-by-row loop.

<Serial dilution example protocol>

<single channel serial dilution>

Write a protocol using the Opentrons Python Protocol API v2 for Opentrons OT-2 robot according to the following description:

Application:
Other

Description:
A simple serial dilution

Pipette mount(s):

P20 Single-Channel GEN2 is mounted on the left
Modules:

Labware:

NEST 12 Well Reservoir 15 mL x 1
NEST 96 Well Plate 100 µL PCR Full Skirt x 1
Opentrons OT-2 96 Tip Rack 20 µL x 1
Liquids:

Liquid 1: diluent liquid, solution

Steps:

Step 1: For every well on the plate, aspirate 100 µL of fluid from column 1 of the reservoir and dispense it in the well plate. Use the same tip for each transfer.

Step 2: Dilute the solution down the row:

- Transfer 100ul of diluent from column 2 of the reservoir to the first well of the row. Mix 3 times with 50 ul. Use the same tip for each transfer.
- Perform a serial dilution by transferring 100 µL from each well to the next well in the row (from left to right). Mix 3 times with 50 µL after each transfer. Use the same tip for each transfer.

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Serial Dilution',
    'author': 'Assistant',
    'description': 'Perform serial dilution with diluent and sample distribution'
}

requirements = {
    "robotType": "OT-2",
    "apiLevel": "2.19"
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tiprack = protocol.load_labware('opentrons_96_tiprack_300ul', 1)  # Changed to 300ul tips
    reservoir = protocol.load_labware('nest_12_reservoir_15ml', 2)
    plate = protocol.load_labware('nest_96_wellplate_100ul_pcr_full_skirt', 3)

    # Load P300 pipette instead of P20
    pipette = protocol.load_instrument('p300_single_gen2', 'left', tip_racks=[tiprack])

    # Step 1: Distribute diluent to all wells using the same tip
    pipette.distribute(
        100,
        reservoir.columns()[0],
        plate.wells(),
        new_tip='once'
    )

    # Step 2: Perform serial dilution for each row
    for i in range(8):  # Process each row
        row = plate.rows()[i]  # Get current row

        # Transfer solution from reservoir to first well and mix
        pipette.transfer(
            100,
            reservoir.columns()[1],
            row[0],
            mix_after=(3, 50),
            new_tip='once'
        )

        # Dilute down the row
        pipette.transfer(
            100,
            row[:11],  # Source wells: first 11 wells
            row[1:],   # Destination wells: last 11 wells
            mix_after=(3, 50),
            new_tip='once'
        )

```

</single channel serial dilution>

<multi-channel serial dilution>

Application:
Other

Description:
A simple serial dilution protocol

Pipette mount(s):

P300 8-Channel GEN2 is mounted on the left
Modules: None

Labware:

Opentrons OT-2 96 Tip Rack 300 µL x 1
NEST 12 Well Reservoir 15 mL x 1
NEST 96 Well Plate 100 µL PCR Full Skirt x 1
Liquids:

Liquid 1: diluent, solution

Steps:

Step 1: Transfer 100ul of diluent from reservoir first column to all wells of the well plate. Use the same tip for each transfer.
Step 2: Dilute down the row:

- Transfer 100ul of diluent from second column of reservoir to the first row of the first column of the well plate. Mix 3 times with 50ul. Use the same tip for each transfer.
- Transfer 100ul of solution from each well to the next well in the row. Mix 3 times with 50ul. Use the same tip for each transfer.

```python
from opentrons import protocol_api

metadata = {
    'protocolName': 'Serial Dilution Protocol',
    'author': 'Assistant',
    'description': 'A simple serial dilution protocol using multi-channel pipette'
}

requirements = {
    "robotType": "OT-2",
    "apiLevel": "2.19"
}

def run(protocol: protocol_api.ProtocolContext):
    # Load labware
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", "1")
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "2")
    plate = protocol.load_labware("nest_96_wellplate_100ul_pcr_full_skirt", "3")

    # Load pipette
    p300_multi = protocol.load_instrument(
        "p300_multi_gen2",
        "left",
        tip_racks=[tips]
    )

    # Step 1: Distribute diluent to all wells
    p300_multi.transfer(
        100,
        reservoir['A1'],
        plate.rows()[0],
        new_tip='once'
    )

    # Step 2: Serial dilution along the row
    # Transfer from reservoir and mix
    p300_multi.transfer(
        100,
        reservoir['A2'],
        plate.rows()[0][0],
        mix_after=(3, 50),
        new_tip='once'
    )

    # Perform serial dilution down the row
    p300_multi.transfer(
        100,
        plate.rows()[0][:11],
        plate.rows()[0][1:],
        mix_after=(3, 50),
        new_tip='once'
    )

```

</multi-channel serial dilution>

<Serial dilution example protocol>

# More serial dilution protocol examples

## 1. Serial dilution example

<description>
Write a protocol using the Opentrons Python Protocol API v2 for Flex robot for the following description:

Metadata:

- Author: New API User
- ProtocolName: Serial Dilution Tutorial – Flex 1-channel
- Description: serial dilution

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.16"}

Labware:

- Tiprack: `Opentrons Flex 96 Tip Rack 200 µL` in slot D1
- Reservoir: `NEST 12 Well Reservoir 15 mL` in slot D2
- Plate: `NEST 96 Well Plate 200 µL Flat` in slot D3
- Trash bin in slot A3

Pipette mount:

- Flex 1-channel 1000 µL pipette is mounted on the left

Commands:

1. Use the left-mounted Flex 1-channel 1000 µL pipette to distribute 100 µL of diluent from well A1 of the reservoir to all wells of the plate.
2. For each of the 8 rows in the plate:
   a. Transfer 100 µL of solution from well A2 of the reservoir to the first well of the row, mixing 3 times with 50 µL after transfer.
   b. Perform a serial dilution by transferring 100 µL from each well to the next well in the row (from left to right), for a total of 11 transfers. Mix 3 times with 50 µL after each transfer.
   </description>

<protocol>

```python
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
```

</protocol>

## 2. Serial dilution example

<description>

serial&heater-shaker
serial&heater-shaker
100%
10
A3

Write a protocol using the Opentrons Python Protocol API v2 for Flex robot for the following description:

Metadata:

- Author: New API User
- ProtocolName: Serial Dilution Tutorial – Flex 8-channel
- Description: This protocol is the outcome of following the Python Protocol API Tutorial located at https://docs.opentrons.com/v2/tutorial.html. It takes a solution and progressively dilutes it by transferring it stepwise across a plate.

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.16"}

Labware:

- Tiprack: `Opentrons 96 Tip Rack 300 µL` in slot D1
- Reservoir: `NEST 12 Well Reservoir 15 mL` in slot D2
- Plate: `NEST 96 Well Plate 200 µL Flat` in slot D3
- Trash bin in slot A3

Pipette mount:

- Flex 8-channel 1000 µL pipette is mounted on the right

Commands:

1. Use the right-mounted Flex 8-channel 1000 µL pipette to distribute 100 µL of diluent from well A1 of the reservoir to the first row of the plate.
2. Transfer 100 µL of solution from well A2 of the reservoir to the first column of the first row in the plate, mixing 3 times with 50 µL after transfer.
3. Perform a serial dilution by transferring 100 µL from each column to the next column in the row (from left to right), for a total of 11 transfers. Mix 3 times with 50 µL after each transfer.

Write a protocol using the Opentrons Python Protocol API v2 for Flex robot for the following description:

Metadata:

- Author: New API User
- ProtocolName: Serial Dilution Tutorial – Flex 8-channel
- Description: This protocol is the outcome of following the Python Protocol API Tutorial located at https://docs.opentrons.com/v2/tutorial.html. It takes a solution and progressively dilutes it by transferring it stepwise across a plate.

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.16"}

Labware:

- Tiprack: `Opentrons 96 Tip Rack 300 µL` in slot D1
- Reservoir: `NEST 12 Well Reservoir 15 mL` in slot D2
- Plate: `NEST 96 Well Plate 200 µL Flat` in slot D3
- Trash bin in slot A3

Pipette mount:

- Flex 8-channel 1000 µL pipette is mounted on the right

Commands:

1. Use the right-mounted Flex 8-channel 1000 µL pipette to distribute 100 µL of diluent from well A1 of the reservoir to the first row of the plate.
2. Transfer 100 µL of solution from well A2 of the reservoir to the first column of the first row in the plate, mixing 3 times with 50 µL after transfer.
3. Perform a serial dilution by transferring 100 µL from each column to the next column in the row (from left to right), for a total of 11 transfers. Mix 3 times with 50 µL after each transfer.
   Turn on screen reader support
   To enable screen reader support, press ⌘+Option+Z To learn about keyboard shortcuts, press ⌘slash
   </description>

<protocol>

```python
from opentrons import protocol_api

metadata = {
    "protocolName": "Serial Dilution Tutorial – Flex 8-channel",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
    }

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.16"
    }

def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", "D1")
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2")
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D3")
    trash = protocol.load_trash_bin("A3")
    left_pipette = protocol.load_instrument("flex_8channel_1000", "right", tip_racks=[tips])

    # distribute diluent
    left_pipette.transfer(100, reservoir["A1"], plate.rows()[0])

    # no loop, 8-channel pipette

    # save the destination row to a variable
    row = plate.rows()[0]

    # transfer solution to first well in column
    left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))

    # dilute the sample down the row
    left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

</protocol>

## 3. Serial dilution example

<description>

Write a protocol using the Opentrons Python Protocol API v2 for OT-2 robot for the following description:

Metadata:

- Author: New API User
- ProtocolName: Serial Dilution Tutorial – OT-2 single-channel
- Description: This protocol is the outcome of following the Python Protocol API Tutorial located at https://docs.opentrons.com/v2/tutorial.html. It takes a solution and progressively dilutes it by transferring it stepwise across a plate.
- apiLevel: 2.16

Requirements:

- robotType: OT-2
- apiLevel: 2.16

Labware:

- Tiprack: `Opentrons 96 Tip Rack 300 µL` in slot 1
- Reservoir: `NEST 12 Well Reservoir 15 mL` in slot 2
- Plate: `NEST 96 Well Plate 200 µL Flat` in slot 3

Pipette mount:

- P300 Single-Channel GEN2 pipette is mounted on the left

Commands:

1. Use the left-mounted P300 Single-Channel GEN2 pipette to distribute 100 µL of diluent from well A1 of the reservoir to all wells of the plate.
2. For each of the 8 rows in the plate:
   a. Transfer 100 µL of solution from well A2 of the reservoir to the first well of the row, mixing 3 times with 50 µL after transfer.
   b. Perform a serial dilution by transferring 100 µL from each well to the next well in the row (from left to right), for a total of 11 transfers. Mix 3 times with 50 µL after each transfer.

</description>

<protocol>

```python
from opentrons import protocol_api

metadata = {
    "apiLevel": "2.16",
    "protocolName": "Serial Dilution Tutorial – OT-2 single-channel",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
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

</protocol>

## 4. Serial dilution example

<description>
Write a protocol using the Opentrons Python Protocol API v2 for OT-2 robot for the following description:

Metadata:

- Author: New API User
- ProtocolName: Serial Dilution Tutorial – OT-2 8-channel
- Description: This protocol is the outcome of following the Python Protocol API Tutorial located at https://docs.opentrons.com/v2/tutorial.html. It takes a solution and progressively dilutes it by transferring it stepwise across a plate.
- apiLevel: 2.16

Requirements:

- robotType: OT-2
- apiLevel: 2.16

Labware:

- Tiprack: `Opentrons 96 Tip Rack 300 µL` in slot 1
- Reservoir: `NEST 12 Well Reservoir 15 mL` in slot 2
- Plate: `NEST 96 Well Plate 200 µL Flat` in slot 3

Pipette mount:

- P300 8-Channel GEN2 pipette is mounted on the right

Commands:

1. Use the right-mounted P300 8-Channel GEN2 pipette to distribute 100 µL of diluent from well A1 of the reservoir to the first row of the plate.
2. Transfer 100 µL of solution from well A2 of the reservoir to the first column of the plate (row A), mixing 3 times with 50 µL after transfer.
3. Perform a serial dilution by transferring 100 µL from each column to the next column in the row (from left to right), for a total of 11 transfers across the plate. Mix 3 times with 50 µL after each transfer.
   </description>

<protocol>

```python
from opentrons import protocol_api

metadata = {
    "apiLevel": "2.16",
    "protocolName": "Serial Dilution Tutorial – OT-2 8-channel",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
    }

def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)
    left_pipette = protocol.load_instrument("p300_multi_gen2", "right", tip_racks=[tips])

    # distribute diluent
    left_pipette.transfer(100, reservoir["A1"], plate.rows()[0])

    # no loop, 8-channel pipette

    # save the destination row to a variable
    row = plate.rows()[0]

    # transfer solution to first well in column
    left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))

    # dilute the sample down the row
    left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))
```

</protocol>

## 5. Serial dilution example

<description>
Write a protocol using the Opentrons Python Protocol API v2 for OT-2 robot for the following description:

Metadata:

- Author: John C. Lynch
- ProtocolName: Serial Dilution for Eskil
- Description: Execute serial dilution protocol
- Source: Custom Protocol Request
- API Level: 2.19

Requirements:

- requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

Constants:

- Plate type: Opentrons 96 Aluminum Block NEST Well Plate 100 µL
- Dilution factor: 1.5
- Number of dilutions: 10
- Total mixing volume: 150 uL

Modules:

- Temperature module loaded in slot 4

Labware:

- NEST 12 Well Reservoir 15 mL in slot 1
- Dilution plate (Opentrons 96 Aluminum Block NEST Well Plate 100 uL) loaded on temperature module
- Two Opentrons 96 Tip Racks 300 uL in slots 2 and 3

Pipette Mount:

- P300 Multi-Channel GEN2 pipette mounted on the left side

Calculations:

- Transfer volume = Total mixing volume / Dilution factor
- Diluent volume = Total mixing volume - Transfer volume

Commands:

1. Using the P300 Multi-Channel pipette, transfer diluent from the first well of the reservoir to wells 2-10 of the first row of the dilution plate:

   - Volume: calculated diluent volume
   - Use a 10 uL air gap
   - Use new tips for each transfer

2. Perform serial dilutions across the first row of the dilution plate:

   - For each pair of adjacent wells (from well 1 to well 9, transferring to wells 2 to 10):
     - Transfer the calculated transfer volume
     - Use a 10 uL air gap
     - After each transfer, mix 5 times with (Total mixing volume - 5 uL)
     - Use new tips for each transfer

3. Add blank to the last well:
   - Transfer calculated diluent volume from the first reservoir well to the last well of the first row in the dilution plate
   - Use a 10 uL air gap
   - Use a new tip
     </description>

<protocol>

```python
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
```

</protocol>

## 6. Serial dilution example

<description>
Write a protocol using the Opentrons Python Protocol API v2 for Flex robot for the following description:

Metadata:

- Author: Opentrons <protocols@opentrons.com>
- ProtocolName: Customizable Serial Dilution
- Source: Protocol Library

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.19"}

Inside the run function:

Constants:

- Dilution factor: 3
- Number of dilutions: 10
- Total mixing volume: 150.0 µL
- Air gap volume: 10 µL

Calculations:

- Transfer volume = Total mixing volume / Dilution factor
- Diluent volume = Total mixing volume - Transfer volume

Labware:

- NEST 12 Well Reservoir 15 mL in slot D2
- NEST 96 Well Plate 200 µL Flat in slot D3
- Two Opentrons Flex 96 Filter Tip Racks 1000 µL in slots C1 and D1
- Trash bin in slot A3

Pipette Mount:

- Flex 1-channel 1000 µL pipette mounted on the right side

Liquid Definitions:

- Diluent liquid: Green color (#33FF33), loaded in reservoir at 80% max volume
- Sample liquid: Red color (#FF0000), loaded in first column of plate at 150 µL per well

Commands:

1. Distribute diluent to dilution plate:

   - Pick up one tip
   - Transfer calculated diluent volume from reservoir to all wells in columns 2-11
   - Use 10 µL air gap for each transfer
   - Reuse the same tip for all transfers
   - Drop tip after completion

2. Perform serial dilutions:

   - Pick up one tip
   - For each well in columns 1-10 (source) to columns 2-11 (destination):
     - Transfer calculated transfer volume
     - Use 10 µL air gap
     - After each transfer, mix 5 times with half the total mixing volume
     - Reuse the same tip for all transfers
   - Drop tip after completion

3. Add blank to last column:
   - Pick up one tip
   - Transfer calculated diluent volume from reservoir to all wells in column 12
   - Use 10 µL air gap
   - Reuse the same tip for all transfers
   - Drop tip after completion
     </description>

<protocol>

```python
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
    pipette = protocol.load_instrument('flex_1channel_1000', 'right', tipracks)

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
    dilution_destination_sets = plate.columns()[1:NUM_DILUTIONS+1]
    dilution_source_sets = plate.columns()[:NUM_DILUTIONS]
    blank_set = plate.columns()[NUM_DILUTIONS+1]

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
```

</protocol>

## 7. Serial dilution example

<description>
Write a protocol using the Opentrons Python Protocol API v2 for Flex robot for the following description:

Metadata:

- Author: Opentrons <protocols@opentrons.com>
- ProtocolName: Customizable Serial Dilution
- Source: Protocol Library

Requirements:

- requirements = {"robotType": "Flex", "apiLevel": "2.19"}

Inside the run function:

Constants:

- Dilution factor: 3
- Number of dilutions: 10
- Total mixing volume: 150.0 µL
- Air gap volume: 10 µL

Calculations:

- Transfer volume = Total mixing volume / Dilution factor
- Diluent volume = Total mixing volume - Transfer volume

Labware:

- NEST 12 Well Reservoir 15 mL in slot D2
- NEST 96 Well Plate 200 µL Flat in slot D3
- Two Opentrons Flex 96 Filter Tip Racks 1000 µL in slots C1 and D1
- Trash bin in slot A3

Pipette Mount:

- Flex 8-channel 1000 µL pipette mounted on the right side

Liquid Definitions:

- Diluent liquid: Green color (#33FF33), loaded in reservoir at 80% max volume
- Sample liquid: Red color (#FF0000), loaded in first column of plate at 150 µL per well

Commands:

1. Distribute diluent to dilution plate:

   - Pick up one tip with 8-channel pipette
   - Transfer calculated diluent volume from reservoir to wells 2-11 in row A
   - Use 10 µL air gap for each transfer
   - Reuse the same tip for all transfers
   - Drop tip after completion

2. Perform serial dilutions along row A:

   - Pick up one tip with 8-channel pipette
   - For each well pair from A1 to A10 (source) to A2 to A11 (destination):
     - Transfer calculated transfer volume
     - Use 10 µL air gap
     - After each transfer, mix 5 times with half the total mixing volume
     - Reuse the same tip for all transfers
   - Drop tip after completion

3. Add blank to well A12:
   - Pick up one tip with 8-channel pipette
   - Transfer calculated diluent volume from reservoir to well A12
   - Use 10 µL air gap
   - Reuse the same tip
   - Drop tip after completion
     </description>

<protocol>

```python
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
```

</protocol>
