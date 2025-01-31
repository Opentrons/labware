"""Measure Liquid Height 3mm."""
import math
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

# NOTE: The volumes below were calculated using Solidworks
#       models, they are the nominal volume inside the well
#       at both 3mm from bottom and 3mm from top.
# FIXME: replace this with actual Opentrons API software
#        volume estimations. No need for us to include Solidworks
#        in this testing loop.

# Default tube volumes are for 50 ml
VOLUMES_3MM_TOP_BOTTOM = {
    "corning_96_wellplate_360ul_flat": [257.1, 97.2, 0.0],
    "nest_96_wellplate_200ul_flat": [259.8, 96.3, 0.0],
    "opentrons_96_wellplate_200ul_pcr_full_skirt": [150.2, 14.3, 0.0],
    "nest_96_wellplate_2ml_deep": [2060.4, 118.3, 0.0],
    "nest_12_reservoir_15ml": [13236.1, 1219.0, 0.0],
    "nest_96_wellplate_100ul_pcr_full_skirt": [150.8, 15.5, 0.0],
    "appliedbiosystemsmicroamp_384_wellplate_40ul": [26.2, 7.44, 0.0],
    "thermoscientificnunc_96_wellplate_1300ul": [1155.1, 73.5, 0.0],
    "thermoscientificnunc_96_wellplate_2000ul": [1768.0, 73.5, 0.0],
    "biorad_96_wellplate_200ul_pcr": [161.2, 71.32, 17.9, 0.0],
    "nest_1_reservoir_290ml": [16570.4, 271690.5, 0.0],
    "corning_12_wellplate_6.9ml_flat": [5654.8, 1156.3, 0.0],
    "corning_24_wellplate_3.4ml_flat": [2853.4, 1701.37, 579.0, 0.0],
    "corning_6_wellplate_16.8ml_flat": [13901.9, 2862.1, 0.0],
    "corning_48_wellplate_1.6ml_flat": [1327.0, 790.63, 268.9, 0.0],
    "opentrons_24_tuberack_nest_0.5ml_screwcap": [795.4, 21.95, 0.0],
    "opentrons_24_tuberack_nest_1.5ml_screwcap": [19.5, 735.89, 1750.8, 0.0],
    "opentrons_24_tuberack_nest_1.5ml_snapcap": [28.7, 1739.7, 658.2, 0.0],
    "opentrons_24_tuberack_nest_2ml_screwcap": [2104.9, 66.6, 0.0],
    "opentrons_24_tuberack_nest_2ml_snapcap": [2148.5, 69.6, 0.0],
    "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical": [115.0, 26117.4, 56110.3, 0.0],
    "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical": [169.5, 57720.5, 0.0],
    "nest_1_reservoir_195ml": [14513.1, 178181.9, 0.0],
    "axygen_1_reservoir_90ml": [23136.9, 72854.8, 0.0],
    "agilent_1_reservoir_290ml": [15652.9, 141945.59, 268813.8],
    "opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap": [26.6, 593.7, 1629.9],
    "corning_384_wellplate_112ul_flat": [23.2, 50.1, 80.0],
    "biorad_384_wellplate_50ul": [28.7, 8.0, 0.0],
    "usascientific_12_reservoir_22ml": [68.4, 11356.9, 19797.4],
    "usascientific_96_wellplate_2.4ml_deep": [74.7, 1151.9, 2317.8],
    "opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap": [63.0, 2237.8, 0.0],
}

SAME_TIP = True  # this is fine when using Ethanol (b/c it evaporates)
RETURN_TIP = False
DISPENSE_MM_FROM_MENISCUS = -0.5

ASPIRATE_MM_FROM_MENISCUS = -2.0

LIQUID_MOUNT = "right"
LIQUID_PIPETTE_SIZE = 1000
LIQUID_CHANNELS = 1

PROBING_MOUNT = "left"
PROBING_TIP_SIZE = 50
PROBING_PIPETTE_SIZE = 50

