import os
import random
import tempfile
from mock import patch

import pytest
from opentrons.system import nmcli, wifi
from robot_server.service.legacy.routers.networking import _massage_nmcli_error
from typing import Optional


def test_networking_status(api_client, monkeypatch):
    async def mock_is_connected():
        return "full"

    connection_statuses = {
        "wlan0": {
            # test "--" gets mapped to None
            "ipAddress": None,
            "macAddress": "B8:27:EB:5F:A6:89",
            # test "--" gets mapped to None
            "gatewayAddress": None,
            "state": "disconnected",
            "type": "wifi",
        },
        "eth0": {
            "ipAddress": "169.254.229.173/16",
            "macAddress": "B8:27:EB:39:C0:9A",
            # test missing output gets mapped to None
            "gatewayAddress": None,
            "state": "connecting (configuring)",
            "type": "ethernet",
        },
    }

    async def mock_iface_info(k: nmcli.NETWORK_IFACES):
        return connection_statuses[k.value]

    monkeypatch.setattr(nmcli, "is_connected", mock_is_connected)
    monkeypatch.setattr(nmcli, "iface_info", mock_iface_info)

    expected = {"status": "full", "interfaces": connection_statuses}

    resp = api_client.get("/networking/status")
    body_json = resp.json()
    assert resp.status_code == 200
    assert body_json == expected

    async def mock_is_connected():
        raise FileNotFoundError("No")

    monkeypatch.setattr(nmcli, "is_connected", mock_is_connected)
    resp = api_client.get("/networking/status")
    assert resp.status_code == 500


def test_networking_status_tolerates_bad_iface(api_client, monkeypatch):
    connection_status = {
        "eth0": {
            "ipAddress": "169.254.229.173/16",
            "macAddress": "B8:27:EB:39:C0:9A",
            "gatewayAddress": None,
            "state": "connecting (configuring)",
            "type": "ethernet",
        }
    }

    async def mock_is_connected():
        return "full"

    async def mock_get_connection_status(iface):
        if iface == nmcli.NETWORK_IFACES.WIFI:
            raise ValueError("Oh no!")
        else:
            return connection_status["eth0"]

    monkeypatch.setattr(nmcli, "is_connected", mock_is_connected)
    monkeypatch.setattr(nmcli, "iface_info", mock_get_connection_status)
    expected = {"status": "full", "interfaces": connection_status}
    resp = api_client.get("/networking/status")
    body_json = resp.json()
    assert resp.status_code == 200
    assert body_json == expected


def test_wifi_list(api_client, monkeypatch):
    expected_res = [
        {
            "ssid": "Opentrons",
            "signal": 81,
            "active": True,
            "security": "WPA2 802.1X",
            "securityType": "wpa-eap",
        },
        {
            "ssid": "Big Duck",
            "signal": 47,
            "active": False,
            "security": "WPA2 802.1X",
            "securityType": "wpa-eap",
        },
        {
            "ssid": "HP-Print-1-LaserJet Pro",
            "signal": 35,
            "active": False,
            "security": "WPA2 802.1X",
            "securityType": "wpa-eap",
        },
        {
            "ssid": "Guest Wireless",
            "signal": 24,
            "active": False,
            "security": "WPA2 802.1X",
            "securityType": "wpa-eap",
        },
    ]

    async def mock_available(rescan: Optional[bool] = False):
        return expected_res

    monkeypatch.setattr(nmcli, "available_ssids", mock_available)

    expected = {"list": expected_res}

    resp = api_client.get("/wifi/list")
    j = resp.json()
    assert resp.status_code == 200
    assert j == expected


def test_wifi_configure(api_client):
    msg = (
        "Device 'wlan0' successfully activated with"
        " '076aa998-0275-4aa0-bf85-e9629021e267'."
    )

    with patch("opentrons.system.nmcli.configure") as m:
        m.return_value = True, msg

        expected = {"ssid": "Opentrons", "message": msg}

        resp = api_client.post(
            "/wifi/configure", json={"ssid": "Opentrons", "psk": "scrt sqrl"}
        )
        body = resp.json()
        assert resp.status_code == 201
        assert body == expected

        m.assert_called_once_with(
            ssid="Opentrons",
            eapConfig=None,
            securityType=nmcli.SECURITY_TYPES.WPA_PSK,
            psk="scrt sqrl",
            hidden=False,
        )


