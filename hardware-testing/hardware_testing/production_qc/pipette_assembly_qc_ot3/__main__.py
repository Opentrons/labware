"""Pipette Assembly QC Test."""
# FIXME: (andy s) Sorry but this script should be re-written completely.
#        It works, but it was written in a hurry and is just terrible to edit.

import argparse
import asyncio
from dataclasses import dataclass, fields
import os
from pathlib import Path
from time import time
from typing import Optional, Callable, List, Any, Tuple, Dict, cast
from typing_extensions import Final

from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    PushTipPresenceNotification,
)
from opentrons_hardware.firmware_bindings.messages.messages import MessageDefinition
from opentrons_hardware.firmware_bindings.constants import SensorType, SensorId

from opentrons.config.types import LiquidProbeSettings
from opentrons.hardware_control.types import (
    TipStateType,
    FailedTipStateCheck,
    SubSystem,
    InstrumentProbeType,
)
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.ot3_calibration import (
    calibrate_pipette,
    EdgeNotFoundError,
    EarlyCapacitiveSenseTrigger,
    CalibrationStructureNotFoundError,
)
from opentrons.hardware_control.backends.ot3controller import OT3Controller

from hardware_testing import data
from hardware_testing.drivers.pressure_fixture import (
    PressureFixtureBase,
    connect_to_fixture,
)
from .pressure import (  # type: ignore[import]
    PRESSURE_FIXTURE_TIP_VOLUME,
    PRESSURE_FIXTURE_ASPIRATE_VOLUME,
    PRESSURE_FIXTURE_EVENT_CONFIGS as PRESSURE_CFG,
    pressure_fixture_a1_location,
    PressureEvent,
    PressureEventConfig,
    PRESSURE_FIXTURE_INSERT_DEPTH,
    PRESSURE_ASPIRATE_DELTA_SPEC,
)
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import (
    OT3Mount,
    Point,
    Axis,
)

DEFAULT_SLOT_TIP_RACK_1000 = 7
DEFAULT_SLOT_TIP_RACK_200 = 4
DEFAULT_SLOT_TIP_RACK_50 = 1

DEFAULT_SLOT_FIXTURE = 3
DEFAULT_SLOT_RESERVOIR = 8
DEFAULT_SLOT_PLATE = 2
DEFAULT_SLOT_TRASH = 12

PROBING_DECK_PRECISION_MM = 1.0

TRASH_HEIGHT_MM: Final = 45
LEAK_HOVER_ABOVE_LIQUID_MM: Final = 50
ASPIRATE_SUBMERGE_MM: Final = 3
TRAILING_AIR_GAP_DROPLETS_UL: Final = 0.5

# FIXME: reduce this spec after dial indicator is implemented
LIQUID_PROBE_ERROR_THRESHOLD_PRECISION_MM = 0.4
LIQUID_PROBE_ERROR_THRESHOLD_ACCURACY_MM = 1.5

SAFE_HEIGHT_TRAVEL = 10
SAFE_HEIGHT_CALIBRATE = 0

ENCODER_ALIGNMENT_THRESHOLD_MM = 0.1

COLUMNS = "ABCDEFGH"
PRESSURE_DATA_HEADER = ["PHASE", "CH1", "CH2", "CH3", "CH4", "CH5", "CH6", "CH7", "CH8"]

MULTI_CHANNEL_1_OFFSET = Point(y=9 * 7 * 0.5)

# NOTE: there is a ton of pressure data, so we want it on the bottom of the CSV
#       so here we cache these readings, and append them to the CSV in the end
PRESSURE_DATA_CACHE = []
# save final test results, to be saved and displayed at the end
FINAL_TEST_RESULTS = []

_available_tips: Dict[int, List[str]] = {}


@dataclass
class TestConfig:
    """Test Configurations."""

    operator_name: str
    skip_liquid: bool
    skip_fixture: bool
    skip_diagnostics: bool
    skip_plunger: bool
    skip_tip_presence: bool
    skip_liquid_probe: bool
    fixture_port: str
    fixture_side: str
    fixture_aspirate_sample_count: int
    slot_tip_rack_1000: int
    slot_tip_rack_200: int
    slot_tip_rack_50: int
    slot_reservoir: int
    slot_plate: int
    slot_fixture: int
    slot_trash: int
    num_trials: int
    droplet_wait_seconds: int
    simulate: bool
    skip_all_pressure: bool


@dataclass
class LabwareLocations:
    """Test Labware Locations."""

    trash: Optional[Point]
    tip_rack_1000: Optional[Point]
    tip_rack_200: Optional[Point]
    tip_rack_50: Optional[Point]
    reservoir: Optional[Point]
    plate_primary: Optional[Point]
    plate_secondary: Optional[Point]
    fixture: Optional[Point]


# start with dummy values, these will be immediately overwritten
# we start with actual values here to pass linting
IDEAL_LABWARE_LOCATIONS: LabwareLocations = LabwareLocations(
    trash=None,
    tip_rack_1000=None,
    tip_rack_200=None,
    tip_rack_50=None,
    reservoir=None,
    plate_primary=None,
    plate_secondary=None,
    fixture=None,
)
CALIBRATED_LABWARE_LOCATIONS: LabwareLocations = LabwareLocations(
    trash=None,
    tip_rack_1000=None,
    tip_rack_200=None,
    tip_rack_50=None,
    reservoir=None,
    plate_primary=None,
    plate_secondary=None,
    fixture=None,
)

# THRESHOLDS: environment sensor
TEMP_THRESH = [20, 40]
HUMIDITY_THRESH = [10, 90]

# THRESHOLDS: capacitive sensor
CAP_THRESH_OPEN_AIR = {
    1: [3.0, 7.0],
    8: [8.0, 16.0],
}
CAP_THRESH_PROBE = {
    1: [4.0, 8.0],
    8: [8.0, 16.0],
}
CAP_THRESH_SQUARE = {
    1: [8.0, 15.0],
    8: [18.0, 26.0],
}

# THRESHOLDS: air-pressure sensor
PRESSURE_ASPIRATE_VOL = {1: {50: 10.0, 1000: 20.0}, 8: {50: 10.0, 1000: 20.0}}
PRESSURE_THRESH_OPEN_AIR = {1: [-150, 150], 8: [-150, 150]}
PRESSURE_THRESH_SEALED = {1: [-500, 500], 8: [-200, 400]}
PRESSURE_THRESH_COMPRESS = {1: [-2600, 1600], 8: [-8000, 8000]}

_trash_loc_counter = 0
TRASH_OFFSETS = [
    Point(x=(64 * -0.75)),
    Point(x=(64 * -0.5)),
    Point(x=(64 * -0.25)),
    Point(x=(64 * 0)),
    Point(x=(64 * 0.25)),
    Point(x=(64 * 0.5)),
    Point(x=(64 * 0.75)),
]


def _bool_to_pass_fail(result: bool) -> str:
    return "PASS" if result else "FAIL"


def _get_operator_answer_to_question(question: str) -> bool:
    user_inp = ""
    print("\n------------------------------------------------")
    while not user_inp or user_inp not in ["y", "n"]:
        user_inp = input(f"QUESTION: {question} (y/n): ").strip()
    print(f"ANSWER: {user_inp}")
    print("------------------------------------------------\n")
    return "y" in user_inp


def _get_tips_used_for_droplet_test(
    pipette_channels: int, pipette_volume: int, num_trials: int
) -> Tuple[int, List[str]]:
    if pipette_channels == 1:
        tip_columns = COLUMNS[:num_trials]
        return pipette_volume, [f"{c}1" for c in tip_columns]
    elif pipette_channels == 8:
        return pipette_volume, [f"A{r + 1}" for r in range(num_trials)]
    raise RuntimeError(f"unexpected number of channels: {pipette_channels}")


