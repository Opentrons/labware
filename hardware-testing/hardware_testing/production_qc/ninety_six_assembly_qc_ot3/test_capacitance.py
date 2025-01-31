"""Test Capacitance."""
from asyncio import sleep
from typing import List, Union, Tuple, Optional, cast, Literal

from opentrons_hardware.hardware_control.tool_sensors import capacitive_probe
from opentrons_hardware.firmware_bindings.constants import NodeId, SensorId

from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.backends.ot3utils import sensor_id_for_instrument
from opentrons.hardware_control.backends.ot3controller import OT3Controller
from opentrons.hardware_control.types import InstrumentProbeType


from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)

from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import Axis, OT3Mount, Point


TEST_SLOT = 8
PROBE_PREP_HEIGHT_MM = 5
PROBE_MAX_OVERRUN = 5
PROBE_POS_OFFSET = Point(13, 13, 0)

PROBE_READINGS = ["air-pf", "attached-pf", "deck-pf", "deck-mm"]

THRESHOLDS = {
    "air-pf": (
        4.0,
        10.0,
    ),
    "attached-pf": (
        5.0,
        12.0,
    ),
    "deck-pf": (
        10.0,
        25.0,
    ),
}


def _get_test_tag(probe: InstrumentProbeType, reading: str) -> str:
    return f"{probe.name.lower()}-{reading}"


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = list()
    for p in InstrumentProbeType:
        for r in PROBE_READINGS:
            lines.append(CSVLine(_get_test_tag(p, r), [float, CSVResult]))
            if "mm" in r:
                continue
            lines.append(CSVLine(_get_test_tag(p, r + "-min"), [float]))
            lines.append(CSVLine(_get_test_tag(p, r + "-max"), [float]))
    return lines


async def _read_from_sensor(
    api: OT3API,
    sensor_id: SensorId,
    num_readings: int = 10,
) -> Optional[float]:
    readings: List[float] = []
    sequential_failures = 0

    def _check_if_ok(result: Optional[float]) -> None:
        nonlocal sequential_failures
        if result is None:
            sequential_failures += 1
            if sequential_failures == 3:
                return None
        else:
            sequential_failures = 0

    while len(readings) != num_readings:
        r = await helpers_ot3.get_capacitance_ot3(api, OT3Mount.LEFT, sensor_id)
        _check_if_ok(r)  # raises error after 3x failures in a row
        readings.append(r)  # type: ignore[arg-type]
        print(f"\t{r}")
        if not api.is_simulator:
            await sleep(0.2)
    return sum(readings) / num_readings


def _get_hover_and_probe_pos(
    api: OT3API, probe: InstrumentProbeType
) -> Tuple[Point, Point]:
    # FIXME: remove this once OT3API supports probing with secondary/front channels
    probe_pos = helpers_ot3.get_slot_calibration_square_position_ot3(TEST_SLOT)
    probe_pos += PROBE_POS_OFFSET
    hover_pos = probe_pos._replace(z=api.get_instrument_max_height(OT3Mount.LEFT))
    if probe == InstrumentProbeType.SECONDARY:
        probe_offset = Point(x=9 * -11, y=9 * 7)
    else:
        probe_offset = Point()
    return hover_pos + probe_offset, probe_pos + probe_offset


