"""Tests for module state accessors in the protocol engine state store.

DEPRECATED: Testing ModuleView independently of ModuleView is no longer helpful.
Try to add new tests to test_module_state.py, where they can be tested together,
treating ModuleState as a private implementation detail.
"""
import pytest
from math import isclose
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]

from contextlib import nullcontext as does_not_raise
from typing import (
    ContextManager,
    Dict,
    NamedTuple,
    Optional,
    Type,
    Union,
    Any,
    List,
    Set,
    cast,
)

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck.types import DeckDefinitionV5

from opentrons_shared_data import load_shared_data
from opentrons.types import DeckSlotName, MountType
from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    LoadedModule,
    DeckSlotLocation,
    ModuleDefinition,
    ModuleModel,
    LabwareOffsetVector,
    DeckType,
    ModuleOffsetData,
    HeaterShakerLatchStatus,
    LabwareMovementOffsetData,
    AddressableArea,
    DeckConfigurationType,
    PotentialCutoutFixture,
)
from opentrons.protocol_engine.state.modules import (
    ModuleView,
    ModuleState,
    HardwareModule,
)
from opentrons.protocol_engine.state.addressable_areas import (
    AddressableAreaView,
    AddressableAreaState,
)

from opentrons.protocol_engine.state.module_substates import (
    HeaterShakerModuleSubState,
    HeaterShakerModuleId,
    MagneticModuleSubState,
    MagneticModuleId,
    TemperatureModuleSubState,
    TemperatureModuleId,
    ThermocyclerModuleSubState,
    ThermocyclerModuleId,
    ModuleSubStateType,
)
from opentrons_shared_data.deck import load as load_deck
from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT3_DECK,
)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 5)


def get_addressable_area_view(
    loaded_addressable_areas_by_name: Optional[Dict[str, AddressableArea]] = None,
    potential_cutout_fixtures_by_cutout_id: Optional[
        Dict[str, Set[PotentialCutoutFixture]]
    ] = None,
    deck_definition: Optional[DeckDefinitionV5] = None,
    deck_configuration: Optional[DeckConfigurationType] = None,
    robot_type: RobotType = "OT-3 Standard",
    use_simulated_deck_config: bool = False,
) -> AddressableAreaView:
    """Get a labware view test subject."""
    state = AddressableAreaState(
        loaded_addressable_areas_by_name=loaded_addressable_areas_by_name or {},
        potential_cutout_fixtures_by_cutout_id=potential_cutout_fixtures_by_cutout_id
        or {},
        deck_definition=deck_definition or cast(DeckDefinitionV5, {"otId": "fake"}),
        deck_configuration=deck_configuration or [],
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
        robot_type=robot_type,
        use_simulated_deck_config=use_simulated_deck_config,
    )

    return AddressableAreaView(state=state)


def make_module_view(
    deck_type: Optional[DeckType] = None,
    slot_by_module_id: Optional[Dict[str, Optional[DeckSlotName]]] = None,
    requested_model_by_module_id: Optional[Dict[str, Optional[ModuleModel]]] = None,
    hardware_by_module_id: Optional[Dict[str, HardwareModule]] = None,
    substate_by_module_id: Optional[Dict[str, ModuleSubStateType]] = None,
    module_offset_by_serial: Optional[Dict[str, ModuleOffsetData]] = None,
    additional_slots_occupied_by_module_id: Optional[
        Dict[str, List[DeckSlotName]]
    ] = None,
) -> ModuleView:
    """Get a module view test subject with the specified state."""
    state = ModuleState(
        deck_type=deck_type or DeckType.OT2_STANDARD,
        slot_by_module_id=slot_by_module_id or {},
        requested_model_by_id=requested_model_by_module_id or {},
        hardware_by_module_id=hardware_by_module_id or {},
        substate_by_module_id=substate_by_module_id or {},
        module_offset_by_serial=module_offset_by_serial or {},
        additional_slots_occupied_by_module_id=additional_slots_occupied_by_module_id
        or {},
        deck_fixed_labware=[],
    )

    return ModuleView(state=state)


def get_sample_parent_module_view(
    matching_module_def: ModuleDefinition,
    matching_module_id: str,
) -> ModuleView:
    """Get a ModuleView with attached modules including a requested matching module."""
    definition = load_shared_data("module/definitions/2/magneticModuleV1.json")
    magdeck_def = ModuleDefinition.model_validate_json(definition)

    return make_module_view(
        slot_by_module_id={
            "id-non-matching": DeckSlotName.SLOT_1,
            matching_module_id: DeckSlotName.SLOT_2,
            "id-another-non-matching": DeckSlotName.SLOT_3,
        },
        hardware_by_module_id={
            "id-non-matching": HardwareModule(
                serial_number="serial-non-matching",
                definition=magdeck_def,
            ),
            matching_module_id: HardwareModule(
                serial_number="serial-matching",
                definition=matching_module_def,
            ),
            "id-another-non-matching": HardwareModule(
                serial_number="serial-another-non-matching",
                definition=magdeck_def,
            ),
        },
    )


def test_initial_module_data_by_id() -> None:
    """It should raise if module ID doesn't exist."""
    subject = make_module_view()

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get("helloWorld")


def test_get_missing_hardware() -> None:
    """It should raise if no loaded hardware."""
    subject = make_module_view(slot_by_module_id={"module-id": DeckSlotName.SLOT_1})

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get("module-id")


def test_get_module_data(tempdeck_v1_def: ModuleDefinition) -> None:
    """It should get module data from state by ID."""
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v1_def,
            )
        },
    )

    assert subject.get("module-id") == LoadedModule(
        id="module-id",
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        serialNumber="serial-number",
    )


