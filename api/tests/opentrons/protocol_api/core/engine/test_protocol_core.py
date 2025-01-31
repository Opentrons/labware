"""Test for the ProtocolEngine-based protocol API core."""

import inspect
from typing import Optional, Type, cast, Tuple

import pytest
from opentrons_shared_data import liquid_classes
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
)
from decoy import Decoy

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.types import (
    DeckDefinitionV5,
    SlotDefV3,
)
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.labware.types import (
    LabwareDefinition as LabwareDefDict,
    LabwareUri,
)
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.robot.types import RobotType

from opentrons.types import DeckSlotName, StagingSlotName, Mount, MountType, Point
from opentrons.protocol_api import OFF_DECK
from opentrons.hardware_control import SyncHardwareAPI, SynchronousAdapter
from opentrons.hardware_control.modules import AbstractModule
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    TemperatureModuleModel,
    MagneticModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    MagneticBlockModel,
)
from opentrons.protocol_engine import (
    ModuleModel as EngineModuleModel,
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    AddressableAreaLocation,
    ModuleDefinition,
    LabwareMovementStrategy,
    LoadedLabware,
    LoadedModule,
    commands,
    LabwareOffsetVector,
)
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine.types import (
    Liquid as PE_Liquid,
    HexColor,
    FlowRates,
    OFF_DECK_LOCATION,
)
from opentrons.protocol_engine.errors import (
    LabwareNotLoadedOnModuleError,
    LabwareNotLoadedOnLabwareError,
)
from opentrons.protocol_engine.state.labware import (
    LabwareLoadParams as EngineLabwareLoadParams,
)

from opentrons.protocol_api.core.labware import LabwareLoadParams
from opentrons.protocol_api.core.engine import (
    deck_conflict,
    ProtocolCore,
    InstrumentCore,
    LabwareCore,
    ModuleCore,
    load_labware_params,
)
from opentrons.protocol_api._liquid import Liquid, LiquidClass
from opentrons.protocol_api.disposal_locations import TrashBin, WasteChute
from opentrons.protocol_api.core.engine.exceptions import InvalidModuleLocationError
from opentrons.protocol_api.core.engine.module_core import (
    TemperatureModuleCore,
    MagneticModuleCore,
    ThermocyclerModuleCore,
    HeaterShakerModuleCore,
    NonConnectedModuleCore,
)
from opentrons.protocol_api import validation, MAX_SUPPORTED_VERSION

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT2_DECK,
    STANDARD_OT3_DECK,
)

from ... import versions_below, versions_at_or_above


@pytest.fixture(scope="session")
def ot2_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT2_DECK, 5)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 5)


