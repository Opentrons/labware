"""Equipment command side-effect logic."""
from dataclasses import dataclass
from typing import Optional, overload, Union, List

from opentrons_shared_data.pipette.types import PipetteNameType

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.protocols.models import LabwareDefinition
from opentrons.types import MountType
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules import (
    AbstractModule,
    MagDeck,
    HeaterShaker,
    TempDeck,
    Thermocycler,
    AbsorbanceReader,
)
from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons.protocol_engine.state.module_substates import (
    MagneticModuleId,
    HeaterShakerModuleId,
    TemperatureModuleId,
    ThermocyclerModuleId,
    AbsorbanceReaderId,
)
from ..errors import (
    FailedToLoadPipetteError,
    LabwareDefinitionDoesNotExistError,
    ModuleNotAttachedError,
)
from ..resources import (
    LabwareDataProvider,
    ModuleDataProvider,
    ModelUtils,
    pipette_data_provider,
)
from ..state.state import StateStore
from ..state.modules import HardwareModule
from ..types import (
    LabwareLocation,
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    LabwareOffset,
    LabwareOffsetLocation,
    ModuleModel,
    ModuleDefinition,
    AddressableAreaLocation,
)


@dataclass(frozen=True)
class LoadedLabwareData:
    """The result of a load labware procedure."""

    labware_id: str
    definition: LabwareDefinition
    offsetId: Optional[str]


@dataclass(frozen=True)
class ReloadedLabwareData:
    """The result of a reload labware procedure."""

    location: LabwareLocation
    offsetId: Optional[str]


@dataclass(frozen=True)
class LoadedPipetteData:
    """The result of a load pipette procedure."""

    pipette_id: str
    serial_number: str
    static_config: pipette_data_provider.LoadedStaticPipetteData


@dataclass(frozen=True)
class LoadedModuleData:
    """The result of a load module procedure."""

    module_id: str
    serial_number: Optional[str]
    definition: ModuleDefinition


@dataclass(frozen=True)
class LoadedConfigureForVolumeData:
    """The result of a load liquid class procedure."""

    pipette_id: str
    serial_number: str
    volume: float
    static_config: pipette_data_provider.LoadedStaticPipetteData


