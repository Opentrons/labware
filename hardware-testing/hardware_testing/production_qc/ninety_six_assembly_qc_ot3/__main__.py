"""96 Channel assembly QC OT3."""
import argparse
import asyncio
from pathlib import Path

from hardware_testing.data import ui
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import OT3Mount, Axis

from .config import TestSection, TestConfig, build_report, TESTS


async def _main(cfg: TestConfig) -> None:
    # BUILD REPORT
    test_name = Path(__file__).parent.name
    ui.print_title(test_name.replace("_", " ").upper())
    pipette_string = "p1000_96_v3.4" if cfg.pipette == 1000 else "p200_96_v3.0"
    # BUILD API
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=cfg.simulate,
        pipette_left=pipette_string,
    )

    # CSV REPORT
    report = build_report(test_name.replace("_", "-"))
    dut = helpers_ot3.DeviceUnderTest.PIPETTE_LEFT
    helpers_ot3.set_csv_report_meta_data_ot3(api, report, dut=dut)

    # HOME and ATTACH
    mount = OT3Mount.LEFT
    await api.home()
    home_pos = await api.gantry_position(mount)
    attach_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
    attach_pos = attach_pos._replace(z=home_pos.z - 100)
    if not api.hardware_pipettes[mount.to_mount()]:
        # FIXME: Do not home the plunger using the normal home method.
        #        See section below where we use OT3Controller to home it.
        await api.home()
        await helpers_ot3.move_to_arched_ot3(api, mount, attach_pos)
        while not api.hardware_pipettes[mount.to_mount()]:
            ui.get_user_ready("attach a 96ch pipette")
            await api.reset()
        await api.home_z(mount)

    # FIXME: remove this once the "'L' format requires 0 <= number <= 4294967295" bug is gone
    await api._backend.home([Axis.P_L], api.gantry_load)
    await api.refresh_positions()

    # RUN TESTS
    for section, test_run in cfg.tests.items():
        ui.print_title(section.value)
        await test_run(api, report, section.value, cfg.pipette)

    # RELOAD PIPETTE
    ui.print_title("DONE")
    await helpers_ot3.move_to_arched_ot3(api, mount, attach_pos)

    # SAVE REPORT
    report.save_to_disk()
    report.print_results()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    # add each test-section as a skippable argument (eg: --skip-gantry)
    for s in TestSection:
        parser.add_argument(
            f"--skip-{s.value.lower()}".replace("_", "-"), action="store_true"
        )
        parser.add_argument(
            f"--only-{s.value.lower()}".replace("_", "-"), action="store_true"
        )
    parser.add_argument("--pipette", type=int, choices=[200, 1000], default=1000)
    args = parser.parse_args()
    _t_sections = {
        s: f
        for s, f in TESTS
        if getattr(args, f"only_{s.value.lower().replace('-', '_')}")
    }
    if _t_sections:
        assert (
            len(list(_t_sections.keys())) < 2
        ), 'use "--only" for just one test, not multiple tests'
    else:
        _t_sections = {
            s: f
            for s, f in TESTS
            if not getattr(args, f"skip_{s.value.lower().replace('-', '_')}")
        }
    _config = TestConfig(
        simulate=args.simulate, tests=_t_sections, pipette=args.pipette
    )
    asyncio.run(_main(_config))
