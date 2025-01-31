"""Utility functions for the Flex Stacker EVT QC module."""
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
)

from .driver import FlexStacker, StackerAxis, Direction, MoveParams


def test_limit_switches_per_direction(
    driver: FlexStacker,
    axis: StackerAxis,
    direction: Direction,
    report: CSVReport,
    section: str,
    speed: float = 10.0,
) -> None:
    """Sequence to test the limit switch for one direction."""
    ui.print_header(f"{axis} Limit Switch - {direction} direction")
    # first make sure switch is not already triggered by moving in the opposite direction
    if driver.get_limit_switch(axis, direction):
        print(f"{direction} switch already triggered, moving away...\n")
        SAFE_DISTANCE_MM = 10
        driver.move_in_mm(axis, direction.opposite().distance(SAFE_DISTANCE_MM))

    # move until the limit switch is reached
    print(f"moving towards {direction} limit switch...\n")
    driver.move_to_limit_switch(axis, direction, MoveParams(max_speed_discont=speed))
    result = driver.get_limit_switch(axis, direction)
    opposite_result = not driver.get_limit_switch(axis, direction.opposite())
    print(f"{direction} switch triggered: {result}")
    print(f"{direction.opposite()} switch untriggered: {opposite_result}")
    report(
        section,
        f"limit-switch-trigger-{direction}-untrigger-{direction.opposite()}",
        [result, opposite_result, CSVResult.from_bool(result and opposite_result)],
    )
