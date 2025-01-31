"""Tests for pipette state accessors in the protocol_engine state store.

DEPRECATED: Testing PipetteView independently of PipetteStore is no longer helpful.
Try to add new tests to test_pipette_state.py, where they can be tested together,
treating PipetteState as a private implementation detail.
"""

from collections import OrderedDict
from typing import cast, Dict, List, Optional, Tuple, NamedTuple

import pytest
from decoy import Decoy


from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.pipette import pipette_definition
from opentrons_shared_data.pipette.pipette_definition import (
    ValidNozzleMaps,
    AvailableSensorDefinition,
)

from opentrons.config.defaults_ot2 import Z_RETRACT_DISTANCE
from opentrons.hardware_control import CriticalPoint
from opentrons.types import MountType, Mount as HwMount, Point, NozzleConfigurationType
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    LoadedPipette,
    MotorAxis,
    FlowRates,
    DeckPoint,
    CurrentPipetteLocation,
    TipGeometry,
)
from opentrons.protocol_engine.state.pipettes import (
    PipetteState,
    PipetteView,
    CurrentDeckPoint,
    HardwarePipette,
    StaticPipetteConfig,
    BoundingNozzlesOffsets,
    PipetteBoundingBoxOffsets,
)
from opentrons.protocol_engine.state import fluid_stack
from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons.protocol_engine.errors import TipNotAttachedError, PipetteNotLoadedError

from ..pipette_fixtures import (
    NINETY_SIX_ROWS,
    NINETY_SIX_COLS,
    NINETY_SIX_MAP,
    EIGHT_CHANNEL_ROWS,
    EIGHT_CHANNEL_COLS,
    EIGHT_CHANNEL_MAP,
    get_default_nozzle_map,
)

_SAMPLE_NOZZLE_BOUNDS_OFFSETS = BoundingNozzlesOffsets(
    back_left_offset=Point(x=10, y=20, z=30), front_right_offset=Point(x=40, y=50, z=60)
)
_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS = PipetteBoundingBoxOffsets(
    back_left_corner=Point(x=10, y=20, z=30),
    front_right_corner=Point(x=40, y=50, z=60),
    front_left_corner=Point(x=10, y=50, z=60),
    back_right_corner=Point(x=40, y=20, z=60),
)


@pytest.fixture
def available_sensors() -> AvailableSensorDefinition:
    """Provide a list of sensors."""
    return AvailableSensorDefinition(sensors=["pressure", "capacitive", "environment"])


def get_pipette_view(
    pipettes_by_id: Optional[Dict[str, LoadedPipette]] = None,
    current_well: Optional[CurrentPipetteLocation] = None,
    current_deck_point: CurrentDeckPoint = CurrentDeckPoint(
        mount=None, deck_point=None
    ),
    attached_tip_by_id: Optional[Dict[str, Optional[TipGeometry]]] = None,
    movement_speed_by_id: Optional[Dict[str, Optional[float]]] = None,
    static_config_by_id: Optional[Dict[str, StaticPipetteConfig]] = None,
    flow_rates_by_id: Optional[Dict[str, FlowRates]] = None,
    nozzle_layout_by_id: Optional[Dict[str, NozzleMap]] = None,
    liquid_presence_detection_by_id: Optional[Dict[str, bool]] = None,
    pipette_contents_by_id: Optional[
        Dict[str, Optional[fluid_stack.FluidStack]]
    ] = None,
) -> PipetteView:
    """Get a pipette view test subject with the specified state."""
    state = PipetteState(
        pipettes_by_id=pipettes_by_id or {},
        pipette_contents_by_id=pipette_contents_by_id or {},
        current_location=current_well,
        current_deck_point=current_deck_point,
        attached_tip_by_id=attached_tip_by_id or {},
        movement_speed_by_id=movement_speed_by_id or {},
        static_config_by_id=static_config_by_id or {},
        flow_rates_by_id=flow_rates_by_id or {},
        nozzle_configuration_by_id=nozzle_layout_by_id or {},
        liquid_presence_detection_by_id=liquid_presence_detection_by_id or {},
    )

    return PipetteView(state=state)


