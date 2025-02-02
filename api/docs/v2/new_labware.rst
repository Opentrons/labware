:og:description: How to load and work with Opentrons-verified and custom labware in a Python protocol.

.. _new-labware:

#######
Labware
#######

Labware are the durable or consumable items that you work with, reuse, or discard while running a protocol on a Flex or OT-2. Items such as pipette tips, well plates, tubes, and reservoirs are all examples of labware. This section provides a brief overview of default labware, custom labware, and how to use basic labware API methods when creating a protocol for your robot.

.. note::

    Code snippets use coordinate deck slot locations (e.g. ``"D1"``, ``"D2"``), like those found on Flex. If you have an OT-2 and are using API version 2.14 or earlier, replace the coordinate with its numeric OT-2 equivalent. For example, slot D1 on Flex corresponds to slot 1 on an OT-2. See :ref:`deck-slots` for more information.

*************
Labware Types
*************

Default Labware
===============

Default labware is everything listed in the `Opentrons Labware Library <https://labware.opentrons.com/>`_. When used in a protocol, your Flex or OT-2 knows how to work with default labware. However, you must first inform the API about the labware you will place on the robot’s deck. Search the library when you’re looking for the API load names of the labware you want to use. You can copy the load names from the library and pass them to the :py:meth:`~.ProtocolContext.load_labware` method in your protocol.

.. _v2-custom-labware:

Custom Labware
==============

Custom labware is labware that is not listed the Labware Library. If your protocol needs something that's not in the library, you can create it with the `Opentrons Labware Creator <https://labware.opentrons.com/create/>`_. However, before using the Labware Creator, you should take a moment to review the support article `Creating Custom Labware Definitions <https://support.opentrons.com/s/article/Creating-Custom-Labware-Definitions>`_.

After you've created your labware, save it as a ``.json`` file and add it to the Opentrons App. See `Using Labware in Your Protocols <https://support.opentrons.com/s/article/Using-labware-in-your-protocols>`_ for instructions. 

If other people need to use your custom labware definition, they must also add it to their Opentrons App.

.. _loading-labware:

***************
Loading Labware
***************

Throughout this section, we'll use the labware listed in the following table.

.. list-table::
    :widths: 20 40 45
    :header-rows: 1

    * - Labware type
      - Labware name
      - API load name
    * - Well plate
      - `Corning 96 Well Plate 360 µL Flat <https://labware.opentrons.com/corning_96_wellplate_360ul_flat/>`_
      - ``corning_96_wellplate_360ul_flat``
    * - Flex tip rack
      - `Opentrons Flex 96 Tips 200 µL <https://shop.opentrons.com/opentrons-flex-tips-200-l/>`_
      - ``opentrons_flex_96_tiprack_200ul``
    * - OT-2 tip rack
      - `Opentrons 96 Tip Rack 300 µL <https://labware.opentrons.com/opentrons_96_tiprack_300ul>`_
      - ``opentrons_96_tiprack_300ul``

Similar to the code sample in :ref:`overview-section-v2`, here's how you use the :py:meth:`.ProtocolContext.load_labware` method to load labware on either Flex or OT-2. 

.. code-block:: python

    #Flex
    tiprack = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D2")

.. code-block:: python

    #OT-2
    tiprack = protocol.load_labware("opentrons_96_tiprack_300ul", "1")
    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "2")
    
.. versionadded:: 2.0

When the ``load_labware`` method loads labware into your protocol, it returns a :py:class:`~opentrons.protocol_api.labware.Labware` object.

.. _labware-label:

.. Tip::
    
    The ``load_labware`` method includes an optional ``label`` argument. You can use it to identify labware with a descriptive name. If used, the label value is displayed in the Opentrons App. For example::
        
        tiprack = protocol.load_labware(
            load_name="corning_96_wellplate_360ul_flat",
            location="D1",
            label="any-name-you-want")

.. _labware-on-adapters:

Loading Labware on Adapters
===========================

