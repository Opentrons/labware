"""Update position estimators payload, result, and implementaiton."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import TYPE_CHECKING, Optional, List, Type
from typing_extensions import Literal

from ...types import MotorAxis
from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...resources import ensure_ot3_hardware

from opentrons.hardware_control import HardwareControlAPI

if TYPE_CHECKING:
    from ...execution import GantryMover


UpdatePositionEstimatorsCommandType = Literal["unsafe/updatePositionEstimators"]


class UpdatePositionEstimatorsParams(BaseModel):
    """Payload required for an UpdatePositionEstimators command."""

    axes: List[MotorAxis] = Field(
        ...,
        description=(
            "The axes for which to update the position estimators."
            " Any axes that are not physically present will be ignored."
        ),
    )


class UpdatePositionEstimatorsResult(BaseModel):
    """Result data from the execution of an UpdatePositionEstimators command."""


class UpdatePositionEstimatorsImplementation(
    AbstractCommandImpl[
        UpdatePositionEstimatorsParams,
        SuccessData[UpdatePositionEstimatorsResult],
    ]
):
    """Update position estimators command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api
        self._gantry_mover = gantry_mover

    async def execute(
        self, params: UpdatePositionEstimatorsParams
    ) -> SuccessData[UpdatePositionEstimatorsResult]:
        """Update axis position estimators from their encoders."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        await ot3_hardware_api.update_axis_position_estimations(
            self._gantry_mover.motor_axes_to_present_hardware_axes(params.axes)
        )
        return SuccessData(
            public=UpdatePositionEstimatorsResult(),
        )


class UpdatePositionEstimators(
    BaseCommand[
        UpdatePositionEstimatorsParams, UpdatePositionEstimatorsResult, ErrorOccurrence
    ]
):
    """UpdatePositionEstimators command model."""

    commandType: UpdatePositionEstimatorsCommandType = "unsafe/updatePositionEstimators"
    params: UpdatePositionEstimatorsParams
    result: Optional[UpdatePositionEstimatorsResult] = None

    _ImplementationCls: Type[
        UpdatePositionEstimatorsImplementation
    ] = UpdatePositionEstimatorsImplementation


class UpdatePositionEstimatorsCreate(BaseCommandCreate[UpdatePositionEstimatorsParams]):
    """UpdatePositionEstimators command request model."""

    commandType: UpdatePositionEstimatorsCommandType = "unsafe/updatePositionEstimators"
    params: UpdatePositionEstimatorsParams

    _CommandCls: Type[UpdatePositionEstimators] = UpdatePositionEstimators
