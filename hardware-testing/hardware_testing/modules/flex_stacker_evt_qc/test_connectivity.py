"""Test Connectivity."""
from typing import List, Union

from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStacker, HardwareRevision


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("usb-get-device-info", [str, str, str, CSVResult]),
        CSVLine("eeprom-set-serial-number", [str, str, CSVResult]),
        CSVLine("led-blinking", [bool, CSVResult]),
    ]


def test_gcode(driver: FlexStacker, report: CSVReport) -> None:
    """Send and receive response for GCODE M115."""
    success = True
    info = driver.get_device_info()
    print("Hardware Revision: ", info.hw, "\n")
    if info is None or info.hw != HardwareRevision.EVT:
        print("Hardware Revision must be EVT")
        success = False
    report(
        "CONNECTIVITY",
        "usb-get-device-info",
        [info.fw, info.hw, info.sn, CSVResult.from_bool(success)],
    )


def test_eeprom(driver: FlexStacker, report: CSVReport) -> None:
    """Set serial number and make sure device info is updated accordingly."""
    success = True
    if not driver._simulating:
        serial = input("enter Serial Number: ")
    else:
        serial = "STACKER-SIMULATOR-SN"
    driver.set_serial_number(serial)
    info = driver.get_device_info()
    if info.sn != serial:
        print("Serial number is not set properly")
        success = False
    report(
        "CONNECTIVITY",
        "eeprom-set-serial-number",
        [serial, info.sn, CSVResult.from_bool(success)],
    )


def test_leds(driver: FlexStacker, report: CSVReport) -> None:
    """Prompt tester to verify the status led is blinking."""
    if not driver._simulating:
        is_blinking = ui.get_user_answer("Is the status LED blinking?")
    else:
        is_blinking = True
    report(
        "CONNECTIVITY", "led-blinking", [is_blinking, CSVResult.from_bool(is_blinking)]
    )


def run(driver: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("USB Communication")
    test_gcode(driver, report)

    ui.print_header("EEPROM Communication")
    test_eeprom(driver, report)

    ui.print_header("LED Blinking")
    test_leds(driver, report)
