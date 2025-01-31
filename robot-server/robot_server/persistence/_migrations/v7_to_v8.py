"""Migrate the persistence directory from schema 7 to 8.

Summary of changes from schema 7:

- Adds a new command_error to store the commands error in the commands table
- Adds a new command_status to store the commands status in the commands table
"""

import json
from pathlib import Path
from contextlib import ExitStack
import shutil

import sqlalchemy

from ._util import add_column
from ..database import sql_engine_ctx
from ..tables import schema_8
from .._folder_migrator import Migration

from ..file_and_directory_names import (
    DB_FILE,
)
from ..tables.schema_8 import CommandStatusSQLEnum


class Migration7to8(Migration):  # noqa: D101
    def migrate(self, source_dir: Path, dest_dir: Path) -> None:
        """Migrate the persistence directory from schema 6 to 7."""
        # Copy over all existing directories and files to new version
        for item in source_dir.iterdir():
            if item.is_dir():
                shutil.copytree(src=item, dst=dest_dir / item.name)
            else:
                shutil.copy(src=item, dst=dest_dir / item.name)

        dest_db_file = dest_dir / DB_FILE

        with ExitStack() as exit_stack:
            dest_engine = exit_stack.enter_context(sql_engine_ctx(dest_db_file))

            dest_transaction = exit_stack.enter_context(dest_engine.begin())

            add_column(
                dest_engine,
                schema_8.run_command_table.name,
                schema_8.run_command_table.c.command_error,
            )

            add_column(
                dest_engine,
                schema_8.run_command_table.name,
                schema_8.run_command_table.c.command_status,
            )

            _add_missing_indexes(dest_transaction=dest_transaction)

            _migrate_command_table_with_new_command_error_col_and_command_status(
                dest_transaction=dest_transaction
            )


def _add_missing_indexes(dest_transaction: sqlalchemy.engine.Connection) -> None:
    # todo(2024-11-20): Probably add the indexes missing from prior migrations here.
    # https://opentrons.atlassian.net/browse/EXEC-827
    index = next(
        index
        for index in schema_8.run_command_table.indexes
        if index.name == "ix_run_run_id_command_status_index_in_run"
    )
    index.create(dest_transaction)


def _migrate_command_table_with_new_command_error_col_and_command_status(
    dest_transaction: sqlalchemy.engine.Connection,
) -> None:
    """Add a new 'command_error' and 'command_status' column to run_command_table table."""
    commands_table = schema_8.run_command_table
    select_commands = sqlalchemy.select(commands_table)
    commands_to_update = []
    for row in dest_transaction.execute(select_commands).all():
        data = json.loads(row.command)
        new_command_error = (
            # Account for old_row.command["error"] being null.
            None
            if "error" not in row.command or data["error"] is None
            else json.dumps(data["error"])
        )
        # parse json as enum
        new_command_status = _convert_commands_status_to_sql_command_status(
            data["status"]
        )
        commands_to_update.append(
            {
                "_id": row.row_id,
                "command_error": new_command_error,
                "command_status": new_command_status,
            }
        )

    if len(commands_to_update) > 0:
        update_commands = (
            sqlalchemy.update(commands_table)
            .where(commands_table.c.row_id == sqlalchemy.bindparam("_id"))
            .values(
                {
                    "command_error": sqlalchemy.bindparam("command_error"),
                    "command_status": sqlalchemy.bindparam("command_status"),
                }
            )
        )
        dest_transaction.execute(update_commands, commands_to_update)


def _convert_commands_status_to_sql_command_status(
    status: str,
) -> CommandStatusSQLEnum:
    match status:
        case "queued":
            return CommandStatusSQLEnum.QUEUED
        case "running":
            return CommandStatusSQLEnum.RUNNING
        case "failed":
            return CommandStatusSQLEnum.FAILED
        case "succeeded":
            return CommandStatusSQLEnum.SUCCEEDED
        case _:
            assert False, "command status is unknown"