def create_pipette_config(
    name: str,
    back_compat_names: Optional[List[str]] = None,
    ready_to_aspirate: bool = False,
) -> PipetteDict:
    """Create a fake but valid (enough) PipetteDict object."""
    return cast(
        PipetteDict,
        {
            "name": name,
            "back_compat_names": back_compat_names or [],
            "ready_to_aspirate": ready_to_aspirate,
        },
    )


def test_initial_pipette_data_by_id() -> None:
    """It should should raise if pipette ID doesn't exist."""
    subject = get_pipette_view()

    with pytest.raises(errors.PipetteNotLoadedError):
        subject.get("asdfghjkl")


def test_initial_pipette_data_by_mount() -> None:
    """It should return None if mount isn't present."""
    subject = get_pipette_view()

    assert subject.get_by_mount(MountType.LEFT) is None
    assert subject.get_by_mount(MountType.RIGHT) is None


def test_get_pipette_data() -> None:
    """It should get pipette data by ID and mount from the state."""
    pipette_data = LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )

    subject = get_pipette_view(pipettes_by_id={"pipette-id": pipette_data})

    result_by_id = subject.get("pipette-id")
    result_by_mount = subject.get_by_mount(MountType.LEFT)

    assert result_by_id == pipette_data
    assert result_by_mount == pipette_data
    assert subject.get_mount("pipette-id") == MountType.LEFT


def test_get_hardware_pipette() -> None:
    """It maps a pipette ID to a config given the HC's attached pipettes."""
    pipette_config = create_pipette_config("p300_single")
    attached_pipettes: Dict[HwMount, PipetteDict] = {
        HwMount.LEFT: pipette_config,
        HwMount.RIGHT: cast(PipetteDict, {}),
    }

    subject = get_pipette_view(
        pipettes_by_id={
            "left-id": LoadedPipette(
                id="left-id",
                mount=MountType.LEFT,
                pipetteName=PipetteNameType.P300_SINGLE,
            ),
            "right-id": LoadedPipette(
                id="right-id",
                mount=MountType.RIGHT,
                pipetteName=PipetteNameType.P300_MULTI,
            ),
        }
    )

    result = subject.get_hardware_pipette(
        pipette_id="left-id",
        attached_pipettes=attached_pipettes,
    )

    assert result == HardwarePipette(mount=HwMount.LEFT, config=pipette_config)

    with pytest.raises(errors.PipetteNotAttachedError):
        subject.get_hardware_pipette(
            pipette_id="right-id",
            attached_pipettes=attached_pipettes,
        )


def test_get_hardware_pipette_with_back_compat() -> None:
    """It maps a pipette ID to a config given the HC's attached pipettes.

    In this test, the hardware config specs "p300_single_gen2", and the
    loaded pipette name in state is "p300_single," which is is allowed.
    """
    pipette_config = create_pipette_config(
        "p300_single_gen2",
        back_compat_names=["p300_single"],
    )
    attached_pipettes: Dict[HwMount, PipetteDict] = {
        HwMount.LEFT: pipette_config,
        HwMount.RIGHT: cast(PipetteDict, {}),
    }

    subject = get_pipette_view(
        pipettes_by_id={
            "pipette-id": LoadedPipette(
                id="pipette-id",
                mount=MountType.LEFT,
                pipetteName=PipetteNameType.P300_SINGLE,
            ),
        }
    )

    result = subject.get_hardware_pipette(
        pipette_id="pipette-id",
        attached_pipettes=attached_pipettes,
    )

    assert result == HardwarePipette(mount=HwMount.LEFT, config=pipette_config)