@pytest.fixture(autouse=True)
def patch_mock_load_labware_params(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out load_labware_params.py functions."""
    for name, func in inspect.getmembers(load_labware_params, inspect.isfunction):
        monkeypatch.setattr(load_labware_params, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def patch_mock_load_liquid_class_def(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out liquid_classes.load_definition() function."""
    mock_load = decoy.mock(func=liquid_classes.load_definition)
    monkeypatch.setattr(liquid_classes, "load_definition", mock_load)


@pytest.fixture(autouse=True)
def patch_mock_validation(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out validation.py functions."""
    for name, func in inspect.getmembers(validation, inspect.isfunction):
        monkeypatch.setattr(validation, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def patch_mock_deck_conflict_check(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace deck_conflict.check() with a mock."""
    mock = decoy.mock(func=deck_conflict.check)
    monkeypatch.setattr(deck_conflict, "check", mock)


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def api_version() -> APIVersion:
    """Get an API version to apply to the interface."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def mock_sync_module_hardware(decoy: Decoy) -> SynchronousAdapter[AbstractModule]:
    """Get a mock synchronous module hardware."""
    return decoy.mock(name="SynchronousAdapter[AbstractModule]")  # type: ignore[no-any-return]


@pytest.fixture
def mock_sync_hardware_api(decoy: Decoy) -> SyncHardwareAPI:
    """Get a mock hardware API."""
    return decoy.mock(cls=SyncHardwareAPI)


@pytest.fixture
# APIv2.15 because we're expecting a fixed trash.
@pytest.mark.parametrize("api_version", [APIVersion(2, 15)])
def subject(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    api_version: APIVersion,
    mock_sync_hardware_api: SyncHardwareAPI,
) -> ProtocolCore:
    """Get a ProtocolCore test subject with its dependencies mocked out."""
    decoy.when(mock_engine_client.state.labware.get_fixed_trash_id()).then_return(
        "fixed-trash-123"
    )
    decoy.when(
        mock_engine_client.state.labware.get_definition("fixed-trash-123")
    ).then_return(
        LabwareDefinition.model_construct(ordering=[["A1"]])  # type: ignore[call-arg]
    )

    return ProtocolCore(
        engine_client=mock_engine_client,
        api_version=api_version,
        sync_hardware=mock_sync_hardware_api,
    )


@pytest.mark.parametrize("api_version", [APIVersion(2, 3)])
def test_api_version(
    decoy: Decoy, subject: ProtocolCore, api_version: APIVersion
) -> None:
    """Should return the protocol version."""
    assert subject.api_version == api_version


def test_get_slot_definition(
    ot2_standard_deck_def: DeckDefinitionV5, subject: ProtocolCore, decoy: Decoy
) -> None:
    """It should return a deck slot's definition."""
    expected_slot_def = cast(
        SlotDefV3,
        {
            "id": "abc",
            "position": [1, 2, 3],
            "boundingBox": {
                "xDimension": 4,
                "yDimension": 5,
                "zDimension": 6,
            },
            "displayName": "xyz",
            "compatibleModuleTypes": [],
        },
    )
    decoy.when(
        subject._engine_client.state.addressable_areas.get_slot_definition(
            DeckSlotName.SLOT_6.id
        )
    ).then_return(expected_slot_def)
    assert subject.get_slot_definition(DeckSlotName.SLOT_6) == expected_slot_def


# APIv2.15 because we're expecting a fixed trash.
@pytest.mark.parametrize("api_version", [APIVersion(2, 15)])
def test_fixed_trash(subject: ProtocolCore) -> None:
    """It should have a single labware core for the fixed trash."""
    result = subject.fixed_trash

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "fixed-trash-123"
    assert subject.get_labware_cores() == [result]

    # verify it's the same core every time
    assert subject.fixed_trash is result


def test_get_slot_item_empty(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return None for an empty deck slot."""
    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_1,
        )
    ).then_return(None)

    assert subject.get_slot_item(DeckSlotName.SLOT_1) is None


@pytest.mark.parametrize(
    "api_version", versions_below(APIVersion(2, 19), flex_only=False)
)
def test_load_instrument_pre_219(
    decoy: Decoy,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadPipette command."""
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadPipetteParams(
                pipetteName=PipetteNameType.P300_SINGLE,
                mount=MountType.LEFT,
                tipOverlapNotAfterVersion="v0",
                liquidPresenceDetection=False,
            )
        )
    ).then_return(commands.LoadPipetteResult(pipetteId="cool-pipette"))

    decoy.when(
        mock_engine_client.state.pipettes.get_flow_rates("cool-pipette")
    ).then_return(
        FlowRates(
            default_aspirate={"1.1": 22},
            default_dispense={"3.3": 44},
            default_blow_out={"5.5": 66},
        ),
    )

    result = subject.load_instrument(
        instrument_name=PipetteNameType.P300_SINGLE, mount=Mount.LEFT
    )

    assert isinstance(result, InstrumentCore)
    assert result.pipette_id == "cool-pipette"


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 20)))
def test_load_instrument_post_220(
    decoy: Decoy,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadPipette command."""
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadPipetteParams(
                pipetteName=PipetteNameType.P300_SINGLE,
                mount=MountType.LEFT,
                tipOverlapNotAfterVersion="v3",
                liquidPresenceDetection=False,
            )
        )
    ).then_return(commands.LoadPipetteResult(pipetteId="cool-pipette"))

    decoy.when(
        mock_engine_client.state.pipettes.get_flow_rates("cool-pipette")
    ).then_return(
        FlowRates(
            default_aspirate={"1.1": 22},
            default_dispense={"3.3": 44},
            default_blow_out={"5.5": 66},
        ),
    )

    result = subject.load_instrument(
        instrument_name=PipetteNameType.P300_SINGLE, mount=Mount.LEFT
    )

    assert isinstance(result, InstrumentCore)
    assert result.pipette_id == "cool-pipette"


def test_load_labware(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware command."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_labware(
        load_name="some_labware",
        location=DeckSlotName.SLOT_5,
        label="some_display_name",  # maps to optional display name
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_5,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(DeckSlotName.SLOT_5) is result


def test_load_labware_on_staging_slot(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware command for a labware on a staging slot."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=AddressableAreaLocation(addressableAreaName="B4"),
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_labware(
        load_name="some_labware",
        location=StagingSlotName.SLOT_B4,
        label="some_display_name",  # maps to optional display name
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=StagingSlotName.SLOT_B4,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(StagingSlotName.SLOT_B4) is result


def test_load_labware_on_labware(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware command onto an OnLabware location."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("labware-id")

    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=OnLabwareLocation(labwareId="labware-id"),
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    decoy.when(
        mock_engine_client.state.labware.get_id_by_labware("labware-id")
    ).then_return("abc123")

    result = subject.load_labware(
        load_name="some_labware",
        location=mock_labware_core,
        label="some_display_name",
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    assert subject.get_labware_on_labware(mock_labware_core) is result


def test_load_labware_off_deck(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware off deck command."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=OFF_DECK_LOCATION,
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_labware(
        load_name="some_labware",
        location=OFF_DECK,
        label="some_display_name",  # maps to optional display name
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )


def test_load_adapter(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware command for an adapter."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_adapter",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
                loadName="some_adapter",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_adapter(
        load_name="some_adapter",
        location=DeckSlotName.SLOT_5,
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_5,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(DeckSlotName.SLOT_5) is result


def test_load_adapter_on_staging_slot(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLabware command for an adapter."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_adapter",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=AddressableAreaLocation(addressableAreaName="B4"),
                loadName="some_adapter",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_adapter(
        load_name="some_adapter",
        location=StagingSlotName.SLOT_B4,
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=StagingSlotName.SLOT_B4,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(StagingSlotName.SLOT_B4) is result


def test_load_lid(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLid command."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("labware-id")
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLidParams(
                location=OnLabwareLocation(labwareId="labware-id"),
                loadName="some_labware",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLidResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(ordering=[]),  # type: ignore[call-arg]
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_lid(
        load_name="some_labware",
        location=mock_labware_core,
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_5,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(DeckSlotName.SLOT_5) is result


def test_load_lid_stack(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a LoadLidStack command."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLidStackParams(
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
                loadName="some_labware",
                namespace="some_namespace",
                version=9001,
                quantity=5,
            )
        )
    ).then_return(
        commands.LoadLidStackResult(
            stackLabwareId="abc123",
            labwareIds=["1", "2", "3", "4", "5"],
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    result = subject.load_lid_stack(
        load_name="some_labware",
        location=DeckSlotName.SLOT_5,
        namespace="a_namespace",
        version=456,
        quantity=5,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"
    assert subject.get_labware_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_5,
        )
    ).then_return(
        LoadedLabware.model_construct(id="abc123")  # type: ignore[call-arg]
    )

    assert subject.get_slot_item(DeckSlotName.SLOT_5) is result


def test_load_trash_bin(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should load a trash bin."""
    prior_disposal_locations = subject.get_disposal_locations()
    trash = subject.load_trash_bin(
        slot_name=DeckSlotName.SLOT_D2, area_name="my trendy area"
    )
    assert isinstance(trash, TrashBin)
    decoy.verify(
        mock_engine_client.state.addressable_areas.raise_if_area_not_in_deck_configuration(
            "my trendy area"
        ),
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            new_trash_bin=trash,
            existing_disposal_locations=prior_disposal_locations,
            existing_labware_ids=[],
            existing_module_ids=[],
        ),
        mock_engine_client.add_addressable_area("my trendy area"),
    )

    assert trash in subject.get_disposal_locations()


