"""SQLite database migrations.

Adding new tables to the database is handled transparently
by SQLAlchemy. This simple migrations module exists to
allow us to modify existing tables when we need to.

- Add new, nullable columns
- Add new, non-nullable columns with default values
- Delete columns (possible, but ill-advised)
- Drop tables (possible, but ill-advised)

Since SQLAlchemy does not provide an interface for `ALTER TABLE`,
these migrations are defined using raw SQL commands, instead.
If we ever have more complicated migration needs, we should
bring in a tool like Alembic instead.

Database schema versions:

- Version 0
    - Initial schema version

- Version 1
    This migration adds the following nullable columns to the run table:

    - Column("state_summary, sqlalchemy.PickleType, nullable=True)
    - Column("commands", sqlalchemy.PickleType, nullable=True)
    - Column("engine_status", sqlalchemy.String, nullable=True)
    - Column("_updated_at", sqlalchemy.DateTime, nullable=True)

- Version 2:
    This migration adds the following nullable column to the analysis table:

    - Column("completed_analysis_as_document", sqlalchemy.String, nullable=True)

    It then populates the column with data converted from elsewhere in the table,
    so entries should never be NULL in practice even though nullable=True.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from typing_extensions import Final

import sqlalchemy

from ..tables.schema_2 import analysis_table, migration_table, run_table
from .. import _legacy_pickle


_LATEST_SCHEMA_VERSION: Final = 2

_log = logging.getLogger(__name__)


def migrate(sql_engine: sqlalchemy.engine.Engine) -> None:
    """Migrate the database to the latest schema version.

    SQLAlchemy will transparently add missing tables, so
    migrations are only needed when columns are added to
    existing tables.

    NOTE: added columns should be nullable.
    """
    with sql_engine.begin() as transaction:
        starting_version = _get_schema_version(transaction)

        if starting_version is None:
            _log.info(
                f"Marking fresh database as schema version {_LATEST_SCHEMA_VERSION}."
            )
            _stamp_schema_version(transaction)

        elif starting_version == _LATEST_SCHEMA_VERSION:
            _log.info(
                f"Database has schema version {_LATEST_SCHEMA_VERSION}."
                " no migrations needed."
            )

        else:
            _log.info(
                f"Database has schema version {starting_version}."
                f" Migrating to {_LATEST_SCHEMA_VERSION}..."
            )

            if starting_version < 1:
                _log.info("Migrating database schema from 0 to 1...")
                _migrate_schema_0_to_1(transaction)
            if starting_version < 2:
                _log.info("Migrating database schema from 1 to 2...")
                _migrate_schema_1_to_2(transaction)

            _log.info("Database schema migrations complete.")
            _stamp_schema_version(transaction)

        # We migrate data 1->2 unconditionally, even when we haven't just performed a 1->2 schema
        # migration. This is to solve the following edge case:
        #
        # 1) Start on schema 1.
        # 2) Update robot software, triggering a migration to schema 2.
        # 3) Roll back to older robot software that doesn't understand schema 2.
        #    Now we've got old software working in a schema 2 database, causing rows to be added
        #    where schema 2's `completed_analysis_as_document` column is NULL.
        # 4) Update robot software again. This won't trigger a schema migration, because the
        #    database was already migrated to schema 2 once. But we want to get rid of those NULL
        #    `completed_analysis_as_document` values.
        _migrate_data_1_to_2(transaction)


def _stamp_schema_version(transaction: sqlalchemy.engine.Connection) -> None:
    """Mark the database as having the latest schema version."""
    transaction.execute(
        sqlalchemy.insert(migration_table).values(
            created_at=datetime.now(tz=timezone.utc),
            version=_LATEST_SCHEMA_VERSION,
        )
    )


def _get_schema_version(transaction: sqlalchemy.engine.Connection) -> Optional[int]:
    """Get the current schema version of the given database.

    Returns:
        The version found, or None if this is a fresh database that
            the migration system has not yet marked.
    """
    if _is_version_0(transaction):
        return 0

    # It's important that this takes the highest schema version that we've seen,
    # not the most recent one to be added. If you downgrade robot software across
    # a schema boundary, the old software will leave the database at its newer schema,
    # but stamp it as having "migrated" to the old one. We need to see it as having the newer
    # schema, to avoid incorrectly doing a redundant migration when the software is upgraded
    # again later.
    select_latest_version = sqlalchemy.select(migration_table).order_by(
        sqlalchemy.desc(migration_table.c.version)
    )
    migration = transaction.execute(select_latest_version).first()

    return migration["version"] if migration is not None else None


def _is_version_0(transaction: sqlalchemy.engine.Connection) -> bool:
    """Check if the database is at schema version 0.

    This is a special case, because the schema version table wasn't
    added until version 1. Since version 1 also added run table columns,
    we know we're on schema version 0 if those columns are missing.
    """
    inspector = sqlalchemy.inspect(transaction)
    run_columns = inspector.get_columns(run_table.name)

    for column in run_columns:
        if column["name"] == "state_summary":
            return False

    return True


def _migrate_schema_0_to_1(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the database from schema 0 to schema 1."""
    add_summary_column = sqlalchemy.text("ALTER TABLE run ADD state_summary BLOB")
    add_commands_column = sqlalchemy.text("ALTER TABLE run ADD commands BLOB")
    # NOTE: The column type of `STRING` here is mistaken. SQLite won't recognize it,
    # so this column's type affinity will mistakenly default to `NUMERIC`.
    # It should be `VARCHAR`, to match what SQLAlchemy uses when creating a new
    # database from scratch. Fortunately, for this particular column, this inconsistency
    # is harmless in practice because of SQLite's weak typing.
    add_status_column = sqlalchemy.text("ALTER TABLE run ADD engine_status STRING")
    add_updated_at_column = sqlalchemy.text("ALTER TABLE run ADD _updated_at DATETIME")

    transaction.execute(add_summary_column)
    transaction.execute(add_commands_column)
    transaction.execute(add_status_column)
    transaction.execute(add_updated_at_column)


