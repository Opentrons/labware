from pydantic import (
    ConfigDict,
    BaseModel,
    Field,
    model_validator,
)
from typing import Any, List, Optional, Dict, Union
from typing_extensions import Literal
from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from .shared_models import (
    Liquid,
    Labware,
    CommandAnnotation,
    Location,
    ProfileStep,
    WellLocation,
    OffsetVector,
    Metadata,
    Module,
    Pipette,
    Robot,
    DesignerApplication,
)


# TODO (tamar 3/15/22): split apart all the command payloads when we tackle #9583
class Params(BaseModel):
    slotName: Optional[str] = None
    axes: Optional[List[str]] = None
    pipetteId: Optional[str] = None
    mount: Optional[str] = None
    moduleId: Optional[str] = None
    location: Optional[Union[Location, Literal["offDeck"]]] = None
    labwareId: Optional[str] = None
    displayName: Optional[str] = None
    liquidId: Optional[str] = None
    volumeByWell: Optional[Dict[str, Any]] = None
    wellName: Optional[str] = None
    volume: Optional[float] = None
    flowRate: Optional[float] = None
    wellLocation: Optional[Union[WellLocation]] = None
    waitForResume: Optional[Literal[True]] = None
    seconds: Optional[float] = None
    minimumZHeight: Optional[float] = None
    forceDirect: Optional[bool] = None
    speed: Optional[float] = None
    message: Optional[str] = None
    coordinates: Optional[OffsetVector] = None
    axis: Optional[str] = None
    distance: Optional[float] = None
    positionId: Optional[str] = None
    temperature: Optional[float] = None
    celsius: Optional[float] = None
    blockMaxVolumeUl: Optional[float] = None
    rpm: Optional[float] = None
    height: Optional[float] = None
    offset: Optional[OffsetVector] = None
    profile: Optional[List[ProfileStep]] = None
    radius: Optional[float] = None


class Command(BaseModel):
    commandType: str
    params: Params
    key: Optional[str] = None


class ProtocolSchemaV6(BaseModel):
    otSharedSchema: Literal["#/protocol/schemas/6"] = Field(
        ...,
        alias="$otSharedSchema",
        description="The path to a valid Opentrons shared schema relative to "
        "the shared-data directory, without its extension.",
    )
    schemaVersion: Literal[6]
    metadata: Metadata
    robot: Robot
    pipettes: Dict[str, Pipette]
    labware: Dict[str, Labware]
    modules: Optional[Dict[str, Module]] = None
    liquids: Optional[Dict[str, Liquid]] = None
    labwareDefinitions: Dict[str, LabwareDefinition]
    # commands must be after pipettes, labware, etc. for its @validator to work.
    commands: List[Command]
    commandAnnotations: Optional[List[CommandAnnotation]] = None
    designerApplication: Optional[DesignerApplication] = None
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _validate_commands(self) -> "ProtocolSchemaV6":
        pipette_ids = set(self.pipettes.keys() if self.pipettes else [])
        labware_ids = set(self.labware.keys() if self.labware else [])
        module_ids = set(self.modules.keys() if self.modules else [])
        liquid_ids = set(self.liquids.keys() if self.liquids else [])

        for index, command in enumerate(self.commands):
            if (
                command.params.pipetteId is not None
                and command.params.pipetteId not in pipette_ids
            ):
                raise ValueError(
                    f"{command.commandType} command at index {index}"
                    f" references ID {command.params.pipetteId},"
                    f" which doesn't exist."
                )
            if (
                command.params.labwareId is not None
                and command.params.labwareId not in labware_ids
            ):
                raise ValueError(
                    f"{command.commandType} command at index {index}"
                    f" references ID {command.params.labwareId},"
                    f" which doesn't exist."
                )
            if (
                command.params.moduleId is not None
                and command.params.moduleId not in module_ids
            ):
                raise ValueError(
                    f"{command.commandType} command at index {index}"
                    f" references ID {command.params.moduleId},"
                    f" which doesn't exist."
                )
            if (
                command.params.liquidId is not None
                and command.params.liquidId not in liquid_ids
            ):
                raise ValueError(
                    f"{command.commandType} command at index {index}"
                    f" references ID {command.params.liquidId},"
                    f" which doesn't exist."
                )

        return self
