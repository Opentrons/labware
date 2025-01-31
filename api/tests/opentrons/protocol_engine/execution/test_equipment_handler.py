"""Test equipment command execution side effects."""

import pytest
from _pytest.fixtures import SubRequest
import inspect
from datetime import datetime
from decoy import Decoy, matchers
from typing import Any, Optional, cast, Dict

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.pipette import pipette_definition
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.labware.types import LabwareUri

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.types import Mount as HwMount, MountType, DeckSlotName, Point
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules import (
    TempDeck,
    MagDeck,
    HeaterShaker,
    AbstractModule,
)
from opentrons.hardware_control.dev_types import PipetteDict

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    DeckType,
    ModuleLocation,
    OnLabwareLocation,
    NonStackedLocation,
    LoadedPipette,
    LabwareOffset,
    LabwareOffsetVector,
    LegacyLabwareOffsetLocation,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnLabwareOffsetLocationSequenceComponent,
    ModuleModel,
    ModuleDefinition,
    OFF_DECK_LOCATION,
    FlowRates,
)

from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.state.state import StateStore
from opentrons.protocol_engine.state.modules import HardwareModule
from opentrons.protocol_engine.resources import (
    ModelUtils,
    LabwareDataProvider,
    ModuleDataProvider,
    pipette_data_provider,
)
from opentrons.protocol_engine.resources.pipette_data_provider import (
    LoadedStaticPipetteData,
)
from opentrons.protocol_engine.execution.equipment import (
    EquipmentHandler,
    LoadedPipetteData,
    LoadedModuleData,
    LoadedLabwareData,
)
from ..pipette_fixtures import get_default_nozzle_map


def _make_config(use_virtual_modules: bool) -> Config:
    return Config(
        use_virtual_modules=use_virtual_modules,
        # Robot and deck type are arbitrary.
        robot_type="OT-2 Standard",
        deck_type=DeckType.OT2_STANDARD,
    )


@pytest.fixture
def available_sensors() -> pipette_definition.AvailableSensorDefinition:
    """Provide a list of sensors."""
    return pipette_definition.AvailableSensorDefinition(
        sensors=["pressure", "capacitive", "environment"]
    )


