"""Tests for the AnalysisStore interface."""
import json

from datetime import datetime, timezone
from pathlib import Path
from typing import List, NamedTuple, Optional

import pytest
from decoy import Decoy
from opentrons.protocol_engine.types import (
    RunTimeParameter,
    NumberParameter,
    EnumParameter,
    EnumChoice,
    BooleanParameter,
    CSVParameter,
    FileInfo,
)

from sqlalchemy.engine import Engine as SQLEngine

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.errors import ErrorCodes

from opentrons.types import MountType, DeckSlotName
from opentrons.protocol_engine import (
    commands as pe_commands,
    errors as pe_errors,
    types as pe_types,
)
from opentrons.protocol_reader import (
    ProtocolSource,
    JsonProtocolConfig,
)

from robot_server.protocols.analysis_models import (
    AnalysisResult,
    AnalysisStatus,
    AnalysisSummary,
    PendingAnalysis,
    CompletedAnalysis,
)
from robot_server.protocols.analysis_store import (
    AnalysisStore,
    AnalysisNotFoundError,
    AnalysisIsPendingError,
    _CURRENT_ANALYZER_VERSION,
)
from robot_server.protocols.completed_analysis_store import (
    CompletedAnalysisStore,
    CompletedAnalysisResource,
)
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolResource,
)
from robot_server.protocols.rtp_resources import (
    PrimitiveParameterResource,
    CSVParameterResource,
)


@pytest.fixture
def protocol_store(sql_engine: SQLEngine) -> ProtocolStore:
    """Return a `ProtocolStore` linked to the same database as the subject under test.

    `ProtocolStore` is tested elsewhere.
    We only need it here to prepare the database for our `AnalysisStore` tests.
    An analysis always needs a protocol to link to.
    """
    return ProtocolStore.create_empty(sql_engine=sql_engine)


@pytest.fixture
def subject(sql_engine: SQLEngine) -> AnalysisStore:
    """Return the `AnalysisStore` test subject."""
    return AnalysisStore(sql_engine=sql_engine)


def make_dummy_protocol_resource(protocol_id: str) -> ProtocolResource:
    """Return a placeholder `ProtocolResource` to insert into a `ProtocolStore`.

    Args:
        protocol_id: The ID to give to the new `ProtocolResource`.
    """
    return ProtocolResource(
        protocol_id=protocol_id,
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key=None,
        protocol_kind=ProtocolKind.STANDARD,
    )


def mock_number_param(name: str, value: float) -> NumberParameter:
    """Return a NumberParameter."""
    return NumberParameter(
        variableName=name,
        displayName="num param",
        value=value,
        default=3.0,
        max=10,
        min=0,
        type="float",
    )


def mock_csv_param(name: str, file: Optional[FileInfo]) -> CSVParameter:
    """Return a CSVParameter."""
    return CSVParameter(
        variableName=name,
        displayName="csv param",
        file=file,
    )


def mock_enum_param(name: str, value: str) -> EnumParameter:
    """Return a EnumParameter."""
    return EnumParameter(
        variableName=name,
        displayName="enum param",
        type="str",
        value=value,
        default="blah",
        choices=[EnumChoice(displayName="floo", value="barr")],
    )


def mock_bool_param(name: str, value: bool) -> BooleanParameter:
    """Return a BooleanParameter."""
    return BooleanParameter(
        variableName=name,
        displayName="enum param",
        type="bool",
        value=value,
        default=False,
    )


async def test_get_empty(subject: AnalysisStore, protocol_store: ProtocolStore) -> None:
    """It should return an empty list if no analysis saved."""
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))

    full_result = await subject.get_by_protocol("protocol-id")
    summaries_result = subject.get_summaries_by_protocol("protocol-id")

    assert full_result == []
    assert summaries_result == []

    with pytest.raises(AnalysisNotFoundError, match="analysis-id"):
        await subject.get("analysis-id")


