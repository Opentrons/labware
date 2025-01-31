"""Tests for the ProtocolAnalyzer."""
import pytest
from decoy import Decoy
from datetime import datetime
from pathlib import Path

from opentrons.protocols.api_support.types import APIVersion
from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.pipette.types import PipetteNameType

from opentrons.types import MountType, DeckSlotName
from opentrons.protocol_engine import (
    StateSummary,
    EngineStatus,
    commands as pe_commands,
    errors as pe_errors,
    types as pe_types,
)
import opentrons.protocol_runner as protocol_runner
import opentrons.protocol_runner.create_simulating_orchestrator as simulating_runner
from opentrons.protocol_reader import (
    ProtocolSource,
    JsonProtocolConfig,
    PythonProtocolConfig,
)
from opentrons.protocol_runner.run_orchestrator import ParseMode

import opentrons.util.helpers as datetime_helper

from robot_server.protocols.analysis_store import AnalysisStore
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import ProtocolResource
from robot_server.protocols.protocol_analyzer import ProtocolAnalyzer
import robot_server.errors.error_mappers as em

from opentrons_shared_data.errors import EnumeratedError, ErrorCodes


@pytest.fixture(autouse=True)
def patch_mock_map_unexpected_error(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace map_unexpected_error with a mock."""
    mock_map_unexpected_error = decoy.mock(func=em.map_unexpected_error)
    monkeypatch.setattr(em, "map_unexpected_error", mock_map_unexpected_error)


@pytest.fixture(autouse=True)
def patch_mock_get_utc_datetime(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace utc_now with a mock."""
    mock_get_utc_datetime = decoy.mock(func=datetime_helper.utc_now)
    monkeypatch.setattr(datetime_helper, "utc_now", mock_get_utc_datetime)


@pytest.fixture(autouse=True)
def patch_mock_create_simulating_orchestrator(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace protocol_runner.check() with a mock."""
    mock = decoy.mock(func=simulating_runner.create_simulating_orchestrator)
    monkeypatch.setattr(simulating_runner, "create_simulating_orchestrator", mock)


@pytest.fixture
def analysis_store(decoy: Decoy) -> AnalysisStore:
    """Get a mocked out AnalysisStore."""
    return decoy.mock(cls=AnalysisStore)


async def test_load_orchestrator(
    decoy: Decoy,
    analysis_store: AnalysisStore,
) -> None:
    """It should load the appropriate run orchestrator."""
    robot_type: RobotType = "OT-3 Standard"
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/abc.py"),
        config=PythonProtocolConfig(api_version=APIVersion(100, 200)),
        files=[],
        metadata={},
        robot_type=robot_type,
        content_hash="abc123",
    )
    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )
    subject = ProtocolAnalyzer(
        analysis_store=analysis_store, protocol_resource=protocol_resource
    )

    run_orchestrator = decoy.mock(cls=protocol_runner.RunOrchestrator)
    decoy.when(
        await simulating_runner.create_simulating_orchestrator(
            robot_type=robot_type,
            protocol_config=PythonProtocolConfig(api_version=APIVersion(100, 200)),
        )
    ).then_return(run_orchestrator)
    await subject.load_orchestrator(
        run_time_param_values={"rtp_var": 123},
        run_time_param_paths={"csv_param": Path("file-path")},
    )

    decoy.verify(
        await run_orchestrator.load(
            protocol_source=protocol_source,
            parse_mode=ParseMode.NORMAL,
            run_time_param_values={"rtp_var": 123},
            run_time_param_paths={"csv_param": Path("file-path")},
        ),
        times=1,
    )


async def test_analyze(
    decoy: Decoy,
    analysis_store: AnalysisStore,
) -> None:
    """It should be able to start a protocol analysis and update the analysis store when completed."""
    robot_type: RobotType = "OT-3 Standard"

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type=robot_type,
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    analysis_command = pe_commands.WaitForResume(
        id="command-id",
        key="command-key",
        status=pe_commands.CommandStatus.SUCCEEDED,
        createdAt=datetime(year=2022, month=2, day=2),
        params=pe_commands.WaitForResumeParams(message="hello world"),
    )

    analysis_labware = pe_types.LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="namespace/load-name/42",
        location=pe_types.DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=None,
    )

    analysis_pipette = pe_types.LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )

    bool_parameter = pe_types.BooleanParameter(
        displayName="Foo", variableName="Bar", default=True, value=False
    )

    command_annotation = pe_types.CustomCommandAnnotation(commandKeys=["abc", "xyz"])

    orchestrator = decoy.mock(cls=protocol_runner.RunOrchestrator)
    decoy.when(
        await simulating_runner.create_simulating_orchestrator(
            robot_type=robot_type,
            protocol_config=JsonProtocolConfig(schema_version=123),
        )
    ).then_return(orchestrator)
    subject = ProtocolAnalyzer(
        analysis_store=analysis_store, protocol_resource=protocol_resource
    )
    await subject.load_orchestrator(
        run_time_param_values={"rtp_var": 123}, run_time_param_paths={}
    )
    decoy.when(await orchestrator.run(deck_configuration=[],)).then_return(
        protocol_runner.RunResult(
            commands=[analysis_command],
            state_summary=StateSummary(
                status=EngineStatus.SUCCEEDED,
                errors=[],
                labware=[analysis_labware],
                pipettes=[analysis_pipette],
                modules=[],
                labwareOffsets=[],
                liquids=[],
                liquidClasses=[],
                wells=[],
                files=[],
                hasEverEnteredErrorRecovery=False,
            ),
            parameters=[bool_parameter],
            command_annotations=[command_annotation],
        )
    )

    await subject.analyze(
        analysis_id="analysis-id",
    )
    decoy.verify(
        await analysis_store.update(
            analysis_id="analysis-id",
            robot_type=robot_type,
            run_time_parameters=[bool_parameter],
            commands=[analysis_command],
            labware=[analysis_labware],
            modules=[],
            pipettes=[analysis_pipette],
            errors=[],
            liquids=[],
            liquidClasses=[],
            command_annotations=[command_annotation],
        )
    )


async def test_analyze_updates_pending_on_error(
    decoy: Decoy,
    analysis_store: AnalysisStore,
) -> None:
    """It should update pending analysis with an internal error."""
    robot_type: RobotType = "OT-3 Standard"

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type=robot_type,
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    raised_exception = Exception("You got me!!")

    error_occurrence = pe_errors.ErrorOccurrence.model_construct(
        id="internal-error",
        createdAt=datetime(year=2023, month=3, day=3),
        errorType="EnumeratedError",
        detail="You got me!!",
    )

    enumerated_error = EnumeratedError(
        code=ErrorCodes.GENERAL_ERROR,
        message="You got me!!",
    )

    orchestrator = decoy.mock(cls=protocol_runner.RunOrchestrator)
    decoy.when(
        await simulating_runner.create_simulating_orchestrator(
            robot_type=robot_type,
            protocol_config=JsonProtocolConfig(schema_version=123),
        )
    ).then_return(orchestrator)

    subject = ProtocolAnalyzer(
        analysis_store=analysis_store, protocol_resource=protocol_resource
    )
    decoy.when(
        await orchestrator.run(
            deck_configuration=[],
        )
    ).then_raise(raised_exception)
    decoy.when(orchestrator.get_run_time_parameters()).then_return([])
    decoy.when(em.map_unexpected_error(error=raised_exception)).then_return(
        enumerated_error
    )

    decoy.when(datetime_helper.utc_now()).then_return(
        datetime(year=2023, month=3, day=3)
    )
    await subject.load_orchestrator(
        run_time_param_values={"rtp_var": 123}, run_time_param_paths={}
    )
    await subject.analyze(
        analysis_id="analysis-id",
    )

    decoy.verify(
        await analysis_store.update(
            analysis_id="analysis-id",
            robot_type=robot_type,
            run_time_parameters=[],
            commands=[],
            labware=[],
            modules=[],
            pipettes=[],
            errors=[error_occurrence],
            liquids=[],
            liquidClasses=[],
            command_annotations=[],
        ),
    )
