"""ProtocolEngine-based Protocol API core implementation."""
from __future__ import annotations
from typing import Dict, Optional, Type, Union, List, Tuple, TYPE_CHECKING

from opentrons_shared_data.liquid_classes import LiquidClassDefinitionDoesNotExist

from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.commands import LoadModuleResult

from opentrons_shared_data.deck.types import DeckDefinitionV5, SlotDefV3
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict
from opentrons_shared_data import liquid_classes
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotType

from opentrons.types import (
    DeckSlotName,
    Location,
    Mount,
    MountType,
    Point,
    StagingSlotName,
)
from opentrons.hardware_control import SyncHardwareAPI, SynchronousAdapter
from opentrons.hardware_control.modules import AbstractModule
from opentrons.hardware_control.modules.types import ModuleModel, ModuleType
from opentrons.hardware_control.types import DoorState
from opentrons.protocols.api_support.util import AxisMaxSpeeds
from opentrons.protocols.api_support.types import APIVersion


from opentrons.protocol_engine import (
    DeckSlotLocation,
    AddressableAreaLocation,
    ModuleLocation,
    OnLabwareLocation,
    ModuleModel as EngineModuleModel,
    LabwareMovementStrategy,
    LabwareOffsetVector,
    LoadedLabware,
    LoadedModule,
)
from opentrons.protocol_engine.types import (
    ModuleModel as ProtocolEngineModuleModel,
    OFF_DECK_LOCATION,
    LabwareLocation,
    NonStackedLocation,
)
from opentrons.protocol_engine.clients import SyncClient as ProtocolEngineClient
from opentrons.protocol_engine.errors import (
    LabwareNotLoadedOnModuleError,
    LabwareNotLoadedOnLabwareError,
)

from ... import validation
from ..._types import OffDeckType
from ..._liquid import Liquid, LiquidClass
from ...disposal_locations import TrashBin, WasteChute
from ..protocol import AbstractProtocol
from ..labware import LabwareLoadParams
from .labware import LabwareCore
from .instrument import InstrumentCore
from .robot import RobotCore
from .module_core import (
    ModuleCore,
    TemperatureModuleCore,
    MagneticModuleCore,
    ThermocyclerModuleCore,
    HeaterShakerModuleCore,
    NonConnectedModuleCore,
    MagneticBlockCore,
    AbsorbanceReaderCore,
)
from .exceptions import InvalidModuleLocationError
from . import load_labware_params, deck_conflict, overlap_versions

if TYPE_CHECKING:
    from ...labware import Labware


