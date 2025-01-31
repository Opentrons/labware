"""Test Connectivity."""
import asyncio
from subprocess import run as run_subprocess
from typing import List, Union, Optional, Tuple, cast
import re

from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.backends.ot3controller import OT3Controller
from opentrons.system import nmcli
from opentrons import config

from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)
from opentrons_hardware.hardware_control.rear_panel_settings import (
    RearPinState,
    get_all_pin_state,
    set_sync_pin,
)

import logging

LOG = logging.getLogger(__name__)

loggers = [logging.getLogger(name) for name in logging.root.manager.loggerDict]
for logger in loggers:
    logger.setLevel(logging.CRITICAL)

LOG.setLevel(logging.CRITICAL)

# START TEST PASSING CONDITIONS

# Pre-test conditions, nothing plugged in
PRE_TEST_CONDITIONS = RearPinState()
PRE_TEST_CONDITIONS.aux1_estop_det = False
PRE_TEST_CONDITIONS.aux2_estop_det = False
PRE_TEST_CONDITIONS.aux1_aux_det = False
PRE_TEST_CONDITIONS.aux2_aux_det = False
PRE_TEST_CONDITIONS.aux1_id_active = False
PRE_TEST_CONDITIONS.aux2_id_active = False
PRE_TEST_CONDITIONS.estop_active = False
PRE_TEST_CONDITIONS.door_open = True
PRE_TEST_CONDITIONS.sync_engaged = False

# Aux 1 only plugged in, sync active on tester
AUX_1_CONDITIONS = RearPinState()
AUX_1_CONDITIONS.aux1_estop_det = True
AUX_1_CONDITIONS.aux2_estop_det = False
AUX_1_CONDITIONS.aux1_aux_det = True
AUX_1_CONDITIONS.aux2_aux_det = False
AUX_1_CONDITIONS.aux1_id_active = True
AUX_1_CONDITIONS.aux2_id_active = False
AUX_1_CONDITIONS.estop_active = False
AUX_1_CONDITIONS.door_open = False
AUX_1_CONDITIONS.sync_engaged = True

# Aux 2 only plugged in, sync active on tester
AUX_2_CONDITIONS = RearPinState()
AUX_2_CONDITIONS.aux1_estop_det = False
AUX_2_CONDITIONS.aux2_estop_det = True
AUX_2_CONDITIONS.aux1_aux_det = False
AUX_2_CONDITIONS.aux2_aux_det = True
AUX_2_CONDITIONS.aux1_id_active = False
AUX_2_CONDITIONS.aux2_id_active = True
AUX_2_CONDITIONS.estop_active = False
AUX_2_CONDITIONS.door_open = False
AUX_2_CONDITIONS.sync_engaged = True

# Aux 1 and 2 plugged in, sync NOT active on tester
POST_PLUG_CONDITIONS = RearPinState()
POST_PLUG_CONDITIONS.aux1_estop_det = True
POST_PLUG_CONDITIONS.aux2_estop_det = True
POST_PLUG_CONDITIONS.aux1_aux_det = True
POST_PLUG_CONDITIONS.aux2_aux_det = True
POST_PLUG_CONDITIONS.aux1_id_active = False
POST_PLUG_CONDITIONS.aux2_id_active = False
POST_PLUG_CONDITIONS.estop_active = False
POST_PLUG_CONDITIONS.door_open = True
POST_PLUG_CONDITIONS.sync_engaged = False

# Aux 1 and 2 plugged in, ESTOP pressed, sync NOT active on tester
ESTOP_CONDITIONS = RearPinState()
ESTOP_CONDITIONS.aux1_estop_det = True
ESTOP_CONDITIONS.aux2_estop_det = True
ESTOP_CONDITIONS.aux1_aux_det = True
ESTOP_CONDITIONS.aux2_aux_det = True
ESTOP_CONDITIONS.aux1_id_active = False
ESTOP_CONDITIONS.aux2_id_active = False
ESTOP_CONDITIONS.estop_active = True
ESTOP_CONDITIONS.door_open = True
ESTOP_CONDITIONS.sync_engaged = False

