"""An emulation of the opentrons heater shaker module.

The purpose is to provide a fake backend that responds to GCODE commands.
"""
import logging
from time import sleep
from typing import (
    Optional,
)

from opentrons.drivers.heater_shaker.driver import (
    GCODE,
    HS_ACK,
)
from opentrons.hardware_control.emulation.parser import Parser, Command
from opentrons.hardware_control.emulation.settings import HeaterShakerSettings
from . import util

from .abstract_emulator import AbstractEmulator
from .simulations import (
    Temperature,
    RPM,
)
from .util import TEMPERATURE_ROOM
from ...drivers.types import HeaterShakerLabwareLatchStatus

logger = logging.getLogger(__name__)


class HeaterShakerEmulator(AbstractEmulator):
    """Heater Shaker emulator"""

    _temperature: Temperature
    _rpm: RPM
    _latch_status: HeaterShakerLabwareLatchStatus

    def __init__(self, parser: Parser, settings: HeaterShakerSettings) -> None:
        self._parser = parser
        self._settings = settings
        self._gcode_to_function_mapping = {
            GCODE.SET_RPM.value: self._set_rpm,
            GCODE.GET_RPM.value: self._get_rpm,
            GCODE.SET_TEMPERATURE.value: self._set_temp,
            GCODE.GET_TEMPERATURE.value: self._get_temp,
            GCODE.HOME.value: self._home,
            GCODE.ENTER_BOOTLOADER.value: self._enter_bootloader,
            GCODE.GET_VERSION.value: self._get_version,
            GCODE.GET_RESET_REASON.value: self._get_reset_reason,
            GCODE.OPEN_LABWARE_LATCH.value: self._open_labware_latch,
            GCODE.CLOSE_LABWARE_LATCH.value: self._close_labware_latch,
            GCODE.GET_LABWARE_LATCH_STATE.value: self._get_labware_latch_state,
            GCODE.DEACTIVATE_HEATER.value: self._deactivate_heater,
        }
        self.reset()

    def handle(self, line: str) -> Optional[str]:
        """Handle a line"""
        results = (self._handle(c) for c in self._parser.parse(line))
        joined = " ".join(r for r in results if r)
        return None if not joined else joined

    def reset(self) -> None:

        self._temperature = Temperature(
            per_tick=self._settings.temperature.degrees_per_tick,
            current=self._settings.temperature.starting,
        )
        self._rpm = RPM(
            per_tick=self._settings.rpm.rpm_per_tick,
            current=self._settings.rpm.starting,
        )
        self._rpm.set_target(0.0)
        self._latch_status = HeaterShakerLabwareLatchStatus.IDLE_OPEN

    def _handle(self, command: Command) -> Optional[str]:
        """
        Handle a command.

        TODO: AL 20210218 create dispatch map and remove 'noqa(C901)'
        """
        logger.info(f"Got command {command}")
        func_to_run = self._gcode_to_function_mapping.get(command.gcode)
        res = None if func_to_run is None else func_to_run(command)
        return None if not isinstance(res, str) else f"{res} {HS_ACK}"

    def _set_rpm(self, command: Command) -> str:
        value = command.params["S"]
        assert isinstance(value, float), f"invalid value '{value}'"
        self._rpm.set_target(value)
        return "M3"

    def _get_rpm(self, command: Command) -> str:
        res = (
            f"M123 C:{self._rpm.current} "
            f"T:{self._rpm.target if self._rpm.target is not None else 0}"
        )
        self._rpm.tick()
        return res

    def _set_temp(self, command: Command) -> str:
        value = command.params["S"]
        assert isinstance(value, float), f"invalid value '{value}'"
        self._temperature.set_target(value)
        return "M104"

    def _get_temp(self, command: Command) -> str:
        res = (
            f"M105 C:{self._temperature.current} "
            f"T:{util.OptionalValue(self._temperature.target)}"
        )
        self._temperature.tick()
        return res

    def _home(self, command: Command) -> str:
        sleep(self._settings.home_delay_time)
        self._rpm.deactivate(0.0)
        self._rpm.set_target(0.0)
        return "G28"

    def _enter_bootloader(self, command: Command) -> None:
        pass

    def _get_version(self, command: Command) -> str:
        return (
            f"FW:{self._settings.version} "
            f"HW:{self._settings.model} "
            f"SerialNo:{self._settings.serial_number}"
        )

    def _get_reset_reason(self, command: Command) -> str:
        return "M114 Last Reset Reason: 01"

    def _open_labware_latch(self, command: Command) -> str:
        self._latch_status = HeaterShakerLabwareLatchStatus.IDLE_OPEN
        return "M242"

    def _close_labware_latch(self, command: Command) -> str:
        self._latch_status = HeaterShakerLabwareLatchStatus.IDLE_CLOSED
        return "M243"

    def _get_labware_latch_state(self, command: Command) -> str:
        return f"M241 STATUS:{self._latch_status.value.upper()}"

    def _deactivate_heater(self, command: Command) -> str:
        self._temperature.deactivate(TEMPERATURE_ROOM)
        return "M106"

    @staticmethod
    def get_terminator() -> bytes:
        return b"\n"