def test_wifi_configure_value_error(api_client, monkeypatch):
    async def mock_configure(
        ssid, eapConfig, securityType=None, psk=None, hidden=False
    ):
        raise ValueError("nope!")

    monkeypatch.setattr(nmcli, "configure", mock_configure)

    resp = api_client.post("/wifi/configure", json={"ssid": "asasd", "foo": "bar"})
    assert resp.status_code == 400
    body = resp.json()
    assert {"message": "ValueError: nope!", "errorCode": "4000"} == body


def test_wifi_configure_nmcli_error(api_client, monkeypatch):
    async def mock_configure(
        ssid, eapConfig, securityType=None, psk=None, hidden=False
    ):
        return False, "no"

    monkeypatch.setattr(nmcli, "configure", mock_configure)

    resp = api_client.post("/wifi/configure", json={"ssid": "asasd", "foo": "bar"})
    assert resp.status_code == 401
    body = resp.json()
    assert {"errorCode": "4000", "message": "no"} == body


def test_wifi_disconnect(api_client, monkeypatch):
    msg1 = (
        "Connection 'ot_wifi' successfully deactivated. "
        "Connection 'ot_wifi' (fa7ed807-23ef-41f0-ab3e-34"
        "99cc5a960e) successfully deleted"
    )

    async def mock_disconnect(ssid):
        # Command: nmcli connection down ssid
        return True, msg1

    monkeypatch.setattr(nmcli, "wifi_disconnect", mock_disconnect)

    resp = api_client.post("/wifi/disconnect", json={})
    assert resp.status_code == 422

    resp = api_client.post("wifi/disconnect", json={"ssid": "ot_wifi"})
    body = resp.json()
    assert resp.status_code == 200
    assert "message" in body

    msg2 = (
        "Connection 'ot_wifi' successfully deactivated. \n"
        "Error: Could not remove ssid. No connection for ssid ot_wif123"
    )

    async def mock_bad_disconnect(ssid):
        # Command: nmcli connection down ssid
        return True, msg2

    monkeypatch.setattr(nmcli, "wifi_disconnect", mock_bad_disconnect)

    resp = api_client.post("wifi/disconnect", json={"ssid": "ot_wifi"})
    body = resp.json()
    assert resp.status_code == 207
    assert "message" in body


@patch("opentrons.system.wifi.list_keys")
def test_list_keys_no_keys(list_key_patch, api_client):
    list_key_patch.return_value = ()

    empty_resp = api_client.get("/wifi/keys")
    assert empty_resp.status_code == 200
    empty_body = empty_resp.json()
    assert empty_body == {"keys": []}


@patch("opentrons.system.wifi.list_keys")
def test_list_keys(list_key_patch, api_client):
    def gen():
        dummy_names = ["ad12d1df199bc912", "cbdda8124128cf", "812410990c5412"]
        for n in dummy_names:
            yield wifi.Key(directory=n, file=f"{n[:4]}.pem")

    list_key_patch.side_effect = gen

    resp = api_client.get("/wifi/keys")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "keys": [
            {
                "uri": "/wifi/keys/ad12d1df199bc912",
                "id": "ad12d1df199bc912",
                "name": "ad12.pem",
            },
            {
                "uri": "/wifi/keys/cbdda8124128cf",
                "id": "cbdda8124128cf",
                "name": "cbdd.pem",
            },
            {
                "uri": "/wifi/keys/812410990c5412",
                "id": "812410990c5412",
                "name": "8124.pem",
            },
        ]
    }


def test_add_key_call(api_client):
    """Test that uploaded file is processed properly"""
    with tempfile.TemporaryDirectory() as source_td:
        # We should be able to add multiple keys
        for fn in ["test1.pem", "test2.pem", "test3.pem"]:
            path = os.path.join(source_td, fn)
            with open(path, "w") as f:
                f.write(str(random.getrandbits(20)))

            with patch("opentrons.system.wifi.add_key") as p:
                p.return_value = wifi.AddKeyResult(
                    created=True, key=wifi.Key(file="", directory="")
                )

                api_client.post("/wifi/keys", files={"key": open(path, "rb")})

                with open(path, "rb") as f:
                    p.assert_called_once_with(fn, f.read())


