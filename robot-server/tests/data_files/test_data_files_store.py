"""Tests for the DataFilesStore interface."""
from pathlib import Path

import pytest
from datetime import datetime, timezone

from decoy import Decoy
from opentrons.protocol_reader import ProtocolSource, JsonProtocolConfig
from sqlalchemy.engine import Engine as SQLEngine

from robot_server.data_files.data_files_store import (
    DataFilesStore,
    DataFileInfo,
)
from robot_server.deletion_planner import FileUsageInfo
from robot_server.data_files.models import (
    DataFileSource,
    FileIdNotFoundError,
    FileInUseError,
)
from robot_server.protocols.analysis_memcache import MemoryCache
from robot_server.protocols.analysis_models import (
    CompletedAnalysis,
    AnalysisStatus,
    AnalysisResult,
)
from robot_server.protocols.completed_analysis_store import (
    CompletedAnalysisStore,
    CompletedAnalysisResource,
)
from robot_server.protocols.protocol_models import ProtocolKind
from robot_server.protocols.protocol_store import ProtocolResource, ProtocolStore
from robot_server.protocols.rtp_resources import CSVParameterResource


@pytest.fixture
def data_files_directory(tmp_path: Path) -> Path:
    """Return a directory for storing data files."""
    subdirectory = tmp_path / "data_files"
    subdirectory.mkdir()
    return subdirectory


@pytest.fixture
def subject(sql_engine: SQLEngine, data_files_directory: Path) -> DataFilesStore:
    """Get a DataFilesStore test subject."""
    return DataFilesStore(
        sql_engine=sql_engine, data_files_directory=data_files_directory
    )


@pytest.fixture
def completed_analysis_store(
    decoy: Decoy,
    sql_engine: SQLEngine,
) -> CompletedAnalysisStore:
    """Get a `CompletedAnalysisStore` linked to the same database as the subject under test."""
    return CompletedAnalysisStore(sql_engine, decoy.mock(cls=MemoryCache), "2")


@pytest.fixture
def protocol_store(sql_engine: SQLEngine) -> ProtocolStore:
    """Return a `ProtocolStore` linked to the same database as the subject under test."""
    return ProtocolStore.create_empty(sql_engine=sql_engine)


def _get_sample_protocol_resource(protocol_id: str) -> ProtocolResource:
    return ProtocolResource(
        protocol_id=protocol_id,
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


def _get_sample_analysis_resource(
    protocol_id: str, analysis_id: str
) -> CompletedAnalysisResource:
    return CompletedAnalysisResource(
        analysis_id,
        protocol_id,
        "2",
        CompletedAnalysis(
            id="analysis-id",
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


async def test_insert_data_file_info_and_fetch_by_hash(
    subject: DataFilesStore,
) -> None:
    """It should add the data file info to database."""
    data_file_info = DataFileInfo(
        id="file-id",
        name="file-name",
        file_hash="abc123",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=6, day=20, tzinfo=timezone.utc),
    )
    assert subject.get_file_info_by_hash("abc123") is None
    await subject.insert(data_file_info)
    assert subject.get_file_info_by_hash("abc123") == data_file_info


async def test_insert_file_info_with_existing_id(
    subject: DataFilesStore,
) -> None:
    """It should raise an error when trying to add the same file ID to database."""
    data_file_info1 = DataFileInfo(
        id="file-id",
        name="file-name",
        file_hash="abc123",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=6, day=20, tzinfo=timezone.utc),
    )
    data_file_info2 = DataFileInfo(
        id="file-id",
        name="file-name2",
        file_hash="abc1234",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=6, day=20, tzinfo=timezone.utc),
    )
    await subject.insert(data_file_info1)
    with pytest.raises(Exception):
        await subject.insert(data_file_info2)


async def test_insert_data_file_info_and_get_by_id(
    subject: DataFilesStore,
) -> None:
    """It should get the inserted data file info from the database."""
    data_file_info = DataFileInfo(
        id="file-id",
        name="file-name",
        file_hash="abc",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=7, day=15, tzinfo=timezone.utc),
    )
    await subject.insert(data_file_info)
    assert subject.get("file-id") == data_file_info


