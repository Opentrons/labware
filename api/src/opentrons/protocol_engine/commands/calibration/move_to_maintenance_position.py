"""Calibration Move To Maintenance Location command payload, result, and implementation models."""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Type, Optional
from typing_extensions import Literal
import logging

from pydantic import BaseModel, Field

from opentrons.types import MountType, Point, Mount
from opentrons.hardware_control.types import OT3Axis, CriticalPoint
from opentrons.protocol_engine.commands.command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
)
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware

if TYPE_CHECKING:
    from opentrons.hardware_control import HardwareControlAPI
    from ...state import StateView

logger = logging.getLogger(__name__)

# These offsets supplied from HW
_ATTACH_POINT = Point(x=0, y=110)
# These offsets are by eye measuring
_INSTRUMENT_ATTACH_Z_POINT = 400.0
# given from HW
_MAX_AXIS_MOTION_RANGE = 215
# Move the right mount a bit higher than the left so the user won't forget to unscrew
_PLATE_ATTACH_Z_RIGHT_POINT = 320

MoveToMaintenancePositionCommandType = Literal["calibration/moveToMaintenancePosition"]


class MaintenancePosition(enum.Enum):
    """Maintenance position options."""

    ATTACH_PLATE = "attachPlate"
    ATTACH_INSTRUMENT = "attachInstrument"


class MoveToMaintenancePositionParams(BaseModel):
    """Calibration set up position command parameters."""

    mount: MountType = Field(
        ...,
        description="Gantry mount to move maintenance position.",
    )

    maintenancePosition: MaintenancePosition = Field(
        MaintenancePosition.ATTACH_INSTRUMENT,
        description="The position the gantry mount needs to move to.",
    )


class MoveToMaintenancePositionResult(BaseModel):
    """Result data from the execution of a MoveToMaintenancePosition command."""


class MoveToMaintenancePositionImplementation(
    AbstractCommandImpl[
        MoveToMaintenancePositionParams, MoveToMaintenancePositionResult
    ]
):
    """Calibration set up position command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        state_view: StateView,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._hardware_api = hardware_api

    async def execute(
        self, params: MoveToMaintenancePositionParams
    ) -> MoveToMaintenancePositionResult:
        """Move the requested mount to a maintenance deck slot."""
        ot3_api = ensure_ot3_hardware(
            self._hardware_api,
        )
        current_position = await ot3_api.gantry_position(Mount.LEFT)
        max_height_z = ot3_api.get_instrument_max_height(Mount.LEFT)
        # avoid using motion planning waypoints because we do not need to move the z at this moment
        movement_points = [
            # move the z to the highest position
            Point(x=current_position.x, y=current_position.y, z=max_height_z),
            # move in x,y without going down the z
            Point(x=_ATTACH_POINT.x, y=_ATTACH_POINT.y, z=max_height_z),
        ]

        for movement in movement_points:
            await ot3_api.move_to(
                mount=Mount.LEFT,
                abs_position=movement,
                critical_point=CriticalPoint.MOUNT,
            )

        if params.maintenancePosition == MaintenancePosition.ATTACH_INSTRUMENT:
            mount_to_axis = OT3Axis.by_mount(params.mount.to_hw_mount())
            await ot3_api.move_axes(
                {
                    mount_to_axis: _INSTRUMENT_ATTACH_Z_POINT,
                }
            )
        else:
            await ot3_api.move_axes(
                {
                    OT3Axis.Z_L: max_height_z - _MAX_AXIS_MOTION_RANGE,
                    OT3Axis.Z_R: _PLATE_ATTACH_Z_RIGHT_POINT,
                }
            )

        return MoveToMaintenancePositionResult()


class MoveToMaintenancePosition(
    BaseCommand[MoveToMaintenancePositionParams, MoveToMaintenancePositionResult]
):
    """Calibration set up position command model."""

    commandType: MoveToMaintenancePositionCommandType = (
        "calibration/moveToMaintenancePosition"
    )
    params: MoveToMaintenancePositionParams
    result: Optional[MoveToMaintenancePositionResult]

    _ImplementationCls: Type[
        MoveToMaintenancePositionImplementation
    ] = MoveToMaintenancePositionImplementation


class MoveToMaintenancePositionCreate(
    BaseCommandCreate[MoveToMaintenancePositionParams]
):
    """Calibration set up position command creation request model."""

    commandType: MoveToMaintenancePositionCommandType = (
        "calibration/moveToMaintenancePosition"
    )
    params: MoveToMaintenancePositionParams

    _CommandCls: Type[MoveToMaintenancePosition] = MoveToMaintenancePosition
