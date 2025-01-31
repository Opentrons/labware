"""Test state getters for retrieving geometry views of state."""

import inspect
import json
from datetime import datetime
from math import isclose
from typing import cast, List, Tuple, Optional, NamedTuple, Dict
from unittest.mock import sentinel
from os import listdir, path

import pytest
from decoy import Decoy

from opentrons.protocol_engine.state.update_types import (
    LoadedLabwareUpdate,
    StateUpdate,
)

from opentrons_shared_data import get_shared_data_root, load_shared_data
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.pipette import pipette_definition
from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.types import Point, DeckSlotName, MountType, StagingSlotName
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.labware.labware_definition import (
    Dimensions as LabwareDimensions,
    Parameters as LabwareDefinitionParameters,
    CornerOffsetFromSlot,
    ConicalFrustum,
)

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    OFF_DECK_LOCATION,
    LabwareOffsetVector,
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    AddressableAreaLocation,
    ModuleOffsetVector,
    ModuleOffsetData,
    LoadedLabware,
    LoadedModule,
    ModuleModel,
    WellLocation,
    LiquidHandlingWellLocation,
    WellOrigin,
    DropTipWellLocation,
    DropTipWellOrigin,
    WellOffset,
    Dimensions,
    OverlapOffset,
    DeckType,
    CurrentWell,
    CurrentAddressableArea,
    CurrentPipetteLocation,
    LabwareMovementOffsetData,
    LoadedPipette,
    TipGeometry,
    ModuleDefinition,
    ProbedHeightInfo,
    ProbedVolumeInfo,
    LoadedVolumeInfo,
    WellLiquidInfo,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnLabwareOffsetLocationSequenceComponent,
)
from opentrons.protocol_engine.commands import (
    CommandStatus,
    LoadLabwareResult,
    LoadLabware,
    LoadLabwareParams,
    LoadModuleResult,
    LoadModule,
    LoadModuleParams,
)
from opentrons.protocol_engine.actions import SucceedCommandAction
from opentrons.protocol_engine.state import _move_types
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.state.labware import LabwareView, LabwareStore
from opentrons.protocol_engine.state.wells import WellView, WellStore
from opentrons.protocol_engine.state.modules import ModuleView, ModuleStore
from opentrons.protocol_engine.state.pipettes import (
    PipetteView,
    PipetteStore,
    StaticPipetteConfig,
    BoundingNozzlesOffsets,
    PipetteBoundingBoxOffsets,
)
from opentrons.protocol_engine.state.addressable_areas import (
    AddressableAreaView,
    AddressableAreaStore,
)
from opentrons.protocol_engine.state.geometry import GeometryView, _GripperMoveType
from opentrons.protocol_engine.state.frustum_helpers import (
    _height_from_volume_circular,
    _height_from_volume_rectangular,
    _volume_from_height_circular,
    _volume_from_height_rectangular,
)
from .inner_geometry_test_params import INNER_WELL_GEOMETRY_TEST_PARAMS
from ..pipette_fixtures import get_default_nozzle_map
from ..mock_circular_frusta import TEST_EXAMPLES as CIRCULAR_TEST_EXAMPLES
from ..mock_rectangular_frusta import TEST_EXAMPLES as RECTANGULAR_TEST_EXAMPLES
from ...protocol_runner.test_json_translator import _load_labware_definition_data


@pytest.fixture
def available_sensors() -> pipette_definition.AvailableSensorDefinition:
    """Provide a list of sensors."""
    return pipette_definition.AvailableSensorDefinition(
        sensors=["pressure", "capacitive", "environment"]
    )


@pytest.fixture
def mock_labware_view(decoy: Decoy) -> LabwareView:
    """Get a mock in the shape of a LabwareView."""
    return decoy.mock(cls=LabwareView)


@pytest.fixture
def mock_well_view(decoy: Decoy) -> WellView:
    """Get a mock in the shape of a WellView."""
    return decoy.mock(cls=WellView)


@pytest.fixture
def mock_module_view(decoy: Decoy) -> ModuleView:
    """Get a mock in the shape of a ModuleView."""
    return decoy.mock(cls=ModuleView)


@pytest.fixture
def mock_pipette_view(decoy: Decoy) -> PipetteView:
    """Get a mock in the shape of a PipetteView."""
    return decoy.mock(cls=PipetteView)


@pytest.fixture
def mock_addressable_area_view(decoy: Decoy) -> AddressableAreaView:
    """Get a mock in the shape of a AddressableAreaView."""
    return decoy.mock(cls=AddressableAreaView)


@pytest.fixture(autouse=True)
def patch_mock__move_types(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out _move_types.py functions."""
    for name, func in inspect.getmembers(_move_types, inspect.isfunction):
        monkeypatch.setattr(_move_types, name, decoy.mock(func=func))


@pytest.fixture
def use_mocks() -> bool:
    """True to use mocks; add a use_mocks parameter of False to your test to use real states."""
    return True


@pytest.fixture
def deck_definition(state_config: Config) -> DeckDefinitionV5:
    """Override as parameter to use a non-flex deck def."""
    return load_deck(name=state_config.deck_type.value, version=5)


@pytest.fixture
def state_config() -> Config:
    """Get a state config. This is set up for a Flex."""
    return Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )


@pytest.fixture
def labware_store(deck_definition: DeckDefinitionV5) -> LabwareStore:
    """Get a labware store that can accept actions."""
    return LabwareStore(deck_definition=deck_definition, deck_fixed_labware=[])


@pytest.fixture
def labware_view(labware_store: LabwareStore) -> LabwareView:
    """Get a labware view of a real labware store."""
    return LabwareView(labware_store._state)


@pytest.fixture
def well_store() -> WellStore:
    """Get a well store that can accept actions."""
    return WellStore()


@pytest.fixture
def well_view(well_store: WellStore) -> WellView:
    """Get a well view of a real well store."""
    return WellView(well_store._state)


@pytest.fixture
def module_store(state_config: Config) -> ModuleStore:
    """Get a module store that can accept actions."""
    return ModuleStore(
        config=state_config, deck_fixed_labware=[], module_calibration_offsets={}
    )


@pytest.fixture
def module_view(module_store: ModuleStore) -> ModuleView:
    """Get a module view of a real labware store."""
    return ModuleView(module_store._state)


@pytest.fixture
def pipette_store() -> PipetteStore:
    """Get a pipette store that can accept actions."""
    return PipetteStore()


@pytest.fixture
def pipette_view(pipette_store: PipetteStore) -> PipetteView:
    """Get a pipette view of a real pipette store."""
    return PipetteView(pipette_store._state)


@pytest.fixture
def addressable_area_store(
    state_config: Config, deck_definition: DeckDefinitionV5
) -> AddressableAreaStore:
    """Get an addressable area store that can accept actions."""
    return AddressableAreaStore(
        deck_configuration=[],
        config=state_config,
        deck_definition=deck_definition,
        robot_definition={
            "displayName": "OT-3",
            "robotType": "OT-3 Standard",
            "models": ["OT-3 Standard"],
            "extents": [477.2, 493.8, 0.0],
            "paddingOffsets": {
                "rear": -177.42,
                "front": 51.8,
                "leftSide": 31.88,
                "rightSide": -80.32,
            },
            "mountOffsets": {
                "left": [-13.5, -60.5, 255.675],
                "right": [40.5, -60.5, 255.675],
                "gripper": [84.55, -12.75, 93.85],
            },
        },
    )


@pytest.fixture
def addressable_area_view(
    addressable_area_store: AddressableAreaStore,
) -> AddressableAreaView:
    """Get an addressable area view of a real addressable are store."""
    return AddressableAreaView(addressable_area_store._state)


@pytest.fixture
def nice_labware_definition() -> LabwareDefinition:
    """Load a nice labware def that won't blow up your terminal."""
    return LabwareDefinition.model_validate(
        json.loads(
            load_shared_data("labware/fixtures/2/fixture_12_trough_v2.json").decode(
                "utf-8"
            )
        )
    )


@pytest.fixture
def nice_adapter_definition() -> LabwareDefinition:
    """Load a friendly adapter definition."""
    return LabwareDefinition.model_validate(
        json.loads(
            load_shared_data(
                "labware/definitions/2/opentrons_aluminum_flat_bottom_plate/1.json"
            ).decode("utf-8")
        )
    )


@pytest.fixture
def subject(
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_module_view: ModuleView,
    mock_pipette_view: PipetteView,
    mock_addressable_area_view: AddressableAreaView,
    state_config: Config,
    labware_view: LabwareView,
    well_view: WellView,
    module_view: ModuleView,
    pipette_view: PipetteView,
    addressable_area_view: AddressableAreaView,
    use_mocks: bool,
) -> GeometryView:
    """Get a GeometryView with its store dependencies provided.

    By default, this will return a view with those dependencies as mocked. If you add a
    parameter to your test of use_mocks that returns false, i.e.

    @pytest.mark.parametrize('use_mocks', [False])
    def my_cool_test(subject: GeometryView) -> None:
        pass

    then the provided subject will use actual states. Over time, we should get more and more
    things using use_mocks=True, and then flip the default
    """
    return GeometryView(
        config=state_config,
        labware_view=mock_labware_view if use_mocks else labware_view,
        well_view=mock_well_view if use_mocks else well_view,
        module_view=mock_module_view if use_mocks else module_view,
        pipette_view=mock_pipette_view if use_mocks else pipette_view,
        addressable_area_view=mock_addressable_area_view
        if use_mocks
        else addressable_area_view,
    )


def test_get_labware_parent_position(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should return a deck slot position for labware in a deck slot."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="b",
        definitionUri=uri_from_details(namespace="a", load_name="b", version=1),
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId=None,
    )
    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))

    result = subject.get_labware_parent_position("labware-id")

    assert result == Point(1, 2, 3)


def test_raise_error_for_off_deck_labware_parent(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """Test raise error when fetching parent for labware that's off-deck."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="b",
        definitionUri=uri_from_details(namespace="a", load_name="b", version=1),
        location=OFF_DECK_LOCATION,
        offsetId=None,
    )
    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    with pytest.raises(errors.LabwareNotOnDeckError):
        subject.get_labware_parent_position("labware-id")


def test_get_labware_parent_position_on_module(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """It should return a module position for labware on a module."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="b",
        definitionUri=uri_from_details(namespace="a", load_name="b", version=1),
        location=ModuleLocation(moduleId="module-id"),
        offsetId=None,
    )

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        sentinel.labware_def
    )
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))

    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )

    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=4, y=5, z=6))

    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.THERMOCYCLER_MODULE_V2
    )
    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            sentinel.labware_def, ModuleModel.THERMOCYCLER_MODULE_V2
        )
    ).then_return(OverlapOffset(x=1, y=2, z=3))
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=2, y=3, z=4),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        )
    )

    result = subject.get_labware_parent_position("labware-id")

    assert result == Point(6, 8, 10)