class ProtocolCore(
    AbstractProtocol[
        InstrumentCore,
        LabwareCore,
        Union[ModuleCore, NonConnectedModuleCore],
    ]
):
    """Protocol API core using a ProtocolEngine.

    Args:
        engine_client: A client to the ProtocolEngine that is executing the protocol.
        api_version: The Python Protocol API versionat which  this core is operating.
        sync_hardware: A SynchronousAdapter-wrapped Hardware Control API.
    """

    def __init__(
        self,
        engine_client: ProtocolEngineClient,
        api_version: APIVersion,
        sync_hardware: SyncHardwareAPI,
    ) -> None:
        self._engine_client = engine_client
        self._api_version = api_version
        self._sync_hardware = sync_hardware
        self._last_location: Optional[Location] = None
        self._last_mount: Optional[Mount] = None
        self._labware_cores_by_id: Dict[str, LabwareCore] = {}
        self._module_cores_by_id: Dict[
            str, Union[ModuleCore, NonConnectedModuleCore]
        ] = {}
        self._disposal_locations: List[Union[Labware, TrashBin, WasteChute]] = []
        self._defined_liquid_class_defs_by_name: Dict[str, LiquidClassSchemaV1] = {}
        self._load_fixed_trash()

    @property
    def api_version(self) -> APIVersion:
        """Get the api version protocol target."""
        return self._api_version

    @property
    def robot_type(self) -> RobotType:
        return self._engine_client.state.config.robot_type

    @property
    def fixed_trash(self) -> Optional[LabwareCore]:
        """Get the fixed trash labware."""
        trash_id = self._engine_client.state.labware.get_fixed_trash_id()
        if trash_id is not None and self._api_version < APIVersion(2, 16):
            return self._labware_cores_by_id[trash_id]
        return None

    def _load_fixed_trash(self) -> None:
        if self.robot_type == "OT-2 Standard" or self._api_version < APIVersion(2, 16):
            trash_id = self._engine_client.state.labware.get_fixed_trash_id()
            if trash_id is not None:
                self._labware_cores_by_id[trash_id] = LabwareCore(
                    labware_id=trash_id,
                    engine_client=self._engine_client,
                )

    def append_disposal_location(
        self,
        disposal_location: Union[Labware, TrashBin, WasteChute],
    ) -> None:
        """Append a disposal location object to the core."""
        self._disposal_locations.append(disposal_location)

    def _add_disposal_location_to_engine(
        self, disposal_location: Union[TrashBin, WasteChute]
    ) -> None:
        """Verify and add disposal location to engine store and append it to the core."""
        self._engine_client.state.addressable_areas.raise_if_area_not_in_deck_configuration(
            disposal_location.area_name
        )
        if isinstance(disposal_location, TrashBin):
            deck_conflict.check(
                engine_state=self._engine_client.state,
                new_trash_bin=disposal_location,
                existing_disposal_locations=self._disposal_locations,
                # TODO: We can now fetch these IDs from engine too.
                #  See comment in self.load_labware().
                #
                # Wrapping .keys() in list() is just to make Decoy verification easier.
                existing_labware_ids=list(self._labware_cores_by_id.keys()),
                existing_module_ids=list(self._module_cores_by_id.keys()),
            )
        self._engine_client.add_addressable_area(disposal_location.area_name)
        self.append_disposal_location(disposal_location)

    def get_disposal_locations(self) -> List[Union[Labware, TrashBin, WasteChute]]:
        """Get disposal locations."""
        return self._disposal_locations

    def get_max_speeds(self) -> AxisMaxSpeeds:
        """Get a control interface for maximum move speeds."""
        raise NotImplementedError("ProtocolCore.get_max_speeds not implemented")

    def get_hardware(self) -> SyncHardwareAPI:
        """Get direct access to a hardware control interface."""
        return self._sync_hardware

    def is_simulating(self) -> bool:
        """Get whether the protocol is being analyzed or actually run."""
        return self._engine_client.state.config.ignore_pause

    def add_labware_definition(
        self,
        definition: LabwareDefDict,
    ) -> LabwareLoadParams:
        """Add a labware definition to the set of loadable definitions."""
        uri = self._engine_client.add_labware_definition(
            LabwareDefinition.model_validate(definition)
        )
        return LabwareLoadParams.from_uri(uri)

    def load_labware(
        self,
        load_name: str,
        location: Union[
            DeckSlotName,
            StagingSlotName,
            LabwareCore,
            ModuleCore,
            NonConnectedModuleCore,
            OffDeckType,
        ],
        label: Optional[str],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCore:
        """Load a labware using its identifying parameters."""
        load_location = self._convert_labware_location(location=location)

        custom_labware_params = (
            self._engine_client.state.labware.find_custom_labware_load_params()
        )
        namespace, version = load_labware_params.resolve(
            load_name, namespace, version, custom_labware_params
        )

        load_result = self._engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                loadName=load_name,
                location=load_location,
                namespace=namespace,
                version=version,
                displayName=label,
            )
        )
        # FIXME(jbl, 2023-08-14) validating after loading the object issue
        validation.ensure_definition_is_labware(load_result.definition)
        validation.ensure_definition_is_not_lid_after_api_version(
            self.api_version, load_result.definition
        )

        # FIXME(mm, 2023-02-21):
        #
        # We're wrongly checking for deck conflicts *after* we've already loaded the
        # labware into the ProtocolEngine. If it turns out there is a conflict,
        # and this check raises, it will leave this object and its ProtocolEngine
        # in a confusing inconsistent state.
        #
        # I expect we can get away with this in practice a lot of the time because
        # exceptions in Python protocols are mostly treated as fatal, anyway.
        # Users rarely catch them.
        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_labware_id=load_result.labwareId,
            existing_disposal_locations=self._disposal_locations,
            # TODO (spp, 2023-11-27): We've been using IDs from _labware_cores_by_id
            #  and _module_cores_by_id instead of getting the lists directly from engine
            #  because of the chance of engine carrying labware IDs from LPC too.
            #  But with https://github.com/Opentrons/opentrons/pull/13943,
            #  & LPC in maintenance runs, we can now rely on engine state for these IDs too.
            # Wrapping .keys() in list() is just to make Decoy verification easier.
            existing_labware_ids=list(self._labware_cores_by_id.keys()),
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

        labware_core = LabwareCore(
            labware_id=load_result.labwareId,
            engine_client=self._engine_client,
        )

        self._labware_cores_by_id[labware_core.labware_id] = labware_core

        return labware_core

    def load_adapter(
        self,
        load_name: str,
        location: Union[
            DeckSlotName,
            StagingSlotName,
            ModuleCore,
            NonConnectedModuleCore,
            OffDeckType,
        ],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCore:
        """Load an adapter using its identifying parameters"""
        load_location = self._get_non_stacked_location(location=location)

        custom_labware_params = (
            self._engine_client.state.labware.find_custom_labware_load_params()
        )
        namespace, version = load_labware_params.resolve(
            load_name, namespace, version, custom_labware_params
        )
        load_result = self._engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                loadName=load_name,
                location=load_location,
                namespace=namespace,
                version=version,
            )
        )
        # FIXME(jbl, 2023-08-14) validating after loading the object issue
        validation.ensure_definition_is_adapter(load_result.definition)

        # FIXME(jbl, 2023-06-23) read fixme above:
        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_labware_id=load_result.labwareId,
            existing_disposal_locations=self._disposal_locations,
            # TODO: We can now fetch these IDs from engine too.
            #  See comment in self.load_labware().
            #
            # Wrapping .keys() in list() is just to make Decoy verification easier.
            existing_labware_ids=list(self._labware_cores_by_id.keys()),
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

        labware_core = LabwareCore(
            labware_id=load_result.labwareId,
            engine_client=self._engine_client,
        )

        self._labware_cores_by_id[labware_core.labware_id] = labware_core

        return labware_core

    def load_lid(
        self,
        load_name: str,
        location: LabwareCore,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCore:
        """Load an individual lid using its identifying parameters. Must be loaded on an existing Labware."""
        load_location = self._convert_labware_location(location=location)
        custom_labware_params = (
            self._engine_client.state.labware.find_custom_labware_load_params()
        )
        namespace, version = load_labware_params.resolve(
            load_name, namespace, version, custom_labware_params
        )
        load_result = self._engine_client.execute_command_without_recovery(
            cmd.LoadLidParams(
                loadName=load_name,
                location=load_location,
                namespace=namespace,
                version=version,
            )
        )
        # FIXME(chb, 2024-12-06) validating after loading the object issue
        validation.ensure_definition_is_lid(load_result.definition)

        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_labware_id=load_result.labwareId,
            existing_disposal_locations=self._disposal_locations,
            # TODO: We can now fetch these IDs from engine too.
            #  See comment in self.load_labware().
            #
            # Wrapping .keys() in list() is just to make Decoy verification easier.
            existing_labware_ids=list(self._labware_cores_by_id.keys()),
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

        labware_core = LabwareCore(
            labware_id=load_result.labwareId,
            engine_client=self._engine_client,
        )

        self._labware_cores_by_id[labware_core.labware_id] = labware_core
        return labware_core

    def move_labware(
        self,
        labware_core: LabwareCore,
        new_location: Union[
            DeckSlotName,
            StagingSlotName,
            LabwareCore,
            ModuleCore,
            NonConnectedModuleCore,
            OffDeckType,
            WasteChute,
            TrashBin,
        ],
        use_gripper: bool,
        pause_for_manual_move: bool,
        pick_up_offset: Optional[Tuple[float, float, float]],
        drop_offset: Optional[Tuple[float, float, float]],
    ) -> None:
        """Move the given labware to a new location."""
        if use_gripper:
            strategy = LabwareMovementStrategy.USING_GRIPPER
        elif pause_for_manual_move:
            strategy = LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE
        else:
            strategy = LabwareMovementStrategy.MANUAL_MOVE_WITHOUT_PAUSE

        _pick_up_offset = (
            LabwareOffsetVector(
                x=pick_up_offset[0], y=pick_up_offset[1], z=pick_up_offset[2]
            )
            if pick_up_offset
            else None
        )
        _drop_offset = (
            LabwareOffsetVector(x=drop_offset[0], y=drop_offset[1], z=drop_offset[2])
            if drop_offset
            else None
        )

        to_location = self._convert_labware_location(location=new_location)

        self._engine_client.execute_command(
            cmd.MoveLabwareParams(
                labwareId=labware_core.labware_id,
                newLocation=to_location,
                strategy=strategy,
                pickUpOffset=_pick_up_offset,
                dropOffset=_drop_offset,
            )
        )

        if strategy == LabwareMovementStrategy.USING_GRIPPER:
            # Clear out last location since it is not relevant to pipetting
            # and we only use last location for in-place pipetting commands
            self.set_last_location(location=None, mount=Mount.EXTENSION)

        # FIXME(jbl, 2024-01-04) deck conflict after execution logic issue, read notes in load_labware for more info:
        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_labware_id=labware_core.labware_id,
            existing_disposal_locations=self._disposal_locations,
            # TODO: We can now fetch these IDs from engine too.
            #  See comment in self.load_labware().
            existing_labware_ids=[
                labware_id
                for labware_id in self._labware_cores_by_id
                if labware_id != labware_core.labware_id
            ],
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

    def _resolve_module_hardware(
        self, serial_number: str, model: ModuleModel
    ) -> AbstractModule:
        """Resolve a module serial number to module hardware API."""
        if self.is_simulating():
            return self._sync_hardware.create_simulating_module(model)  # type: ignore[no-any-return]

        for module_hardware in self._sync_hardware.attached_modules:
            if serial_number == module_hardware.device_info["serial"]:
                return module_hardware  # type: ignore[no-any-return]

        raise RuntimeError(f"Could not find specified module: {model.value}")

    def load_module(
        self,
        model: ModuleModel,
        deck_slot: Optional[DeckSlotName],
        configuration: Optional[str],
    ) -> Union[ModuleCore, NonConnectedModuleCore]:
        """Load a module into the protocol."""
        assert configuration is None, "Module `configuration` is deprecated"

        module_type = ModuleType.from_model(model)
        # TODO(mc, 2022-10-20): move to public ProtocolContext
        # once `Deck` and `ProtocolEngine` play nicely together
        if deck_slot is None:
            module_type = ModuleType.from_model(model)
            if module_type == ModuleType.THERMOCYCLER:
                deck_slot = DeckSlotName.SLOT_7
            else:
                raise InvalidModuleLocationError(deck_slot, model.name)

        robot_type = self._engine_client.state.config.robot_type
        # todo(mm, 2024-12-03): This might be possible to remove:
        # Protocol Engine will normalize the deck slot itself.
        normalized_deck_slot = deck_slot.to_equivalent_for_robot_type(robot_type)

        result = self._engine_client.execute_command_without_recovery(
            cmd.LoadModuleParams(
                model=EngineModuleModel(model),
                location=DeckSlotLocation(slotName=normalized_deck_slot),
            )
        )

        module_core = self._get_module_core(load_module_result=result, model=model)

        # FIXME(mm, 2023-02-21):
        # We're wrongly doing this conflict check *after* we've already loaded the
        # module into the ProtocolEngine. See FIXME comment in self.load_labware().
        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_module_id=result.moduleId,
            existing_disposal_locations=self._disposal_locations,
            # TODO: We can now fetch these IDs from engine too.
            #  See comment in self.load_labware().
            #
            # Wrapping .keys() in list() is just to make Decoy verification easier.
            existing_labware_ids=list(self._labware_cores_by_id.keys()),
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

        self._module_cores_by_id[module_core.module_id] = module_core

        return module_core

    def _create_non_connected_module_core(
        self, load_module_result: LoadModuleResult
    ) -> NonConnectedModuleCore:
        return MagneticBlockCore(
            module_id=load_module_result.moduleId,
            engine_client=self._engine_client,
            api_version=self.api_version,
        )

    def _create_module_core(
        self, load_module_result: LoadModuleResult, model: ModuleModel
    ) -> ModuleCore:
        module_core_cls: Type[ModuleCore] = ModuleCore

        type_lookup: Dict[ModuleType, Type[ModuleCore]] = {
            ModuleType.TEMPERATURE: TemperatureModuleCore,
            ModuleType.MAGNETIC: MagneticModuleCore,
            ModuleType.THERMOCYCLER: ThermocyclerModuleCore,
            ModuleType.HEATER_SHAKER: HeaterShakerModuleCore,
            ModuleType.ABSORBANCE_READER: AbsorbanceReaderCore,
        }

        module_type = load_module_result.model.as_type()

        module_core_cls = type_lookup[module_type]

        assert (
            load_module_result.serialNumber is not None
        ), "Expected a connected module but did not get a serial number."
        selected_hardware = self._resolve_module_hardware(
            load_module_result.serialNumber, model
        )

        return module_core_cls(
            module_id=load_module_result.moduleId,
            engine_client=self._engine_client,
            api_version=self.api_version,
            sync_module_hardware=SynchronousAdapter(selected_hardware),
        )

    def _get_module_core(
        self, load_module_result: LoadModuleResult, model: ModuleModel
    ) -> Union[ModuleCore, NonConnectedModuleCore]:
        if ProtocolEngineModuleModel.is_magnetic_block(load_module_result.model):
            return self._create_non_connected_module_core(load_module_result)
        else:
            return self._create_module_core(
                load_module_result=load_module_result, model=model
            )

    def load_robot(self) -> RobotCore:
        """Load a robot core into the RobotContext."""
        return RobotCore(
            engine_client=self._engine_client, sync_hardware_api=self._sync_hardware
        )

    def load_instrument(
        self,
        instrument_name: PipetteNameType,
        mount: Mount,
        liquid_presence_detection: bool = False,
    ) -> InstrumentCore:
        """Load an instrument into the protocol.

        Args:
            instrument_name: Load name of the instrument.
            mount: Mount the instrument is attached to.

        Returns:
            An instrument core configured to use the requested instrument.
        """
        engine_mount = MountType[mount.name]
        load_result = self._engine_client.execute_command_without_recovery(
            cmd.LoadPipetteParams(
                pipetteName=instrument_name,
                mount=engine_mount,
                tipOverlapNotAfterVersion=overlap_versions.overlap_for_api_version(
                    self._api_version
                ),
                liquidPresenceDetection=liquid_presence_detection,
            )
        )

        return InstrumentCore(
            pipette_id=load_result.pipetteId,
            engine_client=self._engine_client,
            sync_hardware_api=self._sync_hardware,
            protocol_core=self,
            # TODO(mm, 2022-11-10): Deduplicate "400" with legacy core.
            default_movement_speed=400,
        )

    def load_trash_bin(self, slot_name: DeckSlotName, area_name: str) -> TrashBin:
        """Load a deck configuration based trash bin.

        Args:
            slot_name: the slot the trash is being loaded into.
            area_name: the addressable area name of the trash.

        Returns:
            A trash bin object.
        """
        trash_bin = TrashBin(
            location=slot_name,
            addressable_area_name=area_name,
            api_version=self._api_version,
            engine_client=self._engine_client,
        )
        self._add_disposal_location_to_engine(trash_bin)
        return trash_bin

    def load_ot2_fixed_trash_bin(self) -> None:
        """Load a deck configured OT-2 fixed trash in Slot 12."""
        _fixed_trash_trash_bin = TrashBin(
            location=DeckSlotName.FIXED_TRASH,
            addressable_area_name="fixedTrash",
            api_version=self._api_version,
            engine_client=self._engine_client,
        )
        # We are just appending the fixed trash to the core's internal list here, not adding it to the engine via
        # the core, since that method works through the SyncClient and if called from here, will cause protocols
        # to deadlock. Instead, that method is called in protocol engine directly in create_protocol_context after
        # ProtocolContext is initialized.
        self.append_disposal_location(_fixed_trash_trash_bin)

    def load_waste_chute(self) -> WasteChute:
        """Load a deck configured waste chute into Slot D3.

        Returns:
            A waste chute object.
        """
        waste_chute = WasteChute(
            engine_client=self._engine_client, api_version=self._api_version
        )
        self._add_disposal_location_to_engine(waste_chute)
        return waste_chute

    def pause(self, msg: Optional[str]) -> None:
        """Pause the protocol."""
        self._engine_client.execute_command(cmd.WaitForResumeParams(message=msg))

    def comment(self, msg: str) -> None:
        """Create a comment in the protocol to be shown in the log."""
        self._engine_client.execute_command(cmd.CommentParams(message=msg))

    def delay(self, seconds: float, msg: Optional[str]) -> None:
        """Wait for a period of time before proceeding."""
        self._engine_client.execute_command(
            cmd.WaitForDurationParams(seconds=seconds, message=msg)
        )

    def home(self) -> None:
        """Move all axes to their home positions."""
        self._engine_client.execute_command(cmd.HomeParams(axes=None))

    def set_rail_lights(self, on: bool) -> None:
        """Set the device's rail lights."""
        self._engine_client.execute_command(cmd.SetRailLightsParams(on=on))

    def get_rail_lights_on(self) -> bool:
        """Get whether the device's rail lights are on."""
        return self._sync_hardware.get_lights()["rails"]  # type: ignore[no-any-return]

    def door_closed(self) -> bool:
        """Get whether the device's front door is closed."""
        return self._sync_hardware.door_state == DoorState.CLOSED  # type: ignore[no-any-return]

    def get_last_location(
        self,
        mount: Optional[Mount] = None,
    ) -> Optional[Location]:
        """Get the last accessed location."""
        if mount is None or mount == self._last_mount:
            return self._last_location

        return None

    def set_last_location(
        self,
        location: Optional[Location],
        mount: Optional[Mount] = None,
    ) -> None:
        """Set the last accessed location."""
        self._last_location = location
        self._last_mount = mount

    def load_lid_stack(
        self,
        load_name: str,
        location: Union[DeckSlotName, StagingSlotName, LabwareCore],
        quantity: int,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCore:
        """Load a Stack of Lids to a given location, creating a Lid Stack."""
        if quantity < 1:
            raise ValueError(
                "When loading a lid stack quantity cannot be less than one."
            )
        if isinstance(location, DeckSlotName) or isinstance(location, StagingSlotName):
            load_location = self._convert_labware_location(location=location)
        else:
            if isinstance(location, LabwareCore):
                load_location = self._convert_labware_location(location=location)
            else:
                raise ValueError(
                    "Expected type of Labware Location for lid stack must be Labware, not Legacy Labware or Well."
                )

        custom_labware_params = (
            self._engine_client.state.labware.find_custom_labware_load_params()
        )
        namespace, version = load_labware_params.resolve(
            load_name, namespace, version, custom_labware_params
        )

        load_result = self._engine_client.execute_command_without_recovery(
            cmd.LoadLidStackParams(
                loadName=load_name,
                location=load_location,
                namespace=namespace,
                version=version,
                quantity=quantity,
            )
        )

        # FIXME(CHB, 2024-12-04) just like load labware and load adapter we have a validating after loading the object issue
        validation.ensure_definition_is_lid(load_result.definition)

        deck_conflict.check(
            engine_state=self._engine_client.state,
            new_labware_id=load_result.stackLabwareId,
            existing_disposal_locations=self._disposal_locations,
            # TODO (spp, 2023-11-27): We've been using IDs from _labware_cores_by_id
            #  and _module_cores_by_id instead of getting the lists directly from engine
            #  because of the chance of engine carrying labware IDs from LPC too.
            #  But with https://github.com/Opentrons/opentrons/pull/13943,
            #  & LPC in maintenance runs, we can now rely on engine state for these IDs too.
            # Wrapping .keys() in list() is just to make Decoy verification easier.
            existing_labware_ids=list(self._labware_cores_by_id.keys()),
            existing_module_ids=list(self._module_cores_by_id.keys()),
        )

        labware_core = LabwareCore(
            labware_id=load_result.stackLabwareId,
            engine_client=self._engine_client,
        )

        self._labware_cores_by_id[labware_core.labware_id] = labware_core

        return labware_core

    def get_deck_definition(self) -> DeckDefinitionV5:
        """Get the geometry definition of the robot's deck."""
        return self._engine_client.state.labware.get_deck_definition()

    def get_slot_definition(
        self, slot: Union[DeckSlotName, StagingSlotName]
    ) -> SlotDefV3:
        """Get the slot definition from the robot's deck."""
        return self._engine_client.state.addressable_areas.get_slot_definition(slot.id)

    def get_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all standard slot definitions available in the deck definition."""
        return self._engine_client.state.addressable_areas.get_deck_slot_definitions()

    def get_staging_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all staging slot definitions available in the deck definition."""
        return (
            self._engine_client.state.addressable_areas.get_staging_slot_definitions()
        )

    def get_slot_item(
        self, slot_name: Union[DeckSlotName, StagingSlotName]
    ) -> Union[LabwareCore, ModuleCore, NonConnectedModuleCore, None]:
        """Get the contents of a given slot, if any."""
        loaded_item = self._engine_client.state.geometry.get_slot_item(
            slot_name=slot_name
        )

        if isinstance(loaded_item, LoadedLabware):
            return self._labware_cores_by_id[loaded_item.id]

        if isinstance(loaded_item, LoadedModule):
            return self._module_cores_by_id[loaded_item.id]

        return None

    def get_labware_on_module(
        self, module_core: Union[ModuleCore, NonConnectedModuleCore]
    ) -> Optional[LabwareCore]:
        """Get the item on top of a given module, if any."""
        try:
            labware_id = self._engine_client.state.labware.get_id_by_module(
                module_core.module_id
            )
            return self._labware_cores_by_id[labware_id]
        except LabwareNotLoadedOnModuleError:
            return None

    def get_labware_on_labware(
        self, labware_core: LabwareCore
    ) -> Optional[LabwareCore]:
        """Get the item on top of a given labware, if any."""
        try:
            labware_id = self._engine_client.state.labware.get_id_by_labware(
                labware_core.labware_id
            )
            return self._labware_cores_by_id[labware_id]
        except LabwareNotLoadedOnLabwareError:
            return None

    def get_slot_center(self, slot_name: Union[DeckSlotName, StagingSlotName]) -> Point:
        """Get the absolute coordinate of a slot's center."""
        return self._engine_client.state.addressable_areas.get_addressable_area_center(
            slot_name.id
        )

    def get_highest_z(self) -> float:
        """Get the highest Z point of all deck items."""
        return self._engine_client.state.geometry.get_all_obstacle_highest_z()

    def get_labware_cores(self) -> List[LabwareCore]:
        """Get all loaded labware cores."""
        return list(self._labware_cores_by_id.values())

    def get_module_cores(self) -> List[Union[ModuleCore, NonConnectedModuleCore]]:
        """Get all loaded module cores."""
        return list(self._module_cores_by_id.values())

    def define_liquid(
        self,
        name: str,
        description: Optional[str],
        display_color: Optional[str],
    ) -> Liquid:
        """Define a liquid to load into a well."""
        liquid = self._engine_client.add_liquid(
            name=name, description=description, color=display_color
        )

        return Liquid(
            _id=liquid.id,
            name=liquid.displayName,
            description=liquid.description,
            display_color=(liquid.displayColor.root if liquid.displayColor else None),
        )

    def define_liquid_class(self, name: str) -> LiquidClass:
        """Define a liquid class for use in transfer functions."""
        try:
            # Check if we have already loaded this liquid class' definition
            liquid_class_def = self._defined_liquid_class_defs_by_name[name]
        except KeyError:
            try:
                # Fetching the liquid class data from file and parsing it
                # is an expensive operation and should be avoided.
                # Calling this often will degrade protocol execution performance.
                liquid_class_def = liquid_classes.load_definition(name)
                self._defined_liquid_class_defs_by_name[name] = liquid_class_def
            except LiquidClassDefinitionDoesNotExist:
                raise ValueError(f"Liquid class definition not found for '{name}'.")

        return LiquidClass.create(liquid_class_def)

    def get_labware_location(
        self, labware_core: LabwareCore
    ) -> Union[str, LabwareCore, ModuleCore, NonConnectedModuleCore, OffDeckType]:
        """Get labware parent location."""
        labware_location = self._engine_client.state.labware.get_location(
            labware_core.labware_id
        )
        if isinstance(labware_location, DeckSlotLocation):
            return validation.internal_slot_to_public_string(
                labware_location.slotName, self._engine_client.state.config.robot_type
            )
        elif isinstance(labware_location, AddressableAreaLocation):
            # This will only ever be a robot accurate deck slot name or Flex staging slot name
            return labware_location.addressableAreaName
        elif isinstance(labware_location, ModuleLocation):
            return self._module_cores_by_id[labware_location.moduleId]
        elif isinstance(labware_location, OnLabwareLocation):
            return self._labware_cores_by_id[labware_location.labwareId]

        return OffDeckType.OFF_DECK

    def _convert_labware_location(
        self,
        location: Union[
            DeckSlotName,
            StagingSlotName,
            LabwareCore,
            ModuleCore,
            NonConnectedModuleCore,
            OffDeckType,
            WasteChute,
            TrashBin,
        ],
    ) -> LabwareLocation:
        if isinstance(location, LabwareCore):
            return OnLabwareLocation(labwareId=location.labware_id)
        else:
            return self._get_non_stacked_location(location)

    @staticmethod
    def _get_non_stacked_location(
        location: Union[
            DeckSlotName,
            StagingSlotName,
            ModuleCore,
            NonConnectedModuleCore,
            OffDeckType,
            WasteChute,
            TrashBin,
        ]
    ) -> NonStackedLocation:
        if isinstance(location, (ModuleCore, NonConnectedModuleCore)):
            return ModuleLocation(moduleId=location.module_id)
        elif location is OffDeckType.OFF_DECK:
            return OFF_DECK_LOCATION
        elif isinstance(location, DeckSlotName):
            return DeckSlotLocation(slotName=location)
        elif isinstance(location, StagingSlotName):
            return AddressableAreaLocation(addressableAreaName=location.id)
        elif isinstance(location, WasteChute):
            # TODO(mm, 2023-12-06) This will need to determine the appropriate Waste Chute to return, but only move_labware uses this for now
            return AddressableAreaLocation(addressableAreaName="gripperWasteChute")
        elif isinstance(location, TrashBin):
            return AddressableAreaLocation(addressableAreaName=location.area_name)
