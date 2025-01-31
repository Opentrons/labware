import typing
from uuid import uuid4

from pydantic import BaseModel, Field

IdentifierType = typing.NewType("IdentifierType", str)


def create_identifier() -> IdentifierType:
    """Create an identifier"""
    return IdentifierType(str(uuid4()))


class EmptyModel(BaseModel):
    pass


# NOTE: this would be more accurately typed as
# a typing.Tuple[float, float, float], but tuple is
# not able to be expressed in OpenAPI Spec
OffsetVector = typing.List[float]


class JogPosition(BaseModel):
    vector: OffsetVector = Field(..., min_length=3, max_length=3)
