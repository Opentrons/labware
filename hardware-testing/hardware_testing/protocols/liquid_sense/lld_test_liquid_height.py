"""Measure Liquid Height."""
from typing import List, Tuple, Optional
from opentrons.protocol_api import (
    ProtocolContext,
    Labware,
    Well,
    InstrumentContext,
    ParameterContext,
)
from opentrons.types import Point


###########################################
#  VARIABLES - START
###########################################
# TODO: use runtime-variables instead of constants

NUM_TRIALS = 12

ASPIRATE_MM_FROM_BOTTOM = 5
RESERVOIR = "nest_1_reservoir_195ml"

LIQUID_MOUNT = "right"
LIQUID_TIP_SIZE = 1000
LIQUID_PIPETTE_SIZE = 1000

PROBING_MOUNT = "left"
PROBING_TIP_SIZE = 50
PROBING_PIPETTE_SIZE = 50

SLOT_LIQUID_TIPRACK = "C3"
SLOT_PROBING_TIPRACK = "D3"
SLOT_LABWARE = "D1"
SLOT_RESERVOIR = "C1"
SLOT_DIAL = "B3"


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    from hardware_testing import protocols

    protocols.create_liquid_parameter(parameters)
    parameters.add_str(
        variable_name="probe_yes_or_no",
        display_name="Probe (Y/N)",
        description="Find Liquid height?",
        choices=[
            {"display_name": "Yes", "value": "yes"},
            {"display_name": "No", "value": "no"},
        ],
        default="yes",
    )
    protocols.create_labware_parameters(parameters)


###########################################
#  VARIABLES - END
###########################################

metadata = {"protocolName": "lld-test-liquid-height"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}

_all_96_well_names = [f"{r}{c + 1}" for c in range(12) for r in "ABCDEFGH"]
_first_row_well_names = [f"A{c + 1}" for c in range(12)]
_tube_names = ["A3", "A4", "B3", "B4"] * 8
TEST_WELLS = {
    1: {  # channel count
        "corning_96_wellplate_360ul_flat": _all_96_well_names,
        "armadillo_96_wellplate_200ul_pcr_full_skirt": _all_96_well_names,
        "nest_96_wellplate_2ml_deep": _all_96_well_names,
        "corning_96_wellplate_360ul_flat": _all_96_well_names,
        "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical": _tube_names,
    },
    8: {"nest_12_reservoir_15ml": _first_row_well_names},
}

DIAL_POS_WITHOUT_TIP: List[Optional[float]] = [None, None]
DIAL_PORT_NAME = "/dev/ttyUSB0"
DIAL_PORT = None
RUN_ID = ""
FILE_NAME = ""
CSV_HEADER = ["trial", "volume", "height", "tip-z-error", "corrected-height"]
CSV_SEPARATOR = ","
LABWARE_TYPE = ""
LIQUID_TYPE = ""
VOLUMES = []


