from typing import Any, Dict, cast

import pytest
from _pytest.fixtures import SubRequest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from opentrons.config.advanced_settings import _migrate, _ensure


@pytest.fixture
def migrated_file_version() -> int:
    return 37


# make sure to set a boolean value in default_file_settings only if
# that value has a migration that changes an old default value to a new one
@pytest.fixture
def default_file_settings() -> Dict[str, Any]:
    return {
        "shortFixedTrash": None,
        "deckCalibrationDots": None,
        "disableHomeOnBoot": None,
        "useOldAspirationFunctions": None,
        "enableDoorSafetySwitch": None,
        "enableOT3HardwareController": None,
        "rearPanelIntegration": True,
        "disableStallDetection": None,
        "disableStatusBar": None,
        "disableOverpressureDetection": None,
        "estopNotRequired": None,
        "enableErrorRecoveryExperiments": None,
        "enableOEMMode": None,
        "enablePerformanceMetrics": None,
    }


@pytest.fixture
def empty_settings() -> Dict[str, Any]:
    return {}


@pytest.fixture
def version_less() -> Dict[str, Any]:
    return {
        "shortFixedTrash": True,
        "calibrateToBottom": True,
        "deckCalibrationDots": True,
        "disableHomeOnBoot": True,
        "useOldAspirationFunctions": True,
    }


@pytest.fixture
def v1_config() -> Dict[str, Any]:
    return {
        "_version": 1,
        "shortFixedTrash": True,
        "calibrateToBottom": True,
        "deckCalibrationDots": True,
        "disableHomeOnBoot": True,
        "useProtocolApi2": None,
        "useOldAspirationFunctions": True,
    }


