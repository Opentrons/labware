"""Gripper configurations."""

from typing_extensions import Annotated, Literal
from typing import List, Dict, Tuple, Any, NewType
from pydantic import ConfigDict, BaseModel, Field
from enum import Enum


def _snake_to_camel_case(snake: str) -> str:
    """Turns snake_case to camelCase."""
    return "".join(
        [s.capitalize() if i > 0 else s.lower() for i, s in enumerate(snake.split("_"))]
    )


GripperModelStr = NewType("GripperModelStr", str)


# TODO (spp, 2023-01-31): figure out if we want to keep this a string enum or revert to
#  a regular enum with custom stringification
class GripperModel(str, Enum):
    """Gripper models."""

    v1 = "gripperV1"
    v1_1 = "gripperV1.1"
    v1_2 = "gripperV1.2"
    v1_3 = "gripperV1.3"

    def __str__(self) -> str:
        """Model name."""
        enum_to_str = {
            self.__class__.v1: "gripperV1",
            self.__class__.v1_1: "gripperV1.1",
            self.__class__.v1_2: "gripperV1.2",
            self.__class__.v1_3: "gripperV1.3",
        }
        return enum_to_str[self]


GripperSchemaVersion = Literal[1]

GripperSchema = Dict[str, Any]


_StrictNonNegativeInt = Annotated[int, Field(strict=True, ge=0)]
_StrictNonNegativeFloat = Annotated[float, Field(strict=True, ge=0.0)]


PolynomialTerm = Tuple[_StrictNonNegativeInt, float]
_Polynomial = Annotated[List[PolynomialTerm], Field(min_length=1)]


class GripperBaseModel(BaseModel):
    """Gripper base model."""

    model_config = ConfigDict(
        alias_generator=_snake_to_camel_case, populate_by_name=True
    )


Offset = Tuple[float, float, float]


class Geometry(GripperBaseModel):
    """Gripper geometry definition."""

    base_offset_from_mount: Offset
    jaw_center_offset_from_base: Offset
    pin_one_offset_from_base: Offset
    pin_two_offset_from_base: Offset
    jaw_width: Dict[str, float]
    max_allowed_grip_error: _StrictNonNegativeFloat


class GripForceProfile(GripperBaseModel):
    """Gripper force profile."""

    polynomial: _Polynomial = Field(
        ...,
        description="Polynomial function to convert a grip force in Newton to the jaw motor duty cycle value, which will be read by the gripper firmware.",
    )
    default_grip_force: _StrictNonNegativeFloat
    default_idle_force: _StrictNonNegativeFloat
    default_home_force: _StrictNonNegativeFloat
    min: _StrictNonNegativeFloat
    max: _StrictNonNegativeFloat


class GripperDefinition(GripperBaseModel):
    """Gripper definition."""

    schema_version: GripperSchemaVersion = Field(
        ..., description="Which schema version a gripper is using"
    )
    display_name: str = Field(..., description="Gripper display name.")
    model: GripperModel
    geometry: Geometry
    grip_force_profile: GripForceProfile
