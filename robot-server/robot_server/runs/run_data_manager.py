"""Manage current and historical run data."""

from datetime import datetime
from typing import Dict, List, Optional, Callable, Union, Mapping, Sequence

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.errors.exceptions import InvalidStoredData, EnumeratedError

from opentrons.types import NozzleMapInterface
from opentrons.protocol_engine import (
    EngineStatus,
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    StateSummary,
    CommandSlice,
    CommandErrorSlice,
    CommandPointer,
    Command,
)
from opentrons.protocol_engine.types import (
    PrimitiveRunTimeParamValuesType,
    CSVRuntimeParamPaths,
)

from robot_server.error_recovery.settings.store import ErrorRecoverySettingStore
from robot_server.protocols.protocol_store import ProtocolResource
from robot_server.service.task_runner import TaskRunner
from robot_server.service.notifications import RunsPublisher
from . import error_recovery_mapping
from .error_recovery_models import ErrorRecoveryRule

from .run_orchestrator_store import RunOrchestratorStore
from .run_store import RunResource, RunStore, BadRunResource, BadStateSummary
from .run_models import Run, BadRun, RunDataError

from opentrons.protocol_engine.types import DeckConfigurationType, RunTimeParameter
from opentrons.protocol_engine.resources.file_provider import FileProvider


_INITIAL_ERROR_RECOVERY_RULES: list[ErrorRecoveryRule] = []


def _build_run(
    run_resource: Union[RunResource, BadRunResource],
    state_summary: Union[StateSummary, BadStateSummary],
    current: bool,
    run_time_parameters: List[RunTimeParameter],
) -> Union[Run, BadRun]:
    # TODO(mc, 2022-05-16): improve persistence strategy
    # such that this default summary object is not needed

    if run_resource.ok and isinstance(state_summary, StateSummary):
        return Run.model_construct(
            id=run_resource.run_id,
            protocolId=run_resource.protocol_id,
            createdAt=run_resource.created_at,
            actions=run_resource.actions,
            status=state_summary.status,
            errors=state_summary.errors,
            hasEverEnteredErrorRecovery=state_summary.hasEverEnteredErrorRecovery,
            labware=state_summary.labware,
            labwareOffsets=state_summary.labwareOffsets,
            pipettes=state_summary.pipettes,
            modules=state_summary.modules,
            current=current,
            completedAt=state_summary.completedAt,
            startedAt=state_summary.startedAt,
            liquids=state_summary.liquids,
            liquidClasses=state_summary.liquidClasses,
            outputFileIds=state_summary.files,
            runTimeParameters=run_time_parameters,
        )

    errors: List[EnumeratedError] = []
    if isinstance(state_summary, BadStateSummary):
        state = StateSummary.model_construct(
            status=EngineStatus.STOPPED,
            errors=[],
            labware=[],
            labwareOffsets=[],
            pipettes=[],
            modules=[],
            liquids=[],
            liquidClasses=[],
            wells=[],
            files=[],
            hasEverEnteredErrorRecovery=False,
        )
        errors.append(state_summary.dataError)
    else:
        state = state_summary
    if not run_resource.ok:
        errors.append(run_resource.error)

    if len(errors) > 1:
        run_loading_error = RunDataError.from_exc(
            InvalidStoredData(
                message=(
                    "Data on this run is not valid. The run may have been "
                    "created on a future software version."
                ),
                wrapping=errors,
            )
        )
    elif errors:
        run_loading_error = RunDataError.from_exc(errors[0])
    else:
        # We should never get here
        run_loading_error = RunDataError.from_exc(
            AssertionError("Logic error in parsing invalid run.")
        )

    return BadRun.model_construct(
        dataError=run_loading_error,
        id=run_resource.run_id,
        protocolId=run_resource.protocol_id,
        createdAt=run_resource.created_at,
        actions=run_resource.actions,
        status=state.status,
        errors=state.errors,
        labware=state.labware,
        labwareOffsets=state.labwareOffsets,
        pipettes=state.pipettes,
        modules=state.modules,
        current=current,
        completedAt=state.completedAt,
        startedAt=state.startedAt,
        liquids=state.liquids,
        liquidClasses=state.liquidClasses,
        runTimeParameters=run_time_parameters,
        outputFileIds=state.files,
        hasEverEnteredErrorRecovery=state.hasEverEnteredErrorRecovery,
    )


