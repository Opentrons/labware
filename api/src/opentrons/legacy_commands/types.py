from __future__ import annotations

from typing_extensions import Literal, Final, TypedDict
from typing import Optional, List, Sequence, TYPE_CHECKING, Union
from opentrons.hardware_control.modules import ThermocyclerStep

if TYPE_CHECKING:
    from opentrons.protocol_api import InstrumentContext
    from opentrons.protocol_api.labware import Well
    from opentrons.protocol_api.disposal_locations import TrashBin, WasteChute

from opentrons.types import Location


# type for subscriptions
COMMAND: Final = "command"

# Robot #

DELAY: Final = "command.DELAY"
HOME: Final = "command.HOME"
PAUSE: Final = "command.PAUSE"
RESUME: Final = "command.RESUME"
COMMENT: Final = "command.COMMENT"
MOVE_LABWARE: Final = "command.MOVE_LABWARE"

# Pipette #

ASPIRATE: Final = "command.ASPIRATE"
DISPENSE: Final = "command.DISPENSE"
DISPENSE_IN_DISPOSAL_LOCATION: Final = "command.DISPENSE_IN_DISPOSAL_LOCATION"
MIX: Final = "command.MIX"
CONSOLIDATE: Final = "command.CONSOLIDATE"
DISTRIBUTE: Final = "command.DISTRIBUTE"
TRANSFER: Final = "command.TRANSFER"
PICK_UP_TIP: Final = "command.PICK_UP_TIP"
DROP_TIP: Final = "command.DROP_TIP"
DROP_TIP_IN_DISPOSAL_LOCATION: Final = "command.DROP_TIP_IN_DISPOSAL_LOCATION"
BLOW_OUT: Final = "command.BLOW_OUT"
BLOW_OUT_IN_DISPOSAL_LOCATION: Final = "command.BLOW_OUT_IN_DISPOSAL_LOCATION"
AIR_GAP: Final = "command.AIR_GAP"
TOUCH_TIP: Final = "command.TOUCH_TIP"
RETURN_TIP: Final = "command.RETURN_TIP"
MOVE_TO: Final = "command.MOVE_TO"
MOVE_TO_DISPOSAL_LOCATION: Final = "command.MOVE_TO_DISPOSAL_LOCATION"
SEAL: Final = "command.SEAL"
UNSEAL: Final = "command.UNSEAL"
PRESSURIZE: Final = "command.PRESSURIZE"


# Modules #

HEATER_SHAKER_SET_TARGET_TEMPERATURE: Final = (
    "command.HEATER_SHAKER_SET_TARGET_TEMPERATURE"
)
HEATER_SHAKER_WAIT_FOR_TEMPERATURE: Final = "command.HEATER_SHAKER_WAIT_FOR_TEMPERATURE"
HEATER_SHAKER_SET_AND_WAIT_FOR_SHAKE_SPEED: Final = (
    "command.HEATER_SHAKER_SET_AND_WAIT_FOR_SHAKE_SPEED"
)
HEATER_SHAKER_OPEN_LABWARE_LATCH: Final = "command.HEATER_SHAKER_OPEN_LABWARE_LATCH"
HEATER_SHAKER_CLOSE_LABWARE_LATCH: Final = "command.HEATER_SHAKER_CLOSE_LABWARE_LATCH"
HEATER_SHAKER_DEACTIVATE_SHAKER: Final = "command.HEATER_SHAKER_DEACTIVATE_SHAKER"
HEATER_SHAKER_DEACTIVATE_HEATER: Final = "command.HEATER_SHAKER_DEACTIVATE_HEATER"

MAGDECK_CALIBRATE: Final = "command.MAGDECK_CALIBRATE"
MAGDECK_DISENGAGE: Final = "command.MAGDECK_DISENGAGE"
MAGDECK_ENGAGE: Final = "command.MAGDECK_ENGAGE"

TEMPDECK_DEACTIVATE: Final = "command.TEMPDECK_DEACTIVATE"
TEMPDECK_SET_TEMP: Final = "command.TEMPDECK_SET_TEMP"
TEMPDECK_AWAIT_TEMP: Final = "command.TEMPDECK_AWAIT_TEMP"

