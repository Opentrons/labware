"""Store and retrieve information about uploaded data files from the database."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Set

import sqlalchemy.engine

from robot_server.deletion_planner import FileUsageInfo
from robot_server.persistence.database import sqlite_rowid
from robot_server.persistence.tables import (
    data_files_table,
    analysis_csv_rtp_table,
    run_csv_rtp_table,
)
from robot_server.persistence.tables import DataFileSourceSQLEnum

from .models import DataFileSource, FileIdNotFoundError, FileInUseError


@dataclass(frozen=True)
class DataFileInfo:
    """Metadata info of a saved data file."""

    id: str
    name: str
    file_hash: str
    created_at: datetime
    source: DataFileSource


class DataFilesStore:
    """Store and retrieve info about uploaded data files."""

    def __init__(
        self,
        sql_engine: sqlalchemy.engine.Engine,
        data_files_directory: Path,
    ) -> None:
        """Create a new DataFilesStore."""
        self._sql_engine = sql_engine
        self._data_files_directory = data_files_directory

    def get_file_info_by_hash(self, file_hash: str) -> Optional[DataFileInfo]:
        """Get the ID of data file having the provided hash."""
        for file in self.sql_get_all_from_engine():
            if file.file_hash == file_hash:
                return file
        return None

    async def insert(self, file_info: DataFileInfo) -> None:
        """Insert data file info in the database."""
        file_info_dict = {
            "id": file_info.id,
            "name": file_info.name,
            "source": DataFileSourceSQLEnum(file_info.source.value),
            "created_at": file_info.created_at,
            "file_hash": file_info.file_hash,
        }
        statement = sqlalchemy.insert(data_files_table).values(file_info_dict)
        with self._sql_engine.begin() as transaction:
            transaction.execute(statement)

    def get(self, data_file_id: str) -> DataFileInfo:
        """Get data file info from the database."""
        statement = sqlalchemy.select(data_files_table).where(
            data_files_table.c.id == data_file_id
        )
        with self._sql_engine.begin() as transaction:
            try:
                data_file_row = transaction.execute(statement).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise FileIdNotFoundError(data_file_id) from e

        return _convert_row_data_file_info(data_file_row)

    def sql_get_all_from_engine(self) -> List[DataFileInfo]:
        """Get all data file entries from the database."""
        statement = sqlalchemy.select(data_files_table).order_by(sqlite_rowid)
        with self._sql_engine.begin() as transaction:
            all_rows = transaction.execute(statement).all()
        return [_convert_row_data_file_info(sql_row) for sql_row in all_rows]

    def get_usage_info(
        self, source: Optional[DataFileSource] = None
    ) -> List[FileUsageInfo]:
        """Return information about usage of all the existing data files in runs & analyses.

        Results are ordered with the oldest-added data file first.
        """
        if source is None:
            select_all_data_file_ids = sqlalchemy.select(
                data_files_table.c.id
            ).order_by(sqlite_rowid)
        else:
            select_all_data_file_ids = (
                sqlalchemy.select(data_files_table.c.id)
                .where(data_files_table.c.source.name == source.name)
                .order_by(sqlite_rowid)
            )

        select_ids_used_in_analyses = sqlalchemy.select(
            analysis_csv_rtp_table.c.file_id
        ).where(analysis_csv_rtp_table.c.file_id.is_not(None))
        select_ids_used_in_runs = sqlalchemy.select(run_csv_rtp_table.c.file_id).where(
            run_csv_rtp_table.c.file_id.is_not(None)
        )

        with self._sql_engine.begin() as transaction:
            all_file_ids: List[str] = (
                transaction.execute(select_all_data_file_ids).scalars().all()
            )
            files_used_in_analyses: Set[str] = set(
                transaction.execute(select_ids_used_in_analyses).scalars().all()
            )
            files_used_in_runs: Set[str] = set(
                transaction.execute(select_ids_used_in_runs).scalars().all()
            )

        usage_info = [
            FileUsageInfo(
                file_id=file_id,
                used_by_run_or_analysis=(
                    file_id in files_used_in_runs or file_id in files_used_in_analyses
                ),
            )
            for file_id in all_file_ids
        ]
        return usage_info

    def remove(self, file_id: str) -> None:
        """Remove the specified files from database and persistence directory.

        This should only be called when the specified file has no references
        in the database.

        Raises:
            FileIdNotFoundError: the given file ID was not found in the store.
            FileInUseError: the given file is referenced by an analysis or run
                            and cannot be deleted.
        """
        select_ids_used_in_analyses = sqlalchemy.select(
            analysis_csv_rtp_table.c.analysis_id
        ).where(analysis_csv_rtp_table.c.file_id == file_id)
        select_ids_used_in_runs = sqlalchemy.select(run_csv_rtp_table.c.run_id).where(
            run_csv_rtp_table.c.file_id == file_id
        )
        delete_statement = sqlalchemy.delete(data_files_table).where(
            data_files_table.c.id == file_id
        )
        with self._sql_engine.begin() as transaction:
            files_used_in_analyses: Set[str] = set(
                transaction.execute(select_ids_used_in_analyses).scalars().all()
            )
            files_used_in_runs: Set[str] = set(
                transaction.execute(select_ids_used_in_runs).scalars().all()
            )
            if len(files_used_in_analyses) + len(files_used_in_runs) > 0:

                raise FileInUseError(
                    data_file_id=file_id,
                    ids_used_in_runs=files_used_in_runs,
                    ids_used_in_analyses=files_used_in_analyses,
                )
            result = transaction.execute(delete_statement)
        if result.rowcount < 1:
            raise FileIdNotFoundError(file_id)
        file_dir = self._data_files_directory.joinpath(file_id)
        if file_dir.exists():
            for file in file_dir.glob("*"):
                file.unlink()
            file_dir.rmdir()


def _convert_row_data_file_info(row: sqlalchemy.engine.Row) -> DataFileInfo:
    return DataFileInfo(
        id=row.id,
        name=row.name,
        source=DataFileSource(row.source.value),
        created_at=row.created_at,
        file_hash=row.file_hash,
    )
