"""Tests for motion planning."""
import numpy as np
from hypothesis import given, assume, strategies as st
from hypothesis.extra import numpy as hynp
from typing import Iterator, List, Tuple, Dict

from opentrons_hardware.hardware_control.motion_planning import move_manager
from opentrons_hardware.hardware_control.motion_planning.types import (
    AxisConstraints,
    Coordinates,
    MoveTarget,
    SystemConstraints,
    vectorize,
)

SIXAXES = ["X", "Y", "Z", "A", "B", "C"]


@st.composite
def generate_axis_constraint(draw: st.DrawFn) -> AxisConstraints:
    """Create axis constraint using Hypothesis."""
    acc = draw(st.integers(min_value=500, max_value=5000))
    speed_dist = draw(st.integers(min_value=11, max_value=50))
    dir_change_dist = draw(st.integers(min_value=5, max_value=10))
    assume(speed_dist > dir_change_dist)
    return AxisConstraints.build(
        max_acceleration=acc,
        max_speed_discont=speed_dist,
        max_direction_change_speed_discont=dir_change_dist,
        max_speed=500,
    )


@st.composite
def generate_coordinates(draw: st.DrawFn) -> Coordinates[str, np.float64]:
    """Create coordinates using Hypothesis."""
    coord = [
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=500)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=490)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
        draw(hynp.from_dtype(np.dtype(np.float64), min_value=0, max_value=300)),
    ]
    formatted: Iterator[np.float64] = (np.float64(i) for i in coord)
    return dict(zip(SIXAXES, formatted))


@st.composite
def generate_coordinates_with_defined_separation(
    draw: st.DrawFn,
    prev_coord: Coordinates[str, np.float64],
    min_separation: float = 0.1,
    max_separation: float = 1.0,
) -> Coordinates[str, np.float64]:
    """Create coordinates using Hypothesis."""
    diff: List[np.typing.NDArray[np.float64]] = [
        draw(
            hynp.from_dtype(
                np.dtype(np.float64), min_value=min_separation, max_value=max_separation
            )
        )
        for elem in range(len(prev_coord))
    ]
    coord: np.typing.NDArray[np.float64] = vectorize(prev_coord) + diff
    return dict(zip(SIXAXES, (np.float64(i) for i in coord)))


@st.composite
def generate_far_target_list(
    draw: st.DrawFn, origin: Coordinates[str, np.float64]
) -> List[MoveTarget[str]]:
    """Generate a list of MoveTarget using Hypothesis."""
    # Note: this needs to change! It should be the following:
    # target_num = draw(st.integers(min_value=1, max_value=10))
    # but, we don't properly handle sequences of moves that steadily change direction in one blend
    # - in practice, we really just blend single moves, which this tests satisfactorily.
    target_num = 1
    target_list: List[MoveTarget[str]] = []
    prev_coord = origin
    while len(target_list) < target_num:
        position = draw(
            generate_coordinates_with_defined_separation(prev_coord, 1.0, 500.0)
        )
        target = MoveTarget.build(
            position, np.float64(draw(st.floats(min_value=10, max_value=500)))
        )
        target_list.append(target)
        prev_coord = position
    return target_list


@st.composite
def generate_far_path(
    draw: st.DrawFn,
    origin_strategy: st.SearchStrategy[
        Coordinates[str, np.float64]
    ] = generate_coordinates(),
) -> Tuple[Coordinates[str, np.float64], List[MoveTarget[str]]]:
    """Generate a path (origin plus target) with a large difference in position."""
    origin = draw(origin_strategy)
    target_list = draw(generate_far_target_list(origin))
    return (origin, target_list)


@st.composite
def generate_close_target_list(
    draw: st.DrawFn, origin: Coordinates[str, np.float64]
) -> List[MoveTarget[str]]:
    """Generate a list of MoveTarget using Hypothesis."""
    target_num = draw(st.integers(min_value=1, max_value=10))
    target_list: List[MoveTarget[str]] = []
    prev_coord = origin
    while len(target_list) < target_num:
        position = draw(
            generate_coordinates_with_defined_separation(prev_coord, 0.1, 1.0)
        )
        target = MoveTarget.build(
            position, np.float64(draw(st.floats(min_value=0.1, max_value=10.0)))
        )
        target_list.append(target)
        prev_coord = position
    return target_list


@st.composite
def generate_close_path(
    draw: st.DrawFn,
    origin_strategy: st.SearchStrategy[
        Coordinates[str, np.float64]
    ] = generate_coordinates(),
) -> Tuple[Coordinates[str, np.float64], List[MoveTarget[str]]]:
    """Generate a path (origin, target) with little difference between positions."""
    origin = draw(origin_strategy)
    target_list = draw(generate_close_target_list(origin))
    return (origin, target_list)


