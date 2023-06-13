"""Protocol engine errors module."""

from .exceptions import (
    ProtocolEngineError,
    UnexpectedProtocolError,
    FailedToLoadPipetteError,
    PipetteNotAttachedError,
    TipNotAttachedError,
    TipAttachedError,
    CommandDoesNotExistError,
    LabwareNotLoadedError,
    LabwareNotLoadedOnModuleError,
    LabwareNotOnDeckError,
    LiquidDoesNotExistError,
    LabwareDefinitionDoesNotExistError,
    LabwareOffsetDoesNotExistError,
    LabwareIsNotTipRackError,
    LabwareIsTipRackError,
    TouchTipDisabledError,
    WellDoesNotExistError,
    PipetteNotLoadedError,
    ModuleNotLoadedError,
    ModuleNotOnDeckError,
    ModuleNotConnectedError,
    SlotDoesNotExistError,
    FailedToPlanMoveError,
    MustHomeError,
    RunStoppedError,
    SetupCommandNotAllowedError,
    ModuleNotAttachedError,
    ModuleAlreadyPresentError,
    WrongModuleTypeError,
    ThermocyclerNotOpenError,
    RobotDoorOpenError,
    PipetteMovementRestrictedByHeaterShakerError,
    HeaterShakerLabwareLatchNotOpenError,
    HeaterShakerLabwareLatchStatusUnknown,
    EngageHeightOutOfRangeError,
    NoTargetTemperatureSetError,
    InvalidTargetSpeedError,
    InvalidTargetTemperatureError,
    InvalidBlockVolumeError,
    InvalidHoldTimeError,
    CannotPerformModuleAction,
    PauseNotAllowedError,
    ProtocolCommandFailedError,
    GripperNotAttachedError,
    HardwareNotSupportedError,
    LabwareMovementNotAllowedError,
    LocationIsOccupiedError,
    InvalidAxisForRobotType,
)

from .error_occurrence import ErrorOccurrence

__all__ = [
    # exceptions
    "ProtocolEngineError",
    "UnexpectedProtocolError",
    "FailedToLoadPipetteError",
    "PipetteNotAttachedError",
    "TipNotAttachedError",
    "TipAttachedError",
    "CommandDoesNotExistError",
    "LabwareNotLoadedError",
    "LabwareNotLoadedOnModuleError",
    "LabwareNotOnDeckError",
    "LiquidDoesNotExistError",
    "LabwareDefinitionDoesNotExistError",
    "LabwareOffsetDoesNotExistError",
    "LabwareIsNotTipRackError",
    "LabwareIsTipRackError",
    "TouchTipDisabledError",
    "WellDoesNotExistError",
    "PipetteNotLoadedError",
    "ModuleNotLoadedError",
    "ModuleNotOnDeckError",
    "ModuleNotConnectedError",
    "SlotDoesNotExistError",
    "FailedToPlanMoveError",
    "MustHomeError",
    "RunStoppedError",
    "SetupCommandNotAllowedError",
    "ModuleNotAttachedError",
    "ModuleAlreadyPresentError",
    "WrongModuleTypeError",
    "ThermocyclerNotOpenError",
    "RobotDoorOpenError",
    "PipetteMovementRestrictedByHeaterShakerError",
    "HeaterShakerLabwareLatchNotOpenError",
    "HeaterShakerLabwareLatchStatusUnknown",
    "EngageHeightOutOfRangeError",
    "NoTargetTemperatureSetError",
    "InvalidTargetTemperatureError",
    "InvalidTargetSpeedError",
    "InvalidBlockVolumeError",
    "InvalidHoldTimeError",
    "CannotPerformModuleAction",
    "PauseNotAllowedError",
    "ProtocolCommandFailedError",
    "GripperNotAttachedError",
    "HardwareNotSupportedError",
    "LabwareMovementNotAllowedError",
    "LocationIsOccupiedError",
    "InvalidAxisForRobotType",
    # error occurrence models
    "ErrorOccurrence",
]