def _setup(
    ctx: ProtocolContext,
) -> Tuple[
    InstrumentContext,
    Labware,
    InstrumentContext,
    Labware,
    Labware,
    Labware,
    Labware,
]:
    global DIAL_PORT, RUN_ID, FILE_NAME, LABWARE_TYPE, VOLUMES, LIQUID_TYPE, NUM_TRIALS
    # TODO: use runtime-variables instead of constants
    ctx.load_trash_bin("A3")
    LABWARE_TYPE = ctx.params.labware_type  # type: ignore[attr-defined]
    LIQUID_TYPE = ctx.params.liquid_type  # type: ignore[attr-defined]
    liquid_rack_name = f"opentrons_flex_96_tiprack_{LIQUID_TIP_SIZE}uL"
    liquid_rack = ctx.load_labware(liquid_rack_name, SLOT_LIQUID_TIPRACK)
    probing_rack_name = f"opentrons_flex_96_tiprack_{PROBING_TIP_SIZE}uL"
    probing_rack = ctx.load_labware(probing_rack_name, SLOT_PROBING_TIPRACK)
    if LABWARE_TYPE == "nest_12_reservoir_15ml":
        liquid_pip_name = f"flex_8channel_{LIQUID_PIPETTE_SIZE}"
    else:
        liquid_pip_name = f"flex_1channel_{LIQUID_PIPETTE_SIZE}"
    liquid_pipette = ctx.load_instrument(liquid_pip_name, LIQUID_MOUNT)
    probing_pip_name = f"flex_1channel_{PROBING_PIPETTE_SIZE}"
    probing_pipette = ctx.load_instrument(probing_pip_name, PROBING_MOUNT)

    reservoir = ctx.load_labware(RESERVOIR, SLOT_RESERVOIR)
    labware = ctx.load_labware(LABWARE_TYPE, SLOT_LABWARE)
    dial = ctx.load_labware("dial_indicator", SLOT_DIAL)

    # DETERMINE VOLUME LIST
    if (
        LABWARE_TYPE == "armadillo_96_wellplate_200ul_pcr_full_skirt"
        or LABWARE_TYPE == "corning_96_wellplate_360ul_flat"
    ):
        VOLUMES = [7, 10, 15, 25, 40, 60, 100, 200]
    elif LABWARE_TYPE == "nest_96_wellplate_2ml_deep":
        VOLUMES = [40, 50, 175, 200, 225, 275, 400, 1000]
    elif LABWARE_TYPE == "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical":
        VOLUMES = [250, 250, 500, 1000, 1000, 1000, 1000, 1000]
        NUM_TRIALS = 4
        # Actual Volumes = 250, 500, 1000, 2000, 3000, 4000, 5000, 6000
    elif LABWARE_TYPE == "nest_12_reservoir_15ml":
        VOLUMES = [200, 300, 400, 500, 600, 700, 800, 1000]

    if not ctx.is_simulating() and DIAL_PORT is None:
        from hardware_testing.data import create_file_name, create_run_id
        from hardware_testing.drivers.mitutoyo_digimatic_indicator import (
            Mitutoyo_Digimatic_Indicator,
        )

        DIAL_PORT = Mitutoyo_Digimatic_Indicator(port=DIAL_PORT_NAME)
        DIAL_PORT.connect()
        RUN_ID = create_run_id()
        FILE_NAME = create_file_name(
            metadata["protocolName"], RUN_ID, f"{liquid_pip_name}-{liquid_rack_name}"
        )
        _write_line_to_csv(ctx, [RUN_ID])
        _write_line_to_csv(ctx, [liquid_pip_name])
        _write_line_to_csv(ctx, [liquid_rack_name])
        _write_line_to_csv(ctx, [LABWARE_TYPE])

    return (
        liquid_pipette,
        liquid_rack,
        probing_pipette,
        probing_rack,
        labware,
        reservoir,
        dial,
    )


def _write_line_to_csv(ctx: ProtocolContext, line: List[str]) -> None:
    if ctx.is_simulating():
        return
    from hardware_testing.data import append_data_to_file

    line_str = f"{CSV_SEPARATOR.join(line)}\n"
    append_data_to_file(metadata["protocolName"], RUN_ID, FILE_NAME, line_str)


def _get_test_wells(labware: Labware, channels: int) -> List[Well]:
    return [labware[w] for w in TEST_WELLS[channels][labware.load_name]]


def _get_test_tips(rack: Labware, channels: int) -> List[Well]:
    if channels == 96:
        test_tips = [rack["A1"]]
    elif channels == 8:
        test_tips = rack.rows()[0]
    else:
        test_tips = rack.wells()
    return test_tips


def _read_dial_indicator(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    dial: Labware,
    front_channel: bool = False,
) -> float:
    target = dial["A1"].top()
    if front_channel:
        target = target.move(Point(y=9 * 7))
        if pipette.channels == 96:
            target = target.move(Point(x=9 * -11))
    pipette.move_to(target.move(Point(z=10)))
    pipette.move_to(target)
    ctx.delay(seconds=2)
    if ctx.is_simulating():
        return 0.0
    dial_port = DIAL_PORT.read()  # type: ignore[union-attr]
    pipette.move_to(target.move(Point(z=10)))
    return dial_port


