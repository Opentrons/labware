"""In-memory storage of ProtocolEngine instances."""

import asyncio
import logging
from typing import Dict, List, Optional, Callable, Mapping, Sequence

from opentrons.types import NozzleMapInterface
from opentrons.protocol_engine.errors.exceptions import EStopActivatedError
from opentrons.protocol_engine.types import (
    PostRunHardwareState,
    RunTimeParameter,
    CSVRuntimeParamPaths,
)

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.robot.types import RobotTypeEnum

from opentrons.config import feature_flags
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import (
    EstopState,
    HardwareEvent,
    EstopStateNotification,
    HardwareEventHandler,
)
from opentrons.protocols.api_support.deck_type import should_load_fixed_trash
from opentrons.protocol_runner import (
    RunResult,
    RunOrchestrator,
)
from opentrons.protocol_runner.run_orchestrator import ParseMode
from opentrons.protocol_engine import (
    DeckType,
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    StateSummary,
    CommandSlice,
    CommandErrorSlice,
    CommandPointer,
    Command,
    CommandCreate,
    LabwareOffset,
    Config as ProtocolEngineConfig,
    error_recovery_policy,
)
from opentrons.protocol_engine.create_protocol_engine import create_protocol_engine
from opentrons.protocol_engine import ErrorOccurrence

from robot_server.protocols.protocol_store import ProtocolResource
from opentrons.protocol_engine.types import (
    DeckConfigurationType,
    PrimitiveRunTimeParamValuesType,
    EngineStatus,
)
from opentrons_shared_data.labware.types import LabwareUri
from opentrons.protocol_engine.resources.file_provider import FileProvider

_log = logging.getLogger(__name__)


class RunConflictError(RuntimeError):
    """An error raised if an active run is already initialized.

    The store will not create a new run orchestrator unless the "current" one is idle.
    """


class NoRunOrchestrator(RuntimeError):
    """Raised if you try to get the current run orchestrator while there is none."""


async def handle_estop_event(
    run_orchestrator_store: "RunOrchestratorStore", event: HardwareEvent
) -> None:
    """Handle an E-stop event from the hardware API.

    This is meant to run in the engine's thread and asyncio event loop.

    This is a public function for unit-testing purposes, but it's an implementation
    detail of the store.
    """
    try:
        if isinstance(event, EstopStateNotification):
            if event.new_state is not EstopState.PHYSICALLY_ENGAGED:
                return
            if run_orchestrator_store.current_run_id is None:
                return
            # todo(mm, 2024-04-17): This estop teardown sequencing belongs in the
            # runner layer.
            run_orchestrator_store.run_orchestrator.estop()
            await run_orchestrator_store.run_orchestrator.finish(
                error=EStopActivatedError()
            )
    except Exception:
        # This is a background task kicked off by a hardware event,
        # so there's no one to propagate this exception to.
        _log.exception("Exception handling E-stop event.")


def _get_estop_listener(
    run_orchestrator_store: "RunOrchestratorStore",
) -> HardwareEventHandler:
    """Create a callback for estop events.

    The returned callback is meant to run in the hardware API's thread.
    """
    engine_loop = asyncio.get_running_loop()

    def run_handler_in_engine_thread_from_hardware_thread(
        event: HardwareEvent,
    ) -> None:
        asyncio.run_coroutine_threadsafe(
            handle_estop_event(run_orchestrator_store, event), engine_loop
        )

    return run_handler_in_engine_thread_from_hardware_thread


