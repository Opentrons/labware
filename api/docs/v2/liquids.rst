:og:description: How to select and apply a liquid class definition in Opentrons protocols. 

.. _liquids:

##############
Liquid Classes
##############

At the core of your protocol are liquid transfers, the liquid handling steps the robot performs to move liquids in labware. 

Liquid definitions aren't required in Python protocols. However, defining and specifying the liquids you use can help keep track of each throughout your protocol. It also lets you take advantage of transfer behavior optimized for liquid classes. 

Accounting for liquid properties like viscosity can improve pipetting accuracy on the Flex. You can select a liquid class, shown below, to use in your protocol. 

.. list-table::
    :header-rows: 1

    * - Liquid Class
      - Description
      - Load Name
    * - Aqueous
      - 
        * Based on deionized water
        * The system default
      - `water`
    * - Aqueous
      -
        * Based on 80% ethanol
      - `ethanol_80`
      - Viscous
      - 
       * Based on 50% glycerol
      - `glycerol_50`

Select a combination of liquid class, pipette, and tips to use in your protocol. Each combination automatically defines transfer behavior optimized for the liquid class. 

*************************
Selecting a liquid class
*************************

First, define the tips, trash, pipette, and labware used in your transfers. Then use :py:meth:`.ProtocolContext.define_liquid_class` to select a liquid in your protocol as one of the three classes. 

.. code-block:: python
  :substitutions:

  from opentrons import protocol_api

  metadata = {'apiLevel': '|apiLevel|'

  requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23"
  }

  ## define tips, trash, and pipette
  def run(protocol_context):
      tiprack1 = protocol_context.load_labware("opentrons_flex_96_tiprack_50ul", "D3")
      trash = protocol_context.load_trash_bin('A3')
      pipette_50 = protocol_context.load_instrument("flex_1channel_50", "left", tip_racks=[tiprack1])

  ## load labware for transfers
      nest_plate = protocol_context.load_labware("nest_96_wellplate_200ul_flat", "C3")
      arma_plate = protocol_context.load_labware("armadillo_96_wellplate_200ul_pcr_full_skirt", "C2")

  ## select liquid class 
      liquid_1 = protocol_context.define_liquid_class("glycerol_50")
      liquid_2 = protocol_context.define_liquid_class("glycerol_50")
      liquid_3 = protocol_context.define_liquid_class("water")


Here, you selected two viscous liquids, defined as `liquid_1` and `liquid_2`, using the load name `glycerol_50`. Defining liquids is especially important when using multiple liquids of the same class. 

When you use `transfer_liquid` for any liquid, you'll choose a pipette, tip, and volume combination. You'll also enter source and destination wells in your labware and the trash location. 

The `water`, `glycerol_50`, and `ethanol_80` liquid class definitions account for steps the robot will perform to optimize your liquid transfers. Transfer behavior like flow rate, air gap, delay, and submerge and retract speed automatically change based on your liquid class, pipette, and tip selections. Not all transfer behavior is easily visible. For more detail on transfer behavior, see the Liquid Class Definitions section. 

***********************
Liquid Class Transfers
************************

Use `transfer_liquid` to transfer an aqueous, volatile, or viscous liquid defined in your protocol. Here, you'll specify volume, source, and destination wells, tip handling preferences, and the trash location. 

.. code-block:: python

        pipette_50.transfer_liquid(
          liquid_class=liquid_1,
          volume=30,
          source=nest_plate.rows()[0],
          dest=arma_plate.rows()[0], 
          new_tip="always", 
          trash_location=trash
        )

The `flex_1channel_50` pipette uses `opentrons_flex_96_tiprack_50ul` tips to transfer 30 µL of your viscous `liquid_1` from each well of the NEST source plate to each well of the Armadillo destination plate. A new tip is used for each well transfer, and each tip is dropped in the trash bin in deck slot A3. 

All other transfer behavior is defined by the viscous liquid class definition and any changes you make for `liquid_1`. 

****************************************
Changing transfer behavior for a liquid
****************************************

Each liquid class definition accounts for steps the robot will perform to optimize your liquid transfers. Advanced settings like mix, pre-wet tip, touch tip, and blowout are disabled for liquid class transfers. 

You can make changes or enable these settings for each liquid you use in your protocol. Here, use your liquid name, piette, and tip rack combination to access and edit properties for `liquid_1`. 

