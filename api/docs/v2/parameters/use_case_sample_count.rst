:og:description: How to set up and use a sample count parameter in an Opentrons Python protocol.

.. _use-case-sample-count:

*********************************
Parameter Use Case – Sample Count
*********************************

Choosing how many samples to process is important for efficient automation. This use case explores how a single parameter for sample count can have pervasive effects throughout a protocol. The examples are adapted from an actual parameterized protocol for DNA prep. The sample code will use 8-channel pipettes to process 8, 16, 24, or 32 samples.

At first glance, it might seem like sample count would primarily affect liquid transfers to and from sample wells. But when using the Python API's full range of capabilities, it affects:

- How many tip racks to load.
- The initial volume and placement of reagents.
- Pipetting to and from samples.
- If and when tip racks need to be replaced.

To keep things as simple as possible, this use case only focuses on setting up and using the value of the sample count parameter, which is just one of several parameters present in the full protocol.

From Samples to Columns
=======================

First of all, we need to set up the sample count parameter so it's both easy for technicians to understand during protocol setup and easy for us to use in the protocol's ``run()`` function.

We want to limit the number of samples to 8, 16, 24, or 32, so we'll use an integer parameter with choices::

    def add_parameters(parameters):

        parameters.add_int(
            variable_name="sample_count",
            display_name="Sample count",
            description="Number of input DNA samples.",
            default=24,
            choices=[
                {"display_name": "8", "value": 8},
                {"display_name": "16", "value": 16},
                {"display_name": "24", "value": 24},
                {"display_name": "32", "value": 32},
            ]
        )

All of the possible values are multiples of 8, because the protocol will use an 8-channel pipette to process an entire column of samples at once. Considering how 8-channel pipettes access wells, it may be more useful to operate with a *column count* in code. We can set a ``column_count`` very early in the ``run()`` function by accessing the value of ``params.sample_count`` and dividing it by 8::

    def run(protocol):

        column_count = protocol.params.sample_count // 8

Most examples below will use ``column_count``, rather than redoing (and retyping!) this calculation multiple times.

Loading Tip Racks
=================

Tip racks come first in most protocols. To ensure that the protocol runs to completion, we need to load enough tip racks to avoid running out of tips.

We could load as many tip racks as are needed for our maximum number of samples, but that would be suboptimal. Run setup is faster when the technician doesn't have to load extra items onto the deck. So it's best to examine the protocol's steps and determine how many racks are needed for each value of ``sample_count``.

In the case of this DNA prep protocol, we can create formulas for the number of 200 µL and 50 µL tip racks needed. The following factors go into these computations:

- 50 µL tips
    - 1 fixed action that picks up once per protocol.
    - 7 variable actions that pick up once per sample column.
- 200 µL tips
    - 2 fixed actions that pick up once per protocol.
    - 11 variable actions that pick up once per sample column.

Since each tip rack has 12 columns, divide the number of pickup actions by 12 to get the number of racks needed. And we always need to round up — performing 13 pickups requires 2 racks. The :py:func:`math.ceil` method rounds up to the nearest integer. We'll add ``from math import ceil`` at the top of the protocol and then calculate the number of tip racks as follows::

    tip_rack_50_count = ceil((1 + 7 * column_count) / 12)
    tip_rack_200_count = ceil((2 + 13 * column_count) / 12)

Running the numbers shows that the maximum combined number of tip racks is 7. Now we have to decide where to load up to 7 racks, working around the modules and other labware on the deck. Assuming we're running this protocol on a Flex with staging area slots, they'll all fit! (If you don't have staging area slots, you can load labware off-deck instead.) We'll reserve these slots for the different size racks::

    tip_rack_50_slots = ["B3", "C3", "B4"]
    tip_rack_200_slots = ["A2", "B2", "A3", "A4"]

Finally, we can combine this information to call :py:meth:`~.ProtocolContext.load_labware`. Depending on the number of racks needed, we'll slice that number of elements from the slot list and use a `list comprehension <https://docs.python.org/2/tutorial/datastructures.html#list-comprehensions>`__ to gather up the loaded tip racks. For the 50 µL tips, this would look like::

    tip_racks_50 = [
        protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_50ul",
            location=slot
        )
        for slot in tip_rack_50_slots[:tip_rack_50_count]
    ]

