"""A script for sending and receiving data from sensors on the OT3."""
import os
import logging
import asyncio
import argparse

from typing import Callable
from logging.config import dictConfig
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    SetupRequest,
    DisableMotorRequest,
)
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.constants import NodeId
from opentrons_hardware.scripts.can_args import add_can_args, build_settings
from opentrons_hardware.drivers.can_bus.build import build_driver
from opentrons_hardware.hardware_control.gripper_settings import (
    set_pwm_param,
    set_reference_voltage,
    grip,
    home,
)

GetInputFunc = Callable[[str], str]
OutputFunc = Callable[[str], None]


class InvalidInput(Exception):
    """Invalid input exception."""

    pass


def prompt_int_input(prompt_name: str) -> int:
    """Configure int intput."""
    try:
        return int(input(f"{prompt_name}: "))
    except (ValueError, IndexError) as e:
        raise InvalidInput(e)


def prompt_float_input(prompt_name: str) -> float:
    """Configure float intput."""
    try:
        return float(input(f"{prompt_name}: "))
    except ValueError as e:
        raise InvalidInput(e)


def in_green(s: str) -> str:
    """Return string formatted in red."""
    return f"\033[92m{str(s)}\033[0m"


async def run(args: argparse.Namespace) -> None:
    """Entry point for script."""
    os.system("cls")
    os.system("clear")

    print("Gripper testing beings... \n")
    print("Hints: \033[96mdefaults values\033[0m \n")
    v_ref = prompt_float_input(
        "Set reference voltage in A (float, \033[96m0.5A\033[0m)"
    )
    pwm_freq = prompt_int_input("Set PWM frequency in Hz (int, \033[96m32000Hz\033[0m)")

    driver = await build_driver(build_settings(args))
    messenger = CanMessenger(driver=driver)
    messenger.start()

    try:
        await messenger.send(node_id=NodeId.gripper, message=SetupRequest())
        await set_reference_voltage(messenger, v_ref)

        while True:
            duty = prompt_int_input("\nDuty cycle in % (int)")
            await set_pwm_param(messenger, pwm_freq, duty)
            print(f"\n\033[95m{duty}%\033[0m")
            print("--------")

            input(in_green("Press Enter to grip...\n"))

            await grip(messenger)

            input(in_green("Press Enter to release...\n"))

            await home(messenger)

    except asyncio.CancelledError:
        pass
    finally:
        print("\nTesting finishes...\n")
        await messenger.send(node_id=NodeId.gripper, message=DisableMotorRequest())
        await messenger.stop()
        driver.shutdown()


log = logging.getLogger(__name__)

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "file_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "basic",
            "filename": "gripper.log",
            "maxBytes": 5000000,
            "level": logging.INFO,
            "backupCount": 3,
        },
    },
    "loggers": {
        "": {
            "handlers": ["file_handler"],
            "level": logging.INFO,
        },
    },
}


def main() -> None:
    """Entry point."""
    dictConfig(LOG_CONFIG)

    parser = argparse.ArgumentParser(description="Gripper testing script.")
    add_can_args(parser)

    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
