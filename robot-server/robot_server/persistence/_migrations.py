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

- Version 2
    This migration doesn't affect the schema at the SQL level,
    but it does affect how we format stored values.

    In schema v1, these columns...

    - Column "completed_analysis" in table "analysis"
    - Column "state_summary" in table "run"
    - Column "commands" in table "run"

    ...stored Pydantic models, exported to Python dicts with Pydantic's .dict() method,
    then serialized to binary blobs with the standard Python pickle module.

    In schema v2, we serialize the Pydantic models to JSON, instead.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from typing_extensions import Final

import sqlalchemy

from opentrons.protocol_engine import StateSummary

from robot_server.analysis_models import CompletedAnalysis

from ._command_list import CommandList
from ._tables import (
    analysis_table as newest_analysis_table,
    migration_table as newest_migration_table,
    run_table as newest_run_table,
)

from . import _legacy_pickle
from . import _pydantic_col

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
                _migrate_0_to_1(transaction)
            if starting_version < 2:
                _log.info("Migrating database schema from 1 to 2...")
                _migrate_1_to_2(transaction)

            _log.info("Database migrations complete.")
            _stamp_schema_version(transaction)


def _stamp_schema_version(transaction: sqlalchemy.engine.Connection) -> None:
    """Mark the database as having the latest schema version."""
    transaction.execute(
        sqlalchemy.insert(newest_migration_table).values(
            created_at=datetime.now(tz=timezone.utc),
            version=_LATEST_SCHEMA_VERSION,
        )
    )


def _get_schema_version(transaction: sqlalchemy.engine.Connection) -> Optional[int]:
    """Get the current schema version of the database.

    Returns:
        The version found, or None if this is a fresh database that
            the migration system has not yet marked.
    """
    if _is_version_0(transaction):
        return 0

    select_latest_version = sqlalchemy.select(newest_migration_table).order_by(
        sqlalchemy.desc(newest_migration_table.c.version)
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
    run_columns = inspector.get_columns(newest_run_table.name)

    for column in run_columns:
        if column["name"] == "state_summary":
            return False

    return True


def _migrate_0_to_1(transaction: sqlalchemy.engine.Connection) -> None:
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


def _migrate_1_to_2(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the database from schema 1 to schema 2."""
    _migrate_analysis_1_to_2(transaction)
    _migrate_run_1_to_2(transaction)


def _migrate_analysis_1_to_2(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the ``analysis`` table from schema 1 to schema 2."""
    v1_completed_analysis_column = sqlalchemy.column(
        "completed_analysis",
        sqlalchemy.PickleType(pickler=_legacy_pickle)
        # Originally declared nullable=False in schema v1.
    )

    # Extract using the old column definitions.
    select_v1_rows = sqlalchemy.select(
        newest_analysis_table.c.id, v1_completed_analysis_column
    ).select_from(newest_analysis_table)
    v1_rows = transaction.execute(select_v1_rows)

    for v1_row in v1_rows:
        v1_id = v1_row.id
        assert isinstance(v1_id, str)
        v1_completed_analysis_dict = v1_row.completed_analysis
        assert isinstance(v1_completed_analysis_dict, dict)

        parsed_completed_analysis = CompletedAnalysis.parse_obj(
            v1_completed_analysis_dict
        )

        v2_completed_analysis = _pydantic_col.pydantic_to_sql(
            value=parsed_completed_analysis
        )

        # Reinsert using the new column definitions.
        update = (
            sqlalchemy.update(newest_analysis_table)
            .where(newest_analysis_table.c.id == v1_id)
            .values(completed_analysis=v2_completed_analysis)
        )
        transaction.execute(update)


def _migrate_run_1_to_2(transaction: sqlalchemy.engine.Connection) -> None:
    """Migrate the ``run`` table from schema 1 to schema 2."""
    v1_state_summary_column = sqlalchemy.column(
        "state_summary",
        sqlalchemy.PickleType(pickler=_legacy_pickle),
        # Originally declared nullable=True in schema v1.
    )
    v1_commands_column = sqlalchemy.column(
        "commands",
        sqlalchemy.PickleType(pickler=_legacy_pickle),
        # Originally declared nullable=True in schema v1.
    )

    # Extract using the old column definitions.
    select_v1_rows = sqlalchemy.select(
        newest_run_table.c.id, v1_state_summary_column, v1_commands_column
    ).select_from(newest_run_table)
    v1_rows = transaction.execute(select_v1_rows)

    for v1_row in v1_rows:
        v1_id = v1_row.id
        assert isinstance(v1_id, str)

        v1_state_summary_dict: Optional[Dict[object, object]] = v1_row.state_summary
        assert isinstance(v1_state_summary_dict, (type(None), dict))

        v1_command_dicts: Optional[List[Dict[object, object]]] = v1_row.commands
        assert isinstance(v1_command_dicts, (type(None), list))

        parsed_state_summary = (
            None
            if v1_state_summary_dict is None
            else StateSummary.parse_obj(v1_state_summary_dict)
        )
        parsed_commands = (
            None
            if v1_command_dicts is None
            else CommandList.parse_obj(v1_command_dicts)
        )

        v2_state_summary = (
            None
            if parsed_state_summary is None
            else _pydantic_col.pydantic_to_sql(value=parsed_state_summary)
        )
        v2_commands = (
            None
            if parsed_commands is None
            else _pydantic_col.pydantic_to_sql(value=parsed_commands)
        )

        # Reinsert using the new column definitions.
        update = (
            sqlalchemy.update(newest_run_table)
            .where(newest_run_table.c.id == v1_id)
            .values(
                state_summary=v2_state_summary,
                commands=v2_commands,
            )
        )
        transaction.execute(update)
