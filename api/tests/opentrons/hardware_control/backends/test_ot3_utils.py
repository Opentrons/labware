import pytest
from typing import List
from opentrons_hardware.hardware_control.motion_planning import Move
from opentrons.hardware_control.backends import ot3utils
from opentrons_hardware.firmware_bindings.constants import NodeId
from opentrons.hardware_control.types import Axis, OT3Mount, OT3AxisKind
from numpy import float64 as f64

from opentrons.config import defaults_ot3, types as conf_types


def test_create_step() -> None:
    origin = {
        Axis.X: 0,
        Axis.Y: 0,
        Axis.Z_L: 0,
        Axis.Z_R: 0,
        Axis.P_L: 0,
        Axis.P_R: 0,
    }
    moves = [Move.build_dummy([Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R, Axis.P_L])]
    for block in moves[0].blocks:
        block.distance = f64(25.0)
        block.time = f64(1.0)
        block.initial_speed = f64(25.0)
        block.acceleration = f64(0.0)
        block.final_speed = f64(25.0)
    present_nodes = [NodeId.gantry_x, NodeId.gantry_y, NodeId.head_l]
    move_group, final_pos = ot3utils.create_move_group(
        origin=origin,
        moves=moves,
        present_nodes=present_nodes,
    )
    assert len(move_group) == 3
    for step in move_group:
        assert set(present_nodes) == set(step.keys())


def test_filter_zero_duration_step() -> None:
    origin = {
        Axis.X: 0,
        Axis.Y: 0,
        Axis.Z_L: 0,
        Axis.Z_R: 0,
        Axis.P_L: 0,
        Axis.P_R: 0,
    }
    moves = [Move.build_dummy([Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R, Axis.P_L])]
    for block in (moves[0].blocks[0], moves[0].blocks[1]):
        block.distance = f64(25.0)
        block.time = f64(1.0)
        block.initial_speed = f64(25.0)
        block.acceleration = f64(0.0)
        block.final_speed = f64(25.0)
    present_nodes = [NodeId.gantry_x, NodeId.gantry_y, NodeId.head_l]
    move_group, final_pos = ot3utils.create_move_group(
        origin=origin,
        moves=moves,
        present_nodes=present_nodes,
    )
    assert len(move_group) == 2
    for step in move_group:
        assert set(present_nodes) == set(step.keys())


def test_nodeid_replace_head() -> None:
    assert ot3utils.replace_head_node(set([NodeId.head, NodeId.gantry_x])) == set(
        [NodeId.head_l, NodeId.head_r, NodeId.gantry_x]
    )
    assert ot3utils.replace_head_node(set([NodeId.gantry_x])) == set([NodeId.gantry_x])
    assert ot3utils.replace_head_node(set([NodeId.head_l])) == set([NodeId.head_l])


def test_nodeid_replace_gripper() -> None:
    assert ot3utils.replace_gripper_node(set([NodeId.gripper, NodeId.head])) == set(
        [NodeId.gripper_g, NodeId.gripper_z, NodeId.head]
    )
    assert ot3utils.replace_gripper_node(set([NodeId.head])) == set([NodeId.head])
    assert ot3utils.replace_gripper_node(set([NodeId.gripper_g])) == set(
        [NodeId.gripper_g]
    )


def test_get_system_contraints_for_plunger() -> None:
    set_acceleration = 2
    axis = Axis.P_L
    config = defaults_ot3.build_with_defaults({})
    updated_contraints = ot3utils.get_system_constraints_for_plunger_acceleration(
        config.motion_settings,
        conf_types.GantryLoad.LOW_THROUGHPUT,
        OT3Mount.LEFT,
        set_acceleration,
    )

    assert updated_contraints[axis].max_acceleration == set_acceleration


@pytest.mark.parametrize(["mount"], [[OT3Mount.LEFT], [OT3Mount.RIGHT]])
def test_get_system_constraints_for_emulsifying_pipette(mount: OT3Mount) -> None:
    set_max_speed = 90
    config = defaults_ot3.build_with_defaults({})
    pipette_ax = Axis.of_main_tool_actuator(mount)
    default_pip_max_speed = config.motion_settings.default_max_speed[
        conf_types.GantryLoad.LOW_THROUGHPUT
    ][OT3AxisKind.P]
    updated_constraints = ot3utils.get_system_constraints_for_emulsifying_pipette(
        config.motion_settings, conf_types.GantryLoad.LOW_THROUGHPUT, mount
    )
    other_pipette = list(set(Axis.pipette_axes()) - {pipette_ax})[0]
    assert updated_constraints[pipette_ax].max_speed == set_max_speed
    assert updated_constraints[other_pipette].max_speed == default_pip_max_speed


@pytest.mark.parametrize(
    ["moving", "expected"],
    [
        [
            [NodeId.gantry_x, NodeId.gantry_y, NodeId.gripper_g, NodeId.gripper_z],
            [],
        ],
        [
            [NodeId.head_l],
            [NodeId.pipette_left],
        ],
        [
            [NodeId.head_r],
            [NodeId.pipette_right],
        ],
    ],
)
def test_moving_pipettes_in_move_group(
    moving: List[NodeId], expected: List[NodeId]
) -> None:
    """Test that we can filter out the nonmoving nodes."""
    present_nodes = [
        NodeId.gantry_x,
        NodeId.gantry_y,
        NodeId.head_l,
        NodeId.head_r,
        NodeId.pipette_left,
        NodeId.pipette_right,
        NodeId.gripper_g,
        NodeId.gripper_z,
    ]

    moving_pipettes = ot3utils.moving_pipettes_in_move_group(
        set(present_nodes), set(moving)
    )
    assert set(moving_pipettes) == set(expected)