Then we can associate those lists of tip racks directly with each pipette as we load them. All together, the start of our ``run()`` function looks like this::

    # calculate column count from sample count
    column_count = protocol.params.sample_count // 8

    # calculate number of required tip racks
    tip_rack_50_count = ceil((1 + 7 * column_count) / 12)
    tip_rack_200_count = ceil((2 + 13 * column_count) / 12)

    # assign tip rack locations (maximal case)
    tip_rack_50_slots = ["B3", "C3", "B4"]
    tip_rack_200_slots = ["A2", "B2", "A3", "A4"]

    # create lists of loaded tip racks
    # limit to number of needed racks for each type
    tip_racks_50 = [
        protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_50ul",
            location=slot
        )
        for slot in tip_rack_50_slots[:tip_rack_50_count]
    ]
    tip_racks_200 = [
        protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_200ul",
            location=slot
        )
        for slot in tip_rack_200_slots[:tip_rack_200_count]
    ]

    pipette_50 = protocol.load_instrument(
        instrument_name="flex_8channel_50",
        mount="right",
        tip_racks=tip_racks_50
    )
    pipette_1000 = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=tip_racks_200
    )

This code will load as few as 3 tip racks and as many as 7, and associate them with the correct pipettes — all based on a single choice from a dropdown menu at run setup.

Loading Liquids
===============

Next come the reagents, samples, and the labware that holds them.

The required volume of each reagent is dependent on the sample count. While the full protocol defines more than ten liquids, we'll show three reagents plus the samples here.

First, let's load a reservoir and :ref:`define <defining-liquids>` the three example liquids. Definitions only specify the name, description, and display color, so our sample count parameter doesn't come into play yet::

    # labware to hold reagents
    reservoir = protocol.load_labware(
        load_name="nest_12_reservoir_15ml", location="C2"
    )

    # reagent liquid definitions
    ampure_liquid = protocol.define_liquid(
        name="AMPure", description="AMPure Beads", display_color="#704848"
    )
    tagstop_liquid = protocol.define_liquid(
        name="TAGSTOP", description="Tagmentation Stop", display_color="#FF0000"
    )
    twb_liquid = protocol.define_liquid(
        name="TWB", description="Tagmentation Wash Buffer", display_color="#FFA000"
    )

Now we'll bring sample count into consideration as we :ref:`load the liquids <loading-liquids>`. The application requires the following volumes for each column of samples:

.. list-table::
    :header-rows: 1

    * - Liquid
      - | Volume
        | (µL per column)
    * - AMPure Beads
      - 180
    * - Tagmentation Stop
      - 10
    * - Tagmentation Wash Buffer
      - 900

To calculate the total volume for each liquid, we'll multiply these numbers by ``column_count`` and by 1.1 (to ensure that the pipette can aspirate the required volume without drawing in air at the bottom of the well). This calculation can be done inline as the ``volume`` value of :py:meth:`~.Well.load_liquid`::

    reservoir["A1"].load_liquid(
        liquid=ampure_liquid, volume=180 * column_count * 1.1
    )
    reservoir["A2"].load_liquid(
        liquid=tagstop_liquid, volume=10 * column_count * 1.1
    )
    reservoir["A4"].load_liquid(
        liquid=twb_liquid, volume=900 * column_count * 1.1
    )

Now, for example, the volume of AMPure beads to load will vary from 198 µL for a single sample column up to 792 µL for four columns.

.. tip::

    Does telling a technician to load 792 µL of a liquid seem overly precise? Remember that you can perform any calculation you like to set the value of ``volume``! For example, you could round the AMPure volume up to the nearest 10 µL::

        volume=ceil((180 * column_count * 1.1) / 10) * 10

Finally, it's good practice to label the wells where the samples reside. The sample plate starts out atop the Heater-Shaker Module:

.. code-block::

    hs_mod = protocol.load_module(
        module_name="heaterShakerModuleV1", location="D1"
    )
    hs_adapter = hs_mod.load_adapter(name="opentrons_96_pcr_adapter")
    sample_plate = hs_adapter.load_labware(
        name="opentrons_96_wellplate_200ul_pcr_full_skirt",
        label="Sample Plate",
    )