def test_load_ot2_fixed_trash_bin(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should load a fixed trash bin for the OT-2."""
    prior_disposal_locations = subject.get_disposal_locations()
    subject.load_ot2_fixed_trash_bin()
    fixed_trash = subject.get_disposal_locations()[-1]
    assert isinstance(fixed_trash, TrashBin)
    assert fixed_trash.area_name == "fixedTrash"
    decoy.verify(
        mock_engine_client.state.addressable_areas.raise_if_area_not_in_deck_configuration(
            "fixedTrash"
        ),
        times=0,
    )
    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            new_trash_bin=fixed_trash,
            existing_disposal_locations=prior_disposal_locations,
            existing_labware_ids=[],
            existing_module_ids=[],
        ),
        times=0,
    )
    decoy.verify(mock_engine_client.add_addressable_area("fixedTrash"), times=0)


def test_load_waste_chute(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should load a waste chute."""
    waste_chute = subject.load_waste_chute()
    assert isinstance(waste_chute, WasteChute)
    decoy.verify(
        mock_engine_client.state.addressable_areas.raise_if_area_not_in_deck_configuration(
            "1ChannelWasteChute"
        ),
        mock_engine_client.add_addressable_area("1ChannelWasteChute"),
    )

    assert waste_chute in subject.get_disposal_locations()


@pytest.mark.parametrize(
    argnames=["use_gripper", "pause_for_manual_move", "expected_strategy"],
    argvalues=[
        (True, False, LabwareMovementStrategy.USING_GRIPPER),
        (True, True, LabwareMovementStrategy.USING_GRIPPER),
        (False, False, LabwareMovementStrategy.MANUAL_MOVE_WITHOUT_PAUSE),
        (False, True, LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE),
    ],
)
@pytest.mark.parametrize(
    argnames=["pick_up_offset", "drop_offset"],
    argvalues=[
        (None, None),
        (None, (4, 5, 6)),
        ((4, 5, 6), (4, 5, 6)),
    ],
)
def test_move_labware(
    decoy: Decoy,
    subject: ProtocolCore,
    mock_engine_client: EngineClient,
    expected_strategy: LabwareMovementStrategy,
    use_gripper: bool,
    pause_for_manual_move: bool,
    pick_up_offset: Optional[Tuple[float, float, float]],
    drop_offset: Optional[Tuple[float, float, float]],
) -> None:
    """It should issue a move labware command to the engine."""
    decoy.when(
        mock_engine_client.state.labware.get_definition("labware-id")
    ).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )
    labware = LabwareCore(labware_id="labware-id", engine_client=mock_engine_client)
    subject.move_labware(
        labware_core=labware,
        new_location=DeckSlotName.SLOT_5,
        use_gripper=use_gripper,
        pause_for_manual_move=pause_for_manual_move,
        pick_up_offset=pick_up_offset,
        drop_offset=drop_offset,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveLabwareParams(
                labwareId="labware-id",
                newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
                strategy=expected_strategy,
                pickUpOffset=LabwareOffsetVector(x=4, y=5, z=6)
                if pick_up_offset
                else None,
                dropOffset=LabwareOffsetVector(x=4, y=5, z=6) if drop_offset else None,
            )
        ),
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="labware-id",
        ),
    )