def test_get_labware_parent_position_on_labware(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """It should return a labware position for labware on a labware on a module."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="bcd",
        definitionUri=uri_from_details(namespace="a", load_name="bcd", version=1),
        location=OnLabwareLocation(labwareId="adapter-id"),
        offsetId=None,
    )
    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition(labware_data.id)).then_return(
        sentinel.labware_def
    )

    adapter_data = LoadedLabware(
        id="adapter-id",
        loadName="xyz",
        definitionUri=uri_from_details(namespace="w", load_name="xyz", version=1),
        location=ModuleLocation(moduleId="module-id"),
        offsetId=None,
    )
    decoy.when(mock_labware_view.get("adapter-id")).then_return(adapter_data)
    decoy.when(mock_labware_view.get_definition(adapter_data.id)).then_return(
        sentinel.adapter_def
    )

    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))

    decoy.when(mock_labware_view.get_dimensions(labware_id="adapter-id")).then_return(
        Dimensions(x=123, y=456, z=5)
    )
    decoy.when(
        mock_labware_view.get_labware_overlap_offsets(sentinel.labware_def, "xyz")
    ).then_return(OverlapOffset(x=1, y=2, z=2))

    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=1, y=2, z=3))

    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        sentinel.connected_model
    )
    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            sentinel.adapter_def, sentinel.connected_model
        )
    ).then_return(OverlapOffset(x=-3, y=-2, z=-1))

    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=3, y=4, z=5),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        )
    )

    result = subject.get_labware_parent_position("labware-id")

    assert result == Point(9, 12, 15)


def test_module_calibration_offset_rotation(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """Return the rotated module calibration offset if the module was moved from one side of the deck to the other."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="b",
        definitionUri=uri_from_details(namespace="a", load_name="b", version=1),
        location=ModuleLocation(moduleId="module-id"),
        offsetId=None,
    )

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_D1)
    )
    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.TEMPERATURE_MODULE_V2
    )
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=2, y=3, z=4),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_D1),
        )
    )

    # the module has not changed location after calibration, so there is no rotation
    result = subject._get_calibrated_module_offset(ModuleLocation(moduleId="module-id"))
    assert result == ModuleOffsetVector(x=2, y=3, z=4)

    # the module has changed from slot D1 to D3, so we should rotate the calibration offset 180 degrees along the z axis
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_D3)
    )
    result = subject._get_calibrated_module_offset(ModuleLocation(moduleId="module-id"))
    assert result == ModuleOffsetVector(x=-2, y=-3, z=4)

    # attempting to load the module calibration offset from an invalid slot in the middle of the deck (A2, B2, C2, D2)
    # is not be allowed since you can't even load a module in the middle to perform a module calibration in the
    # first place. So if someone manually edits the stored module calibration offset we will throw an assert error.
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=2, y=3, z=4),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_D2),
        )
    )
    with pytest.raises(AssertionError):
        result = subject._get_calibrated_module_offset(
            ModuleLocation(moduleId="module-id")
        )


def test_get_labware_origin_position(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should return a deck slot position with the labware's offset as its origin."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId=None,
    )

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))

    expected_parent = Point(1, 2, 3)
    expected_offset = Point(
        x=well_plate_def.cornerOffsetFromSlot.x,
        y=well_plate_def.cornerOffsetFromSlot.y,
        z=well_plate_def.cornerOffsetFromSlot.z,
    )
    expected_point = expected_parent + expected_offset

    result = subject.get_labware_origin_position("labware-id")

    assert result == expected_point


def test_get_labware_highest_z(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the absolute location of a labware's highest Z point."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="offset-id",
    )
    slot_pos = Point(1, 2, 3)
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(slot_pos)

    highest_z = subject.get_labware_highest_z("labware-id")

    assert highest_z == (well_plate_def.dimensions.zDimension + 3 + 3)


def test_get_module_labware_highest_z(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """It should get the absolute location of a labware's highest Z point."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=ModuleLocation(moduleId="module-id"),
        offsetId="offset-id",
    )
    slot_pos = Point(1, 2, 3)
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(slot_pos)
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )
    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=4, y=5, z=6))
    decoy.when(mock_module_view.get_height_over_labware("module-id")).then_return(0.5)
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=0, y=0, z=0),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        )
    )
    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.MAGNETIC_MODULE_V2
    )
    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            well_plate_def, ModuleModel.MAGNETIC_MODULE_V2
        )
    ).then_return(OverlapOffset(x=0, y=0, z=0))

    highest_z = subject.get_labware_highest_z("labware-id")

    assert highest_z == (well_plate_def.dimensions.zDimension + 3 + 3 + 6 + 0.5)


def test_get_all_obstacle_highest_z_no_equipment(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should return 0 if no loaded equipment."""
    decoy.when(mock_module_view.get_all()).then_return([])
    decoy.when(mock_labware_view.get_all()).then_return([])
    decoy.when(mock_addressable_area_view.get_all()).then_return([])

    result = subject.get_all_obstacle_highest_z()

    assert result == 0


def test_get_all_obstacle_highest_z(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
    falcon_tuberack_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the highest Z amongst all labware."""
    plate = LoadedLabware(
        id="plate-id",
        loadName="plate-load-name",
        definitionUri="plate-definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="plate-offset-id",
    )
    off_deck_lw = LoadedLabware(
        id="off-deck-plate-id",
        loadName="off-deck-plate-load-name",
        definitionUri="off-deck-plate-definition-uri",
        location=OFF_DECK_LOCATION,
        offsetId="plate-offset-id",
    )
    reservoir = LoadedLabware(
        id="reservoir-id",
        loadName="reservoir-load-name",
        definitionUri="reservoir-definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="reservoir-offset-id",
    )

    plate_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    off_deck_lw_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    reservoir_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_module_view.get_all()).then_return([])
    decoy.when(mock_addressable_area_view.get_all()).then_return([])

    decoy.when(mock_labware_view.get_all()).then_return([plate, off_deck_lw, reservoir])
    decoy.when(mock_labware_view.get("plate-id")).then_return(plate)
    decoy.when(mock_labware_view.get("off-deck-plate-id")).then_return(off_deck_lw)
    decoy.when(mock_labware_view.get("reservoir-id")).then_return(reservoir)

    decoy.when(mock_labware_view.get_definition("plate-id")).then_return(well_plate_def)
    decoy.when(mock_labware_view.get_definition("off-deck-plate-id")).then_return(
        falcon_tuberack_def  # Something tall.
    )
    decoy.when(mock_labware_view.get_definition("reservoir-id")).then_return(
        reservoir_def
    )

    decoy.when(mock_labware_view.get_labware_offset_vector("plate-id")).then_return(
        plate_offset
    )
    decoy.when(
        mock_labware_view.get_labware_offset_vector("off-deck-plate-id")
    ).then_return(off_deck_lw_offset)
    decoy.when(mock_labware_view.get_labware_offset_vector("reservoir-id")).then_return(
        reservoir_offset
    )

    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(Point(4, 5, 6))

    plate_z = subject.get_labware_highest_z("plate-id")
    reservoir_z = subject.get_labware_highest_z("reservoir-id")
    all_z = subject.get_all_obstacle_highest_z()

    # Should exclude the off-deck plate.
    assert all_z == max(plate_z, reservoir_z)


def test_get_all_obstacle_highest_z_with_staging_area(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    falcon_tuberack_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the highest Z amongst all labware including staging area."""
    plate = LoadedLabware(
        id="plate-id",
        loadName="plate-load-name",
        definitionUri="plate-definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="plate-offset-id",
    )
    staging_lw = LoadedLabware(
        id="staging-id",
        loadName="staging-load-name",
        definitionUri="staging-definition-uri",
        location=AddressableAreaLocation(addressableAreaName="D4"),
        offsetId="plate-offset-id",
    )

    plate_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    staging_lw_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_module_view.get_all()).then_return([])
    decoy.when(mock_addressable_area_view.get_all()).then_return([])

    decoy.when(mock_labware_view.get_all()).then_return([plate, staging_lw])
    decoy.when(mock_labware_view.get("plate-id")).then_return(plate)
    decoy.when(mock_labware_view.get("staging-id")).then_return(staging_lw)

    decoy.when(mock_labware_view.get_definition("plate-id")).then_return(well_plate_def)
    decoy.when(mock_labware_view.get_definition("staging-id")).then_return(
        falcon_tuberack_def  # Something tall.
    )

    decoy.when(mock_labware_view.get_labware_offset_vector("plate-id")).then_return(
        plate_offset
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("staging-id")).then_return(
        staging_lw_offset
    )

    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(1, 2, 3))
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position("D4")
    ).then_return(Point(4, 5, 6))

    staging_z = subject.get_labware_highest_z("staging-id")
    all_z = subject.get_all_obstacle_highest_z()

    assert all_z == staging_z


