from enum import Enum


class LogIdentifier(str, Enum):
    """Identifier of the log"""

    api = "api.log"
    serial = "serial.log"
    can = "can_bus.log"
    server = "server.log"
    api_server = "combined_api_server.log"
    update_server = "update_server.log"
    touchscreen = "touchscreen.log"


class LogFormat(str, Enum):
    """Format to use for log records"""

    text = "text"
    json = "json"
