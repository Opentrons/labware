"""Test E-Stop."""


from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .driver import FlexStacker, Direction, StackerAxis


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("trigger-estop", [CSVResult]),
        CSVLine("x-move-disabled", [CSVResult]),
        CSVLine("z-move-disabled", [CSVResult]),
        CSVLine("l-move-disabled", [CSVResult]),
        CSVLine("untrigger-estop", [CSVResult]),
    ]


def axis_at_limit(driver: FlexStacker, axis: StackerAxis) -> Direction:
    """Check which direction an axis is at the limit switch."""
    if axis is StackerAxis.L:
        # L axis only has one limit switch
        if driver.get_limit_switch(axis, Direction.RETRACT):
            print(axis, "is at ", Direction.RETRACT, "limit switch")
            return Direction.RETRACT
    else:
        for dir in Direction:
            if driver.get_limit_switch(axis, dir):
                print(axis, "is at ", dir, "limit switch")
                return dir
    raise RuntimeError(f"{axis} is not at any limit switch")


def run(driver: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    x_limit = axis_at_limit(driver, StackerAxis.X)
    z_limit = axis_at_limit(driver, StackerAxis.Z)
    l_limit = axis_at_limit(driver, StackerAxis.L)

    ui.print_header("Trigger E-Stop")
    if not driver._simulating:
        ui.get_user_ready("Trigger the E-Stop")

        if not driver.get_estop():
            print("E-Stop is not triggered")
            report(section, "trigger-estop", [CSVResult.FAIL])
            return

    report(section, "trigger-estop", [CSVResult.PASS])

    print("Check X limit switch...")
    limit_switch_triggered = driver.get_limit_switch(StackerAxis.X, x_limit)
    if limit_switch_triggered:
        report(
            section,
            "x-move-disabled",
            [CSVResult.from_bool(False)],
        )
    else:
        print("try to move X axis back to the limit switch...")
        driver.move_in_mm(StackerAxis.X, x_limit.distance(3))
        print("X should not move")
        report(
            section,
            "x-move-disabled",
            [CSVResult.from_bool(not driver.get_limit_switch(StackerAxis.X, x_limit))],
        )

    print("try to move Z axis...")
    driver.move_in_mm(StackerAxis.Z, z_limit.opposite().distance(10))
    print("Z should not move")
    report(
        section,
        "z-move-disabled",
        [CSVResult.from_bool(driver.get_limit_switch(StackerAxis.Z, z_limit))],
    )

    print("Check L limit switch...")
    limit_switch_triggered = driver.get_limit_switch(StackerAxis.L, l_limit)
    if limit_switch_triggered:
        report(
            section,
            "l-move-disabled",
            [CSVResult.from_bool(False)],
        )
    else:
        print("try to move L axis back to the limit switch...")
        driver.move_in_mm(StackerAxis.L, l_limit.distance(1))
        print("L should not move")
        report(
            section,
            "l-move-disabled",
            [CSVResult.from_bool(not driver.get_limit_switch(StackerAxis.L, l_limit))],
        )

    if not driver._simulating:
        ui.get_user_ready("Untrigger the E-Stop")
    report(section, "untrigger-estop", [CSVResult.from_bool(not driver.get_estop())])
