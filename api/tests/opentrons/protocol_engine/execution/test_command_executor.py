"""Smoke tests for the CommandExecutor class."""

import asyncio
from datetime import datetime
from typing import Optional, Type, cast, Any, Union

import pytest
from decoy import Decoy, matchers
from pydantic import BaseModel, PrivateAttr

from opentrons.hardware_control import HardwareControlAPI, OT2HardwareControlAPI

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.error_recovery_policy import (
    ErrorRecoveryPolicy,
    ErrorRecoveryType,
    never_recover,
)
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence
from opentrons.protocol_engine.errors.exceptions import (
    EStopActivatedError as PE_EStopActivatedError,
)
from opentrons.protocol_engine.resources import ModelUtils, FileProvider
from opentrons.protocol_engine.state.state import StateStore
from opentrons.protocol_engine.actions import (
    ActionDispatcher,
    RunCommandAction,
    SucceedCommandAction,
    FailCommandAction,
)

from opentrons.protocol_engine.commands import (
    AbstractCommandImpl,
    BaseCommand,
    CommandStatus,
    Command,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData

from opentrons.protocol_engine.execution import (
    CommandExecutor,
    EquipmentHandler,
    MovementHandler,
    GantryMover,
    LabwareMovementHandler,
    PipettingHandler,
    TipHandler,
    RunControlHandler,
    RailLightsHandler,
    StatusBarHandler,
)
from opentrons.protocol_engine.execution.command_executor import (
    CommandNoteTrackerProvider,
)

from opentrons_shared_data.errors.exceptions import EStopActivatedError, PythonException
from opentrons.protocol_engine.notes import CommandNoteTracker, CommandNote


@pytest.fixture
def hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mocked out StateStore."""
    return decoy.mock(cls=OT2HardwareControlAPI)


@pytest.fixture
def state_store(decoy: Decoy) -> StateStore:
    """Get a mocked out StateStore."""
    return decoy.mock(cls=StateStore)


@pytest.fixture
def action_dispatcher(decoy: Decoy) -> ActionDispatcher:
    """Get a mocked out ActionDispatcher."""
    return decoy.mock(cls=ActionDispatcher)


@pytest.fixture
def equipment(decoy: Decoy) -> EquipmentHandler:
    """Get a mocked out EquipmentHandler."""
    return decoy.mock(cls=EquipmentHandler)


@pytest.fixture
def movement(decoy: Decoy) -> MovementHandler:
    """Get a mocked out MovementHandler."""
    return decoy.mock(cls=MovementHandler)


@pytest.fixture
def mock_gantry_mover(decoy: Decoy) -> GantryMover:
    """Get a mocked out GantryMover."""
    return decoy.mock(cls=GantryMover)


@pytest.fixture
def labware_movement(decoy: Decoy) -> LabwareMovementHandler:
    """Get a mocked out LabwareMovementHandler."""
    return decoy.mock(cls=LabwareMovementHandler)


@pytest.fixture
def pipetting(decoy: Decoy) -> PipettingHandler:
    """Get a mocked out PipettingHandler."""
    return decoy.mock(cls=PipettingHandler)


@pytest.fixture
def mock_tip_handler(decoy: Decoy) -> TipHandler:
    """Get a mocked out TipHandler."""
    return decoy.mock(cls=TipHandler)


@pytest.fixture
def run_control(decoy: Decoy) -> RunControlHandler:
    """Get a mocked out RunControlHandler."""
    return decoy.mock(cls=RunControlHandler)


@pytest.fixture
def model_utils(decoy: Decoy) -> ModelUtils:
    """Get a mocked out ModelUtils."""
    return decoy.mock(cls=ModelUtils)


@pytest.fixture
def rail_lights(decoy: Decoy) -> RailLightsHandler:
    """Get a mocked out RunControlHandler."""
    return decoy.mock(cls=RailLightsHandler)


@pytest.fixture
def status_bar(decoy: Decoy) -> StatusBarHandler:
    """Get a mocked out StatusBarHandler."""
    return decoy.mock(cls=StatusBarHandler)


@pytest.fixture
def command_note_tracker_provider(decoy: Decoy) -> CommandNoteTrackerProvider:
    """Get a mock tracker provider."""
    return decoy.mock(cls=CommandNoteTrackerProvider)


@pytest.fixture
def error_recovery_policy(state_store: StateStore, decoy: Decoy) -> ErrorRecoveryPolicy:
    """Get a mock error recovery policy."""
    mock = decoy.mock(cls=ErrorRecoveryPolicy)
    decoy.when(state_store.commands.get_error_recovery_policy()).then_return(mock)
    return mock


def get_next_tracker(
    decoy: Decoy, provider: CommandNoteTrackerProvider
) -> CommandNoteTracker:
    """Get the next tracker provided by a provider, in code without being a fixture.

    This is useful for testing the execution of multiple commands, each of which will get
    a different tracker instance.
    """
    new_tracker = decoy.mock(cls=CommandNoteTracker)
    decoy.when(provider()).then_return(new_tracker)
    return new_tracker


@pytest.fixture
def command_note_tracker(
    decoy: Decoy, command_note_tracker_provider: CommandNoteTrackerProvider
) -> CommandNoteTracker:
    """Get the tracker that the provider will provide."""
    return get_next_tracker(decoy, command_note_tracker_provider)


@pytest.fixture
def subject(
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    action_dispatcher: ActionDispatcher,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
    movement: MovementHandler,
    mock_gantry_mover: GantryMover,
    labware_movement: LabwareMovementHandler,
    pipetting: PipettingHandler,
    mock_tip_handler: TipHandler,
    run_control: RunControlHandler,
    rail_lights: RailLightsHandler,
    status_bar: StatusBarHandler,
    model_utils: ModelUtils,
    command_note_tracker_provider: CommandNoteTrackerProvider,
) -> CommandExecutor:
    """Get a CommandExecutor test subject with its dependencies mocked out."""
    return CommandExecutor(
        hardware_api=hardware_api,
        file_provider=file_provider,
        state_store=state_store,
        action_dispatcher=action_dispatcher,
        equipment=equipment,
        movement=movement,
        gantry_mover=mock_gantry_mover,
        labware_movement=labware_movement,
        pipetting=pipetting,
        tip_handler=mock_tip_handler,
        run_control=run_control,
        model_utils=model_utils,
        rail_lights=rail_lights,
        status_bar=status_bar,
        command_note_tracker_provider=command_note_tracker_provider,
    )


class _TestCommandParams(BaseModel):
    foo: str = "foo"


class _TestCommandResult(BaseModel):
    bar: str = "bar"


class _TestCommandDefinedError(ErrorOccurrence):
    errorType: str = "testCommandDefinedError"
    detail: str = "test command defined error"


_TestCommandReturn = Union[
    SuccessData[_TestCommandResult],
    DefinedErrorData[_TestCommandDefinedError],
]


class _TestCommandImpl(AbstractCommandImpl[_TestCommandParams, _TestCommandReturn]):
    async def execute(self, params: _TestCommandParams) -> _TestCommandReturn:
        raise NotImplementedError()


async def test_execute(
    decoy: Decoy,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    action_dispatcher: ActionDispatcher,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
    movement: MovementHandler,
    mock_gantry_mover: GantryMover,
    labware_movement: LabwareMovementHandler,
    pipetting: PipettingHandler,
    mock_tip_handler: TipHandler,
    run_control: RunControlHandler,
    rail_lights: RailLightsHandler,
    status_bar: StatusBarHandler,
    model_utils: ModelUtils,
    command_note_tracker: CommandNoteTracker,
    subject: CommandExecutor,
) -> None:
    """It should be able to execute a command."""
    TestCommandImplCls = decoy.mock(func=_TestCommandImpl)
    command_impl = decoy.mock(cls=_TestCommandImpl)

    # Note: private attrs (which are attrs that start with _) are instantiated via deep
    # copy from a provided default in the model, so if
    # _TestCommand()._ImplementationCls != _TestCommand._ImplementationCls.default if
    # we provide a default. Therefore, provide a default factory, so we can always have
    # the same object.

    class _TestCommand(
        BaseCommand[_TestCommandParams, _TestCommandResult, ErrorOccurrence]
    ):
        commandType: str = "testCommand"
        params: _TestCommandParams
        result: Optional[_TestCommandResult]

        _ImplementationCls: Type[_TestCommandImpl] = PrivateAttr(
            default_factory=lambda: TestCommandImplCls
        )

    command_params = _TestCommandParams()
    command_result = SuccessData(public=_TestCommandResult())

    queued_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id="command-id",
            key="command-key",
            createdAt=datetime(year=2021, month=1, day=1),
            status=CommandStatus.QUEUED,
            params=command_params,
        ),
    )

    running_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id="command-id",
            key="command-key",
            createdAt=datetime(year=2021, month=1, day=1),
            startedAt=datetime(year=2022, month=2, day=2),
            status=CommandStatus.RUNNING,
            params=command_params,
        ),
    )

    command_notes = [
        CommandNote(
            noteKind="warning",
            shortMessage="hello",
            longMessage="test command note",
            source="test",
        )
    ]

    expected_completed_command = cast(
        Command,
        _TestCommand.model_construct(
            id="command-id",
            key="command-key",
            createdAt=datetime(year=2021, month=1, day=1),
            startedAt=datetime(year=2022, month=2, day=2),
            completedAt=datetime(year=2023, month=3, day=3),
            status=CommandStatus.SUCCEEDED,
            params=command_params,
            result=command_result.public,
            notes=command_notes,
        ),
    )

    decoy.when(state_store.commands.get(command_id="command-id")).then_return(
        queued_command
    )

    decoy.when(
        action_dispatcher.dispatch(
            RunCommandAction(
                command_id="command-id", started_at=datetime(year=2022, month=2, day=2)
            )
        )
    ).then_do(
        lambda _: decoy.when(
            state_store.commands.get(command_id="command-id")
        ).then_return(running_command)
    )
    decoy.when(
        queued_command._ImplementationCls(
            state_view=state_store,
            hardware_api=hardware_api,
            file_provider=file_provider,
            equipment=equipment,
            movement=movement,
            gantry_mover=mock_gantry_mover,
            labware_movement=labware_movement,
            pipetting=pipetting,
            tip_handler=mock_tip_handler,
            run_control=run_control,
            rail_lights=rail_lights,
            model_utils=model_utils,
            status_bar=status_bar,
            command_note_adder=command_note_tracker,
        )
    ).then_return(
        command_impl  # type: ignore[arg-type]
    )

    decoy.when(command_note_tracker.get_notes()).then_return(command_notes)

    decoy.when(await command_impl.execute(command_params)).then_return(command_result)

    decoy.when(model_utils.get_timestamp()).then_return(
        datetime(year=2022, month=2, day=2),
        datetime(year=2023, month=3, day=3),
    )

    decoy.when(state_store.commands.get_error_recovery_policy()).then_return(
        never_recover
    )

    await subject.execute("command-id")

    decoy.verify(
        action_dispatcher.dispatch(
            SucceedCommandAction(command=expected_completed_command)
        ),
    )


@pytest.mark.parametrize(
    ["command_error", "expected_error"],
    [
        (
            errors.ProtocolEngineError(message="oh no"),
            matchers.ErrorMatching(errors.ProtocolEngineError, match="oh no"),
        ),
        (
            EStopActivatedError(),
            matchers.ErrorMatching(PE_EStopActivatedError),
        ),
        (
            RuntimeError("oh no"),
            matchers.ErrorMatching(PythonException, match="oh no"),
        ),
        (
            asyncio.CancelledError(),
            matchers.ErrorMatching(errors.RunStoppedError),
        ),
    ],
)
async def test_execute_undefined_error(
    decoy: Decoy,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    action_dispatcher: ActionDispatcher,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
    movement: MovementHandler,
    mock_gantry_mover: GantryMover,
    labware_movement: LabwareMovementHandler,
    pipetting: PipettingHandler,
    mock_tip_handler: TipHandler,
    run_control: RunControlHandler,
    rail_lights: RailLightsHandler,
    status_bar: StatusBarHandler,
    model_utils: ModelUtils,
    subject: CommandExecutor,
    command_note_tracker: CommandNoteTracker,
    error_recovery_policy: ErrorRecoveryPolicy,
    command_error: Exception,
    expected_error: Any,
) -> None:
    """It should handle an undefined error raised from execution."""
    TestCommandImplCls = decoy.mock(func=_TestCommandImpl)
    command_impl = decoy.mock(cls=_TestCommandImpl)

    class _TestCommand(
        BaseCommand[_TestCommandParams, _TestCommandResult, ErrorOccurrence]
    ):
        commandType: str = "testCommand"
        params: _TestCommandParams
        result: Optional[_TestCommandResult]

        _ImplementationCls: Type[_TestCommandImpl] = PrivateAttr(
            default_factory=lambda: TestCommandImplCls
        )

    command_params = _TestCommandParams()

    queued_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id="command-id",
            key="command-key",
            createdAt=datetime(year=2021, month=1, day=1),
            status=CommandStatus.QUEUED,
            params=command_params,
        ),
    )

    running_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id="command-id",
            key="command-key",
            createdAt=datetime(year=2021, month=1, day=1),
            startedAt=datetime(year=2022, month=2, day=2),
            status=CommandStatus.RUNNING,
            params=command_params,
        ),
    )

    command_notes = [
        CommandNote(
            noteKind="warning",
            shortMessage="hello",
            longMessage="test command note",
            source="test",
        )
    ]

    decoy.when(state_store.commands.get(command_id="command-id")).then_return(
        queued_command
    )

    decoy.when(
        action_dispatcher.dispatch(
            RunCommandAction(
                command_id="command-id", started_at=datetime(year=2022, month=2, day=2)
            )
        )
    ).then_do(
        lambda _: decoy.when(
            state_store.commands.get(command_id="command-id")
        ).then_return(running_command)
    )

    decoy.when(
        queued_command._ImplementationCls(
            state_view=state_store,
            hardware_api=hardware_api,
            file_provider=file_provider,
            equipment=equipment,
            movement=movement,
            gantry_mover=mock_gantry_mover,
            labware_movement=labware_movement,
            pipetting=pipetting,
            tip_handler=mock_tip_handler,
            run_control=run_control,
            rail_lights=rail_lights,
            model_utils=model_utils,
            status_bar=status_bar,
            command_note_adder=command_note_tracker,
        )
    ).then_return(
        command_impl  # type: ignore[arg-type]
    )

    decoy.when(await command_impl.execute(command_params)).then_raise(command_error)

    decoy.when(model_utils.generate_id()).then_return("error-id")
    decoy.when(model_utils.get_timestamp()).then_return(
        datetime(year=2022, month=2, day=2),
        datetime(year=2023, month=3, day=3),
    )

    decoy.when(
        error_recovery_policy(matchers.Anything(), matchers.Anything(), None)
    ).then_return(ErrorRecoveryType.WAIT_FOR_RECOVERY)

    decoy.when(command_note_tracker.get_notes()).then_return(command_notes)

    await subject.execute("command-id")

    decoy.verify(
        action_dispatcher.dispatch(
            FailCommandAction(
                command_id="command-id",
                running_command=running_command,
                error_id="error-id",
                failed_at=datetime(year=2023, month=3, day=3),
                error=expected_error,
                type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
                notes=command_notes,
            )
        ),
    )


async def test_execute_defined_error(
    decoy: Decoy,
    subject: CommandExecutor,
    hardware_api: HardwareControlAPI,
    state_store: StateStore,
    action_dispatcher: ActionDispatcher,
    equipment: EquipmentHandler,
    file_provider: FileProvider,
    movement: MovementHandler,
    mock_gantry_mover: GantryMover,
    labware_movement: LabwareMovementHandler,
    pipetting: PipettingHandler,
    mock_tip_handler: TipHandler,
    run_control: RunControlHandler,
    rail_lights: RailLightsHandler,
    status_bar: StatusBarHandler,
    model_utils: ModelUtils,
    command_note_tracker: CommandNoteTracker,
    error_recovery_policy: ErrorRecoveryPolicy,
) -> None:
    """It should handle a defined error returned from execution."""
    TestCommandImplCls = decoy.mock(func=_TestCommandImpl)
    command_impl = decoy.mock(cls=_TestCommandImpl)

    class _TestCommand(
        BaseCommand[_TestCommandParams, _TestCommandResult, ErrorOccurrence]
    ):
        commandType: str = "testCommand"
        params: _TestCommandParams
        result: Optional[_TestCommandResult]

        _ImplementationCls: Type[_TestCommandImpl] = PrivateAttr(
            default_factory=lambda: TestCommandImplCls
        )

    command_params = _TestCommandParams()
    command_id = "command-id"
    created_at = datetime(year=2021, month=1, day=1)
    started_at = datetime(year=2022, month=2, day=2)
    failed_at = datetime(year=2023, month=3, day=3)
    error_id = "error-id"
    returned_error = DefinedErrorData(
        public=_TestCommandDefinedError(id=error_id, createdAt=failed_at),
    )
    queued_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id=command_id,
            key="command-key",
            createdAt=created_at,
            status=CommandStatus.QUEUED,
            params=command_params,
        ),
    )
    running_command = cast(
        Command,
        _TestCommand.model_construct(  # type: ignore[call-arg]
            id=command_id,
            key="command-key",
            createdAt=created_at,
            startedAt=started_at,
            status=CommandStatus.RUNNING,
            params=command_params,
        ),
    )
    command_notes = [
        CommandNote(
            noteKind="warning",
            shortMessage="hello",
            longMessage="test command note",
            source="test",
        )
    ]

    decoy.when(state_store.commands.get(command_id=command_id)).then_return(
        queued_command
    )

    decoy.when(
        action_dispatcher.dispatch(
            RunCommandAction(command_id=command_id, started_at=started_at)
        )
    ).then_do(
        lambda _: decoy.when(
            state_store.commands.get(command_id=command_id)
        ).then_return(running_command)
    )

    decoy.when(
        queued_command._ImplementationCls(
            state_view=state_store,
            hardware_api=hardware_api,
            file_provider=file_provider,
            equipment=equipment,
            movement=movement,
            gantry_mover=mock_gantry_mover,
            labware_movement=labware_movement,
            pipetting=pipetting,
            tip_handler=mock_tip_handler,
            run_control=run_control,
            rail_lights=rail_lights,
            model_utils=model_utils,
            status_bar=status_bar,
            command_note_adder=command_note_tracker,
        )
    ).then_return(
        command_impl  # type: ignore[arg-type]
    )

    decoy.when(command_note_tracker.get_notes()).then_return(command_notes)

    decoy.when(await command_impl.execute(command_params)).then_return(returned_error)

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(started_at, failed_at)

    decoy.when(
        error_recovery_policy(
            matchers.Anything(),
            matchers.Anything(),
            returned_error,  # type: ignore[arg-type]
        )
    ).then_return(ErrorRecoveryType.WAIT_FOR_RECOVERY)

    await subject.execute("command-id")

    decoy.verify(
        action_dispatcher.dispatch(
            FailCommandAction(
                command_id="command-id",
                running_command=running_command,
                error_id="error-id",
                failed_at=datetime(year=2023, month=3, day=3),
                error=returned_error,  # type: ignore[arg-type]
                type=ErrorRecoveryType.WAIT_FOR_RECOVERY,
                notes=command_notes,
            )
        )
    )
