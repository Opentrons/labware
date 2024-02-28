"""Runs' on-db store."""
import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Dict, List, Optional

import sqlalchemy
from pydantic import ValidationError

from opentrons.util.helpers import utc_now
from opentrons.protocol_engine import StateSummary, CommandSlice
from opentrons.protocol_engine.commands import Command

from robot_server.persistence.database import sqlite_rowid
from robot_server.persistence.tables import (
    run_table,
    run_command_table,
    action_table,
)
from robot_server.persistence.pydantic import json_to_pydantic, pydantic_to_json
from robot_server.protocols.protocol_store import ProtocolNotFoundError
from robot_server.service.notifications import RunsPublisher

from .action_models import RunAction, RunActionType
from .run_models import RunNotFoundError

log = logging.getLogger(__name__)

_CACHE_ENTRIES = 32


@dataclass(frozen=True)
class RunResource:
    """An entry in the run store, used to construct response models.

    This represents all run data that cannot be derived from another
    location, such as a ProtocolEngine instance.
    """

    run_id: str
    protocol_id: Optional[str]
    created_at: datetime
    actions: List[RunAction]


class CommandNotFoundError(ValueError):
    """Error raised when a given command ID is not found in the store."""

    def __init__(self, command_id: str) -> None:
        """Initialize the error message from the missing ID."""
        super().__init__(f"Command {command_id} was not found.")


