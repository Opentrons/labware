import logging
from mock import patch, call, MagicMock
from dataclasses import make_dataclass
from typing import Generator, Optional
from pathlib import Path

import pytest

from decoy import Decoy

from opentrons.config.reset import ResetOptionId
from opentrons.config import advanced_settings
from opentrons_shared_data.pipette import (
    types as pip_types,
    pipette_definition as pip_def,
)
from opentrons.types import Mount
from opentrons_shared_data.robot.types import RobotTypeEnum


from robot_server.app import app
from robot_server.deck_configuration.fastapi_dependencies import (
    get_deck_configuration_store_failsafe,
)
from robot_server.deck_configuration.store import DeckConfigurationStore
from robot_server.persistence.persistence_directory import PersistenceResetter
from robot_server.persistence.fastapi_dependencies import get_persistence_resetter


def test_get_robot_settings(api_client, hardware):
    Conf = make_dataclass("Conf", ["a", "b", "c"])
    hardware.config = Conf(a="test", b="this", c=5)

    res = api_client.get("/settings/robot")

    assert res.status_code == 200
    assert res.json() == {"a": "test", "b": "this", "c": 5}


@pytest.fixture
def mock_pipette_data():
    return {
        "p1": {
            "info": {"model": "p1_model", "name": ""},
            "fields": {
                "pickUpCurrent": {
                    "units": "mm",
                    "type": "float",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 0.5,
                },
                "quirks": {"dropTipShake": True},
            },
        },
        "p2": {
            "info": {"model": "p2_model", "name": ""},
            "fields": {
                "pickUpIncrement": {
                    "units": "mm/s",
                    "type": "int",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 2.0,
                }
            },
        },
    }


@pytest.fixture
def mock_known_pipettes(decoy: Decoy) -> Decoy:
    with patch(
        "opentrons_shared_data.pipette.mutable_configurations.known_pipettes",
        new=decoy.mock(
            name="opentrons_shared_data.pipette.mutable_configurations.known_pipettes"
        ),
    ) as m:
        yield m


@pytest.fixture
def mock_list_mutable_configs(decoy: Decoy) -> Decoy:
    with patch(
        "opentrons_shared_data.pipette.mutable_configurations.list_mutable_configs",
        new=decoy.mock(
            name="opentrons_shared_data.pipette.mutable_configurations.list_mutable_configs"
        ),
    ) as m:
        yield m


@pytest.fixture
def mock_list_mutable_configs_with_defaults(decoy: Decoy) -> Decoy:
    with patch(
        "opentrons_shared_data.pipette.mutable_configurations.list_mutable_configs_with_defaults",
        new=decoy.mock(
            name="opentrons_shared_data.pipette.mutable_configurations.list_mutable_configs_with_defaults"
        ),
    ) as m:
        yield m


@pytest.fixture
def mock_save_overrides(decoy: Decoy) -> Decoy:
    with patch(
        "opentrons_shared_data.pipette.mutable_configurations.save_overrides",
        new=decoy.mock(
            name="opentrons_shared_data.pipette.mutable_configurations.save_overrides"
        ),
    ) as m:
        yield m


@pytest.fixture
def mock_get_opentrons_dir(decoy: Decoy) -> Decoy:
    with patch(
        "robot_server.service.legacy.routers.settings.get_opentrons_path",
        new=decoy.mock(
            name="robot_server.service.legacy.routers.settings.get_opentrons_path"
        ),
    ) as m:
        yield m


def test_receive_attached_pipette_settings(
    decoy: Decoy,
    api_client,
    mock_known_pipettes: Decoy,
    mock_get_opentrons_dir: Decoy,
    mock_list_mutable_configs_with_defaults: Decoy,
    hardware: MagicMock,
) -> None:
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        "nope"
    )
    decoy.when(mock_known_pipettes("nope")).then_return([])
    hardware.attached_pipettes = {
        Mount.LEFT: {"pipette_id": "P12345", "model": "p20_multi_v3.5"}
    }
    decoy.when(
        mock_list_mutable_configs_with_defaults(
            pipette_model=pip_def.PipetteModelVersionType(
                pip_types.PipetteModelType.p20,
                pip_types.PipetteChannelType.EIGHT_CHANNEL,
                pip_types.PipetteVersionType(3, 5),
                pip_types.PipetteOEMType.OT,
            ),
            pipette_serial_number="P12345",
            pipette_override_path="nope",
        )
    ).then_return(
        {
            "pickUpCurrent": pip_types.MutableConfig.build(
                **{
                    "units": "mm",
                    "type": "float",
                    "min": 1.0,
                    "max": 3.0,
                    "default": 1.5,
                    "value": 1.2,
                },
                name="pickUpCurrent",
            ),
            "quirks": {
                "dropTipShake": pip_types.QuirkConfig(name="dropTipShake", value=True)
            },
            "model": "p20_multi_v3.5",
        }
    )
    resp = api_client.get("/settings/pipettes")
    assert resp.status_code == 200
    assert resp.json() == {
        "P12345": {
            "info": {"model": "p20_multi_v3.5", "name": ""},
            "fields": {
                "pickUpCurrent": {
                    "units": "mm",
                    "type": "float",
                    "min": 1.0,
                    "max": 3.0,
                    "default": 1.5,
                    "value": 1.2,
                },
                "quirks": {"dropTipShake": True},
            },
        },
    }