def test_get_hardware_pipette_raises_with_name_mismatch() -> None:
    """It maps a pipette ID to a config given the HC's attached pipettes.

    In this test, the hardware config specs "p300_single_gen2", but the
    loaded pipette name in state is "p10_single," which does not match.
    """
    pipette_config = create_pipette_config("p300_single_gen2")
    attached_pipettes: Dict[HwMount, Optional[PipetteDict]] = {
        HwMount.LEFT: pipette_config,
        HwMount.RIGHT: cast(PipetteDict, {}),
    }

    subject = get_pipette_view(
        pipettes_by_id={
            "pipette-id": LoadedPipette(
                id="pipette-id",
                mount=MountType.LEFT,
                pipetteName=PipetteNameType.P10_SINGLE,
            ),
        }
    )

    with pytest.raises(errors.PipetteNotAttachedError):
        subject.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes=attached_pipettes,
        )


def test_get_aspirated_volume(decoy: Decoy) -> None:
    """It should get the aspirate volume for a pipette."""
    stack = decoy.mock(cls=fluid_stack.FluidStack)
    subject = get_pipette_view(
        pipette_contents_by_id={
            "pipette-id": stack,
            "pipette-id-none": None,
            "pipette-id-no-tip": None,
        },
        attached_tip_by_id={
            "pipette-id": TipGeometry(length=1, volume=2, diameter=3),
            "pipette-id-none": TipGeometry(length=4, volume=5, diameter=6),
            "pipette-id-no-tip": None,
        },
    )
    decoy.when(stack.aspirated_volume()).then_return(42)

    assert subject.get_aspirated_volume("pipette-id") == 42
    assert subject.get_aspirated_volume("pipette-id-none") is None

    with pytest.raises(errors.PipetteNotLoadedError):
        subject.get_aspirated_volume("not-an-id")

    with pytest.raises(errors.TipNotAttachedError):
        subject.get_aspirated_volume("pipette-id-no-tip")