async def test_add_pending(
    subject: AnalysisStore, protocol_store: ProtocolStore
) -> None:
    """It should add a pending analysis to the store."""
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    expected_analysis = PendingAnalysis(id="analysis-id", runTimeParameters=[])
    expected_summary = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
    )

    subject.add_pending(
        protocol_id="protocol-id", analysis_id="analysis-id", run_time_parameters=[]
    )

    assert await subject.get_by_protocol("protocol-id") == [expected_analysis]
    assert subject.get_summaries_by_protocol("protocol-id") == [expected_summary]
    with pytest.raises(AnalysisNotFoundError, match="analysis-id"):
        # Unlike get(), get_as_document() should raise if the analysis is pending.
        await subject.get_as_document("analysis-id")


async def test_returned_in_order_added(
    subject: AnalysisStore, protocol_store: ProtocolStore
) -> None:
    """It should return analyses from least-recently-added to most-recently-added."""
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    for analysis_id in ["analysis-id-1", "analysis-id-2", "analysis-id-3"]:
        subject.add_pending(
            protocol_id="protocol-id", analysis_id=analysis_id, run_time_parameters=[]
        )
        await subject.update(
            analysis_id=analysis_id,
            robot_type="OT-2 Standard",
            run_time_parameters=[],
            labware=[],
            modules=[],
            pipettes=[],
            commands=[],
            errors=[],
            liquids=[],
            liquidClasses=[],
            command_annotations=[],
        )

    subject.add_pending(
        protocol_id="protocol-id", analysis_id="analysis-id-4", run_time_parameters=[]
    )
    # Leave as pending, to test that we interleave completed & pending analyses
    # in the correct order.

    expected_order = [
        "analysis-id-1",
        "analysis-id-2",
        "analysis-id-3",
        "analysis-id-4",
    ]
    summaries = subject.get_summaries_by_protocol(protocol_id="protocol-id")
    full_analyses = await subject.get_by_protocol(protocol_id="protocol-id")
    assert [s.id for s in summaries] == expected_order
    assert [a.id for a in full_analyses] == expected_order


async def test_update_adds_details_and_completes_analysis(
    subject: AnalysisStore, protocol_store: ProtocolStore
) -> None:
    """It should add details to the stored analysis and mark it completed."""
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    labware = pe_types.LoadedLabware(
        id="labware-id",
        loadName="load-name",
        definitionUri="namespace/load-name/42",
        location=pe_types.DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        offsetId=None,
    )

    pipette = pe_types.LoadedPipette(
        id="pipette-id",
        pipetteName=PipetteNameType.P300_SINGLE,
        mount=MountType.LEFT,
    )
    run_time_param = pe_types.NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    command_annotation = pe_types.CustomCommandAnnotation(commandKeys=["abc", "xyz"])
    subject.add_pending(
        protocol_id="protocol-id", analysis_id="analysis-id", run_time_parameters=[]
    )
    await subject.update(
        analysis_id="analysis-id",
        robot_type="OT-2 Standard",
        run_time_parameters=[run_time_param],
        labware=[labware],
        pipettes=[pipette],
        # TODO(mm, 2022-10-21): Give the subject some commands, errors, and liquids here
        # and assert that we can retrieve them.
        modules=[],
        commands=[],
        errors=[],
        liquids=[],
        liquidClasses=[],
        command_annotations=[command_annotation],
    )

    result = await subject.get("analysis-id")
    result_as_document = await subject.get_as_document("analysis-id")

    assert result == CompletedAnalysis(
        id="analysis-id",
        status=AnalysisStatus.COMPLETED,
        result=AnalysisResult.OK,
        robotType="OT-2 Standard",
        runTimeParameters=[run_time_param],
        labware=[labware],
        pipettes=[pipette],
        modules=[],
        commands=[],
        errors=[],
        liquids=[],
        liquidClasses=[],
        commandAnnotations=[command_annotation],
    )
    assert await subject.get_by_protocol("protocol-id") == [result]
    assert json.loads(result_as_document) == {
        "id": "analysis-id",
        "result": "ok",
        "status": "completed",
        "robotType": "OT-2 Standard",
        "runTimeParameters": [
            {
                "displayName": "My parameter",
                "variableName": "cool_param",
                "type": "int",
                "min": 1,
                "max": 5,
                "value": 2.0,
                "default": 3.0,
            }
        ],
        "labware": [
            {
                "id": "labware-id",
                "loadName": "load-name",
                "definitionUri": "namespace/load-name/42",
                "location": {"slotName": "1"},
            }
        ],
        "pipettes": [
            {"id": "pipette-id", "pipetteName": "p300_single", "mount": "left"}
        ],
        "commands": [],
        "errors": [],
        "liquids": [],
        "liquidClasses": [],
        "modules": [],
        "commandAnnotations": [
            {"annotationType": "custom", "commandKeys": ["abc", "xyz"]}
        ],
    }


