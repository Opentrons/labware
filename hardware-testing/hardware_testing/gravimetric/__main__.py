"""Gravimetric OT3."""
from json import load as json_load
from pathlib import Path
import argparse
from typing import List, Union, Dict, Optional, Any, Tuple
from dataclasses import dataclass
from opentrons.protocol_api import ProtocolContext
from . import report
import subprocess
from time import sleep

from hardware_testing.data import create_run_id_and_start_time, ui, get_git_description
from hardware_testing.protocols.gravimetric_lpc.gravimetric import (
    gravimetric_ot3_p1000_96,
    gravimetric_ot3_p200_96,
    gravimetric_ot3_p1000_multi,
    gravimetric_ot3_p1000_single,
    gravimetric_ot3_p50_single,
    gravimetric_ot3_p1000_multi_50ul_tip_increment,
    gravimetric_ot3_p1000_multi_200ul_tip_increment,
    gravimetric_ot3_p50_multi,
    gravimetric_ot3_p1000_multi_1000ul_tip_increment,
    gravimetric_ot3_p50_multi_50ul_tip_increment,
)
from hardware_testing.protocols.gravimetric_lpc.photometric import (
    photometric_ot3_p1000_multi,
    photometric_ot3_p1000_single,
    photometric_ot3_p50_multi,
    photometric_ot3_p1000_96,
    photometric_ot3_p200_96,
    photometric_ot3_p50_single,
)

from . import execute, helpers, workarounds, execute_photometric
from .config import (
    GravimetricConfig,
    GANTRY_MAX_SPEED,
    PhotometricConfig,
    ConfigType,
    get_tip_volumes_for_qc,
)
from .measurement.record import GravimetricRecorder
from .measurement import DELAY_FOR_MEASUREMENT, SupportedLiquid
from .measurement.scale import Scale
from .trial import TestResources, _change_pipettes
from .tips import get_tips
from hardware_testing.drivers import asair_sensor
from opentrons.protocol_api import InstrumentContext
from opentrons.protocol_engine.types import LabwareOffset

API_LEVEL = "2.18"

LABWARE_OFFSETS: List[LabwareOffset] = []

# Keyed by pipette volume, channel count, and tip volume in that order
GRAVIMETRIC_CFG = {
    50: {
        1: gravimetric_ot3_p50_single,
        8: gravimetric_ot3_p50_multi,
    },
    200: {
        96: gravimetric_ot3_p200_96,
    },
    1000: {
        1: gravimetric_ot3_p1000_single,
        8: gravimetric_ot3_p1000_multi,
        96: gravimetric_ot3_p1000_96,
    },
}

GRAVIMETRIC_CFG_INCREMENT = {
    50: {
        1: {50: gravimetric_ot3_p50_single},
        8: {50: gravimetric_ot3_p50_multi_50ul_tip_increment},
    },
    200: {
        96: {
            50: gravimetric_ot3_p200_96,
            200: gravimetric_ot3_p200_96,
        },
    },
    1000: {
        1: {
            50: gravimetric_ot3_p1000_single,
            200: gravimetric_ot3_p1000_single,
            1000: gravimetric_ot3_p1000_single,
        },
        8: {
            50: gravimetric_ot3_p1000_multi_50ul_tip_increment,
            200: gravimetric_ot3_p1000_multi_200ul_tip_increment,
            1000: gravimetric_ot3_p1000_multi_1000ul_tip_increment,
        },
        96: {
            50: gravimetric_ot3_p1000_96,
            200: gravimetric_ot3_p1000_96,
            1000: gravimetric_ot3_p1000_96,
        },
    },
}

PIPETTE_MODEL_NAME = {
    50: {
        1: "p50_single_flex",
        8: "p50_multi_flex",
    },
    200: {
        96: "p200_96_flex",
    },
    1000: {
        1: "p1000_single_flex",
        8: "p1000_multi_flex",
        96: "p1000_96_flex",
    },
}


PHOTOMETRIC_CFG = {
    50: {
        1: {
            50: photometric_ot3_p50_single,
        },
        8: {
            50: photometric_ot3_p50_multi,
        },
    },
    200: {
        96: {50: photometric_ot3_p200_96, 200: photometric_ot3_p200_96},
    },
    1000: {
        1: {
            50: photometric_ot3_p1000_single,
            200: photometric_ot3_p1000_single,
            1000: photometric_ot3_p1000_single,
        },
        8: {
            50: photometric_ot3_p1000_multi,
            200: photometric_ot3_p1000_multi,
            1000: photometric_ot3_p1000_multi,
        },
        96: {50: photometric_ot3_p1000_96, 200: photometric_ot3_p1000_96},
    },
}


