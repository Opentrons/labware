import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, cast, Union, Generator

import pytest

from opentrons_shared_data.pipette import (
    mutable_configurations,
    types,
    pipette_definition,
    pipette_load_name_conversions as pip_conversions,
    load_data,
)


TEST_SERIAL_NUMBER = "P50MV1520200304"
TestOverrideType = Dict[str, Union[float, int, bool]]


@pytest.fixture
def TMPFILE_DATA() -> Dict[str, Any]:
    return {
        "dropTipShake": True,
        "doubleDropTip": True,
        "model": "p50_multi_v1.5",
        "quirks": {"pickUpPresses": True, "dropTipShake": True, "doubleDropTip": True},
        "pickUpSpeed": {
            "value": 5.0,
            "min": 1,
            "max": 100,
            "units": "mm/s",
            "type": "float",
            "default": 30,
        },
    }


@pytest.fixture
def override_configuration_path(tmp_path: Path) -> Generator[Path, None, None]:
    os.environ["OT_API_CONFIG_DIR"] = str(tmp_path)

    tmp_path.mkdir(parents=True, exist_ok=True)
    with_pip_path = tmp_path / Path("pipettes")
    with_pip_path.mkdir(parents=True, exist_ok=True)
    yield with_pip_path

    del os.environ["OT_API_CONFIG_DIR"]


@pytest.fixture
def overrides_fixture(
    override_configuration_path: Path, TMPFILE_DATA: Dict[str, Any]
) -> types.MutableConfig:
    with open(override_configuration_path / f"{TEST_SERIAL_NUMBER}.json", "w") as f:
        json.dump(TMPFILE_DATA, f)
    return types.MutableConfig.build(**TMPFILE_DATA["pickUpSpeed"], name="pickUpSpeed")


def test_load_old_overrides_regression(
    TMPFILE_DATA: Dict[str, Any], override_configuration_path: Path
) -> None:
    TMPFILE_DATA["pickUpCurrent"] = {
        "value": 0.15,
        "min": 0.08,
        "max": 0.2,
        "units": "amps",
        "type": "float",
        "default": 0.1,
    }
    with open(override_configuration_path / "P20SV222021040709.json", "w") as f:
        json.dump(TMPFILE_DATA, f)
    configs = mutable_configurations.load_with_mutable_configurations(
        pipette_definition.PipetteModelVersionType(
            pipette_type=types.PipetteModelType.p20,
            pipette_channels=types.PipetteChannelType.SINGLE_CHANNEL,
            pipette_version=types.PipetteVersionType(2, 2),
            oem_type=types.PipetteOEMType.OT,
        ),
        override_configuration_path,
        "P20SV222021040709",
    )
    assert (
        configs.pick_up_tip_configurations.press_fit.configuration_by_nozzle_map[
            list(
                configs.pick_up_tip_configurations.press_fit.configuration_by_nozzle_map.keys()
            )[0]
        ]["default"].current
        == 0.15
    )


def test_list_mutable_configs_unknown_pipette_id(
    override_configuration_path: Path,
) -> None:
    """Test unknown pipette id mutable configs.

    Test that a user receives a list of all possible mutable configurations
    with the default value equal to the regular value.
    """

    found_configurations = mutable_configurations.list_mutable_configs(
        TEST_SERIAL_NUMBER, override_configuration_path
    )
    for c in found_configurations:
        if isinstance(c, str):
            # model string, ignore
            continue
        if isinstance(c, types.QuirkConfig):
            assert isinstance(c.value, bool)
        else:
            assert c.default == c.value


def test_list_mutable_configs_known_pipette_id(
    overrides_fixture: types.MutableConfig, override_configuration_path: Path
) -> None:
    """Test known pipette id mutable configs.

    Test that a user receives a list of all possible mutable configurations
    with the expected overrides also listed.
    """
    found_configurations = mutable_configurations.list_mutable_configs(
        TEST_SERIAL_NUMBER, override_configuration_path
    )

    for c in found_configurations:
        if isinstance(c, str):
            # model string, ignore
            continue
        if overrides_fixture.name == c.name:
            assert c.value == overrides_fixture.value
        elif isinstance(c, types.QuirkConfig):
            assert isinstance(c.value, bool)
        else:
            assert c.default == c.value


