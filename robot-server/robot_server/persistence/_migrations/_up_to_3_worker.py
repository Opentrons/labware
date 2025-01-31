"""Code that runs in a worker subprocess for the `up_to_3` migration."""


# fmt: off

# We keep a list of all the modules that this file imports
# so we can preload them when launching the subprocesses.
from types import ModuleType
_imports: "list[ModuleType]" = []

import contextlib  # noqa: E402
import pathlib  # noqa: E402
import typing  # noqa: E402
_imports.extend([contextlib, pathlib, typing])

import pydantic  # noqa: E402
import sqlalchemy  # noqa: E402
_imports.extend([pydantic, sqlalchemy])

from opentrons.protocol_engine import commands  # noqa: E402
from server_utils import sql_utils  # noqa: E402
_imports.extend([commands, sql_utils])

from robot_server.persistence.tables import schema_2, schema_3  # noqa: E402
from robot_server.persistence import (  # noqa: E402
    database,
    pydantic as pydantic_helpers,
    _legacy_pickle,
)
_imports.extend([schema_2, schema_3, database, pydantic_helpers, _legacy_pickle])

# fmt: on


imports: typing.List[str] = [m.__name__ for m in _imports]
"""The names of all modules imported by this module, e.g. "foo.bar.baz"."""


def migrate_commands_for_run(
    source_db_file: pathlib.Path,
    dest_db_file: pathlib.Path,
    run_id: str,
    # This is a multiprocessing.Lock, which can't be a type annotation for some reason.
    lock: typing.ContextManager[object],
) -> None:
    """Perform the schema 2->3 migration for a single run's commands.

    See the `up_to_3` migration for background.

    Args:
        source_db_file: The SQLite database file to migrate from.
        dest_db_file: The SQLite database file to migrate into. Assumed to have all the
            proper tables set up already.
        run_id: Which run's commands to migrate.
        lock: A lock to hold while accessing the database. Concurrent access would be
            safe in the sense that SQLite would always provide isolation. But, when
            there are conflicts, we'd have to deal with SQLite retrying transactions or
            raising SQLITE_BUSY. A Python-level lock is simpler and more reliable.
    """
    with contextlib.suppress(
        # The format that we're migrating from is prone to bugs where our latest
        # code can't read records created by older code. (See RSS-98).
        # If that happens, it's better to silently drop the run than to fail the
        # whole migration.
        #
        # TODO(mm, 2024-02-14): Log these somehow. Logging is a little tricky from
        # subprocesses.
        Exception
    ), database.sql_engine_ctx(
        source_db_file
    ) as source_engine, database.sql_engine_ctx(
        dest_db_file
    ) as dest_engine:
        select_old_commands = sqlalchemy.select(schema_2.run_table.c.commands).where(
            schema_2.run_table.c.id == run_id
        )
        insert_new_command = sqlalchemy.insert(schema_3.run_command_table)

        with lock, source_engine.begin() as source_transaction:
            old_commands_bytes: typing.Optional[bytes] = source_transaction.execute(
                select_old_commands
            ).scalar_one()

        old_commands: typing.List[typing.Dict[str, object]] = (
            _legacy_pickle.loads(old_commands_bytes) if old_commands_bytes else []
        )

        parsed_commands: typing.Iterable[commands.Command] = (
            commands.CommandAdapter.validate_python(c) for c in old_commands
        )

        new_command_rows = [
            {
                "run_id": run_id,
                "index_in_run": index_in_run,
                "command_id": parsed_command.id,
                "command": pydantic_helpers.pydantic_to_json(parsed_command),
            }
            for index_in_run, parsed_command in enumerate(parsed_commands)
        ]

        with lock, dest_engine.begin() as dest_transaction:
            if len(new_command_rows) > 0:
                # This needs to be guarded by a len>0 check because if the list is empty,
                # SQLAlchemy misinterprets this as inserting a single row with all default
                # values.
                dest_transaction.execute(insert_new_command, new_command_rows)
