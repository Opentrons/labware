from pydantic import ConfigDict, BaseModel, Field
from typing import Any, List, Optional, Dict, Union
from typing_extensions import Literal

from opentrons_shared_data.labware.labware_definition import LabwareDefinition

from .shared_models import (
    Liquid,
    CommandAnnotation,
    Location,
    ProfileStep,
    WellLocation,
    OffsetVector,
    Metadata,
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
    wellLocation: Optional[WellLocation] = None
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
    # schema v7 add-ons
    newLocation: Optional[Union[Location, Literal["offDeck"]]] = None
    strategy: Optional[str] = None
    pickUpOffset: Optional[OffsetVector] = None
    dropOffset: Optional[OffsetVector] = None
    homeAfter: Optional[bool] = None
    alternateDropLocation: Optional[bool] = None
    holdTimeSeconds: Optional[float] = None
    maintenancePosition: Optional[str] = None
    pipetteName: Optional[str] = None
    model: Optional[str] = None
    loadName: Optional[str] = None
    namespace: Optional[str] = None
    version: Optional[int] = None
    pushOut: Optional[float] = None


class Command(BaseModel):
    commandType: str
    params: Params
    key: Optional[str] = None


class ProtocolSchemaV7(BaseModel):
    otSharedSchema: Literal["#/protocol/schemas/7"] = Field(
        ...,
        alias="$otSharedSchema",
        description="The path to a valid Opentrons shared schema relative to "
        "the shared-data directory, without its extension.",
    )
    schemaVersion: Literal[7]
    metadata: Metadata
    robot: Robot
    liquids: Optional[Dict[str, Liquid]] = None
    labwareDefinitions: Dict[str, LabwareDefinition]
    commands: List[Command]
    commandAnnotations: Optional[List[CommandAnnotation]] = None
    designerApplication: Optional[DesignerApplication] = None
    model_config = ConfigDict(populate_by_name=True)
