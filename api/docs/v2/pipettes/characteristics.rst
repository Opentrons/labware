:og:description: Details on Opentrons pipette movement and flow rates.

.. _pipette-characteristics:

***********************
Pipette Characteristics
***********************

Each Opentrons pipette has different capabilities, which you'll want to take advantage of in your protocols. This page covers some fundamental pipette characteristics.

:ref:`new-multichannel-pipettes` gives examples of how multi-channel pipettes move around the deck by using just one of their channels as a reference point. Taking this into account is important for commanding your pipettes to perform actions in the correct locations.

:ref:`new-plunger-flow-rates` discusses how quickly each type of pipette can handle liquids. The defaults are designed to operate quickly, based on the pipette's hardware and assuming that you're handling aqueous liquids. You can speed up or slow down a pipette's flow rate to suit your protocol's needs.

Finally, the volume ranges of pipettes affect what you can do with them. The volume ranges for current pipettes are listed on the :ref:`Loading Pipettes <loading-pipettes>` page. The :ref:`ot2-pipette-generations` section of this page describes how the API behaves when running protocols that specify older OT-2 pipettes.

.. _new-multichannel-pipettes:

Multi-Channel Movement
======================

All :ref:`building block <v2-atomic-commands>` and :ref:`complex commands <v2-complex-commands>` work with single- and multi-channel pipettes.

To keep the protocol API consistent when using single- and multi-channel pipettes, location arguments of pipetting commands use the pipette's *primary channel*. For multi-channel pipettes picking up tips with all of their channels, the back-left channel is considered primary. When using fewer channels, the ``start`` parameter of the :py:meth:`.InstrumentContext.configure_nozzle_layout` method can change the pipette's primary channel. See :ref:`partial-tip-pickup` for more information.

With a pipette's default settings, you can generally access the wells indicated in the table below. Moving to any other well may cause the pipette to crash.

.. list-table::
   :header-rows: 1
   
   * - Channels
     - 96-well plate
     - 384-well plate
   * - 1
     - Any well, A1–H12
     - Any well, A1–P24
   * - 8
     - A1–A12
     - A1–B24
   * - 96
     - A1 only
     - A1–B2

Also, you should apply any location offset, such as :py:meth:`.Well.top` or :py:meth:`.Well.bottom`, to the well accessed by the primary channel. Since all of the pipette's channels move together, each channel will have the same offset relative to the well that it is over.

Finally, because each multi-channel pipette has only one motor, they always aspirate and dispense on all channels simultaneously.

8-Channel, 96-Well Plate Example
--------------------------------

To demonstrate these concepts, let's write a protocol that uses a Flex 8-Channel Pipette and a 96-well plate. We'll then aspirate and dispense a liquid to different locations on the same well plate. To start, let's load a pipette in the right mount and add our labware.

.. code-block:: python
    :substitutions:

    from opentrons import protocol_api
    
    requirements = {"robotType": "Flex", "apiLevel":"|apiLevel|"}

    def run(protocol: protocol_api.ProtocolContext):
        # Load a tiprack for 1000 µL tips
        tiprack1 = protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_1000ul", location="D1")       
        # Load a 96-well plate
        plate = protocol.load_labware(
            load_name="corning_96_wellplate_360ul_flat", location="C1")       
        # Load an 8-channel pipette on the right mount
        right = protocol.load_instrument(
            instrument_name="flex_8channel_1000",
            mount="right",
            tip_racks=[tiprack1])

After loading our instruments and labware, let's tell the robot to pick up a pipette tip from location ``A1`` in ``tiprack1``::

    right.pick_up_tip()

With the backmost pipette channel above location A1 on the tip rack, all eight channels are above the eight tip rack wells in column 1.   

After picking up a tip, let's tell the robot to aspirate 300 µL from the well plate at location ``A2``::
        
    right.aspirate(volume=300, location=plate["A2"])

With the backmost pipette tip above location A2 on the well plate, all eight channels are above the eight wells in column 2.

Finally, let's tell the robot to dispense 300 µL into the well plate at location ``A3``::

    right.dispense(volume=300, location=plate["A3"].top())

With the backmost pipette tip above location A3, all eight channels are above the eight wells in column 3. The pipette will dispense liquid into all the wells simultaneously.

8-Channel, 384-Well Plate Example
---------------------------------

