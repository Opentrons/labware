"""Migrate the persistence directory from schema 2 to 3.

Summary of changes from schema 2:

- Run commands were formerly stored as monolithic blobs in the `run.commands` column,
  with each row storing an entire list. This has been split out into a new
  `run_command` table, where each individual command gets its own row.

- All columns that were storing binary pickles have been converted to storing
  JSON strings:
  - `analysis.completed_analysis`
  - `run.state_summary`
  - `run_commands.command` (formerly `run.commands`; see above)

- `analysis.completed_analysis_as_document` has been removed,
  since the updated `analysis.completed_analysis` (see above) replaces it.
"""

import multiprocessing
from contextlib import ExitStack
from pathlib import Path
from logging import getLogger
from typing import List

from opentrons.protocol_engine import StateSummary
import sqlalchemy

from ..pydantic import pydantic_to_json
from ..database import (
    sql_engine_ctx,
    sqlite_rowid,
)
from ..tables import schema_2, schema_3
from .._folder_migrator import Migration
from ..file_and_directory_names import (
    DECK_CONFIGURATION_FILE,
    PROTOCOLS_DIRECTORY,
    DB_FILE,
)
from ._util import copy_rows_unmodified, copy_if_exists, copytree_if_exists
from . import up_to_2
from . import _up_to_3_worker


_log = getLogger(__name__)


class MigrationUpTo3(Migration):  # noqa: D101
    def migrate(self, source_dir: Path, dest_dir: Path) -> None:
        """Migrate the persistence directory from schema 2 to 3."""
        copy_if_exists(
            source_dir / DECK_CONFIGURATION_FILE, dest_dir / DECK_CONFIGURATION_FILE
        )
        copytree_if_exists(
            source_dir / PROTOCOLS_DIRECTORY, dest_dir / PROTOCOLS_DIRECTORY
        )

        source_db_file = source_dir / DB_FILE
        dest_db_file = dest_dir / DB_FILE

        with ExitStack() as exit_stack:
            source_engine = exit_stack.enter_context(sql_engine_ctx(source_db_file))
            schema_2.metadata.create_all(source_engine)
            up_to_2.migrate(source_engine)

            dest_engine = exit_stack.enter_context(sql_engine_ctx(dest_db_file))
            schema_3.metadata.create_all(dest_engine)

            source_transaction = exit_stack.enter_context(source_engine.begin())
            dest_transaction = exit_stack.enter_context(dest_engine.begin())

            _migrate_db_excluding_commands(source_transaction, dest_transaction)

            # Get the run IDs *after* migrating runs, in case any runs got dropped.
            run_ids = _get_run_ids(schema_3_transaction=dest_transaction)

        _migrate_db_commands(source_db_file, dest_db_file, run_ids)


def _get_run_ids(*, schema_3_transaction: sqlalchemy.engine.Connection) -> List[str]:
    return (
        schema_3_transaction.execute(sqlalchemy.select(schema_3.run_table.c.id))
        .scalars()
        .all()
    )


def _migrate_db_excluding_commands(
    source_transaction: sqlalchemy.engine.Connection,
    dest_transaction: sqlalchemy.engine.Connection,
) -> None:
    copy_rows_unmodified(
        schema_2.protocol_table,
        schema_3.protocol_table,
        source_transaction,
        dest_transaction,
        order_by_rowid=True,
    )

    _migrate_analysis_table(
        source_transaction,
        dest_transaction,
    )

    _migrate_run_table_excluding_commands(
        source_transaction,
        dest_transaction,
    )

    copy_rows_unmodified(
        schema_2.action_table,
        schema_3.action_table,
        source_transaction,
        dest_transaction,
        order_by_rowid=True,
    )


def _migrate_run_table_excluding_commands(
    source_transaction: sqlalchemy.engine.Connection,
    dest_transaction: sqlalchemy.engine.Connection,
) -> None:
    select_old_runs = sqlalchemy.select(
        schema_2.run_table.c.id,
        schema_2.run_table.c.created_at,
        schema_2.run_table.c.protocol_id,
        schema_2.run_table.c.state_summary,
        # schema_2.run_table.c.commands deliberately omitted
        schema_2.run_table.c.engine_status,
        schema_2.run_table.c._updated_at,
    ).order_by(sqlite_rowid)
    insert_new_run = sqlalchemy.insert(schema_3.run_table)

    for old_row in source_transaction.execute(select_old_runs).all():
        try:
            old_state_summary = old_row.state_summary
            new_state_summary = (
                None
                if old_row.state_summary is None
                else pydantic_to_json(StateSummary.model_validate(old_state_summary))
            )
            dest_transaction.execute(
                insert_new_run,
                id=old_row.id,
                created_at=old_row.created_at,
                protocol_id=old_row.protocol_id,
                state_summary=new_state_summary,
                engine_status=old_row.engine_status,
                _updated_at=old_row._updated_at,
            )
        except Exception:
            # The format that we're migrating from is prone to bugs where our latest
            # code can't read records created by older code. (See RSS-98).
            # If that happens, it's better to silently drop the run than to fail the
            # whole migration.
            _log.warning(
                f"Exception while migrating run {old_row.id}. Dropping it.",
                exc_info=True,
            )


def _migrate_analysis_table(
    source_transaction: sqlalchemy.engine.Connection,
    dest_transaction: sqlalchemy.engine.Connection,
) -> None:
    select_old_analyses = sqlalchemy.select(schema_2.analysis_table).order_by(
        sqlite_rowid
    )
    insert_new_analysis = sqlalchemy.insert(schema_3.analysis_table)
    for old_row in source_transaction.execute(select_old_analyses).all():
        dest_transaction.execute(
            insert_new_analysis,
            # The new `completed_analysis` column has the data that used to be in
            # `completed_analysis_as_document`. The separate
            # `completed_analysis_as_document` column is dropped.
            completed_analysis=old_row.completed_analysis_as_document,
            # The remaining columns are unchanged:
            id=old_row.id,
            protocol_id=old_row.protocol_id,
            analyzer_version=old_row.analyzer_version,
        )


def _migrate_db_commands(
    source_db_file: Path, dest_db_file: Path, run_ids: List[str]
) -> None:
    """Migrate the run commands stored in the database.

    Because there are potentially tens or hundreds of thousands of commands in total,
    this is the most computationally expensive part of the migration. We distribute
    the work across subprocesses. Each subprocess extracts, migrates, and inserts
    all of the commands for a single run.
    """
    # Performance optimization: If we have nothing to migrate, don't even create the
    # process pool. This avoids the heavy imports in the preload.
    # On my laptop, this shaves ~1.5s off of each of our integration tests.
    if not run_ids:
        return

    mp = multiprocessing.get_context("forkserver")
    mp.set_forkserver_preload(_up_to_3_worker.imports)

    manager = mp.Manager()
    lock = manager.Lock()

    with mp.Pool(
        # One worker per core of the OT-2's Raspberry Pi.
        # We're compute-bound, so more workers would just thrash.
        #
        # Napkin math for the memory footprint:
        # Suppose a very large run has ~10 MB of commands (see e.g. RQA-443).
        # We're limiting this to 4 runs at a time, so 40 MB, which should be fine.
        processes=4
    ) as pool:
        pool.starmap(
            _up_to_3_worker.migrate_commands_for_run,
            ((source_db_file, dest_db_file, run_id, lock) for run_id in run_ids),
        )