def _store_dial_baseline(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    dial: Labware,
    front_channel: bool = False,
) -> None:
    global DIAL_POS_WITHOUT_TIP
    idx = 0 if not front_channel else 1
    if DIAL_POS_WITHOUT_TIP[idx] is not None:
        return
    DIAL_POS_WITHOUT_TIP[idx] = _read_dial_indicator(ctx, pipette, dial, front_channel)
    tag = f"DIAL-BASELINE-{idx}"
    _write_line_to_csv(ctx, [tag, str(DIAL_POS_WITHOUT_TIP[idx])])


def _get_tip_z_error(
    ctx: ProtocolContext,
    pipette: InstrumentContext,
    dial: Labware,
    front_channel: bool = False,
) -> float:
    idx = 0 if not front_channel else 1
    dial_baseline_for_this_channel = DIAL_POS_WITHOUT_TIP[idx]
    assert dial_baseline_for_this_channel is not None
    new_val = _read_dial_indicator(ctx, pipette, dial, front_channel)
    z_error = new_val - dial_baseline_for_this_channel
    # NOTE: dial-indicators are upside-down, so we need to flip the values
    return z_error * -1.0


def _get_height_of_liquid_in_well(
    pipette: InstrumentContext,
    well: Well,
) -> float:
    if pipette.detect_liquid_presence(well):
        height = pipette.measure_liquid_height(well) - well.bottom().point.z
    else:
        height = 0.0
    return height


def _test_for_finding_liquid_height(
    ctx: ProtocolContext,
    volume: float,
    liquid_pipette: InstrumentContext,
    probing_pipette: InstrumentContext,
    dial: Labware,
    liquid_tips: List[Well],
    probing_tips: List[Well],
    src_well: Well,
    wells: List[Well],
    dispense_from_bottom: float,
    probe_yes_or_no: str,
) -> None:
    assert len(liquid_tips) == len(
        probing_tips
    ), f"{len(liquid_tips)},{len(probing_tips)}"
    assert len(liquid_tips) == len(wells), f"{len(liquid_tips)},{len(wells)}"
    trial_counter = 0
    if probe_yes_or_no == "yes":
        _store_dial_baseline(ctx, probing_pipette, dial)
    _write_line_to_csv(ctx, CSV_HEADER)
    all_corrected_heights = []
    corrected_height_list = []
    volume_to_record = volume
    if LABWARE_TYPE == "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical":
        prev_vol = 0.0
    for liq_tip, probe_tip, well in zip(liquid_tips, probing_tips, wells):
        trial_counter += 1
        if trial_counter == 1:
            corrected_height_list.append(str(RUN_ID))
            if (
                LABWARE_TYPE == "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical"
                and prev_vol == 0.0
            ):
                prev_vol = volume
            elif (
                LABWARE_TYPE == "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical"
                and prev_vol > 0.0
            ):
                volume_to_record += prev_vol
            corrected_height_list.append(str(volume_to_record))
        # pickup probing tip, then measure Z-error
        if probe_yes_or_no == "yes":
            probing_pipette.pick_up_tip(probe_tip)
            tip_z_error = _get_tip_z_error(ctx, probing_pipette, dial)
        else:
            tip_z_error = 0
        # pickup liquid tip, then immediately transfer liquid
        liquid_pipette.pick_up_tip(liq_tip)
        if volume < 1000:
            liquid_pipette.aspirate(volume, src_well.bottom(ASPIRATE_MM_FROM_BOTTOM))
            liquid_pipette.dispense(volume, well.bottom(dispense_from_bottom))
        else:
            volume_divide_by_2 = volume / 2
            liquid_pipette.aspirate(
                volume_divide_by_2, src_well.bottom(ASPIRATE_MM_FROM_BOTTOM)
            )
            liquid_pipette.dispense(
                volume_divide_by_2, well.bottom(dispense_from_bottom)
            )
            liquid_pipette.aspirate(
                volume_divide_by_2, src_well.bottom(ASPIRATE_MM_FROM_BOTTOM)
            )
            liquid_pipette.dispense(
                volume_divide_by_2, well.bottom(dispense_from_bottom)
            )

        liquid_pipette.blow_out(well.top(z=-9)).prepare_to_aspirate()
        # get height of liquid
        if probe_yes_or_no == "yes":
            height = _get_height_of_liquid_in_well(probing_pipette, well)
        else:
            height = 0
        corrected_height = height + tip_z_error
        all_corrected_heights.append(corrected_height)
        # drop all tips
        liquid_pipette.return_tip()
        if probe_yes_or_no == "yes":
            probing_pipette.return_tip()
        # save data
        trial_data = [
            trial_counter,
            volume_to_record,
            height,
            tip_z_error,
            corrected_height,
        ]
        corrected_height_list.append(corrected_height)  # type: ignore[arg-type]
        _write_line_to_csv(ctx, [str(d) for d in trial_data])

    avg = sum(all_corrected_heights) / len(all_corrected_heights)
    error_mm = (max(all_corrected_heights) - min(all_corrected_heights)) * 0.5
    corrected_height_list.append(avg)  # type: ignore[arg-type]
    corrected_height_list.append(error_mm)  # type: ignore[arg-type]
    error_percent = error_mm / avg if avg else 0.0
    corrected_height_list.append(str(error_percent * 100))
    _write_line_to_csv(ctx, ["average", str(round(avg, 3))])
    _write_line_to_csv(ctx, ["error (mm)", str(round(error_mm, 3))])
    _write_line_to_csv(ctx, ["error (%)", str(round(error_percent * 100, 1))])
    _write_line_to_csv(ctx, ["Liquid Type", LIQUID_TYPE])


