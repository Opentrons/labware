"""Getters for Protocol Engine motion planning."""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from opentrons.types import Point
from opentrons.motion_planning.types import MoveType

from ..types import CurrentWell, CurrentPipetteLocation


@dataclass
class EdgeList:
    """Potential points for a touch tip operation."""

    right: Point
    left: Point
    center: Point
    forward: Point
    back: Point


class EdgePathType(str, Enum):
    """Types of well edge point paths for touch tip."""

    LEFT = "left"
    RIGHT = "right"
    DEFAULT = "default"


def get_move_type_to_well(
    pipette_id: str,
    labware_id: str,
    well_name: str,
    location: Optional[CurrentPipetteLocation],
    force_direct: bool,
) -> MoveType:
    """Get the move type for a move to well command."""
    if force_direct:
        return MoveType.DIRECT
    if (
        isinstance(location, CurrentWell)
        and pipette_id == location.pipette_id
        and labware_id == location.labware_id
    ):
        return (
            MoveType.IN_LABWARE_ARC
            if well_name != location.well_name
            else MoveType.DIRECT
        )
    else:
        return MoveType.GENERAL_ARC


def get_edge_point_list(
    center: Point,
    x_radius: float,
    y_radius: float,
    mm_from_edge: float,
    edge_path_type: EdgePathType,
) -> List[Point]:
    """Get list of edge points dependent on edge path type."""
    edges = EdgeList(
        right=center + Point(x=x_radius - mm_from_edge, y=0, z=0),
        left=center + Point(x=-x_radius + mm_from_edge, y=0, z=0),
        center=center,
        forward=center + Point(x=0, y=y_radius - mm_from_edge, z=0),
        back=center + Point(x=0, y=-y_radius + mm_from_edge, z=0),
    )

    if edge_path_type == EdgePathType.LEFT:
        return [edges.left, edges.center, edges.forward, edges.back, edges.center]
    elif edge_path_type == EdgePathType.RIGHT:
        return [edges.right, edges.center, edges.forward, edges.back, edges.center]
    else:
        return [
            edges.right,
            edges.left,
            edges.center,
            edges.forward,
            edges.back,
            edges.center,
        ]
