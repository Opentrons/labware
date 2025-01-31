import pytest
from mock import patch
from typing import Union, Callable
from pathlib import Path
from opentrons_shared_data.errors.exceptions import InvalidLiquidClassName
from opentrons.calibration_storage import types as cal_types
from opentrons.types import Point, Mount
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from opentrons.hardware_control.instruments.ot2 import (
    pipette as ot2_pipette,
    instrument_calibration,
)
from opentrons.hardware_control.instruments.ot3 import (
    pipette as ot3_pipette,
    instrument_calibration as ot3_calibration,
)
from opentrons.hardware_control import types
from opentrons_shared_data.pipette import (
    pipette_definition,
    pipette_load_name_conversions as pipette_load_name,
    load_data as load_pipette_data,
    mutable_configurations,
    types as pip_types,
)

from opentrons_shared_data.pipette.types import PipetteModel

OT2_PIP_CAL = instrument_calibration.PipetteOffsetByPipetteMount(
    offset=Point(0, 0, 0),
    source=cal_types.SourceType.user,
    status=cal_types.CalibrationStatus(),
)

OT3_PIP_CAL = ot3_calibration.PipetteOffsetByPipetteMount(
    offset=Point(0, 0, 0),
    source=cal_types.SourceType.user,
    status=cal_types.CalibrationStatus(),
)


@pytest.fixture
def hardware_pipette_ot2() -> Callable[
    [PipetteModel, instrument_calibration.PipetteOffsetByPipetteMount, str],
    ot2_pipette.Pipette,
]:
    def _create_pipette(
        model: PipetteModel,
        calibration: instrument_calibration.PipetteOffsetByPipetteMount = OT2_PIP_CAL,
        id: str = "testID",
    ) -> ot2_pipette.Pipette:
        pipette_model = pipette_load_name.convert_pipette_model(model)
        configurations = mutable_configurations.load_with_mutable_configurations(
            pipette_model, Path("fake/path"), "testiId"
        )
        return ot2_pipette.Pipette(configurations, calibration, id)

    return _create_pipette


@pytest.fixture
def hardware_pipette_ot3() -> Callable[
    [
        pipette_definition.PipetteModelVersionType,
        ot3_calibration.PipetteOffsetByPipetteMount,
        str,
    ],
    ot3_pipette.Pipette,
]:
    def _create_pipette(
        model: pipette_definition.PipetteModelVersionType,
        calibration: ot3_calibration.PipetteOffsetByPipetteMount = OT3_PIP_CAL,
        id: str = "testID",
    ) -> ot3_pipette.Pipette:
        return ot3_pipette.Pipette(
            load_pipette_data.load_definition(
                model.pipette_type,
                model.pipette_channels,
                model.pipette_version,
                model.oem_type,
            ),
            calibration,
            id,
        )

    return _create_pipette


@pytest.mark.parametrize(
    argnames=["pipette_builder", "model"],
    argvalues=[
        [lazy_fixture("hardware_pipette_ot2"), "p10_single_v1"],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0")),
        ],
    ],
)
def test_tip_tracking(
    pipette_builder: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
) -> None:
    hw_pipette = pipette_builder(model)
    hw_pipette.remove_tip()
    assert not hw_pipette.has_tip
    tip_length = 25.0
    hw_pipette.add_tip(tip_length)
    assert hw_pipette.has_tip
    with pytest.raises(AssertionError):
        hw_pipette.add_tip(tip_length)
    hw_pipette.remove_tip()
    assert not hw_pipette.has_tip
    hw_pipette.remove_tip()


@pytest.mark.parametrize(
    argnames=["pipette_builder", "model", "nozzle_offset"],
    argvalues=[
        [lazy_fixture("hardware_pipette_ot2"), "p10_single_v1", Point(0, 0, 12.0)],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v3.3")),
            Point(-8.0, -22.0, -259.15),
        ],
    ],
)
def test_tip_nozzle_position_tracking(
    pipette_builder: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
    nozzle_offset: Point,
) -> None:
    hw_pipette = pipette_builder(model)
    # default pipette offset is[0, 0, 0], only nozzle offset would be used
    # to determine critical point
    assert hw_pipette.critical_point() == nozzle_offset
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == nozzle_offset
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == nozzle_offset
    tip_length = 25.0
    hw_pipette.add_tip(tip_length)
    new = nozzle_offset._replace(z=nozzle_offset.z - tip_length)
    assert hw_pipette.critical_point() == new
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == nozzle_offset
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == new
    hw_pipette.remove_tip()
    assert hw_pipette.critical_point() == nozzle_offset
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == nozzle_offset
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == nozzle_offset


