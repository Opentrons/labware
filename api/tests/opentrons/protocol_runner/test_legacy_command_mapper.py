"""Tests for the PythonAndLegacyRunner's LegacyCommandMapper."""
import inspect
from datetime import datetime
from typing import cast

from opentrons.protocol_engine.state.update_types import (
    LoadPipetteUpdate,
    LoadedLabwareUpdate,
    PipetteConfigUpdate,
    StateUpdate,
)
import pytest
from decoy import matchers, Decoy

from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control.modules.types import TemperatureModuleModel
from opentrons.legacy_commands.types import CommentMessage, PauseMessage, CommandMessage
from opentrons.protocol_api.core.legacy.load_info import (
    LabwareLoadInfo as LegacyLabwareLoadInfo,
    InstrumentLoadInfo as LegacyInstrumentLoadInfo,
    ModuleLoadInfo as LegacyModuleLoadInfo,
)
from opentrons.protocol_engine import (
    DeckSlotLocation,
    ModuleLocation,
    ModuleModel,
    ModuleDefinition,
    commands as pe_commands,
    actions as pe_actions,
)
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.resources import (
    ModuleDataProvider,
    pipette_data_provider,
)
from opentrons.protocol_engine.resources.pipette_data_provider import (
    LoadedStaticPipetteData,
)
from opentrons.protocol_runner.legacy_command_mapper import (
    LegacyContextCommandError,
    LegacyCommandMapper,
)
from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.module.types import ModuleDefinitionV3
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.types import DeckSlotName, Mount, MountType


@pytest.fixture
def module_data_provider(decoy: Decoy) -> ModuleDataProvider:
    """Mock module definition fetcher."""
    return decoy.mock(cls=ModuleDataProvider)


