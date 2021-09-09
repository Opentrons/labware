import asyncio
from robot_server.service.legacy.routers.control import post_move_robot
from robot_server.service.legacy.models.control import RobotMoveTarget
from robot_server.service.dependencies import get_motion_lock
from functools import partial


def main():
    target = RobotMoveTarget(
        target='pipette',
        point=[
            10.0,
            20.0,
            15.0
        ],
        mount='right'
    )

    return partial(
        post_move_robot,
        robot_move_target=target,
        motion_lock=asyncio.run(get_motion_lock())
    )