import pytest
from robot_server.service.legacy.models import control


def test_robot_home_target():
    """Test validation that mount must be present if mount is pipette"""
    with pytest.raises(
        ValueError, match="mount must be specified if target is pipette"
    ):
        control.RobotHomeTarget(target=control.HomeTarget.pipette)


def test_robot_move_target_points_too_few():
    with pytest.raises(ValueError, match="List should have at least 3 items"):
        control.RobotMoveTarget(target=control.MotionTarget.pipette, point=[1, 2])


def test_robot_move_target_points_too_many():
    with pytest.raises(ValueError, match="List should have at most 3 items"):
        control.RobotMoveTarget(target=control.MotionTarget.pipette, point=[1, 2, 3, 4])


def test_robot_move_target_points_too_low():
    with pytest.raises(
        ValueError, match="Sending a mount to a z position lower than 30"
    ):
        control.RobotMoveTarget(target=control.MotionTarget.mount, point=[1, 2, 3])