class RunOrchestratorStore:
    """Factory and in-memory storage for ProtocolEngine."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        robot_type: RobotType,
        deck_type: DeckType,
    ) -> None:
        """Initialize a run orchestrator storage interface.

        Arguments:
            hardware_api: Hardware control API instance used for ProtocolEngine
                construction.
            robot_type: Passed along to `opentrons.protocol_engine.Config`.
            deck_type: Passed along to `opentrons.protocol_engine.Config`.
        """
        self._hardware_api = hardware_api
        self._robot_type = robot_type
        self._deck_type = deck_type
        self._run_orchestrator: Optional[RunOrchestrator] = None
        self._default_run_orchestrator: Optional[RunOrchestrator] = None
        hardware_api.register_callback(_get_estop_listener(self))

    @property
    def run_orchestrator(self) -> RunOrchestrator:
        """Get the "current" RunOrchestrator."""
        if self._run_orchestrator is None:
            raise NoRunOrchestrator()
        return self._run_orchestrator

    @property
    def current_run_id(self) -> Optional[str]:
        """Get the run identifier associated with the current run orchestrator."""
        return (
            self.run_orchestrator.run_id if self._run_orchestrator is not None else None
        )

    # TODO(mc, 2022-03-21): this resource locking is insufficient;
    # come up with something more sophisticated without race condition holes.
    async def get_default_orchestrator(self) -> RunOrchestrator:
        """Get a "default" RunOrchestrator to use outside the context of a run.

        Raises:
            RunConflictError: if a run-specific run orchestrator is active.
        """
        if (
            self._run_orchestrator is not None
            and self.run_orchestrator.run_has_started()
            and not self.run_orchestrator.run_has_stopped()
        ):
            raise RunConflictError("A run is currently active")

        default_orchestrator = self._default_run_orchestrator
        if default_orchestrator is None:
            engine = await create_protocol_engine(
                hardware_api=self._hardware_api,
                config=ProtocolEngineConfig(
                    robot_type=self._robot_type,
                    deck_type=self._deck_type,
                    block_on_door_open=False,
                ),
                # Error recovery mode would not make sense outside the context of a run--
                # for example, there would be no equivalent to the `POST /runs/{id}/actions`
                # endpoint to resume normal operation.
                error_recovery_policy=error_recovery_policy.never_recover,
            )
            self._default_run_orchestrator = RunOrchestrator.build_orchestrator(
                protocol_engine=engine, hardware_api=self._hardware_api
            )
            return self._default_run_orchestrator
        return default_orchestrator

    async def create(
        self,
        run_id: str,
        labware_offsets: Sequence[LabwareOffsetCreate | LegacyLabwareOffsetCreate],
        initial_error_recovery_policy: error_recovery_policy.ErrorRecoveryPolicy,
        deck_configuration: DeckConfigurationType,
        file_provider: FileProvider,
        notify_publishers: Callable[[], None],
        protocol: Optional[ProtocolResource],
        run_time_param_values: Optional[PrimitiveRunTimeParamValuesType] = None,
        # TODO(jbl 2024-08-02) combine this with run_time_param_values now that theres no ambiguity with Paths
        run_time_param_paths: Optional[CSVRuntimeParamPaths] = None,
    ) -> StateSummary:
        """Create and store a ProtocolRunner and ProtocolEngine for a given Run.

        Args:
            run_id: The run resource the run orchestrator is assigned to.
            labware_offsets: Labware offsets to create the run with.
            deck_configuration: A mapping of fixtures to cutout fixtures the deck will be loaded with.
            file_provider: Wrapper to let the engine read/write data files.
            notify_publishers: Utilized by the engine to notify publishers of state changes.
            protocol: The protocol to load the runner with, if any.
            run_time_param_values: Any runtime parameter values to set.
            run_time_param_paths: Any runtime filepath to set.

        Returns:
            The initial equipment and status summary of the engine.

        Raises:
            RunConflictError: The current run orchestrator is not idle, so
            a new one may not be created.
        """
        if protocol is not None:
            load_fixed_trash = should_load_fixed_trash(protocol.source.config)
        else:
            load_fixed_trash = False

        if self._run_orchestrator is not None:
            raise RunConflictError("Another run is currently active.")
        engine = await create_protocol_engine(
            hardware_api=self._hardware_api,
            config=ProtocolEngineConfig(
                robot_type=self._robot_type,
                deck_type=self._deck_type,
                block_on_door_open=feature_flags.enable_door_safety_switch(
                    RobotTypeEnum.robot_literal_to_enum(self._robot_type)
                ),
            ),
            error_recovery_policy=initial_error_recovery_policy,
            load_fixed_trash=load_fixed_trash,
            deck_configuration=deck_configuration,
            file_provider=file_provider,
            notify_publishers=notify_publishers,
        )

        self._run_orchestrator = RunOrchestrator.build_orchestrator(
            run_id=run_id,
            protocol_engine=engine,
            hardware_api=self._hardware_api,
            protocol_config=protocol.source.config if protocol else None,
        )

        # FIXME(mm, 2022-12-21): These `await runner.load()`s introduce a
        # concurrency hazard. If two requests simultaneously call this method,
        # they will both "succeed" (with undefined results) instead of one
        # raising RunConflictError.
        if protocol:
            await self.run_orchestrator.load(
                protocol.source,
                run_time_param_values=run_time_param_values,
                run_time_param_paths=run_time_param_paths,
                parse_mode=ParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS,
            )
        else:
            self.run_orchestrator.prepare()

        for offset in labware_offsets:
            self.run_orchestrator.add_labware_offset(offset)

        return self.run_orchestrator.get_state_summary()

    async def clear(self) -> RunResult:
        """Remove the current run orchestrator.

        Raises:
            RunConflictError: The current run orchestrator is not idle, so it cannot
                be cleared.
        """
        if self.run_orchestrator.get_is_okay_to_clear():
            await self.run_orchestrator.finish(
                drop_tips_after_run=False,
                set_run_status=False,
                post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
            )
        else:
            raise RunConflictError("Current run is not idle or stopped.")

        run_data = self.run_orchestrator.get_state_summary()
        commands = self.run_orchestrator.get_all_commands()
        run_time_parameters = self.run_orchestrator.get_run_time_parameters()
        command_annotations = self.run_orchestrator.get_command_annotations()

        self._run_orchestrator = None

        return RunResult(
            state_summary=run_data,
            commands=commands,
            parameters=run_time_parameters,
            command_annotations=command_annotations,
        )

    # todo(mm, 2024-11-15): Are all of these pass-through methods helpful?
    # Can we delete them and make callers just call .run_orchestrator.play(), etc.?

    def play(self, deck_configuration: Optional[DeckConfigurationType] = None) -> None:
        """Start or resume the run."""
        self.run_orchestrator.play(deck_configuration=deck_configuration)

    async def run(self, deck_configuration: DeckConfigurationType) -> RunResult:
        """Start the run."""
        return await self.run_orchestrator.run(deck_configuration=deck_configuration)

    def pause(self) -> None:
        """Pause the run."""
        self.run_orchestrator.pause()

    async def stop(self) -> None:
        """Stop the run."""
        await self.run_orchestrator.stop()

    def resume_from_recovery(self, reconcile_false_positive: bool) -> None:
        """Resume the run from recovery mode."""
        self.run_orchestrator.resume_from_recovery(reconcile_false_positive)

    async def finish(self, error: Optional[Exception]) -> None:
        """Finish the run."""
        await self.run_orchestrator.finish(error=error)

    def get_state_summary(self) -> StateSummary:
        """Get protocol run data."""
        return self.run_orchestrator.get_state_summary()

    def get_loaded_labware_definitions(self) -> List[LabwareDefinition]:
        """Get loaded labware definitions."""
        return self.run_orchestrator.get_loaded_labware_definitions()

    def get_nozzle_maps(self) -> Mapping[str, NozzleMapInterface]:
        """Get the current nozzle map keyed by pipette id."""
        return self.run_orchestrator.get_nozzle_maps()

    def get_tip_attached(self) -> Dict[str, bool]:
        """Get current tip state keyed by pipette id."""
        return self.run_orchestrator.get_tip_attached()

    def get_run_time_parameters(self) -> List[RunTimeParameter]:
        """Parameter definitions defined by protocol, if any. Will always be empty before execution."""
        return self.run_orchestrator.get_run_time_parameters()

    def get_current_command(self) -> Optional[CommandPointer]:
        """Get the current running command, if any."""
        return self.run_orchestrator.get_current_command()

    def get_most_recently_finalized_command(self) -> Optional[CommandPointer]:
        """Get the most recently finalized command, if any."""
        return self.run_orchestrator.get_most_recently_finalized_command()

    def get_command_slice(
        self, cursor: Optional[int], length: int, include_fixit_commands: bool
    ) -> CommandSlice:
        """Get a slice of run commands.

        Args:
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.
            include_fixit_commands: Include fixit commands.
        """
        return self.run_orchestrator.get_command_slice(
            cursor=cursor, length=length, include_fixit_commands=include_fixit_commands
        )

    def get_command_error_slice(
        self,
        cursor: int,
        length: int,
    ) -> CommandErrorSlice:
        """Get a slice of run commands error.

        Args:
            cursor: Requested index of first command error in the returned slice.
            length: Length of slice to return.
        """
        return self.run_orchestrator.get_command_error_slice(
            cursor=cursor, length=length
        )

    def get_command_errors(self) -> list[ErrorOccurrence]:
        """Get all command errors."""
        return self.run_orchestrator.get_command_errors()

    def get_command_recovery_target(self) -> Optional[CommandPointer]:
        """Get the current error recovery target."""
        return self.run_orchestrator.get_command_recovery_target()

    def get_command(self, command_id: str) -> Command:
        """Get a run's command by ID."""
        return self.run_orchestrator.get_command(command_id=command_id)

    def get_status(self) -> EngineStatus:
        """Get the current execution status of the run."""
        return self.run_orchestrator.get_run_status()

    def get_is_run_terminal(self) -> bool:
        """Get whether run is in a terminal state."""
        return self.run_orchestrator.get_is_run_terminal()

    def run_was_started(self) -> bool:
        """Get whether the run has started."""
        return self.run_orchestrator.run_has_started()

    def add_labware_offset(
        self, request: LabwareOffsetCreate | LegacyLabwareOffsetCreate
    ) -> LabwareOffset:
        """Add a new labware offset to state."""
        return self.run_orchestrator.add_labware_offset(request)

    def add_labware_definition(self, definition: LabwareDefinition) -> LabwareUri:
        """Add a new labware definition to state."""
        return self.run_orchestrator.add_labware_definition(definition)

    def set_error_recovery_policy(
        self, policy: error_recovery_policy.ErrorRecoveryPolicy
    ) -> None:
        """Create run policy rules for error recovery."""
        self.run_orchestrator.set_error_recovery_policy(policy)

    async def add_command_and_wait_for_interval(
        self,
        request: CommandCreate,
        wait_until_complete: bool = False,
        timeout: Optional[int] = None,
        failed_command_id: Optional[str] = None,
    ) -> Command:
        """Add a new command to execute and wait for it to complete if needed."""
        return await self.run_orchestrator.add_command_and_wait_for_interval(
            command=request,
            failed_command_id=failed_command_id,
            wait_until_complete=wait_until_complete,
            timeout=timeout,
        )
