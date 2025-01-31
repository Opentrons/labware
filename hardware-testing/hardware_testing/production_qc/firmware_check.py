"""Firmware Check."""
from asyncio import run
from typing import Sequence

from opentrons.hardware_control.ot3api import OT3API

from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing.opentrons_api.types import OT3Mount

from opentrons.hardware_control.types import SubSystem


def _get_instrument_serial_number(api: OT3API, subsystem: SubSystem) -> str:
    if subsystem == SubSystem.pipette_right:
        _pip = api.hardware_pipettes[OT3Mount.RIGHT.to_mount()]
        assert _pip
        _pip_id = helpers_ot3.get_pipette_serial_ot3(_pip)
        _id = f" ({_pip_id})"
    elif subsystem == SubSystem.pipette_left:
        _pip = api.hardware_pipettes[OT3Mount.LEFT.to_mount()]
        assert _pip
        _pip_id = helpers_ot3.get_pipette_serial_ot3(_pip)
        _id = f" ({_pip_id})"
    elif subsystem == SubSystem.gripper:
        gripper = api.attached_gripper
        assert gripper
        gripper_id = str(gripper["gripper_id"])
        _id = f" ({gripper_id})"
    else:
        _id = ""
    return _id


async def _main(simulate: bool, subsystems: Sequence[SubSystem]) -> None:
    api = await helpers_ot3.build_async_ot3_hardware_api(is_simulating=simulate)
    while True:
        for subsys, state in api.attached_subsystems.items():
            _id = _get_instrument_serial_number(api, subsys)
            print(f" - v{state.current_fw_version}: {subsys.name}{_id}")
        if not api.is_simulator:
            input("\n\npress ENTER to check/update firmware:")
        await helpers_ot3.update_firmware(api, subsystems=subsystems)
        print("done")
        if api.is_simulator:
            break
        await helpers_ot3.reset_api(api)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--simulate", action="store_true")
    ot3_subsystems = [s for s in SubSystem if s != SubSystem.motor_controller_board]
    for s in ot3_subsystems:
        parser.add_argument(f"--{s.name.replace('_', '-')}", action="store_true")
    args = parser.parse_args()
    _subsystems = []
    for s in ot3_subsystems:
        if getattr(args, f"{s.name}"):
            _subsystems.append(s)
    if not _subsystems:
        _subsystems = []
    run(_main(args.simulate, _subsystems))
