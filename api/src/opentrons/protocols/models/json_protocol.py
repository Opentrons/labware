"""
This was initially generated by datamodel-codegen from the protocol schema in
shared-data. It's been modified by hand to be more friendly.

TODO: 20210330 Amit - consider moving this to opentrons-shared-data.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Extra, Field
from typing_extensions import Literal

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.protocol import types

CommandAspirate: types.AspirateCommandId = "aspirate"
CommandDispense: types.DispenseCommandId = "dispense"
CommandAirGap: types.AirGapCommandId = "airGap"
CommandBlowout: types.BlowoutCommandId = "blowout"
CommandTouchTip: types.TouchTipCommandId = "touchTip"
CommandPickUpTip: types.PickUpTipCommandId = "pickUpTip"
CommandDropTip: types.DropTipCommandId = "dropTip"
CommandMoveToSlot: types.MoveToSlotCommandId = "moveToSlot"
CommandMoveToWell: types.MoveToWellCommandId = "moveToWell"
CommandDelay: types.DelayCommandId = "delay"
CommandMagneticModuleEngage: types.MagneticModuleEngageCommandId = (
    "magneticModule/engageMagnet"
)
CommandMagneticModuleDisengage: types.MagneticModuleDisengageCommandId = (
    "magneticModule/disengageMagnet"
)
CommandTemperatureModuleSetTarget: types.TemperatureModuleSetTargetCommandId = (
    "temperatureModule/setTargetTemperature"
)
CommandTemperatureModuleAwait: types.TemperatureModuleAwaitCommandId = (
    "temperatureModule/awaitTemperature"
)
CommandTemperatureModuleDeactivate: types.TemperatureModuleDeactivateCommandId = (
    "temperatureModule/deactivate"
)
CommandThermocyclerSetTargetBlock: types.ThermocyclerSetTargetBlockCommandId = (
    "thermocycler/setTargetBlockTemperature"
)
CommandThermocyclerSetTargetLid: types.ThermocyclerSetTargetLidCommandId = (
    "thermocycler/setTargetLidTemperature"
)
CommandThermocyclerAwaitLidTemperature: types.ThermocyclerAwaitLidTemperatureCommandId = (
    "thermocycler/awaitLidTemperature"
)
CommandThermocyclerAwaitBlockTemperature: types.ThermocyclerAwaitBlockTemperatureCommandId = (
    "thermocycler/awaitBlockTemperature"
)
CommandThermocyclerDeactivateBlock: types.ThermocyclerDeactivateBlockCommandId = (
    "thermocycler/deactivateBlock"
)
CommandThermocyclerDeactivateLid: types.ThermocyclerDeactivateLidCommandId = (
    "thermocycler/deactivateLid"
)
CommandThermocyclerOpenLid: types.ThermocyclerOpenLidCommandId = "thermocycler/openLid"
CommandThermocyclerCloseLid: types.ThermocyclerCloseLidCommandId = (
    "thermocycler/closeLid"
)
CommandThermocyclerRunProfile: types.ThermocyclerRunProfileCommandId = (
    "thermocycler/runProfile"
)
CommandThermocyclerAwaitProfile: types.ThermocyclerAwaitProfileCommandId = (
    "thermocycler/awaitProfileComplete"
)


class Metadata(BaseModel):
    """
    Optional metadata about the protocol
    """

    class Config:
        extra = Extra.allow

    protocolName: Optional[str] = Field(
        None, description="A short, human-readable name for the protocol"
    )
    author: Optional[str] = Field(
        None, description="The author or organization who created the protocol"
    )
    description: Optional[Optional[str]] = Field(
        None, description="A text description of the protocol."
    )
    created: Optional[float] = Field(
        None, description="UNIX timestamp when this file was created"
    )
    lastModified: Optional[Optional[float]] = Field(
        None, description="UNIX timestamp when this file was last modified"
    )
    category: Optional[Optional[str]] = Field(
        None, description='Category of protocol (eg, "Basic Pipetting")'
    )
    subcategory: Optional[Optional[str]] = Field(
        None, description='Subcategory of protocol (eg, "Cell Plating")'
    )
    tags: Optional[List[str]] = Field(
        None, description="Tags to be used in searching for this protocol"
    )


class DesignerApplication(BaseModel):
    """
    Optional data & metadata not required to execute the protocol, used by the
    application that created this protocol
    """

    name: Optional[str] = Field(
        None,
        description="Name of the application that created the protocol. Should "
        "be namespaced under the organization or individual who "
        'owns the organization, eg "opentrons/protocol-designer"',
    )
    version: Optional[str] = Field(
        None, description="Version of the application that created the protocol"
    )
    data: Optional[Dict[str, Any]] = Field(
        None, description="Any data used by the application that created this protocol"
    )


class Robot(BaseModel):
    model: Literal["OT-2 Standard"] = Field(
        ...,
        description="Model of the robot this protocol is written for "
        "(currently only OT-2 Standard is supported)",
    )


class ModuleOnlyParams(BaseModel):
    module: str


class OffsetFromBottomMm(BaseModel):
    """
    Offset from bottom of well in millimeters
    """

    offsetFromBottomMm: float = Field(
        ..., description="Millimeters for pipette location offsets"
    )


class PipetteAccessParams(BaseModel):
    pipette: str
    labware: str
    well: str


class VolumeParams(BaseModel):
    volume: float


class FlowRate(BaseModel):
    flowRate: float = Field(
        ..., description="Flow rate in uL/sec. Must be greater than 0", ge=0.0
    )


class MeniscusRelativeParams(BaseModel):
    meniscusRelative: bool = Field(
        ..., description="Enable meniscus-relative liquid actions"
    )
    offsetFromMeniscusMm: float = Field(
        ..., description="Millimeters from meniscus to do liquid acions"
    )


class Params2(PipetteAccessParams, OffsetFromBottomMm):
    pass


class Params1(Params2, FlowRate):
    pass


class Params(Params1, Params2, VolumeParams, MeniscusRelativeParams):
    pass


class LiquidCommand(BaseModel):
    """
    Aspirate / dispense / air gap commands
    """

    command: Literal["aspirate", "dispense", "airGap"]
    params: Params


class BlowoutCommand(BaseModel):
    """
    Blowout command
    """

    command: Literal["blowout"]
    params: Params1


class TouchTipCommand(BaseModel):
    """
    Touch tip commands
    """

    command: Literal["touchTip"]
    params: Params2


class PickUpDropTipCommand(BaseModel):
    """
    Pick up tip / drop tip commands
    """

    command: Literal["pickUpTip", "dropTip"]
    params: PipetteAccessParams


class Offset(BaseModel):
    """
    Optional offset from slot bottom left corner, in mm
    """

    x: float
    y: float
    z: float


class Params3(BaseModel):
    pipette: str
    slot: str = Field(
        ...,
        description="string '1'-'12', or special string 'span7_8_10_11' signify "
        "it's a slot on the OT-2 deck. If it's a UUID, it's the "
        "slot on the module referenced by that ID.",
    )
    offset: Optional[Offset] = Field(
        None, description="Optional offset from slot bottom left corner, in mm"
    )
    minimumZHeight: Optional[float] = Field(
        None,
        description="Optional minimal Z margin in mm. If this is larger than "
        "the API's default safe Z margin, it will make the arc "
        "higher. If it's smaller, it will have no effect. Specifying "
        "this for movements that would not arc (moving within the "
        "same well in the same labware) will cause an arc movement "
        "instead.",
        ge=0.0,
    )
    forceDirect: Optional[bool] = Field(
        None,
        description="Default is false. If true, moving from one labware/well to "
        "another will not arc to the default safe z, but instead will "
        "move directly to the specified location. This will also force "
        "the 'minimumZHeight' param to be ignored. A 'direct' movement "
        "is in X/Y/Z simultaneously",
    )


class MoveToSlotCommand(BaseModel):
    """
    Move to slot command. NOTE: this is an EXPERIMENTAL command, its behavior is
    subject to change in future releases.
    """

    command: Literal["moveToSlot"]
    params: Params3


class DelayCommandParams(BaseModel):
    wait: Union[Literal[True], float] = Field(
        ...,
        description="either a number of seconds to wait (fractional values OK), "
        "or `true` to wait indefinitely until the user manually "
        "resumes the protocol",
    )
    message: Optional[str] = Field(
        None, description="optional message describing the delay"
    )


class DelayCommand(BaseModel):
    """
    Delay command
    """

    command: Literal["delay"]
    params: DelayCommandParams


class Params5(BaseModel):
    engageHeight: float = Field(
        ...,
        description="Height in mm(*) from bottom plane of labware (above if positive, "
        "below if negative). *NOTE: for magneticModuleV1 (aka GEN1), these "
        "are not true mm but an arbitrary unit equal to 0.5mm. So "
        "`engageHeight: 2` means 1mm above the labware plane if the "
        "command is for a GEN1 magnetic module, but would mean 2mm "
        "above the labware plane for GEN2 module",
    )
    module: str


class MagneticModuleEngageCommand(BaseModel):
    """
    Magnetic module engage command. Engages magnet to specified height
    """

    command: Literal["magneticModule/engageMagnet"]
    params: Params5


class MagneticModuleDisengageCommand(BaseModel):
    """
    Magnetic module disengage command. Moves magnet down to disengaged (home) position
    """

    command: Literal["magneticModule/disengageMagnet"]
    params: ModuleOnlyParams


class Params6(BaseModel):
    module: str
    temperature: float


class TemperatureModuleSetTargetCommand(BaseModel):
    """
    Temperature module set target temperature command. Module will begin moving
    to the target temperature. This command is non-blocking, it does not delay
    until the temperature is reached.
    """

    command: Literal["temperatureModule/setTargetTemperature"]
    params: Params6


class Params7(BaseModel):
    module: str
    temperature: float


class TemperatureModuleAwaitTemperatureCommand(BaseModel):
    """
    Temperature module await temperature command. Delay further protocol execution
    until the specified temperature is reached.
    """

    command: Literal["temperatureModule/awaitTemperature"]
    params: Params7


class TemperatureModuleDeactivateCommand(BaseModel):
    """
    Temperature module deactivate command. Module will stop actively controlling
    its temperature and drift to ambient temperature.
    """

    command: Literal["temperatureModule/deactivate"]
    params: ModuleOnlyParams


class Params8(BaseModel):
    module: str
    temperature: float
    volume: Optional[float] = None


class ThermocyclerSetTargetBlockTemperatureCommand(BaseModel):
    """
    Thermocycler set target block temperature command. Lid will begin moving to
    the target temperature. This command is non-blocking, it does not delay until
    the temperature is reached.
    """

    command: Literal["thermocycler/setTargetBlockTemperature"]
    params: Params8


class Params9(BaseModel):
    module: str
    temperature: float


class ThermocyclerSetTargetLidTemperatureCommand(BaseModel):
    """
    Thermocycler set target lid temperature command. Lid will begin moving to the
    target temperature. This command is non-blocking, it does not delay until
    the temperature is reached.
    """

    command: Literal["thermocycler/setTargetLidTemperature"]
    params: Params9


class Params10(BaseModel):
    module: str
    temperature: float


class ThermocyclerAwaitBlockTemperatureCommand(BaseModel):
    """
    Thermocycler await block temperature command. Delay further protocol execution
    until the specified temperature is reached.
    """

    command: Literal["thermocycler/awaitBlockTemperature"]
    params: Params10


class Params11(BaseModel):
    module: str
    temperature: float


class ThermocyclerAwaitLidTemperatureCommand(BaseModel):
    """
    Thermocycler await lid temperature command. Delay further protocol execution
    until the specified temperature is reached.
    """

    command: Literal["thermocycler/awaitLidTemperature"]
    params: Params11


class ThermocyclerDeactivateBlockCommand(BaseModel):
    """
    Thermocycler deactivate block command. Module will stop actively controlling
    its block temperature.
    """

    command: Literal["thermocycler/deactivateBlock"]
    params: ModuleOnlyParams


class ThermocyclerDeactivateLidCommand(BaseModel):
    """
    Thermocycler deactivate lid command. Module will stop actively controlling
    its lid temperature.
    """

    command: Literal["thermocycler/deactivateLid"]
    params: ModuleOnlyParams


class ThermocyclerOpenLidCommand(BaseModel):
    """
    Thermocycler open lid command. This command will block until the lid is
    fully open.
    """

    command: Literal["thermocycler/openLid"]
    params: ModuleOnlyParams


class ThermocyclerCloseLidCommand(BaseModel):
    """
    Thermocycler close lid command. This command will block until the lid is
    fully closed.
    """

    command: Literal["thermocycler/closeLid"]
    params: ModuleOnlyParams


class ProfileItem(BaseModel):
    temperature: float = Field(..., description="Target temperature of profile step")
    holdTime: float = Field(
        ..., description="Time (in seconds) to hold once temperature is reached"
    )


class Params12(BaseModel):
    module: str
    profile: List[ProfileItem]
    volume: float


class ThermocyclerRunProfile(BaseModel):
    """
    Thermocycler run profile command. Begin running the specified profile steps on
    the thermocycler. This command is non-blocking, it does not delay protocol
    execution outside of thermocycler steps. No more thermocycler commands should
    be given until a 'thermocycler/awaitProfileComplete' command is executed.
    """

    command: Literal["thermocycler/runProfile"]
    params: Params12


class ThermocyclerAwaitProfileCompleteCommand(BaseModel):
    """
    Thermocycler await profile complete command. Blocks further protocol
    execution until profile execution is complete.
    """

    command: Literal["thermocycler/awaitProfileComplete"]
    params: ModuleOnlyParams


class Offset1(BaseModel):
    """
    Optional offset from well bottom center, in mm
    """

    x: float
    y: float
    z: float


class Params13(BaseModel):
    pipette: str
    labware: str
    well: str
    offset: Optional[Offset1] = Field(
        None, description="Optional offset from well bottom center, in mm"
    )
    minimumZHeight: Optional[float] = Field(
        None,
        description="Optional minimal Z margin in mm. If this is larger than "
        "the API's default safe Z margin, it will make the arc higher. "
        "If it's smaller, it will have no effect. Specifying this for "
        "movements that would not arc (moving within the same well in "
        "the same labware) will cause an arc movement instead.",
        ge=0.0,
    )
    forceDirect: Optional[bool] = Field(
        None,
        description="Default is false. If true, moving from one labware/well "
        "to another will not arc to the default safe z, but instead "
        "will move directly to the specified location. This will also "
        "force the 'minimumZHeight' param to be ignored. A 'direct' "
        "movement is in X/Y/Z simultaneously",
    )


class MoveToWellCommand(BaseModel):
    """
    Move to well command. Move the pipette's critical point to the specified well
    in a labware, with an optional offset. The pipette's critical point is a
    reference point on the pipette. The critical point can be one of the following:
    (1) Single-channel pipette with no tip: end of nozzle. (2) Multi-channel
    pipette with no tip: end of backmost nozzle. (3) Single-channel pipette with
    a tip: end of tip. (4) Multi-channel pipette with tip: end of tip on backmost
    nozzle.
    """

    command: Literal["moveToWell"]
    params: Params13


AllCommands = Union[
    LiquidCommand,
    BlowoutCommand,
    TouchTipCommand,
    PickUpDropTipCommand,
    MoveToSlotCommand,
    DelayCommand,
    MagneticModuleEngageCommand,
    MagneticModuleDisengageCommand,
    TemperatureModuleSetTargetCommand,
    TemperatureModuleAwaitTemperatureCommand,
    TemperatureModuleDeactivateCommand,
    ThermocyclerSetTargetBlockTemperatureCommand,
    ThermocyclerSetTargetLidTemperatureCommand,
    ThermocyclerAwaitBlockTemperatureCommand,
    ThermocyclerAwaitLidTemperatureCommand,
    ThermocyclerDeactivateBlockCommand,
    ThermocyclerDeactivateLidCommand,
    ThermocyclerOpenLidCommand,
    ThermocyclerCloseLidCommand,
    ThermocyclerRunProfile,
    ThermocyclerAwaitProfileCompleteCommand,
    MoveToWellCommand,
]


class Pipettes(BaseModel):
    """
    Fields describing an individual pipette
    """

    class Config:
        extra = Extra.allow

    mount: Literal["left", "right"] = Field(
        ..., description="Where the pipette is mounted"
    )
    name: str = Field(
        ...,
        description="Name of a pipette. Does not contain info about specific "
        "model/version. Should match keys in pipetteNameSpecs.json file",
    )


class Labware(BaseModel):
    """
    Fields describing a single labware on the deck
    """

    class Config:
        extra = Extra.allow

    slot: str = Field(
        ...,
        description="string '1'-'12', or special string 'span7_8_10_11' signify "
        "it's a slot on the OT-2 deck. If it's a UUID, it's the "
        "slot on the module referenced by that ID.",
    )
    definitionId: str = Field(
        ..., description='reference to this labware\'s ID in "labwareDefinitions"'
    )
    displayName: Optional[str] = Field(
        None,
        description="An optional human-readable nickname for this labware. "
        'Eg "Buffer Trough"',
    )


class Modules(BaseModel):
    """
    Fields describing a single module on the deck
    """

    class Config:
        extra = Extra.allow

    slot: str = Field(
        ...,
        description="string '1'-'12', or special string 'span7_8_10_11' signify "
        "it's a slot on the OT-2 deck. If it's a UUID, it's the "
        "slot on the module referenced by that ID.",
    )
    model: str = Field(
        ...,
        description="model of module. Eg 'magneticModuleV1' or 'magneticModuleV2'. "
        "This should match a top-level key in "
        "shared-data/module/definitions/2.json",
    )


class Model(BaseModel):
    otSharedSchema: Optional[
        Literal["#/protocol/schemas/5", "#/protocol/schemas/4"]
    ] = Field(
        None,
        alias="$otSharedSchema",
        description="The path to a valid Opentrons shared schema relative to "
        "the shared-data directory, without its extension.",
    )
    schemaVersion: Literal[1, 2, 3, 4, 5] = Field(
        ..., description="Schema version of a protocol is a single integer"
    )
    metadata: Metadata = Field(..., description="Optional metadata about the protocol")
    designerApplication: Optional[DesignerApplication] = Field(
        None,
        description="Optional data & metadata not required to execute the protocol, "
        "used by the application that created this protocol",
    )
    robot: Robot
    pipettes: Dict[str, Pipettes] = Field(
        ...,
        description="The pipettes used in this protocol, keyed by an arbitrary "
        "unique ID",
    )
    labwareDefinitions: Dict[str, LabwareDefinition] = Field(
        ...,
        description="All labware definitions used by labware in this protocol, "
        "keyed by UUID",
    )
    labware: Dict[str, Labware] = Field(
        ...,
        description="All types of labware used in this protocol, and references "
        "to their definitions",
    )
    modules: Optional[Dict[str, Modules]] = Field(
        None, description="All modules used in this protocol"
    )
    commands: List[AllCommands] = Field(
        ...,
        description="An array of command objects representing steps to be executed "
        "on the robot",
    )
    commandAnnotations: Optional[Dict[str, Any]] = Field(
        None,
        description="An optional object of annotations associated with commands. "
        "Its usage has not yet been defined, so its shape is not "
        "enforced by this schema.",
    )
