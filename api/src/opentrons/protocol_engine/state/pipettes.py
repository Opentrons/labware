"""Basic pipette data state and store."""

from __future__ import annotations

import dataclasses
from logging import getLogger
from typing import (
    Dict,
    List,
    Mapping,
    Optional,
    Tuple,
    cast,
)

from typing_extensions import assert_never

from opentrons_shared_data.pipette import pipette_definition
from opentrons_shared_data.pipette.ul_per_mm import calculate_ul_per_mm
from opentrons_shared_data.pipette.types import UlPerMmAction

from opentrons.config.defaults_ot2 import Z_RETRACT_DISTANCE
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control import CriticalPoint
from opentrons.hardware_control.nozzle_manager import (
    NozzleMap,
)
from opentrons.types import MountType, Mount as HwMount, Point, NozzleConfigurationType

from . import update_types, fluid_stack
from .. import errors
from ..types import (
    LoadedPipette,
    MotorAxis,
    FlowRates,
    DeckPoint,
    CurrentWell,
    CurrentAddressableArea,
    CurrentPipetteLocation,
    TipGeometry,
)
from ..actions import (
    Action,
    SetPipetteMovementSpeedAction,
    get_state_updates,
)
from ._abstract_store import HasState, HandlesActions

LOG = getLogger(__name__)


@dataclasses.dataclass(frozen=True)
class HardwarePipette:
    """Hardware pipette data."""

    mount: HwMount
    config: PipetteDict


@dataclasses.dataclass(frozen=True)
class CurrentDeckPoint:
    """The latest deck point and mount the robot has accessed."""

    mount: Optional[MountType]
    deck_point: Optional[DeckPoint]


@dataclasses.dataclass(frozen=True)
class BoundingNozzlesOffsets:
    """Offsets of the bounding nozzles of the pipette."""

    back_left_offset: Point
    front_right_offset: Point


@dataclasses.dataclass(frozen=True)
class PipetteBoundingBoxOffsets:
    """Offsets of the corners of the pipette's bounding box."""

    back_left_corner: Point
    front_right_corner: Point
    back_right_corner: Point
    front_left_corner: Point


@dataclasses.dataclass(frozen=True)
class StaticPipetteConfig:
    """Static config for a pipette."""

    model: str
    serial_number: str
    display_name: str
    min_volume: float
    max_volume: float
    channels: int
    tip_configuration_lookup_table: Dict[
        float, pipette_definition.SupportedTipsDefinition
    ]
    nominal_tip_overlap: Dict[str, float]
    home_position: float
    nozzle_offset_z: float
    pipette_bounding_box_offsets: PipetteBoundingBoxOffsets
    bounding_nozzle_offsets: BoundingNozzlesOffsets
    default_nozzle_map: NozzleMap  # todo(mm, 2024-10-14): unused, remove?
    lld_settings: Optional[Dict[str, Dict[str, float]]]
    plunger_positions: Dict[str, float]
    shaft_ul_per_mm: float
    available_sensors: pipette_definition.AvailableSensorDefinition


@dataclasses.dataclass
class PipetteState:
    """Basic pipette data state and getter methods."""

    # todo(mm, 2024-10-14): It's getting difficult to ensure that all of these
    # attributes are populated at the appropriate times. Refactor to a
    # single dict-of-many-things instead of many dicts-of-single-things.
    pipettes_by_id: Dict[str, LoadedPipette]
    pipette_contents_by_id: Dict[str, Optional[fluid_stack.FluidStack]]
    current_location: Optional[CurrentPipetteLocation]
    current_deck_point: CurrentDeckPoint
    attached_tip_by_id: Dict[str, Optional[TipGeometry]]
    movement_speed_by_id: Dict[str, Optional[float]]
    static_config_by_id: Dict[str, StaticPipetteConfig]
    flow_rates_by_id: Dict[str, FlowRates]
    nozzle_configuration_by_id: Dict[str, NozzleMap]
    liquid_presence_detection_by_id: Dict[str, bool]


