from enum import Enum

import typing
from pydantic import field_validator, BaseModel, Field

from opentrons.hardware_control import types


class MotorName(str, Enum):
    # opentrons.hardware_control.types.Axis as an int enum. We need this to
    # be a string enum of the keys in Axis. We will use _ignore_ and vars a la
    # https://docs.python.org/3/library/enum.html#timeperiod to
    # dynamically create an enum with the same keys as Axis but whose values
    # are also the keys. (ie X=0 becomes  X='X')
    _ignore_ = "MotorName _axis_name _axis_value"
    MotorName = vars()
    for _axis_name, _axis_value in types.Axis.__members__.items():
        # We need to use Axis.__members__ in order to access names of aliased axes
        MotorName[_axis_name] = _axis_name.lower()


class EngagedMotor(BaseModel):
    """Engaged motor"""

    enabled: bool = Field(..., description="Is engine enabled")


class EngagedMotors(BaseModel):
    """Which motors are engaged."""

    # Note: This model has changed with introduction of Flex and causes a breaking change
    # for the expected response of /motors/engaged endpoint.
    # But the neither the app uses the motors endpoint, nor is it commonly used externally
    # so it should be hopefully fine.
    x: EngagedMotor
    y: EngagedMotor
    z_l: EngagedMotor
    z_r: EngagedMotor
    p_l: EngagedMotor
    p_r: EngagedMotor
    q: typing.Optional[
        EngagedMotor
    ] = None  # Optional since OT2 doesn't have these axes
    g: typing.Optional[EngagedMotor] = None


class Axes(BaseModel):
    """A list of motor axes to disengage"""

    axes: typing.List[MotorName]

    @field_validator("axes", mode="before")
    @classmethod
    def lower_case_motor_name(cls, v):
        return [m.lower() for m in v]
