import logging
from typing import Dict, List, Optional, Set, Union, cast, Tuple

from opentrons_shared_data.deck.types import DeckDefinitionV5, SlotDefV3
from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotType

from opentrons.types import (
    DeckSlotName,
    StagingSlotName,
    Location,
    Mount,
    Point,
)
from opentrons.util.broker import Broker
from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.modules import AbstractModule, ModuleModel, ModuleType
from opentrons.hardware_control.types import DoorState, PauseType
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import AxisMaxSpeeds, APIVersionError
from opentrons.protocols import labware as labware_definition

from ...labware import Labware
from ...disposal_locations import TrashBin, WasteChute
from ..._liquid import Liquid, LiquidClass
from ..._types import OffDeckType
from ..protocol import AbstractProtocol
from ..labware import LabwareLoadParams

from . import legacy_module_core, module_geometry
from .deck import Deck
from .legacy_instrument_core import LegacyInstrumentCore
from .labware_offset_provider import AbstractLabwareOffsetProvider
from .legacy_labware_core import LegacyLabwareCore
from .load_info import LoadInfo, InstrumentLoadInfo, LabwareLoadInfo, ModuleLoadInfo

logger = logging.getLogger(__name__)


class LegacyProtocolCore(
    AbstractProtocol[
        LegacyInstrumentCore,
        LegacyLabwareCore,
        legacy_module_core.LegacyModuleCore,
    ]
):
    def __init__(
        self,
        sync_hardware: SyncHardwareAPI,
        api_version: APIVersion,
        labware_offset_provider: AbstractLabwareOffsetProvider,
        deck_layout: Deck,
        equipment_broker: Optional[Broker[LoadInfo]] = None,
        bundled_labware: Optional[Dict[str, LabwareDefinition]] = None,
        extra_labware: Optional[Dict[str, LabwareDefinition]] = None,
    ) -> None:
        """Build a :py:class:`.LegacyProtocolCore`.

        :param api_version: The API version to use. If this is ``None``, uses
                            the max supported version.
        :param hardware: The hardware control API to use.
        :param bundled_labware: A dict mapping labware URIs to definitions.
                                This is used when executing bundled protocols,
                                and if specified will be the only allowed
                                source for labware definitions, excluding the
                                built in definitions and anything in
                                ``extra_labware``.
        :param bundled_data: A dict mapping filenames to the contents of data
                             files. Can be used by the protocol, since it is
                             exposed as
                             :py:attr:`.ProtocolContext.bundled_data`
        :param extra_labware: A dict mapping labware URIs to definitions. These
                              URIs are searched during :py:meth:`.load_labware`
                              in addition to the system definitions (if
                              ``bundled_labware`` was not specified). Used to
                              provide custom labware definitions.
        """
        self._sync_hardware = sync_hardware
        self._api_version = api_version
        self._labware_offset_provider = labware_offset_provider
        self._deck_layout = deck_layout
        self._equipment_broker = equipment_broker or Broker()

        self._instruments: Dict[Mount, Optional[LegacyInstrumentCore]] = {
            mount: None for mount in Mount.ot2_mounts()  # Legacy core works only on OT2
        }
        self._bundled_labware = bundled_labware
        self._extra_labware = extra_labware or {}
        self._default_max_speeds = AxisMaxSpeeds(robot_type=self.robot_type)
        self._last_location: Optional[Location] = None
        self._last_mount: Optional[Mount] = None
        self._loaded_modules: Set["AbstractModule"] = set()
        self._module_cores: List[legacy_module_core.LegacyModuleCore] = []
        self._labware_cores: List[LegacyLabwareCore] = [self.fixed_trash]
        self._disposal_locations: List[Union[Labware, TrashBin, WasteChute]] = []
        self._liquid_presence_detection = False

    @property
    def api_version(self) -> APIVersion:
        """Get the API version the protocol is adhering to."""
        return self._api_version

    @property
    def robot_type(self) -> RobotType:
        return "OT-2 Standard"

    @property
    def equipment_broker(self) -> Broker[LoadInfo]:
        """A message broker to to publish equipment load events.

        Subscribers to this broker will be notified with information about every
        successful labware load, instrument load, or module load.

        Only this interface is allowed to publish to this broker.
        Calling code may only subscribe or unsubscribe.
        """
        return self._equipment_broker

    def get_bundled_labware(self) -> Optional[Dict[str, LabwareDefinition]]:
        """Bundled labware definition."""
        # TODO AL 20201110 - This should be removed along with the bundling
        #  feature as we move to HTTP based protocol execution.
        return self._bundled_labware

    def get_extra_labware(self) -> Optional[Dict[str, LabwareDefinition]]:
        """Extra labware definitions."""
        return self._extra_labware

    def get_max_speeds(self) -> AxisMaxSpeeds:
        """Get the maximum axis speeds."""
        return self._default_max_speeds

    def get_hardware(self) -> SyncHardwareAPI:
        """Access to the synchronous hardware API."""
        return self._sync_hardware

    def is_simulating(self) -> bool:
        """Returns true if hardware is being simulated."""
        return self._sync_hardware.is_simulator  # type: ignore[no-any-return]

    def append_disposal_location(
        self,
        disposal_location: Union[Labware, TrashBin, WasteChute],
    ) -> None:
        if isinstance(disposal_location, (TrashBin, WasteChute)):
            raise APIVersionError(
                api_element="Trash Bin and Waste Chute Disposal locations"
            )
        self._disposal_locations.append(disposal_location)

    def add_labware_definition(
        self,
        definition: LabwareDefinition,
    ) -> LabwareLoadParams:
        """Add a labware definition to the set of loadable definitions."""
        load_params = LabwareLoadParams(
            namespace=definition["namespace"],
            load_name=definition["parameters"]["loadName"],
            version=definition["version"],
        )
        self._extra_labware = self._extra_labware.copy()
        self._extra_labware[load_params.as_uri()] = definition
        return load_params

    def load_labware(
        self,
        load_name: str,
        location: Union[
            DeckSlotName,
            LegacyLabwareCore,
            legacy_module_core.LegacyModuleCore,
            StagingSlotName,
            OffDeckType,
        ],
        label: Optional[str],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LegacyLabwareCore:
        """Load a labware using its identifying parameters."""
        if isinstance(location, OffDeckType):
            raise APIVersionError(
                api_element="Loading a labware off deck", until_version="2.15"
            )
        elif isinstance(location, LegacyLabwareCore):
            raise APIVersionError(
                api_element="Loading a labware onto another labware or adapter",
                until_version="2.15",
            )
        elif isinstance(location, StagingSlotName):
            raise APIVersionError(
                api_element="Using a staging deck slot", until_version="2.16"
            )

        deck_slot = (
            location if isinstance(location, DeckSlotName) else location.get_deck_slot()
        )

        parent = (
            self.get_deck().position_for(location.value)
            if isinstance(location, DeckSlotName)
            else location.geometry.location
        )

        labware_def = labware_definition.get_labware_definition(
            load_name,
            namespace,
            version,
            bundled_defs=self._bundled_labware,
            extra_defs=self._extra_labware,
        )
        labware_core = LegacyLabwareCore(
            definition=labware_def,
            parent=parent,
            label=label,
        )
        labware_load_params = labware_core.get_load_params()
        labware_offset = self._labware_offset_provider.find(
            load_params=labware_load_params,
            deck_slot=deck_slot,
            requested_module_model=(
                location.get_requested_model()
                if isinstance(location, legacy_module_core.LegacyModuleCore)
                else None
            ),
        )
        labware_core.set_calibration(labware_offset.delta)

        self._labware_cores.append(labware_core)
        if isinstance(location, DeckSlotName):
            # This assignment will raise if the new item conflicts with something else
            # on the deck--for example, if something tall is placed next to a
            # Heater-Shaker.
            #
            # It's a latent bug that we only do this conflict checking when loading
            # directly into a deck slot. We should also do conflict checking when
            # labware is loaded atop a module, because that affects the module's
            # maximum height.
            #
            # In practice, I don't think this matters now (2023-02-22) because of the
            # exact conflict checks that we perform. Wherever we have a constraint on
            # maximum height, we also happen to have a constraint disallowing modules
            # in the first place.
            self._deck_layout[location.value] = labware_core

        self._equipment_broker.publish(
            LabwareLoadInfo(
                labware_definition=labware_core.get_definition(),
                labware_namespace=labware_load_params.namespace,
                labware_load_name=labware_load_params.load_name,
                labware_version=labware_load_params.version,
                deck_slot=deck_slot,
                on_module=isinstance(location, legacy_module_core.LegacyModuleCore),
                offset_id=labware_offset.offset_id,
                labware_display_name=labware_core.get_user_display_name(),
            )
        )

        return labware_core

    def load_adapter(
        self,
        load_name: str,
        location: Union[
            DeckSlotName,
            StagingSlotName,
            legacy_module_core.LegacyModuleCore,
            OffDeckType,
        ],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LegacyLabwareCore:
        """Load an adapter using its identifying parameters"""
        raise APIVersionError(api_element="Loading adapter")

    def load_lid(
        self,
        load_name: str,
        location: LegacyLabwareCore,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LegacyLabwareCore:
        """Load an individual lid labware using its identifying parameters. Must be loaded on a labware."""
        raise APIVersionError(api_element="Loading lid")

    def load_robot(self) -> None:  # type: ignore
        """Load an adapter using its identifying parameters"""
        raise APIVersionError(api_element="Loading robot")

    def move_labware(
        self,
        labware_core: LegacyLabwareCore,
        new_location: Union[
            DeckSlotName,
            StagingSlotName,
            LegacyLabwareCore,
            legacy_module_core.LegacyModuleCore,
            OffDeckType,
            WasteChute,
            TrashBin,
        ],
        use_gripper: bool,
        pause_for_manual_move: bool,
        pick_up_offset: Optional[Tuple[float, float, float]],
        drop_offset: Optional[Tuple[float, float, float]],
    ) -> None:
        """Move labware to new location."""
        raise APIVersionError(api_element="Labware movement")

    def load_module(
        self,
        model: ModuleModel,
        deck_slot: Optional[DeckSlotName],
        configuration: Optional[str],
    ) -> legacy_module_core.LegacyModuleCore:
        """Load a module."""
        resolved_type = ModuleType.from_model(model)
        resolved_location = self._deck_layout.resolve_module_location(
            resolved_type, (None if deck_slot is None else deck_slot.id)
        )

        selected_hardware = None
        selected_definition = None

        for module_hardware in self._sync_hardware.attached_modules:
            if module_hardware not in self._loaded_modules:
                definition = module_geometry.load_definition(module_hardware.model())
                compatible = module_geometry.models_compatible(model, definition)

                if compatible:
                    self._loaded_modules.add(module_hardware)
                    selected_hardware = module_hardware
                    selected_definition = definition
                    break

        if selected_hardware is None and self.is_simulating():
            selected_hardware = self._sync_hardware.create_simulating_module(model)
            selected_definition = module_geometry.load_definition(model)

        if selected_hardware is None or selected_definition is None:
            raise RuntimeError(f"Could not find specified module: {model.value}")

        # Load geometry to match the hardware module that we found connected.
        geometry = module_geometry.create_geometry(
            definition=selected_definition,
            parent=self._deck_layout.position_for(resolved_location),
            configuration=configuration,
        )

        module_core = legacy_module_core.create_module_core(
            module_hardware_api=selected_hardware,
            requested_model=model,
            geometry=geometry,
            protocol_core=self,
        )

        self._deck_layout[resolved_location] = geometry
        self._module_cores.append(module_core)

        self.equipment_broker.publish(
            ModuleLoadInfo(
                requested_model=model,
                loaded_model=module_core.get_model(),
                module_serial=module_core.get_serial_number(),
                deck_slot=module_core.get_deck_slot(),
                configuration=configuration,
            )
        )

        return module_core

    def load_instrument(
        self,
        instrument_name: PipetteNameType,
        mount: Mount,
        liquid_presence_detection: bool = False,
    ) -> LegacyInstrumentCore:
        """Load an instrument."""
        attached = {
            att_mount: instr.get("name", None)
            for att_mount, instr in self._sync_hardware.attached_instruments.items()
            if instr
        }
        attached[mount] = instrument_name.value
        self._sync_hardware.cache_instruments(attached)
        # If the cache call didn’t raise, the instrument is attached
        new_instr = LegacyInstrumentCore(
            api_version=self._api_version,
            protocol_interface=self,
            mount=mount,
            instrument_name=instrument_name.value,
            default_speed=400.0,  # TODO(mm, 2022-11-10): Deduplicate with engine core.
        )
        self._instruments[mount] = new_instr
        logger.info("Instrument {} loaded".format(new_instr))

        pipette_dict = self._sync_hardware.get_attached_instrument(mount)
        self._equipment_broker.publish(
            InstrumentLoadInfo(
                instrument_load_name=instrument_name.value,
                mount=mount,
                pipette_dict=pipette_dict,
            )
        )

        return new_instr

    def load_trash_bin(self, slot_name: DeckSlotName, area_name: str) -> TrashBin:
        raise APIVersionError(api_element="Loading deck configured trash bin")

    def load_ot2_fixed_trash_bin(self) -> None:
        raise APIVersionError(
            api_element="Loading deck configured OT-2 fixed trash bin"
        )

    def load_waste_chute(self) -> WasteChute:
        raise APIVersionError(api_element="Loading waste chute")

    def get_loaded_instruments(
        self,
    ) -> Dict[Mount, Optional[LegacyInstrumentCore]]:
        """Get a mapping of mount to instrument."""
        return self._instruments

    def get_disposal_locations(self) -> List[Union[Labware, TrashBin, WasteChute]]:
        """Get valid disposal locations."""
        return self._disposal_locations

    def pause(self, msg: Optional[str]) -> None:
        """Pause the protocol."""
        self._sync_hardware.pause(PauseType.PAUSE)

    def resume(self) -> None:
        """Result the protocol."""
        self._sync_hardware.resume(PauseType.PAUSE)

    def comment(self, msg: str) -> None:
        """Add comment to run log."""
        pass

    def delay(self, seconds: float, msg: Optional[str]) -> None:
        """Delay execution for x seconds."""
        self._sync_hardware.delay(seconds)

    def home(self) -> None:
        """Home the robot."""
        self.set_last_location(None)
        self._sync_hardware.home()

    def get_deck(self) -> Deck:
        """Get the deck layout."""
        return self._deck_layout

    @property
    def fixed_trash(self) -> LegacyLabwareCore:
        """The trash fixed to slot 12 of the robot deck."""
        trash = self._deck_layout["12"]

        if isinstance(trash, LegacyLabwareCore):
            return trash
        if isinstance(trash, Labware):
            return cast(LegacyLabwareCore, trash._core)

        raise RuntimeError("Robot must have a trash container in 12")

    def set_rail_lights(self, on: bool) -> None:
        """Set the rail light state."""
        self._sync_hardware.set_lights(rails=on)

    def get_rail_lights_on(self) -> bool:
        """Get the rail light state."""
        return self._sync_hardware.get_lights()["rails"]  # type: ignore[no-any-return]

    def door_closed(self) -> bool:
        """Check if door is closed."""
        return DoorState.CLOSED == self._sync_hardware.door_state  # type: ignore[no-any-return]

    def get_last_location(
        self,
        mount: Optional[Mount] = None,
    ) -> Optional[Location]:
        """Get the most recent moved to location."""
        if mount is None or mount == self._last_mount:
            return self._last_location

        return None

    def set_last_location(
        self,
        location: Optional[Location],
        mount: Optional[Mount] = None,
    ) -> None:
        """Set the most recent moved to location."""
        self._last_location = location
        self._last_mount = mount

    def load_lid_stack(
        self,
        load_name: str,
        location: Union[DeckSlotName, StagingSlotName, LegacyLabwareCore],
        quantity: int,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LegacyLabwareCore:
        """Load a Stack of Lids to a given location, creating a Lid Stack."""
        raise APIVersionError(api_element="Lid stack")

    def get_module_cores(self) -> List[legacy_module_core.LegacyModuleCore]:
        """Get loaded module cores."""
        return self._module_cores

    def get_labware_cores(self) -> List[LegacyLabwareCore]:
        """Get all loaded labware cores."""
        return self._labware_cores

    def get_labware_on_module(
        self, module_core: legacy_module_core.LegacyModuleCore
    ) -> Optional[LegacyLabwareCore]:
        """Get the item on top of a given module, if any."""
        labware = module_core.geometry.labware
        return cast(LegacyLabwareCore, labware._core) if labware is not None else None

    def get_labware_on_labware(
        self, labware_core: LegacyLabwareCore
    ) -> Optional[LegacyLabwareCore]:
        assert False, "get_labware_on_labware only supported on engine core"

    def get_deck_definition(self) -> DeckDefinitionV5:
        """Get the geometry definition of the robot's deck."""
        assert False, "get_deck_definition only supported on engine core"

    def get_slot_definition(
        self, slot: Union[DeckSlotName, StagingSlotName]
    ) -> SlotDefV3:
        """Get the slot definition from the robot's deck."""
        assert False, "get_slot_definition only supported on engine core"

    def get_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all standard slot definitions available in the deck definition."""
        assert False, "get_slot_definitions only supported on engine core"

    def get_staging_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all staging slot definitions available in the deck definition."""
        assert False, "get_staging_slot_definitions only supported on engine core"

    def get_slot_item(
        self, slot_name: Union[DeckSlotName, StagingSlotName]
    ) -> Union[LegacyLabwareCore, legacy_module_core.LegacyModuleCore, None]:
        """Get the contents of a given slot, if any."""
        assert False, "get_slot_item only supported on engine core"

    def get_slot_center(self, slot_name: Union[DeckSlotName, StagingSlotName]) -> Point:
        """Get the absolute coordinate of a slot's center."""
        assert False, "get_slot_center only supported on engine core."

    def get_highest_z(self) -> float:
        """Get the highest Z point of all deck items."""
        assert False, "get_highest_z only supported on engine core"

    def define_liquid(
        self, name: str, description: Optional[str], display_color: Optional[str]
    ) -> Liquid:
        """Define a liquid to load into a well."""
        assert False, "define_liquid only supported on engine core"

    def define_liquid_class(self, name: str) -> LiquidClass:
        """Define a liquid class."""
        assert False, "define_liquid_class is only supported on engine core"

    def get_labware_location(
        self, labware_core: LegacyLabwareCore
    ) -> Union[
        str, LegacyLabwareCore, legacy_module_core.LegacyModuleCore, OffDeckType
    ]:
        """Get labware parent location."""
        assert False, "get_labware_location only supported on engine core"
