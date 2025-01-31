"""ProtocolEngine class definition."""

from contextlib import AsyncExitStack
from logging import getLogger
from typing import Dict, Optional, Union, AsyncGenerator, Callable

from opentrons_shared_data.errors import (
    ErrorCodes,
    EnumeratedError,
)
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.modules import AbstractModule as HardwareModuleAPI
from opentrons.hardware_control.types import PauseType as HardwarePauseType

from .actions.actions import (
    ResumeFromRecoveryAction,
    SetErrorRecoveryPolicyAction,
)
from .errors import ProtocolCommandFailedError, ErrorOccurrence, CommandNotAllowedError
from .errors.exceptions import EStopActivatedError
from .error_recovery_policy import ErrorRecoveryPolicy
from . import commands, slot_standardization, labware_offset_standardization
from .resources import ModelUtils, ModuleDataProvider, FileProvider
from .types import (
    LabwareOffset,
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    LabwareUri,
    ModuleModel,
    Liquid,
    HexColor,
    PostRunHardwareState,
    DeckConfigurationType,
)
from .execution import (
    QueueWorker,
    create_queue_worker,
    DoorWatcher,
    HardwareStopper,
)
from .state.state import StateStore, StateView
from .state.update_types import StateUpdate
from .plugins import AbstractPlugin, PluginStarter
from .actions import (
    ActionDispatcher,
    PlayAction,
    PauseAction,
    PauseSource,
    StopAction,
    FinishAction,
    FinishErrorDetails,
    QueueCommandAction,
    AddLabwareOffsetAction,
    AddLabwareDefinitionAction,
    AddLiquidAction,
    SetDeckConfigurationAction,
    AddAddressableAreaAction,
    AddModuleAction,
    HardwareStoppedAction,
    ResetTipsAction,
    SetPipetteMovementSpeedAction,
)


_log = getLogger(__name__)


