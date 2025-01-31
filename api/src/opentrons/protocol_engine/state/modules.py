"""Basic modules data state and store."""

from __future__ import annotations

from dataclasses import dataclass
from typing import (
    Dict,
    List,
    NamedTuple,
    Optional,
    Sequence,
    Type,
    TypeVar,
    Union,
    overload,
)
from numpy import array, dot, double as npdouble
from numpy.typing import NDArray

from opentrons.hardware_control.modules.magdeck import (
    OFFSET_TO_LABWARE_BOTTOM as MAGNETIC_MODULE_OFFSET_TO_LABWARE_BOTTOM,
)
from opentrons.hardware_control.modules.types import LiveData
from opentrons.motion_planning.adjacent_slots_getters import (
    get_east_slot,
    get_west_slot,
    get_adjacent_staging_slot,
)
from opentrons.protocol_engine.actions.get_state_update import get_state_updates
from opentrons.protocol_engine.commands.calibration.calibrate_module import (
    CalibrateModuleResult,
)
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.module_substates.absorbance_reader_substate import (
    AbsorbanceReaderMeasureMode,
)
from opentrons.types import DeckSlotName, MountType, StagingSlotName
from .update_types import AbsorbanceReaderStateUpdate
from ..errors import ModuleNotConnectedError

from ..types import (
    LoadedModule,
    ModuleModel,
    ModuleOffsetVector,
    ModuleOffsetData,
    ModuleType,
    ModuleDefinition,
    DeckSlotLocation,
    ModuleDimensions,
    LabwareOffsetVector,
    HeaterShakerLatchStatus,
    HeaterShakerMovementRestrictors,
    DeckType,
    LabwareMovementOffsetData,
    AddressableAreaLocation,
)

from ..resources import DeckFixedLabware
from .addressable_areas import AddressableAreaView
from .. import errors
from ..commands import (
    Command,
    LoadModuleResult,
    heater_shaker,
    temperature_module,
    thermocycler,
)
from ..actions import (
    Action,
    SucceedCommandAction,
    AddModuleAction,
)
from ._abstract_store import HasState, HandlesActions
from .module_substates import (
    MagneticModuleSubState,
    HeaterShakerModuleSubState,
    TemperatureModuleSubState,
    ThermocyclerModuleSubState,
    AbsorbanceReaderSubState,
    MagneticModuleId,
    HeaterShakerModuleId,
    TemperatureModuleId,
    ThermocyclerModuleId,
    AbsorbanceReaderId,
    MagneticBlockSubState,
    MagneticBlockId,
    ModuleSubStateType,
)
from .config import Config


ModuleSubStateT = TypeVar("ModuleSubStateT", bound=ModuleSubStateType)


class SlotTransit(NamedTuple):
    """Class defining starting and ending slots in a pipette movement."""

    start: DeckSlotName
    end: DeckSlotName


_OT2_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE = {
    SlotTransit(start=DeckSlotName.SLOT_1, end=DeckSlotName.FIXED_TRASH),
    SlotTransit(start=DeckSlotName.FIXED_TRASH, end=DeckSlotName.SLOT_1),
    SlotTransit(start=DeckSlotName.SLOT_4, end=DeckSlotName.FIXED_TRASH),
    SlotTransit(start=DeckSlotName.FIXED_TRASH, end=DeckSlotName.SLOT_4),
    SlotTransit(start=DeckSlotName.SLOT_4, end=DeckSlotName.SLOT_9),
    SlotTransit(start=DeckSlotName.SLOT_9, end=DeckSlotName.SLOT_4),
    SlotTransit(start=DeckSlotName.SLOT_4, end=DeckSlotName.SLOT_8),
    SlotTransit(start=DeckSlotName.SLOT_8, end=DeckSlotName.SLOT_4),
    SlotTransit(start=DeckSlotName.SLOT_1, end=DeckSlotName.SLOT_8),
    SlotTransit(start=DeckSlotName.SLOT_8, end=DeckSlotName.SLOT_1),
    SlotTransit(start=DeckSlotName.SLOT_4, end=DeckSlotName.SLOT_11),
    SlotTransit(start=DeckSlotName.SLOT_11, end=DeckSlotName.SLOT_4),
    SlotTransit(start=DeckSlotName.SLOT_1, end=DeckSlotName.SLOT_11),
    SlotTransit(start=DeckSlotName.SLOT_11, end=DeckSlotName.SLOT_1),
}

_OT3_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE = {
    SlotTransit(start=t.start.to_ot3_equivalent(), end=t.end.to_ot3_equivalent())
    for t in _OT2_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE
}

_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE = (
    _OT2_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE | _OT3_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE
)

_THERMOCYCLER_SLOT = DeckSlotName.SLOT_B1
_OT2_THERMOCYCLER_ADDITIONAL_SLOTS = [
    DeckSlotName.SLOT_8,
    DeckSlotName.SLOT_10,
    DeckSlotName.SLOT_11,
]
_OT3_THERMOCYCLER_ADDITIONAL_SLOTS = [DeckSlotName.SLOT_A1]


@dataclass(frozen=True)
class HardwareModule:
    """Data describing an actually connected module."""

    serial_number: Optional[str]
    definition: ModuleDefinition


