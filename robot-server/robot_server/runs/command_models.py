"""Request and response models for dealing with run commands.

These are shared between the `/runs` and `/maintenance_runs` endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CommandLinkMeta(BaseModel):
    """Metadata about a command resource referenced in `links`."""

    runId: str = Field(..., description="The ID of the command's run.")
    commandId: str = Field(..., description="The ID of the command.")
    index: int = Field(
        ..., description="The index of the command in the run's overall command list."
    )
    key: str = Field(..., description="The value of the command's `key` field.")
    createdAt: datetime = Field(..., description="When the command was created.")


class CommandLink(BaseModel):
    """A link to a command resource."""

    href: str = Field(..., description="The HTTP API path to the command")
    meta: CommandLinkMeta = Field(..., description="Information about the command.")


class CommandCollectionLinks(BaseModel):
    """Links returned along with a collection of commands."""

    current: Optional[CommandLink] = Field(
        None,
        description=(
            'Information about the "current" command.'
            ' The "current" command is the one that\'s running right now,'
            " or, if there is none, the one that was running most recently."
        ),
    )

    currentlyRecoveringFrom: Optional[CommandLink] = Field(
        None,
        description=(
            "Information about the command currently undergoing error recovery."
            " This is basically the most recent protocol command to have failed,"
            " except that once you complete error recovery"
            " (see `GET /runs/{id}/actions`), this goes back to being"
            " `null` or omitted."
        ),
    )
