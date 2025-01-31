"""Test Protocol Engine motion planning utility methods."""
import pytest
from typing import List, Optional

from opentrons.types import Point
from opentrons.motion_planning.types import MoveType
from opentrons.protocol_engine.state import _move_types as subject
from opentrons.protocol_engine.types import CurrentWell


@pytest.mark.parametrize(
    ["location", "force_direct", "expected_move_type"],
    [
        (None, False, MoveType.GENERAL_ARC),
        (None, True, MoveType.DIRECT),
        (
            CurrentWell("other-pipette-id", "other-labware-id", "well-name"),
            False,
            MoveType.GENERAL_ARC,
        ),
        (
            CurrentWell("other-pipette-id", "labware-id", "well-name"),
            False,
            MoveType.GENERAL_ARC,
        ),
        (
            CurrentWell("pipette-id", "other-labware-id", "well-name"),
            False,
            MoveType.GENERAL_ARC,
        ),
        (CurrentWell("pipette-id", "labware-id", "well-name"), False, MoveType.DIRECT),
        (
            CurrentWell("pipette-id", "labware-id", "other-well-name"),
            False,
            MoveType.IN_LABWARE_ARC,
        ),
    ],
)
def test_get_move_type_to_well(
    location: Optional[CurrentWell], force_direct: bool, expected_move_type: MoveType
) -> None:
    """It should get the move type for a move to well operation."""
    move_type = subject.get_move_type_to_well(
        "pipette-id", "labware-id", "well-name", location, force_direct
    )

    assert move_type == expected_move_type


@pytest.mark.parametrize(
    ["edge_path_type", "expected_result"],
    [
        (
            subject.EdgePathType.LEFT,
            [
                Point(8, 20, 30),
                Point(10, 20, 30),
                Point(10, 27, 30),
                Point(10, 13, 30),
                Point(10, 20, 30),
            ],
        ),
        (
            subject.EdgePathType.RIGHT,
            [
                Point(12, 20, 30),
                Point(10, 20, 30),
                Point(10, 27, 30),
                Point(10, 13, 30),
                Point(10, 20, 30),
            ],
        ),
        (
            subject.EdgePathType.DEFAULT,
            [
                Point(12, 20, 30),
                Point(8, 20, 30),
                Point(10, 20, 30),
                Point(10, 27, 30),
                Point(10, 13, 30),
                Point(10, 20, 30),
            ],
        ),
    ],
)
def test_get_edge_point_list(
    edge_path_type: subject.EdgePathType,
    expected_result: List[Point],
) -> None:
    """It should get a list of well edge points."""
    result = subject.get_edge_point_list(
        Point(x=10, y=20, z=30),
        x_radius=5,
        y_radius=10,
        mm_from_edge=3,
        edge_path_type=edge_path_type,
    )

    assert result == expected_result
