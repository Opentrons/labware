"""Migrate the persistence directory from schema 4 to 5.

Summary of changes from schema 4:

- Adds a new "protocol_kind" column to protocols table
- Adds a new "data_files" table
"""

from pathlib import Path
from contextlib import ExitStack
import shutil

from ._util import add_column
from ..database import sql_engine_ctx
from ..file_and_directory_names import DB_FILE
from ..tables import schema_5
from .._folder_migrator import Migration


class Migration4to5(Migration):  # noqa: D101
    def migrate(self, source_dir: Path, dest_dir: Path) -> None:
        """Migrate the persistence directory from schema 4 to 5."""
        # Copy over all existing directories and files to new version
        for item in source_dir.iterdir():
            if item.is_dir():
                shutil.copytree(src=item, dst=dest_dir / item.name)
            else:
                shutil.copy(src=item, dst=dest_dir / item.name)
        dest_db_file = dest_dir / DB_FILE

        # Append the new column to existing protocols in v4 database
        with ExitStack() as exit_stack:
            dest_engine = exit_stack.enter_context(sql_engine_ctx(dest_db_file))
            schema_5.metadata.create_all(dest_engine)

            add_column(
                dest_engine,
                schema_5.protocol_table.name,
                schema_5.protocol_table.c.protocol_kind,
            )