def test_get_location(tempdeck_v1_def: ModuleDefinition) -> None:
    """It should return the module's location or raise."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
            "module-2": None,
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=tempdeck_v1_def,
            ),
            "module-2": HardwareModule(
                serial_number="serial-2",
                definition=tempdeck_v1_def,
            ),
        },
    )

    assert subject.get_location("module-1") == DeckSlotLocation(
        slotName=DeckSlotName.SLOT_1
    )

    with pytest.raises(errors.ModuleNotOnDeckError):
        assert subject.get_location("module-2")


def test_get_all_modules(
    tempdeck_v1_def: ModuleDefinition,
    tempdeck_v2_def: ModuleDefinition,
) -> None:
    """It should return all modules in state."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
            "module-2": DeckSlotName.SLOT_2,
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=tempdeck_v1_def,
            ),
            "module-2": HardwareModule(
                serial_number="serial-2",
                definition=tempdeck_v2_def,
            ),
        },
    )

    assert subject.get_all() == [
        LoadedModule(
            id="module-1",
            serialNumber="serial-1",
            model=ModuleModel.TEMPERATURE_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        LoadedModule(
            id="module-2",
            serialNumber="serial-2",
            model=ModuleModel.TEMPERATURE_MODULE_V2,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
        ),
    ]


def test_get_properties_by_id(
    tempdeck_v2_def: ModuleDefinition,
    magdeck_v1_def: ModuleDefinition,
    mag_block_v1_def: ModuleDefinition,
) -> None:
    """It should return a loaded module's properties by ID."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
            "module-2": DeckSlotName.SLOT_2,
            "module-3": DeckSlotName.SLOT_3,
        },
        requested_model_by_module_id={
            "module-1": ModuleModel.TEMPERATURE_MODULE_V1,
            "module-2": ModuleModel.MAGNETIC_MODULE_V1,
            "module-3": ModuleModel.MAGNETIC_BLOCK_V1,
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                # Intentionally different from requested model.
                definition=tempdeck_v2_def,
            ),
            "module-2": HardwareModule(
                serial_number="serial-2",
                definition=magdeck_v1_def,
            ),
            "module-3": HardwareModule(serial_number=None, definition=mag_block_v1_def),
        },
    )

    assert subject.get_definition("module-1") == tempdeck_v2_def
    assert subject.get_dimensions("module-1") == tempdeck_v2_def.dimensions
    assert subject.get_requested_model("module-1") == ModuleModel.TEMPERATURE_MODULE_V1
    assert subject.get_connected_model("module-1") == ModuleModel.TEMPERATURE_MODULE_V2
    assert subject.get_serial_number("module-1") == "serial-1"
    assert subject.get_location("module-1") == DeckSlotLocation(
        slotName=DeckSlotName.SLOT_1
    )

    assert subject.get_definition("module-2") == magdeck_v1_def
    assert subject.get_dimensions("module-2") == magdeck_v1_def.dimensions
    assert subject.get_requested_model("module-2") == ModuleModel.MAGNETIC_MODULE_V1
    assert subject.get_connected_model("module-2") == ModuleModel.MAGNETIC_MODULE_V1
    assert subject.get_serial_number("module-2") == "serial-2"
    assert subject.get_location("module-2") == DeckSlotLocation(
        slotName=DeckSlotName.SLOT_2
    )

    assert subject.get_definition("module-3") == mag_block_v1_def
    assert subject.get_dimensions("module-3") == mag_block_v1_def.dimensions
    assert subject.get_requested_model("module-3") == ModuleModel.MAGNETIC_BLOCK_V1
    assert subject.get_connected_model("module-3") == ModuleModel.MAGNETIC_BLOCK_V1
    assert subject.get_location("module-3") == DeckSlotLocation(
        slotName=DeckSlotName.SLOT_3
    )

    with pytest.raises(errors.ModuleNotConnectedError):
        subject.get_serial_number("module-3")

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get_definition("Not a module ID oh no")


@pytest.mark.parametrize(
    argnames=["module_def", "slot", "expected_offset"],
    argvalues=[
        (
            lazy_fixture("tempdeck_v1_def"),
            DeckSlotName.SLOT_1,
            LabwareOffsetVector(x=-0.15, y=-0.15, z=80.09),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            DeckSlotName.SLOT_1,
            LabwareOffsetVector(x=-1.45, y=-0.15, z=80.09),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            DeckSlotName.SLOT_3,
            LabwareOffsetVector(x=1.15, y=-0.15, z=80.09),
        ),
        (
            lazy_fixture("magdeck_v1_def"),
            DeckSlotName.SLOT_1,
            LabwareOffsetVector(x=0.125, y=-0.125, z=82.25),
        ),
        (
            lazy_fixture("magdeck_v2_def"),
            DeckSlotName.SLOT_1,
            LabwareOffsetVector(x=-1.175, y=-0.125, z=82.25),
        ),
        (
            lazy_fixture("magdeck_v2_def"),
            DeckSlotName.SLOT_3,
            LabwareOffsetVector(x=1.425, y=-0.125, z=82.25),
        ),
        (
            lazy_fixture("thermocycler_v1_def"),
            DeckSlotName.SLOT_7,
            LabwareOffsetVector(x=0, y=82.56, z=97.8),
        ),
        (
            lazy_fixture("thermocycler_v2_def"),
            DeckSlotName.SLOT_7,
            LabwareOffsetVector(x=0, y=68.8, z=108.96),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            DeckSlotName.SLOT_1,
            LabwareOffsetVector(x=-0.125, y=1.125, z=68.275),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            DeckSlotName.SLOT_3,
            LabwareOffsetVector(x=0.125, y=-1.125, z=68.275),
        ),
    ],
)
def test_get_module_offset_for_ot2_standard(
    module_def: ModuleDefinition,
    slot: DeckSlotName,
    expected_offset: LabwareOffsetVector,
) -> None:
    """It should return the correct labware offset for module in specified slot."""
    subject = make_module_view(
        deck_type=DeckType.OT2_STANDARD,
        slot_by_module_id={"module-id": slot},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="module-serial",
                definition=module_def,
            )
        },
    )
    assert (
        subject.get_nominal_offset_to_child("module-id", get_addressable_area_view())
        == expected_offset
    )


@pytest.mark.parametrize(
    argnames=["module_def", "slot", "expected_offset", "deck_definition"],
    argvalues=[
        (
            lazy_fixture("tempdeck_v2_def"),
            DeckSlotName.SLOT_1.to_ot3_equivalent(),
            LabwareOffsetVector(x=0, y=0, z=9),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            DeckSlotName.SLOT_3.to_ot3_equivalent(),
            LabwareOffsetVector(x=0, y=0, z=9),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            lazy_fixture("thermocycler_v2_def"),
            DeckSlotName.SLOT_7.to_ot3_equivalent(),
            LabwareOffsetVector(x=-20.005, y=67.96, z=10.96),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            DeckSlotName.SLOT_1.to_ot3_equivalent(),
            LabwareOffsetVector(x=0, y=0, z=18.95),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            DeckSlotName.SLOT_3.to_ot3_equivalent(),
            LabwareOffsetVector(x=0, y=0, z=18.95),
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            lazy_fixture("mag_block_v1_def"),
            DeckSlotName.SLOT_2.to_ot3_equivalent(),
            LabwareOffsetVector(x=0, y=0, z=38.0),
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_module_offset_for_ot3_standard(
    module_def: ModuleDefinition,
    slot: DeckSlotName,
    expected_offset: LabwareOffsetVector,
    deck_definition: DeckDefinitionV5,
) -> None:
    """It should return the correct labware offset for module in specified slot."""
    subject = make_module_view(
        deck_type=DeckType.OT3_STANDARD,
        slot_by_module_id={"module-id": slot},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="module-serial",
                definition=module_def,
            )
        },
    )

    result_offset = subject.get_nominal_offset_to_child(
        "module-id",
        get_addressable_area_view(
            deck_configuration=None,
            deck_definition=deck_definition,
            use_simulated_deck_config=True,
        ),
    )

    assert (result_offset.x, result_offset.y, result_offset.z) == pytest.approx(
        (expected_offset.x, expected_offset.y, expected_offset.z)
    )


def test_get_magnetic_module_substate(
    magdeck_v1_def: ModuleDefinition,
    magdeck_v2_def: ModuleDefinition,
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should return a substate for the given Magnetic Module, if valid."""
    subject = make_module_view(
        slot_by_module_id={
            "magnetic-module-gen1-id": DeckSlotName.SLOT_1,
            "magnetic-module-gen2-id": DeckSlotName.SLOT_2,
            "heatshake-module-id": DeckSlotName.SLOT_3,
        },
        hardware_by_module_id={
            "magnetic-module-gen1-id": HardwareModule(
                serial_number="magnetic-module-gen1-serial",
                definition=magdeck_v1_def,
            ),
            "magnetic-module-gen2-id": HardwareModule(
                serial_number="magnetic-module-gen2-serial",
                definition=magdeck_v2_def,
            ),
            "heatshake-module-id": HardwareModule(
                serial_number="heatshake-module-serial",
                definition=heater_shaker_v1_def,
            ),
        },
        substate_by_module_id={
            "magnetic-module-gen1-id": MagneticModuleSubState(
                module_id=MagneticModuleId("magnetic-module-gen1-id"),
                model=ModuleModel.MAGNETIC_MODULE_V1,
            ),
            "magnetic-module-gen2-id": MagneticModuleSubState(
                module_id=MagneticModuleId("magnetic-module-gen2-id"),
                model=ModuleModel.MAGNETIC_MODULE_V2,
            ),
            "heatshake-module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("heatshake-module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            ),
        },
    )

    module_1_substate = subject.get_magnetic_module_substate(
        module_id="magnetic-module-gen1-id"
    )
    assert module_1_substate.module_id == "magnetic-module-gen1-id"
    assert module_1_substate.model == ModuleModel.MAGNETIC_MODULE_V1

    module_2_substate = subject.get_magnetic_module_substate(
        module_id="magnetic-module-gen2-id"
    )
    assert module_2_substate.module_id == "magnetic-module-gen2-id"
    assert module_2_substate.model == ModuleModel.MAGNETIC_MODULE_V2

    with pytest.raises(errors.WrongModuleTypeError):
        subject.get_magnetic_module_substate(module_id="heatshake-module-id")

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get_magnetic_module_substate(module_id="nonexistent-module-id")


