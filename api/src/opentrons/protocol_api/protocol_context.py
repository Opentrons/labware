from __future__ import annotations

import logging
from typing import (
    Callable,
    Dict,
    List,
    Optional,
    Type,
    Union,
    Mapping,
    cast,
)

from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotTypeEnum

from opentrons.types import Mount, Location, DeckLocation, DeckSlotName, StagingSlotName
from opentrons.config import feature_flags
from opentrons.legacy_broker import LegacyBroker
from opentrons.hardware_control.modules.types import (
    MagneticBlockModel,
    AbsorbanceReaderModel,
)
from opentrons.legacy_commands import protocol_commands as cmds, types as cmd_types
from opentrons.legacy_commands.helpers import stringify_labware_movement_command
from opentrons.legacy_commands.publisher import (
    CommandPublisher,
    publish,
    publish_context,
)
from opentrons.protocols.api_support import instrument as instrument_support
from opentrons.protocols.api_support.deck_type import (
    NoTrashDefinedError,
    should_load_fixed_trash_labware_for_python_protocol,
    should_load_fixed_trash_area_for_python_protocol,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import (
    AxisMaxSpeeds,
    requires_version,
    APIVersionError,
    RobotTypeError,
    UnsupportedAPIError,
)
from opentrons_shared_data.errors.exceptions import CommandPreconditionViolated
from opentrons.protocol_engine.errors import LabwareMovementNotAllowedError

from ._types import OffDeckType
from .core.common import ModuleCore, LabwareCore, ProtocolCore
from .core.core_map import LoadedCoreMap
from .core.engine.module_core import NonConnectedModuleCore
from .core.module import (
    AbstractTemperatureModuleCore,
    AbstractMagneticModuleCore,
    AbstractThermocyclerCore,
    AbstractHeaterShakerCore,
    AbstractMagneticBlockCore,
    AbstractAbsorbanceReaderCore,
)
from .robot_context import RobotContext, HardwareManager
from .core.engine import ENGINE_CORE_API_VERSION
from .core.legacy.legacy_protocol_core import LegacyProtocolCore

from . import validation
from ._liquid import Liquid, LiquidClass
from .disposal_locations import TrashBin, WasteChute
from .deck import Deck
from .instrument_context import InstrumentContext
from .labware import Labware
from .module_contexts import (
    MagneticModuleContext,
    TemperatureModuleContext,
    ThermocyclerContext,
    HeaterShakerContext,
    MagneticBlockContext,
    AbsorbanceReaderContext,
    ModuleContext,
)
from ._parameters import Parameters


logger = logging.getLogger(__name__)


ModuleTypes = Union[
    TemperatureModuleContext,
    MagneticModuleContext,
    ThermocyclerContext,
    HeaterShakerContext,
    MagneticBlockContext,
    AbsorbanceReaderContext,
]


class _Unset:
    """A sentinel value for when no value has been supplied for an argument,
    when `None` is already taken for some other meaning.

    User code should never use this explicitly.
    """

    pass


class ProtocolContext(CommandPublisher):
    """A context for the state of a protocol.

    The ``ProtocolContext`` class provides the objects, attributes, and methods that
    allow you to configure and control the protocol.

    Methods generally fall into one of two categories.

      - They can change the state of the ``ProtocolContext`` object, such as adding
        pipettes, hardware modules, or labware to your protocol.
      - They can control the flow of a running protocol, such as pausing, displaying
        messages, or controlling built-in robot hardware like the ambient lighting.

    Do not instantiate a ``ProtocolContext`` directly.
    The ``run()`` function of your protocol does that for you.
    See the :ref:`Tutorial <run-function>` for more information.

    Use :py:meth:`opentrons.execute.get_protocol_api` to instantiate a ``ProtocolContext`` when
    using Jupyter Notebook. See :ref:`advanced-control`.

    .. versionadded:: 2.0

    """

    def __init__(
        self,
        api_version: APIVersion,
        core: ProtocolCore,
        broker: Optional[LegacyBroker] = None,
        core_map: Optional[LoadedCoreMap] = None,
        deck: Optional[Deck] = None,
        bundled_data: Optional[Dict[str, bytes]] = None,
    ) -> None:
        """Build a :py:class:`.ProtocolContext`.

        :param api_version: The API version to use.
        :param core: The protocol implementation core.
        :param labware_offset_provider: Where this protocol context and its child
                                        module contexts will get labware offsets from.
        :param broker: An optional command broker to link to. If not
                      specified, a dummy one is used.
        :param bundled_data: A dict mapping filenames to the contents of data
                             files. Can be used by the protocol, since it is
                             exposed as
                             :py:attr:`.ProtocolContext.bundled_data`
        """
        super().__init__(broker)
        self._api_version = api_version
        self._core = core
        self._core_map = core_map or LoadedCoreMap()
        self._deck = deck or Deck(
            protocol_core=core, core_map=self._core_map, api_version=api_version
        )

        # With the introduction of Extension mount type, this dict initializes to include
        # the extension mount, for both ot2 & 3. While it doesn't seem like it would
        # create an issue in the current PAPI context, it would be much safer to
        # only use mounts available on the robot.
        self._instruments: Dict[Mount, Optional[InstrumentContext]] = {
            mount: None for mount in Mount
        }
        self._bundled_data: Dict[str, bytes] = bundled_data or {}

        # With the addition of Movable Trashes and Waste Chute support, it is not necessary
        # to ensure that the list of "disposal locations", essentially the list of trashes,
        # is initialized correctly on protocols utilizing former API versions prior to 2.16
        # and also to ensure that any protocols after 2.16 initialize a Fixed Trash for OT-2
        # protocols so that no load trash bin behavior is required within the protocol itself.
        # Protocols prior to 2.16 expect the Fixed Trash to exist as a Labware object, while
        # protocols after 2.16 expect trash to exist as either a TrashBin or WasteChute object.

        self._load_fixed_trash()
        if should_load_fixed_trash_labware_for_python_protocol(self._api_version):
            self._core.append_disposal_location(self.fixed_trash)
        elif should_load_fixed_trash_area_for_python_protocol(
            self._api_version, self._core.robot_type
        ):
            self._core.load_ot2_fixed_trash_bin()

        self._commands: List[str] = []
        self._params: Parameters = Parameters()
        self._unsubscribe_commands: Optional[Callable[[], None]] = None
        try:
            self._robot: Optional[RobotContext] = RobotContext(
                core=self._core.load_robot(),
                protocol_core=self._core,
                api_version=self._api_version,
            )
        except APIVersionError:
            self._robot = None
        self.clear_commands()

    @property
    @requires_version(2, 0)
    def api_version(self) -> APIVersion:
        """Return the API version specified for this protocol context.

        This value is set when the protocol context
        is initialized.

          - When the context is the argument of ``run()``, the ``"apiLevel"`` key of the
            :ref:`metadata <tutorial-metadata>` or :ref:`requirements
            <tutorial-requirements>` dictionary determines ``api_version``.
          - When the context is instantiated with
            :py:meth:`opentrons.execute.get_protocol_api` or
            :py:meth:`opentrons.simulate.get_protocol_api`, the value of its ``version``
            argument determines ``api_version``.

        It may be lower than the :ref:`maximum version <max-version>` supported by the
        robot software, which is accessible via the
        ``protocol_api.MAX_SUPPORTED_VERSION`` constant.
        """
        return self._api_version

    @property
    @requires_version(2, 22)
    def robot(self) -> RobotContext:
        """The :py:class:`.RobotContext` for the protocol.

        :meta private:
        """
        if self._core.robot_type != "OT-3 Standard" or not self._robot:
            raise RobotTypeError("The RobotContext is only available on Flex robots.")
        return self._robot

    @property
    def _hw_manager(self) -> HardwareManager:
        # TODO (lc 01-05-2021) remove this once we have a more
        # user facing hardware control http api.
        # HardwareManager(hardware=self._core.get_hardware())
        logger.warning(
            "This function will be deprecated in later versions."
            "Please use with caution."
        )
        if self._robot:
            return self._robot.hardware
        return HardwareManager(hardware=self._core.get_hardware())

    @property
    @requires_version(2, 0)
    def bundled_data(self) -> Dict[str, bytes]:
        """Accessor for data files bundled with this protocol, if any.

        This is a dictionary mapping the filenames of bundled datafiles to their
        contents. The filename keys are formatted with extensions but without paths. For
        example, a file stored in the bundle as ``data/mydata/aspirations.csv`` will
        have the key ``"aspirations.csv"``. The values are :py:class:`bytes` objects
        representing the contents of the files.
        """
        return self._bundled_data

    @property
    @requires_version(2, 18)
    def params(self) -> Parameters:
        """
        The values of runtime parameters, as set during run setup.

        Each attribute of this object corresponds to the ``variable_name`` of a parameter.
        See :ref:`using-rtp` for details.

        Parameter values can only be set during run setup. If you try to alter the value
        of any attribute of ``params``, the API will raise an error.
        """
        return self._params

    def cleanup(self) -> None:
        """Finalize and clean up the protocol context."""
        if self._unsubscribe_commands:
            self._unsubscribe_commands()
            self._unsubscribe_commands = None

    @property
    @requires_version(2, 0)
    def max_speeds(self) -> AxisMaxSpeeds:
        """Per-axis speed limits for moving instruments.

        Changing values within this property sets the speed limit for each non-plunger
        axis of the robot. Note that this property only sets upper limits and can't
        exceed the physical speed limits of the movement system.

        This property is a dict mapping string names of axes to float values
        of maximum speeds in mm/s. To change a speed, set that axis's value. To
        reset an axis's speed to default, delete the entry for that axis
        or assign it to ``None``.

        See :ref:`axis_speed_limits` for examples.

        .. note::
            This property is not yet supported in API version 2.14 or higher.
        """
        if self._api_version >= ENGINE_CORE_API_VERSION:
            # TODO(mc, 2023-02-23): per-axis max speeds not yet supported on the engine
            # See https://opentrons.atlassian.net/browse/RCORE-373
            raise UnsupportedAPIError(
                api_element="ProtocolContext.max_speeds",
                since_version=f"{ENGINE_CORE_API_VERSION}",
                current_version=f"{self._api_version}",
                extra_message="Set speeds using InstrumentContext.default_speed or the per-method 'speed' argument.",
            )

        return self._core.get_max_speeds()

    @requires_version(2, 0)
    def commands(self) -> List[str]:
        """Return the run log.

        This is a list of human-readable strings representing what's been done in the protocol so
        far. For example, "Aspirating 123 µL from well A1 of 96 well plate in slot 1."

        The exact format of these entries is not guaranteed. The format here may differ from other
        places that show the run log, such as the Opentrons App or touchscreen.
        """
        return self._commands

    @requires_version(2, 0)
    def clear_commands(self) -> None:
        self._commands.clear()
        if self._unsubscribe_commands:
            self._unsubscribe_commands()

        def on_command(message: cmd_types.CommandMessage) -> None:
            payload = message.get("payload")

            if payload is None:
                return

            text = payload.get("text")

            if text is None:
                return

            if message["$"] == "before":
                self._commands.append(text)

        self._unsubscribe_commands = self.broker.subscribe(
            cmd_types.COMMAND, on_command
        )

    @requires_version(2, 0)
    def is_simulating(self) -> bool:
        """Returns ``True`` if the protocol is running in simulation.

        Returns ``False`` if the protocol is running on actual hardware.

        You can evaluate the result of this method in an ``if`` statement to make your
        protocol behave differently in different environments. For example, you could
        refer to a data file on your computer when simulating and refer to a data file
        stored on the robot when not simulating.

        You can also use it to skip time-consuming aspects of your protocol. Most Python
        Protocol API methods, like :py:meth:`.delay`, are designed to evaluate
        instantaneously in simulation. But external methods, like those from the
        :py:mod:`time` module, will run at normal speed if not skipped.
        """
        return self._core.is_simulating()

    @requires_version(2, 0)
    def load_labware_from_definition(
        self,
        labware_def: "LabwareDefinition",
        location: Union[DeckLocation, OffDeckType],
        label: Optional[str] = None,
    ) -> Labware:
        """Specify the presence of a labware on the deck.

        This function loads the labware definition specified by ``labware_def``
        to the location specified by ``location``.

        :param labware_def: The labware's definition.
        :param location: The slot into which to load the labware,
                         such as ``1``, ``"1"``, or ``"D1"``. See :ref:`deck-slots`.
        :type location: int or str or :py:obj:`OFF_DECK`
        :param str label: An optional special name to give the labware. If specified,
            this is how the labware will appear in the run log, Labware Position
            Check, and elsewhere in the Opentrons App and on the touchscreen.
        """
        load_params = self._core.add_labware_definition(labware_def)

        return self.load_labware(
            load_name=load_params.load_name,
            namespace=load_params.namespace,
            version=load_params.version,
            location=location,
            label=label,
        )

    @requires_version(2, 0)
    def load_labware(
        self,
        load_name: str,
        location: Union[DeckLocation, OffDeckType],
        label: Optional[str] = None,
        namespace: Optional[str] = None,
        version: Optional[int] = None,
        adapter: Optional[str] = None,
        lid: Optional[str] = None,
    ) -> Labware:
        """Load a labware onto a location.

        For Opentrons-verified labware, this is a convenient way
        to collapse the two stages of labware initialization (creating
        the labware and adding it to the protocol) into one.

        This function returns the created and initialized labware for use
        later in the protocol.

        :param str load_name: A string to use for looking up a labware definition.
            You can find the ``load_name`` for any Opentrons-verified labware on the
            `Labware Library <https://labware.opentrons.com>`__.

        :param location: Either a :ref:`deck slot <deck-slots>`,
            like ``1``, ``"1"``, or ``"D1"``, or the special value :py:obj:`OFF_DECK`.

            .. versionchanged:: 2.15
                You can now specify a deck slot as a coordinate, like ``"D1"``.

        :type location: int or str or :py:obj:`OFF_DECK`

        :param str label: An optional special name to give the labware. If specified,
            this is how the labware will appear in the run log, Labware Position
            Check, and elsewhere in the Opentrons App and on the touchscreen.

        :param str namespace: The namespace that the labware definition belongs to.
            If unspecified, the API will automatically search two namespaces:

              - ``"opentrons"``, to load standard Opentrons labware definitions.
              - ``"custom_beta"``, to load custom labware definitions created with the
                `Custom Labware Creator <https://labware.opentrons.com/create>`__.

            You might need to specify an explicit ``namespace`` if you have a custom
            definition whose ``load_name`` is the same as an Opentrons-verified
            definition, and you want to explicitly choose one or the other.

        :param version: The version of the labware definition. You should normally
            leave this unspecified to let ``load_labware()`` choose a version
            automatically.
        :param adapter: An adapter to load the labware on top of. Accepts the same
            values as the ``load_name`` parameter of :py:meth:`.load_adapter`. The
            adapter will use the same namespace as the labware, and the API will
            choose the adapter's version automatically.
        :param lid: A lid to load the on top of the main labware. Accepts the same
            values as the ``load_name`` parameter of :py:meth:`.load_lid_stack`. The
            lid will use the same namespace as the labware, and the API will
            choose the lid's version automatically.

                        .. versionadded:: 2.15
        """
        if isinstance(location, OffDeckType) and self._api_version < APIVersion(2, 15):
            raise APIVersionError(
                api_element="Loading a labware off-deck",
                until_version="2.15",
                current_version=f"{self._api_version}",
            )

        load_name = validation.ensure_lowercase_name(load_name)
        load_location: Union[OffDeckType, DeckSlotName, StagingSlotName, LabwareCore]
        if adapter is not None:
            if self._api_version < APIVersion(2, 15):
                raise APIVersionError(
                    api_element="Loading a labware on an adapter",
                    until_version="2.15",
                    current_version=f"{self._api_version}",
                )
            loaded_adapter = self.load_adapter(
                load_name=adapter,
                location=location,
                namespace=namespace,
            )
            load_location = loaded_adapter._core
        elif isinstance(location, OffDeckType):
            load_location = location
        else:
            load_location = validation.ensure_and_convert_deck_slot(
                location, self._api_version, self._core.robot_type
            )

        labware_core = self._core.load_labware(
            load_name=load_name,
            location=load_location,
            label=label,
            namespace=namespace,
            version=version,
        )

        if lid is not None:
            if self._api_version < validation.LID_STACK_VERSION_GATE:
                raise APIVersionError(
                    api_element="Loading a Lid on a Labware",
                    until_version="2.23",
                    current_version=f"{self._api_version}",
                )
            self._core.load_lid(
                load_name=lid,
                location=labware_core,
                namespace=namespace,
                version=version,
            )

        labware = Labware(
            core=labware_core,
            api_version=self._api_version,
            protocol_core=self._core,
            core_map=self._core_map,
        )
        self._core_map.add(labware_core, labware)

        return labware

    @requires_version(2, 0)
    def load_labware_by_name(
        self,
        load_name: str,
        location: DeckLocation,
        label: Optional[str] = None,
        namespace: Optional[str] = None,
        version: int = 1,
    ) -> Labware:
        """
        .. deprecated:: 2.0
            Use :py:meth:`load_labware` instead.
        """
        logger.warning("load_labware_by_name is deprecated. Use load_labware instead.")
        return self.load_labware(load_name, location, label, namespace, version)

    @requires_version(2, 15)
    def load_adapter_from_definition(
        self,
        adapter_def: "LabwareDefinition",
        location: Union[DeckLocation, OffDeckType],
    ) -> Labware:
        """Specify the presence of an adapter on the deck.

        This function loads the adapter definition specified by ``adapter_def``
        to the location specified by ``location``.

        :param adapter_def: The adapter's labware definition.
        :param location: The slot into which to load the labware,
                         such as ``1``, ``"1"``, or ``"D1"``. See :ref:`deck-slots`.
        :type location: int or str or :py:obj:`OFF_DECK`
        """
        load_params = self._core.add_labware_definition(adapter_def)

        return self.load_adapter(
            load_name=load_params.load_name,
            namespace=load_params.namespace,
            version=load_params.version,
            location=location,
        )

    @requires_version(2, 16)
    def load_trash_bin(self, location: DeckLocation) -> TrashBin:
        """Load a trash bin on the deck of a Flex.

        See :ref:`configure-trash-bin` for details.

        If you try to load a trash bin on an OT-2, the API will raise an error.

        :param location: The :ref:`deck slot <deck-slots>` where the trash bin is. The
            location can be any unoccupied slot in column 1 or 3.

            If you try to load a trash bin in column 2 or 4, the API will raise an error.
        """
        slot_name = validation.ensure_and_convert_deck_slot(
            location,
            api_version=self._api_version,
            robot_type=self._core.robot_type,
        )
        if not isinstance(slot_name, DeckSlotName):
            raise ValueError("Staging areas not permitted for trash bin.")
        addressable_area_name = validation.ensure_and_convert_trash_bin_location(
            location,
            api_version=self._api_version,
            robot_type=self._core.robot_type,
        )
        trash_bin = self._core.load_trash_bin(slot_name, addressable_area_name)
        return trash_bin

    @requires_version(2, 16)
    def load_waste_chute(
        self,
    ) -> WasteChute:
        """Load the waste chute on the deck of a Flex.

        See :ref:`configure-waste-chute` for details, including the deck configuration
        variants of the waste chute.

        The deck plate adapter for the waste chute can only go in slot D3. If you try to
        load another item in slot D3 after loading the waste chute, or vice versa, the
        API will raise an error.
        """
        return self._core.load_waste_chute()

    @requires_version(2, 15)
    def load_adapter(
        self,
        load_name: str,
        location: Union[DeckLocation, OffDeckType],
        namespace: Optional[str] = None,
        version: Optional[int] = None,
    ) -> Labware:
        """Load an adapter onto a location.

        For adapters already defined by Opentrons, this is a convenient way
        to collapse the two stages of adapter initialization (creating
        the adapter and adding it to the protocol) into one.

        This function returns the created and initialized adapter for use
        later in the protocol.

        :param str load_name: A string to use for looking up a labware definition for the adapter.
            You can find the ``load_name`` for any standard adapter on the Opentrons
            `Labware Library <https://labware.opentrons.com>`_.

        :param location: Either a :ref:`deck slot <deck-slots>`,
            like ``1``, ``"1"``, or ``"D1"``, or the special value :py:obj:`OFF_DECK`.

        :type location: int or str or :py:obj:`OFF_DECK`

        :param str namespace: The namespace that the labware definition belongs to.
            If unspecified, the API will automatically search two namespaces:

              * ``"opentrons"``, to load standard Opentrons labware definitions.
              * ``"custom_beta"``, to load custom labware definitions created with the
                `Custom Labware Creator <https://labware.opentrons.com/create>`_.

            You might need to specify an explicit ``namespace`` if you have a custom
            definition whose ``load_name`` is the same as an Opentrons standard
            definition, and you want to explicitly choose one or the other.

        :param version: The version of the labware definition. You should normally
            leave this unspecified to let ``load_adapter()`` choose a version automatically.
        """
        load_name = validation.ensure_lowercase_name(load_name)
        load_location: Union[OffDeckType, DeckSlotName, StagingSlotName]
        if isinstance(location, OffDeckType):
            load_location = location
        else:
            load_location = validation.ensure_and_convert_deck_slot(
                location, self._api_version, self._core.robot_type
            )

        labware_core = self._core.load_adapter(
            load_name=load_name,
            location=load_location,
            namespace=namespace,
            version=version,
        )

        adapter = Labware(
            core=labware_core,
            api_version=self._api_version,
            protocol_core=self._core,
            core_map=self._core_map,
        )
        self._core_map.add(labware_core, adapter)

        return adapter

    # TODO(mm, 2023-06-07): Figure out what to do with this, now that the Flex has non-integer
    # slot names and labware can be stacked. https://opentrons.atlassian.net/browse/RLAB-354
    @property
    @requires_version(2, 0)
    def loaded_labwares(self) -> Dict[int, Labware]:
        """Get the labwares that have been loaded into the protocol context.

        Slots with nothing in them will not be present in the return value.

        .. note::

            If a module is present on the deck but no labware has been loaded
            into it with ``module.load_labware()``, there will
            be no entry for that slot in this value. That means you should not
            use ``loaded_labwares`` to determine if a slot is available or not,
            only to get a list of labwares. If you want a data structure of all
            objects on the deck regardless of type, use :py:attr:`deck`.


        :returns: Dict mapping deck slot number to labware, sorted in order of
                  the locations.
        """
        labware_cores = (
            (core.get_deck_slot(), core) for core in self._core.get_labware_cores()
        )

        return {
            slot.as_int(): self._core_map.get(core)
            for slot, core in labware_cores
            if slot is not None
        }

    @requires_version(2, 15)
    def move_labware(
        self,
        labware: Labware,
        new_location: Union[
            DeckLocation, Labware, ModuleTypes, OffDeckType, WasteChute, TrashBin
        ],
        use_gripper: bool = False,
        pick_up_offset: Optional[Mapping[str, float]] = None,
        drop_offset: Optional[Mapping[str, float]] = None,
    ) -> None:
        """Move a loaded labware to a new location.

        See :ref:`moving-labware` for more details.

        :param labware: The labware to move. It should be a labware already loaded
                        using :py:meth:`load_labware`.

        :param new_location: Where to move the labware to. This is either:

                * A deck slot like ``1``, ``"1"``, or ``"D1"``. See :ref:`deck-slots`.
                * A hardware module that's already been loaded on the deck
                  with :py:meth:`load_module`.
                * A labware or adapter that's already been loaded on the deck
                  with :py:meth:`load_labware` or :py:meth:`load_adapter`.
                * The special constant :py:obj:`OFF_DECK`.

        :param use_gripper: Whether to use the Flex Gripper for this movement.

                * If ``True``, use the gripper to perform an automatic
                  movement. This will raise an error in an OT-2 protocol.
                * If ``False``, pause protocol execution until the user
                  performs the movement. Protocol execution remains paused until
                  the user presses **Confirm and resume**.

        Gripper-only parameters:

        :param pick_up_offset: Optional x, y, z vector offset to use when picking up labware.
        :param drop_offset: Optional x, y, z vector offset to use when dropping off labware.

        Before moving a labware to or from a hardware module, make sure that the labware's
        current and new locations are accessible, i.e., open the Thermocycler lid or
        open the Heater-Shaker's labware latch.
        """

        if not isinstance(labware, Labware):
            raise ValueError(
                f"Expected labware of type 'Labware' but got {type(labware)}."
            )

        # Ensure that when moving to an absorbance reader that the lid is open
        # todo(mm, 2024-11-08): Unify this with opentrons.protocol_api.core.engine.deck_conflict.
        if isinstance(new_location, AbsorbanceReaderContext):
            if new_location.is_lid_on():
                raise CommandPreconditionViolated(
                    f"Cannot move {labware.name} onto the Absorbance Reader Module when its lid is closed."
                )

        location: Union[
            ModuleCore,
            LabwareCore,
            WasteChute,
            OffDeckType,
            DeckSlotName,
            StagingSlotName,
            TrashBin,
        ]
        if isinstance(new_location, (Labware, ModuleContext)):
            location = new_location._core
        elif isinstance(new_location, (OffDeckType, WasteChute)):
            location = new_location
        elif isinstance(new_location, TrashBin):
            if labware._core.is_lid():
                location = new_location
            else:
                raise LabwareMovementNotAllowedError(
                    "Can only dispose of tips and Lid-type labware in a Trash Bin. Did you mean to use a Waste Chute?"
                )
        else:
            location = validation.ensure_and_convert_deck_slot(
                new_location, self._api_version, self._core.robot_type
            )

        _pick_up_offset = (
            validation.ensure_valid_labware_offset_vector(pick_up_offset)
            if pick_up_offset
            else None
        )
        _drop_offset = (
            validation.ensure_valid_labware_offset_vector(drop_offset)
            if drop_offset
            else None
        )
        with publish_context(
            broker=self.broker,
            command=cmds.move_labware(
                # This needs to be called from protocol context and not the command for import loop reasons
                text=stringify_labware_movement_command(
                    labware, new_location, use_gripper
                )
            ),
        ):
            self._core.move_labware(
                labware_core=labware._core,
                new_location=location,
                use_gripper=use_gripper,
                pause_for_manual_move=True,
                pick_up_offset=_pick_up_offset,
                drop_offset=_drop_offset,
            )

    @requires_version(2, 0)
    def load_module(
        self,
        module_name: str,
        location: Optional[DeckLocation] = None,
        configuration: Optional[str] = None,
    ) -> ModuleTypes:
        """Load a module onto the deck, given its name or model.

        This is the function to call to use a module in your protocol, like
        :py:meth:`load_instrument` is the method to call to use an instrument
        in your protocol. It returns the created and initialized module
        context, which will be a different class depending on the kind of
        module loaded.

        After loading modules, you can access a map of deck positions to loaded modules
        with :py:attr:`loaded_modules`.

        :param str module_name: The name or model of the module.
            See :ref:`available_modules` for possible values.

        :param location: The location of the module.

            This is usually the name or number of the slot on the deck where you
            will be placing the module, like ``1``, ``"1"``, or ``"D1"``. See :ref:`deck-slots`.

            The Thermocycler is only valid in one deck location.
            You don't have to specify a location when loading it, but if you do,
            it must be ``7``, ``"7"``, or ``"B1"``. See :ref:`thermocycler-module`.

            .. versionchanged:: 2.15
                You can now specify a deck slot as a coordinate, like ``"D1"``.

        :param configuration: Configure a Thermocycler to be in the ``semi`` position.
            This parameter does not work. Do not use it.

            .. versionchanged:: 2.14
                This parameter dangerously modified the protocol's geometry system,
                and it didn't function properly, so it was removed.

        :type location: str or int or None
        :returns: The loaded and initialized module---a
                  :py:class:`HeaterShakerContext`,
                  :py:class:`MagneticBlockContext`,
                  :py:class:`MagneticModuleContext`,
                  :py:class:`TemperatureModuleContext`, or
                  :py:class:`ThermocyclerContext`,
                  depending on what you requested with ``module_name``.

                  .. versionchanged:: 2.13
                    Added ``HeaterShakerContext`` return value.

                  .. versionchanged:: 2.15
                    Added ``MagneticBlockContext`` return value.
        """
        if configuration:
            if self._api_version < APIVersion(2, 4):
                raise APIVersionError(
                    api_element="Thermocycler parameters",
                    until_version="2.4",
                    current_version=f"{self._api_version}",
                )
            if self._api_version >= ENGINE_CORE_API_VERSION:
                raise UnsupportedAPIError(
                    api_element="The configuration parameter of load_module",
                    since_version=f"{ENGINE_CORE_API_VERSION}",
                    current_version=f"{self._api_version}",
                )

        requested_model = validation.ensure_module_model(module_name)
        if isinstance(
            requested_model, MagneticBlockModel
        ) and self._api_version < APIVersion(2, 15):
            raise APIVersionError(
                api_element=f"Module of type {module_name}",
                until_version="2.15",
                current_version=f"{self._api_version}",
            )
        if isinstance(
            requested_model, AbsorbanceReaderModel
        ) and self._api_version < APIVersion(2, 21):
            raise APIVersionError(
                f"Module of type {module_name} is only available in versions 2.21 and above."
            )

        deck_slot = (
            None
            if location is None
            else validation.ensure_and_convert_deck_slot(
                location, self._api_version, self._core.robot_type
            )
        )
        if isinstance(deck_slot, StagingSlotName):
            raise ValueError("Cannot load a module onto a staging slot.")

        module_core = self._core.load_module(
            model=requested_model,
            deck_slot=deck_slot,
            configuration=configuration,
        )

        module_context = _create_module_context(
            module_core=module_core,
            protocol_core=self._core,
            core_map=self._core_map,
            broker=self._broker,
            api_version=self._api_version,
        )

        self._core_map.add(module_core, module_context)

        return module_context

    # TODO(mm, 2023-06-07): Figure out what to do with this, now that the Flex has non-integer
    # slot names and labware can be stacked. https://opentrons.atlassian.net/browse/RLAB-354
    @property
    @requires_version(2, 0)
    def loaded_modules(self) -> Dict[int, ModuleTypes]:
        """Get the modules loaded into the protocol context.

        This is a map of deck positions to modules loaded by previous calls to
        :py:meth:`load_module`. It does not reflect what modules are actually attached
        to the robot. For example, if the robot has a Magnetic Module and a Temperature
        Module attached, but the protocol has only loaded the Temperature Module with
        :py:meth:`load_module`, only the Temperature Module will be included in
        ``loaded_modules``.

        :returns: Dict mapping slot name to module contexts. The elements may not be
            ordered by slot number.
        """
        return {
            core.get_deck_slot().as_int(): self._core_map.get(core)
            for core in self._core.get_module_cores()
        }

    @requires_version(2, 0)
    def load_instrument(
        self,
        instrument_name: str,
        mount: Union[Mount, str, None] = None,
        tip_racks: Optional[List[Labware]] = None,
        replace: bool = False,
        liquid_presence_detection: Optional[bool] = None,
    ) -> InstrumentContext:
        """Load a specific instrument for use in the protocol.

        When analyzing the protocol on the robot, instruments loaded with this method
        are compared against the instruments attached to the robot. You won't be able to
        start the protocol until the correct instruments are attached and calibrated.

        Currently, this method only loads pipettes. You do not need to load the Flex
        Gripper to use it in protocols. See :ref:`automatic-manual-moves`.

        :param str instrument_name: The instrument to load. See :ref:`new-pipette-models`
                                    for the valid values.
        :param mount: The mount where the instrument should be attached.
                      This can either be an instance of :py:class:`.types.Mount` or one
                      of the strings ``"left"`` or ``"right"``. When loading a Flex
                      96-Channel Pipette (``instrument_name="flex_96channel_1000"``),
                      you can leave this unspecified, since it always occupies both
                      mounts; if you do specify a value, it will be ignored.
        :type mount: types.Mount or str or ``None``
        :param tip_racks: A list of tip racks from which to pick tips when calling
                          :py:meth:`.InstrumentContext.pick_up_tip` without arguments.
        :type tip_racks: List[:py:class:`.Labware`]
        :param bool replace: If ``True``, replace the currently loaded instrument in
                             ``mount``, if any. This is intended for :ref:`advanced
                             control <advanced-control>` applications. You cannot
                             replace an instrument in the middle of a protocol being run
                             from the Opentrons App or touchscreen.
        :param bool liquid_presence_detection: If ``True``, enable automatic
            :ref:`liquid presence detection <lpd>` for Flex 1-, 8-, or 96-channel pipettes.

            .. versionadded:: 2.20
        """
        instrument_name = validation.ensure_lowercase_name(instrument_name)
        checked_instrument_name = validation.ensure_pipette_name(instrument_name)
        checked_mount = validation.ensure_mount_for_pipette(
            mount, checked_instrument_name
        )

        is_96_channel = checked_instrument_name in [
            PipetteNameType.P1000_96,
            PipetteNameType.P200_96,
        ]

        tip_racks = tip_racks or []

        # TODO (tz, 9-12-23): move validation into PE
        on_right_mount = self._instruments[Mount.RIGHT]
        if is_96_channel and on_right_mount is not None:
            raise RuntimeError(
                f"Instrument already present on right:"
                f" {on_right_mount.name}. In order to load a 96-channel pipette, both mounts need to be available."
            )

        existing_instrument = self._instruments[checked_mount]
        if existing_instrument is not None and not replace:
            # TODO(mc, 2022-08-25): create specific exception type
            raise RuntimeError(
                f"Instrument already present on {checked_mount.name.lower()}:"
                f" {existing_instrument.name}"
            )

        logger.info(
            f"Loading {checked_instrument_name} on {checked_mount.name.lower()} mount"
        )

        if (
            self._api_version < APIVersion(2, 20)
            and liquid_presence_detection is not None
        ):
            raise APIVersionError(
                api_element="Liquid Presence Detection",
                until_version="2.20",
                current_version=f"{self._api_version}",
            )
        if (
            self._core.robot_type != "OT-3 Standard"
            and liquid_presence_detection is not None
        ):
            raise RobotTypeError(
                "Liquid presence detection only available on Flex robot."
            )
        instrument_core = self._core.load_instrument(
            instrument_name=checked_instrument_name,
            mount=checked_mount,
            liquid_presence_detection=liquid_presence_detection or False,
        )

        for tip_rack in tip_racks:
            instrument_support.validate_tiprack(
                instrument_name=instrument_core.get_pipette_name(),
                tip_rack=tip_rack,
                log=logger,
            )

        trash: Optional[Union[Labware, TrashBin]]
        try:
            trash = self.fixed_trash
        except (NoTrashDefinedError, UnsupportedAPIError):
            trash = None

        instrument = InstrumentContext(
            core=instrument_core,
            protocol_core=self._core,
            broker=self._broker,
            api_version=self._api_version,
            tip_racks=tip_racks,
            trash=trash,
            requested_as=instrument_name,
        )

        self._instruments[checked_mount] = instrument

        return instrument

    @property
    @requires_version(2, 0)
    def loaded_instruments(self) -> Dict[str, InstrumentContext]:
        """Get the instruments that have been loaded into the protocol.

        This is a map of mount name to instruments previously loaded with
        :py:meth:`load_instrument`. It does not reflect what instruments are actually
        installed on the robot. For example, if the robot has instruments installed on
        both mounts but your protocol has only loaded one of them with
        :py:meth:`load_instrument`, the unused one will not be included in
        ``loaded_instruments``.

        :returns: A dict mapping mount name (``"left"`` or ``"right"``) to the
            instrument in that mount. If a mount has no loaded instrument, that key
            will be missing from the dict.
        """
        return {
            mount.name.lower(): instr
            for mount, instr in self._instruments.items()
            if instr
        }

    @publish(command=cmds.pause)
    @requires_version(2, 0)
    def pause(self, msg: Optional[str] = None) -> None:
        """Pause execution of the protocol until it's resumed.

        A human can resume the protocol in the Opentrons App or on the touchscreen.

        .. note::
            In Python Protocol API version 2.13 and earlier, the pause will only
            take effect on the next function call that involves moving the robot.

        :param str msg: An optional message to show in the run log entry for the pause step.
        """
        self._core.pause(msg=msg)

    @publish(command=cmds.resume)
    @requires_version(2, 0)
    def resume(self) -> None:
        """Resume the protocol after :py:meth:`pause`.

        .. deprecated:: 2.12
           The Python Protocol API supports no safe way for a protocol to resume itself.
           If you're looking for a way for your protocol to resume automatically
           after a period of time, use :py:meth:`delay`.
        """
        if self._api_version >= ENGINE_CORE_API_VERSION:
            raise UnsupportedAPIError(
                api_element="A Python Protocol safely resuming itself after a pause",
                since_version=f"{ENGINE_CORE_API_VERSION}",
                current_version=f"{self._api_version}",
                extra_message="To wait automatically for a period of time, use ProtocolContext.delay().",
            )

        # TODO(mc, 2023-02-13): this assert should be enough for mypy
        # investigate if upgrading mypy allows the `cast` to be removed
        assert isinstance(self._core, LegacyProtocolCore)
        cast(LegacyProtocolCore, self._core).resume()

    @publish(command=cmds.comment)
    @requires_version(2, 0)
    def comment(self, msg: str) -> None:
        """
        Add a user-readable message to the run log.

        The message is visible anywhere you can view the run log, including the Opentrons App and the touchscreen on Flex.

        .. note::

            The value of the message is computed during protocol analysis,
            so ``comment()`` can't communicate real-time information during the
            actual protocol run.
        """
        self._core.comment(msg=msg)

    @publish(command=cmds.delay)
    @requires_version(2, 0)
    def delay(
        self,
        seconds: float = 0,
        minutes: float = 0,
        msg: Optional[str] = None,
    ) -> None:
        """Delay protocol execution for a specific amount of time.

        :param float seconds: The time to delay in seconds.
        :param float minutes: The time to delay in minutes.

        If both ``seconds`` and ``minutes`` are specified, they will be added together.
        """
        delay_time = seconds + minutes * 60
        self._core.delay(seconds=delay_time, msg=msg)

    @requires_version(2, 0)
    def home(self) -> None:
        """Home the movement system of the robot."""
        self._core.home()

    @property
    def location_cache(self) -> Optional[Location]:
        """The cache used by the robot to determine where it last was."""
        return self._core.get_last_location()

    @location_cache.setter
    def location_cache(self, loc: Optional[Location]) -> None:
        self._core.set_last_location(loc)

    @property
    @requires_version(2, 0)
    def deck(self) -> Deck:
        """An interface to provide information about what's currently loaded on the deck.
        This object is useful for determining if a slot on the deck is free.

        This object behaves like a dictionary whose keys are the :ref:`deck slot <deck-slots>` names.
        For instance, ``deck[1]``, ``deck["1"]``, and ``deck["D1"]``
        will all return the object loaded in the front-left slot.

        The value for each key depends on what is loaded in the slot:
          - A :py:obj:`~opentrons.protocol_api.Labware` if the slot contains a labware.
          - A module context if the slot contains a hardware module.
          - ``None`` if the slot doesn't contain anything.

        A module that occupies multiple slots is set as the value for all of the
        relevant slots. Currently, the only multiple-slot module is the Thermocycler.
        When loaded, the :py:class:`ThermocyclerContext` object is the value for
        ``deck`` keys ``"A1"`` and ``"B1"`` on Flex, and ``7``, ``8``, ``10``, and
        ``11`` on OT-2. In API version 2.13 and earlier, only slot 7 keyed to the
        Thermocycler object, and slots 8, 10, and 11 keyed to ``None``.

        Rather than filtering the objects in the deck map yourself,
        you can also use :py:attr:`loaded_labwares` to get a dict of labwares
        and :py:attr:`loaded_modules` to get a dict of modules.

        For :ref:`advanced-control` *only*, you can delete an element of the ``deck`` dict.
        This only works for deck slots that contain labware objects. For example, if slot
        1 contains a labware, ``del protocol.deck["1"]`` will free the slot so you can
        load another labware there.

        .. warning::
            Deleting labware from a deck slot does not pause the protocol. Subsequent
            commands continue immediately. If you need to physically move the labware to
            reflect the new deck state, add a :py:meth:`.pause` or use
            :py:meth:`.move_labware` instead.

        .. versionchanged:: 2.14
           Includes the Thermocycler in all of the slots it occupies.

        .. versionchanged:: 2.15
           ``del`` sets the corresponding labware's location to ``OFF_DECK``.
        """
        return self._deck

    @property
    @requires_version(2, 0)
    def fixed_trash(self) -> Union[Labware, TrashBin]:
        """The trash fixed to slot 12 of an OT-2's deck.

        In API version 2.15 and earlier, the fixed trash is a :py:class:`.Labware` object with one well. Access it like labware in your protocol. For example, ``protocol.fixed_trash["A1"]``.

        In API version 2.15 only, Flex protocols have a fixed trash in slot A3.

        In API version 2.16 and later, the fixed trash only exists in OT-2 protocols. It is a :py:class:`.TrashBin` object, which doesn't have any wells. Trying to access ``fixed_trash`` in a Flex protocol will raise an error. See :ref:`configure-trash-bin` for details on using the movable trash in Flex protocols.

        .. versionchanged:: 2.16
            Returns a ``TrashBin`` object.
        """
        if self._api_version >= APIVersion(2, 16):
            if self._core.robot_type == "OT-3 Standard":
                raise UnsupportedAPIError(
                    api_element="Fixed Trash",
                    since_version="2.16",
                    current_version=f"{self._api_version}",
                    extra_message="Fixed trash is no longer supported on Flex protocols.",
                )
            disposal_locations = self._core.get_disposal_locations()
            if len(disposal_locations) == 0:
                raise NoTrashDefinedError(
                    "No trash container has been defined in this protocol."
                )
            if isinstance(disposal_locations[0], TrashBin):
                return disposal_locations[0]

        fixed_trash = self._core_map.get(self._core.fixed_trash)
        if fixed_trash is None:
            raise NoTrashDefinedError(
                "No trash container has been defined in this protocol."
            )

        return fixed_trash

    def _load_fixed_trash(self) -> None:
        fixed_trash_core = self._core.fixed_trash
        if fixed_trash_core is not None:
            fixed_trash = Labware(
                core=fixed_trash_core,
                api_version=self._api_version,
                protocol_core=self._core,
                core_map=self._core_map,
            )
            self._core_map.add(fixed_trash_core, fixed_trash)

    @requires_version(2, 5)
    def set_rail_lights(self, on: bool) -> None:
        """
        Controls the robot's ambient lighting (rail lights).

        :param bool on: If ``True``, turn on the lights; otherwise, turn them off.
        """
        self._core.set_rail_lights(on=on)

    @requires_version(2, 14)
    def define_liquid(
        self,
        name: str,
        description: Union[str, None, _Unset] = _Unset(),
        display_color: Union[str, None, _Unset] = _Unset(),
    ) -> Liquid:
        # This first line of the docstring overrides the method signature in our public
        # docs, which would otherwise have the `_Unset()`s expanded to a bunch of junk.
        """
        define_liquid(self, name: str, description: Optional[str] = None, display_color: Optional[str] = None)

        Define a liquid within a protocol.

        :param str name: A human-readable name for the liquid.
        :param Optional[str] description: An optional description of the liquid.
        :param Optional[str] display_color: An optional hex color code, with hash included,
            to represent the specified liquid. For example, ``"#48B1FA"``.
            Standard three-value, four-value, six-value, and eight-value syntax are all
            acceptable.

        :return: A :py:class:`~opentrons.protocol_api.Liquid` object representing the specified liquid.

        .. versionchanged:: 2.20
            You can now omit the ``description`` and ``display_color`` arguments.
            Formerly, when you didn't want to provide values, you had to supply
            ``description=None`` and ``display_color=None`` explicitly.
        """
        desc_and_display_color_omittable_since = APIVersion(2, 20)
        if isinstance(description, _Unset):
            if self._api_version < desc_and_display_color_omittable_since:
                raise APIVersionError(
                    api_element="Calling `define_liquid()` without a `description`",
                    current_version=str(self._api_version),
                    until_version=str(desc_and_display_color_omittable_since),
                    extra_message="Use a newer API version or explicitly supply `description=None`.",
                )
            else:
                description = None
        if isinstance(display_color, _Unset):
            if self._api_version < desc_and_display_color_omittable_since:
                raise APIVersionError(
                    api_element="Calling `define_liquid()` without a `display_color`",
                    current_version=str(self._api_version),
                    until_version=str(desc_and_display_color_omittable_since),
                    extra_message="Use a newer API version or explicitly supply `display_color=None`.",
                )
            else:
                display_color = None

        return self._core.define_liquid(
            name=name,
            description=description,
            display_color=display_color,
        )

    def define_liquid_class(
        self,
        name: str,
    ) -> LiquidClass:
        """Define a liquid class for use in the protocol."""
        if feature_flags.allow_liquid_classes(
            robot_type=RobotTypeEnum.robot_literal_to_enum(self._core.robot_type)
        ):
            return self._core.define_liquid_class(name=name)
        else:
            raise NotImplementedError("This method is not implemented.")

    @property
    @requires_version(2, 5)
    def rail_lights_on(self) -> bool:
        """Returns ``True`` if the robot's ambient lighting is on."""
        return self._core.get_rail_lights_on()

    @property
    @requires_version(2, 5)
    def door_closed(self) -> bool:
        """Returns ``True`` if the front door of the robot is closed."""
        return self._core.door_closed()

    @requires_version(2, 23)
    def load_lid_stack(
        self,
        load_name: str,
        location: Union[DeckLocation, Labware],
        quantity: int,
        adapter: Optional[str] = None,
        namespace: Optional[str] = None,
        version: Optional[int] = None,
    ) -> Labware:
        """
        Load a stack of Lids onto a valid Deck Location or Adapter.

        :param str load_name: A string to use for looking up a lid definition.
            You can find the ``load_name`` for any standard lid on the Opentrons
            `Labware Library <https://labware.opentrons.com>`_.
        :param location: Either a :ref:`deck slot <deck-slots>`,
            like ``1``, ``"1"``, or ``"D1"``, or the a valid Opentrons Adapter.
        :param int quantity: The quantity of lids to be loaded in the stack.
        :param adapter: An adapter to load the lid stack on top of. Accepts the same
            values as the ``load_name`` parameter of :py:meth:`.load_adapter`. The
            adapter will use the same namespace as the lid labware, and the API will
            choose the adapter's version automatically.
        :param str namespace: The namespace that the lid labware definition belongs to.
            If unspecified, the API will automatically search two namespaces:

              - ``"opentrons"``, to load standard Opentrons labware definitions.
              - ``"custom_beta"``, to load custom labware definitions created with the
                `Custom Labware Creator <https://labware.opentrons.com/create>`__.

            You might need to specify an explicit ``namespace`` if you have a custom
            definition whose ``load_name`` is the same as an Opentrons-verified
            definition, and you want to explicitly choose one or the other.

        :param version: The version of the labware definition. You should normally
            leave this unspecified to let ``load_lid_stack()`` choose a version
            automatically.

        :return:  The initialized and loaded labware object representing the Lid Stack.
        """
        if self._api_version < validation.LID_STACK_VERSION_GATE:
            raise APIVersionError(
                api_element="Loading a Lid Stack",
                until_version="2.23",
                current_version=f"{self._api_version}",
            )

        load_location: Union[DeckSlotName, StagingSlotName, LabwareCore]
        if isinstance(location, Labware):
            load_location = location._core
        else:
            load_location = validation.ensure_and_convert_deck_slot(
                location, self._api_version, self._core.robot_type
            )

        if adapter is not None:
            if isinstance(load_location, DeckSlotName) or isinstance(
                load_location, StagingSlotName
            ):
                loaded_adapter = self.load_adapter(
                    load_name=adapter,
                    location=load_location.value,
                    namespace=namespace,
                )
                load_location = loaded_adapter._core
            else:
                raise ValueError(
                    "Location cannot be a Labware or Adapter when the 'adapter' field is not None."
                )

        load_name = validation.ensure_lowercase_name(load_name)

        result = self._core.load_lid_stack(
            load_name=load_name,
            location=load_location,
            quantity=quantity,
            namespace=namespace,
            version=version,
        )

        labware = Labware(
            core=result,
            api_version=self._api_version,
            protocol_core=self._core,
            core_map=self._core_map,
        )
        return labware


def _create_module_context(
    module_core: Union[ModuleCore, NonConnectedModuleCore],
    protocol_core: ProtocolCore,
    core_map: LoadedCoreMap,
    api_version: APIVersion,
    broker: LegacyBroker,
) -> ModuleTypes:
    module_cls: Optional[Type[ModuleTypes]] = None
    if isinstance(module_core, AbstractTemperatureModuleCore):
        module_cls = TemperatureModuleContext
    elif isinstance(module_core, AbstractMagneticModuleCore):
        module_cls = MagneticModuleContext
    elif isinstance(module_core, AbstractThermocyclerCore):
        module_cls = ThermocyclerContext
    elif isinstance(module_core, AbstractHeaterShakerCore):
        module_cls = HeaterShakerContext
    elif isinstance(module_core, AbstractMagneticBlockCore):
        module_cls = MagneticBlockContext
    elif isinstance(module_core, AbstractAbsorbanceReaderCore):
        module_cls = AbsorbanceReaderContext
    else:
        assert False, "Unsupported module type"

    return module_cls(
        core=module_core,
        protocol_core=protocol_core,
        core_map=core_map,
        api_version=api_version,
        broker=broker,
    )