@pytest.mark.parametrize(
    argnames=["pipette_builder", "model", "calibration"],
    argvalues=[
        [
            lazy_fixture("hardware_pipette_ot2"),
            "p10_single_v1",
            instrument_calibration.PipetteOffsetByPipetteMount(
                offset=Point(10, 10, 10),
                source=cal_types.SourceType.user,
                status=cal_types.CalibrationStatus(),
            ),
        ],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0")),
            ot3_calibration.PipetteOffsetByPipetteMount(
                offset=Point(10, 10, 10),
                source=cal_types.SourceType.user,
                status=cal_types.CalibrationStatus(),
            ),
        ],
    ],
)
def test_critical_points_pipette_offset(
    pipette_builder: Callable[
        [
            Union[str, pipette_definition.PipetteModelVersionType],
            Union[
                instrument_calibration.PipetteOffsetByPipetteMount,
                ot3_calibration.PipetteOffsetByPipetteMount,
            ],
        ],
        ot3_pipette.Pipette,
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
    calibration: Union[
        instrument_calibration.PipetteOffsetByPipetteMount,
        ot3_calibration.PipetteOffsetByPipetteMount,
    ],
) -> None:
    hw_pipette = pipette_builder(model, calibration)
    # pipette offset + nozzle offset to determine critical point
    offsets = calibration.offset + hw_pipette.nozzle_offset
    assert hw_pipette.critical_point() == offsets
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == offsets
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == offsets
    tip_length = 25.0
    hw_pipette.add_tip(tip_length)
    new = offsets._replace(z=offsets.z - tip_length)
    assert hw_pipette.critical_point() == new
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == offsets
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == new
    hw_pipette.remove_tip()
    assert hw_pipette.critical_point() == offsets
    assert hw_pipette.critical_point(types.CriticalPoint.NOZZLE) == offsets
    assert hw_pipette.critical_point(types.CriticalPoint.TIP) == offsets


@pytest.mark.parametrize(
    argnames=["pipette_builder", "model", "max_volume"],
    argvalues=[
        [lazy_fixture("hardware_pipette_ot2"), "p10_single_v1", 10.0],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0")),
            1000.0,
        ],
    ],
)
def test_volume_tracking(
    pipette_builder: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
    max_volume: float,
) -> None:
    hw_pipette = pipette_builder(model)
    assert hw_pipette.current_volume == 0.0
    assert hw_pipette.available_volume == max_volume
    assert hw_pipette.ok_to_add_volume(max_volume - 0.1)
    hw_pipette.set_current_volume(0.1)
    with pytest.raises(AssertionError):
        hw_pipette.set_current_volume(max_volume + 0.1)
    with pytest.raises(AssertionError):
        hw_pipette.set_current_volume(-1)
    assert hw_pipette.current_volume == 0.1
    hw_pipette.remove_current_volume(0.1)
    with pytest.raises(AssertionError):
        hw_pipette.remove_current_volume(0.1)
    assert hw_pipette.current_volume == 0.0
    hw_pipette.set_current_volume(max_volume)
    assert not hw_pipette.ok_to_add_volume(0.1)
    with pytest.raises(AssertionError):
        hw_pipette.add_current_volume(0.1)
    assert hw_pipette.current_volume == max_volume


@pytest.mark.ot2_only
def test_config_update(
    hardware_pipette_ot2: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot2_pipette.Pipette
    ]
) -> None:
    hw_pipette = hardware_pipette_ot2("p10_single_v1")
    sample_plunger_pos = {"top": 19.5}
    hw_pipette.update_config_item(sample_plunger_pos)
    assert hw_pipette.plunger_positions.top == sample_plunger_pos.get("top")