@pytest.fixture(autouse=True)
def _use_mock_pipette_data_provider(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock module definition fetcher."""
    for name, func in inspect.getmembers(pipette_data_provider, inspect.isfunction):
        monkeypatch.setattr(pipette_data_provider, name, decoy.mock(func=func))


def test_map_before_command() -> None:
    """It should map a "before" message to a running command."""
    legacy_command: CommentMessage = {
        "$": "before",
        "id": "message-id",
        "name": "command.COMMENT",
        "payload": {"text": "hello world"},
        "error": None,
    }

    subject = LegacyCommandMapper()
    result = subject.map_command(legacy_command)

    assert result == [
        pe_actions.QueueCommandAction(
            command_id="command.COMMENT-0",
            created_at=matchers.IsA(datetime),
            request=pe_commands.CommentCreate(
                key="command.COMMENT-0",
                params=pe_commands.CommentParams(
                    message="hello world",
                ),
            ),
            request_hash=None,
        ),
        pe_actions.RunCommandAction(
            command_id="command.COMMENT-0",
            started_at=matchers.IsA(datetime),
        ),
    ]


def test_map_after_command() -> None:
    """It should map an "after" message to a succeeded command."""
    legacy_command_start: CommentMessage = {
        "$": "before",
        "id": "message-id",
        "name": "command.COMMENT",
        "payload": {"text": "hello world"},
        "error": None,
    }
    legacy_command_end: CommentMessage = {
        "$": "after",
        "id": "message-id",
        "name": "command.COMMENT",
        "payload": {"text": "hello world"},
        "error": None,
    }

    subject = LegacyCommandMapper()

    _ = subject.map_command(legacy_command_start)
    result = subject.map_command(legacy_command_end)

    assert result == [
        pe_actions.SucceedCommandAction(
            command=pe_commands.Comment.model_construct(
                id="command.COMMENT-0",
                key="command.COMMENT-0",
                status=pe_commands.CommandStatus.SUCCEEDED,
                createdAt=matchers.IsA(datetime),
                startedAt=matchers.IsA(datetime),
                completedAt=matchers.IsA(datetime),
                params=pe_commands.CommentParams(
                    message="hello world",
                ),
                result=pe_commands.CommentResult(),
                notes=[],
            ),
        )
    ]


def test_map_after_with_error_command() -> None:
    """It should map an "after" message to a failed command."""
    legacy_command_start: CommentMessage = {
        "$": "before",
        "id": "message-id",
        "name": "command.COMMENT",
        "error": None,
        "payload": {"text": "hello world"},
    }
    legacy_command_end: CommentMessage = {
        "$": "after",
        "id": "message-id",
        "name": "command.COMMENT",
        "error": RuntimeError("oh no"),
        "payload": {"text": "hello world"},
    }
    subject = LegacyCommandMapper()

    _ = subject.map_command(legacy_command_start)
    result = subject.map_command(legacy_command_end)

    assert result == [
        pe_actions.FailCommandAction(
            command_id="command.COMMENT-0",
            running_command=matchers.Anything(),
            error_id=matchers.IsA(str),
            failed_at=matchers.IsA(datetime),
            error=matchers.ErrorMatching(
                LegacyContextCommandError,
                match="oh no",
            ),
            notes=[],
            type=ErrorRecoveryType.FAIL_RUN,
        )
    ]


def test_command_stack() -> None:
    """It should use messages ID and command ordering to create command IDs."""
    legacy_command_1: CommentMessage = {
        "$": "before",
        "id": "message-id-1",
        "name": "command.COMMENT",
        "payload": {"text": "hello"},
        "error": None,
    }
    legacy_command_2: CommentMessage = {
        "$": "before",
        "id": "message-id-2",
        "name": "command.COMMENT",
        "payload": {"text": "goodbye"},
        "error": None,
    }
    legacy_command_3: CommentMessage = {
        "$": "after",
        "id": "message-id-1",
        "name": "command.COMMENT",
        "payload": {"text": "hello"},
        "error": None,
    }
    legacy_command_4: CommentMessage = {
        "$": "after",
        "id": "message-id-2",
        "name": "command.COMMENT",
        "payload": {"text": "goodbye"},
        "error": RuntimeError("oh no"),
    }

    subject = LegacyCommandMapper()
    result = [
        *subject.map_command(legacy_command_1),
        *subject.map_command(legacy_command_2),
        *subject.map_command(legacy_command_3),
        *subject.map_command(legacy_command_4),
    ]

    assert result == [
        pe_actions.QueueCommandAction(
            command_id="command.COMMENT-0",
            created_at=matchers.IsA(datetime),
            request=pe_commands.CommentCreate(
                key="command.COMMENT-0",
                params=pe_commands.CommentParams(
                    message="hello",
                ),
            ),
            request_hash=None,
        ),
        pe_actions.RunCommandAction(
            command_id="command.COMMENT-0", started_at=matchers.IsA(datetime)
        ),
        pe_actions.QueueCommandAction(
            command_id="command.COMMENT-1",
            created_at=matchers.IsA(datetime),
            request=pe_commands.CommentCreate(
                key="command.COMMENT-1",
                params=pe_commands.CommentParams(
                    message="goodbye",
                ),
            ),
            request_hash=None,
        ),
        pe_actions.RunCommandAction(
            command_id="command.COMMENT-1", started_at=matchers.IsA(datetime)
        ),
        pe_actions.SucceedCommandAction(
            command=pe_commands.Comment.model_construct(
                id="command.COMMENT-0",
                key="command.COMMENT-0",
                status=pe_commands.CommandStatus.SUCCEEDED,
                createdAt=matchers.IsA(datetime),
                startedAt=matchers.IsA(datetime),
                completedAt=matchers.IsA(datetime),
                params=pe_commands.CommentParams(
                    message="hello",
                ),
                result=pe_commands.CommentResult(),
                notes=[],
            ),
        ),
        pe_actions.FailCommandAction(
            command_id="command.COMMENT-1",
            running_command=matchers.Anything(),
            error_id=matchers.IsA(str),
            failed_at=matchers.IsA(datetime),
            error=matchers.ErrorMatching(LegacyContextCommandError, "oh no"),
            notes=[],
            type=ErrorRecoveryType.FAIL_RUN,
        ),
    ]


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
        labware_display_name="My special labware",
    )

    expected_id_and_key = "commands.LOAD_LABWARE-0"
    expected_params = pe_commands.LoadLabwareParams(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        namespace="some_namespace",
        loadName="some_load_name",
        version=123,
        displayName="My special labware",
        labwareId=None,
    )
    expected_queue = pe_actions.QueueCommandAction(
        command_id=expected_id_and_key,
        created_at=matchers.IsA(datetime),
        request=pe_commands.LoadLabwareCreate(
            key=expected_id_and_key,
            params=expected_params,
        ),
        request_hash=None,
    )
    expected_run = pe_actions.RunCommandAction(
        command_id=expected_id_and_key,
        started_at=matchers.IsA(datetime),
    )
    expected_succeed = pe_actions.SucceedCommandAction(
        command=pe_commands.LoadLabware.model_construct(
            id=expected_id_and_key,
            key=expected_id_and_key,
            params=expected_params,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            result=pe_commands.LoadLabwareResult.model_construct(
                labwareId=matchers.IsA(str),
                # Trusting that the exact fields within in the labware definition
                # get passed through correctly.
                definition=matchers.Anything(),
                offsetId="labware-offset-id-123",
            ),
            notes=[],
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-0",
                definition=matchers.Anything(),
                offset_id="labware-offset-id-123",
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                display_name="My special labware",
            )
        ),
    )
    result_queue, result_run, result_succeed = LegacyCommandMapper().map_equipment_load(
        input
    )
    assert result_queue == expected_queue
    assert result_run == expected_run
    assert result_succeed == expected_succeed


def test_map_instrument_load(decoy: Decoy) -> None:
    """It should correctly map an instrument load."""
    pipette_dict = cast(PipetteDict, {"pipette_id": "fizzbuzz"})
    input = LegacyInstrumentLoadInfo(
        instrument_load_name="p1000_single_gen2",
        mount=Mount.LEFT,
        pipette_dict=pipette_dict,
    )
    pipette_config = cast(LoadedStaticPipetteData, {"config": True})

    decoy.when(
        pipette_data_provider.get_pipette_static_config(pipette_dict, "v0"),
    ).then_return(pipette_config)

    expected_id_and_key = "commands.LOAD_PIPETTE-0"
    expected_params = pe_commands.LoadPipetteParams.model_construct(
        pipetteName=PipetteNameType.P1000_SINGLE_GEN2, mount=MountType.LEFT
    )
    expected_queue = pe_actions.QueueCommandAction(
        command_id=expected_id_and_key,
        created_at=matchers.IsA(datetime),
        request=pe_commands.LoadPipetteCreate(
            key=expected_id_and_key, params=expected_params
        ),
        request_hash=None,
    )
    expected_run = pe_actions.RunCommandAction(
        command_id=expected_id_and_key, started_at=matchers.IsA(datetime)
    )
    expected_succeed = pe_actions.SucceedCommandAction(
        command=pe_commands.LoadPipette.model_construct(
            id=expected_id_and_key,
            key=expected_id_and_key,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            params=expected_params,
            result=pe_commands.LoadPipetteResult(pipetteId="pipette-0"),
            notes=[],
        ),
        state_update=StateUpdate(
            loaded_pipette=LoadPipetteUpdate(
                pipette_id="pipette-0",
                mount=expected_params.mount,
                pipette_name=expected_params.pipetteName,
                liquid_presence_detection=expected_params.liquidPresenceDetection,
            ),
            pipette_config=PipetteConfigUpdate(
                pipette_id="pipette-0",
                serial_number="fizzbuzz",
                config=pipette_config,
            ),
        ),
    )

    [
        result_queue,
        result_run,
        result_succeed,
    ] = LegacyCommandMapper().map_equipment_load(input)

    assert result_queue == expected_queue
    assert result_run == expected_run
    assert result_succeed == expected_succeed


def test_map_module_load(
    decoy: Decoy,
    minimal_module_def: ModuleDefinitionV3,
    module_data_provider: ModuleDataProvider,
) -> None:
    """It should correctly map a module load."""
    test_definition = ModuleDefinition.model_validate(minimal_module_def)
    input = LegacyModuleLoadInfo(
        requested_model=TemperatureModuleModel.TEMPERATURE_V1,
        loaded_model=TemperatureModuleModel.TEMPERATURE_V2,
        deck_slot=DeckSlotName.SLOT_1,
        configuration="conf",
        module_serial="module-serial",
    )
    decoy.when(
        module_data_provider.get_definition(ModuleModel.TEMPERATURE_MODULE_V2)
    ).then_return(test_definition)

    expected_id_and_key = "commands.LOAD_MODULE-0"
    expected_params = pe_commands.LoadModuleParams.model_construct(
        model=ModuleModel.TEMPERATURE_MODULE_V1,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        moduleId=matchers.IsA(str),
    )
    expected_queue = pe_actions.QueueCommandAction(
        command_id=expected_id_and_key,
        created_at=matchers.IsA(datetime),
        request=pe_commands.LoadModuleCreate(
            key=expected_id_and_key, params=expected_params
        ),
        request_hash=None,
    )
    expected_run = pe_actions.RunCommandAction(
        command_id=expected_id_and_key, started_at=matchers.IsA(datetime)
    )
    expected_succeed = pe_actions.SucceedCommandAction(
        command=pe_commands.LoadModule.model_construct(
            id=expected_id_and_key,
            key=expected_id_and_key,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            params=expected_params,
            result=pe_commands.LoadModuleResult.model_construct(
                moduleId=matchers.IsA(str),
                serialNumber="module-serial",
                definition=test_definition,
                model=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            notes=[],
        ),
    )

    [result_queue, result_run, result_succeed] = LegacyCommandMapper(
        module_data_provider=module_data_provider
    ).map_equipment_load(input)

    assert result_queue == expected_queue
    assert result_run == expected_run
    assert result_succeed == expected_succeed


def test_map_module_labware_load(minimal_labware_def: LabwareDefinition) -> None:
    """It should correctly map a labware load on module."""
    load_input = LegacyLabwareLoadInfo(
        labware_definition=minimal_labware_def,
        labware_namespace="some_namespace",
        labware_load_name="some_load_name",
        labware_display_name="My very special module labware",
        labware_version=123,
        deck_slot=DeckSlotName.SLOT_1,
        on_module=True,
        offset_id="labware-offset-id-123",
    )

    expected_id_and_key = "commands.LOAD_LABWARE-0"
    expected_params = pe_commands.LoadLabwareParams.model_construct(
        location=ModuleLocation(moduleId="module-123"),
        namespace="some_namespace",
        loadName="some_load_name",
        version=123,
        displayName="My very special module labware",
        labwareId=None,
    )
    expected_queue = pe_actions.QueueCommandAction(
        command_id=expected_id_and_key,
        created_at=matchers.IsA(datetime),
        request=pe_commands.LoadLabwareCreate(
            key=expected_id_and_key,
            params=expected_params,
        ),
        request_hash=None,
    )
    expected_run = pe_actions.RunCommandAction(
        command_id="commands.LOAD_LABWARE-0",
        started_at=matchers.IsA(datetime),
    )
    expected_succeed = pe_actions.SucceedCommandAction(
        command=pe_commands.LoadLabware.model_construct(
            id=expected_id_and_key,
            key=expected_id_and_key,
            params=expected_params,
            status=pe_commands.CommandStatus.SUCCEEDED,
            createdAt=matchers.IsA(datetime),
            startedAt=matchers.IsA(datetime),
            completedAt=matchers.IsA(datetime),
            result=pe_commands.LoadLabwareResult.model_construct(
                labwareId=matchers.IsA(str),
                # Trusting that the exact fields within in the labware definition
                # get passed through correctly.
                definition=matchers.Anything(),
                offsetId="labware-offset-id-123",
            ),
            notes=[],
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-0",
                definition=matchers.Anything(),
                offset_id="labware-offset-id-123",
                new_location=ModuleLocation(moduleId="module-123"),
                display_name="My very special module labware",
            )
        ),
    )

    subject = LegacyCommandMapper()
    subject._module_id_by_slot = {DeckSlotName.SLOT_1: "module-123"}
    result_queue, result_run, result_succeed = subject.map_equipment_load(load_input)

    assert result_queue == expected_queue
    assert result_run == expected_run
    assert result_succeed == expected_succeed


def test_map_pause() -> None:
    """It should map an "command.PAUSE" message."""
    legacy_command_start: PauseMessage = {
        "$": "before",
        "id": "message-id",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello world"},
        "error": None,
    }
    legacy_command_end: PauseMessage = {
        "$": "after",
        "id": "message-id",
        "name": "command.PAUSE",
        "payload": {"userMessage": "hello world", "text": "hello world"},
        "error": None,
    }

    subject = LegacyCommandMapper()
    result = [
        *subject.map_command(legacy_command_start),
        *subject.map_command(legacy_command_end),
    ]

    assert result == [
        pe_actions.QueueCommandAction(
            command_id="command.PAUSE-0",
            created_at=matchers.IsA(datetime),
            request=pe_commands.WaitForResumeCreate(
                key="command.PAUSE-0",
                params=pe_commands.WaitForResumeParams(message="hello world"),
            ),
            request_hash=None,
        ),
        pe_actions.RunCommandAction(
            command_id="command.PAUSE-0",
            started_at=matchers.IsA(datetime),
        ),
        pe_actions.SucceedCommandAction(
            command=pe_commands.WaitForResume.model_construct(
                id="command.PAUSE-0",
                key="command.PAUSE-0",
                status=pe_commands.CommandStatus.SUCCEEDED,
                createdAt=matchers.IsA(datetime),
                startedAt=matchers.IsA(datetime),
                completedAt=matchers.IsA(datetime),
                params=pe_commands.WaitForResumeParams(message="hello world"),
                notes=[],
            ),
        ),
        pe_actions.PauseAction(source=pe_actions.PauseSource.PROTOCOL),
    ]


@pytest.mark.parametrize(
    "command_type",
    [
        "command.MIX",
        "command.CONSOLIDATE",
        "command.DISTRIBUTE",
        "command.TRANSFER",
        "command.RETURN_TIP",
        "command.AIR_GAP",
    ],
)
def test_filter_higher_order_commands(command_type: str) -> None:
    """It should filter out higher order commands."""
    legacy_command_start = cast(
        CommandMessage,
        {
            "$": "before",
            "id": "message-id",
            "name": command_type,
            "payload": {"text": "hello world"},
            "error": None,
        },
    )
    legacy_command_end = cast(
        CommandMessage,
        {
            "$": "after",
            "id": "message-id",
            "name": command_type,
            "payload": {"text": "hello world"},
            "error": None,
        },
    )

    subject = LegacyCommandMapper()
    result = [
        *subject.map_command(legacy_command_start),
        *subject.map_command(legacy_command_end),
    ]

    assert result == []