def test_get_all_obstacle_highest_z_with_modules(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the highest Z including modules."""
    module_1 = LoadedModule.model_construct(id="module-id-1")  # type: ignore[call-arg]
    module_2 = LoadedModule.model_construct(id="module-id-2")  # type: ignore[call-arg]

    decoy.when(mock_labware_view.get_all()).then_return([])
    decoy.when(mock_addressable_area_view.get_all()).then_return([])

    decoy.when(mock_module_view.get_all()).then_return([module_1, module_2])
    decoy.when(mock_module_view.get_overall_height("module-id-1")).then_return(42.0)
    decoy.when(mock_module_view.get_overall_height("module-id-2")).then_return(1337.0)

    result = subject.get_all_obstacle_highest_z()

    assert result == 1337.0


def test_get_all_obstacle_highest_z_with_fixtures(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the highest Z including fixtures."""
    decoy.when(mock_labware_view.get_all()).then_return([])
    decoy.when(mock_module_view.get_all()).then_return([])

    decoy.when(mock_addressable_area_view.get_all_cutout_fixtures()).then_return(
        ["abc", "xyz"]
    )
    decoy.when(mock_addressable_area_view.get_fixture_height("abc")).then_return(42.0)
    decoy.when(mock_addressable_area_view.get_fixture_height("xyz")).then_return(1337.0)

    result = subject.get_all_obstacle_highest_z()

    assert result == 1337.0


def test_get_highest_z_in_slot_with_single_labware(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should get the highest Z in slot with just a single labware."""
    # Case: Slot has a labware that doesn't have any other labware on it. Highest z is equal to labware height.
    labware_in_slot = LoadedLabware(
        id="just-labware-id",
        loadName="just-labware-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="offset-id",
    )
    slot_pos = Point(1, 2, 3)
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(
        labware_in_slot
    )
    decoy.when(mock_labware_view.get_id_by_labware("just-labware-id")).then_raise(
        errors.LabwareNotLoadedOnLabwareError("no more labware")
    )
    decoy.when(mock_labware_view.get("just-labware-id")).then_return(labware_in_slot)
    decoy.when(mock_labware_view.get_definition("just-labware-id")).then_return(
        well_plate_def
    )
    decoy.when(
        mock_labware_view.get_labware_offset_vector("just-labware-id")
    ).then_return(calibration_offset)
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(slot_pos)

    expected_highest_z = well_plate_def.dimensions.zDimension + 3 + 3
    assert (
        subject.get_highest_z_in_slot(DeckSlotLocation(slotName=DeckSlotName.SLOT_3))
        == expected_highest_z
    )


def test_get_highest_z_in_slot_with_single_module(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
    ot2_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should get the highest Z in slot with just a single module."""
    # Case: Slot has a module that doesn't have any labware on it. Highest z is equal to module height.
    module_in_slot = LoadedModule.model_construct(
        id="only-module",
        model=ModuleModel.THERMOCYCLER_MODULE_V2,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
    )

    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(
        module_in_slot
    )
    decoy.when(mock_labware_view.get_id_by_module("only-module")).then_raise(
        errors.LabwareNotLoadedOnModuleError("only module")
    )
    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(
        mock_module_view.get_module_highest_z(
            module_id="only-module",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(12345)

    assert (
        subject.get_highest_z_in_slot(DeckSlotLocation(slotName=DeckSlotName.SLOT_3))
        == 12345
    )


# TODO (spp, 2023-12-05): this is mocking out too many things and is hard to follow.
#  Create an integration test that loads labware and modules and tests the geometry
#  in an easier-to-understand manner.
def test_get_highest_z_in_slot_with_stacked_labware_on_slot(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should get the highest z in slot of the topmost labware in stack.

    Tests both `get_highest_z_in_slot` and `get_highest_z_of_labware_stack`.
    """
    labware_in_slot = LoadedLabware(
        id="bottom-labware-id",
        loadName="bottom-labware-name",
        definitionUri="bottom-definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="offset-id",
    )
    middle_labware = LoadedLabware(
        id="middle-labware-id",
        loadName="middle-labware-name",
        definitionUri="middle-definition-uri",
        location=OnLabwareLocation(labwareId="bottom-labware-id"),
        offsetId="offset-id",
    )
    top_labware = LoadedLabware(
        id="top-labware-id",
        loadName="top-labware-name",
        definitionUri="top-definition-uri",
        location=OnLabwareLocation(labwareId="middle-labware-id"),
        offsetId="offset-id",
    )
    slot_pos = Point(11, 22, 33)
    top_lw_lpc_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(
        labware_in_slot
    )

    decoy.when(mock_labware_view.get_id_by_labware("bottom-labware-id")).then_return(
        "middle-labware-id"
    )
    decoy.when(mock_labware_view.get_id_by_labware("middle-labware-id")).then_return(
        "top-labware-id"
    )
    decoy.when(mock_labware_view.get_id_by_labware("top-labware-id")).then_raise(
        errors.LabwareNotLoadedOnLabwareError("top labware")
    )

    decoy.when(mock_labware_view.get("bottom-labware-id")).then_return(labware_in_slot)
    decoy.when(mock_labware_view.get("middle-labware-id")).then_return(middle_labware)
    decoy.when(mock_labware_view.get("top-labware-id")).then_return(top_labware)

    decoy.when(mock_labware_view.get_definition("top-labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_definition("middle-labware-id")).then_return(
        sentinel.middle_labware_def
    )

    decoy.when(
        mock_labware_view.get_labware_offset_vector("top-labware-id")
    ).then_return(top_lw_lpc_offset)
    decoy.when(
        mock_labware_view.get_dimensions(labware_id="middle-labware-id")
    ).then_return(Dimensions(x=10, y=20, z=30))
    decoy.when(
        mock_labware_view.get_dimensions(labware_id="bottom-labware-id")
    ).then_return(Dimensions(x=11, y=12, z=13))

    decoy.when(
        mock_labware_view.get_labware_overlap_offsets(
            well_plate_def, below_labware_name="middle-labware-name"
        )
    ).then_return(OverlapOffset(x=4, y=5, z=6))
    decoy.when(
        mock_labware_view.get_labware_overlap_offsets(
            sentinel.middle_labware_def, below_labware_name="bottom-labware-name"
        )
    ).then_return(OverlapOffset(x=7, y=8, z=9))

    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(slot_pos)

    expected_highest_z = (
        slot_pos.z + well_plate_def.dimensions.zDimension - 6 + 30 - 9 + 13 + 3
    )
    assert (
        subject.get_highest_z_in_slot(DeckSlotLocation(slotName=DeckSlotName.SLOT_3))
        == expected_highest_z
    )


# TODO (spp, 2023-12-05): this is mocking out too many things and is hard to follow.
#  Create an integration test that loads labware and modules and tests the geometry
#  in an easier-to-understand manner.
def test_get_highest_z_in_slot_with_labware_stack_on_module(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
    ot2_standard_deck_def: DeckDefinitionV5,
) -> None:
    """It should get the highest z in slot of labware on module.

    Tests both `get_highest_z_in_slot` and `get_highest_z_of_labware_stack`.
    """
    top_labware = LoadedLabware(
        id="top-labware-id",
        loadName="top-labware-name",
        definitionUri="top-labware-uri",
        location=OnLabwareLocation(labwareId="adapter-id"),
        offsetId="offset-id1",
    )
    adapter = LoadedLabware(
        id="adapter-id",
        loadName="adapter-name",
        definitionUri="adapter-uri",
        location=ModuleLocation(moduleId="module-id"),
        offsetId="offset-id2",
    )
    module_on_slot = LoadedModule.model_construct(
        id="module-id",
        model=ModuleModel.THERMOCYCLER_MODULE_V2,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
    )

    slot_pos = Point(11, 22, 33)
    top_lw_lpc_offset = LabwareOffsetVector(x=1, y=-2, z=3)

    decoy.when(mock_module_view.get("module-id")).then_return(module_on_slot)
    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(
        module_on_slot
    )

    decoy.when(mock_labware_view.get_id_by_module("module-id")).then_return(
        "adapter-id"
    )
    decoy.when(mock_labware_view.get_id_by_labware("adapter-id")).then_return(
        "top-labware-id"
    )
    decoy.when(mock_labware_view.get_id_by_labware("top-labware-id")).then_raise(
        errors.LabwareNotLoadedOnLabwareError("top labware")
    )

    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(mock_labware_view.get_definition("top-labware-id")).then_return(
        well_plate_def
    )

    decoy.when(mock_labware_view.get("adapter-id")).then_return(adapter)
    decoy.when(mock_labware_view.get_definition("adapter-id")).then_return(
        sentinel.adapter_def
    )
    decoy.when(mock_labware_view.get("top-labware-id")).then_return(top_labware)

    decoy.when(
        mock_labware_view.get_labware_offset_vector("top-labware-id")
    ).then_return(top_lw_lpc_offset)
    decoy.when(mock_labware_view.get_dimensions(labware_id="adapter-id")).then_return(
        Dimensions(x=10, y=20, z=30)
    )
    decoy.when(
        mock_labware_view.get_labware_overlap_offsets(
            definition=well_plate_def, below_labware_name="adapter-name"
        )
    ).then_return(OverlapOffset(x=4, y=5, z=6))

    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )
    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=40, y=50, z=60))
    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.TEMPERATURE_MODULE_V2
    )

    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            sentinel.adapter_def, ModuleModel.TEMPERATURE_MODULE_V2
        )
    ).then_return(OverlapOffset(x=1.1, y=2.2, z=3.3))

    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(slot_pos)

    expected_highest_z = (
        slot_pos.z + 60 + 30 - 3.3 + well_plate_def.dimensions.zDimension - 6 + 3
    )
    assert (
        subject.get_highest_z_in_slot(DeckSlotLocation(slotName=DeckSlotName.SLOT_3))
        == expected_highest_z
    )


@pytest.mark.parametrize(
    ["location", "min_z_height", "expected_min_z"],
    [
        (None, None, 0),
        (None, 1337, 1337),
        (CurrentWell("other-pipette-id", "labware-id", "well-name"), None, 0),
        (CurrentWell("pipette-id", "other-labware-id", "well-name"), None, 0),
        (CurrentWell("pipette-id", "labware-id", "well-name"), None, 20.22),
        (CurrentWell("pipette-id", "labware-id", "well-name"), 1.23, 20.22),
        (CurrentWell("pipette-id", "labware-id", "well-name"), 1337, 1337),
    ],
)
def test_get_min_travel_z(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    location: Optional[CurrentWell],
    min_z_height: Optional[float],
    expected_min_z: float,
    subject: GeometryView,
) -> None:
    """It should find the minimum travel z."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        offsetId="offset-id",
    )

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        LabwareOffsetVector(x=0, y=0, z=3)
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_3.id)
    ).then_return(Point(0, 0, 3))

    decoy.when(mock_module_view.get_all()).then_return([])
    decoy.when(mock_labware_view.get_all()).then_return([])
    decoy.when(mock_addressable_area_view.get_all()).then_return([])

    min_travel_z = subject.get_min_travel_z(
        "pipette-id", "labware-id", location, min_z_height
    )

    assert min_travel_z == expected_min_z


def test_get_labware_position(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should return the slot position plus calibrated offset."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="reservoir-offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)

    position = subject.get_labware_position(labware_id="labware-id")

    assert position == Point(
        x=slot_pos[0] + well_plate_def.cornerOffsetFromSlot.x + 1,
        y=slot_pos[1] + well_plate_def.cornerOffsetFromSlot.y - 2,
        z=slot_pos[2] + well_plate_def.cornerOffsetFromSlot.z + 3,
    )


def test_get_well_position(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well top in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    result = subject.get_well_position("labware-id", "B2")

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x,
        y=slot_pos[1] - 2 + well_def.y,
        z=slot_pos[2] + 3 + well_def.z + well_def.depth,
    )


def test_get_well_height(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """It should be able to get the well height."""
    well_def = well_plate_def.wells["B2"]
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    assert subject.get_well_height("labware-id", "B2") == 10.67


def test_get_module_labware_well_position(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well top in a labware on module."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=ModuleLocation(moduleId="module-id"),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
    )
    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=4, y=5, z=6))
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=0, y=0, z=0),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        )
    )
    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.MAGNETIC_MODULE_V2
    )
    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            well_plate_def, ModuleModel.MAGNETIC_MODULE_V2
        )
    ).then_return(OverlapOffset(x=0, y=0, z=0))

    result = subject.get_well_position("labware-id", "B2")
    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 4,
        y=slot_pos[1] - 2 + well_def.y + 5,
        z=slot_pos[2] + 3 + well_def.z + well_def.depth + 6,
    )