THERMOCYCLER_OPEN: Final = "command.THERMOCYCLER_OPEN"
THERMOCYCLER_CLOSE: Final = "command.THERMOCYCLER_CLOSE"
THERMOCYCLER_SET_BLOCK_TEMP: Final = "command.THERMOCYCLER_SET_BLOCK_TEMP"
THERMOCYCLER_EXECUTE_PROFILE: Final = "command.THERMOCYCLER_EXECUTE_PROFILE"
THERMOCYCLER_DEACTIVATE: Final = "command.THERMOCYCLER_DEACTIVATE"
THERMOCYCLER_WAIT_FOR_HOLD: Final = "command.THERMOCYCLER_WAIT_FOR_HOLD"
THERMOCYCLER_WAIT_FOR_TEMP: Final = "command.THERMOCYCLER_WAIT_FOR_TEMP"
THERMOCYCLER_WAIT_FOR_LID_TEMP: Final = "command.THERMOCYCLER_WAIT_FOR_LID_TEMP"
THERMOCYCLER_SET_LID_TEMP: Final = "command.THERMOCYCLER_SET_LID_TEMP"
THERMOCYCLER_DEACTIVATE_LID: Final = "command.THERMOCYCLER_DEACTIVATE_LID"
THERMOCYCLER_DEACTIVATE_BLOCK: Final = "command.THERMOCYCLER_DEACTIVATE_BLOCK"


class TextOnlyPayload(TypedDict):
    text: str


class MultiLocationPayload(TypedDict):
    locations: Sequence[Union[Location, Well]]


class OptionalMultiLocationPayload(TypedDict):
    locations: Optional[Sequence[Union[Location, Well]]]


class SingleInstrumentPayload(TypedDict):
    instrument: InstrumentContext


class MultiInstrumentPayload(TypedDict):
    instruments: Sequence[InstrumentContext]


class CommentCommandPayload(TextOnlyPayload):
    pass


class CommentCommand(TypedDict):
    name: Literal["command.COMMENT"]
    payload: CommentCommandPayload


class DelayCommandPayload(TextOnlyPayload):
    minutes: float
    seconds: float


class DelayCommand(TypedDict):
    name: Literal["command.DELAY"]
    payload: DelayCommandPayload


class PauseCommandPayload(TextOnlyPayload):
    userMessage: Optional[str]


class PauseCommand(TypedDict):
    name: Literal["command.PAUSE"]
    payload: PauseCommandPayload


class ResumeCommandPayload(TextOnlyPayload):
    pass


class ResumeCommand(TypedDict):
    name: Literal["command.RESUME"]
    payload: ResumeCommandPayload


class HeaterShakerSetTargetTemperaturePayload(TextOnlyPayload):
    pass


class HeaterShakerSetTargetTemperatureCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_SET_TARGET_TEMPERATURE"]
    payload: HeaterShakerSetTargetTemperaturePayload


class HeaterShakerWaitForTemperaturePayload(TextOnlyPayload):
    pass


class HeaterShakerWaitForTemperatureCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_WAIT_FOR_TEMPERATURE"]
    payload: HeaterShakerWaitForTemperaturePayload


class HeaterShakerSetAndWaitForShakeSpeedPayload(TextOnlyPayload):
    pass


class HeaterShakerSetAndWaitForShakeSpeedCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_SET_AND_WAIT_FOR_SHAKE_SPEED"]
    payload: HeaterShakerSetAndWaitForShakeSpeedPayload


class HeaterShakerOpenLabwareLatchPayload(TextOnlyPayload):
    pass


class HeaterShakerOpenLabwareLatchCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_OPEN_LABWARE_LATCH"]
    payload: HeaterShakerOpenLabwareLatchPayload


class HeaterShakerCloseLabwareLatchPayload(TextOnlyPayload):
    pass


class HeaterShakerCloseLabwareLatchCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_CLOSE_LABWARE_LATCH"]
    payload: HeaterShakerCloseLabwareLatchPayload


class HeaterShakerDeactivateShakerPayload(TextOnlyPayload):
    pass


class HeaterShakerDeactivateShakerCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_DEACTIVATE_SHAKER"]
    payload: HeaterShakerDeactivateShakerPayload


class HeaterShakerDeactivateHeaterPayload(TextOnlyPayload):
    pass


class HeaterShakerDeactivateHeaterCommand(TypedDict):
    name: Literal["command.HEATER_SHAKER_DEACTIVATE_HEATER"]
    payload: HeaterShakerDeactivateHeaterPayload


class MagdeckEngageCommandPayload(TextOnlyPayload):
    pass


class MagdeckEngageCommand(TypedDict):
    name: Literal["command.MAGDECK_ENGAGE"]
    payload: MagdeckEngageCommandPayload


class MagdeckDisengageCommandPayload(TextOnlyPayload):
    pass


class MagdeckDisengageCommand(TypedDict):
    name: Literal["command.MAGDECK_DISENGAGE"]
    payload: MagdeckDisengageCommandPayload


class MagdeckCalibrateCommandPayload(TextOnlyPayload):
    pass


class MagdeckCalibrateCommand(TypedDict):
    name: Literal["command.MAGDECK_CALIBRATE"]
    payload: MagdeckCalibrateCommandPayload


class TempdeckSetTempCommandPayload(TextOnlyPayload):
    celsius: float


class TempdeckSetTempCommand(TypedDict):
    name: Literal["command.TEMPDECK_SET_TEMP"]
    payload: TempdeckSetTempCommandPayload


class TempdeckAwaitTempCommandPayload(TextOnlyPayload):
    celsius: float


class TempdeckAwaitTempCommand(TypedDict):
    name: Literal["command.TEMPDECK_AWAIT_TEMP"]
    payload: TempdeckAwaitTempCommandPayload


class TempdeckDeactivateCommandPayload(TextOnlyPayload):
    pass


class TempdeckDeactivateCommand(TypedDict):
    name: Literal["command.TEMPDECK_DEACTIVATE"]
    payload: TempdeckDeactivateCommandPayload


class ThermocyclerOpenCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerOpenCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_OPEN"]
    payload: ThermocyclerOpenCommandPayload


class ThermocyclerSetBlockTempCommandPayload(TextOnlyPayload):
    temperature: float
    hold_time: Optional[float]


class ThermocyclerSetBlockTempCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_SET_BLOCK_TEMP"]
    payload: ThermocyclerSetBlockTempCommandPayload


class ThermocyclerExecuteProfileCommandPayload(TextOnlyPayload):
    steps: List[ThermocyclerStep]


class ThermocyclerExecuteProfileCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_EXECUTE_PROFILE"]
    payload: ThermocyclerExecuteProfileCommandPayload


class ThermocyclerWaitForHoldCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerWaitForHoldCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_WAIT_FOR_HOLD"]
    payload: ThermocyclerWaitForHoldCommandPayload


class ThermocyclerWaitForTempCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerWaitForTempCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_WAIT_FOR_TEMP"]
    payload: ThermocyclerWaitForTempCommandPayload


class ThermocyclerSetLidTempCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerSetLidTempCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_SET_LID_TEMP"]
    payload: ThermocyclerSetLidTempCommandPayload


class ThermocyclerDeactivateLidCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerDeactivateLidCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_DEACTIVATE_LID"]
    payload: ThermocyclerDeactivateLidCommandPayload


class ThermocyclerDeactivateBlockCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerDeactivateBlockCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_DEACTIVATE_BLOCK"]
    payload: ThermocyclerDeactivateBlockCommandPayload


class ThermocyclerDeactivateCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerDeactivateCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_DEACTIVATE"]
    payload: ThermocyclerDeactivateCommandPayload


class ThermocyclerWaitForLidTempCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerWaitForLidTempCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_WAIT_FOR_LID_TEMP"]
    payload: ThermocyclerWaitForLidTempCommandPayload


class ThermocyclerCloseCommandPayload(TextOnlyPayload):
    pass


class ThermocyclerCloseCommand(TypedDict):
    name: Literal["command.THERMOCYCLER_CLOSE"]
    payload: ThermocyclerCloseCommandPayload


class HomeCommandPayload(TextOnlyPayload):
    axis: str


