"""State store actions.

Actions can be passed to the ActionDispatcher, where they will trigger
reactions in objects that subscribe to the pipeline, like the StateStore.
"""
import dataclasses
from datetime import datetime
from enum import Enum
from typing import List, Optional, Union

from opentrons_shared_data.errors import EnumeratedError
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from opentrons.hardware_control.types import DoorState
from opentrons.hardware_control.modules import LiveData

from ..commands import (
    Command,
    CommandCreate,
    CommandDefinedErrorData,
)
from ..error_recovery_policy import ErrorRecoveryPolicy, ErrorRecoveryType
from ..notes.notes import CommandNote
from ..state.update_types import StateUpdate
from ..types import (
    LabwareOffsetCreateInternal,
    ModuleDefinition,
    Liquid,
    DeckConfigurationType,
)


@dataclasses.dataclass(frozen=True)
class PlayAction:
    """Start or resume processing commands in the engine."""

    requested_at: datetime


class PauseSource(str, Enum):
    """The source of a PauseAction.

    Attributes:
        CLIENT: the pause came externally, from the engine client.
        PROTOCOL: the pause came from the protocol itself.
    """

    CLIENT = "client"
    PROTOCOL = "protocol"


@dataclasses.dataclass(frozen=True)
class PauseAction:
    """Pause processing commands in the engine."""

    source: PauseSource


@dataclasses.dataclass(frozen=True)
class StopAction:
    """Request engine execution to stop soon."""

    from_estop: bool = False


@dataclasses.dataclass(frozen=True)
class ResumeFromRecoveryAction:
    """See `ProtocolEngine.resume_from_recovery()`."""

    state_update: StateUpdate


@dataclasses.dataclass(frozen=True)
class FinishErrorDetails:
    """Error details for the payload of a FinishAction or HardwareStoppedAction."""

    error: Exception
    error_id: str
    created_at: datetime


@dataclasses.dataclass(frozen=True)
class FinishAction:
    """Gracefully stop processing commands in the engine."""

    set_run_status: bool = True
    """Whether to set the engine status depending on `error_details`.

    If True, the engine status will be marked `succeeded` or `failed`, depending on `error_details`.
    If False, the engine status will be marked `stopped`.
    """

    error_details: Optional[FinishErrorDetails] = None
    """The fatal error that caused the run to fail."""


@dataclasses.dataclass(frozen=True)
class HardwareStoppedAction:
    """An action dispatched after hardware has been stopped for good, for this engine instance."""

    completed_at: datetime

    finish_error_details: Optional[FinishErrorDetails]
    """The error that happened while doing post-run finish steps (homing and dropping tips)."""


@dataclasses.dataclass(frozen=True)
class DoorChangeAction:
    """Handle events coming in from hardware control."""

    door_state: DoorState


@dataclasses.dataclass(frozen=True)
class QueueCommandAction:
    """Add a command request to the queue."""

    command_id: str
    created_at: datetime
    request: CommandCreate
    request_hash: Optional[str]
    failed_command_id: Optional[str] = None


@dataclasses.dataclass(frozen=True)
class RunCommandAction:
    """Mark a given command as running.

    At the time of dispatching this action, the command must be queued,
    and no other command may be running.
    """

    command_id: str
    started_at: datetime


@dataclasses.dataclass(frozen=True)
class SucceedCommandAction:
    """Mark a given command as succeeded.

    At the time of dispatching this action, the command must be running.
    """

    command: Command
    """The command in its new succeeded state."""

    state_update: StateUpdate = dataclasses.field(
        # todo(mm, 2024-08-26): This has a default only to make it easier to transition
        # old tests while https://opentrons.atlassian.net/browse/EXEC-639 is in
        # progress. Make this mandatory when that's completed.
        default_factory=StateUpdate
    )


