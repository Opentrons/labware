import logging
from logging.config import dictConfig
import sys
from typing import Any, Dict

from opentrons.config import CONFIG, ARCHITECTURE, SystemArchitecture

if ARCHITECTURE is SystemArchitecture.YOCTO:
    from opentrons_hardware.sensors import SENSOR_LOG_NAME
else:
    # we don't use the sensor log on ot2 or host
    SENSOR_LOG_NAME = "unused"


def _host_config(level_value: int) -> Dict[str, Any]:
    serial_log_filename = CONFIG["serial_log_file"]
    api_log_filename = CONFIG["api_log_file"]
    sensor_log_filename = CONFIG["sensor_log_file"]
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "basic": {
                "format": (
                    "%(asctime)s %(name)s %(levelname)s [Line %(lineno)s] %(message)s"
                )
            }
        },
        "handlers": {
            "debug": {
                "class": "logging.StreamHandler",
                "formatter": "basic",
                "level": level_value,
            },
            "serial": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "basic",
                "filename": serial_log_filename,
                "maxBytes": 1000000,
                "level": logging.DEBUG,
                "backupCount": 3,
            },
            "api": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "basic",
                "filename": api_log_filename,
                "maxBytes": 1000000,
                "level": logging.DEBUG,
                "backupCount": 5,
            },
            "sensor": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "basic",
                "filename": sensor_log_filename,
                "maxBytes": 1000000,
                "level": logging.DEBUG,
                "backupCount": 5,
            },
        },
        "loggers": {
            "opentrons": {
                "handlers": ["debug", "api"],
                "level": level_value,
            },
            "opentrons.deck_calibration": {
                "handlers": ["debug", "api"],
                "level": level_value,
            },
            "opentrons.drivers.asyncio.communication.serial_connection": {
                "handlers": ["serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "opentrons_hardware.drivers.can_bus.can_messenger": {
                "handlers": ["serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "opentrons_hardware.drivers.binary_usb.bin_serial": {
                "handlers": ["serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            SENSOR_LOG_NAME: {
                "handlers": ["sensor"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "__main__": {"handlers": ["api"], "level": level_value},
        },
    }


def _buildroot_config(level_value: int) -> Dict[str, Any]:
    # Import systemd.journald here since it is generally unavailble on non
    # linux systems and we probably don't want to use it on linux desktops
    # either
    sensor_log_filename = CONFIG["sensor_log_file"]
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "message_only": {"format": "%(message)s"},
        },
        "handlers": {
            "api": {
                "class": "systemd.journal.JournalHandler",
                "level": logging.DEBUG,
                "formatter": "message_only",
                "SYSLOG_IDENTIFIER": "opentrons-api",
            },
            "serial": {
                "class": "systemd.journal.JournalHandler",
                "level": logging.DEBUG,
                "formatter": "message_only",
                "SYSLOG_IDENTIFIER": "opentrons-api-serial",
            },
            "can_serial": {
                "class": "systemd.journal.JournalHandler",
                "level": logging.DEBUG,
                "formatter": "message_only",
                "SYSLOG_IDENTIFIER": "opentrons-api-serial-can",
            },
            "usbbin_serial": {
                "class": "systemd.journal.JournalHandler",
                "level": logging.DEBUG,
                "formatter": "message_only",
                "SYSLOG_IDENTIFIER": "opentrons-api-serial-usbbin",
            },
            "sensor": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "message_only",
                "filename": sensor_log_filename,
                "maxBytes": 1000000,
                "level": logging.DEBUG,
                "backupCount": 3,
            },
        },
        "loggers": {
            "opentrons.drivers.asyncio.communication.serial_connection": {
                "handlers": ["serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "opentrons": {
                "handlers": ["api"],
                "level": level_value,
            },
            "opentrons_hardware": {
                "handlers": ["api"],
                "level": level_value,
            },
            "opentrons_hardware.drivers.can_bus.can_messenger": {
                "handlers": ["can_serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "opentrons_hardware.drivers.binary_usb.bin_serial": {
                "handlers": ["usbbin_serial"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            SENSOR_LOG_NAME: {
                "handlers": ["sensor"],
                "level": logging.DEBUG,
                "propagate": False,
            },
            "__main__": {"handlers": ["api"], "level": level_value},
        },
    }


def _config(arch: SystemArchitecture, level_value: int) -> Dict[str, Any]:
    return {
        SystemArchitecture.YOCTO: _buildroot_config,
        SystemArchitecture.BUILDROOT: _buildroot_config,
        SystemArchitecture.HOST: _host_config,
    }[arch](level_value)


def log_init(level_name: str) -> None:
    """
    Function that sets log levels and format strings. Checks for the
    OT_API_LOG_LEVEL environment variable otherwise defaults to INFO
    """
    fallback_log_level = "INFO"
    ot_log_level = level_name.upper()
    if ot_log_level not in logging._nameToLevel:
        sys.stderr.write(
            f"OT Log Level {ot_log_level} not found. "
            f"Defaulting to {fallback_log_level}\n"
        )
        ot_log_level = fallback_log_level
    level_value = logging._nameToLevel[ot_log_level]
    logging_config = _config(ARCHITECTURE, level_value)
    dictConfig(logging_config)
