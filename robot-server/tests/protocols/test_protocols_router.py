"""Tests for the /protocols router."""

import io

import pytest
from datetime import datetime
from decoy import Decoy, matchers
from fastapi import HTTPException, UploadFile
from pathlib import Path

from opentrons.protocol_engine.types import (
    PrimitiveRunTimeParamValuesType,
    NumberParameter,
    CSVParameter,
    CSVRuntimeParamPaths,
    FileInfo,
)
from opentrons.protocols.api_support.types import APIVersion

from opentrons.protocol_reader import (
    FileReaderWriter,
    FileHasher,
    ProtocolReader,
    ProtocolSource,
    ProtocolSourceFile,
    ProtocolFileRole,
    JsonProtocolConfig,
    PythonProtocolConfig,
    ProtocolFilesInvalidError,
    BufferedFile,
)

from robot_server.data_files.data_files_store import (
    DataFilesStore,
    DataFileInfo,
)
from robot_server.data_files.models import DataFile, DataFileSource
from robot_server.errors.error_responses import ApiError
from robot_server.protocols.analyses_manager import AnalysesManager
from robot_server.protocols.protocol_analyzer import ProtocolAnalyzer
from robot_server.service.json_api import SimpleEmptyBody, MultiBodyMeta, RequestModel
from robot_server.protocols.analysis_store import (
    AnalysisStore,
    AnalysisNotFoundError,
    AnalysisIsPendingError,
)
from robot_server.protocols.protocol_auto_deleter import ProtocolAutoDeleter
from robot_server.protocols.analysis_models import (
    AnalysisStatus,
    AnalysisSummary,
    CompletedAnalysis,
    PendingAnalysis,
    AnalysisResult,
    AnalysisRequest,
)

from robot_server.protocols.protocol_models import (
    Metadata,
    Protocol,
    ProtocolFile,
    ProtocolKind,
    ProtocolType,
)
from robot_server.protocols.protocol_store import (
    ProtocolStore,
    ProtocolResource,
    ProtocolNotFoundError,
    ProtocolUsedByRunError,
)

from robot_server.protocols.router import (
    ProtocolLinks,
    create_protocol,
    create_protocol_analysis,
    get_protocols,
    get_protocol_ids,
    get_protocol_by_id,
    delete_protocol_by_id,
    get_protocol_analyses,
    get_protocol_analysis_by_id,
    get_protocol_analysis_as_document,
    get_protocol_data_files,
)


@pytest.fixture
def protocol_store(decoy: Decoy) -> ProtocolStore:
    """Get a mocked out ProtocolStore interface."""
    return decoy.mock(cls=ProtocolStore)


@pytest.fixture
def analysis_store(decoy: Decoy) -> AnalysisStore:
    """Get a mocked out AnalysisStore interface."""
    return decoy.mock(cls=AnalysisStore)


@pytest.fixture
def file_hasher(decoy: Decoy) -> FileHasher:
    """Get a mocked out FileHasher."""
    return decoy.mock(cls=FileHasher)


@pytest.fixture
def file_reader_writer(decoy: Decoy) -> FileReaderWriter:
    """Get a mocked out FileReaderWriter."""
    return decoy.mock(cls=FileReaderWriter)


@pytest.fixture
def protocol_reader(decoy: Decoy) -> ProtocolReader:
    """Get a mocked out ProtocolReader."""
    return decoy.mock(cls=ProtocolReader)


@pytest.fixture
def analyses_manager(decoy: Decoy) -> AnalysesManager:
    """Get a mocked out AnalysesManager."""
    return decoy.mock(cls=AnalysesManager)


@pytest.fixture
def data_files_store(decoy: Decoy) -> DataFilesStore:
    """Get a mocked out DataFilesStore."""
    return decoy.mock(cls=DataFilesStore)


@pytest.fixture
def data_files_directory(decoy: Decoy) -> Path:
    """Get a mocked out data files directory.

    We could use Path("/dev/null") for this but I worry something will accidentally
    try to use it as an actual path and then we'll get confusing errors on Windows.
    """
    return decoy.mock(cls=Path)


@pytest.fixture
def protocol_auto_deleter(decoy: Decoy) -> ProtocolAutoDeleter:
    """Get a mocked out ProtocolAutoDeleter."""
    return decoy.mock(cls=ProtocolAutoDeleter)


@pytest.fixture
def quick_transfer_protocol_auto_deleter(decoy: Decoy) -> ProtocolAutoDeleter:
    """Get a mocked out quick-transfer ProtocolAutoDeleter."""
    return decoy.mock(cls=ProtocolAutoDeleter)


