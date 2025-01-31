"""Test state getters for retrieving motion planning views of state."""
import inspect
from typing import List

import pytest
from decoy import Decoy

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.types import Point, MountType, DeckSlotName
from opentrons.hardware_control.types import CriticalPoint
from opentrons import motion_planning

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    WellLocation,
    LoadedPipette,
    DeckSlotLocation,
    CurrentWell,
    CurrentAddressableArea,
    MotorAxis,
    AddressableOffsetVector,
)
from opentrons.protocol_engine.state import _move_types
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.state.labware import LabwareView
from opentrons.protocol_engine.state.pipettes import PipetteView
from opentrons.protocol_engine.state.addressable_areas import AddressableAreaView
from opentrons.protocol_engine.state.geometry import GeometryView
from opentrons.protocol_engine.state.motion import MotionView, PipetteLocationData
from opentrons.protocol_engine.state.modules import ModuleView
from opentrons.protocol_engine.state.module_substates import HeaterShakerModuleId
from opentrons_shared_data.robot.types import RobotType


@pytest.fixture
def mock_module_view(decoy: Decoy) -> ModuleView:
    """Get a mock in the shape of a ModuleView."""
    return decoy.mock(cls=ModuleView)


@pytest.fixture(autouse=True)
def patch_mock_get_waypoints(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace motion_planning.get_waypoints() with a mock."""
    mock_get_waypoints = decoy.mock(func=motion_planning.get_waypoints)
    monkeypatch.setattr(motion_planning, "get_waypoints", mock_get_waypoints)


@pytest.fixture(autouse=True)
def patch_mock__move_types(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out _move_types.py functions."""
    for name, func in inspect.getmembers(_move_types, inspect.isfunction):
        monkeypatch.setattr(_move_types, name, decoy.mock(func=func))


@pytest.fixture
def mock_engine_config(decoy: Decoy) -> Config:
    """Get a ProtocolEngine config value object."""
    return decoy.mock(cls=Config)


@pytest.fixture
def subject(
    mock_engine_config: Config,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    addressable_area_view: AddressableAreaView,
    geometry_view: GeometryView,
    mock_module_view: ModuleView,
) -> MotionView:
    """Get a MotionView with its dependencies mocked out."""
    return MotionView(
        config=mock_engine_config,
        labware_view=labware_view,
        pipette_view=pipette_view,
        addressable_area_view=addressable_area_view,
        geometry_view=geometry_view,
        module_view=mock_module_view,
    )


def test_get_pipette_location_with_no_current_location(
    decoy: Decoy,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should return mount and critical_point=None if no location."""
    decoy.when(pipette_view.get_current_location()).then_return(None)

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.LEFT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    result = subject.get_pipette_location("pipette-id")

    assert result == PipetteLocationData(mount=MountType.LEFT, critical_point=None)


def test_get_pipette_location_with_current_location_with_y_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should return cp=Y_CENTER if location labware requests."""
    decoy.when(pipette_view.get_current_location()).then_return(
        CurrentWell(pipette_id="pipette-id", labware_id="reservoir-id", well_name="A1")
    )

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.RIGHT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    decoy.when(
        labware_view.get_should_center_column_on_target_well(
            "reservoir-id",
        )
    ).then_return(True)

    result = subject.get_pipette_location("pipette-id")

    assert result == PipetteLocationData(
        mount=MountType.RIGHT,
        critical_point=CriticalPoint.Y_CENTER,
    )


def test_get_pipette_location_with_current_location_with_xy_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should return cp=XY_CENTER if location labware requests."""
    decoy.when(pipette_view.get_current_location()).then_return(
        CurrentWell(pipette_id="pipette-id", labware_id="reservoir-id", well_name="A1")
    )

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.RIGHT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    decoy.when(
        labware_view.get_should_center_pipette_on_target_well(
            "reservoir-id",
        )
    ).then_return(True)

    result = subject.get_pipette_location("pipette-id")

    assert result == PipetteLocationData(
        mount=MountType.RIGHT,
        critical_point=CriticalPoint.XY_CENTER,
    )


def test_get_pipette_location_with_current_location_different_pipette(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should return mount and cp=None if location used other pipette."""
    decoy.when(pipette_view.get_current_location()).then_return(
        CurrentWell(
            pipette_id="other-pipette-id",
            labware_id="reservoir-id",
            well_name="A1",
        )
    )

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.LEFT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    decoy.when(
        labware_view.get_should_center_column_on_target_well(
            "reservoir-id",
        )
    ).then_return(False)

    decoy.when(
        labware_view.get_should_center_pipette_on_target_well(
            "reservoir-id",
        )
    ).then_return(False)

    result = subject.get_pipette_location("pipette-id")

    assert result == PipetteLocationData(
        mount=MountType.LEFT,
        critical_point=None,
    )


def test_get_pipette_location_override_current_location_xy_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should calculate pipette location from a passed in deck location with xy override."""
    current_well = CurrentWell(
        pipette_id="pipette-id",
        labware_id="reservoir-id",
        well_name="A1",
    )

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.RIGHT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    decoy.when(
        labware_view.get_should_center_pipette_on_target_well(
            "reservoir-id",
        )
    ).then_return(True)

    result = subject.get_pipette_location(
        pipette_id="pipette-id",
        current_location=current_well,
    )

    assert result == PipetteLocationData(
        mount=MountType.RIGHT,
        critical_point=CriticalPoint.XY_CENTER,
    )


def test_get_pipette_location_override_current_location_y_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should calculate pipette location from a passed in deck location with xy override."""
    current_well = CurrentWell(
        pipette_id="pipette-id",
        labware_id="reservoir-id",
        well_name="A1",
    )

    decoy.when(pipette_view.get("pipette-id")).then_return(
        LoadedPipette(
            id="pipette-id",
            mount=MountType.RIGHT,
            pipetteName=PipetteNameType.P300_SINGLE,
        )
    )

    decoy.when(
        labware_view.get_should_center_column_on_target_well(
            "reservoir-id",
        )
    ).then_return(True)

    result = subject.get_pipette_location(
        pipette_id="pipette-id",
        current_location=current_well,
    )

    assert result == PipetteLocationData(
        mount=MountType.RIGHT,
        critical_point=CriticalPoint.Y_CENTER,
    )


def test_get_movement_waypoints_to_well_for_y_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    geometry_view: GeometryView,
    mock_module_view: ModuleView,
    subject: MotionView,
) -> None:
    """It should call get_waypoints() with the correct args to move to a well."""
    location = CurrentWell(pipette_id="123", labware_id="456", well_name="abc")

    decoy.when(pipette_view.get_current_location()).then_return(location)

    decoy.when(
        labware_view.get_should_center_column_on_target_well(
            "labware-id",
        )
    ).then_return(True)
    decoy.when(
        labware_view.get_should_center_pipette_on_target_well(
            "labware-id",
        )
    ).then_return(False)

    decoy.when(
        geometry_view.get_well_position(
            "labware-id", "well-name", WellLocation(), None, "pipette-id"
        )
    ).then_return(Point(x=4, y=5, z=6))

    decoy.when(
        _move_types.get_move_type_to_well(
            "pipette-id", "labware-id", "well-name", location, True
        )
    ).then_return(motion_planning.MoveType.GENERAL_ARC)
    decoy.when(
        geometry_view.get_min_travel_z("pipette-id", "labware-id", location, 123)
    ).then_return(42.0)

    decoy.when(geometry_view.get_ancestor_slot_name("labware-id")).then_return(
        DeckSlotName.SLOT_2
    )

    decoy.when(
        geometry_view.get_extra_waypoints(location, DeckSlotName.SLOT_2)
    ).then_return([(456, 789)])

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.Y_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(4, 5, 6), critical_point=CriticalPoint.MOUNT
        ),
    ]

    decoy.when(
        motion_planning.get_waypoints(
            move_type=motion_planning.MoveType.GENERAL_ARC,
            origin=Point(x=1, y=2, z=3),
            origin_cp=CriticalPoint.MOUNT,
            max_travel_z=1337,
            min_travel_z=42,
            dest=Point(x=4, y=5, z=6),
            dest_cp=CriticalPoint.Y_CENTER,
            xy_waypoints=[(456, 789)],
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_well(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="well-name",
        well_location=WellLocation(),
        origin=Point(x=1, y=2, z=3),
        origin_cp=CriticalPoint.MOUNT,
        max_travel_z=1337,
        force_direct=True,
        minimum_z_height=123,
    )

    assert result == waypoints


def test_get_movement_waypoints_to_well_for_xy_center(
    decoy: Decoy,
    labware_view: LabwareView,
    pipette_view: PipetteView,
    geometry_view: GeometryView,
    mock_module_view: ModuleView,
    subject: MotionView,
) -> None:
    """It should call get_waypoints() with the correct args to move to a well."""
    location = CurrentWell(pipette_id="123", labware_id="456", well_name="abc")

    decoy.when(pipette_view.get_current_location()).then_return(location)

    decoy.when(
        labware_view.get_should_center_column_on_target_well(
            "labware-id",
        )
    ).then_return(False)
    decoy.when(
        labware_view.get_should_center_pipette_on_target_well(
            "labware-id",
        )
    ).then_return(True)

    decoy.when(
        geometry_view.get_well_position(
            "labware-id", "well-name", WellLocation(), None, "pipette-id"
        )
    ).then_return(Point(x=4, y=5, z=6))

    decoy.when(
        _move_types.get_move_type_to_well(
            "pipette-id", "labware-id", "well-name", location, True
        )
    ).then_return(motion_planning.MoveType.GENERAL_ARC)
    decoy.when(
        geometry_view.get_min_travel_z("pipette-id", "labware-id", location, 123)
    ).then_return(42.0)

    decoy.when(geometry_view.get_ancestor_slot_name("labware-id")).then_return(
        DeckSlotName.SLOT_2
    )

    decoy.when(
        geometry_view.get_extra_waypoints(location, DeckSlotName.SLOT_2)
    ).then_return([(456, 789)])

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.XY_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(4, 5, 6), critical_point=CriticalPoint.MOUNT
        ),
    ]

    decoy.when(
        motion_planning.get_waypoints(
            move_type=motion_planning.MoveType.GENERAL_ARC,
            origin=Point(x=1, y=2, z=3),
            origin_cp=CriticalPoint.MOUNT,
            max_travel_z=1337,
            min_travel_z=42,
            dest=Point(x=4, y=5, z=6),
            dest_cp=CriticalPoint.XY_CENTER,
            xy_waypoints=[(456, 789)],
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_well(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="well-name",
        well_location=WellLocation(),
        origin=Point(x=1, y=2, z=3),
        origin_cp=CriticalPoint.MOUNT,
        max_travel_z=1337,
        force_direct=True,
        minimum_z_height=123,
    )

    assert result == waypoints


def test_get_movement_waypoints_to_well_raises(
    decoy: Decoy,
    pipette_view: PipetteView,
    geometry_view: GeometryView,
    subject: MotionView,
) -> None:
    """It should raise FailedToPlanMoveError if motion_planning.get_waypoints raises."""
    decoy.when(
        geometry_view.get_well_position(
            labware_id="labware-id",
            well_name="A1",
            well_location=None,
            operation_volume=None,
            pipette_id="pipette-id",
        )
    ).then_return(Point(x=4, y=5, z=6))
    decoy.when(pipette_view.get_current_location()).then_return(None)
    decoy.when(
        geometry_view.get_min_travel_z("pipette-id", "labware-id", None, None)
    ).then_return(456)
    decoy.when(
        # TODO(mm, 2022-06-22): We should use decoy.matchers.Anything() for all
        # arguments. For some reason, Decoy does not match the call unless we
        # specify concrete values for all (?) arguments?
        motion_planning.get_waypoints(
            Point(x=1, y=2, z=3),
            Point(x=4, y=5, z=6),
            max_travel_z=123,
            min_travel_z=456,
        ),
        ignore_extra_args=True,
    ).then_raise(
        motion_planning.MotionPlanningError(
            origin=Point(1, 2, 3),
            dest=Point(1, 2, 3),
            clearance=123,
            min_travel_z=123,
            max_travel_z=123,
            message="oh the humanity",
        )
    )

    with pytest.raises(errors.FailedToPlanMoveError, match="oh the humanity"):
        subject.get_movement_waypoints_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="A1",
            well_location=None,
            origin=Point(1, 2, 3),
            origin_cp=None,
            max_travel_z=123,
        )


def test_get_movement_waypoints_to_addressable_area(
    decoy: Decoy,
    pipette_view: PipetteView,
    addressable_area_view: AddressableAreaView,
    geometry_view: GeometryView,
    subject: MotionView,
) -> None:
    """It should call get_waypoints() with the correct args to move to an addressable area."""
    location = CurrentAddressableArea(pipette_id="123", addressable_area_name="abc")

    decoy.when(pipette_view.get_current_location()).then_return(location)
    decoy.when(
        addressable_area_view.get_addressable_area_move_to_location("area-name")
    ).then_return(Point(x=3, y=3, z=3))
    decoy.when(geometry_view.get_all_obstacle_highest_z()).then_return(42)

    decoy.when(
        addressable_area_view.get_addressable_area_base_slot("area-name")
    ).then_return(DeckSlotName.SLOT_2)

    decoy.when(
        geometry_view.get_extra_waypoints(location, DeckSlotName.SLOT_2)
    ).then_return([])

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.XY_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(4, 5, 6), critical_point=CriticalPoint.MOUNT
        ),
    ]

    decoy.when(
        motion_planning.get_waypoints(
            move_type=motion_planning.MoveType.DIRECT,
            origin=Point(x=1, y=2, z=3),
            origin_cp=CriticalPoint.MOUNT,
            max_travel_z=1337,
            min_travel_z=123,
            dest=Point(x=4, y=5, z=6),
            dest_cp=CriticalPoint.XY_CENTER,
            xy_waypoints=[],
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_addressable_area(
        addressable_area_name="area-name",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        origin=Point(x=1, y=2, z=3),
        origin_cp=CriticalPoint.MOUNT,
        max_travel_z=1337,
        force_direct=True,
        minimum_z_height=123,
        ignore_tip_configuration=False,
    )

    assert result == waypoints


def test_move_to_moveable_trash_addressable_area(
    decoy: Decoy,
    pipette_view: PipetteView,
    addressable_area_view: AddressableAreaView,
    geometry_view: GeometryView,
    subject: MotionView,
) -> None:
    """Ensure that a move request to a moveableTrash addressable utilizes the Instrument Center critical point."""
    location = CurrentAddressableArea(
        pipette_id="123", addressable_area_name="moveableTrashA1"
    )

    decoy.when(pipette_view.get_current_location()).then_return(location)
    decoy.when(
        addressable_area_view.get_addressable_area_move_to_location("moveableTrashA1")
    ).then_return(Point(x=3, y=3, z=3))
    decoy.when(geometry_view.get_all_obstacle_highest_z()).then_return(42)

    decoy.when(
        addressable_area_view.get_addressable_area_base_slot("moveableTrashA1")
    ).then_return(DeckSlotName.SLOT_1)

    decoy.when(
        geometry_view.get_extra_waypoints(location, DeckSlotName.SLOT_1)
    ).then_return([])

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.INSTRUMENT_XY_CENTER
        )
    ]

    decoy.when(
        motion_planning.get_waypoints(
            move_type=motion_planning.MoveType.DIRECT,
            origin=Point(x=1, y=2, z=3),
            origin_cp=CriticalPoint.MOUNT,
            max_travel_z=1337,
            min_travel_z=123,
            dest=Point(x=4, y=5, z=6),
            dest_cp=CriticalPoint.INSTRUMENT_XY_CENTER,
            xy_waypoints=[],
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_addressable_area(
        addressable_area_name="moveableTrashA1",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        origin=Point(x=1, y=2, z=3),
        origin_cp=CriticalPoint.MOUNT,
        max_travel_z=1337,
        force_direct=True,
        minimum_z_height=123,
        ignore_tip_configuration=True,
    )

    assert result == waypoints


def test_get_movement_waypoints_to_addressable_area_stay_at_max_travel_z(
    decoy: Decoy,
    pipette_view: PipetteView,
    addressable_area_view: AddressableAreaView,
    geometry_view: GeometryView,
    subject: MotionView,
) -> None:
    """It should call get_waypoints() with the correct args to move to an addressable area.

    This is the variant where we pass stay_at_max_travel_z=True to the subject.
    This should affect the dest argument of get_waypoints().
    """
    location = CurrentAddressableArea(pipette_id="123", addressable_area_name="abc")

    decoy.when(pipette_view.get_current_location()).then_return(location)
    decoy.when(
        addressable_area_view.get_addressable_area_move_to_location("area-name")
    ).then_return(Point(x=3, y=3, z=3))
    decoy.when(geometry_view.get_all_obstacle_highest_z()).then_return(42)

    decoy.when(
        addressable_area_view.get_addressable_area_base_slot("area-name")
    ).then_return(DeckSlotName.SLOT_2)

    decoy.when(
        geometry_view.get_extra_waypoints(location, DeckSlotName.SLOT_2)
    ).then_return([])

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.XY_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(4, 5, 6), critical_point=CriticalPoint.MOUNT
        ),
    ]

    decoy.when(
        motion_planning.get_waypoints(
            move_type=motion_planning.MoveType.DIRECT,
            origin=Point(x=1, y=2, z=3),
            origin_cp=CriticalPoint.MOUNT,
            max_travel_z=1337,
            min_travel_z=123,
            dest=Point(
                x=4,
                y=5,
                # The max_travel_z arg passed to the subject, plus the offset passed to the subject,
                # minus a 1 mm margin as a hack--see comments in the subject.
                z=1337 + 3 - 1,
            ),
            dest_cp=CriticalPoint.XY_CENTER,
            xy_waypoints=[],
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_addressable_area(
        addressable_area_name="area-name",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        origin=Point(x=1, y=2, z=3),
        origin_cp=CriticalPoint.MOUNT,
        max_travel_z=1337,
        force_direct=True,
        minimum_z_height=123,
        stay_at_max_travel_z=True,
        ignore_tip_configuration=False,
    )

    assert result == waypoints


@pytest.mark.parametrize(
    ("direct", "expected_move_type"),
    [
        (False, motion_planning.MoveType.GENERAL_ARC),
        (True, motion_planning.MoveType.DIRECT),
    ],
)
@pytest.mark.parametrize(
    ("additional_min_travel_z", "all_labware_highest_z", "expected_min_travel_z"),
    [
        (None, 100, 100),
        (200, 100, 200),
        (100, 200, 200),
        (None, -100, -100),
        (-200, -100, -100),
        (-100, -200, -100),
    ],
)
def test_get_movement_waypoints_to_coords(
    decoy: Decoy,
    geometry_view: GeometryView,
    subject: MotionView,
    direct: bool,
    expected_move_type: motion_planning.MoveType,
    additional_min_travel_z: float,
    all_labware_highest_z: float,
    expected_min_travel_z: float,
) -> None:
    """It should call get_waypoints() with the correct args to move to coordinates."""
    origin = Point(1, 2, 3)
    dest = Point(4, 5, 6)
    max_travel_z = 789

    decoy.when(geometry_view.get_all_obstacle_highest_z()).then_return(
        all_labware_highest_z
    )

    waypoints = [
        motion_planning.Waypoint(
            position=Point(1, 2, 3), critical_point=CriticalPoint.XY_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(4, 5, 6), critical_point=CriticalPoint.MOUNT
        ),
    ]

    decoy.when(
        motion_planning.get_waypoints(
            origin=origin,
            origin_cp=None,
            dest=dest,
            dest_cp=None,
            min_travel_z=expected_min_travel_z,
            max_travel_z=max_travel_z,
            move_type=expected_move_type,
        )
    ).then_return(waypoints)

    result = subject.get_movement_waypoints_to_coords(
        origin=origin,
        dest=dest,
        max_travel_z=max_travel_z,
        direct=direct,
        additional_min_travel_z=additional_min_travel_z,
    )

    assert result == waypoints


def test_get_movement_waypoints_to_coords_raises(
    decoy: Decoy,
    geometry_view: GeometryView,
    subject: MotionView,
) -> None:
    """It should raise FailedToPlanMoveError if motion_planning.get_waypoints raises."""
    decoy.when(geometry_view.get_all_obstacle_highest_z()).then_return(123)
    decoy.when(
        # TODO(mm, 2022-06-22): We should use decoy.matchers.Anything() for all
        # arguments. For some reason, Decoy does not match the call unless we
        # specify concrete values for all (?) arguments?
        motion_planning.get_waypoints(
            Point(x=1, y=2, z=3),
            Point(x=1, y=2, z=3),
            max_travel_z=123,
            min_travel_z=123,
        ),
        ignore_extra_args=True,
    ).then_raise(
        motion_planning.MotionPlanningError(
            origin=Point(1, 2, 3),
            dest=Point(1, 2, 3),
            clearance=123,
            min_travel_z=123,
            max_travel_z=123,
            message="oh the humanity",
        )
    )

    with pytest.raises(errors.FailedToPlanMoveError, match="oh the humanity"):
        subject.get_movement_waypoints_to_coords(
            origin=Point(1, 2, 3),
            dest=Point(1, 2, 3),
            max_travel_z=123,
            direct=False,
            additional_min_travel_z=None,
        )


@pytest.mark.parametrize(
    ("labware_deck_slot", "expected_result"),
    [
        (DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_5, True),
        (DeckSlotName.SLOT_6, True),
        (DeckSlotName.SLOT_2, False),
        (DeckSlotName.SLOT_8, False),
        (DeckSlotName.SLOT_1, False),
    ],
)
def test_check_pipette_blocking_hs_latch(
    decoy: Decoy,
    geometry_view: GeometryView,
    pipette_view: PipetteView,
    mock_module_view: ModuleView,
    subject: MotionView,
    labware_deck_slot: DeckSlotName,
    expected_result: bool,
) -> None:
    """It should return True if pipette is blocking opening the latch."""
    decoy.when(pipette_view.get_current_location()).then_return(
        CurrentWell(pipette_id="pipette-id", labware_id="labware-id", well_name="A1")
    )

    decoy.when(geometry_view.get_ancestor_slot_name("labware-id")).then_return(
        labware_deck_slot
    )

    decoy.when(
        mock_module_view.get_location(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_5))

    result = subject.check_pipette_blocking_hs_latch(
        HeaterShakerModuleId("heater-shaker-id")
    )

    assert result == expected_result


@pytest.mark.parametrize(
    ("labware_deck_slot", "expected_result"),
    [
        (DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_5, True),
        (DeckSlotName.SLOT_6, True),
        (DeckSlotName.SLOT_2, True),
        (DeckSlotName.SLOT_8, True),
        (DeckSlotName.SLOT_1, False),
    ],
)
def test_check_pipette_blocking_hs_shake(
    decoy: Decoy,
    geometry_view: GeometryView,
    pipette_view: PipetteView,
    mock_module_view: ModuleView,
    subject: MotionView,
    labware_deck_slot: DeckSlotName,
    expected_result: bool,
) -> None:
    """It should return True if pipette is blocking the h/s from shaking."""
    decoy.when(pipette_view.get_current_location()).then_return(
        CurrentWell(pipette_id="pipette-id", labware_id="labware-id", well_name="A1")
    )

    decoy.when(geometry_view.get_ancestor_slot_name("labware-id")).then_return(
        labware_deck_slot
    )

    decoy.when(
        mock_module_view.get_location(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_5))

    result = subject.check_pipette_blocking_hs_shaker(
        HeaterShakerModuleId("heater-shaker-id")
    )

    assert result == expected_result


def test_get_touch_tip_waypoints(
    decoy: Decoy,
    labware_view: LabwareView,
    mock_module_view: ModuleView,
    geometry_view: GeometryView,
    pipette_view: PipetteView,
    subject: MotionView,
) -> None:
    """It should be able to get the position of a well top in a labware."""
    center_point = Point(1, 2, 3)

    decoy.when(
        labware_view.get_should_center_pipette_on_target_well("labware-id")
    ).then_return(True)
    decoy.when(
        labware_view.get_should_center_column_on_target_well("labware-id")
    ).then_return(False)

    decoy.when(pipette_view.get_mount("pipette-id")).then_return(MountType.LEFT)

    decoy.when(geometry_view.get_ancestor_slot_name("labware-id")).then_return(
        DeckSlotName.SLOT_4
    )

    decoy.when(
        mock_module_view.is_edge_move_unsafe(MountType.LEFT, DeckSlotName.SLOT_4)
    ).then_return(True)

    decoy.when(
        labware_view.get_edge_path_type(
            "labware-id", "B2", MountType.LEFT, DeckSlotName.SLOT_4, True
        )
    ).then_return(_move_types.EdgePathType.RIGHT)

    decoy.when(
        labware_view.get_well_radial_offsets("labware-id", "B2", 0.123)
    ).then_return((1.2, 3.4))

    decoy.when(
        _move_types.get_edge_point_list(
            center=center_point,
            x_radius=1.2,
            y_radius=3.4,
            edge_path_type=_move_types.EdgePathType.RIGHT,
            mm_from_edge=0.456,
        )
    ).then_return([Point(x=11, y=22, z=33), Point(x=44, y=55, z=66)])

    result = subject.get_touch_tip_waypoints(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="B2",
        center_point=center_point,
        radius=0.123,
        mm_from_edge=0.456,
    )

    assert result == [
        motion_planning.Waypoint(
            position=Point(x=11, y=22, z=33), critical_point=CriticalPoint.XY_CENTER
        ),
        motion_planning.Waypoint(
            position=Point(x=44, y=55, z=66), critical_point=CriticalPoint.XY_CENTER
        ),
    ]


@pytest.mark.parametrize(
    argnames=["robot_type", "expected_axes"],
    argvalues=[
        ["OT-2 Standard", [MotorAxis.LEFT_Z, MotorAxis.RIGHT_Z]],
        ["OT-3 Standard", [MotorAxis.LEFT_Z, MotorAxis.RIGHT_Z, MotorAxis.EXTENSION_Z]],
    ],
)
def test_get_mount_axes(
    decoy: Decoy,
    mock_engine_config: Config,
    subject: MotionView,
    robot_type: RobotType,
    expected_axes: List[MotorAxis],
) -> None:
    """It should return the correct mount axes for the robot type."""
    decoy.when(mock_engine_config.robot_type).then_return(robot_type)
    assert subject.get_robot_mount_axes() == expected_axes
