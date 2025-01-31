from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CreateProtocol(BaseModel):
    prompt: str = Field(..., description="Prompt")
    regenerate: bool = Field(..., description="Flag to indicate if regeneration is needed")
    scientific_application_type: str = Field(..., description="Scientific application type")
    description: str = Field(..., description="Description of the protocol")
    robots: Literal["opentrons_flex", "opentrons_ot2"] = Field(..., description="List of required robots")
    mounts: List[str] = Field(..., description="List of required mounts")
    flexGripper: bool = Field(..., description="Is a flex gripper required?")
    modules: List[str] = Field(..., description="List of required modules")
    labware: List[str] = Field(..., description="List of required labware")
    liquids: List[str] = Field(..., description="List of required liquids")
    steps: List[str] = Field(..., description="The steps of the protocol")
    fake: Optional[bool] = Field(False, description="Fake response?")
    fake_id: Optional[int] = Field(..., description="type of response")
