"""OT-3 Z-stage test."""
import argparse
import asyncio
from typing import List, Tuple, Dict, Union
from threading import Thread
from statistics import mean

from opentrons.hardware_control.ot3api import OT3API

from hardware_testing.opentrons_api.types import Axis, OT3Mount
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.data import ui

from hardware_testing.drivers.mark10.mark10_fg import Mark10, SimMark10

from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVSection,
    CSVLine,
    CSVLineRepeating,
)

from opentrons_shared_data.errors.exceptions import MoveConditionNotMetError
from opentrons.config.advanced_settings import get_adv_setting, set_adv_setting
from opentrons_shared_data.robot.types import RobotTypeEnum

import logging

LOG = logging.getLogger(__name__)
LOG.setLevel(logging.CRITICAL)

# Test Parameters
FORCE_SPEED = 10
FORCE_MARGIN = 15  # Percentage
FORCE_TEST_SETTINGS = [
    {"CURRENT": 0.15, "F_MAX": 50},
    {"CURRENT": 0.2, "F_MAX": 73},
    {"CURRENT": 0.3, "F_MAX": 120},
    {"CURRENT": 0.4, "F_MAX": 160},
    {"CURRENT": 0.5, "F_MAX": 200},
    {"CURRENT": 0.6, "F_MAX": 230},
    {"CURRENT": 0.7, "F_MAX": 260},
    {"CURRENT": 1.4, "F_MAX": 480},
    {"CURRENT": 1.5, "F_MAX": 520},
]
CYCLES_CURRENT = 5

TEST_PARAMETERS: Dict[str, float] = {
    "SPEED": FORCE_SPEED,
    "FORCE_MARGIN": FORCE_MARGIN,
    "CYCLES": CYCLES_CURRENT,
}
for i in FORCE_TEST_SETTINGS:
    TEST_PARAMETERS[str(i["CURRENT"])] = i["F_MAX"]


# Global variables
thread_sensor = False
force_output = []


def _connect_to_mark10_fixture(simulate: bool) -> Union[Mark10, SimMark10]:
    """Connect to the force Gauge."""
    if not simulate:
        fixture = Mark10.create(port="/dev/ttyUSB0")
    else:
        fixture = SimMark10()  # type: ignore[assignment]
    fixture.connect()
    LOG.info(fixture)
    return fixture


def _get_test_tag(current: float) -> str:
    """Get test tag for current data."""
    return f"current-{current}"