async def test_get_protocols_no_protocols(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should return an empty collection response with no protocols loaded."""
    decoy.when(protocol_store.get_all()).then_return([])

    result = await get_protocols(
        protocol_store=protocol_store, analysis_store=decoy.mock(cls=AnalysisStore)
    )

    assert result.content.data == []
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=0)
    assert result.status_code == 200


async def test_get_protocols(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should return stored protocols."""
    created_at_1 = datetime(year=2021, month=1, day=1)
    created_at_2 = datetime(year=2022, month=2, day=2)

    resource_1 = ProtocolResource(
        protocol_id="abc",
        created_at=created_at_1,
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/abc.py"),
            config=PythonProtocolConfig(api_version=APIVersion(1234, 5678)),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="a_b_c",
        ),
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.STANDARD,
    )
    resource_2 = ProtocolResource(
        protocol_id="123",
        created_at=created_at_2,
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/123.json"),
            config=JsonProtocolConfig(schema_version=1234),
            files=[],
            metadata={},
            robot_type="OT-3 Standard",
            content_hash="1_2_3",
        ),
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    resource_3 = ProtocolResource(
        protocol_id="333",
        created_at=created_at_2,
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/333.json"),
            config=JsonProtocolConfig(schema_version=1234),
            files=[],
            metadata={},
            robot_type="OT-3 Standard",
            content_hash="3_3_3",
        ),
        protocol_key="dummy-key-333",
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
    )

    analysis_1 = AnalysisSummary(id="analysis-id-abc", status=AnalysisStatus.PENDING)
    analysis_2 = AnalysisSummary(id="analysis-id-123", status=AnalysisStatus.PENDING)
    analysis_3 = AnalysisSummary(id="analysis-id-333", status=AnalysisStatus.PENDING)

    expected_protocol_1 = Protocol(
        id="abc",
        createdAt=created_at_1,
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.PYTHON,
        metadata=Metadata(),
        robotType="OT-2 Standard",
        analysisSummaries=[analysis_1],
        files=[],
        key="dummy-key-111",
    )
    expected_protocol_2 = Protocol(
        id="123",
        createdAt=created_at_2,
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(),
        robotType="OT-3 Standard",
        analysisSummaries=[analysis_2],
        files=[],
        key="dummy-key-222",
    )
    expected_protocol_3 = Protocol(
        id="333",
        createdAt=created_at_2,
        protocolKind=ProtocolKind.QUICK_TRANSFER,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(),
        robotType="OT-3 Standard",
        analysisSummaries=[analysis_3],
        files=[],
        key="dummy-key-333",
    )

    decoy.when(protocol_store.get_all()).then_return(
        [resource_1, resource_2, resource_3]
    )
    decoy.when(analysis_store.get_summaries_by_protocol("abc")).then_return(
        [analysis_1]
    )
    decoy.when(analysis_store.get_summaries_by_protocol("123")).then_return(
        [analysis_2]
    )
    decoy.when(analysis_store.get_summaries_by_protocol("333")).then_return(
        [analysis_3]
    )

    # Test GET all protocols
    result = await get_protocols(
        protocol_kind=None,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.content.data == [
        expected_protocol_1,
        expected_protocol_2,
        expected_protocol_3,
    ]
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=3)
    assert result.status_code == 200

    # Test GET standard protocols
    result = await get_protocols(
        protocol_kind=ProtocolKind.STANDARD,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.content.data == [expected_protocol_1, expected_protocol_2]
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=2)
    assert result.status_code == 200

    # Test GET Quick transfer protocols
    result = await get_protocols(
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.content.data == [expected_protocol_3]
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=1)
    assert result.status_code == 200