def test_add_key_no_key(api_client):
    """Test response when no key supplied"""
    with patch("opentrons.system.wifi.add_key") as p:
        r = api_client.post("/wifi/keys", data={})

        p.assert_not_called()
        assert r.status_code == 422


@pytest.mark.parametrize(
    "add_key_return,expected_status,expected_body",
    [
        (
            wifi.AddKeyResult(created=True, key=wifi.Key(file="a", directory="b")),
            201,
            {"name": "a", "uri": "/wifi/keys/b", "id": "b"},
        ),
        (
            wifi.AddKeyResult(created=False, key=wifi.Key(file="x", directory="g")),
            200,
            {
                "name": "x",
                "uri": "/wifi/keys/g",
                "id": "g",
                "message": "Key file already present",
            },
        ),
    ],
)
def test_add_key_response(add_key_return, expected_status, expected_body, api_client):
    with tempfile.TemporaryDirectory() as source_td:

        path = os.path.join(source_td, "t.pem")
        with open(path, "w") as f:
            f.write(str(random.getrandbits(20)))

        with patch("opentrons.system.wifi.add_key") as p:
            p.return_value = add_key_return
            r = api_client.post("/wifi/keys", files={"key": open(path, "rb")})
            assert r.status_code == expected_status
            assert r.json() == expected_body


@pytest.mark.parametrize(
    "arg,remove_key_return,expected_status,expected_body",
    [
        (
            "12345",
            None,
            404,
            {"message": "No such key file 12345", "errorCode": "4000"},
        ),
        ("54321", "myfile.pem", 200, {"message": "Key file myfile.pem deleted"}),
    ],
)
def test_remove_key(arg, remove_key_return, expected_status, expected_body, api_client):
    with patch("opentrons.system.wifi.remove_key") as p:
        p.return_value = remove_key_return
        r = api_client.delete("/wifi/keys/" + arg)
        p.assert_called_once_with(arg)
        assert r.status_code == expected_status
        assert r.json() == expected_body


def test_eap_config_options(api_client):
    resp = api_client.get("/wifi/eap-options")

    assert resp.status_code == 200

    body = resp.json()
    # Check that the body is shaped correctly but ignore the actual content
    assert "options" in body
    option_keys = ("name", "displayName", "required", "type")
    option_types = ("string", "password", "file")

    def check_option(opt_dict):
        for key in option_keys:
            assert key in opt_dict
        assert opt_dict["type"] in option_types

    for opt in body["options"]:
        assert "name" in opt
        assert "displayName" in opt
        assert "options" in opt
        for method_opt in opt["options"]:
            check_option(method_opt)


@pytest.mark.parametrize(
    "nmcli_message,result_message",
    [
        (
            "Warning: password for '802-11-wireless-security.psk' not given in 'passwd-file' and nmcli cannot ask without '--ask' option. Error: Connection activation failed: Secrets were required, but not provided Hint: use 'journalctl -xe NM_CONNECTION=05d784ec-1feb4147-be22-c07d7915ef96 + NM_DEVICE=mlan0' to get more details.",
            "Could not connect to network. Please double-check network credentials.",
        ),
        (
            "Warning: asdasdasff for '802-11-afasda' not given in 'asdadsa'. Error: Connection activation failed: Secrets were required, but not provided",
            "Warning: asdasdasff for '802-11-afasda' not given in 'asdadsa'. Error: Connection activation failed: Secrets were required, but not provided",
        ),
        (
            "Error: Connection activation failed: Secrets were required, but not provided",
            "Error: Connection activation failed: Secrets were required, but not provided",
        ),
    ],
)
def test_error_rewriting(nmcli_message: str, result_message: str) -> None:
    """It should rewrite known nmcli failure messages."""
    assert _massage_nmcli_error(nmcli_message) == result_message
