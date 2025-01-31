"""Test the CompletedAnalysisStore."""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List

import pytest
from sqlalchemy.engine import Engine
from decoy import Decoy

from robot_server.data_files.models import DataFileSource
from robot_server.persistence.tables import (
    analysis_table,
    analysis_primitive_type_rtp_table,
    analysis_csv_rtp_table,
)
from robot_server.protocols.completed_analysis_store import (
    CompletedAnalysisResource,
    CompletedAnalysisStore,
)
from opentrons.protocol_reader import (
    ProtocolSource,
    JsonProtocolConfig,
)
from robot_server.data_files.data_files_store import (
    DataFilesStore,
    DataFileInfo,
)
from robot_server.protocols.analysis_memcache import MemoryCache
from robot_server.protocols.analysis_models import (
    CompletedAnalysis,
    AnalysisResult,
    AnalysisStatus,
    RunTimeParameterAnalysisData,
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
def memcache(decoy: Decoy) -> MemoryCache[str, CompletedAnalysisResource]:
    """Get a memcache mock."""
    return decoy.mock(cls=MemoryCache)


@pytest.fixture
def subject(
    memcache: MemoryCache[str, CompletedAnalysisResource],
    sql_engine: Engine,
) -> CompletedAnalysisStore:
    """Get a subject."""
    return CompletedAnalysisStore(sql_engine, memcache, "2")


@pytest.fixture
def protocol_store(sql_engine: Engine) -> ProtocolStore:
    """Return a `ProtocolStore` linked to the same database as the subject under test.

    `ProtocolStore` is tested elsewhere.
    We only need it here to prepare the database for our `AnalysisStore` tests.
    An analysis always needs a protocol to link to.
    """
    return ProtocolStore.create_empty(sql_engine=sql_engine)


@pytest.fixture
def data_files_store(sql_engine: Engine, tmp_path: Path) -> DataFilesStore:
    """Return a `DataFilesStore` linked to the same database as the subject under test.

    `DataFilesStore` is tested elsewhere.
    We only need it here to prepare the database for the analysis store tests.
    The CSV parameters table always needs a data file to link to.
    """
    data_files_dir = tmp_path / "data_files"
    data_files_dir.mkdir()
    return DataFilesStore(sql_engine=sql_engine, data_files_directory=data_files_dir)


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


def _completed_analysis_resource(
    analysis_id: str,
    protocol_id: str,
    rtp_values_and_defaults: Optional[Dict[str, RunTimeParameterAnalysisData]] = None,
) -> CompletedAnalysisResource:
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
        ),
    )


async def test_get_by_analysis_id_prefers_cache(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    decoy: Decoy,
) -> None:
    """It should return analyses without using SQL the second time the analyses are accessed."""
    resource = _completed_analysis_resource("analysis-id", "protocol-id")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    # When we retrieve a resource via its id we should see it query the cache, and it should
    # return the identity-same resource
    decoy.when(memcache.get("analysis-id")).then_return(resource)
    assert (await subject.get_by_id("analysis-id")) is resource


async def test_get_by_analysis_id_falls_back_to_sql(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    decoy: Decoy,
) -> None:
    """It should return analyses from sql if they are not cached."""
    resource = _completed_analysis_resource("analysis-id", "protocol-id")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    await subject.make_room_and_add(
        completed_analysis_resource=resource,
        primitive_rtp_resources=[],
        csv_rtp_resources=[],
    )
    # the analysis is not cached
    decoy.when(memcache.get("analysis-id")).then_raise(KeyError())
    analysis_from_sql = await subject.get_by_id("analysis-id")
    # the cached analysis should be value-equal to what we entered
    assert analysis_from_sql == resource


async def test_get_by_analysis_id_stores_results_in_cache(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    decoy: Decoy,
) -> None:
    """It should cache successful fetches from sql."""
    resource = _completed_analysis_resource("analysis-id", "protocol-id")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    await subject.make_room_and_add(
        completed_analysis_resource=resource,
        primitive_rtp_resources=[],
        csv_rtp_resources=[],
    )
    # the analysis is not cached
    decoy.when(memcache.get("analysis-id")).then_raise(KeyError())
    from_sql = await subject.get_by_id("analysis-id")
    assert from_sql == resource
    decoy.verify(memcache.insert("analysis-id", from_sql))


