"""Command side-effect execution logic container."""
import asyncio
from logging import getLogger
from typing import Optional, List, Protocol

from opentrons.hardware_control import HardwareControlAPI

from opentrons_shared_data.errors.exceptions import (
    EStopActivatedError,
    EnumeratedError,
    PythonException,
)

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.notes import make_error_recovery_debug_note

from ..state.state import StateStore
from ..resources import ModelUtils, FileProvider
from ..commands import CommandStatus
from ..actions import (
    ActionDispatcher,
    RunCommandAction,
    SucceedCommandAction,
    FailCommandAction,
)
from ..errors import RunStoppedError
from ..errors.exceptions import EStopActivatedError as PE_EStopActivatedError
from ..notes import CommandNote, CommandNoteTracker
from .equipment import EquipmentHandler
from .movement import MovementHandler
from .gantry_mover import GantryMover
from .labware_movement import LabwareMovementHandler
from .pipetting import PipettingHandler
from .tip_handler import TipHandler
from .run_control import RunControlHandler
from .rail_lights import RailLightsHandler
from .status_bar import StatusBarHandler


log = getLogger(__name__)


class CommandNoteTrackerProvider(Protocol):
    """The correct shape for a function that provides a CommandNoteTracker.

    This function will be called by the executor once for each call to execute().
    It is mostly useful for testing harnesses.
    """

    def __call__(self) -> CommandNoteTracker:
        """Provide a new CommandNoteTracker."""
        ...


class _NoteTracker(CommandNoteTracker):
    def __init__(self) -> None:
        self._notes: List[CommandNote] = []

    def __call__(self, note: CommandNote) -> None:
        self._notes.append(note)

    def get_notes(self) -> List[CommandNote]:
        return self._notes


class CommandExecutor:
    """CommandExecutor container class.

    CommandExecutor manages various child handlers that define procedures to
    execute the side-effects of commands.
    """

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        file_provider: FileProvider,
        state_store: StateStore,
        action_dispatcher: ActionDispatcher,
        equipment: EquipmentHandler,
        movement: MovementHandler,
        gantry_mover: GantryMover,
        labware_movement: LabwareMovementHandler,
        pipetting: PipettingHandler,
        tip_handler: TipHandler,
        run_control: RunControlHandler,
        rail_lights: RailLightsHandler,
        status_bar: StatusBarHandler,
        model_utils: Optional[ModelUtils] = None,
        command_note_tracker_provider: Optional[CommandNoteTrackerProvider] = None,
    ) -> None:
        """Initialize the CommandExecutor with access to its dependencies."""
        self._hardware_api = hardware_api
        self._file_provider = file_provider
        self._state_store = state_store
        self._action_dispatcher = action_dispatcher
        self._equipment = equipment
        self._movement = movement
        self._gantry_mover = gantry_mover
        self._labware_movement = labware_movement
        self._pipetting = pipetting
        self._tip_handler = tip_handler
        self._run_control = run_control
        self._rail_lights = rail_lights
        self._model_utils = model_utils or ModelUtils()
        self._status_bar = status_bar
        self._command_note_tracker_provider = (
            command_note_tracker_provider or _NoteTracker
        )

    async def execute(self, command_id: str) -> None:
        """Run a given command's execution procedure.

        Arguments:
            command_id: The identifier of the command to execute. The
                command itself will be looked up from state.
        """
        queued_command = self._state_store.commands.get(command_id=command_id)
        note_tracker = self._command_note_tracker_provider()
        command_impl = queued_command._ImplementationCls(
            state_view=self._state_store,
            hardware_api=self._hardware_api,
            file_provider=self._file_provider,
            equipment=self._equipment,
            movement=self._movement,
            gantry_mover=self._gantry_mover,
            labware_movement=self._labware_movement,
            pipetting=self._pipetting,
            tip_handler=self._tip_handler,
            run_control=self._run_control,
            rail_lights=self._rail_lights,
            model_utils=self._model_utils,
            status_bar=self._status_bar,
            command_note_adder=note_tracker,
        )

        started_at = self._model_utils.get_timestamp()

        self._action_dispatcher.dispatch(
            RunCommandAction(command_id=queued_command.id, started_at=started_at)
        )
        running_command = self._state_store.commands.get(queued_command.id)
        error_recovery_policy = self._state_store.commands.get_error_recovery_policy()

        log.debug(
            f"Executing {running_command.id}, {running_command.commandType}, {running_command.params}"
        )
        try:
            result = await command_impl.execute(
                running_command.params  # type: ignore[arg-type]
            )

        except (Exception, asyncio.CancelledError) as error:
            # The command encountered an undefined error.

            log.warning(f"Execution of {running_command.id} failed", exc_info=error)
            # TODO(mc, 2022-11-14): mark command as stopped rather than failed
            # https://opentrons.atlassian.net/browse/RCORE-390
            if isinstance(error, asyncio.CancelledError):
                error = RunStoppedError("Run was cancelled")
            elif isinstance(error, EStopActivatedError):
                error = PE_EStopActivatedError(wrapping=[error])
            elif not isinstance(error, EnumeratedError):
                error = PythonException(error)

            error_recovery_type = error_recovery_policy(
                self._state_store.config,
                running_command,
                None,
            )
            note_tracker(make_error_recovery_debug_note(error_recovery_type))
            self._action_dispatcher.dispatch(
                FailCommandAction(
                    error=error,
                    command_id=running_command.id,
                    running_command=running_command,
                    error_id=self._model_utils.generate_id(),
                    failed_at=self._model_utils.get_timestamp(),
                    notes=note_tracker.get_notes(),
                    type=error_recovery_type,
                )
            )

        else:
            if isinstance(result, SuccessData):
                update = {
                    "result": result.public,
                    "status": CommandStatus.SUCCEEDED,
                    "completedAt": self._model_utils.get_timestamp(),
                    "notes": note_tracker.get_notes(),
                }
                succeeded_command = running_command.model_copy(update=update)
                self._action_dispatcher.dispatch(
                    SucceedCommandAction(
                        command=succeeded_command,
                        state_update=result.state_update,
                    ),
                )
            else:
                # The command encountered a defined error.
                error_recovery_type = error_recovery_policy(
                    self._state_store.config,
                    running_command,
                    result,
                )
                note_tracker(make_error_recovery_debug_note(error_recovery_type))
                self._action_dispatcher.dispatch(
                    FailCommandAction(
                        error=result,
                        command_id=running_command.id,
                        running_command=running_command,
                        error_id=result.public.id,
                        failed_at=result.public.createdAt,
                        notes=note_tracker.get_notes(),
                        type=error_recovery_type,
                    )
                )
