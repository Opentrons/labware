"""Tests for the ProtocolStore interface."""
from opentrons.protocol_engine.types import CSVParameter, FileInfo
import pytest
from decoy import Decoy
from datetime import datetime, timezone
from pathlib import Path

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_reader import (
    ProtocolSource,
    ProtocolSourceFile,
    ProtocolFileRole,
    JsonProtocolConfig,
    PythonProtocolConfig,
)

from robot_server.data_files.data_files_store import (
    DataFilesStore,
    DataFileInfo,
)
from robot_server.data_files.models import DataFile, DataFileSource
from robot_server.protocols.analysis_memcache import MemoryCache
from robot_server.protocols.analysis_models import (
    CompletedAnalysis,
    AnalysisStatus,
    AnalysisResult,
)
from robot_server.protocols.completed_analysis_store import (
    CompletedAnalysisResource,
    CompletedAnalysisStore,
)
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolResource,
    ProtocolUsageInfo,
    ProtocolNotFoundError,
    ProtocolUsedByRunError,
)
from robot_server.protocols.rtp_resources import CSVParameterResource

from robot_server.runs.run_store import RunStore

from sqlalchemy.engine import Engine as SQLEngine
from robot_server.service.notifications import RunsPublisher


@pytest.fixture
def protocol_file_directory(tmp_path: Path) -> Path:
    """Return a directory for protocol files to be placed in."""
    subdirectory = tmp_path / "protocol_files"
    subdirectory.mkdir()
    return subdirectory


@pytest.fixture
def subject(sql_engine: SQLEngine) -> ProtocolStore:
    """Get a ProtocolStore test subject."""
    return ProtocolStore.create_empty(sql_engine=sql_engine)


@pytest.fixture()
def mock_runs_publisher(decoy: Decoy) -> RunsPublisher:
    """Get a mock RunsPublisher."""
    return decoy.mock(cls=RunsPublisher)


@pytest.fixture
def run_store(sql_engine: SQLEngine, mock_runs_publisher: RunsPublisher) -> RunStore:
    """Get a RunStore linked to the same database as the subject ProtocolStore."""
    return RunStore(sql_engine=sql_engine)


@pytest.fixture
def data_files_store(sql_engine: SQLEngine, tmp_path: Path) -> DataFilesStore:
    """Get a mocked out DataFilesStore."""
    data_files_dir = tmp_path / "data_files"
    data_files_dir.mkdir()
    return DataFilesStore(sql_engine=sql_engine, data_files_directory=data_files_dir)


@pytest.fixture
def completed_analysis_store(
    decoy: Decoy,
    sql_engine: SQLEngine,
) -> CompletedAnalysisStore:
    """Get a subject."""
    return CompletedAnalysisStore(sql_engine, decoy.mock(cls=MemoryCache), "2")


async def test_insert_and_get_protocol(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should store a single protocol."""
    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    assert subject.has("protocol-id") is False

    subject.insert(protocol_resource)
    result = subject.get("protocol-id")

    assert result == protocol_resource
    assert subject.has("protocol-id") is True


async def test_insert_with_duplicate_key_raises(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should raise an error when the given protocol ID is not unique."""
    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )
    protocol_resource_2 = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "def.json"),
            config=JsonProtocolConfig(schema_version=456),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    subject.insert(protocol_resource_1)

    # Don't care what it raises. Exception type is not part of the public interface.
    # We just care that it doesn't corrupt the database.
    with pytest.raises(Exception):
        subject.insert(protocol_resource_2)

    assert subject.get_all() == [protocol_resource_1]  # No traces of the failed insert.


async def test_get_missing_protocol_raises(subject: ProtocolStore) -> None:
    """It should raise an error when protocol not found."""
    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.get("protocol-id")


