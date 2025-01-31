"""Runs' on-db store."""

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Dict, List, Optional, Literal, Union

import sqlalchemy
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import and_

from opentrons.util.helpers import utc_now
from opentrons.protocol_engine import (
    StateSummary,
    CommandSlice,
    CommandIntent,
    ErrorOccurrence,
    CommandErrorSlice,
    CommandStatus,
)
from opentrons.protocol_engine.commands import Command, CommandAdapter
from opentrons.protocol_engine.types import RunTimeParameter

from opentrons_shared_data.errors.exceptions import (
    EnumeratedError,
    PythonException,
    InvalidStoredData,
)

from robot_server.persistence.database import sqlite_rowid
from robot_server.persistence.tables import (
    run_table,
    run_command_table,
    action_table,
    run_csv_rtp_table,
)
from robot_server.persistence.pydantic import (
    json_to_pydantic,
    pydantic_to_json,
    pydantic_list_to_json,
)
from robot_server.protocols.protocol_store import ProtocolNotFoundError

from .action_models import RunAction, RunActionType
from .run_models import RunNotFoundError
from ..persistence.tables import CommandStatusSQLEnum

log = logging.getLogger(__name__)

_CACHE_ENTRIES = 32

_rtp_list_adapter = TypeAdapter(list[RunTimeParameter])


@dataclass(frozen=True)
class RunResource:
    """An entry in the run store, used to construct response models.

    This represents all run data that cannot be derived from another
    location, such as a ProtocolEngine instance.
    """

    ok: Literal[True]
    run_id: str
    protocol_id: Optional[str]
    created_at: datetime
    actions: List[RunAction]


@dataclass(frozen=True)
class BadRunResource:
    """A representation for an action in the run store that cannot be loaded.

    This will get created, for instance, when loading a run made in a future
    version with an action that does not exist in the current version. This should
    never happen in released versions, but it does sometimes during development,
    and without handling like this it would cause any list-all request to fail.

    The ok field is a union discriminator. Other elements will be filled in as they
    can be with whatever data was recoverable and should not be relied upon.
    """

    ok: Literal[False]
    run_id: str
    protocol_id: Optional[str]
    created_at: datetime
    actions: List[RunAction]
    error: EnumeratedError


@dataclass(frozen=True)
class BadStateSummary:
    """A representation for a state summary that could not be loaded."""

    dataError: EnumeratedError


