"""Store and retrieve information about uploaded protocols."""


from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from logging import getLogger
from pathlib import Path
from typing import Dict, List, Optional

from anyio import Path as AsyncPath
import sqlalchemy

from opentrons.protocol_reader import ProtocolReader, ProtocolSource
from robot_server.persistence import protocol_table


_log = getLogger(__name__)


@dataclass(frozen=True)
class ProtocolResource:
    """Represents an uploaded protocol."""

    protocol_id: str
    created_at: datetime
    source: ProtocolSource
    protocol_key: Optional[str]


class ProtocolNotFoundError(KeyError):
    """Error raised when a protocol ID was not found in the store."""

    def __init__(self, protocol_id: str) -> None:
        """Initialize the error message from the missing ID."""
        super().__init__(f"Protocol {protocol_id} was not found.")


class FileMissingError(Exception):
    """Raised if expected files are missing when rehydrating.

    We never expect this to happen if the system is working correctly.
    It might happen if someone's tampered with the file storage.
    """


# TODO(mm, 2022-03-29): When we confirm we can use SQLAlchemy 1.4 on the OT-2,
# convert all methods to use an async engine.
# https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html
class ProtocolStore:
    """Store and retrieve information about uploaded protocols."""

    def __init__(
        self,
        *,
        _sql_engine: sqlalchemy.engine.Engine,
        _sources_by_id: Dict[str, ProtocolSource],
    ) -> None:
        """Do not call directly.

        Use `create_empty()` or `rehydrate()` instead.
        """
        self._sql_engine = _sql_engine
        self._sources_by_id = _sources_by_id

    @classmethod
    def create_empty(
        cls,
        sql_engine: sqlalchemy.engine.Engine,
    ) -> ProtocolStore:
        """Return a new, empty ProtocolStore.

        Params:
            sql_engine: A referenece to the database that this ProtocolStore should
                use as its backing storage.
                This is expected to already have the proper tables set up;
                see `add_tables_to_db()`.
                This should have no protocol data currently stored.
                If there is data, use `rehydrate()` instead.
        """
        return cls(_sql_engine=sql_engine, _sources_by_id={})

    @classmethod
    async def rehydrate(
        cls,
        sql_engine: sqlalchemy.engine.Engine,
        protocols_directory: Path,
        protocol_reader: ProtocolReader,
    ) -> ProtocolStore:
        """Return a new ProtocolStore, picking up where a former one left off.

        If `sql_engine` and `protocols_directory` match a prior instance of this class
        (probably from a prior boot), the new instance will pick up where it left off.
        They are allowed to contain no data, in which case this is equivalent to
        `create_empty()`.

        Params:
            sql_engine: A reference to the database that this ProtocolStore should
                use as its backing storage.
                This is expected to already have the proper tables set up;
                see `add_tables_to_db()`.
            protocols_direrctory: Where to look for protocol files while rehydrating.
                This is expected to have one subdirectory per protocol,
                named after its protocol ID.
            protocol_reader: An interface to compute `ProtocolSource`s from protocol
                files while rehydrating.
        """
        protocols_directory_async = AsyncPath(protocols_directory)
        directory_members = [m async for m in protocols_directory_async.iterdir()]
        directory_member_names = set(m.name for m in directory_members)

        # The SQL database is the canonical source of which protocols
        # have been added successfully.
        expected_ids = set(
            r.protocol_id for r in cls._sql_get_all_from_engine(sql_engine=sql_engine)
        )
        extra_members = directory_member_names - expected_ids
        missing_members = expected_ids - directory_member_names

        if extra_members:
            # Extra members may be left over from prior interrupted writes
            # and other kinds of failed insertions.
            _log.warning(
                f"Unexpected files or directories inside protocol storage directory:"
                f" {extra_members}."
                f" Ignoring them."
            )

        if missing_members:
            raise FileMissingError(
                f"Missing subdirectories for protocols: {missing_members}"
            )

        sources_by_id: Dict[str, ProtocolSource] = {}

        for protocol_subdirectory in directory_members:
            # Given that the expected protocol subdirectories exist,
            # we trust that the files in each subdirectory are correct.
            # No extra files, and no files missing.
            #
            # This is a safe assumption as long as:
            #  * Every protocol is guaranteed to have had all of its files successfully
            #    stored before it gets committed to the SQL database
            #  * Nobody has tampered with file the storage.
            protocol_files = [f async for f in protocol_subdirectory.iterdir()]

            # We don't store the ProtocolSource part in the database because it's
            # a big, deep, complex, unstable object, so migrations and compatibility
            # would be painful. Instead, we compute it based on the stored files,
            # and keep it in memory.
            #
            # This can fail if a software update makes ProtocolReader reject files
            # that it formerly accepted. We currently trust that this won't happen.
            source = await protocol_reader.read_saved(
                files=[Path(f) for f in protocol_files],
                directory=Path(protocol_subdirectory),
            )
            sources_by_id[protocol_subdirectory.name] = source

        result = ProtocolStore(
            _sql_engine=sql_engine,
            _sources_by_id=sources_by_id,
        )

        return result

    def insert(self, resource: ProtocolResource) -> None:
        """Insert a protocol resource into the store.

        The resource must have a unique ID.
        """
        self._sql_insert(
            resource=_DBProtocolResource(
                protocol_id=resource.protocol_id,
                created_at=resource.created_at,
                protocol_key=resource.protocol_key,
            )
        )
        self._sources_by_id[resource.protocol_id] = resource.source

    def get(self, protocol_id: str) -> ProtocolResource:
        """Get a single protocol by ID.

        Raises:
            ProtocolNotFoundError
        """
        sql_resource = self._sql_get(protocol_id=protocol_id)
        return ProtocolResource(
            protocol_id=sql_resource.protocol_id,
            created_at=sql_resource.created_at,
            protocol_key=sql_resource.protocol_key,
            source=self._sources_by_id[sql_resource.protocol_id],
        )

    def get_all(self) -> List[ProtocolResource]:
        """Get all protocols currently saved in this store."""
        all_sql_resources = self._sql_get_all()
        return [
            ProtocolResource(
                protocol_id=r.protocol_id,
                created_at=r.created_at,
                protocol_key=r.protocol_key,
                source=self._sources_by_id[r.protocol_id],
            )
            for r in all_sql_resources
        ]

    def remove(self, protocol_id: str) -> ProtocolResource:
        """Remove a `ProtocolResource` from the store.

        After removing it from the store, attempt to delete all files that it
        referred to.

        Returns:
            The `ProtocolResource` as it appeared just before removing it.
            Note that the files it refers to will no longer exist.

        Raises:
            ProtocolNotFoundError
        """
        deleted_sql_resource = self._sql_remove(protocol_id=protocol_id)
        deleted_source = self._sources_by_id.pop(protocol_id)

        protocol_dir = deleted_source.directory

        for source_file in deleted_source.files:
            source_file.path.unlink()
        if protocol_dir:
            protocol_dir.rmdir()

        return ProtocolResource(
            protocol_id=protocol_id,
            created_at=deleted_sql_resource.created_at,
            protocol_key=deleted_sql_resource.protocol_key,
            source=deleted_source,
        )

    def _sql_insert(self, resource: _DBProtocolResource) -> None:
        statement = sqlalchemy.insert(protocol_table).values(
            _convert_dataclass_to_sql_values(resource=resource)
        )
        with self._sql_engine.begin() as transaction:
            transaction.execute(statement)

    def _sql_get(self, protocol_id: str) -> _DBProtocolResource:
        statement = sqlalchemy.select(protocol_table).where(
            protocol_table.c.id == protocol_id
        )
        with self._sql_engine.begin() as transaction:
            try:
                matching_row = transaction.execute(statement).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise ProtocolNotFoundError(protocol_id=protocol_id) from e
        return _convert_sql_row_to_dataclass(sql_row=matching_row)

    def _sql_get_all(self) -> List[_DBProtocolResource]:
        return self._sql_get_all_from_engine(sql_engine=self._sql_engine)

    @staticmethod
    def _sql_get_all_from_engine(
        sql_engine: sqlalchemy.engine.Engine,
    ) -> List[_DBProtocolResource]:
        statement = sqlalchemy.select(protocol_table)
        with sql_engine.begin() as transaction:
            all_rows = transaction.execute(statement).all()
        return [_convert_sql_row_to_dataclass(sql_row=row) for row in all_rows]

    def _sql_remove(self, protocol_id: str) -> _DBProtocolResource:
        select_statement = sqlalchemy.select(protocol_table).where(
            protocol_table.c.id == protocol_id
        )
        delete_statement = sqlalchemy.delete(protocol_table).where(
            protocol_table.c.id == protocol_id
        )
        with self._sql_engine.begin() as transaction:
            try:
                # SQLite <3.35.0 doesn't support the RETURNING clause,
                # so we do it ourselves with a separate SELECT.
                row_to_delete = transaction.execute(select_statement).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise ProtocolNotFoundError(protocol_id=protocol_id) from e
            transaction.execute(delete_statement)

        deleted_resource = _convert_sql_row_to_dataclass(sql_row=row_to_delete)
        return deleted_resource


@dataclass(frozen=True)
class _DBProtocolResource:
    """The subset of a ProtocolResource that's stored in the SQL database."""

    protocol_id: str
    created_at: datetime
    protocol_key: Optional[str]


def _convert_sql_row_to_dataclass(
    sql_row: sqlalchemy.engine.Row,
) -> _DBProtocolResource:
    protocol_id = sql_row.id
    assert isinstance(protocol_id, str)

    created_at = sql_row.created_at
    assert isinstance(created_at, datetime)

    protocol_key = sql_row.protocol_key
    # key is optional in DB. If it's present (not None) it must be a str.
    if protocol_key is not None:
        assert isinstance(protocol_key, str)

    return _DBProtocolResource(
        protocol_id=protocol_id,
        created_at=created_at,
        protocol_key=protocol_key,
    )


def _convert_dataclass_to_sql_values(
    resource: _DBProtocolResource,
) -> Dict[str, object]:
    return {
        "id": resource.protocol_id,
        "created_at": resource.created_at,
        "protocol_key": resource.protocol_key,
    }