@dataclass
class RunArgs:
    """Common resources across multiple runs."""

    tip_volumes: List[int]
    volumes: List[Tuple[int, List[float]]]
    run_id: str
    pipette: InstrumentContext
    pipette_tag: str
    operator_name: str
    git_description: str
    robot_serial: str
    tip_batchs: Dict[str, str]
    recorder: Optional[GravimetricRecorder]
    pipette_volume: int
    pipette_channels: int
    increment: bool
    name: str
    environment_sensor: asair_sensor.AsairSensorBase
    trials: int
    ctx: ProtocolContext
    protocol_cfg: Any
    test_report: report.CSVReport
    liquid: str

    @classmethod
    def _get_protocol_context(cls, args: argparse.Namespace) -> ProtocolContext:
        if not args.simulate and not args.skip_labware_offsets:
            # getting labware offsets must be done before creating the protocol context
            # because it requires the robot-server to be running
            ui.print_title("SETUP")
            ui.print_info(
                "Starting opentrons-robot-server, so we can http GET labware offsets"
            )
            LABWARE_OFFSETS.extend(workarounds.http_get_all_labware_offsets())
            ui.print_info(f"found {len(LABWARE_OFFSETS)} offsets:")
            for offset in LABWARE_OFFSETS:
                ui.print_info(f"\t{offset.createdAt}:")
                ui.print_info(f"\t\t{offset.definitionUri}")
                ui.print_info(f"\t\t{offset.vector}")
        # gather the custom labware (for simulation)
        custom_defs = {}
        if args.simulate:
            labware_dir = Path(__file__).parent.parent / "labware"
            custom_def_uris = [
                "radwag_pipette_calibration_vial",
            ]
            for def_uri in custom_def_uris:
                with open(labware_dir / def_uri / "1.json", "r") as f:
                    custom_def = json_load(f)
                custom_defs[def_uri] = custom_def
        _ctx = helpers.get_api_context(
            API_LEVEL,  # type: ignore[attr-defined]
            is_simulating=args.simulate,
            pipette_left=PIPETTE_MODEL_NAME[args.pipette][args.channels],
            extra_labware=custom_defs,
        )
        for offset in LABWARE_OFFSETS:
            engine = _ctx._core._engine_client._transport._engine  # type: ignore[attr-defined]
            engine.state_view._labware_store._add_labware_offset(offset)
        return _ctx

    @classmethod
    def build_run_args(cls, args: argparse.Namespace) -> "RunArgs":  # noqa: C901
        """Build."""
        _ctx = RunArgs._get_protocol_context(args)
        operator_name = helpers._get_operator_name(_ctx.is_simulating())
        robot_serial = helpers._get_robot_serial(_ctx.is_simulating())
        run_id, start_time = create_run_id_and_start_time()
        environment_sensor = asair_sensor.BuildAsairSensor(_ctx.is_simulating())
        git_description = get_git_description()
        if not args.photometric:
            scale = Scale.build(simulate=_ctx.is_simulating())
        ui.print_header("LOAD PIPETTE")
        pipette = helpers._load_pipette(
            _ctx,
            args.channels,
            args.pipette,
            "left",
            args.increment,
            args.photometric,
            args.gantry_speed if not args.photometric else None,
        )
        pipette_tag = helpers._get_tag_from_pipette(
            pipette, args.increment, args.user_volumes
        )

        recorder: Optional[GravimetricRecorder] = None
        kind = ConfigType.photometric if args.photometric else ConfigType.gravimetric
        tip_batches: Dict[str, str] = {}
        if args.tip == 0:
            tip_volumes: List[int] = get_tip_volumes_for_qc(
                args.pipette, args.channels, args.extra, args.photometric
            )
            for tip in tip_volumes:
                tip_batches[f"tips_{tip}ul"] = helpers._get_tip_batch(
                    _ctx.is_simulating(), tip
                )
        else:
            tip_volumes = [args.tip]
            tip_batches[f"tips_{args.tip}ul"] = helpers._get_tip_batch(
                _ctx.is_simulating(), args.tip
            )

        volumes: List[Tuple[int, List[float]]] = []
        for tip in tip_volumes:
            vls = helpers._get_volumes(
                _ctx,
                args.increment,
                args.channels,
                args.pipette,
                tip,
                args.user_volumes,
                kind,
                False,  # set extra to false so we always do the normal tests first
                args.channels,
                mode=args.mode,  # NOTE: only needed for increment test
            )
            if len(vls) > 0:
                volumes.append(
                    (
                        tip,
                        vls,
                    )
                )
        if args.isolate_volumes:
            # check that all volumes passed in are actually test volumes
            all_vols = set(
                [vol for tip_vol_list in volumes for vol in tip_vol_list[-1]]
            )
            for isolated_volume in args.isolate_volumes:
                assert isolated_volume in all_vols, (
                    f"cannot isolate volume {isolated_volume}, " f"not a test volume"
                )
        if args.extra:
            # if we use extra, add those tests after
            for tip in tip_volumes:
                vls = helpers._get_volumes(
                    _ctx,
                    args.increment,
                    args.channels,
                    args.pipette,
                    tip,
                    args.user_volumes,
                    kind,
                    True,
                    args.channels,
                )
                if len(vls) > 0:
                    volumes.append(
                        (
                            tip,
                            vls,
                        )
                    )
        if not volumes:
            raise ValueError("no volumes to test, check the configuration")
        volumes_list: List[float] = []
        for _, vls in volumes:
            volumes_list.extend(vls)

        if args.trials == 0:
            trials = helpers.get_default_trials(args.increment, kind, args.channels)
        else:
            trials = args.trials

        if args.photometric:
            _tip_cfg = max(tip_volumes)
            if len(tip_volumes) > 0:
                ui.print_info(
                    f"WARNING: using source Protocol for {_tip_cfg} tip, "
                    f"but test includes multiple tips ({tip_volumes})"
                )
            protocol_cfg = PHOTOMETRIC_CFG[args.pipette][args.channels][_tip_cfg]
            name = protocol_cfg.metadata["protocolName"]  # type: ignore[attr-defined]
            report = execute_photometric.build_pm_report(
                test_volumes=volumes_list,
                run_id=run_id,
                pipette_tag=pipette_tag,
                operator_name=operator_name,
                git_description=git_description,
                tip_batches=tip_batches,
                environment_sensor=environment_sensor,
                trials=trials,
                name=name,
                robot_serial=robot_serial,
                fw_version=workarounds.get_sync_hw_api(_ctx).fw_version,
            )
        else:
            if args.increment:
                assert len(tip_volumes) == 1, (
                    f"tip must be specified "
                    f"when running --increment test "
                    f"with {args.channels}ch P{args.pipette}"
                )
                protocol_cfg = GRAVIMETRIC_CFG_INCREMENT[args.pipette][args.channels][
                    tip_volumes[0]
                ]
            else:
                protocol_cfg = GRAVIMETRIC_CFG[args.pipette][args.channels]
            name = protocol_cfg.metadata["protocolName"]  # type: ignore[attr-defined]
            recorder = execute._load_scale(
                name, scale, run_id, pipette_tag, start_time, _ctx.is_simulating()
            )

            report = execute.build_gm_report(
                test_volumes=volumes_list,
                run_id=run_id,
                pipette_tag=pipette_tag,
                operator_name=operator_name,
                git_description=git_description,
                robot_serial=robot_serial,
                tip_batchs=tip_batches,
                recorder=recorder,
                pipette_channels=args.channels,
                increment=args.increment,
                name=name,
                environment_sensor=environment_sensor,
                trials=trials,
                fw_version=workarounds.get_sync_hw_api(_ctx).fw_version,
            )

        return RunArgs(
            tip_volumes=tip_volumes,
            volumes=volumes,
            run_id=run_id,
            pipette=pipette,
            pipette_tag=pipette_tag,
            operator_name=operator_name,
            git_description=git_description,
            robot_serial=robot_serial,
            tip_batchs=tip_batches,
            recorder=recorder,
            pipette_volume=args.pipette,
            pipette_channels=args.channels,
            increment=args.increment,
            name=name,
            environment_sensor=environment_sensor,
            trials=trials,
            ctx=_ctx,
            protocol_cfg=protocol_cfg,
            test_report=report,
            liquid=args.liquid,
        )