def _get_ideal_labware_locations(
    test_config: TestConfig, pipette_channels: int
) -> LabwareLocations:
    tip_rack_1000_loc_ideal = helpers_ot3.get_theoretical_a1_position(
        test_config.slot_tip_rack_1000,
        "opentrons_flex_96_tiprack_1000ul",
    )
    tip_rack_200_loc_ideal = helpers_ot3.get_theoretical_a1_position(
        test_config.slot_tip_rack_200,
        "opentrons_flex_96_tiprack_200ul",
    )
    tip_rack_50_loc_ideal = helpers_ot3.get_theoretical_a1_position(
        test_config.slot_tip_rack_50,
        "opentrons_flex_96_tiprack_50ul",
    )
    reservoir_loc_ideal = helpers_ot3.get_theoretical_a1_position(
        test_config.slot_reservoir, "nest_1_reservoir_195ml"
    )
    plate_loc_ideal = helpers_ot3.get_theoretical_a1_position(
        test_config.slot_plate, "corning_96_wellplate_360ul_flat"
    )
    # NOTE: we are using well H6 (not A1)
    plate_loc_ideal += Point(x=9 * 5, y=9 * -7)
    # trash
    trash_loc_ideal = helpers_ot3.get_slot_calibration_square_position_ot3(
        test_config.slot_trash
    )
    trash_loc_ideal += Point(z=TRASH_HEIGHT_MM)
    # pressure fixture
    fixture_slot_pos = helpers_ot3.get_slot_bottom_left_position_ot3(
        test_config.slot_fixture
    )
    fixture_loc_ideal = fixture_slot_pos + pressure_fixture_a1_location(
        test_config.fixture_side
    )
    if pipette_channels == 8:
        reservoir_loc_ideal += MULTI_CHANNEL_1_OFFSET
        trash_loc_ideal += MULTI_CHANNEL_1_OFFSET
    return LabwareLocations(
        tip_rack_1000=tip_rack_1000_loc_ideal,
        tip_rack_200=tip_rack_200_loc_ideal,
        tip_rack_50=tip_rack_50_loc_ideal,
        reservoir=reservoir_loc_ideal,
        plate_primary=plate_loc_ideal
        + Point(z=5),  # give a few extra mm to help alignment
        plate_secondary=plate_loc_ideal
        + Point(z=5),  # give a few extra mm to help alignment
        trash=trash_loc_ideal,
        fixture=fixture_loc_ideal,
    )


def _tip_name_to_xy_offset(tip: str) -> Point:
    tip_rack_rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
    tip_row = tip_rack_rows.index(tip[0])
    tip_column = int(tip[1]) - 1
    return Point(x=tip_column * 9, y=tip_row * -9)


async def _move_to_or_calibrate(
    api: OT3API, mount: OT3Mount, expected: Optional[Point], actual: Optional[Point]
) -> Point:
    current_pos = await api.gantry_position(mount)
    if not actual:
        assert expected
        safe_expected = expected + Point(z=SAFE_HEIGHT_CALIBRATE)
        safe_height = max(safe_expected.z, current_pos.z) + SAFE_HEIGHT_TRAVEL
        await helpers_ot3.move_to_arched_ot3(
            api, mount, safe_expected, safe_height=safe_height
        )
        await helpers_ot3.jog_mount_ot3(api, mount, display=False)
        actual = await api.gantry_position(mount)
    else:
        safe_height = max(actual.z, current_pos.z) + SAFE_HEIGHT_TRAVEL
        await helpers_ot3.move_to_arched_ot3(
            api, mount, actual, safe_height=safe_height
        )
    return actual


async def _pick_up_tip(
    api: OT3API,
    mount: OT3Mount,
    tip: str,
    expected: Optional[Point],
    actual: Optional[Point],
    tip_volume: Optional[float] = None,
) -> Point:
    actual = await _move_to_or_calibrate(api, mount, expected, actual)
    tip_offset = _tip_name_to_xy_offset(tip)
    tip_pos = actual + tip_offset
    await helpers_ot3.move_to_arched_ot3(
        api, mount, tip_pos, safe_height=tip_pos.z + SAFE_HEIGHT_TRAVEL
    )
    if not tip_volume:
        pip = api.hardware_pipettes[mount.to_mount()]
        assert pip
        tip_volume = pip.working_volume
    tip_length = helpers_ot3.get_default_tip_length(int(tip_volume))
    await api.pick_up_tip(mount, tip_length=tip_length)
    await api.move_rel(mount, Point(z=tip_length))
    return actual


async def _pick_up_tip_for_tip_volume(
    api: OT3API, mount: OT3Mount, tip_volume: int
) -> None:
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_channels = pip.channels.value
    tip = _available_tips[tip_volume][0]
    _available_tips[tip_volume] = _available_tips[tip_volume][pip_channels:]
    if tip_volume == 1000:
        CALIBRATED_LABWARE_LOCATIONS.tip_rack_1000 = await _pick_up_tip(
            api,
            mount,
            tip,
            IDEAL_LABWARE_LOCATIONS.tip_rack_1000,
            CALIBRATED_LABWARE_LOCATIONS.tip_rack_1000,
            tip_volume=tip_volume,
        )
    elif tip_volume == 200:
        CALIBRATED_LABWARE_LOCATIONS.tip_rack_200 = await _pick_up_tip(
            api,
            mount,
            tip,
            IDEAL_LABWARE_LOCATIONS.tip_rack_200,
            CALIBRATED_LABWARE_LOCATIONS.tip_rack_200,
            tip_volume=tip_volume,
        )
    elif tip_volume == 50:
        CALIBRATED_LABWARE_LOCATIONS.tip_rack_50 = await _pick_up_tip(
            api,
            mount,
            tip,
            IDEAL_LABWARE_LOCATIONS.tip_rack_50,
            CALIBRATED_LABWARE_LOCATIONS.tip_rack_50,
            tip_volume=tip_volume,
        )
    else:
        raise ValueError(f"unexpected tip volume: {tip_volume}")


async def _move_to_reservoir_liquid(api: OT3API, mount: OT3Mount) -> None:
    CALIBRATED_LABWARE_LOCATIONS.reservoir = await _move_to_or_calibrate(
        api,
        mount,
        IDEAL_LABWARE_LOCATIONS.reservoir,
        CALIBRATED_LABWARE_LOCATIONS.reservoir,
    )


async def _move_to_plate_liquid(
    api: OT3API, mount: OT3Mount, probe: InstrumentProbeType
) -> None:
    if probe == InstrumentProbeType.PRIMARY:
        CALIBRATED_LABWARE_LOCATIONS.plate_primary = await _move_to_or_calibrate(
            api,
            mount,
            IDEAL_LABWARE_LOCATIONS.plate_primary,
            CALIBRATED_LABWARE_LOCATIONS.plate_primary,
        )
    else:
        # move towards back of machine, so 8th channel can reach well
        CALIBRATED_LABWARE_LOCATIONS.plate_secondary = await _move_to_or_calibrate(
            api,
            mount,
            IDEAL_LABWARE_LOCATIONS.plate_secondary + Point(y=9 * 7),  # type: ignore[operator]
            CALIBRATED_LABWARE_LOCATIONS.plate_secondary,
        )


async def _move_to_above_plate_liquid(
    api: OT3API, mount: OT3Mount, probe: InstrumentProbeType, height_mm: float
) -> None:
    if probe == InstrumentProbeType.PRIMARY:
        assert (
            CALIBRATED_LABWARE_LOCATIONS.plate_primary
        ), "you must calibrate the liquid before hovering"
        await _move_to_or_calibrate(
            api,
            mount,
            IDEAL_LABWARE_LOCATIONS.plate_primary,
            CALIBRATED_LABWARE_LOCATIONS.plate_primary + Point(z=height_mm),
        )
    else:
        assert (
            CALIBRATED_LABWARE_LOCATIONS.plate_secondary
        ), "you must calibrate the liquid before hovering"
        await _move_to_or_calibrate(
            api,
            mount,
            IDEAL_LABWARE_LOCATIONS.plate_secondary,
            CALIBRATED_LABWARE_LOCATIONS.plate_secondary + Point(z=height_mm),
        )


async def _move_to_fixture(api: OT3API, mount: OT3Mount) -> None:

    CALIBRATED_LABWARE_LOCATIONS.fixture = await _move_to_or_calibrate(
        api,
        mount,
        IDEAL_LABWARE_LOCATIONS.fixture,
        CALIBRATED_LABWARE_LOCATIONS.fixture,
    )


async def _drop_tip_in_trash(api: OT3API, mount: OT3Mount) -> None:
    global _trash_loc_counter
    # assume the ideal is accurate enough
    ideal = IDEAL_LABWARE_LOCATIONS.trash
    assert ideal
    random_trash_pos = ideal + TRASH_OFFSETS[_trash_loc_counter]
    _trash_loc_counter = (_trash_loc_counter + 1) % len(TRASH_OFFSETS)
    current_pos = await api.gantry_position(mount)
    safe_height = max(random_trash_pos.z, current_pos.z) + SAFE_HEIGHT_TRAVEL
    await helpers_ot3.move_to_arched_ot3(
        api, mount, random_trash_pos, safe_height=safe_height
    )
    await api.drop_tip(mount, home_after=False)


async def _aspirate_and_look_for_droplets(
    api: OT3API, mount: OT3Mount, wait_time: int
) -> bool:
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pipette_volume = pip.working_volume
    print(f"aspirating {pipette_volume} microliters")
    await api.move_rel(mount, Point(z=-ASPIRATE_SUBMERGE_MM))
    await api.aspirate(mount, pipette_volume - TRAILING_AIR_GAP_DROPLETS_UL)
    await api.move_rel(mount, Point(z=LEAK_HOVER_ABOVE_LIQUID_MM))
    await api.aspirate(mount, TRAILING_AIR_GAP_DROPLETS_UL)
    for t in range(wait_time):
        print(f"waiting for leaking tips ({t + 1}/{wait_time})")
        if not api.is_simulator:
            await asyncio.sleep(1)
    if api.is_simulator:
        leak_test_passed = True
    else:
        leak_test_passed = _get_operator_answer_to_question("did it pass? no leaking?")
    print("dispensing back into reservoir")
    await api.move_rel(mount, Point(z=-LEAK_HOVER_ABOVE_LIQUID_MM))
    await api.dispense(mount, pipette_volume)
    await api.blow_out(mount)
    await api.move_rel(mount, Point(z=ASPIRATE_SUBMERGE_MM))
    return leak_test_passed