async def test_update_adds_rtp_values_to_completed_store(
    decoy: Decoy, sql_engine: SQLEngine, protocol_store: ProtocolStore
) -> None:
    """It should add RTP values and defaults to completed analysis store."""
    number_param = pe_types.NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    string_param = pe_types.EnumParameter(
        displayName="A choiced param",
        variableName="cooler_param",
        type="str",
        choices=[
            pe_types.EnumChoice(displayName="FOOOO", value="foo"),
            pe_types.EnumChoice(displayName="BARRR", value="bar"),
        ],
        value="baz",
        default="blah",
    )
    csv_param = pe_types.CSVParameter(
        displayName="A CSV param",
        variableName="coolest_param",
        file=FileInfo(id="file-id", name="file-name"),
    )
    expected_completed_analysis_resource = CompletedAnalysisResource(
        id="analysis-id",
        protocol_id="protocol-id",
        analyzer_version=_CURRENT_ANALYZER_VERSION,
        completed_analysis=CompletedAnalysis(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
            result=AnalysisResult.OK,
            robotType="OT-2 Standard",
            runTimeParameters=[number_param, string_param, csv_param],
            labware=[],
            pipettes=[],
            modules=[],
            commands=[],
            errors=[],
            liquids=[],
            liquidClasses=[],
        ),
    )

    mock_completed_store = decoy.mock(cls=CompletedAnalysisStore)
    subject = AnalysisStore(sql_engine=sql_engine, completed_store=mock_completed_store)
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    subject.add_pending(
        protocol_id="protocol-id", analysis_id="analysis-id", run_time_parameters=[]
    )
    await subject.update(
        analysis_id="analysis-id",
        robot_type="OT-2 Standard",
        run_time_parameters=[number_param, string_param, csv_param],
        labware=[],
        pipettes=[],
        modules=[],
        commands=[],
        errors=[],
        liquids=[],
        liquidClasses=[],
        command_annotations=[],
    )
    decoy.verify(
        await mock_completed_store.make_room_and_add(
            completed_analysis_resource=expected_completed_analysis_resource,
            primitive_rtp_resources=[
                PrimitiveParameterResource(
                    analysis_id="analysis-id",
                    parameter_variable_name="cool_param",
                    parameter_type="int",
                    parameter_value=2.0,
                ),
                PrimitiveParameterResource(
                    analysis_id="analysis-id",
                    parameter_variable_name="cooler_param",
                    parameter_type="str",
                    parameter_value="baz",
                ),
            ],
            csv_rtp_resources=[
                CSVParameterResource(
                    analysis_id="analysis-id",
                    parameter_variable_name="coolest_param",
                    file_id="file-id",
                ),
            ],
        )
    )


class AnalysisResultSpec(NamedTuple):
    """Spec data for analysis result tests."""

    commands: List[pe_commands.Command]
    errors: List[pe_errors.ErrorOccurrence]
    expected_result: AnalysisResult