def test_get_heater_shaker_module_substate(
    magdeck_v2_def: ModuleDefinition,
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should return a heater-shaker module substate."""
    subject = make_module_view(
        slot_by_module_id={
            "magnetic-module-gen2-id": DeckSlotName.SLOT_2,
            "heatshake-module-id": DeckSlotName.SLOT_3,
        },
        hardware_by_module_id={
            "magnetic-module-gen2-id": HardwareModule(
                serial_number="magnetic-module-gen2-serial",
                definition=magdeck_v2_def,
            ),
            "heatshake-module-id": HardwareModule(
                serial_number="heatshake-module-serial",
                definition=heater_shaker_v1_def,
            ),
        },
        substate_by_module_id={
            "magnetic-module-gen2-id": MagneticModuleSubState(
                module_id=MagneticModuleId("magnetic-module-gen2-id"),
                model=ModuleModel.MAGNETIC_MODULE_V2,
            ),
            "heatshake-module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("heatshake-module-id"),
                plate_target_temperature=432,
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=True,
            ),
        },
    )

    hs_substate = subject.get_heater_shaker_module_substate(
        module_id="heatshake-module-id"
    )
    assert hs_substate.module_id == "heatshake-module-id"
    assert hs_substate.plate_target_temperature == 432
    assert hs_substate.is_plate_shaking is True
    assert hs_substate.labware_latch_status == HeaterShakerLatchStatus.UNKNOWN

    with pytest.raises(errors.WrongModuleTypeError):
        subject.get_heater_shaker_module_substate(module_id="magnetic-module-gen2-id")

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get_heater_shaker_module_substate(module_id="nonexistent-module-id")


def test_get_temperature_module_substate(
    tempdeck_v1_def: ModuleDefinition,
    tempdeck_v2_def: ModuleDefinition,
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should return a substate for the given Temperature Module, if valid."""
    subject = make_module_view(
        slot_by_module_id={
            "temp-module-gen1-id": DeckSlotName.SLOT_1,
            "temp-module-gen2-id": DeckSlotName.SLOT_2,
            "heatshake-module-id": DeckSlotName.SLOT_3,
        },
        hardware_by_module_id={
            "temp-module-gen1-id": HardwareModule(
                serial_number="temp-module-gen1-serial",
                definition=tempdeck_v1_def,
            ),
            "temp-module-gen2-id": HardwareModule(
                serial_number="temp-module-gen2-serial",
                definition=tempdeck_v2_def,
            ),
            "heatshake-module-id": HardwareModule(
                serial_number="heatshake-module-serial",
                definition=heater_shaker_v1_def,
            ),
        },
        substate_by_module_id={
            "temp-module-gen1-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("temp-module-gen1-id"),
                plate_target_temperature=None,
            ),
            "temp-module-gen2-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("temp-module-gen2-id"),
                plate_target_temperature=123,
            ),
            "heatshake-module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("heatshake-module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            ),
        },
    )

    module_1_substate = subject.get_temperature_module_substate(
        module_id="temp-module-gen1-id"
    )
    assert module_1_substate.module_id == "temp-module-gen1-id"
    assert module_1_substate.plate_target_temperature is None

    module_2_substate = subject.get_temperature_module_substate(
        module_id="temp-module-gen2-id"
    )
    assert module_2_substate.module_id == "temp-module-gen2-id"
    assert module_2_substate.plate_target_temperature == 123

    with pytest.raises(errors.WrongModuleTypeError):
        subject.get_temperature_module_substate(module_id="heatshake-module-id")

    with pytest.raises(errors.ModuleNotLoadedError):
        subject.get_temperature_module_substate(module_id="nonexistent-module-id")