.. code-block:: python
  ## change properties of p50 pipette, tips, and liquid_1
    liquid_1_p50_props = liquid_1.get_for(pipette_50, tiprack1)

  ## change submerge speed before aspirate to 50 m/sec
    liquid_1_p50_props.aspirate.submerge.speed = 50

  ## change flow rate to 120 µL/sec to aspirate 30 µL
    liquid_1_p50_props.aspirate.flowrate_by_volume.set_for_volume(30, 120)

  ## enable mix, touch tip, and pre-wet tip for aspirate with liquid_1
    liquid_1_p50_props.aspirate.mix.enabled = True 
    liquid_1_p50_props.aspirate.pre_wet = True
    liquid_1_p50_props.aspirate.retract.touch_tip.enabled = True

  ## enable blowout for dispense with liquid_1
    liquid_1_p50_props.dispense.retract.blowout.location = "source"
    liquid_1_p50_props.dispense.retract.blowout.flow_rate = pipette_50.flow_rate.blow_out
    liquid_1_p50_props.dispense.retract.blowout.enabled = True


Each liquid class definition includes flow rate for the volume range of the pipette. If you use the `flex_1channel_50` pipette and `opentrons_flex_96_tiprack_50ul` tips to transfer a viscous liquid, the aspirate flow rate changes for each volume: 
  * 7 µL/sec to aspirate 1 µL
  * 10 µL/sec to aspirate 10 µL
  * 50 µL/sec to aspirate 50 µL 

With the changes you made above, the `flex_1channel_50` pipette will aspirate 30 µL with a flow rate of 120 µL per second. Aspirate flow rates also apply to pre-wet tip and mix behavior associated with an aspirate step. For either aspirate or dispense flow rates, you can edit the flow rate by volume as shown above, or to a single value with `flowrate_by_volume`.

If you were to perform the same transfer with changes made to `liquid_1` transfer behavior, your protocol would look the same. 

.. code-block:: python

        pipette_50.transfer_liquid(
          liquid_class=liquid_1,
          volume=30,
          source=nest_plate.rows()[0],
          dest=arma_plate.rows()[0], 
          new_tip="always", 
          trash_location=trash
        )


Here, transfer behavior is defined by both the viscous `glycerol_50` liquid class definition and any changes you made for `liquid_1`. Actions the Flex performs for each aspirate and single dispense include: 

For each aspirate, the `flex_1channel_50` pipette: 
  * Submerges into `liquid_1` at 50 mm/sec and does not delay afterwards
  * Mixes 30 µL of `liquid_1` at 120 µL/sec and repeats once 
  * Pre-wets a `opentrons_flex_96_tiprack_50ul` tip using specified aspirate and dispense flow rates 
  * Aspirates 30 µL of `liquid_1` from the source well at 120 µL/sec with a correction by volume
  * Delays for 1 second
  * Touches the `opentrons_flex_96_tiprack_50ul` tip to all 4 sides of the source well at 0.5 mm from the well edge with a speed of 30 mm/sec
  * Adds an air gap of 0.1 [units?]
  * Retracts from `liquid_1` at 4 mm/sec and does not delay afterwards.

For each single dispense, the `flex_1channel_50` pipette:  
  * Submerges into the destination well at 4 mm/sec and does not delay afterwards
  * Dispenses 30 µL of `liquid_1` into the destination well at 25 µL/sec with a correction by volume
  * Pushes out 30 µL from the tip and does not mix `liquid_1`
  * Blows out at the [source?]
  * Delays for 0.5 second
  * Adds an air gap of 0.1 [units?]
  * Retracts from the destination well at 4 mm/sec and does not delay afterwards 
  * Drops the tip into the trash bin in slot A3.

See the section below for a summary of transfer behavior changes used with each liquid class, including multi-dispense behavior. 

************************
Liquid Class Definitions
************************

The aqueous, volatile, or viscous liquid classes are defined by optimized transfer behavior for each liquid. For example, a slower flow rate can improve pipetting for a viscous liquid, and an air gap can prevent a volatile liquid from dripping onto the Flex deck. 

This section includes a summary of transfer behavior changes for each liquid class. The transfer steps are listed in the order the robot peforms them. Advanced settings like mix, pre-wet tip, touch tip, and blowout are disabled for liquid class transfers. See the Changing Transfer Behavior for a Liquid section to enable these settings for liquids in your protocols. 

Transfer behaviors marked with an asterisk vary based on the pipette and tip combination used in your protocol. These include flow rate, air gap volume, and push out volume. Let's say you use a `flex_1channel_1000` pipette and `opentrons_flex_96_tiprack_200ul` tips to aspirate a volatile liquid. The transfer volume specifies the flow rate: 
  * 7 µL/sec to aspirate 5 µL
  * 50 µL/sec to aspirate 50 µL
  * 200 µL/sec to aspirate 200 µL


When you aspirate a liquid between these three volumes, a linear interpolation determines the flow rate. If you were to use a `flex_1channel_1000` pipette and `opentrons_flex_96_tiprack_1000ul` tips for the same transfer, the aspirate flow rate changes to 10, 100, or 200 µL per second. 