class EquipmentHandler:
    """Implementation logic for labware, pipette, and module loading."""

    _hardware_api: HardwareControlAPI
    _state_store: StateStore
    _labware_data_provider: LabwareDataProvider
    _module_data_provider: ModuleDataProvider
    _model_utils: ModelUtils
    _virtual_pipette_data_provider: pipette_data_provider.VirtualPipetteDataProvider

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        state_store: StateStore,
        labware_data_provider: Optional[LabwareDataProvider] = None,
        module_data_provider: Optional[ModuleDataProvider] = None,
        model_utils: Optional[ModelUtils] = None,
        virtual_pipette_data_provider: Optional[
            pipette_data_provider.VirtualPipetteDataProvider
        ] = None,
    ) -> None:
        """Initialize an EquipmentHandler instance."""
        self._hardware_api = hardware_api
        self._state_store = state_store
        self._labware_data_provider = labware_data_provider or LabwareDataProvider()
        self._module_data_provider = module_data_provider or ModuleDataProvider()
        self._model_utils = model_utils or ModelUtils()
        self._virtual_pipette_data_provider = (
            virtual_pipette_data_provider
            or pipette_data_provider.VirtualPipetteDataProvider()
        )

    async def load_labware(
        self,
        load_name: str,
        namespace: str,
        version: int,
        location: LabwareLocation,
        labware_id: Optional[str],
    ) -> LoadedLabwareData:
        """Load labware by assigning an identifier and pulling required data.

        Args:
            load_name: The labware's load name.
            namespace: The labware's namespace.
            version: The labware's version.
            location: The deck location at which labware is placed.
            labware_id: An optional identifier to assign the labware. If None, an
                identifier will be generated.

        Raises:
            ModuleNotLoadedError: If `location` references a module ID
                that doesn't point to a valid loaded module.

        Returns:
            A LoadedLabwareData object.
        """
        definition_uri = uri_from_details(
            load_name=load_name,
            namespace=namespace,
            version=version,
        )

        try:
            # Try to use existing definition in state.
            definition = self._state_store.labware.get_definition_by_uri(definition_uri)
        except LabwareDefinitionDoesNotExistError:
            definition = await self._labware_data_provider.get_labware_definition(
                load_name=load_name,
                namespace=namespace,
                version=version,
            )

        labware_id = (
            labware_id if labware_id is not None else self._model_utils.generate_id()
        )

        # Allow propagation of ModuleNotLoadedError.
        offset_id = self.find_applicable_labware_offset_id(
            labware_definition_uri=definition_uri,
            labware_location=location,
        )

        return LoadedLabwareData(
            labware_id=labware_id, definition=definition, offsetId=offset_id
        )

    async def reload_labware(self, labware_id: str) -> ReloadedLabwareData:
        """Reload an already-loaded labware. This cannot change the labware location.

        Args:
            labware_id: The ID of the already-loaded labware.

        Raises:
            LabwareNotLoadedError: If `labware_id` does not reference a loaded labware.

        """
        location = self._state_store.labware.get_location(labware_id)
        definition_uri = self._state_store.labware.get_definition_uri(labware_id)
        offset_id = self.find_applicable_labware_offset_id(
            labware_definition_uri=definition_uri,
            labware_location=location,
        )

        return ReloadedLabwareData(location=location, offsetId=offset_id)

    async def load_pipette(
        self,
        pipette_name: PipetteNameType,
        mount: MountType,
        pipette_id: Optional[str],
        tip_overlap_version: Optional[str],
    ) -> LoadedPipetteData:
        """Ensure the requested pipette is attached.

        Args:
            pipette_name: The pipette name.
            mount: The mount on which pipette must be attached.
            pipette_id: An optional identifier to assign the pipette. If None, an
                identifier will be generated.
            tip_overlap_version: An optional specifier for the version of tip overlap data to use.
                If None, defaults to v0. Does not need to be format checked - this function does it.

        Returns:
            A LoadedPipetteData object.
        """
        # TODO (spp, 2023-05-10): either raise error if using MountType.EXTENSION in
        #  load pipettes command, or change the mount type used to be a restricted
        #  PipetteMountType which has only pipette mounts and not the extension mount.
        use_virtual_pipettes = self._state_store.config.use_virtual_pipettes

        pipette_name_value = (
            pipette_name.value
            if isinstance(pipette_name, PipetteNameType)
            else pipette_name
        )
        sanitized_overlap_version = (
            pipette_data_provider.validate_and_default_tip_overlap_version(
                tip_overlap_version
            )
        )

        pipette_id = pipette_id or self._model_utils.generate_id()
        if not use_virtual_pipettes:
            cache_request = {mount.to_hw_mount(): pipette_name_value}

            # TODO(mc, 2022-12-09): putting the other pipette in the cache request
            # is only to support protocol analysis, since the hardware simulator
            # does not cache requested virtual instruments. Remove per
            # https://opentrons.atlassian.net/browse/RLIQ-258
            other_mount = mount.other_mount()
            other_pipette = self._state_store.pipettes.get_by_mount(other_mount)
            if other_pipette is not None:
                cache_request[other_mount.to_hw_mount()] = (
                    other_pipette.pipetteName.value
                    if isinstance(other_pipette.pipetteName, PipetteNameType)
                    else other_pipette.pipetteName
                )

            # TODO(mc, 2020-10-18): calling `cache_instruments` mirrors the
            # behavior of protocol_context.load_instrument, and is used here as a
            # pipette existence check
            try:
                await self._hardware_api.cache_instruments(cache_request)
            except RuntimeError as e:
                raise FailedToLoadPipetteError(str(e)) from e

            pipette_dict = self._hardware_api.get_attached_instrument(
                mount.to_hw_mount()
            )

            serial_number = pipette_dict["pipette_id"]
            static_pipette_config = pipette_data_provider.get_pipette_static_config(
                pipette_dict=pipette_dict, tip_overlap_version=sanitized_overlap_version
            )

        else:
            serial_number = self._model_utils.generate_id(prefix="fake-serial-number-")
            static_pipette_config = (
                self._virtual_pipette_data_provider.get_virtual_pipette_static_config(
                    pipette_name=pipette_name_value,
                    pipette_id=pipette_id,
                    tip_overlap_version=sanitized_overlap_version,
                )
            )
        serial = serial_number or ""
        return LoadedPipetteData(
            pipette_id=pipette_id,
            serial_number=serial,
            static_config=static_pipette_config,
        )

    async def load_magnetic_block(
        self,
        model: ModuleModel,
        location: Union[DeckSlotLocation, AddressableAreaLocation],
        module_id: Optional[str],
    ) -> LoadedModuleData:
        """Ensure the required magnetic block is attached.

        Args:
            model: The model name of the module.
            location: The deck location of the module
            module_id: Optional ID assigned to the module.
                       If None, an ID will be generated.

        Returns:
            A LoadedModuleData object.

        Raises:
            ModuleAlreadyPresentError: A module of a different type is already
                assigned to the requested location.
        """
        assert ModuleModel.is_magnetic_block(
            model
        ), f"Expected Magnetic block and got {model.name}"
        definition = self._module_data_provider.get_definition(model)
        return LoadedModuleData(
            module_id=self._model_utils.ensure_id(module_id),
            serial_number=None,
            definition=definition,
        )

    async def load_module(
        self,
        model: ModuleModel,
        location: DeckSlotLocation,
        module_id: Optional[str],
    ) -> LoadedModuleData:
        """Ensure the required module is attached.

        Args:
            model: The model name of the module.
            location: The deck location of the module
            module_id: Optional ID assigned to the module.
                       If None, an ID will be generated.

        Returns:
            A LoadedModuleData object.

        Raises:
            ModuleNotAttachedError: A not-yet-assigned module matching the requested
                parameters could not be found in the attached modules list.
            ModuleAlreadyPresentError: A module of a different type is already
                assigned to the requested location.
        """
        # TODO(mc, 2022-02-09): validate module location given deck definition
        use_virtual_modules = self._state_store.config.use_virtual_modules

        if not use_virtual_modules:
            attached_modules = [
                HardwareModule(
                    serial_number=hw_mod.device_info["serial"],
                    definition=self._module_data_provider.get_definition(
                        ModuleModel(hw_mod.model())
                    ),
                )
                for hw_mod in self._hardware_api.attached_modules
            ]

            serial_number_at_locaiton = self._state_store.geometry._addressable_areas.get_fixture_serial_from_deck_configuration_by_deck_slot(
                location.slotName
            )
            attached_module = self._state_store.modules.select_hardware_module_to_load(
                model=model,
                location=location,
                attached_modules=attached_modules,
                expected_serial_number=serial_number_at_locaiton,
            )

        else:
            attached_module = HardwareModule(
                serial_number=self._model_utils.generate_id(
                    prefix="fake-serial-number-"
                ),
                definition=self._module_data_provider.get_definition(model),
            )

        return LoadedModuleData(
            module_id=self._model_utils.ensure_id(module_id),
            serial_number=attached_module.serial_number,
            definition=attached_module.definition,
        )

    async def load_lids(
        self,
        load_name: str,
        namespace: str,
        version: int,
        location: LabwareLocation,
        quantity: int,
    ) -> List[LoadedLabwareData]:
        """Load one or many lid labware by assigning an identifier and pulling required data.

        Args:
            load_name: The lid labware's load name.
            namespace: The lid labware's namespace.
            version: The lid labware's version.
            location: The deck location at which lid(s) will be placed.
            labware_ids: An optional list of identifiers to assign the labware. If None,
                an identifier will be generated.

        Raises:
            ModuleNotLoadedError: If `location` references a module ID
                that doesn't point to a valid loaded module.

        Returns:
            A list of LoadedLabwareData objects.
        """
        definition_uri = uri_from_details(
            load_name=load_name,
            namespace=namespace,
            version=version,
        )
        try:
            # Try to use existing definition in state.
            definition = self._state_store.labware.get_definition_by_uri(definition_uri)
        except LabwareDefinitionDoesNotExistError:
            definition = await self._labware_data_provider.get_labware_definition(
                load_name=load_name,
                namespace=namespace,
                version=version,
            )

        stack_limit = definition.stackLimit if definition.stackLimit is not None else 1
        if quantity > stack_limit:
            raise ValueError(
                f"Requested quantity {quantity} is greater than the stack limit of {stack_limit} provided by definition for {load_name}."
            )

        # Allow propagation of ModuleNotLoadedError.
        if (
            isinstance(location, DeckSlotLocation)
            and definition.parameters.isDeckSlotCompatible is not None
            and not definition.parameters.isDeckSlotCompatible
        ):
            raise ValueError(
                f"Lid Labware {load_name} cannot be loaded onto a Deck Slot."
            )

        load_labware_data_list = []
        for i in range(quantity):
            load_labware_data_list.append(
                LoadedLabwareData(
                    labware_id=self._model_utils.generate_id(),
                    definition=definition,
                    offsetId=None,
                )
            )

        return load_labware_data_list

    async def configure_for_volume(
        self, pipette_id: str, volume: float, tip_overlap_version: Optional[str]
    ) -> LoadedConfigureForVolumeData:
        """Ensure the requested volume can be configured for the given pipette.

        Args:
            pipette_id: The identifier for the pipette.
            volume: The volume to configure the pipette for

        Returns:
            A LoadedConfiguredVolumeData object.
        """
        use_virtual_pipettes = self._state_store.config.use_virtual_pipettes
        sanitized_overlap_version = (
            pipette_data_provider.validate_and_default_tip_overlap_version(
                tip_overlap_version
            )
        )

        if not use_virtual_pipettes:
            mount = self._state_store.pipettes.get_mount(pipette_id).to_hw_mount()

            await self._hardware_api.configure_for_volume(mount, volume)
            pipette_dict = self._hardware_api.get_attached_instrument(mount)

            serial_number = pipette_dict["pipette_id"]
            static_pipette_config = pipette_data_provider.get_pipette_static_config(
                pipette_dict=pipette_dict, tip_overlap_version=sanitized_overlap_version
            )

        else:
            model = self._state_store.pipettes.get_model_name(pipette_id)
            self._virtual_pipette_data_provider.configure_virtual_pipette_for_volume(
                pipette_id, volume, model
            )

            serial_number = self._model_utils.generate_id(prefix="fake-serial-number-")
            static_pipette_config = self._virtual_pipette_data_provider.get_virtual_pipette_static_config_by_model_string(
                pipette_model_string=model,
                pipette_id=pipette_id,
                tip_overlap_version=sanitized_overlap_version,
            )

        return LoadedConfigureForVolumeData(
            pipette_id=pipette_id,
            serial_number=serial_number,
            volume=volume,
            static_config=static_pipette_config,
        )

    async def configure_nozzle_layout(
        self,
        pipette_id: str,
        primary_nozzle: Optional[str] = None,
        front_right_nozzle: Optional[str] = None,
        back_left_nozzle: Optional[str] = None,
    ) -> NozzleMap:
        """Ensure the requested nozzle layout is compatible with the current pipette.

        Args:
            pipette_id: The identifier for the pipette.
            primary_nozzle: The nozzle which will be used as the
            front_right_nozzle
            back_left_nozzle

        Returns:
            A NozzleMap object or None.
        """
        use_virtual_pipettes = self._state_store.config.use_virtual_pipettes

        if not use_virtual_pipettes:
            mount = self._state_store.pipettes.get_mount(pipette_id).to_hw_mount()

            await self._hardware_api.update_nozzle_configuration_for_mount(
                mount,
                back_left_nozzle if back_left_nozzle else primary_nozzle,
                front_right_nozzle if front_right_nozzle else primary_nozzle,
                primary_nozzle if back_left_nozzle else None,
            )
            pipette_dict = self._hardware_api.get_attached_instrument(mount)
            nozzle_map = pipette_dict["current_nozzle_map"]

        else:
            model = self._state_store.pipettes.get_model_name(pipette_id)
            self._virtual_pipette_data_provider.configure_virtual_pipette_nozzle_layout(
                pipette_id,
                model,
                back_left_nozzle if back_left_nozzle else primary_nozzle,
                front_right_nozzle if front_right_nozzle else primary_nozzle,
                primary_nozzle if back_left_nozzle else None,
            )
            nozzle_map = (
                self._virtual_pipette_data_provider.get_nozzle_layout_for_pipette(
                    pipette_id
                )
            )

        return nozzle_map

    @overload
    def get_module_hardware_api(
        self,
        module_id: MagneticModuleId,
    ) -> Optional[MagDeck]:
        ...

    @overload
    def get_module_hardware_api(
        self,
        module_id: HeaterShakerModuleId,
    ) -> Optional[HeaterShaker]:
        ...

    @overload
    def get_module_hardware_api(
        self,
        module_id: TemperatureModuleId,
    ) -> Optional[TempDeck]:
        ...

    @overload
    def get_module_hardware_api(
        self,
        module_id: ThermocyclerModuleId,
    ) -> Optional[Thermocycler]:
        ...

    @overload
    def get_module_hardware_api(
        self,
        module_id: AbsorbanceReaderId,
    ) -> Optional[AbsorbanceReader]:
        ...

    def get_module_hardware_api(self, module_id: str) -> Optional[AbstractModule]:
        """Get the hardware API for a given module."""
        use_virtual_modules = self._state_store.config.use_virtual_modules
        if use_virtual_modules:
            return None

        attached_modules = self._hardware_api.attached_modules
        serial_number = self._state_store.modules.get_serial_number(module_id)
        for mod in attached_modules:
            if mod.device_info["serial"] == serial_number:
                return mod

        raise ModuleNotAttachedError(
            f'No module attached with serial number "{serial_number}"'
            f' for module ID "{module_id}".'
        )

    def find_applicable_labware_offset_id(
        self, labware_definition_uri: str, labware_location: LabwareLocation
    ) -> Optional[str]:
        """Figure out what offset would apply to a labware in the given location.

        Raises:
            ModuleNotLoadedError: If `labware_location` references a module ID
                that doesn't point to a valid loaded module.

        Returns:
            The ID of the labware offset that will apply,
            or None if no labware offset will apply.
        """
        labware_offset_location = (
            self._get_labware_offset_location_from_labware_location(labware_location)
        )
        if labware_offset_location is None:
            # No offset for off-deck location.
            # Returning None instead of raising an exception allows loading a labware
            # with 'offDeck' as valid location.
            # Also allows using `moveLabware` with 'offDeck' location.
            return None
        offset = self._state_store.labware.find_applicable_labware_offset(
            definition_uri=labware_definition_uri,
            location=labware_offset_location,
        )
        return self._get_id_from_offset(offset)

    def _get_labware_offset_location_from_labware_location(
        self, labware_location: LabwareLocation
    ) -> Optional[LabwareOffsetLocation]:
        if isinstance(labware_location, DeckSlotLocation):
            return LabwareOffsetLocation(slotName=labware_location.slotName)
        elif isinstance(labware_location, ModuleLocation):
            module_id = labware_location.moduleId
            # Allow ModuleNotLoadedError to propagate.
            # Note also that we match based on the module's requested model, not its
            # actual model, to implement robot-server's documented HTTP API semantics.
            module_model = self._state_store.modules.get_requested_model(
                module_id=module_id
            )

            # If `module_model is None`, it probably means that this module was added by
            # `ProtocolEngine.use_attached_modules()`, instead of an explicit
            # `loadModule` command.
            #
            # This assert should never raise in practice because:
            #   1. `ProtocolEngine.use_attached_modules()` is only used by
            #      robot-server's "stateless command" endpoints, under `/commands`.
            #   2. Those endpoints don't support loading labware, so this code will
            #      never run.
            #
            # Nevertheless, if it does happen somehow, we do NOT want to pass the
            # `None` value along to `LabwareView.find_applicable_labware_offset()`.
            # `None` means something different there, which will cause us to return
            # wrong results.
            assert module_model is not None, (
                "Can't find offsets for labware"
                " that are loaded on modules"
                " that were loaded with ProtocolEngine.use_attached_modules()."
            )

            module_location = self._state_store.modules.get_location(
                module_id=module_id
            )
            slot_name = module_location.slotName
            return LabwareOffsetLocation(slotName=slot_name, moduleModel=module_model)
        elif isinstance(labware_location, OnLabwareLocation):
            parent_labware_id = labware_location.labwareId
            parent_labware_uri = self._state_store.labware.get_definition_uri(
                parent_labware_id
            )

            base_location = self._state_store.labware.get_parent_location(
                parent_labware_id
            )
            base_labware_offset_location = (
                self._get_labware_offset_location_from_labware_location(base_location)
            )
            if base_labware_offset_location is None:
                # No offset for labware sitting on labware off-deck
                return None

            # If labware is being stacked on itself, all labware in the stack will share a labware offset due to
            # them sharing the same definitionUri in `LabwareOffsetLocation`. This will not be true for the
            # bottom-most labware, which will have a `DeckSlotLocation` and have its definitionUri field empty.
            return LabwareOffsetLocation(
                slotName=base_labware_offset_location.slotName,
                moduleModel=base_labware_offset_location.moduleModel,
                definitionUri=parent_labware_uri,
            )
        else:  # Off deck
            return None

    @staticmethod
    def _get_id_from_offset(labware_offset: Optional[LabwareOffset]) -> Optional[str]:
        return None if labware_offset is None else labware_offset.id