def test_get_plate_target_temperature(heater_shaker_v1_def: ModuleDefinition) -> None:
    """It should return whether target temperature is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=12.3,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    assert subject.get_plate_target_temperature() == 12.3


def test_get_plate_target_temperature_no_target(
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should raise if no target temperature is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")

    with pytest.raises(errors.NoTargetTemperatureSetError):
        subject.get_plate_target_temperature()


def test_get_magnet_home_to_base_offset() -> None:
    """It should return the model-specific offset to bottom."""
    subject = make_module_view()
    assert (
        subject.get_magnet_home_to_base_offset(
            module_model=ModuleModel.MAGNETIC_MODULE_V1
        )
        == 2.5
    )
    assert (
        subject.get_magnet_home_to_base_offset(
            module_model=ModuleModel.MAGNETIC_MODULE_V2
        )
        == 2.5
    )


@pytest.mark.parametrize(
    "module_model", [ModuleModel.MAGNETIC_MODULE_V1, ModuleModel.MAGNETIC_MODULE_V2]
)
def test_calculate_magnet_height(module_model: ModuleModel) -> None:
    """It should use true millimeters as hardware units."""
    subject = make_module_view()

    assert (
        subject.calculate_magnet_height(
            module_model=module_model,
            height_from_base=100,
        )
        == 100
    )

    # todo(mm, 2022-02-28):
    # It's unclear whether this expected result should actually be the same
    # between GEN1 and GEN2.
    # The GEN1 homing backoff distance looks accidentally halved, for the same reason
    # that its heights are halved. If the limit switch hardware is the same for both
    # modules, we'd expect the backoff difference to cause a difference in the
    # height_from_home test, even though we're measuring everything in true mm.
    # https://github.com/Opentrons/opentrons/issues/9585
    assert (
        subject.calculate_magnet_height(
            module_model=module_model,
            height_from_home=100,
        )
        == 97.5
    )

    assert (
        subject.calculate_magnet_height(
            module_model=module_model,
            labware_default_height=100,
            offset_from_labware_default=10.0,
        )
        == 110
    )


@pytest.mark.parametrize(
    argnames=["from_slot", "to_slot", "should_dodge"],
    argvalues=[
        (DeckSlotName.SLOT_1, DeckSlotName.FIXED_TRASH, True),
        (DeckSlotName.FIXED_TRASH, DeckSlotName.SLOT_1, True),
        (DeckSlotName.SLOT_4, DeckSlotName.FIXED_TRASH, True),
        (DeckSlotName.FIXED_TRASH, DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_4, DeckSlotName.SLOT_9, True),
        (DeckSlotName.SLOT_9, DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_4, DeckSlotName.SLOT_8, True),
        (DeckSlotName.SLOT_8, DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_1, DeckSlotName.SLOT_8, True),
        (DeckSlotName.SLOT_8, DeckSlotName.SLOT_1, True),
        (DeckSlotName.SLOT_4, DeckSlotName.SLOT_11, True),
        (DeckSlotName.SLOT_11, DeckSlotName.SLOT_4, True),
        (DeckSlotName.SLOT_1, DeckSlotName.SLOT_11, True),
        (DeckSlotName.SLOT_11, DeckSlotName.SLOT_1, True),
        (DeckSlotName.SLOT_2, DeckSlotName.SLOT_4, False),
    ],
)
def test_thermocycler_dodging_by_slots(
    thermocycler_v1_def: ModuleDefinition,
    from_slot: DeckSlotName,
    to_slot: DeckSlotName,
    should_dodge: bool,
) -> None:
    """It should specify if thermocycler dodging is needed.

    It should return True if thermocycler exists and movement is between bad pairs of
    slot locations.
    """
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=thermocycler_v1_def,
            )
        },
    )

    assert (
        subject.should_dodge_thermocycler(from_slot=from_slot, to_slot=to_slot)
        is should_dodge
    )


@pytest.mark.parametrize(
    argnames=["from_slot", "to_slot"],
    argvalues=[
        (DeckSlotName.SLOT_8, DeckSlotName.SLOT_1),
        (DeckSlotName.SLOT_B2, DeckSlotName.SLOT_D1),
    ],
)
@pytest.mark.parametrize(
    argnames=["module_definition", "should_dodge"],
    argvalues=[
        (lazy_fixture("tempdeck_v1_def"), False),
        (lazy_fixture("tempdeck_v2_def"), False),
        (lazy_fixture("magdeck_v1_def"), False),
        (lazy_fixture("magdeck_v2_def"), False),
        (lazy_fixture("thermocycler_v1_def"), True),
        (lazy_fixture("thermocycler_v2_def"), True),
        (lazy_fixture("heater_shaker_v1_def"), False),
    ],
)
def test_thermocycler_dodging_by_modules(
    from_slot: DeckSlotName,
    to_slot: DeckSlotName,
    module_definition: ModuleDefinition,
    should_dodge: bool,
) -> None:
    """It should specify if thermocycler dodging is needed if there is a thermocycler module."""
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=module_definition,
            )
        },
    )
    assert (
        subject.should_dodge_thermocycler(from_slot=from_slot, to_slot=to_slot)
        is should_dodge
    )


def test_select_hardware_module_to_load_rejects_missing() -> None:
    """It should raise if the correct module isn't attached."""
    subject = make_module_view()

    with pytest.raises(errors.ModuleNotAttachedError):
        subject.select_hardware_module_to_load(
            model=ModuleModel.TEMPERATURE_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            attached_modules=[],
        )


@pytest.mark.parametrize(
    argnames=["requested_model", "attached_definition"],
    argvalues=[
        (ModuleModel.TEMPERATURE_MODULE_V1, lazy_fixture("tempdeck_v1_def")),
        (ModuleModel.TEMPERATURE_MODULE_V2, lazy_fixture("tempdeck_v2_def")),
        (ModuleModel.TEMPERATURE_MODULE_V1, lazy_fixture("tempdeck_v2_def")),
        (ModuleModel.TEMPERATURE_MODULE_V2, lazy_fixture("tempdeck_v1_def")),
        (ModuleModel.MAGNETIC_MODULE_V1, lazy_fixture("magdeck_v1_def")),
        (ModuleModel.MAGNETIC_MODULE_V2, lazy_fixture("magdeck_v2_def")),
        (ModuleModel.THERMOCYCLER_MODULE_V1, lazy_fixture("thermocycler_v1_def")),
        (ModuleModel.THERMOCYCLER_MODULE_V2, lazy_fixture("thermocycler_v2_def")),
    ],
)
def test_select_hardware_module_to_load(
    requested_model: ModuleModel,
    attached_definition: ModuleDefinition,
) -> None:
    """It should return the first attached module that matches."""
    subject = make_module_view()

    attached_modules = [
        HardwareModule(serial_number="serial-1", definition=attached_definition),
        HardwareModule(serial_number="serial-2", definition=attached_definition),
    ]

    result = subject.select_hardware_module_to_load(
        model=requested_model,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        attached_modules=attached_modules,
    )

    assert result == attached_modules[0]


