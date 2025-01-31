"""Manage current maintenance run data."""

from datetime import datetime
from typing import Optional, Callable, Sequence

from opentrons.protocol_engine import (
    EngineStatus,
    LegacyLabwareOffsetCreate,
    LabwareOffsetCreate,
    StateSummary,
    CommandSlice,
    CommandPointer,
    Command,
)

from .maintenance_run_orchestrator_store import MaintenanceRunOrchestratorStore
from .maintenance_run_models import MaintenanceRun, MaintenanceRunNotFoundError

from opentrons.protocol_engine.types import DeckConfigurationType

from robot_server.service.notifications import MaintenanceRunsPublisher


def _build_run(
    run_id: str,
    created_at: datetime,
    state_summary: Optional[StateSummary],
) -> MaintenanceRun:
    state_summary = state_summary or StateSummary.model_construct(
        status=EngineStatus.IDLE,
        errors=[],
        labware=[],
        labwareOffsets=[],
        pipettes=[],
        modules=[],
        liquids=[],
        wells=[],
        files=[],
        liquidClasses=[],
        hasEverEnteredErrorRecovery=False,
    )
    return MaintenanceRun.model_construct(
        id=run_id,
        createdAt=created_at,
        status=state_summary.status,
        actions=[],
        errors=state_summary.errors,
        labware=state_summary.labware,
        labwareOffsets=state_summary.labwareOffsets,
        pipettes=state_summary.pipettes,
        modules=state_summary.modules,
        current=True,
        completedAt=state_summary.completedAt,
        startedAt=state_summary.startedAt,
        liquids=state_summary.liquids,
        liquidClasses=state_summary.liquidClasses,
        hasEverEnteredErrorRecovery=state_summary.hasEverEnteredErrorRecovery,
    )


class RunNotCurrentError(ValueError):
    """Error raised when a requested run is not the current run."""


class MaintenanceRunDataManager:
    """Collaborator to manage current maintenance run data.

    Provides a facade to a MaintenanceRunOrchestratorStore.
    Returns `MaintenanceRun` response models to the router.

    Args:
        run_orchestrator_store: In-memory store of the current run's ProtocolEngine.
    """

    def __init__(
        self,
        run_orchestrator_store: MaintenanceRunOrchestratorStore,
        maintenance_runs_publisher: MaintenanceRunsPublisher,
    ) -> None:
        self._run_orchestrator_store = run_orchestrator_store
        self._maintenance_runs_publisher = maintenance_runs_publisher

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
        notify_publishers: Callable[[], None],
    ) -> MaintenanceRun:
        """Create a new, current maintenance run.

        Args:
            run_id: Identifier to assign the new run.
            created_at: Creation datetime.
            labware_offsets: Labware offsets to initialize the engine with.
            notify_publishers: Utilized by the engine to notify publishers of state changes.

        Returns:
            The run resource.
        """
        if self._run_orchestrator_store.current_run_id is not None:
            await self._run_orchestrator_store.clear()

        state_summary = await self._run_orchestrator_store.create(
            run_id=run_id,
            created_at=created_at,
            labware_offsets=labware_offsets,
            deck_configuration=deck_configuration,
            notify_publishers=notify_publishers,
        )

        maintenance_run_data = _build_run(
            run_id=run_id,
            created_at=created_at,
            state_summary=state_summary,
        )

        await self._maintenance_runs_publisher.start_publishing_for_maintenance_run(
            run_id=run_id, get_state_summary=self._get_state_summary
        )

        return maintenance_run_data

    def get(self, run_id: str) -> MaintenanceRun:
        """Get a maintenance run resource.

        Args:
            run_id: The identifier of the run to return.

        Returns:
            The run resource.

        Raises:
            RunNotCurrentError: The given run identifier does not exist.
        """
        current_id = self._run_orchestrator_store.current_run_id
        if current_id != run_id:
            raise MaintenanceRunNotFoundError(run_id=run_id)
        created_at = self._run_orchestrator_store.current_run_created_at
        state_summary = self._get_state_summary(run_id=run_id)

        return _build_run(
            run_id=run_id,
            created_at=created_at,
            state_summary=state_summary,
        )

    async def delete(self, run_id: str) -> None:
        """Delete a maintenance run.

        Args:
            run_id: The identifier of the run to remove.

        Raises:
            RunConflictError: If deleting the current run, the current run
                is not idle and cannot be deleted.
            RunNotFoundError: The given run identifier was not found.
        """
        if run_id == self._run_orchestrator_store.current_run_id:
            await self._run_orchestrator_store.clear()
            await self._maintenance_runs_publisher.publish_current_maintenance_run_async()

        else:
            raise MaintenanceRunNotFoundError(run_id=run_id)

    def get_commands_slice(
        self,
        run_id: str,
        cursor: Optional[int],
        length: int,
    ) -> CommandSlice:
        """Get a slice of maintenance run commands.

        Args:
            run_id: ID of the run.
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.

        Raises:
            RunNotCurrentError: The given run identifier doesn't belong to a current run.
        """
        if run_id != self._run_orchestrator_store.current_run_id:
            raise MaintenanceRunNotFoundError(run_id=run_id)
        the_slice = self._run_orchestrator_store.get_command_slice(
            cursor=cursor, length=length
        )
        return the_slice

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
            # todo(mm, 2024-05-20):
            # For historical runs to behave consistently with the current run,
            # this should be the most recently completed command, not `None`.
            return None

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
            RunNotCurrentError: The given run identifier doesn't belong to the current run.
            CommandNotFoundError: The given command identifier was not found.
        """
        if run_id != self._run_orchestrator_store.current_run_id:
            raise MaintenanceRunNotFoundError(run_id=run_id)
        return self._run_orchestrator_store.get_command(command_id=command_id)

    def _get_state_summary(self, run_id: str) -> Optional[StateSummary]:
        return self._run_orchestrator_store.get_state_summary()
