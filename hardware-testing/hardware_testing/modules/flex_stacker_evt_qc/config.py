"""Config."""
from dataclasses import dataclass
import enum
from typing import Dict, Callable

from hardware_testing.data.csv_report import CSVReport, CSVSection

from . import (
    test_connectivity,
    test_z_axis,
    test_x_axis,
    test_l_axis,
    test_door_switch,
    test_estop,
)


class TestSection(enum.Enum):
    """Test Section."""

    CONNECTIVITY = "CONNECTIVITY"
    Z_AXIS = "Z_AXIS"
    L_AXIS = "L_AXIS"
    X_AXIS = "X_AXIS"
    DOOR_SWITCH = "DOOR_SWITCH"
    ESTOP = "ESTOP"


@dataclass
class TestConfig:
    """Test Config."""

    simulate: bool
    tests: Dict[TestSection, Callable]


TESTS = [
    (
        TestSection.CONNECTIVITY,
        test_connectivity.run,
    ),
    (
        TestSection.Z_AXIS,
        test_z_axis.run,
    ),
    (
        TestSection.X_AXIS,
        test_x_axis.run,
    ),
    (
        TestSection.L_AXIS,
        test_l_axis.run,
    ),
    (
        TestSection.ESTOP,
        test_estop.run,
    ),
    (
        TestSection.DOOR_SWITCH,
        test_door_switch.run,
    ),
]


def build_report(test_name: str) -> CSVReport:
    """Build report."""
    return CSVReport(
        test_name=test_name,
        sections=[
            CSVSection(
                title=TestSection.CONNECTIVITY.value,
                lines=test_connectivity.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.Z_AXIS.value,
                lines=test_z_axis.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.X_AXIS.value,
                lines=test_x_axis.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.L_AXIS.value,
                lines=test_l_axis.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.ESTOP.value,
                lines=test_estop.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.DOOR_SWITCH.value,
                lines=test_door_switch.build_csv_lines(),
            ),
        ],
    )