def test_receive_pipette_settings(
    decoy: Decoy,
    api_client,
    mock_known_pipettes: Decoy,
    mock_list_mutable_configs: Decoy,
    mock_get_opentrons_dir: Decoy,
    mock_pipette_data,
):
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )

    decoy.when(mock_known_pipettes(funny_path)).then_return(["p1", "p2"])

    decoy.when(
        mock_list_mutable_configs(
            pipette_serial_number="p1", pipette_override_path=funny_path
        )
    ).then_return(
        {
            "pickUpCurrent": pip_types.MutableConfig.build(
                **{
                    "units": "mm",
                    "type": "float",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 0.5,
                },
                name="pickUpCurrent",
            ),
            "quirks": {
                "dropTipShake": pip_types.QuirkConfig(name="dropTipShake", value=True)
            },
            "model": "p1_model",
        }
    )

    decoy.when(
        mock_list_mutable_configs(
            pipette_serial_number="p2", pipette_override_path=funny_path
        )
    ).then_return(
        {
            "pickUpIncrement": pip_types.MutableConfig.build(
                **{
                    "units": "mm/s",
                    "type": "int",
                    "min": 0,
                    "max": 2,
                    "default": 1.0,
                    "value": 2,
                },
                name="pickUpIncrement",
            ),
            "model": "p2_model",
        }
    )

    resp = api_client.get("/settings/pipettes")
    assert resp.status_code == 200
    assert resp.json() == mock_pipette_data


def test_receive_pipette_settings_unknown(
    api_client, mock_known_pipettes: Decoy, mock_get_opentrons_dir: Decoy, decoy: Decoy
):
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )
    decoy.when(mock_known_pipettes(funny_path)).then_return([])
    # Non-existent pipette id and get 404
    resp = api_client.get("/settings/pipettes/wannabepipette")
    assert resp.status_code == 404


def test_receive_pipette_settings_found(
    decoy: Decoy,
    mock_known_pipettes: Decoy,
    mock_list_mutable_configs: Decoy,
    mock_get_opentrons_dir: Decoy,
    api_client,
    mock_pipette_data,
):
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )
    decoy.when(mock_known_pipettes(funny_path)).then_return(["p1"])
    decoy.when(
        mock_list_mutable_configs(
            pipette_serial_number="p1", pipette_override_path=funny_path
        )
    ).then_return(
        {
            "pickUpCurrent": pip_types.MutableConfig.build(
                **{
                    "units": "mm",
                    "type": "float",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 0.5,
                },
                name="pickUpCurrent",
            ),
            "quirks": {
                "dropTipShake": pip_types.QuirkConfig(name="dropTipShake", value=True)
            },
            "model": "p1_model",
        }
    )
    resp = api_client.get("/settings/pipettes/p1")
    assert resp.status_code == 200
    assert resp.json() == mock_pipette_data["p1"]