analysis_result_specs: List[AnalysisResultSpec] = [
    AnalysisResultSpec(
        commands=[
            pe_commands.WaitForResume(
                id="pause-1",
                key="command-key",
                status=pe_commands.CommandStatus.SUCCEEDED,
                createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
                params=pe_commands.WaitForResumeParams(message="hello world"),
                result=pe_commands.WaitForResumeResult(),
            )
        ],
        errors=[],
        expected_result=AnalysisResult.OK,
    ),
    AnalysisResultSpec(
        commands=[],
        errors=[
            pe_errors.ErrorOccurrence(
                id="error-id",
                createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
                errorType="BadError",
                detail="oh no",
            )
        ],
        expected_result=AnalysisResult.NOT_OK,
    ),
    AnalysisResultSpec(
        commands=[],
        errors=[
            pe_errors.ErrorOccurrence(
                id="error-id",
                createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
                errorType="FakeFileError",
                errorCode=ErrorCodes.RUNTIME_PARAMETER_VALUE_REQUIRED.value.code,
                detail="oh no",
            )
        ],
        expected_result=AnalysisResult.PARAMETER_VALUE_REQUIRED,
    ),
]


@pytest.mark.parametrize(AnalysisResultSpec._fields, analysis_result_specs)
async def test_update_infers_status_from_errors(
    subject: AnalysisStore,
    protocol_store: ProtocolStore,
    commands: List[pe_commands.Command],
    errors: List[pe_errors.ErrorOccurrence],
    expected_result: AnalysisResult,
) -> None:
    """It should decide the analysis result based on whether there are errors."""
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))
    subject.add_pending(
        protocol_id="protocol-id", analysis_id="analysis-id", run_time_parameters=[]
    )
    await subject.update(
        analysis_id="analysis-id",
        robot_type="OT-2 Standard",
        run_time_parameters=[],
        commands=commands,
        errors=errors,
        labware=[],
        modules=[],
        pipettes=[],
        liquids=[],
        liquidClasses=[],
        command_annotations=[],
    )
    analysis = (await subject.get_by_protocol("protocol-id"))[0]
    assert isinstance(analysis, CompletedAnalysis)
    assert analysis.result == expected_result


async def test_save_initialization_failed_analysis(
    decoy: Decoy, sql_engine: SQLEngine, protocol_store: ProtocolStore
) -> None:
    """It should save the analysis that failed during analyzer initialization."""
    validated_rtp = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    error_occurence = pe_errors.ErrorOccurrence(
        id="error-id",
        createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        errorType="BadError",
        detail="oh no",
    )
    expected_completed_analysis_resource = CompletedAnalysisResource(
        id="analysis-id",
        protocol_id="protocol-id",
        analyzer_version=_CURRENT_ANALYZER_VERSION,
        completed_analysis=CompletedAnalysis(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
            result=AnalysisResult.NOT_OK,
            robotType="OT-2 Standard",
            runTimeParameters=[validated_rtp],
            labware=[],
            pipettes=[],
            modules=[],
            commands=[],
            errors=[error_occurence],
            liquids=[],
            liquidClasses=[],
        ),
    )

    mock_completed_store = decoy.mock(cls=CompletedAnalysisStore)
    subject = AnalysisStore(sql_engine=sql_engine, completed_store=mock_completed_store)
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    await subject.save_initialization_failed_analysis(
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        robot_type="OT-2 Standard",
        run_time_parameters=[validated_rtp],
        errors=[error_occurence],
    )
    decoy.verify(
        await mock_completed_store.make_room_and_add(
            completed_analysis_resource=expected_completed_analysis_resource,
            primitive_rtp_resources=[],
            csv_rtp_resources=[],
        )
    )