@pytest.mark.ot2_only
def test_flow_rate_setting(
    hardware_pipette_ot2: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot2_pipette.Pipette
    ],
) -> None:
    hw_pipette = hardware_pipette_ot2("p10_single_v1")
    # pipettes should load settings from config at init time
    assert hw_pipette.aspirate_flow_rate == hw_pipette.aspirate_flow_rates_lookup["2.0"]
    assert hw_pipette.dispense_flow_rate == hw_pipette.dispense_flow_rates_lookup["2.0"]
    assert hw_pipette.blow_out_flow_rate == hw_pipette.blow_out_flow_rates_lookup["2.0"]
    # changing flow rates with normal property access shouldn't touch
    # config or other flow rates
    hw_pipette.aspirate_flow_rate = 2
    assert hw_pipette.aspirate_flow_rate == 2
    assert hw_pipette.dispense_flow_rate == hw_pipette.dispense_flow_rates_lookup["2.0"]
    assert hw_pipette.blow_out_flow_rate == hw_pipette.blow_out_flow_rates_lookup["2.0"]
    hw_pipette.dispense_flow_rate = 3
    assert hw_pipette.aspirate_flow_rate == 2
    assert hw_pipette.dispense_flow_rate == 3
    assert hw_pipette.blow_out_flow_rate == hw_pipette.blow_out_flow_rates_lookup["2.0"]
    hw_pipette.blow_out_flow_rate = 4
    assert hw_pipette.aspirate_flow_rate == 2
    assert hw_pipette.dispense_flow_rate == 3
    assert hw_pipette.blow_out_flow_rate == 4


@pytest.mark.parametrize(
    argnames=[
        "pipette_builder",
        "model",
        "expected_xy_critical_point",
        "expected_front_critical_point",
    ],
    argvalues=[
        [
            lazy_fixture("hardware_pipette_ot2"),
            "p10_single_v1",
            Point(0, 0, 12.0),
            Point(0, 0, 12.0),
        ],
        [
            lazy_fixture("hardware_pipette_ot2"),
            "p300_multi_v2.0",
            Point(0.0, 0.0, 35.52),
            Point(0.0, -31.5, 35.52),
        ],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v3.3")),
            Point(-8.0, -22.0, -259.15),
            Point(-8.0, -22.0, -259.15),
        ],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_multi_v3.3")),
            Point(-8.0, -47.5, -259.15),
            Point(-8.0, -79.0, -259.15),
        ],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(
                PipetteModel("p1000_96"), PipetteModel("3.3")
            ),
            Point(13.5, -57.0, -259.15),
            Point(-36.0, -88.5, -259.15),
        ],
    ],
)
def test_alternative_critical_points(
    pipette_builder: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
    expected_xy_critical_point: Point,
    expected_front_critical_point: Point,
) -> None:
    hw_pipette = pipette_builder(model)
    assert (
        hw_pipette.critical_point(types.CriticalPoint.XY_CENTER)
        == expected_xy_critical_point
    )
    assert (
        hw_pipette.critical_point(types.CriticalPoint.FRONT_NOZZLE)
        == expected_front_critical_point
    )


@pytest.mark.parametrize(
    argnames=["pipette_builder", "model", "calibration"],
    argvalues=[
        [
            lazy_fixture("hardware_pipette_ot2"),
            "p10_single_v1",
            instrument_calibration.PipetteOffsetByPipetteMount(
                offset=Point(1, 1, 1),
                source=cal_types.SourceType.user,
                status=cal_types.CalibrationStatus(),
            ),
        ],
        [
            lazy_fixture("hardware_pipette_ot3"),
            pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0")),
            ot3_calibration.PipetteOffsetByPipetteMount(
                offset=Point(1, 1, 1),
                source=cal_types.SourceType.user,
                status=cal_types.CalibrationStatus(),
            ),
        ],
    ],
)
def test_reset_instrument_offset(
    pipette_builder: Callable[
        [
            Union[str, pipette_definition.PipetteModelVersionType],
            Union[
                instrument_calibration.PipetteOffsetByPipetteMount,
                ot3_calibration.PipetteOffsetByPipetteMount,
            ],
        ],
        ot3_pipette.Pipette,
    ],
    model: Union[str, pipette_definition.PipetteModelVersionType],
    calibration: Union[
        instrument_calibration.PipetteOffsetByPipetteMount,
        ot3_calibration.PipetteOffsetByPipetteMount,
    ],
) -> None:
    hw_pipette = pipette_builder(model, calibration)
    assert hw_pipette.pipette_offset.offset == Point(1, 1, 1)
    hw_pipette.reset_pipette_offset(types.OT3Mount.LEFT, to_default=True)
    assert hw_pipette.pipette_offset.offset == Point(0, 0, 0)