@pytest.fixture(autouse=True)
def patch_mock_pipette_data_provider(
    decoy: Decoy,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mock out pipette_data_provider top level functions."""
    for name, func in inspect.getmembers(pipette_data_provider, inspect.isfunction):
        monkeypatch.setattr(pipette_data_provider, name, decoy.mock(func=func))


@pytest.fixture
def state_store(decoy: Decoy) -> StateStore:
    """Get a mocked out StateStore instance."""
    return decoy.mock(cls=StateStore)


@pytest.fixture
def model_utils(decoy: Decoy) -> ModelUtils:
    """Get a mocked out ModelUtils instance."""
    return decoy.mock(cls=ModelUtils)


@pytest.fixture
def labware_data_provider(decoy: Decoy) -> LabwareDataProvider:
    """Get a mocked out LabwareDataProvider instance."""
    return decoy.mock(cls=LabwareDataProvider)


@pytest.fixture
def module_data_provider(decoy: Decoy) -> ModuleDataProvider:
    """Get a mocked out ModuleDataProvider instance."""
    return decoy.mock(cls=ModuleDataProvider)


@pytest.fixture
async def temp_module_v1(decoy: Decoy) -> TempDeck:
    """Get a mocked out module fixture."""
    temp_mod = decoy.mock(cls=TempDeck)
    decoy.when(temp_mod.device_info).then_return({"serial": "serial-1"})
    decoy.when(temp_mod.model()).then_return("temperatureModuleV1")

    return temp_mod


@pytest.fixture
async def temp_module_v2(decoy: Decoy) -> TempDeck:
    """Get a mocked out module fixture."""
    temp_mod = decoy.mock(cls=TempDeck)
    decoy.when(temp_mod.device_info).then_return({"serial": "serial-2"})
    decoy.when(temp_mod.model()).then_return("temperatureModuleV2")

    return temp_mod


@pytest.fixture(params=["v0", "v1", "v3"])
def tip_overlap_versions(request: SubRequest) -> str:
    """Get a series of tip overlap versions."""
    return cast(str, request.param)


@pytest.fixture
def loaded_static_pipette_data(
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    target_tip_overlap_data: Dict[str, float],
    available_sensors: pipette_definition.AvailableSensorDefinition,
) -> LoadedStaticPipetteData:
    """Get a pipette config data value object."""
    return LoadedStaticPipetteData(
        model="pipette_model",
        display_name="pipette name",
        min_volume=1.23,
        max_volume=4.56,
        channels=7,
        flow_rates=FlowRates(
            default_blow_out={"a": 1.23},
            default_aspirate={"b": 4.56},
            default_dispense={"c": 7.89},
        ),
        tip_configuration_lookup_table={4.56: supported_tip_fixture},
        nominal_tip_overlap=target_tip_overlap_data,
        home_position=10.11,
        nozzle_offset_z=12.13,
        nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE),
        back_left_corner_offset=Point(x=1, y=2, z=3),
        front_right_corner_offset=Point(x=4, y=5, z=6),
        pipette_lld_settings={},
        plunger_positions={
            "top": 0.0,
            "bottom": 5.0,
            "blow_out": 19.0,
            "drop_tip": 20.0,
        },
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )


@pytest.fixture
def target_tip_overlap_data(tip_overlap_versions: str) -> Dict[str, float]:
    """Get the corresponding overlap data for the version."""
    return {"default": 2.13 * int(tip_overlap_versions[1:])}


@pytest.fixture
def virtual_pipette_data_provider(
    decoy: Decoy,
) -> pipette_data_provider.VirtualPipetteDataProvider:
    """Virtual pipette data provider."""
    return decoy.mock(cls=pipette_data_provider.VirtualPipetteDataProvider)


@pytest.fixture
def subject(
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    labware_data_provider: LabwareDataProvider,
    module_data_provider: ModuleDataProvider,
    model_utils: ModelUtils,
    virtual_pipette_data_provider: pipette_data_provider.VirtualPipetteDataProvider,
) -> EquipmentHandler:
    """Get an EquipmentHandler test subject with its dependencies mocked out."""
    return EquipmentHandler(
        hardware_api=hardware_api,
        state_store=state_store,
        labware_data_provider=labware_data_provider,
        module_data_provider=module_data_provider,
        model_utils=model_utils,
        virtual_pipette_data_provider=virtual_pipette_data_provider,
    )


async def test_load_labware(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    labware_data_provider: LabwareDataProvider,
    minimal_labware_def: LabwareDefinition,
    subject: EquipmentHandler,
) -> None:
    """It should load labware definition and offset data and generate an ID."""
    decoy.when(model_utils.generate_id()).then_return("unique-id")

    decoy.when(state_store.labware.get_definition_by_uri(matchers.IsA(str))).then_raise(
        errors.LabwareDefinitionDoesNotExistError("oh no")
    )

    decoy.when(
        await labware_data_provider.get_labware_definition(
            load_name="load-name",
            namespace="opentrons-test",
            version=1,
        )
    ).then_return(minimal_labware_def)
    decoy.when(
        state_store.geometry.get_projected_offset_location(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
        )
    ).then_return(
        [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="3")]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_3),
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = await subject.load_labware(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
        labware_id=None,
    )

    assert result == LoadedLabwareData(
        labware_id="unique-id",
        definition=minimal_labware_def,
        offsetId="labware-offset-id",
    )


async def test_load_labware_off_deck(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    minimal_labware_def: LabwareDefinition,
    subject: EquipmentHandler,
) -> None:
    """It should load labware definition and offset data and generate an ID."""
    decoy.when(model_utils.generate_id()).then_return("unique-id")

    decoy.when(
        state_store.labware.get_definition_by_uri(
            cast("LabwareUri", "opentrons-test/load-name/1")
        )
    ).then_return(minimal_labware_def)

    result = await subject.load_labware(
        location=OFF_DECK_LOCATION,
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
        labware_id=None,
    )

    assert result == LoadedLabwareData(
        labware_id="unique-id",
        definition=minimal_labware_def,
        offsetId=None,
    )


async def test_load_labware_uses_provided_id(
    decoy: Decoy,
    state_store: StateStore,
    labware_data_provider: LabwareDataProvider,
    minimal_labware_def: LabwareDefinition,
    subject: EquipmentHandler,
) -> None:
    """It should use the provided ID rather than generating an ID for the labware."""
    decoy.when(state_store.labware.get_definition_by_uri(matchers.IsA(str))).then_raise(
        errors.LabwareDefinitionDoesNotExistError("oh no")
    )

    decoy.when(
        await labware_data_provider.get_labware_definition(
            load_name="load-name",
            namespace="opentrons-test",
            version=1,
        )
    ).then_return(minimal_labware_def)
    decoy.when(
        state_store.geometry.get_projected_offset_location(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
        )
    ).then_return(
        [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="3")]
    )
    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
        )
    ).then_return(None)

    result = await subject.load_labware(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
        labware_id="my-labware-id",
    )

    assert result == LoadedLabwareData(
        labware_id="my-labware-id", definition=minimal_labware_def, offsetId=None
    )


async def test_load_labware_uses_loaded_labware_def(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    labware_data_provider: LabwareDataProvider,
    minimal_labware_def: LabwareDefinition,
    subject: EquipmentHandler,
) -> None:
    """Loading labware should use the labware definition already in state."""
    expected_uri = uri_from_details(
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
    )

    decoy.when(model_utils.generate_id()).then_return("unique-id")

    decoy.when(state_store.labware.get_definition_by_uri(expected_uri)).then_return(
        minimal_labware_def
    )

    decoy.when(
        state_store.geometry.get_projected_offset_location(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
        )
    ).then_return(
        [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="3")]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
        )
    ).then_return(None)

    result = await subject.load_labware(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
        labware_id=None,
    )

    assert result == LoadedLabwareData(
        labware_id="unique-id",
        definition=minimal_labware_def,
        offsetId=None,
    )

    decoy.verify(
        await labware_data_provider.get_labware_definition(
            load_name="load-name",
            namespace="opentrons-test",
            version=1,
        ),
        times=0,
    )


async def test_load_labware_on_module(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    minimal_labware_def: LabwareDefinition,
    subject: EquipmentHandler,
) -> None:
    """It should load labware definition and offset data and generate an ID."""
    decoy.when(model_utils.generate_id()).then_return("unique-id")

    decoy.when(
        state_store.labware.get_definition_by_uri(matchers.IsA(str))
    ).then_return(minimal_labware_def)

    decoy.when(state_store.modules.get_requested_model("module-id")).then_return(
        ModuleModel.THERMOCYCLER_MODULE_V1
    )
    decoy.when(state_store.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )

    decoy.when(
        state_store.geometry.get_projected_offset_location(
            ModuleLocation(moduleId="module-id")
        )
    ).then_return(
        [
            OnModuleOffsetLocationSequenceComponent(
                moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1"),
        ]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_3,
                moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1,
            ),
            locationSequence=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = await subject.load_labware(
        location=ModuleLocation(moduleId="module-id"),
        load_name="load-name",
        namespace="opentrons-test",
        version=1,
        labware_id=None,
    )

    assert result == LoadedLabwareData(
        labware_id="unique-id",
        definition=minimal_labware_def,
        offsetId="labware-offset-id",
    )


def test_find_offset_id_of_labware_on_deck_slot(
    decoy: Decoy,
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """It should find the offset by resolving the provided location."""
    decoy.when(
        state_store.geometry.get_projected_offset_location(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
        )
    ).then_return(
        [
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="3"),
        ]
    )
    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_3,
                moduleModel=None,
            ),
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name/1",
        labware_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
    )

    assert result == "labware-offset-id"


def test_find_offset_id_of_labware_on_module(
    decoy: Decoy,
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """It should find a new offset by resolving the new location."""
    decoy.when(state_store.modules.get_requested_model("input-module-id")).then_return(
        ModuleModel.THERMOCYCLER_MODULE_V1
    )
    decoy.when(state_store.modules.get_location("input-module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
    )

    decoy.when(
        state_store.geometry.get_projected_offset_location(
            ModuleLocation(moduleId="input-module-id")
        )
    ).then_return(
        [
            OnModuleOffsetLocationSequenceComponent(
                moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="3"),
        ]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name/1",
            location=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                ),
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_3,
                moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1,
            ),
            locationSequence=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name/1",
        labware_location=ModuleLocation(moduleId="input-module-id"),
    )

    assert result == "labware-offset-id"


@pytest.mark.parametrize(
    argnames=["parent_location", "expected_result"],
    argvalues=[
        (DeckSlotLocation(slotName=DeckSlotName.SLOT_1), "labware-offset-id"),
        (OFF_DECK_LOCATION, None),
    ],
)
def test_find_offset_id_of_labware_on_labware(
    decoy: Decoy,
    parent_location: NonStackedLocation,
    expected_result: Optional[str],
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """It should find an offset for a labware on a labware."""
    decoy.when(state_store.labware.get_definition_uri("labware-id")).then_return(
        LabwareUri("opentrons-test/load-name-2/1")
    )

    decoy.when(state_store.labware.get_parent_location("labware-id")).then_return(
        parent_location
    )
    decoy.when(
        state_store.geometry.get_projected_offset_location(
            OnLabwareLocation(labwareId="labware-id")
        )
    ).then_return(
        [
            OnLabwareOffsetLocationSequenceComponent(
                labwareUri="opentrons-test/load-name-2/1"
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1"),
        ]
        if parent_location is not OFF_DECK_LOCATION
        else None
    )
    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name-1/1",
            location=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/load-name-2/1",
            ),
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name-1/1",
        labware_location=OnLabwareLocation(labwareId="labware-id"),
    )

    assert result == expected_result


def test_find_offset_id_of_labware_on_labware_on_modules(
    decoy: Decoy,
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """It should find an offset for a labware on a labware on a module."""
    decoy.when(state_store.labware.get_definition_uri("labware-id")).then_return(
        LabwareUri("opentrons-test/load-name-2/1")
    )

    decoy.when(state_store.labware.get_parent_location("labware-id")).then_return(
        ModuleLocation(moduleId="module-id"),
    )

    decoy.when(state_store.modules.get_requested_model("module-id")).then_return(
        ModuleModel.HEATER_SHAKER_MODULE_V1
    )

    decoy.when(state_store.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )

    decoy.when(
        state_store.geometry.get_projected_offset_location(
            OnLabwareLocation(labwareId="labware-id")
        )
    ).then_return(
        [
            OnLabwareOffsetLocationSequenceComponent(
                labwareUri="opentrons-test/load-name-2/1"
            ),
            OnModuleOffsetLocationSequenceComponent(
                moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1"),
        ]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name-1/1",
            location=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1,
                definitionUri="opentrons-test/load-name-2/1",
            ),
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name-1/1",
        labware_location=OnLabwareLocation(labwareId="labware-id"),
    )

    assert result == "labware-offset-id"


def test_find_offset_id_of_labware_on_labware_on_labware_modules(
    decoy: Decoy,
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """It should find an offset for a labware on a labware on a module."""
    decoy.when(state_store.labware.get_definition_uri("labware-id")).then_return(
        LabwareUri("opentrons-test/load-name-2/1")
    )

    decoy.when(state_store.labware.get_parent_location("labware-id")).then_return(
        ModuleLocation(moduleId="labware-id-2"),
    )

    decoy.when(state_store.labware.get_definition_uri("labware-id-2")).then_return(
        LabwareUri("opentrons-test/load-name-3/1")
    )

    decoy.when(state_store.labware.get_parent_location("labware-id-2")).then_return(
        ModuleLocation(moduleId="module-id"),
    )

    decoy.when(state_store.modules.get_requested_model("module-id")).then_return(
        ModuleModel.HEATER_SHAKER_MODULE_V1
    )

    decoy.when(state_store.modules.get_location("module-id")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )

    decoy.when(
        state_store.geometry.get_projected_offset_location(
            OnLabwareLocation(labwareId="labware-id")
        )
    ).then_return(
        [
            OnLabwareOffsetLocationSequenceComponent(
                labwareUri="opentrons-test/load-name-2/1"
            ),
            OnLabwareOffsetLocationSequenceComponent(
                labwareUri="opentrons-test/load-name-3/1"
            ),
            OnModuleOffsetLocationSequenceComponent(
                moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1"),
        ]
    )

    decoy.when(
        state_store.labware.find_applicable_labware_offset(
            definition_uri="opentrons-test/load-name-1/1",
            location=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-3/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
        )
    ).then_return(
        LabwareOffset(
            id="labware-offset-id",
            createdAt=datetime(year=2021, month=1, day=2),
            definitionUri="opentrons-test/load-name/1",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1,
                definitionUri="opentrons-test/load-name-2/1",
            ),
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-2/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/load-name-3/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.HEATER_SHAKER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
    )

    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name-1/1",
        labware_location=OnLabwareLocation(labwareId="labware-id"),
    )

    assert result == "labware-offset-id"


def test_find_offset_id_of_labware_off_deck(subject: EquipmentHandler) -> None:
    """It should return None for offset_id of labware off-deck."""
    result = subject.find_applicable_labware_offset_id(
        labware_definition_uri="opentrons-test/load-name/1",
        labware_location=OFF_DECK_LOCATION,
    )
    assert result is None


async def test_load_pipette(
    decoy: Decoy,
    model_utils: ModelUtils,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    loaded_static_pipette_data: LoadedStaticPipetteData,
    tip_overlap_versions: str,
    subject: EquipmentHandler,
) -> None:
    """It should load pipette data, check attachment, and generate an ID."""
    pipette_dict = cast(PipetteDict, {"model": "hello", "pipette_id": "world"})

    decoy.when(state_store.config.use_virtual_pipettes).then_return(False)
    decoy.when(model_utils.generate_id()).then_return("unique-id")
    decoy.when(state_store.pipettes.get_by_mount(MountType.RIGHT)).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P300_MULTI)  # type: ignore[call-arg]
    )
    decoy.when(hardware_api.get_attached_instrument(mount=HwMount.LEFT)).then_return(
        pipette_dict
    )

    decoy.when(
        pipette_data_provider.validate_and_default_tip_overlap_version(
            tip_overlap_versions
        )
    ).then_return(tip_overlap_versions)
    decoy.when(
        pipette_data_provider.get_pipette_static_config(
            pipette_dict=pipette_dict, tip_overlap_version=tip_overlap_versions
        ),
    ).then_return(loaded_static_pipette_data)

    decoy.when(hardware_api.get_instrument_max_height(mount=HwMount.LEFT)).then_return(
        42.0
    )

    result = await subject.load_pipette(
        pipette_name=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
        pipette_id=None,
        tip_overlap_version=tip_overlap_versions,
    )

    assert result == LoadedPipetteData(
        pipette_id="unique-id",
        serial_number="world",
        static_config=loaded_static_pipette_data,
    )

    decoy.verify(
        await hardware_api.cache_instruments(
            {
                HwMount.LEFT: PipetteNameType.P300_SINGLE.value,
                HwMount.RIGHT: PipetteNameType.P300_MULTI.value,
            }
        ),
    )


async def test_load_pipette_96_channels(
    decoy: Decoy,
    model_utils: ModelUtils,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    loaded_static_pipette_data: LoadedStaticPipetteData,
    tip_overlap_versions: str,
    subject: EquipmentHandler,
) -> None:
    """It should load pipette data, check attachment, and generate an ID."""
    pipette_dict = cast(PipetteDict, {"model": "hello", "pipette_id": "world"})

    decoy.when(state_store.config.use_virtual_pipettes).then_return(False)
    decoy.when(model_utils.generate_id()).then_return("unique-id")
    decoy.when(hardware_api.get_attached_instrument(mount=HwMount.LEFT)).then_return(
        pipette_dict
    )
    decoy.when(
        pipette_data_provider.validate_and_default_tip_overlap_version(
            tip_overlap_versions
        )
    ).then_return(tip_overlap_versions)
    decoy.when(
        pipette_data_provider.get_pipette_static_config(
            pipette_dict=pipette_dict, tip_overlap_version=tip_overlap_versions
        )
    ).then_return(loaded_static_pipette_data)

    decoy.when(hardware_api.get_instrument_max_height(mount=HwMount.LEFT)).then_return(
        42.0
    )

    result = await subject.load_pipette(
        pipette_name=PipetteNameType.P1000_96,
        mount=MountType.LEFT,
        pipette_id=None,
        tip_overlap_version=tip_overlap_versions,
    )

    assert result == LoadedPipetteData(
        pipette_id="unique-id",
        serial_number="world",
        static_config=loaded_static_pipette_data,
    )


async def test_load_pipette_uses_provided_id(
    decoy: Decoy,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    loaded_static_pipette_data: LoadedStaticPipetteData,
    tip_overlap_versions: str,
    subject: EquipmentHandler,
) -> None:
    """It should use the provided ID rather than generating an ID for the pipette."""
    pipette_dict = cast(PipetteDict, {"model": "hello", "pipette_id": "world"})

    decoy.when(state_store.config.use_virtual_pipettes).then_return(False)
    decoy.when(hardware_api.get_attached_instrument(mount=HwMount.LEFT)).then_return(
        pipette_dict
    )
    decoy.when(
        pipette_data_provider.validate_and_default_tip_overlap_version(
            tip_overlap_versions
        )
    ).then_return(tip_overlap_versions)
    decoy.when(
        pipette_data_provider.get_pipette_static_config(
            pipette_dict=pipette_dict, tip_overlap_version=tip_overlap_versions
        )
    ).then_return(loaded_static_pipette_data)

    result = await subject.load_pipette(
        pipette_name=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
        pipette_id="my-pipette-id",
        tip_overlap_version=tip_overlap_versions,
    )

    assert result == LoadedPipetteData(
        pipette_id="my-pipette-id",
        serial_number="world",
        static_config=loaded_static_pipette_data,
    )


async def test_load_pipette_use_virtual(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    loaded_static_pipette_data: LoadedStaticPipetteData,
    subject: EquipmentHandler,
    tip_overlap_versions: str,
    virtual_pipette_data_provider: pipette_data_provider.VirtualPipetteDataProvider,
) -> None:
    """It should use the provided ID rather than generating an ID for the pipette."""
    decoy.when(state_store.config.use_virtual_pipettes).then_return(True)
    decoy.when(state_store.config.robot_type).then_return("OT-2 Standard")
    decoy.when(model_utils.generate_id()).then_return("unique-id")
    decoy.when(model_utils.generate_id(prefix="fake-serial-number-")).then_return(
        "fake-serial"
    )
    decoy.when(
        pipette_data_provider.validate_and_default_tip_overlap_version(
            tip_overlap_versions
        )
    ).then_return(tip_overlap_versions)
    decoy.when(
        virtual_pipette_data_provider.get_virtual_pipette_static_config(
            PipetteNameType.P300_SINGLE.value, "unique-id", tip_overlap_versions
        )
    ).then_return(loaded_static_pipette_data)

    result = await subject.load_pipette(
        pipette_name=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
        pipette_id=None,
        tip_overlap_version=tip_overlap_versions,
    )

    assert result == LoadedPipetteData(
        pipette_id="unique-id",
        serial_number="fake-serial",
        static_config=loaded_static_pipette_data,
    )


async def test_load_pipette_raises_if_pipette_not_attached(
    decoy: Decoy,
    model_utils: ModelUtils,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    subject: EquipmentHandler,
) -> None:
    """Loading a pipette should raise if unable to cache instruments."""
    decoy.when(state_store.config.use_virtual_pipettes).then_return(False)

    decoy.when(model_utils.generate_id()).then_return("unique-id")

    decoy.when(
        await hardware_api.cache_instruments(
            {HwMount.LEFT: PipetteNameType.P300_SINGLE.value}
        )
    ).then_raise(
        RuntimeError(
            "mount LEFT: instrument p300_single was requested, "
            "but no instrument is present"
        )
    )

    with pytest.raises(
        errors.FailedToLoadPipetteError, match=".+p300_single was requested"
    ):
        await subject.load_pipette(
            pipette_name=PipetteNameType.P300_SINGLE,
            mount=MountType.LEFT,
            pipette_id=None,
            tip_overlap_version="v9999",
        )


async def test_load_module(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    module_data_provider: ModuleDataProvider,
    hardware_api: HardwareControlAPI,
    tempdeck_v1_def: ModuleDefinition,
    tempdeck_v2_def: ModuleDefinition,
    temp_module_v1: AbstractModule,
    temp_module_v2: AbstractModule,
    subject: EquipmentHandler,
) -> None:
    """It should load a module, returning its ID, serial & definition in result."""
    decoy.when(model_utils.ensure_id("input-module-id")).then_return("module-id")

    decoy.when(
        module_data_provider.get_definition(ModuleModel.TEMPERATURE_MODULE_V1)
    ).then_return(tempdeck_v1_def)

    decoy.when(
        module_data_provider.get_definition(ModuleModel.TEMPERATURE_MODULE_V2)
    ).then_return(tempdeck_v2_def)

    decoy.when(hardware_api.attached_modules).then_return(
        [
            temp_module_v1,
            temp_module_v2,
        ]
    )

    decoy.when(state_store.config).then_return(_make_config(use_virtual_modules=False))

    decoy.when(
        state_store.modules.select_hardware_module_to_load(
            model=ModuleModel.TEMPERATURE_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            attached_modules=[
                HardwareModule(serial_number="serial-1", definition=tempdeck_v1_def),
                HardwareModule(serial_number="serial-2", definition=tempdeck_v2_def),
            ],
            expected_serial_number=None,
        )
    ).then_return(HardwareModule(serial_number="serial-1", definition=tempdeck_v1_def))

    result = await subject.load_module(
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        module_id="input-module-id",
    )

    assert result == LoadedModuleData(
        module_id="module-id",
        serial_number="serial-1",
        definition=tempdeck_v1_def,
    )


async def test_load_module_using_virtual(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    module_data_provider: ModuleDataProvider,
    hardware_api: HardwareControlAPI,
    tempdeck_v1_def: ModuleDefinition,
    tempdeck_v2_def: ModuleDefinition,
    temp_module_v1: AbstractModule,
    temp_module_v2: AbstractModule,
    subject: EquipmentHandler,
) -> None:
    """It should load a virtual module."""
    decoy.when(model_utils.ensure_id("input-module-id")).then_return("module-id")

    decoy.when(model_utils.generate_id(prefix="fake-serial-number-")).then_return(
        "fake-serial-number-abc123"
    )

    decoy.when(
        module_data_provider.get_definition(ModuleModel.TEMPERATURE_MODULE_V1)
    ).then_return(tempdeck_v1_def)

    decoy.when(state_store.config).then_return(_make_config(use_virtual_modules=True))

    result = await subject.load_module(
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        module_id="input-module-id",
    )

    assert result == LoadedModuleData(
        module_id="module-id",
        serial_number="fake-serial-number-abc123",
        definition=tempdeck_v1_def,
    )


async def test_load_magnetic_block(
    decoy: Decoy,
    model_utils: ModelUtils,
    state_store: StateStore,
    module_data_provider: ModuleDataProvider,
    hardware_api: HardwareControlAPI,
    mag_block_v1_def: ModuleDefinition,
    subject: EquipmentHandler,
) -> None:
    """It should load a mag block, returning its ID & definition in result."""
    decoy.when(model_utils.ensure_id("input-module-id")).then_return("module-id")

    decoy.when(
        module_data_provider.get_definition(ModuleModel.MAGNETIC_BLOCK_V1)
    ).then_return(mag_block_v1_def)

    result = await subject.load_magnetic_block(
        model=ModuleModel.MAGNETIC_BLOCK_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        module_id="input-module-id",
    )

    assert result == LoadedModuleData(
        module_id="module-id",
        serial_number=None,
        definition=mag_block_v1_def,
    )


def test_get_module_hardware_api(
    decoy: Decoy,
    state_store: StateStore,
    hardware_api: HardwareControlAPI,
    subject: EquipmentHandler,
) -> None:
    """It should get a module's hardware API."""
    module_1 = decoy.mock(cls=TempDeck)
    module_2 = decoy.mock(cls=MagDeck)
    module_3 = decoy.mock(cls=HeaterShaker)

    decoy.when(state_store.config).then_return(_make_config(use_virtual_modules=False))
    decoy.when(state_store.modules.get_serial_number("module-id")).then_return(
        "serial-2"
    )

    decoy.when(module_1.device_info).then_return({"serial": "serial-1"})
    decoy.when(module_2.device_info).then_return({"serial": "serial-2"})
    decoy.when(module_3.device_info).then_return({"serial": "serial-3"})
    decoy.when(hardware_api.attached_modules).then_return(
        [module_1, module_2, module_3]
    )

    result = subject.get_module_hardware_api(cast(Any, "module-id"))
    assert result is module_2


def test_get_module_hardware_api_virtual(
    decoy: Decoy,
    state_store: StateStore,
    hardware_api: HardwareControlAPI,
    subject: EquipmentHandler,
) -> None:
    """It should return None if modules are being virtualized."""
    module_1 = decoy.mock(cls=TempDeck)
    module_2 = decoy.mock(cls=MagDeck)
    module_3 = decoy.mock(cls=HeaterShaker)

    decoy.when(state_store.config).then_return(_make_config(use_virtual_modules=True))
    decoy.when(state_store.modules.get_serial_number("module-id")).then_return(
        "serial-2"
    )

    decoy.when(module_1.device_info).then_return({"serial": "serial-1"})
    decoy.when(module_2.device_info).then_return({"serial": "serial-2"})
    decoy.when(module_3.device_info).then_return({"serial": "serial-3"})
    decoy.when(hardware_api.attached_modules).then_return(
        [module_1, module_2, module_3]
    )

    result = subject.get_module_hardware_api(cast(Any, "module-id"))
    assert result is None


def test_get_module_hardware_api_missing(
    decoy: Decoy,
    state_store: StateStore,
    hardware_api: HardwareControlAPI,
    subject: EquipmentHandler,
) -> None:
    """It should raise an error if a module's hardware API is not found."""
    module_1 = decoy.mock(cls=TempDeck)
    module_2 = decoy.mock(cls=MagDeck)
    module_3 = decoy.mock(cls=HeaterShaker)

    decoy.when(state_store.config).then_return(_make_config(use_virtual_modules=False))
    decoy.when(state_store.modules.get_serial_number("module-id")).then_return(
        "the-limit-does-not-exist"
    )

    decoy.when(module_1.device_info).then_return({"serial": "serial-1"})
    decoy.when(module_2.device_info).then_return({"serial": "serial-2"})
    decoy.when(module_3.device_info).then_return({"serial": "serial-3"})
    decoy.when(hardware_api.attached_modules).then_return(
        [module_1, module_2, module_3]
    )

    with pytest.raises(errors.ModuleNotAttachedError):
        subject.get_module_hardware_api(cast(Any, "module-id"))