async def test_get_protocol_ids_no_protocols(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should return an empty collection response with no protocols loaded."""
    decoy.when(protocol_store.get_all_ids()).then_return([])

    result = await get_protocol_ids(protocol_store=protocol_store)

    assert result.content.data == []
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=0)
    assert result.status_code == 200


async def test_get_protocol_ids(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should return stored protocol ids."""
    decoy.when(protocol_store.get_all_ids()).then_return(
        ["protocol_id_1", "protocol_id_2"]
    )

    result = await get_protocol_ids(
        protocol_store=protocol_store,
    )

    assert result.content.data == ["protocol_id_1", "protocol_id_2"]
    assert result.content.meta == MultiBodyMeta(cursor=0, totalLength=2)
    assert result.status_code == 200


async def test_get_protocol_by_id(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should return a single protocol file."""
    resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/protocol.py"),
            config=PythonProtocolConfig(api_version=APIVersion(1234, 5678)),
            files=[],
            metadata={},
            robot_type="OT-2 Standard",
            content_hash="a_b_c",
        ),
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    analysis_summary = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.COMPLETED,
    )

    decoy.when(protocol_store.get(protocol_id="protocol-id")).then_return(resource)
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return([analysis_summary])
    decoy.when(
        protocol_store.get_referencing_run_ids(protocol_id="protocol-id")
    ).then_return([])

    result = await get_protocol_by_id(
        "protocol-id",
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.content.data == Protocol(
        id="protocol-id",
        createdAt=datetime(year=2021, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.PYTHON,
        metadata=Metadata(),
        robotType="OT-2 Standard",
        analysisSummaries=[analysis_summary],
        files=[],
        key="dummy-key-111",
    )

    assert result.content.links == ProtocolLinks.model_construct(referencingRuns=[])
    assert result.status_code == 200


async def test_get_protocol_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should return a 404 error when requesting a non-existent protocol."""
    not_found_error = ProtocolNotFoundError("protocol-id")

    decoy.when(protocol_store.get(protocol_id="protocol-id")).then_raise(
        not_found_error
    )

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_by_id(
            "protocol-id",
            protocol_store=protocol_store,
            analysis_store=decoy.mock(cls=AnalysisStore),
        )

    assert exc_info.value.status_code == 404


async def test_create_existing_protocol(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should return the existing protocol info from database."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )

    completed_analysis = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.COMPLETED,
    )
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("a_b_c")
    decoy.when(protocol_store.get_id_by_hash("a_b_c")).then_return("the-og-proto-id")
    decoy.when(protocol_store.get(protocol_id="the-og-proto-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="the-og-proto-id")
    ).then_return([completed_analysis])
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return([])
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            last_analysis_summary=completed_analysis, new_parameters=[]
        )
    ).then_return(True)
    decoy.when(protocol_store.get_all()).then_return([stored_protocol_resource])

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    assert result.content.data == Protocol(
        id="the-og-proto-id",
        createdAt=datetime(year=2020, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-2 Standard",
        analysisSummaries=[completed_analysis],
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-222",
    )
    assert result.status_code == 200


async def test_create_protocol(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should store an uploaded protocol file."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.STANDARD,
    )

    pending_analysis = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
    )
    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("abc123")

    decoy.when(
        await protocol_reader.save(
            files=[buffered_file],
            directory=protocol_directory / "protocol-id",
            content_hash="abc123",
        )
    ).then_return(protocol_source)
    decoy.when(protocol_store.get_all()).then_return([])
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return([])
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=protocol_resource,
            run_time_param_values={},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return([])
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id",
            analyzer=analyzer,
        )
    ).then_return(pending_analysis)

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    assert result.content.data == Protocol(
        id="protocol-id",
        createdAt=datetime(year=2021, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-2 Standard",
        analysisSummaries=[pending_analysis],
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-111",
    )
    assert result.status_code == 201

    decoy.verify(
        protocol_auto_deleter.make_room_for_new_protocol(),
        protocol_store.insert(protocol_resource),
    )


async def test_create_new_protocol_with_run_time_params(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should handle the run time parameter overrides correctly."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.STANDARD,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    pending_analysis = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
        runTimeParameters=[run_time_parameter],
    )
    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(data_files_store.get("file-id")).then_return(
        DataFileInfo(
            id="123",
            name="file.abc",
            file_hash="xyz",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2022, month=2, day=2),
        )
    )

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("abc123")

    decoy.when(
        await protocol_reader.save(
            files=[buffered_file],
            directory=protocol_directory / "protocol-id",
            content_hash="abc123",
        )
    ).then_return(protocol_source)
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return([])
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=protocol_resource,
            run_time_param_values={"vol": 123, "dry_run": True, "mount": "left"},
            run_time_param_paths={"my_csv_file": Path("/dev/null/file-id/file.abc")},
        )
    ).then_return(analyzer)
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id",
            analyzer=analyzer,
        )
    ).then_return(pending_analysis)
    decoy.when(protocol_store.get_all()).then_return([])

    await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        run_time_parameter_values='{"vol": 123, "dry_run": true, "mount": "left"}',
        run_time_parameter_files='{"my_csv_file": "file-id"}',
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=Path("/dev/null"),
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    decoy.verify(
        protocol_auto_deleter.make_room_for_new_protocol(),
        protocol_store.insert(protocol_resource),
    )