# Aux 1 and 2 not plugged in, door closed
DOOR_CONDITIONS = RearPinState()
DOOR_CONDITIONS.aux1_estop_det = False
DOOR_CONDITIONS.aux2_estop_det = False
DOOR_CONDITIONS.aux1_aux_det = False
DOOR_CONDITIONS.aux2_aux_det = False
DOOR_CONDITIONS.aux1_id_active = False
DOOR_CONDITIONS.aux2_id_active = False
DOOR_CONDITIONS.estop_active = False
DOOR_CONDITIONS.door_open = False
DOOR_CONDITIONS.sync_engaged = False

# END TEST PASSING CONDITIONS

# Start UI Prompts
PROMPT_UNPLUGGED = "ENSURE AUX TESTER IS NOT PLUGGED IN"
PROMPT_AUX_1 = "PLUG IN AUX PORT 1 RIGHT"
PROMPT_PLUGGED = "PLUG IN AUX PORT 2 LEFT"
PROMPT_ESTOP_1 = "PRESS ESTOP 1"
PROMPT_ESTOP_2 = "RELEASE ESTOP 1, PRESS ESTOP 2"
PROMPT_AUX_2 = "UNPLUG AUX PORT 1 RIGHT"
PROMPT_DOOR = "UNPLUG AUX PORT 2 LEFT AND CLOSE DOOR"


# End UI Prompts

# List Format [UI Prompt, pass_state, sync_state]
APT_PROMT = 0
APT_PASS_STATE = 1
APT_SYNC_STATE = 2
AUX_PORT_TESTS = {
    "UNPLUGGED_TEST": [PROMPT_UNPLUGGED, PRE_TEST_CONDITIONS, 0],
    "AUX_1_TEST": [PROMPT_AUX_1, AUX_1_CONDITIONS, 1],
    "PLUGGED_TEST": [PROMPT_PLUGGED, POST_PLUG_CONDITIONS, 0],
    "ESTOP_1_TEST": [PROMPT_ESTOP_1, ESTOP_CONDITIONS, 0],
    "ESTOP_2_TEST": [PROMPT_ESTOP_2, ESTOP_CONDITIONS, 0],
    "CAN": 0,
    "AUX_2_TEST": [PROMPT_AUX_2, AUX_2_CONDITIONS, 1],
}

USB_WAIT_TIMEOUT_SECONDS = 10
USB_READ_BUS_LENGTH_NO_CONNECTION = 4
USB_PORTS_TO_TEST = [
    "usb-1",
    "usb-2",
    "usb-3",
    "usb-4",
    "usb-5",
    "usb-6",
    "usb-7",
    "usb-8",
    "usb-9",
]

USB_PORTS_MAPPING = {
    "usb-1": "1-1/1-1.4/1-1.4.4/1-1.4.4",
    "usb-2": "1-1/1-1.4/1-1.4.3/1-1.4.3",
    "usb-3": "1-1/1-1.4/1-1.4.2/1-1.4.2",
    "usb-4": "1-1/1-1.4/1-1.4.1/1-1.4.1",
    "usb-5": "1-1/1-1.3/1-1.3.4/1-1.3.4",
    "usb-6": "1-1/1-1.3/1-1.3.3/1-1.3.3",
    "usb-7": "1-1/1-1.3/1-1.3.2/1-1.3.2",
    "usb-8": "1-1/1-1.3/1-1.3.1/1-1.3.1",
    "usb-9": "1-1/1-1.7/1-1.7",
}

AUX_CAN_TESTS = [
    "aux-1-pcan",
    "aux-2-pcan",
]

ALLOWED_SECURITY_TYPES = {
    nmcli.SECURITY_TYPES.NONE.value: nmcli.SECURITY_TYPES.NONE,
    nmcli.SECURITY_TYPES.WPA_EAP.value: nmcli.SECURITY_TYPES.WPA_EAP,
    nmcli.SECURITY_TYPES.WPA_PSK.value: nmcli.SECURITY_TYPES.WPA_PSK,
}


async def _test_ethernet(api: OT3API, report: CSVReport, section: str) -> None:
    if not api.is_simulator:
        ui.get_user_ready("connect ethernet cable")
        ethernet_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.ETH_LL)
        eth_ip = ethernet_status["ipAddress"]
    else:
        eth_ip = "0.0.0.0"
    result = CSVResult.from_bool(bool(eth_ip))
    report(section, "ethernet", [eth_ip, result])