@pytest.mark.parametrize(
    argnames=["parameters_from_client", "expected_match"],
    argvalues=[
        (
            [
                mock_number_param("cool_param", 2.0),
                mock_enum_param("cooler_param", "baz"),
                mock_bool_param("uncool_param", True),
                mock_csv_param(
                    "coolest_param", FileInfo(id="file-id", name="file-name")
                ),
            ],
            True,
        ),
        (
            [  # Params have non-matching values
                mock_number_param("cool_param", 2),
                mock_enum_param("cooler_param", "buzzzzz"),
                mock_bool_param("uncool_param", False),
                mock_csv_param(
                    "coolest_param", FileInfo(id="file-id", name="file-name")
                ),
            ],
            False,
        ),
        (
            [
                # params in different order, cool param is '2' instead of '2.0'
                mock_enum_param("cooler_param", "baz"),
                mock_bool_param("uncool_param", True),
                mock_csv_param(
                    "coolest_param", FileInfo(id="file-id", name="file-name")
                ),
                mock_number_param("cool_param", 2),
            ],
            True,
        ),
        (
            [  # CSV param file ID is None
                mock_number_param("cool_param", 2.0),
                mock_enum_param("cooler_param", "baz"),
                mock_bool_param("uncool_param", True),
                mock_csv_param("coolest_param", None),
            ],
            False,
        ),
    ],
)
async def test_matching_rtp_values_in_analysis(
    decoy: Decoy,
    sql_engine: SQLEngine,
    protocol_store: ProtocolStore,
    parameters_from_client: List[RunTimeParameter],
    expected_match: bool,
) -> None:
    """It should return whether the client's RTP values match with those in the last analysis of protocol."""
    mock_completed_store = decoy.mock(cls=CompletedAnalysisStore)
    subject = AnalysisStore(sql_engine=sql_engine, completed_store=mock_completed_store)
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    decoy.when(
        mock_completed_store.get_primitive_rtps_by_analysis_id("analysis-2")
    ).then_return(
        {
            "cool_param": 2.0,
            "cooler_param": "baz",
            "uncool_param": True,
        }
    )
    decoy.when(
        mock_completed_store.get_csv_rtps_by_analysis_id("analysis-2")
    ).then_return({"coolest_param": "file-id"})
    assert (
        await subject.matching_rtp_values_in_analysis(
            last_analysis_summary=AnalysisSummary(
                id="analysis-2", status=AnalysisStatus.COMPLETED
            ),
            new_parameters=parameters_from_client,
        )
        == expected_match
    )


async def test_matching_default_rtp_values_in_analysis_with_pending_analysis(
    subject: AnalysisStore, protocol_store: ProtocolStore
) -> None:
    """It should raise an error if analysis is pending."""
    with pytest.raises(AnalysisIsPendingError):
        await subject.matching_rtp_values_in_analysis(
            AnalysisSummary(id="analysis-id", status=AnalysisStatus.PENDING), []
        )


async def test_matching_rtp_values_in_analysis_with_no_rtps(
    decoy: Decoy,
    sql_engine: SQLEngine,
    subject: AnalysisStore,
    protocol_store: ProtocolStore,
) -> None:
    """It should handle the cases of no RTPs, either previously or newly, appropriately."""
    mock_completed_store = decoy.mock(cls=CompletedAnalysisStore)
    subject = AnalysisStore(sql_engine=sql_engine, completed_store=mock_completed_store)
    protocol_store.insert(make_dummy_protocol_resource(protocol_id="protocol-id"))

    decoy.when(
        mock_completed_store.get_primitive_rtps_by_analysis_id("analysis-2")
    ).then_return({})
    decoy.when(
        mock_completed_store.get_csv_rtps_by_analysis_id("analysis-2")
    ).then_return({})
    assert (
        await subject.matching_rtp_values_in_analysis(
            last_analysis_summary=AnalysisSummary(
                id="analysis-2", status=AnalysisStatus.COMPLETED
            ),
            new_parameters=[],
        )
        is True
    )
    decoy.when(
        mock_completed_store.get_primitive_rtps_by_analysis_id("analysis-2")
    ).then_return({})
    decoy.when(
        mock_completed_store.get_csv_rtps_by_analysis_id("analysis-2")
    ).then_return({})
    assert (
        await subject.matching_rtp_values_in_analysis(
            last_analysis_summary=AnalysisSummary(
                id="analysis-2", status=AnalysisStatus.COMPLETED
            ),
            new_parameters=[mock_number_param("cool_param", 2.0)],
        )
        is False
    )