def test_get_well_position_with_top_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well top in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=WellLocation(
            origin=WellOrigin.TOP,
            offset=WellOffset(x=1, y=2, z=3),
        ),
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 1,
        y=slot_pos[1] - 2 + well_def.y + 2,
        z=slot_pos[2] + 3 + well_def.z + well_def.depth + 3,
    )


def test_get_well_position_with_bottom_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well bottom in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=WellLocation(
            origin=WellOrigin.BOTTOM,
            offset=WellOffset(x=3, y=2, z=1),
        ),
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 3,
        y=slot_pos[1] - 2 + well_def.y + 2,
        z=slot_pos[2] + 3 + well_def.z + 1,
    )


def test_get_well_position_with_center_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well center in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=WellLocation(
            origin=WellOrigin.CENTER,
            offset=WellOffset(x=2, y=3, z=4),
        ),
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 2,
        y=slot_pos[1] - 2 + well_def.y + 3,
        z=slot_pos[2] + 3 + well_def.z + 4 + well_def.depth / 2.0,
    )


def test_get_well_position_with_meniscus_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well meniscus in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            probed_volume=None,
            probed_height=ProbedHeightInfo(height=70.5, last_probed=probe_time),
            loaded_volume=None,
        )
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=WellLocation(
            origin=WellOrigin.MENISCUS,
            offset=WellOffset(x=2, y=3, z=4),
        ),
        pipette_id="pipette-id",
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 2,
        y=slot_pos[1] - 2 + well_def.y + 3,
        z=slot_pos[2] + 3 + well_def.z + 4 + 70.5,
    )


def test_get_well_position_with_volume_offset_raises_error(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """Calling get_well_position with any volume offset should raise an error when there's no innerLabwareGeometry."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=ProbedHeightInfo(height=45.0, last_probed=probe_time),
            probed_volume=None,
        )
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "B2")).then_raise(
        errors.IncompleteLabwareDefinitionError("Woops!")
    )

    with pytest.raises(errors.IncompleteLabwareDefinitionError):
        subject.get_well_position(
            labware_id="labware-id",
            well_name="B2",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.MENISCUS,
                offset=WellOffset(x=2, y=3, z=4),
                volumeOffset="operationVolume",
            ),
            operation_volume=-1245.833,
            pipette_id="pipette-id",
        )


def test_get_well_position_with_meniscus_and_literal_volume_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well meniscus in a labware with a volume offset."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=ProbedHeightInfo(height=45.0, last_probed=probe_time),
            probed_volume=None,
        )
    )
    labware_def = _load_labware_definition_data()
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "B2")).then_return(
        inner_well_def
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=LiquidHandlingWellLocation(
            origin=WellOrigin.MENISCUS,
            offset=WellOffset(x=2, y=3, z=4),
            volumeOffset="operationVolume",
        ),
        operation_volume=-1245.833,
        pipette_id="pipette-id",
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 2,
        y=slot_pos[1] - 2 + well_def.y + 3,
        z=slot_pos[2] + 3 + well_def.z + 4 + 20.0,
    )


def test_get_well_position_with_meniscus_and_float_volume_offset(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well meniscus in a labware with a volume offset."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=ProbedHeightInfo(height=45.0, last_probed=probe_time),
            probed_volume=None,
        )
    )
    labware_def = _load_labware_definition_data()
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "B2")).then_return(
        inner_well_def
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=LiquidHandlingWellLocation(
            origin=WellOrigin.MENISCUS,
            offset=WellOffset(x=2, y=3, z=4),
            volumeOffset=-1245.833,
        ),
        pipette_id="pipette-id",
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 2,
        y=slot_pos[1] - 2 + well_def.y + 3,
        z=slot_pos[2] + 3 + well_def.z + 4 + 20.0,
    )


def test_get_well_position_raises_validation_error(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should raise a validation error when a volume offset is too large (ie location is below the well bottom)."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=ProbedHeightInfo(height=40.0, last_probed=probe_time),
            probed_volume=None,
        )
    )
    labware_def = _load_labware_definition_data()
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "B2")).then_return(
        inner_well_def
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)

    with pytest.raises(errors.OperationLocationNotInWellError):
        subject.get_well_position(
            labware_id="labware-id",
            well_name="B2",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.MENISCUS,
                offset=WellOffset(x=2, y=3, z=-40),
                volumeOffset="operationVolume",
            ),
            operation_volume=-100.0,
            pipette_id="pipette-id",
        )


def test_get_meniscus_height(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    mock_addressable_area_view: AddressableAreaView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should be able to get the position of a well meniscus in a labware."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "B2")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "B2")).then_return(
        WellLiquidInfo(
            loaded_volume=LoadedVolumeInfo(
                volume=2000.0, last_loaded=probe_time, operations_since_load=0
            ),
            probed_height=None,
            probed_volume=None,
        )
    )
    labware_def = _load_labware_definition_data()
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "B2")).then_return(
        inner_well_def
    )
    decoy.when(
        mock_pipette_view.get_current_tip_lld_settings(pipette_id="pipette-id")
    ).then_return(0.5)

    result = subject.get_well_position(
        labware_id="labware-id",
        well_name="B2",
        well_location=WellLocation(
            origin=WellOrigin.MENISCUS,
            offset=WellOffset(x=2, y=3, z=4),
        ),
        pipette_id="pipette-id",
    )

    assert result == Point(
        x=slot_pos[0] + 1 + well_def.x + 2,
        y=slot_pos[1] - 2 + well_def.y + 3,
        z=slot_pos[2] + 3 + well_def.z + 4 + 39.2423,
    )


def test_get_relative_well_location(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the relative location of a well given an absolute position."""
    labware_data = LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="definition-uri",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        offsetId="offset-id",
    )
    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    slot_pos = Point(4, 5, 6)
    well_def = well_plate_def.wells["B2"]

    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_4.id)
    ).then_return(slot_pos)
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    result = subject.get_relative_well_location(
        labware_id="labware-id",
        well_name="B2",
        absolute_point=Point(
            x=slot_pos[0] + 1 + well_def.x + 7,
            y=slot_pos[1] - 2 + well_def.y + 8,
            z=slot_pos[2] + 3 + well_def.z + well_def.depth + 9,
        ),
    )

    assert result == WellLocation(
        origin=WellOrigin.TOP,
        offset=WellOffset.model_construct(
            x=cast(float, pytest.approx(7)),
            y=cast(float, pytest.approx(8)),
            z=cast(float, pytest.approx(9)),
        ),
    )