class HomeCommand(TypedDict):
    name: Literal["command.HOME"]
    payload: HomeCommandPayload


class AspirateDispenseCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Location
    volume: float
    rate: float


class AspirateCommand(TypedDict):
    name: Literal["command.ASPIRATE"]
    payload: AspirateDispenseCommandPayload


class DispenseCommand(TypedDict):
    name: Literal["command.DISPENSE"]
    payload: AspirateDispenseCommandPayload


class DispenseInDisposalLocationCommandPayload(
    TextOnlyPayload, SingleInstrumentPayload
):
    location: Union[TrashBin, WasteChute]
    volume: float
    rate: float


class DispenseInDisposalLocationCommand(TypedDict):
    name: Literal["command.DISPENSE_IN_DISPOSAL_LOCATION"]
    payload: DispenseInDisposalLocationCommandPayload


class ConsolidateCommandPayload(
    TextOnlyPayload, MultiLocationPayload, SingleInstrumentPayload
):
    volume: Union[float, List[float]]
    source: List[Union[Location, Well]]
    dest: Union[Location, Well]


class ConsolidateCommand(TypedDict):
    name: Literal["command.CONSOLIDATE"]
    payload: ConsolidateCommandPayload


class DistributeCommandPayload(
    TextOnlyPayload, MultiLocationPayload, SingleInstrumentPayload
):
    volume: Union[float, List[float]]
    source: Union[Location, Well]
    dest: List[Union[Location, Well]]


class DistributeCommand(TypedDict):
    name: Literal["command.DISTRIBUTE"]
    payload: DistributeCommandPayload


class TransferCommandPayload(
    TextOnlyPayload, MultiLocationPayload, SingleInstrumentPayload
):
    volume: Union[float, List[float]]
    source: List[Union[Location, Well]]
    dest: List[Union[Location, Well]]


class TransferCommand(TypedDict):
    name: Literal["command.TRANSFER"]
    payload: TransferCommandPayload


class MixCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Union[None, Location, Well]
    volume: float
    repetitions: int


class MixCommand(TypedDict):
    name: Literal["command.MIX"]
    payload: MixCommandPayload


class BlowOutCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Optional[Location]


class BlowOutCommand(TypedDict):
    name: Literal["command.BLOW_OUT"]
    payload: BlowOutCommandPayload


class BlowOutInDisposalLocationCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Union[TrashBin, WasteChute]


class BlowOutInDisposalLocationCommand(TypedDict):
    name: Literal["command.BLOW_OUT_IN_DISPOSAL_LOCATION"]
    payload: BlowOutInDisposalLocationCommandPayload


class TouchTipCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    pass


class TouchTipCommand(TypedDict):
    name: Literal["command.TOUCH_TIP"]
    payload: TouchTipCommandPayload


class AirGapCommandPayload(TextOnlyPayload):
    pass


class AirGapCommand(TypedDict):
    name: Literal["command.AIR_GAP"]
    payload: AirGapCommandPayload


class ReturnTipCommandPayload(TextOnlyPayload):
    pass


class ReturnTipCommand(TypedDict):
    name: Literal["command.RETURN_TIP"]
    payload: ReturnTipCommandPayload


class PickUpTipCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Well


class PickUpTipCommand(TypedDict):
    name: Literal["command.PICK_UP_TIP"]
    payload: PickUpTipCommandPayload


class DropTipCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Well


class DropTipCommand(TypedDict):
    name: Literal["command.DROP_TIP"]
    payload: DropTipCommandPayload


class DropTipInDisposalLocationCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Union[TrashBin, WasteChute]


class DropTipInDisposalLocationCommand(TypedDict):
    name: Literal["command.DROP_TIP_IN_DISPOSAL_LOCATION"]
    payload: DropTipInDisposalLocationCommandPayload


class MoveToCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Location


class MoveToCommand(TypedDict):
    name: Literal["command.MOVE_TO"]
    payload: MoveToCommandPayload


class MoveToDisposalLocationCommandPayload(TextOnlyPayload, SingleInstrumentPayload):
    location: Union[TrashBin, WasteChute]