async def run(
    api: OT3API, report: CSVReport, section: str, pipette: Literal[200, 1000]
) -> None:
    """Run."""
    z_ax = Axis.Z_L
    p_ax = Axis.P_L
    t_ax = Axis.Q

    default_probe_cfg = api.config.calibration.z_offset.pass_settings
    await api.reset_instrument_offset(OT3Mount.LEFT)

    if not api.is_simulator:
        ui.get_user_ready("REMOVE everything from the deck")

    for probe in InstrumentProbeType:
        # store the thresolds (for reference)
        for k in THRESHOLDS.keys():
            report(section, _get_test_tag(probe, f"{k}-min"), [THRESHOLDS[k][0]])
            report(section, _get_test_tag(probe, f"{k}-max"), [THRESHOLDS[k][1]])

        hover_pos, probe_pos = _get_hover_and_probe_pos(api, probe)
        sensor_id = sensor_id_for_instrument(probe)
        ui.print_header(f"Probe: {probe}")
        print("homing...")
        await api.home([z_ax, p_ax, t_ax])
        await helpers_ot3.move_to_arched_ot3(api, OT3Mount.LEFT, hover_pos)

        # AIR-pF
        air_pf = await _read_from_sensor(api, sensor_id, 10)
        if not air_pf:
            ui.print_error(f"{probe} cap sensor not working, skipping")
            continue
        print(f"air-pf: {air_pf}")
        air_passed = THRESHOLDS["air-pf"][0] <= air_pf <= THRESHOLDS["air-pf"][1]
        report(
            section,
            _get_test_tag(probe, "air-pf"),
            [air_pf, CSVResult.from_bool(air_passed)],
        )

        # ATTACHED-pF
        if not api.is_simulator:
            ui.get_user_ready(f"ATTACH probe to {probe.name} channel")
        api.add_tip(OT3Mount.LEFT, api.config.calibration.probe_length)
        attached_pf = await _read_from_sensor(api, sensor_id, 10)
        if not attached_pf:
            ui.print_error(f"{probe} cap sensor not working, skipping")
            continue
        print(f"attached-pf: {attached_pf}")
        attached_passed = (
            THRESHOLDS["attached-pf"][0] <= attached_pf <= THRESHOLDS["attached-pf"][1]
        )
        attached_passed = attached_passed if attached_pf > air_pf else False
        report(
            section,
            _get_test_tag(probe, "attached-pf"),
            [attached_pf, CSVResult.from_bool(attached_passed)],
        )

        if not air_passed or not attached_passed:
            continue

        # DECK-mm
        async def _probe(distance: float, speed: float) -> float:
            if api.is_simulator:
                return 0.0
            pos = await capacitive_probe(
                cast(OT3Controller, api._backend)._messenger,
                NodeId.pipette_left,
                NodeId.head_l,
                distance=distance,
                mount_speed=speed,
                sensor_id=sensor_id,
                relative_threshold_pf=default_probe_cfg.sensor_threshold_pf,
            )
            return pos.motor_position

        if not api.is_simulator:
            ui.get_user_ready("about to probe the DECK")
        # move to 5 mm above the deck
        await api.home_z(OT3Mount.LEFT)
        current_pos = await api.gantry_position(OT3Mount.LEFT)
        await api.move_to(OT3Mount.LEFT, probe_pos._replace(z=current_pos.z))
        await api.move_to(OT3Mount.LEFT, probe_pos._replace(z=PROBE_PREP_HEIGHT_MM))
        z_ax = Axis.by_mount(OT3Mount.LEFT)
        # NOTE: currently there's an issue where the 1st time an instrument
        #       probes, it won't trigger when contacting the deck. However all
        #       following probes work fine. So, here we do a "fake" probe
        #       in case this instrument was just turned on
        await _probe(distance=0.5, speed=5)
        await _probe(distance=-0.5, speed=5)
        await _probe(
            distance=PROBE_MAX_OVERRUN + PROBE_PREP_HEIGHT_MM,
            speed=default_probe_cfg.speed_mm_per_s,
        )
        await api.refresh_positions()
        found_pos = await api.gantry_position(OT3Mount.LEFT)
        deck_mm_relative = found_pos.z - (PROBE_MAX_OVERRUN * -1.0)
        deck_mm_is_valid = deck_mm_relative >= 0.001
        print(f"deck-mm: {deck_mm_relative} ({deck_mm_is_valid})")
        report(
            section,
            _get_test_tag(probe, "deck-mm"),
            [deck_mm_relative, CSVResult.from_bool(deck_mm_is_valid)],
        )

        # DECK-pF
        if deck_mm_is_valid:
            await api.move_to(OT3Mount.LEFT, probe_pos._replace(z=found_pos.z))
            deck_pf = await _read_from_sensor(api, sensor_id, 10)
            if not deck_pf:
                ui.print_error(f"{probe} cap sensor not working, skipping")
                continue
            print(f"deck-pf: {deck_pf}")
            passed = THRESHOLDS["deck-pf"][0] <= deck_pf <= THRESHOLDS["deck-pf"][1]
            passed = passed if deck_pf > attached_pf else False
            report(
                section,
                _get_test_tag(probe, "deck-pf"),
                [deck_pf, CSVResult.from_bool(passed)],
            )
        else:
            print("skipping deck-pf")

        await api.home_z(OT3Mount.LEFT)
        if not api.is_simulator:
            ui.get_user_ready("REMOVE probe")
        api.remove_tip(OT3Mount.LEFT)
