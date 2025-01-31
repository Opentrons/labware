"""Engine/Runner provider."""

from __future__ import annotations

import enum
from typing import Optional, Union, List, Dict, AsyncGenerator, Mapping

from anyio import move_on_after

from opentrons.types import NozzleMapInterface
from opentrons_shared_data.labware.types import LabwareUri
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.errors import GeneralError
from opentrons_shared_data.robot.types import RobotType

from . import protocol_runner, RunResult, JsonRunner, PythonAndLegacyRunner
from ..hardware_control import HardwareControlAPI
from ..hardware_control.modules import AbstractModule as HardwareModuleAPI
from ..protocol_engine import (
    ProtocolEngine,
    CommandCreate,
    Command,
    StateSummary,
    CommandPointer,
    CommandSlice,
    CommandErrorSlice,
    DeckType,
    ErrorOccurrence,
)
from ..protocol_engine.errors import RunStoppedError
from ..protocol_engine.types import (
    PostRunHardwareState,
    EngineStatus,
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    LabwareOffset,
    DeckConfigurationType,
    RunTimeParameter,
    PrimitiveRunTimeParamValuesType,
    CSVRuntimeParamPaths,
    CommandAnnotation,
)
from ..protocol_engine.error_recovery_policy import ErrorRecoveryPolicy

from ..protocol_reader import JsonProtocolConfig, PythonProtocolConfig, ProtocolSource
from ..protocols.parse import PythonParseMode


class NoProtocolRunAvailable(RuntimeError):
    """An error raised if there is no protocol run available."""


class UnknownProtocolParseMode(RuntimeError):
    """An error raised if given an unknown protocol parse mode."""


class RunNotFound(GeneralError):
    """An error raised if there is no run associated."""


class ParseMode(enum.Enum):
    """Configure optional rules for when `opentrons.protocols.parse.parse()` parses protocols."""

    NORMAL = enum.auto()
    ALLOW_LEGACY_METADATA_AND_REQUIREMENTS = enum.auto()


