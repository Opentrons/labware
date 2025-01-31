"""Tests for the RunOrchestrator."""
from pathlib import Path

import pytest
from datetime import datetime

from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from decoy import Decoy
from typing import Union, Generator

from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryPolicy
from opentrons.protocol_engine.errors import RunStoppedError
from opentrons.protocol_engine.state.state import StateStore
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_engine import ProtocolEngine
from opentrons.protocol_engine.types import PostRunHardwareState
from opentrons.protocol_engine import commands as pe_commands
from opentrons.hardware_control import API as HardwareAPI
from opentrons.protocol_reader import (
    JsonProtocolConfig,
    PythonProtocolConfig,
    ProtocolSource,
)
from opentrons.protocol_runner.run_orchestrator import (
    RunOrchestrator,
    RunNotFound,
    ParseMode,
)
from opentrons import protocol_runner
from opentrons.protocol_runner.protocol_runner import (
    JsonRunner,
    PythonAndLegacyRunner,
    LiveRunner,
)
from opentrons.protocols.parse import PythonParseMode


@pytest.fixture
def mock_protocol_python_runner(decoy: Decoy) -> PythonAndLegacyRunner:
    """Get a mocked out PythonAndLegacyRunner dependency."""
    return decoy.mock(cls=PythonAndLegacyRunner)


@pytest.fixture
def mock_protocol_json_runner(decoy: Decoy) -> JsonRunner:
    """Get a mocked out PythonAndLegacyRunner dependency."""
    return decoy.mock(cls=JsonRunner)


@pytest.fixture
def mock_setup_runner(decoy: Decoy) -> LiveRunner:
    """Get a mocked out LiveRunner dependency."""
    return decoy.mock(cls=LiveRunner)


@pytest.fixture
def mock_fixit_runner(decoy: Decoy) -> LiveRunner:
    """Get a mocked out LiveRunner dependency."""
    return decoy.mock(cls=LiveRunner)


@pytest.fixture
def mock_protocol_live_runner(decoy: Decoy) -> LiveRunner:
    """Get a mock of a LiveRunner for protocol commands."""
    return decoy.mock(cls=LiveRunner)


@pytest.fixture
def mock_protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mocked out ProtocolEngine dependency."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def mock_hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mocked out HardwareAPI dependency."""
    return decoy.mock(cls=HardwareAPI)


@pytest.fixture
def json_protocol_subject(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_protocol_json_runner: JsonRunner,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner,
    mock_protocol_live_runner: LiveRunner,
) -> RunOrchestrator:
    """Get a RunOrchestrator subject with a json runner."""
    return RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        json_or_python_protocol_runner=mock_protocol_json_runner,
        protocol_live_runner=mock_protocol_live_runner,
    )


@pytest.fixture
def python_protocol_subject(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_protocol_python_runner: PythonAndLegacyRunner,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner,
    mock_protocol_live_runner: LiveRunner,
) -> RunOrchestrator:
    """Get a RunOrchestrator subject with a python runner."""
    return RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        json_or_python_protocol_runner=mock_protocol_python_runner,
        protocol_live_runner=mock_protocol_live_runner,
    )


@pytest.fixture
def live_protocol_subject(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner,
    mock_protocol_live_runner: LiveRunner,
) -> RunOrchestrator:
    """Get a RunOrchestrator subject with a live runner."""
    return RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        protocol_live_runner=mock_protocol_live_runner,
    )


@pytest.mark.parametrize(
    "input_protocol_config, mock_protocol_runner, subject",
    [
        (
            JsonProtocolConfig(schema_version=7),
            lazy_fixture("mock_protocol_json_runner"),
            lazy_fixture("json_protocol_subject"),
        ),
        (
            PythonProtocolConfig(api_version=APIVersion(2, 14)),
            lazy_fixture("mock_protocol_python_runner"),
            lazy_fixture("python_protocol_subject"),
        ),
    ],
)
def test_build_run_orchestrator_provider(
    decoy: Decoy,
    monkeypatch: pytest.MonkeyPatch,
    subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    input_protocol_config: Union[PythonProtocolConfig, JsonProtocolConfig],
    mock_setup_runner: LiveRunner,
    mock_fixit_runner: LiveRunner,
    mock_protocol_runner: Union[PythonAndLegacyRunner, JsonRunner],
) -> None:
    """Should get a RunOrchestrator instance."""
    mock_create_runner_func = decoy.mock(func=protocol_runner.create_protocol_runner)
    monkeypatch.setattr(
        protocol_runner, "create_protocol_runner", mock_create_runner_func
    )

    decoy.when(
        mock_create_runner_func(
            protocol_config=input_protocol_config,
            protocol_engine=mock_protocol_engine,
            hardware_api=mock_hardware_api,
            post_run_hardware_state=PostRunHardwareState.HOME_AND_STAY_ENGAGED,
            drop_tips_after_run=True,
        )
    ).then_return(mock_protocol_runner)

    result = subject.build_orchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        protocol_config=input_protocol_config,
    )

    assert isinstance(result, RunOrchestrator)
    assert isinstance(result._setup_runner, LiveRunner)
    assert isinstance(result._fixit_runner, LiveRunner)
    assert isinstance(result._protocol_runner, (PythonAndLegacyRunner, JsonRunner))