async def test_get_by_analysis_id_as_document(
    subject: CompletedAnalysisStore,
    protocol_store: ProtocolStore,
) -> None:
    """It should return the analysis serialized as a JSON string."""
    resource = _completed_analysis_resource("analysis-id", "protocol-id")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    await subject.make_room_and_add(
        completed_analysis_resource=resource,
        primitive_rtp_resources=[],
        csv_rtp_resources=[],
    )
    result = await subject.get_by_id_as_document("analysis-id")
    assert result is not None
    assert json.loads(result) == {
        "id": "analysis-id",
        "result": "ok",
        "status": "completed",
        "runTimeParameters": [],
        "commands": [],
        "errors": [],
        "labware": [],
        "liquids": [],
        "liquidClasses": [],
        "modules": [],
        "pipettes": [],
        "commandAnnotations": [],
    }


async def test_get_ids_by_protocol(
    subject: CompletedAnalysisStore, protocol_store: ProtocolStore
) -> None:
    """It should return correct analysis id lists."""
    resource_1 = _completed_analysis_resource("analysis-id-1", "protocol-id-1")
    resource_2 = _completed_analysis_resource("analysis-id-2", "protocol-id-1")
    resource_3 = _completed_analysis_resource("analysis-id-3", "protocol-id-2")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id-1"))
    protocol_store.insert(make_dummy_protocol_resource("protocol-id-2"))
    await subject.make_room_and_add(resource_1, [], [])
    await subject.make_room_and_add(resource_2, [], [])
    await subject.make_room_and_add(resource_3, [], [])
    assert subject.get_ids_by_protocol("protocol-id-1") == [
        "analysis-id-1",
        "analysis-id-2",
    ]


async def test_get_by_protocol(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    decoy: Decoy,
) -> None:
    """It should get analysis by protocol with appropriate caching."""
    resource_1 = _completed_analysis_resource("analysis-id-1", "protocol-id-1")
    resource_2 = _completed_analysis_resource("analysis-id-2", "protocol-id-1")
    resource_3 = _completed_analysis_resource("analysis-id-3", "protocol-id-2")
    protocol_store.insert(make_dummy_protocol_resource("protocol-id-1"))
    protocol_store.insert(make_dummy_protocol_resource("protocol-id-2"))
    decoy.when(memcache.insert("analysis-id-1", resource_1)).then_return(None)
    decoy.when(memcache.insert("analysis-id-2", resource_2)).then_return(None)
    decoy.when(memcache.insert("analysis-id-3", resource_3)).then_return(None)
    await subject.make_room_and_add(resource_1, [], [])
    await subject.make_room_and_add(resource_2, [], [])
    await subject.make_room_and_add(resource_3, [], [])
    decoy.when(memcache.get("analysis-id-1")).then_raise(KeyError())
    decoy.when(memcache.get("analysis-id-2")).then_return(resource_2)
    decoy.when(memcache.contains("analysis-id-1")).then_return(False)
    decoy.when(memcache.contains("analysis-id-2")).then_return(True)
    decoy.when(memcache.insert("analysis-id-1", resource_1)).then_return(None)
    resources = await subject.get_by_protocol("protocol-id-1")
    assert resources == [resource_1, resource_2]


async def test_store_and_get_primitive_rtps_by_analysis(
    subject: CompletedAnalysisStore,
    protocol_store: ProtocolStore,
) -> None:
    """It should store the primitive run time parameters & fetch them using analysis ID."""
    analysis_resource = _completed_analysis_resource(
        analysis_id="analysis-id",
        protocol_id="protocol-id",
    )
    rtp_resources = [
        PrimitiveParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="foo",
            parameter_type="int",
            parameter_value=10,
        ),
        PrimitiveParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="bar",
            parameter_type="bool",
            parameter_value=True,
        ),
        PrimitiveParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="baz",
            parameter_type="str",
            parameter_value="10",
        ),
    ]
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))

    await subject.make_room_and_add(
        completed_analysis_resource=analysis_resource,
        primitive_rtp_resources=rtp_resources,
        csv_rtp_resources=[],
    )
    assert subject.get_primitive_rtps_by_analysis_id("analysis-id") == {
        "foo": 10,
        "bar": True,
        "baz": "10",
    }