@pytest.fixture
def v2_config(v1_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v1_config.copy()
    r.update(
        {
            "_version": 2,
            "disableLogAggregation": None,
        }
    )
    return r


@pytest.fixture
def v3_config(v2_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v2_config.copy()
    r.update({"_version": 3, "enableApi1BackCompat": False})
    return r


@pytest.fixture
def v4_config(v3_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v3_config.copy()
    r.update({"_version": 4, "useV1HttpApi": False})
    return r


@pytest.fixture
def v5_config(v4_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v4_config.copy()
    r.update(
        {
            "_version": 5,
            "enableDoorSafetySwitch": True,
        }
    )
    return r


@pytest.fixture
def v6_config(v5_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v5_config.copy()
    r.update({"_version": 6, "enableTipLengthCalibration": True})
    return r


@pytest.fixture
def v7_config(v6_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v6_config.copy()
    r.update(
        {
            "_version": 7,
            "enableHttpProtocolSessions": True,
        }
    )
    return r


@pytest.fixture
def v8_config(v7_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v7_config.copy()
    r.update(
        {
            "_version": 8,
            "enableFastProtocolUpload": True,
        }
    )
    return r


@pytest.fixture
def v9_config(v8_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v8_config.copy()
    r.update(
        {
            "_version": 9,
            "enableProtocolEngine": True,
        }
    )
    return r


@pytest.fixture
def v10_config(v9_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v9_config.copy()
    r.pop("useProtocolApi2")
    r.pop("enableApi1BackCompat")
    r.pop("useV1HttpApi")
    r.pop("enableTipLengthCalibration")
    r.pop("enableFastProtocolUpload")
    r.update(
        {
            "_version": 10,
            "disableFastProtocolUpload": True,
        }
    )
    return r


@pytest.fixture
def v11_config(v10_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v10_config.copy()
    r.pop("enableProtocolEngine")
    r.update({"_version": 11})
    return r


@pytest.fixture
def v12_config(v11_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v11_config.copy()
    r.update(
        {
            "_version": 12,
            "enableOT3HardwareController": True,
        }
    )
    return r


@pytest.fixture
def v13_config(v12_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v12_config.copy()
    r.pop("calibrateToBottom")
    r.update({"_version": 13})
    return r


@pytest.fixture
def v14_config(v13_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v13_config.copy()
    r.pop("enableHttpProtocolSessions")
    r.update({"_version": 14})
    return r


@pytest.fixture
def v15_config(v14_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v14_config.copy()
    r.update(
        {
            "_version": 15,
            "enableHeaterShakerPAPI": True,
        }
    )
    return r


@pytest.fixture
def v16_config(v15_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v15_config.copy()
    r.pop("enableHeaterShakerPAPI")
    r.update({"_version": 16})
    return r


@pytest.fixture
def v17_config(v16_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v16_config.copy()
    r.update(
        {
            "_version": 17,
            "enableProtocolEnginePAPICore": True,
        }
    )
    return r


@pytest.fixture
def v18_config(v17_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v17_config.copy()
    r.update(
        {
            "_version": 18,
            "enableLoadLiquid": True,
        }
    )
    return r


@pytest.fixture
def v19_config(v18_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v18_config.copy()
    r.pop("enableLoadLiquid")
    r.update({"_version": 19})
    return r


@pytest.fixture
def v20_config(v19_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v19_config.copy()
    r.update(
        {
            "_version": 20,
            "enableOT3FirmwareUpdates": None,
        }
    )
    return r


@pytest.fixture
def v21_config(v20_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v20_config.copy()
    r.pop("enableProtocolEnginePAPICore")
    r.update({"_version": 21})
    return r


@pytest.fixture
def v22_config(v21_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v21_config.copy()
    r.pop("enableOT3FirmwareUpdates")
    r.update({"_version": 22})
    return r


@pytest.fixture
def v23_config(v22_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v22_config.copy()
    r.update(
        {
            "_version": 23,
            "rearPanelIntegration": None,
        }
    )
    return r


@pytest.fixture
def v24_config(v23_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v23_config.copy()
    r.update(
        {
            "_version": 24,
            "rearPanelIntegration": True,
        }
    )
    return r


@pytest.fixture
def v25_config(v24_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v24_config.copy()
    r.update(
        {
            "_version": 25,
            "disableStallDetection": None,
        }
    )
    return r


@pytest.fixture
def v26_config(v25_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v25_config.copy()
    r.update(
        {
            "_version": 26,
            "disableStatusBar": None,
        }
    )
    return r


@pytest.fixture
def v27_config(v26_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v26_config.copy()
    r.update(
        {
            "_version": 27,
            "disableOverpressureDetection": None,
        }
    )
    return r


@pytest.fixture
def v28_config(v27_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v27_config.copy()
    r.update(
        {
            "_version": 28,
            "disableTipPresenceDetection": None,
        }
    )
    return r


@pytest.fixture
def v29_config(v28_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v28_config.copy()
    r.update(
        {
            "_version": 29,
            "estopNotRequired": None,
        }
    )
    return r


@pytest.fixture
def v30_config(v29_config: Dict[str, Any]) -> Dict[str, Any]:
    r = {k: v for k, v in v29_config.items() if k != "disableTipPresenceDetection"}
    r["_version"] = 30
    return r


@pytest.fixture
def v31_config(v30_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v30_config.copy()
    r.update(
        {
            "_version": 31,
            "enableErrorRecoveryExperiments": None,
        }
    )
    return r


@pytest.fixture
def v32_config(v31_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v31_config.copy()
    r.update(
        {
            "_version": 32,
            "enableOEMMode": None,
        }
    )
    return r


@pytest.fixture
def v33_config(v32_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v32_config.copy()
    r.update(
        {
            "_version": 33,
            "enablePerformanceMetrics": None,
        }
    )
    return r


@pytest.fixture
def v34_config(v33_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v33_config.copy()
    r.pop("disableFastProtocolUpload")
    r["_version"] = 34
    return r


@pytest.fixture
def v35_config(v34_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v34_config.copy()
    r.pop("disableLogAggregation")
    r["_version"] = 35
    return r


@pytest.fixture
def v36_config(v35_config: Dict[str, Any]) -> Dict[str, Any]:
    r = v35_config.copy()
    r.update(
        {
            "_version": 36,
            "allowLiquidClasses": None,
        }
    )
    return r


@pytest.fixture
def v37_config(v36_config: Dict[str, Any]) -> Dict[str, Any]:
    r = {k: v for k, v in v36_config.items() if k != "allowLiquidClasses"}
    r["_version"] = 37
    return r


@pytest.fixture(
    scope="session",
    params=[
        lazy_fixture("empty_settings"),
        lazy_fixture("version_less"),
        lazy_fixture("v1_config"),
        lazy_fixture("v2_config"),
        lazy_fixture("v3_config"),
        lazy_fixture("v4_config"),
        lazy_fixture("v5_config"),
        lazy_fixture("v6_config"),
        lazy_fixture("v7_config"),
        lazy_fixture("v8_config"),
        lazy_fixture("v9_config"),
        lazy_fixture("v10_config"),
        lazy_fixture("v11_config"),
        lazy_fixture("v12_config"),
        lazy_fixture("v13_config"),
        lazy_fixture("v14_config"),
        lazy_fixture("v15_config"),
        lazy_fixture("v16_config"),
        lazy_fixture("v17_config"),
        lazy_fixture("v18_config"),
        lazy_fixture("v19_config"),
        lazy_fixture("v20_config"),
        lazy_fixture("v21_config"),
        lazy_fixture("v22_config"),
        lazy_fixture("v23_config"),
        lazy_fixture("v24_config"),
        lazy_fixture("v25_config"),
        lazy_fixture("v26_config"),
        lazy_fixture("v27_config"),
        lazy_fixture("v28_config"),
        lazy_fixture("v29_config"),
        lazy_fixture("v30_config"),
        lazy_fixture("v31_config"),
        lazy_fixture("v32_config"),
        lazy_fixture("v33_config"),
        lazy_fixture("v34_config"),
        lazy_fixture("v35_config"),
        lazy_fixture("v36_config"),
        lazy_fixture("v37_config"),
    ],
)
def old_settings(request: SubRequest) -> Dict[str, Any]:
    return cast(Dict[str, Any], request.param)


def test_migrations(
    old_settings: Dict[str, Any],
    migrated_file_version: int,
    default_file_settings: Dict[str, Any],
) -> None:
    settings, version = _migrate(old_settings)

    expected = default_file_settings.copy()
    # this updates the default file settings value to the previous default
    # the final check if default_file_settings[k] is None was added for when
    # a migration changes the default value. Without it we overwrite the new
    # default value with the old default value
    expected.update(
        {
            k: v
            for k, v in old_settings.items()
            if k != "_version"
            and k in default_file_settings
            and default_file_settings[k] is None
        }
    )

    assert version == migrated_file_version
    assert settings == expected


def test_migrates_versionless_old_config(
    migrated_file_version: int,
    default_file_settings: Dict[str, Any],
) -> None:
    settings, version = _migrate(
        {
            "short-fixed-trash": False,
            "calibrate-to-bottom": False,
            "dots-deck-type": True,
            "disable-home-on-boot": False,
        }
    )

    expected = default_file_settings.copy()
    expected.update(
        {
            "shortFixedTrash": None,
            "deckCalibrationDots": True,
            "disableHomeOnBoot": None,
        }
    )

    assert version == migrated_file_version
    assert settings == expected


def test_ignores_invalid_keys(
    migrated_file_version: int,
    default_file_settings: Dict[str, Any],
) -> None:
    settings, version = _migrate(
        {
            "split-labware-def": True,
            "splitLabwareDefinitions": True,
        }
    )

    assert version == migrated_file_version
    assert settings == default_file_settings


def test_ensures_config() -> None:
    assert _ensure({"_version": 3, "shortFixedTrash": False}) == {
        "_version": 3,
        "shortFixedTrash": False,
        "deckCalibrationDots": None,
        "disableHomeOnBoot": None,
        "useOldAspirationFunctions": None,
        "enableDoorSafetySwitch": None,
        "enableOT3HardwareController": None,
        "rearPanelIntegration": None,
        "disableStallDetection": None,
        "disableStatusBar": None,
        "estopNotRequired": None,
        "disableOverpressureDetection": None,
        "enableErrorRecoveryExperiments": None,
        "enableOEMMode": None,
        "enablePerformanceMetrics": None,
    }