@pytest.mark.parametrize(
    "subject, runner",
    [
        (
            lazy_fixture("json_protocol_subject"),
            lazy_fixture("mock_protocol_json_runner"),
        ),
        (
            lazy_fixture("python_protocol_subject"),
            lazy_fixture("mock_protocol_python_runner"),
        ),
    ],
)
async def test_run_calls_protocol_runner(
    subject: RunOrchestrator,
    runner: Union[JsonRunner, PythonAndLegacyRunner],
    decoy: Decoy,
) -> None:
    """Should call protocol runner run method."""
    await subject.run(deck_configuration=[])
    decoy.verify(
        await runner.run(
            deck_configuration=[], run_time_param_values=None, protocol_source=None
        )
    )


async def test_run_calls_protocol_live_runner(
    live_protocol_subject: RunOrchestrator,
    mock_protocol_live_runner: LiveRunner,
    decoy: Decoy,
) -> None:
    """Should call protocol runner run method."""
    await live_protocol_subject.run(deck_configuration=[])
    decoy.verify(await mock_protocol_live_runner.run(deck_configuration=[]))


def test_get_run_time_parameters_returns_an_empty_list_no_protocol(
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should return an empty list in case the protocol runner is not initialized."""
    result = live_protocol_subject.get_run_time_parameters()
    assert result == []


def test_get_run_time_parameters_returns_an_empty_list_json_runner(
    decoy: Decoy,
    mock_protocol_json_runner: JsonRunner,
    json_protocol_subject: RunOrchestrator,
) -> None:
    """Should return an empty list in case the protocol runner is a json runner."""
    decoy.when(mock_protocol_json_runner.run_time_parameters).then_return([])
    result = json_protocol_subject.get_run_time_parameters()
    assert result == []


@pytest.mark.parametrize(
    "wait_for_interval_input, verify_calls", [(True, 1), (False, 0)]
)
async def test_add_command_and_wait_for_interval(
    decoy: Decoy,
    json_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
    wait_for_interval_input: bool,
    verify_calls: int,
) -> None:
    """Should add a command a wait for it to complete."""
    load_command = pe_commands.HomeCreate.model_construct(
        params=pe_commands.HomeParams.model_construct()
    )
    added_command = pe_commands.Home(
        params=pe_commands.HomeParams.model_construct(),
        id="test-123",
        createdAt=datetime(year=2024, month=1, day=1),
        key="123",
        status=pe_commands.CommandStatus.QUEUED,
    )
    decoy.when(
        mock_protocol_engine.add_command(request=load_command, failed_command_id=None)
    ).then_return(added_command)

    result = await json_protocol_subject.add_command_and_wait_for_interval(
        command=load_command, wait_until_complete=wait_for_interval_input, timeout=999
    )

    assert result == added_command

    decoy.verify(
        await mock_protocol_engine.wait_for_command(command_id="test-123"),
        times=verify_calls,
    )


def test_estop(
    decoy: Decoy,
    live_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
) -> None:
    """Verify an estop call."""
    live_protocol_subject.estop()
    decoy.verify(mock_protocol_engine.estop())


async def test_use_attached_modules(
    decoy: Decoy,
    live_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
) -> None:
    """Verify a call to use_attached_modules."""
    await live_protocol_subject.use_attached_modules(modules_by_id={})
    decoy.verify(await mock_protocol_engine.use_attached_modules({}))


def test_get_protocol_runner(
    json_protocol_subject: RunOrchestrator,
    python_protocol_subject: RunOrchestrator,
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should return the equivalent runner."""
    json_runner = json_protocol_subject.get_protocol_runner()
    assert isinstance(json_runner, JsonRunner)

    python_runner = python_protocol_subject.get_protocol_runner()
    assert isinstance(python_runner, PythonAndLegacyRunner)

    live_runner = live_protocol_subject.get_protocol_runner()
    assert live_runner is None


async def test_load_json(
    decoy: Decoy,
    json_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
    mock_protocol_json_runner: JsonRunner,
) -> None:
    """Should load a json protocol runner."""
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=6),
        content_hash="abc123",
    )
    await json_protocol_subject.load(
        protocol_source=protocol_source,
        run_time_param_values=None,
        run_time_param_paths=None,
        parse_mode=ParseMode.NORMAL,
    )

    decoy.verify(await mock_protocol_json_runner.load(protocol_source))


