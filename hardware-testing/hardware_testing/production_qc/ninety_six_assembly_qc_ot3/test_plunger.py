"""Test Plunger."""
from typing import List, Union, Tuple, Dict, Literal

from opentrons.hardware_control.ot3api import OT3API

from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import Axis, OT3Mount

PLUNGER_MAX_SKIP_MM = 0.1
SPEEDS_TO_TEST: List[float] = [5, 15, 22]
CURRENTS_SPEEDS: Dict[float, List[float]] = {
    0.6: SPEEDS_TO_TEST,
    0.7: SPEEDS_TO_TEST,
    0.8: SPEEDS_TO_TEST,
}


def _get_test_tag(
    current: float, speed: float, direction: str, start_or_end: str
) -> str:
    return f"current-{current}-speed-{speed}-{direction}-{start_or_end}"


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = list()
    currents = list(CURRENTS_SPEEDS.keys())
    for current in sorted(currents):
        speeds = CURRENTS_SPEEDS[current]
        for speed in sorted(speeds):
            for dir in ["down", "up"]:
                for step in ["start", "end"]:
                    tag = _get_test_tag(current, speed, dir, step)
                    lines.append(CSVLine(tag, [float, float, CSVResult]))
    return lines


async def _is_plunger_still_aligned_with_encoder(
    api: OT3API,
) -> Tuple[float, float, bool]:
    enc_pos = await api.encoder_current_position_ot3(OT3Mount.LEFT)
    motor_pos = await api.current_position_ot3(OT3Mount.LEFT)
    p_enc = enc_pos[Axis.P_L]
    p_est = motor_pos[Axis.P_L]
    is_aligned = abs(p_est - p_enc) < PLUNGER_MAX_SKIP_MM
    return p_enc, p_est, is_aligned


async def run(
    api: OT3API, report: CSVReport, section: str, pipette: Literal[200, 1000]
) -> None:
    """Run."""
    ax = Axis.P_L
    mount = OT3Mount.LEFT
    settings = helpers_ot3.get_gantry_load_per_axis_motion_settings_ot3(api, ax)
    default_current = settings.run_current
    default_speed = settings.max_speed
    _, _, blow_out, _ = helpers_ot3.get_plunger_positions_ot3(api, mount)

    async def _save_result(tag: str) -> bool:
        est, enc, aligned = await _is_plunger_still_aligned_with_encoder(api)
        print(f"Estimate: {est}")
        print(f"Encoder: {enc}")
        result = CSVResult.from_bool(aligned)
        report(section, tag, [est, enc, result])
        return aligned

    await api.home_z(OT3Mount.LEFT)
    slot_5 = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    home_pos = await api.gantry_position(OT3Mount.LEFT)
    await api.move_to(OT3Mount.LEFT, slot_5._replace(z=home_pos.z))

    # LOOP THROUGH CURRENTS + SPEEDS
    currents = list(CURRENTS_SPEEDS.keys())
    for current in sorted(currents, reverse=True):
        speeds = CURRENTS_SPEEDS[current]
        for speed in sorted(speeds, reverse=False):
            ui.print_header(f"CURRENT: {current}, SPEED: {speed}")
            # HOME
            print("homing...")
            await api.home([ax])
            print(f"lowering run-current to {current} amps")
            await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                api,
                ax,
                run_current=current,
            )
            await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                api, ax, default_max_speed=speed
            )
            # MOVE DOWN
            print(f"moving down {blow_out} mm at {speed} mm/sec")
            await _save_result(_get_test_tag(current, speed, "down", "start"))
            await helpers_ot3.move_plunger_absolute_ot3(
                api, mount, blow_out, speed=speed, motor_current=current
            )
            down_passed = await _save_result(
                _get_test_tag(current, speed, "down", "end")
            )
            # MOVE UP
            print(f"moving up {blow_out} mm at {speed} mm/sec")
            await _save_result(_get_test_tag(current, speed, "up", "start"))
            await helpers_ot3.move_plunger_absolute_ot3(
                api, mount, 0, speed=speed, motor_current=current
            )
            up_passed = await _save_result(_get_test_tag(current, speed, "up", "end"))
            # RESET CURRENTS AND HOME
            print("homing...")
            await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                api, ax, run_current=default_current
            )
            await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                api, ax, default_max_speed=default_speed
            )
            await api._backend.set_active_current({Axis.P_L: default_current})
            await api.home([ax])
            if not down_passed or not up_passed and not api.is_simulator:
                print(f"current {current} failed")
                print("skipping any remaining speeds at this current")
                break
