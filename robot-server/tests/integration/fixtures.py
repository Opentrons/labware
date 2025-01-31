"""Fixtures to be used by Tavern tests."""


from box import Box
from requests import Response
from opentrons.protocol_api import (
    MAX_SUPPORTED_VERSION,
    MIN_SUPPORTED_VERSION,
    MIN_SUPPORTED_VERSION_FOR_FLEX,
)
from opentrons import __version__, config
from opentrons_shared_data.module.types import ModuleModel


def check_health_response(response: Response) -> None:
    expected = {
        "name": "opentrons-dev",
        "api_version": __version__,
        "fw_version": "Virtual Smoothie",
        "board_revision": "2.1",
        "logs": [
            "/logs/serial.log",
            "/logs/api.log",
            "/logs/server.log",
            "/logs/update_server.log",
        ],
        "system_version": config.OT_SYSTEM_VERSION,
        "robot_model": "OT-2 Standard",
        "minimum_protocol_api_version": list(MIN_SUPPORTED_VERSION),
        "maximum_protocol_api_version": list(MAX_SUPPORTED_VERSION),
        "links": {
            "apiLog": "/logs/api.log",
            "serialLog": "/logs/serial.log",
            "apiSpec": "/openapi.json",
            "systemTime": "/system/time",
            "serverLog": "/logs/server.log",
        },
        "robot_serial": "simulator",
    }
    got = response.json()

    assert got == expected, f"health response failed:\n {got}"


def check_ot3_health_response(response: Response) -> None:
    expected = {
        "name": "opentrons-dev",
        "api_version": __version__,
        "fw_version": "0",
        "board_revision": "UNKNOWN",
        "logs": [
            "/logs/serial.log",
            "/logs/can_bus.log",
            "/logs/api.log",
            "/logs/server.log",
            "/logs/update_server.log",
            "/logs/touchscreen.log",
        ],
        "system_version": config.OT_SYSTEM_VERSION,
        "robot_model": "OT-3 Standard",
        "minimum_protocol_api_version": list(MIN_SUPPORTED_VERSION_FOR_FLEX),
        "maximum_protocol_api_version": list(MAX_SUPPORTED_VERSION),
        "links": {
            "apiLog": "/logs/api.log",
            "serialLog": "/logs/serial.log",
            "apiSpec": "/openapi.json",
            "oddLog": "/logs/touchscreen.log",
            "systemTime": "/system/time",
            "serverLog": "/logs/server.log",
        },
        "robot_serial": "simulator",
    }
    got = response.json()

    assert got == expected, f"health response failed:\n {got}"


def get_module_id(response: Response, module_model: ModuleModel) -> Box:
    """Get the first module id that matches module_model."""
    modules = response.json()["data"]
    # assuming dev robot does not have multiples of a module
    id = next(
        module["id"] for module in modules if module["moduleModel"] == module_model
    )
    return Box({f"{module_model}_id": id})