async def test_get_all_protocols(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should get all protocols existing in the store."""
    created_at_1 = datetime(year=2021, month=1, day=1, tzinfo=timezone.utc)
    created_at_2 = datetime(year=2022, month=2, day=2, tzinfo=timezone.utc)

    resource_1 = ProtocolResource(
        protocol_id="abc",
        created_at=created_at_1,
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.py"),
            config=PythonProtocolConfig(api_version=APIVersion(1234, 5678)),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )
    resource_2 = ProtocolResource(
        protocol_id="123",
        created_at=created_at_2,
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=1234),
            files=[],
            metadata={},
            robot_type="OT-3 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-222",
        protocol_kind=ProtocolKind.STANDARD,
    )

    subject.insert(resource_1)
    subject.insert(resource_2)
    result = subject.get_all()

    assert result == [resource_1, resource_2]


async def test_remove_protocol(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should remove specified protocol's files from store."""
    directory = protocol_file_directory
    main_file = protocol_file_directory / "protocol.json"
    other_file = protocol_file_directory / "labware.json"

    main_file.touch()
    other_file.touch()

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=directory,
            main_file=main_file,
            config=JsonProtocolConfig(schema_version=123),
            files=[
                ProtocolSourceFile(path=main_file, role=ProtocolFileRole.MAIN),
                ProtocolSourceFile(path=other_file, role=ProtocolFileRole.LABWARE),
            ],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-data-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    subject.insert(protocol_resource)
    subject.remove("protocol-id")

    assert directory.exists() is False
    assert main_file.exists() is False
    assert other_file.exists() is False

    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.get("protocol-id")


def test_remove_missing_protocol_raises(
    subject: ProtocolStore,
) -> None:
    """It should raise an error when trying to remove missing protocol."""
    with pytest.raises(ProtocolNotFoundError, match="protocol-id"):
        subject.remove("protocol-id")


def test_remove_protocol_conflict(
    run_store: RunStore,
    subject: ProtocolStore,
) -> None:
    """It should raise an error when removing a protocol with a run."""
    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
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

    subject.insert(protocol_resource)
    run_store.insert(
        run_id="run-id",
        protocol_id="protocol-id",
        created_at=datetime(year=2022, month=2, day=2, tzinfo=timezone.utc),
    )

    with pytest.raises(ProtocolUsedByRunError, match="protocol-id"):
        subject.remove("protocol-id")


def test_get_usage_info(
    subject: ProtocolStore,
    run_store: RunStore,
) -> None:
    """It should return which protocols are used by runs."""
    # get_usage_info() should return an empty list when no protocols have been added.
    assert subject.get_usage_info() == []

    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id-1",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
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
    protocol_resource_2 = ProtocolResource(
        protocol_id="protocol-id-2",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
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

    subject.insert(protocol_resource_1)
    subject.insert(protocol_resource_2)

    # get_usage_info() should return results in insertion order.
    # Protocols not used by any runs should have is_used_by_run=False.
    assert subject.get_usage_info() == [
        ProtocolUsageInfo(
            protocol_id="protocol-id-1",
            is_used_by_run=False,
        ),
        ProtocolUsageInfo(
            protocol_id="protocol-id-2",
            is_used_by_run=False,
        ),
    ]

    # When a run is added that uses a protocol,
    # that protocol's is_used_by_run should become True.
    run_store.insert(
        run_id="run-id-1",
        protocol_id="protocol-id-1",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    assert subject.get_usage_info() == [
        ProtocolUsageInfo(
            protocol_id="protocol-id-1",
            is_used_by_run=True,
        ),
        ProtocolUsageInfo(
            protocol_id="protocol-id-2",
            is_used_by_run=False,
        ),
    ]

    # When no more runs use a protocol,
    # that protocol's is_used_by_run should go back to being False.
    run_store.remove(run_id="run-id-1")
    assert subject.get_usage_info() == [
        ProtocolUsageInfo(
            protocol_id="protocol-id-1",
            is_used_by_run=False,
        ),
        ProtocolUsageInfo(
            protocol_id="protocol-id-2",
            is_used_by_run=False,
        ),
    ]


def test_get_referencing_run_ids(
    subject: ProtocolStore,
    run_store: RunStore,
) -> None:
    """It should return a list of run ids that reference a given protocol."""
    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id-1",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
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

    subject.insert(protocol_resource_1)
    # Still no runs, so we should still get back an empty list
    assert subject.get_referencing_run_ids("protocol-id-1") == []

    run_store.insert(
        run_id="run-id-1",
        protocol_id="protocol-id-1",
        created_at=datetime(year=2022, month=1, day=1, tzinfo=timezone.utc),
    )
    assert subject.get_referencing_run_ids("protocol-id-1") == ["run-id-1"]

    run_store.insert(
        run_id="run-id-2",
        protocol_id="protocol-id-1",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )
    assert subject.get_referencing_run_ids("protocol-id-1") == ["run-id-1", "run-id-2"]

    run_store.remove(run_id="run-id-1")
    run_store.remove(run_id="run-id-2")

    assert subject.get_referencing_run_ids("protocol-id-1") == []


def test_get_protocol_ids(
    subject: ProtocolStore,
) -> None:
    """It should return a list of protocol ids."""
    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id-1",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
            main_file=Path("/dev/null"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc1",
        ),
        protocol_key=None,
        protocol_kind=ProtocolKind.STANDARD,
    )

    protocol_resource_2 = ProtocolResource(
        protocol_id="protocol-id-2",
        created_at=datetime(year=2021, month=1, day=2, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
            main_file=Path("/dev/null"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc2",
        ),
        protocol_key=None,
        protocol_kind=ProtocolKind.STANDARD,
    )

    assert subject.get_all_ids() == []

    subject.insert(protocol_resource_1)

    assert subject.get_all_ids() == ["protocol-id-1"]

    subject.insert(protocol_resource_2)
    assert subject.get_all_ids() == ["protocol-id-1", "protocol-id-2"]

    subject.remove(protocol_id="protocol-id-1")
    subject.remove(protocol_id="protocol-id-2")

    assert subject.get_all_ids() == []


async def test_insert_and_get_quick_transfer_protocol(
    protocol_file_directory: Path, subject: ProtocolStore
) -> None:
    """It should store a single quick-transfer protocol."""
    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2024, month=6, day=6, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=protocol_file_directory,
            main_file=(protocol_file_directory / "abc.json"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-3 Standard",
            content_hash="abc123",
        ),
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
    )

    assert subject.has("protocol-id") is False

    subject.insert(protocol_resource)
    result = subject.get("protocol-id")

    assert result == protocol_resource
    assert result.protocol_kind == ProtocolKind.QUICK_TRANSFER
    assert subject.has("protocol-id") is True


def get_completed_analysis_resource(
    analysis_id: str,
    protocol_id: str,
) -> CompletedAnalysisResource:
    """Get a CompletedAnalysisResource."""
    return CompletedAnalysisResource(
        analysis_id,
        protocol_id,
        "2",
        CompletedAnalysis(
            id=analysis_id,
            status=AnalysisStatus.COMPLETED,
            result=AnalysisResult.OK,
            pipettes=[],
            labware=[],
            modules=[],
            commands=[],
            errors=[],
            liquids=[],
            liquidClasses=[],
        ),
    )


async def test_get_referenced_data_files(
    subject: ProtocolStore,
    data_files_store: DataFilesStore,
    completed_analysis_store: CompletedAnalysisStore,
    run_store: RunStore,
) -> None:
    """It should fetch a list of data files referenced in protocol's analyses and runs."""
    protocol_resource_1 = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2024, month=1, day=1, tzinfo=timezone.utc),
        source=ProtocolSource(
            directory=None,
            main_file=Path("/dev/null"),
            config=JsonProtocolConfig(schema_version=123),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="abc1",
        ),
        protocol_key=None,
        protocol_kind=ProtocolKind.STANDARD,
    )
    analysis_resource1 = CompletedAnalysisResource(
        "analysis-id-1",
        "protocol-id",
        "2",
        CompletedAnalysis(
            id="analysis-id-1",
            status=AnalysisStatus.COMPLETED,
            result=AnalysisResult.OK,
            pipettes=[],
            labware=[],
            modules=[],
            commands=[],
            errors=[],
            liquids=[],
            liquidClasses=[],
        ),
    )
    analysis_resource2 = CompletedAnalysisResource(
        "analysis-id-2",
        "protocol-id",
        "2",
        CompletedAnalysis(
            id="analysis-id-2",
            status=AnalysisStatus.COMPLETED,
            result=AnalysisResult.OK,
            pipettes=[],
            labware=[],
            modules=[],
            commands=[],
            errors=[],
            liquids=[],
            liquidClasses=[],
        ),
    )

    subject.insert(protocol_resource_1)
    await data_files_store.insert(
        DataFileInfo(
            id="data-file-id-1",
            name="file-name",
            file_hash="abc123",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        )
    )
    await data_files_store.insert(
        DataFileInfo(
            id="data-file-id-2",
            name="file-name",
            file_hash="abc123",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        )
    )
    await data_files_store.insert(
        DataFileInfo(
            id="data-file-id-3",
            name="file-name",
            file_hash="abc123",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
        )
    )

    run_store.insert(
        run_id="run-id-1",
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
    )

    run_store.insert_csv_rtp(
        run_id="run-id-1",
        run_time_parameters=[
            CSVParameter(
                variableName="csvFile",
                displayName="csv param",
                file=FileInfo(id="data-file-id-3", name="file-name"),
            )
        ],
    )

    await completed_analysis_store.make_room_and_add(
        completed_analysis_resource=analysis_resource1,
        primitive_rtp_resources=[],
        csv_rtp_resources=[
            CSVParameterResource(
                analysis_id="analysis-id-1",
                parameter_variable_name="csv-var",
                file_id="data-file-id-1",
            ),
            CSVParameterResource(
                analysis_id="analysis-id-1",
                parameter_variable_name="csv-var",
                file_id="data-file-id-2",
            ),
        ],
    )
    await completed_analysis_store.make_room_and_add(
        completed_analysis_resource=analysis_resource2,
        primitive_rtp_resources=[],
        csv_rtp_resources=[],
    )
    result = await subject.get_referenced_data_files("protocol-id")

    assert result == [
        DataFile(
            id="data-file-id-1",
            name="file-name",
            createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
            source=DataFileSource.UPLOADED,
        ),
        DataFile(
            id="data-file-id-2",
            name="file-name",
            createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
            source=DataFileSource.UPLOADED,
        ),
        DataFile(
            id="data-file-id-3",
            name="file-name",
            createdAt=datetime(year=2021, month=1, day=1, tzinfo=timezone.utc),
            source=DataFileSource.UPLOADED,
        ),
    ]