def test_move_labware_on_staging_slot(
    decoy: Decoy,
    subject: ProtocolCore,
    mock_engine_client: EngineClient,
    api_version: APIVersion,
) -> None:
    """It should issue a move labware command to the engine."""
    decoy.when(
        mock_engine_client.state.labware.get_definition("labware-id")
    ).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )
    labware = LabwareCore(labware_id="labware-id", engine_client=mock_engine_client)
    subject.move_labware(
        labware_core=labware,
        new_location=StagingSlotName.SLOT_B4,
        use_gripper=False,
        pause_for_manual_move=True,
        pick_up_offset=None,
        drop_offset=None,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveLabwareParams(
                labwareId="labware-id",
                newLocation=AddressableAreaLocation(addressableAreaName="B4"),
                strategy=LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE,
                pickUpOffset=None,
                dropOffset=None,
            )
        ),
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="labware-id",
        ),
    )


def test_move_labware_on_non_connected_module(
    decoy: Decoy,
    subject: ProtocolCore,
    mock_engine_client: EngineClient,
    api_version: APIVersion,
) -> None:
    """It should issue a move labware command to the engine."""
    decoy.when(
        mock_engine_client.state.labware.get_definition("labware-id")
    ).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )
    labware = LabwareCore(labware_id="labware-id", engine_client=mock_engine_client)
    non_connected_module_core = NonConnectedModuleCore(
        module_id="module-id",
        engine_client=mock_engine_client,
        api_version=api_version,
    )
    subject.move_labware(
        labware_core=labware,
        new_location=non_connected_module_core,
        use_gripper=False,
        pause_for_manual_move=True,
        pick_up_offset=None,
        drop_offset=None,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveLabwareParams(
                labwareId="labware-id",
                newLocation=ModuleLocation(moduleId="module-id"),
                strategy=LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE,
                pickUpOffset=None,
                dropOffset=None,
            )
        ),
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="labware-id",
        ),
    )


def test_move_labware_off_deck(
    decoy: Decoy,
    subject: ProtocolCore,
    mock_engine_client: EngineClient,
    api_version: APIVersion,
) -> None:
    """It should issue a move labware command to the engine with pause strategy."""
    decoy.when(
        mock_engine_client.state.labware.get_definition("labware-id")
    ).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )
    labware = LabwareCore(labware_id="labware-id", engine_client=mock_engine_client)

    subject.move_labware(
        labware_core=labware,
        new_location=OFF_DECK,
        use_gripper=False,
        pause_for_manual_move=True,
        pick_up_offset=None,
        drop_offset=None,
    )
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveLabwareParams(
                labwareId="labware-id",
                newLocation=OFF_DECK_LOCATION,
                strategy=LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE,
                pickUpOffset=None,
                dropOffset=None,
            )
        ),
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="labware-id",
        ),
    )


