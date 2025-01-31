"""Test Peripherals."""
import asyncio
from pathlib import Path
from subprocess import run as run_subprocess, Popen, CalledProcessError
from typing import List, Union, Optional, Dict
from urllib.request import urlopen
from time import time
from typing import Tuple

from opentrons_hardware.hardware_control.rear_panel_settings import set_ui_color

from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.types import StatusBarState, DoorState
from opentrons.system import nmcli

from hardware_testing.data import create_datetime_string
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)
from hardware_testing.data import ui

SERVER_PORT = 8083
SERVER_CMD = "{0} -m http.server {1} --directory {2}"

CAM_PIC_FILE_NAME = "camera_{0}.jpg"

CAM_CMD_OT3 = (
    "v4l2-ctl --device /dev/video0 --set-fmt-video=width=640,height=480,pixelformat=MJPG "
    "--stream-mmap --stream-to={0} --stream-count=1"
)

COLOR_TO_STATE: Dict[str, Tuple[int, int, int, int]] = {
    "off": (
        0,
        0,
        0,
        0,
    ),
    "white": (
        0,
        0,
        0,
        255,
    ),
    "red": (
        255,
        0,
        0,
        0,
    ),
    "green": (
        0,
        255,
        0,
        0,
    ),
    "blue": (
        0,
        0,
        255,
        0,
    ),
}


async def _get_ip(api: OT3API) -> Optional[str]:
    _ip: Optional[str] = None
    if api.is_simulator:
        assert nmcli.iface_info is not None
        _ip = "127.0.0.1"
    else:
        ethernet_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.ETH_LL)
        wifi_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.WIFI)
        if ethernet_status["ipAddress"]:
            _ip = ethernet_status["ipAddress"]
        elif wifi_status["ipAddress"]:
            _ip = wifi_status["ipAddress"]
        if _ip:
            _ip = _ip.split("/")[0]
    return _ip


async def _take_picture(api: OT3API, report: CSVReport, section: str) -> Optional[Path]:
    cam_pic_name = CAM_PIC_FILE_NAME.format(create_datetime_string())
    if api.is_simulator:
        cam_pic_name = cam_pic_name.replace(".jpg", ".txt")
    cam_pic_path = report.parent / cam_pic_name

    process_cmd = CAM_CMD_OT3.format(str(cam_pic_path))
    print(f'command to take a picture: "{process_cmd}"')
    try:
        if api.is_simulator:
            with open(cam_pic_path, "w") as f:
                f.write(str(cam_pic_name))  # create a test file
        else:
            run_subprocess(process_cmd.split(" "))  # take a picture
        result = CSVResult.from_bool(cam_pic_path.exists())
    except CalledProcessError as e:
        ui.print_error(str(e))
        result = CSVResult.FAIL
    report(section, "camera-active", [result])
    if bool(result):
        return cam_pic_path
    else:
        return None


async def _run_image_check_server(
    api: OT3API, report: CSVReport, section: str, file_path: Path
) -> None:
    result: Optional[CSVResult] = CSVResult.FAIL
    server_process: Optional[Popen] = None

    async def _run_check() -> None:
        nonlocal result
        nonlocal server_process
        _ip = await _get_ip(api)
        if not _ip:
            ui.print_error("no IP address")
            return
        server_address = f"{_ip}:{SERVER_PORT}"
        for py in ["python3", "python"]:
            process_cmd = SERVER_CMD.format(py, SERVER_PORT, str(file_path.parent))
            print(f'command to start http server: "{process_cmd}"')
            try:
                server_process = Popen(process_cmd.split(" "))
                break
            except Exception as e:
                ui.print_error(str(e))
        if not server_process:
            ui.print_error("unable to start http server")
            return
        await asyncio.sleep(0.5)  # give server time to start
        address = f"http://{server_address}/{file_path.name}"
        print(f"\n\nopen your web browser, and go to:\n\n\t{address}\n\n")
        if api.is_simulator:
            try:
                contents = urlopen(address).read()
            except Exception as e:
                ui.print_error(str(e))
                return
            result = CSVResult.from_bool(contents.decode("utf-8") == file_path.name)
        else:
            inp = ui.get_user_answer("is image OK")
            result = CSVResult.from_bool(inp)

    try:
        await _run_check()
    finally:
        if server_process:
            server_process.kill()
        report(section, "camera-image", [result])


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    return [
        CSVLine("screen-on", [CSVResult]),
        CSVLine("screen-touch", [CSVResult]),
        CSVLine("deck-lights-on", [CSVResult]),
        CSVLine("deck-lights-off", [CSVResult]),
        CSVLine("status-light-off", [CSVResult]),
        CSVLine("status-light-white", [CSVResult]),
        CSVLine("status-light-red", [CSVResult]),
        CSVLine("status-light-green", [CSVResult]),
        CSVLine("status-light-blue", [CSVResult]),
        CSVLine("door-switch", [CSVResult]),
        CSVLine("camera-active", [CSVResult]),
        CSVLine("camera-image", [CSVResult]),
    ]


