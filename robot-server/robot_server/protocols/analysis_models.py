"""Response models for protocol analysis."""
# TODO(mc, 2021-08-25): add modules to simulation result
from enum import Enum

from opentrons.protocol_engine.types import (
    RunTimeParameter,
    PrimitiveRunTimeParamValuesType,
    CSVRunTimeParamFilesType,
    CommandAnnotation,
)
from opentrons_shared_data.robot.types import RobotType
from pydantic import BaseModel, Field
from typing import List, Optional, Union, NamedTuple
from typing_extensions import Literal

from opentrons.protocol_engine import (
    Command,
    ErrorOccurrence,
    LoadedLabware,
    LoadedModule,
    LoadedPipette,
    Liquid,
    LiquidClassRecordWithId,
)


class AnalysisStatus(str, Enum):
    """Status of a protocol analysis."""

    PENDING = "pending"
    COMPLETED = "completed"


class AnalysisResult(str, Enum):
    """Result of a completed protocol analysis.

    The result indicates whether the protocol is expected to run successfully.

    Properties:
        OK: No problems were found during protocol analysis.
        NOT_OK: Problems were found during protocol analysis. Inspect
            `analysis.errors` for error occurrences.
        PARAMETER_VALUE_REQUIRED: A value is required to be set for a parameter
            in order for the protocol to be analyzed/run. The absence of this does not
            inherently mean there are no parameters, as there may be defaults for all
            or unset parameters are not referenced or handled via try/except clauses.
    """

    OK = "ok"
    NOT_OK = "not-ok"
    PARAMETER_VALUE_REQUIRED = "parameter-value-required"


class AnalysisRequest(BaseModel):
    """Model for analysis request body."""

    runTimeParameterValues: PrimitiveRunTimeParamValuesType = Field(
        default={},
        description="Key-value pairs of primitive run-time parameters defined in a protocol.",
    )
    runTimeParameterFiles: CSVRunTimeParamFilesType = Field(
        default={},
        description="Key-fileId pairs of CSV run-time parameters defined in a protocol.",
    )
    forceReAnalyze: bool = Field(
        False, description="Whether to force start a new analysis."
    )


class AnalysisSummary(BaseModel):
    """Base model for an analysis of a protocol."""

    id: str = Field(..., description="Unique identifier of this analysis resource")
    status: AnalysisStatus = Field(..., description="Status of the analysis")
    runTimeParameters: Optional[List[RunTimeParameter]] = Field(
        default=None,
        description=(
            "Run time parameters used during analysis."
            " These are the parameters that are defined in the protocol, with values"
            " specified either in the protocol creation request or reanalysis request"
            " (whichever started this analysis), or default values from the protocol"
            " if none are specified in the request."
        ),
    )


class PendingAnalysis(BaseModel):
    """A protocol analysis that is on-going."""

    id: str = Field(..., description="Unique identifier of this analysis resource")
    status: Literal[AnalysisStatus.PENDING] = Field(
        AnalysisStatus.PENDING,
        description="Status marking the analysis as pending",
    )
    runTimeParameters: List[RunTimeParameter] = Field(
        default_factory=list,
        description=(
            "Run time parameters used during analysis."
            " These are the parameters that are defined in the protocol, with values"
            " specified either in the protocol creation request or reanalysis request"
            " (whichever started this analysis), or default values from the protocol"
            " if none are specified in the request."
        ),
    )


class CompletedAnalysis(BaseModel):
    """A completed protocol run analysis.

    This analysis provides three pieces of information:

    - A smoke test on whether the run is expected to succeed, given available data.
    - The equipment (labware, pipettes, modules) that the protocol will use.
    - The run commands that the protocol is expected to issue.

    !!! important "Important note about non-deterministic protocols"
        Python protocols are allowed to be written in a way that makes their
        behavior non-deterministic. For example, a protocol could use ``random``
        to determine how much volume to aspirate.

        If a protocol is non-deterministic, an analysis may differ from the
        actual run (or any subsequent analysis). If you are writing or using
        non-deterministic protocols, please keep this fact in mind.

        JSON protocols are currently deterministic by design.
    """

    # We want to unify this HTTP-facing analysis model with the one that local analysis returns.
    # Until that happens, we need to keep these fields in sync manually.

    # Fields that are currently unique to robot-server, missing from local analysis:
    id: str = Field(..., description="Unique identifier of this analysis resource")
    status: Literal[AnalysisStatus.COMPLETED] = Field(
        ...,
        description="Status marking the analysis as completed",
    )
    result: AnalysisResult = Field(
        ...,
        description="Whether the protocol is expected to run successfully",
    )

    # Fields that should match local analysis:
    robotType: Optional[RobotType] = Field(
        # robotType is deliberately typed as a Literal instead of an Enum.
        # It's a bad idea at the moment to store enums in robot-server's database.
        # https://opentrons.atlassian.net/browse/RSS-98
        default=None,  # default=None to fit objects that were stored before this field existed.
        description=(
            "The type of robot that this protocol can run on."
            " This field was added in v7.1.0. It will be `null` or omitted"
            " in analyses that were originally created on older versions."
        ),
    )
    runTimeParameters: List[RunTimeParameter] = Field(
        default_factory=list,
        description=(
            "Run time parameters used during analysis."
            " These are the parameters that are defined in the protocol, with values"
            " specified either in the protocol creation request or reanalysis request"
            " (whichever started this analysis), or default values from the protocol"
            " if none are specified in the request."
        ),
    )
    commands: List[Command] = Field(
        ...,
        description="The protocol commands the run is expected to produce",
    )
    labware: List[LoadedLabware] = Field(
        ...,
        description=(
            "Labware used by the protocol."
            "\n\n"
            "If a piece of labware moves between locations as part of the protocol,"
            " its *final* location will be reported in this list,"
            " not its *initial* location."
        ),
    )
    pipettes: List[LoadedPipette] = Field(
        ...,
        description="Pipettes used by the protocol",
    )
    modules: List[LoadedModule] = Field(
        default_factory=list,
        description="Modules that have been loaded into the run.",
    )
    liquids: List[Liquid] = Field(
        default_factory=list,
        description="Liquids used by the protocol",
    )
    liquidClasses: List[LiquidClassRecordWithId] = Field(
        default_factory=list,
        description="Liquid classes used by the protocol",
    )
    errors: List[ErrorOccurrence] = Field(
        ...,
        description=(
            "The protocol's fatal error, if there was one."
            " For historical reasons, this is an array,"
            " but it won't have more than one element."
        ),
    )
    commandAnnotations: List[CommandAnnotation] = Field(
        default_factory=list,
        description="Optional annotations for commands in this run.",
    )


AnalysisParameterType = Union[float, bool, str, None]


class RunTimeParameterAnalysisData(NamedTuple):
    """Data from analysis of a run-time parameter."""

    value: AnalysisParameterType
    default: AnalysisParameterType


ProtocolAnalysis = Union[PendingAnalysis, CompletedAnalysis]