class MoveToDisposalLocationCommand(TypedDict):
    name: Literal["command.MOVE_TO_DISPOSAL_LOCATION"]
    payload: MoveToDisposalLocationCommandPayload


class MoveLabwareCommandPayload(TextOnlyPayload):
    pass


class SealCommandPayload(TextOnlyPayload):
    instrument: InstrumentContext
    location: Union[None, Location, Well]


class UnsealCommandPayload(TextOnlyPayload):
    instrument: InstrumentContext
    location: Union[None, Location, Well]


class PressurizeCommandPayload(TextOnlyPayload):
    instrument: InstrumentContext


class MoveLabwareCommand(TypedDict):
    name: Literal["command.MOVE_LABWARE"]
    payload: MoveLabwareCommandPayload


class SealCommand(TypedDict):
    name: Literal["command.SEAL"]
    payload: SealCommandPayload


class UnsealCommand(TypedDict):
    name: Literal["command.UNSEAL"]
    payload: UnsealCommandPayload


class PressurizeCommand(TypedDict):
    name: Literal["command.PRESSURIZE"]
    payload: PressurizeCommandPayload


Command = Union[
    DropTipCommand,
    DropTipInDisposalLocationCommand,
    PickUpTipCommand,
    ReturnTipCommand,
    AirGapCommand,
    TouchTipCommand,
    BlowOutCommand,
    BlowOutInDisposalLocationCommand,
    MixCommand,
    TransferCommand,
    DistributeCommand,
    ConsolidateCommand,
    DispenseCommand,
    DispenseInDisposalLocationCommand,
    AspirateCommand,
    HomeCommand,
    HeaterShakerSetTargetTemperatureCommand,
    HeaterShakerWaitForTemperatureCommand,
    HeaterShakerSetAndWaitForShakeSpeedCommand,
    HeaterShakerOpenLabwareLatchCommand,
    HeaterShakerCloseLabwareLatchCommand,
    HeaterShakerDeactivateShakerCommand,
    HeaterShakerDeactivateHeaterCommand,
    ThermocyclerCloseCommand,
    ThermocyclerWaitForLidTempCommand,
    ThermocyclerDeactivateCommand,
    ThermocyclerDeactivateBlockCommand,
    ThermocyclerDeactivateLidCommand,
    ThermocyclerSetLidTempCommand,
    ThermocyclerWaitForTempCommand,
    ThermocyclerWaitForHoldCommand,
    ThermocyclerExecuteProfileCommand,
    ThermocyclerSetBlockTempCommand,
    ThermocyclerOpenCommand,
    TempdeckDeactivateCommand,
    TempdeckAwaitTempCommand,
    TempdeckSetTempCommand,
    MagdeckCalibrateCommand,
    MagdeckDisengageCommand,
    MagdeckEngageCommand,
    ResumeCommand,
    PauseCommand,
    DelayCommand,
    CommentCommand,
    MoveToCommand,
    MoveToDisposalLocationCommand,
    MoveLabwareCommand,
    SealCommand,
    UnsealCommand,
    PressurizeCommand,
]


CommandPayload = Union[
    CommentCommandPayload,
    ResumeCommandPayload,
    HeaterShakerSetTargetTemperaturePayload,
    HeaterShakerWaitForTemperaturePayload,
    HeaterShakerSetAndWaitForShakeSpeedPayload,
    HeaterShakerOpenLabwareLatchPayload,
    HeaterShakerCloseLabwareLatchPayload,
    HeaterShakerDeactivateShakerPayload,
    HeaterShakerDeactivateHeaterPayload,
    MagdeckEngageCommandPayload,
    MagdeckDisengageCommandPayload,
    MagdeckCalibrateCommandPayload,
    ThermocyclerOpenCommandPayload,
    ThermocyclerWaitForHoldCommandPayload,
    ThermocyclerWaitForTempCommandPayload,
    ThermocyclerSetLidTempCommandPayload,
    ThermocyclerDeactivateLidCommandPayload,
    ThermocyclerDeactivateBlockCommandPayload,
    ThermocyclerDeactivateCommandPayload,
    ThermocyclerWaitForLidTempCommand,
    ThermocyclerCloseCommandPayload,
    AirGapCommandPayload,
    ReturnTipCommandPayload,
    DropTipCommandPayload,
    DropTipInDisposalLocationCommandPayload,
    PickUpTipCommandPayload,
    TouchTipCommandPayload,
    BlowOutCommandPayload,
    BlowOutInDisposalLocationCommandPayload,
    MixCommandPayload,
    TransferCommandPayload,
    DistributeCommandPayload,
    ConsolidateCommandPayload,
    AspirateDispenseCommandPayload,
    DispenseInDisposalLocationCommandPayload,
    HomeCommandPayload,
    ThermocyclerExecuteProfileCommandPayload,
    ThermocyclerSetBlockTempCommandPayload,
    TempdeckAwaitTempCommandPayload,
    TempdeckSetTempCommandPayload,
    PauseCommandPayload,
    DelayCommandPayload,
    MoveToCommandPayload,
    MoveToDisposalLocationCommandPayload,
    MoveLabwareCommandPayload,
    SealCommandPayload,
    UnsealCommandPayload,
    PressurizeCommandPayload,
]


