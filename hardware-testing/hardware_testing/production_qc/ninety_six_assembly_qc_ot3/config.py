"""Config."""
from dataclasses import dataclass
import enum
from typing import Dict, Callable, Literal

from hardware_testing.data.csv_report import CSVReport, CSVSection

from . import (
    test_plunger,
    test_jaws,
    test_capacitance,
    test_pressure,
    test_environmental_sensor,
    test_tip_sensor,
    test_droplets,
)


class TestSection(enum.Enum):
    """Test Section."""

    PLUNGER = "PLUNGER"
    JAWS = "JAWS"
    CAPACITANCE = "CAPACITANCE"
    PRESSURE = "PRESSURE"
    ENVIRONMENT_SENSOR = "ENVIRONMENT-SENSOR"
    TIP_SENSOR = "TIP-SENSOR"
    DROPLETS = "DROPLETS"


@dataclass
class TestConfig:
    """Test Config."""

    simulate: bool
    tests: Dict[TestSection, Callable]
    pipette: Literal[200, 1000]


TESTS = [
    (
        TestSection.PLUNGER,
        test_plunger.run,
    ),
    (
        TestSection.JAWS,
        test_jaws.run,
    ),
    (
        TestSection.CAPACITANCE,
        test_capacitance.run,
    ),
    (
        TestSection.PRESSURE,
        test_pressure.run,
    ),
    (
        TestSection.ENVIRONMENT_SENSOR,
        test_environmental_sensor.run,
    ),
    (
        TestSection.TIP_SENSOR,
        test_tip_sensor.run,
    ),
    (
        TestSection.DROPLETS,
        test_droplets.run,
    ),
]


def build_report(test_name: str) -> CSVReport:
    """Build report."""
    return CSVReport(
        test_name=test_name,
        sections=[
            CSVSection(
                title=TestSection.PLUNGER.value, lines=test_plunger.build_csv_lines()
            ),
            CSVSection(title=TestSection.JAWS.value, lines=test_jaws.build_csv_lines()),
            CSVSection(
                title=TestSection.CAPACITANCE.value,
                lines=test_capacitance.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.PRESSURE.value, lines=test_pressure.build_csv_lines()
            ),
            CSVSection(
                title=TestSection.ENVIRONMENT_SENSOR.value,
                lines=test_environmental_sensor.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.TIP_SENSOR.value,
                lines=test_tip_sensor.build_csv_lines(),
            ),
            CSVSection(
                title=TestSection.DROPLETS.value, lines=test_droplets.build_csv_lines()
            ),
        ],
    )