class ProtocolEngine:
    """Main ProtocolEngine class.

    A ProtocolEngine instance holds the state of a protocol as it executes,
    and manages calls to a command executor that actually implements the logic
    of the commands themselves.

    Lifetime:
        Instances are single-use. Each instance is associated with a single protocol,
        or a a single chain of robot control such as Labware Position Check.

    Concurrency:
        Instances live in `asyncio` event loops. Each instance must be constructed inside an
        event loop, and then must be interacted with exclusively through that
        event loop's thread--even for regular non-`async` methods, like `.pause()`.
        (This is because there are background async tasks that monitor state changes using
        primitives that aren't thread-safe. See ChangeNotifier.)
    """

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        state_store: StateStore,
        action_dispatcher: ActionDispatcher,
        plugin_starter: PluginStarter,
        model_utils: ModelUtils,
        hardware_stopper: HardwareStopper,
        door_watcher: DoorWatcher,
        module_data_provider: ModuleDataProvider,
        file_provider: FileProvider,
        queue_worker: Optional[QueueWorker] = None,
    ) -> None:
        """Initialize a ProtocolEngine instance.

        Must be called while an event loop is active.

        This constructor is only for `ProtocolEngine` unit tests.
        Prefer the `create_protocol_engine()` factory function.
        """
        self._hardware_api = hardware_api
        self._file_provider = file_provider
        self._state_store = state_store
        self._model_utils = model_utils
        self._action_dispatcher = action_dispatcher
        self._plugin_starter = plugin_starter
        self._hardware_stopper = hardware_stopper
        self._door_watcher = door_watcher
        self._module_data_provider = module_data_provider
        self._queue_worker = queue_worker
        if self._queue_worker:
            self._queue_worker.start()
        self._door_watcher.start()

    @property
    def state_view(self) -> StateView:
        """Get an interface to retrieve calculated state values."""
        return self._state_store

    @property
    def _get_queue_worker(self) -> QueueWorker:
        """Get the queue worker instance."""
        assert self._queue_worker is not None
        return self._queue_worker

    def add_plugin(self, plugin: AbstractPlugin) -> None:
        """Add a plugin to the engine to customize behavior."""
        self._plugin_starter.start(plugin)

    def set_deck_configuration(
        self, deck_configuration: Optional[DeckConfigurationType]
    ) -> None:
        """Inform the engine of the robot's current deck configuration.

        If `Config.use_simulated_deck_config` is `True`, this is meaningless and unused.
        You can call this with `None` if you want to be explicit--it will no-op.

        If `Config.use_simulated_deck_config` is `False`, you should call this with the
        robot's actual, full, non-`None` deck configuration, before you play the run for
        the first time. Do not call this in the middle of a run.
        """
        self._action_dispatcher.dispatch(SetDeckConfigurationAction(deck_configuration))

    def play(self) -> None:
        """Start or resume executing commands in the queue."""
        requested_at = self._model_utils.get_timestamp()
        # TODO(mc, 2021-08-05): if starting, ensure plungers motors are
        # homed if necessary
        action = self._state_store.commands.validate_action_allowed(
            PlayAction(requested_at=requested_at)
        )
        self._action_dispatcher.dispatch(action)

        if self._state_store.commands.get_is_door_blocking():
            self._hardware_api.pause(HardwarePauseType.PAUSE)
        else:
            self._hardware_api.resume(HardwarePauseType.PAUSE)

    def request_pause(self) -> None:
        """Make command execution pause soon.

        This will try to pause in the middle of the ongoing command, if there is one.
        Otherwise, whenever the next command begins, the pause will happen then.
        """
        action = self._state_store.commands.validate_action_allowed(
            PauseAction(source=PauseSource.CLIENT)
        )
        self._action_dispatcher.dispatch(action)
        self._hardware_api.pause(HardwarePauseType.PAUSE)

    def resume_from_recovery(self, reconcile_false_positive: bool) -> None:
        """Resume normal protocol execution after the engine was `AWAITING_RECOVERY`.

        If `reconcile_false_positive` is `False`, the engine will continue naively from
        whatever state the error left it in. (Each defined error individually documents
        exactly how it affects state.) This is appropriate for client-driven error
        recovery, where the client wants predictable behavior from the engine.

        If `reconcile_false_positive` is `True`, the engine may apply additional fixups
        to its state to try to get the rest of the run to just work, assuming the error
        was a false-positive.

        For example, a `tipPhysicallyMissing` error from a `pickUpTip` would normally
        leave the engine state without a tip on the pipette. If `reconcile_false_positive=True`,
        the engine will set the pipette to have that missing tip before continuing, so
        subsequent path planning, aspirates, dispenses, etc. will work as if nothing
        went wrong.
        """
        if reconcile_false_positive:
            state_update = (
                self._state_store.commands.get_state_update_for_false_positive()
            )
        else:
            state_update = StateUpdate()  # Empty/no-op.

        action = self._state_store.commands.validate_action_allowed(
            ResumeFromRecoveryAction(state_update)
        )

        self._action_dispatcher.dispatch(action)

    def add_command(
        self, request: commands.CommandCreate, failed_command_id: Optional[str] = None
    ) -> commands.Command:
        """Add a command to the `ProtocolEngine`'s queue.

        Arguments:
            request: The command type and payload data used to construct
                the command in state.

        Returns:
            The full, newly queued command.

        Raises:
            SetupCommandNotAllowed: the request specified a setup command,
                but the engine was not idle or paused.
            RunStoppedError: the run has been stopped, so no new commands
                may be added.
            CommandNotAllowedError: the request specified a failed command id
                with a non fixit command.
        """
        request = slot_standardization.standardize_command(
            request, self.state_view.config.robot_type
        )

        if failed_command_id and request.intent != commands.CommandIntent.FIXIT:
            raise CommandNotAllowedError(
                "failed command id should be supplied with a FIXIT command."
            )

        command_id = self._model_utils.generate_id()
        if request.intent in (
            commands.CommandIntent.SETUP,
            commands.CommandIntent.FIXIT,
        ):
            request_hash = None
        else:
            request_hash = commands.hash_protocol_command_params(
                create=request,
                last_hash=self._state_store.commands.get_latest_protocol_command_hash(),
            )

        action = self.state_view.commands.validate_action_allowed(
            QueueCommandAction(
                request=request,
                request_hash=request_hash,
                command_id=command_id,
                created_at=self._model_utils.get_timestamp(),
                failed_command_id=failed_command_id,
            )
        )
        self._action_dispatcher.dispatch(action)
        return self._state_store.commands.get(command_id)

    async def wait_for_command(self, command_id: str) -> None:
        """Wait for a command to be completed.

        Will also return if the engine was stopped before it reached the command.
        """
        await self._state_store.wait_for(
            self._state_store.commands.get_command_is_final,
            command_id=command_id,
        )

    async def add_and_execute_command(
        self, request: commands.CommandCreate
    ) -> commands.Command:
        """Add a command to the queue and wait for it to complete.

        The engine must be started by calling `play` before the command will
        execute. You only need to call `play` once.

        Arguments:
            request: The command type and payload data used to construct
                the command in state.

        Returns:
            The command.

            If the command completed, it will be succeeded or failed.

            If the engine was stopped before it reached the command,
            the command will be queued.
        """
        command = self.add_command(request)
        await self.wait_for_command(command.id)
        return self._state_store.commands.get(command.id)

    async def add_and_execute_command_wait_for_recovery(
        self, request: commands.CommandCreate
    ) -> commands.Command:
        """Like `add_and_execute_command()`, except wait for error recovery.

        Unlike `add_and_execute_command()`, if the command fails, this will not
        immediately return the failed command. Instead, if the error is recoverable,
        it will wait until error recovery has completed (e.g. when some other task
        calls `self.resume_from_recovery()`).

        Returns:
            The command.

            If the command completed, it will be succeeded or failed. If it failed
            and then its failure was recovered from, it will still be failed.

            If the engine was stopped before it reached the command,
            the command will be queued.
        """
        queued_command = self.add_command(request)
        await self.wait_for_command(command_id=queued_command.id)
        completed_command = self._state_store.commands.get(queued_command.id)
        await self._state_store.wait_for_not(
            self.state_view.commands.get_recovery_in_progress_for_command,
            queued_command.id,
        )
        return completed_command

    def estop(self) -> None:
        """Signal to the engine that an E-stop event occurred.

        If an estop happens while the robot is moving, lower layers physically stop
        motion and raise the event as an exception, which fails the Protocol Engine
        command. No action from the `ProtocolEngine` caller is needed to handle that.

        However, if an estop happens in between commands, or in the middle of
        a command like `comment` or `waitForDuration` that doesn't access the hardware,
        `ProtocolEngine` needs to be told about it so it can interrupt the command
        and stop executing any more. This method is how to do that.

        This acts roughly like `request_stop()`. After calling this, you should call
        `finish()` with an EStopActivatedError.
        """
        try:
            action = self._state_store.commands.validate_action_allowed(
                StopAction(from_estop=True)
            )
        except Exception:  # todo(mm, 2024-04-16): Catch a more specific type.
            # This is likely called from some hardware API callback that doesn't care
            # about ProtocolEngine lifecycle or what methods are valid to call at what
            # times. So it makes more sense for us to no-op here than to propagate this
            # as an error.
            _log.info(
                "ProtocolEngine cannot handle E-stop event right now. Ignoring it.",
                exc_info=True,
            )
            return
        self._action_dispatcher.dispatch(action)
        # self._queue_worker.cancel() will try to interrupt any ongoing command.
        # Unfortunately, if it's a hardware command, this interruption will race
        # against the E-stop exception propagating up from lower layers. But we need to
        # do this because we want to make sure non-hardware commands, like
        # `waitForDuration`, are also interrupted.
        self._get_queue_worker.cancel()
        # Unlike self.request_stop(), we don't need to do
        # self._hardware_api.cancel_execution_and_running_tasks(). Since this was an
        # E-stop event, the hardware API already knows.

    async def request_stop(self) -> None:
        """Make command execution stop soon.

        This will try to interrupt the ongoing command, if there is one. Future commands
        are canceled. However, by the time this method returns, things may not have
        settled by the time this method returns; the last command may still be
        running.

        After a stop has been requested, the engine cannot be restarted.

        After a stop request, you must still call `finish` to give the engine a chance
        to clean up resources and propagate errors.
        """
        action = self._state_store.commands.validate_action_allowed(StopAction())
        self._action_dispatcher.dispatch(action)
        self._get_queue_worker.cancel()
        if self._hardware_api.is_movement_execution_taskified():
            # We 'taskify' hardware controller movement functions when running protocols
            # that are not backed by the engine. Such runs cannot be stopped by cancelling
            # the queue worker and hence need to be stopped via the execution manager.
            # `cancel_execution_and_running_tasks()` sets the execution manager in a CANCELLED state
            # and cancels the running tasks, which raises an error and gets us out of the
            # run function execution, just like `_queue_worker.cancel()` does for
            # engine-backed runs.
            await self._hardware_api.cancel_execution_and_running_tasks()

    async def wait_until_complete(self) -> None:
        """Wait until there are no more commands to execute.

        If a command encountered a fatal error, it's raised as an exception.
        """
        await self._state_store.wait_for(
            condition=self._state_store.commands.get_all_commands_final
        )
        self._state_store.commands.raise_fatal_command_error()

    async def finish(
        self,
        error: Optional[Exception] = None,
        drop_tips_after_run: bool = True,
        set_run_status: bool = True,
        post_run_hardware_state: PostRunHardwareState = PostRunHardwareState.HOME_AND_STAY_ENGAGED,
    ) -> None:
        """Finish using the `ProtocolEngine`.

        This does a few things:

        1. It may do post-run actions like homing and dropping tips. This depends on the
           arguments passed as well as heuristics based on the history of the engine.
        2. It waits for the engine to be done controlling the robot's hardware.
        3. It releases internal resources, like background tasks.

        It's safe to call `finish()` multiple times. After you call `finish()`,
        the engine can't be restarted.

        This method should not raise. If any exceptions happened during execution that were not
        properly caught by `ProtocolEngine` internals, or if any exceptions happen during this
        `finish()` call, they should be saved as `.state_view.get_summary().errors`.

        Arguments:
            error: An error that caused the stop, if applicable.
            drop_tips_after_run: Whether to drop tips as part of cleanup.
            set_run_status: Whether to calculate a `success` or `failure` run status.
                If `False`, will set status to `stopped`.
            post_run_hardware_state: The state in which to leave the gantry and motors in
                after the run is over.
        """
        if self._state_store.commands.get_is_stopped_by_estop():
            # This handles the case where the E-stop was pressed while we were *not* in the middle
            # of some hardware interaction that would raise it as an exception. For example, imagine
            # we were paused between two commands, or imagine we were executing a waitForDuration.
            drop_tips_after_run = False
            post_run_hardware_state = PostRunHardwareState.DISENGAGE_IN_PLACE
            if error is None:
                error = EStopActivatedError()

        if error:
            # If the run had an error, check if that error indicates an E-stop.
            # This handles the case where the run was in the middle of some hardware control
            # method and the hardware controller raised an E-stop error from it.
            #
            # To do this, we need to scan all the way through the error tree.
            # By the time E-stop error has gotten to us, it may have been wrapped in other errors,
            # so we need to unwrap them to uncover the E-stop error's inner beauty.
            #
            # We don't use self._hardware_api.get_estop_state() because the E-stop may have been
            # released by the time we get here.
            if isinstance(error, EnumeratedError):
                if code_in_error_tree(
                    root_error=error, code=ErrorCodes.E_STOP_ACTIVATED
                ) or code_in_error_tree(
                    # Request from the hardware team for the v7.0 betas: to help in-house debugging
                    # of pipette overpressure events, leave the pipette where it was like we do
                    # for E-stops.
                    root_error=error,
                    code=ErrorCodes.PIPETTE_OVERPRESSURE,
                ):
                    drop_tips_after_run = False
                    post_run_hardware_state = PostRunHardwareState.DISENGAGE_IN_PLACE

            error_details: Optional[FinishErrorDetails] = FinishErrorDetails(
                error_id=self._model_utils.generate_id(),
                created_at=self._model_utils.get_timestamp(),
                error=error,
            )
        else:
            error_details = None

        self._action_dispatcher.dispatch(
            FinishAction(error_details=error_details, set_run_status=set_run_status)
        )

        # We have a lot of independent things to tear down. If any teardown fails, we want
        # to continue with the rest, to avoid leaking resources or leaving the engine with a broken
        # state. We use an AsyncExitStack to avoid a gigantic try/finally tree. Note that execution
        # order will be backwards because the stack is first-in-last-out.
        exit_stack = AsyncExitStack()
        exit_stack.push_async_callback(self._plugin_starter.stop)  # Last step.
        exit_stack.push_async_callback(
            # Cleanup after hardware halt and reset the hardware controller
            self._hardware_stopper.do_stop_and_recover,
            post_run_hardware_state=post_run_hardware_state,
            drop_tips_after_run=drop_tips_after_run,
        )
        exit_stack.callback(self._door_watcher.stop)

        disengage_before_stopping = (
            False
            if post_run_hardware_state == PostRunHardwareState.STAY_ENGAGED_IN_PLACE
            else True
        )
        # Halt any movements immediately
        exit_stack.push_async_callback(
            self._hardware_stopper.do_halt,
            disengage_before_stopping=disengage_before_stopping,
        )
        exit_stack.push_async_callback(self._get_queue_worker.join)  # First step.
        try:
            # If any teardown steps failed, this will raise something.
            await exit_stack.aclose()
        except Exception as hardware_stopped_exception:
            _log.exception("Exception during post-run finish steps.")
            finish_error_details: Optional[FinishErrorDetails] = FinishErrorDetails(
                error_id=self._model_utils.generate_id(),
                created_at=self._model_utils.get_timestamp(),
                error=hardware_stopped_exception,
            )
        else:
            finish_error_details = None

        self._action_dispatcher.dispatch(
            HardwareStoppedAction(
                completed_at=self._model_utils.get_timestamp(),
                finish_error_details=finish_error_details,
            )
        )

    def add_labware_offset(
        self, request: LabwareOffsetCreate | LegacyLabwareOffsetCreate
    ) -> LabwareOffset:
        """Add a new labware offset and return it.

        The added offset will apply to subsequent `LoadLabwareCommand`s.

        To retrieve offsets later, see `.state_view.labware`.
        """
        internal_request = (
            labware_offset_standardization.standardize_labware_offset_create(
                request,
                self.state_view.config.robot_type,
                self.state_view.addressable_areas.deck_definition,
            )
        )

        labware_offset_id = self._model_utils.generate_id()
        created_at = self._model_utils.get_timestamp()
        self._action_dispatcher.dispatch(
            AddLabwareOffsetAction(
                labware_offset_id=labware_offset_id,
                created_at=created_at,
                request=internal_request,
            )
        )
        return self.state_view.labware.get_labware_offset(
            labware_offset_id=labware_offset_id
        )

    def add_labware_definition(self, definition: LabwareDefinition) -> LabwareUri:
        """Add a labware definition to the state for subsequent labware loads."""
        self._action_dispatcher.dispatch(
            AddLabwareDefinitionAction(definition=definition)
        )
        return self._state_store.labware.get_uri_from_definition(definition)

    def add_liquid(
        self,
        name: str,
        color: Optional[HexColor],
        description: Optional[str],
        id: Optional[str] = None,
    ) -> Liquid:
        """Add a liquid to the state for subsequent liquid loads."""
        if id is None:
            id = self._model_utils.generate_id()

        liquid = Liquid(
            id=id,
            displayName=name,
            description=(description or ""),
            displayColor=color,
        )
        validated_liquid = self._state_store.liquid.validate_liquid_allowed(
            liquid=liquid
        )

        self._action_dispatcher.dispatch(AddLiquidAction(liquid=validated_liquid))
        return validated_liquid

    def add_addressable_area(self, addressable_area_name: str) -> None:
        """Add an addressable area to state."""
        self._action_dispatcher.dispatch(
            AddAddressableAreaAction(addressable_area_name)
        )

    def reset_tips(self, labware_id: str) -> None:
        """Reset the tip state of a given labware."""
        # TODO(mm, 2023-03-10): Safely raise an error if the given labware isn't a
        # tip rack?
        self._action_dispatcher.dispatch(ResetTipsAction(labware_id=labware_id))

    # TODO(mm, 2022-11-10): This is a method on ProtocolEngine instead of a command
    # as a quick hack to support Python protocols. We should consider making this a
    # command, or adding speed parameters to existing commands.
    # https://opentrons.atlassian.net/browse/RCORE-373
    def set_pipette_movement_speed(
        self, pipette_id: str, speed: Optional[float]
    ) -> None:
        """Set the speed of a pipette's X/Y/Z movements. Does not affect plunger speed.

        None will use the hardware API's default.
        """
        self._action_dispatcher.dispatch(
            SetPipetteMovementSpeedAction(pipette_id=pipette_id, speed=speed)
        )

    async def use_attached_modules(
        self,
        modules_by_id: Dict[str, HardwareModuleAPI],
    ) -> None:
        """Load attached modules directly into state, without locations."""
        actions = [
            AddModuleAction(
                module_id=module_id,
                serial_number=mod.device_info["serial"],
                definition=self._module_data_provider.get_definition(
                    ModuleModel(mod.model())
                ),
                module_live_data=mod.live_data,
            )
            for module_id, mod in modules_by_id.items()
        ]

        for a in actions:
            self._action_dispatcher.dispatch(a)

    def set_and_start_queue_worker(
        self, command_generator: Callable[[], AsyncGenerator[str, None]]
    ) -> None:
        """Set QueueWorker and start it."""
        assert self._queue_worker is None
        self._queue_worker = create_queue_worker(
            hardware_api=self._hardware_api,
            file_provider=self._file_provider,
            state_store=self._state_store,
            action_dispatcher=self._action_dispatcher,
            command_generator=command_generator,
        )
        self._queue_worker.start()

    def set_error_recovery_policy(self, policy: ErrorRecoveryPolicy) -> None:
        """Replace the run's error recovery policy with a new one."""
        self._action_dispatcher.dispatch(SetErrorRecoveryPolicyAction(policy))


# TODO(tz, 7-12-23): move this to shared data when we dont relay on ErrorOccurrence
def code_in_error_tree(
    root_error: Union[EnumeratedError, ErrorOccurrence], code: ErrorCodes
) -> bool:
    """Check if the specified error code can be found in the given error tree."""
    if isinstance(root_error, ErrorOccurrence):
        # ErrorOccurrence is not the same as the enumerated error exceptions. Check the
        # code by a string value.
        if root_error.errorCode == code.value.code:
            return True
        return any(
            code_in_error_tree(wrapped, code) for wrapped in root_error.wrappedErrors
        )

    # From here we have an exception, can just check the code + recurse to wrapped errors.
    if root_error.code == code:
        return True

    if (
        isinstance(root_error, ProtocolCommandFailedError)
        and root_error.original_error is not None
    ):
        # For this specific EnumeratedError child, we recurse on the original_error field
        # in favor of the general error.wrapping field.
        return code_in_error_tree(root_error.original_error, code)

    if len(root_error.wrapping) == 0:
        return False
    return any(
        code_in_error_tree(wrapped_error, code) for wrapped_error in root_error.wrapping
    )
