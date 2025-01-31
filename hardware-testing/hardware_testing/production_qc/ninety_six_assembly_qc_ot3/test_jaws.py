"""Test Jaws."""
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

# from opentrons.hardware_control.backends.ot3utils import axis_convert


RETRACT_MM = 0.25  # 0.25
MAX_TRAVEL = 29.8 - RETRACT_MM  # FIXME: what is the max travel?
ENDSTOP_OVERRUN_MM = (
    0.25  # FIXME: position cannot go negative, can't go past limit switch
)
ENDSTOP_OVERRUN_SPEED = 5
SPEEDS_TO_TEST: List[float] = [8, 12]
CURRENTS_SPEEDS: Dict[float, List[float]] = {
    0.7: SPEEDS_TO_TEST,
    1.5: SPEEDS_TO_TEST,
}


def _get_test_tag(current: float, speed: float) -> str:
    return f"current-{current}-speed-{speed}"


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    lines: List[Union[CSVLine, CSVLineRepeating]] = list()
    currents = list(CURRENTS_SPEEDS.keys())
    for current in sorted(currents):
        speeds = CURRENTS_SPEEDS[current]
        for speed in sorted(speeds):
            tag = _get_test_tag(current, speed)
            lines.append(CSVLine(tag, [bool, bool, bool, CSVResult]))
    return lines


async def _check_if_jaw_is_aligned_with_endstop(api: OT3API) -> bool:
    if not api.is_simulator:
        pass_no_hit = ui.get_user_answer("are both endstop Lights OFF?")
    else:
        pass_no_hit = True
    if not pass_no_hit:
        ui.print_error("endstop hit too early")

    return pass_no_hit

    # This currently does not work since jaws cannot move above 0
    # # now purposefully hit the endstop
    # await helpers_ot3.move_tip_motor_relative_ot3(
    #     api, -RETRACT_MM-ENDSTOP_OVERRUN_MM, speed=ENDSTOP_OVERRUN_SPEED
    # )
    # print(await api.get_limit_switches())
    # if not api.is_simulator:
    #     pass_hit = ui.get_user_answer("are both endstop Lights ON?")
    # else:
    #     pass_hit = True
    # if not pass_hit:
    #     ui.print_error("endstop did not hit")
    # return pass_no_hit, pass_hit


async def jaw_precheck(api: OT3API, ax: Axis, speed: float) -> Tuple[bool, bool]:
    """Check the LEDs work and jaws are aligned."""
    # HOME
    print("homing...")
    await helpers_ot3.home_tip_motors(api, False)  # Home with no backoff
    # Check LEDs can turn on when homed
    if not api.is_simulator:
        led_check = ui.get_user_answer("are both endstop Lights ON?")
    else:
        led_check = True
    if not led_check:
        ui.print_error("Endstop LED or homing failure")
        return (led_check, False)

    print(f"retracting {RETRACT_MM} mm")
    await helpers_ot3.move_tip_motor_relative_ot3(api, RETRACT_MM, speed=speed)
    # Check Jaws are aligned
    if not api.is_simulator:
        jaws_aligned = ui.get_user_answer("are both endstop Lights OFF?")
    else:
        jaws_aligned = True

    if not jaws_aligned:
        ui.print_error("Jaws Misaligned")

    return led_check, jaws_aligned


async def run(
    api: OT3API, report: CSVReport, section: str, pipette: Literal[200, 1000]
) -> None:
    """Run."""
    ax = Axis.Q
    settings = helpers_ot3.get_gantry_load_per_axis_motion_settings_ot3(api, ax)
    default_current = settings.run_current
    default_speed = settings.max_speed

    async def _save_result(tag: str, led_check: bool, jaws_aligned: bool) -> bool:
        if led_check and jaws_aligned:
            no_hit = await _check_if_jaw_is_aligned_with_endstop(api)
        else:
            no_hit = False
        result = CSVResult.from_bool(led_check and jaws_aligned and no_hit)
        report(section, tag, [led_check, jaws_aligned, no_hit, result])
        return led_check and jaws_aligned and no_hit

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

            led_check, jaws_aligned = await jaw_precheck(api, ax, speed)

            if led_check and jaws_aligned:
                print(f"lowering run-current to {current} amps")
                await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                    api, ax, default_max_speed=speed
                )
                await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                    api, ax, run_current=current
                )
                # MOVE DOWN then UP
                print(f"moving down/up {MAX_TRAVEL} mm at {speed} mm/sec")
                await helpers_ot3.move_tip_motor_relative_ot3(
                    api, MAX_TRAVEL, speed=speed, motor_current=current
                )
                await helpers_ot3.move_tip_motor_relative_ot3(
                    api, -MAX_TRAVEL, speed=speed, motor_current=current
                )
                # RESET CURRENTS, CHECK
                await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
                    api, ax, default_max_speed=default_speed
                )
                await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                    api, ax, run_current=default_current
                )
            passed = await _save_result(
                _get_test_tag(current, speed), led_check, jaws_aligned
            )

            if not passed and not api.is_simulator:
                print(f"current {current} failed")
                print("skipping any remaining speeds at this current")
                break

    print("homing...")
    await api.home([ax])
