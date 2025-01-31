"""Tests for the PythonAndLegacyRunner, JsonRunner & LiveRunner classes."""
from unittest.mock import sentinel
from datetime import datetime

import pytest
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from decoy import Decoy, matchers
from pathlib import Path
from typing import List, cast, Union, Type

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.labware.types import (
    LabwareDefinition as LabwareDefinitionTypedDict,
)
from opentrons_shared_data.protocol.models import ProtocolSchemaV6, ProtocolSchemaV7
from opentrons_shared_data.protocol.types import (
    JsonProtocol as LegacyJsonProtocolDict,
)
from opentrons.hardware_control import API as HardwareAPI
from opentrons.legacy_broker import LegacyBroker
from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.types import PostRunHardwareState
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.parse import PythonParseMode
from opentrons.protocols.types import PythonProtocol, JsonProtocol
from opentrons.util.broker import Broker

from opentrons import protocol_reader
from opentrons.protocol_engine import (
    ProtocolEngine,
    CommandStatus,
    Liquid,
    commands as pe_commands,
    errors as pe_errors,
)
from opentrons.protocol_reader import (
    ProtocolSource,
    JsonProtocolConfig,
    PythonProtocolConfig,
)
from opentrons.protocol_runner import (
    create_protocol_runner,
    JsonRunner,
    PythonAndLegacyRunner,
    LiveRunner,
    AnyRunner,
)
from opentrons.protocol_runner.task_queue import TaskQueue
from opentrons.protocol_runner.json_file_reader import JsonFileReader
from opentrons.protocol_runner.json_translator import JsonTranslator
from opentrons.protocol_runner.legacy_context_plugin import LegacyContextPlugin
from opentrons.protocol_runner.python_protocol_wrappers import (
    PythonAndLegacyFileReader,
    ProtocolContextCreator,
    PythonProtocolExecutor,
)


@pytest.fixture
def protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mocked out ProtocolEngine dependency."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mocked out HardwareAPI dependency."""
    return decoy.mock(cls=HardwareAPI)


@pytest.fixture
def task_queue(decoy: Decoy) -> TaskQueue:
    """Get a mocked out TaskQueue dependency."""
    return decoy.mock(cls=TaskQueue)


@pytest.fixture
def json_file_reader(decoy: Decoy) -> JsonFileReader:
    """Get a mocked out JsonFileReader dependency."""
    return decoy.mock(cls=JsonFileReader)


@pytest.fixture
def json_translator(decoy: Decoy) -> JsonTranslator:
    """Get a mocked out JsonTranslator dependency."""
    return decoy.mock(cls=JsonTranslator)


@pytest.fixture
def python_and_legacy_file_reader(decoy: Decoy) -> PythonAndLegacyFileReader:
    """Get a mocked out PythonAndLegacyFileReader dependency."""
    return decoy.mock(cls=PythonAndLegacyFileReader)


@pytest.fixture
def protocol_context_creator(decoy: Decoy) -> ProtocolContextCreator:
    """Get a mocked out ProtocolContextCreator dependency."""
    return decoy.mock(cls=ProtocolContextCreator)


@pytest.fixture
def python_protocol_executor(decoy: Decoy) -> PythonProtocolExecutor:
    """Get a mocked out PythonProtocolExecutor dependency."""
    return decoy.mock(cls=PythonProtocolExecutor)