def test_select_hardware_module_to_load_skips_non_matching(
    magdeck_v1_def: ModuleDefinition,
    magdeck_v2_def: ModuleDefinition,
) -> None:
    """It should skip over non-matching modules."""
    subject = make_module_view()

    attached_modules = [
        HardwareModule(serial_number="serial-1", definition=magdeck_v1_def),
        HardwareModule(serial_number="serial-2", definition=magdeck_v2_def),
    ]

    result = subject.select_hardware_module_to_load(
        model=ModuleModel.MAGNETIC_MODULE_V2,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        attached_modules=attached_modules,
    )

    assert result == attached_modules[1]


def test_select_hardware_module_to_load_skips_already_loaded(
    magdeck_v1_def: ModuleDefinition,
) -> None:
    """It should skip over already assigned modules."""
    subject = make_module_view(
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=magdeck_v1_def,
            )
        }
    )

    attached_modules = [
        HardwareModule(serial_number="serial-1", definition=magdeck_v1_def),
        HardwareModule(serial_number="serial-2", definition=magdeck_v1_def),
    ]

    result = subject.select_hardware_module_to_load(
        model=ModuleModel.MAGNETIC_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        attached_modules=attached_modules,
    )

    assert result == attached_modules[1]


def test_select_hardware_module_to_load_reuses_already_loaded(
    magdeck_v1_def: ModuleDefinition,
) -> None:
    """It should reuse over already assigned modules in the same location."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=magdeck_v1_def,
            )
        },
    )

    attached_modules = [
        HardwareModule(serial_number="serial-1", definition=magdeck_v1_def),
        HardwareModule(serial_number="serial-2", definition=magdeck_v1_def),
    ]

    result = subject.select_hardware_module_to_load(
        model=ModuleModel.MAGNETIC_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        attached_modules=attached_modules,
    )

    assert result == attached_modules[0]


def test_select_hardware_module_to_load_rejects_location_reassignment(
    magdeck_v1_def: ModuleDefinition,
    tempdeck_v1_def: ModuleDefinition,
) -> None:
    """It should raise if a non-matching module is already present in the slot."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=magdeck_v1_def,
            )
        },
    )

    attached_modules = [
        HardwareModule(serial_number="serial-1", definition=magdeck_v1_def),
        HardwareModule(serial_number="serial-2", definition=tempdeck_v1_def),
    ]

    with pytest.raises(errors.ModuleAlreadyPresentError):
        subject.select_hardware_module_to_load(
            model=ModuleModel.TEMPERATURE_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            attached_modules=attached_modules,
        )


class _CalculateMagnetHardwareHeightTestParams(NamedTuple):
    definition: ModuleDefinition
    mm_from_base: float
    expected_result: Optional[float]
    expected_exception_type: Union[Type[Exception], None]


@pytest.mark.parametrize(
    "definition, mm_from_base, expected_result, expected_exception_type",
    [
        # Happy cases:
        _CalculateMagnetHardwareHeightTestParams(
            definition=lazy_fixture("magdeck_v1_def"),
            mm_from_base=10,
            # TODO(mm, 2022-03-09): It's unclear if this expected result is correct.
            # https://github.com/Opentrons/opentrons/issues/9585
            expected_result=25,
            expected_exception_type=None,
        ),
        _CalculateMagnetHardwareHeightTestParams(
            definition=lazy_fixture("magdeck_v2_def"),
            mm_from_base=10,
            expected_result=12.5,
            expected_exception_type=None,
        ),
        # Boundary conditions:
        #
        # TODO(mm, 2022-03-09):
        # In Python >=3.9, improve precision with math.nextafter().
        # Also consider relying on shared constants instead of hard-coding bounds.
        #
        # TODO(mm, 2022-03-09): It's unclear if the bounds used for V1 modules
        # are physically correct. https://github.com/Opentrons/opentrons/issues/9585
        _CalculateMagnetHardwareHeightTestParams(  # V1 barely too low.
            definition=lazy_fixture("magdeck_v1_def"),
            mm_from_base=-2.51,
            expected_result=None,
            expected_exception_type=errors.EngageHeightOutOfRangeError,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V1 lowest allowed.
            definition=lazy_fixture("magdeck_v1_def"),
            mm_from_base=-2.5,
            expected_result=0,
            expected_exception_type=None,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V1 highest allowed.
            definition=lazy_fixture("magdeck_v1_def"),
            mm_from_base=20,
            expected_result=45,
            expected_exception_type=None,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V1 barely too high.
            definition=lazy_fixture("magdeck_v1_def"),
            mm_from_base=20.01,
            expected_result=None,
            expected_exception_type=errors.EngageHeightOutOfRangeError,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V2 barely too low.
            definition=lazy_fixture("magdeck_v2_def"),
            mm_from_base=-2.51,
            expected_result=None,
            expected_exception_type=errors.EngageHeightOutOfRangeError,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V2 lowest allowed.
            definition=lazy_fixture("magdeck_v2_def"),
            mm_from_base=-2.5,
            expected_result=0,
            expected_exception_type=None,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V2 highest allowed.
            definition=lazy_fixture("magdeck_v2_def"),
            mm_from_base=22.5,
            expected_result=25,
            expected_exception_type=None,
        ),
        _CalculateMagnetHardwareHeightTestParams(  # V2 barely too high.
            definition=lazy_fixture("magdeck_v2_def"),
            mm_from_base=22.51,
            expected_result=None,
            expected_exception_type=errors.EngageHeightOutOfRangeError,
        ),
    ],
)
def test_magnetic_module_view_calculate_magnet_hardware_height(
    definition: ModuleDefinition,
    mm_from_base: float,
    expected_result: float,
    expected_exception_type: Union[Type[Exception], None],
) -> None:
    """It should return the expected height or raise the expected exception."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=definition,
            )
        },
        substate_by_module_id={
            "module-id": MagneticModuleSubState(
                module_id=MagneticModuleId("module-id"),
                model=definition.model,  # type: ignore [arg-type]
            )
        },
    )
    subject = module_view.get_magnetic_module_substate("module-id")
    expected_raise: ContextManager[None] = (
        # Not sure why mypy has trouble with this.
        does_not_raise()  # type: ignore[assignment]
        if expected_exception_type is None
        else pytest.raises(expected_exception_type)
    )
    with expected_raise:
        result = subject.calculate_magnet_hardware_height(mm_from_base=mm_from_base)
        assert result == expected_result


@pytest.mark.parametrize("target_temp", [36.8, 95.1])
def test_validate_heater_shaker_target_temperature_raises(
    heater_shaker_v1_def: ModuleDefinition,
    target_temp: float,
) -> None:
    """It should verify if a target temperature is valid for the specified module."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    with pytest.raises(errors.InvalidTargetTemperatureError):
        subject.validate_target_temperature(target_temp)


