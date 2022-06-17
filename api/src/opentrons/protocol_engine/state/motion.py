"""Motion state store and getters."""
from dataclasses import dataclass
from typing import List, Optional

from opentrons.types import MountType, Point, DeckSlotName
from opentrons.hardware_control.types import CriticalPoint
from opentrons.motion_planning import (
    MoveType,
    Waypoint,
    MotionPlanningError,
    get_waypoints,
)

from .. import errors
from ..types import WellLocation
from .labware import LabwareView
from .pipettes import PipetteView, CurrentWell
from .geometry import GeometryView
from .modules import ModuleView


@dataclass(frozen=True)
class PipetteLocationData:
    """Pipette data used to determine the current gantry position."""

    mount: MountType
    critical_point: Optional[CriticalPoint]


class MotionView:
    """Complete motion planning state and getter methods."""

    def __init__(
        self,
        labware_view: LabwareView,
        pipette_view: PipetteView,
        geometry_view: GeometryView,
        module_view: ModuleView,
    ) -> None:
        """Initialize a MotionState instance."""
        self._labware = labware_view
        self._pipettes = pipette_view
        self._geometry = geometry_view
        self._module = module_view

    def get_pipette_location(
        self,
        pipette_id: str,
        current_well: Optional[CurrentWell] = None,
    ) -> PipetteLocationData:
        """Get the critical point of a pipette given the current location."""
        current_well = current_well or self._pipettes.get_current_well()
        pipette_data = self._pipettes.get(pipette_id)

        mount = pipette_data.mount
        critical_point = None

        # if the pipette was last used to move to a labware that requires
        # centering, set the critical point to XY_CENTER
        if (
            current_well is not None
            and current_well.pipette_id == pipette_id
            and self._labware.get_has_quirk(
                current_well.labware_id,
                "centerMultichannelOnWells",
            )
        ):
            critical_point = CriticalPoint.XY_CENTER
        return PipetteLocationData(mount=mount, critical_point=critical_point)

    def get_movement_waypoints_to_well(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: Optional[WellLocation],
        origin: Point,
        origin_cp: Optional[CriticalPoint],
        max_travel_z: float,
        current_well: Optional[CurrentWell] = None,
    ) -> List[Waypoint]:
        """Calculate waypoints to a destination that's specified as a well."""
        location = current_well or self._pipettes.get_current_well()
        center_dest = self._labware.get_has_quirk(
            labware_id,
            "centerMultichannelOnWells",
        )

        dest = self._geometry.get_well_position(
            labware_id,
            well_name,
            well_location,
        )
        dest_cp = CriticalPoint.XY_CENTER if center_dest else None
        extra_waypoints = []

        if (
            location is not None
            and pipette_id == location.pipette_id
            and labware_id == location.labware_id
        ):
            move_type = (
                MoveType.IN_LABWARE_ARC
                if well_name != location.well_name
                else MoveType.DIRECT
            )
            min_travel_z = self._geometry.get_labware_highest_z(labware_id)
        else:
            move_type = MoveType.GENERAL_ARC
            min_travel_z = self._geometry.get_all_labware_highest_z()
            if location is not None:
                if self._module.should_dodge_thermocycler(
                    from_slot=self._geometry.get_ancestor_slot_name(
                        location.labware_id
                    ),
                    to_slot=self._geometry.get_ancestor_slot_name(labware_id),
                ):
                    slot_5_center = self._labware.get_slot_center_position(
                        slot=DeckSlotName.SLOT_5
                    )
                    extra_waypoints = [(slot_5_center.x, slot_5_center.y)]
            # TODO (spp, 11-29-2021): Should log some kind of warning that pipettes
            #  could crash onto the thermocycler if current well is not known.

        try:
            return get_waypoints(
                move_type=move_type,
                origin=origin,
                origin_cp=origin_cp,
                dest=dest,
                dest_cp=dest_cp,
                min_travel_z=min_travel_z,
                max_travel_z=max_travel_z,
                xy_waypoints=extra_waypoints,
            )
        except MotionPlanningError as error:
            raise errors.FailedToPlanMoveError(str(error))

    def get_movement_waypoints_to_coords(
        self,
        origin: Point,
        dest: Point,
        max_travel_z: float,
        direct: bool,
        additional_min_travel_z: Optional[float],
    ) -> List[Waypoint]:
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
        all_labware_highest_z = self._geometry.get_all_labware_highest_z()
        if additional_min_travel_z is None:
            additional_min_travel_z = float("-inf")
        min_travel_z = max(all_labware_highest_z, additional_min_travel_z)

        move_type = MoveType.DIRECT if direct else MoveType.GENERAL_ARC

        try:
            return get_waypoints(
                origin=origin,
                dest=dest,
                min_travel_z=min_travel_z,
                max_travel_z=max_travel_z,
                move_type=move_type,
                origin_cp=None,
                dest_cp=None,
            )
        except MotionPlanningError as error:
            raise errors.FailedToPlanMoveError(str(error))