def test_get_pipette_working_volume(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should get the minimum value of tip volume and max volume."""
    subject = get_pipette_view(
        attached_tip_by_id={
            "pipette-id": TipGeometry(length=1, volume=1337, diameter=42.0),
        },
        static_config_by_id={
            "pipette-id": StaticPipetteConfig(
                min_volume=1,
                max_volume=9001,
                channels=5,
                model="blah",
                display_name="bleh",
                serial_number="",
                tip_configuration_lookup_table={9001: supported_tip_fixture},
                nominal_tip_overlap={},
                home_position=0,
                nozzle_offset_z=0,
                bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
                default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
                pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
                lld_settings={},
                plunger_positions={
                    "top": 0.0,
                    "bottom": 5.0,
                    "blow_out": 19.0,
                    "drop_tip": 20.0,
                },
                shaft_ul_per_mm=5.0,
                available_sensors=available_sensors,
            )
        },
    )

    assert subject.get_working_volume("pipette-id") == 1337


def test_get_pipette_working_volume_raises_if_tip_volume_is_none(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Should raise an exception that no tip is attached."""
    subject = get_pipette_view(
        attached_tip_by_id={
            "pipette-id": None,
        },
        static_config_by_id={
            "pipette-id": StaticPipetteConfig(
                min_volume=1,
                max_volume=9001,
                channels=5,
                model="blah",
                display_name="bleh",
                serial_number="",
                tip_configuration_lookup_table={9001: supported_tip_fixture},
                nominal_tip_overlap={},
                home_position=0,
                nozzle_offset_z=0,
                bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
                default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
                pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
                lld_settings={},
                plunger_positions={
                    "top": 0.0,
                    "bottom": 5.0,
                    "blow_out": 19.0,
                    "drop_tip": 20.0,
                },
                shaft_ul_per_mm=5.0,
                available_sensors=available_sensors,
            )
        },
    )

    with pytest.raises(TipNotAttachedError):
        subject.get_working_volume("pipette-id")

    with pytest.raises(PipetteNotLoadedError):
        subject.get_working_volume("wrong-id")


def test_get_pipette_available_volume(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    decoy: Decoy,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should get the available volume for a pipette."""
    stack = decoy.mock(cls=fluid_stack.FluidStack)
    decoy.when(stack.aspirated_volume()).then_return(58)
    subject = get_pipette_view(
        attached_tip_by_id={
            "pipette-id": TipGeometry(
                length=1,
                diameter=2,
                volume=100,
            ),
        },
        pipette_contents_by_id={"pipette-id": stack},
        static_config_by_id={
            "pipette-id": StaticPipetteConfig(
                min_volume=1,
                max_volume=123,
                channels=3,
                model="blah",
                display_name="bleh",
                serial_number="",
                tip_configuration_lookup_table={123: supported_tip_fixture},
                nominal_tip_overlap={},
                home_position=0,
                nozzle_offset_z=0,
                bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
                default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
                pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
                lld_settings={},
                plunger_positions={
                    "top": 0.0,
                    "bottom": 5.0,
                    "blow_out": 19.0,
                    "drop_tip": 20.0,
                },
                shaft_ul_per_mm=5.0,
                available_sensors=available_sensors,
            ),
            "pipette-id-none": StaticPipetteConfig(
                min_volume=1,
                max_volume=123,
                channels=5,
                model="blah",
                display_name="bleh",
                serial_number="",
                tip_configuration_lookup_table={123: supported_tip_fixture},
                nominal_tip_overlap={},
                home_position=0,
                nozzle_offset_z=0,
                bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
                default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
                pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
                lld_settings={},
                plunger_positions={
                    "top": 0.0,
                    "bottom": 5.0,
                    "blow_out": 19.0,
                    "drop_tip": 20.0,
                },
                shaft_ul_per_mm=5.0,
                available_sensors=available_sensors,
            ),
        },
    )

    assert subject.get_available_volume("pipette-id") == 42


def test_get_attached_tip() -> None:
    """It should get the tip-rack ID map of a pipette's attached tip."""
    subject = get_pipette_view(
        attached_tip_by_id={
            "foo": TipGeometry(length=1, volume=2, diameter=3),
            "bar": None,
        }
    )

    assert subject.get_attached_tip("foo") == TipGeometry(
        length=1, volume=2, diameter=3
    )
    assert subject.get_attached_tip("bar") is None
    assert subject.get_all_attached_tips() == [
        ("foo", TipGeometry(length=1, volume=2, diameter=3)),
    ]


def test_validate_tip_state() -> None:
    """It should validate a pipette's tip attached state."""
    subject = get_pipette_view(
        attached_tip_by_id={
            "has-tip": TipGeometry(length=1, volume=2, diameter=3),
            "no-tip": None,
        }
    )

    subject.validate_tip_state(pipette_id="has-tip", expected_has_tip=True)
    subject.validate_tip_state(pipette_id="no-tip", expected_has_tip=False)

    with pytest.raises(errors.TipAttachedError):
        subject.validate_tip_state(pipette_id="has-tip", expected_has_tip=False)

    with pytest.raises(errors.TipNotAttachedError):
        subject.validate_tip_state(pipette_id="no-tip", expected_has_tip=True)


def test_get_movement_speed() -> None:
    """It should return the movement speed that was set for the given pipette."""
    subject = get_pipette_view(
        movement_speed_by_id={
            "pipette-with-movement-speed": 123.456,
            "pipette-without-movement-speed": None,
        }
    )

    assert (
        subject.get_movement_speed(pipette_id="pipette-with-movement-speed") == 123.456
    )
    assert (
        subject.get_movement_speed(pipette_id="pipette-without-movement-speed") is None
    )


@pytest.mark.parametrize(
    ("mount", "deck_point", "expected_deck_point"),
    [
        (MountType.LEFT, DeckPoint(x=1, y=2, z=3), DeckPoint(x=1, y=2, z=3)),
        (MountType.LEFT, None, None),
        (MountType.RIGHT, DeckPoint(x=1, y=2, z=3), None),
        (None, DeckPoint(x=1, y=2, z=3), None),
        (None, None, None),
    ],
)
def test_get_deck_point(
    mount: Optional[MountType],
    deck_point: Optional[DeckPoint],
    expected_deck_point: Optional[DeckPoint],
) -> None:
    """It should return the deck point for the given pipette."""
    pipette_data = LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )

    subject = get_pipette_view(
        pipettes_by_id={"pipette-id": pipette_data},
        current_deck_point=CurrentDeckPoint(
            mount=MountType.LEFT, deck_point=DeckPoint(x=1, y=2, z=3)
        ),
    )

    assert subject.get_deck_point(pipette_id="pipette-id") == DeckPoint(x=1, y=2, z=3)


def test_get_static_config(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the static pipette configuration that was set for the given pipette."""
    config = StaticPipetteConfig(
        model="pipette-model",
        display_name="display name",
        serial_number="serial-number",
        min_volume=1.23,
        max_volume=4.56,
        channels=9,
        tip_configuration_lookup_table={4.56: supported_tip_fixture},
        nominal_tip_overlap={},
        home_position=10.12,
        nozzle_offset_z=12.13,
        bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
        default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
        pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
        lld_settings={},
        plunger_positions={
            "top": 0.0,
            "bottom": 5.0,
            "blow_out": 19.0,
            "drop_tip": 20.0,
        },
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )

    subject = get_pipette_view(
        pipettes_by_id={
            "pipette-id": LoadedPipette(
                id="pipette-id",
                mount=MountType.LEFT,
                pipetteName=PipetteNameType.P300_SINGLE,
            )
        },
        attached_tip_by_id={
            "pipette-id": TipGeometry(length=1, volume=4.56, diameter=3),
        },
        static_config_by_id={"pipette-id": config},
    )

    assert subject.get_config("pipette-id") == config
    assert subject.get_model_name("pipette-id") == "pipette-model"
    assert subject.get_display_name("pipette-id") == "display name"
    assert subject.get_serial_number("pipette-id") == "serial-number"
    assert subject.get_minimum_volume("pipette-id") == 1.23
    assert subject.get_maximum_volume("pipette-id") == 4.56
    assert subject.get_return_tip_scale("pipette-id") == 0.5
    assert (
        subject.get_instrument_max_height_ot2("pipette-id")
        == 22.25 - Z_RETRACT_DISTANCE
    )


def test_get_nominal_tip_overlap(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the static pipette configuration that was set for the given pipette."""
    config = StaticPipetteConfig(
        model="",
        display_name="",
        serial_number="",
        min_volume=0,
        max_volume=0,
        channels=10,
        tip_configuration_lookup_table={0: supported_tip_fixture},
        nominal_tip_overlap={
            "some-uri": 100,
            "default": 10,
        },
        home_position=0,
        nozzle_offset_z=0,
        bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
        default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
        pipette_bounding_box_offsets=_SAMPLE_PIPETTE_BOUNDING_BOX_OFFSETS,
        lld_settings={},
        plunger_positions={
            "top": 0.0,
            "bottom": 5.0,
            "blow_out": 19.0,
            "drop_tip": 20.0,
        },
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )

    subject = get_pipette_view(static_config_by_id={"pipette-id": config})

    assert subject.get_nominal_tip_overlap("pipette-id", "some-uri") == 100
    assert subject.get_nominal_tip_overlap("pipette-id", "missing-uri") == 10


@pytest.mark.parametrize(
    ("mount", "expected_z_axis", "expected_plunger_axis"),
    [
        (MountType.LEFT, MotorAxis.LEFT_Z, MotorAxis.LEFT_PLUNGER),
        (MountType.RIGHT, MotorAxis.RIGHT_Z, MotorAxis.RIGHT_PLUNGER),
    ],
)
def test_get_motor_axes(
    mount: MountType, expected_z_axis: MotorAxis, expected_plunger_axis: MotorAxis
) -> None:
    """It should get a pipette's motor axes."""
    subject = get_pipette_view(
        pipettes_by_id={
            "pipette-id": LoadedPipette(
                id="pipette-id",
                mount=mount,
                pipetteName=PipetteNameType.P300_SINGLE,
            ),
        },
    )

    assert subject.get_z_axis("pipette-id") == expected_z_axis
    assert subject.get_plunger_axis("pipette-id") == expected_plunger_axis


def test_nozzle_configuration_getters() -> None:
    """Test that pipette view returns correct nozzle configuration data."""
    nozzle_map = NozzleMap.build(
        physical_nozzles=OrderedDict({"A1": Point(0, 0, 0)}),
        physical_rows=OrderedDict({"A": ["A1"]}),
        physical_columns=OrderedDict({"1": ["A1"]}),
        starting_nozzle="A1",
        back_left_nozzle="A1",
        front_right_nozzle="A1",
        valid_nozzle_maps=ValidNozzleMaps(maps={"A1": ["A1"]}),
    )
    subject = get_pipette_view(nozzle_layout_by_id={"pipette-id": nozzle_map})
    assert subject.get_nozzle_layout_type("pipette-id") == NozzleConfigurationType.FULL
    assert subject.get_is_partially_configured("pipette-id") is False
    assert subject.get_primary_nozzle("pipette-id") == "A1"


class _PipetteSpecs(NamedTuple):
    tip_length: float
    bounding_box_offsets: PipetteBoundingBoxOffsets
    nozzle_map: NozzleMap
    critical_point: Optional[CriticalPoint]
    destination_position: Point
    pipette_bounds_result: Tuple[Point, Point, Point, Point]


_pipette_spec_cases = [
    _PipetteSpecs(
        # 8-channel P300, full configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(0.0, 31.5, 35.52),
            front_right_corner=Point(0.0, -31.5, 35.52),
            front_left_corner=Point(0.0, -31.5, 35.52),
            back_right_corner=Point(0.0, 31.5, 35.52),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=EIGHT_CHANNEL_MAP,
            physical_rows=EIGHT_CHANNEL_ROWS,
            physical_columns=EIGHT_CHANNEL_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Full": EIGHT_CHANNEL_COLS["1"]}),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            (
                Point(x=100.0, y=200.0, z=342.0),
                Point(x=100.0, y=137.0, z=342.0),
                Point(x=100.0, y=200.0, z=342.0),
                Point(x=100.0, y=137.0, z=342.0),
            )
        ),
    ),
    _PipetteSpecs(
        # 8-channel P300, single configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(0.0, 31.5, 35.52),
            front_right_corner=Point(0.0, -31.5, 35.52),
            front_left_corner=Point(0.0, -31.5, 35.52),
            back_right_corner=Point(0.0, 31.5, 35.52),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=EIGHT_CHANNEL_MAP,
            physical_rows=EIGHT_CHANNEL_ROWS,
            physical_columns=EIGHT_CHANNEL_COLS,
            starting_nozzle="H1",
            back_left_nozzle="H1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(maps={"H1": ["H1"]}),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            (
                Point(x=100.0, y=263.0, z=342.0),
                Point(x=100.0, y=200.0, z=342.0),
                Point(x=100.0, y=263.0, z=342.0),
                Point(x=100.0, y=200.0, z=342.0),
            )
        ),
    ),
    _PipetteSpecs(
        # 8-channel P300, full configuration. Critical point of XY_CENTER
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(0.0, 31.5, 35.52),
            front_right_corner=Point(0.0, -31.5, 35.52),
            front_left_corner=Point(0.0, -31.5, 35.52),
            back_right_corner=Point(0.0, 31.5, 35.52),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=EIGHT_CHANNEL_MAP,
            physical_rows=EIGHT_CHANNEL_ROWS,
            physical_columns=EIGHT_CHANNEL_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Full": EIGHT_CHANNEL_COLS["1"]}),
        ),
        critical_point=CriticalPoint.XY_CENTER,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            (
                Point(x=100.0, y=231.5, z=342.0),
                Point(x=100.0, y=168.5, z=342.0),
                Point(x=100.0, y=231.5, z=342.0),
                Point(x=100.0, y=168.5, z=342.0),
            )
        ),
    ),
    _PipetteSpecs(
        # 8-channel P300, Partial A1-E1 configuration. Critical point of XY_CENTER
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(0.0, 31.5, 35.52),
            front_right_corner=Point(0.0, -31.5, 35.52),
            front_left_corner=Point(0.0, -31.5, 35.52),
            back_right_corner=Point(0.0, 31.5, 35.52),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=EIGHT_CHANNEL_MAP,
            physical_rows=EIGHT_CHANNEL_ROWS,
            physical_columns=EIGHT_CHANNEL_COLS,
            starting_nozzle="H1",
            back_left_nozzle="E1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(
                maps={
                    "H1toE1": ["E1", "F1", "G1", "H1"],
                }
            ),
        ),
        critical_point=CriticalPoint.XY_CENTER,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            (
                Point(x=100.0, y=249.5, z=342.0),
                Point(x=100.0, y=186.5, z=342.0),
                Point(x=100.0, y=249.5, z=342.0),
                Point(x=100.0, y=186.5, z=342.0),
            )
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, full configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="H12",
            valid_nozzle_maps=ValidNozzleMaps(
                maps={
                    "Full": sum(
                        [
                            NINETY_SIX_ROWS["A"],
                            NINETY_SIX_ROWS["B"],
                            NINETY_SIX_ROWS["C"],
                            NINETY_SIX_ROWS["D"],
                            NINETY_SIX_ROWS["E"],
                            NINETY_SIX_ROWS["F"],
                            NINETY_SIX_ROWS["G"],
                            NINETY_SIX_ROWS["H"],
                        ],
                        [],
                    )
                }
            ),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            (
                Point(x=100.0, y=200.0, z=342.0),
                Point(x=199.0, y=137.0, z=342.0),
                Point(x=199.0, y=200.0, z=342.0),
                Point(x=100.0, y=137.0, z=342.0),
            )
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, A1 COLUMN configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Column1": NINETY_SIX_COLS["1"]}),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(100, 200, 342),
            Point(199, 137, 342),
            Point(199, 200, 342),
            Point(100, 137, 342),
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, A12 COLUMN configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A12",
            back_left_nozzle="A12",
            front_right_nozzle="H12",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Column12": NINETY_SIX_COLS["12"]}),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(1, 200, 342),
            Point(100, 137, 342),
            Point(100, 200, 342),
            Point(1, 137, 342),
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, ROW configuration
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="A12",
            valid_nozzle_maps=ValidNozzleMaps(maps={"RowA": NINETY_SIX_ROWS["A"]}),
        ),
        critical_point=None,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(100, 200, 342),
            Point(199, 137, 342),
            Point(199, 200, 342),
            Point(100, 137, 342),
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, ROW configuration. Critical point of XY_CENTER
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="A12",
            valid_nozzle_maps=ValidNozzleMaps(maps={"RowA": NINETY_SIX_ROWS["A"]}),
        ),
        critical_point=CriticalPoint.XY_CENTER,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(x=50.5, y=200, z=342),
            Point(x=149.5, y=137, z=342),
            Point(x=149.5, y=200, z=342),
            Point(x=50.5, y=137, z=342),
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, A12 COLUMN configuration. Critical point of Y_CENTER
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A12",
            back_left_nozzle="A12",
            front_right_nozzle="H12",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Column12": NINETY_SIX_COLS["12"]}),
        ),
        critical_point=CriticalPoint.Y_CENTER,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(1, 231.5, 342),
            Point(100, 168.5, 342),
            Point(100, 231.5, 342),
            Point(1, 168.5, 342),
        ),
    ),
    _PipetteSpecs(
        # 96-channel P1000, A1 COLUMN configuration. Critical point of XY_CENTER
        tip_length=42,
        bounding_box_offsets=PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        ),
        nozzle_map=NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle="A1",
            back_left_nozzle="A1",
            front_right_nozzle="H1",
            valid_nozzle_maps=ValidNozzleMaps(maps={"Column1": NINETY_SIX_COLS["1"]}),
        ),
        critical_point=CriticalPoint.XY_CENTER,
        destination_position=Point(100, 200, 300),
        pipette_bounds_result=(
            Point(100, 231.5, 342),
            Point(199, 168.5, 342),
            Point(199, 231.5, 342),
            Point(100, 168.5, 342),
        ),
    ),
]


