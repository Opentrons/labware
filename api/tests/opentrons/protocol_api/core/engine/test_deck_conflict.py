"""Unit tests for the deck_conflict module."""
import pytest
from typing import ContextManager, Any, NamedTuple, List, Tuple
from decoy import Decoy
from contextlib import nullcontext as does_not_raise
from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.robot.types import RobotType

from opentrons.hardware_control import CriticalPoint
from opentrons.motion_planning import deck_conflict as wrapped_deck_conflict
from opentrons.motion_planning import adjacent_slots_getters
from opentrons.motion_planning.adjacent_slots_getters import _MixedTypeSlots
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api import MAX_SUPPORTED_VERSION
from opentrons.protocol_api.disposal_locations import (
    TrashBin,
    WasteChute,
    _TRASH_BIN_CUTOUT_FIXTURE,
)
from opentrons.protocol_api.labware import Labware
from opentrons.protocol_api.core.engine import deck_conflict, pipette_movement_conflict
from opentrons.protocol_engine import (
    Config,
    DeckSlotLocation,
    ModuleModel,
    StateView,
)
from opentrons.protocol_engine.state.geometry import _AbsoluteRobotExtents
from opentrons.protocol_engine.state.pipettes import PipetteBoundingBoxOffsets

from opentrons.protocol_engine.clients import SyncClient
from opentrons.protocol_engine.errors import LabwareNotLoadedOnModuleError
from opentrons.types import (
    DeckSlotName,
    Point,
    StagingSlotName,
    MountType,
    NozzleConfigurationType,
)

from opentrons.protocol_engine.types import (
    DeckType,
    LoadedLabware,
    LoadedModule,
    WellLocation,
    WellOrigin,
    WellOffset,
    OnDeckLabwareLocation,
    OnLabwareLocation,
    Dimensions,
    StagingSlotLocation,
)