MessageSequenceId = Union[Literal["before"], Literal["after"]]


CommandMessageFields = TypedDict(
    "CommandMessageFields",
    {"$": MessageSequenceId, "id": str, "error": Optional[Exception]},
)


class MoveToMessage(CommandMessageFields, MoveToCommand):
    pass


class MoveToDisposalLocationMessage(
    CommandMessageFields, MoveToDisposalLocationCommand
):
    pass


class DropTipMessage(CommandMessageFields, DropTipCommand):
    pass


class DropTipInDisposalLocationMessage(
    CommandMessageFields, DropTipInDisposalLocationCommand
):
    pass


class PickUpTipMessage(CommandMessageFields, PickUpTipCommand):
    pass


class ReturnTipMessage(CommandMessageFields, ReturnTipCommand):
    pass


class AirGapMessage(CommandMessageFields, AirGapCommand):
    pass


class TouchTipMessage(CommandMessageFields, TouchTipCommand):
    pass


class BlowOutMessage(CommandMessageFields, BlowOutCommand):
    pass


class BlowOutInDisposalLocationMessage(
    CommandMessageFields, BlowOutInDisposalLocationCommand
):
    pass


class MixMessage(CommandMessageFields, MixCommand):
    pass


class TransferMessage(CommandMessageFields, TransferCommand):
    pass


class DistributeMessage(CommandMessageFields, DistributeCommand):
    pass


class ConsolidateMessage(CommandMessageFields, ConsolidateCommand):
    pass


class DispenseMessage(CommandMessageFields, DispenseCommand):
    pass


class DispenseInDisposalLocationMessage(
    CommandMessageFields, DispenseInDisposalLocationCommand
):
    pass


class AspirateMessage(CommandMessageFields, AspirateCommand):
    pass


class HomeMessage(CommandMessageFields, HomeCommand):
    pass


class HeaterShakerSetTargetTemperatureMessage(
    CommandMessageFields, HeaterShakerSetTargetTemperatureCommand
):
    pass


class HeaterShakerWaitForTemperatureMessage(
    CommandMessageFields, HeaterShakerWaitForTemperatureCommand
):
    pass


class HeaterShakerSetAndWaitForShakeSpeedMessage(
    CommandMessageFields, HeaterShakerSetAndWaitForShakeSpeedCommand
):
    pass


class HeaterShakerOpenLabwareLatchMessage(
    CommandMessageFields, HeaterShakerOpenLabwareLatchCommand
):
    pass


class HeaterShakerCloseLabwareLatchMessage(
    CommandMessageFields, HeaterShakerCloseLabwareLatchCommand
):
    pass


class HeaterShakerDeactivateShakerMessage(
    CommandMessageFields, HeaterShakerDeactivateShakerCommand
):
    pass


class HeaterShakerDeactivateHeaterMessage(
    CommandMessageFields, HeaterShakerDeactivateHeaterCommand
):
    pass


class ThermocyclerCloseMessage(CommandMessageFields, ThermocyclerCloseCommand):
    pass