async def _test_wifi(report: CSVReport, section: str) -> None:
    ssid = ""
    password: Optional[str] = None
    result: Optional[CSVResult] = CSVResult.FAIL
    wifi_ip: Optional[str] = None

    def _finish() -> None:
        report(section, "wifi", [ssid, password, wifi_ip, result])

    LOG.info(f"System Architecture: {config.ARCHITECTURE}")
    try:
        wifi_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.WIFI)
        wifi_ip = wifi_status["ipAddress"]
        if wifi_ip:
            result = CSVResult.PASS
            return _finish()
    except ValueError:
        ui.print_error("WIFI ADAPTER NOT FOUND")
        result = CSVResult.FAIL
        return _finish()

    print("scanning wifi networks...")
    ssids = await nmcli.available_ssids()
    if not ssids:
        ui.print_error("no ssids found")
        return _finish()
    checked_ssids = [
        s for s in ssids if s["securityType"] in list(ALLOWED_SECURITY_TYPES.keys())
    ]
    if not checked_ssids:
        ui.print_error("no ssids found with compatible security types")
        return _finish()
    # get just the first x10 names, removing repetitions
    ssid_names_list: List[str] = list()
    for s in checked_ssids:
        if s["ssid"] not in ssid_names_list:
            ssid_names_list.append(s["ssid"])
    print("found wifi networks:")
    for i, n in enumerate(ssid_names_list[:10]):
        print(f"\t{i + 1}: {n}")
    res = input("select wifi number: ")
    try:
        ssid = ssid_names_list[int(res) - 1]
        print(f'"{ssid}"')
    except (ValueError, KeyError) as e:
        ui.print_error(str(e))
        _finish()
    found_ssids = [s for s in ssids if ssid == s["ssid"]]
    ssid_info = found_ssids[0]
    sec = ALLOWED_SECURITY_TYPES[ssid_info["securityType"]]
    if sec != nmcli.SECURITY_TYPES.NONE:
        password = input("enter wifi password: ")
    try:
        print("connecting...")
        await nmcli.configure(ssid, sec, psk=password)
    except ValueError as e:
        ui.print_error(str(e))
        return _finish()
    wifi_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.WIFI)
    wifi_ip = wifi_status["ipAddress"]
    result = CSVResult.from_bool(bool(wifi_ip))
    return _finish()


async def _test_usb_a_ports(api: OT3API, report: CSVReport, section: str) -> None:
    # FIXME: add check for which hub is on which side
    if not api.is_simulator:
        ui.get_user_ready("insert USB drives into all x9 USB-A ports")
        print("pausing 2 seconds before reading USB data")
        await asyncio.sleep(2)
        for tag in USB_PORTS_TO_TEST:
            res = run_subprocess(
                ["blkid", "--label", f"OT3-{tag.upper()}"],
                capture_output=True,
                text=True,
            )
            blkid_out = res.stdout
            # blkid should return a /dev/sdxx if USB drive is connected
            LOG.info(f"OT3-{tag.upper()}: {blkid_out}")
            if len(blkid_out) == 0:
                ui.print_error(f"OT3-{tag.upper()} NOT FOUND")
                result = CSVResult.from_bool(False)
                report(section, tag, [result])
                continue

            # determine port mapping from dev name
            match = re.search("/dev/([a-z]{3}\d)", blkid_out)  # noqa: W605
            if not match:
                print(f"no match found: {tag}")
                report(section, tag, [CSVResult.FAIL])
                continue
            drive_name = match.group(1)
            LOG.info(f"drive_name: {drive_name}")
            res = run_subprocess(
                ["find", "/sys/bus/usb/devices/usb1/", "-name", drive_name],
                capture_output=True,
                text=True,
            )
            usb_port = res.stdout
            LOG.info(f"Find: {usb_port}")

            port_match = USB_PORTS_MAPPING[tag] in usb_port
            if not port_match:
                ui.print_error(f"OT3-{tag.upper()} WRONG PORT")
            result = CSVResult.from_bool(port_match)
            report(section, tag, [result])
    else:
        _stored_names = [f"OT3-{p.upper()}" for p in USB_PORTS_TO_TEST]
        output_names = " ".join(_stored_names)
        for tag in USB_PORTS_TO_TEST:
            found = f"OT3-{tag.upper()}" in output_names
            result = CSVResult.from_bool(found)
            report(section, tag, [result])