def test_save_instrument_offset_ot2(
    hardware_pipette_ot2: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot2_pipette.Pipette
    ]
) -> None:
    # TODO (lc 10-31-2022) These tests would be much cleaner/easier to mock with
    # an InstrumentCalibrationProvider class (like robot calibration provider)
    # which should be done in a follow-up refactor.
    path_to_calibrations = "opentrons.hardware_control.instruments.ot2.pipette"
    hw_pipette = hardware_pipette_ot2("p10_single_v1")

    assert hw_pipette.pipette_offset.offset == Point(0, 0, 0)
    with patch(f"{path_to_calibrations}.load_pipette_offset") as load_cal:
        hw_pipette.save_pipette_offset(Mount.LEFT, Point(1.0, 2.0, 3.0))
        load_cal.assert_called_once_with("testID", Mount.LEFT)


def test_save_instrument_offset_ot3(
    hardware_pipette_ot3: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ]
) -> None:
    # TODO (lc 10-31-2022) These tests would be much cleaner/easier to mock with
    # an InstrumentCalibrationProvider class (like robot calibration provider)
    # which should be done in a follow-up refactor.
    path_to_calibrations = "opentrons.hardware_control.instruments.ot3.pipette"
    hw_pipette = hardware_pipette_ot3(
        pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0"))
    )

    assert hw_pipette.pipette_offset.offset == Point(0, 0, 0)
    with patch(
        f"{path_to_calibrations}.save_pipette_offset_calibration"
    ) as save_cal, patch(f"{path_to_calibrations}.load_pipette_offset") as load_cal:
        hw_pipette.save_pipette_offset(types.OT3Mount.LEFT, Point(1.0, 2.0, 3.0))

        save_cal.assert_called_once_with(
            "testID", types.OT3Mount.LEFT, Point(x=1.0, y=2.0, z=3.0)
        )
        load_cal.assert_called_once_with("testID", types.OT3Mount.LEFT)


def test_reload_instrument_cal_ot3(
    hardware_pipette_ot3: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ],
) -> None:
    old_pip = hardware_pipette_ot3(
        pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v1.0"))
    )
    # if only calibration is changed
    new_cal = ot3_calibration.PipetteOffsetByPipetteMount(
        offset=Point(3, 4, 5),
        source=cal_types.SourceType.user,
        status=cal_types.CalibrationStatus(),
    )
    new_pip, skipped = ot3_pipette._reload_and_check_skip(
        old_pip.config, old_pip, new_cal, use_old_aspiration_functions=False
    )

    assert skipped
    # it's the same pipette
    assert new_pip == old_pip


def test_tip_type_changing(
    hardware_pipette_ot3: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ]
) -> None:
    pip = hardware_pipette_ot3(
        pipette_load_name.convert_pipette_model(PipetteModel("p1000_single_v3.3"))
    )
    # at load, we have the max tip settings
    assert pip.working_volume == 1000
    # setting to the same thing works
    pip.set_tip_type_by_volume(1000)
    assert pip.working_volume == 1000
    # setting to other tip types works
    pip.set_tip_type_by_volume(200)
    assert pip.working_volume == 200

    # specifying a tip that doesn't exist raises an error
    with pytest.raises(InvalidLiquidClassName):
        pip.set_tip_type_by_volume(201)


def test_liquid_class_changing(
    hardware_pipette_ot3: Callable[
        [Union[str, pipette_definition.PipetteModelVersionType]], ot3_pipette.Pipette
    ]
) -> None:
    pip = hardware_pipette_ot3(
        pipette_load_name.convert_pipette_model(PipetteModel("p50_multi_v3.3"))
    )
    assert pip._liquid_class_name == pip_types.LiquidClasses.default
    pip.set_liquid_class_by_name("lowVolumeDefault")
    assert (
        pip._liquid_class_name.value == pip_types.LiquidClasses.lowVolumeDefault.value
    )
    with pytest.raises(InvalidLiquidClassName):
        pip.set_liquid_class_by_name("asdase")