def _connect_to_fixture(test_config: TestConfig) -> PressureFixtureBase:
    fixture = connect_to_fixture(
        test_config.simulate or test_config.skip_fixture, side=test_config.fixture_side
    )
    return fixture


async def _read_pressure_and_check_results(
    api: OT3API,
    pipette_channels: int,
    pipette_volume: int,
    fixture: PressureFixtureBase,
    tag: PressureEvent,
    write_cb: Callable,
    accumulate_raw_data_cb: Callable,
    channels: int = 1,
    previous: Optional[List[List[float]]] = None,
) -> Tuple[bool, List[List[float]]]:
    pressure_event_config: PressureEventConfig = PRESSURE_CFG[tag]
    if not api.is_simulator:
        await asyncio.sleep(pressure_event_config.stability_delay)
    _samples = []
    for i in range(pressure_event_config.sample_count):
        _samples.append(fixture.read_all_pressure_channel())
        next_sample_time = time() + pressure_event_config.sample_delay
        _sample_as_strings = [str(round(p, 2)) for p in _samples[-1]]
        csv_data_sample = [tag.value] + _sample_as_strings
        print(f"{i + 1}/{pressure_event_config.sample_count}: {csv_data_sample}")
        accumulate_raw_data_cb(csv_data_sample)
        delay_time = next_sample_time - time()
        if (
            not api.is_simulator
            and i < pressure_event_config.sample_count - 1
            and delay_time > 0
        ):
            await asyncio.sleep(pressure_event_config.sample_delay)
    _samples_per_channel = [[s[c] for s in _samples] for c in range(channels)]
    _average_per_channel = [sum(s) / len(s) for s in _samples_per_channel]
    test_pass_stability = True
    for c in range(channels):
        _samples_per_channel[c].sort()
        _c_min = min(_samples_per_channel[c][1:])
        _c_max = max(_samples_per_channel[c][1:])
        csv_data_min = [f"pressure-{tag.value}-channel-{c + 1}", "min", _c_min]
        print(csv_data_min)
        write_cb(csv_data_min)
        csv_data_max = [f"pressure-{tag.value}-channel-{c + 1}", "max", _c_max]
        print(csv_data_max)
        write_cb(csv_data_max)
        csv_data_avg = [
            f"pressure-{tag.value}-channel-{c + 1}",
            "average",
            _average_per_channel[c],
        ]
        print(csv_data_avg)
        write_cb(csv_data_avg)
        if _c_max - _c_min > pressure_event_config.stability_threshold:
            print(
                f"ERROR: channel {c + 1} samples are too far apart, "
                f"max={round(_c_max, 2)} and min={round(_c_min, 2)}"
            )
            test_pass_stability = False
    csv_data_stability = [
        f"pressure-{tag.value}",
        "stability",
        _bool_to_pass_fail(test_pass_stability),
    ]
    print(csv_data_stability)
    write_cb(csv_data_stability)
    _all_samples = [s[c] for s in _samples for c in range(channels)]
    _all_samples.sort()
    _samples_min = min(_all_samples[1:-1])
    _samples_max = max(_all_samples[1:-1])
    if (
        _samples_min < pressure_event_config.min
        or _samples_max > pressure_event_config.max
    ):
        print(
            f"ERROR: samples are out of range, "
            f"max={round(_samples_max, 2)} and min={round(_samples_min, 2)}"
        )
        test_pass_accuracy = False
    else:
        test_pass_accuracy = True
    csv_data_accuracy = [
        f"pressure-{tag.value}",
        "accuracy",
        _bool_to_pass_fail(test_pass_accuracy),
    ]
    print(csv_data_accuracy)
    write_cb(csv_data_accuracy)
    test_pass_delta = True
    if previous:
        assert len(previous[-1]) >= len(_average_per_channel)
        for c in range(channels):
            _delta_target = PRESSURE_ASPIRATE_DELTA_SPEC[pipette_channels][
                pipette_volume
            ]["delta"]
            _delta_margin = PRESSURE_ASPIRATE_DELTA_SPEC[pipette_channels][
                pipette_volume
            ]["margin"]
            _delta_min = _delta_target - (_delta_target * _delta_margin)
            _delta_max = _delta_target + (_delta_target * _delta_margin)
            _delta = abs(_average_per_channel[c] - previous[-1][c])  # absolute value
            if _delta < _delta_min or _delta > _delta_max:
                print(
                    f"ERROR: channel {c + 1} pressure delta ({_delta}) "
                    f"out of range: max={_delta_max}, min={_delta_min}"
                )
                test_pass_delta = False
        csv_data_delta = [
            f"pressure-{tag.value}",
            "delta",
            _bool_to_pass_fail(test_pass_delta),
        ]
        print(csv_data_delta)
        write_cb(csv_data_delta)
    _passed = test_pass_stability and test_pass_accuracy and test_pass_delta
    return _passed, _samples


async def _fixture_check_pressure(
    api: OT3API,
    mount: OT3Mount,
    test_config: TestConfig,
    fixture: PressureFixtureBase,
    write_cb: Callable,
    accumulate_raw_data_cb: Callable,
) -> bool:
    results = []
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_vol = int(pip.working_volume)
    pip_channels = int(pip.channels)
    # above the fixture
    r, _ = await _read_pressure_and_check_results(
        api,
        pip_channels,
        pip_vol,
        fixture,
        PressureEvent.PRE,
        write_cb,
        accumulate_raw_data_cb,
        pip_channels,
    )
    results.append(r)
    # insert into the fixture
    # NOTE: unknown amount of pressure here (depends on where Z was calibrated)
    fixture_depth = PRESSURE_FIXTURE_INSERT_DEPTH[pip_vol]
    await api.move_rel(mount, Point(z=-fixture_depth))
    r, inserted_pressure_data = await _read_pressure_and_check_results(
        api,
        pip_channels,
        pip_vol,
        fixture,
        PressureEvent.INSERT,
        write_cb,
        accumulate_raw_data_cb,
        pip_channels,
    )
    results.append(r)
    # aspirate 50uL
    await api.aspirate(mount, PRESSURE_FIXTURE_ASPIRATE_VOLUME[pip_vol])
    if pip_vol == 50:
        asp_evt = PressureEvent.ASPIRATE_P50
    else:
        asp_evt = PressureEvent.ASPIRATE_P1000
    r, _ = await _read_pressure_and_check_results(
        api,
        pip_channels,
        pip_vol,
        fixture,
        asp_evt,
        write_cb,
        accumulate_raw_data_cb,
        pip_channels,
        previous=inserted_pressure_data,
    )
    results.append(r)
    # dispense
    await api.dispense(mount, PRESSURE_FIXTURE_ASPIRATE_VOLUME[pip_vol])
    r, _ = await _read_pressure_and_check_results(
        api,
        pip_channels,
        pip_vol,
        fixture,
        PressureEvent.DISPENSE,
        write_cb,
        accumulate_raw_data_cb,
        pip_channels,
    )
    results.append(r)
    # retract out of fixture
    await api.move_rel(mount, Point(z=fixture_depth))
    r, _ = await _read_pressure_and_check_results(
        api,
        pip_channels,
        pip_vol,
        fixture,
        PressureEvent.POST,
        write_cb,
        accumulate_raw_data_cb,
        pip_channels,
    )
    results.append(r)
    return False not in results


def _reset_available_tip() -> None:
    for tip_size in [50, 200, 1000]:
        _available_tips[tip_size] = [
            f"{row}{col + 1}" for col in range(12) for row in "ABCDEFGH"
        ]


async def _test_for_leak(
    api: OT3API,
    mount: OT3Mount,
    test_config: TestConfig,
    tip_volume: int,
    fixture: Optional[PressureFixtureBase],
    write_cb: Optional[Callable],
    accumulate_raw_data_cb: Optional[Callable],
    droplet_wait_seconds: int = 30,
) -> bool:
    if fixture:
        await _pick_up_tip_for_tip_volume(api, mount, tip_volume=tip_volume)
        assert write_cb, "pressure fixture requires recording data to disk"
        assert (
            accumulate_raw_data_cb
        ), "pressure fixture requires recording data to disk"
        await _move_to_fixture(api, mount)
        if not test_config.skip_all_pressure:
            test_passed = await _fixture_check_pressure(
                api, mount, test_config, fixture, write_cb, accumulate_raw_data_cb
            )
        else:
            test_passed = True
    else:
        await _pick_up_tip_for_tip_volume(api, mount, tip_volume=tip_volume)
        await _move_to_reservoir_liquid(api, mount)
        test_passed = await _aspirate_and_look_for_droplets(
            api, mount, droplet_wait_seconds
        )
    await _drop_tip_in_trash(api, mount)
    return test_passed


