"""Tests for opentrons.protocol_api.core.engine.ModuleCore."""

import pytest
import inspect
from decoy import Decoy

from opentrons.hardware_control import SynchronousAdapter
from opentrons.hardware_control.modules import AbstractModule
from opentrons.protocol_engine import DeckSlotLocation
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine.types import ModuleModel, ModuleDefinition
from opentrons.protocol_api import MAX_SUPPORTED_VERSION, validation as mock_validation
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api.core.engine.module_core import ModuleCore
from opentrons.types import DeckSlotName


@pytest.fixture
def api_version() -> APIVersion:
    """Get mocked api_version."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def mock_sync_module_hardware(decoy: Decoy) -> SynchronousAdapter[AbstractModule]:
    """Get a mock synchronous module hardware."""
    return decoy.mock(name="SynchronousAdapter[AbstractModule]")  # type: ignore[no-any-return]


@pytest.fixture(autouse=True)
def _mock_validation_module(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out opentrons.legacy.validation functions."""
    for name, func in inspect.getmembers(mock_validation, inspect.isfunction):
        monkeypatch.setattr(mock_validation, name, decoy.mock(func=func))


@pytest.fixture
def subject(
    mock_engine_client: EngineClient,
    api_version: APIVersion,
    mock_sync_module_hardware: SynchronousAdapter[AbstractModule],
) -> ModuleCore:
    """Get a ModuleCore test subject."""
    return ModuleCore(
        module_id="1234",
        engine_client=mock_engine_client,
        api_version=api_version,
        sync_module_hardware=mock_sync_module_hardware,
    )


@pytest.mark.parametrize("api_version", [APIVersion(2, 3)])
def test_api_version(subject: ModuleCore, api_version: APIVersion) -> None:
    """Should return the api_version property."""
    assert subject.api_version == api_version


def test_get_deck_slot(
    decoy: Decoy, subject: ModuleCore, mock_engine_client: EngineClient
) -> None:
    """Should return the deck slot associated to the module id."""
    decoy.when(mock_engine_client.state.modules.get_location("1234")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )

    assert subject.get_deck_slot() == DeckSlotName.SLOT_1


def test_get_deck_slot_id(
    decoy: Decoy, subject: ModuleCore, mock_engine_client: EngineClient
) -> None:
    """It should return the correct deck slot string associated with the module and robot type."""
    decoy.when(mock_engine_client.state.modules.get_location("1234")).then_return(
        DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )

    decoy.when(mock_engine_client.state.config.robot_type).then_return("OT-3 Standard")

    decoy.when(
        mock_validation.internal_slot_to_public_string(
            DeckSlotName.SLOT_1, "OT-3 Standard"
        )
    ).then_return("foo")

    assert subject.get_deck_slot_id() == "foo"


def test_get_model(
    decoy: Decoy, subject: ModuleCore, mock_engine_client: EngineClient
) -> None:
    """It should return the module model."""
    decoy.when(
        mock_engine_client.state.modules.get_connected_model("1234")
    ).then_return(ModuleModel.HEATER_SHAKER_MODULE_V1)

    result = subject.get_model()

    assert result == "heaterShakerModuleV1"


def test_get_display_name(
    decoy: Decoy, subject: ModuleCore, mock_engine_client: EngineClient
) -> None:
    """It should return the module display name."""
    module_definition = ModuleDefinition.model_construct(  # type: ignore[call-arg]
        displayName="abra kadabra",
    )
    decoy.when(mock_engine_client.state.modules.get_definition("1234")).then_return(
        module_definition
    )

    assert subject.get_display_name() == "abra kadabra"