class ThermocyclerWaitForLidTempMessage(
    CommandMessageFields, ThermocyclerWaitForLidTempCommand
):
    pass


class ThermocyclerDeactivateMessage(
    CommandMessageFields, ThermocyclerDeactivateCommand
):
    pass


class ThermocyclerDeactivateBlockMessage(
    CommandMessageFields, ThermocyclerDeactivateBlockCommand
):
    pass


class ThermocyclerDeactivateLidMessage(
    CommandMessageFields, ThermocyclerDeactivateLidCommand
):
    pass


class ThermocyclerSetLidTempMessage(
    CommandMessageFields, ThermocyclerSetLidTempCommand
):
    pass


class ThermocyclerWaitForTempMessage(
    CommandMessageFields, ThermocyclerWaitForTempCommand
):
    pass


class ThermocyclerWaitForHoldMessage(
    CommandMessageFields, ThermocyclerWaitForHoldCommand
):
    pass


class ThermocyclerExecuteProfileMessage(
    CommandMessageFields, ThermocyclerExecuteProfileCommand
):
    pass


class ThermocyclerSetBlockTempMessage(
    CommandMessageFields, ThermocyclerSetBlockTempCommand
):
    pass


class ThermocyclerOpenMessage(CommandMessageFields, ThermocyclerOpenCommand):
    pass


class TempdeckDeactivateMessage(CommandMessageFields, TempdeckDeactivateCommand):
    pass


class TempdeckAwaitTempMessage(CommandMessageFields, TempdeckAwaitTempCommand):
    pass


class TempdeckSetTempMessage(CommandMessageFields, TempdeckSetTempCommand):
    pass


class MagdeckCalibrateMessage(CommandMessageFields, MagdeckCalibrateCommand):
    pass


class MagdeckDisengageMessage(CommandMessageFields, MagdeckDisengageCommand):
    pass


class MagdeckEngageMessage(CommandMessageFields, MagdeckEngageCommand):
    pass


class ResumeMessage(CommandMessageFields, ResumeCommand):
    pass


class PauseMessage(CommandMessageFields, PauseCommand):
    pass


class DelayMessage(CommandMessageFields, DelayCommand):
    pass


class CommentMessage(CommandMessageFields, CommentCommand):
    pass


class MoveLabwareMessage(CommandMessageFields, MoveLabwareCommand):
    pass


CommandMessage = Union[
    DropTipMessage,
    DropTipInDisposalLocationMessage,
    PickUpTipMessage,
    ReturnTipMessage,
    AirGapMessage,
    TouchTipMessage,
    BlowOutMessage,
    BlowOutInDisposalLocationMessage,
    MixMessage,
    TransferMessage,
    DistributeMessage,
    ConsolidateMessage,
    DispenseMessage,
    DispenseInDisposalLocationMessage,
    AspirateMessage,
    HomeMessage,
    HeaterShakerSetTargetTemperatureMessage,
    HeaterShakerWaitForTemperatureMessage,
    HeaterShakerSetAndWaitForShakeSpeedMessage,
    HeaterShakerOpenLabwareLatchMessage,
    HeaterShakerCloseLabwareLatchMessage,
    HeaterShakerDeactivateShakerMessage,
    HeaterShakerDeactivateHeaterMessage,
    ThermocyclerCloseMessage,
    ThermocyclerWaitForLidTempMessage,
    ThermocyclerDeactivateMessage,
    ThermocyclerDeactivateBlockMessage,
    ThermocyclerDeactivateLidMessage,
    ThermocyclerSetLidTempMessage,
    ThermocyclerWaitForTempMessage,
    ThermocyclerWaitForHoldMessage,
    ThermocyclerExecuteProfileMessage,
    ThermocyclerSetBlockTempMessage,
    ThermocyclerOpenMessage,
    TempdeckSetTempMessage,
    TempdeckDeactivateMessage,
    MagdeckEngageMessage,
    MagdeckDisengageMessage,
    MagdeckCalibrateMessage,
    CommentMessage,
    DelayMessage,
    PauseMessage,
    ResumeMessage,
    MoveToMessage,
    MoveToDisposalLocationMessage,
    MoveLabwareMessage,
]