class PipetteStore(HasState[PipetteState], HandlesActions):
    """Pipette state container."""

    _state: PipetteState

    def __init__(self) -> None:
        """Initialize a PipetteStore and its state."""
        self._state = PipetteState(
            pipettes_by_id={},
            pipette_contents_by_id={},
            attached_tip_by_id={},
            current_location=None,
            current_deck_point=CurrentDeckPoint(mount=None, deck_point=None),
            movement_speed_by_id={},
            static_config_by_id={},
            flow_rates_by_id={},
            nozzle_configuration_by_id={},
            liquid_presence_detection_by_id={},
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            self._set_load_pipette(state_update)
            self._update_current_location(state_update)
            self._update_pipette_config(state_update)
            self._update_pipette_nozzle_map(state_update)
            self._update_tip_state(state_update)
            self._update_volumes(state_update)

        if isinstance(action, SetPipetteMovementSpeedAction):
            self._state.movement_speed_by_id[action.pipette_id] = action.speed

    def _set_load_pipette(self, state_update: update_types.StateUpdate) -> None:
        if state_update.loaded_pipette != update_types.NO_CHANGE:
            pipette_id = state_update.loaded_pipette.pipette_id

            self._state.pipettes_by_id[pipette_id] = LoadedPipette(
                id=pipette_id,
                pipetteName=state_update.loaded_pipette.pipette_name,
                mount=state_update.loaded_pipette.mount,
            )
            self._state.liquid_presence_detection_by_id[pipette_id] = (
                state_update.loaded_pipette.liquid_presence_detection or False
            )
            self._state.movement_speed_by_id[pipette_id] = None
            self._state.attached_tip_by_id[pipette_id] = None

    def _update_tip_state(self, state_update: update_types.StateUpdate) -> None:
        if state_update.pipette_tip_state != update_types.NO_CHANGE:
            pipette_id = state_update.pipette_tip_state.pipette_id
            if state_update.pipette_tip_state.tip_geometry:
                attached_tip = state_update.pipette_tip_state.tip_geometry

                self._state.attached_tip_by_id[pipette_id] = attached_tip

                static_config = self._state.static_config_by_id.get(pipette_id)
                if static_config:
                    try:
                        tip_configuration = (
                            static_config.tip_configuration_lookup_table[
                                attached_tip.volume
                            ]
                        )
                    except KeyError:
                        # TODO(seth,9/11/2023): this is a bad way of doing defaults but better than max volume.
                        # we used to look up a default tip config via the pipette max volume, but if that isn't
                        # tip volume (as it isn't when we're in low-volume mode) then that lookup fails. Using
                        # the first entry in the table is ok I guess but we really need to generally rethink how
                        # we identify tip classes - looking things up by volume is not enough.
                        tip_configuration = list(
                            static_config.tip_configuration_lookup_table.values()
                        )[0]
                    self._state.flow_rates_by_id[pipette_id] = FlowRates(
                        default_blow_out=tip_configuration.default_blowout_flowrate.values_by_api_level,
                        default_aspirate=tip_configuration.default_aspirate_flowrate.values_by_api_level,
                        default_dispense=tip_configuration.default_dispense_flowrate.values_by_api_level,
                    )

            else:
                pipette_id = state_update.pipette_tip_state.pipette_id
                self._state.attached_tip_by_id[pipette_id] = None

                static_config = self._state.static_config_by_id.get(pipette_id)
                if static_config:
                    # TODO(seth,9/11/2023): bad way to do defaulting, see above.
                    tip_configuration = list(
                        static_config.tip_configuration_lookup_table.values()
                    )[0]
                    self._state.flow_rates_by_id[pipette_id] = FlowRates(
                        default_blow_out=tip_configuration.default_blowout_flowrate.values_by_api_level,
                        default_aspirate=tip_configuration.default_aspirate_flowrate.values_by_api_level,
                        default_dispense=tip_configuration.default_dispense_flowrate.values_by_api_level,
                    )

    def _update_current_location(self, state_update: update_types.StateUpdate) -> None:
        location_update = state_update.pipette_location

        if location_update is update_types.NO_CHANGE:
            pass
        elif location_update is update_types.CLEAR:
            self._state.current_location = None
            self._state.current_deck_point = CurrentDeckPoint(
                mount=None, deck_point=None
            )
        else:
            new_logical_location = location_update.new_location
            new_deck_point = location_update.new_deck_point
            match new_logical_location:
                case update_types.Well(labware_id=labware_id, well_name=well_name):
                    self._state.current_location = CurrentWell(
                        pipette_id=location_update.pipette_id,
                        labware_id=labware_id,
                        well_name=well_name,
                    )
                case update_types.AddressableArea(
                    addressable_area_name=addressable_area_name
                ):
                    self._state.current_location = CurrentAddressableArea(
                        pipette_id=location_update.pipette_id,
                        addressable_area_name=addressable_area_name,
                    )
                case None:
                    self._state.current_location = None
                case update_types.NO_CHANGE:
                    pass
            if new_deck_point is not update_types.NO_CHANGE:
                loaded_pipette = self._state.pipettes_by_id[location_update.pipette_id]
                self._state.current_deck_point = CurrentDeckPoint(
                    mount=loaded_pipette.mount, deck_point=new_deck_point
                )

    def _update_pipette_config(self, state_update: update_types.StateUpdate) -> None:
        if state_update.pipette_config != update_types.NO_CHANGE:
            config = state_update.pipette_config.config
            self._state.static_config_by_id[
                state_update.pipette_config.pipette_id
            ] = StaticPipetteConfig(
                serial_number=state_update.pipette_config.serial_number,
                model=config.model,
                display_name=config.display_name,
                min_volume=config.min_volume,
                max_volume=config.max_volume,
                channels=config.channels,
                tip_configuration_lookup_table=config.tip_configuration_lookup_table,
                nominal_tip_overlap=config.nominal_tip_overlap,
                home_position=config.home_position,
                nozzle_offset_z=config.nozzle_offset_z,
                pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                    back_left_corner=config.back_left_corner_offset,
                    front_right_corner=config.front_right_corner_offset,
                    back_right_corner=Point(
                        config.front_right_corner_offset.x,
                        config.back_left_corner_offset.y,
                        config.back_left_corner_offset.z,
                    ),
                    front_left_corner=Point(
                        config.back_left_corner_offset.x,
                        config.front_right_corner_offset.y,
                        config.back_left_corner_offset.z,
                    ),
                ),
                bounding_nozzle_offsets=BoundingNozzlesOffsets(
                    back_left_offset=config.nozzle_map.back_left_nozzle_offset,
                    front_right_offset=config.nozzle_map.front_right_nozzle_offset,
                ),
                default_nozzle_map=config.nozzle_map,
                lld_settings=config.pipette_lld_settings,
                plunger_positions=config.plunger_positions,
                shaft_ul_per_mm=config.shaft_ul_per_mm,
                available_sensors=config.available_sensors,
            )
            self._state.flow_rates_by_id[
                state_update.pipette_config.pipette_id
            ] = config.flow_rates
            self._state.nozzle_configuration_by_id[
                state_update.pipette_config.pipette_id
            ] = config.nozzle_map

    def _update_pipette_nozzle_map(
        self, state_update: update_types.StateUpdate
    ) -> None:
        if state_update.pipette_nozzle_map != update_types.NO_CHANGE:
            self._state.nozzle_configuration_by_id[
                state_update.pipette_nozzle_map.pipette_id
            ] = state_update.pipette_nozzle_map.nozzle_map

    def _update_volumes(self, state_update: update_types.StateUpdate) -> None:
        if state_update.pipette_aspirated_fluid == update_types.NO_CHANGE:
            return
        if state_update.pipette_aspirated_fluid.type == "aspirated":
            self._update_aspirated(state_update.pipette_aspirated_fluid)
        elif state_update.pipette_aspirated_fluid.type == "ejected":
            self._update_ejected(state_update.pipette_aspirated_fluid)
        elif state_update.pipette_aspirated_fluid.type == "empty":
            self._update_empty(state_update.pipette_aspirated_fluid)
        elif state_update.pipette_aspirated_fluid.type == "unknown":
            self._update_unknown(state_update.pipette_aspirated_fluid)
        else:
            assert_never(state_update.pipette_aspirated_fluid.type)

    def _update_aspirated(
        self, update: update_types.PipetteAspiratedFluidUpdate
    ) -> None:
        self._fluid_stack_log_if_empty(update.pipette_id).add_fluid(update.fluid)

    def _update_ejected(self, update: update_types.PipetteEjectedFluidUpdate) -> None:
        self._fluid_stack_log_if_empty(update.pipette_id).remove_fluid(update.volume)

    def _update_empty(self, update: update_types.PipetteEmptyFluidUpdate) -> None:
        self._state.pipette_contents_by_id[update.pipette_id] = fluid_stack.FluidStack()

    def _update_unknown(self, update: update_types.PipetteUnknownFluidUpdate) -> None:
        self._state.pipette_contents_by_id[update.pipette_id] = None

    def _fluid_stack_log_if_empty(self, pipette_id: str) -> fluid_stack.FluidStack:
        stack = self._state.pipette_contents_by_id[pipette_id]
        if stack is None:
            LOG.error("Pipette state tried to alter an unknown-contents pipette")
            return fluid_stack.FluidStack()
        return stack