Now we can construct a ``for`` loop to label each sample well with ``load_liquid()``. The simplest way to do this is to combine our original *sample count* with the fact that the :py:meth:`.Labware.wells()` accessor returns wells top-to-bottom, left-to-right::

    # define sample liquid
    sample_liquid = protocol.define_liquid(
        name="Samples", description=None, display_color="#52AAFF"
    )

    # load 40 µL in each sample well
    for w in range(protocol.params.sample_count):
        sample_plate.wells()[w].load_liquid(liquid=sample_liquid, volume=40)

Processing Samples
==================

When it comes time to process the samples, we'll return to working by column, since the protocol uses an 8-channel pipette. There are many pipetting stages in the full protocol, but this section will examine just the stage for adding the Tagmentation Stop liquid. The same techniques would apply to similar stages.

For pipetting in the original sample locations, we'll command the 50 µL pipette to move to some or all of A1–A4 on the sample plate. Similar to when we loaded tip racks earlier, we can use ``column_count`` to slice a list containing these well names, and then iterate over that list with a ``for`` loop::

    for w in ["A1", "A2", "A3", "A4"][:column_count]:
        pipette_50.pick_up_tip()
        pipette_50.aspirate(volume=13, location=reservoir["A2"].bottom())
        pipette_50.dispense(volume=3, location=reservoir["A2"].bottom())
        pipette_50.dispense(volume=10, location=sample_plate[w].bottom())
        pipette_50.move_to(location=sample_plate[w].bottom())
        pipette_50.mix(repetitions=10, volume=20)
        pipette_50.blow_out(location=sample_plate[w].top(z=-2))
        pipette_50.drop_tip()

Each time through the loop, the pipette will fill from the same well of the reservoir and then dispense (and mix and blow out) in a different column of the sample plate.

Later steps of the protocol will move intermediate samples to the middle of the plate (columns 5–8) and final samples to the right side of the plate (columns 9–12). When moving directly from one set of columns to another, we have to track *both lists* with the ``for`` loop. The :py:func:`zip` function lets us pair up the lists of well names and step through them in parallel::

    for initial, intermediate in zip(
        ["A1", "A2", "A3", "A4"][:column_count],
        ["A5", "A6", "A7", "A8"][:column_count],
    ):
        pipette_50.pick_up_tip()
        pipette_50.aspirate(volume=13, location=sample_plate[initial])
        pipette_50.dispense(volume=13, location=sample_plate[intermediate])
        pipette_50.drop_tip()

This will transfer from column 1 to 5, 2 to 6, and so on — depending on the number of samples chosen during run setup.

Replenishing Tips
=================

For the higher values of ``protocol.params.sample_count``, the protocol will load tip racks in the staging area slots (column 4). Since pipettes can't reach these slots, we need to move these tip racks into the working area (columns 1–3) before issuing a pipetting command that targets them, or the API will raise an error.

A protocol without parameters will always run out of tips at the same time — just add a :py:meth:`.move_labware` command when that happens. But as we saw in the Processing Samples section above, our parameterized protocol will go through tips at a different rate depending on the sample count.

In our simplified example, we know that when the sample count is 32, the first 200 µL tip rack will be exhausted after three stages of pipetting using the 1000 µL pipette. So, after that step, we could add::

    if protocol.params.sample_count == 32:
        protocol.move_labware(
            labware=tip_racks_200[0],
            new_location=chute,
            use_gripper=True,
        )
        protocol.move_labware(
            labware=tip_racks_200[-1],
            new_location="A2",
            use_gripper=True,
        )

This will replace the first 200 µL tip rack (in slot A2) with the last 200 µL tip rack (in the staging area).

However, in the full protocol, sample count is not the only parameter that affects the rate of tip use. It would be unwieldy to calculate in advance all the permutations of when tip replenishment is necessary. Instead, before each stage of the protocol, we could use :py:obj:`.Well.has_tip()` to check whether the first tip rack is empty. If the *last well* of the rack is empty, we can assume that the entire rack is empty and needs to be replaced::

    if tip_racks_200[0].wells()[-1].has_tip is False:
        # same move_labware() steps as above

For a protocol that uses tips at a faster rate than this one — such that it might exhaust a tip rack in a single ``for`` loop of pipetting steps — you may have to perform such checks even more frequently. You can even define a function that counts tips or performs ``has_tip`` checks in combination with picking up a tip, and use that instead of :py:meth:`.pick_up_tip` every time you pipette. The built-in capabilities of Python and the methods of the Python Protocol API give you the flexibility to add this kind of smart behavior to your protocols.