def test_load_labware_on_module(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_module_hardware: SynchronousAdapter[AbstractModule],
    subject: ProtocolCore,
    api_version: APIVersion,
) -> None:
    """It should issue a LoadLabware command."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=ModuleLocation(moduleId="module-id"),
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    module_core = ModuleCore(
        module_id="module-id",
        engine_client=mock_engine_client,
        api_version=api_version,
        sync_module_hardware=mock_sync_module_hardware,
    )

    result = subject.load_labware(
        load_name="some_labware",
        location=module_core,
        label="some_display_name",  # maps to optional display name
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.labware.get_id_by_module("module-id")
    ).then_return("abc123")

    assert subject.get_labware_on_module(module_core) is result


def test_load_labware_on_non_connected_module(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
    api_version: APIVersion,
) -> None:
    """It should issue a LoadLabware command."""
    decoy.when(
        mock_engine_client.state.labware.find_custom_labware_load_params()
    ).then_return([EngineLabwareLoadParams("hello", "world", 654)])

    decoy.when(
        load_labware_params.resolve(
            "some_labware",
            "a_namespace",
            456,
            [EngineLabwareLoadParams("hello", "world", 654)],
        )
    ).then_return(("some_namespace", 9001))

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLabwareParams(
                location=ModuleLocation(moduleId="module-id"),
                loadName="some_labware",
                displayName="some_display_name",
                namespace="some_namespace",
                version=9001,
            )
        )
    ).then_return(
        commands.LoadLabwareResult(
            labwareId="abc123",
            definition=LabwareDefinition.model_construct(),  # type: ignore[call-arg]
            offsetId=None,
        )
    )

    decoy.when(mock_engine_client.state.labware.get_definition("abc123")).then_return(
        LabwareDefinition.model_construct(ordering=[])  # type: ignore[call-arg]
    )

    non_connected_module_core = NonConnectedModuleCore(
        module_id="module-id",
        engine_client=mock_engine_client,
        api_version=api_version,
    )

    result = subject.load_labware(
        load_name="some_labware",
        location=non_connected_module_core,
        label="some_display_name",  # maps to optional display name
        namespace="a_namespace",
        version=456,
    )

    assert isinstance(result, LabwareCore)
    assert result.labware_id == "abc123"

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_labware_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.labware.get_id_by_module("module-id")
    ).then_return("abc123")

    assert subject.get_labware_on_module(non_connected_module_core) is result


def test_add_labware_definition(
    decoy: Decoy,
    minimal_labware_def: LabwareDefDict,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should add a labware definition to the engine."""
    decoy.when(
        mock_engine_client.add_labware_definition(
            definition=LabwareDefinition.model_validate(minimal_labware_def)
        )
    ).then_return(LabwareUri("hello/world/123"))

    result = subject.add_labware_definition(minimal_labware_def)

    assert result == LabwareLoadParams("hello", "world", 123)


@pytest.mark.parametrize(
    (
        "requested_model",
        "engine_model",
        "expected_core_cls",
        "slot_name",
        "robot_type",
    ),
    [
        (
            TemperatureModuleModel.TEMPERATURE_V1,
            EngineModuleModel.TEMPERATURE_MODULE_V1,
            TemperatureModuleCore,
            DeckSlotName.SLOT_1,
            "OT-2 Standard",
        ),
        (
            TemperatureModuleModel.TEMPERATURE_V2,
            EngineModuleModel.TEMPERATURE_MODULE_V2,
            TemperatureModuleCore,
            DeckSlotName.SLOT_D1,
            "OT-3 Standard",
        ),
        (
            MagneticModuleModel.MAGNETIC_V1,
            EngineModuleModel.MAGNETIC_MODULE_V1,
            MagneticModuleCore,
            DeckSlotName.SLOT_1,
            "OT-2 Standard",
        ),
        (
            ThermocyclerModuleModel.THERMOCYCLER_V1,
            EngineModuleModel.THERMOCYCLER_MODULE_V1,
            ThermocyclerModuleCore,
            DeckSlotName.SLOT_7,
            "OT-2 Standard",
        ),
        (
            ThermocyclerModuleModel.THERMOCYCLER_V2,
            EngineModuleModel.THERMOCYCLER_MODULE_V2,
            ThermocyclerModuleCore,
            DeckSlotName.SLOT_B1,
            "OT-3 Standard",
        ),
        (
            HeaterShakerModuleModel.HEATER_SHAKER_V1,
            EngineModuleModel.HEATER_SHAKER_MODULE_V1,
            HeaterShakerModuleCore,
            DeckSlotName.SLOT_A1,
            "OT-3 Standard",
        ),
    ],
)
# APIv2.15 because we're expecting a fixed trash.
@pytest.mark.parametrize("api_version", [APIVersion(2, 15)])
def test_load_module(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_hardware_api: SyncHardwareAPI,
    requested_model: ModuleModel,
    engine_model: EngineModuleModel,
    expected_core_cls: Type[ModuleCore],
    subject: ProtocolCore,
    slot_name: DeckSlotName,
    robot_type: RobotType,
) -> None:
    """It should issue a load module engine command."""
    definition = ModuleDefinition.model_construct()  # type: ignore[call-arg]

    mock_hw_mod_1 = decoy.mock(cls=AbstractModule)
    mock_hw_mod_2 = decoy.mock(cls=AbstractModule)

    decoy.when(mock_hw_mod_1.device_info).then_return({"serial": "abc123"})
    decoy.when(mock_hw_mod_2.device_info).then_return({"serial": "xyz789"})
    decoy.when(mock_sync_hardware_api.attached_modules).then_return(
        [mock_hw_mod_1, mock_hw_mod_2]
    )

    decoy.when(mock_engine_client.state.config.robot_type).then_return(robot_type)

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadModuleParams(
                model=engine_model,
                location=DeckSlotLocation(slotName=slot_name),
            )
        )
    ).then_return(
        commands.LoadModuleResult(
            moduleId="abc123",
            definition=definition,
            model=engine_model,
            serialNumber="xyz789",
        )
    )

    result = subject.load_module(
        model=requested_model,
        deck_slot=slot_name,
        configuration=None,
    )

    assert isinstance(result, expected_core_cls)
    assert result.module_id == "abc123"
    assert subject.get_module_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=["fixed-trash-123"],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_module_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=slot_name,
        )
    ).then_return(
        LoadedModule.model_construct(id="abc123")  # type: ignore[call-arg]
    )
    decoy.when(mock_engine_client.state.labware.get_id_by_module("abc123")).then_raise(
        LabwareNotLoadedOnModuleError("oh no")
    )

    assert subject.get_slot_item(slot_name) is result
    assert subject.get_labware_on_module(result) is None