@dataclass
class ModuleState:
    """The internal data to keep track of loaded modules."""

    slot_by_module_id: Dict[str, Optional[DeckSlotName]]
    """The deck slot that each module has been loaded into.

    This will be None when the module was added via
    ProtocolEngine.use_attached_modules() instead of an explicit loadModule command.
    """

    additional_slots_occupied_by_module_id: Dict[str, List[DeckSlotName]]
    """List of additional slots occupied by each module.

    The thermocycler (both GENs), occupies multiple slots on both OT-2 and the Flex
    but only one slot is associated with the location of the thermocycler.
    In order to check for deck conflicts with other items, we will keep track of any
    additional slots occupied by a module here.

    This will be None when a module occupies only one slot.
    """

    requested_model_by_id: Dict[str, Optional[ModuleModel]]
    """The model by which each loaded module was requested.

    Becuse of module compatibility, this can differ from the model found through
    hardware_module_by_id. See `ModuleView.get_requested_model()` versus
    `ModuleView.get_connected_model()`.

    This will be None when the module was added via
    ProtocolEngine.use_attached_modules() instead of an explicit loadModule command.
    """

    hardware_by_module_id: Dict[str, HardwareModule]
    """Information about each module's physical hardware."""

    substate_by_module_id: Dict[str, ModuleSubStateType]
    """Information about each module that's specific to the module type."""

    module_offset_by_serial: Dict[str, ModuleOffsetData]
    """Information about each modules offsets."""

    deck_type: DeckType
    """Type of deck that the modules are on."""

    deck_fixed_labware: Sequence[DeckFixedLabware]
    """Fixed labware from the deck which may be assigned to a module.

    The Opentrons Plate Reader module makes use of an electronic Lid labware which moves
    between the Reader and Dock positions, and is pre-loaded into the engine as to persist
    even when not in use. For this reason, we inject it here when an appropriate match
    is identified.
    """