Aspirating a Liquid
====================

+-------------------+--------------------------------------+---------------------------------------------+---------------------------------------------+--+--+--+--+--+--+
| Transfer Behavior | Aqueous                              | Volatile                                    | Viscous                                     |  |  |  |  |  |  |
+===================+======================================+=============================================+=============================================+==+==+==+==+==+==+
| Submerge speed    | * 100 mm/sec  * 35 mm/sec for 96-ch. | 4 mm/sec                                    | * 100 mm/sec  * 35 mm/sec for 96-ch.        |  |  |  |  |  |  |
| Flow rate*        | 50, 200, 478, or 716 µL/sec          | 7-200 µL/sec, includes correction by volume | 7-200 µL/sec, includes correction by volume |  |  |  |  |  |  |
| Delay             | yes, duration varies                 | no                                          | yes, duration 0.5 sec                       |  |  |  |  |  |  |
| Air gap*          | yes                                  | yes                                         | no                                          |  |  |  |  |  |  |
| Retract speed     | * 50 mm/sec  * 35 mm/sec for 96-ch.  | 4 mm/sec                                    | * 100 mm/sec  * 35 mm/sec for 96-ch.        |  |  |  |  |  |  |
|                   |                                      |                                             |                                             |  |  |  |  |  |  |
|                   |                                      |                                             |                                             |  |  |  |  |  |  |
|                   |                                      |                                             |                                             |  |  |  |  |  |  |
|                   |                                      |                                             |                                             |  |  |  |  |  |  |
+-------------------+--------------------------------------+---------------------------------------------+---------------------------------------------+--+--+--+--+--+--+

Dispensing a Liquid 
====================

Transfer behavior changes for single or multi-dispenses of aqueous, volatile, and viscous liquids in your protocol. 

Single Dispense
-----------------

+-------------------+--------------------------------------+-------------------------------------------------------------------+--------------------------------------+--+--+--+--+--+--+
| Transfer Behavior | Aqueous                              | Volatile                                                          | Viscous                              |  |  |  |  |  |  |
+===================+======================================+===================================================================+======================================+==+==+==+==+==+==+
| Submerge speed    | * 100 mm/sec  * 35 mm/sec for 96-ch. | 4 mm/sec                                                          | * 100 mm/sec  * 35 mm/sec for 96-ch. |  |  |  |  |  |  |
| Air gap*          | yes                                  | no                                                                | yes                                  |  |  |  |  |  |  |
| Flow rate*        | 40, 200, 478, or 716  µL/sec         | 25, 50, or 250  µL/sec                                            | 30, 125, or 250  µL/sec              |  |  |  |  |  |  |
| Push out*         | yes                                  | yes                                                               | yes                                  |  |  |  |  |  |  |
| Delay             | only for 50-ch. pipettes             | * yes, duration 0.5 sec *1 sec for 1000 µL pipette and 50 µL tips | yes, duration 0.2 sec                |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
+-------------------+--------------------------------------+-------------------------------------------------------------------+--------------------------------------+--+--+--+--+--+--+

Multi-Dispense
-----------------

+-------------------+--------------------------------------+-------------------------------------------------------------------+--------------------------------------+--+--+--+--+--+--+
| Transfer Behavior | Aqueous                              | Volatile                                                          | Viscous                              |  |  |  |  |  |  |
+===================+======================================+===================================================================+======================================+==+==+==+==+==+==+
| Submerge speed    | * 100 mm/sec  * 35 mm/sec for 96-ch. | 4 mm/sec                                                          | * 100 mm/sec  * 35 mm/sec for 96-ch. |  |  |  |  |  |  |
| Air gap*          | yes                                  | no                                                                | yes                                  |  |  |  |  |  |  |
| Flow rate*        | 50, 200, 478, or 716 µL/sec          | 25, 50, or 250  µL/sec                                            | 30, 125, or 250  µL/sec              |  |  |  |  |  |  |
| Push out*         | no                                   | no                                                                | no                                   |  |  |  |  |  |  |
| Delay             | only for 50-ch. pipettes             | * yes, duration 0.5 sec *1 sec for 1000 µL pipette and 50 µL tips | yes, duration 0.2 sec                |  |  |  |  |  |  |
| Retract speed     | * 50 mm/sec  * 35 mm/sec for 96-ch.  | 4 mm/sec                                                          | * 100 mm/sec  * 35 mm/sec for 96-ch. |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
|                   |                                      |                                                                   |                                      |  |  |  |  |  |  |
+-------------------+--------------------------------------+-------------------------------------------------------------------+--------------------------------------+--+--+--+--+--+--+


## TODO: insert text to close out liquid classes section 




.. versionadded:: 2.23