async def test_load_python(
    decoy: Decoy,
    python_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
    mock_protocol_python_runner: PythonAndLegacyRunner,
) -> None:
    """Should load a json protocol runner."""
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=6),
        content_hash="abc123",
    )
    await python_protocol_subject.load(
        protocol_source=protocol_source,
        parse_mode=ParseMode.NORMAL,
        run_time_param_values=None,
        run_time_param_paths=None,
    )

    decoy.verify(
        await mock_protocol_python_runner.load(
            protocol_source=protocol_source,
            python_parse_mode=PythonParseMode.NORMAL,
            run_time_param_values=None,
            run_time_param_paths=None,
        )
    )


async def test_load_json_raises_no_protocol(
    decoy: Decoy,
    live_protocol_subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
) -> None:
    """Should raise that there is no protocol runner."""
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=6),
        content_hash="abc123",
    )
    with pytest.raises(AssertionError):
        await live_protocol_subject.load(
            protocol_source=protocol_source,
            run_time_param_values=None,
            run_time_param_paths=None,
            parse_mode=ParseMode.NORMAL,
        )


def test_get_run_id(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner,
    mock_protocol_live_runner: LiveRunner,
) -> None:
    """Should get run_id if builder was created with a run id."""
    orchestrator = RunOrchestrator(
        run_id="test-123",
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        protocol_live_runner=mock_protocol_live_runner,
    )
    assert orchestrator.run_id == "test-123"


def test_get_run_id_raises(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner,
    mock_protocol_live_runner: LiveRunner,
) -> None:
    """Should get run_id if builder was created with a run id."""
    orchestrator = RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        protocol_live_runner=mock_protocol_live_runner,
    )
    with pytest.raises(RunNotFound):
        orchestrator.run_id


def test_get_is_okay_to_clear(
    decoy: Decoy,
    mock_protocol_engine: ProtocolEngine,
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should return if is ok to clear run or not."""
    decoy.when(
        mock_protocol_engine.state_view.commands.get_is_okay_to_clear()
    ).then_return(True)
    result = live_protocol_subject.get_is_okay_to_clear()

    assert result is True

    decoy.when(
        mock_protocol_engine.state_view.commands.get_is_okay_to_clear()
    ).then_return(False)
    result = live_protocol_subject.get_is_okay_to_clear()

    assert result is False


def test_prepare(
    decoy: Decoy,
    live_protocol_subject: RunOrchestrator,
    mock_protocol_live_runner: LiveRunner,
) -> None:
    """Verify prepare calls runner prepare."""
    live_protocol_subject.prepare()
    decoy.verify(mock_protocol_live_runner.prepare())


async def test_stop(
    decoy: Decoy,
    mock_protocol_engine: ProtocolEngine,
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should verify a call to stop/finish the run."""
    decoy.when(mock_protocol_engine.state_view.commands.has_been_played()).then_return(
        True
    )
    await live_protocol_subject.stop()
    decoy.verify(await mock_protocol_engine.request_stop())

    decoy.when(mock_protocol_engine.state_view.commands.has_been_played()).then_return(
        False
    )
    await live_protocol_subject.stop()
    decoy.verify(
        await mock_protocol_engine.finish(
            error=None,
            drop_tips_after_run=False,
            set_run_status=False,
            post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
        )
    )


async def test_command_generator(
    decoy: Decoy,
    mock_protocol_engine: ProtocolEngine,
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should get the next command to execute."""

    def get_next_to_execute() -> Generator[str, None, None]:
        yield "command-id-1"
        yield "command-id-2"
        raise RunStoppedError()

    get_next_to_execute_results = get_next_to_execute()

    mock_state_store = decoy.mock(cls=StateStore)
    decoy.when(mock_protocol_engine._state_store).then_return(mock_state_store)

    decoy.when(
        await mock_protocol_engine._state_store.wait_for(
            condition=mock_protocol_engine.state_view.commands.get_next_to_execute
        )
    ).then_do(lambda *args, **kwargs: next(get_next_to_execute_results))

    index = 1
    async for command in live_protocol_subject.command_generator():
        assert command == f"command-id-{index}"
        index = index + 1


def test_create_error_recovery_policy(
    decoy: Decoy,
    mock_protocol_engine: ProtocolEngine,
    live_protocol_subject: RunOrchestrator,
) -> None:
    """Should call PE set_error_recovery_policy."""
    policy = decoy.mock(cls=ErrorRecoveryPolicy)
    live_protocol_subject.set_error_recovery_policy(policy)
    decoy.verify(mock_protocol_engine.set_error_recovery_policy(policy))