In general, you should specify wells in the first row of a well plate when using multi-channel pipettes. An exception to this rule is when using 384-well plates. The greater well density means the nozzles of a multi-channel pipette can only access every other well in a column. Specifying well A1 accesses every other well starting with the first (rows A, C, E, G, I, K, M, and O). Similarly, specifying well B1 also accesses every other well, but starts with the second (rows B, D, F, H, J, L, N, and P).

To demonstrate these concepts, let's write a protocol that uses a Flex 8-Channel Pipette and a 384-well plate. We'll then aspirate and dispense a liquid to different locations on the same well plate. To start, let's load a pipette in the right mount and add our labware.

.. code-block:: python

    def run(protocol: protocol_api.ProtocolContext):
        # Load a tiprack for 200 µL tips
        tiprack1 = protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_200ul", location="D1")
        # Load a well plate
        plate = protocol.load_labware(
            load_name="corning_384_wellplate_112ul_flat", location="D2")
        # Load an 8-channel pipette on the right mount
        right = protocol.load_instrument(
            instrument_name="flex_8channel_1000",
            mount="right",
            tip_racks=[tiprack1])


After loading our instruments and labware, let's tell the robot to pick up a pipette tip from location ``A1`` in ``tiprack1``::

    right.pick_up_tip()

With the backmost pipette channel above location A1 on the tip rack, all eight channels are above the eight tip rack wells in column 1.

After picking up a tip, let's tell the robot to aspirate 100 µL from the well plate at location ``A1``::

    right.aspirate(volume=100, location=plate["A1"])

The eight pipette channels will only aspirate from every other well in the column: A1, C1, E1, G1, I1, K1, M1, and O1.

Finally, let's tell the robot to dispense 100 µL into the well plate at location ``B1``::

    right.dispense(volume=100, location=plate["B1"])

The eight pipette channels will only dispense into every other well in the column: B1, D1, F1, H1, J1, L1, N1, and P1.


.. _new-plunger-flow-rates:

Pipette Flow Rates
==================

Measured in µL/s, the flow rate determines how much liquid a pipette can aspirate, dispense, and blow out. Opentrons pipettes have their own default flow rates. The API lets you change the flow rate on a loaded :py:class:`.InstrumentContext` by altering the :py:obj:`.InstrumentContext.flow_rate` properties listed below. 

* Aspirate: ``InstrumentContext.flow_rate.aspirate``
* Dispense: ``InstrumentContext.flow_rate.dispense``
* Blow out: ``InstrumentContext.flow_rate.blow_out``

These flow rate properties operate independently. This means you can specify different flow rates for each property within the same protocol. For example, let's load a simple protocol and set different flow rates for the attached pipette.

.. code-block:: python

    def run(protocol: protocol_api.ProtocolContext):
        tiprack1 = protocol.load_labware(
            load_name="opentrons_flex_96_tiprack_1000ul", location="D1")       
        pipette = protocol.load_instrument(
            instrument_name="flex_1channel_1000",
            mount="left",
            tip_racks=[tiprack1])                
        plate = protocol.load_labware(
            load_name="corning_96_wellplate_360ul_flat", location="D3")
        pipette.pick_up_tip()

Let's tell the robot to aspirate, dispense, and blow out the liquid using default flow rates. Notice how you don't need to specify a ``flow_rate`` attribute to use the defaults::

        pipette.aspirate(200, plate["A1"])  # 716 µL/s
        pipette.dispense(200, plate["A2"])  # 716 µL/s
        pipette.blow_out()                  # 716 µL/s

Now let's change the flow rates for each action::

        pipette.flow_rate.aspirate = 50
        pipette.flow_rate.dispense = 100
        pipette.flow_rate.blow_out = 300
        pipette.aspirate(200, plate["A1"])  #  50 µL/s
        pipette.dispense(200, plate["A2"])  # 100 µL/s
        pipette.blow_out()                  # 300 µL/s
        
These flow rates will remain in effect until you change the ``flow_rate`` attribute again *or* call ``configure_for_volume()``. Calling ``configure_for_volume()`` always resets all pipette flow rates to the defaults for the mode that it sets.

.. TODO add mode ranges and flow defaults to sections below

.. note::
    In API version 2.13 and earlier, :py:obj:`.InstrumentContext.speed` offered similar functionality to ``.flow_rate``. It attempted to set the plunger speed in mm/s. Due to technical limitations, that speed could only be approximate. You must use ``.flow_rate`` in version 2.14 and later, and you should consider replacing older code that sets ``.speed``.

