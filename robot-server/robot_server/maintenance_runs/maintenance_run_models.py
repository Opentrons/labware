"""Request and response models for maintenance run resources."""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional

from opentrons.protocol_engine import (
    EngineStatus as RunStatus,
    ErrorOccurrence,
    LoadedPipette,
    LoadedLabware,
    LoadedModule,
    LabwareOffset,
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    Liquid,
    LiquidClassRecordWithId,
)
from robot_server.service.json_api import ResourceModel


class MaintenanceRun(ResourceModel):
    """Maintenance run resource model."""

    id: str = Field(..., description="Unique run identifier.")
    createdAt: datetime = Field(..., description="When the run was created")
    status: RunStatus = Field(..., description="Execution status of the run")
    current: bool = Field(
        ...,
        description=(
            "Whether this run is currently controlling the robot."
            " There can be, at most, one current run."
        ),
    )
    actions: List[object] = Field(
        ...,
        description=(
            " This is currently always an empty list,"
            " and is provided for symmetry with non-maintenance runs."
            " Non-maintenance runs let you issue actions with"
            " `POST /runs/{id}/actions`, but there is currently no equivalent"
            " endpoint for maintenance runs."
        ),
    )
    errors: List[ErrorOccurrence] = Field(
        ...,
        description=(
            "The run's fatal error, if there was one."
            " For historical reasons, this is an array,"
            " but it won't have more than one element."
        ),
    )
    hasEverEnteredErrorRecovery: bool = Field(
        ...,
        description=("Whether the run has entered error recovery."),
    )
    pipettes: List[LoadedPipette] = Field(
        ...,
        description="Pipettes that have been loaded into the run.",
    )
    modules: List[LoadedModule] = Field(
        ...,
        description="Modules that have been loaded into the run.",
    )
    labware: List[LoadedLabware] = Field(
        ...,
        description="Labware that has been loaded into the run.",
    )
    liquids: List[Liquid] = Field(
        ...,
        description="Liquids loaded to the run.",
    )
    liquidClasses: List[LiquidClassRecordWithId] = Field(
        ...,
        description="Liquid classes loaded to the run.",
    )
    labwareOffsets: List[LabwareOffset] = Field(
        ...,
        description="Labware offsets to apply as labware are loaded.",
    )
    completedAt: Optional[datetime] = Field(
        None,
        description="Run completed at timestamp.",
    )
    startedAt: Optional[datetime] = Field(
        None,
        description="Run started at timestamp.",
    )


class MaintenanceRunCreate(BaseModel):
    """Create request data for a new maintenance run."""

    labwareOffsets: List[LegacyLabwareOffsetCreate | LabwareOffsetCreate] = Field(
        default_factory=list,
        description="Labware offsets to apply as labware are loaded.",
    )


class MaintenanceRunUpdate(BaseModel):
    """Update request data for an existing maintenance run."""

    current: Optional[bool] = Field(
        None,
        description=(
            "Whether this run is currently controlling the robot."
            " Setting `current` to `false` will deactivate the run."
        ),
    )


class LabwareDefinitionSummary(BaseModel):
    """Summary of data about a created labware definition."""

    definitionUri: str = Field(
        ...,
        description="The definition's unique resource identifier in the run.",
    )


class MaintenanceRunNotFoundError(ValueError):
    """Error raised when a given Run ID is not found in the store."""

    def __init__(self, run_id: str) -> None:
        """Initialize the error message from the missing ID."""
        super().__init__(f"Run {run_id} was not found.")
