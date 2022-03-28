"""Basic modules data state and store."""


from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, NamedTuple, NewType, Optional, Sequence, overload
from typing_extensions import Final
from numpy import array, dot

from opentrons.hardware_control.modules.magdeck import (
    engage_height_is_in_range,
    OFFSET_TO_LABWARE_BOTTOM as MAGNETIC_MODULE_OFFSET_TO_LABWARE_BOTTOM,
    MAX_ENGAGE_HEIGHT as MAGNETIC_MODULE_MAX_ENGAGE_HEIGHT,
)
from opentrons.types import DeckSlotName

from ..types import (
    LoadedModule,
    ModuleModel,
    MagneticModuleModel,
    ModuleType,
    ModuleDefinition,
    DeckSlotLocation,
    ModuleDimensions,
    LabwareOffsetVector,
)
from .. import errors
from ..commands import Command, LoadModuleResult, heater_shaker
from ..actions import Action, UpdateCommandAction, AddModuleAction
from .abstract_store import HasState, HandlesActions


class SlotTransit(NamedTuple):
    """Class defining starting and ending slots in a pipette movement."""

    start: DeckSlotName
    end: DeckSlotName


_THERMOCYCLER_SLOT_TRANSITS_TO_DODGE = [
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
]


class SpeedRange(NamedTuple):
    """Class defining minimum and maximum allowed speeds for a shaking module."""

    min: int
    max: int


class TemperatureRange(NamedTuple):
    """Class defining minimum and maximum allowed temperatures for a heating module."""

    min: float
    max: float


# TODO (spp, 2022-03-22): Move these values to heater-shaker module definition.
HEATER_SHAKER_TEMPERATURE_RANGE = TemperatureRange(min=37, max=95)
HEATER_SHAKER_SPEED_RANGE = SpeedRange(min=200, max=3000)


@dataclass(frozen=True)
class HardwareModule:
    """Data describing an actually connected module."""

    serial_number: str
    definition: ModuleDefinition
    plate_target_temperature: Optional[float] = None


@dataclass
class ModuleState:
    """Basic module data state and getter methods."""

    slot_by_module_id: Dict[str, Optional[DeckSlotName]]
    hardware_by_module_id: Dict[str, HardwareModule]


class ModuleStore(HasState[ModuleState], HandlesActions):
    """Module state container."""

    _state: ModuleState

    def __init__(self) -> None:
        """Initialize a ModuleStore and its state."""
        self._state = ModuleState(slot_by_module_id={}, hardware_by_module_id={})

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        if isinstance(action, UpdateCommandAction):
            self._handle_command(action.command)

        elif isinstance(action, AddModuleAction):
            self._state.slot_by_module_id[action.module_id] = None
            self._state.hardware_by_module_id[action.module_id] = HardwareModule(
                serial_number=action.serial_number,
                definition=action.definition,
            )

    def _handle_command(self, command: Command) -> None:
        if isinstance(command.result, LoadModuleResult):
            module_id = command.result.moduleId
            serial_number = command.result.serialNumber
            definition = command.result.definition
            slot_name = command.params.location.slotName

            self._state.slot_by_module_id[module_id] = slot_name
            self._state.hardware_by_module_id[module_id] = HardwareModule(
                serial_number=serial_number,
                definition=definition,
            )

        if isinstance(
            command.result,
            (
                heater_shaker.StartSetTargetTemperatureResult,
                heater_shaker.DeactivateHeaterResult,
            ),
        ):
            module_id = command.params.moduleId
            hardware_module = self._state.hardware_by_module_id[module_id]

            if isinstance(
                command.result, heater_shaker.StartSetTargetTemperatureResult
            ):
                self._state.hardware_by_module_id[module_id] = HardwareModule(
                    serial_number=hardware_module.serial_number,
                    definition=hardware_module.definition,
                    plate_target_temperature=command.params.temperature,
                )
            elif isinstance(command.result, heater_shaker.DeactivateHeaterResult):
                self._state.hardware_by_module_id[module_id] = HardwareModule(
                    serial_number=hardware_module.serial_number,
                    definition=hardware_module.definition,
                    plate_target_temperature=None,
                )