class ModuleStore(HasState[ModuleState], HandlesActions):
    """Module state container."""

    _state: ModuleState

    def __init__(
        self,
        config: Config,
        deck_fixed_labware: Sequence[DeckFixedLabware],
        module_calibration_offsets: Optional[Dict[str, ModuleOffsetData]] = None,
    ) -> None:
        """Initialize a ModuleStore and its state."""
        self._state = ModuleState(
            slot_by_module_id={},
            additional_slots_occupied_by_module_id={},
            requested_model_by_id={},
            hardware_by_module_id={},
            substate_by_module_id={},
            module_offset_by_serial=module_calibration_offsets or {},
            deck_type=config.deck_type,
            deck_fixed_labware=deck_fixed_labware,
        )
        self._robot_type = config.robot_type

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        if isinstance(action, SucceedCommandAction):
            self._handle_command(action.command)

        elif isinstance(action, AddModuleAction):
            self._add_module_substate(
                module_id=action.module_id,
                serial_number=action.serial_number,
                definition=action.definition,
                slot_name=None,
                requested_model=None,
                module_live_data=action.module_live_data,
            )

        for state_update in get_state_updates(action):
            self._handle_state_update(state_update)

    def _handle_command(self, command: Command) -> None:
        # todo(mm, 2024-11-04): Delete this function. Port these isinstance()
        # checks to the update_types.StateUpdate mechanism.

        if isinstance(command.result, LoadModuleResult):
            slot_name = command.params.location.slotName
            self._add_module_substate(
                module_id=command.result.moduleId,
                serial_number=command.result.serialNumber,
                definition=command.result.definition,
                slot_name=slot_name,
                requested_model=command.params.model,
                module_live_data=None,
            )

        if isinstance(command.result, CalibrateModuleResult):
            self._update_module_calibration(
                module_id=command.params.moduleId,
                module_offset=command.result.moduleOffset,
                location=command.result.location,
            )

        if isinstance(
            command.result,
            (
                heater_shaker.SetTargetTemperatureResult,
                heater_shaker.DeactivateHeaterResult,
                heater_shaker.SetAndWaitForShakeSpeedResult,
                heater_shaker.DeactivateShakerResult,
                heater_shaker.OpenLabwareLatchResult,
                heater_shaker.CloseLabwareLatchResult,
            ),
        ):
            self._handle_heater_shaker_commands(command)

        if isinstance(
            command.result,
            (
                temperature_module.SetTargetTemperatureResult,
                temperature_module.DeactivateTemperatureResult,
            ),
        ):
            self._handle_temperature_module_commands(command)

        if isinstance(
            command.result,
            (
                thermocycler.SetTargetBlockTemperatureResult,
                thermocycler.DeactivateBlockResult,
                thermocycler.SetTargetLidTemperatureResult,
                thermocycler.DeactivateLidResult,
                thermocycler.OpenLidResult,
                thermocycler.CloseLidResult,
            ),
        ):
            self._handle_thermocycler_module_commands(command)

    def _handle_state_update(self, state_update: update_types.StateUpdate) -> None:
        if state_update.absorbance_reader_state_update != update_types.NO_CHANGE:
            self._handle_absorbance_reader_commands(
                state_update.absorbance_reader_state_update
            )

    def _add_module_substate(
        self,
        module_id: str,
        serial_number: Optional[str],
        definition: ModuleDefinition,
        slot_name: Optional[DeckSlotName],
        requested_model: Optional[ModuleModel],
        module_live_data: Optional[LiveData],
    ) -> None:
        actual_model = definition.model
        live_data = module_live_data["data"] if module_live_data else None

        self._state.requested_model_by_id[module_id] = requested_model
        self._state.slot_by_module_id[module_id] = slot_name
        self._state.hardware_by_module_id[module_id] = HardwareModule(
            serial_number=serial_number,
            definition=definition,
        )

        if ModuleModel.is_magnetic_module_model(actual_model):
            self._state.substate_by_module_id[module_id] = MagneticModuleSubState(
                module_id=MagneticModuleId(module_id),
                model=actual_model,
            )
        elif ModuleModel.is_heater_shaker_module_model(actual_model):
            if live_data is None:
                labware_latch_status = HeaterShakerLatchStatus.UNKNOWN
            elif live_data["labwareLatchStatus"] == "idle_closed":
                labware_latch_status = HeaterShakerLatchStatus.CLOSED
            else:
                labware_latch_status = HeaterShakerLatchStatus.OPEN
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=labware_latch_status,
                is_plate_shaking=(
                    live_data is not None and live_data["targetSpeed"] is not None
                ),
                plate_target_temperature=live_data["targetTemp"] if live_data else None,  # type: ignore[arg-type]
            )
        elif ModuleModel.is_temperature_module_model(actual_model):
            self._state.substate_by_module_id[module_id] = TemperatureModuleSubState(
                module_id=TemperatureModuleId(module_id),
                plate_target_temperature=live_data["targetTemp"] if live_data else None,  # type: ignore[arg-type]
            )
        elif ModuleModel.is_thermocycler_module_model(actual_model):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=live_data is not None and live_data["lid"] == "open",
                target_block_temperature=live_data["targetTemp"] if live_data else None,  # type: ignore[arg-type]
                target_lid_temperature=live_data["lidTarget"] if live_data else None,  # type: ignore[arg-type]
            )
            self._update_additional_slots_occupied_by_thermocycler(
                module_id=module_id, slot_name=slot_name
            )
        elif ModuleModel.is_magnetic_block(actual_model):
            self._state.substate_by_module_id[module_id] = MagneticBlockSubState(
                module_id=MagneticBlockId(module_id)
            )
        elif ModuleModel.is_absorbance_reader(actual_model):
            self._state.substate_by_module_id[module_id] = AbsorbanceReaderSubState(
                module_id=AbsorbanceReaderId(module_id),
                configured=False,
                measured=False,
                is_lid_on=True,
                data=None,
                measure_mode=None,
                configured_wavelengths=None,
                reference_wavelength=None,
            )

    def _update_additional_slots_occupied_by_thermocycler(
        self,
        module_id: str,
        slot_name: Optional[
            DeckSlotName
        ],  # addModuleAction will not have a slot location
    ) -> None:
        if slot_name != _THERMOCYCLER_SLOT.to_equivalent_for_robot_type(
            self._robot_type
        ):
            return

        self._state.additional_slots_occupied_by_module_id[module_id] = (
            _OT3_THERMOCYCLER_ADDITIONAL_SLOTS
            if self._state.deck_type == DeckType.OT3_STANDARD
            else _OT2_THERMOCYCLER_ADDITIONAL_SLOTS
        )

    def _update_module_calibration(
        self,
        module_id: str,
        module_offset: ModuleOffsetVector,
        location: DeckSlotLocation,
    ) -> None:
        module = self._state.hardware_by_module_id.get(module_id)
        if module:
            module_serial = module.serial_number
            assert (
                module_serial is not None
            ), "Expected a module SN and got None instead."
            self._state.module_offset_by_serial[module_serial] = ModuleOffsetData(
                moduleOffsetVector=module_offset,
                location=location,
            )

    def _handle_heater_shaker_commands(
        self,
        command: Union[
            heater_shaker.SetTargetTemperature,
            heater_shaker.DeactivateHeater,
            heater_shaker.SetAndWaitForShakeSpeed,
            heater_shaker.DeactivateShaker,
            heater_shaker.OpenLabwareLatch,
            heater_shaker.CloseLabwareLatch,
        ],
    ) -> None:
        module_id = command.params.moduleId
        hs_substate = self._state.substate_by_module_id[module_id]
        assert isinstance(
            hs_substate, HeaterShakerModuleSubState
        ), f"{module_id} is not heater-shaker."

        # Get current values to preserve target temperature not being set/deactivated
        prev_state: HeaterShakerModuleSubState = hs_substate

        if isinstance(command.result, heater_shaker.SetTargetTemperatureResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=prev_state.labware_latch_status,
                is_plate_shaking=prev_state.is_plate_shaking,
                plate_target_temperature=command.params.celsius,
            )
        elif isinstance(command.result, heater_shaker.DeactivateHeaterResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=prev_state.labware_latch_status,
                is_plate_shaking=prev_state.is_plate_shaking,
                plate_target_temperature=None,
            )
        elif isinstance(command.result, heater_shaker.SetAndWaitForShakeSpeedResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=prev_state.labware_latch_status,
                is_plate_shaking=True,
                plate_target_temperature=prev_state.plate_target_temperature,
            )
        elif isinstance(command.result, heater_shaker.DeactivateShakerResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=prev_state.labware_latch_status,
                is_plate_shaking=False,
                plate_target_temperature=prev_state.plate_target_temperature,
            )
        elif isinstance(command.result, heater_shaker.OpenLabwareLatchResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=HeaterShakerLatchStatus.OPEN,
                is_plate_shaking=prev_state.is_plate_shaking,
                plate_target_temperature=prev_state.plate_target_temperature,
            )
        elif isinstance(command.result, heater_shaker.CloseLabwareLatchResult):
            self._state.substate_by_module_id[module_id] = HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId(module_id),
                labware_latch_status=HeaterShakerLatchStatus.CLOSED,
                is_plate_shaking=prev_state.is_plate_shaking,
                plate_target_temperature=prev_state.plate_target_temperature,
            )

    def _handle_temperature_module_commands(
        self,
        command: Union[
            temperature_module.SetTargetTemperature,
            temperature_module.DeactivateTemperature,
        ],
    ) -> None:
        module_id = command.params.moduleId
        assert isinstance(
            self._state.substate_by_module_id[module_id], TemperatureModuleSubState
        ), f"{module_id} is not a temperature module."

        if isinstance(command.result, temperature_module.SetTargetTemperatureResult):
            self._state.substate_by_module_id[module_id] = TemperatureModuleSubState(
                module_id=TemperatureModuleId(module_id),
                plate_target_temperature=command.result.targetTemperature,
            )
        elif isinstance(command.result, temperature_module.DeactivateTemperatureResult):
            self._state.substate_by_module_id[module_id] = TemperatureModuleSubState(
                module_id=TemperatureModuleId(module_id),
                plate_target_temperature=None,
            )

    def _handle_thermocycler_module_commands(
        self,
        command: Union[
            thermocycler.SetTargetBlockTemperature,
            thermocycler.DeactivateBlock,
            thermocycler.SetTargetLidTemperature,
            thermocycler.DeactivateLid,
            thermocycler.OpenLid,
            thermocycler.CloseLid,
        ],
    ) -> None:
        module_id = command.params.moduleId
        thermocycler_substate = self._state.substate_by_module_id[module_id]
        assert isinstance(
            thermocycler_substate, ThermocyclerModuleSubState
        ), f"{module_id} is not a thermocycler module."

        # Get current values to preserve target temperature not being set/deactivated
        block_temperature = thermocycler_substate.target_block_temperature
        lid_temperature = thermocycler_substate.target_lid_temperature
        is_lid_open = thermocycler_substate.is_lid_open

        if isinstance(command.result, thermocycler.SetTargetBlockTemperatureResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=is_lid_open,
                target_block_temperature=command.result.targetBlockTemperature,
                target_lid_temperature=lid_temperature,
            )
        elif isinstance(command.result, thermocycler.DeactivateBlockResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=is_lid_open,
                target_block_temperature=None,
                target_lid_temperature=lid_temperature,
            )
        elif isinstance(command.result, thermocycler.SetTargetLidTemperatureResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=is_lid_open,
                target_block_temperature=block_temperature,
                target_lid_temperature=command.result.targetLidTemperature,
            )
        elif isinstance(command.result, thermocycler.DeactivateLidResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=is_lid_open,
                target_block_temperature=block_temperature,
                target_lid_temperature=None,
            )
        elif isinstance(command.result, thermocycler.OpenLidResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=True,
                target_block_temperature=block_temperature,
                target_lid_temperature=lid_temperature,
            )
        elif isinstance(command.result, thermocycler.CloseLidResult):
            self._state.substate_by_module_id[module_id] = ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId(module_id),
                is_lid_open=False,
                target_block_temperature=block_temperature,
                target_lid_temperature=lid_temperature,
            )

    def _handle_absorbance_reader_commands(
        self, absorbance_reader_state_update: AbsorbanceReaderStateUpdate
    ) -> None:
        # Get current values:
        module_id = absorbance_reader_state_update.module_id
        absorbance_reader_substate = self._state.substate_by_module_id[module_id]
        assert isinstance(
            absorbance_reader_substate, AbsorbanceReaderSubState
        ), f"{module_id} is not an absorbance plate reader."
        is_lid_on = absorbance_reader_substate.is_lid_on
        measured = True
        configured = absorbance_reader_substate.configured
        measure_mode = absorbance_reader_substate.measure_mode
        configured_wavelengths = absorbance_reader_substate.configured_wavelengths
        reference_wavelength = absorbance_reader_substate.reference_wavelength
        data = absorbance_reader_substate.data
        if (
            absorbance_reader_state_update.absorbance_reader_lid
            != update_types.NO_CHANGE
        ):
            is_lid_on = absorbance_reader_state_update.absorbance_reader_lid.is_lid_on
        elif (
            absorbance_reader_state_update.initialize_absorbance_reader_update
            != update_types.NO_CHANGE
        ):
            configured = True
            measured = False
            is_lid_on = is_lid_on
            measure_mode = AbsorbanceReaderMeasureMode(
                absorbance_reader_state_update.initialize_absorbance_reader_update.measure_mode
            )
            configured_wavelengths = (
                absorbance_reader_state_update.initialize_absorbance_reader_update.sample_wave_lengths
            )
            reference_wavelength = (
                absorbance_reader_state_update.initialize_absorbance_reader_update.reference_wave_length
            )
            data = None
        elif (
            absorbance_reader_state_update.absorbance_reader_data
            != update_types.NO_CHANGE
        ):
            data = absorbance_reader_state_update.absorbance_reader_data.read_result
        self._state.substate_by_module_id[module_id] = AbsorbanceReaderSubState(
            module_id=AbsorbanceReaderId(module_id),
            configured=configured,
            measured=measured,
            is_lid_on=is_lid_on,
            measure_mode=measure_mode,
            configured_wavelengths=configured_wavelengths,
            reference_wavelength=reference_wavelength,
            data=data,
        )