def build_test_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Builds the csvs lines for the data for a mount."""
    mount_data_line: List[Union[CSVLine, CSVLineRepeating]] = [
        CSVLine("TEST_CURRENTS", [str, str, str, str, str])
    ]
    for setting in FORCE_TEST_SETTINGS:
        mount_data_line.append(
            CSVLine(
                _get_test_tag(setting["CURRENT"]),
                [float, float, float, float, CSVResult],
            )
        )

    return mount_data_line


def _build_csv_report() -> CSVReport:
    """Build the CSVReport object to record data."""
    _report = CSVReport(
        test_name="z-stage-test-qc-ot3",
        sections=[
            CSVSection(
                title="TEST_PARAMETERS",
                lines=[CSVLine(parameter, [int]) for parameter in TEST_PARAMETERS],
            ),
            CSVSection(
                title=OT3Mount.LEFT.name,
                lines=build_test_lines(),
            ),
            CSVSection(
                title=OT3Mount.RIGHT.name,
                lines=build_test_lines(),
            ),
        ],
    )
    return _report


def _record_force(mark10: Mark10) -> None:
    """Record force in a separate thread."""
    global thread_sensor
    global force_output
    if mark10.is_simulator():
        force_output.append(0.0)  # to make it pass analysis
    try:
        while thread_sensor:
            force = mark10.read_force()
            force_output.append(force)
            # LOG.info(f"Force: {force}")
    except Exception as e:
        thread_sensor = False
        print(e)
    except KeyboardInterrupt:
        thread_sensor = False


def analyze_force(force_output: List) -> Tuple[bool, float, float]:
    """Analyze the Force output from the test to check for pass/fail."""
    # Only average forces higher than half of the max value
    LOG.debug(f"analyze_force: {force_output}")

    # Check for first 0 to ensure gauge is zeroed
    if not force_output[0] == 0.0:
        return (False, 0, 0)

    max_force = max(force_output)
    print(f"Max Force: {max_force}")

    # Check max >= to ensure we actually recorded a force
    if max_force <= 0:
        return (False, 0, 0)

    count = 0
    sum = 0.0
    for force in force_output:
        if force > max_force / 2:
            count += 1
            sum += force

    average_force = sum / count
    print(f"Average Force: {average_force}")

    return (True, max_force, average_force)


def check_force(
    mount: OT3Mount,
    current: float,
    report: CSVReport,
    average_forces: List,
    max_forces: List,
    avg_pass: float,
    max_pass: float,
) -> bool:
    """Check if the force is within the pass criteria."""
    average_force = round(mean(average_forces), 2)
    max_force = round(mean(max_forces), 2)
    average_force_range = round(max(average_forces) - min(average_forces), 2)
    max_force_range = round(max(max_forces) - min(max_forces), 2)
    LOG.info(f"mount: {mount}")
    LOG.info(f"current: {current}")
    LOG.info(f"max_force: {max_force}")
    LOG.info(f"max_force_range: {max_force_range}")
    LOG.info(f"average_force: {average_force}")
    LOG.info(f"average_force_range: {average_force_range}")

    qc_pass = False
    # Allow values within the FORCE_MARGIN percentage to pass
    LL = max_pass * (100 - FORCE_MARGIN) / 100
    UL = max_pass * (100 + FORCE_MARGIN) / 100
    if LL < max_force and max_force < UL:
        qc_pass = True
    else:
        qc_pass = False

    _tag = _get_test_tag(current)
    report(
        mount.name,
        _tag,
        [
            max_force,
            max_force_range,
            average_force,
            average_force_range,
            CSVResult.from_bool(qc_pass),
        ],
    )

    return qc_pass


async def _force_gauge(
    api: OT3API, mount: OT3Mount, report: CSVReport, simulate: bool
) -> bool:
    """Apply force to the gague and log."""
    global thread_sensor
    global force_output
    ui.print_header(f"Test Force - Mount {mount.name}")
    LOG.info("_force_gauge")
    mark10 = _connect_to_mark10_fixture(simulate)
    LOG.info("connected to mark 10")
    ui.print_header(f"Testing {mount.name} Mount")
    z_ax = Axis.by_mount(mount)
    LOG.info(f"Home Axis: {z_ax}")
    await api.home([z_ax])
    home_pos = await api.gantry_position(mount)
    LOG.info(f"Home Position: {home_pos}")
    pre_test_pos = home_pos._replace(z=home_pos.z - 15)
    LOG.info(f"Pre-Test Position: {pre_test_pos}")
    press_pos = home_pos._replace(z=pre_test_pos.z - 30)
    LOG.info(f"Press Position: {press_pos}")

    qc_pass = True
    report(
        mount.name,
        "TEST_CURRENTS",
        ["MAX", "MAX_RANGE", "AVERAGE", "AVERAGE_RANGE", "RESULT"],
    )
    # Test each current setting
    for test in FORCE_TEST_SETTINGS:
        # Test each current setting several times and average the results
        max_results = []
        avg_results = []
        test_current = test["CURRENT"]
        for i in range(CYCLES_CURRENT):
            # Move to just above force gauge
            await api.move_to(mount=mount, abs_position=pre_test_pos)

            ui.print_header(f"Cycle {i+1}: Testing Current = {test_current}")
            if mark10.is_simulator():
                mark10.set_simulation_force(test["F_MAX"])  # type: ignore[union-attr]
            TH = Thread(target=_record_force, args=(mark10,))
            thread_sensor = True
            force_output = []
            TH.start()
            try:
                async with api._backend.motor_current(
                    run_currents={z_ax: test_current}
                ):
                    await api.move_to(
                        mount=mount,
                        abs_position=press_pos,
                        speed=FORCE_SPEED,
                        expect_stalls=True,
                    )
            finally:
                thread_sensor = False
                TH.join()

            analyzed_valid, analyzed_max, analyzed_avg = analyze_force(force_output)

            if analyzed_valid:
                max_results.append(analyzed_max)
                avg_results.append(round(analyzed_avg, 1))
            else:
                ui.print_error(
                    "DATA INVALID - z-stage did not contact or guage not zeroed"
                )
                qc_pass = False
                break

            # we expect a stall has happened during pick up, so we want to
            # update the motor estimation
            await api._update_position_estimation([Axis.by_mount(mount)])
            await api.refresh_positions()

            await api.move_to(mount=mount, abs_position=pre_test_pos)

        LOG.info(f"max_results: {max_results}")
        LOG.info(f"avg_results: {avg_results}")
        if not avg_results or not max_results:
            res = False
        else:
            res = check_force(
                mount, test_current, report, avg_results, max_results, 0, test["F_MAX"]
            )
        if res:
            ui.print_header(f"CURRENT: {test_current} - PASS")
        else:
            ui.print_header(f"CURRENT: {test_current} - FAIL")
        qc_pass = qc_pass and res

    return qc_pass


async def _run(api: OT3API, arguments: argparse.Namespace, report: CSVReport) -> bool:
    """Run the test."""
    qc_pass = True

    if not arguments.skip_left:
        res = await _force_gauge(api, OT3Mount.LEFT, report, arguments.simulate)
        qc_pass = res and qc_pass

    if not arguments.skip_right:
        res = await _force_gauge(api, OT3Mount.RIGHT, report, arguments.simulate)
        qc_pass = res and qc_pass

    return qc_pass


async def _main(arguments: argparse.Namespace) -> None:
    """Main, z-stage test."""
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=arguments.simulate
    )
    await api.set_gantry_load(api.gantry_load)

    report = _build_csv_report()
    dut = helpers_ot3.DeviceUnderTest.OTHER
    helpers_ot3.set_csv_report_meta_data_ot3(api, report, dut=dut)

    for k, v in TEST_PARAMETERS.items():
        report("TEST_PARAMETERS", k, [v])

    # Attempt to home if first homing fails because of OT-3 in box Y axis issue
    try:
        await api.home(
            [
                Axis.X,
                Axis.Y,
                Axis.by_mount(OT3Mount.LEFT),
                Axis.by_mount(OT3Mount.RIGHT),
            ]
        )
    except MoveConditionNotMetError:
        await api.home(
            [
                Axis.X,
                Axis.Y,
                Axis.by_mount(OT3Mount.LEFT),
                Axis.by_mount(OT3Mount.RIGHT),
            ]
        )

    qc_pass = False

    try:
        qc_pass = await _run(api, arguments, report)
    except KeyboardInterrupt:
        print("Cancelled")
    except Exception as e:
        raise e
    finally:
        await api.clean_up()
        if qc_pass:
            ui.print_title("Test Done - PASSED")
        else:
            ui.print_title("Test Done - FAILED")
        report.save_to_disk()
        report.print_results()


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(description="OT3 Z_stage Test")
    arg_parser.add_argument("--simulate", action="store_true")
    arg_parser.add_argument("--skip_left", action="store_true")
    arg_parser.add_argument("--skip_right", action="store_true")
    old_stall_setting = get_adv_setting("disableStallDetection", RobotTypeEnum.FLEX)
    try:
        asyncio.run(set_adv_setting("disableStallDetection", True))
        asyncio.run(_main(arg_parser.parse_args()))
    finally:
        asyncio.run(
            set_adv_setting(
                "disableStallDetection",
                False if old_stall_setting is None else old_stall_setting.value,
            )
        )
