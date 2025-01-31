"""Test Pressure."""
from asyncio import sleep
from typing import List, Union, Literal

from opentrons_hardware.firmware_bindings.constants import SensorId

from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.backends.ot3utils import sensor_id_for_instrument
from opentrons.hardware_control.types import InstrumentProbeType

from hardware_testing.data import ui
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import OT3Mount
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)

SECONDS_BETWEEN_READINGS = 0.25
NUM_PRESSURE_READINGS = 10
TIP_VOLUME = 50
ASPIRATE_VOLUME = 2
PRESSURE_READINGS = ["open-pa", "sealed-pa", "aspirate-pa", "dispense-pa"]

THRESHOLDS = {
    "open-pa": (
        -10,
        10,
    ),
    "sealed-pa": (
        -30,
        30,
    ),
    "aspirate-pa": (
        -600,
        -400,
    ),
    "dispense-pa": (
        2500,
        3500,
    ),
}


def _get_test_tag(probe: InstrumentProbeType, reading: str) -> str:
    assert reading in PRESSURE_READINGS, f"{reading} not in PRESSURE_READINGS"
    return f"{probe.name.lower()}-{reading}"


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = list()
    for p in InstrumentProbeType:
        for r in PRESSURE_READINGS:
            tag = _get_test_tag(p, r)
            lines.append(CSVLine(tag, [float, CSVResult]))
    return lines


async def _read_from_sensor(
    api: OT3API,
    sensor_id: SensorId,
    num_readings: int,
) -> float:
    readings: List[float] = []
    sequential_failures = 0
    while len(readings) != num_readings:
        try:
            r = await helpers_ot3.get_pressure_ot3(api, OT3Mount.LEFT, sensor_id)
            sequential_failures = 0
            readings.append(r)
            print(f"\t{r}")
            if not api.is_simulator:
                await sleep(SECONDS_BETWEEN_READINGS)
        except helpers_ot3.SensorResponseBad as e:
            sequential_failures += 1
            if sequential_failures == 3:
                raise e
            else:
                continue
    return sum(readings) / num_readings


def check_value(test_value: float, test_name: str) -> CSVResult:
    """Determine if value is within pass limits."""
    low_limit = THRESHOLDS[test_name][0]
    high_limit = THRESHOLDS[test_name][1]

    if low_limit < test_value and test_value < high_limit:
        return CSVResult.PASS
    else:
        return CSVResult.FAIL


async def run(
    api: OT3API, report: CSVReport, section: str, pipette: Literal[200, 1000]
) -> None:
    """Run."""
    await api.home_z(OT3Mount.LEFT)
    slot_5 = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    home_pos = await api.gantry_position(OT3Mount.LEFT)
    await api.move_to(OT3Mount.LEFT, slot_5._replace(z=home_pos.z))

    for probe in InstrumentProbeType:
        sensor_id = sensor_id_for_instrument(probe)
        ui.print_header(f"Sensor: {probe}")

        # OPEN-Pa
        open_pa = 0.0
        if not api.is_simulator:
            try:
                open_pa = await _read_from_sensor(api, sensor_id, NUM_PRESSURE_READINGS)
            except helpers_ot3.SensorResponseBad:
                ui.print_error(f"{probe} pressure sensor not working, skipping")
                continue
        print(f"open-pa: {open_pa}")
        open_result = check_value(open_pa, "open-pa")
        report(section, _get_test_tag(probe, "open-pa"), [open_pa, open_result])

        # SEALED-Pa
        sealed_pa = 0.0
        api.add_tip(OT3Mount.LEFT, helpers_ot3.get_default_tip_length(TIP_VOLUME))
        await api.prepare_for_aspirate(OT3Mount.LEFT)
        if not api.is_simulator:
            ui.get_user_ready(f"attach {TIP_VOLUME} uL TIP to {probe.name} sensor")
            ui.get_user_ready("SEAL tip using your FINGER")
            try:
                sealed_pa = await _read_from_sensor(
                    api, sensor_id, NUM_PRESSURE_READINGS
                )
            except helpers_ot3.SensorResponseBad:
                ui.print_error(f"{probe} pressure sensor not working, skipping")
                break
        print(f"sealed-pa: {sealed_pa}")
        sealed_result = check_value(sealed_pa, "sealed-pa")
        report(section, _get_test_tag(probe, "sealed-pa"), [sealed_pa, sealed_result])

        # ASPIRATE-Pa
        aspirate_pa = 0.0
        await api.aspirate(OT3Mount.LEFT, ASPIRATE_VOLUME)
        if not api.is_simulator:
            try:
                aspirate_pa = await _read_from_sensor(
                    api, sensor_id, NUM_PRESSURE_READINGS
                )
            except helpers_ot3.SensorResponseBad:
                ui.print_error(f"{probe} pressure sensor not working, skipping")
                break
        print(f"aspirate-pa: {aspirate_pa}")
        aspirate_result = check_value(aspirate_pa, "aspirate-pa")
        report(
            section, _get_test_tag(probe, "aspirate-pa"), [aspirate_pa, aspirate_result]
        )

        # DISPENSE-Pa
        dispense_pa = 0.0
        await api.dispense(OT3Mount.LEFT, ASPIRATE_VOLUME)
        if not api.is_simulator:
            try:
                dispense_pa = await _read_from_sensor(
                    api, sensor_id, NUM_PRESSURE_READINGS
                )
            except helpers_ot3.SensorResponseBad:
                ui.print_error(f"{probe} pressure sensor not working, skipping")
                break
        print(f"dispense-pa: {dispense_pa}")
        dispense_result = check_value(dispense_pa, "dispense-pa")
        report(
            section, _get_test_tag(probe, "dispense-pa"), [dispense_pa, dispense_result]
        )

        if not api.is_simulator:
            ui.get_user_ready("REMOVE tip")
        api.remove_tip(OT3Mount.LEFT)