async def test_store_and_get_csv_rtps_by_analysis_id(
    subject: CompletedAnalysisStore,
    protocol_store: ProtocolStore,
    data_files_store: DataFilesStore,
) -> None:
    """It should store the CSV run time parameters & fetch them using analysis ID."""
    analysis_resource = _completed_analysis_resource(
        analysis_id="analysis-id",
        protocol_id="protocol-id",
    )
    csv_rtp_resources = [
        CSVParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="baz",
            file_id="file-id",
        ),
        CSVParameterResource(
            analysis_id="analysis-id",
            parameter_variable_name="bar",
            file_id=None,
        ),
    ]
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    await data_files_store.insert(
        DataFileInfo(
            id="file-id",
            name="my_csv_file.csv",
            file_hash="file-hash",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2024, month=1, day=1, tzinfo=timezone.utc),
        )
    )
    await subject.make_room_and_add(
        completed_analysis_resource=analysis_resource,
        primitive_rtp_resources=[],
        csv_rtp_resources=csv_rtp_resources,
    )
    assert subject.get_csv_rtps_by_analysis_id("analysis-id") == {
        "baz": "file-id",
        "bar": None,
    }


@pytest.mark.parametrize(
    argnames=["existing_analysis_ids", "expected_analyses_ids_after_making_room"],
    argvalues=[
        (
            [f"analysis-id-{num}" for num in range(8)],
            [
                "analysis-id-4",
                "analysis-id-5",
                "analysis-id-6",
                "analysis-id-7",
                "new-analysis-id",
            ],
        ),
        (
            [f"analysis-id-{num}" for num in range(5)],
            [
                "analysis-id-1",
                "analysis-id-2",
                "analysis-id-3",
                "analysis-id-4",
                "new-analysis-id",
            ],
        ),
        (
            [f"analysis-id-{num}" for num in range(4)],
            [
                "analysis-id-0",
                "analysis-id-1",
                "analysis-id-2",
                "analysis-id-3",
                "new-analysis-id",
            ],
        ),
        (
            [f"analysis-id-{num}" for num in range(3)],
            [
                "analysis-id-0",
                "analysis-id-1",
                "analysis-id-2",
                "new-analysis-id",
            ],
        ),
        (
            [f"analysis-id-{num}" for num in range(2)],
            ["analysis-id-0", "analysis-id-1", "new-analysis-id"],
        ),
        (["analysis-id-0"], ["analysis-id-0", "new-analysis-id"]),
        ([], ["new-analysis-id"]),
    ],
)
async def test_add_makes_room_for_new_analysis(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    existing_analysis_ids: List[str],
    expected_analyses_ids_after_making_room: List[str],
    decoy: Decoy,
    sql_engine: Engine,
) -> None:
    """It should delete old analyses and make room for new analysis."""
    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))

    # Set up the database with existing analyses
    resources = [
        _completed_analysis_resource(
            analysis_id=analysis_id,
            protocol_id="protocol-id",
        )
        for analysis_id in existing_analysis_ids
    ]
    for resource in resources:
        statement = analysis_table.insert().values(await resource.to_sql_values())
        with sql_engine.begin() as transaction:
            transaction.execute(statement)

    assert subject.get_ids_by_protocol("protocol-id") == existing_analysis_ids
    await subject.make_room_and_add(
        completed_analysis_resource=_completed_analysis_resource(
            analysis_id="new-analysis-id",
            protocol_id="protocol-id",
        ),
        primitive_rtp_resources=[],
        csv_rtp_resources=[],
    )
    assert (
        subject.get_ids_by_protocol("protocol-id")
        == expected_analyses_ids_after_making_room
    )

    removed_ids = [
        analysis_id
        for analysis_id in existing_analysis_ids
        if analysis_id not in expected_analyses_ids_after_making_room
    ]
    for analysis_id in removed_ids:
        decoy.verify(memcache.remove(analysis_id))


