"""Test Door Switch."""


from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStacker


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("close-door", [CSVResult]),
        CSVLine("open-door", [CSVResult]),
    ]


def run(driver: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    ui.print_header("Close Door")
    if not driver._simulating:
        ui.get_user_ready("Close the hopper door")
    closed = driver.get_hopper_door_closed()
    report(section, "close-door", [CSVResult.from_bool(closed)])

    ui.print_header("Open Door")
    if not driver._simulating:
        ui.get_user_ready("Open the hopper door")
    closed = driver.get_hopper_door_closed()
    report(section, "open-door", [CSVResult.from_bool(not closed)])
