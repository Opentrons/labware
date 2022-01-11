"""A simple script to create a motion plan."""
import os
import json
import logging
from logging.config import dictConfig
import argparse

from opentrons_hardware.hardware_control.motion_planning import move_manager
from opentrons_hardware.hardware_control.motion_planning.types import (
    Axis,
    AxisConstraints,
    SystemConstraints,
    MoveTarget,
    Coordinates,
)
from typing import Dict, Any


log = logging.getLogger(__name__)

LOG_CONFIG: Dict[str, Any] = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "stream_handler": {
            "class": "logging.StreamHandler",
            "formatter": "basic",
            "level": logging.INFO,
        },
    },
    "loggers": {
        "": {
            "handlers": ["stream_handler"],
            "level": logging.DEBUG,
        },
    },
}


def main() -> None:
    """Entry point."""

    parser = argparse.ArgumentParser(description="Motion planning script.")
    parser.add_argument(
        "--params-file-path",
        "-p",
        type=str,
        required=False,
        default=os.path.join(os.path.dirname(__file__) + "/motion_params.json"),
        help="the parameter file path",
    )
    parser.add_argument(
        "--debug",
        "-d",
        type=bool,
        required=False,
        default=False,
        help="set logging level to debug",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        required=False,
        default=os.path.join(os.path.dirname(__file__) + "/motion_output.json"),
        help="the output file path",
    )
    args = parser.parse_args()

    if args.debug:
        LOG_CONFIG["handlers"]["stream_handler"]["level"] = logging.DEBUG
        LOG_CONFIG["loggers"][""]["level"] = logging.DEBUG
    dictConfig(LOG_CONFIG)

    with open(args.params_file_path, "r") as f:
        params = json.load(f)

    constraints: SystemConstraints = {
        axis: AxisConstraints.build(**params["constraints"][axis.name]) for axis in Axis
    }
    origin = Coordinates(*params["origin"])
    target_list = [
        MoveTarget.build(Coordinates(*target["coordinates"]), target["max_speed"])
        for target in params["target_list"]
    ]

    manager = move_manager.MoveManager(constraints=constraints)
    _, blend_log = manager.plan_motion(
        origin=origin,
        target_list=target_list,
        iteration_limit=params["iteration_limit"],
    )

    output = {
        index: [v.to_dict() for v in value] for index, value in enumerate(blend_log)
    }

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)


if __name__ == "__main__":
    main()
