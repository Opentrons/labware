"""Protocol file models."""

from datetime import datetime
from pydantic import ConfigDict, BaseModel, Field
from typing import Any, List, Optional
from enum import Enum

from opentrons.protocol_reader import (
    ProtocolType as ProtocolType,
    ProtocolFileRole as ProtocolFileRole,
)

from opentrons_shared_data.robot.types import RobotType

from robot_server.service.json_api import ResourceModel
from .analysis_models import AnalysisSummary


class ProtocolKind(str, Enum):
    """Kind of protocol, standard or quick-transfer."""

    STANDARD = "standard"
    QUICK_TRANSFER = "quick-transfer"


class ProtocolFile(BaseModel):
    """A file in a protocol."""

    # TODO(mc, 2021-11-12): add unique ID to file resource
    name: str = Field(..., description="The file's basename, including extension")
    role: ProtocolFileRole = Field(..., description="The file's role in the protocol.")


class Metadata(BaseModel):
    """Extra, nonessential information about the protocol.

    This can include data like:

    * A human-readable title and description.
    * A last-modified date.
    * A list of authors.

    Metadata may contain fields other than those explicitly
    listed in this schema.

    The metadata *should not* include information needed
    to run the protocol correctly. For historical reasons, Python
    protocols define their `apiLevel` inside their metadata, but
    this should be considered an exception to the rule.
    """

    model_config = ConfigDict(extra="allow")


class Protocol(ResourceModel):
    """A model representing an uploaded protocol resource."""

    id: str = Field(..., description="A unique identifier for this protocol.")

    createdAt: datetime = Field(
        ...,
        description=(
            "When this protocol was *uploaded.*"
            " (`metadata` may have information about"
            " when this protocol was *authored.*)"
        ),
    )

    files: List[ProtocolFile]

    protocolType: ProtocolType = Field(
        ...,
        description="The type of protocol file (JSON or Python).",
    )

    # robotType is provided for symmetry with the output of app-side analysis.
    # Here on a robot, the robot_type of a protocol will always match the robot hosting
    # this server, because otherwise this server would have rejected the upload.
    robotType: RobotType = Field(
        ..., description="The type of robot that this protocol can run on."
    )

    # todo(mm, 2021-09-16): Investigate whether something like `dict[str, Any]` would
    # be a better way (e.g. produce better OpenAPI) to represent an arbitrary JSON obj.
    metadata: Metadata

    analyses: List[Any] = Field(
        default_factory=list,
        description=(
            "This field was deprecated for performance reasons."
            " It will always be returned as an empty list."
            " Use `analysisSummaries` and `GET /protocols/:id/analyses` instead."
        ),
    )

    analysisSummaries: List[AnalysisSummary] = Field(
        ...,
        description=(
            "Summaries of any analyses run to check how this protocol"
            " is expected to run. For more detailed information,"
            " use `GET /protocols/:id/analyses`."
            "\n\n"
            "Returned in order from the least-recently started analysis"
            " to the most-recently started analysis."
        ),
    )

    key: Optional[str] = Field(
        None,
        description=(
            "An arbitrary client-defined string, set when this protocol was uploaded."
            " See `POST /protocols`."
        ),
    )

    protocolKind: Optional[ProtocolKind] = Field(
        ...,
        description="The kind of protocol (standard or quick-transfer)."
        "The client provides this field when the protocol is uploaded."
        " See `POST /protocols`.",
    )
