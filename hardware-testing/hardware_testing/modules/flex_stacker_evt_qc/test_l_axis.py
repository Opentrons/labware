"""Test L Axis."""
from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStacker, StackerAxis, Direction


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("trigger-latch-switch", [CSVResult]),
        CSVLine("release/open-latch", [CSVResult]),
        CSVLine("hold/close-latch", [CSVResult]),
    ]


def get_latch_held_switch(driver: FlexStacker) -> bool:
    """Get limit switch."""
    held_switch = driver.get_limit_switch(StackerAxis.L, Direction.RETRACT)
    print("(Held Switch triggered) : ", held_switch)
    return held_switch


def close_latch(driver: FlexStacker) -> None:
    """Close latch."""
    driver.move_to_limit_switch(StackerAxis.L, Direction.RETRACT)


def open_latch(driver: FlexStacker) -> None:
    """Open latch."""
    driver.move_in_mm(StackerAxis.L, 22)


def run(driver: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    if not get_latch_held_switch(driver):
        print("Switch is not triggered, try to trigger it by closing latch...")
        close_latch(driver)
        if not get_latch_held_switch(driver):
            print("!!! Held switch is still not triggered !!!")
            report(section, "trigger-latch-switch", [CSVResult.FAIL])
            return

    report(section, "trigger-latch-switch", [CSVResult.PASS])

    ui.print_header("Latch Release/Open")
    open_latch(driver)
    success = not get_latch_held_switch(driver)
    report(section, "release/open-latch", [CSVResult.from_bool(success)])

    ui.print_header("Latch Hold/Close")
    if not success:
        print("Latch must be open to close it")
        report(section, "hold/close-latch", [CSVResult.FAIL])
    else:
        close_latch(driver)
        success = get_latch_held_switch(driver)
        report(section, "hold/close-latch", [CSVResult.from_bool(success)])