async def test_make_room_and_add_handles_rtp_tables_correctly(
    subject: CompletedAnalysisStore,
    memcache: MemoryCache[str, CompletedAnalysisResource],
    protocol_store: ProtocolStore,
    data_files_store: DataFilesStore,
    sql_engine: Engine,
) -> None:
    """It should delete any RTP table entries that reference the analyses being deleted, and then insert new RTP entries."""
    existing_analysis_ids = [
        "analysis-id-0",
        "analysis-id-1",
        "analysis-id-2",
        "analysis-id-3",
        "analysis-id-4",
    ]

    protocol_store.insert(make_dummy_protocol_resource("protocol-id"))
    await data_files_store.insert(
        DataFileInfo(
            id="file-id",
            name="my_csv_file.csv",
            file_hash="file-hash",
            source=DataFileSource.UPLOADED,
            created_at=datetime(year=2024, month=1, day=1, tzinfo=timezone.utc),
        )
    )
    # Set up the database with existing analyses
    resources = [
        _completed_analysis_resource(
            analysis_id=analysis_id,
            protocol_id="protocol-id",
        )
        for analysis_id in existing_analysis_ids
    ]
    existing_primitive_rtp_resources = [
        PrimitiveParameterResource(
            analysis_id="analysis-id-0",
            parameter_variable_name="foo",
            parameter_type="int",
            parameter_value=10,
        ),
        PrimitiveParameterResource(
            analysis_id="analysis-id-2",
            parameter_variable_name="bar",
            parameter_type="bool",
            parameter_value=True,
        ),
    ]
    existing_csv_rtp_resources = [
        CSVParameterResource(
            analysis_id="analysis-id-0",
            parameter_variable_name="baz",
            file_id="file-id",
        ),
        CSVParameterResource(
            analysis_id="analysis-id-1",
            parameter_variable_name="bar",
            file_id=None,
        ),
    ]
    for resource in resources:
        statement = analysis_table.insert().values(await resource.to_sql_values())
        with sql_engine.begin() as transaction:
            transaction.execute(statement)
    for primitive_rtp_resource in existing_primitive_rtp_resources:
        statement = analysis_primitive_type_rtp_table.insert().values(
            primitive_rtp_resource.to_sql_values()
        )
        with sql_engine.begin() as transaction:
            transaction.execute(statement)
    for csv_resource in existing_csv_rtp_resources:
        statement = analysis_csv_rtp_table.insert().values(csv_resource.to_sql_values())
        with sql_engine.begin() as transaction:
            transaction.execute(statement)

    assert subject.get_ids_by_protocol("protocol-id") == existing_analysis_ids
    await subject.make_room_and_add(
        completed_analysis_resource=_completed_analysis_resource(
            analysis_id="new-analysis-id",
            protocol_id="protocol-id",
        ),
        primitive_rtp_resources=[
            PrimitiveParameterResource(
                analysis_id="new-analysis-id",
                parameter_variable_name="baz",
                parameter_type="str",
                parameter_value="10",
            )
        ],
        csv_rtp_resources=[
            CSVParameterResource(
                analysis_id="new-analysis-id",
                parameter_variable_name="bar",
                file_id="file-id",
            )
        ],
    )

    assert subject.get_ids_by_protocol("protocol-id") == [
        "analysis-id-1",
        "analysis-id-2",
        "analysis-id-3",
        "analysis-id-4",
        "new-analysis-id",
    ]

    assert subject.get_primitive_rtps_by_analysis_id("analysis-id-2") == {"bar": True}
    assert subject.get_primitive_rtps_by_analysis_id("analysis-id-0") == {}
    assert subject.get_primitive_rtps_by_analysis_id("new-analysis-id") == {"baz": "10"}

    assert subject.get_csv_rtps_by_analysis_id("analysis-id-0") == {}
    assert subject.get_csv_rtps_by_analysis_id("analysis-id-1") == {"bar": None}
    assert subject.get_csv_rtps_by_analysis_id("new-analysis-id") == {"bar": "file-id"}