SLOT_LIQUID_TIPRACK = "C3"
SLOT_PROBING_TIPRACK = "D3"
SLOT_LABWARE = "D1"
SLOT_RESERVOIR = "C1"
SLOT_DIAL = "B3"

###########################################
#  VARIABLES - END
###########################################


metadata = {"protocolName": "lld-test-liquid-height-3mm-06dec"}
requirements = {"robotType": "Flex", "apiLevel": "2.20"}


def add_parameters(parameters: ParameterContext) -> None:
    """Add parameters."""
    from hardware_testing import protocols

    protocols.create_pipette_parameters(parameters)
    protocols.create_labware_parameters(parameters)
    protocols.create_tube_volume_parameter(parameters)
    protocols.create_trials_parameter(parameters)


_src_meniscus_height: Optional[float] = None
_first_row_well_names = [f"A{c + 1}" for c in range(12)]
_50_ml_tubes = ["A3", "B3", "A4", "B4"]

TEST_WELLS = {
    1: {  # channel count
        "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical": _50_ml_tubes,
        "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical": _50_ml_tubes,
        "nest_12_reservoir_15ml": _first_row_well_names,
    },
    8: {
        "nest_1_reservoir_290ml": ["A1"] * 9,
        "nest_1_reservoir_195ml": ["A1"] * 9,
    },
}

DIAL_POS_WITHOUT_TIP: List[Optional[float]] = [None, None]
DIAL_PORT_NAME = "/dev/ttyUSB0"
DIAL_PORT = None
RUN_ID = ""
FILE_NAME = ""
CSV_HEADER = ["trial", "volume", "height", "tip-z-error", "corrected-height"]
CSV_SEPARATOR = ","


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
    int,
    int,
]:
    global DIAL_PORT, RUN_ID, FILE_NAME
    # TODO: use runtime-variables instead of constants
    # Variables
    # Pipette Types
    left_mount = ctx.params.left_mount  # type: ignore[attr-defined]
    right_mount = ctx.params.right_mount  # type: ignore[attr-defined]
    num_trials = ctx.params.num_of_trials  # type: ignore[attr-defined]
    if left_mount != "None":
        probing_pipette = ctx.load_instrument(left_mount, "left")
    if right_mount != "None":
        liquid_pipette = ctx.load_instrument(right_mount, "right")
        liquid_pip_name = right_mount

    ctx.load_trash_bin("A3")

    probing_rack_name = f"opentrons_flex_96_tiprack_{PROBING_TIP_SIZE}uL"
    probing_rack = ctx.load_labware(probing_rack_name, SLOT_PROBING_TIPRACK)

    LABWARE = ctx.params.labware_type  # type: ignore[attr-defined]
    tube_volume = ctx.params.tube_volume  # type: ignore[attr-defined]

    labware: Labware = ctx.load_labware(LABWARE, SLOT_LABWARE)
    labware_max_volume = labware["A1"].max_volume
    print(f"Labware max volume: {labware_max_volume}")
    if labware_max_volume < 50:
        LIQUID_TIP_SIZE = 50
    else:
        LIQUID_TIP_SIZE = 1000
    liquid_pip_channels = liquid_pipette.channels

    if tube_volume == 15:
        # Replace volumes with 15 ml volumes
        VOLUMES_3MM_TOP_BOTTOM["opentrons_10_tuberack_nest_4x50ml_6x15ml_conical"] = [
            17.3,
            7090.6,
            16077.5,
            0.0,
        ]
        VOLUMES_3MM_TOP_BOTTOM["opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical"] = [
            42.2,
            15956.6,
            0.0,
        ]
    volumes = VOLUMES_3MM_TOP_BOTTOM[labware.load_name]
    total_volume_to_aspirate = 0.0
    for one_vols in volumes:
        total_volume_to_aspirate += one_vols * num_trials
    if liquid_pip_channels == 1 and total_volume_to_aspirate < 1000:
        RESERVOIR = "opentrons_15_tuberack_nest_15ml_conical"
    else:
        RESERVOIR = "nest_1_reservoir_195ml"

    reservoir = ctx.load_labware(RESERVOIR, SLOT_RESERVOIR)
    if len(labware.wells()) > 96:
        LIQUID_TIP_SIZE = 50
    liquid_rack_name = f"opentrons_flex_96_tiprack_{LIQUID_TIP_SIZE}uL"
    liquid_rack = ctx.load_labware(liquid_rack_name, SLOT_LIQUID_TIPRACK)

    dial = ctx.load_labware("dial_indicator", SLOT_DIAL)

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
        _write_line_to_csv(ctx, [LABWARE])
        _write_line_to_csv(ctx, ["depth", str(labware["A1"].depth)])
    return (
        liquid_pipette,
        liquid_rack,
        probing_pipette,
        probing_rack,
        labware,
        reservoir,
        dial,
        tube_volume,
        num_trials,
    )