async def _test_for_leak_by_eye(
    api: OT3API,
    mount: OT3Mount,
    test_config: TestConfig,
    tip_volume: int,
    droplet_wait_time: int,
) -> bool:
    return await _test_for_leak(
        api, mount, test_config, tip_volume, None, None, None, droplet_wait_time
    )


async def _read_pipette_sensor_repeatedly_and_average(
    api: OT3API,
    mount: OT3Mount,
    sensor_type: SensorType,
    num_readings: int,
    sensor_id: SensorId,
) -> float:
    # FIXME: this while loop is required b/c the command does not always
    #        return a value, not sure what's the source of this issue
    readings: List[float] = []
    while len(readings) < num_readings:
        try:
            if sensor_type == SensorType.capacitive:
                r = await helpers_ot3.get_capacitance_ot3(api, mount, sensor_id)
            elif sensor_type == SensorType.pressure:
                r = await helpers_ot3.get_pressure_ot3(api, mount, sensor_id)
            elif sensor_type == SensorType.temperature:
                res = await helpers_ot3.get_temperature_humidity_ot3(
                    api, mount, sensor_id
                )
                r = res[0]
            elif sensor_type == SensorType.humidity:
                res = await helpers_ot3.get_temperature_humidity_ot3(
                    api, mount, sensor_id
                )
                r = res[1]
            else:
                raise ValueError(f"unexpected sensor type: {sensor_type}")
        except helpers_ot3.SensorResponseBad:
            return -999999999999.0
        readings.append(r)
    readings.sort()
    readings = readings[1:-1]
    return sum(readings) / len(readings)