async def _aux_subtest(
    api: OT3API, ui_promt: str, pass_states: RearPinState, sync_state: int
) -> Tuple[bool, str]:
    ui.get_user_ready(ui_promt)
    backend = cast(OT3Controller, api._backend)
    await set_sync_pin(sync_state, backend._usb_messenger)
    result = await get_all_pin_state(backend._usb_messenger)
    LOG.info(f"Aux Result: {result}")
    await set_sync_pin(0, backend._usb_messenger)

    # format the state comparison nicely for csv output
    result_dict = vars(result)
    pass_dict = vars(pass_states)
    formatted_result = str()
    for i in result_dict.keys():
        if result_dict[i] == pass_dict[i]:
            f = i + "=PASS"
            print(f)
            formatted_result = formatted_result + f + "|"
        else:
            f = i + "=FAIL"
            print(f)
            formatted_result = formatted_result + f + "|"

    return (result == pass_states), formatted_result


async def _test_aux(api: OT3API, report: CSVReport, section: str) -> None:
    for test_name, test_config in AUX_PORT_TESTS.items():
        if test_name == "CAN":
            if not api.is_simulator:
                ui.get_user_ready("Release ESTOP 2")
                ui.get_user_ready("prepare CAN analyzer and PCAN software")
            for test_name in AUX_CAN_TESTS:
                if api.is_simulator:
                    result = CSVResult.PASS
                else:
                    inp = ui.get_user_answer(
                        f"does {test_name.upper()} count TRANSMIT = RECEIVE"
                    )
                    result = CSVResult.from_bool(inp)  # type: ignore[assignment]
                report(section, test_name, [result])
        else:
            if api.is_simulator:
                report(section, test_name, ["", CSVResult.PASS])
                continue
            test_result = await _aux_subtest(
                api,
                test_config[APT_PROMT],  # type: ignore[index]
                test_config[APT_PASS_STATE],  # type: ignore[index]
                test_config[APT_SYNC_STATE],  # type: ignore[index]
            )
            csv_result = CSVResult.from_bool(test_result[0])
            report(section, test_name, [test_result[1], csv_result])

    # PCAN
    if not api.is_simulator:
        ui.get_user_ready("UNPLUG ALL AUX CABLES")


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    usb_a_tests = [CSVLine(t, [CSVResult]) for t in USB_PORTS_TO_TEST]
    aux_tests = [
        CSVLine(t, [str, CSVResult]) for t in AUX_PORT_TESTS.keys() if t != "CAN"
    ]
    can_tests = [CSVLine(t, [CSVResult]) for t in AUX_CAN_TESTS]
    other_tests = [
        CSVLine("ethernet", [str, CSVResult]),
        CSVLine("wifi", [str, str, str, CSVResult]),
        CSVLine("usb-b-rear", [CSVResult]),
    ]
    return other_tests + usb_a_tests + aux_tests + can_tests  # type: ignore[return-value]


async def run(api: OT3API, report: CSVReport, section: str) -> None:
    """Run."""
    # ETHERNET
    ui.print_header("ETHERNET")
    await _test_ethernet(api, report, section)

    # WIFI
    ui.print_header("WIFI")
    if not api.is_simulator:
        await _test_wifi(report, section)
    else:
        report(section, "wifi", ["", "", "0.0.0.0", CSVResult.PASS])
        assert nmcli.iface_info is not None
        assert nmcli.configure is not None
        assert nmcli.wifi_disconnect is not None

    # USB-B-REAR
    ui.print_header("USB-B-REAR")
    if not api.is_simulator:
        inp = ui.get_user_answer(
            "Connect USB-B to computer, does computer detect device"
        )
        result = CSVResult.from_bool(inp)
    else:
        result = CSVResult.PASS
    report(section, "usb-b-rear", [result])

    # USB-A
    ui.print_header("USB-A")
    await _test_usb_a_ports(api, report, section)

    # AUX
    ui.print_header("AUX")
    await _test_aux(api, report, section)
