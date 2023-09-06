import argparse
import subprocess
import asyncio 
from numpy import float64
from typing import Dict, Tuple
import time

from opentrons_hardware.drivers.can_bus.build import build_driver
from opentrons_hardware.drivers.can_bus import CanMessenger
from opentrons_hardware.firmware_bindings.constants import NodeId, PipetteTipActionType
from opentrons_hardware.scripts.can_args import add_can_args, build_settings
from opentrons_hardware.hardware_control.move_group_runner import MoveGroupRunner
from opentrons_hardware.hardware_control.current_settings import set_currents
from opentrons_hardware.hardware_control.motion import (
    MoveGroupSingleAxisStep,
    MoveStopCondition,
    create_home_step,
    create_backoff_step,
    create_tip_action_backoff_step,
    MoveGroupTipActionStep,
)


def calc_time(distance, speed):
    time = abs(distance/speed)
    return time

async def set_pipette_current(messenger: CanMessenger, run_current: float,node) -> None:
    currents: Dict[NodeId, Tuple[float, float]] = {}
    currents[node] = (float(0.1), float(run_current))

    try:
        await set_currents(messenger, currents)
    except asyncio.CancelledError:
        print("set_pipette_current err")


async def home_tip_motor(messenger, node, args):
    """Run a Backoff step for the tip motors"""
    home_runner = MoveGroupRunner(
        move_groups=[
            [
                create_tip_action_backoff_step(
                    {node: float64(5)}
                ),
            ],
        ]
    )

    current = args.current
    try:
        await set_pipette_current(messenger,current,node)
        await home_runner.run(can_messenger = messenger)
        print("MOVEHOME=Pass")
    except:
        print("MOVEHOME=Failed")


async def move_tip_motor(messenger: CanMessenger, node, distance, velocity):
    move_runner = MoveGroupRunner(
        # Group 0
        move_groups=[
            [
                {
                    node: MoveGroupTipActionStep(
                        duration_sec=float64(calc_time(distance,
                                                        velocity)),
                        velocity_mm_sec=float64(velocity),
                        action=PipetteTipActionType.clamp,
                        acceleration_mm_sec_sq=float64(0)
                    )
                }
            ]
        ],
    )
    axis_dict= await move_runner.run(can_messenger = messenger)
    return axis_dict


async def run(args: argparse.Namespace) -> None:
    subprocess.run(["systemctl", "stop", "opentrons-robot-server"])

    # Always use pipette left for the 96 channel
    node = NodeId.pipette_left
    position = {'pipette': 0}

    driver = await build_driver(build_settings(args))
    messenger = CanMessenger(driver=driver)
    messenger.start()

    if args.home:
        await home_tip_motor(messenger, node, args)
    if args.downward:
        await move_tip_motor(messenger, node, 10, 5)
    if args.up:
        await move_tip_motor(messenger, node, 10, -5)

def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(
        description="Tip motor ICT test script"
    )
    add_can_args(parser)

    parser.add_argument(
        "--current", type=str, help="set current.", default=0.8
    )
    parser.add_argument("--home", action="store_true")
    parser.add_argument("--downward", action="store_true")
    parser.add_argument("--up", action="store_true")


    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