@pytest.mark.parametrize("target_temp", [37, 94.8])
def test_validate_heater_shaker_target_temperature(
    heater_shaker_v1_def: ModuleDefinition,
    target_temp: float,
) -> None:
    """It should verify if a target temperature is valid for the specified module."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    assert subject.validate_target_temperature(target_temp) == target_temp


@pytest.mark.parametrize("target_temp", [-10, 99.9])
def test_validate_temp_module_target_temperature_raises(
    tempdeck_v1_def: ModuleDefinition,
    target_temp: float,
) -> None:
    """It should verify if a target temperature is valid for the specified module."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_temperature_module_substate("module-id")
    with pytest.raises(errors.InvalidTargetTemperatureError):
        subject.validate_target_temperature(target_temp)


@pytest.mark.parametrize(
    ["target_temp", "validated_temp"], [(-9.431, -9), (0, 0), (99.1, 99)]
)
def test_validate_temp_module_target_temperature(
    tempdeck_v2_def: ModuleDefinition, target_temp: float, validated_temp: int
) -> None:
    """It should verify if a target temperature is valid for the specified module."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v2_def,
            )
        },
        substate_by_module_id={
            "module-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_temperature_module_substate("module-id")
    assert subject.validate_target_temperature(target_temp) == validated_temp


@pytest.mark.parametrize(
    argnames=["rpm_param", "validated_param"],
    argvalues=[(200.1, 200), (250.6, 251), (300.9, 301)],
)
def test_validate_heater_shaker_target_speed_converts_to_int(
    rpm_param: float, validated_param: bool, heater_shaker_v1_def: ModuleDefinition
) -> None:
    """It should validate heater-shaker target rpm."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    assert subject.validate_target_speed(rpm_param) == validated_param


@pytest.mark.parametrize(
    argnames=["rpm_param", "expected_valid"],
    argvalues=[(199.4, False), (199.5, True), (3000.7, False), (3000.4, True)],
)
def test_validate_heater_shaker_target_speed_raises_error(
    rpm_param: float, expected_valid: bool, heater_shaker_v1_def: ModuleDefinition
) -> None:
    """It should validate heater-shaker target rpm."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    if not expected_valid:
        with pytest.raises(errors.InvalidTargetSpeedError):
            subject.validate_target_speed(rpm_param)


def test_raise_if_labware_latch_not_closed(
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should raise an error if labware latch is not closed."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.OPEN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    with pytest.raises(errors.CannotPerformModuleAction, match="is open"):
        subject.raise_if_labware_latch_not_closed()


def test_raise_if_labware_latch_unknown(
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should raise an error if labware latch is not closed."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    with pytest.raises(errors.CannotPerformModuleAction, match="set to closed"):
        subject.raise_if_labware_latch_not_closed()


def test_heater_shaker_raise_if_shaking(
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should raise when heater-shaker is shaking."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=True,
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_heater_shaker_module_substate("module-id")
    with pytest.raises(errors.CannotPerformModuleAction):
        subject.raise_if_shaking()


def test_get_heater_shaker_movement_data(
    heater_shaker_v1_def: ModuleDefinition,
    tempdeck_v2_def: ModuleDefinition,
) -> None:
    """It should get heater-shaker movement data."""
    module_view = make_module_view(
        slot_by_module_id={
            "module-id": DeckSlotName.SLOT_1,
            "other-module-id": DeckSlotName.SLOT_5,
        },
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=heater_shaker_v1_def,
            ),
            "other-module-id": HardwareModule(
                serial_number="other-serial-number",
                definition=tempdeck_v2_def,
            ),
        },
        substate_by_module_id={
            "module-id": HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.CLOSED,
                is_plate_shaking=False,
                plate_target_temperature=None,
            ),
            "other-module-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("other-module-id"),
                plate_target_temperature=None,
            ),
        },
    )
    subject = module_view.get_heater_shaker_movement_restrictors()
    assert len(subject) == 1
    for hs_movement_data in subject:
        assert not hs_movement_data.plate_shaking
        assert hs_movement_data.latch_status
        assert hs_movement_data.deck_slot == 1


def test_tempdeck_get_plate_target_temperature(
    tempdeck_v2_def: ModuleDefinition,
) -> None:
    """It should return whether target temperature is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v2_def,
            )
        },
        substate_by_module_id={
            "module-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=12,
            )
        },
    )
    subject = module_view.get_temperature_module_substate("module-id")
    assert subject.get_plate_target_temperature() == 12


def test_tempdeck_get_plate_target_temperature_no_target(
    tempdeck_v2_def: ModuleDefinition,
) -> None:
    """It should raise if no target temperature is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v2_def,
            )
        },
        substate_by_module_id={
            "module-id": TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            )
        },
    )
    subject = module_view.get_temperature_module_substate("module-id")

    with pytest.raises(errors.NoTargetTemperatureSetError):
        subject.get_plate_target_temperature()


def test_thermocycler_get_target_temperatures(
    thermocycler_v1_def: ModuleDefinition,
) -> None:
    """It should return whether target temperature for thermocycler is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=thermocycler_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id"),
                is_lid_open=False,
                target_block_temperature=14,
                target_lid_temperature=28,
            )
        },
    )
    subject = module_view.get_thermocycler_module_substate("module-id")
    assert subject.get_target_block_temperature() == 14
    assert subject.get_target_lid_temperature() == 28


def test_thermocycler_get_target_temperatures_no_target(
    thermocycler_v1_def: ModuleDefinition,
) -> None:
    """It should raise if no target temperature is set."""
    module_view = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=thermocycler_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id"),
                is_lid_open=False,
                target_block_temperature=None,
                target_lid_temperature=None,
            )
        },
    )
    subject = module_view.get_thermocycler_module_substate("module-id")

    with pytest.raises(errors.NoTargetTemperatureSetError):
        subject.get_target_block_temperature()
        subject.get_target_lid_temperature()