class RunStore:
    """Methods for storing and retrieving run resources."""

    def __init__(
        self,
        sql_engine: sqlalchemy.engine.Engine,
        runs_publisher: RunsPublisher,
    ) -> None:
        """Initialize a RunStore with sql engine and notification client."""
        self._sql_engine = sql_engine
        self._runs_publisher = runs_publisher

    def update_run_state(
        self,
        run_id: str,
        summary: StateSummary,
        commands: List[Command],
    ) -> RunResource:
        """Update the run's state summary and commands list.

        Args:
            run_id: The run to update
            summary: The run's equipment and status summary.
            commands: The run's commands.

        Returns:
            The run resource.

        Raises:
            RunNotFoundError: Run ID was not found in the database.
        """
        update_run = (
            sqlalchemy.update(run_table)
            .where(run_table.c.id == run_id)
            .values(
                _convert_state_to_sql_values(
                    run_id=run_id,
                    state_summary=summary,
                    engine_status=summary.status,
                )
            )
        )

        delete_existing_commands = sqlalchemy.delete(run_command_table).where(
            run_command_table.c.run_id == run_id
        )
        insert_command = sqlalchemy.insert(run_command_table)

        select_run_resource = sqlalchemy.select(*_run_columns).where(
            run_table.c.id == run_id
        )
        select_actions = (
            sqlalchemy.select(action_table)
            .where(action_table.c.run_id == run_id)
            .order_by(sqlite_rowid)
        )

        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            transaction.execute(update_run)
            transaction.execute(delete_existing_commands)
            for command_index, command in enumerate(commands):
                transaction.execute(
                    insert_command,
                    {
                        "run_id": run_id,
                        "index_in_run": command_index,
                        "command_id": command.id,
                        "command": pydantic_to_json(command),
                    },
                )

            run_row = transaction.execute(select_run_resource).one()
            action_rows = transaction.execute(select_actions).all()

        self._clear_caches()
        self._runs_publisher.publish_runs(run_id=run_id)
        return _convert_row_to_run(row=run_row, action_rows=action_rows)

    def insert_action(self, run_id: str, action: RunAction) -> None:
        """Insert a run action into the store.

        Args:
            run_id: Run to add the action to.
            action: Action payload to persist.

        Raises:
            RunNotFoundError: The given run ID was not found in the store.
        """
        insert = sqlalchemy.insert(action_table).values(
            _convert_action_to_sql_values(run_id=run_id, action=action),
        )

        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)
            transaction.execute(insert)

        self._clear_caches()
        self._runs_publisher.publish_runs(run_id=run_id)

    def insert(
        self,
        run_id: str,
        created_at: datetime,
        protocol_id: Optional[str],
    ) -> RunResource:
        """Insert run resource in the db.

        Args:
            run_id: Unique identifier to use for the run.
            created_at: Run creation timestamp.
            protocol_id: Protocol resource used by the run, if any.

        Returns:
            The resource that was added to the store.

        Raises:
            ProtocolNotFoundError: The given protocol ID was not
                found in the store.
        """
        run = RunResource(
            run_id=run_id,
            created_at=created_at,
            protocol_id=protocol_id,
            actions=[],
        )
        insert = sqlalchemy.insert(run_table).values(
            _convert_run_to_sql_values(run=run)
        )

        with self._sql_engine.begin() as transaction:
            try:
                transaction.execute(insert)
            except sqlalchemy.exc.IntegrityError:
                assert (
                    run.protocol_id is not None
                ), "Insert run failed due to unexpected IntegrityError"
                raise ProtocolNotFoundError(protocol_id=run.protocol_id)

        self._clear_caches()
        self._runs_publisher.publish_runs(run_id=run_id)
        return run

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def has(self, run_id: str) -> bool:
        """Whether a given run exists in the store."""
        with self._sql_engine.begin() as transaction:
            return self._run_exists(run_id, transaction)

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get(self, run_id: str) -> RunResource:
        """Get a specific run entry by its identifier.

        Args:
            run_id: Unique identifier of run entry to retrieve.

        Returns:
            The retrieved run entry.

        Raises:
            RunNotFoundError: The given run ID was not found.
        """
        select_run_resource = sqlalchemy.select(*_run_columns).where(
            run_table.c.id == run_id
        )

        select_actions = (
            sqlalchemy.select(action_table)
            .where(action_table.c.run_id == run_id)
            .order_by(sqlite_rowid)
        )

        with self._sql_engine.begin() as transaction:
            try:
                run_row = transaction.execute(select_run_resource).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise RunNotFoundError(run_id) from e
            action_rows = transaction.execute(select_actions).all()

        return _convert_row_to_run(run_row, action_rows)

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get_all(self, length: Optional[int] = None) -> List[RunResource]:
        """Get all known run resources.

        Results are ordered from oldest to newest.

        Params:
            length: If `None`, return all runs. Otherwise, return the newest n runs.
        """
        select_actions = sqlalchemy.select(action_table).order_by(sqlite_rowid.asc())
        actions_by_run_id = defaultdict(list)

        with self._sql_engine.begin() as transaction:
            if length is not None:
                select_runs = (
                    sqlalchemy.select(*_run_columns)
                    .order_by(sqlite_rowid.desc())
                    .limit(length)
                )
                # need to select the last inserted runs and return by asc order
                runs = list(reversed(transaction.execute(select_runs).all()))
            else:
                select_runs = sqlalchemy.select(*_run_columns).order_by(
                    sqlite_rowid.asc()
                )
                runs = transaction.execute(select_runs).all()

            actions = transaction.execute(select_actions).all()

        for action_row in actions:
            actions_by_run_id[action_row.run_id].append(action_row)

        return [
            _convert_row_to_run(
                row=run_row,
                action_rows=actions_by_run_id[run_row.id],
            )
            for run_row in runs
        ]

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get_state_summary(self, run_id: str) -> Optional[StateSummary]:
        """Get the archived run state summary.

        This is a summary of run's ProtocolEngine state,
        captured when the run was archived. It contains
        status, equipment, and error information.
        """
        select_run_data = sqlalchemy.select(run_table.c.state_summary).where(
            run_table.c.id == run_id
        )

        with self._sql_engine.begin() as transaction:
            row = transaction.execute(select_run_data).one()

        try:
            return (
                json_to_pydantic(StateSummary, row.state_summary)
                if row.state_summary is not None
                else None
            )
        except ValidationError as e:
            log.warning(f"Error retrieving state summary for {run_id}: {e}")
            return None

    def get_commands_slice(
        self,
        run_id: str,
        length: int,
        cursor: Optional[int],
    ) -> CommandSlice:
        """Get a slice of run commands from the store.

        Args:
            run_id: Run ID to pull commands from.
            length: Number of commands to return.
            cursor: The starting index of the slice in the whole collection.
                If `None`, up to `length` elements at the end of the collection will
                be returned.

        Returns:
            A collection of commands as well as the actual cursor used and
            the total length of the collection.

        Raises:
            RunNotFoundError: The given run ID was not found.
        """
        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            select_count = sqlalchemy.select(sqlalchemy.func.count()).where(
                run_command_table.c.run_id == run_id
            )
            count_result: int = transaction.execute(select_count).scalar_one()

            actual_cursor = cursor if cursor is not None else count_result - length
            # Clamp to [0, count_result).
            actual_cursor = max(0, min(actual_cursor, count_result - 1))

            select_slice = (
                sqlalchemy.select(
                    run_command_table.c.index_in_run, run_command_table.c.command
                )
                .where(
                    run_command_table.c.run_id == run_id,
                    run_command_table.c.index_in_run >= actual_cursor,
                    run_command_table.c.index_in_run < actual_cursor + length,
                )
                .order_by(run_command_table.c.index_in_run)
            )

            slice_result = transaction.execute(select_slice).all()

        sliced_commands: List[Command] = [
            json_to_pydantic(Command, row.command)  # type: ignore[arg-type]
            for row in slice_result
        ]

        return CommandSlice(
            cursor=actual_cursor,
            total_length=count_result,
            commands=sliced_commands,
        )

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get_command(self, run_id: str, command_id: str) -> Command:
        """Get run command by id.

        Args:
            run_id: The run to pull the command from.
            command_id: The specific command to pull.

        Returns:
            The command.

        Raises:
            RunNotFoundError: The given run ID was not found in the store.
            CommandNotFoundError: The given command ID was not found in the store.
        """
        select_command = sqlalchemy.select(run_command_table.c.command).where(
            run_command_table.c.run_id == run_id,
            run_command_table.c.command_id == command_id,
        )

        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            command = transaction.execute(select_command).scalar_one_or_none()
            if command is None:
                raise CommandNotFoundError(command_id=command_id)

        return json_to_pydantic(Command, command)  # type: ignore[arg-type]

    def remove(self, run_id: str) -> None:
        """Remove a run by its unique identifier.

        Arguments:
            run_id: The run's unique identifier.

        Raises:
            RunNotFoundError: The specified run ID was not found.
        """
        delete_run = sqlalchemy.delete(run_table).where(run_table.c.id == run_id)
        delete_actions = sqlalchemy.delete(action_table).where(
            action_table.c.run_id == run_id
        )
        delete_commands = sqlalchemy.delete(run_command_table).where(
            run_command_table.c.run_id == run_id
        )
        with self._sql_engine.begin() as transaction:
            transaction.execute(delete_actions)
            transaction.execute(delete_commands)
            result = transaction.execute(delete_run)

        if result.rowcount < 1:
            raise RunNotFoundError(run_id)

        self._clear_caches()
        self._runs_publisher.publish_runs(run_id=run_id)

    def _run_exists(
        self, run_id: str, connection: sqlalchemy.engine.Connection
    ) -> bool:
        result: bool = connection.execute(
            sqlalchemy.select(sqlalchemy.exists().where(run_table.c.id == run_id))
        ).scalar_one()
        return result

    def _clear_caches(self) -> None:
        self.has.cache_clear()
        self.get.cache_clear()
        self.get_all.cache_clear()
        self.get_state_summary.cache_clear()
        self.get_command.cache_clear()