# APIv2.15 because we're expecting a fixed trash.
@pytest.mark.parametrize("api_version", [APIVersion(2, 15)])
def test_load_mag_block(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a load module engine command."""
    definition = ModuleDefinition.model_construct()  # type: ignore[call-arg]

    decoy.when(mock_engine_client.state.config.robot_type).then_return("OT-3 Standard")

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadModuleParams(
                model=EngineModuleModel.MAGNETIC_BLOCK_V1,
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A2),
            )
        )
    ).then_return(
        commands.LoadModuleResult(
            moduleId="abc123",
            definition=definition,
            model=EngineModuleModel.MAGNETIC_BLOCK_V1,
            serialNumber=None,
        )
    )

    result = subject.load_module(
        model=MagneticBlockModel.MAGNETIC_BLOCK_V1,
        deck_slot=DeckSlotName.SLOT_A2,
        configuration=None,
    )

    assert isinstance(result, NonConnectedModuleCore)
    assert result.module_id == "abc123"
    assert subject.get_module_cores() == [result]

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=["fixed-trash-123"],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_module_id="abc123",
        )
    )

    decoy.when(
        mock_engine_client.state.geometry.get_slot_item(
            slot_name=DeckSlotName.SLOT_1,
        )
    ).then_return(
        LoadedModule.model_construct(id="abc123")  # type: ignore[call-arg]
    )
    decoy.when(mock_engine_client.state.labware.get_id_by_module("abc123")).then_raise(
        LabwareNotLoadedOnModuleError("oh no")
    )

    assert subject.get_slot_item(DeckSlotName.SLOT_1) is result
    assert subject.get_labware_on_module(result) is None


@pytest.mark.parametrize(
    ("requested_model", "engine_model", "expected_slot"),
    [
        (
            ThermocyclerModuleModel.THERMOCYCLER_V1,
            EngineModuleModel.THERMOCYCLER_MODULE_V1,
            DeckSlotName.SLOT_B1,
        ),
        (
            ThermocyclerModuleModel.THERMOCYCLER_V2,
            EngineModuleModel.THERMOCYCLER_MODULE_V2,
            DeckSlotName.SLOT_B1,
        ),
    ],
)
def test_load_module_thermocycler_with_no_location(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_hardware_api: SyncHardwareAPI,
    requested_model: ModuleModel,
    engine_model: EngineModuleModel,
    subject: ProtocolCore,
    expected_slot: DeckSlotName,
) -> None:
    """It should issue a load module engine command with location at 7."""
    definition = ModuleDefinition.model_construct()  # type: ignore[call-arg]

    mock_hw_mod = decoy.mock(cls=AbstractModule)
    decoy.when(mock_hw_mod.device_info).then_return({"serial": "xyz789"})
    decoy.when(mock_sync_hardware_api.attached_modules).then_return([mock_hw_mod])
    decoy.when(mock_engine_client.state.config.robot_type).then_return("OT-3 Standard")

    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadModuleParams(
                model=engine_model,
                location=DeckSlotLocation(slotName=expected_slot),
            )
        )
    ).then_return(
        commands.LoadModuleResult(
            moduleId="abc123",
            definition=definition,
            model=engine_model,
            serialNumber="xyz789",
        )
    )

    result = subject.load_module(
        model=requested_model,
        deck_slot=None,
        configuration=None,
    )

    decoy.verify(
        deck_conflict.check(
            engine_state=mock_engine_client.state,
            existing_labware_ids=[],
            existing_module_ids=[],
            existing_disposal_locations=[],
            new_module_id="abc123",
        )
    )

    assert isinstance(result, ThermocyclerModuleCore)
    assert result.module_id == "abc123"


@pytest.mark.parametrize(
    "requested_model",
    [
        HeaterShakerModuleModel.HEATER_SHAKER_V1,
        MagneticModuleModel.MAGNETIC_V1,
        MagneticModuleModel.MAGNETIC_V2,
        TemperatureModuleModel.TEMPERATURE_V1,
        TemperatureModuleModel.TEMPERATURE_V2,
    ],
)
def test_load_module_no_location(
    requested_model: ModuleModel, subject: ProtocolCore
) -> None:
    """Should raise an InvalidModuleLocationError exception."""
    with pytest.raises(InvalidModuleLocationError):
        subject.load_module(model=requested_model, deck_slot=None, configuration=None)


@pytest.mark.parametrize("message", [None, "Hello, world!", ""])
def test_pause(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
    message: Optional[str],
) -> None:
    """It should issue a waitForResume command."""
    subject.pause(msg=message)
    decoy.verify(
        mock_engine_client.execute_command(cmd.WaitForResumeParams(message=message))
    )


@pytest.mark.parametrize("seconds", [0.0, -1.23, 1.23])
@pytest.mark.parametrize("message", [None, "Hello, world!", ""])
def test_delay(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
    seconds: float,
    message: Optional[str],
) -> None:
    """It should issue a waitForDuration command."""
    subject.delay(seconds=seconds, msg=message)
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.WaitForDurationParams(seconds=seconds, message=message)
        )
    )


def test_comment(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should issue a comment command."""
    subject.comment("Hello, world!")
    decoy.verify(
        mock_engine_client.execute_command(cmd.CommentParams(message="Hello, world!"))
    )


def test_home(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should home all axes."""
    subject.home()
    decoy.verify(mock_engine_client.execute_command(cmd.HomeParams(axes=None)), times=1)


def test_is_simulating(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return if simulating."""
    decoy.when(mock_engine_client.state.config.ignore_pause).then_return(True)
    assert subject.is_simulating()


def test_set_rail_lights(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should verify a call to sync client."""
    subject.set_rail_lights(on=True)
    decoy.verify(mock_engine_client.execute_command(cmd.SetRailLightsParams(on=True)))

    subject.set_rail_lights(on=False)
    decoy.verify(mock_engine_client.execute_command(cmd.SetRailLightsParams(on=False)))


def test_get_rail_lights(
    decoy: Decoy, mock_sync_hardware_api: SyncHardwareAPI, subject: ProtocolCore
) -> None:
    """It should get rails light state."""
    decoy.when(mock_sync_hardware_api.get_lights()).then_return({"rails": True})

    result = subject.get_rail_lights_on()
    assert result is True


def test_get_deck_definition(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return the loaded deck definition from engine state."""
    deck_definition = cast(DeckDefinitionV5, {"schemaVersion": "5"})

    decoy.when(mock_engine_client.state.labware.get_deck_definition()).then_return(
        deck_definition
    )

    result = subject.get_deck_definition()

    assert result == deck_definition


def test_get_labware_on_module(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should get the item on top of a given module."""
    mock_module_core = decoy.mock(cls=ModuleCore)
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_module_core.module_id).then_return("abc")
    decoy.when(mock_engine_client.state.labware.get_id_by_module("abc")).then_return(
        "123"
    )

    subject._labware_cores_by_id["123"] = mock_labware_core

    assert subject.get_labware_on_module(mock_module_core) == mock_labware_core


def test_get_labware_on_module_returns_none(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return none if there is no item on top of the module."""
    mock_module_core = decoy.mock(cls=ModuleCore)

    decoy.when(mock_module_core.module_id).then_return("abc")
    decoy.when(mock_engine_client.state.labware.get_id_by_module("abc")).then_raise(
        LabwareNotLoadedOnModuleError("whoops")
    )

    assert subject.get_labware_on_module(mock_module_core) is None


def test_get_labware_on_labware(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should get the item on top of a given labware."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    mock_other_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_labware_core.labware_id).then_return("abc")
    decoy.when(mock_engine_client.state.labware.get_id_by_labware("abc")).then_return(
        "123"
    )

    subject._labware_cores_by_id["123"] = mock_other_labware_core

    assert subject.get_labware_on_labware(mock_labware_core) == mock_other_labware_core


def test_get_labware_on_labware_returns_none(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return none if there is no item on top of the labware."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_labware_core.labware_id).then_return("abc")
    decoy.when(mock_engine_client.state.labware.get_id_by_labware("abc")).then_raise(
        LabwareNotLoadedOnLabwareError("oops")
    )

    assert subject.get_labware_on_labware(mock_labware_core) is None


def test_get_slot_center(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return a slot center from engine state."""
    decoy.when(
        mock_engine_client.state.addressable_areas.get_addressable_area_center(
            DeckSlotName.SLOT_2.id
        )
    ).then_return(Point(1, 2, 3))

    result = subject.get_slot_center(DeckSlotName.SLOT_2)

    assert result == Point(1, 2, 3)


def test_get_highest_z(
    decoy: Decoy, mock_engine_client: EngineClient, subject: ProtocolCore
) -> None:
    """It should return a slot center from engine state."""
    decoy.when(
        mock_engine_client.state.geometry.get_all_obstacle_highest_z()
    ).then_return(9001)

    result = subject.get_highest_z()

    assert result == 9001


def test_add_liquid(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return the created liquid."""
    liquid = PE_Liquid.model_construct(
        id="water-id",
        displayName="water",
        description="water desc",
        displayColor=HexColor("#fff"),
    )

    expected_result = Liquid(
        _id="water-id",
        name="water",
        description="water desc",
        display_color="#fff",
    )

    decoy.when(
        mock_engine_client.add_liquid(
            name="water", color="#fff", description="water desc"
        )
    ).then_return(liquid)

    result = subject.define_liquid(
        name="water", description="water desc", display_color="#fff"
    )

    assert result == expected_result


def test_define_liquid_class(
    decoy: Decoy,
    subject: ProtocolCore,
    minimal_liquid_class_def1: LiquidClassSchemaV1,
    minimal_liquid_class_def2: LiquidClassSchemaV1,
) -> None:
    """It should create a LiquidClass and cache the definition."""
    expected_liquid_class = LiquidClass(
        _name="water1", _display_name="water 1", _by_pipette_setting={}
    )
    decoy.when(liquid_classes.load_definition("water")).then_return(
        minimal_liquid_class_def1
    )
    assert subject.define_liquid_class("water") == expected_liquid_class

    decoy.when(liquid_classes.load_definition("water")).then_return(
        minimal_liquid_class_def2
    )
    assert subject.define_liquid_class("water") == expected_liquid_class


def test_get_labware_location_deck_slot(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return the labware location as a deck slot string."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("abc")

    decoy.when(mock_engine_client.state.labware.get_location("abc")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )
    decoy.when(mock_engine_client.state.config.robot_type).then_return("OT-2 Standard")
    decoy.when(
        validation.internal_slot_to_public_string(DeckSlotName.SLOT_1, "OT-2 Standard")
    ).then_return("777")

    assert subject.get_labware_location(mock_labware_core) == "777"


def test_get_labware_location_module(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return the labware location as a module."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("abc")

    decoy.when(mock_engine_client.state.labware.get_location("abc")).then_return(
        ModuleLocation(moduleId="123")
    )

    mock_module_core = decoy.mock(cls=ModuleCore)
    subject._module_cores_by_id["123"] = mock_module_core

    assert subject.get_labware_location(mock_labware_core) == mock_module_core


def test_get_labware_location_labware(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return the labware location as a labware."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("abc")

    decoy.when(mock_engine_client.state.labware.get_location("abc")).then_return(
        OnLabwareLocation(labwareId="123")
    )

    mock_parent_labware_core = decoy.mock(cls=LabwareCore)
    subject._labware_cores_by_id["123"] = mock_parent_labware_core

    assert subject.get_labware_location(mock_labware_core) == mock_parent_labware_core


def test_get_labware_location_off_deck(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: ProtocolCore,
) -> None:
    """It should return the labware location as None to represent an off deck labware."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    decoy.when(mock_labware_core.labware_id).then_return("abc")

    decoy.when(mock_engine_client.state.labware.get_location("abc")).then_return(
        "offDeck"
    )

    assert subject.get_labware_location(mock_labware_core) is OFF_DECK