class PipetteView:
    """Read-only view of computed pipettes state."""

    _state: PipetteState

    def __init__(self, state: PipetteState) -> None:
        """Initialize the view with its backing state value."""
        self._state = state

    def get(self, pipette_id: str) -> LoadedPipette:
        """Get pipette data by the pipette's unique identifier."""
        try:
            return self._state.pipettes_by_id[pipette_id]
        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found."
            ) from e

    def get_mount(self, pipette_id: str) -> MountType:
        """Get the pipette's mount."""
        return self.get(pipette_id).mount

    def get_all(self) -> List[LoadedPipette]:
        """Get a list of all pipette entries in state."""
        return list(self._state.pipettes_by_id.values())

    def get_by_mount(self, mount: MountType) -> Optional[LoadedPipette]:
        """Get pipette data by the pipette's mount."""
        for pipette in self._state.pipettes_by_id.values():
            if pipette.mount == mount:
                return pipette
        return None

    def get_hardware_pipette(
        self,
        pipette_id: str,
        attached_pipettes: Mapping[HwMount, Optional[PipetteDict]],
    ) -> HardwarePipette:
        """Get a pipette's hardware configuration and state by ID."""
        pipette_data = self.get(pipette_id)
        pipette_name = pipette_data.pipetteName
        mount = pipette_data.mount

        hw_mount = mount.to_hw_mount()
        hw_config = attached_pipettes[hw_mount]

        # TODO(mc, 2022-01-11): HW controller may return an empty dict for
        # no pipette attached instead of `None`. Update when fixed in HWAPI
        if not hw_config:
            raise errors.PipetteNotAttachedError(f"No pipette attached on {mount}")

        elif (
            hw_config["name"] != pipette_name
            and pipette_name not in hw_config["back_compat_names"]
        ):
            raise errors.PipetteNotAttachedError(
                f"Found {hw_config['name']} on {mount}, "
                f"but {pipette_id} is a {pipette_name}"
            )

        return HardwarePipette(mount=hw_mount, config=hw_config)

    def get_current_location(self) -> Optional[CurrentPipetteLocation]:
        """Get the last accessed location and which pipette accessed it."""
        return self._state.current_location

    def get_deck_point(self, pipette_id: str) -> Optional[DeckPoint]:
        """Get the deck point of a pipette by ID, or None if it was not associated with the last move operation."""
        loaded_pipette = self.get(pipette_id)
        current_deck_point = self._state.current_deck_point
        if loaded_pipette.mount == current_deck_point.mount:
            return current_deck_point.deck_point
        return None

    def get_attached_tip(self, pipette_id: str) -> Optional[TipGeometry]:
        """Get details of the pipette's attached tip.

        Returns:
            The tip's volume and length, or None if there is no tip attached,
        """
        try:
            return self._state.attached_tip_by_id[pipette_id]
        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} no found; unable to get attached tip."
            ) from e

    def get_all_attached_tips(self) -> List[Tuple[str, TipGeometry]]:
        """Get a list of all attached tips.

        Returns:
            A list of pipette ID, tip details tuples.
        """
        return [
            (pipette_id, tip)
            for pipette_id, tip in self._state.attached_tip_by_id.items()
            if tip is not None
        ]

    def get_aspirated_volume(self, pipette_id: str) -> Optional[float]:
        """Get the currently aspirated volume of a pipette by ID.

        This is the volume currently displaced by the plunger relative to its bottom position,
        regardless of whether that volume likely contains liquid or air. This makes it the right
        function to call to know how much more volume the plunger may displace.

        Returns:
            The volume the pipette has aspirated.
            None, after blow-out and the plunger is in an unsafe position.

        Raises:
            PipetteNotLoadedError: pipette ID does not exist.
            TipNotAttachedError: if no tip is attached to the pipette.
        """
        self.validate_tip_state(pipette_id, True)

        try:
            stack = self._state.pipette_contents_by_id[pipette_id]
            if stack is None:
                return None
            return stack.aspirated_volume()

        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found; unable to get current volume."
            ) from e

    def get_liquid_dispensed_by_ejecting_volume(
        self, pipette_id: str, volume: float
    ) -> Optional[float]:
        """Get the amount of liquid (not air) that will be dispensed if the pipette ejects a specified volume.

        For instance, if the pipette contains, in vertical order,
        10 ul air
        80 ul liquid
        5 ul air

        then dispensing 10ul would result in 5ul of liquid; dispensing 85 ul would result in 80ul liquid; dispensing
        95ul would result in 80ul liquid.

        Returns:
            The volume of liquid that would be dispensed by the requested volume.
            None, after blow-out or when the plunger is in an unsafe position.

        Raises:
            PipetteNotLoadedError: pipette ID does not exist.
            TipnotAttachedError: No tip is attached to the pipette.
        """
        self.validate_tip_state(pipette_id, True)

        try:
            stack = self._state.pipette_contents_by_id[pipette_id]
            if stack is None:
                return None
            return stack.liquid_part_of_dispense_volume(volume)

        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found; unable to get current liquid volume."
            ) from e

    def get_working_volume(self, pipette_id: str) -> float:
        """Get the working maximum volume of a pipette by ID.

        Raises:
            PipetteNotLoadedError: pipette ID does not exist.
            TipNotAttachedError: if no tip is attached to the pipette.
        """
        max_volume = self.get_maximum_volume(pipette_id)
        attached_tip = self.get_attached_tip(pipette_id)

        if not attached_tip:
            raise errors.TipNotAttachedError(
                f"Pipette {pipette_id} has no tip attached; unable to calculate working maximum volume."
            )

        return min(attached_tip.volume, max_volume)

    def get_available_volume(self, pipette_id: str) -> Optional[float]:
        """Get the available volume of a pipette by ID."""
        working_volume = self.get_working_volume(pipette_id)
        current_volume = self.get_aspirated_volume(pipette_id)

        return max(0.0, working_volume - current_volume) if current_volume else None

    def get_pipette_lld_settings(
        self, pipette_id: str
    ) -> Optional[Dict[str, Dict[str, float]]]:
        """Get the liquid level settings for all possible tips for a single pipette."""
        return self.get_config(pipette_id).lld_settings

    def get_current_tip_lld_settings(self, pipette_id: str) -> float:
        """Get the liquid level settings for pipette and its current tip."""
        attached_tip = self.get_attached_tip(pipette_id)
        if attached_tip is None or attached_tip.volume is None:
            return 0
        lld_settings = self.get_pipette_lld_settings(pipette_id)
        tipVolume = "t" + str(int(attached_tip.volume))
        if (
            lld_settings is None
            or lld_settings[tipVolume] is None
            or lld_settings[tipVolume]["minHeight"] is None
        ):
            return 0
        return float(lld_settings[tipVolume]["minHeight"])

    def validate_tip_state(self, pipette_id: str, expected_has_tip: bool) -> None:
        """Validate that a pipette's tip state matches expectations."""
        attached_tip = self.get_attached_tip(pipette_id)

        if expected_has_tip is True and attached_tip is None:
            raise errors.TipNotAttachedError(
                "Pipette should have a tip attached, but does not."
            )
        if expected_has_tip is False and attached_tip is not None:
            raise errors.TipAttachedError(
                "Pipette should not have a tip attached, but does."
            )

    def get_movement_speed(
        self, pipette_id: str, requested_speed: Optional[float] = None
    ) -> Optional[float]:
        """Return the given pipette's requested or current movement speed."""
        return requested_speed or self._state.movement_speed_by_id[pipette_id]

    def get_config(self, pipette_id: str) -> StaticPipetteConfig:
        """Get the static pipette configuration by pipette id."""
        try:
            return self._state.static_config_by_id[pipette_id]
        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found; unable to get pipette configuration."
            ) from e

    def get_model_name(self, pipette_id: str) -> str:
        """Return the given pipette's model name."""
        return self.get_config(pipette_id).model

    def get_display_name(self, pipette_id: str) -> str:
        """Return the given pipette's display name."""
        return self.get_config(pipette_id).display_name

    def get_serial_number(self, pipette_id: str) -> str:
        """Get the serial number of the pipette."""
        return self.get_config(pipette_id).serial_number

    def get_channels(self, pipette_id: str) -> int:
        """Return the max channels of the pipette."""
        return self.get_config(pipette_id).channels

    def get_minimum_volume(self, pipette_id: str) -> float:
        """Return the given pipette's minimum volume."""
        return self.get_config(pipette_id).min_volume

    def get_maximum_volume(self, pipette_id: str) -> float:
        """Return the given pipette's maximum volume."""
        return self.get_config(pipette_id).max_volume

    def get_instrument_max_height_ot2(self, pipette_id: str) -> float:
        """Get calculated max instrument height for an OT-2."""
        config = self.get_config(pipette_id)
        return config.home_position - Z_RETRACT_DISTANCE + config.nozzle_offset_z

    def get_return_tip_scale(self, pipette_id: str) -> float:
        """Return the given pipette's return tip height scale."""
        max_volume = self.get_maximum_volume(pipette_id)
        working_volume = max_volume
        tip = self.get_attached_tip(pipette_id)
        if tip:
            working_volume = tip.volume

        if working_volume in self.get_config(pipette_id).tip_configuration_lookup_table:
            tip_lookup = self.get_config(pipette_id).tip_configuration_lookup_table[
                working_volume
            ]
        else:
            tip_lookup = self.get_config(pipette_id).tip_configuration_lookup_table[
                max_volume
            ]
        return tip_lookup.default_return_tip_height

    def get_flow_rates(self, pipette_id: str) -> FlowRates:
        """Get the default flow rates for the pipette."""
        try:
            return self._state.flow_rates_by_id[pipette_id]
        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found; unable to get pipette flow rates."
            ) from e

    def get_nominal_tip_overlap(self, pipette_id: str, labware_uri: str) -> float:
        """Get the nominal tip overlap for a given labware from config."""
        tip_overlaps_by_uri = self.get_config(pipette_id).nominal_tip_overlap

        try:
            return tip_overlaps_by_uri[labware_uri]
        except KeyError:
            return tip_overlaps_by_uri.get("default", 0)

    def get_z_axis(self, pipette_id: str) -> MotorAxis:
        """Get the MotorAxis representing this pipette's Z stage."""
        mount = self.get(pipette_id).mount
        return MotorAxis.LEFT_Z if mount == MountType.LEFT else MotorAxis.RIGHT_Z

    def get_plunger_axis(self, pipette_id: str) -> MotorAxis:
        """Get the MotorAxis representing this pipette's plunger."""
        mount = self.get(pipette_id).mount
        return (
            MotorAxis.LEFT_PLUNGER
            if mount == MountType.LEFT
            else MotorAxis.RIGHT_PLUNGER
        )

    def get_nozzle_layout_type(self, pipette_id: str) -> NozzleConfigurationType:
        """Get the current set nozzle layout configuration."""
        nozzle_map_for_pipette = self._state.nozzle_configuration_by_id[pipette_id]
        return nozzle_map_for_pipette.configuration

    def get_is_partially_configured(self, pipette_id: str) -> bool:
        """Determine if the provided pipette is partially configured."""
        return self.get_nozzle_layout_type(pipette_id) != NozzleConfigurationType.FULL

    def get_primary_nozzle(self, pipette_id: str) -> str:
        """Get the primary nozzle, if any, related to the given pipette's nozzle configuration."""
        nozzle_map = self._state.nozzle_configuration_by_id[pipette_id]
        return nozzle_map.starting_nozzle

    def get_nozzle_configuration(self, pipette_id: str) -> NozzleMap:
        """Get the nozzle map of the pipette."""
        return self._state.nozzle_configuration_by_id[pipette_id]

    def _get_critical_point_offset_without_tip(
        self, pipette_id: str, critical_point: Optional[CriticalPoint]
    ) -> Point:
        """Get the offset of the specified critical point from pipette's mount position."""
        nozzle_map = self._state.nozzle_configuration_by_id[pipette_id]
        match critical_point:
            case CriticalPoint.INSTRUMENT_XY_CENTER:
                return nozzle_map.instrument_xy_center_offset
            case CriticalPoint.XY_CENTER:
                return nozzle_map.xy_center_offset
            case CriticalPoint.Y_CENTER:
                return nozzle_map.y_center_offset
            case CriticalPoint.FRONT_NOZZLE:
                return nozzle_map.front_nozzle_offset
            case _:
                return nozzle_map.starting_nozzle_offset

    def get_pipette_bounding_nozzle_offsets(
        self, pipette_id: str
    ) -> BoundingNozzlesOffsets:
        """Get the nozzle offsets of the pipette's bounding nozzles."""
        return self.get_config(pipette_id).bounding_nozzle_offsets

    def get_pipette_bounding_box(self, pipette_id: str) -> PipetteBoundingBoxOffsets:
        """Get the bounding box of the pipette."""
        return self.get_config(pipette_id).pipette_bounding_box_offsets

    # TODO (spp, 2024-09-17): in order to find the position of pipette at destination,
    #  this method repeats the same steps that waypoints builder does while finding
    #  waypoints to move to. We should consolidate these steps into a shared entity
    #  so that the deck conflict checker and movement plan builder always remain in sync.
    def get_pipette_bounds_at_specified_move_to_position(
        self,
        pipette_id: str,
        destination_position: Point,
        critical_point: Optional[CriticalPoint],
    ) -> Tuple[Point, Point, Point, Point]:
        """Get the pipette's bounding box position when critical point is at the destination position.

        Returns a tuple of the pipette's bounding box position in deck coordinates as-
            (back_left_bound, front_right_bound, back_right_bound, front_left_bound)
        Bounding box of the pipette includes the pipette's outer casing as well as nozzles.
        """
        tip = self.get_attached_tip(pipette_id)

        # *Offset* of pipette's critical point w.r.t pipette mount
        critical_point_offset = self._get_critical_point_offset_without_tip(
            pipette_id, critical_point
        )

        # Position of the above critical point at destination, in deck coordinates
        critical_point_position = destination_position + Point(
            x=0, y=0, z=tip.length if tip else 0
        )

        # Get the pipette bounding box coordinates
        pipette_bounds_offsets = self.get_config(
            pipette_id
        ).pipette_bounding_box_offsets
        pip_back_left_bound = (
            critical_point_position
            - critical_point_offset
            + pipette_bounds_offsets.back_left_corner
        )
        pip_front_right_bound = (
            critical_point_position
            - critical_point_offset
            + pipette_bounds_offsets.front_right_corner
        )
        pip_back_right_bound = Point(
            pip_front_right_bound.x, pip_back_left_bound.y, pip_front_right_bound.z
        )
        pip_front_left_bound = Point(
            pip_back_left_bound.x, pip_front_right_bound.y, pip_back_left_bound.z
        )
        return (
            pip_back_left_bound,
            pip_front_right_bound,
            pip_back_right_bound,
            pip_front_left_bound,
        )

    def get_pipette_supports_pressure(self, pipette_id: str) -> bool:
        """Return if this pipette supports a pressure sensor."""
        return (
            "pressure"
            in self._state.static_config_by_id[pipette_id].available_sensors.sensors
        )

    def get_liquid_presence_detection(self, pipette_id: str) -> bool:
        """Determine if liquid presence detection is enabled for this pipette."""
        try:
            return self._state.liquid_presence_detection_by_id[pipette_id]
        except KeyError as e:
            raise errors.PipetteNotLoadedError(
                f"Pipette {pipette_id} not found; unable to determine if pipette liquid presence detection enabled."
            ) from e

    def get_nozzle_configuration_supports_lld(self, pipette_id: str) -> bool:
        """Determine if the current partial tip configuration supports LLD."""
        nozzle_map = self.get_nozzle_configuration(pipette_id)
        if (
            nozzle_map.physical_nozzle_count == 96
            and nozzle_map.back_left != nozzle_map.full_instrument_back_left
            and nozzle_map.front_right != nozzle_map.full_instrument_front_right
        ):
            return False
        return True

    def lookup_volume_to_mm_conversion(
        self, pipette_id: str, volume: float, action: str
    ) -> float:
        """Get the volumn to mm conversion for a pipette."""
        try:
            lookup_volume = self.get_working_volume(pipette_id)
        except errors.TipNotAttachedError:
            lookup_volume = self.get_maximum_volume(pipette_id)

        pipette_config = self.get_config(pipette_id)
        lookup_table_from_config = pipette_config.tip_configuration_lookup_table
        try:
            tip_settings = lookup_table_from_config[lookup_volume]
        except KeyError:
            tip_settings = list(lookup_table_from_config.values())[0]
        return calculate_ul_per_mm(
            volume,
            cast(UlPerMmAction, action),
            tip_settings,
            shaft_ul_per_mm=pipette_config.shaft_ul_per_mm,
        )

    def lookup_plunger_position_name(
        self, pipette_id: str, position_name: str
    ) -> float:
        """Get the plunger position provided for the given pipette id."""
        return self.get_config(pipette_id).plunger_positions[position_name]