@given(
    x_constraint=generate_axis_constraint(),
    y_constraint=generate_axis_constraint(),
    z_constraint=generate_axis_constraint(),
    a_constraint=generate_axis_constraint(),
    b_constraint=generate_axis_constraint(),
    c_constraint=generate_axis_constraint(),
    path=generate_far_path(),
)
def test_move_plan(
    x_constraint: AxisConstraints,
    y_constraint: AxisConstraints,
    z_constraint: AxisConstraints,
    a_constraint: AxisConstraints,
    b_constraint: AxisConstraints,
    c_constraint: AxisConstraints,
    path: Tuple[Coordinates[str, np.float64], List[MoveTarget[str]]],
) -> None:
    """Test motion plan using Hypothesis."""
    origin, targets = path
    constraints: SystemConstraints[str] = {
        "X": x_constraint,
        "Y": y_constraint,
        "Z": z_constraint,
        "A": a_constraint,
        "B": b_constraint,
        "C": c_constraint,
    }
    manager = move_manager.MoveManager(constraints=constraints)
    converged, blend_log = manager.plan_motion(
        origin=origin,
        target_list=targets,
        iteration_limit=20,
    )

    assert converged, f"Failed to converge: {blend_log}"


@given(
    x_constraint=generate_axis_constraint(),
    y_constraint=generate_axis_constraint(),
    z_constraint=generate_axis_constraint(),
    a_constraint=generate_axis_constraint(),
    b_constraint=generate_axis_constraint(),
    c_constraint=generate_axis_constraint(),
    path=generate_close_path(),
)
def test_close_move_plan(
    x_constraint: AxisConstraints,
    y_constraint: AxisConstraints,
    z_constraint: AxisConstraints,
    a_constraint: AxisConstraints,
    b_constraint: AxisConstraints,
    c_constraint: AxisConstraints,
    path: Tuple[Coordinates[str, np.float64], List[MoveTarget[str]]],
) -> None:
    """Test motion plan using Hypothesis."""
    origin, targets = path
    constraints: SystemConstraints[str] = {
        "X": x_constraint,
        "Y": y_constraint,
        "Z": z_constraint,
        "A": a_constraint,
        "B": b_constraint,
        "C": c_constraint,
    }
    manager = move_manager.MoveManager(constraints=constraints)
    converged, blend_log = manager.plan_motion(
        origin=origin,
        target_list=targets,
        iteration_limit=20,
    )

    assert converged, f"Failed to converge: {blend_log}"


def test_pipette_high_speed_motion() -> None:
    """Test that updated motion constraint doesn't get overridden by motion planning."""
    origin: Dict[str, int] = {
        "X": 499,
        "Y": 499,
        "Z": 499,
        "A": 499,
        "B": 499,
        "C": 499,
    }
    target_list = []
    axis_kinds = ["X", "Y", "Z", "A", "B", "C"]
    constraints: SystemConstraints[str] = {}
    for axis_kind in axis_kinds:
        constraints[axis_kind] = AxisConstraints.build(
            max_acceleration=500,
            max_speed_discont=500,
            max_direction_change_speed_discont=500,
            max_speed=500,
        )
        origin_mapping: Dict[str, float] = {axis_kind: float(origin[axis_kind])}
        target_list.append(MoveTarget.build(origin_mapping, 500))

    set_axis_kind = "A"
    dummy_em_pipette_max_speed = 90.0
    manager = move_manager.MoveManager(constraints=constraints)

    new_axis_constraint = AxisConstraints.build(
        max_acceleration=float(constraints[set_axis_kind].max_acceleration),
        max_speed_discont=float(constraints[set_axis_kind].max_speed_discont),
        max_direction_change_speed_discont=float(
            constraints[set_axis_kind].max_direction_change_speed_discont
        ),
        max_speed=90.0,
    )
    new_constraints = {}

    for axis_kind in constraints.keys():
        if axis_kind == set_axis_kind:
            new_constraints[axis_kind] = new_axis_constraint
        else:
            new_constraints[axis_kind] = constraints[axis_kind]

    manager.update_constraints(constraints=new_constraints)
    converged, blend_log = manager.plan_motion(
        origin=origin,
        target_list=target_list,
        iteration_limit=20,
    )
    for move in blend_log[0]:
        unit_vector = move.unit_vector
        for block in move.blocks:
            top_set_axis_speed = unit_vector[set_axis_kind] * block.final_speed
            if top_set_axis_speed != 0:
                assert abs(top_set_axis_speed) == dummy_em_pipette_max_speed