@pytest.mark.parametrize(
    argnames=["overrides_dict", "saved_dict"],
    argvalues=[
        [
            {"pickUpCurrent": 0.5, "dropTipSpeed": 5, "dropTipShake": False},
            {
                "quirks": {"dropTipShake": False},
                "pickUpCurrent": {
                    "value": 0.5,
                    "default": 0.8,
                    "units": "amps",
                    "type": "float",
                    "min": 0.1,
                    "max": 2.0,
                },
                "model": "p50_multi_v1.5",
                "dropTipSpeed": {
                    "value": 5,
                    "default": 5.0,
                    "units": "mm/s",
                    "type": "float",
                    "min": 0.01,
                    "max": 30,
                },
            },
        ]
    ],
)
def test_save_new_overrides_new_file(
    override_configuration_path: Path,
    overrides_dict: TestOverrideType,
    saved_dict: Dict[str, Any],
) -> None:
    mutable_configurations.save_overrides(
        TEST_SERIAL_NUMBER, overrides_dict, override_configuration_path
    )
    with open(override_configuration_path / f"{TEST_SERIAL_NUMBER}.json") as f:
        new_file = json.load(f)
    assert saved_dict == new_file


@pytest.mark.parametrize(
    argnames=["overrides_dict"],
    argvalues=[
        [{"pickUpCurrent": 1, "pickUpSpeed": 10, "dropTipShake": False}],
        [{"pickUpCurrent": 2}],
    ],
)
def test_save_new_overrides_update_file(
    override_configuration_path: Path,
    overrides_fixture: types.MutableConfig,
    overrides_dict: TestOverrideType,
    TMPFILE_DATA: Dict[str, Any],
) -> None:
    mutable_configurations.save_overrides(
        TEST_SERIAL_NUMBER, overrides_dict, override_configuration_path
    )
    with open(override_configuration_path / f"{TEST_SERIAL_NUMBER}.json") as f:
        new_file = json.load(f)

    for k, v in overrides_dict.items():
        if isinstance(v, bool):
            TMPFILE_DATA["quirks"][k] = v
        elif TMPFILE_DATA.get(k):
            TMPFILE_DATA[k]["value"] = v

    TMPFILE_DATA["pickUpCurrent"] = {
        "default": 0.8,
        "max": 2.0,
        "min": 0.1,
        "type": "float",
        "units": "amps",
        "value": overrides_dict["pickUpCurrent"],
    }

    del TMPFILE_DATA["quirks"]["pickUpPresses"]
    assert TMPFILE_DATA == new_file


@pytest.mark.parametrize(
    argnames=["overrides_dict"],
    argvalues=[
        [{"pickUpCurrent": 1231.213, "dropTipSpeed": 121, "dropTipShake": False}],
        [{"quirk123": True}],
    ],
)
def test_save_invalid_overrides(
    overrides_fixture: types.MutableConfig,
    override_configuration_path: Path,
    overrides_dict: TestOverrideType,
    TMPFILE_DATA: Dict[str, Any],
) -> None:
    with pytest.raises(ValueError):
        mutable_configurations.save_overrides(
            TEST_SERIAL_NUMBER, overrides_dict, override_configuration_path
        )
    with open(override_configuration_path / f"{TEST_SERIAL_NUMBER}.json") as f:
        new_file = json.load(f)
    assert TMPFILE_DATA == new_file