def _write_line_to_csv(ctx: ProtocolContext, line: List[str]) -> None:
    if ctx.is_simulating():
        return
    from hardware_testing.data import append_data_to_file

    line_str = f"{CSV_SEPARATOR.join(line)}\n"
    append_data_to_file(metadata["protocolName"], RUN_ID, FILE_NAME, line_str)


def _get_test_wells(
    labware: Labware, channels: int, tube_volume: int, total_test_wells: int
) -> List[Well]:
    well_names = []
    try:
        if tube_volume == 15:
            print("cHANGING LABWARE WELLS")

            TEST_WELLS[channels]["opentrons_10_tuberack_nest_4x50ml_6x15ml_conical"] = [
                "A1",
                "B1",
                "C1",
                "A2",
                "B2",
                "C2",
            ]
            TEST_WELLS[channels][
                "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical"
            ] = ["A1", "B1", "C1", "A2", "B2", "C2"]
            well_names = TEST_WELLS[channels][labware.load_name]
            print(TEST_WELLS[channels][labware.load_name])
        else:
            well_names = TEST_WELLS[channels][labware.load_name]
    except KeyError:
        well_names = [
            str(well_name).split(" ")[0].replace(" ", "")
            for well_name in labware.wells()
        ]
        print(len(well_names))
    print(well_names)
    amount_of_well_names = len(well_names)
    if amount_of_well_names < total_test_wells:
        wells_needed = total_test_wells - amount_of_well_names
        repeat_times = (
            wells_needed // len(well_names)
        ) + 1  # Calculate how many times to repeat
        # Extend well_names by repeating it, then trim any excess elements
        well_names.extend(well_names * repeat_times)
        diff_after_extension = len(well_names) - total_test_wells
        well_names = well_names[:-diff_after_extension]
    return [labware[w] for w in well_names]


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