.. versionadded:: 2.0


Flex Pipette Flow Rates
-----------------------

The following table provides data on the default aspirate, dispense, and blowout flow rates (in µL/s) for Flex pipettes. Default flow rates for each pipette-tip combination are the same across all three actions.

.. Excludes low-vol 96 channel. Not yet released.

+-----------------------------+-------------------+------------------------+
| Pipette Model               | Tip Capacity (µL) | Default Flow Rate (µL) |
+=============================+===================+========================+
| 1- and 8-channel (50 µL)    | 50                | 35                     |
+-----------------------------+-------------------+------------------------+
| 1- and 8-channel (1000 µL)  | 50                | 478                    |
+                             +-------------------+------------------------+
|                             | 200               | 716                    |
+                             +-------------------+------------------------+
|                             | 1000              | 716                    |
+-----------------------------+-------------------+------------------------+
| 96-channel (5-1000 µL)      | 50                | 6                      |
+                             +-------------------+------------------------+
|                             | 200               | 80                     |
+                             +-------------------+------------------------+
|                             | 1000              | 160                    |
+-----------------------------+-------------------+------------------------+

Additionally:

- When using a 50 µL pipette, you should only use 50 µL tips.
- All Flex pipettes have a well bottom clearance of 1 mm for aspirate and dispense actions.

.. _ot2-flow-rates:

OT-2 Pipette Flow Rates
-----------------------

The following table provides data on the default aspirate, dispense, and blowout flow rates (in µL/s) for OT-2 GEN2 pipettes. Default flow rates are the same across all three actions.

.. list-table::
    :header-rows: 1

    * - Pipette Model
      - Volume (µL)
      - Flow Rates (µL/s)
    * - P20 Single-Channel GEN2
      - 1–20
      - 
          * API v2.6 or higher: 7.56
          * API v2.5 or lower: 3.78
    * - P300 Single-Channel GEN2
      - 20–300
      - 
          * API v2.6 or higher: 92.86
          * API v2.5 or lower: 46.43
    * - P1000 Single-Channel GEN2
      - 100–1000
      -
          * API v2.6 or higher: 274.7
          * API v2.5 or lower: 137.35
    * - P20 Multi-Channel GEN2
      - 1–20
      - 7.6
    * - P300 Multi-Channel GEN2
      - 20–300
      - 94
 
Additionally, all OT-2 GEN2 pipettes have a default head speed of 400 mm/s and a well bottom clearance of 1 mm for aspirate and dispense actions.

.. _ot2-pipette-generations:

OT-2 Pipette Generations
========================

The OT-2 works with the GEN1 and GEN2 pipette models. The newer GEN2 pipettes have different volume ranges than the older GEN1 pipettes. With some exceptions, the volume ranges for GEN2 pipettes overlap those used by the GEN1 models. If your protocol specifies a GEN1 pipette, but you have a GEN2 pipette with a compatible volume range, you can still run your protocol. The OT-2 will consider the GEN2 pipette to have the same minimum volume as the GEN1 pipette. The following table lists the volume compatibility between the GEN2 and GEN1 pipettes.

.. list-table::
    :header-rows: 1
    
    * - GEN2 Pipette
      - GEN1 Pipette
      - GEN1 Volume
    * - P20 Single-Channel GEN2
      - P10 Single-Channel GEN1
      - 1-10 µL
    * - P20 Multi-Channel GEN2
      - P10 Multi-Channel GEN1
      - 1-10 µL
    * - P300 Single-Channel GEN2
      - P300 Single-Channel GEN1
      - 30-300 µL
    * - P300 Multi-Channel GEN2
      - P300 Multi-Channel GEN1
      - 20-200 µL
    * - P1000 Single-Channel GEN2
      - P1000 Single-Channel GEN1
      - 100-1000 µL

The single- and multi-channel P50 GEN1 pipettes are the exceptions here. If your protocol uses a P50 GEN1 pipette, there is no backward compatibility with a related GEN2 pipette. To replace a P50 GEN1 with a corresponding GEN2 pipette, edit your protocol to load a P20 Single-Channel GEN2 (for volumes below 20 µL) or a P300 Single-Channel GEN2 (for volumes between 20 and 50 µL).

