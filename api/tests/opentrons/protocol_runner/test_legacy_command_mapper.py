"""Tests for the ProtocolRunner's LegacyContextPlugin."""
import pytest
from decoy import matchers, Decoy
from datetime import datetime

from opentrons.commands.types import PauseMessage
from opentrons.protocol_engine import (
    DeckSlotLocation,
    ModuleLocation,
    PipetteName,
    ModuleModels,
    ModuleDefinition,
    commands as pe_commands,
    actions as pe_actions,
)
from opentrons.protocol_engine.resources.module_data_provider import ModuleDataProvider
from opentrons.protocol_runner.legacy_command_mapper import (
    LegacyContextCommandError,
    LegacyCommandMapper,
    LegacyCommandParams,
)
from opentrons.protocol_runner.legacy_wrappers import (
    LegacyInstrumentLoadInfo,
    LegacyLabwareLoadInfo,
    LegacyModuleLoadInfo,
    LegacyMagneticModuleModel,
)
from opentrons_shared_data.labware.dev_types import LabwareDefinition
from opentrons_shared_data.module.dev_types import ModuleDefinitionV2
from opentrons.types import DeckSlotName, Mount, MountType


@pytest.fixture
def module_data_provider(decoy: Decoy) -> ModuleDataProvider:
    """Mock module definition fetcher."""
    return decoy.mock(cls=ModuleDataProvider)


def test_map_before_command() -> None:
    """It should map a "before" message to a running command."""
    legacy_command: PauseMessage = {
        "$": "before",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello world"},
        "error": None,
    }

    subject = LegacyCommandMapper()
    result = subject.map_command(legacy_command)

    assert result == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-0",
            status=pe_commands.CommandStatus.RUNNING,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="hello world",
            ),
        )
    )


def test_map_after_command() -> None:
    """It should map an "after" message to a succeeded command."""
    legacy_command_start: PauseMessage = {
        "$": "before",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello world"},
        "error": None,
    }
    legacy_command_end: PauseMessage = {
        "$": "after",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello world"},
        "error": None,
    }

    subject = LegacyCommandMapper()

    _ = subject.map_command(legacy_command_start)
    result = subject.map_command(legacy_command_end)

    assert result == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-0",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="hello world",
            ),
        )
    )


def test_map_after_with_error_command() -> None:
    """It should map an "after" message to a failed command."""
    legacy_command_start: PauseMessage = {
        "$": "before",
        "name": "command.PAUSE",
        "error": None,
        "payload": {"userMessage": "hello world", "text": "hello world"},
    }
    legacy_command_end: PauseMessage = {
        "$": "after",
        "name": "command.PAUSE",
        "error": RuntimeError("oh no"),
        "payload": {"userMessage": "hello world", "text": "hello world"},
    }

    subject = LegacyCommandMapper()

    _ = subject.map_command(legacy_command_start)
    result = subject.map_command(legacy_command_end)

    assert result == pe_actions.FailCommandAction(
        command_id="command.PAUSE-0",
        error_id=matchers.IsA(str),
        failed_at=matchers.IsA(datetime),
        error=matchers.ErrorMatching(  # type: ignore[arg-type]
            LegacyContextCommandError,
            match="oh no",
        ),
    )


def test_command_stack() -> None:
    """It should maintain a command stack to map IDs."""
    legacy_command_1: PauseMessage = {
        "$": "before",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello", "text": "hello"},
        "error": None,
    }
    legacy_command_2: PauseMessage = {
        "$": "before",
        "name": "command.PAUSE",
        "payload": {"userMessage": "goodbye", "text": "goodbye"},
        "error": None,
    }
    legacy_command_3: PauseMessage = {
        "$": "after",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "goodbye"},
        "error": None,
    }
    legacy_command_4: PauseMessage = {
        "$": "after",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello"},
        "error": None,
    }

    subject = LegacyCommandMapper()
    result_1 = subject.map_command(legacy_command_1)
    result_2 = subject.map_command(legacy_command_2)
    result_3 = subject.map_command(legacy_command_3)
    result_4 = subject.map_command(legacy_command_4)

    assert result_1 == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-0",
            status=pe_commands.CommandStatus.RUNNING,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="hello",
            ),
        )
    )
    assert result_2 == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-1",
            status=pe_commands.CommandStatus.RUNNING,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="goodbye",
            ),
        )
    )
    assert result_3 == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-1",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="goodbye",
            ),
        )
    )
    assert result_4 == pe_actions.UpdateCommandAction(
        pe_commands.Custom.construct(
            id="command.PAUSE-0",
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            params=LegacyCommandParams(
                legacyCommandType="command.PAUSE",
                legacyCommandText="hello",
            ),
        )
    )