@pytest.mark.parametrize(
    argnames=_PipetteSpecs._fields,
    argvalues=_pipette_spec_cases,
)
def test_get_pipette_bounds_at_location(
    tip_length: float,
    bounding_box_offsets: PipetteBoundingBoxOffsets,
    nozzle_map: NozzleMap,
    destination_position: Point,
    critical_point: Optional[CriticalPoint],
    pipette_bounds_result: Tuple[Point, Point, Point, Point],
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should get the pipette's nozzle's bounds at the given location."""
    subject = get_pipette_view(
        nozzle_layout_by_id={"pipette-id": nozzle_map},
        attached_tip_by_id={
            "pipette-id": TipGeometry(length=tip_length, diameter=123, volume=123),
        },
        static_config_by_id={
            "pipette-id": StaticPipetteConfig(
                min_volume=1,
                max_volume=9001,
                channels=5,
                model="blah",
                display_name="bleh",
                serial_number="",
                tip_configuration_lookup_table={},
                nominal_tip_overlap={},
                home_position=0,
                nozzle_offset_z=0,
                default_nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
                bounding_nozzle_offsets=_SAMPLE_NOZZLE_BOUNDS_OFFSETS,
                pipette_bounding_box_offsets=bounding_box_offsets,
                lld_settings={},
                plunger_positions={
                    "top": 0.0,
                    "bottom": 5.0,
                    "blow_out": 19.0,
                    "drop_tip": 20.0,
                },
                shaft_ul_per_mm=5.0,
                available_sensors=available_sensors,
            )
        },
    )
    assert (
        subject.get_pipette_bounds_at_specified_move_to_position(
            pipette_id="pipette-id",
            destination_position=destination_position,
            critical_point=critical_point,
        )
        == pipette_bounds_result
    )


@pytest.mark.parametrize(
    "nozzle_map,allowed",
    [
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="H12",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={
                        "Full": sum(
                            [
                                NINETY_SIX_ROWS["A"],
                                NINETY_SIX_ROWS["B"],
                                NINETY_SIX_ROWS["C"],
                                NINETY_SIX_ROWS["D"],
                                NINETY_SIX_ROWS["E"],
                                NINETY_SIX_ROWS["F"],
                                NINETY_SIX_ROWS["G"],
                                NINETY_SIX_ROWS["H"],
                            ],
                            [],
                        )
                    }
                ),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="H1",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={"Column1": NINETY_SIX_COLS["1"]}
                ),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A12",
                back_left_nozzle="A12",
                front_right_nozzle="H12",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={"Column12": NINETY_SIX_COLS["12"]}
                ),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="A1",
                valid_nozzle_maps=ValidNozzleMaps(maps={"Single": ["A1"]}),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=OrderedDict((("A1", Point(0.0, 1.0, 2.0)),)),
                physical_rows=OrderedDict((("1", ["A1"]),)),
                physical_columns=OrderedDict((("A", ["A1"]),)),
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="A1",
                valid_nozzle_maps=ValidNozzleMaps(maps={"Single": ["A1"]}),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=EIGHT_CHANNEL_MAP,
                physical_rows=EIGHT_CHANNEL_ROWS,
                physical_columns=EIGHT_CHANNEL_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="H1",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={"Full": EIGHT_CHANNEL_COLS["1"]}
                ),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=EIGHT_CHANNEL_MAP,
                physical_rows=EIGHT_CHANNEL_ROWS,
                physical_columns=EIGHT_CHANNEL_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="A1",
                valid_nozzle_maps=ValidNozzleMaps(maps={"Full": ["A1"]}),
            ),
            True,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A5",
                back_left_nozzle="A5",
                front_right_nozzle="H5",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={"Column12": NINETY_SIX_COLS["5"]}
                ),
            ),
            False,
        ),
    ],
)
def test_lld_config_validation(nozzle_map: NozzleMap, allowed: bool) -> None:
    """It should validate partial tip configurations for LLD."""
    pipette_id = "pipette-id"
    subject = get_pipette_view(
        nozzle_layout_by_id={pipette_id: nozzle_map},
    )
    assert subject.get_nozzle_configuration_supports_lld(pipette_id) == allowed