def test_modify_pipette_settings_call_override(
    decoy: Decoy,
    api_client,
    mock_pipette_data,
    mock_known_pipettes: Decoy,
    mock_save_overrides: Decoy,
    mock_list_mutable_configs: Decoy,
    mock_get_opentrons_dir: Decoy,
):
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )

    decoy.when(mock_known_pipettes(funny_path)).then_return(["p1"])
    decoy.when(
        mock_list_mutable_configs(
            pipette_serial_number="p1", pipette_override_path=funny_path
        )
    ).then_return(
        {
            "pickUpCurrent": pip_types.MutableConfig.build(
                **{
                    "units": "mm",
                    "type": "float",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 1.0,
                },
                name="pickUpCurrent",
            ),
            "quirks": {
                "dropTipShake": pip_types.QuirkConfig(name="dropTipShake", value=True)
            },
            "model": "p1_model",
        }
    )
    pipette_id = "p1"
    changes = {
        "fields": {
            "pickUpCurrent": {"value": 1},
            "dropTipShake": {"value": True},
            "pickUpSpeed": {"value": None},
            "pickUpDistance": None,
        }
    }

    # Check that data is changed and matches the changes specified
    resp = api_client.patch(f"/settings/pipettes/{pipette_id}", json=changes)
    mock_save_overrides.assert_called_once_with(
        fields={
            "pickUpCurrent": 1,
            "dropTipShake": True,
            "pickUpSpeed": None,
            "pickUpDistance": None,
        },
        pipette_id=pipette_id,
        pipette_override_path=funny_path,
    )

    mock_pipette_data[pipette_id]["fields"] = {
        "pickUpCurrent": {
            "units": "mm",
            "type": "float",
            "min": 0.0,
            "max": 2.0,
            "default": 1.0,
            "value": 1.0,
        },
        "quirks": {"dropTipShake": True},
    }
    patch_body = resp.json()
    assert resp.status_code == 200
    assert patch_body == {
        "fields": mock_pipette_data[pipette_id]["fields"],
        "info": mock_pipette_data[pipette_id]["info"],
    }


@pytest.mark.parametrize(argnames=["body"], argvalues=[[{}], [{"fields": {}}]])
def test_modify_pipette_settings_do_not_call_override(
    decoy: Decoy,
    api_client,
    mock_pipette_data,
    body,
    mock_known_pipettes: Decoy,
    mock_save_overrides: Decoy,
    mock_list_mutable_configs: Decoy,
    mock_get_opentrons_dir: Decoy,
):
    pipette_id = "p1"
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )

    decoy.when(mock_known_pipettes(funny_path)).then_return(["p1"])
    decoy.when(
        mock_list_mutable_configs(
            pipette_serial_number="p1", pipette_override_path=funny_path
        )
    ).then_return(
        {
            "pickUpCurrent": pip_types.MutableConfig.build(
                **{
                    "units": "mm",
                    "type": "float",
                    "min": 0.0,
                    "max": 2.0,
                    "default": 1.0,
                    "value": 0.5,
                },
                name="pickUpCurrent",
            ),
            "quirks": {
                "dropTipShake": pip_types.QuirkConfig(name="dropTipShake", value=True)
            },
            "model": "p1_model",
        }
    )

    resp = api_client.patch(f"/settings/pipettes/{pipette_id}", json=body)
    mock_save_overrides.assert_not_called()
    patch_body = resp.json()
    assert resp.status_code == 200
    assert patch_body == {
        "fields": mock_pipette_data[pipette_id]["fields"],
        "info": mock_pipette_data[pipette_id]["info"],
    }


def test_modify_pipette_settings_failure(
    decoy: Decoy,
    api_client,
    mock_save_overrides: Decoy,
    mock_get_opentrons_dir: Decoy,
):
    test_id = "p1"
    funny_path = Path("funny/path/pipettes")
    decoy.when(mock_get_opentrons_dir("pipette_config_overrides_dir")).then_return(
        funny_path
    )

    test_fields = {"pickUpCurrent": {"value": 1}}

    decoy.when(
        mock_save_overrides(
            overrides={"pickUpCurrent": 1.0},
            pipette_serial_number=test_id,
            pipette_override_path=funny_path,
        )
    ).then_raise(ValueError("Failed!"))

    resp = api_client.patch(
        f"/settings/pipettes/{test_id}",
        json={"fields": test_fields},
    )

    patch_body = resp.json()
    assert resp.status_code == 412
    assert patch_body == {"message": "Failed!", "errorCode": "4000"}


def test_available_resets(api_client):
    resp = api_client.get("/settings/reset/options")
    body = resp.json()
    options_list = body.get("options")
    assert resp.status_code == 200
    assert sorted(
        [
            "deckCalibration",
            "deckConfiguration",
            "pipetteOffsetCalibrations",
            "bootScripts",
            "tipLengthCalibrations",
            "runsHistory",
            "authorizedKeys",
        ]
    ) == sorted([item["id"] for item in options_list])


@pytest.fixture
def mock_reset():
    with patch("robot_server.service.legacy.routers." "settings.reset_util.reset") as m:
        yield m