@pytest.fixture
def module_view_with_thermocycler(thermocycler_v1_def: ModuleDefinition) -> ModuleView:
    """Get a module state view with a loaded thermocycler."""
    return make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=thermocycler_v1_def,
            )
        },
        substate_by_module_id={
            "module-id": ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id"),
                target_block_temperature=None,
                target_lid_temperature=None,
                is_lid_open=False,
            )
        },
    )


@pytest.mark.parametrize("input_temperature", [0, 0.0, 0.001, 98.999, 99, 99.0])
def test_thermocycler_validate_target_block_temperature(
    module_view_with_thermocycler: ModuleView,
    input_temperature: float,
) -> None:
    """It should return a valid target block temperature."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )
    result = subject.validate_target_block_temperature(input_temperature)

    assert result == input_temperature


@pytest.mark.parametrize(
    argnames=["input_time", "validated_time"],
    argvalues=[(0.0, 0.0), (0.123, 0.123), (123.456, 123.456), (1234567, 1234567)],
)
def test_thermocycler_validate_hold_time(
    module_view_with_thermocycler: ModuleView,
    input_time: float,
    validated_time: float,
) -> None:
    """It should return a valid hold time."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )
    result = subject.validate_hold_time(input_time)

    assert result == validated_time


@pytest.mark.parametrize("input_time", [-0.1, -123])
def test_thermocycler_validate_hold_time_raises(
    module_view_with_thermocycler: ModuleView,
    input_time: float,
) -> None:
    """It should raise on invalid hold time."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )

    with pytest.raises(errors.InvalidHoldTimeError):
        subject.validate_hold_time(input_time)


@pytest.mark.parametrize("input_temperature", [-0.001, 99.001])
def test_thermocycler_validate_target_block_temperature_raises(
    module_view_with_thermocycler: ModuleView,
    input_temperature: float,
) -> None:
    """It should raise on invalid target block temperature."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )

    with pytest.raises(errors.InvalidTargetTemperatureError):
        subject.validate_target_block_temperature(input_temperature)


@pytest.mark.parametrize("input_volume", [0, 0.0, 0.001, 50.0, 99.999, 100, 100.0])
def test_thermocycler_validate_block_max_volume(
    module_view_with_thermocycler: ModuleView,
    input_volume: float,
) -> None:
    """It should return a validated max block volume value."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )
    result = subject.validate_max_block_volume(input_volume)

    assert result == input_volume


@pytest.mark.parametrize("input_volume", [-10, -0.001, 100.001])
def test_thermocycler_validate_block_max_volume_raises(
    module_view_with_thermocycler: ModuleView,
    input_volume: float,
) -> None:
    """It should raise on invalid block volume temperature."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )

    with pytest.raises(errors.InvalidBlockVolumeError):
        subject.validate_max_block_volume(input_volume)


@pytest.mark.parametrize("input_temperature", [37, 37.0, 37.001, 109.999, 110, 110.0])
def test_thermocycler_validate_target_lid_temperature(
    module_view_with_thermocycler: ModuleView,
    input_temperature: float,
) -> None:
    """It should return a valid target block temperature."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )
    result = subject.validate_target_lid_temperature(input_temperature)

    assert result == input_temperature


@pytest.mark.parametrize("input_temperature", [36.999, 110.001])
def test_thermocycler_validate_target_lid_temperature_raises(
    module_view_with_thermocycler: ModuleView,
    input_temperature: float,
) -> None:
    """It should raise on invalid target block temperature."""
    subject = module_view_with_thermocycler.get_thermocycler_module_substate(
        "module-id"
    )

    with pytest.raises(errors.InvalidTargetTemperatureError):
        subject.validate_target_lid_temperature(input_temperature)


@pytest.mark.parametrize(
    ("module_definition", "expected_height"),
    [
        (lazy_fixture("thermocycler_v1_def"), 98.0),
        (lazy_fixture("tempdeck_v1_def"), 84.0),
        (lazy_fixture("tempdeck_v2_def"), 84.0),
        (lazy_fixture("magdeck_v1_def"), 110.152),
        (lazy_fixture("magdeck_v2_def"), 110.152),
        (lazy_fixture("heater_shaker_v1_def"), 82.0),
    ],
)
def test_get_overall_height(
    module_definition: ModuleDefinition,
    expected_height: float,
) -> None:
    """It should get a module's overall height."""
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_7},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=module_definition,
            )
        },
    )

    result = subject.get_overall_height("module-id")
    assert result == expected_height


@pytest.mark.parametrize(
    argnames=["location", "expected_raise"],
    argvalues=[
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            pytest.raises(errors.LocationIsOccupiedError),
        ),
        (DeckSlotLocation(slotName=DeckSlotName.SLOT_2), does_not_raise()),
        (DeckSlotLocation(slotName=DeckSlotName.FIXED_TRASH), does_not_raise()),
    ],
)
def test_raise_if_labware_in_location(
    location: DeckSlotLocation,
    expected_raise: ContextManager[Any],
    thermocycler_v1_def: ModuleDefinition,
) -> None:
    """It should raise if there is module in specified location."""
    subject = make_module_view(
        slot_by_module_id={"module-id-1": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id-1": HardwareModule(
                serial_number="serial-number",
                definition=thermocycler_v1_def,
            )
        },
        substate_by_module_id={
            "module-id-1": ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id-1"),
                is_lid_open=False,
                target_block_temperature=None,
                target_lid_temperature=None,
            )
        },
    )
    with expected_raise:
        subject.raise_if_module_in_location(location=location)


def test_get_by_slot() -> None:
    """It should get the module in a given slot."""
    subject = make_module_view(
        slot_by_module_id={
            "1": DeckSlotName.SLOT_1,
            "2": DeckSlotName.SLOT_2,
        },
        hardware_by_module_id={
            "1": HardwareModule(
                serial_number="serial-number-1",
                definition=ModuleDefinition.model_construct(  # type: ignore[call-arg]
                    model=ModuleModel.TEMPERATURE_MODULE_V1
                ),
            ),
            "2": HardwareModule(
                serial_number="serial-number-2",
                definition=ModuleDefinition.model_construct(  # type: ignore[call-arg]
                    model=ModuleModel.TEMPERATURE_MODULE_V2
                ),
            ),
        },
    )

    assert subject.get_by_slot(DeckSlotName.SLOT_1) == LoadedModule(
        id="1",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        serialNumber="serial-number-1",
    )
    assert subject.get_by_slot(DeckSlotName.SLOT_2) == LoadedModule(
        id="2",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
        model=ModuleModel.TEMPERATURE_MODULE_V2,
        serialNumber="serial-number-2",
    )
    assert subject.get_by_slot(DeckSlotName.SLOT_3) is None