def build_gravimetric_cfg(
    protocol: ProtocolContext,
    tip_volume: int,
    increment: bool,
    return_tip: bool,
    blank: bool,
    mix: bool,
    user_volumes: bool,
    gantry_speed: int,
    scale_delay: int,
    isolate_channels: List[int],
    isolate_volumes: List[float],
    extra: bool,
    jog: bool,
    same_tip: bool,
    ignore_fail: bool,
    mode: str,
    run_args: RunArgs,
) -> GravimetricConfig:
    """Build."""
    return GravimetricConfig(
        name=run_args.name,
        pipette_mount="left",
        pipette_volume=run_args.pipette_volume,
        pipette_channels=run_args.pipette_channels,
        tip_volume=tip_volume,
        trials=run_args.trials,
        labware_on_scale=run_args.protocol_cfg.LABWARE_ON_SCALE,  # type: ignore[attr-defined]
        slot_scale=run_args.protocol_cfg.SLOT_SCALE,  # type: ignore[attr-defined]
        slots_tiprack=run_args.protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
        increment=increment,
        return_tip=return_tip,
        blank=blank,
        mix=mix,
        user_volumes=user_volumes,
        gantry_speed=gantry_speed,
        scale_delay=scale_delay,
        isolate_channels=isolate_channels,
        isolate_volumes=isolate_volumes,
        kind=ConfigType.gravimetric,
        extra=extra,
        jog=jog,
        same_tip=same_tip,
        ignore_fail=ignore_fail,
        mode=mode,
        liquid=run_args.liquid,
    )