@pytest.mark.parametrize(
    argnames=["pipette_model", "serial_number"],
    argvalues=[
        [
            pip_conversions.convert_pipette_model(
                cast(types.PipetteModel, "p1000_96_v3.3")
            ),
            "P1KHV3320230629",
        ],
        [
            pip_conversions.convert_pipette_model(
                cast(types.PipetteModel, "p50_multi_v1.5")
            ),
            TEST_SERIAL_NUMBER,
        ],
    ],
)
def test_load_with_overrides(
    overrides_fixture: types.MutableConfig,
    pipette_model: pipette_definition.PipetteModelVersionType,
    serial_number: str,
    override_configuration_path: Path,
) -> None:
    """Test that you can load configurations both with pre-existing overrides and non-pre-existing overrides."""
    updated_configurations = mutable_configurations.load_with_mutable_configurations(
        pipette_model, override_configuration_path, serial_number
    )

    loaded_base_configurations = load_data.load_definition(
        pipette_model.pipette_type,
        pipette_model.pipette_channels,
        pipette_model.pipette_version,
        pipette_model.oem_type,
    )

    if serial_number == TEST_SERIAL_NUMBER:
        dict_loaded_configs = loaded_base_configurations.model_dump(by_alias=True)
        for map_key in dict_loaded_configs["pickUpTipConfigurations"]["pressFit"][
            "configurationsByNozzleMap"
        ]:
            for tip_key in dict_loaded_configs["pickUpTipConfigurations"]["pressFit"][
                "configurationsByNozzleMap"
            ][map_key]:
                dict_loaded_configs["pickUpTipConfigurations"]["pressFit"][
                    "configurationsByNozzleMap"
                ][map_key][tip_key]["speed"] = 5.0

        updated_configurations_dict = updated_configurations.model_dump(by_alias=True)
        assert set(dict_loaded_configs.pop("quirks")) == set(
            updated_configurations_dict.pop("quirks")
        )
        assert updated_configurations_dict == dict_loaded_configs
    else:
        assert updated_configurations == loaded_base_configurations


def test_build_mutable_config_using_old_units() -> None:
    """Test that MutableConfigs can build with old units."""
    old_units_config = {
        "value": 5,
        "default": 5.0,
        "units": "mm/s",
        "type": "float",
        "min": 0.01,
        "max": 30,
    }
    assert (
        types.MutableConfig.build(**old_units_config, name="dropTipSpeed") is not None  # type: ignore
    )