def test_get_relative_liquid_handling_well_location(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the relative location of a well given an absolute position."""
    result = subject.get_relative_liquid_handling_well_location(
        labware_id="labware-id",
        well_name="B2",
        absolute_point=Point(x=0, y=0, z=-2),
        is_meniscus=True,
    )

    assert result == LiquidHandlingWellLocation(
        origin=WellOrigin.MENISCUS,
        offset=WellOffset.model_construct(
            x=0.0,
            y=0.0,
            z=cast(float, pytest.approx(-2)),
        ),
    )


def test_get_nominal_effective_tip_length(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should get the effective tip length from a labware ID and pipette config."""
    decoy.when(mock_labware_view.get_definition_uri("tip-rack-id")).then_return(
        LabwareUri("opentrons/opentrons_96_tiprack_300ul/1")
    )

    decoy.when(
        mock_pipette_view.get_nominal_tip_overlap(
            pipette_id="pipette-id",
            labware_uri=LabwareUri("opentrons/opentrons_96_tiprack_300ul/1"),
        )
    ).then_return(10)

    decoy.when(
        mock_labware_view.get_tip_length(labware_id="tip-rack-id", overlap=10)
    ).then_return(100)

    result = subject.get_nominal_effective_tip_length(
        labware_id="tip-rack-id",
        pipette_id="pipette-id",
    )

    assert result == 100


def test_get_nominal_tip_geometry(
    decoy: Decoy,
    tip_rack_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should get a "well's" tip geometry."""
    well_def = tip_rack_def.wells["B2"]

    decoy.when(mock_labware_view.get_definition_uri("tip-rack-id")).then_return(
        LabwareUri("opentrons/opentrons_96_tiprack_300ul/1")
    )

    decoy.when(mock_labware_view.get_well_definition("tip-rack-id", "B2")).then_return(
        well_def
    )

    decoy.when(
        mock_pipette_view.get_nominal_tip_overlap(
            pipette_id="pipette-id",
            labware_uri="opentrons/opentrons_96_tiprack_300ul/1",
        )
    ).then_return(10)

    decoy.when(
        mock_labware_view.get_tip_length(labware_id="tip-rack-id", overlap=10)
    ).then_return(100)

    result = subject.get_nominal_tip_geometry(
        pipette_id="pipette-id",
        labware_id="tip-rack-id",
        well_name="B2",
    )

    assert result.length == 100
    assert result.diameter == well_def.diameter
    assert result.volume == well_def.totalLiquidVolume


def test_get_nominal_tip_geometry_raises(
    decoy: Decoy,
    tip_rack_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """It should raise LabwareIsNotTipRackError if well is not circular."""
    well_def = tip_rack_def.wells["B2"]
    well_def.shape = "rectangular"

    decoy.when(mock_labware_view.get_well_definition("tip-rack-id", "B2")).then_return(
        well_def
    )

    with pytest.raises(errors.LabwareIsNotTipRackError):
        subject.get_nominal_tip_geometry(
            labware_id="tip-rack-id", well_name="B2", pipette_id="pipette-id"
        )


def test_get_tip_drop_location(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
    tip_rack_def: LabwareDefinition,
) -> None:
    """It should get relative drop tip location for a pipette/labware combo."""
    decoy.when(mock_labware_view.get_definition("tip-rack-id")).then_return(
        tip_rack_def
    )

    decoy.when(mock_pipette_view.get_return_tip_scale("pipette-id")).then_return(0.5)

    decoy.when(
        mock_labware_view.get_tip_drop_z_offset(
            labware_id="tip-rack-id", length_scale=0.5, additional_offset=3
        )
    ).then_return(1337)

    location = subject.get_checked_tip_drop_location(
        pipette_id="pipette-id",
        labware_id="tip-rack-id",
        well_location=DropTipWellLocation(
            origin=DropTipWellOrigin.DEFAULT,
            offset=WellOffset(x=1, y=2, z=3),
        ),
    )

    assert location == WellLocation(offset=WellOffset(x=1, y=2, z=1337))


def test_get_tip_drop_location_with_non_tiprack(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    subject: GeometryView,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should get relative drop tip location for a labware that is not a tiprack."""
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        reservoir_def
    )

    location = subject.get_checked_tip_drop_location(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_location=DropTipWellLocation(
            origin=DropTipWellOrigin.DEFAULT,
            offset=WellOffset(x=1, y=2, z=3),
        ),
    )

    assert location == WellLocation(
        origin=WellOrigin.TOP,
        offset=WellOffset(x=1, y=2, z=3),
    )


def test_get_tip_drop_explicit_location(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    subject: GeometryView,
    tip_rack_def: LabwareDefinition,
) -> None:
    """It should pass the location through if origin is not WellOrigin.DROP_TIP."""
    decoy.when(mock_labware_view.get_definition("tip-rack-id")).then_return(
        tip_rack_def
    )

    input_location = DropTipWellLocation(
        origin=DropTipWellOrigin.TOP,
        offset=WellOffset(x=1, y=2, z=3),
    )

    result = subject.get_checked_tip_drop_location(
        pipette_id="pipette-id", labware_id="tip-rack-id", well_location=input_location
    )

    assert result == WellLocation(
        origin=WellOrigin.TOP,
        offset=WellOffset(x=1, y=2, z=3),
    )


def test_get_ancestor_slot_name(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
) -> None:
    """It should get name of ancestor slot of labware."""
    decoy.when(mock_labware_view.get("labware-1")).then_return(
        LoadedLabware(
            id="labware-1",
            loadName="load-name",
            definitionUri="1234",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        )
    )
    assert subject.get_ancestor_slot_name("labware-1") == DeckSlotName.SLOT_4

    decoy.when(mock_labware_view.get("labware-2")).then_return(
        LoadedLabware(
            id="labware-2",
            loadName="load-name",
            definitionUri="4567",
            location=ModuleLocation(moduleId="4321"),
        )
    )
    decoy.when(mock_module_view.get_location("4321")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )
    assert subject.get_ancestor_slot_name("labware-2") == DeckSlotName.SLOT_1


def test_get_ancestor_slot_for_labware_stack_in_staging_area_slot(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """It should get name of ancestor slot of a stack of labware in a staging area slot."""
    decoy.when(mock_labware_view.get("labware-1")).then_return(
        LoadedLabware(
            id="labware-1",
            loadName="load-name",
            definitionUri="1234",
            location=AddressableAreaLocation(
                addressableAreaName=StagingSlotName.SLOT_D4.id
            ),
        )
    )
    decoy.when(mock_labware_view.get("labware-2")).then_return(
        LoadedLabware(
            id="labware-2",
            loadName="load-name",
            definitionUri="1234",
            location=OnLabwareLocation(labwareId="labware-1"),
        )
    )
    assert subject.get_ancestor_slot_name("labware-2") == StagingSlotName.SLOT_D4


def test_ensure_location_not_occupied_raises(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
) -> None:
    """It should raise error when labware is present in given location."""
    slot_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
    # Shouldn't raise if neither labware nor module in location
    assert subject.ensure_location_not_occupied(location=slot_location) == slot_location

    # Raise if labware in location
    decoy.when(
        mock_labware_view.raise_if_labware_in_location(slot_location)
    ).then_raise(errors.LocationIsOccupiedError("Woops!"))
    with pytest.raises(errors.LocationIsOccupiedError):
        subject.ensure_location_not_occupied(location=slot_location)

    # Raise if module in location
    module_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    decoy.when(
        mock_labware_view.raise_if_labware_in_location(module_location)
    ).then_return(None)
    decoy.when(
        mock_module_view.raise_if_module_in_location(module_location)
    ).then_raise(errors.LocationIsOccupiedError("Woops again!"))
    with pytest.raises(errors.LocationIsOccupiedError):
        subject.ensure_location_not_occupied(location=module_location)

    # Shouldn't raise for off-deck labware
    assert (
        subject.ensure_location_not_occupied(location=OFF_DECK_LOCATION)
        == OFF_DECK_LOCATION
    )


def test_get_labware_grip_point(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the grip point of the labware at the specified location."""
    decoy.when(
        mock_labware_view.get_grip_height_from_labware_bottom(
            sentinel.labware_definition
        )
    ).then_return(100)

    decoy.when(
        mock_addressable_area_view.get_addressable_area_center(DeckSlotName.SLOT_1.id)
    ).then_return(Point(x=101, y=102, z=103))
    labware_center = subject.get_labware_grip_point(
        labware_definition=sentinel.labware_definition,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    )

    assert labware_center == Point(101.0, 102.0, 203)


def test_get_labware_grip_point_on_labware(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should get the grip point of a labware on another labware."""
    decoy.when(mock_labware_view.get(labware_id="below-id")).then_return(
        LoadedLabware(
            id="below-id",
            loadName="below-name",
            definitionUri="1234",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        )
    )

    decoy.when(mock_labware_view.get_dimensions(labware_id="below-id")).then_return(
        Dimensions(x=1000, y=1001, z=11)
    )
    decoy.when(
        mock_labware_view.get_grip_height_from_labware_bottom(
            labware_definition=sentinel.definition
        )
    ).then_return(100)
    decoy.when(
        mock_labware_view.get_labware_overlap_offsets(sentinel.definition, "below-name")
    ).then_return(OverlapOffset(x=0, y=1, z=6))

    decoy.when(
        mock_addressable_area_view.get_addressable_area_center(DeckSlotName.SLOT_4.id)
    ).then_return(Point(x=5, y=9, z=10))

    grip_point = subject.get_labware_grip_point(
        labware_definition=sentinel.definition,
        location=OnLabwareLocation(labwareId="below-id"),
    )

    assert grip_point == Point(5, 10, 115.0)


def test_get_labware_grip_point_for_labware_on_module(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    ot2_standard_deck_def: DeckDefinitionV5,
    subject: GeometryView,
) -> None:
    """It should return the grip point for labware directly on a module."""
    decoy.when(
        mock_labware_view.get_grip_height_from_labware_bottom(
            sentinel.labware_definition
        )
    ).then_return(500)
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
    )
    decoy.when(mock_labware_view.get_deck_definition()).then_return(
        ot2_standard_deck_def
    )
    decoy.when(
        mock_module_view.get_nominal_offset_to_child(
            module_id="module-id",
            addressable_areas=mock_addressable_area_view,
        )
    ).then_return(LabwareOffsetVector(x=1, y=2, z=3))
    decoy.when(mock_module_view.get_connected_model("module-id")).then_return(
        ModuleModel.MAGNETIC_MODULE_V2
    )
    decoy.when(
        mock_labware_view.get_module_overlap_offsets(
            sentinel.labware_definition, ModuleModel.MAGNETIC_MODULE_V2
        )
    ).then_return(OverlapOffset(x=10, y=20, z=30))
    decoy.when(mock_module_view.get_module_calibration_offset("module-id")).then_return(
        ModuleOffsetData(
            moduleOffsetVector=ModuleOffsetVector(x=100, y=200, z=300),
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        )
    )
    decoy.when(
        mock_addressable_area_view.get_addressable_area_center(DeckSlotName.SLOT_4.id)
    ).then_return(Point(100, 200, 300))
    result_grip_point = subject.get_labware_grip_point(
        labware_definition=sentinel.labware_definition,
        location=ModuleLocation(moduleId="module-id"),
    )

    assert result_grip_point == Point(x=191, y=382, z=1073)


@pytest.mark.parametrize(
    argnames=["location", "should_dodge", "expected_waypoints"],
    argvalues=[
        (None, True, []),
        (None, False, []),
        (CurrentWell("pipette-id", "from-labware-id", "well-name"), False, []),
        (CurrentWell("pipette-id", "from-labware-id", "well-name"), True, [(11, 22)]),
        (CurrentAddressableArea("pipette-id", "area-name"), False, []),
        (CurrentAddressableArea("pipette-id", "area-name"), True, [(11, 22)]),
    ],
)
def test_get_extra_waypoints(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    mock_addressable_area_view: AddressableAreaView,
    location: Optional[CurrentPipetteLocation],
    should_dodge: bool,
    expected_waypoints: List[Tuple[float, float]],
    subject: GeometryView,
) -> None:
    """It should return extra waypoints if thermocycler should be dodged."""
    decoy.when(mock_labware_view.get("from-labware-id")).then_return(
        LoadedLabware(
            id="labware1",
            loadName="load-name1",
            definitionUri="1234",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        )
    )

    decoy.when(
        mock_addressable_area_view.get_addressable_area_base_slot("area-name")
    ).then_return(DeckSlotName.SLOT_1)

    decoy.when(
        mock_module_view.should_dodge_thermocycler(
            from_slot=DeckSlotName.SLOT_1, to_slot=DeckSlotName.SLOT_2
        )
    ).then_return(should_dodge)
    decoy.when(
        # Assume the subject's Config is for an OT-3, so use an OT-3 slot name.
        mock_addressable_area_view.get_addressable_area_center(
            addressable_area_name=DeckSlotName.SLOT_C2.id
        )
    ).then_return(Point(x=11, y=22, z=33))

    extra_waypoints = subject.get_extra_waypoints(location, DeckSlotName.SLOT_2)

    assert extra_waypoints == expected_waypoints


def test_get_slot_item(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
) -> None:
    """It should get items in certain slots."""
    labware = LoadedLabware.model_construct(id="cool-labware")  # type: ignore[call-arg]
    module = LoadedModule.model_construct(id="cool-module")  # type: ignore[call-arg]

    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_1)).then_return(None)
    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_2)).then_return(labware)
    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(None)

    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_1)).then_return(None)
    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_2)).then_return(None)
    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(module)

    assert (
        subject.get_slot_item(
            DeckSlotName.SLOT_1,
        )
        is None
    )
    assert subject.get_slot_item(DeckSlotName.SLOT_2) == labware
    assert subject.get_slot_item(DeckSlotName.SLOT_3) == module


