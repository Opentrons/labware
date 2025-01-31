"""Helpers for commands that alter the position of labware."""

from pydantic import BaseModel, Field

from ..types import LabwareLocationSequence


class LabwareHandlingResultMixin(BaseModel):
    """A result for commands that create a labware entity."""

    labwareId: str = Field(..., description="The id of the labware.")
    locationSequence: LabwareLocationSequence | None = Field(
        None,
        description="The full location down to the deck on which this labware exists.",
    )
    offsetId: str | None = Field(
        None,
        description="An ID referencing the labware offset that will apply to this labware in this location.",
    )


class LabwareMotionResultMixin(BaseModel):
    """A result for commands that move a labware entity."""

    labwareId: str = Field(..., description="The id of the labware.")
    newLocationSequence: LabwareLocationSequence | None = Field(
        None,
        description="the full location down to the deck of the labware after this command.",
    )
    originalLocationSequence: LabwareLocationSequence | None = Field(
        None,
        description="The full location down to the deck of the labware before this command.",
    )
    offsetId: str | None = Field(
        None,
        description="An ID referencing the labware offset that will apply to this labware in the position this command leaves it in.",
    )