The previous section demonstrates loading labware directly into a deck slot. But you can also load labware on top of an adapter that either fits on a module or goes directly on the deck. The ability to combine labware with adapters adds functionality and flexibility to your robot and protocols.

You can either load the adapter first and the labware second, or load both the adapter and labware all at once.

Loading Separately
------------------

The ``load_adapter()`` method is available on ``ProtocolContext`` and module contexts. It behaves similarly to ``load_labware()``, requiring the load name and location for the desired adapter. Load a module, adapter, and labware with separate calls to specify each layer of the physical stack of components individually::

    hs_mod = protocol.load_module("heaterShakerModuleV1", "D1")
    hs_adapter = hs_mod.load_adapter("opentrons_96_flat_bottom_adapter")
    hs_plate = hs_adapter.load_labware("nest_96_wellplate_200ul_flat")
    
.. versionadded:: 2.15
    The ``load_adapter()`` method.

Loading Together
----------------

Use the ``adapter`` argument of ``load_labware()`` to load an adapter at the same time as labware. For example, to load the same 96-well plate and adapter from the previous section at once::
    
    hs_plate = hs_mod.load_labware(
        name="nest_96_wellplate_200ul_flat",
        adapter="opentrons_96_flat_bottom_adapter"
    )

.. versionadded:: 2.15
    The ``adapter`` parameter.

The API also has some "combination" labware definitions, which treat the adapter and labware as a unit::

    hs_combo = hs_mod.load_labware(
        "opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat"
    )

Loading labware this way prevents you from :ref:`moving the labware <moving-labware>` onto or off of the adapter, so it's less flexible than loading the two separately. Avoid using combination definitions unless your protocol specifies an ``apiLevel`` of 2.14 or lower.

.. _new-well-access:

**************************
Accessing Wells in Labware
**************************

Well Ordering
=============

You need to select which wells to transfer liquids to and from over the course of a protocol.

Rows of wells on a labware have labels that are capital letters starting with A. For instance, an 96-well plate has 8 rows, labeled ``"A"`` through ``"H"``.

Columns of wells on a labware have labels that are numbers starting with 1. For instance, a 96-well plate has columns ``"1"`` through ``"12"``.

All well-accessing functions start with the well at the top left corner of the labware. The ending well is in the bottom right. The order of travel from top left to bottom right depends on which function you use.

.. image:: ../img/well_iteration/Well_Iteration.png

The code in this section assumes that ``plate`` is a 24-well plate. For example:

.. code-block:: python

    plate = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="D1")

.. _well-accessor-methods:

Accessor Methods
================

The API provides many different ways to access wells inside labware. Different methods are useful in different contexts. The table below lists out the methods available to access wells and their differences.

.. list-table::
   :widths: 20 30 50
   :header-rows: 1

   * - Method
     - Returns
     - Example
   * - :py:meth:`.Labware.wells`
     - List of all wells.
     - ``[labware:A1, labware:B1, labware:C1...]``
   * - :py:meth:`.Labware.rows`
     - List of lists grouped by row.
     - ``[[labware:A1, labware:A2...], [labware:B1, labware:B2...]]``
   * - :py:meth:`.Labware.columns`
     - List of lists grouped by column.
     - ``[[labware:A1, labware:B1...], [labware:A2, labware:B2...]]``
   * - :py:meth:`.Labware.wells_by_name`
     - Dictionary with well names as keys.
     - ``{"A1": labware:A1, "B1": labware:B1}``
   * - :py:meth:`.Labware.rows_by_name`
     - Dictionary with row names as keys.
     - ``{"A": [labware:A1, labware:A2...], "B": [labware:B1, labware:B2...]}``
   * - :py:meth:`.Labware.columns_by_name`
     - Dictionary with column names as keys.
     - ``{"1": [labware:A1, labware:B1...], "2": [labware:A2, labware:B2...]}``

Accessing Individual Wells
==========================

.. _well-dictionary-access:

Dictionary Access
-----------------