def test_get_slot_item_that_is_overflowed_module(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
) -> None:
    """It should return the module that occupies the slot, even if not loaded on it."""
    module = LoadedModule.model_construct(id="cool-module")  # type: ignore[call-arg]
    decoy.when(mock_labware_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(None)
    decoy.when(mock_module_view.get_by_slot(DeckSlotName.SLOT_3)).then_return(None)
    decoy.when(
        mock_module_view.get_overflowed_module_in_slot(DeckSlotName.SLOT_3)
    ).then_return(module)
    assert subject.get_slot_item(DeckSlotName.SLOT_3) == module


@pytest.mark.parametrize(
    argnames=["slot_name", "expected_column"],
    argvalues=[
        (DeckSlotName.SLOT_3, 3),
        (DeckSlotName.SLOT_5, 2),
        (DeckSlotName.SLOT_7, 1),
        (DeckSlotName.SLOT_A1, 1),
        (DeckSlotName.SLOT_B2, 2),
        (DeckSlotName.SLOT_C3, 3),
    ],
)
def test_get_slot_column(
    subject: GeometryView,
    slot_name: DeckSlotName,
    expected_column: int,
) -> None:
    """It should return the correct column number for the slot."""
    assert subject.get_slot_column(slot_name) == expected_column


class DropTipLocationFinderSpec(NamedTuple):
    """Test data for get_next_tip_drop_location."""

    labware_slot: DeckSlotName
    well_size: float
    pipette_channels: int
    pipette_mount: MountType
    expected_locations: List[DropTipWellLocation]


# TODO (spp, 2023-06-22): need to test more trash-pipette-mount combinations
@pytest.mark.parametrize(
    argnames=DropTipLocationFinderSpec._fields,
    argvalues=[
        DropTipLocationFinderSpec(
            labware_slot=DeckSlotName.FIXED_TRASH,
            well_size=225,
            pipette_channels=1,
            pipette_mount=MountType.LEFT,
            expected_locations=[
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=-22, y=0, z=0)
                ),
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=-75, y=0, z=0)
                ),
            ],
        ),
        DropTipLocationFinderSpec(
            labware_slot=DeckSlotName.SLOT_3,
            well_size=225,
            pipette_channels=8,
            pipette_mount=MountType.RIGHT,
            expected_locations=[
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=75, y=0, z=0)
                ),
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=-75, y=0, z=0)
                ),
            ],
        ),
        DropTipLocationFinderSpec(
            labware_slot=DeckSlotName.SLOT_B3,
            well_size=225,
            pipette_channels=96,
            pipette_mount=MountType.LEFT,
            expected_locations=[
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=32, y=0, z=0)
                ),
                DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=-32, y=0, z=0)
                ),
            ],
        ),
    ],
)
def test_get_next_drop_tip_location(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
    labware_slot: DeckSlotName,
    well_size: float,
    pipette_channels: int,
    pipette_mount: MountType,
    expected_locations: List[DropTipWellLocation],
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: pipette_definition.AvailableSensorDefinition,
) -> None:
    """It should provide the next location to drop tips into within a labware."""
    decoy.when(mock_labware_view.is_fixed_trash(labware_id="abc")).then_return(True)
    decoy.when(
        mock_labware_view.get_well_size(labware_id="abc", well_name="A1")
    ).then_return((well_size, 0, 0))
    if pipette_channels == 96:
        pip_type = PipetteNameType.P1000_96
    elif pipette_channels == 8:
        pip_type = PipetteNameType.P300_MULTI
    else:
        pip_type = PipetteNameType.P300_SINGLE
    decoy.when(mock_pipette_view.get_config("pip-123")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=pipette_channels,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(pip_type),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
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
    )
    decoy.when(mock_pipette_view.get_mount("pip-123")).then_return(pipette_mount)
    decoy.when(mock_labware_view.get("abc")).then_return(
        LoadedLabware(
            id="abc",
            loadName="load-name2",
            definitionUri="4567",
            location=DeckSlotLocation(slotName=labware_slot),
        )
    )
    drop_location: List[DropTipWellLocation] = []
    for i in range(4):
        drop_location.append(
            subject.get_next_tip_drop_location(
                labware_id="abc", well_name="A1", pipette_id="pip-123"
            )
        )

    assert drop_location[0] == drop_location[2] == expected_locations[0]
    assert drop_location[1] == drop_location[3] == expected_locations[1]


def test_get_next_drop_tip_location_in_non_trash_labware(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_pipette_view: PipetteView,
    subject: GeometryView,
) -> None:
    """It should provide the default drop tip location when dropping into a non-fixed-trash labware."""
    decoy.when(mock_labware_view.is_fixed_trash(labware_id="abc")).then_return(False)
    assert subject.get_next_tip_drop_location(
        labware_id="abc", well_name="A1", pipette_id="pip-123"
    ) == DropTipWellLocation(
        origin=DropTipWellOrigin.DEFAULT,
        offset=WellOffset(x=0, y=0, z=0),
    )


def test_get_final_labware_movement_offset_vectors(
    decoy: Decoy,
    mock_module_view: ModuleView,
    mock_labware_view: LabwareView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should provide the final labware movement offset data based on locations."""
    decoy.when(mock_labware_view.get_deck_default_gripper_offsets()).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
            dropOffset=LabwareOffsetVector(x=3, y=2, z=1),
        )
    )
    decoy.when(mock_module_view.get_default_gripper_offsets("module-id")).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=11, y=22, z=33),
            dropOffset=LabwareOffsetVector(x=33, y=22, z=11),
        )
    )

    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )

    final_offsets = subject.get_final_labware_movement_offset_vectors(
        from_location=DeckSlotLocation(slotName=DeckSlotName("D2")),
        to_location=ModuleLocation(moduleId="module-id"),
        additional_offset_vector=LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=100, y=200, z=300),
            dropOffset=LabwareOffsetVector(x=400, y=500, z=600),
        ),
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert final_offsets == LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=101, y=202, z=303),
        dropOffset=LabwareOffsetVector(x=433, y=522, z=611),
    )


def test_ensure_valid_gripper_location(subject: GeometryView) -> None:
    """It should raise error if it's not a valid labware movement location for gripper."""
    slot_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    module_location = ModuleLocation(moduleId="dummy-module")
    on_labware_location = OnLabwareLocation(labwareId="adapter-id")
    off_deck_location = OFF_DECK_LOCATION

    assert subject.ensure_valid_gripper_location(slot_location) == slot_location
    assert subject.ensure_valid_gripper_location(module_location) == module_location
    assert (
        subject.ensure_valid_gripper_location(on_labware_location)
        == on_labware_location
    )

    with pytest.raises(errors.LabwareMovementNotAllowedError):
        subject.ensure_valid_gripper_location(off_deck_location)


def test_get_total_nominal_gripper_offset(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """It should calculate the correct gripper offsets given the location and move type.."""
    decoy.when(mock_labware_view.get_deck_default_gripper_offsets()).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
            dropOffset=LabwareOffsetVector(x=3, y=2, z=1),
        )
    )

    decoy.when(mock_module_view.get_default_gripper_offsets("module-id")).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=11, y=22, z=33),
            dropOffset=LabwareOffsetVector(x=33, y=22, z=11),
        )
    )

    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )

    # Case 1: labware on deck
    result1 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        move_type=_GripperMoveType.PICK_UP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-d"),
    )
    assert result1 == LabwareOffsetVector(x=1, y=2, z=3)

    # Case 2: labware on module
    result2 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=ModuleLocation(moduleId="module-id"),
        move_type=_GripperMoveType.DROP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert result2 == LabwareOffsetVector(x=33, y=22, z=11)


def test_get_stacked_labware_total_nominal_offset_slot_specific(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """Get nominal offset for stacked labware."""
    # Case: labware on adapter on module, adapter has slot-specific offsets
    decoy.when(mock_module_view.get_default_gripper_offsets("module-id")).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=11, y=22, z=33),
            dropOffset=LabwareOffsetVector(x=33, y=22, z=11),
        )
    )
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_C1)
    )
    decoy.when(
        mock_labware_view.get_child_gripper_offsets(
            labware_id="adapter-id", slot_name=DeckSlotName.SLOT_C1
        )
    ).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=100, y=200, z=300),
            dropOffset=LabwareOffsetVector(x=300, y=200, z=100),
        )
    )
    decoy.when(mock_labware_view.get_parent_location("adapter-id")).then_return(
        ModuleLocation(moduleId="module-id")
    )
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_module_view._state.requested_model_by_id).then_return(
        {"module-id": ModuleModel.HEATER_SHAKER_MODULE_V1}
    )
    result1 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=OnLabwareLocation(labwareId="adapter-id"),
        move_type=_GripperMoveType.PICK_UP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert result1 == LabwareOffsetVector(x=111, y=222, z=333)

    result2 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=OnLabwareLocation(labwareId="adapter-id"),
        move_type=_GripperMoveType.DROP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert result2 == LabwareOffsetVector(x=333, y=222, z=111)


def test_get_stacked_labware_total_nominal_offset_default(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_module_view: ModuleView,
    subject: GeometryView,
    well_plate_def: LabwareDefinition,
) -> None:
    """Get nominal offset for stacked labware."""
    # Case: labware on adapter on module, adapter has only default offsets
    decoy.when(mock_module_view.get_default_gripper_offsets("module-id")).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=11, y=22, z=33),
            dropOffset=LabwareOffsetVector(x=33, y=22, z=11),
        )
    )
    decoy.when(mock_module_view.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
    )
    decoy.when(
        mock_labware_view.get_child_gripper_offsets(
            labware_id="adapter-id", slot_name=DeckSlotName.SLOT_C1
        )
    ).then_return(None)
    decoy.when(
        mock_labware_view.get_child_gripper_offsets(
            labware_id="adapter-id", slot_name=None
        )
    ).then_return(
        LabwareMovementOffsetData(
            pickUpOffset=LabwareOffsetVector(x=100, y=200, z=300),
            dropOffset=LabwareOffsetVector(x=300, y=200, z=100),
        )
    )
    decoy.when(mock_labware_view.get_parent_location("adapter-id")).then_return(
        ModuleLocation(moduleId="module-id")
    )
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(
        well_plate_def
    )
    decoy.when(mock_module_view._state.requested_model_by_id).then_return(
        {"module-id": ModuleModel.HEATER_SHAKER_MODULE_V1}
    )
    result1 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=OnLabwareLocation(labwareId="adapter-id"),
        move_type=_GripperMoveType.PICK_UP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert result1 == LabwareOffsetVector(x=111, y=222, z=333)

    result2 = subject.get_total_nominal_gripper_offset_for_move_type(
        location=OnLabwareLocation(labwareId="adapter-id"),
        move_type=_GripperMoveType.DROP_LABWARE,
        current_labware=mock_labware_view.get_definition("labware-id"),
    )
    assert result2 == LabwareOffsetVector(x=333, y=222, z=111)