def build_photometric_cfg(
    protocol: ProtocolContext,
    tip_volume: int,
    return_tip: bool,
    mix: bool,
    user_volumes: bool,
    touch_tip: bool,
    refill: bool,
    extra: bool,
    jog: bool,
    same_tip: bool,
    ignore_fail: bool,
    pipette_channels: int,
    photoplate_column_offset: List[int],
    dye_well_column_offset: List[int],
    mode: str,
    run_args: RunArgs,
) -> PhotometricConfig:
    """Run."""
    return PhotometricConfig(
        name=run_args.name,
        pipette_mount="left",
        pipette_volume=run_args.pipette_volume,
        pipette_channels=pipette_channels,
        increment=False,
        tip_volume=tip_volume,
        trials=run_args.trials,
        photoplate=run_args.protocol_cfg.PHOTOPLATE_LABWARE,  # type: ignore[attr-defined]
        photoplate_slot=run_args.protocol_cfg.SLOT_PLATE,  # type: ignore[attr-defined]
        reservoir=run_args.protocol_cfg.RESERVOIR_LABWARE,  # type: ignore[attr-defined]
        reservoir_slot=run_args.protocol_cfg.SLOT_RESERVOIR,  # type: ignore[attr-defined]
        slots_tiprack=run_args.protocol_cfg.SLOTS_TIPRACK[tip_volume],  # type: ignore[attr-defined]
        return_tip=return_tip,
        mix=mix,
        user_volumes=user_volumes,
        touch_tip=touch_tip,
        refill=refill,
        kind=ConfigType.photometric,
        extra=extra,
        jog=jog,
        same_tip=same_tip,
        ignore_fail=ignore_fail,
        photoplate_column_offset=photoplate_column_offset,
        dye_well_column_offset=dye_well_column_offset,
        mode=mode,
    )


