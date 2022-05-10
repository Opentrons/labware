"""Runs' on-db store."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import parse_obj_as
import sqlalchemy

from robot_server.persistence import run_table, action_table, ensure_utc_datetime
from robot_server.protocols import ProtocolNotFoundError

from opentrons.protocol_engine import ProtocolRunData
from opentrons.protocol_engine.commands import Command

from .action_models import RunAction, RunActionType


@dataclass(frozen=True)
class RunResource:
    """An entry in the run store, used to construct response models.

    This represents all run state that cannot be derived from another
    location, such as a ProtocolEngine instance.
    """

    run_id: str
    protocol_id: Optional[str]
    created_at: datetime
    actions: List[RunAction]
    is_current: bool


@dataclass(frozen=True)
class RunStateResource:
    """An entry in the run state store, used to construct response models.

    This represents all run engine state derived from ProtocolEngine instance.
    """

    run_id: str
    state: ProtocolRunData
    # TODO (tz): initialize with factory default
    commands: Optional[List[Command]]
    engine_status: str
    _updated_at: Optional[datetime]


class RunNotFoundError(ValueError):
    """Error raised when a given Run ID is not found in the store."""

    def __init__(self, run_id: str) -> None:
        """Initialize the error message from the missing ID."""
        super().__init__(f"Run {run_id} was not found.")


class RunStore:
    """Methods for storing and retrieving run resources."""

    def __init__(self, sql_engine: sqlalchemy.engine.Engine) -> None:
        """Initialize a RunStore with sql engine."""
        self._sql_engine = sql_engine
        self._active_run: Optional[str] = None

    def update_run_state(self, state: RunStateResource) -> RunStateResource:
        """Update run table with run state to db.

        Arguments:
            state: Engine state resource to store.

        Returns:
            The engine state that was added to the store.
        """
        statement = (
            sqlalchemy.update(run_table)
            .where(run_table.c.id == state.run_id)
            .values(_convert_state_to_sql_values(state=state))
        )
        with self._sql_engine.begin() as transaction:
            result = transaction.execute(statement)
            if result.rowcount == 0:
                raise RunNotFoundError(run_id=state.run_id)

        return state

    def get_run_state(self, run_id: str) -> RunStateResource:
        """Get engine state from db.

        Arguments:
            run_id: Run id related to the engine state.

        Returns:
            The engine state that found in the store.
        """
        statement = sqlalchemy.select(run_table).where(run_table.c.id == run_id)
        with self._sql_engine.begin() as transaction:
            try:
                state_row = transaction.execute(statement).one()
            except sqlalchemy.exc.NoResultFound:
                raise RunNotFoundError(run_id=run_id)
        return _convert_sql_row_to_sql_run_state(state_row)

    def get_run_data(self, run_id: str) -> ProtocolRunData:
        """Get the archived run data of a run."""
        raise NotImplementedError("TODO")

    def get_run_commands(self, run_id: str) -> List[Command]:
        """Get the archived commands list of a run."""
        raise NotImplementedError("TODO")

    def insert_action(self, run_id: str, action: RunAction) -> None:
        """Insert run action in the db.

        Arguments:
            run_id: current run id to get
            action: action to insert into the db
        """
        with self._sql_engine.begin() as transaction:
            try:
                _insert_action_no_transaction(run_id, action, transaction)
            except sqlalchemy.exc.IntegrityError:
                raise RunNotFoundError(run_id=run_id)

    def update_active_run(self, run_id: str, is_current: bool) -> RunResource:
        """Update current active run resource in memory.

        Arguments:
            run_id: run to update
            is_current: is run active or not

        Returns:
            The resource that was updated.
        """
        # TODO (tz 4-13-22): Check if run exists before setting the current run.
        if is_current is True:
            self._active_run = run_id
        elif is_current is False and self._active_run == run_id:
            self._active_run = None
        return self.get(run_id)

    def insert(self, run: RunResource) -> RunResource:
        """Insert run resource in the db.

        Arguments:
            run: Run resource to store.

        Returns:
            The resource that was added to the store.
        """
        statement = sqlalchemy.insert(run_table).values(
            _convert_run_to_sql_values(run=run)
        )
        with self._sql_engine.begin() as transaction:
            try:
                transaction.execute(statement)
            except sqlalchemy.exc.IntegrityError:
                assert (
                    run.protocol_id is not None
                ), "Insert run failed due to unexpected IntegrityError"
                raise ProtocolNotFoundError(protocol_id=run.protocol_id)

        self.update_active_run(run_id=run.run_id, is_current=run.is_current)

        return run

    def get(self, run_id: str) -> RunResource:
        """Get a specific run entry by its identifier.

        Arguments:
            run_id: Unique identifier of run entry to retrieve.

        Returns:
            The retrieved run entry from the db.
        """
        statement = sqlalchemy.select(run_table).where(run_table.c.id == run_id)
        with self._sql_engine.begin() as transaction:
            try:
                row_run = transaction.execute(statement).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise RunNotFoundError(run_id) from e

            actions = _get_actions_no_transaction(run_id, transaction)
            run = _convert_sql_row_to_run(
                row_run,
                [_convert_sql_row_to_action(action) for action in actions],
                self._active_run,
            )
        return run

    def get_all(self) -> List[RunResource]:
        """Get all known run resources.

        Returns:
            All stored run entries.
        """
        statement = sqlalchemy.select(run_table)
        with self._sql_engine.begin() as transaction:
            runs = transaction.execute(statement).all()
            return [
                _convert_sql_row_to_run(
                    sql_row=row,
                    actions=[
                        _convert_sql_row_to_action(sql_row=row)
                        for row in _get_actions_no_transaction(row.id, transaction)
                    ],
                    current_run_id=self._active_run,
                )
                for row in runs
            ]

    def remove(self, run_id: str) -> RunResource:
        """Remove a run by its unique identifier.

        Arguments:
            run_id: The run's unique identifier.

        Returns:
            The run entry that was deleted.

        Raises:
            RunNotFoundError: The specified run ID was not found.
        """
        select_run_statement = sqlalchemy.select(run_table).where(
            run_table.c.id == run_id
        )
        select_action_statement = sqlalchemy.select(action_table).where(
            action_table.c.run_id == run_id
        )
        delete_run_statement = sqlalchemy.delete(run_table).where(
            run_table.c.id == run_id
        )
        delete_actions_statement = sqlalchemy.delete(action_table).where(
            action_table.c.run_id == run_id
        )
        with self._sql_engine.begin() as transaction:
            try:
                # SQLite <3.35.0 doesn't support the RETURNING clause,
                # so we do it ourselves with a separate SELECT.
                row_to_delete = transaction.execute(select_run_statement).one()
            except sqlalchemy.exc.NoResultFound as e:
                raise RunNotFoundError(run_id) from e
            actions = transaction.execute(select_action_statement).all()
            transaction.execute(delete_actions_statement)
            transaction.execute(delete_run_statement)
        return _convert_sql_row_to_run(
            row_to_delete,
            [_convert_sql_row_to_action(action) for action in actions],
            self._active_run,
        )


def _get_actions_no_transaction(
    run_id: str, transaction: sqlalchemy.engine.Connection
) -> List[sqlalchemy.engine.Row]:
    statement = action_table.select().where(action_table.c.run_id == run_id)
    return transaction.execute(statement).all()


def _insert_action_no_transaction(
    run_id: str, action: RunAction, transaction: sqlalchemy.engine.Connection
) -> None:
    transaction.execute(
        sqlalchemy.insert(action_table),
        _convert_action_to_sql_values(run_id=run_id, action=action),
    )


def _convert_sql_row_to_run(
    sql_row: sqlalchemy.engine.Row,
    actions: List[RunAction],
    current_run_id: Optional[str],
) -> RunResource:
    run_id = sql_row.id
    protocol_id = sql_row.protocol_id
    created_at = ensure_utc_datetime(sql_row.created_at)

    assert isinstance(run_id, str), f"Run ID {run_id} is not a string"
    assert protocol_id is None or isinstance(
        protocol_id, str
    ), f"Protocol ID {protocol_id} is not a string or None"

    is_current = current_run_id == run_id

    return RunResource(
        run_id=run_id,
        created_at=created_at,
        actions=actions,
        protocol_id=protocol_id,
        is_current=is_current,
    )


def _convert_run_to_sql_values(run: RunResource) -> Dict[str, object]:
    return {
        "id": run.run_id,
        "created_at": ensure_utc_datetime(run.created_at),
        "protocol_id": run.protocol_id,
    }


def _convert_sql_row_to_action(sql_row: sqlalchemy.engine.Row) -> RunAction:
    # rely on Pydantic and Enum to raise if data shapes are wrong
    return RunAction(
        id=sql_row.id,
        createdAt=ensure_utc_datetime(sql_row.created_at),
        actionType=RunActionType(sql_row.action_type),
    )


def _convert_action_to_sql_values(action: RunAction, run_id: str) -> Dict[str, object]:
    return {
        "id": action.id,
        "created_at": ensure_utc_datetime(action.createdAt),
        "action_type": action.actionType.value,
        "run_id": run_id,
    }


def _convert_sql_row_to_sql_run_state(
    sql_row: sqlalchemy.engine.Row,
) -> RunStateResource:

    run_id = sql_row.run_id
    assert isinstance(run_id, str)

    status = sql_row.engine_status
    assert isinstance(status, str)

    state = sql_row.state
    assert isinstance(state, Dict)

    # TODO (tz): set sql_row.commands add assert
    commands: List[Command] = []

    _updated_at = ensure_utc_datetime(sql_row._updated_at)

    return RunStateResource(
        run_id=run_id,
        state=parse_obj_as(ProtocolRunData, state),
        engine_status=status,
        commands=commands,
        _updated_at=_updated_at,
    )


def _convert_state_to_sql_values(state: RunStateResource) -> Dict[str, object]:
    return {
        "state": state.state.dict(),
        "engine_status": state.engine_status,
        "_updated_at": ensure_utc_datetime(
            state._updated_at
            if state._updated_at is not None
            else datetime.now(tz=timezone.utc)
        ),
    }