def test_check_gripper_labware_tip_collision(
    decoy: Decoy,
    mock_pipette_view: PipetteView,
    mock_labware_view: LabwareView,
    mock_addressable_area_view: AddressableAreaView,
    subject: GeometryView,
) -> None:
    """It should raise a labware movement error if attached tips will collide with the labware during a gripper lift."""
    pipettes = [
        LoadedPipette(
            id="pipette-id",
            mount=MountType.LEFT,
            pipetteName=PipetteNameType.P1000_96,
        )
    ]
    decoy.when(mock_pipette_view.get_all()).then_return(pipettes)
    decoy.when(mock_pipette_view.get_attached_tip("pipette-id")).then_return(
        TipGeometry(
            length=1000,
            diameter=1000,
            volume=1000,
        )
    )

    definition = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        namespace="hello",
        dimensions=LabwareDimensions.model_construct(
            yDimension=1, zDimension=2, xDimension=3
        ),
        version=1,
        parameters=LabwareDefinitionParameters.model_construct(
            format="96Standard",
            loadName="labware-id",
            isTiprack=True,
            isMagneticModuleCompatible=False,
        ),
        cornerOffsetFromSlot=CornerOffsetFromSlot.model_construct(x=1, y=2, z=3),
        ordering=[],
    )

    labware_data = LoadedLabware(
        id="labware-id",
        loadName="b",
        definitionUri=uri_from_details(
            namespace="hello", load_name="labware-id", version=1
        ),
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=None,
    )

    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(definition)
    decoy.when(mock_labware_view.get("labware-id")).then_return(labware_data)

    decoy.when(
        mock_addressable_area_view.get_addressable_area_position(DeckSlotName.SLOT_1.id)
    ).then_return(Point(1, 2, 3))

    calibration_offset = LabwareOffsetVector(x=1, y=-2, z=3)
    decoy.when(mock_labware_view.get_labware_offset_vector("labware-id")).then_return(
        calibration_offset
    )
    decoy.when(subject.get_labware_origin_position("labware-id")).then_return(
        Point(1, 2, 3)
    )
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(definition)
    decoy.when(subject._get_highest_z_from_labware_data(labware_data)).then_return(1000)

    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(definition)
    decoy.when(subject.get_labware_highest_z("labware-id")).then_return(100.0)
    decoy.when(
        mock_addressable_area_view.get_addressable_area_center(
            addressable_area_name=DeckSlotName.SLOT_1.id
        )
    ).then_return(Point(x=11, y=22, z=33))
    decoy.when(
        mock_labware_view.get_grip_height_from_labware_bottom(definition)
    ).then_return(1.0)
    decoy.when(mock_labware_view.get_definition("labware-id")).then_return(definition)
    decoy.when(
        subject.get_labware_grip_point(
            labware_definition=definition,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        )
    ).then_return(Point(x=100.0, y=100.0, z=0.0))

    with pytest.raises(errors.LabwareMovementNotAllowedError):
        subject.check_gripper_labware_tip_collision(
            gripper_homed_position_z=166.125,
            labware_id="labware-id",
            current_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        )


# Note: Below here, all tests should be done using actual state objects rather than mocks of dependent views.
# I (sf) think this is a better way to do things, but let's try and do it as we add more stuff and see if I'm
# right!


@pytest.mark.parametrize("use_mocks", [False])
def test_get_offset_location_deck_slot(
    decoy: Decoy,
    labware_store: LabwareStore,
    nice_labware_definition: LabwareDefinition,
    subject: GeometryView,
) -> None:
    """Test if you can get the offset location of a labware in a deck slot."""
    action = SucceedCommandAction(
        command=LoadLabware(
            id="load-labware-1",
            createdAt=datetime.now(),
            key="load-labware-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadLabwareResult(
                labwareId="labware-id-1",
                definition=nice_labware_definition,
                offsetId=None,
            ),
            params=LoadLabwareParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
                loadName=nice_labware_definition.parameters.loadName,
                namespace=nice_labware_definition.namespace,
                version=nice_labware_definition.version,
            ),
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id-1",
                definition=nice_labware_definition,
                offset_id=None,
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
                display_name=None,
            )
        ),
    )
    labware_store.handle_action(action)
    offset_location = subject.get_offset_location("labware-id-1")
    assert offset_location == [
        OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="C2")
    ]


@pytest.mark.parametrize("use_mocks", [False])
def test_get_offset_location_module(
    decoy: Decoy,
    labware_store: LabwareStore,
    module_store: ModuleStore,
    nice_labware_definition: LabwareDefinition,
    tempdeck_v2_def: ModuleDefinition,
    subject: GeometryView,
) -> None:
    """Test if you can get the offset of a labware directly on a module."""
    load_module = SucceedCommandAction(
        command=LoadModule(
            params=LoadModuleParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A3),
                model=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="load-module-1",
            createdAt=datetime.now(),
            key="load-module-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadModuleResult(
                moduleId="module-id-1",
                definition=tempdeck_v2_def,
                model=tempdeck_v2_def.model,
            ),
        ),
    )
    load_labware = SucceedCommandAction(
        command=LoadLabware(
            id="load-labware-1",
            createdAt=datetime.now(),
            key="load-labware-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadLabwareResult(
                labwareId="labware-id-1",
                definition=nice_labware_definition,
                offsetId=None,
            ),
            params=LoadLabwareParams(
                location=ModuleLocation(moduleId="module-id-1"),
                loadName=nice_labware_definition.parameters.loadName,
                namespace=nice_labware_definition.namespace,
                version=nice_labware_definition.version,
            ),
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id-1",
                definition=nice_labware_definition,
                offset_id=None,
                new_location=ModuleLocation(moduleId="module-id-1"),
                display_name=None,
            )
        ),
    )

    module_store.handle_action(load_module)
    labware_store.handle_action(load_labware)
    offset_location = subject.get_offset_location("labware-id-1")
    assert offset_location == [
        OnModuleOffsetLocationSequenceComponent(
            moduleModel=ModuleModel.TEMPERATURE_MODULE_V2
        ),
        OnAddressableAreaOffsetLocationSequenceComponent(
            addressableAreaName="temperatureModuleV2A3"
        ),
    ]


@pytest.mark.parametrize("use_mocks", [False])
def test_get_offset_location_module_with_adapter(
    decoy: Decoy,
    labware_store: LabwareStore,
    module_store: ModuleStore,
    nice_labware_definition: LabwareDefinition,
    nice_adapter_definition: LabwareDefinition,
    tempdeck_v2_def: ModuleDefinition,
    labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """Test if you can get the offset of a labware directly on a module."""
    load_module = SucceedCommandAction(
        command=LoadModule(
            params=LoadModuleParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A3),
                model=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="load-module-1",
            createdAt=datetime.now(),
            key="load-module-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadModuleResult(
                moduleId="module-id-1",
                definition=tempdeck_v2_def,
                model=tempdeck_v2_def.model,
            ),
        ),
    )
    load_adapter = SucceedCommandAction(
        command=LoadLabware(
            id="load-adapter-1",
            createdAt=datetime.now(),
            key="load-adapter-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadLabwareResult(
                labwareId="adapter-id-1",
                definition=nice_adapter_definition,
                offsetId=None,
            ),
            params=LoadLabwareParams(
                location=ModuleLocation(moduleId="module-id-1"),
                loadName=nice_adapter_definition.parameters.loadName,
                namespace=nice_adapter_definition.namespace,
                version=nice_adapter_definition.version,
            ),
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="adapter-id-1",
                definition=nice_adapter_definition,
                offset_id=None,
                new_location=ModuleLocation(moduleId="module-id-1"),
                display_name=None,
            )
        ),
    )
    load_labware = SucceedCommandAction(
        command=LoadLabware(
            id="load-labware-1",
            createdAt=datetime.now(),
            key="load-labware-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadLabwareResult(
                labwareId="labware-id-1",
                definition=nice_labware_definition,
                offsetId=None,
            ),
            params=LoadLabwareParams(
                location=OnLabwareLocation(labwareId="adapter-id-1"),
                loadName=nice_labware_definition.parameters.loadName,
                namespace=nice_labware_definition.namespace,
                version=nice_labware_definition.version,
            ),
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id-1",
                definition=nice_labware_definition,
                offset_id=None,
                new_location=OnLabwareLocation(labwareId="adapter-id-1"),
                display_name=None,
            )
        ),
    )
    module_store.handle_action(load_module)
    labware_store.handle_action(load_adapter)
    labware_store.handle_action(load_labware)
    offset_location = subject.get_offset_location("labware-id-1")
    assert offset_location == [
        OnLabwareOffsetLocationSequenceComponent(
            labwareUri=labware_view.get_uri_from_definition(nice_adapter_definition)
        ),
        OnModuleOffsetLocationSequenceComponent(
            moduleModel=ModuleModel.TEMPERATURE_MODULE_V2
        ),
        OnAddressableAreaOffsetLocationSequenceComponent(
            addressableAreaName="temperatureModuleV2A3"
        ),
    ]


@pytest.mark.parametrize("use_mocks", [False])
def test_get_offset_fails_with_off_deck_labware(
    decoy: Decoy,
    labware_store: LabwareStore,
    nice_labware_definition: LabwareDefinition,
    subject: GeometryView,
) -> None:
    """You cannot get the offset location for a labware loaded OFF_DECK."""
    action = SucceedCommandAction(
        command=LoadLabware(
            id="load-labware-1",
            createdAt=datetime.now(),
            key="load-labware-1",
            status=CommandStatus.SUCCEEDED,
            result=LoadLabwareResult(
                labwareId="labware-id-1",
                definition=nice_labware_definition,
                offsetId=None,
            ),
            params=LoadLabwareParams(
                location=OFF_DECK_LOCATION,
                loadName=nice_labware_definition.parameters.loadName,
                namespace=nice_labware_definition.namespace,
                version=nice_labware_definition.version,
            ),
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id-1",
                definition=nice_labware_definition,
                offset_id=None,
                new_location=OFF_DECK_LOCATION,
                display_name=None,
            )
        ),
    )
    labware_store.handle_action(action)
    offset_location = subject.get_offset_location("labware-id-1")
    assert offset_location is None


@pytest.mark.parametrize("frustum", RECTANGULAR_TEST_EXAMPLES)
def test_rectangular_frustum_math_helpers(
    decoy: Decoy,
    frustum: Dict[str, List[float]],
    subject: GeometryView,
) -> None:
    """Test both height and volume calculation within a given rectangular frustum."""
    total_frustum_height = frustum["height"][0]
    bottom_length = frustum["length"][-1]
    bottom_width = frustum["width"][-1]

    def _find_volume_from_height_(index: int) -> None:
        nonlocal total_frustum_height, bottom_width, bottom_length
        top_length = frustum["length"][index]
        top_width = frustum["width"][index]
        target_height = frustum["height"][index]

        found_volume = _volume_from_height_rectangular(
            target_height=target_height,
            total_frustum_height=total_frustum_height,
            top_length=top_length,
            bottom_length=bottom_length,
            top_width=top_width,
            bottom_width=bottom_width,
        )

        found_height = _height_from_volume_rectangular(
            volume=found_volume,
            total_frustum_height=total_frustum_height,
            top_length=top_length,
            bottom_length=bottom_length,
            top_width=top_width,
            bottom_width=bottom_width,
        )

        assert isclose(found_height, frustum["height"][index])

    for i in range(len(frustum["height"])):
        _find_volume_from_height_(i)


