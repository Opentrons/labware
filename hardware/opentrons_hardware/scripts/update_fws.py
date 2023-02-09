"""Firmware update script."""
import argparse
import asyncio
import logging
import json
from logging.config import dictConfig
from typing import Dict, Any, TextIO

from opentrons_hardware.drivers.can_bus import build
from opentrons_hardware.firmware_bindings import NodeId
from opentrons_hardware.firmware_update.run import RunUpdate
from .can_args import add_can_args, build_settings


logger = logging.getLogger(__name__)

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "stream_handler": {
            "class": "logging.StreamHandler",
            "formatter": "basic",
            "level": logging.DEBUG,
        },
    },
    "loggers": {
        "": {
            "handlers": ["stream_handler"],
            "level": logging.DEBUG,
        },
    },
}

UpdateDict = Dict[NodeId, TextIO]


async def run(args: argparse.Namespace) -> None:
    """Entry point for script."""
    retry_count = args.retry_count
    timeout_seconds = args.timeout_seconds
    erase = not args.no_erase

    update_dict = json.load(args.dict)
    update_details = {
        NodeId[node_id]: open(hex_file, "r")
        for node_id, hex_file in update_dict.items()
    }

    async with build.can_messenger(build_settings(args)) as messenger:
        updater = RunUpdate(
            messenger=messenger,
            update_details=update_details,
            retry_count=retry_count,
            timeout_seconds=timeout_seconds,
            erase=erase,
        )
        async for progress in updater.run_updates():
            logger.info(f"{progress[0]} is {progress[1][0]} and {progress[1][1]} done")

    logger.info("Done")


def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(description="FW Update.")
    add_can_args(parser)

    parser.add_argument(
        "--dict",
        help="Path to json file containing the dictionary of node ids and hex files to be updated.",
        type=argparse.FileType("r"),
        required=True,
    )
    parser.add_argument(
        "--retry-count",
        help="Number of times to retry bootloader detection.",
        type=int,
        default=3,
    )
    parser.add_argument(
        "--timeout-seconds", help="Number of seconds to wait.", type=float, default=10
    )
    parser.add_argument(
        "--no-erase",
        help="Don't erase existing application from flash.",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--less-logs",
        help="Set log level to INFO, so we see less logs.",
        action="store_true",
        default=False,
    )

    args = parser.parse_args()

    def _set_log_lvl_info(d: Dict[str, Any]) -> None:
        for k in d.keys():
            if isinstance(d[k], dict):
                _set_log_lvl_info(d[k])
            elif k == "level":
                d[k] = logging.INFO

    if args.less_logs:
        _set_log_lvl_info(LOG_CONFIG)
    dictConfig(LOG_CONFIG)

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
