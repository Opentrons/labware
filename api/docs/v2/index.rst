:og:description: The Opentrons Python Protocol API is a Python framework that makes it easy to write automated biology lab protocols that use Opentrons robots and hardware modules.

=======
Welcome
=======

.. toctree::

    self
    tutorial
    versioning
    new_labware
    liquids
    moving_labware
    new_modules
    deck_slots
    new_pipette
    new_atomic_commands
    new_complex_commands
    robot_position
    runtime_parameters
    new_advanced_running
    new_examples
    adapting_ot2_flex
    new_protocol_api

The Opentrons Python Protocol API is a Python framework designed to make it easy to write automated biology lab protocols. Python protocols can control Opentrons Flex and OT-2 robots, their pipettes, and optional hardware modules. We've designed the API to be accessible to anyone with basic Python and wet-lab skills. 

As a bench scientist, you should be able to code your protocols in a way that reads like a lab notebook. You can write a fully functional protocol just by listing the equipment you'll use (modules, labware, and pipettes) and the exact sequence of movements the robot should make.

As a programmer, you can leverage the full power of Python for advanced automation in your protocols. Perform calculations, manage external data, use built-in and imported Python modules, and more to implement your custom lab workflow.


Getting Started
---------------

**New to Python protocols?** Check out the :ref:`tutorial` to learn about the different parts of a protocol file and build a working protocol from scratch. 

If you want to **dive right into code**, take a look at our :ref:`new-examples` and the comprehensive :ref:`protocol-api-reference`.

When you're ready to **try out a protocol**, download the `Opentrons App <https://www.opentrons.com/ot-app>`__, import the protocol file, and run it on your robot.


.. _overview-section-v2:

How the API Works
-----------------

The design goal of this API is to make code readable and easy to understand. A protocol, in its most basic form:

1. Provides some information about who made the protocol and what it is for.
2. Specifies which type of robot the protocol should run on.
3. Tells the robot where to find labware, pipettes, and (optionally) hardware modules.
4. Commands the robot to manipulate its attached hardware.

For example, if we wanted to transfer liquid from well A1 to well B1 on a plate, our protocol would look like:
	
.. tabs::
    
    .. tab:: Flex
    
        .. code-block:: python
            :substitutions:
            
            from opentrons import protocol_api
            
            # metadata
            metadata = {
                "protocolName": "My Protocol",
                "author": "Name <opentrons@example.com>",
                "description": "Simple protocol to get started using the Flex",
            }
            
            # requirements
            requirements = {"robotType": "Flex", "apiLevel": "|apiLevel|"}
            
            # protocol run function
            def run(protocol: protocol_api.ProtocolContext):
                # labware
                plate = protocol.load_labware(
                    "corning_96_wellplate_360ul_flat", location="D1"
                )
                tiprack = protocol.load_labware(
                    "opentrons_flex_96_tiprack_200ul", location="D2"
                )
                trash = protocol.load_trash_bin(location="A3")
            
                # pipettes
                left_pipette = protocol.load_instrument(
                    "flex_1channel_1000", mount="left", tip_racks=[tiprack]
                )
            
                # commands
                left_pipette.pick_up_tip()
                left_pipette.aspirate(100, plate["A1"])
                left_pipette.dispense(100, plate["B2"])
                left_pipette.drop_tip()
        
        This example proceeds completely linearly. Following it line-by-line, you can see that it has the following effects:

        1. Gives the name, contact information, and a brief description for the protocol. 
        2. Indicates the protocol should run on a Flex robot, using API version |apiLevel|.
        3. Tells the robot that there is:
            a. A 96-well flat plate in slot D1.
            b. A rack of 300 µL tips in slot D2.
            c. A 1-channel 1000 µL pipette attached to the left mount, which should pick up tips from the aforementioned rack.
        4. Tells the robot to act by:
            a. Picking up the first tip from the tip rack.
            b. Aspirating 100 µL of liquid from well A1 of the plate.
            c. Dispensing 100 µL of liquid into well B1 of the plate.
            d. Dropping the tip in the trash.


    .. tab:: OT-2

        .. code-block:: python
            :substitutions:

            from opentrons import protocol_api

            # metadata
            metadata = {
                "protocolName": "My Protocol",
                "author": "Name <opentrons@example.com>",
                "description": "Simple protocol to get started using the OT-2",
            }

            # requirements
            requirements = {"robotType": "OT-2", "apiLevel": "|apiLevel|"}

            # protocol run function
            def run(protocol: protocol_api.ProtocolContext):
                # labware
                plate = protocol.load_labware(
                    "corning_96_wellplate_360ul_flat", location="1"
                )
                tiprack = protocol.load_labware(
                    "opentrons_96_tiprack_300ul", location="2"
                )

                # pipettes
                left_pipette = protocol.load_instrument(
                    "p300_single", mount="left", tip_racks=[tiprack]
                )

                # commands
                left_pipette.pick_up_tip()
                left_pipette.aspirate(100, plate["A1"])
                left_pipette.dispense(100, plate["B2"])
                left_pipette.drop_tip()

        This example proceeds completely linearly. Following it line-by-line, you can see that it has the following effects:

        1. Gives the name, contact information, and a brief description for the protocol.
        2. Indicates the protocol should run on an OT-2 robot, using API version |apiLevel|.
        3. Tells the robot that there is:
            a. A 96-well flat plate in slot 1.
            b. A rack of 300 µL tips in slot 2.
            c. A single-channel 300 µL pipette attached to the left mount, which should pick up tips from the aforementioned rack.
        4. Tells the robot to act by:
            a. Picking up the first tip from the tip rack.
            b. Aspirating 100 µL of liquid from well A1 of the plate.
            c. Dispensing 100 µL of liquid into well B1 of the plate.
            d. Dropping the tip in the trash.

	
There is much more that Opentrons robots and the API can do! The :ref:`v2-atomic-commands`, :ref:`v2-complex-commands`, and :ref:`new_modules` pages cover many of these functions.


More Resources
--------------

Opentrons App
+++++++++++++

The `Opentrons App <https://opentrons.com/ot-app/>`__ is the easiest way to run your Python protocols. The app runs on the latest versions of macOS, Windows, and Ubuntu.

Support
+++++++

Questions about setting up your robot, using Opentrons software, or troubleshooting? Check out our `support articles <https://support.opentrons.com/s/>`_ or `contact Opentrons Support directly <mailto:support@opentrons.com>`_.

Custom Protocol Service
+++++++++++++++++++++++

Don't have the time or resources to write your own protocols? Our `custom protocol development service <https://opentrons.com/instrument-services/>`_ can get you set up in two weeks.

Contributing
++++++++++++

Opentrons software, including the Python API and this documentation, is open source. If you have an improvement or an interesting idea, you can create an issue on GitHub by following our `guidelines`__.

__ https://github.com/Opentrons/opentrons/blob/edge/CONTRIBUTING.md#opening-issues


That guide also includes more information on how to `directly contribute code`__.

__ https://github.com/Opentrons/opentrons/blob/edge/CONTRIBUTING.md