def _test_for_finding_liquid_height(  # noqa: C901
    ctx: ProtocolContext,
    volume: float,
    liquid_pipette: InstrumentContext,
    probing_pipette: InstrumentContext,
    dial: Labware,
    liquid_tips: List[Well],
    probing_tips: List[Well],
    src_well: Well,
    wells: List[Well],
) -> None:
    global _src_meniscus_height
    assert len(liquid_tips) == len(
        probing_tips
    ), f"{len(liquid_tips)},{len(probing_tips)}"
    assert len(liquid_tips) == len(wells), f"{len(liquid_tips)},{len(wells)}"
    trial_counter = 0
    _store_dial_baseline(ctx, probing_pipette, dial)
    _write_line_to_csv(ctx, CSV_HEADER)
    all_corrected_heights: List[float] = []
    for liq_tip, probe_tip, well in zip(liquid_tips, probing_tips, wells):
        trial_counter += 1
        # pickup probing tip, then measure Z-error
        if not probing_pipette.has_tip:
            probing_pipette.pick_up_tip(probe_tip)
        else:
            # try and get any remaining droplets out of the way
            probing_pipette.aspirate().dispense().prepare_to_aspirate()
        tip_z_error = _get_tip_z_error(ctx, probing_pipette, dial)
        total_vol_in_tube = 0.0
        if volume:
            # transfer over and over until all volume is moved
            if volume < 15650:
                need_to_transfer_per_ch = volume / liquid_pipette.channels
                # set flow-rates
                liquid_pipette.flow_rate.aspirate = min(
                    max(min(liquid_pipette.max_volume, need_to_transfer_per_ch), 10),
                    200,
                )
                liquid_pipette.flow_rate.dispense = min(
                    liquid_pipette.flow_rate.aspirate, 50
                )
                liquid_pipette.flow_rate.blow_out = 100
                if _src_meniscus_height is None:
                    _src_meniscus_height = src_well.depth - 1.0
                if src_well.diameter:
                    src_well_z_ul_per_mm = math.pi * math.pow(
                        src_well.diameter * 0.5, 2
                    )
                elif src_well.width is not None and src_well.length is not None:
                    src_well_z_ul_per_mm = src_well.width * src_well.length
                else:
                    src_well_z_ul_per_mm = 0.0

                while need_to_transfer_per_ch > 0.001:
                    transfer_vol = min(
                        liquid_pipette.max_volume * 0.9, need_to_transfer_per_ch
                    )
                    if not liquid_pipette.has_tip:
                        liquid_pipette.pick_up_tip(liq_tip)
                        # NOTE: only use new, dry tips to probe
                        if not ctx.is_simulating():
                            _src_meniscus_height = (
                                liquid_pipette.measure_liquid_height(src_well)
                                - src_well.bottom().point.z
                            )
                    else:
                        # try and get any remaining droplets out of the way
                        liquid_pipette.move_to(src_well.top(10))
                        liquid_pipette.aspirate().blow_out().prepare_to_aspirate()
                    # aspirate
                    meniscus_shift_mm = transfer_vol / src_well_z_ul_per_mm
                    draft_multiplier = 1.2 if src_well.diameter else 1.5
                    _src_meniscus_height -= draft_multiplier * meniscus_shift_mm
                    asp_mm = max(_src_meniscus_height + -2, 2)
                    liquid_pipette.aspirate(transfer_vol, src_well.bottom(asp_mm))
                    need_to_transfer_per_ch -= transfer_vol
                    ctx.comment(
                        f"Aspirated {round(transfer_vol, 2)} from src, "
                        f"removed {round(meniscus_shift_mm, 2)} mm, "
                        f"now is {round(_src_meniscus_height, 2)} mm tall,"
                        f"aspirating from {round(asp_mm, 2)} from bottom."
                    )
                    liquid_pipette.move_to(src_well.bottom(_src_meniscus_height + 5))
                    ctx.delay(seconds=1.5)
                    liquid_pipette.touch_tip(src_well, speed=30)
                    did_air_gap = False
                    if transfer_vol <= liquid_pipette.max_volume - 5:
                        liquid_pipette.aspirate(5, src_well.top(2))
                        did_air_gap = True
                    # dispense
                    if did_air_gap:
                        liquid_pipette.dispense(5, well.top(5))
                    # default will be to dispense from top
                    if volume > well.max_volume * 0.5:
                        dispense_loc = well.top(-3 + DISPENSE_MM_FROM_MENISCUS)
                    else:
                        dispense_loc = well.bottom(3 + DISPENSE_MM_FROM_MENISCUS)
                    liquid_pipette.dispense(transfer_vol, dispense_loc)
                    total_vol_in_tube += transfer_vol
                    ctx.delay(seconds=1.5)
                    liquid_pipette.move_to(well.top())
                    ctx.delay(seconds=1.5)
                    liquid_pipette.blow_out(well.top())
                    ctx.delay(seconds=1.5)
                    liquid_pipette.prepare_to_aspirate()
                # get height of liquid
            else:
                ctx.pause("Fill well.")
            height = probing_pipette.measure_liquid_height(well) - well.bottom().point.z
        else:
            is_empty = not probing_pipette.detect_liquid_presence(well)
            height = (
                0.0 if is_empty else -9999
            )  # some obviously fake number so we know it failed
        corrected_height = height + tip_z_error
        all_corrected_heights.append(corrected_height)
        ctx.pause("CHECK LABWARE")
        # drop tips
        if not SAME_TIP:
            if liquid_pipette.has_tip:
                if RETURN_TIP:
                    liquid_pipette.return_tip()
                else:
                    liquid_pipette.drop_tip()
        # NOTE: always return probing tip, b/c it must be dry
        if RETURN_TIP:
            probing_pipette.return_tip()
        else:
            probing_pipette.drop_tip()
        # save data
        trial_data = [trial_counter, volume, height, tip_z_error, corrected_height]
        _write_line_to_csv(ctx, [str(d) for d in trial_data])

    avg = sum(all_corrected_heights) / len(all_corrected_heights)
    error_mm = (max(all_corrected_heights) - min(all_corrected_heights)) * 0.5
    error_percent = error_mm / avg if avg else 0.0
    _write_line_to_csv(ctx, ["average", str(round(avg, 3))])
    _write_line_to_csv(ctx, ["error (mm)", str(round(error_mm, 3))])
    _write_line_to_csv(ctx, ["error (%)", str(round(error_percent * 100, 1))])


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
        tube_volume,
        num_trials,
    ) = _setup(ctx)
    channels_liquid = liq_pipette.channels
    channels_probe = probe_pipette.channels
    test_tips_liquid = _get_test_tips(liq_rack, channels=channels_liquid)
    test_tips_probe = _get_test_tips(probe_rack, channels=channels_probe)
    # FIXME: calculate nominal volumes at +3mm from bottom and -3mm from top
    #        using Opentrons API (not Solidworks)
    try:
        if tube_volume == 15:
            # Replace volumes with 15 ml volumes
            VOLUMES_3MM_TOP_BOTTOM[
                "opentrons_10_tuberack_nest_4x50ml_6x15ml_conical"
            ] = [17.3, 7090.6, 16077.5, 0.0]
            VOLUMES_3MM_TOP_BOTTOM[
                "opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical"
            ] = [42.2, 15956.6, 0.0]
        volumes = VOLUMES_3MM_TOP_BOTTOM[labware.load_name]
    except KeyError:
        volumes = [0.0, 0.0, 0.0]
        ctx.comment(f"No volumes loaded for labware {labware.load_name}")
    total_test_wells = len(volumes) * num_trials
    test_wells = _get_test_wells(
        labware, channels=1, tube_volume=tube_volume, total_test_wells=total_test_wells
    )
    stuff_lengths = len(test_tips_liquid), len(test_tips_probe), len(test_wells)

    assert min(stuff_lengths) >= num_trials * len(volumes), f"{stuff_lengths}"
    for _vol in volumes:
        _test_for_finding_liquid_height(
            ctx,
            _vol,
            liq_pipette,
            probe_pipette,
            dial,
            liquid_tips=test_tips_liquid[:num_trials],
            probing_tips=test_tips_probe[:num_trials],
            src_well=reservoir["A1"],
            wells=test_wells[:num_trials],
        )
        test_wells = test_wells[num_trials:]
        test_tips_liquid = test_tips_liquid[num_trials:]
        test_tips_probe = test_tips_probe[num_trials:]
    if liq_pipette.has_tip:
        liq_pipette.return_tip() if RETURN_TIP else liq_pipette.drop_tip()
    if probe_pipette.has_tip:
        probe_pipette.return_tip() if RETURN_TIP else probe_pipette.drop_tip()