async def _test_diagnostics_environment(
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    print("testing environmental sensor")
    celsius_pass = True
    humidity_pass = True

    # ROOM
    if not api.is_simulator:

        def _get_float_from_user(msg: str) -> float:
            try:
                return float(input(msg))
            except ValueError:
                return _get_room_celsius()

        def _get_room_celsius() -> float:
            return _get_float_from_user(
                'Enter the ROOM temperature (Celsius) (example: "23.2"): '
            )

        def _get_room_humidity() -> float:
            return _get_float_from_user(
                'Enter the ROOM humidity (%) (example: "54.0"): '
            )

        room_celsius = _get_room_celsius()
        room_humidity = _get_room_humidity()
    else:
        room_celsius = 25.0
        room_humidity = 50.0

    # CELSIUS
    celsius = await _read_pipette_sensor_repeatedly_and_average(
        api, mount, SensorType.temperature, 10, SensorId.S0
    )
    print(f"celsius: {celsius} C")
    if celsius < TEMP_THRESH[0] or celsius > TEMP_THRESH[1]:
        print(f"FAIL: celsius {celsius} is out of range")
        celsius_pass = False
    write_cb(["celsius", room_celsius, celsius, _bool_to_pass_fail(celsius_pass)])

    # HUMIDITY
    humidity = await _read_pipette_sensor_repeatedly_and_average(
        api, mount, SensorType.humidity, 10, SensorId.S0
    )
    print(f"humidity: {humidity} C")
    if humidity < HUMIDITY_THRESH[0] or humidity > HUMIDITY_THRESH[1]:
        print(f"FAIL: humidity {humidity} is out of range")
        humidity_pass = False
    write_cb(["humidity", room_humidity, humidity, _bool_to_pass_fail(humidity_pass)])

    return celsius_pass and humidity_pass


async def _test_diagnostics_encoder(
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    print("testing encoder")
    pip_axis = Axis.of_main_tool_actuator(mount)
    encoder_home_pass = True
    encoder_move_pass = True
    encoder_stall_pass = True
    _, _, _, drop_tip = helpers_ot3.get_plunger_positions_ot3(api, mount)

    async def _get_plunger_pos_and_encoder() -> Tuple[float, float]:
        _pos = await api.current_position_ot3(mount)
        _enc = await api.encoder_current_position_ot3(mount)
        return _pos[pip_axis], _enc[pip_axis]

    print("homing plunger")
    await api.home([pip_axis])
    pip_pos, pip_enc = await _get_plunger_pos_and_encoder()
    if abs(pip_pos) > 0.005 or abs(pip_enc) > 0.005:
        print(
            f"FAIL: plunger ({pip_pos}) or encoder ({pip_enc}) is not near 0.0 after homing"
        )
        encoder_home_pass = False
    write_cb(["encoder-home", pip_pos, pip_enc, _bool_to_pass_fail(encoder_home_pass)])

    print("moving plunger")
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, drop_tip)
    pip_pos, pip_enc = await _get_plunger_pos_and_encoder()
    if abs(pip_pos - pip_enc) > ENCODER_ALIGNMENT_THRESHOLD_MM:
        print(f"FAIL: plunger ({pip_pos}) and encoder ({pip_enc}) are too different")
        encoder_move_pass = False
    write_cb(["encoder-move", pip_pos, pip_enc, _bool_to_pass_fail(encoder_move_pass)])

    print("homing plunger")
    await api.home([pip_axis])
    return encoder_home_pass and encoder_move_pass and encoder_stall_pass


async def _test_diagnostics_capacitive(  # noqa: C901
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    print("testing capacitance")
    results: List[bool] = []
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    sensor_ids = [SensorId.S0]
    if pip.channels == 8:
        sensor_ids.append(SensorId.S1)
    sensor_to_probe = {
        SensorId.S0: InstrumentProbeType.PRIMARY,
        SensorId.S1: InstrumentProbeType.SECONDARY,
    }

    async def _read_cap(_sensor_id: SensorId) -> float:
        return await _read_pipette_sensor_repeatedly_and_average(
            api, mount, SensorType.capacitive, 10, _sensor_id
        )

    for sensor_id in sensor_ids:
        capacitance = await _read_cap(sensor_id)
        print(f"open-air {sensor_id.name} capacitance: {capacitance}")
        if (
            capacitance < CAP_THRESH_OPEN_AIR[pip.channels][0]
            or capacitance > CAP_THRESH_OPEN_AIR[pip.channels][1]
        ):
            results.append(False)
            print(
                f"FAIL: open-air {sensor_id.name} capacitance ({capacitance}) is not correct"
            )
        else:
            results.append(True)
        write_cb(
            [
                f"capacitive-open-air-{sensor_id.name}",
                capacitance,
                _bool_to_pass_fail(results[-1]),
            ]
        )

    for sensor_id in sensor_ids:
        if not api.is_simulator:
            if pip.channels == 1:
                _get_operator_answer_to_question(
                    'ATTACH the probe, enter "y" when attached'
                )
            elif sensor_id == SensorId.S0:
                _get_operator_answer_to_question(
                    'ATTACH the REAR probe, enter "y" when attached'
                )
            else:
                _get_operator_answer_to_question(
                    'ATTACH the FRONT probe, enter "y" when attached'
                )
        capacitance = await _read_cap(sensor_id)
        print(f"probe {sensor_id.name} capacitance: {capacitance}")
        if (
            capacitance < CAP_THRESH_PROBE[pip.channels][0]
            or capacitance > CAP_THRESH_PROBE[pip.channels][1]
        ):
            results.append(False)
            print(f"FAIL: probe capacitance ({capacitance}) is not correct")
        else:
            results.append(True)
        write_cb(
            [
                f"capacitive-probe-{sensor_id.name}",
                capacitance,
                _bool_to_pass_fail(results[-1]),
            ]
        )

        offsets: List[Point] = []
        for trial in range(2):
            print("probing deck slot #5")
            if trial > 0 and not api.is_simulator:
                input("`REINSTALL` the probe, press ENTER when ready: ")
            await api.home()
            if api.is_simulator:
                pass
            try:
                probe = sensor_to_probe[sensor_id]
                await calibrate_pipette(api, mount, slot=5, probe=probe)  # type: ignore[arg-type]
            except (
                EdgeNotFoundError,
                EarlyCapacitiveSenseTrigger,
                CalibrationStructureNotFoundError,
            ) as e:
                print(f"ERROR: {e}")
                write_cb([f"probe-slot-{sensor_id.name}-{trial}", None, None, None])
            else:
                pip = api.hardware_pipettes[mount.to_mount()]
                assert pip
                o = pip.pipette_offset.offset
                print(f"found offset: {o}")
                write_cb(
                    [
                        f"probe-slot-{sensor_id.name}-{trial}",
                        round(o.x, 2),
                        round(o.y, 2),
                        round(o.z, 2),
                    ]
                )
                offsets.append(o)
            await api.retract(mount)
        if (
            not api.is_simulator
            and len(offsets) > 1
            and (
                abs(offsets[0].x - offsets[1].x) <= PROBING_DECK_PRECISION_MM
                and abs(offsets[0].y - offsets[1].y) <= PROBING_DECK_PRECISION_MM
                and abs(offsets[0].z - offsets[1].z) <= PROBING_DECK_PRECISION_MM
            )
        ):
            results.append(True)
        else:
            results.append(False)
        probe_slot_result = _bool_to_pass_fail(results[-1])
        print(f"probe-slot-{sensor_id.name}-result: {probe_slot_result}")
        write_cb([f"capacitive-probe-{sensor_id.name}-slot-result", probe_slot_result])

        if len(offsets) > 1:
            probe_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
            probe_pos += Point(13, 13, 0)
            if sensor_id == SensorId.S1:
                probe_pos += Point(x=0, y=9 * 7, z=0)
            api.add_tip(mount, api.config.calibration.probe_length)
            print(f"Moving to: {probe_pos}")
            # start probe 5mm above deck
            _probe_start_mm = probe_pos.z + 5
            current_pos = await api.gantry_position(mount)
            if current_pos.z < _probe_start_mm:
                await api.move_to(mount, current_pos._replace(z=_probe_start_mm))
                current_pos = await api.gantry_position(mount)
            await api.move_to(mount, probe_pos._replace(z=current_pos.z))
            await api.move_to(mount, probe_pos)
            capacitance = await _read_cap(sensor_id)
            print(f"square capacitance {sensor_id.name}: {capacitance}")
            if (
                capacitance < CAP_THRESH_SQUARE[pip.channels][0]
                or capacitance > CAP_THRESH_SQUARE[pip.channels][1]
            ):
                results.append(False)
                print(f"FAIL: square capacitance ({capacitance}) is not correct")
            else:
                results.append(True)
        else:
            results.append(False)
        write_cb(
            [
                f"capacitive-square-{sensor_id.name}",
                capacitance,
                _bool_to_pass_fail(results[-1]),
            ]
        )
        await api.home_z(mount)
        if not api.is_simulator:
            _get_operator_answer_to_question('REMOVE the probe, enter "y" when removed')
        api.remove_tip(mount)

    return all(results)


async def _test_diagnostics_pressure(
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    print("testing pressure")
    results: List[bool] = []
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_channels = int(pip.channels)
    sensor_ids = [SensorId.S0]
    if pip.channels == 8:
        sensor_ids.append(SensorId.S1)
    api.add_tip(mount, 0.1)
    await api.prepare_for_aspirate(mount)
    api.remove_tip(mount)

    async def _read_pressure(_sensor_id: SensorId) -> float:
        return await _read_pipette_sensor_repeatedly_and_average(
            api, mount, SensorType.pressure, 10, _sensor_id
        )

    for sensor_id in sensor_ids:
        pressure = await _read_pressure(sensor_id)
        print(f"pressure-open-air-{sensor_id.name}: {pressure}")
        if (
            pressure < PRESSURE_THRESH_OPEN_AIR[pip_channels][0]
            or pressure > PRESSURE_THRESH_OPEN_AIR[pip_channels][1]
        ):
            results.append(False)
            print(
                f"FAIL: open-air {sensor_id.name} pressure ({pressure}) is not correct"
            )
        else:
            results.append(True)
        write_cb(
            [
                f"pressure-open-air-{sensor_id.name}",
                pressure,
                _bool_to_pass_fail(results[-1]),
            ]
        )

    # PICK-UP TIP(S)
    _, bottom, _, _ = helpers_ot3.get_plunger_positions_ot3(api, mount)
    print("moving plunger to bottom")
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, bottom)
    await _pick_up_tip_for_tip_volume(api, mount, tip_volume=50)
    await api.retract(mount)

    # SEALED PRESSURE
    if not api.is_simulator:
        _get_operator_answer_to_question(
            'COVER tip(s) with finger(s), enter "y" when ready'
        )
    for sensor_id in sensor_ids:
        pressure = await _read_pressure(sensor_id)
        print(f"pressure-sealed: {pressure}")
        if (
            pressure < PRESSURE_THRESH_SEALED[pip_channels][0]
            or pressure > PRESSURE_THRESH_SEALED[pip_channels][1]
        ):
            results.append(False)
            print(f"FAIL: sealed {sensor_id.name} pressure ({pressure}) is not correct")
        else:
            results.append(True)
        write_cb(
            [
                f"pressure-sealed-{sensor_id.name}",
                pressure,
                _bool_to_pass_fail(results[-1]),
            ]
        )

    # COMPRESSED
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_vol = int(pip.working_volume)
    pip_channels = int(pip.channels)
    plunger_aspirate_ul = PRESSURE_ASPIRATE_VOL[pip_channels][pip_vol]
    print(f"aspirate {plunger_aspirate_ul} ul")
    await api.aspirate(mount, plunger_aspirate_ul)
    for sensor_id in sensor_ids:
        pressure = await _read_pressure(sensor_id)
        print(f"pressure-compressed-{sensor_id.name}: {pressure}")
        if (
            pressure < PRESSURE_THRESH_COMPRESS[pip_channels][0]
            or pressure > PRESSURE_THRESH_COMPRESS[pip_channels][1]
        ):
            results.append(False)
            print(
                f"FAIL: compressed {sensor_id.name} pressure ({pressure}) is not correct"
            )
        else:
            results.append(True)
        write_cb(
            [
                f"pressure-compressed-{sensor_id.name}",
                pressure,
                _bool_to_pass_fail(results[-1]),
            ]
        )

    if not api.is_simulator:
        _get_operator_answer_to_question('REMOVE your finger, enter "y" when ready')
    print("moving plunger back down to BOTTOM position")
    await api.dispense(mount)
    await api.prepare_for_aspirate(mount)

    await _drop_tip_in_trash(api, mount)
    return all(results)


async def _test_diagnostics(
    api: OT3API, mount: OT3Mount, write_cb: Callable, cfg: TestConfig
) -> bool:
    # ENVIRONMENT SENSOR
    environment_pass = await _test_diagnostics_environment(api, mount, write_cb)
    print(f"environment: {_bool_to_pass_fail(environment_pass)}")
    write_cb(["diagnostics-environment", _bool_to_pass_fail(environment_pass)])
    # ENCODER
    encoder_pass = await _test_diagnostics_encoder(api, mount, write_cb)
    print(f"encoder: {_bool_to_pass_fail(encoder_pass)}")
    write_cb(["diagnostics-encoder", _bool_to_pass_fail(encoder_pass)])
    # CAPACITIVE SENSOR
    print("SKIPPING CAPACITIVE TESTS")
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    capacitance_pass = await _test_diagnostics_capacitive(api, mount, write_cb)
    print(f"capacitance: {_bool_to_pass_fail(capacitance_pass)}")
    write_cb(["diagnostics-capacitance", _bool_to_pass_fail(capacitance_pass)])
    # PRESSURE
    if not cfg.skip_all_pressure:
        pressure_pass = await _test_diagnostics_pressure(api, mount, write_cb)
        print(f"pressure: {_bool_to_pass_fail(pressure_pass)}")
    else:
        print("Skipping pressure")
        pressure_pass = True
    write_cb(["diagnostics-pressure", _bool_to_pass_fail(pressure_pass)])

    return environment_pass and pressure_pass and encoder_pass and capacitance_pass


async def _test_plunger_positions(
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    print("homing Z axis")
    await api.home([Axis.by_mount(mount)])
    print("homing the plunger")
    await api.home([Axis.of_main_tool_actuator(mount)])
    _, bottom, blow_out, drop_tip = helpers_ot3.get_plunger_positions_ot3(api, mount)
    print("moving plunger to BLOW-OUT")
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, blow_out)
    if api.is_simulator:
        blow_out_passed = True
    else:
        blow_out_passed = _get_operator_answer_to_question("is BLOW-OUT correct?")
    write_cb(["plunger-blow-out", _bool_to_pass_fail(blow_out_passed)])
    print("moving plunger to DROP-TIP")
    await helpers_ot3.move_plunger_absolute_ot3(api, mount, drop_tip)
    if api.is_simulator:
        drop_tip_passed = True
    else:
        drop_tip_passed = _get_operator_answer_to_question("is DROP-TIP correct?")
    write_cb(["plunger-drop-tip", _bool_to_pass_fail(drop_tip_passed)])
    print("homing the plunger")
    await api.home([Axis.of_main_tool_actuator(mount)])
    return blow_out_passed and drop_tip_passed


async def _jog_for_tip_state(
    api: OT3API,
    mount: OT3Mount,
    current_z: float,
    max_z: float,
    step_mm: float,
    criteria: Tuple[float, float],
    tip_state: TipStateType,
) -> bool:
    async def _jog(_step: float) -> None:
        nonlocal current_z
        await api.move_rel(mount, Point(z=_step))
        current_z = round(current_z + _step, 2)

    async def _matches_state(_state: TipStateType) -> bool:
        try:
            await asyncio.sleep(0.2)
            await api.verify_tip_presence(mount, _state)
            return True
        except FailedTipStateCheck:
            return False

    while (step_mm > 0 and current_z < max_z) or (step_mm < 0 and current_z > max_z):
        await _jog(step_mm)
        if await _matches_state(tip_state):
            passed = min(criteria) <= current_z <= max(criteria)
            print(f"found {tip_state.name} displacement: {current_z} ({passed})")
            return passed
    print(f"ERROR: did not find {tip_state.name} displacement: {current_z}")
    return False


async def _test_tip_presence_flag(
    api: OT3API, mount: OT3Mount, write_cb: Callable
) -> bool:
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_channels = pip.channels.value
    await api.retract(mount)
    slot_5_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    current_pos = await api.gantry_position(mount)
    await api.move_to(mount, slot_5_pos._replace(z=current_pos.z))
    await api.move_rel(mount, Point(z=-20))
    wiggle_passed = await _wait_for_tip_presence_state_change(api, seconds_to_wait=5)
    if not api.is_simulator:
        input("press ENTER to continue")

    if pip_channels == 1:
        offset_from_a1 = Point(x=9 * 11, y=9 * -7, z=-5)
    else:
        offset_from_a1 = Point(x=9 * 11, y=0, z=-5)
    nominal_test_pos = (
        IDEAL_LABWARE_LOCATIONS.tip_rack_50 + offset_from_a1  # type: ignore[operator]
    )
    await api.retract(mount)
    await helpers_ot3.move_to_arched_ot3(api, mount, nominal_test_pos)
    print("align NOZZLE with tip-rack HOLE:")
    await helpers_ot3.jog_mount_ot3(api, mount)
    nozzle_pos = await api.gantry_position(mount)
    print(f"nozzle: {nozzle_pos.z}")
    if pip_channels == 1:
        await api.move_rel(mount, Point(z=-6))
    else:
        await api.move_rel(mount, Point(z=-2))
    print("align EJECTOR with tip-rack HOLE:")
    await helpers_ot3.jog_mount_ot3(api, mount)
    ejector_pos = await api.gantry_position(mount)
    ejector_rel_pos = round(ejector_pos.z - nozzle_pos.z, 2)

    pick_up_criteria = {
        1: (
            ejector_rel_pos + -1.3,
            ejector_rel_pos + -2.5,
        ),
        8: (
            ejector_rel_pos + -1.9,
            ejector_rel_pos + -4.0,
        ),
    }[pip_channels]

    pick_up_result = await _jog_for_tip_state(
        api,
        mount,
        current_z=ejector_rel_pos,
        max_z=-10.5,
        criteria=pick_up_criteria,
        step_mm=-0.1,
        tip_state=TipStateType.PRESENT,
    )
    pick_up_pos = await api.gantry_position(mount)
    pick_up_pos_rel = round(pick_up_pos.z - nozzle_pos.z, 2)

    await api.move_to(mount, nozzle_pos + Point(z=-10.5))  # nominal tip depth
    drop_criteria = {
        1: (
            -10.5 + 1.2,
            -10.5 + 2.3,
        ),
        8: (
            -10.5 + 1.9,
            -10.5 + 4.0,
        ),
    }[pip_channels]
    drop_result = await _jog_for_tip_state(
        api,
        mount,
        current_z=-10.5,
        max_z=0.0,
        criteria=drop_criteria,
        step_mm=0.1,
        tip_state=TipStateType.ABSENT,
    )
    drop_pos = await api.gantry_position(mount)
    drop_pos_rel = round(drop_pos.z - nozzle_pos.z, 2)

    pick_up_disp = round(ejector_rel_pos - pick_up_pos_rel, 2)
    drop_disp = round(10.5 + drop_pos_rel, 2)
    write_cb(["tip-presence-ejector-height-above-nozzle", ejector_rel_pos])
    write_cb(
        [
            "tip-presence-pick-up-displacement",
            pick_up_disp,
            _bool_to_pass_fail(pick_up_result),
        ]
    )
    write_cb(["tip-presence-pick-up-height-above-nozzle", pick_up_pos_rel])
    write_cb(
        ["tip-presence-drop-displacement", drop_disp, _bool_to_pass_fail(drop_result)]
    )
    write_cb(["tip-presence-drop-height-above-nozzle", drop_pos_rel])
    write_cb(["tip-presence-wiggle", _bool_to_pass_fail(wiggle_passed)])
    return pick_up_result and drop_result and wiggle_passed


@dataclass
class _LiqProbeCfg:
    mount_speed: float
    plunger_speed: float
    sensor_threshold_pascals: float


PROBE_SETTINGS: Dict[int, Dict[int, _LiqProbeCfg]] = {
    50: {
        50: _LiqProbeCfg(
            mount_speed=11,
            plunger_speed=21,
            sensor_threshold_pascals=150,
        ),
    },
    1000: {
        50: _LiqProbeCfg(
            mount_speed=5,
            plunger_speed=10,
            sensor_threshold_pascals=200,
        ),
        200: _LiqProbeCfg(
            mount_speed=5,
            plunger_speed=10,
            sensor_threshold_pascals=200,
        ),
        1000: _LiqProbeCfg(
            mount_speed=5,
            plunger_speed=11,
            sensor_threshold_pascals=150,
        ),
    },
}


async def _test_liquid_probe(
    api: OT3API,
    mount: OT3Mount,
    tip_volume: int,
    trials: int,
    probes: List[InstrumentProbeType],
) -> Dict[InstrumentProbeType, List[float]]:
    pip = api.hardware_pipettes[mount.to_mount()]
    assert pip
    pip_vol = int(pip.working_volume)
    trial_results: Dict[InstrumentProbeType, List[float]] = {
        probe: [] for probe in probes
    }
    hover_mm = 3
    max_submerge_mm = -3
    max_z_distance_machine_coords = hover_mm - max_submerge_mm  # FIXME: deck coords
    assert CALIBRATED_LABWARE_LOCATIONS.plate_primary is not None
    if InstrumentProbeType.SECONDARY in probes:
        assert CALIBRATED_LABWARE_LOCATIONS.plate_secondary is not None
    for trial in range(trials):
        await api.home()
        await _pick_up_tip_for_tip_volume(api, mount, tip_volume)
        for probe in probes:
            await _move_to_above_plate_liquid(api, mount, probe, height_mm=hover_mm)
            probe_cfg = PROBE_SETTINGS[pip_vol][tip_volume]
            probe_settings = LiquidProbeSettings(
                mount_speed=probe_cfg.mount_speed,
                plunger_speed=probe_cfg.plunger_speed,
                plunger_impulse_time=0.2,
                sensor_threshold_pascals=probe_cfg.sensor_threshold_pascals,
                aspirate_while_sensing=False,
                z_overlap_between_passes_mm=0.1,
                plunger_reset_offset=2.0,
                samples_for_baselining=20,
                sample_time_sec=0.004,
            )
            end_z = await api.liquid_probe(
                mount, max_z_distance_machine_coords, probe_settings, probe=probe
            )
            if probe == InstrumentProbeType.PRIMARY:
                pz = CALIBRATED_LABWARE_LOCATIONS.plate_primary.z
            else:
                pz = CALIBRATED_LABWARE_LOCATIONS.plate_secondary.z  # type: ignore[union-attr]
            error_mm = end_z - pz
            print(f"liquid-probe error: {error_mm}")
            trial_results[probe].append(error_mm)  # store the mm error from target
        await _drop_tip_in_trash(api, mount)
    return trial_results


@dataclass
class CSVCallbacks:
    """CSV callback functions."""

    write: Callable
    pressure: Callable
    results: Callable


@dataclass
class CSVProperties:
    """CSV properties."""

    id: str
    name: str
    path: str


def _create_csv_and_get_callbacks(
    pipette_sn: str,
) -> Tuple[CSVProperties, CSVCallbacks]:
    run_id = data.create_run_id()
    test_name = Path(__file__).parent.name.replace("_", "-")
    folder_path = data.create_folder_for_test_data(test_name)
    run_path = data.create_folder_for_test_data(folder_path / run_id)
    file_name = data.create_file_name(test_name, run_id, pipette_sn)
    csv_display_name = os.path.join(run_path, file_name)
    print(f"CSV: {csv_display_name}")
    start_time = time()

    def _append_csv_data(
        data_list: List[Any],
        line_number: Optional[int] = None,
        first_row_value: Optional[str] = None,
        first_row_value_included: bool = False,
    ) -> None:
        # every line in the CSV file begins with the elapsed seconds
        if not first_row_value_included:
            if first_row_value is None:
                first_row_value = str(round(time() - start_time, 2))
            data_list = [first_row_value] + data_list
        data_str = ",".join([str(d) for d in data_list])
        if line_number is None:
            data.append_data_to_file(test_name, run_id, file_name, data_str + "\n")
        else:
            data.insert_data_to_file(
                test_name, run_id, file_name, data_str + "\n", line_number
            )

    def _cache_pressure_data_callback(
        d: List[Any], first_row_value: Optional[str] = None
    ) -> None:
        if first_row_value is None:
            first_row_value = str(round(time() - start_time, 2))
        data_list = [first_row_value] + d
        PRESSURE_DATA_CACHE.append(data_list)

    def _handle_final_test_results(t: str, r: bool) -> None:
        # save final test results to both the CSV and to display at end of script
        _res = [t, _bool_to_pass_fail(r)]
        _append_csv_data(_res)
        FINAL_TEST_RESULTS.append(_res)

    return (
        CSVProperties(id=run_id, name=test_name, path=csv_display_name),
        CSVCallbacks(
            write=_append_csv_data,
            pressure=_cache_pressure_data_callback,
            results=_handle_final_test_results,
        ),
    )


async def _wait_for_tip_presence_state_change(
    api: OT3API, seconds_to_wait: int
) -> bool:
    if not api.is_simulator:
        input("wiggle test, press ENTER when ready: ")
    print("prepare to wiggle the ejector, in 3 seconds...")
    for i in range(3):
        print(f"{i + 1}..")
        if not api.is_simulator:
            await asyncio.sleep(1)
    print("WIGGLE!")

    event = asyncio.Event()
    test_pass = True
    if not api.is_simulator:

        def _listener(message: MessageDefinition, arb_id: ArbitrationId) -> None:
            if isinstance(message, PushTipPresenceNotification):
                event.set()

        messenger = cast(OT3Controller, api._backend)._messenger
        messenger.add_listener(_listener)
        try:
            for i in range(seconds_to_wait):
                print(f"wiggle the ejector ({i + 1}/{seconds_to_wait} seconds)")
                try:
                    await asyncio.wait_for(event.wait(), 1.0)
                    test_pass = False  # event was set, so we failed the test
                    messenger.remove_listener(_listener)
                    break
                except asyncio.TimeoutError:
                    continue  # timed out, so keep waiting
        finally:
            messenger.remove_listener(_listener)
    if test_pass:
        print("PASS: no unexpected tip-presence")
    else:
        print("FAIL: tip-presence state changed unexpectedly")
    return test_pass


def _test_barcode(api: OT3API, pipette_sn: str) -> Tuple[str, bool]:
    if not api.is_simulator:
        barcode_sn = input("scan pipette barcode: ").strip()
    else:
        barcode_sn = str(pipette_sn)
    return barcode_sn, barcode_sn == pipette_sn


async def _main(test_config: TestConfig) -> None:  # noqa: C901
    global IDEAL_LABWARE_LOCATIONS
    global CALIBRATED_LABWARE_LOCATIONS
    global FINAL_TEST_RESULTS
    global PRESSURE_DATA_CACHE

    # connect to the pressure fixture (or simulate one)
    fixture = _connect_to_fixture(test_config)

    # create API instance, and get Pipette serial number
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=test_config.simulate,
        # pipette_left="p1000_single_v3.4",
        pipette_right="p1000_multi_v3.4",
    )

    # home and move to attach position
    await api.home([Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R])
    attach_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    current_pos = await api.gantry_position(OT3Mount.RIGHT)
    await api.move_to(OT3Mount.RIGHT, attach_pos._replace(z=current_pos.z))

    pips = {OT3Mount.from_mount(m): p for m, p in api.hardware_pipettes.items() if p}
    assert pips, "no pipettes attached"
    for mount, pipette in pips.items():
        pipette_sn = helpers_ot3.get_pipette_serial_ot3(pipette)
        print(f"Pipette: {pipette_sn} on the {mount.name} mount")
        if not api.is_simulator and not _get_operator_answer_to_question(
            "qc this pipette?"
        ):
            continue
        _reset_available_tip()

        # setup our labware locations
        pipette_volume = int(pipette.working_volume)
        pipette_channels = int(pipette.channels)
        IDEAL_LABWARE_LOCATIONS = _get_ideal_labware_locations(
            test_config, pipette_channels
        )
        CALIBRATED_LABWARE_LOCATIONS = LabwareLocations(
            trash=None,
            tip_rack_1000=None,
            tip_rack_200=None,
            tip_rack_50=None,
            reservoir=None,
            plate_primary=None,
            plate_secondary=None,
            fixture=None,
        )

        # callback function for writing new data to CSV file
        FINAL_TEST_RESULTS = []
        PRESSURE_DATA_CACHE = []
        csv_props, csv_cb = _create_csv_and_get_callbacks(pipette_sn)
        # cache the pressure-data header
        csv_cb.pressure(PRESSURE_DATA_HEADER, first_row_value="")

        if api.is_simulator:
            pcba_version = "C2"
        else:
            subsystem = SubSystem.of_mount(mount)
            pcba_version = api.attached_subsystems[subsystem].pcba_revision

        print(f"PCBA version: {pcba_version}")
        # add metadata to CSV
        # FIXME: create a set of CSV helpers, such that you can define a test-report
        #        schema/format/line-length/etc., before having to fill its contents.
        #        This would be very helpful, because changes to CVS length/contents
        #        will break the analysis done in our Sheets
        csv_cb.write(["--------"])
        csv_cb.write(["METADATA"])
        csv_cb.write(["test-name", csv_props.name])
        csv_cb.write(["operator-name", test_config.operator_name])
        csv_cb.write(["date", csv_props.id])  # run-id includes a date/time string
        csv_cb.write(["pipette", pipette_sn])
        csv_cb.write(["simulating" if test_config.simulate else "live"])
        csv_cb.write(["version", data.get_git_description()])
        csv_cb.write(["firmware", api.fw_version])
        csv_cb.write(["pcba-revision", pcba_version])
        # add test configurations to CSV
        csv_cb.write(["-------------------"])
        csv_cb.write(["TEST-CONFIGURATIONS"])
        for f in fields(test_config):
            csv_cb.write([f.name, getattr(test_config, f.name)])
        csv_cb.write(["-------------------"])
        csv_cb.write(["TEST-THRESHOLDS"])
        csv_cb.write(["temperature"] + [str(t) for t in TEMP_THRESH])
        csv_cb.write(["humidity"] + [str(t) for t in HUMIDITY_THRESH])
        csv_cb.write(
            ["capacitive-open-air"]
            + [str(t) for t in CAP_THRESH_OPEN_AIR[pipette_channels]]
        )
        csv_cb.write(
            ["capacitive-probe"] + [str(t) for t in CAP_THRESH_PROBE[pipette_channels]]
        )
        csv_cb.write(
            ["capacitive-square"]
            + [str(t) for t in CAP_THRESH_SQUARE[pipette_channels]]
        )
        csv_cb.write(
            [
                "pressure-microliters-aspirated",
                PRESSURE_ASPIRATE_VOL[pipette_channels][pipette_volume],
            ]
        )
        csv_cb.write(
            ["pressure-open-air"]
            + [str(t) for t in PRESSURE_THRESH_OPEN_AIR[pipette_channels]]
        )
        csv_cb.write(
            ["pressure-sealed"]
            + [str(t) for t in PRESSURE_THRESH_SEALED[pipette_channels]]
        )
        csv_cb.write(
            ["pressure-compressed"]
            + [str(t) for t in PRESSURE_THRESH_COMPRESS[pipette_channels]]
        )
        csv_cb.write(["probe-deck", PROBING_DECK_PRECISION_MM])
        csv_cb.write(
            ["liquid-probe-precision", LIQUID_PROBE_ERROR_THRESHOLD_PRECISION_MM]
        )
        csv_cb.write(
            ["liquid-probe-accuracy", LIQUID_PROBE_ERROR_THRESHOLD_ACCURACY_MM]
        )
        # add pressure thresholds to CSV
        csv_cb.write(["-----------------------"])
        csv_cb.write(["PRESSURE-CONFIGURATIONS"])
        for t, config in PRESSURE_CFG.items():
            for f in fields(config):
                csv_cb.write([t.value, f.name, getattr(config, f.name)])

        # run the test
        csv_cb.write(["----"])
        csv_cb.write(["TEST"])

        print("homing")
        await api.home([Axis.of_main_tool_actuator(mount)])
        barcode_sn, barcode_passed = _test_barcode(api, pipette_sn)
        csv_cb.write(
            [
                "pipette-barcode",
                pipette_sn,
                barcode_sn,
                _bool_to_pass_fail(barcode_passed),
            ]
        )
        pos_slot_3 = helpers_ot3.get_slot_calibration_square_position_ot3(3)
        current_pos = await api.gantry_position(mount)
        hover_over_slot_3 = pos_slot_3._replace(z=current_pos.z)

        if not test_config.skip_plunger or not test_config.skip_diagnostics:
            if not test_config.skip_diagnostics:
                await api.move_to(mount, hover_over_slot_3)
                await api.move_rel(mount, Point(z=-20))
                test_passed = await _test_diagnostics(
                    api, mount, csv_cb.write, test_config
                )
                await api.retract(mount)
                csv_cb.results("diagnostics", test_passed)
            if not test_config.skip_plunger:
                await api.move_to(mount, hover_over_slot_3)
                await api.move_rel(mount, Point(z=-20))
                test_passed = await _test_plunger_positions(api, mount, csv_cb.write)
                csv_cb.results("plunger", test_passed)

        if not test_config.skip_liquid_probe:
            tip_vols = [50] if pipette_volume == 50 else [50, 200, 1000]
            probes = [InstrumentProbeType.PRIMARY]
            if pipette_channels > 1:
                probes.append(InstrumentProbeType.SECONDARY)
            test_passed = True
            for tip_vol in tip_vols:
                # force the operator to re-calibrate the liquid for each tip-type
                CALIBRATED_LABWARE_LOCATIONS.plate_primary = None
                CALIBRATED_LABWARE_LOCATIONS.plate_secondary = None
                await _pick_up_tip_for_tip_volume(api, mount, tip_vol)
                for probe in probes:
                    await _move_to_plate_liquid(api, mount, probe=probe)
                await _drop_tip_in_trash(api, mount)
                probes_data = await _test_liquid_probe(
                    api, mount, tip_volume=tip_vol, trials=3, probes=probes
                )
                for probe in probes:
                    probe_data = probes_data[probe]
                    for trial, found_height in enumerate(probe_data):
                        csv_label = (
                            f"liquid-probe-{tip_vol}-"
                            f"tip-{probe.name.lower()}-probe-trial-{trial}"
                        )
                        csv_cb.write([csv_label, round(found_height, 2)])
                    precision = abs(max(probe_data) - min(probe_data)) * 0.5
                    accuracy = sum(probe_data) / len(probe_data)
                    prec_tag = f"liquid-probe-{tip_vol}-tip-{probe.name.lower()}-probe-precision"
                    acc_tag = f"liquid-probe-{tip_vol}-tip-{probe.name.lower()}-probe-accuracy"
                    tip_tag = f"liquid-probe-{tip_vol}-tip-{probe.name.lower()}-probe"
                    precision_passed = bool(
                        precision < LIQUID_PROBE_ERROR_THRESHOLD_PRECISION_MM
                    )
                    accuracy_passed = bool(
                        abs(accuracy) < LIQUID_PROBE_ERROR_THRESHOLD_ACCURACY_MM
                    )
                    tip_passed = precision_passed and accuracy_passed
                    print(prec_tag, precision, _bool_to_pass_fail(precision_passed))
                    print(acc_tag, accuracy, _bool_to_pass_fail(accuracy_passed))
                    print(tip_tag, _bool_to_pass_fail(tip_passed))
                    csv_cb.write(
                        [prec_tag, precision, _bool_to_pass_fail(precision_passed)]
                    )
                    csv_cb.write(
                        [acc_tag, accuracy, _bool_to_pass_fail(accuracy_passed)]
                    )
                    csv_cb.write([tip_tag, _bool_to_pass_fail(tip_passed)])
                    if not tip_passed:
                        test_passed = False
            csv_cb.results("liquid-probe", test_passed)

        if not test_config.skip_liquid:
            for i in range(test_config.num_trials):
                droplet_wait_seconds = test_config.droplet_wait_seconds * (i + 1)
                test_passed = await _test_for_leak_by_eye(
                    api,
                    mount,
                    test_config,
                    tip_volume=pipette_volume,
                    droplet_wait_time=droplet_wait_seconds,
                )
                csv_cb.results(f"droplets-{droplet_wait_seconds}", test_passed)

        if not test_config.skip_fixture:
            test_passed = await _test_for_leak(
                api,
                mount,
                test_config,
                tip_volume=PRESSURE_FIXTURE_TIP_VOLUME,
                fixture=fixture,
                write_cb=csv_cb.write,
                accumulate_raw_data_cb=csv_cb.pressure,
            )
            csv_cb.results("pressure", test_passed)

        if not test_config.skip_tip_presence:
            test_passed = await _test_tip_presence_flag(api, mount, csv_cb.write)
            print("tip-presence: ", _bool_to_pass_fail(test_passed))
            csv_cb.results("tip-presence", test_passed)

        print("test complete")
        csv_cb.write(["-------------"])
        csv_cb.write(["PRESSURE-DATA"])
        for press_data in PRESSURE_DATA_CACHE:
            csv_cb.write(press_data, first_row_value_included=True)

        # put the top-line results at the top of the CSV file
        # so here we cache each data line, then add them to the top
        # of the file in reverse order
        _results_csv_lines = list()
        # add extra entries of black cells to the top of the CSV
        # to help operators when the copy/paste
        _results_csv_lines.append(
            ["-------"] + ["---" for _ in range(len(PRESSURE_DATA_HEADER) - 1)]
        )
        _results_csv_lines.append(["RESULTS"])
        print("final test results:")
        for result in FINAL_TEST_RESULTS:
            _results_csv_lines.append(result)
            print(" - " + "\t".join(result))
        _results_csv_lines.reverse()
        for r in _results_csv_lines:
            csv_cb.write(r, line_number=0, first_row_value="0.0")

        # print the filepath again, to help debugging
        print(f"CSV: {csv_props.name}")

        # move to attach position
        await api.retract(mount)
        current_pos = await api.gantry_position(OT3Mount.RIGHT)
        await api.move_to(OT3Mount.RIGHT, attach_pos._replace(z=current_pos.z))
    print("done")


if __name__ == "__main__":
    arg_parser = argparse.ArgumentParser(description="OT-3 Pipette Assembly QC Test")
    arg_parser.add_argument("--operator", type=str, default=None)
    arg_parser.add_argument("--skip-liquid", action="store_true")
    arg_parser.add_argument("--skip-fixture", action="store_true")
    arg_parser.add_argument("--skip-diagnostics", action="store_true")
    arg_parser.add_argument("--skip-plunger", action="store_true")
    arg_parser.add_argument("--skip-tip-presence", action="store_true")
    arg_parser.add_argument("--skip-liquid-probe", action="store_true")
    arg_parser.add_argument("--skip-all-pressure", action="store_true")
    arg_parser.add_argument("--fixture-side", choices=["left", "right"], default="left")
    arg_parser.add_argument("--port", type=str, default="")
    arg_parser.add_argument("--num-trials", type=int, default=2)
    arg_parser.add_argument(
        "--aspirate-sample-count",
        type=int,
        default=PRESSURE_CFG[PressureEvent.ASPIRATE_P50].sample_count,
    )
    arg_parser.add_argument("--wait", type=int, default=30)
    arg_parser.add_argument(
        "--slot-tip-rack-1000", type=int, default=DEFAULT_SLOT_TIP_RACK_1000
    )
    arg_parser.add_argument(
        "--slot-tip-rack-200", type=int, default=DEFAULT_SLOT_TIP_RACK_200
    )
    arg_parser.add_argument(
        "--slot-tip-rack-50", type=int, default=DEFAULT_SLOT_TIP_RACK_50
    )
    arg_parser.add_argument(
        "--slot-reservoir", type=int, default=DEFAULT_SLOT_RESERVOIR
    )
    arg_parser.add_argument("--slot-plate", type=int, default=DEFAULT_SLOT_PLATE)
    arg_parser.add_argument("--slot-fixture", type=int, default=DEFAULT_SLOT_FIXTURE)
    arg_parser.add_argument("--slot-trash", type=int, default=DEFAULT_SLOT_TRASH)
    arg_parser.add_argument("--simulate", action="store_true")
    args = arg_parser.parse_args()
    if args.operator:
        operator = args.operator
    elif not args.simulate:
        operator = input("OPERATOR name:").strip()
    else:
        operator = "simulation"
    _cfg = TestConfig(
        operator_name=operator,
        skip_liquid=args.skip_liquid,
        skip_fixture=args.skip_fixture or args.skip_all_pressure,
        skip_diagnostics=args.skip_diagnostics,
        skip_plunger=args.skip_plunger,
        skip_tip_presence=args.skip_tip_presence,
        skip_liquid_probe=args.skip_liquid_probe or args.skip_all_pressure,
        fixture_port=args.port,
        fixture_side=args.fixture_side,
        fixture_aspirate_sample_count=args.aspirate_sample_count,
        slot_tip_rack_1000=args.slot_tip_rack_1000,
        slot_tip_rack_200=args.slot_tip_rack_200,
        slot_tip_rack_50=args.slot_tip_rack_50,
        slot_reservoir=args.slot_reservoir,
        slot_plate=args.slot_plate,
        slot_fixture=args.slot_fixture,
        slot_trash=args.slot_trash,
        num_trials=args.num_trials,
        droplet_wait_seconds=args.wait,
        simulate=args.simulate,
        skip_all_pressure=args.skip_all_pressure,
    )
    # NOTE: overwrite default aspirate sample-count from user's input
    # FIXME: this value is being set in a few places, maybe there's a way to clean this up
    for tag in [PressureEvent.ASPIRATE_P50, PressureEvent.ASPIRATE_P1000]:
        PRESSURE_CFG[tag].sample_count = _cfg.fixture_aspirate_sample_count
    asyncio.run(_main(_cfg))