@pytest.fixture
def mock_persistence_resetter(
    decoy: Decoy,
) -> Generator[PersistenceResetter, None, None]:
    mock_persistence_resetter = decoy.mock(cls=PersistenceResetter)

    async def mock_get_persistence_resetter() -> PersistenceResetter:
        return mock_persistence_resetter

    app.dependency_overrides[get_persistence_resetter] = mock_get_persistence_resetter
    yield mock_persistence_resetter
    del app.dependency_overrides[get_persistence_resetter]


@pytest.fixture
def mock_deck_configuration_store_failsafe(
    decoy: Decoy,
) -> Generator[Optional[DeckConfigurationStore], None, None]:
    mock_deck_configuration_store = decoy.mock(cls=DeckConfigurationStore)

    async def mock_get_deck_configuration_store_failsafe() -> DeckConfigurationStore:
        return mock_deck_configuration_store

    app.dependency_overrides[
        get_deck_configuration_store_failsafe
    ] = mock_get_deck_configuration_store_failsafe
    yield mock_deck_configuration_store
    del app.dependency_overrides[get_deck_configuration_store_failsafe]


@pytest.mark.parametrize(
    argnames="body,called_with",
    argvalues=[
        # Empty body
        [{}, set()],
        # None true
        [
            {
                "deckCalibration": False,
                "bootScripts": False,
                "pipetteOffsetCalibrations": False,
                "tipLengthCalibrations": False,
                "runsHistory": False,
                "authorizedKeys": False,
            },
            set(),
        ],
        # All set
        [
            {
                "bootScripts": True,
                "pipetteOffsetCalibrations": True,
                "tipLengthCalibrations": True,
                "deckCalibration": True,
                "runsHistory": True,
                "authorizedKeys": True,
                # TODO(mm, 2023-08-04): Figure out how to test Flex-only options,
                # then add gripperOffsetCalibrations and onDeviceDisplay.
            },
            {
                ResetOptionId.boot_scripts,
                ResetOptionId.deck_calibration,
                ResetOptionId.pipette_offset,
                ResetOptionId.tip_length_calibrations,
                # TODO(mm, 2022-10-25): Verify that the subject endpoint function calls
                # PersistenceResetter.mark_directory_reset() and
                # DeckConfigurationStore.reset().
                # Currently blocked by those methods being async, and api_client having
                # its own event loop that interferes with making this test async.
                ResetOptionId.runs_history,
                ResetOptionId.authorized_keys,
            },
        ],
        [{"authorizedKeys": True}, {ResetOptionId.authorized_keys}],
        [{"bootScripts": True}, {ResetOptionId.boot_scripts}],
        [{"pipetteOffsetCalibrations": True}, {ResetOptionId.pipette_offset}],
        [{"tipLengthCalibrations": True}, {ResetOptionId.tip_length_calibrations}],
    ],
)
def test_reset_success(
    api_client,
    mock_reset,
    mock_persistence_resetter: PersistenceResetter,
    mock_deck_configuration_store_failsafe: Optional[DeckConfigurationStore],
    body,
    called_with,
):
    resp = api_client.post("/settings/reset", json=body)
    assert resp.status_code == 200
    mock_reset.assert_called_once_with(called_with, RobotTypeEnum.OT2)


def test_reset_invalid_option(
    api_client,
    mock_reset,
    mock_persistence_resetter,
    mock_deck_configuration_store_failsafe,
):
    resp = api_client.post("/settings/reset", json={"aksgjajhadjasl": False})
    assert resp.status_code == 422
    body = resp.json()
    assert "message" in body
    assert "Input should be" in body["message"]


@pytest.fixture()
def mock_robot_configs():
    with patch("robot_server.service.legacy.routers." "settings.robot_configs") as m:
        yield m


@pytest.fixture()
def mock_logging_set_level():
    with patch("logging.Logger.setLevel") as m:
        yield m


@pytest.mark.parametrize(
    argnames=["body"],
    argvalues=[[{}], [{"log_level": None}], [{"log_level": "oafajhshda"}]],
)
def test_set_log_level_invalid(
    api_client, body, hardware, mock_logging_set_level, mock_robot_configs
):
    resp = api_client.post("/settings/log_level/local", json=body)
    assert resp.status_code == 422
    mock_logging_set_level.assert_not_called()
    hardware.update_config.assert_not_called()
    mock_robot_configs.save_robot_settings.assert_not_called()


@pytest.mark.parametrize(argnames=["disabled"], argvalues=[[True], [False]])
def test_set_status_bar_disabled(api_client, hardware, disabled):
    """Tests that the endpoint correctly updates the setting of the status bar in the API."""
    resp = api_client.post(
        "/settings", json={"id": "disableStatusBar", "value": disabled}
    )
    assert resp.status_code == 200
    hardware.set_status_bar_enabled.assert_called_once_with(not disabled)


