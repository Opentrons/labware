import typing

from pydantic import ConfigDict, BaseModel, Field


class AttachedPipette(BaseModel):
    """Pipette (if any) attached to the mount"""

    model: typing.Optional[str] = Field(
        ...,
        description="The model of the attached pipette. These are snake "
        "case as in the Protocol API. This includes the full"
        " version string",
    )
    name: typing.Optional[str] = Field(
        ...,
        description="The name of the attached pipette - the model "
        "without the version string",
    )
    tip_length: typing.Optional[float] = Field(
        ..., description="The default tip length for this pipette, if " "attached"
    )
    mount_axis: str = Field(
        ..., description="The axis that moves this pipette up and down"
    )
    plunger_axis: str = Field(
        ..., description="The axis that moves this pipette's plunger"
    )
    id: typing.Optional[str] = Field(
        ..., description="The serial number of the attached pipette"
    )


class PipettesByMount(BaseModel):
    """The attached pipettes by mount"""

    left: AttachedPipette
    right: AttachedPipette
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "left": {
                    "model": "p300_single_v1.5",
                    "name": "p300_single",
                    "tip_length": 51.7,
                    "mount_axis": "z",
                    "plunger_axis": "b",
                    "id": "P3HS12123041",
                },
                "right": {
                    "model": None,
                    "name": None,
                    "tip_length": None,
                    "mount_axis": "a",
                    "plunger_axis": "c",
                    "id": None,
                },
            }
        }
    )