def test_get_by_slot_prefers_later() -> None:
    """It should get the module in a slot, preferring later items if locations match."""
    subject = make_module_view(
        slot_by_module_id={
            "1": DeckSlotName.SLOT_1,
            "1-again": DeckSlotName.SLOT_1,
        },
        hardware_by_module_id={
            "1": HardwareModule(
                serial_number="serial-number-1",
                definition=ModuleDefinition.model_construct(  # type: ignore[call-arg]
                    model=ModuleModel.TEMPERATURE_MODULE_V1
                ),
            ),
            "1-again": HardwareModule(
                serial_number="serial-number-1-again",
                definition=ModuleDefinition.model_construct(  # type: ignore[call-arg]
                    model=ModuleModel.TEMPERATURE_MODULE_V1
                ),
            ),
        },
    )

    assert subject.get_by_slot(DeckSlotName.SLOT_1) == LoadedModule(
        id="1-again",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        serialNumber="serial-number-1-again",
    )


@pytest.mark.parametrize(
    argnames=["mount", "target_slot", "expected_result"],
    argvalues=[
        (MountType.RIGHT, DeckSlotName.SLOT_1, False),
        (MountType.RIGHT, DeckSlotName.SLOT_2, True),
        (MountType.RIGHT, DeckSlotName.SLOT_5, False),
        (MountType.LEFT, DeckSlotName.SLOT_3, False),
        (MountType.RIGHT, DeckSlotName.SLOT_5, False),
        (MountType.LEFT, DeckSlotName.SLOT_8, True),
    ],
)
def test_is_edge_move_unsafe(
    mount: MountType, target_slot: DeckSlotName, expected_result: bool
) -> None:
    """It should determine if an edge move would be unsafe."""
    subject = make_module_view(
        slot_by_module_id={"foo": DeckSlotName.SLOT_1, "bar": DeckSlotName.SLOT_9}
    )

    result = subject.is_edge_move_unsafe(mount=mount, target_slot=target_slot)

    assert result is expected_result


@pytest.mark.parametrize(
    argnames=["module_def", "expected_offset_data"],
    argvalues=[
        (
            lazy_fixture("thermocycler_v2_def"),
            LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector(x=0, y=0, z=4.6),
                dropOffset=LabwareOffsetVector(x=0, y=0, z=5.6),
            ),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
                dropOffset=LabwareOffsetVector(x=0, y=0, z=1.0),
            ),
        ),
        (
            lazy_fixture("tempdeck_v1_def"),
            None,
        ),
    ],
)
def test_get_default_gripper_offsets(
    module_def: ModuleDefinition,
    expected_offset_data: Optional[LabwareMovementOffsetData],
) -> None:
    """It should return the correct gripper offsets, if present."""
    subject = make_module_view(
        slot_by_module_id={
            "module-1": DeckSlotName.SLOT_1,
        },
        requested_model_by_module_id={
            "module-1": ModuleModel.TEMPERATURE_MODULE_V1,  # Does not matter
        },
        hardware_by_module_id={
            "module-1": HardwareModule(
                serial_number="serial-1",
                definition=module_def,
            ),
        },
    )
    assert subject.get_default_gripper_offsets("module-1") == expected_offset_data


@pytest.mark.parametrize(
    argnames=["deck_type", "slot_name", "expected_highest_z", "deck_definition"],
    argvalues=[
        (
            DeckType.OT2_STANDARD,
            DeckSlotName.SLOT_1,
            84,
            lazy_fixture("ot3_standard_deck_def"),
        ),
        (
            DeckType.OT3_STANDARD,
            DeckSlotName.SLOT_D1,
            12.91,
            lazy_fixture("ot3_standard_deck_def"),
        ),
    ],
)
def test_get_module_highest_z(
    tempdeck_v2_def: ModuleDefinition,
    deck_type: DeckType,
    slot_name: DeckSlotName,
    expected_highest_z: float,
    deck_definition: DeckDefinitionV5,
) -> None:
    """It should get the highest z point of the module."""
    subject = make_module_view(
        deck_type=deck_type,
        slot_by_module_id={"module-id": slot_name},
        requested_model_by_module_id={
            "module-id": ModuleModel.TEMPERATURE_MODULE_V2,
        },
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="module-serial",
                definition=tempdeck_v2_def,
            )
        },
    )
    assert isclose(
        subject.get_module_highest_z(
            module_id="module-id",
            addressable_areas=get_addressable_area_view(
                deck_configuration=None,
                deck_definition=deck_definition,
                use_simulated_deck_config=True,
            ),
        ),
        expected_highest_z,
    )


def test_get_overflowed_module_in_slot(tempdeck_v1_def: ModuleDefinition) -> None:
    """It should return the module occupying but not loaded in the given slot."""
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=tempdeck_v1_def,
            )
        },
        additional_slots_occupied_by_module_id={
            "module-id": [DeckSlotName.SLOT_6, DeckSlotName.SLOT_A1],
        },
    )
    assert subject.get_overflowed_module_in_slot(DeckSlotName.SLOT_6) == LoadedModule(
        id="module-id",
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        serialNumber="serial-number",
    )


@pytest.mark.parametrize(
    argnames=["deck_type", "module_def", "module_slot", "expected_result"],
    argvalues=[
        (
            DeckType.OT3_STANDARD,
            lazy_fixture("thermocycler_v2_def"),
            DeckSlotName.SLOT_A1,
            True,
        ),
        (
            DeckType.OT3_STANDARD,
            lazy_fixture("tempdeck_v1_def"),
            DeckSlotName.SLOT_A1,
            False,
        ),
        (
            DeckType.OT3_STANDARD,
            lazy_fixture("thermocycler_v2_def"),
            DeckSlotName.SLOT_1,
            False,
        ),
        (
            DeckType.OT2_STANDARD,
            lazy_fixture("thermocycler_v2_def"),
            DeckSlotName.SLOT_A1,
            False,
        ),
    ],
)
def test_is_flex_deck_with_thermocycler(
    deck_type: DeckType,
    module_def: ModuleDefinition,
    module_slot: DeckSlotName,
    expected_result: bool,
) -> None:
    """It should return True if there is a thermocycler on Flex."""
    subject = make_module_view(
        slot_by_module_id={"module-id": DeckSlotName.SLOT_B1},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=module_def,
            )
        },
        additional_slots_occupied_by_module_id={
            "module-id": [module_slot, DeckSlotName.SLOT_C1],
        },
        deck_type=deck_type,
    )
    assert subject.is_flex_deck_with_thermocycler() == expected_result