def test_get_by_id_raises(
    subject: DataFilesStore,
) -> None:
    """It should raise if the requested data file id does not exist."""
    with pytest.raises(FileIdNotFoundError):
        assert subject.get("file-id")


async def test_get_usage_info(
    subject: DataFilesStore,
    protocol_store: ProtocolStore,
    completed_analysis_store: CompletedAnalysisStore,
) -> None:
    """It should return the usage info of all the data files in store."""
    protocol_resource = _get_sample_protocol_resource("protocol-id")
    analysis_resource1 = _get_sample_analysis_resource("protocol-id", "analysis-id")
    csv_param_resource = [
        CSVParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="baz",
            file_id="file-id-1",
        )
    ]
    data_file_1 = DataFileInfo(
        id="file-id-1",
        name="file-name",
        file_hash="abc",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=7, day=15, tzinfo=timezone.utc),
    )
    data_file_2 = DataFileInfo(
        id="file-id-2",
        name="file-name",
        file_hash="xyz",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=7, day=15, tzinfo=timezone.utc),
    )
    await subject.insert(data_file_1)
    await subject.insert(data_file_2)
    protocol_store.insert(protocol_resource)
    await completed_analysis_store.make_room_and_add(
        completed_analysis_resource=analysis_resource1,
        primitive_rtp_resources=[],
        csv_rtp_resources=csv_param_resource,
    )
    assert subject.get_usage_info() == [
        FileUsageInfo("file-id-1", used_by_run_or_analysis=True),
        FileUsageInfo("file-id-2", used_by_run_or_analysis=False),
    ]


async def test_remove(
    subject: DataFilesStore,
    data_files_directory: Path,
) -> None:
    """It should remove the specified data file from database and store."""
    file_dir = data_files_directory.joinpath("file-id")
    file_dir.mkdir()
    data_file = file_dir / "abc.csv"
    data_file.touch()

    data_file_info = DataFileInfo(
        id="file-id",
        name="file-name",
        file_hash="abc123",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=6, day=20, tzinfo=timezone.utc),
    )
    await subject.insert(data_file_info)
    subject.remove(file_id="file-id")

    assert data_files_directory.exists() is True
    assert file_dir.exists() is False
    assert data_file.exists() is False

    with pytest.raises(FileIdNotFoundError):
        subject.get("file-id")


async def test_remove_raises_in_file_in_use(
    subject: DataFilesStore,
    data_files_directory: Path,
    protocol_store: ProtocolStore,
    completed_analysis_store: CompletedAnalysisStore,
) -> None:
    """It should raise `FileInUseError` when trying to remove a file that's in use."""
    file_dir = data_files_directory.joinpath("file-id")
    file_dir.mkdir()
    data_file = file_dir / "abc.csv"
    data_file.touch()

    data_file_info = DataFileInfo(
        id="file-id",
        name="file-name",
        file_hash="abc123",
        source=DataFileSource.UPLOADED,
        created_at=datetime(year=2024, month=6, day=20, tzinfo=timezone.utc),
    )

    protocol_resource = _get_sample_protocol_resource("protocol-id")
    analysis_resource = _get_sample_analysis_resource("protocol-id", "analysis-id")
    csv_param_resource = [
        CSVParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="foo",
            file_id="file-id",
        )
    ]

    await subject.insert(data_file_info)
    protocol_store.insert(protocol_resource)
    await completed_analysis_store.make_room_and_add(
        completed_analysis_resource=analysis_resource,
        primitive_rtp_resources=[],
        csv_rtp_resources=csv_param_resource,
    )

    expected_error_message = "Cannot remove file file-id as it is being used in existing analyses: {'analysis-id'}."
    with pytest.raises(FileInUseError, match=expected_error_message):
        subject.remove(file_id="file-id")


def test_remove_raise_for_nonexistent_id(subject: DataFilesStore) -> None:
    """It should raise FileIdNotFound error."""
    with pytest.raises(FileIdNotFoundError, match="Data file file-id was not found."):
        subject.remove(file_id="file-id")