@pytest.mark.parametrize(
    argnames=["body", "expected_log_level", "expected_log_level_name"],
    argvalues=[
        [{"log_level": "debug"}, logging.DEBUG, "DEBUG"],
        [{"log_level": "deBug"}, logging.DEBUG, "DEBUG"],
        [{"log_level": "info"}, logging.INFO, "INFO"],
        [{"log_level": "INFO"}, logging.INFO, "INFO"],
        [{"log_level": "warning"}, logging.WARNING, "WARNING"],
        [{"log_level": "warninG"}, logging.WARNING, "WARNING"],
        [{"log_level": "error"}, logging.ERROR, "ERROR"],
        [{"log_level": "ERROR"}, logging.ERROR, "ERROR"],
    ],
)
def test_set_log_level(
    api_client,
    hardware,
    mock_robot_configs,
    mock_logging_set_level,
    body,
    expected_log_level,
    expected_log_level_name,
):
    resp = api_client.post("/settings/log_level/local", json=body)
    assert resp.status_code == 200
    # Three calls for opentrons, robot_server, and uvicorn loggers
    mock_logging_set_level.assert_has_calls(
        [call(expected_log_level), call(expected_log_level), call(expected_log_level)]
    )
    hardware.update_config.assert_called_once_with(log_level=expected_log_level_name)
    mock_robot_configs.save_robot_settings.assert_called_once()


@pytest.fixture
def mock_get_all_adv_settings():
    with patch(
        "robot_server.service.legacy.routers.settings.advanced_settings.get_all_adv_settings"
    ) as p:
        p.return_value = {
            s.id: advanced_settings.Setting(value=False, definition=s)
            for s in advanced_settings.settings
        }
        yield p


@pytest.fixture
def mock_is_restart_required():
    with patch(
        "robot_server.service.legacy.routers.settings.advanced_settings.is_restart_required"
    ) as p:
        yield p


@pytest.fixture
def mock_set_adv_setting():
    with patch(
        "robot_server.service.legacy.routers.settings.advanced_settings.set_adv_setting"
    ) as p:
        yield p


def validate_response_body(body, restart):
    settings_list = body.get("settings")
    assert isinstance(settings_list, list)
    for obj in settings_list:
        assert "id" in obj, '"id" field not found in settings object'
        assert "title" in obj, '"title" not found for {}'.format(obj["id"])
        assert "description" in obj, '"description" not found for {}'.format(obj["id"])
        assert "value" in obj, '"value" not found for {}'.format(obj["id"])
        assert "restart_required" in obj
    assert "links" in body
    assert isinstance(body["links"], dict)
    assert body["links"].get("restart") == restart


@pytest.mark.parametrize(
    argnames=["restart_required", "link"],
    argvalues=[[False, None], [True, "/server/restart"]],
)
def test_get(
    api_client,
    mock_get_all_adv_settings,
    mock_is_restart_required,
    restart_required,
    link,
):
    mock_is_restart_required.return_value = restart_required
    resp = api_client.get("/settings")
    body = resp.json()
    assert resp.status_code == 200
    validate_response_body(body, link)


@pytest.mark.parametrize(
    argnames=["exc", "expected_status", "message"],
    argvalues=[
        [ValueError("Failure"), 400, "ValueError: Failure"],
        [
            advanced_settings.SettingException("Fail", "e"),
            500,
            "opentrons.config.advanced_settings.SettingException: Fail",
        ],
    ],
)
def test_set_err(
    api_client,
    mock_is_restart_required,
    mock_set_adv_setting,
    exc,
    expected_status,
    message,
):
    mock_is_restart_required.return_value = False

    def raiser(i, v):
        raise exc

    mock_set_adv_setting.side_effect = raiser

    test_id = "disableHomeOnBoot"

    resp = api_client.post("/settings", json={"id": test_id, "value": True})
    body = resp.json()
    assert resp.status_code == expected_status
    assert body == {"message": message, "errorCode": "4000"}


def test_set(api_client, mock_set_adv_setting, mock_is_restart_required):
    mock_is_restart_required.return_value = False

    test_id = "disableHomeOnBoot"

    resp = api_client.post("/settings", json={"id": test_id, "value": True})
    body = resp.json()
    assert resp.status_code == 200
    validate_response_body(body, None)
    mock_set_adv_setting.assert_called_once_with(test_id, True)
