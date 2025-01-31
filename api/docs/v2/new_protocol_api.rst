:og:description: A comprehensive reference of classes and methods that make up the Opentrons Python Protocol API.

.. _protocol-api-reference:

***********************
API Version 2 Reference
***********************

.. _protocol_api-protocols-and-instruments:

Protocols
=========
.. module:: opentrons.protocol_api

.. autoclass:: opentrons.protocol_api.ProtocolContext
   :members:
   :exclude-members: location_cache, cleanup, clear_commands

Instruments
===========
.. autoclass:: opentrons.protocol_api.InstrumentContext
   :members:
   :exclude-members: delay

.. _protocol-api-labware:

Labware
=======
.. autoclass:: opentrons.protocol_api.Labware
   :members:
   :exclude-members: next_tip, use_tips, previous_tip, return_tips, load_empty, load_liquid, load_liquid_by_well

..
   The trailing ()s at the end of TrashBin and WasteChute here hide the __init__()
   signatures, since users should never construct these directly.

.. autoclass:: opentrons.protocol_api.TrashBin()
   :members:

.. autoclass:: opentrons.protocol_api.WasteChute()
   :members:

Wells and Liquids
=================
.. autoclass:: opentrons.protocol_api.Well
   :members:
   :exclude-members: geometry

.. autoclass:: opentrons.protocol_api.Liquid

.. _protocol-api-modules:

Modules
=======

Absorbance Plate Reader
-----------------------

.. autoclass:: opentrons.protocol_api.AbsorbanceReaderContext
   :members:
   :exclude-members: broker, geometry, load_labware_object, load_adapter, load_adapter_from_definition
   :inherited-members:


Heater-Shaker
-------------

.. autoclass:: opentrons.protocol_api.HeaterShakerContext
   :members:
   :exclude-members: broker, geometry, load_labware_object
   :inherited-members:

Magnetic Block
--------------

.. autoclass:: opentrons.protocol_api.MagneticBlockContext
   :members:
   :exclude-members: broker, geometry, load_labware_object
   :inherited-members:

Magnetic Module
---------------

.. autoclass:: opentrons.protocol_api.MagneticModuleContext
   :members:
   :exclude-members: calibrate, broker, geometry, load_labware_object
   :inherited-members:

Temperature Module
------------------

.. autoclass:: opentrons.protocol_api.TemperatureModuleContext
   :members:
   :exclude-members: start_set_temperature, await_temperature, broker, geometry, load_labware_object
   :inherited-members:

Thermocycler
------------

.. autoclass:: opentrons.protocol_api.ThermocyclerContext
   :members:
   :exclude-members: total_step_count, current_cycle_index, total_cycle_count, hold_time, ramp_rate, current_step_index, broker, geometry, load_labware_object, load_adapter, load_adapter_from_definition
   :inherited-members:
   

.. _protocol-api-types:

Useful Types
============

..
   The opentrons.types module contains a mixture of public Protocol API things and private internal things.
   Explicitly name the things that we expect to be public, excluding everything else.

.. automodule:: opentrons.types
   :members: PipetteNotAttachedError, Point, Location, Mount

.. autoclass:: opentrons.protocol_api.CSVParameter
   :members:

.. autodata:: opentrons.protocol_api.OFF_DECK
   :no-value:

Executing and Simulating Protocols
==================================

.. automodule:: opentrons.execute
   :members:

.. automodule:: opentrons.simulate
   :members:


