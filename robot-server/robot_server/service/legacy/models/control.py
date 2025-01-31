import typing
from functools import partial
from enum import Enum

from opentrons import types
from pydantic import model_validator, ConfigDict, BaseModel, Field


class MotionTarget(str, Enum):
    """
    What should be moved. If mount, move the nominal position of the mount;
    if pipette, move the nozzle of the pipette
    """

    pipette = "pipette"
    mount = "mount"


class HomeTarget(str, Enum):
    pipette = "pipette"
    robot = "robot"


Point = typing.List[float]

# Commonly used Point type description and constraints
PointField = partial(
    Field,
    ...,
    description="A point in deck coordinates (x, y, z)",
    min_length=3,
    max_length=3,
)


class ChangePipette(BaseModel):
    target: MotionTarget
    left: Point = PointField()
    right: Point = PointField()


class AttachTip(BaseModel):
    target: MotionTarget
    point: Point = PointField()


class RobotPositions(BaseModel):
    change_pipette: ChangePipette
    attach_tip: AttachTip


class RobotPositionsResponse(BaseModel):
    positions: RobotPositions
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "positions": {
                    "change_pipette": {
                        "target": "mount",
                        "left": [325, 40, 30],
                        "right": [65, 40, 30],
                    },
                    "attach_tip": {"target": "pipette", "point": [200, 90, 150]},
                }
            }
        }
    )


class Mount(str, Enum):
    right = "right"
    left = "left"

    def to_hw_mount(self) -> types.Mount:
        if self is Mount.right:
            return types.Mount.RIGHT
        else:
            return types.Mount.LEFT

    def other_mount(self) -> "Mount":
        if self is Mount.right:
            return Mount.left
        else:
            return Mount.right


class RobotMoveTarget(BaseModel):
    target: MotionTarget
    point: Point = PointField()
    mount: Mount = Field(..., description="Which mount to move")
    model: typing.Optional[str] = Field(
        None,
        description="A pipette model that matches the pipette attached "
        "to the specified mount. Required "
        "if target is pipette",
    )

    @model_validator(mode="before")
    @classmethod
    def root_validator(cls, values):
        points = values.get("point", [])
        target = values.get("target")
        if target == MotionTarget.mount and len(points) == 3 and points[2] < 30:
            raise ValueError(
                "Sending a mount to a z position lower than 30 "
                "can cause a collision with the deck or reach the"
                " end of the Z axis  movement screw. Z values for"
                " mount movement must be >= 30"
            )
        return values

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "target": "mount",
                    "point": [100, 100, 80],
                    "mount": "left",
                },
                {
                    "target": "pipette",
                    "mount": "right",
                    "model": "p300_single",
                    "point": [25, 25, 50],
                },
            ]
        }
    )


class RobotHomeTarget(BaseModel):
    """Parameters for the home"""

    target: HomeTarget = Field(
        ...,
        description="What to home. Robot means to home all axes; "
        "pipette, only that pipette's carriage and pipette "
        "axes",
    )
    mount: typing.Optional[Mount] = Field(
        None,
        description="Which mount to home, if target is pipette (required"
        " in that case)",
    )

    @model_validator(mode="before")
    @classmethod
    def root_validate(cls, values):
        # Make sure that mount is present if target is pipette
        if values.get("target") == HomeTarget.pipette.value and not values.get("mount"):
            raise ValueError("mount must be specified if target is pipette")
        return values

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"target": "robot"}, {"target": "pipette", "mount": "right"}]
        }
    )


class RobotLightState(BaseModel):
    """Whether a light is (or should be turned) on or off"""

    on: bool = Field(..., description="The light state")