def test_map_labware_load(minimal_labware_def: LabwareDefinition) -> None:
    """It should correctly map a labware load."""
    input = LegacyLabwareLoadInfo(
        labware_definition=minimal_labware_def,
        labware_namespace="some_namespace",
        labware_load_name="some_load_name",
        labware_version=123,
        deck_slot=DeckSlotName.SLOT_1,
        on_module=False,
        offset_id="labware-offset-id-123",
    )
    expected_output = pe_commands.LoadLabware.construct(
        id=matchers.IsA(str),
        status=pe_commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=pe_commands.LoadLabwareParams.construct(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            namespace="some_namespace",
            loadName="some_load_name",
            version=123,
            labwareId=None,
        ),
        result=pe_commands.LoadLabwareResult.construct(
            labwareId=matchers.IsA(str),
            # Trusting that the exact fields within in the labware definition
            # get passed through correctly.
            definition=matchers.Anything(),
            offsetId="labware-offset-id-123",
        ),
    )
    output = LegacyCommandMapper().map_labware_load(input)
    assert output == expected_output


def test_map_instrument_load() -> None:
    """It should correctly map an instrument load."""
    input = LegacyInstrumentLoadInfo(
        instrument_load_name="p1000_single_gen2",
        mount=Mount.LEFT,
    )
    expected_output = pe_commands.LoadPipette.construct(
        id=matchers.IsA(str),
        status=pe_commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=pe_commands.LoadPipetteParams.construct(
            pipetteName=PipetteName.P1000_SINGLE_GEN2, mount=MountType.LEFT
        ),
        result=pe_commands.LoadPipetteResult.construct(pipetteId=matchers.IsA(str)),
    )

    output = LegacyCommandMapper().map_instrument_load(input)
    assert output == expected_output


def test_map_module_load(
    decoy: Decoy,
    minimal_module_def: ModuleDefinitionV2,
    module_data_provider: ModuleDataProvider,
) -> None:
    """It should correctly map a module load."""
    test_definition = ModuleDefinition.parse_obj(minimal_module_def)
    input = LegacyModuleLoadInfo(
        module_model=LegacyMagneticModuleModel.MAGNETIC_V2,
        deck_slot=DeckSlotName.SLOT_1,
        configuration="conf",
        module_serial="module-serial",
    )
    decoy.when(
        module_data_provider.get_module_definition(ModuleModels.MAGNETIC_MODULE_V2)
    ).then_return(test_definition)
    expected_output = pe_commands.LoadModule.construct(
        id=matchers.IsA(str),
        status=pe_commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=pe_commands.LoadModuleParams.construct(
            model=ModuleModels.MAGNETIC_MODULE_V2,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            moduleId=matchers.IsA(str),
        ),
        result=pe_commands.LoadModuleResult.construct(
            moduleId=matchers.IsA(str),
            moduleSerial="module-serial",
            definition=test_definition,
        ),
    )
    output = LegacyCommandMapper(
        module_data_provider=module_data_provider
    ).map_module_load(input)
    assert output == expected_output


def test_map_module_labware_load(minimal_labware_def: LabwareDefinition) -> None:
    """It should correctly map a labware load on module."""
    load_input = LegacyLabwareLoadInfo(
        labware_definition=minimal_labware_def,
        labware_namespace="some_namespace",
        labware_load_name="some_load_name",
        labware_version=123,
        deck_slot=DeckSlotName.SLOT_1,
        on_module=True,
        offset_id="labware-offset-id-123",
    )

    expected_output = pe_commands.LoadLabware.construct(
        id=matchers.IsA(str),
        status=pe_commands.CommandStatus.SUCCEEDED,
        createdAt=matchers.IsA(datetime),
        startedAt=matchers.IsA(datetime),
        completedAt=matchers.IsA(datetime),
        params=pe_commands.LoadLabwareParams.construct(
            location=ModuleLocation(moduleId="module-123"),
            namespace="some_namespace",
            loadName="some_load_name",
            version=123,
            labwareId=None,
        ),
        result=pe_commands.LoadLabwareResult.construct(
            labwareId=matchers.IsA(str),
            definition=matchers.Anything(),
            offsetId="labware-offset-id-123",
        ),
    )
    subject = LegacyCommandMapper()
    subject._module_id_by_slot = {DeckSlotName.SLOT_1: "module-123"}
    output = subject.map_labware_load(load_input)
    assert output == expected_output
