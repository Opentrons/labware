"""Shared helpers for migrations."""

import shutil
import typing
from pathlib import Path

import sqlalchemy

from ..database import sqlite_rowid


def copy_rows_unmodified(
    source_table: sqlalchemy.Table,
    dest_table: sqlalchemy.Table,
    source_connection: sqlalchemy.engine.Connection,
    dest_connection: sqlalchemy.engine.Connection,
    order_by_rowid: bool,
) -> None:
    """Copy the contents of a table between databases.

    The column names must be identical.

    `order_by_rowid` preserves the relative ordering in SQLite's implicit `ROWID`
    column by inserting records in the same order they were in the source.
    This is only necessary if the table relies on SQLite's implicit `ROWID` column for
    row ordering; it should be `False` if the table has an explicit sequence number
    column instead.
    """
    select = sqlalchemy.select(source_table).order_by(
        sqlite_rowid if order_by_rowid else None
    )
    insert = sqlalchemy.insert(dest_table)
    # TODO: SQLAlchemy or its underlying dbapi are probably paging the entire
    # collection of source rows into memory. This is probably fine--it will probably
    # not be much worse than how Protocol Engine keeps every command in memory--
    # but it's not great.
    #
    # SQLAlchemy 1.4.40 might make this easier to fix, with yield_per.
    # https://docs.sqlalchemy.org/en/14/core/connections.html#sqlalchemy.engine.Connection.execution_options.params.yield_per
    for row in source_connection.execute(select).mappings():
        dest_connection.execute(insert, row)


def copy_if_exists(src: Path, dst: Path) -> None:
    """Like `shutil.copy()`, but no-op if `src` doesn't exist."""
    try:
        shutil.copy(src=src, dst=dst)
    except FileNotFoundError:
        pass


def copytree_if_exists(src: Path, dst: Path) -> None:
    """Like `shutil.copytree()`, but no-op if `src` doesn't exist."""
    try:
        shutil.copytree(src=src, dst=dst)
    except FileNotFoundError:
        pass


def add_column(
    engine: sqlalchemy.engine.Engine,
    table_name: str,
    column: typing.Any,
) -> None:
    """Add a column to an existing SQL table, with an `ALTER TABLE` statement.

    Params:
        engine: A SQLAlchemy engine to connect to the database.
        table_name: The SQL name of the parent table.
        column: The SQLAlchemy column object.

    Known limitations:

    - This does not currently support indexes.
    - This does not currently support constraints.
    - The column will always be added as nullable. Adding non-nullable columns in
      SQLite requires an elaborate and sensitive dance that we do not wish to attempt.
      https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes

    To avoid those limitations, instead of this function, consider this:

    1. Start with an empty database, or drop or rename the current table.
    2. Use SQLAlchemy's `metadata.create_all()` to create an empty table with the new
       schema, including the new column.
    3. Copy rows from the old table to the new one, populating the new column
       however you please.
    """
    column_type = column.type.compile(engine.dialect)
    with engine.begin() as transaction:
        # todo(mm, 2024-11-25): This text seems like something that SQLAlchemy could generate for us
        # (maybe: https://docs.sqlalchemy.org/en/20/core/metadata.html#sqlalchemy.schema.Column.compile),
        # and that might help us account for indexes and constraints.
        transaction.execute(
            sqlalchemy.text(
                f"ALTER TABLE {table_name} ADD COLUMN {column.key} {column_type}"
            )
        )
