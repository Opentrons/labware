"""Test X Axis."""
from typing import List, Union
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVLine,
    CSVLineRepeating,
    CSVResult,
)

from .utils import test_limit_switches_per_direction
from .driver import FlexStacker, StackerAxis, Direction


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine(
            "limit-switch-trigger-positive-untrigger-negative", [bool, bool, CSVResult]
        ),
        CSVLine(
            "limit-switch-trigger-negative-untrigger-positive", [bool, bool, CSVResult]
        ),
        CSVLine(
            "platform-sensor-trigger-positive-untrigger-negative",
            [bool, bool, CSVResult],
        ),
        CSVLine(
            "platform-sensor-trigger-negative-untrigger-positive",
            [bool, bool, CSVResult],
        ),
    ]


def test_platform_sensors_for_direction(
    driver: FlexStacker, direction: Direction, report: CSVReport, section: str
) -> None:
    """Test platform sensors for a given direction."""
    ui.print_header(f"Platform Sensor - {direction} direction")
    sensor_result = driver.get_platform_sensor(direction)
    opposite_result = not driver.get_platform_sensor(direction.opposite())
    print(f"{direction} sensor triggered: {sensor_result}")
    print(f"{direction.opposite()} sensor untriggered: {opposite_result}")
    report(
        section,
        f"platform-sensor-trigger-{direction}-untrigger-{direction.opposite()}",
        [
            sensor_result,
            opposite_result,
            CSVResult.from_bool(sensor_result and opposite_result),
        ],
    )


def platform_is_removed(driver: FlexStacker) -> bool:
    """Check if the platform is removed from the carrier."""
    plus_side = driver.get_platform_sensor(Direction.EXTENT)
    minus_side = driver.get_platform_sensor(Direction.RETRACT)
    return not plus_side and not minus_side


def run(driver: FlexStacker, report: CSVReport, section: str) -> None:
    """Run."""
    if not driver._simulating and not platform_is_removed(driver):
        print("FAILURE - Cannot start tests with platform on the carrier")
        return

    test_limit_switches_per_direction(
        driver, StackerAxis.X, Direction.EXTENT, report, section
    )

    if not driver._simulating:
        ui.get_user_ready("Place the platform on the X carrier")

    test_platform_sensors_for_direction(driver, Direction.EXTENT, report, section)

    test_limit_switches_per_direction(
        driver, StackerAxis.X, Direction.RETRACT, report, section
    )

    test_platform_sensors_for_direction(driver, Direction.RETRACT, report, section)
