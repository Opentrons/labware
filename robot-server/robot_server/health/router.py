"""HTTP routes and handlers for /health endpoints."""
from dataclasses import dataclass
from fastapi import APIRouter, Depends, status
from typing import Annotated, Dict, cast
import logging
import json

from opentrons import __version__, config, protocol_api
from opentrons.hardware_control import HardwareControlAPI

from server_utils.util import call_once

from robot_server.hardware import get_hardware, get_robot_type
from robot_server.persistence.fastapi_dependencies import (
    get_sql_engine as ensure_sql_engine_is_ready,
)
from robot_server.service.legacy.models import V1BasicResponse

from opentrons_shared_data.robot.types import RobotType

from .models import Health, HealthLinks

_log = logging.getLogger(__name__)

OT2_LOG_PATHS = [
    "/logs/serial.log",
    "/logs/api.log",
    "/logs/server.log",
    "/logs/update_server.log",
]
FLEX_LOG_PATHS = [
    "/logs/serial.log",
    "/logs/can_bus.log",
    "/logs/api.log",
    "/logs/server.log",
    "/logs/update_server.log",
    "/logs/touchscreen.log",
]
VERSION_PATH = "/etc/VERSION.json"


@dataclass
class ComponentVersions:
    """Holds the versions of system components."""

    api_version: str
    system_version: str


@call_once
async def _get_version() -> Dict[str, str]:
    try:
        with open(VERSION_PATH, "r") as version_file:
            return cast(Dict[str, str], json.load(version_file))
    except FileNotFoundError:
        _log.warning(f"{VERSION_PATH} does not exist - is this a dev server?")
        return {}
    except OSError as ose:
        _log.warning(
            f"Could not open {VERSION_PATH}: {ose.errno}: {ose.strerror} - is this a dev server?"
        )
        return {}
    except json.JSONDecodeError as jde:
        _log.error(
            f"Could not parse {VERSION_PATH}: {jde.msg} at line {jde.lineno} col {jde.colno}"
        )
        return {}
    except Exception:
        _log.exception(f"Failed to read version from {VERSION_PATH}")
        return {}


def _get_config_system_version() -> str:
    return config.OT_SYSTEM_VERSION


def _get_api_version_dunder() -> str:
    return __version__


async def get_versions() -> ComponentVersions:
    """Dependency function for the versions of system components."""
    version_file = await _get_version()

    def _api_version_or_fallback() -> str:
        if "opentrons_api_version" in version_file:
            return version_file["opentrons_api_version"]
        version_dunder = _get_api_version_dunder()
        _log.warning(
            f"Could not find api version in VERSION, falling back to {version_dunder}"
        )
        return version_dunder

    def _system_version_or_fallback() -> str:
        if "buildroot_version" in version_file:
            return version_file["buildroot_version"]
        if "openembedded_version" in version_file:
            return version_file["openembedded_version"]
        config_version = _get_config_system_version()
        _log.warning(
            f"Could not find system version in VERSION, falling back to {config_version}"
        )
        return config_version

    return ComponentVersions(
        api_version=_api_version_or_fallback(),
        system_version=_system_version_or_fallback(),
    )


health_router = APIRouter()


@health_router.get(
    path="/health",
    summary="Get server health",
    status_code=status.HTTP_200_OK,
    response_model=Health,
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": V1BasicResponse,
            "description": "Robot motor controller is not ready",
        }
    },
    # response_model_exclude_none=True preserves behavior from older FastAPI and/or
    # Pydantic versions. It's unclear exactly what changed and why this is only
    # necessary for this endpoint in particular.
    response_model_exclude_none=True,
)
async def get_health(
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    # This endpoint doesn't actually need sql_engine. We use it in order to artificially
    # fail requests until the database has finished initializing. This plays into the
    # Opentrons App's current error handling. With a non-healthy /health, the app will
    # block off most of its robot details UI. This prevents the user from trying things
    # like viewing runs and uploading protocols, which would hit "database not ready"
    # errors that would present in a confusing way.
    sql_engine: Annotated[object, Depends(ensure_sql_engine_is_ready)],
    versions: Annotated[ComponentVersions, Depends(get_versions)],
    robot_type: Annotated[RobotType, Depends(get_robot_type)],
) -> Health:
    """Get information about the health of the robot server.

    Use the health endpoint to check that the robot server is running
    and ready to operate. A 200 OK response means the server is running.
    The response includes information about the software and system.
    """
    health_links = HealthLinks(
        apiLog="/logs/api.log",
        serialLog="/logs/serial.log",
        serverLog="/logs/server.log",
        apiSpec="/openapi.json",
        systemTime="/system/time",
    )

    if robot_type == "OT-3 Standard":
        minimum_protocol_api_version = protocol_api.MIN_SUPPORTED_VERSION_FOR_FLEX
        logs = FLEX_LOG_PATHS
        health_links.oddLog = "/logs/touchscreen.log"
    else:
        minimum_protocol_api_version = protocol_api.MIN_SUPPORTED_VERSION
        logs = OT2_LOG_PATHS

    return Health(
        name=config.name(),
        api_version=versions.api_version,
        fw_version=hardware.fw_version,
        board_revision=hardware.board_revision,
        logs=logs,
        system_version=versions.system_version,
        maximum_protocol_api_version=list(protocol_api.MAX_SUPPORTED_VERSION),
        minimum_protocol_api_version=list(minimum_protocol_api_version),
        robot_model=robot_type,
        links=health_links,
        robot_serial=(await hardware.get_serial_number()),
    )
