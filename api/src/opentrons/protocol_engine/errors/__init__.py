"""Protocol engine errors module."""

from .exceptions import (
    ProtocolEngineError,
    UnexpectedProtocolError,
    FailedToLoadPipetteError,
    PipetteNotAttachedError,
    CommandDoesNotExistError,
    LabwareDoesNotExistError,
    LabwareDefinitionDoesNotExistError,
    LabwareOffsetDoesNotExistError,
    LabwareIsNotTipRackError,
    WellDoesNotExistError,
    PipetteDoesNotExistError,
    PipetteTipInfoNotFoundError,
    ModuleDoesNotExistError,
    SlotDoesNotExistError,
    FailedToPlanMoveError,
    MustHomeError,
    ProtocolEngineStoppedError,
    WellOriginNotAllowedError,
    ModuleNotAttachedError,
    ModuleAlreadyPresentError,
    WrongModuleTypeError,
    ThermocyclerNotOpenError,
    RobotDoorOpenError,
)

from .error_occurrence import ErrorOccurrence

__all__ = [
    # exceptions
    "ProtocolEngineError",
    "UnexpectedProtocolError",
    "FailedToLoadPipetteError",
    "PipetteNotAttachedError",
    "CommandDoesNotExistError",
    "LabwareDoesNotExistError",
    "LabwareDefinitionDoesNotExistError",
    "LabwareOffsetDoesNotExistError",
    "LabwareIsNotTipRackError",
    "WellDoesNotExistError",
    "PipetteDoesNotExistError",
    "PipetteTipInfoNotFoundError",
    "ModuleDoesNotExistError",
    "SlotDoesNotExistError",
    "FailedToPlanMoveError",
    "MustHomeError",
    "ProtocolEngineStoppedError",
    "WellOriginNotAllowedError",
    "ModuleNotAttachedError",
    "ModuleAlreadyPresentError",
    "WrongModuleTypeError",
    "ThermocyclerNotOpenError",
    "RobotDoorOpenError",
    # error occurrence models
    "ErrorOccurrence",
]