class ModuleView(HasState[ModuleState]):
    """Read-only view of computed module state."""

    _state: ModuleState

    def __init__(self, state: ModuleState, virtualize_modules: bool) -> None:
        """Initialize the view with its backing state value."""
        self._state = state

    def get(self, module_id: str) -> LoadedModule:
        """Get module data by the module's unique identifier."""
        try:
            slot_name = self._state.slot_by_module_id[module_id]
            attached_module = self._state.hardware_by_module_id[module_id]

        except KeyError as e:
            raise errors.ModuleNotLoadedError(f"Module {module_id} not found.") from e

        location = (
            DeckSlotLocation(slotName=slot_name) if slot_name is not None else None
        )

        return LoadedModule.construct(
            id=module_id,
            location=location,
            model=attached_module.definition.model,
            serialNumber=attached_module.serial_number,
            definition=attached_module.definition,
        )

    def get_all(self) -> List[LoadedModule]:
        """Get a list of all module entries in state."""
        return [self.get(mod_id) for mod_id in self._state.slot_by_module_id.keys()]

    def get_magnetic_module_view(self, module_id: str) -> MagneticModuleView:
        """Return a `MagneticModuleView` for the given Magnetic Module.

        Raises:
            ModuleNotLoadedError: If module_id has not been loaded.
            WrongModuleTypeError: If module_id has been loaded,
                but it's not a Magnetic Module.
        """
        model = self.get_model(module_id=module_id)  # Propagate ModuleNotLoadedError
        if ModuleModel.is_magnetic_module_model(model):
            return MagneticModuleView(module_id=module_id, model=model)
        else:
            raise errors.WrongModuleTypeError(
                f"{module_id} is a {model}, not a Magnetic Module."
            )

    def get_heater_shaker_module_view(self, module_id: str) -> HeaterShakerModuleView:
        """Return a `HeaterShakerModuleView` for the given Heater-Shaker Module.

        Raises:
           ModuleNotLoadedError: If module_id has not been loaded.
           WrongModuleTypeError: If module_id has been loaded,
               but it's not a Heater-Shaker Module.
        """
        model = self.get_model(module_id=module_id)  # Propagate ModuleNotLoadedError
        if ModuleModel.is_heater_shaker_module_model(model):
            return HeaterShakerModuleView(module_id=module_id)
        else:
            raise errors.WrongModuleTypeError(
                f"{module_id} is a {model}, not a Heater-Shaker Module."
            )

    # TODO(mc, 2022-03-28): move to heater shaker view
    def get_plate_target_temperature(self, module_id: str) -> float:
        """Get the module's target plate temperature."""
        try:
            target = self._state.hardware_by_module_id[
                module_id
            ].plate_target_temperature
        except KeyError as e:
            raise errors.ModuleNotLoadedError(f"Module {module_id} not found.") from e

        if target is None:
            raise errors.NoTargetTemperatureSetError(
                f"Module {module_id} does not have a target temperature set."
            )

        return target

    def get_location(self, module_id: str) -> DeckSlotLocation:
        """Get the slot location of the given module."""
        location = self.get(module_id).location
        if location is None:
            raise errors.ModuleNotOnDeckError(
                f"Module {module_id} is not loaded into a deck slot."
            )
        return location

    def get_model(self, module_id: str) -> ModuleModel:
        """Get the model name of the given module."""
        return self.get(module_id).model

    def get_serial_number(self, module_id: str) -> str:
        """Get the hardware serial number of the given module.

        If the underlying hardware API is simulating, this will be a dummy value
        provided by the hardware API.
        """
        return self.get(module_id).serialNumber

    def get_definition(self, module_id: str) -> ModuleDefinition:
        """Module definition by ID."""
        return self.get(module_id).definition

    def get_dimensions(self, module_id: str) -> ModuleDimensions:
        """Get the specified module's dimensions."""
        return self.get(module_id).definition.dimensions

    # TODO(mc, 2022-01-19): this method is missing unit test coverage
    def get_module_offset(self, module_id: str) -> LabwareOffsetVector:
        """Get the module's offset vector computed with slot transform."""
        definition = self.get_definition(module_id)
        slot = self.get_location(module_id).slotName.value
        pre_transform = array(
            (definition.labwareOffset.x, definition.labwareOffset.y, 1)
        )
        xforms_ser = definition.slotTransforms.get("ot2_standard", {}).get(
            slot, {"labwareOffset": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}
        )
        xforms_ser = xforms_ser["labwareOffset"]

        # Apply the slot transform, if any
        xform = array(xforms_ser)
        xformed = dot(xform, pre_transform)  # type: ignore[no-untyped-call]
        return LabwareOffsetVector(
            x=xformed[0],
            y=xformed[1],
            z=definition.labwareOffset.z,
        )

    # TODO(mc, 2022-01-19): this method is missing unit test coverage and
    # is also unused. Remove or add tests.
    def get_overall_height(self, module_id: str) -> float:
        """Get the height of the module."""
        return self.get_dimensions(module_id).bareOverallHeight

    # TODO(mc, 2022-01-19): this method is missing unit test coverage
    def get_height_over_labware(self, module_id: str) -> float:
        """Get the height of module parts above module labware base."""
        return self.get_dimensions(module_id).overLabwareHeight

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
        from_slot: DeckSlotName,
        to_slot: DeckSlotName,
    ) -> bool:
        """Decide if the requested path would cross the thermocycler, if installed.

        Returns True if we need to dodge, False otherwise.
        """
        all_mods = self.get_all()
        if all_mods and ModuleModel.THERMOCYCLER_MODULE_V1 in [
            mod.model for mod in all_mods
        ]:
            transit = (from_slot, to_slot)
            if transit in _THERMOCYCLER_SLOT_TRANSITS_TO_DODGE:
                return True
        return False

    def select_hardware_module_to_load(
        self,
        model: ModuleModel,
        location: DeckSlotLocation,
        attached_modules: Sequence[HardwareModule],
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
                    return m

        raise errors.ModuleNotAttachedError(f"No available {model.value} found.")


MagneticModuleId = NewType("MagneticModuleId", str)


class MagneticModuleView:
    """A Magnetic Module view.

    Provides calculations and read-only state access
    for an individual loaded Magnetic Module.
    """

    def __init__(
        self,
        module_id: str,
        model: MagneticModuleModel,
    ) -> None:
        """Initialize the `MagneticModuleView`.

        Do not use this initializer directly, except in tests.
        Use `ModuleView.get_magnetic_module_view()` instead.
        """
        self.module_id: Final = MagneticModuleId(module_id)
        self.model: Final = model

    def calculate_magnet_hardware_height(self, mm_from_base: float) -> float:
        """Convert a human-friendly magnet height to be hardware-friendly.

        Args:
            mm_from_base: The height to convert. Measured in how far the tops
                of the magnets are above the labware base plane.

        Returns:
            The same height, with its units and origin point converted
            so that it's suitable to pass to `MagDeck.engage()`.

        Raises:
            EngageHeightOutOfRangeError: If modules of the given model are
                physically incapable of reaching the requested height.
        """
        hardware_units_from_base = (
            mm_from_base * 2
            if self.model == ModuleModel.MAGNETIC_MODULE_V1
            else mm_from_base
        )
        home_to_base_offset = MAGNETIC_MODULE_OFFSET_TO_LABWARE_BOTTOM[self.model]
        hardware_units_from_home = home_to_base_offset + hardware_units_from_base

        if not engage_height_is_in_range(
            model=self.model,
            height=hardware_units_from_home,
        ):
            # TODO(mm, 2022-03-02): This error message probably will not match how
            # the user specified the height. (Hardware units versus mm,
            # home as origin versus labware base as origin.) This may be confusing
            # depending on how it propagates up.
            raise errors.EngageHeightOutOfRangeError(
                f"Invalid engage height for {self.model}:"
                f" {hardware_units_from_home}. Must be"
                f" 0 - {MAGNETIC_MODULE_MAX_ENGAGE_HEIGHT[self.model]}."
            )

        return hardware_units_from_home


HeaterShakerModuleId = NewType("HeaterShakerModuleId", str)


class HeaterShakerModuleView:
    """A Heater-Shaker Module view.

    Provides calculations and read-only state access
    for an individual loaded Heater-Shaker Module.
    """

    def __init__(self, module_id: str) -> None:
        """Initialize the `HeaterShakerModuleView`.

        Do not use this initializer directly, except in tests.
        Use `ModuleView.get_heater_shaker_module_view()` instead.
        """
        self.module_id: Final = HeaterShakerModuleId(module_id)

    @staticmethod
    def validate_target_temperature(celsius: float) -> float:
        """Verify that the target temperature being set is valid for heater-shaker."""
        if (
            HEATER_SHAKER_TEMPERATURE_RANGE.min
            <= celsius
            <= HEATER_SHAKER_TEMPERATURE_RANGE.max
        ):
            return celsius
        else:
            raise errors.InvalidTargetTemperatureError(
                f"Heater-Shaker got an invalid temperature {celsius} degree Celsius."
                f"Valid range is {HEATER_SHAKER_TEMPERATURE_RANGE}."
            )

    @staticmethod
    def validate_target_speed(rpm: float) -> int:
        """Verify that the target speed is valid for heater-shaker & convert to int."""
        rpm_int = int(round(rpm, 0))
        if HEATER_SHAKER_SPEED_RANGE.min <= rpm <= HEATER_SHAKER_SPEED_RANGE.max:
            return rpm_int
        else:
            raise errors.InvalidTargetSpeedError(
                f"Heater-Shaker got invalid speed of {rpm}RPM. Valid range is "
                f"{HEATER_SHAKER_SPEED_RANGE}."
            )
