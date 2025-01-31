"""Motion state store and getters."""
from dataclasses import dataclass
from typing import List, Optional, Union

from opentrons.types import MountType, Point, StagingSlotName
from opentrons.hardware_control.types import CriticalPoint
from opentrons.motion_planning.adjacent_slots_getters import (
    get_east_west_slots,
    get_adjacent_slots,
)
from opentrons import motion_planning

from . import _move_types
from .. import errors
from ..types import (
    MotorAxis,
    WellLocation,
    LiquidHandlingWellLocation,
    CurrentWell,
    CurrentPipetteLocation,
    AddressableOffsetVector,
)
from .config import Config
from .labware import LabwareView
from .pipettes import PipetteView
from .addressable_areas import AddressableAreaView
from .geometry import GeometryView
from .modules import ModuleView
from .module_substates import HeaterShakerModuleId


@dataclass(frozen=True)
class PipetteLocationData:
    """Pipette data used to determine the current gantry position."""

    mount: MountType
    critical_point: Optional[CriticalPoint]


class MotionView:
    """Complete motion planning state and getter methods."""

    def __init__(
        self,
        config: Config,
        labware_view: LabwareView,
        pipette_view: PipetteView,
        addressable_area_view: AddressableAreaView,
        geometry_view: GeometryView,
        module_view: ModuleView,
    ) -> None:
        """Initialize a MotionState instance."""
        self._config = config
        self._labware = labware_view
        self._pipettes = pipette_view
        self._addressable_areas = addressable_area_view
        self._geometry = geometry_view
        self._modules = module_view

    def get_pipette_location(
        self,
        pipette_id: str,
        current_location: Optional[CurrentPipetteLocation] = None,
    ) -> PipetteLocationData:
        """Get the critical point of a pipette given the current location."""
        current_location = current_location or self._pipettes.get_current_location()
        pipette_data = self._pipettes.get(pipette_id)

        mount = pipette_data.mount
        critical_point = None

        # if the pipette was last used to move to a labware that requires
        # centering, set the critical point to the appropriate center
        if (
            isinstance(current_location, CurrentWell)
            and current_location.pipette_id == pipette_id
        ):
            if self._labware.get_should_center_column_on_target_well(
                current_location.labware_id
            ):
                critical_point = CriticalPoint.Y_CENTER
            elif self._labware.get_should_center_pipette_on_target_well(
                current_location.labware_id
            ):
                critical_point = CriticalPoint.XY_CENTER
        return PipetteLocationData(mount=mount, critical_point=critical_point)

    def get_movement_waypoints_to_well(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: Optional[Union[WellLocation, LiquidHandlingWellLocation]],
        origin: Point,
        origin_cp: Optional[CriticalPoint],
        max_travel_z: float,
        current_well: Optional[CurrentWell] = None,
        force_direct: bool = False,
        minimum_z_height: Optional[float] = None,
        operation_volume: Optional[float] = None,
    ) -> List[motion_planning.Waypoint]:
        """Calculate waypoints to a destination that's specified as a well."""
        location = current_well or self._pipettes.get_current_location()

        destination_cp: Optional[CriticalPoint] = None
        if self._labware.get_should_center_column_on_target_well(labware_id):
            destination_cp = CriticalPoint.Y_CENTER
        elif self._labware.get_should_center_pipette_on_target_well(labware_id):
            destination_cp = CriticalPoint.XY_CENTER

        destination = self._geometry.get_well_position(
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            operation_volume=operation_volume,
            pipette_id=pipette_id,
        )

        move_type = _move_types.get_move_type_to_well(
            pipette_id, labware_id, well_name, location, force_direct
        )
        min_travel_z = self._geometry.get_min_travel_z(
            pipette_id, labware_id, location, minimum_z_height
        )

        destination_slot = self._geometry.get_ancestor_slot_name(labware_id)
        # TODO (spp, 11-29-2021): Should log some kind of warning that pipettes
        #  could crash onto the thermocycler if current well or addressable area is not known.
        extra_waypoints = self._geometry.get_extra_waypoints(
            location=location, to_slot=destination_slot
        )

        try:
            return motion_planning.get_waypoints(
                move_type=move_type,
                origin=origin,
                origin_cp=origin_cp,
                dest=destination,
                dest_cp=destination_cp,
                min_travel_z=min_travel_z,
                max_travel_z=max_travel_z,
                xy_waypoints=extra_waypoints,
            )
        except motion_planning.MotionPlanningError as error:
            raise errors.FailedToPlanMoveError(str(error))

    def get_movement_waypoints_to_addressable_area(
        self,
        addressable_area_name: str,
        offset: AddressableOffsetVector,
        origin: Point,
        origin_cp: Optional[CriticalPoint],
        max_travel_z: float,
        force_direct: bool = False,
        minimum_z_height: Optional[float] = None,
        stay_at_max_travel_z: bool = False,
        ignore_tip_configuration: Optional[bool] = True,
        max_travel_z_extra_margin: Optional[float] = None,
    ) -> List[motion_planning.Waypoint]:
        """Calculate waypoints to a destination that's specified as an addressable area."""
        location = self._pipettes.get_current_location()

        base_destination = (
            self._addressable_areas.get_addressable_area_move_to_location(
                addressable_area_name
            )
        )
        if stay_at_max_travel_z:
            base_destination_at_max_z = Point(
                base_destination.x,
                base_destination.y,
                # HACK(mm, 2023-12-18): We want to travel exactly at max_travel_z, but
                # motion_planning.get_waypoints() won't let us--the highest we can go is this margin
                # beneath max_travel_z. Investigate why motion_planning.get_waypoints() does not
                # let us travel at max_travel_z, and whether it's safe to make it do that.
                # Possibly related: https://github.com/Opentrons/opentrons/pull/6882#discussion_r514248062
                max_travel_z
                - motion_planning.waypoints.MINIMUM_Z_MARGIN
                - (max_travel_z_extra_margin or 0.0),
            )
            destination = base_destination_at_max_z + Point(
                offset.x, offset.y, offset.z
            )
        else:
            destination = base_destination + Point(offset.x, offset.y, offset.z)

        # TODO(jbl 11-28-2023) This may need to change for partial tip configurations on a 96
        if ignore_tip_configuration:
            destination_cp = CriticalPoint.INSTRUMENT_XY_CENTER
        else:
            destination_cp = CriticalPoint.XY_CENTER

        all_labware_highest_z = self._geometry.get_all_obstacle_highest_z()
        if minimum_z_height is None:
            minimum_z_height = float("-inf")
        min_travel_z = max(all_labware_highest_z, minimum_z_height)

        move_type = (
            motion_planning.MoveType.DIRECT
            if force_direct
            else motion_planning.MoveType.GENERAL_ARC
        )

        destination_slot = self._addressable_areas.get_addressable_area_base_slot(
            addressable_area_name
        )
        # TODO (spp, 11-29-2021): Should log some kind of warning that pipettes
        #  could crash onto the thermocycler if current well or addressable area is not known.
        extra_waypoints = self._geometry.get_extra_waypoints(
            location=location, to_slot=destination_slot
        )

        try:
            return motion_planning.get_waypoints(
                move_type=move_type,
                origin=origin,
                origin_cp=origin_cp,
                dest=destination,
                dest_cp=destination_cp,
                min_travel_z=min_travel_z,
                max_travel_z=max_travel_z,
                xy_waypoints=extra_waypoints,
            )
        except motion_planning.MotionPlanningError as error:
            raise errors.FailedToPlanMoveError(str(error))

    def get_movement_waypoints_to_coords(
        self,
        origin: Point,
        dest: Point,
        max_travel_z: float,
        direct: bool,
        additional_min_travel_z: Optional[float],
    ) -> List[motion_planning.Waypoint]:
        """Calculate waypoints to a destination that's specified as deck coordinates.

        Args:
            origin: The start point of the movement.
            dest: The end point of the movement.
            max_travel_z: How high, in deck coordinates, the pipette can go.
                This should be measured at the bottom of whatever tip is currently
                attached (if any).
            direct: If True, move directly. If False, move in an arc.
            additional_min_travel_z: The minimum height to clear, if moving in an arc.
                Ignored if `direct` is True. If lower than the default height,
                the default is used; this can only increase the height, not decrease it.
        """
        all_labware_highest_z = self._geometry.get_all_obstacle_highest_z()
        if additional_min_travel_z is None:
            additional_min_travel_z = float("-inf")
        min_travel_z = max(all_labware_highest_z, additional_min_travel_z)

        move_type = (
            motion_planning.MoveType.DIRECT
            if direct
            else motion_planning.MoveType.GENERAL_ARC
        )

        try:
            return motion_planning.get_waypoints(
                origin=origin,
                dest=dest,
                min_travel_z=min_travel_z,
                max_travel_z=max_travel_z,
                move_type=move_type,
                origin_cp=None,
                dest_cp=None,
            )
        except motion_planning.MotionPlanningError as error:
            raise errors.FailedToPlanMoveError(str(error))

    def check_pipette_blocking_hs_latch(
        self, hs_module_id: HeaterShakerModuleId
    ) -> bool:
        """Check if pipette would block h/s latch from opening if it is east, west or on module."""
        pipette_blocking = True
        current_location = self._pipettes.get_current_location()
        if current_location is not None:
            if isinstance(current_location, CurrentWell):
                ancestor = self._geometry.get_ancestor_slot_name(
                    current_location.labware_id
                )
                if isinstance(ancestor, StagingSlotName):
                    # Staging Area Slots cannot intersect with the h/s
                    return False
                pipette_deck_slot = ancestor.as_int()
            else:
                pipette_deck_slot = (
                    self._addressable_areas.get_addressable_area_base_slot(
                        current_location.addressable_area_name
                    ).as_int()
                )
            hs_deck_slot = self._modules.get_location(hs_module_id).slotName.as_int()
            conflicting_slots = get_east_west_slots(hs_deck_slot) + [hs_deck_slot]
            pipette_blocking = pipette_deck_slot in conflicting_slots
        return pipette_blocking

    def check_pipette_blocking_hs_shaker(
        self, hs_module_id: HeaterShakerModuleId
    ) -> bool:
        """Check if pipette would block h/s latch from starting shake if it is adjacent or on module."""
        pipette_blocking = True
        current_location = self._pipettes.get_current_location()
        if current_location is not None:
            if isinstance(current_location, CurrentWell):
                ancestor = self._geometry.get_ancestor_slot_name(
                    current_location.labware_id
                )
                if isinstance(ancestor, StagingSlotName):
                    # Staging Area Slots cannot intersect with the h/s
                    return False
                pipette_deck_slot = ancestor.as_int()
            else:
                pipette_deck_slot = (
                    self._addressable_areas.get_addressable_area_base_slot(
                        current_location.addressable_area_name
                    ).as_int()
                )
            hs_deck_slot = self._modules.get_location(hs_module_id).slotName.as_int()
            conflicting_slots = get_adjacent_slots(hs_deck_slot) + [hs_deck_slot]
            pipette_blocking = pipette_deck_slot in conflicting_slots
        return pipette_blocking

    def get_touch_tip_waypoints(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        center_point: Point,
        mm_from_edge: float = 0,
        radius: float = 1.0,
    ) -> List[motion_planning.Waypoint]:
        """Get a list of touch points for a touch tip operation."""
        mount = self._pipettes.get_mount(pipette_id)
        labware_slot = self._geometry.get_ancestor_slot_name(labware_id)
        if isinstance(labware_slot, StagingSlotName):
            raise errors.LocationIsStagingSlotError(
                "Cannot perform Touch Tip on labware in Staging Area Slot."
            )
        next_to_module = self._modules.is_edge_move_unsafe(mount, labware_slot)
        edge_path_type = self._labware.get_edge_path_type(
            labware_id, well_name, mount, labware_slot, next_to_module
        )

        x_offset, y_offset = self._labware.get_well_radial_offsets(
            labware_id, well_name, radius
        )

        positions = _move_types.get_edge_point_list(
            center=center_point,
            x_radius=x_offset,
            y_radius=y_offset,
            mm_from_edge=mm_from_edge,
            edge_path_type=edge_path_type,
        )
        critical_point: Optional[CriticalPoint] = None

        if self._labware.get_should_center_column_on_target_well(labware_id):
            critical_point = CriticalPoint.Y_CENTER
        elif self._labware.get_should_center_pipette_on_target_well(labware_id):
            critical_point = CriticalPoint.XY_CENTER

        return [
            motion_planning.Waypoint(position=p, critical_point=critical_point)
            for p in positions
        ]

    def get_robot_mount_axes(self) -> List[MotorAxis]:
        """Get a list of axes belonging to all mounts on the robot."""
        mount_axes = [MotorAxis.LEFT_Z, MotorAxis.RIGHT_Z]
        if self._config.robot_type == "OT-3 Standard":
            mount_axes.append(MotorAxis.EXTENSION_Z)
        return mount_axes