async def run(api: OT3API, report: CSVReport, section: str) -> None:
    """Run."""
    await api.set_lights(rails=True)
    await api.set_status_bar_state(StatusBarState.IDLE)

    def _get_user_confirmation(question: str) -> bool:
        if api.is_simulator:
            return True
        return ui.get_user_answer(question)

    # DISPLAY
    ui.print_header("DISPLAY")
    result = _get_user_confirmation("is ODD on")
    report(section, "screen-on", [CSVResult.from_bool(result)])
    result = _get_user_confirmation("is ODD touchscreen working")
    report(section, "screen-touch", [CSVResult.from_bool(result)])

    # DECK LIGHTS
    ui.print_header("DECK LIGHTS")
    await api.set_lights(rails=True)
    result = _get_user_confirmation("are the DECK-LIGHTS on")
    report(section, "deck-lights-on", [CSVResult.from_bool(result)])
    await api.set_lights(rails=False)
    result = _get_user_confirmation("are the DECK-LIGHTS off")
    report(section, "deck-lights-off", [CSVResult.from_bool(result)])
    await api.set_lights(rails=True)

    # STATUS LIGHTS
    ui.print_header("STATUS LIGHT")
    try:
        for color, state in COLOR_TO_STATE.items():
            if not api.is_simulator:
                await set_ui_color(
                    state[0],  # red
                    state[2],  # blue
                    state[1],  # green
                    state[3],  # white
                    api._backend._usb_messenger,  # type: ignore[attr-defined]
                )
            result = _get_user_confirmation(f"is the STATUS-LIGHT {color}")
            report(section, f"status-light-{color}", [CSVResult.from_bool(result)])
    finally:
        await api.set_status_bar_state(StatusBarState.IDLE)

    # DOOR SWITCH
    # NOTE: we need to use asyncio while waiting, so that we don't
    #       block the event loop from receiving the updated status
    ui.print_header("DOOR SWITCH")
    door_timeout_seconds = 10
    print("CLOSE the front door")
    start_time_seconds = time()
    while not api.is_simulator and api.door_state != DoorState.CLOSED:
        await asyncio.sleep(0.1)
        if time() - start_time_seconds > door_timeout_seconds:
            ui.print_error("timed out waiting for door to close")
            break
    print(api.door_state)
    is_closed = api.door_state == DoorState.CLOSED
    print("OPEN the front door")
    start_time_seconds = time()
    while not api.is_simulator and api.door_state != DoorState.OPEN:
        await asyncio.sleep(0.1)
        if time() - start_time_seconds > door_timeout_seconds:
            ui.print_error("timed out waiting for door to open")
            break
    print(api.door_state)
    is_open = api.door_state == DoorState.OPEN
    report(section, "door-switch", [CSVResult.from_bool(is_closed and is_open)])

    # CAMERA
    ui.print_header("CAMERA")
    cam_pic_path = await _take_picture(api, report, section)
    if cam_pic_path:
        await _run_image_check_server(api, report, section, cam_pic_path)
        cam_pic_path.unlink()
    else:
        print("skipping checking the image, because taking a picture failed")