The simplest way to refer to a single well is by its :py:obj:`.well_name`, like A1 or D6. Referencing a particular key in the result of :py:meth:`.Labware.wells_by_name` accomplishes this. This is such a common task that the API also has an equivalent shortcut: dictionary indexing.

.. code-block:: python

    a1 = plate.wells_by_name()["A1"]
    d6 = plate["D6"]  # dictionary indexing
    
If a well does not exist in the labware, such as ``plate["H12"]`` on a 24-well plate, the API will raise a ``KeyError``. In contrast, it would be a valid reference on a standard 96-well plate.

.. versionadded:: 2.0

List Access From ``wells``
--------------------------

In addition to referencing wells by name, you can also reference them with zero-indexing. The first well in a labware is at position 0.

.. code-block:: python

    plate.wells()[0]   # well A1
    plate.wells()[23]  # well D6

.. tip::

    You may find coordinate well names like ``"B3"`` easier to reason with, especially when working with irregular labware, e.g.
    ``opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical`` (see the `Opentrons 10 Tube Rack <https://labware.opentrons.com/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical>`_ in the Labware Library). Whichever well access method you use, your protocol will be most maintainable if you use only one access method consistently.

.. versionadded:: 2.0

Accessing Groups of Wells
=========================

When handling liquid, you can provide a group of wells as the source or destination. Alternatively, you can take a group of wells and loop (or iterate) through them, with each liquid-handling command inside the loop accessing the loop index.

Use :py:meth:`.Labware.rows_by_name` to access a specific row of wells or  :py:meth:`.Labware.columns_by_name` to access a specific column of wells on a labware. These methods both return a dictionary with the row or column name as the keys:

.. code-block:: python

    row_dict = plate.rows_by_name()["A"]
    row_list = plate.rows()[0]  # equivalent to the line above
    column_dict = plate.columns_by_name()["1"]
    column_list = plate.columns()[0]  # equivalent to the line above

    print('Column "1" has', len(column_dict), 'wells')  # Column "1" has 4 wells
    print('Row "A" has', len(row_dict), 'wells')  # Row "A" has 6 wells

Since these methods return either lists or dictionaries, you can iterate through them as you would regular Python data structures.

For example, to transfer 50 µL of liquid from the first well of a reservoir to each of the wells of row ``"A"`` on a plate::

    for well in plate.rows()[0]:
        pipette.transfer(reservoir["A1"], well, 50)

Equivalently, using ``rows_by_name``::

    for well in plate.rows_by_name()["A"].values():
        pipette.transfer(reservoir["A1"], well, 50)

.. versionadded:: 2.0

.. _labeling-liquids:

*************************
Labeling Liquids in Wells
*************************

Optionally, you can specify the liquids that should be in various wells at the beginning of your protocol. Doing so helps you identify well contents by name and volume, and adds corresponding labels to a single well, or group of wells, in well plates and reservoirs. You can view the initial liquid setup:

- For Flex protocols, on the touchscreen.
- For Flex or OT-2 protocols, in the Opentrons App (v6.3.0 or higher).

To use these optional methods, first create a liquid object with :py:meth:`.ProtocolContext.define_liquid` and then label individual wells by calling :py:meth:`.Well.load_liquid`.

Let's examine how these two methods work. The following examples demonstrate how to define colored water samples for a well plate and reservoir.

.. _defining-liquids:

Defining Liquids
================

This example uses ``define_liquid`` to create two liquid objects and instantiates them with the variables ``greenWater`` and ``blueWater``, respectively. The arguments for ``define_liquid`` are all required, and let you name the liquid, describe it, and assign it a color:

.. code-block:: python

        greenWater = protocol.define_liquid(
            name="Green water",
            description="Green colored water for demo",
            display_color="#00FF00",
        )
        blueWater = protocol.define_liquid(
            name="Blue water",
            description="Blue colored water for demo",
            display_color="#0000FF",
        )

.. versionadded:: 2.14
        