def _migrate_schema_1_to_2(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the database from schema 1 to schema 2."""
    add_completed_analysis_as_document_column = sqlalchemy.text(
        "ALTER TABLE analysis ADD completed_analysis_as_document VARCHAR"
    )
    transaction.execute(add_completed_analysis_as_document_column)


def _migrate_data_1_to_2(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the data that the database contains to take advantage of schema 2.

    Find rows where the `completed_analysis_as_document` column, introduced in schema 2,
    is NULL. Populate them with values computed from schema 1's `completed_analysis` column.

    The database is expected to already be at schema 2. This is safe to run again on a database
    whose data has already been migrated by this function.
    """
    # Local import to work around a circular dependency:
    # 1) This module is part of robot_server.persistence
    # 2) We're trying to import something from robot_server.protocols
    # 3) ...which re-exports stuff from robot_server.protocols.protocol_store
    # 4) ...which depends on robot_server.persistence
    from robot_server.protocols.analysis_models import CompletedAnalysis

    rows_needing_migration = transaction.execute(
        sqlalchemy.select(
            analysis_table.c.id, analysis_table.c.completed_analysis
        ).where(analysis_table.c.completed_analysis_as_document.is_(None))
    ).all()

    if rows_needing_migration:
        _log.info(
            f"Migrating {len(rows_needing_migration)} analysis documents."
            f" This may take a while..."
        )

    for index, row in enumerate(rows_needing_migration):
        _log.info(
            f"Migrating analysis {index+1}/{len(rows_needing_migration)}, {row.id}..."
        )

        v1_completed_analysis = CompletedAnalysis.model_validate(
            _legacy_pickle.loads(row.completed_analysis)
        )

        v2_completed_analysis_as_document = v1_completed_analysis.model_dump_json(
            # by_alias and exclude_none should match how
            # FastAPI + Pydantic + our customizations serialize these objects
            # over the `GET /protocols/:id/analyses/:id` endpoint.
            by_alias=True,
            exclude_none=True,
        )

        transaction.execute(
            sqlalchemy.update(analysis_table)
            .where(analysis_table.c.id == row.id)
            .values(completed_analysis_as_document=v2_completed_analysis_as_document)
        )

    if rows_needing_migration:
        _log.info("Done migrating analysis documents.")