# The columns that must be present in a row passed to _convert_row_to_run().
_run_columns = [run_table.c.id, run_table.c.protocol_id, run_table.c.created_at]


def _convert_row_to_run(
    row: sqlalchemy.engine.Row,
    action_rows: List[sqlalchemy.engine.Row],
) -> RunResource:
    run_id = row.id
    protocol_id = row.protocol_id
    created_at = row.created_at

    assert isinstance(run_id, str), f"Run ID {run_id} is not a string"
    assert protocol_id is None or isinstance(
        protocol_id, str
    ), f"Protocol ID {protocol_id} is not a string or None"

    return RunResource(
        run_id=run_id,
        created_at=created_at,
        protocol_id=protocol_id,
        actions=[
            RunAction(
                id=action_row.id,
                createdAt=action_row.created_at,
                actionType=RunActionType(action_row.action_type),
            )
            for action_row in action_rows
        ],
    )


def _convert_run_to_sql_values(run: RunResource) -> Dict[str, object]:
    return {
        "id": run.run_id,
        "created_at": run.created_at,
        "protocol_id": run.protocol_id,
    }


def _convert_action_to_sql_values(action: RunAction, run_id: str) -> Dict[str, object]:
    return {
        "id": action.id,
        "created_at": action.createdAt,
        "action_type": action.actionType.value,
        "run_id": run_id,
    }


def _convert_state_to_sql_values(
    run_id: str,
    state_summary: StateSummary,
    engine_status: str,
) -> Dict[str, object]:
    return {
        "state_summary": pydantic_to_json(state_summary),
        "engine_status": engine_status,
        "_updated_at": utc_now(),
    }