The ``display_color`` parameter accepts a hex color code, which adds a color to that liquid's label when you import your protocol into the Opentrons App. The ``define_liquid`` method accepts standard 3-, 4-, 6-, and 8-character hex color codes.

.. _loading-liquids:

Labeling Wells and Reservoirs
=============================

This example uses ``load_liquid`` to label the initial well location, contents, and volume (in µL) for the liquid objects created by ``define_liquid``. Notice how values of the ``liquid`` argument use the variable names ``greenWater`` and ``blueWater`` (defined above) to associate each well with a particular liquid: 

.. code-block:: python

        well_plate["A1"].load_liquid(liquid=greenWater, volume=50)
        well_plate["A2"].load_liquid(liquid=greenWater, volume=50)
        well_plate["B1"].load_liquid(liquid=blueWater, volume=50)
        well_plate["B2"].load_liquid(liquid=blueWater, volume=50)
        reservoir["A1"].load_liquid(liquid=greenWater, volume=200)
        reservoir["A2"].load_liquid(liquid=blueWater, volume=200)
        
.. versionadded:: 2.14

This information is available after you import your protocol to the app or send it to Flex. A summary of liquids appears on the protocol detail page, and well-by-well detail is available on the run setup page (under Initial Liquid Setup in the app, or under Liquids on Flex).

.. note::
    ``load_liquid`` does not validate volume for your labware nor does it prevent you from adding multiple liquids to each well. For example, you could label a 40 µL well with ``greenWater``, ``volume=50``, and then also add blue water to the well. The API won't stop you. It's your responsibility to ensure the labels you use accurately reflect the amounts and types of liquid you plan to place into wells and reservoirs.

Labeling vs Handling Liquids
============================

The ``load_liquid`` arguments include a volume amount (``volume=n`` in µL). This amount is just a label. It isn't a command or function that manipulates liquids. It only tells you how much liquid should be in a well at the start of the protocol. You need to use a method like :py:meth:`.transfer` to physically move liquids from a source to a destination.


.. _v2-location-within-wells:
.. _new-labware-well-properties:


***************
Well Dimensions
***************

The functions in the :ref:`new-well-access` section above return a single :py:class:`.Well` object or a larger object representing many wells. :py:class:`.Well` objects have attributes that provide information about their physical shape, such as the depth or diameter, as specified in their corresponding labware definition. These properties can be used for different applications, such as calculating the volume of a well or a :ref:`position relative to the well <position-relative-labware>`.

Depth
=====

Use :py:attr:`.Well.depth` to get the distance in mm between the very top of the well and the very bottom. For example, a conical well's depth is measured from the top center to the bottom center of the well.

.. code-block:: python
    :substitutions:

    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D1")
    depth = plate["A1"].depth  # 10.67

Diameter
========

Use :py:attr:`.Well.diameter` to get the diameter of a given well in mm. Since diameter is a circular measurement, this attribute is only present on labware with circular wells. If the well is not circular, the value will be ``None``. Use length and width (see below) for non-circular wells.

.. code-block:: python
    :substitutions:

    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D1")
    diameter = plate["A1"].diameter	 # 6.86

Length
======

Use :py:attr:`.Well.length` to get the length of a given well in mm. Length is defined as the distance along the robot's x-axis (left to right). This attribute is only present on rectangular wells. If the well is not rectangular, the value will be ``None``. Use diameter (see above) for circular wells.

.. code-block:: python
    :substitutions:

    plate = protocol.load_labware("nest_12_reservoir_15ml", "D1")
    length = plate["A1"].length	 # 8.2


Width
=====

Use :py:attr:`.Well.width` to get the width of a given well in mm. Width is defined as the distance along the y-axis (front to back). This attribute is only present on rectangular wells. If the well is not rectangular, the value will be ``None``. Use diameter (see above) for circular wells.


.. code-block:: python
    :substitutions:

    plate = protocol.load_labware("nest_12_reservoir_15ml", "D1")
    width = plate["A1"].width  # 71.2


.. versionadded:: 2.9