def _main(
    args: argparse.Namespace,
    run_args: RunArgs,
    tip: int,
    volumes: List[float],
) -> None:
    union_cfg: Union[PhotometricConfig, GravimetricConfig]
    if args.photometric:
        cfg_pm: PhotometricConfig = build_photometric_cfg(
            run_args.ctx,
            tip,
            args.return_tip,
            args.mix,
            args.user_volumes,
            args.touch_tip,
            args.refill,
            args.extra,
            args.jog,
            args.same_tip,
            args.ignore_fail,
            args.channels,
            args.photoplate_col_offset,
            args.dye_well_col_offset,
            args.mode,
            run_args,
        )
        union_cfg = cfg_pm
    else:
        cfg_gm: GravimetricConfig = build_gravimetric_cfg(
            run_args.ctx,
            tip,
            args.increment,
            args.return_tip,
            False if args.no_blank else True,
            args.mix,
            args.user_volumes,
            args.gantry_speed,
            args.scale_delay,
            args.isolate_channels if args.isolate_channels else [],
            args.isolate_volumes if args.isolate_volumes else [],
            args.extra,
            args.jog,
            args.same_tip,
            args.ignore_fail,
            args.mode,
            run_args,
        )

        union_cfg = cfg_gm
    ui.print_header("GET PARAMETERS")

    for v in volumes:
        ui.print_info(f"\t{v} uL")
    all_channels_same_time = (
        getattr(union_cfg, "increment", False)
        or union_cfg.pipette_channels == 96
        or args.photometric
    )
    test_resources = TestResources(
        ctx=run_args.ctx,
        pipette=run_args.pipette,
        tipracks=helpers._load_tipracks(
            run_args.ctx, union_cfg, use_adapters=args.channels == 96
        ),
        test_volumes=volumes,
        tips=get_tips(
            run_args.ctx,
            run_args.pipette,
            tip,
            all_channels=all_channels_same_time,
        ),
        env_sensor=run_args.environment_sensor,
        recorder=run_args.recorder,
        test_report=run_args.test_report,
    )

    if args.photometric:
        execute_photometric.run(cfg_pm, test_resources)
    else:
        execute.run(cfg_gm, test_resources)


if __name__ == "__main__":
    parser = argparse.ArgumentParser("Pipette Testing")
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--pipette", type=int, choices=[50, 200, 1000], required=True)
    parser.add_argument("--channels", type=int, choices=[1, 8, 96], default=1)
    parser.add_argument("--tip", type=int, choices=[0, 50, 200, 1000], default=0)
    parser.add_argument("--trials", type=int, default=0)
    parser.add_argument("--increment", action="store_true")
    parser.add_argument("--return-tip", action="store_true")
    parser.add_argument("--skip-labware-offsets", action="store_true")
    parser.add_argument("--no-blank", action="store_true")
    parser.add_argument("--mix", action="store_true")
    parser.add_argument("--user-volumes", action="store_true")
    parser.add_argument("--gantry-speed", type=int, default=GANTRY_MAX_SPEED)
    parser.add_argument("--scale-delay", type=int, default=DELAY_FOR_MEASUREMENT)
    parser.add_argument("--photometric", action="store_true")
    parser.add_argument("--touch-tip", action="store_true")
    parser.add_argument("--refill", action="store_true")
    parser.add_argument("--isolate-channels", nargs="+", type=int, default=None)
    parser.add_argument("--isolate-volumes", nargs="+", type=float, default=None)
    parser.add_argument("--extra", action="store_true")
    parser.add_argument("--jog", action="store_true")
    parser.add_argument("--same-tip", action="store_true")
    parser.add_argument("--ignore-fail", action="store_true")
    parser.add_argument("--photoplate-col-offset", nargs="+", type=int, default=[1])
    parser.add_argument("--dye-well-col-offset", nargs="+", type=int, default=[1])
    parser.add_argument(
        "--mode", type=str, choices=["", "default", "lowVolumeDefault"], default=""
    )
    parser.add_argument(
        "--liquid",
        type=str,
        choices=[liq.value.lower() for liq in SupportedLiquid],
        default="water",
    )
    args = parser.parse_args()
    run_args = RunArgs.build_run_args(args)
    if not run_args.ctx.is_simulating():
        serial_logger = subprocess.Popen(
            [
                "python3 -m opentrons_hardware.scripts.can_mon > /data/testing_data/serial.log"
            ],
            shell=True,
        )
        sleep(1)
    hw = workarounds.get_sync_hw_api(run_args.ctx)
    try:
        if not run_args.ctx.is_simulating() and not args.photometric:
            ui.get_user_ready("CLOSE the door, and MOVE AWAY from machine")
        ui.print_info("homing...")
        run_args.ctx.home()

        for tip, volumes in run_args.volumes:
            if args.channels == 96 and not run_args.ctx.is_simulating():
                ui.alert_user_ready(f"prepare the {tip}ul tipracks", hw)
            _main(args, run_args, tip, volumes)
    finally:
        if run_args.recorder is not None:
            ui.print_info("ending recording")
            run_args.recorder.stop()
            run_args.recorder.deactivate()
        _change_pipettes(run_args.ctx, run_args.pipette)
        if not run_args.ctx.is_simulating():
            serial_logger.terminate()
            del hw._backend.eeprom_driver._gpio  # still need this?
    print("done\n\n")
