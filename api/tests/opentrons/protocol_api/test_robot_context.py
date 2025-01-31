"""Test the functionality of the `RobotContext`."""
import pytest
from decoy import Decoy
from typing import Union, Optional

from opentrons.types import (
    DeckLocation,
    Mount,
    Point,
    Location,
    DeckSlotName,
    AxisType,
    StringAxisMap,
    AxisMapType,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api.core.common import ProtocolCore, RobotCore
from opentrons.protocol_api import RobotContext, ModuleContext
from opentrons.protocol_api.deck import Deck
from opentrons_shared_data.pipette.types import PipetteNameType

from opentrons.protocol_api._types import PipetteActionTypes, PlungerPositionTypes


@pytest.fixture
def mock_core(decoy: Decoy) -> RobotCore:
    """Get a mock module implementation core."""
    return decoy.mock(cls=RobotCore)


@pytest.fixture
def api_version() -> APIVersion:
    """Get the API version to test at."""
    return APIVersion(2, 22)


@pytest.fixture
def mock_deck(decoy: Decoy) -> Deck:
    """Get a mocked deck object."""
    deck = decoy.mock(cls=Deck)
    decoy.when(deck.get_slot_center(DeckSlotName.SLOT_D1.value)).then_return(
        Point(3, 3, 3)
    )
    return deck


@pytest.fixture
def mock_protocol(decoy: Decoy, mock_deck: Deck, mock_core: RobotCore) -> ProtocolCore:
    """Get a mock protocol implementation core without a 96 channel attached."""
    protocol_core = decoy.mock(cls=ProtocolCore)
    decoy.when(protocol_core.robot_type).then_return("OT-3 Standard")
    decoy.when(protocol_core.load_robot()).then_return(mock_core)
    return protocol_core


@pytest.fixture
def subject(
    decoy: Decoy,
    mock_core: RobotCore,
    mock_protocol: ProtocolCore,
    api_version: APIVersion,
) -> RobotContext:
    """Get a RobotContext test subject with its dependencies mocked out."""
    decoy.when(mock_core.get_pipette_type_from_engine(Mount.LEFT)).then_return(
        PipetteNameType.P1000_SINGLE_FLEX
    )
    decoy.when(mock_core.get_pipette_type_from_engine(Mount.RIGHT)).then_return(
        PipetteNameType.P1000_SINGLE_FLEX
    )
    return RobotContext(
        core=mock_core, api_version=api_version, protocol_core=mock_protocol
    )


@pytest.mark.parametrize(
    argnames=["mount", "destination", "speed"],
    argvalues=[
        ("left", Location(point=Point(1, 2, 3), labware=None), None),
        (Mount.RIGHT, Location(point=Point(1, 2, 3), labware=None), 100),
    ],
)
def test_move_to(
    decoy: Decoy,
    subject: RobotContext,
    mount: Union[str, Mount],
    destination: Location,
    speed: Optional[float],
) -> None:
    """Test `RobotContext.move_to`."""
    subject.move_to(mount, destination, speed)
    core_mount: Mount
    if isinstance(mount, str):
        core_mount = Mount.string_to_mount(mount)
    else:
        core_mount = mount
    decoy.verify(subject._core.move_to(core_mount, destination.point, speed))


@pytest.mark.parametrize(
    argnames=[
        "axis_map",
        "critical_point",
        "expected_axis_map",
        "expected_critical_point",
        "speed",
    ],
    argvalues=[
        (
            {"x": 100, "Y": 50, "z_g": 80},
            {"x": 5, "Y": 5, "z_g": 5},
            {AxisType.X: 100, AxisType.Y: 50, AxisType.Z_G: 80},
            {AxisType.X: 5, AxisType.Y: 5, AxisType.Z_G: 5},
            None,
        ),
        (
            {"x": 5, "Y": 5},
            {"x": 5, "Y": 5},
            {AxisType.X: 5, AxisType.Y: 5},
            {AxisType.X: 5, AxisType.Y: 5},
            None,
        ),
    ],
)
def test_move_axes_to(
    decoy: Decoy,
    subject: RobotContext,
    axis_map: Union[StringAxisMap, AxisMapType],
    critical_point: Union[StringAxisMap, AxisMapType],
    expected_axis_map: AxisMapType,
    expected_critical_point: AxisMapType,
    speed: Optional[float],
) -> None:
    """Test `RobotContext.move_axes_to`."""
    subject.move_axes_to(axis_map, critical_point, speed)
    decoy.verify(
        subject._core.move_axes_to(expected_axis_map, expected_critical_point, speed)
    )


@pytest.mark.parametrize(
    argnames=["axis_map", "converted_map", "speed"],
    argvalues=[
        (
            {"x": 10, "Y": 10, "z_g": 10},
            {AxisType.X: 10, AxisType.Y: 10, AxisType.Z_G: 10},
            None,
        ),
        ({AxisType.P_L: 10}, {AxisType.P_L: 10}, 5),
    ],
)
def test_move_axes_relative(
    decoy: Decoy,
    subject: RobotContext,
    axis_map: Union[StringAxisMap, AxisMapType],
    converted_map: AxisMapType,
    speed: Optional[float],
) -> None:
    """Test `RobotContext.move_axes_relative`."""
    subject.move_axes_relative(axis_map, speed)
    decoy.verify(subject._core.move_axes_relative(converted_map, speed))


@pytest.mark.parametrize(
    argnames=["mount", "location_to_move", "expected_axis_map"],
    argvalues=[
        (
            "left",
            Location(point=Point(1, 2, 3), labware=None),
            {AxisType.Z_L: 3, AxisType.X: 1, AxisType.Y: 2},
        ),
        (
            Mount.EXTENSION,
            Location(point=Point(1, 2, 3), labware=None),
            {AxisType.Z_G: 3, AxisType.X: 1, AxisType.Y: 2},
        ),
    ],
)
def test_get_axes_coordinates_for(
    subject: RobotContext,
    mount: Union[Mount, str],
    location_to_move: Union[Location, ModuleContext, DeckLocation],
    expected_axis_map: AxisMapType,
) -> None:
    """Test `RobotContext.get_axis_coordinates_for`."""
    res = subject.axis_coordinates_for(mount, location_to_move)
    assert res == expected_axis_map


@pytest.mark.parametrize(
    argnames=["mount", "volume", "action", "expected_axis_map"],
    argvalues=[
        (Mount.RIGHT, 200, PipetteActionTypes.ASPIRATE_ACTION, {AxisType.P_R: 100}),
        (Mount.LEFT, 100, PipetteActionTypes.DISPENSE_ACTION, {AxisType.P_L: 100}),
    ],
)
def test_plunger_coordinates_for_volume(
    decoy: Decoy,
    subject: RobotContext,
    mount: Mount,
    volume: float,
    action: PipetteActionTypes,
    expected_axis_map: AxisMapType,
) -> None:
    """Test `RobotContext.plunger_coordinates_for_volume`."""
    decoy.when(
        subject._core.get_plunger_position_from_volume(
            mount, volume, action, "OT-3 Standard"
        )
    ).then_return(100)

    result = subject.plunger_coordinates_for_volume(mount, volume, action)
    assert result == expected_axis_map


@pytest.mark.parametrize(
    argnames=["mount", "position_name", "expected_axis_map"],
    argvalues=[
        (Mount.RIGHT, PlungerPositionTypes.PLUNGER_TOP, {AxisType.P_R: 3}),
        (
            Mount.RIGHT,
            PlungerPositionTypes.PLUNGER_BOTTOM,
            {AxisType.P_R: 3},
        ),
    ],
)
def test_plunger_coordinates_for_named_position(
    decoy: Decoy,
    subject: RobotContext,
    mount: Mount,
    position_name: PlungerPositionTypes,
    expected_axis_map: AxisMapType,
) -> None:
    """Test `RobotContext.plunger_coordinates_for_named_position`."""
    decoy.when(
        subject._core.get_plunger_position_from_name(mount, position_name)
    ).then_return(3)
    result = subject.plunger_coordinates_for_named_position(mount, position_name)
    assert result == expected_axis_map


def test_plunger_methods_raise_without_pipette(
    mock_core: RobotCore, mock_protocol: ProtocolCore, api_version: APIVersion
) -> None:
    """Test that `RobotContext` plunger functions raise without pipette attached."""
    subject = RobotContext(
        core=mock_core, api_version=api_version, protocol_core=mock_protocol
    )
    with pytest.raises(ValueError):
        subject.plunger_coordinates_for_named_position(
            Mount.LEFT, PlungerPositionTypes.PLUNGER_TOP
        )

    with pytest.raises(ValueError):
        subject.plunger_coordinates_for_volume(
            Mount.LEFT, 200, PipetteActionTypes.ASPIRATE_ACTION
        )
