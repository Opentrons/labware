"""Unit tests for LabwareOffsetProvider."""


from datetime import datetime

import pytest
from decoy import Decoy

from opentrons.types import DeckSlotName, Point
from opentrons.hardware_control.modules.types import TemperatureModuleModel
from opentrons.protocol_engine import (
    ProtocolEngine,
    LabwareOffset,
    LabwareOffsetVector,
    LegacyLabwareOffsetLocation,
    ModuleModel,
)
from opentrons.protocol_engine.state.labware import LabwareView

from opentrons.protocol_api.core.labware import LabwareLoadParams
from opentrons.protocol_api.core.legacy.labware_offset_provider import (
    LabwareOffsetProvider,
    ProvidedLabwareOffset,
)


@pytest.fixture
def protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Return a mock ProtocolEngine."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def labware_view(protocol_engine: ProtocolEngine) -> LabwareView:
    """Return a mock LabwareView."""
    return protocol_engine.state_view.labware


@pytest.fixture
def subject(protocol_engine: ProtocolEngine) -> LabwareOffsetProvider:
    """Return a LabwareOffsetProvider depending on the mocked LabwareView."""
    return LabwareOffsetProvider(engine=protocol_engine)


def test_find_something(
    subject: LabwareOffsetProvider, labware_view: LabwareView, decoy: Decoy
) -> None:
    """It should pass along simplified labware offset info from Protocol Engine."""
    decoy.when(
        labware_view.find_applicable_labware_offset_by_legacy_location(
            definition_uri="some_namespace/some_load_name/123",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V1,
            ),
        )
    ).then_return(
        LabwareOffset(
            # Subject should pass these along:
            id="labware-offset-id",
            vector=LabwareOffsetVector(x=1, y=2, z=3),
            # Shouldn't matter; subject should throw these away:
            definitionUri="result_definition_uri_should_not_matter",
            location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_11),
            createdAt=datetime(year=2021, month=1, day=1),
        )
    )

    result = subject.find(
        load_params=LabwareLoadParams("some_namespace", "some_load_name", 123),
        requested_module_model=TemperatureModuleModel.TEMPERATURE_V1,
        deck_slot=DeckSlotName.SLOT_1,
    )

    assert result == ProvidedLabwareOffset(
        delta=Point(x=1, y=2, z=3),
        offset_id="labware-offset-id",
    )


def test_find_nothing(
    subject: LabwareOffsetProvider, labware_view: LabwareView, decoy: Decoy
) -> None:
    """It should return a zero offset when Protocol Engine has no offset to provide."""
    decoy_call_rehearsal = (
        labware_view.find_applicable_labware_offset_by_legacy_location(
            definition_uri="some_namespace/some_load_name/123",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V1,
            ),
        )
    )

    decoy.when(decoy_call_rehearsal).then_return(None)

    result = subject.find(
        load_params=LabwareLoadParams("some_namespace", "some_load_name", 123),
        requested_module_model=TemperatureModuleModel.TEMPERATURE_V1,
        deck_slot=DeckSlotName.SLOT_1,
    )

    assert result == ProvidedLabwareOffset(delta=Point(x=0, y=0, z=0), offset_id=None)