@pytest.fixture(autouse=True)
def patch_slot_getters(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out adjacent_slots_getters functions."""
    mock_get_surrounding_slots = decoy.mock(
        func=adjacent_slots_getters.get_surrounding_slots
    )
    mock_get_surrounding_staging_slots = decoy.mock(
        func=adjacent_slots_getters.get_surrounding_staging_slots
    )
    monkeypatch.setattr(
        adjacent_slots_getters, "get_surrounding_slots", mock_get_surrounding_slots
    )
    monkeypatch.setattr(
        adjacent_slots_getters,
        "get_surrounding_staging_slots",
        mock_get_surrounding_staging_slots,
    )


@pytest.fixture(autouse=True)
def use_mock_wrapped_deck_conflict(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace the check() function that our subject should wrap with a mock."""
    mock_check = decoy.mock(func=wrapped_deck_conflict.check)
    monkeypatch.setattr(wrapped_deck_conflict, "check", mock_check)


@pytest.fixture
def api_version() -> APIVersion:
    """Get mocked api_version."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def mock_sync_client(decoy: Decoy) -> SyncClient:
    """Return a mock in the shape of a SyncClient."""
    return decoy.mock(cls=SyncClient)


@pytest.fixture
def mock_state_view(
    decoy: Decoy,
    robot_type: RobotType,
    deck_type: DeckType,
) -> StateView:
    """Return a mock in the shape of a StateView."""
    mock_state_view = decoy.mock(cls=StateView)
    config = Config(robot_type=robot_type, deck_type=deck_type)
    decoy.when(mock_state_view.config).then_return(config)
    return mock_state_view


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [
        ("OT-2 Standard", DeckType.OT2_STANDARD),
        ("OT-3 Standard", DeckType.OT3_STANDARD),
    ],
)
def test_maps_labware_on_deck(decoy: Decoy, mock_state_view: StateView) -> None:
    """It should correcly map a labware that's loaded directly into a deck slot."""
    decoy.when(
        mock_state_view.labware.get_location(labware_id="labware-id")
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_5))

    decoy.when(
        mock_state_view.labware.get_load_name(labware_id="labware-id")
    ).then_return("labware_load_name")
    decoy.when(
        mock_state_view.geometry.get_labware_highest_z(labware_id="labware-id")
    ).then_return(3.14159)
    decoy.when(
        mock_state_view.labware.get_definition_uri(labware_id="labware-id")
    ).then_return(LabwareUri("test/labware_load_name/123"))
    decoy.when(
        mock_state_view.labware.is_fixed_trash(labware_id="labware-id")
    ).then_return(True)

    # Test both ways that the subject's caller can provide a labware:
    # by new_labware_id, and by existing_labware_ids.
    # We reuse the same ID for test convenience; in the real world, they'd be different.
    deck_conflict.check(
        engine_state=mock_state_view,
        existing_labware_ids=["labware-id"],
        existing_module_ids=[],
        existing_disposal_locations=[],
        new_labware_id="labware-id",
    )
    decoy.verify(
        wrapped_deck_conflict.check(
            existing_items={
                DeckSlotName.SLOT_5: wrapped_deck_conflict.Labware(
                    name_for_errors="labware_load_name",
                    highest_z=3.14159,
                    uri=LabwareUri("test/labware_load_name/123"),
                    is_fixed_trash=True,
                )
            },
            new_item=wrapped_deck_conflict.Labware(
                name_for_errors="labware_load_name",
                highest_z=3.14159,
                uri=LabwareUri("test/labware_load_name/123"),
                is_fixed_trash=True,
            ),
            new_location=DeckSlotName.SLOT_5,
            robot_type=mock_state_view.config.robot_type,
        )
    )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [
        ("OT-2 Standard", DeckType.OT2_STANDARD),
        ("OT-3 Standard", DeckType.OT3_STANDARD),
    ],
)
def test_maps_module_without_labware(decoy: Decoy, mock_state_view: StateView) -> None:
    """It should correctly map a module with no labware loaded atop it."""
    decoy.when(mock_state_view.labware.get_id_by_module("module-id")).then_raise(
        LabwareNotLoadedOnModuleError()
    )
    decoy.when(mock_state_view.modules.get_overall_height("module-id")).then_return(
        3.14159
    )

    decoy.when(mock_state_view.modules.get_connected_model("module-id")).then_return(
        ModuleModel.HEATER_SHAKER_MODULE_V1
    )
    decoy.when(mock_state_view.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_5)
    )

    # Test both ways that the subject's caller can provide a module:
    # by new_module_id, and by existing_module_ids.
    # We reuse the same ID for test convenience; in the real world, they'd be different.
    deck_conflict.check(
        engine_state=mock_state_view,
        existing_labware_ids=[],
        existing_module_ids=["module-id"],
        existing_disposal_locations=[],
        new_module_id="module-id",
    )
    decoy.verify(
        wrapped_deck_conflict.check(
            existing_items={
                DeckSlotName.SLOT_5: wrapped_deck_conflict.HeaterShakerModule(
                    name_for_errors="heaterShakerModuleV1",
                    highest_z_including_labware=3.14159,
                )
            },
            new_item=wrapped_deck_conflict.HeaterShakerModule(
                name_for_errors="heaterShakerModuleV1",
                highest_z_including_labware=3.14159,
            ),
            new_location=DeckSlotName.SLOT_5,
            robot_type=mock_state_view.config.robot_type,
        )
    )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [
        ("OT-2 Standard", DeckType.OT2_STANDARD),
        ("OT-3 Standard", DeckType.OT3_STANDARD),
    ],
)
def test_maps_module_with_labware(decoy: Decoy, mock_state_view: StateView) -> None:
    """It should correctly map a module with a labware loaded atop it.

    The highest_z should include both the labware and the module.
    """
    decoy.when(mock_state_view.labware.get_id_by_module("module-id")).then_return(
        "labware-id"
    )
    decoy.when(
        mock_state_view.geometry.get_labware_highest_z("labware-id")
    ).then_return(3.14159)

    decoy.when(mock_state_view.modules.get_connected_model("module-id")).then_return(
        ModuleModel.HEATER_SHAKER_MODULE_V1
    )
    decoy.when(mock_state_view.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_5)
    )

    # Test both ways that the subject's caller can provide a module:
    # by new_module_id, and by existing_module_ids.
    # We reuse the same ID for test convenience; in the real world, they'd be different.
    deck_conflict.check(
        engine_state=mock_state_view,
        existing_labware_ids=[],
        existing_module_ids=["module-id"],
        existing_disposal_locations=[],
        new_module_id="module-id",
    )
    decoy.verify(
        wrapped_deck_conflict.check(
            existing_items={
                DeckSlotName.SLOT_5: wrapped_deck_conflict.HeaterShakerModule(
                    name_for_errors="heaterShakerModuleV1",
                    highest_z_including_labware=3.14159,
                )
            },
            new_item=wrapped_deck_conflict.HeaterShakerModule(
                name_for_errors="heaterShakerModuleV1",
                highest_z_including_labware=3.14159,
            ),
            new_location=DeckSlotName.SLOT_5,
            robot_type=mock_state_view.config.robot_type,
        )
    )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [
        ("OT-2 Standard", DeckType.OT2_STANDARD),
        ("OT-3 Standard", DeckType.OT3_STANDARD),
    ],
)
@pytest.mark.parametrize("module_model", ModuleModel)
def test_maps_different_module_models(
    decoy: Decoy, mock_state_view: StateView, module_model: ModuleModel
) -> None:
    """It should correctly map all possible kinds of hardware module."""

    def get_expected_mapping_result() -> wrapped_deck_conflict.DeckItem:
        expected_name_for_errors = module_model.value
        if module_model is ModuleModel.HEATER_SHAKER_MODULE_V1:
            return wrapped_deck_conflict.HeaterShakerModule(
                name_for_errors=expected_name_for_errors,
                highest_z_including_labware=3.14159,
            )
        elif module_model is ModuleModel.MAGNETIC_BLOCK_V1:
            return wrapped_deck_conflict.MagneticBlockModule(
                name_for_errors=expected_name_for_errors,
                highest_z_including_labware=3.14159,
            )
        elif (
            module_model is ModuleModel.THERMOCYCLER_MODULE_V1
            or module_model is ModuleModel.THERMOCYCLER_MODULE_V2
        ):
            return wrapped_deck_conflict.ThermocyclerModule(
                name_for_errors=expected_name_for_errors,
                highest_z_including_labware=3.14159,
                is_semi_configuration=False,
            )
        else:
            return wrapped_deck_conflict.OtherModule(
                name_for_errors=expected_name_for_errors,
                highest_z_including_labware=3.14159,
            )
        # There is deliberately no catch-all `else` block here.
        # If a new value is added to ModuleModel, it should cause an error here and
        # force us to think about how it should be mapped.

    decoy.when(mock_state_view.modules.get_connected_model("module-id")).then_return(
        module_model
    )

    decoy.when(mock_state_view.labware.get_id_by_module("module-id")).then_raise(
        LabwareNotLoadedOnModuleError()
    )
    decoy.when(mock_state_view.modules.get_overall_height("module-id")).then_return(
        3.14159
    )
    decoy.when(mock_state_view.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_5)
    )

    expected_mapping_result = get_expected_mapping_result()

    deck_conflict.check(
        engine_state=mock_state_view,
        existing_labware_ids=[],
        existing_module_ids=[],
        existing_disposal_locations=[],
        new_module_id="module-id",
    )
    decoy.verify(
        wrapped_deck_conflict.check(
            existing_items={},
            new_item=expected_mapping_result,
            new_location=DeckSlotName.SLOT_5,
            robot_type=mock_state_view.config.robot_type,
        )
    )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [
        ("OT-2 Standard", DeckType.OT2_STANDARD),
        ("OT-3 Standard", DeckType.OT3_STANDARD),
    ],
)
def test_maps_trash_bins(
    decoy: Decoy,
    mock_state_view: StateView,
    api_version: APIVersion,
    mock_sync_client: SyncClient,
) -> None:
    """It should correctly map disposal locations."""
    mock_trash_lw = decoy.mock(cls=Labware)

    decoy.when(
        mock_sync_client.state.addressable_areas.get_fixture_height(
            _TRASH_BIN_CUTOUT_FIXTURE
        )
    ).then_return(1.23)

    deck_conflict.check(
        engine_state=mock_state_view,
        existing_labware_ids=[],
        existing_module_ids=[],
        existing_disposal_locations=[
            TrashBin(
                location=DeckSlotName.SLOT_B1,
                addressable_area_name="blah",
                engine_client=mock_sync_client,
                api_version=api_version,
            ),
            WasteChute(engine_client=mock_sync_client, api_version=api_version),
            mock_trash_lw,
        ],
        new_trash_bin=TrashBin(
            location=DeckSlotName.SLOT_A1,
            addressable_area_name="blah",
            engine_client=mock_sync_client,
            api_version=api_version,
        ),
    )
    decoy.verify(
        wrapped_deck_conflict.check(
            existing_items={
                DeckSlotName.SLOT_B1: wrapped_deck_conflict.TrashBin(
                    name_for_errors="trash bin", highest_z=1.23
                )
            },
            new_item=wrapped_deck_conflict.TrashBin(
                name_for_errors="trash bin", highest_z=1.23
            ),
            new_location=DeckSlotName.SLOT_A1,
            robot_type=mock_state_view.config.robot_type,
        )
    )