@pytest.fixture(autouse=True)
def use_mock_extract_labware_definitions(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace protocol_reader.extract_labware_definitions() with a Decoy mock."""
    monkeypatch.setattr(
        protocol_reader,
        "extract_labware_definitions",
        decoy.mock(func=protocol_reader.extract_labware_definitions),
    )


@pytest.fixture
def json_runner_subject(
    protocol_engine: ProtocolEngine,
    hardware_api: HardwareAPI,
    task_queue: TaskQueue,
    json_file_reader: JsonFileReader,
    json_translator: JsonTranslator,
) -> JsonRunner:
    """Get a JsonRunner test subject with mocked dependencies."""
    return JsonRunner(
        protocol_engine=protocol_engine,
        hardware_api=hardware_api,
        task_queue=task_queue,
        json_file_reader=json_file_reader,
        json_translator=json_translator,
    )


@pytest.fixture
def python_runner_subject(
    protocol_engine: ProtocolEngine,
    hardware_api: HardwareAPI,
    task_queue: TaskQueue,
    python_and_legacy_file_reader: PythonAndLegacyFileReader,
    protocol_context_creator: ProtocolContextCreator,
    python_protocol_executor: PythonProtocolExecutor,
) -> PythonAndLegacyRunner:
    """Get a PythonAndLegacyRunner test subject with mocked dependencies."""
    return PythonAndLegacyRunner(
        protocol_engine=protocol_engine,
        hardware_api=hardware_api,
        task_queue=task_queue,
        python_and_legacy_file_reader=python_and_legacy_file_reader,
        protocol_context_creator=protocol_context_creator,
        python_protocol_executor=python_protocol_executor,
    )


@pytest.fixture
def live_runner_subject(
    protocol_engine: ProtocolEngine,
    hardware_api: HardwareAPI,
    task_queue: TaskQueue,
) -> LiveRunner:
    """Get a LiveRunner test subject with mocked dependencies."""
    return LiveRunner(
        protocol_engine=protocol_engine,
        hardware_api=hardware_api,
        task_queue=task_queue,
    )


@pytest.mark.parametrize(
    "config, runner_type",
    [
        (JsonProtocolConfig(schema_version=6), JsonRunner),
        (JsonProtocolConfig(schema_version=7), JsonRunner),
        (PythonProtocolConfig(api_version=APIVersion(2, 14)), PythonAndLegacyRunner),
        (JsonProtocolConfig(schema_version=5), PythonAndLegacyRunner),
        (PythonProtocolConfig(api_version=APIVersion(2, 13)), PythonAndLegacyRunner),
    ],
)
def test_create_protocol_runner(
    protocol_engine: ProtocolEngine,
    hardware_api: HardwareAPI,
    task_queue: TaskQueue,
    json_file_reader: JsonFileReader,
    json_translator: JsonTranslator,
    python_and_legacy_file_reader: PythonAndLegacyFileReader,
    protocol_context_creator: ProtocolContextCreator,
    python_protocol_executor: PythonProtocolExecutor,
    config: Union[JsonProtocolConfig, PythonProtocolConfig],
    runner_type: Type[AnyRunner],
) -> None:
    """It should return protocol runner type depending on the config."""
    assert isinstance(
        create_protocol_runner(
            protocol_config=config,
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
            task_queue=task_queue,
            json_file_reader=json_file_reader,
            json_translator=json_translator,
        ),
        runner_type,
    )


@pytest.mark.parametrize(
    "subject",
    [
        (lazy_fixture("json_runner_subject")),
        (lazy_fixture("python_runner_subject")),
        (lazy_fixture("live_runner_subject")),
    ],
)
def test_play_starts_run(
    decoy: Decoy,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    subject: AnyRunner,
) -> None:
    """It should start a protocol run with play."""
    subject.play(sentinel.deck_configuration)
    decoy.verify(
        protocol_engine.set_deck_configuration(sentinel.deck_configuration),
        protocol_engine.play(),
        times=1,
    )


@pytest.mark.parametrize(
    "subject",
    [
        (lazy_fixture("json_runner_subject")),
        (lazy_fixture("python_runner_subject")),
        (lazy_fixture("live_runner_subject")),
    ],
)
def test_pause(
    decoy: Decoy,
    protocol_engine: ProtocolEngine,
    subject: AnyRunner,
) -> None:
    """It should pause a protocol run with pause."""
    subject.pause()

    decoy.verify(protocol_engine.request_pause(), times=1)


@pytest.mark.parametrize(
    "subject",
    [
        (lazy_fixture("json_runner_subject")),
        (lazy_fixture("python_runner_subject")),
        (lazy_fixture("live_runner_subject")),
    ],
)
async def test_stop(
    decoy: Decoy,
    task_queue: TaskQueue,
    protocol_engine: ProtocolEngine,
    subject: AnyRunner,
) -> None:
    """It should halt a protocol run with stop."""
    decoy.when(protocol_engine.state_view.commands.has_been_played()).then_return(True)

    subject.play()
    await subject.stop()

    decoy.verify(await protocol_engine.request_stop(), times=1)


@pytest.mark.parametrize(
    "subject",
    [
        (lazy_fixture("json_runner_subject")),
        (lazy_fixture("python_runner_subject")),
        (lazy_fixture("live_runner_subject")),
    ],
)
async def test_stop_when_run_never_started(
    decoy: Decoy,
    task_queue: TaskQueue,
    protocol_engine: ProtocolEngine,
    subject: AnyRunner,
) -> None:
    """It should clean up rather than halt if the runner was never started."""
    decoy.when(protocol_engine.state_view.commands.has_been_played()).then_return(False)

    await subject.stop()

    decoy.verify(
        await protocol_engine.finish(
            drop_tips_after_run=False,
            set_run_status=False,
            post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
        ),
        times=1,
    )


@pytest.mark.parametrize(
    "subject",
    [
        (lazy_fixture("json_runner_subject")),
        (lazy_fixture("python_runner_subject")),
        (lazy_fixture("live_runner_subject")),
    ],
)
def test_resume_from_recovery(
    decoy: Decoy,
    protocol_engine: ProtocolEngine,
    subject: AnyRunner,
) -> None:
    """It should call `resume_from_recovery()` on the underlying engine."""
    subject.resume_from_recovery(
        reconcile_false_positive=sentinel.reconcile_false_positive
    )

    decoy.verify(
        protocol_engine.resume_from_recovery(
            reconcile_false_positive=sentinel.reconcile_false_positive
        ),
        times=1,
    )


async def test_run_json_runner(
    decoy: Decoy,
    hardware_api: HardwareAPI,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    json_runner_subject: JsonRunner,
) -> None:
    """It should run a protocol to completion."""
    decoy.when(protocol_engine.state_view.commands.has_been_played()).then_return(
        False, True
    )

    assert json_runner_subject.was_started() is False
    await json_runner_subject.run(deck_configuration=sentinel.deck_configuration)
    assert json_runner_subject.was_started() is True

    decoy.verify(
        protocol_engine.set_deck_configuration(sentinel.deck_configuration),
        protocol_engine.play(),
        task_queue.start(),
        await task_queue.join(),
    )


# todo(mm, 2024-07-08): This test has grown long over time and it's unclear now what
# it's actually testing. Can we simplify or split it up?
async def test_run_json_runner_stop_requested_stops_enqueuing(
    decoy: Decoy,
    hardware_api: HardwareAPI,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    json_runner_subject: JsonRunner,
    json_file_reader: JsonFileReader,
    json_translator: JsonTranslator,
) -> None:
    """It should run a protocol to completion."""
    labware_definition = LabwareDefinition.model_construct()  # type: ignore[call-arg]
    json_protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=6),
        content_hash="abc123",
    )

    commands: List[pe_commands.CommandCreate] = [
        pe_commands.HomeCreate(params=pe_commands.HomeParams()),
        pe_commands.WaitForDurationCreate(
            params=pe_commands.WaitForDurationParams(seconds=10)
        ),
        pe_commands.LoadLiquidCreate(
            params=pe_commands.LoadLiquidParams(
                liquidId="water-id", labwareId="labware-id", volumeByWell={"A1": 30}
            )
        ),
    ]

    liquids: List[Liquid] = [
        Liquid(id="water-id", displayName="water", description="water desc")
    ]

    json_protocol = ProtocolSchemaV6.model_construct()  # type: ignore[call-arg]

    decoy.when(
        await protocol_reader.extract_labware_definitions(json_protocol_source)
    ).then_return([labware_definition])
    decoy.when(json_file_reader.read(json_protocol_source)).then_return(json_protocol)
    decoy.when(json_translator.translate_commands(json_protocol)).then_return(commands)
    decoy.when(json_translator.translate_liquids(json_protocol)).then_return(liquids)
    decoy.when(
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            pe_commands.HomeCreate(params=pe_commands.HomeParams()),
        )
    ).then_return(
        pe_commands.Home.model_construct(status=pe_commands.CommandStatus.SUCCEEDED)  # type: ignore[call-arg]
    )
    decoy.when(
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            pe_commands.WaitForDurationCreate(
                params=pe_commands.WaitForDurationParams(seconds=10)
            ),
        )
    ).then_return(
        pe_commands.WaitForDuration.model_construct(  # type: ignore[call-arg]
            id="protocol-command-id",
            error=pe_errors.ErrorOccurrence.from_failed(
                id="some-id",
                createdAt=datetime(year=2021, month=1, day=1),
                error=pe_errors.ProtocolEngineError(),
            ),
            status=pe_commands.CommandStatus.FAILED,
        )
    )
    decoy.when(
        protocol_engine.state_view.commands.get_error_recovery_type(
            "protocol-command-id"
        )
    ).then_return(ErrorRecoveryType.FAIL_RUN)

    await json_runner_subject.load(json_protocol_source)

    run_func_captor = matchers.Captor()

    decoy.verify(
        protocol_engine.add_labware_definition(labware_definition),
        protocol_engine.add_liquid(
            id="water-id", name="water", description="water desc", color=None
        ),
        protocol_engine.add_command(
            request=pe_commands.HomeCreate(params=pe_commands.HomeParams(axes=None))
        ),
        task_queue.set_run_func(func=run_func_captor),
    )

    # Verify that the run func calls the right things:
    run_func = run_func_captor.value

    with pytest.raises(pe_errors.ProtocolEngineError):
        await run_func()


@pytest.mark.filterwarnings("ignore::decoy.warnings.RedundantVerifyWarning")
@pytest.mark.parametrize(
    "schema_version, json_protocol",
    [
        (6, ProtocolSchemaV6.model_construct()),  # type: ignore[call-arg]
        (7, ProtocolSchemaV7.model_construct()),  # type: ignore[call-arg]
    ],
)
async def test_load_json_runner(
    decoy: Decoy,
    json_file_reader: JsonFileReader,
    json_translator: JsonTranslator,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    json_runner_subject: JsonRunner,
    schema_version: int,
    json_protocol: Union[ProtocolSchemaV6, ProtocolSchemaV7],
) -> None:
    """It should load a JSON protocol file."""
    labware_definition = LabwareDefinition.model_construct()  # type: ignore[call-arg]

    json_protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=schema_version),
        content_hash="abc123",
    )

    commands: List[pe_commands.CommandCreate] = [
        pe_commands.WaitForResumeCreate(
            params=pe_commands.WaitForResumeParams(message="hello")
        ),
        pe_commands.WaitForResumeCreate(
            params=pe_commands.WaitForResumeParams(message="goodbye")
        ),
        pe_commands.LoadLiquidCreate(
            params=pe_commands.LoadLiquidParams(
                liquidId="water-id", labwareId="labware-id", volumeByWell={"A1": 30}
            )
        ),
    ]

    liquids: List[Liquid] = [
        Liquid(id="water-id", displayName="water", description="water desc")
    ]

    decoy.when(
        await protocol_reader.extract_labware_definitions(json_protocol_source)
    ).then_return([labware_definition])
    decoy.when(json_file_reader.read(json_protocol_source)).then_return(json_protocol)
    decoy.when(json_translator.translate_commands(json_protocol)).then_return(commands)
    decoy.when(json_translator.translate_liquids(json_protocol)).then_return(liquids)

    await json_runner_subject.load(json_protocol_source)

    run_func_captor = matchers.Captor()

    decoy.verify(
        protocol_engine.add_labware_definition(labware_definition),
        protocol_engine.add_liquid(
            id="water-id", name="water", description="water desc", color=None
        ),
        protocol_engine.add_command(
            request=pe_commands.HomeCreate(params=pe_commands.HomeParams(axes=None))
        ),
        task_queue.set_run_func(func=run_func_captor),
    )

    # Verify that the run func calls the right things:
    run_func = run_func_captor.value
    decoy.when(
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.WaitForResumeCreate(
                params=pe_commands.WaitForResumeParams(message="hello")
            ),
        )
    ).then_return(
        pe_commands.WaitForResume.model_construct(  # type: ignore[call-arg]
            id="command-id-1",
            status=CommandStatus.SUCCEEDED,
            error=None,
        )
    )
    decoy.when(
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.WaitForResumeCreate(
                params=pe_commands.WaitForResumeParams(message="goodbye")
            ),
        )
    ).then_return(
        pe_commands.WaitForResume.model_construct(  # type: ignore[call-arg]
            id="command-id-2",
            status=CommandStatus.SUCCEEDED,
            error=None,
        )
    )
    decoy.when(
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.LoadLiquidCreate(
                params=pe_commands.LoadLiquidParams(
                    liquidId="water-id", labwareId="labware-id", volumeByWell={"A1": 30}
                )
            ),
        )
    ).then_return(
        pe_commands.WaitForResume.model_construct(  # type: ignore[call-arg]
            id="command-id-3",
            status=CommandStatus.SUCCEEDED,
            error=None,
        )
    )
    await run_func()
    decoy.verify(
        # todo(mm, 2024-07-08): This triggers decoy.RedundantVerifyWarning.
        # Above, we're rehearsing each add_and_execute_command() call because the
        # subject needs the return values. But the subject doesn't return anything
        # based on on those return values, so here, we need to "redundantly" verify
        # each call to make sure the subject actually did some work.
        # It doesn't seem like Decoy wants subjects to be like this, so it's unclear
        # how to fix this.
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.WaitForResumeCreate(
                params=pe_commands.WaitForResumeParams(message="hello")
            ),
        ),
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.WaitForResumeCreate(
                params=pe_commands.WaitForResumeParams(message="goodbye")
            ),
        ),
        await protocol_engine.add_and_execute_command_wait_for_recovery(
            request=pe_commands.LoadLiquidCreate(
                params=pe_commands.LoadLiquidParams(
                    liquidId="water-id", labwareId="labware-id", volumeByWell={"A1": 30}
                )
            ),
        ),
    )


async def test_load_legacy_python(
    decoy: Decoy,
    python_and_legacy_file_reader: PythonAndLegacyFileReader,
    protocol_context_creator: ProtocolContextCreator,
    python_protocol_executor: PythonProtocolExecutor,
    task_queue: TaskQueue,
    protocol_engine: ProtocolEngine,
    python_runner_subject: PythonAndLegacyRunner,
) -> None:
    """It should load a legacy context-based Python protocol."""
    labware_definition = LabwareDefinition.model_construct()  # type: ignore[call-arg]

    legacy_protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.py"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=PythonProtocolConfig(api_version=APIVersion(2, 11)),
        content_hash="abc123",
    )

    extra_labware = {"definition-uri": cast(LabwareDefinitionTypedDict, {})}

    legacy_protocol = PythonProtocol(
        text="",
        contents="",
        filename="protocol.py",
        api_level=APIVersion(2, 11),
        robot_type="OT-3 Standard",
        metadata={"foo": "bar"},
        bundled_labware=None,
        bundled_data=None,
        bundled_python=None,
        extra_labware=extra_labware,
    )

    protocol_context = decoy.mock(cls=ProtocolContext)

    decoy.when(
        await protocol_reader.extract_labware_definitions(legacy_protocol_source)
    ).then_return([labware_definition])
    decoy.when(
        python_and_legacy_file_reader.read(
            protocol_source=legacy_protocol_source,
            labware_definitions=[labware_definition],
            python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        )
    ).then_return(legacy_protocol)
    broker_captor = matchers.Captor()
    decoy.when(
        protocol_context_creator.create(
            protocol=legacy_protocol,
            broker=broker_captor,
            equipment_broker=matchers.IsA(Broker),
        )
    ).then_return(protocol_context)

    await python_runner_subject.load(
        legacy_protocol_source,
        python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        run_time_param_values=None,
        run_time_param_paths=None,
    )

    run_func_captor = matchers.Captor()

    decoy.verify(
        protocol_engine.add_labware_definition(labware_definition),
        protocol_engine.add_plugin(matchers.IsA(LegacyContextPlugin)),
        task_queue.set_run_func(run_func_captor),
    )

    assert broker_captor.value is python_runner_subject.broker

    # Verify that the run func calls the right things:
    run_func = run_func_captor.value
    await run_func()
    decoy.verify(
        await protocol_engine.add_and_execute_command(
            request=pe_commands.HomeCreate(params=pe_commands.HomeParams(axes=None))
        ),
        await python_protocol_executor.execute(
            protocol=legacy_protocol,
            context=protocol_context,
            run_time_parameters_with_overrides=None,
        ),
    )


async def test_load_python_with_pe_papi_core(
    decoy: Decoy,
    python_and_legacy_file_reader: PythonAndLegacyFileReader,
    protocol_context_creator: ProtocolContextCreator,
    protocol_engine: ProtocolEngine,
    python_runner_subject: PythonAndLegacyRunner,
) -> None:
    """It should load a legacy context-based Python protocol."""
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.py"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=PythonProtocolConfig(api_version=APIVersion(2, 14)),
        content_hash="abc123",
    )

    protocol = PythonProtocol(
        text="",
        contents="",
        filename="protocol.py",
        robot_type="OT-3 Standard",
        api_level=APIVersion(2, 14),
        metadata={"foo": "bar"},
        bundled_labware=None,
        bundled_data=None,
        bundled_python=None,
        extra_labware=None,
    )

    protocol_context = decoy.mock(cls=ProtocolContext)

    decoy.when(
        await protocol_reader.extract_labware_definitions(protocol_source)
    ).then_return([])
    decoy.when(
        python_and_legacy_file_reader.read(
            protocol_source=protocol_source,
            labware_definitions=[],
            python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        )
    ).then_return(protocol)
    broker_captor = matchers.Captor()
    decoy.when(
        protocol_context_creator.create(
            protocol=protocol, broker=broker_captor, equipment_broker=None
        )
    ).then_return(protocol_context)

    await python_runner_subject.load(
        protocol_source,
        python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        run_time_param_values=None,
        run_time_param_paths=None,
    )

    decoy.verify(protocol_engine.add_plugin(matchers.IsA(LegacyContextPlugin)), times=0)
    assert broker_captor.value is python_runner_subject.broker


async def test_load_legacy_json(
    decoy: Decoy,
    python_and_legacy_file_reader: PythonAndLegacyFileReader,
    protocol_context_creator: ProtocolContextCreator,
    python_protocol_executor: PythonProtocolExecutor,
    task_queue: TaskQueue,
    protocol_engine: ProtocolEngine,
    python_runner_subject: PythonAndLegacyRunner,
) -> None:
    """It should load a legacy context-based JSON protocol."""
    labware_definition = LabwareDefinition.model_construct()  # type: ignore[call-arg]

    legacy_protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.json"),
        files=[],
        metadata={},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=5),
        content_hash="abc123",
    )

    legacy_protocol = JsonProtocol(
        text="{}",
        contents=cast(LegacyJsonProtocolDict, {}),
        filename="protocol.json",
        robot_type="OT-3 Standard",
        api_level=APIVersion(2, 11),
        schema_version=5,
        metadata={"protocolName": "A Very Impressive Protocol"},
    )

    protocol_context = decoy.mock(cls=ProtocolContext)

    decoy.when(
        await protocol_reader.extract_labware_definitions(legacy_protocol_source)
    ).then_return([labware_definition])
    decoy.when(
        python_and_legacy_file_reader.read(
            protocol_source=legacy_protocol_source,
            labware_definitions=[labware_definition],
            python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        )
    ).then_return(legacy_protocol)
    decoy.when(
        protocol_context_creator.create(
            legacy_protocol,
            broker=matchers.IsA(LegacyBroker),
            equipment_broker=matchers.IsA(Broker),
        )
    ).then_return(protocol_context)

    await python_runner_subject.load(
        legacy_protocol_source,
        python_parse_mode=PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
        run_time_param_values=None,
        run_time_param_paths=None,
    )

    run_func_captor = matchers.Captor()

    decoy.verify(
        protocol_engine.add_labware_definition(labware_definition),
        protocol_engine.add_plugin(matchers.IsA(LegacyContextPlugin)),
        task_queue.set_run_func(run_func_captor),
    )

    # Verify that the run func calls the right things:
    run_func = run_func_captor.value
    await run_func()
    decoy.verify(
        await protocol_engine.add_and_execute_command(
            request=pe_commands.HomeCreate(params=pe_commands.HomeParams(axes=None))
        ),
        await python_protocol_executor.execute(
            protocol=legacy_protocol,
            context=protocol_context,
            run_time_parameters_with_overrides=None,
        ),
    )


async def test_run_python_runner(
    decoy: Decoy,
    hardware_api: HardwareAPI,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    python_runner_subject: PythonAndLegacyRunner,
) -> None:
    """It should run a protocol to completion."""
    decoy.when(protocol_engine.state_view.commands.has_been_played()).then_return(
        False, True
    )

    assert python_runner_subject.was_started() is False
    await python_runner_subject.run(deck_configuration=sentinel.deck_configuration)
    assert python_runner_subject.was_started() is True

    decoy.verify(
        protocol_engine.set_deck_configuration(sentinel.deck_configuration),
        protocol_engine.play(),
        task_queue.start(),
        await task_queue.join(),
    )


async def test_run_live_runner(
    decoy: Decoy,
    hardware_api: HardwareAPI,
    protocol_engine: ProtocolEngine,
    task_queue: TaskQueue,
    live_runner_subject: LiveRunner,
) -> None:
    """It should run a protocol to completion."""
    decoy.when(protocol_engine.state_view.commands.has_been_played()).then_return(
        False, True
    )

    assert live_runner_subject.was_started() is False
    await live_runner_subject.run(deck_configuration=sentinel.deck_configuration)
    assert live_runner_subject.was_started() is True

    decoy.verify(
        await hardware_api.home(),
        protocol_engine.set_deck_configuration(sentinel.deck_configuration),
        protocol_engine.play(),
        task_queue.start(),
        await task_queue.join(),
    )