@pytest.mark.parametrize("frustum", CIRCULAR_TEST_EXAMPLES)
def test_circular_frustum_math_helpers(
    decoy: Decoy,
    frustum: Dict[str, List[float]],
    subject: GeometryView,
) -> None:
    """Test both height and volume calculation within a given circular frustum."""
    total_frustum_height = frustum["height"][0]
    bottom_radius = frustum["radius"][-1]

    def _find_volume_from_height_(index: int) -> None:
        nonlocal total_frustum_height, bottom_radius
        top_radius = frustum["radius"][index]
        target_height = frustum["height"][index]
        segment = ConicalFrustum(
            shape="conical",
            bottomDiameter=bottom_radius * 2,
            topDiameter=top_radius * 2,
            topHeight=total_frustum_height,
            bottomHeight=0.0,
            xCount=1,
            yCount=1,
        )
        found_volume = _volume_from_height_circular(
            target_height=target_height,
            segment=segment,
        )

        found_height = _height_from_volume_circular(
            target_volume=found_volume,
            segment=segment,
        )

        assert isclose(found_height, frustum["height"][index])

    for i in range(len(frustum["height"])):
        _find_volume_from_height_(i)


def test_validate_dispense_volume_into_well_bottom(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    mock_labware_view: LabwareView,
    subject: GeometryView,
) -> None:
    """It should raise an InvalidDispenseVolumeError if too much volume is specified."""
    well_def = well_plate_def.wells["B2"]
    decoy.when(mock_labware_view.get_well_definition("labware-id", "B2")).then_return(
        well_def
    )

    with pytest.raises(errors.InvalidDispenseVolumeError):
        subject.validate_dispense_volume_into_well(
            labware_id="labware-id",
            well_name="B2",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.BOTTOM,
                offset=WellOffset(x=2, y=3, z=4),
            ),
            volume=400.0,
        )


def test_validate_dispense_volume_into_well_meniscus(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    subject: GeometryView,
) -> None:
    """It should raise an InvalidDispenseVolumeError if too much volume is specified."""
    labware_def = _load_labware_definition_data()
    assert labware_def.wells is not None
    well_def = labware_def.wells["A1"]
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]

    decoy.when(mock_labware_view.get_well_definition("labware-id", "A1")).then_return(
        well_def
    )
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "A1")).then_return(
        inner_well_def
    )
    probe_time = datetime.now()
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        probe_time
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=ProbedHeightInfo(height=40.0, last_probed=probe_time),
            probed_volume=None,
        )
    )

    with pytest.raises(errors.InvalidDispenseVolumeError):
        subject.validate_dispense_volume_into_well(
            labware_id="labware-id",
            well_name="A1",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.MENISCUS,
                offset=WellOffset(x=2, y=3, z=4),
            ),
            volume=1100000.0,
        )


def test_get_latest_volume_information(
    decoy: Decoy,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    subject: GeometryView,
) -> None:
    """It should raise an InvalidDispenseVolumeError if too much volume is specified."""
    # Setup
    labware_def = _load_labware_definition_data()
    assert labware_def.wells is not None
    well_def = labware_def.wells["A1"]
    assert labware_def.innerLabwareGeometry is not None
    inner_well_def = labware_def.innerLabwareGeometry["welldefinition1111"]

    load_time = datetime.min
    probe_time = datetime.now()

    decoy.when(mock_labware_view.get_well_definition("labware-id", "A1")).then_return(
        well_def
    )
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "A1")).then_return(
        inner_well_def
    )
    ten_ul_height = subject.get_well_height_at_volume(
        labware_id="labware-id", well_name="A1", volume=10.0
    )
    twenty_ul_height = subject.get_well_height_at_volume(
        labware_id="labware-id", well_name="A1", volume=20.0
    )

    # Make sure Get height with no information raises an error
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        None
    )
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=None,
            probed_height=None,
            probed_volume=None,
        )
    )
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        None
    )

    with pytest.raises(errors.LiquidHeightUnknownError):
        subject.get_meniscus_height(labware_id="labware-id", well_name="A1")
    # Make sure get height with a valid load returns the correct height
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=LoadedVolumeInfo(
                volume=10.0, last_loaded=load_time, operations_since_load=0
            ),
            probed_height=None,
            probed_volume=None,
        )
    )

    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        load_time
    )
    assert (
        subject.get_meniscus_height(labware_id="labware-id", well_name="A1")
        == ten_ul_height
    )

    # Make sure that if there is a probe after a load that we get the correct height
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=LoadedVolumeInfo(
                volume=10.0, last_loaded=load_time, operations_since_load=0
            ),
            probed_height=ProbedHeightInfo(height=40.0, last_probed=probe_time),
            probed_volume=None,
        )
    )
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        probe_time
    )

    assert subject.get_meniscus_height(labware_id="labware-id", well_name="A1") == 40.0

    # Simulate a pipetting action and make sure we get the height based on the most current one
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=LoadedVolumeInfo(
                volume=10.0, last_loaded=load_time, operations_since_load=1
            ),
            probed_height=None,
            probed_volume=ProbedVolumeInfo(
                volume=20.0, last_probed=probe_time, operations_since_probe=1
            ),
        )
    )
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        probe_time
    )
    assert (
        subject.get_meniscus_height(labware_id="labware-id", well_name="A1")
        == twenty_ul_height
    )

    # Simulate a calling load_liquid after a probe and make sure we get the height based on the load_liquid
    decoy.when(mock_well_view.get_well_liquid_info("labware-id", "A1")).then_return(
        WellLiquidInfo(
            loaded_volume=LoadedVolumeInfo(
                volume=10.0, last_loaded=datetime.max, operations_since_load=0
            ),
            probed_height=ProbedHeightInfo(height=40.0, last_probed=probe_time),
            probed_volume=ProbedVolumeInfo(
                volume=20.0, last_probed=probe_time, operations_since_probe=0
            ),
        )
    )
    decoy.when(mock_well_view.get_last_liquid_update("labware-id", "A1")).then_return(
        datetime.max
    )
    assert (
        subject.get_meniscus_height(labware_id="labware-id", well_name="A1")
        == ten_ul_height
    )


@pytest.mark.parametrize(
    [
        "labware_id",
        "well_name",
        "input_volume_bottom",
        "input_volume_top",
        "expected_height_from_bottom_mm",
        "expected_height_from_top_mm",
    ],
    INNER_WELL_GEOMETRY_TEST_PARAMS,
)
def test_get_well_height_at_volume(
    decoy: Decoy,
    subject: GeometryView,
    labware_id: str,
    well_name: str,
    input_volume_bottom: float,
    input_volume_top: float,
    expected_height_from_bottom_mm: float,
    expected_height_from_top_mm: float,
    mock_labware_view: LabwareView,
) -> None:
    """Test getting the well height at a given volume."""

    def _get_labware_def() -> LabwareDefinition:
        def_dir = str(get_shared_data_root()) + f"/labware/definitions/3/{labware_id}"
        version_str = max([str(version) for version in listdir(def_dir)])
        def_path = path.join(def_dir, version_str)
        _labware_def = LabwareDefinition.model_validate(
            json.loads(load_shared_data(def_path).decode("utf-8"))
        )
        return _labware_def

    labware_def = _get_labware_def()
    assert labware_def.innerLabwareGeometry is not None
    well_geometry = labware_def.innerLabwareGeometry.get(well_name)
    assert well_geometry is not None
    well_definition = [
        well
        for well in labware_def.wells.values()
        if well.geometryDefinitionId == well_name
    ][0]

    decoy.when(mock_labware_view.get_well_geometry(labware_id, well_name)).then_return(
        well_geometry
    )
    decoy.when(
        mock_labware_view.get_well_definition(labware_id, well_name)
    ).then_return(well_definition)

    found_height_bottom = subject.get_well_height_at_volume(
        labware_id=labware_id, well_name=well_name, volume=input_volume_bottom
    )
    found_height_top = subject.get_well_height_at_volume(
        labware_id=labware_id, well_name=well_name, volume=input_volume_top
    )
    assert isclose(found_height_bottom, expected_height_from_bottom_mm, rel_tol=0.01)
    vol_2_expected_height_from_bottom = (
        subject.get_well_height(labware_id=labware_id, well_name=well_name)
        - expected_height_from_top_mm
    )
    assert isclose(found_height_top, vol_2_expected_height_from_bottom, rel_tol=0.01)


@pytest.mark.parametrize(
    [
        "labware_id",
        "well_name",
        "expected_volume_bottom",
        "expected_volume_top",
        "input_height_from_bottom_mm",
        "input_height_from_top_mm",
    ],
    INNER_WELL_GEOMETRY_TEST_PARAMS,
)
def test_get_well_volume_at_height(
    decoy: Decoy,
    subject: GeometryView,
    labware_id: str,
    well_name: str,
    expected_volume_bottom: float,
    expected_volume_top: float,
    input_height_from_bottom_mm: float,
    input_height_from_top_mm: float,
    mock_labware_view: LabwareView,
) -> None:
    """Test getting the volume at a given height."""

    def _get_labware_def() -> LabwareDefinition:
        def_dir = str(get_shared_data_root()) + f"/labware/definitions/3/{labware_id}"
        version_str = max([str(version) for version in listdir(def_dir)])
        def_path = path.join(def_dir, version_str)
        _labware_def = LabwareDefinition.model_validate(
            json.loads(load_shared_data(def_path).decode("utf-8"))
        )
        return _labware_def

    labware_def = _get_labware_def()
    assert labware_def.innerLabwareGeometry is not None
    well_geometry = labware_def.innerLabwareGeometry.get(well_name)
    assert well_geometry is not None
    well_definition = [
        well
        for well in labware_def.wells.values()
        if well.geometryDefinitionId == well_name
    ][0]

    decoy.when(mock_labware_view.get_well_geometry(labware_id, well_name)).then_return(
        well_geometry
    )
    decoy.when(
        mock_labware_view.get_well_definition(labware_id, well_name)
    ).then_return(well_definition)

    found_volume_bottom = subject.get_well_volume_at_height(
        labware_id=labware_id, well_name=well_name, height=input_height_from_bottom_mm
    )
    vol_2_input_height_from_bottom = (
        subject.get_well_height(labware_id=labware_id, well_name=well_name)
        - input_height_from_top_mm
    )
    found_volume_top = subject.get_well_volume_at_height(
        labware_id=labware_id,
        well_name=well_name,
        height=vol_2_input_height_from_bottom,
    )
    assert isclose(found_volume_bottom, expected_volume_bottom, rel_tol=0.01)
    assert isclose(found_volume_top, expected_volume_top, rel_tol=0.01)