plate = LoadedLabware(
    id="plate-id",
    loadName="plate-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_C1),
    definitionUri="some-plate-uri",
    offsetId=None,
    displayName="Fancy Plate Name",
)

module = LoadedModule(
    id="module-id",
    model=ModuleModel.TEMPERATURE_MODULE_V1,
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_C1),
    serialNumber="serial-number",
)


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [("OT-3 Standard", DeckType.OT3_STANDARD)],
)
@pytest.mark.parametrize(
    ["pipette_bounds", "expected_raise", "y_value"],
    [
        (  # nozzles above highest Z
            (
                Point(x=50, y=150, z=60),
                Point(x=150, y=50, z=60),
                Point(x=150, y=150, z=60),
                Point(x=50, y=50, z=60),
            ),
            does_not_raise(),
            0,
        ),
        # X, Y, Z collisions
        (
            (
                Point(x=50, y=150, z=40),
                Point(x=150, y=50, z=40),
                Point(x=150, y=150, z=40),
                Point(x=50, y=50, z=40),
            ),
            pytest.raises(
                pipette_movement_conflict.PartialTipMovementNotAllowedError,
                match="collision with items in deck slot D1",
            ),
            0,
        ),
        (
            (
                Point(x=101, y=150, z=40),
                Point(x=150, y=50, z=40),
                Point(x=150, y=150, z=40),
                Point(x=101, y=50, z=40),
            ),
            pytest.raises(
                pipette_movement_conflict.PartialTipMovementNotAllowedError,
                match="collision with items in deck slot D2",
            ),
            0,
        ),
        (  # Collision with staging slot
            (
                Point(x=150, y=150, z=40),
                Point(x=250, y=101, z=40),
                Point(x=150, y=101, z=40),
                Point(x=250, y=150, z=40),
            ),
            pytest.raises(
                pipette_movement_conflict.PartialTipMovementNotAllowedError,
                match="will result in collision with items in staging slot C4.",
            ),
            170,
        ),
    ],
)
def test_deck_conflict_raises_for_bad_pipette_move(
    decoy: Decoy,
    mock_state_view: StateView,
    pipette_bounds: Tuple[Point, Point, Point, Point],
    expected_raise: ContextManager[Any],
    y_value: float,
) -> None:
    """It should raise errors when moving to locations with restrictions for partial pipette movement.

    Test premise:
    - we are using a pipette configured for COLUMN nozzle layout with primary nozzle A12
    - there are labware of height 50mm in C1, D1 & D2
    - we are checking for conflicts when moving to a labware in C2.
      For each test case, we are moving to a different point in the destination labware,
      with the same pipette and tip

    Note: this test does not stub out the slot overlap checker function
          in order to preserve readability of the test. That means the test does
          actual slot overlap checks.
    """
    destination_well_point = Point(x=123, y=y_value, z=123)
    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured("pipette-id")
    ).then_return(True)
    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )
    decoy.when(mock_state_view.geometry.absolute_deck_extents).then_return(
        _AbsoluteRobotExtents(
            front_left={
                MountType.LEFT: Point(13.5, -60.5, 0.0),
                MountType.RIGHT: Point(-40.5, -60.5, 0.0),
            },
            back_right={
                MountType.LEFT: Point(463.7, 433.3, 0.0),
                MountType.RIGHT: Point(517.7, 433.3),
            },
            deck_extents=Point(477.2, 493.8, 0.0),
            padding_rear=-181.21,
            padding_front=55.8,
            padding_left_side=31.88,
            padding_right_side=-80.32,
        )
    )
    decoy.when(
        mock_state_view.pipettes.get_pipette_bounding_box("pipette-id")
    ).then_return(
        # 96 chan outer bounds
        PipetteBoundingBoxOffsets(
            back_left_corner=Point(-36.0, -25.5, -259.15),
            front_right_corner=Point(63.0, -88.5, -259.15),
            front_left_corner=Point(-36.0, -88.5, -259.15),
            back_right_corner=Point(63.0, -25.5, -259.15),
        )
    )
    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured("pipette-id")
    ).then_return(True)
    decoy.when(mock_state_view.pipettes.get_primary_nozzle("pipette-id")).then_return(
        "A12"
    )
    decoy.when(
        mock_state_view.geometry.get_ancestor_slot_name("destination-labware-id")
    ).then_return(DeckSlotName.SLOT_C2)

    decoy.when(
        mock_state_view.geometry.get_well_position(
            labware_id="destination-labware-id",
            well_name="A2",
            well_location=WellLocation(origin=WellOrigin.TOP, offset=WellOffset(z=10)),
        )
    ).then_return(destination_well_point)
    decoy.when(
        mock_state_view.labware.get_should_center_column_on_target_well(
            "destination-labware-id"
        )
    ).then_return(False)
    decoy.when(
        mock_state_view.labware.get_should_center_pipette_on_target_well(
            "destination-labware-id"
        )
    ).then_return(False)
    decoy.when(
        mock_state_view.pipettes.get_pipette_bounds_at_specified_move_to_position(
            pipette_id="pipette-id",
            destination_position=destination_well_point,
            critical_point=None,
        )
    ).then_return(pipette_bounds)

    decoy.when(
        adjacent_slots_getters.get_surrounding_slots(5, robot_type="OT-3 Standard")
    ).then_return(
        _MixedTypeSlots(
            regular_slots=[
                DeckSlotName.SLOT_D1,
                DeckSlotName.SLOT_D2,
                DeckSlotName.SLOT_C1,
            ],
            staging_slots=[StagingSlotName.SLOT_C4],
        )
    )
    decoy.when(
        adjacent_slots_getters.get_surrounding_staging_slots(DeckSlotName.SLOT_C2)
    ).then_return([StagingSlotName.SLOT_C4])

    decoy.when(
        mock_state_view.addressable_areas.get_addressable_area_position(
            addressable_area_name="C1", do_compatibility_check=False
        )
    ).then_return(Point(0, 100, 0))
    decoy.when(
        mock_state_view.addressable_areas.get_addressable_area_position(
            addressable_area_name="D1", do_compatibility_check=False
        )
    ).then_return(Point(0, 0, 0))
    decoy.when(
        mock_state_view.addressable_areas.get_addressable_area_position(
            addressable_area_name="D2", do_compatibility_check=False
        )
    ).then_return(Point(100, 0, 0))
    decoy.when(
        mock_state_view.addressable_areas.get_addressable_area_position(
            addressable_area_name="C4", do_compatibility_check=False
        )
    ).then_return(Point(200, 100, 0))
    decoy.when(
        mock_state_view.addressable_areas.get_addressable_area_bounding_box(
            addressable_area_name="C4", do_compatibility_check=False
        )
    ).then_return(Dimensions(90, 90, 0))
    decoy.when(
        mock_state_view.geometry.get_highest_z_in_slot(
            StagingSlotLocation(slotName=StagingSlotName.SLOT_C4)
        )
    ).then_return(50)
    for slot_name in [DeckSlotName.SLOT_C1, DeckSlotName.SLOT_D1, DeckSlotName.SLOT_D2]:
        decoy.when(
            mock_state_view.geometry.get_highest_z_in_slot(
                DeckSlotLocation(slotName=slot_name)
            )
        ).then_return(50)
        decoy.when(
            mock_state_view.addressable_areas.get_addressable_area_bounding_box(
                addressable_area_name=slot_name.id, do_compatibility_check=False
            )
        ).then_return(Dimensions(90, 90, 0))

    with expected_raise:
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_state_view,
            pipette_id="pipette-id",
            labware_id="destination-labware-id",
            well_name="A2",
            well_location=WellLocation(origin=WellOrigin.TOP, offset=WellOffset(z=10)),
        )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [("OT-3 Standard", DeckType.OT3_STANDARD)],
)
def test_deck_conflict_raises_for_collision_with_tc_lid(
    decoy: Decoy,
    mock_state_view: StateView,
) -> None:
    """It should raise an error if pipette might collide with thermocycler lid on the Flex."""
    destination_well_point = Point(x=123, y=123, z=123)
    pipette_bounds_at_destination = (
        Point(x=50, y=350, z=204.5),
        Point(x=150, y=429, z=204.5),
        Point(x=150, y=400, z=204.5),
        Point(x=50, y=300, z=204.5),
    )

    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured("pipette-id")
    ).then_return(True)
    decoy.when(mock_state_view.pipettes.get_primary_nozzle("pipette-id")).then_return(
        "A12"
    )
    decoy.when(
        mock_state_view.geometry.get_ancestor_slot_name("destination-labware-id")
    ).then_return(DeckSlotName.SLOT_C2)

    decoy.when(
        mock_state_view.geometry.get_well_position(
            labware_id="destination-labware-id",
            well_name="A2",
            well_location=WellLocation(origin=WellOrigin.TOP, offset=WellOffset(z=10)),
        )
    ).then_return(destination_well_point)

    decoy.when(
        mock_state_view.labware.get_should_center_column_on_target_well(
            "destination-labware-id"
        )
    ).then_return(True)
    decoy.when(
        mock_state_view.pipettes.get_pipette_bounds_at_specified_move_to_position(
            pipette_id="pipette-id",
            destination_position=destination_well_point,
            critical_point=CriticalPoint.Y_CENTER,
        )
    ).then_return(pipette_bounds_at_destination)
    decoy.when(mock_state_view.pipettes.get_mount("pipette-id")).then_return(
        MountType.LEFT
    )
    decoy.when(
        mock_state_view.pipettes.get_pipette_bounding_box("pipette-id")
    ).then_return(
        # 96 chan outer bounds
        PipetteBoundingBoxOffsets(
            back_left_corner=Point(-67.0, -3.5, -259.15),
            front_right_corner=Point(94.0, -113.0, -259.15),
            front_left_corner=Point(-67.0, -113.0, -259.15),
            back_right_corner=Point(94.0, -3.5, -259.15),
        )
    )
    decoy.when(mock_state_view.geometry.absolute_deck_extents).then_return(
        _AbsoluteRobotExtents(
            front_left={
                MountType.LEFT: Point(13.5, 60.5, 0.0),
                MountType.RIGHT: Point(-40.5, 60.5, 0.0),
            },
            back_right={
                MountType.LEFT: Point(463.7, 433.3, 0.0),
                MountType.RIGHT: Point(517.7, 433.3),
            },
            deck_extents=Point(477.2, 493.8, 0.0),
            padding_rear=-181.21,
            padding_front=55.8,
            padding_left_side=31.88,
            padding_right_side=-80.32,
        )
    )

    decoy.when(
        adjacent_slots_getters.get_surrounding_slots(5, robot_type="OT-3 Standard")
    ).then_return(
        _MixedTypeSlots(
            regular_slots=[
                DeckSlotName.SLOT_A1,
                DeckSlotName.SLOT_B1,
            ],
            staging_slots=[StagingSlotName.SLOT_C4],
        )
    )
    decoy.when(mock_state_view.modules.is_flex_deck_with_thermocycler()).then_return(
        True
    )
    with pytest.raises(
        pipette_movement_conflict.PartialTipMovementNotAllowedError,
        match="Requested motion with the A12 nozzle partial configuration is outside of robot bounds for the pipette.",
    ):
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_state_view,
            pipette_id="pipette-id",
            labware_id="destination-labware-id",
            well_name="A2",
            well_location=WellLocation(origin=WellOrigin.TOP, offset=WellOffset(z=10)),
        )


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [("OT-3 Standard", DeckType.OT3_STANDARD)],
)
@pytest.mark.parametrize(
    ["destination_well_point", "expected_raise"],
    [
        (
            Point(x=-12, y=100, z=60),
            pytest.raises(
                deck_conflict.PartialTipMovementNotAllowedError,
                match="outside of robot bounds",
            ),
        ),
        (
            Point(x=593, y=100, z=60),
            pytest.raises(
                deck_conflict.PartialTipMovementNotAllowedError,
                match="outside of robot bounds",
            ),
        ),
        (
            Point(x=100, y=1, z=60),
            pytest.raises(
                deck_conflict.PartialTipMovementNotAllowedError,
                match="outside of robot bounds",
            ),
        ),
        (
            Point(x=100, y=507, z=60),
            pytest.raises(
                deck_conflict.PartialTipMovementNotAllowedError,
                match="outside of robot bounds",
            ),
        ),
    ],
)
def test_deck_conflict_raises_for_out_of_bounds_96_channel_move(
    decoy: Decoy,
    mock_state_view: StateView,
    destination_well_point: Point,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise errors when moving to locations out of robot's bounds for partial tip 96-channel movement.

    Test premise:
    - we are using a pipette configured for COLUMN nozzle layout with primary nozzle A12
    """
    decoy.when(mock_state_view.pipettes.get_channels("pipette-id")).then_return(96)
    decoy.when(
        mock_state_view.labware.get_display_name("destination-labware-id")
    ).then_return("destination-labware")
    decoy.when(
        mock_state_view.pipettes.get_nozzle_layout_type("pipette-id")
    ).then_return(NozzleConfigurationType.COLUMN)
    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured("pipette-id")
    ).then_return(True)
    decoy.when(mock_state_view.pipettes.get_primary_nozzle("pipette-id")).then_return(
        "A12"
    )
    decoy.when(
        mock_state_view.geometry.get_ancestor_slot_name("destination-labware-id")
    ).then_return(DeckSlotName.SLOT_C2)

    decoy.when(
        mock_state_view.geometry.get_well_position(
            labware_id="destination-labware-id",
            well_name="A2",
            well_location=WellLocation(origin=WellOrigin.TOP, offset=WellOffset(z=10)),
        )
    ).then_return(destination_well_point)


class PipetteMovementSpec(NamedTuple):
    """Spec data to test deck_conflict.check_safe_for_tip_pickup_and_return ."""

    tiprack_parent: OnDeckLabwareLocation
    tiprack_dim: Dimensions
    is_on_flex_adapter: bool
    is_partial_config: bool
    expected_raise: ContextManager[Any]


pipette_movement_specs: List[PipetteMovementSpec] = [
    PipetteMovementSpec(
        tiprack_parent=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        tiprack_dim=Dimensions(x=0, y=0, z=50),
        is_on_flex_adapter=False,
        is_partial_config=False,
        expected_raise=pytest.raises(
            pipette_movement_conflict.UnsuitableTiprackForPipetteMotion,
            match="A cool tiprack must be on an Opentrons Flex 96 Tip Rack Adapter",
        ),
    ),
    PipetteMovementSpec(
        tiprack_parent=OnLabwareLocation(labwareId="adapter-id"),
        tiprack_dim=Dimensions(x=0, y=0, z=50),
        is_on_flex_adapter=True,
        is_partial_config=False,
        expected_raise=does_not_raise(),
    ),
    PipetteMovementSpec(
        tiprack_parent=OnLabwareLocation(labwareId="adapter-id"),
        tiprack_dim=Dimensions(x=0, y=0, z=50),
        is_on_flex_adapter=False,
        is_partial_config=False,
        expected_raise=pytest.raises(
            pipette_movement_conflict.UnsuitableTiprackForPipetteMotion,
            match="A cool tiprack must be on an Opentrons Flex 96 Tip Rack Adapter",
        ),
    ),
    PipetteMovementSpec(
        tiprack_parent=OnLabwareLocation(labwareId="adapter-id"),
        tiprack_dim=Dimensions(x=0, y=0, z=50),
        is_on_flex_adapter=True,
        is_partial_config=True,
        expected_raise=pytest.raises(
            pipette_movement_conflict.PartialTipMovementNotAllowedError,
            match="A cool tiprack cannot be on an adapter taller than the tip rack",
        ),
    ),
    PipetteMovementSpec(
        tiprack_parent=OnLabwareLocation(labwareId="adapter-id"),
        tiprack_dim=Dimensions(x=0, y=0, z=101),
        is_on_flex_adapter=True,
        is_partial_config=True,
        expected_raise=does_not_raise(),
    ),
    PipetteMovementSpec(
        tiprack_parent=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        tiprack_dim=Dimensions(x=0, y=0, z=50),
        is_on_flex_adapter=True,  # will be ignored
        is_partial_config=True,
        expected_raise=does_not_raise(),
    ),
]


@pytest.mark.parametrize(
    ("robot_type", "deck_type"),
    [("OT-3 Standard", DeckType.OT3_STANDARD)],
)
@pytest.mark.parametrize(
    argnames=PipetteMovementSpec._fields,
    argvalues=pipette_movement_specs,
)
def test_valid_96_pipette_movement_for_tiprack_and_adapter(
    decoy: Decoy,
    mock_state_view: StateView,
    tiprack_parent: OnDeckLabwareLocation,
    tiprack_dim: Dimensions,
    is_on_flex_adapter: bool,
    is_partial_config: bool,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise appropriate error for unsuitable tiprack parent when moving 96 channel to it."""
    decoy.when(mock_state_view.pipettes.get_channels("pipette-id")).then_return(96)
    decoy.when(
        mock_state_view.labware.get_dimensions(labware_id="adapter-id")
    ).then_return(Dimensions(x=0, y=0, z=100))
    decoy.when(mock_state_view.labware.get_display_name("labware-id")).then_return(
        "A cool tiprack"
    )
    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured("pipette-id")
    ).then_return(is_partial_config)
    decoy.when(mock_state_view.labware.get_location("labware-id")).then_return(
        tiprack_parent
    )
    decoy.when(
        mock_state_view.labware.get_dimensions(labware_id="labware-id")
    ).then_return(tiprack_dim)
    decoy.when(
        mock_state_view.labware.get_has_quirk(
            labware_id="adapter-id", quirk="tiprackAdapterFor96Channel"
        )
    ).then_return(is_on_flex_adapter)

    with expected_raise:
        pipette_movement_conflict.check_safe_for_tip_pickup_and_return(
            engine_state=mock_state_view,
            pipette_id="pipette-id",
            labware_id="labware-id",
        )
