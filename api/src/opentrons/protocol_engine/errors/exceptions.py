"""Protocol engine exceptions."""

from __future__ import annotations

from logging import getLogger
from typing import Any, Dict, Final, Optional, Union, Iterator, Sequence, TYPE_CHECKING

from opentrons_shared_data.errors import ErrorCodes
from opentrons_shared_data.errors.exceptions import EnumeratedError, PythonException

if TYPE_CHECKING:
    from opentrons.protocol_engine.types import TipGeometry


log = getLogger(__name__)


class ProtocolEngineError(EnumeratedError):
    """Base Protocol Engine error class."""

    def __init__(
        self,
        code: Optional[ErrorCodes] = None,
        message: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ProtocolEngineError."""
        super().__init__(
            code=code or ErrorCodes.GENERAL_ERROR,
            message=message,
            detail=detail,
            wrapping=wrapping,
        )


class UnexpectedProtocolError(ProtocolEngineError):
    """Raised when an unexpected error occurs.

    This error is indicative of a software bug. If it happens, it means an
    exception was raised somewhere in the stack and it was not properly caught
    and wrapped.
    """

    def __init__(
        self,
        message: Optional[str] = None,
        wrapping: Optional[Sequence[Union[EnumeratedError, BaseException]]] = None,
    ) -> None:
        """Initialize an UnexpectedProtocolError with an original error."""

        def _convert_exc() -> Iterator[EnumeratedError]:
            if not wrapping:
                return
            for exc in wrapping:
                if isinstance(exc, EnumeratedError):
                    yield exc
                else:
                    yield PythonException(exc)

        super().__init__(
            code=ErrorCodes.GENERAL_ERROR,
            message=message,
            wrapping=[e for e in _convert_exc()],
        )


# TODO(mc, 2020-10-18): differentiate between pipette missing vs incorrect.
# By comparison, loadModule uses ModuleAlreadyPresentError and ModuleNotAttachedError.
class FailedToLoadPipetteError(ProtocolEngineError):
    """Raised when a LoadPipette command fails.

    This failure may be caused by:
    - An incorrect pipette already attached to the mount
    - A missing pipette on the requested mount
    """

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a FailedToLoadPipetteError."""
        super().__init__(ErrorCodes.PIPETTE_NOT_PRESENT, message, details, wrapping)


# TODO(mc, 2020-10-18): differentiate between pipette missing vs incorrect
class PipetteNotAttachedError(ProtocolEngineError):
    """Raised when an operation's required pipette is not attached."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PipetteNotAttachedError."""
        super().__init__(ErrorCodes.PIPETTE_NOT_PRESENT, message, details, wrapping)


class InvalidLoadPipetteSpecsError(ProtocolEngineError):
    """Raised when a loadPipette uses invalid specifications."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an InvalidLoadPipetteSpecsError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidSpecificationForRobotTypeError(ProtocolEngineError):
    """Raised when a command provides invalid specs for the given robot type."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an InvalidSpecificationForRobotTypeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class TipNotAttachedError(ProtocolEngineError):
    """Raised when an operation's required pipette tip is not attached."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PipetteNotAttachedError."""
        super().__init__(ErrorCodes.UNEXPECTED_TIP_REMOVAL, message, details, wrapping)


class PickUpTipTipNotAttachedError(TipNotAttachedError):
    """Raised from TipHandler.pick_up_tip().

    This is like TipNotAttachedError except that it carries some extra information
    about the attempted operation.
    """

    tip_geometry: Final[TipGeometry]
    """The tip geometry that would have been on the pipette, had the operation succeeded."""

    def __init__(self, tip_geometry: TipGeometry) -> None:
        super().__init__()
        self.tip_geometry = tip_geometry


class TipAttachedError(ProtocolEngineError):
    """Raised when a tip shouldn't be attached, but is."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PIpetteNotAttachedError."""
        super().__init__(ErrorCodes.UNEXPECTED_TIP_ATTACH, message, details, wrapping)


class CommandDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a command that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a CommandDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareNotLoadedError(ProtocolEngineError):
    """Raised when referencing a labware that has not been loaded."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareNotLoadedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareNotLoadedOnModuleError(ProtocolEngineError):
    """Raised when there is no labware loaded on the requested module."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareNotLoadedOnModuleError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareNotLoadedOnLabwareError(ProtocolEngineError):
    """Raised when there is no labware loaded on the requested labware."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareNotLoadedOnLabwareError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareNotOnDeckError(ProtocolEngineError):
    """Raised when a labware can't be used because it's off-deck."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareNotOnDeckError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LiquidDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a liquid that has not been loaded."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LiquidDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidLiquidError(ProtocolEngineError):
    """Raised when attempting to add a liquid with an invalid property."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an InvalidLiquidError."""
        super().__init__(ErrorCodes.INVALID_PROTOCOL_DATA, message, details, wrapping)


class LabwareDefinitionDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a labware definition that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareDefinitionDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareCannotBeStackedError(ProtocolEngineError):
    """Raised when trying to load labware onto another labware it is not defined to be loaded onto."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareCannotBeStackedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareCannotSitOnDeckError(ProtocolEngineError):
    """Raised when a labware is incompatible with a deck slot."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareCannotSitOnDeckError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareIsInStackError(ProtocolEngineError):
    """Raised when trying to move to or physically interact with a labware that has another labware on top."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareIsInStackError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareOffsetDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a labware offset that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareOffsetDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareIsNotTipRackError(ProtocolEngineError):
    """Raised when trying to use a regular labware as a tip rack."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareIsNotTiprackError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareIsTipRackError(ProtocolEngineError):
    """Raised when trying to use a command not allowed on tip rack."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareIsTiprackError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareIsAdapterError(ProtocolEngineError):
    """Raised when trying to use a command not allowed on adapter."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareIsAdapterError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class TouchTipDisabledError(ProtocolEngineError):
    """Raised when touch tip is used on well with touchTipDisabled quirk."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a TouchTipDisabledError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class TouchTipIncompatibleArgumentsError(ProtocolEngineError):
    """Raised when touch tip is used with both a custom radius and a mmFromEdge argument."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a TouchTipIncompatibleArgumentsError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class UnsupportedLabwareForActionError(ProtocolEngineError):
    """Raised when trying to use an unsupported labware for a command."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a UnsupportedLabwareForActionError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class WellDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a well that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a WellDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class PipetteNotLoadedError(ProtocolEngineError):
    """Raised when referencing a pipette that has not been loaded."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PipetteNotLoadedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ModuleNotLoadedError(ProtocolEngineError):
    """Raised when referencing a module that has not been loaded."""

    def __init__(self, *, module_id: str) -> None:
        super().__init__(ErrorCodes.GENERAL_ERROR, f"Module {module_id} not found.")


class ModuleNotOnDeckError(ProtocolEngineError):
    """Raised when trying to use a module that is loaded off the deck."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ModuleNotOnDeckError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ModuleNotConnectedError(ProtocolEngineError):
    """Raised when trying to use a module that is not connected to the robot electrically."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ModuleNotConnectedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class SlotDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a deck slot that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a SlotDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class CutoutDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a cutout that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a CutoutDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class FixtureDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a cutout fixture that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a FixtureDoesNotExist."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class AddressableAreaDoesNotExistError(ProtocolEngineError):
    """Raised when referencing an addressable area that does not exist."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a AddressableAreaDoesNotExistError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class FixtureDoesNotProvideAreasError(ProtocolEngineError):
    """Raised when a cutout fixture does not provide any addressable areas for a requested cutout."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a FixtureDoesNotProvideAreasError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class AreaNotInDeckConfigurationError(ProtocolEngineError):
    """Raised when an addressable area is referenced that is not provided by a deck configuration."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a AreaNotInDeckConfigurationError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class IncompatibleAddressableAreaError(ProtocolEngineError):
    """Raised when two non-compatible addressable areas are referenced during analysis."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a IncompatibleAddressableAreaError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


# TODO(mc, 2020-11-06): flesh out with structured data to replicate
# existing LabwareHeightError
class FailedToPlanMoveError(ProtocolEngineError):
    """Raised when a requested movement could not be planned."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a FailedToPlanmoveError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class MustHomeError(ProtocolEngineError):
    """Raised when motors must be homed due to unknown current position."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a MustHomeError."""
        super().__init__(ErrorCodes.POSITION_UNKNOWN, message, details, wrapping)


class CommandNotAllowedError(ProtocolEngineError):
    """Raised when adding a command with bad data."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a CommandNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class FixitCommandNotAllowedError(ProtocolEngineError):
    """Raised when adding a fixit command to a non-recoverable engine."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a SetupCommandNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class SetupCommandNotAllowedError(ProtocolEngineError):
    """Raised when adding a setup command to a non-idle/non-paused engine."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a SetupCommandNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ResumeFromRecoveryNotAllowedError(ProtocolEngineError):
    """Raised when attempting to resume a run from recovery that has a fixit command in the queue."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ResumeFromRecoveryNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class PauseNotAllowedError(ProtocolEngineError):
    """Raised when attempting to pause a run that is not running."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PauseNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class RunStoppedError(ProtocolEngineError):
    """Raised when attempting to interact with a stopped engine."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a RunStoppedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ModuleNotAttachedError(ProtocolEngineError):
    """Raised when a requested module is not attached."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ModuleNotAttached."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ModuleAlreadyPresentError(ProtocolEngineError):
    """Raised when a module is already present in a requested location."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ModuleAlreadyPresentError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class WrongModuleTypeError(ProtocolEngineError):
    """Raised when performing a module action on the wrong kind of module."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a WrongModuleTypeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class ThermocyclerNotOpenError(ProtocolEngineError):
    """Raised when trying to move to a labware that's in a closed Thermocycler."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a ThermocyclerNotOpenError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class RobotDoorOpenError(ProtocolEngineError):
    """Raised when executing a protocol command when a robot door is open."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a RobotDoorOpenError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class PipetteMovementRestrictedByHeaterShakerError(ProtocolEngineError):
    """Raised when trying to move to labware that's restricted by a module."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PipetteMovementRestrictedByHeaterShakerError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class HeaterShakerLabwareLatchNotOpenError(ProtocolEngineError):
    """Raised when Heater-Shaker latch is not open when it is expected to be so."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a HeaterShakerLabwareLatchNotOpenError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class HeaterShakerLabwareLatchStatusUnknown(ProtocolEngineError):
    """Raised when Heater-Shaker latch has not been set before moving to it."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a HeaterShakerLabwareLatchStatusUnknown."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class EngageHeightOutOfRangeError(ProtocolEngineError):
    """Raised when a Magnetic Module engage height is out of bounds."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a EngageHeightOutOfRangeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class NoMagnetEngageHeightError(ProtocolEngineError):
    """Raised if a Magnetic Module engage height is missing."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a NoMagnetEngageHeightError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class NoTargetTemperatureSetError(ProtocolEngineError):
    """Raised when awaiting temperature when no target was set."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a NoTargetTemperatureSetError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidTargetTemperatureError(ProtocolEngineError):
    """Raised when attempting to set an invalid target temperature."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidTargetTemperatureError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidBlockVolumeError(ProtocolEngineError):
    """Raised when attempting to set an invalid block max volume."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidBlockVolumeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidWavelengthError(ProtocolEngineError):
    """Raised when attempting to set an invalid absorbance wavelength."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidWavelengthError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidHoldTimeError(ProtocolEngineError):
    """An error raised when attempting to set an invalid temperature hold time."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidHoldTimeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidTargetSpeedError(ProtocolEngineError):
    """Raised when attempting to set an invalid target speed."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidTargetSpeedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class CannotPerformModuleAction(ProtocolEngineError):
    """Raised when trying to perform an illegal hardware module action."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a CannotPerformModuleAction."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class HardwareNotSupportedError(ProtocolEngineError):
    """Raised when executing a command on the wrong hardware."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a HardwareNotSupportedError."""
        super().__init__(
            ErrorCodes.NOT_SUPPORTED_ON_ROBOT_TYPE, message, details, wrapping
        )


class GripperNotAttachedError(ProtocolEngineError):
    """Raised when executing a gripper action without an attached gripper."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a GripperNotAttachedError."""
        super().__init__(ErrorCodes.GRIPPER_NOT_PRESENT, message, details, wrapping)


class CannotPerformGripperAction(ProtocolEngineError):
    """Raised when trying to perform an illegal gripper action."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a CannotPerformGripperAction."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareMovementNotAllowedError(ProtocolEngineError):
    """Raised when attempting an illegal labware movement."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareMovementNotAllowedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LabwareIsNotAllowedInLocationError(ProtocolEngineError):
    """Raised when attempting an illegal labware load into slot."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LabwareIsNotAllowedInLocationError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LocationIsOccupiedError(ProtocolEngineError):
    """Raised when attempting to place labware in a non-empty location."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LocationIsOccupiedError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LocationNotAccessibleByPipetteError(ProtocolEngineError):
    """Raised when attempting to move pipette to an inaccessible location."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LocationNotAccessibleByPipetteError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LocationIsStagingSlotError(ProtocolEngineError):
    """Raised when referencing a labware on a staging slot when trying to get standard deck slot."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LocationIsStagingSlotError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LocationIsLidDockSlotError(ProtocolEngineError):
    """Raised when referencing a labware on a lid dock slot when trying to get standard deck slot."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LocationIsLidDockSlotError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class FirmwareUpdateRequired(ProtocolEngineError):
    """Raised when the firmware needs to be updated."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LocationIsOccupiedError."""
        super().__init__(
            ErrorCodes.FIRMWARE_UPDATE_REQUIRED, message, details, wrapping
        )


class PipetteNotReadyToAspirateError(ProtocolEngineError):
    """Raised when the pipette is not ready to aspirate."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a PipetteNotReadyToAspirateError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidAspirateVolumeError(ProtocolEngineError):
    """Raised when pipetting a volume larger than the pipette volume."""

    def __init__(
        self,
        attempted_aspirate_volume: float,
        available_volume: float,
        max_pipette_volume: float,
        max_tip_volume: Optional[float],  # None if there's no tip.
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidPipettingVolumeError."""
        message = (
            f"Cannot aspirate {attempted_aspirate_volume} µL when only"
            f" {available_volume} is available in the tip."
        )
        details = {
            "attempted_aspirate_volume": attempted_aspirate_volume,
            "available_volume": available_volume,
            "max_pipette_volume": max_pipette_volume,
            "max_tip_volume": max_tip_volume,
        }
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidDispenseVolumeError(ProtocolEngineError):
    """Raised when attempting to dispense a volume that was not aspirated."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidDispenseVolumeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidPushOutVolumeError(ProtocolEngineError):
    """Raised when attempting to use an invalid volume for dispense push_out."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidPushOutVolumeError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidAxisForRobotType(ProtocolEngineError):
    """Raised when attempting to use an axis that is not present on the given type of robot."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a InvalidAxisForRobotType."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class InvalidLiquidHeightFound(ProtocolEngineError):
    """Raised when attempting to estimate liquid height based on volume fails."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an InvalidLiquidHeightFound error."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LiquidHeightUnknownError(ProtocolEngineError):
    """Raised when attempting to specify WellOrigin.MENISCUS before liquid probing has been done."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a LiquidHeightUnknownError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class EStopActivatedError(ProtocolEngineError):
    """Represents an E-stop event."""

    def __init__(
        self,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an EStopActivatedError."""
        super().__init__(
            code=ErrorCodes.E_STOP_ACTIVATED,
            message="E-stop activated.",
            wrapping=wrapping,
        )


class NotSupportedOnRobotType(ProtocolEngineError):
    """Raised when attempting to perform an action that is not supported for the given robot type."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a NotSupportedOnRobotType exception."""
        super().__init__(
            ErrorCodes.NOT_SUPPORTED_ON_ROBOT_TYPE, message, details, wrapping
        )


class TipNotEmptyError(ProtocolEngineError):
    """Raised when an operation requires an empty tip but is provided a tip with liquid."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build a TipNotEmptyError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class IncompleteLabwareDefinitionError(ProtocolEngineError):
    """Raised when a labware definition lacks innerLabwareGeometry in general or for a specific well_id."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an IncompleteLabwareDefinitionError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class IncompleteWellDefinitionError(ProtocolEngineError):
    """Raised when a well definition lacks a geometryDefinitionId."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an IncompleteWellDefinitionError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class OperationLocationNotInWellError(ProtocolEngineError):
    """Raised when a calculated operation location is not within a well."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an OperationLocationNotInWellError."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class StorageLimitReachedError(ProtocolEngineError):
    """Raised to indicate that a file cannot be created due to storage limitations."""

    def __init__(
        self,
        message: Optional[str] = None,
        detail: Optional[Dict[str, str]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        """Build an StorageLimitReached."""
        super().__init__(ErrorCodes.GENERAL_ERROR, message, detail, wrapping)


class LiquidClassDoesNotExistError(ProtocolEngineError):
    """Raised when referencing a liquid class that has not been loaded."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)


class LiquidClassRedefinitionError(ProtocolEngineError):
    """Raised when attempting to load a liquid class that conflicts with a liquid class already loaded."""

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        wrapping: Optional[Sequence[EnumeratedError]] = None,
    ) -> None:
        super().__init__(ErrorCodes.GENERAL_ERROR, message, details, wrapping)