@dataclass
class CSVParameterRunResource:
    """A CSV runtime parameter from a completed run, storable in a SQL database."""

    run_id: str
    parameter_variable_name: str
    file_id: Optional[str]


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
    ) -> None:
        """Initialize a RunStore with sql engine and notification client."""
        self._sql_engine = sql_engine

    def update_run_state(
        self,
        run_id: str,
        summary: StateSummary,
        commands: List[Command],
        run_time_parameters: List[RunTimeParameter],
    ) -> RunResource:
        """Update the run's state summary and commands list.

        Args:
            run_id: The run to update
            summary: The run's equipment and status summary.
            commands: The run's commands.
            run_time_parameters: The run's run time parameters, if any.

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
                    run_time_parameters=run_time_parameters,
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
                        "command_intent": str(command.intent.value)
                        if command.intent
                        else CommandIntent.PROTOCOL,
                        "command_error": pydantic_to_json(command.error)
                        if command.error
                        else None,
                        "command_status": _convert_commands_status_to_sql_command_status(
                            command.status
                        ),
                    },
                )

            run_row = transaction.execute(select_run_resource).one()
            action_rows = transaction.execute(select_actions).all()

        self._clear_caches()
        maybe_run_resource = _convert_row_to_run(row=run_row, action_rows=action_rows)
        if not maybe_run_resource.ok:
            raise maybe_run_resource.error
        return maybe_run_resource

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

    def get_all_csv_rtp(self) -> List[CSVParameterRunResource]:
        """Get all of the csv rtp from the run_csv_rtp_table."""
        select_all_csv_rtp = sqlalchemy.select(run_csv_rtp_table).order_by(
            sqlite_rowid.asc()
        )

        with self._sql_engine.begin() as transaction:
            csv_rtps = transaction.execute(select_all_csv_rtp).all()

        return [_convert_row_to_csv_rtp(row) for row in csv_rtps]

    def insert_csv_rtp(
        self, run_id: str, run_time_parameters: List[RunTimeParameter]
    ) -> None:
        """Save csv rtp to the run_csv_rtp_table."""
        insert_csv_rtp = sqlalchemy.insert(run_csv_rtp_table)

        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)
            for run_time_param in run_time_parameters:
                if run_time_param.type == "csv_file":
                    transaction.execute(
                        insert_csv_rtp,
                        {
                            "run_id": run_id,
                            "parameter_variable_name": run_time_param.variableName,
                            "file_id": run_time_param.file.id
                            if run_time_param.file
                            else None,
                        },
                    )

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
            ok=True,
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
        return run

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def has(self, run_id: str) -> bool:
        """Whether a given run exists in the store."""
        with self._sql_engine.begin() as transaction:
            return self._run_exists(run_id, transaction)

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get(self, run_id: str) -> Union[RunResource, BadRunResource]:
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
    def get_all(
        self, length: Optional[int] = None
    ) -> List[Union[RunResource, BadRunResource]]:
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
    def get_state_summary(self, run_id: str) -> Union[StateSummary, BadStateSummary]:
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
                else BadStateSummary(
                    dataError=InvalidStoredData(
                        message="There was no engine state data for this run."
                    )
                )
            )
        except ValidationError as e:
            log.warning(f"Error retrieving state summary for {run_id}", exc_info=True)
            return BadStateSummary(
                dataError=InvalidStoredData(
                    message="Could not load stored StateSummary",
                    wrapping=[PythonException(e)],
                )
            )

    @lru_cache(maxsize=_CACHE_ENTRIES)
    def get_run_time_parameters(self, run_id: str) -> List[RunTimeParameter]:
        """Get the archived run time parameters.

        This is a list of the run's parameter definitions (if any),
        including the values used in the run itself, along with the default value,
        constraints and associated names and descriptions.
        """
        select_run_data = sqlalchemy.select(run_table.c.run_time_parameters).where(
            run_table.c.id == run_id
        )

        with self._sql_engine.begin() as transaction:
            row = transaction.execute(select_run_data).one()

        try:
            return (
                json_to_pydantic(_rtp_list_adapter, row.run_time_parameters)
                if row.run_time_parameters is not None
                else []
            )
        except ValidationError:
            log.warning(
                f"Error retrieving run time parameters for {run_id}", exc_info=True
            )
            return []

    def get_commands_slice(
        self,
        run_id: str,
        length: int,
        cursor: Optional[int],
        include_fixit_commands: bool,
    ) -> CommandSlice:
        """Get a slice of run commands from the store.

        Args:
            run_id: Run ID to pull commands from.
            length: Number of commands to return.
            cursor: The starting index of the slice in the whole collection.
                If `None`, up to `length` elements at the end of the collection will
                be returned.
            include_fixit_commands: Wether we should include fixit command intent in the result.

        Returns:
            A collection of commands as well as the actual cursor used and
            the total length of the collection.

        Raises:
            RunNotFoundError: The given run ID was not found.
        """
        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            if include_fixit_commands:
                select_count = sqlalchemy.select(sqlalchemy.func.count()).where(
                    run_command_table.c.run_id == run_id
                )
            else:
                select_count = sqlalchemy.select(sqlalchemy.func.count()).where(
                    and_(
                        run_command_table.c.run_id == run_id,
                        run_command_table.c.command_intent != "fixit",
                    )
                )
            count_result: int = transaction.execute(select_count).scalar_one()

            actual_cursor = cursor if cursor is not None else count_result - length
            # Clamp to [0, count_result).
            actual_cursor = max(0, min(actual_cursor, count_result - 1))
            if include_fixit_commands:
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
            else:
                select_slice = (
                    sqlalchemy.select(
                        run_command_table.c.index_in_run, run_command_table.c.command
                    )
                    .where(
                        run_command_table.c.run_id == run_id,
                        run_command_table.c.index_in_run >= actual_cursor,
                        run_command_table.c.index_in_run < actual_cursor + length,
                        run_command_table.c.command_intent != "fixit",
                    )
                    .order_by(run_command_table.c.index_in_run)
                )
            slice_result = transaction.execute(select_slice).all()

        sliced_commands: List[Command] = [
            _parse_command(row.command) for row in slice_result
        ]

        return CommandSlice(
            cursor=actual_cursor,
            total_length=count_result,
            commands=sliced_commands,
        )

    def get_all_commands_as_preserialized_list(
        self, run_id: str, include_fixit_commands: bool
    ) -> List[str]:
        """Get all commands of the run as a list of strings of json command objects."""
        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)
            # TODO (tz, 8-21-24): consolidate into 1 query.
            if include_fixit_commands:
                select_commands = (
                    sqlalchemy.select(run_command_table.c.command)
                    .where(run_command_table.c.run_id == run_id)
                    .order_by(run_command_table.c.index_in_run)
                )
            else:
                select_commands = (
                    sqlalchemy.select(run_command_table.c.command)
                    .where(
                        and_(run_command_table.c.run_id == run_id),
                        run_command_table.c.command_intent != "fixit",
                    )
                    .order_by(run_command_table.c.index_in_run)
                )
            commands_result = transaction.scalars(select_commands).all()
        return commands_result

    def get_command_errors_count(self, run_id: str) -> int:
        """Get run commands errors count from the store.

        Args:
            run_id: Run ID to pull commands from.

        Returns:
            The number of commands errors.

        Raises:
            RunNotFoundError: The given run ID was not found.
        """
        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            select_count = sqlalchemy.select(sqlalchemy.func.count()).where(
                and_(
                    run_command_table.c.run_id == run_id,
                    run_command_table.c.command_status == CommandStatusSQLEnum.FAILED,
                )
            )
            errors_count: int = transaction.execute(select_count).scalar_one()
            return errors_count

    def get_commands_errors_slice(
        self,
        run_id: str,
        length: int,
        cursor: Optional[int],
    ) -> CommandErrorSlice:
        """Get a slice of run commands errors from the store.

        Args:
            run_id: Run ID to pull commands from.
            length: Number of commands to return.
            cursor: The starting index of the slice in the whole collection.
                If `None`, up to `length` elements at the end of the collection will
                be returned.

        Returns:
            A collection of command errors as well as the actual cursor used and
            the total length of the collection.

        Raises:
            RunNotFoundError: The given run ID was not found.
        """
        with self._sql_engine.begin() as transaction:
            if not self._run_exists(run_id, transaction):
                raise RunNotFoundError(run_id=run_id)

            select_count = sqlalchemy.select(sqlalchemy.func.count()).where(
                and_(
                    run_command_table.c.run_id == run_id,
                    run_command_table.c.command_status == CommandStatusSQLEnum.FAILED,
                )
            )
            count_result: int = transaction.execute(select_count).scalar_one()

            actual_cursor = cursor if cursor is not None else count_result - length
            # Clamp to [0, count_result).
            # cursor is 0 based index and row number starts from 1.
            actual_cursor = max(0, min(actual_cursor, count_result - 1)) + 1
            select_command_errors = (
                sqlalchemy.select(
                    sqlalchemy.func.row_number().over().label("row_num"),
                    run_command_table,
                )
                .where(
                    and_(
                        run_command_table.c.run_id == run_id,
                        run_command_table.c.command_status
                        == CommandStatusSQLEnum.FAILED,
                    )
                )
                .order_by(run_command_table.c.index_in_run)
                .subquery()
            )

            select_slice = (
                sqlalchemy.select(select_command_errors.c.command_error)
                .where(
                    and_(
                        select_command_errors.c.row_num >= actual_cursor,
                        select_command_errors.c.row_num < actual_cursor + length,
                    )
                )
                .order_by(select_command_errors.c.index_in_run)
            )
            slice_result = transaction.execute(select_slice).all()

        sliced_commands: List[ErrorOccurrence] = [
            json_to_pydantic(ErrorOccurrence, row.command_error) for row in slice_result
        ]

        return CommandErrorSlice(
            cursor=actual_cursor,
            total_length=count_result,
            commands_errors=sliced_commands,
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

        return _parse_command(command)

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
        delete_csv_rtps = sqlalchemy.delete(run_csv_rtp_table).where(
            run_csv_rtp_table.c.run_id == run_id
        )
        with self._sql_engine.begin() as transaction:
            transaction.execute(delete_actions)
            transaction.execute(delete_commands)
            transaction.execute(delete_csv_rtps)
            result = transaction.execute(delete_run)

        if result.rowcount < 1:
            raise RunNotFoundError(run_id)

        self._clear_caches()

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
        self.get_run_time_parameters.cache_clear()


# The columns that must be present in a row passed to _convert_row_to_run().
_run_columns = [run_table.c.id, run_table.c.protocol_id, run_table.c.created_at]


def _convert_row_to_csv_rtp(
    row: sqlalchemy.engine.Row,
) -> CSVParameterRunResource:
    run_id = row.run_id
    parameter_variable_name = row.parameter_variable_name
    file_id = row.file_id

    assert isinstance(run_id, str)
    assert isinstance(parameter_variable_name, str)
    assert isinstance(file_id, str) or file_id is None

    return CSVParameterRunResource(
        run_id=run_id, parameter_variable_name=parameter_variable_name, file_id=file_id
    )


def _convert_row_to_run(
    row: sqlalchemy.engine.Row,
    action_rows: List[sqlalchemy.engine.Row],
) -> Union[RunResource, BadRunResource]:
    run_id = row.id
    protocol_id = row.protocol_id
    created_at = row.created_at
    # Checking the fundamental data types here are not covered by the error handling
    # because if they fire, the only thing we can do to address the issue is immediately
    # delete the row while we still have a handle on it from sql - we won't have any
    # other way to delete it. It's also unclear how it could happen without the table schema
    # changing out from under us.
    assert isinstance(run_id, str), f"Run ID {run_id} is not a string"
    assert protocol_id is None or isinstance(
        protocol_id, str
    ), f"Protocol ID {protocol_id} is not a string or None"
    try:
        actions = [
            RunAction(
                id=action_row.id,
                createdAt=action_row.created_at,
                actionType=RunActionType(action_row.action_type),
            )
            for action_row in action_rows
        ]
    except Exception as be:
        log.warning("Error reading actions for run ID {run_id}:", exc_info=True)
        return BadRunResource(
            ok=False,
            run_id=run_id,
            created_at=created_at,
            protocol_id=protocol_id,
            actions=[],
            error=InvalidStoredData(
                message="This run has invalid or unknown actions. It has likely been saved in a future version of software.",
                detail={"kind": "bad-actions"},
                wrapping=[PythonException(be)],
            ),
        )

    return RunResource(
        ok=True,
        run_id=run_id,
        created_at=created_at,
        protocol_id=protocol_id,
        actions=actions,
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
    run_time_parameters: List[RunTimeParameter],
) -> Dict[str, object]:
    return {
        "state_summary": pydantic_to_json(state_summary),
        "engine_status": engine_status,
        "_updated_at": utc_now(),
        "run_time_parameters": pydantic_list_to_json(run_time_parameters),
    }


def _parse_command(json_str: str) -> Command:
    """Parse a JSON string from the database into a `Command`."""
    return json_to_pydantic(CommandAdapter, json_str)


def _convert_commands_status_to_sql_command_status(
    status: CommandStatus,
) -> CommandStatusSQLEnum:
    match status:
        case CommandStatus.QUEUED:
            return CommandStatusSQLEnum.QUEUED
        case CommandStatus.RUNNING:
            return CommandStatusSQLEnum.RUNNING
        case CommandStatus.FAILED:
            return CommandStatusSQLEnum.FAILED
        case CommandStatus.SUCCEEDED:
            return CommandStatusSQLEnum.SUCCEEDED