@dataclasses.dataclass(frozen=True)
class FailCommandAction:
    """Mark a given command as failed.

    At the time of dispatching this action, the command must be running.
    """

    command_id: str
    """The command to fail."""

    error_id: str
    """An ID to assign to the command's error.

    Must be unique to this occurrence of the error.

    todo(mm, 2024-05-13): This is redundant with `error` when it's a defined error.
    """

    failed_at: datetime
    """When the command failed.

    todo(mm, 2024-05-13): This is redundant with `error` when it's a defined error.
    """

    error: Union[CommandDefinedErrorData, EnumeratedError]
    """The error that caused the command to fail.

    If it was a defined error, this should be the `DefinedErrorData` that the command
    returned.

    If it was an undefined error, this should be the underlying exception
    that caused the command to fail, represented as an `EnumeratedError`.
    """

    notes: List[CommandNote]
    """Overwrite the command's `.notes` with these."""

    type: ErrorRecoveryType
    """How this error should be handled in the context of the overall run."""

    # This is a quick hack so FailCommandAction handlers can get the params of the
    # command that failed. We probably want this to be a new "failure details"
    # object instead, similar to how succeeded commands can send a "private result"
    # to Protocol Engine internals.
    running_command: Command
    """The command to fail, in its prior `running` state."""


@dataclasses.dataclass(frozen=True)
class AddLabwareOffsetAction:
    """Add a labware offset, to apply to subsequent `LoadLabwareCommand`s."""

    labware_offset_id: str
    created_at: datetime
    request: LabwareOffsetCreateInternal


@dataclasses.dataclass(frozen=True)
class AddLabwareDefinitionAction:
    """Add a labware definition, to apply to subsequent `LoadLabwareCommand`s."""

    definition: LabwareDefinition


@dataclasses.dataclass(frozen=True)
class AddLiquidAction:
    """Add a liquid, to apply to subsequent `LoadLiquid`s."""

    liquid: Liquid


@dataclasses.dataclass(frozen=True)
class SetDeckConfigurationAction:
    """See `ProtocolEngine.set_deck_configuration()`."""

    deck_configuration: Optional[DeckConfigurationType]


@dataclasses.dataclass(frozen=True)
class AddAddressableAreaAction:
    """Add a single addressable area to state.

    This differs from the deck configuration in SetDeckConfigurationAction which
    sends over a mapping of cutout fixtures. This action will only load one addressable
    area and that should be pre-validated before being sent via the action.
    """

    addressable_area_name: str


@dataclasses.dataclass(frozen=True)
class AddModuleAction:
    """Add an attached module directly to state without a location."""

    module_id: str
    serial_number: str
    definition: ModuleDefinition
    module_live_data: LiveData


@dataclasses.dataclass(frozen=True)
class ResetTipsAction:
    """Reset the tip tracking state of a given tip rack."""

    labware_id: str


@dataclasses.dataclass(frozen=True)
class SetPipetteMovementSpeedAction:
    """Set the speed of a pipette's X/Y/Z movements. Does not affect plunger speed.

    None will use the hardware API's default.
    """

    pipette_id: str
    speed: Optional[float]


@dataclasses.dataclass(frozen=True)
class SetErrorRecoveryPolicyAction:
    """See `ProtocolEngine.set_error_recovery_policy()`."""

    error_recovery_policy: ErrorRecoveryPolicy


Action = Union[
    PlayAction,
    PauseAction,
    StopAction,
    ResumeFromRecoveryAction,
    FinishAction,
    HardwareStoppedAction,
    DoorChangeAction,
    QueueCommandAction,
    RunCommandAction,
    SucceedCommandAction,
    FailCommandAction,
    AddLabwareOffsetAction,
    AddLabwareDefinitionAction,
    AddModuleAction,
    SetDeckConfigurationAction,
    AddAddressableAreaAction,
    AddLiquidAction,
    ResetTipsAction,
    SetPipetteMovementSpeedAction,
    SetErrorRecoveryPolicyAction,
]
