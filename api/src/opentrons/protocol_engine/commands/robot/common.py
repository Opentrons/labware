"""Shared result types for robot API commands."""
from pydantic import BaseModel, Field

from typing import Dict
from opentrons.protocol_engine.types import MotorAxis


MotorAxisMapType = Dict[MotorAxis, float]
default_position = {ax: 0.0 for ax in MotorAxis}


class DestinationRobotPositionResult(BaseModel):
    """The result dictionary of `MotorAxis` type."""

    position: MotorAxisMapType = Field(
        default=default_position,
        description="The position of all axes on the robot. If no mount was provided, the last moved mount is used to determine the location.",
    )