def run(ctx: ProtocolContext) -> None:
    """Run."""
    (
        liq_pipette,
        liq_rack,
        probe_pipette,
        probe_rack,
        labware,
        reservoir,
        dial,
    ) = _setup(ctx)
    # Parameters
    liq_pipette.flow_rate.blow_out = 800
    probe_yes_or_no = ctx.params.probe_yes_or_no  # type: ignore[attr-defined]
    dispense_from_bottom = 2
    test_wells = _get_test_wells(labware, channels=8)
    test_tips_liquid = _get_test_tips(liq_rack, channels=8)
    test_tips_probe = _get_test_tips(probe_rack, channels=8)
    stuff_lengths = len(test_tips_liquid), len(test_tips_probe), len(test_wells)
    assert min(stuff_lengths) >= NUM_TRIALS * len(VOLUMES), f"{stuff_lengths}"

    for _vol in VOLUMES:
        if LABWARE_TYPE == "nest_12_reservoir_15ml":
            _test_for_finding_liquid_height(
                ctx,
                _vol,
                liq_pipette,
                probe_pipette,
                dial,
                liquid_tips=test_tips_liquid[:NUM_TRIALS],
                probing_tips=test_tips_probe[:NUM_TRIALS],
                src_well=reservoir["A1"],
                wells=test_wells[:NUM_TRIALS],
                dispense_from_bottom=dispense_from_bottom,
                probe_yes_or_no=probe_yes_or_no,
            )
            ctx.pause("Reset labware and tipracks.")
        else:
            _test_for_finding_liquid_height(
                ctx,
                _vol,
                liq_pipette,
                probe_pipette,
                dial,
                liquid_tips=test_tips_liquid[:NUM_TRIALS],
                probing_tips=test_tips_probe[:NUM_TRIALS],
                src_well=reservoir["A1"],
                wells=test_wells[:NUM_TRIALS],
                dispense_from_bottom=dispense_from_bottom,
                probe_yes_or_no=probe_yes_or_no,
            )
            test_wells = test_wells[NUM_TRIALS:]
            test_tips_liquid = test_tips_liquid[NUM_TRIALS:]
            test_tips_probe = test_tips_probe[NUM_TRIALS:]