class ModuleView:
    """Read-only view of computed module state."""

    _state: ModuleState

    def __init__(self, state: ModuleState) -> None:
        """Initialize the view with its backing state value."""
        self._state = state

    def get(self, module_id: str) -> LoadedModule:
        """Get module data by the module's unique identifier."""
        try:
            slot_name = self._state.slot_by_module_id[module_id]
            attached_module = self._state.hardware_by_module_id[module_id]

        except KeyError as e:
            raise errors.ModuleNotLoadedError(module_id=module_id) from e

        location = (
            DeckSlotLocation(slotName=slot_name) if slot_name is not None else None
        )

        return LoadedModule.model_construct(
            id=module_id,
            location=location,
            model=attached_module.definition.model,
            serialNumber=attached_module.serial_number,
        )

    def get_all(self) -> List[LoadedModule]:
        """Get a list of all module entries in state."""
        return [self.get(mod_id) for mod_id in self._state.slot_by_module_id.keys()]

    def get_by_slot(
        self,
        slot_name: DeckSlotName,
    ) -> Optional[LoadedModule]:
        """Get the module located in a given slot, if any."""
        slots_by_id = reversed(list(self._state.slot_by_module_id.items()))

        for module_id, module_slot in slots_by_id:
            if module_slot == slot_name:
                return self.get(module_id)

        return None

    def _get_module_substate(
        self, module_id: str, expected_type: Type[ModuleSubStateT], expected_name: str
    ) -> ModuleSubStateT:
        """Return the specific sub-state of a given module ID.

        Args:
            module_id: The ID of the module.
            expected_type: The shape of the substate that we expect.
            expected_name: A user-friendly name of the module to put into an
                error message if the substate does not match the expected type.

        Raises:
            ModuleNotLoadedError: If module_id has not been loaded.
            WrongModuleTypeError: If module_id has been loaded,
                but it's not the expected type.
        """
        try:
            substate = self._state.substate_by_module_id[module_id]
        except KeyError as e:
            raise errors.ModuleNotLoadedError(module_id=module_id) from e

        if isinstance(substate, expected_type):
            return substate

        raise errors.WrongModuleTypeError(f"{module_id} is not a {expected_name}.")

    def get_magnetic_module_substate(self, module_id: str) -> MagneticModuleSubState:
        """Return a `MagneticModuleSubState` for the given Magnetic Module.

        Raises:
            ModuleNotLoadedError: If module_id has not been loaded.
            WrongModuleTypeError: If module_id has been loaded,
                but it's not a Magnetic Module.
        """
        return self._get_module_substate(
            module_id=module_id,
            expected_type=MagneticModuleSubState,
            expected_name="Magnetic Module",
        )

    def get_heater_shaker_module_substate(
        self, module_id: str
    ) -> HeaterShakerModuleSubState:
        """Return a `HeaterShakerModuleSubState` for the given Heater-Shaker Module.

        Raises:
           ModuleNotLoadedError: If module_id has not been loaded.
           WrongModuleTypeError: If module_id has been loaded,
               but it's not a Heater-Shaker Module.
        """
        return self._get_module_substate(
            module_id=module_id,
            expected_type=HeaterShakerModuleSubState,
            expected_name="Heater-Shaker Module",
        )

    def get_temperature_module_substate(
        self, module_id: str
    ) -> TemperatureModuleSubState:
        """Return a `TemperatureModuleSubState` for the given Temperature Module.

        Raises:
           ModuleNotLoadedError: If module_id has not been loaded.
           WrongModuleTypeError: If module_id has been loaded,
               but it's not a Temperature Module.
        """
        return self._get_module_substate(
            module_id=module_id,
            expected_type=TemperatureModuleSubState,
            expected_name="Temperature Module",
        )

    def get_thermocycler_module_substate(
        self, module_id: str
    ) -> ThermocyclerModuleSubState:
        """Return a `ThermocyclerModuleSubState` for the given Thermocycler Module.

        Raises:
           ModuleNotLoadedError: If module_id has not been loaded.
           WrongModuleTypeError: If module_id has been loaded,
               but it's not a Thermocycler Module.
        """
        return self._get_module_substate(
            module_id=module_id,
            expected_type=ThermocyclerModuleSubState,
            expected_name="Thermocycler Module",
        )

    def get_absorbance_reader_substate(
        self, module_id: str
    ) -> AbsorbanceReaderSubState:
        """Return a `AbsorbanceReaderSubState` for the given Absorbance Reader.

        Raises:
           ModuleNotLoadedError: If module_id has not been loaded.
           WrongModuleTypeError: If module_id has been loaded,
               but it's not an Absorbance Reader.
        """
        return self._get_module_substate(
            module_id=module_id,
            expected_type=AbsorbanceReaderSubState,
            expected_name="Absorbance Reader",
        )

    def get_location(self, module_id: str) -> DeckSlotLocation:
        """Get the slot location of the given module."""
        location = self.get(module_id).location
        if location is None:
            raise errors.ModuleNotOnDeckError(
                f"Module {module_id} is not loaded into a deck slot."
            )
        return location

    def get_requested_model(self, module_id: str) -> Optional[ModuleModel]:
        """Return the model by which this module was requested.

        Or, if this module was not loaded with an explicit ``loadModule`` command,
        return ``None``.

        See also `get_connected_model()`.
        """
        try:
            return self._state.requested_model_by_id[module_id]
        except KeyError as e:
            raise errors.ModuleNotLoadedError(module_id=module_id) from e

    # TODO(jbl 2023-06-20) rename this method to better reflect it's not just "connected" modules
    def get_connected_model(self, module_id: str) -> ModuleModel:
        """Return the model of the connected module.

        NOTE: This method will return the name for any module loaded, not just electronically connected ones.
            This includes the Magnetic Block.

        This can differ from `get_requested_model()` because of module compatibility.
        For example, a ``loadModule`` command might request a ``temperatureModuleV1``
        but return a ``temperatureModuleV2`` if that's what it finds actually connected
        at run time.
        """
        return self.get(module_id).model

    def get_serial_number(self, module_id: str) -> str:
        """Get the hardware serial number of the given module.

        If the underlying hardware API is simulating, this will be a dummy value
        provided by the hardware API.
        """
        module = self.get(module_id)
        if module.serialNumber is None:
            raise ModuleNotConnectedError(
                f"Expected a connected module and got a {module.model.name}"
            )
        return module.serialNumber

    def get_definition(self, module_id: str) -> ModuleDefinition:
        """Module definition by ID."""
        try:
            attached_module = self._state.hardware_by_module_id[module_id]
        except KeyError as e:
            raise errors.ModuleNotLoadedError(module_id=module_id) from e

        return attached_module.definition

    def get_dimensions(self, module_id: str) -> ModuleDimensions:
        """Get the specified module's dimensions."""
        return self.get_definition(module_id).dimensions

    def get_nominal_offset_to_child(
        self,
        module_id: str,
        # todo(mm, 2024-11-07): A method of one view taking a sibling view as an argument
        # is unusual, and may be bug-prone if the order in which the views are updated
        # matters. If we need to compute something that depends on module info and
        # addressable area info, can we do that computation in GeometryView instead of
        # here?
        addressable_areas: AddressableAreaView,
    ) -> LabwareOffsetVector:
        """Get the nominal offset from a module's location to its child labware's location.

        Includes the slot-specific transform. Does not include the child's
        Labware Position Check offset.
        """
        if (
            self._state.deck_type == DeckType.OT2_STANDARD
            or self._state.deck_type == DeckType.OT2_SHORT_TRASH
        ):
            definition = self.get_definition(module_id)
            slot = self.get_location(module_id).slotName.id

            pre_transform: NDArray[npdouble] = array(
                (
                    definition.labwareOffset.x,
                    definition.labwareOffset.y,
                    definition.labwareOffset.z,
                    1,
                )
            )
            xforms_ser = definition.slotTransforms.get(
                str(self._state.deck_type.value), {}
            ).get(
                slot,
                {
                    "labwareOffset": [
                        [1, 0, 0, 0],
                        [0, 1, 0, 0],
                        [0, 0, 1, 0],
                        [0, 0, 0, 1],
                    ]
                },
            )
            xforms_ser_offset = xforms_ser["labwareOffset"]

            # Apply the slot transform, if any
            xform: NDArray[npdouble] = array(xforms_ser_offset)
            xformed = dot(xform, pre_transform)
            return LabwareOffsetVector(
                x=xformed[0],
                y=xformed[1],
                z=xformed[2],
            )
        else:
            module = self.get(module_id)
            if isinstance(module.location, DeckSlotLocation):
                location = module.location.slotName
            elif module.model == ModuleModel.THERMOCYCLER_MODULE_V2:
                location = DeckSlotName.SLOT_B1
            else:
                raise ValueError(
                    "Module location invalid for nominal module offset calculation."
                )
            module_addressable_area = self.ensure_and_convert_module_fixture_location(
                location, module.model
            )
            module_addressable_area_position = (
                addressable_areas.get_addressable_area_offsets_from_cutout(
                    module_addressable_area
                )
            )
            return LabwareOffsetVector(
                x=module_addressable_area_position.x,
                y=module_addressable_area_position.y,
                z=module_addressable_area_position.z,
            )

    def get_module_calibration_offset(
        self, module_id: str
    ) -> Optional[ModuleOffsetData]:
        """Get the calibration module offset."""
        module_serial = self.get(module_id).serialNumber
        if module_serial:
            return self._state.module_offset_by_serial.get(module_serial)
        return None

    def get_overall_height(self, module_id: str) -> float:
        """Get the height of the module, excluding any labware loaded atop it."""
        return self.get_dimensions(module_id).bareOverallHeight

    # TODO(mc, 2022-01-19): this method is missing unit test coverage
    def get_height_over_labware(self, module_id: str) -> float:
        """Get the height of module parts above module labware base."""
        return self.get_dimensions(module_id).overLabwareHeight

    def get_module_highest_z(
        self, module_id: str, addressable_areas: AddressableAreaView
    ) -> float:
        """Get the highest z point of the module, as placed on the robot.

        The highest Z of a module, unlike the bare overall height, depends on
        the robot it is on. We will calculate this value using the info we already have
        about the transformation of the module's placement, based on the deck it is on.

        This value is calculated as:
        highest_z = ( nominal_robot_transformed_labware_offset_z
                      + z_difference_between_default_labware_offset_point_and_overall_height
                      + module_calibration_offset_z
        )

        For OT2, the default_labware_offset point is the same as nominal_robot_transformed_labware_offset_z
        and hence the highest z will equal to the overall height of the module.

        For Flex, since those two offsets are not the same, the final highest z will be
        transformed the same amount as the labware offset point is.

        Note: For thermocycler, the lid height is not taken into account.
        """
        module_height = self.get_overall_height(module_id)
        default_lw_offset_point = self.get_definition(module_id).labwareOffset.z
        z_difference = module_height - default_lw_offset_point

        nominal_transformed_lw_offset_z = self.get_nominal_offset_to_child(
            module_id=module_id, addressable_areas=addressable_areas
        ).z
        calibration_offset = self.get_module_calibration_offset(module_id)
        return (
            nominal_transformed_lw_offset_z
            + z_difference
            + (calibration_offset.moduleOffsetVector.z if calibration_offset else 0)
        )

    # TODO(mc, 2022-01-19): this method is missing unit test coverage and
    # is also unused. Remove or add tests.
    def get_lid_height(self, module_id: str) -> float:
        """Get lid height if module is thermocycler."""
        definition = self.get_definition(module_id)

        if (
            definition.moduleType == ModuleType.THERMOCYCLER
            and hasattr(definition.dimensions, "lidHeight")
            and definition.dimensions.lidHeight is not None
        ):
            return definition.dimensions.lidHeight
        else:
            raise errors.WrongModuleTypeError(
                f"Cannot get lid height of {definition.moduleType}"
            )

    @staticmethod
    def get_magnet_home_to_base_offset(module_model: ModuleModel) -> float:
        """Return a Magnetic Module's home offset.

        This is how far a Magnetic Module's magnets have to rise above their
        home position for their tops to be level with the bottom of the labware.

        The offset is returned in true millimeters,
        even though GEN1 Magnetic Modules are sometimes controlled in units of
        half-millimeters ("short mm").
        """
        if module_model == ModuleModel.MAGNETIC_MODULE_V1:
            offset_in_half_mm = MAGNETIC_MODULE_OFFSET_TO_LABWARE_BOTTOM[
                "magneticModuleV1"
            ]
            return offset_in_half_mm / 2
        elif module_model == ModuleModel.MAGNETIC_MODULE_V2:
            return MAGNETIC_MODULE_OFFSET_TO_LABWARE_BOTTOM["magneticModuleV2"]
        else:
            raise errors.WrongModuleTypeError(
                f"Can't get magnet offset of {module_model}."
            )

    @overload
    @classmethod
    def calculate_magnet_height(
        cls,
        *,
        module_model: ModuleModel,
        height_from_home: float,
    ) -> float:
        pass

    @overload
    @classmethod
    def calculate_magnet_height(
        cls,
        *,
        module_model: ModuleModel,
        height_from_base: float,
    ) -> float:
        pass

    @overload
    @classmethod
    def calculate_magnet_height(
        cls,
        *,
        module_model: ModuleModel,
        labware_default_height: float,
        offset_from_labware_default: float,
    ) -> float:
        pass

    @classmethod
    def calculate_magnet_height(
        cls,
        *,
        module_model: ModuleModel,
        height_from_home: Optional[float] = None,
        height_from_base: Optional[float] = None,
        labware_default_height: Optional[float] = None,
        offset_from_labware_default: Optional[float] = None,
    ) -> float:
        """Normalize a Magnetic Module engage height to standard units.

        Args:
            module_model: What kind of Magnetic Module to calculate the height for.
            height_from_home: A distance above the magnets' home position,
                in millimeters.
            height_from_base: A distance above the labware base plane,
                in millimeters.
            labware_default_height: A distance above the labware base plane,
                in millimeters, from a labware definition.
            offset_from_labware_default: A distance from the
                ``labware_default_height`` argument, in hardware units.

        Negative values are allowed for all arguments, to move down instead of up.

        See the overload signatures for which combinations of parameters are allowed.

        Returns:
            The same height passed in, converted to be measured in
            millimeters above the module's labware base plane,
            suitable as input to a Magnetic Module engage Protocol Engine command.
        """
        if height_from_home is not None:
            home_to_base = cls.get_magnet_home_to_base_offset(module_model=module_model)
            return height_from_home - home_to_base

        elif height_from_base is not None:
            return height_from_base

        else:
            # Guaranteed statically by overload.
            assert labware_default_height is not None
            assert offset_from_labware_default is not None
            return labware_default_height + offset_from_labware_default

    def should_dodge_thermocycler(
        self,
        from_slot: Union[DeckSlotName, StagingSlotName],
        to_slot: Union[DeckSlotName, StagingSlotName],
    ) -> bool:
        """Decide if the requested path would cross the thermocycler, if installed.

        Returns True if we need to dodge, False otherwise.
        """
        all_mods = self.get_all()
        if any(ModuleModel.is_thermocycler_module_model(mod.model) for mod in all_mods):
            transit = (from_slot, to_slot)
            if transit in _THERMOCYCLER_SLOT_TRANSITS_TO_DODGE:
                return True
        return False

    def is_edge_move_unsafe(self, mount: MountType, target_slot: DeckSlotName) -> bool:
        """Check if the slot next to target contains a module to be avoided, depending on mount."""
        slot_int = target_slot.as_int()

        if mount is MountType.RIGHT:
            # Check left of the target
            neighbor_int = get_west_slot(slot_int)
            if neighbor_int is None:
                return False
            else:
                neighbor_slot = DeckSlotName.from_primitive(neighbor_int)
        else:
            # Check right of the target
            neighbor_int = get_east_slot(slot_int)
            if neighbor_int is None:
                return False
            else:
                neighbor_slot = DeckSlotName.from_primitive(neighbor_int)

        return neighbor_slot in self._state.slot_by_module_id.values()

    def select_hardware_module_to_load(  # noqa: C901
        self,
        model: ModuleModel,
        location: DeckSlotLocation,
        attached_modules: Sequence[HardwareModule],
        expected_serial_number: Optional[str] = None,
    ) -> HardwareModule:
        """Get the next matching hardware module for the given model and location.

        If a "matching" model is found already loaded in state at the requested
        location, that hardware module will be "reused" and selected. This behavior
        allows multiple load module commands to be issued while always preserving
        module hardware instance to deck slot mapping, which is required for
        multiples-of-a-module functionality.

        Args:
            model: The requested module model. The selected module may have a
                different model if the definition lists the model as compatible.
            location: The location the module will be assigned to.
            attached_modules: All attached modules as reported by the HardwareAPI,
                in the order in which they should be used.
            expected_serial_number: An optional variable containing the serial number
                expected of the module identified.

        Raises:
            ModuleNotAttachedError: A not-yet-assigned module matching the requested
                parameters could not be found in the attached modules list.
            ModuleAlreadyPresentError: A module of a different type is already
                assigned to the requested location.
        """
        existing_mod_in_slot = None

        for mod_id, slot in self._state.slot_by_module_id.items():
            if slot == location.slotName:
                existing_mod_in_slot = self._state.hardware_by_module_id.get(mod_id)
                break
        if existing_mod_in_slot:
            existing_def = existing_mod_in_slot.definition

            if existing_def.model == model or model in existing_def.compatibleWith:
                return existing_mod_in_slot

            else:
                raise errors.ModuleAlreadyPresentError(
                    f"A {existing_def.model.value} is already"
                    f" present in {location.slotName.value}"
                )

        for m in attached_modules:
            if m not in self._state.hardware_by_module_id.values():
                if model == m.definition.model or model in m.definition.compatibleWith:
                    if expected_serial_number is not None:
                        if m.serial_number == expected_serial_number:
                            return m
                    else:
                        return m

        raise errors.ModuleNotAttachedError(f"No available {model.value} found.")

    def get_heater_shaker_movement_restrictors(
        self,
    ) -> List[HeaterShakerMovementRestrictors]:
        """Get shaking status, latch status, and location for every heater-shaker on deck."""
        hs_substates = [
            self.get_heater_shaker_module_substate(module_id=module.id)
            for module in self.get_all()
            if module.model == ModuleModel.HEATER_SHAKER_MODULE_V1
        ]
        hs_restrictors = [
            HeaterShakerMovementRestrictors(
                plate_shaking=substate.is_plate_shaking,
                latch_status=substate.labware_latch_status,
                deck_slot=self.get_location(substate.module_id).slotName.as_int(),
            )
            for substate in hs_substates
        ]
        return hs_restrictors

    def raise_if_module_in_location(
        self,
        location: DeckSlotLocation,
    ) -> None:
        """Raise if the given location has a module in it."""
        for module in self.get_all():
            if module.location == location:
                raise errors.LocationIsOccupiedError(
                    f"Module {module.model} is already present at {location}."
                )

    def get_default_gripper_offsets(
        self, module_id: str
    ) -> Optional[LabwareMovementOffsetData]:
        """Get the deck's default gripper offsets."""
        offsets = self.get_definition(module_id).gripperOffsets
        return offsets.get("default") if offsets else None

    def get_overflowed_module_in_slot(
        self, slot_name: DeckSlotName
    ) -> Optional[LoadedModule]:
        """Get the module that's not loaded in the given slot, but still occupies the slot.

        For example, if there's a thermocycler loaded in B1,
        `get_overflowed_module_in_slot(DeckSlotName.Slot_A1)` will return the loaded
        thermocycler module.
        """
        slots_by_id = self._state.additional_slots_occupied_by_module_id

        for module_id, module_slots in slots_by_id.items():
            if module_slots and slot_name in module_slots:
                return self.get(module_id)

        return None

    def is_flex_deck_with_thermocycler(self) -> bool:
        """Return if this is a Flex deck with a thermocycler loaded in B1-A1 slots."""
        maybe_module = self.get_by_slot(
            DeckSlotName.SLOT_A1
        ) or self.get_overflowed_module_in_slot(DeckSlotName.SLOT_A1)
        if (
            self._state.deck_type == DeckType.OT3_STANDARD
            and maybe_module
            and maybe_module.model == ModuleModel.THERMOCYCLER_MODULE_V2
        ):
            return True
        else:
            return False

    def convert_absorbance_reader_data_points(
        self, data: List[float]
    ) -> Dict[str, float]:
        """Return the data from the Absorbance Reader module in a map of wells for each read value."""
        if len(data) == 96:
            # We have to reverse the reader values because the Opentrons Absorbance Reader is rotated 180 degrees on the deck
            data.reverse()
            well_map: Dict[str, float] = {}
            for i, value in enumerate(data):
                row = chr(ord("A") + i // 12)  # Convert index to row (A-H)
                col = (i % 12) + 1  # Convert index to column (1-12)
                well_key = f"{row}{col}"
                truncated_value = float(
                    "{:.5}".format(str(value))
                )  # Truncate the returned value to the third decimal place
                well_map[well_key] = truncated_value
            return well_map
        else:
            raise ValueError(
                "Only readings of 96 Well labware are supported for conversion to map of values by well."
            )

    def ensure_and_convert_module_fixture_location(
        self,
        deck_slot: DeckSlotName,
        model: ModuleModel,
    ) -> str:
        """Ensure module fixture load location is valid.

        Also, convert the deck slot to a valid module fixture addressable area.
        """
        deck_type = self._state.deck_type

        if deck_type == DeckType.OT2_STANDARD or deck_type == DeckType.OT2_SHORT_TRASH:
            raise ValueError(
                f"Invalid Deck Type: {deck_type.name} - Does not support modules as fixtures."
            )

        assert deck_slot in DeckSlotName.ot3_slots()
        if model == ModuleModel.MAGNETIC_BLOCK_V1:
            return f"magneticBlockV1{deck_slot.value}"

        elif model == ModuleModel.HEATER_SHAKER_MODULE_V1:
            # only allowed in column 1 & 3
            assert deck_slot.value[-1] in ("1", "3")
            return f"heaterShakerV1{deck_slot.value}"

        elif model == ModuleModel.TEMPERATURE_MODULE_V2:
            # only allowed in column 1 & 3
            assert deck_slot.value[-1] in ("1", "3")
            return f"temperatureModuleV2{deck_slot.value}"

        elif model == ModuleModel.THERMOCYCLER_MODULE_V2:
            return "thermocyclerModuleV2"

        elif model == ModuleModel.ABSORBANCE_READER_V1:
            # only allowed in column 3
            assert deck_slot.value[-1] == "3"
            return f"absorbanceReaderV1{deck_slot.value}"

        raise ValueError(
            f"Unknown module {model.name} has no addressable areas to provide."
        )

    def absorbance_reader_dock_location(
        self, module_id: str
    ) -> AddressableAreaLocation:
        """Get the addressable area for the absorbance reader dock."""
        reader_slot = self.get_location(module_id)
        lid_doc_slot = get_adjacent_staging_slot(reader_slot.slotName)
        assert lid_doc_slot is not None
        lid_dock_area = AddressableAreaLocation(
            addressableAreaName="absorbanceReaderV1LidDock" + lid_doc_slot.value
        )
        return lid_dock_area