async def test_create_existing_protocol_with_no_previous_analysis(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should re-trigger analysis of the existing protocol resource."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    pending_analysis = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
        runTimeParameters=[run_time_parameter],
    )
    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("a_b_c")
    decoy.when(protocol_store.get_all()).then_return([])
    decoy.when(protocol_store.get_id_by_hash("a_b_c")).then_return("the-og-proto-id")
    decoy.when(protocol_store.get(protocol_id="the-og-proto-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="the-og-proto-id")
    ).then_return([])
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={"vol": 123, "dry_run": True, "mount": "left"},
            run_time_param_paths={},
        )
    ).then_return(analyzer)

    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id",
            analyzer=analyzer,
        )
    ).then_return(pending_analysis)

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        run_time_parameter_values='{"vol": 123, "dry_run": true, "mount": "left"}',
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    assert result.content.data == Protocol(
        id="the-og-proto-id",
        createdAt=datetime(year=2020, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-2 Standard",
        analysisSummaries=[pending_analysis],
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-222",
    )
    assert result.status_code == 200


async def test_create_existing_protocol_with_different_run_time_params(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should re-trigger analysis of the existing protocol resource."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )

    completed_summary = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.COMPLETED,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    pending_summary = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
        runTimeParameters=[run_time_parameter],
    )

    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])
    decoy.when(data_files_store.get("csv-file-id")).then_return(
        DataFileInfo(
            id="123",
            name="file.abc",
            file_hash="xyz",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2022, month=2, day=2),
        )
    )
    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("a_b_c")
    decoy.when(protocol_store.get_all()).then_return([])
    decoy.when(protocol_store.get_id_by_hash("a_b_c")).then_return("the-og-proto-id")
    decoy.when(protocol_store.get(protocol_id="the-og-proto-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="the-og-proto-id")
    ).then_return([completed_summary])
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={"vol": 123, "dry_run": True, "mount": "left"},
            run_time_param_paths={
                "my_csv_file": Path("/dev/null/csv-file-id/file.abc")
            },
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return(
        [run_time_parameter]
    )
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            completed_summary, [run_time_parameter]
        )
    ).then_return(False)
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id",
            analyzer=analyzer,
        )
    ).then_return(pending_summary)

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        run_time_parameter_values='{"vol": 123, "dry_run": true, "mount": "left"}',
        run_time_parameter_files='{"my_csv_file": "csv-file-id"}',
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=Path("/dev/null"),
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    assert result.content.data == Protocol(
        id="the-og-proto-id",
        createdAt=datetime(year=2020, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-2 Standard",
        analysisSummaries=[completed_summary, pending_summary],
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-222",
    )
    assert result.status_code == 200


async def test_create_existing_protocol_with_same_run_time_params(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should re-trigger analysis of the existing protocol resource."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )
    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    analysis_summaries = [
        AnalysisSummary(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
        ),
    ]

    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("a_b_c")
    decoy.when(protocol_store.get_all()).then_return([])
    decoy.when(protocol_store.get_id_by_hash("a_b_c")).then_return("the-og-proto-id")
    decoy.when(protocol_store.get(protocol_id="the-og-proto-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="the-og-proto-id")
    ).then_return(analysis_summaries)
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={"vol": 123, "dry_run": True, "mount": "left"},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return(
        [run_time_parameter]
    )
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            analysis_summaries[-1], [run_time_parameter]
        )
    ).then_return(True)

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        run_time_parameter_values='{"vol": 123, "dry_run": true, "mount": "left"}',
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-2 Standard",
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    assert result.content.data == Protocol(
        id="the-og-proto-id",
        createdAt=datetime(year=2020, month=1, day=1),
        protocolKind=ProtocolKind.STANDARD,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-2 Standard",
        analysisSummaries=analysis_summaries,
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-222",
    )
    assert result.status_code == 200


async def test_create_existing_protocol_with_pending_analysis_raises(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should raise an error if protocol has existing pending analysis."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    analysis_summaries = [
        AnalysisSummary(
            id="analysis-id",
            status=AnalysisStatus.PENDING,
        ),
    ]

    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("a_b_c")
    decoy.when(protocol_store.get_all()).then_return([])
    decoy.when(protocol_store.get_id_by_hash("a_b_c")).then_return("the-og-proto-id")
    decoy.when(protocol_store.get(protocol_id="the-og-proto-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="the-og-proto-id")
    ).then_return(analysis_summaries)
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={"vol": 123, "dry_run": True, "mount": "left"},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return(
        [run_time_parameter]
    )
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            analysis_summaries[-1], [run_time_parameter]
        )
    ).then_raise(AnalysisIsPendingError("a-id"))

    with pytest.raises(ApiError) as exc_info:
        await create_protocol(
            files=[protocol_file],
            key="dummy-key-111",
            run_time_parameter_values='{"vol": 123, "dry_run": true, "mount": "left"}',
            protocol_directory=protocol_directory,
            protocol_store=protocol_store,
            analysis_store=analysis_store,
            data_files_store=data_files_store,
            data_files_directory=data_files_directory,
            file_reader_writer=file_reader_writer,
            protocol_reader=protocol_reader,
            file_hasher=file_hasher,
            analyses_manager=analyses_manager,
            protocol_auto_deleter=protocol_auto_deleter,
            quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
            robot_type="OT-2 Standard",
            protocol_id="protocol-id",
            analysis_id="analysis-id",
            created_at=datetime(year=2021, month=1, day=1),
            maximum_quick_transfer_protocols=20,
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.content["errors"][0]["id"] == "LastAnalysisPending"


async def test_create_protocol_not_readable(
    decoy: Decoy,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    protocol_reader: ProtocolReader,
    protocol_store: ProtocolStore,
) -> None:
    """It should 422 if the protocol is rejected by the pre-analyzer."""
    decoy.when(await file_reader_writer.read(files=matchers.Anything())).then_return([])
    decoy.when(await file_hasher.hash(files=[])).then_return("abc123")

    decoy.when(protocol_store.get_all()).then_return([])

    decoy.when(
        await protocol_reader.save(
            directory=matchers.Anything(),
            files=matchers.Anything(),
            content_hash="abc123",
        )
    ).then_raise(ProtocolFilesInvalidError("oh no"))

    with pytest.raises(ApiError) as exc_info:
        await create_protocol(
            files=[],
            protocol_directory=Path("/dev/null"),
            protocol_store=protocol_store,
            file_reader_writer=file_reader_writer,
            protocol_reader=protocol_reader,
            file_hasher=file_hasher,
            protocol_id="protocol-id",
            maximum_quick_transfer_protocols=20,
            analysis_store=decoy.mock(cls=AnalysisStore),
            analyses_manager=decoy.mock(cls=AnalysesManager),
            protocol_auto_deleter=decoy.mock(cls=ProtocolAutoDeleter),
            quick_transfer_protocol_auto_deleter=decoy.mock(cls=ProtocolAutoDeleter),
            data_files_store=decoy.mock(cls=DataFilesStore),
            data_files_directory=Path("/dev/null"),
            robot_type="OT-2 Standard",
            analysis_id="analysis-id",
            created_at=datetime.now(),
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolFilesInvalid"
    assert "oh no" in exc_info.value.content["errors"][0]["detail"]


async def test_create_protocol_different_robot_type(
    decoy: Decoy,
    protocol_reader: ProtocolReader,
    protocol_store: ProtocolStore,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
) -> None:
    """It should 422 if the protocol's robot type doesn't match the server's."""
    decoy.when(await file_reader_writer.read(files=matchers.Anything())).then_return([])
    decoy.when(await file_hasher.hash(files=[])).then_return("abc123")

    decoy.when(
        await protocol_reader.save(
            directory=matchers.Anything(),
            files=matchers.Anything(),
            content_hash="abc123",
        )
    ).then_return(
        ProtocolSource(
            directory=Path("/dev/null"),
            main_file=Path("/dev/null/foo.json"),
            files=[
                ProtocolSourceFile(
                    path=Path("/dev/null/foo.json"),
                    role=ProtocolFileRole.MAIN,
                )
            ],
            metadata={},
            robot_type="OT-2 Standard",
            config=JsonProtocolConfig(schema_version=123),
            content_hash="a_b_c",
        )
    )

    decoy.when(protocol_store.get_all()).then_return([])

    with pytest.raises(ApiError) as exc_info:
        await create_protocol(
            files=[],
            protocol_directory=Path("/dev/null"),
            protocol_store=protocol_store,
            file_reader_writer=file_reader_writer,
            protocol_reader=protocol_reader,
            file_hasher=file_hasher,
            protocol_id="protocol-id",
            maximum_quick_transfer_protocols=20,
            analysis_store=decoy.mock(cls=AnalysisStore),
            analyses_manager=decoy.mock(cls=AnalysesManager),
            protocol_auto_deleter=decoy.mock(cls=ProtocolAutoDeleter),
            quick_transfer_protocol_auto_deleter=decoy.mock(cls=ProtocolAutoDeleter),
            data_files_store=decoy.mock(cls=DataFilesStore),
            data_files_directory=Path("/dev/null"),
            robot_type="OT-3 Standard",
            analysis_id="analysis-id",
            created_at=datetime.now(),
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolRobotTypeMismatch"


async def test_delete_protocol_by_id(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should remove a single protocol file."""
    result = await delete_protocol_by_id("protocol-id", protocol_store=protocol_store)

    decoy.verify(protocol_store.remove(protocol_id="protocol-id"))

    assert result.content == SimpleEmptyBody()
    assert result.status_code == 200


async def test_delete_protocol_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should 404 if the protocol to delete is not found."""
    not_found_error = ProtocolNotFoundError("protocol-id")

    decoy.when(protocol_store.remove(protocol_id="protocol-id")).then_raise(
        not_found_error
    )

    with pytest.raises(ApiError) as exc_info:
        await delete_protocol_by_id("protocol-id", protocol_store=protocol_store)

    assert exc_info.value.status_code == 404


async def test_delete_protocol_run_exists(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should 404 if the protocol to delete is not found."""
    run_exists_error = ProtocolUsedByRunError("protocol-id")

    decoy.when(protocol_store.remove(protocol_id="protocol-id")).then_raise(
        run_exists_error
    )

    with pytest.raises(ApiError) as exc_info:
        await delete_protocol_by_id("protocol-id", protocol_store=protocol_store)

    assert exc_info.value.status_code == 409


async def test_get_protocol_analyses(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should get all analyses of a protocol."""
    analysis = CompletedAnalysis(
        id="analysis-id",
        status=AnalysisStatus.COMPLETED,
        result=AnalysisResult.OK,
        labware=[],
        pipettes=[],
        commands=[],
        errors=[],
        liquids=[],
        liquidClasses=[],
    )

    decoy.when(protocol_store.has("protocol-id")).then_return(True)
    decoy.when(await analysis_store.get_by_protocol("protocol-id")).then_return(
        [analysis]
    )

    result = await get_protocol_analyses(
        protocolId="protocol-id",
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.status_code == 200
    assert result.content.data == [analysis]


async def test_get_protocol_analyses_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should 404 if protocol does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(False)

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_analyses(
            protocolId="protocol-id",
            protocol_store=protocol_store,
            analysis_store=analysis_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolNotFound"


async def test_get_protocol_analysis_by_id(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should get a single full analysis by ID."""
    analysis = PendingAnalysis(id="analysis-id")

    decoy.when(protocol_store.has("protocol-id")).then_return(True)
    decoy.when(await analysis_store.get("analysis-id")).then_return(analysis)

    result = await get_protocol_analysis_by_id(
        protocolId="protocol-id",
        analysisId="analysis-id",
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.status_code == 200
    assert result.content.data == analysis


async def test_get_protocol_analysis_by_id_protocol_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should 404 if the protocol does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(False)

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_analysis_by_id(
            protocolId="protocol-id",
            analysisId="analysis-id",
            protocol_store=protocol_store,
            analysis_store=analysis_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolNotFound"


async def test_get_protocol_analysis_by_id_analysis_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should 404 if the analysis does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(True)
    decoy.when(await analysis_store.get("analysis-id")).then_raise(
        AnalysisNotFoundError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_analysis_by_id(
            protocolId="protocol-id",
            analysisId="analysis-id",
            protocol_store=protocol_store,
            analysis_store=analysis_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "AnalysisNotFound"


async def test_get_protocol_analysis_as_document(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should get a single full analysis by ID."""
    analysis = "foo"

    decoy.when(protocol_store.has("protocol-id")).then_return(True)
    decoy.when(await analysis_store.get_as_document("analysis-id")).then_return(
        analysis
    )

    result = await get_protocol_analysis_as_document(
        protocolId="protocol-id",
        analysisId="analysis-id",
        protocol_store=protocol_store,
        analysis_store=analysis_store,
    )

    assert result.status_code == 200
    assert result.body.decode(result.charset) == analysis


async def test_get_protocol_analysis_as_document_protocol_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should 404 if the protocol does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(False)

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_analysis_as_document(
            protocolId="protocol-id",
            analysisId="analysis-id",
            protocol_store=protocol_store,
            analysis_store=analysis_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolNotFound"


async def test_get_protocol_analysis_as_document_analysis_not_found(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
) -> None:
    """It should 404 if the analysis document does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(True)
    decoy.when(await analysis_store.get_as_document("analysis-id")).then_raise(
        AnalysisNotFoundError("oh no")
    )

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_analysis_as_document(
            protocolId="protocol-id",
            analysisId="analysis-id",
            protocol_store=protocol_store,
            analysis_store=analysis_store,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "AnalysisNotFound"


async def test_create_protocol_analyses_with_same_rtp_values(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    analyses_manager: AnalysesManager,
) -> None:
    """It should not start a new analysis for the new rtp values."""
    rtp_values: PrimitiveRunTimeParamValuesType = {
        "vol": 123,
        "dry_run": True,
        "mount": "left",
    }
    analysis_summaries = [
        AnalysisSummary(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
        ),
    ]
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    decoy.when(protocol_store.has(protocol_id="protocol-id")).then_return(True)
    decoy.when(protocol_store.get(protocol_id="protocol-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return(analysis_summaries)
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id-2",
            protocol_resource=stored_protocol_resource,
            run_time_param_values=rtp_values,
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return(
        [run_time_parameter]
    )
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            analysis_summaries[-1], [run_time_parameter]
        )
    ).then_return(True)

    result = await create_protocol_analysis(
        protocolId="protocol-id",
        request_body=RequestModel(
            data=AnalysisRequest(runTimeParameterValues=rtp_values)
        ),
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        analyses_manager=analyses_manager,
        analysis_id="analysis-id-2",
    )
    assert result.content.data == analysis_summaries
    assert result.status_code == 200


async def test_update_protocol_analyses_with_new_rtp_values(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    analyses_manager: AnalysesManager,
) -> None:
    """It should start a new analysis for the new rtp values."""
    rtp_values: PrimitiveRunTimeParamValuesType = {
        "vol": 123,
        "dry_run": True,
        "mount": "left",
    }
    rtp_files: CSVRuntimeParamPaths = {
        "csv_param": Path("/dev/null/file-id/foo.csv"),
    }
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    analysis_summaries = [
        AnalysisSummary(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
        ),
    ]
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    csv_parameter = CSVParameter(
        displayName="CSV parameter",
        variableName="csv_param",
        file=FileInfo(id="file-id", name=""),
    )
    decoy.when(data_files_store.get("file-id")).then_return(
        DataFileInfo(
            id="123",
            name="foo.csv",
            file_hash="xyz",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2022, month=2, day=2),
        )
    )
    decoy.when(protocol_store.has(protocol_id="protocol-id")).then_return(True)
    decoy.when(protocol_store.get(protocol_id="protocol-id")).then_return(
        stored_protocol_resource
    )
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return(analysis_summaries)
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id-2",
            protocol_resource=stored_protocol_resource,
            run_time_param_values=rtp_values,
            run_time_param_paths=rtp_files,
        )
    ).then_return(analyzer)
    decoy.when(analyzer.get_verified_run_time_parameters()).then_return(
        [run_time_parameter, csv_parameter]
    )
    decoy.when(
        await analysis_store.matching_rtp_values_in_analysis(
            analysis_summaries[-1], [run_time_parameter, csv_parameter]
        )
    ).then_return(False)
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id-2",
            analyzer=analyzer,
        )
    ).then_return(
        AnalysisSummary(
            id="analysis-id-2",
            status=AnalysisStatus.PENDING,
            runTimeParameters=[run_time_parameter, csv_parameter],
        )
    )

    result = await create_protocol_analysis(
        protocolId="protocol-id",
        request_body=RequestModel(
            data=AnalysisRequest(
                runTimeParameterValues=rtp_values,
                runTimeParameterFiles={"csv_param": "file-id"},
            )
        ),
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        analyses_manager=analyses_manager,
        data_files_store=data_files_store,
        data_files_directory=Path("/dev/null"),
        analysis_id="analysis-id-2",
    )
    assert result.content.data == [
        AnalysisSummary(id="analysis-id", status=AnalysisStatus.COMPLETED),
        AnalysisSummary(
            id="analysis-id-2",
            status=AnalysisStatus.PENDING,
            runTimeParameters=[run_time_parameter, csv_parameter],
        ),
    ]
    assert result.status_code == 201


async def test_update_protocol_analyses_with_forced_reanalysis(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    analyses_manager: AnalysesManager,
) -> None:
    """It should start a new analysis for the protocol, regardless of rtp values."""
    analysis_summaries = [
        AnalysisSummary(
            id="analysis-id",
            status=AnalysisStatus.COMPLETED,
        ),
    ]
    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-2 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.STANDARD,
    )
    decoy.when(protocol_store.has(protocol_id="protocol-id")).then_return(True)
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return(analysis_summaries)
    decoy.when(protocol_store.get(protocol_id="protocol-id")).then_return(
        stored_protocol_resource
    )
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id-2",
            protocol_resource=stored_protocol_resource,
            run_time_param_values={},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id-2",
            analyzer=analyzer,
        )
    ).then_return(AnalysisSummary(id="analysis-id-2", status=AnalysisStatus.PENDING))

    result = await create_protocol_analysis(
        protocolId="protocol-id",
        request_body=RequestModel(data=AnalysisRequest(forceReAnalyze=True)),
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        analyses_manager=analyses_manager,
        analysis_id="analysis-id-2",
    )
    assert result.content.data == [
        AnalysisSummary(id="analysis-id", status=AnalysisStatus.COMPLETED),
        AnalysisSummary(id="analysis-id-2", status=AnalysisStatus.PENDING),
    ]
    assert result.status_code == 201


async def test_create_protocol_kind_quick_transfer(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    analyses_manager: AnalysesManager,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should store an uploaded protocol file marked as quick-transfer."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)

    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)
    buffered_file = BufferedFile(name="blah", contents=content, path=None)

    protocol_source = ProtocolSource(
        directory=Path("/dev/null"),
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-3 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2021, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-111",
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
    )
    run_time_parameter = NumberParameter(
        displayName="My parameter",
        variableName="cool_param",
        type="int",
        min=1,
        max=5,
        value=2.0,
        default=3.0,
    )
    pending_analysis = AnalysisSummary(
        id="analysis-id",
        status=AnalysisStatus.PENDING,
        runTimeParameters=[run_time_parameter],
    )
    decoy.when(
        await file_reader_writer.read(
            # TODO(mm, 2024-02-07): Recent FastAPI upgrades mean protocol_file.filename
            # is typed as possibly None. Investigate whether that can actually happen in
            # practice and whether we need to account for it.
            files=[protocol_file]  # type: ignore[list-item]
        )
    ).then_return([buffered_file])

    decoy.when(await file_hasher.hash(files=[buffered_file])).then_return("abc123")

    decoy.when(
        await protocol_reader.save(
            files=[buffered_file],
            directory=protocol_directory / "protocol-id",
            content_hash="abc123",
        )
    ).then_return(protocol_source)
    decoy.when(
        analysis_store.get_summaries_by_protocol(protocol_id="protocol-id")
    ).then_return([])
    analyzer = decoy.mock(cls=ProtocolAnalyzer)
    decoy.when(
        await analyses_manager.initialize_analyzer(
            analysis_id="analysis-id",
            protocol_resource=protocol_resource,
            run_time_param_values={},
            run_time_param_paths={},
        )
    ).then_return(analyzer)
    decoy.when(
        await analyses_manager.start_analysis(
            analysis_id="analysis-id",
            analyzer=analyzer,
        )
    ).then_return(pending_analysis)
    decoy.when(protocol_store.get_all()).then_return([])

    result = await create_protocol(
        files=[protocol_file],
        key="dummy-key-111",
        run_time_parameter_values="{}",
        protocol_directory=protocol_directory,
        protocol_store=protocol_store,
        analysis_store=analysis_store,
        data_files_store=data_files_store,
        data_files_directory=data_files_directory,
        file_reader_writer=file_reader_writer,
        protocol_reader=protocol_reader,
        file_hasher=file_hasher,
        analyses_manager=analyses_manager,
        protocol_auto_deleter=protocol_auto_deleter,
        quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
        robot_type="OT-3 Standard",
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
        protocol_id="protocol-id",
        analysis_id="analysis-id",
        created_at=datetime(year=2021, month=1, day=1),
        maximum_quick_transfer_protocols=20,
    )

    decoy.verify(
        quick_transfer_protocol_auto_deleter.make_room_for_new_protocol(),
        protocol_store.insert(protocol_resource),
    )

    assert result.content.data == Protocol(
        id="protocol-id",
        createdAt=datetime(year=2021, month=1, day=1),
        protocolKind=ProtocolKind.QUICK_TRANSFER,
        protocolType=ProtocolType.JSON,
        metadata=Metadata(this_is_fake_metadata=True),  # type: ignore[call-arg]
        robotType="OT-3 Standard",
        analysisSummaries=[pending_analysis],
        files=[ProtocolFile(name="foo.json", role=ProtocolFileRole.MAIN)],
        key="dummy-key-111",
    )
    assert result.status_code == 201


async def test_create_protocol_maximum_quick_transfer_protocols_exceeded(
    decoy: Decoy,
    protocol_store: ProtocolStore,
    analysis_store: AnalysisStore,
    data_files_store: DataFilesStore,
    data_files_directory: Path,
    protocol_reader: ProtocolReader,
    file_reader_writer: FileReaderWriter,
    file_hasher: FileHasher,
    protocol_auto_deleter: ProtocolAutoDeleter,
    quick_transfer_protocol_auto_deleter: ProtocolAutoDeleter,
) -> None:
    """It should throw a 409 error if the quick transfer protocols maximum is exceeded."""
    protocol_directory = Path("/dev/null")
    content = bytes("some_content", encoding="utf-8")
    uploaded_file = io.BytesIO(content)
    protocol_file = UploadFile(filename="foo.json", file=uploaded_file)

    protocol_source = ProtocolSource(
        directory=protocol_directory,
        main_file=Path("/dev/null/foo.json"),
        files=[
            ProtocolSourceFile(
                path=Path("/dev/null/foo.json"),
                role=ProtocolFileRole.MAIN,
            )
        ],
        metadata={"this_is_fake_metadata": True},
        robot_type="OT-3 Standard",
        config=JsonProtocolConfig(schema_version=123),
        content_hash="a_b_c",
    )

    stored_protocol_resource = ProtocolResource(
        protocol_id="protocol-id",
        created_at=datetime(year=2020, month=1, day=1),
        source=protocol_source,
        protocol_key="dummy-key-222",
        protocol_kind=ProtocolKind.QUICK_TRANSFER,
    )

    decoy.when(protocol_store.get_all()).then_return([stored_protocol_resource])

    with pytest.raises(HTTPException) as exc_info:
        await create_protocol(
            files=[protocol_file],
            key="dummy-key-111",
            protocol_directory=protocol_directory,
            protocol_store=protocol_store,
            analysis_store=analysis_store,
            data_files_store=data_files_store,
            data_files_directory=data_files_directory,
            analyses_manager=decoy.mock(cls=AnalysesManager),
            file_reader_writer=file_reader_writer,
            protocol_reader=protocol_reader,
            file_hasher=file_hasher,
            protocol_auto_deleter=protocol_auto_deleter,
            quick_transfer_protocol_auto_deleter=quick_transfer_protocol_auto_deleter,
            robot_type="OT-3 Standard",
            protocol_id="protocol-id",
            analysis_id="analysis-id",
            protocol_kind=ProtocolKind.QUICK_TRANSFER,
            created_at=datetime(year=2021, month=1, day=1),
            maximum_quick_transfer_protocols=1,
        )

        assert exc_info.value.status_code == 409


async def test_get_data_files(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should get all the data files associated with the protocol."""
    data_files = [
        DataFile(
            id="id1",
            name="csv-file1.csv",
            createdAt=datetime(year=2024, month=1, day=1),
            source=DataFileSource.UPLOADED,
        ),
        DataFile(
            id="id2",
            name="csv-file2.csv",
            createdAt=datetime(year=2024, month=1, day=1),
            source=DataFileSource.UPLOADED,
        ),
    ]
    decoy.when(protocol_store.has(protocol_id="protocol-id")).then_return(True)
    decoy.when(
        await protocol_store.get_referenced_data_files("protocol-id")
    ).then_return(data_files)
    result = await get_protocol_data_files(
        protocolId="protocol-id",
        protocol_store=protocol_store,
    )
    assert result.status_code == 200
    assert result.content.data == data_files


async def test_get_non_existent_protocol_data_files(
    decoy: Decoy,
    protocol_store: ProtocolStore,
) -> None:
    """It should 404 if a protocol does not exist."""
    decoy.when(protocol_store.has("protocol-id")).then_return(False)

    with pytest.raises(ApiError) as exc_info:
        await get_protocol_data_files(
            protocolId="protocol-id",
            protocol_store=protocol_store,
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.content["errors"][0]["id"] == "ProtocolNotFound"