class RunNotCurrentError(ValueError):
    """Error raised when a requested run is not the current run."""


class PreSerializedCommandsNotAvailableError(LookupError):
    """Error raised when a run's commands are not available as pre-serialized list of commands."""


class RunDataManager:
    """Collaborator to manage current and historical run data.

    Provides a facade to both a RunOrchestratorStore (current run) and a RunStore
    (historical runs). Returns `Run` response models to the router.

    Args:
        run_orchestrator_store: In-memory store of the current run's ProtocolEngine.
        run_store: Persistent database of current and historical run data.
    """

    def __init__(
        self,
        run_orchestrator_store: RunOrchestratorStore,
        run_store: RunStore,
        error_recovery_setting_store: ErrorRecoverySettingStore,
        task_runner: TaskRunner,
        runs_publisher: RunsPublisher,
    ) -> None:
        self._run_orchestrator_store = run_orchestrator_store
        self._run_store = run_store

        self._error_recovery_setting_store = error_recovery_setting_store
        # todo(mm, 2024-11-22): Storing the list of error recovery rules is outside the
        # responsibilities of this class. It's also clunky for us to store it like this
        # because we need to remember to clear it whenever the current run changes.
        # This error recovery mapping stuff probably belongs in RunOrchestratorStore.
        self._current_run_error_recovery_rules: List[ErrorRecoveryRule] = []

        self._task_runner = task_runner
        self._runs_publisher = runs_publisher

    @property
    def current_run_id(self) -> Optional[str]:
        """The identifier of the current run, if any."""
        return self._run_orchestrator_store.current_run_id

    async def create(
        self,
        run_id: str,
        created_at: datetime,
        labware_offsets: Sequence[LabwareOffsetCreate | LegacyLabwareOffsetCreate],
        deck_configuration: DeckConfigurationType,
        file_provider: FileProvider,
        run_time_param_values: Optional[PrimitiveRunTimeParamValuesType],
        run_time_param_paths: Optional[CSVRuntimeParamPaths],
        notify_publishers: Callable[[], None],
        protocol: Optional[ProtocolResource],
    ) -> Union[Run, BadRun]:
        """Create a new, current run.

        Args:
            run_id: Identifier to assign the new run.
            created_at: Creation datetime.
            labware_offsets: Labware offsets to initialize the engine with.
            deck_configuration: A mapping of fixtures to cutout fixtures the deck will be loaded with.
            notify_publishers: Utilized by the engine to notify publishers of state changes.
            run_time_param_values: Any runtime parameter values to set.
            run_time_param_paths: Any runtime filepath to set.
            protocol: The protocol to load the runner with, if any.

        Returns:
            The run resource.

        Raise:
            RunConflictError: There is a currently active run that cannot
                be superceded by this new run.
        """
        prev_run_id = self._run_orchestrator_store.current_run_id
        if prev_run_id is not None:
            # Allow clear() to propagate RunConflictError.
            prev_run_result = await self._run_orchestrator_store.clear()
            self._run_store.update_run_state(
                run_id=prev_run_id,
                summary=prev_run_result.state_summary,
                commands=prev_run_result.commands,
                run_time_parameters=prev_run_result.parameters,
            )

        error_recovery_is_enabled = self._error_recovery_setting_store.get_is_enabled()
        self._current_run_error_recovery_rules = _INITIAL_ERROR_RECOVERY_RULES
        initial_error_recovery_policy = (
            error_recovery_mapping.create_error_recovery_policy_from_rules(
                self._current_run_error_recovery_rules, error_recovery_is_enabled
            )
        )

        state_summary = await self._run_orchestrator_store.create(
            run_id=run_id,
            labware_offsets=labware_offsets,
            initial_error_recovery_policy=initial_error_recovery_policy,
            deck_configuration=deck_configuration,
            file_provider=file_provider,
            protocol=protocol,
            run_time_param_values=run_time_param_values,
            run_time_param_paths=run_time_param_paths,
            notify_publishers=notify_publishers,
        )
        run_resource = self._run_store.insert(
            run_id=run_id,
            created_at=created_at,
            protocol_id=protocol.protocol_id if protocol is not None else None,
        )
        run_time_parameters = self._run_orchestrator_store.get_run_time_parameters()
        self._run_store.insert_csv_rtp(
            run_id=run_id, run_time_parameters=run_time_parameters
        )

        self._runs_publisher.start_publishing_for_run(
            get_current_command=self.get_current_command,
            get_recovery_target_command=self.get_recovery_target_command,
            get_state_summary=self._get_good_state_summary,
            run_id=run_id,
        )

        return _build_run(
            run_resource=run_resource,
            state_summary=state_summary,
            current=True,
            run_time_parameters=run_time_parameters,
        )

    def get(self, run_id: str) -> Union[Run, BadRun]:
        """Get a run resource.

        This method will pull from the current run or the historical runs,
        depending on if `run_id` refers to the current run.

        Args:
            run_id: The identifier of the run to return.

        Returns:
            The run resource.

        Raises:
            RunNotFoundError: The given run identifier does not exist.
        """
        run_resource = self._run_store.get(run_id=run_id)
        state_summary = self._get_state_summary(run_id=run_id)
        parameters = self._get_run_time_parameters(run_id=run_id)
        current = run_id == self._run_orchestrator_store.current_run_id

        return _build_run(run_resource, state_summary, current, parameters)

    def get_run_loaded_labware_definitions(
        self, run_id: str
    ) -> List[LabwareDefinition]:
        """Get a run's load labware definitions.

        This method will get the labware definitions loaded by loadLabware commands for the current run
        depending on if `run_id` refers to the current run.

        Args:
            run_id: The identifier of the run to return.

        Returns:
            The run's loaded labware definitions.

        Raises:
            RunNotCurrentError: The given run identifier is not the current run.
        """
        # The database doesn't store runs' loaded labware definitions in a way that we
        # can query quickly. Avoid it by only supporting this on in-memory runs.
        if run_id != self._run_orchestrator_store.current_run_id:
            raise RunNotCurrentError(
                f"Cannot get load labware definitions of {run_id} because it is not the current run."
            )

        return self._run_orchestrator_store.get_loaded_labware_definitions()

    def get_all(self, length: Optional[int]) -> List[Union[Run, BadRun]]:
        """Get current and stored run resources.

        Results are ordered from oldest to newest.

        Params:
            length: If `None`, return all runs. Otherwise, return the newest n runs.
        """
        return [
            _build_run(
                run_resource=run_resource,
                state_summary=self._get_state_summary(run_resource.run_id),
                current=run_resource.run_id
                == self._run_orchestrator_store.current_run_id,
                run_time_parameters=self._get_run_time_parameters(run_resource.run_id),
            )
            for run_resource in self._run_store.get_all(length)
        ]

    async def delete(self, run_id: str) -> None:
        """Delete a current or historical run.

        Args:
            run_id: The identifier of the run to remove.

        Raises:
            RunConflictError: If deleting the current run, the current run
                is not idle and cannot be deleted.
            RunNotFoundError: The given run identifier was not found in the database.
        """
        if run_id == self._run_orchestrator_store.current_run_id:
            await self._run_orchestrator_store.clear()

        self._runs_publisher.clean_up_run(run_id=run_id)

        self._run_store.remove(run_id=run_id)

    async def update(self, run_id: str, current: Optional[bool]) -> Union[Run, BadRun]:
        """Get and potentially archive the current run.

        Args:
            run_id: The run to get and maybe archive.
            current: Whether to mark the run as current or not.
                     If `current` set to False, then the run is 'un-current'ed by
                     stopping the run, saving the final run data to the run store,
                     and clearing the engine and runner.
                     If 'current' is True or not specified, we simply fetch the run's
                     data from memory and database.

        Returns:
            The updated run.

        Raises:
            RunNotFoundError: The run identifier was not found in the database.
            RunNotCurrentError: The run is not the current run.
            RunConflictError: The run cannot be updated because it is not idle.
        """
        if run_id != self._run_orchestrator_store.current_run_id:
            raise RunNotCurrentError(
                f"Cannot update {run_id} because it is not the current run."
            )

        next_current = current if current is False else True

        if next_current is False:
            run_result = await self._run_orchestrator_store.clear()
            state_summary = run_result.state_summary
            parameters = run_result.parameters
            run_resource: Union[
                RunResource, BadRunResource
            ] = self._run_store.update_run_state(
                run_id=run_id,
                summary=run_result.state_summary,
                commands=run_result.commands,
                run_time_parameters=run_result.parameters,
            )
            self._runs_publisher.publish_pre_serialized_commands_notification(run_id)
        else:
            state_summary = self._run_orchestrator_store.get_state_summary()
            parameters = self._run_orchestrator_store.get_run_time_parameters()
            run_resource = self._run_store.get(run_id=run_id)

        self._runs_publisher.publish_runs_advise_refetch(run_id)

        return _build_run(
            run_resource=run_resource,
            state_summary=state_summary,
            current=next_current,
            run_time_parameters=parameters,
        )

    def get_commands_slice(
        self,
        run_id: str,
        cursor: Optional[int],
        length: int,
        include_fixit_commands: bool,
    ) -> CommandSlice:
        """Get a slice of run commands.

        Args:
            run_id: ID of the run.
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.
            include_fixit_commands: Include fixit commands.

        Raises:
            RunNotFoundError: The given run identifier was not found in the database.
        """
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_command_slice(
                cursor=cursor,
                length=length,
                include_fixit_commands=include_fixit_commands,
            )

        # Let exception propagate
        return self._run_store.get_commands_slice(
            run_id=run_id, cursor=cursor, length=length, include_fixit_commands=True
        )

    def get_command_error_slice(
        self, run_id: str, cursor: int, length: int
    ) -> CommandErrorSlice:
        """Get a slice of run commands errors.

        Args:
            run_id: ID of the run.
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.

        Raises:
            RunNotCurrentError: The given run identifier is not the current run.
        """
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_command_error_slice(
                cursor=cursor, length=length
            )
        return self._run_store.get_commands_errors_slice(
            run_id=run_id, cursor=cursor, length=length
        )

    def get_current_command(self, run_id: str) -> Optional[CommandPointer]:
        """Get the "current" command, if any.

        See `ProtocolEngine.state_view.commands.get_current()` for the definition
        of "current."

        Args:
            run_id: ID of the run.
        """
        if self._run_orchestrator_store.current_run_id == run_id:
            return self._run_orchestrator_store.get_current_command()
        else:
            return self._get_historical_run_last_command(run_id=run_id)

    def get_last_completed_command(self, run_id: str) -> Optional[CommandPointer]:
        """Get the "last" command, if any.

        See `ProtocolEngine.state_view.commands.get_most_recently_finalized_command()` for the definition of "last."

        Args:
            run_id: ID of the run.
        """
        if self._run_orchestrator_store.current_run_id == run_id:
            return self._run_orchestrator_store.get_most_recently_finalized_command()
        else:
            return self._get_historical_run_last_command(run_id=run_id)

    def get_recovery_target_command(self, run_id: str) -> Optional[CommandPointer]:
        """Get the current error recovery target.

        See `ProtocolEngine.state_view.commands.get_recovery_target()`.

        Args:
            run_id: ID of the run.
        """
        if self._run_orchestrator_store.current_run_id == run_id:
            return self._run_orchestrator_store.get_command_recovery_target()
        else:
            # Historical runs can't have any ongoing error recovery.
            return None

    def get_command(self, run_id: str, command_id: str) -> Command:
        """Get a run's command by ID.

        Args:
            run_id: ID of the run.
            command_id: ID of the command.

        Raises:
            RunNotFoundError: The given run identifier was not found.
            CommandNotFoundError: The given command identifier was not found.
        """
        if self._run_orchestrator_store.current_run_id == run_id:
            return self._run_orchestrator_store.get_command(command_id=command_id)

        return self._run_store.get_command(run_id=run_id, command_id=command_id)

    def get_command_errors_count(self, run_id: str) -> int:
        """Get all command errors."""
        if run_id == self._run_orchestrator_store.current_run_id:
            return len(self._run_orchestrator_store.get_command_errors())
        return self._run_store.get_command_errors_count(run_id)

    def get_nozzle_maps(self, run_id: str) -> Mapping[str, NozzleMapInterface]:
        """Get current nozzle maps keyed by pipette id."""
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_nozzle_maps()

        raise RunNotCurrentError()

    def get_tip_attached(self, run_id: str) -> Dict[str, bool]:
        """Get current tip attached states, keyed by pipette id."""
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_tip_attached()

        raise RunNotCurrentError()

    def get_all_commands_as_preserialized_list(
        self, run_id: str, include_fixit_commands: bool
    ) -> List[str]:
        """Get all commands of a run in a serialized json list."""
        if (
            run_id == self._run_orchestrator_store.current_run_id
            and not self._run_orchestrator_store.get_is_run_terminal()
        ):
            raise PreSerializedCommandsNotAvailableError(
                "Pre-serialized commands are only available after a run has ended."
            )
        return self._run_store.get_all_commands_as_preserialized_list(
            run_id, include_fixit_commands
        )

    def set_error_recovery_rules(
        self, run_id: str, rules: List[ErrorRecoveryRule]
    ) -> None:
        """Set the run's error recovery policy, in robot-server terms.

        The input rules get combined with the global error recovery enabled/disabled
        setting, which this method retrieves automatically.
        """
        if run_id != self._run_orchestrator_store.current_run_id:
            raise RunNotCurrentError(
                f"Cannot update {run_id} because it is not the current run."
            )
        is_enabled = self._error_recovery_setting_store.get_is_enabled()
        self._current_run_error_recovery_rules = rules
        mapped_policy = error_recovery_mapping.create_error_recovery_policy_from_rules(
            self._current_run_error_recovery_rules, is_enabled
        )
        self._run_orchestrator_store.set_error_recovery_policy(policy=mapped_policy)

    def get_error_recovery_rules(self, run_id: str) -> List[ErrorRecoveryRule]:
        """Get the run's error recovery policy."""
        if run_id != self._run_orchestrator_store.current_run_id:
            raise RunNotCurrentError(
                f"Cannot get the error recovery policy of {run_id} because it is not the current run."
            )
        return self._current_run_error_recovery_rules

    def _get_state_summary(self, run_id: str) -> Union[StateSummary, BadStateSummary]:
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_state_summary()
        else:
            return self._run_store.get_state_summary(run_id=run_id)

    def _get_good_state_summary(self, run_id: str) -> Optional[StateSummary]:
        summary = self._get_state_summary(run_id)
        return summary if isinstance(summary, StateSummary) else None

    def _get_run_time_parameters(self, run_id: str) -> List[RunTimeParameter]:
        if run_id == self._run_orchestrator_store.current_run_id:
            return self._run_orchestrator_store.get_run_time_parameters()
        else:
            return self._run_store.get_run_time_parameters(run_id=run_id)

    def _get_historical_run_last_command(self, run_id: str) -> Optional[CommandPointer]:
        command_slice = self._run_store.get_commands_slice(
            run_id=run_id, cursor=None, length=1, include_fixit_commands=True
        )
        if not command_slice.commands:
            return None
        command = command_slice.commands[-1]

        return (
            CommandPointer(
                command_id=command.id,
                command_key=command.key,
                created_at=command.createdAt,
                index=command_slice.cursor,
            )
            if command
            else None
        )