@pytest.mark.parametrize(
    ("filename", "type", "channels", "version", "file_contents"),
    # From https://opentrons.atlassian.net/browse/RQA-3676.
    # These could probably be pared down.
    [
        (
            "P20MV202020121412.json",
            types.PipetteModelType.p20,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p20_multi_v2.0"}',
        ),
        (
            "P3HSV1318071638.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(1, 3),
            '{"dropTipShake": true, "model": "p300_single_v1.3", "quirks": {"dropTipShake": true}, "top": {"value": 30.0, "default": 19.5, "units": "mm", "type": "float", "min": -20, "max": 30}, "pickUpPresses": {"value": 3.0, "default": 3, "units": "presses", "type": "int", "min": 0, "max": 15}}',
        ),
        (
            "P3HMV212021040004.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 1),
            '{"needsUnstick": true, "model": "p300_multi_v2.1"}',
        ),
        (
            "P20SV202020032604.json",
            types.PipetteModelType.p20,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p20_single_v2.0"}',
        ),
        (
            "P1KSV202019072441.json",
            types.PipetteModelType.p1000,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"pickupTipShake": true, "model": "p1000_single_v2.0", "quirks": {"pickupTipShake": true}}',
        ),
        (
            "P3HMV202021011105.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"needsUnstick": true, "model": "p300_multi_v2.0"}',
        ),
        (
            "P20SV202019072527.json",
            types.PipetteModelType.p20,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p20_single_v2.0"}',
        ),
        (
            "P3HSV202021042602.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p300_single_v2.0"}',
        ),
        (
            "P20SV222021030914.json",
            types.PipetteModelType.p20,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 2),
            '{"model": "p20_single_v2.2", "quirks": {}, "pickUpPresses": {"value": 3.0, "default": 1, "units": "presses", "type": "int", "min": 0, "max": 15}}',
        ),
        (
            "P3HMV202020040801.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"needsUnstick": true, "model": "p300_multi_v2.0", "quirks": {"needsUnstick": true}, "top": {"value": 20.0, "default": 19.5, "units": "mm", "type": "float", "min": -20, "max": 30}, "bottom": {"value": -14.0, "default": -14.5, "units": "mm", "type": "float", "min": -20, "max": 30}, "blowout": {"value": -18.5, "default": -19.0, "units": "mm", "type": "float", "min": -20, "max": 30}, "dropTip": {"value": -20.0, "default": -33.4, "units": "mm", "type": "float", "min": -20, "max": 30}, "pickUpCurrent": {"value": 0.9, "default": 0.8, "units": "amps", "type": "float", "min": 0.1, "max": 2.0}, "pickUpDistance": {"value": 10.0, "default": 11.0, "units": "mm", "type": "float", "min": 0, "max": 10}, "pickUpIncrement": {"value": 0.1, "default": 0.0, "units": "mm", "type": "int", "min": 0, "max": 10}, "pickUpPresses": {"value": 4.0, "default": 1, "units": "presses", "type": "int", "min": 0, "max": 15}, "pickUpSpeed": {"value": 11.0, "default": 10.0, "units": "mm/s", "type": "float", "min": 0.01, "max": 30}, "plungerCurrent": {"value": 1.1, "default": 1.0, "units": "amps", "type": "float", "min": 0.1, "max": 2.0}, "dropTipCurrent": {"value": 1.22, "default": 1.25, "units": "amps", "type": "float", "min": 0.1, "max": 2.0}, "dropTipSpeed": {"value": 8.0, "default": 7.5, "units": "mm/s", "type": "float", "min": 0.01, "max": 30}, "tipLength": {"value": 52.0, "default": 51.0, "units": "mm", "type": "float", "min": 0, "max": 100}}',
        ),
        (
            "P3HMV212021040002.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 1),
            '{"needsUnstick": true, "model": "p300_multi_v2.1"}',
        ),
        (
            "P3HMV1318072625.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(1, 3),
            '{"dropTipShake": true, "model": "p300_multi_v1.3", "quirks": {"dropTipShake": true}, "pickUpPresses": {"value": 4.0, "default": 3, "units": "presses", "type": "int", "min": 0, "max": 15}}',
        ),
        (
            "P50MV1519091757.json",
            types.PipetteModelType.p50,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(1, 5),
            '{"dropTipShake": true, "doubleDropTip": true, "model": "p50_multi_v1.5", "quirks": {"doubleDropTip": true, "dropTipShake": true}}',
        ),
        (
            "P3HSV202019072224.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p300_single_v2.0", "quirks": {}}',
        ),
        (
            "P20MV202019112708.json",
            types.PipetteModelType.p20,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"model": "p20_multi_v2.0", "quirks": {}}',
        ),
        (
            "P3HSV202021031503.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 1),
            '{"model": "p300_single_v2.1"}',
        ),
        (
            "P1KSV202020060206.json",
            types.PipetteModelType.p1000,
            types.PipetteChannelType.SINGLE_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"pickupTipShake": true, "model": "p1000_single_v2.0"}',
        ),
        (
            "P3HMV202021010906.json",
            types.PipetteModelType.p300,
            types.PipetteChannelType.EIGHT_CHANNEL,
            types.PipetteVersionType(2, 0),
            '{"needsUnstick": true, "model": "p300_multi_v2.0"}',
        ),
    ],
)
def test_loading_does_not_log_warnings(
    filename: str,
    type: types.PipetteModelType,
    channels: types.PipetteChannelType,
    version: types.PipetteVersionType,
    file_contents: str,
    caplog: pytest.LogCaptureFixture,
    override_configuration_path: Path,
) -> None:
    """Make sure load_with_mutable_configurations() doesn't log any exceptions.

    load_with_mutable_configurations() suppresses and logs internal exceptions to
    protect its caller, but those are still bugs, and we still want tests to catch them.
    """
    model = pipette_definition.PipetteModelVersionType(
        type, channels, version, types.PipetteOEMType.OT
    )
    (override_configuration_path / filename).write_text(file_contents)
    with caplog.at_level(logging.WARNING):
        mutable_configurations.load_with_mutable_configurations(
            model, override_configuration_path, Path(filename).stem
        )
    assert len(caplog.records) == 0