class RunOrchestrator:
    """Provider for runners and associated protocol engine.

    Build runners, manage command execution, run state and in-memory protocol engine associated to the runners.
    """

    _protocol_runner: Optional[
        Union[protocol_runner.JsonRunner, protocol_runner.PythonAndLegacyRunner, None]
    ]
    _setup_runner: protocol_runner.LiveRunner
    _fixit_runner: protocol_runner.LiveRunner
    _protocol_live_runner: protocol_runner.LiveRunner
    _hardware_api: HardwareControlAPI
    _protocol_engine: ProtocolEngine

    def __init__(
        self,
        protocol_engine: ProtocolEngine,
        # todo(mm, 2024-07-05): This hardware_api param looks unused?
        hardware_api: HardwareControlAPI,
        fixit_runner: protocol_runner.LiveRunner,
        setup_runner: protocol_runner.LiveRunner,
        protocol_live_runner: protocol_runner.LiveRunner,
        json_or_python_protocol_runner: Optional[
            Union[protocol_runner.PythonAndLegacyRunner, protocol_runner.JsonRunner]
        ] = None,
        run_id: Optional[str] = None,
    ) -> None:
        """Initialize a run orchestrator interface.

        Arguments:
            protocol_engine: Protocol engine instance.
            hardware_api: Hardware control API instance.
            fixit_runner: LiveRunner for fixit commands.
            setup_runner: LiveRunner for setup commands.
            protocol_live_runner: LiveRunner for protocol commands.
            json_or_python_protocol_runner: JsonRunner/PythonAndLegacyRunner for protocol commands.
            run_id: run id if any, associated to the runner/engine.
        """
        self._run_id = run_id
        self._protocol_engine = protocol_engine
        self._protocol_runner = json_or_python_protocol_runner
        self._setup_runner = setup_runner
        self._fixit_runner = fixit_runner
        self._protocol_live_runner = protocol_live_runner
        self._fixit_runner.prepare()
        self._setup_runner.prepare()
        self._protocol_engine.set_and_start_queue_worker(self.command_generator)

    @property
    def run_id(self) -> str:
        """Get the "current" persisted run_id."""
        if not self._run_id:
            raise RunNotFound()
        return self._run_id

    @classmethod
    def build_orchestrator(
        cls,
        hardware_api: HardwareControlAPI,
        protocol_engine: ProtocolEngine,
        protocol_config: Optional[
            Union[JsonProtocolConfig, PythonProtocolConfig]
        ] = None,
        post_run_hardware_state: PostRunHardwareState = PostRunHardwareState.HOME_AND_STAY_ENGAGED,
        drop_tips_after_run: bool = True,
        run_id: Optional[str] = None,
    ) -> "RunOrchestrator":
        """Build a RunOrchestrator provider."""
        setup_runner = protocol_runner.LiveRunner(
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
        )
        fixit_runner = protocol_runner.LiveRunner(
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
        )
        protocol_live_runner = protocol_runner.LiveRunner(
            protocol_engine=protocol_engine,
            hardware_api=hardware_api,
        )
        json_or_python_runner = None
        if protocol_config:
            json_or_python_runner = protocol_runner.create_protocol_runner(
                protocol_config=protocol_config,
                protocol_engine=protocol_engine,
                hardware_api=hardware_api,
                post_run_hardware_state=post_run_hardware_state,
                drop_tips_after_run=drop_tips_after_run,
            )
        return cls(
            run_id=run_id,
            json_or_python_protocol_runner=json_or_python_runner,
            setup_runner=setup_runner,
            fixit_runner=fixit_runner,
            hardware_api=hardware_api,
            protocol_engine=protocol_engine,
            protocol_live_runner=protocol_live_runner,
        )

    def play(self, deck_configuration: Optional[DeckConfigurationType] = None) -> None:
        """Start or resume the run."""
        # todo(mm, 2024-07-09): The deck configuration is set at the same time here for
        # historical reasons. It's unsafe to change the deck configuration mid-run
        # and we're relying on the caller to not do that.
        self._protocol_engine.set_deck_configuration(deck_configuration)
        self._protocol_engine.play()

    async def run(
        self,
        deck_configuration: DeckConfigurationType,
        protocol_source: Optional[ProtocolSource] = None,
        run_time_param_values: Optional[PrimitiveRunTimeParamValuesType] = None,
    ) -> RunResult:
        """Start the run."""
        if self._protocol_runner:
            return await self._protocol_runner.run(
                deck_configuration=deck_configuration,
                protocol_source=protocol_source,
                run_time_param_values=run_time_param_values,
            )
        elif self._protocol_live_runner:
            return await self._protocol_live_runner.run(
                deck_configuration=deck_configuration
            )
        else:
            return await self._setup_runner.run(deck_configuration=deck_configuration)

    def pause(self) -> None:
        """Pause the run."""
        self._protocol_engine.request_pause()

    async def stop(self) -> None:
        """Stop the run."""
        if self.run_has_started():
            await self._protocol_engine.request_stop()
        else:
            await self.finish(
                drop_tips_after_run=False,
                set_run_status=False,
                post_run_hardware_state=PostRunHardwareState.STAY_ENGAGED_IN_PLACE,
            )

    def resume_from_recovery(self, reconcile_false_positive: bool) -> None:
        """Resume the run from recovery."""
        self._protocol_engine.resume_from_recovery(reconcile_false_positive)

    async def finish(
        self,
        error: Optional[Exception] = None,
        drop_tips_after_run: bool = True,
        set_run_status: bool = True,
        post_run_hardware_state: PostRunHardwareState = PostRunHardwareState.HOME_AND_STAY_ENGAGED,
    ) -> None:
        """Finish the run."""
        await self._protocol_engine.finish(
            error=error,
            drop_tips_after_run=drop_tips_after_run,
            set_run_status=set_run_status,
            post_run_hardware_state=post_run_hardware_state,
        )

    def get_state_summary(self) -> StateSummary:
        """Get protocol run data."""
        return self._protocol_engine.state_view.get_summary()

    def get_loaded_labware_definitions(self) -> List[LabwareDefinition]:
        """Get loaded labware definitions."""
        return self._protocol_engine.state_view.labware.get_loaded_labware_definitions()

    def get_run_time_parameters(self) -> List[RunTimeParameter]:
        """Get the list of run time parameters defined in the protocol, if any.

        This returns a list of all run time parameters with their validated definitions
        and client-requested values. Will always be empty before loading the runner.

        If there was an error during RTP definition validation, then this list will
        contain the parameter definitions that were validated before the error occurred.
        These parameters' values will be default values.

        If all definitions validated successfully but an error occurred while
        setting the RTP values with those sent by the client, then only the parameters
        whose values were successfully set will have the client-requested values while
        the others will contain the default values.
        """
        return (
            []
            if self._protocol_runner is None
            else self._protocol_runner.run_time_parameters
        )

    def get_command_annotations(self) -> List[CommandAnnotation]:
        """Get the list of command annotations defined in the protocol, if any."""
        return (
            []
            if self._protocol_runner is None
            else self._protocol_runner.command_annotations
        )

    def get_current_command(self) -> Optional[CommandPointer]:
        """Get the "current" command, if any."""
        return self._protocol_engine.state_view.commands.get_current()

    def get_most_recently_finalized_command(self) -> Optional[CommandPointer]:
        """Get the most recently finalized command, if any."""
        most_recently_finalized_command = (
            self._protocol_engine.state_view.commands.get_most_recently_finalized_command()
        )
        return (
            CommandPointer(
                command_id=most_recently_finalized_command.command.id,
                command_key=most_recently_finalized_command.command.key,
                created_at=most_recently_finalized_command.command.createdAt,
                index=most_recently_finalized_command.index,
            )
            if most_recently_finalized_command
            else None
        )

    def get_command_slice(
        self, cursor: Optional[int], length: int, include_fixit_commands: bool
    ) -> CommandSlice:
        """Get a slice of run commands.

        Args:
            cursor: Requested index of first command in the returned slice.
            length: Length of slice to return.
            include_fixit_commands: Get all command intents.
        """
        return self._protocol_engine.state_view.commands.get_slice(
            cursor=cursor, length=length, include_fixit_commands=include_fixit_commands
        )

    def get_command_error_slice(
        self,
        cursor: int,
        length: int,
    ) -> CommandErrorSlice:
        """Get a slice of run commands errors.

        Args:
            cursor: Requested index of first error in the returned slice.
                If the cursor is omitted, a cursor will be selected automatically
                based on the last error occurence.
            length: Length of slice to return.
        """
        return self._protocol_engine.state_view.commands.get_errors_slice(
            cursor=cursor, length=length
        )

    def get_command_recovery_target(self) -> Optional[CommandPointer]:
        """Get the current error recovery target."""
        return self._protocol_engine.state_view.commands.get_recovery_target()

    def get_command(self, command_id: str) -> Command:
        """Get a run's command by ID."""
        return self._protocol_engine.state_view.commands.get(command_id=command_id)

    def get_all_commands(self) -> List[Command]:
        """Get all run commands."""
        return self._protocol_engine.state_view.commands.get_all()

    def get_command_errors(self) -> List[ErrorOccurrence]:
        """Get all run command errors."""
        return self._protocol_engine.state_view.commands.get_all_errors()

    def get_run_status(self) -> EngineStatus:
        """Get the current execution status of the engine."""
        return self._protocol_engine.state_view.commands.get_status()

    def get_is_run_terminal(self) -> bool:
        """Get whether engine is in a terminal state."""
        return self._protocol_engine.state_view.commands.get_is_terminal()

    def run_has_started(self) -> bool:
        """Get whether the run has started."""
        return self._protocol_engine.state_view.commands.has_been_played()

    def run_has_stopped(self) -> bool:
        """Get whether the run has stopped."""
        return self._protocol_engine.state_view.commands.get_is_stopped()

    def add_labware_offset(
        self, request: LabwareOffsetCreate | LegacyLabwareOffsetCreate
    ) -> LabwareOffset:
        """Add a new labware offset to state."""
        return self._protocol_engine.add_labware_offset(request)

    def add_labware_definition(self, definition: LabwareDefinition) -> LabwareUri:
        """Add a new labware definition to state."""
        return self._protocol_engine.add_labware_definition(definition)

    async def add_command_and_wait_for_interval(
        self,
        command: CommandCreate,
        wait_until_complete: bool = False,
        timeout: Optional[int] = None,
        failed_command_id: Optional[str] = None,
    ) -> Command:
        """Add a new command to execute and wait for it to complete if needed."""
        added_command = self._protocol_engine.add_command(
            request=command, failed_command_id=failed_command_id
        )
        if wait_until_complete:
            timeout_sec = None if timeout is None else timeout / 1000.0
            with move_on_after(timeout_sec):
                await self._protocol_engine.wait_for_command(added_command.id)
        return added_command

    def estop(self) -> None:
        """Handle an E-stop event from the hardware API."""
        return self._protocol_engine.estop()

    async def use_attached_modules(
        self, modules_by_id: Dict[str, HardwareModuleAPI]
    ) -> None:
        """Load attached modules directly into state, without locations."""
        await self._protocol_engine.use_attached_modules(modules_by_id=modules_by_id)

    def get_protocol_runner(self) -> Optional[Union[JsonRunner, PythonAndLegacyRunner]]:
        """Get run's protocol runner if any, if not return None."""
        return self._protocol_runner

    async def load(
        self,
        protocol_source: ProtocolSource,
        run_time_param_values: Optional[PrimitiveRunTimeParamValuesType],
        run_time_param_paths: Optional[CSVRuntimeParamPaths],
        parse_mode: ParseMode,
    ) -> None:
        """Load a json/python protocol."""
        assert self._protocol_runner is not None
        if isinstance(self._protocol_runner, JsonRunner):
            await self._protocol_runner.load(protocol_source=protocol_source)
        elif isinstance(self._protocol_runner, PythonAndLegacyRunner):
            python_parse_mode = self._map_parse_mode_to_python_parse_mode(parse_mode)
            await self._protocol_runner.load(
                protocol_source=protocol_source,
                # Conservatively assume that we're re-running a protocol that
                # was uploaded before we added stricter validation, and that
                # doesn't conform to the new rules.
                python_parse_mode=python_parse_mode,
                run_time_param_values=run_time_param_values,
                run_time_param_paths=run_time_param_paths,
            )

    def get_is_okay_to_clear(self) -> bool:
        """Get whether the engine is stopped or sitting idly, so it could be removed."""
        return self._protocol_engine.state_view.commands.get_is_okay_to_clear()

    def prepare(self) -> None:
        """Prepare live runner for a run."""
        self._protocol_live_runner.prepare()

    def get_robot_type(self) -> RobotType:
        """Get engine robot type."""
        return self._protocol_engine.state_view.config.robot_type

    def get_deck_type(self) -> DeckType:
        """Get engine deck type."""
        return self._protocol_engine.state_view.config.deck_type

    def get_nozzle_maps(self) -> Mapping[str, NozzleMapInterface]:
        """Get current nozzle maps keyed by pipette id."""
        return self._protocol_engine.state_view.tips.get_pipette_nozzle_maps()

    def get_tip_attached(self) -> Dict[str, bool]:
        """Get current tip state keyed by pipette id."""

        def has_tip_attached(pipette_id: str) -> bool:
            return (
                self._protocol_engine.state_view.pipettes.get_attached_tip(pipette_id)
                is not None
            )

        pipette_ids = (
            pipette.id
            for pipette in self._protocol_engine.state_view.pipettes.get_all()
        )
        return {pipette_id: has_tip_attached(pipette_id) for pipette_id in pipette_ids}

    def set_error_recovery_policy(self, policy: ErrorRecoveryPolicy) -> None:
        """Create error recovery policy for the run."""
        self._protocol_engine.set_error_recovery_policy(policy)

    async def command_generator(self) -> AsyncGenerator[str, None]:
        """Yield next command to execute."""
        while True:
            try:
                # TODO(tz, 6-26-2024): avoid using private accessor in a follow up pr.
                command_id = await self._protocol_engine._state_store.wait_for(
                    condition=self._protocol_engine.state_view.commands.get_next_to_execute
                )
                # Assert for type hinting. This is valid because the wait_for() above
                # only returns when the value is truthy.
                assert command_id is not None
                yield command_id
            except RunStoppedError:
                # There are no more commands that we should execute, either because the run has
                # completed on its own, or because a client requested it to stop.
                break

    @staticmethod
    def _map_parse_mode_to_python_parse_mode(parse_mode: ParseMode) -> PythonParseMode:
        if parse_mode == ParseMode.NORMAL:
            return PythonParseMode.NORMAL
        elif parse_mode == ParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS:
            return PythonParseMode.ALLOW_LEGACY_METADATA_AND_REQUIREMENTS
        else:
            raise UnknownProtocolParseMode()
