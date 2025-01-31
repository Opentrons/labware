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


UnsafeEngageAxesCommandType = Literal["unsafe/engageAxes"]


class UnsafeEngageAxesParams(BaseModel):
    """Payload required for an UnsafeEngageAxes command."""

    axes: List[MotorAxis] = Field(..., description="The axes for which to enable.")


class UnsafeEngageAxesResult(BaseModel):
    """Result data from the execution of an UnsafeEngageAxes command."""


class UnsafeEngageAxesImplementation(
    AbstractCommandImpl[
        UnsafeEngageAxesParams,
        SuccessData[UnsafeEngageAxesResult],
    ]
):
    """Enable axes command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        gantry_mover: GantryMover,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api
        self._gantry_mover = gantry_mover

    async def execute(
        self, params: UnsafeEngageAxesParams
    ) -> SuccessData[UnsafeEngageAxesResult]:
        """Enable exes."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        await ot3_hardware_api.engage_axes(
            self._gantry_mover.motor_axes_to_present_hardware_axes(params.axes)
        )
        return SuccessData(
            public=UnsafeEngageAxesResult(),
        )


class UnsafeEngageAxes(
    BaseCommand[UnsafeEngageAxesParams, UnsafeEngageAxesResult, ErrorOccurrence]
):
    """UnsafeEngageAxes command model."""

    commandType: UnsafeEngageAxesCommandType = "unsafe/engageAxes"
    params: UnsafeEngageAxesParams
    result: Optional[UnsafeEngageAxesResult] = None

    _ImplementationCls: Type[
        UnsafeEngageAxesImplementation
    ] = UnsafeEngageAxesImplementation


class UnsafeEngageAxesCreate(BaseCommandCreate[UnsafeEngageAxesParams]):
    """UnsafeEngageAxes command request model."""

    commandType: UnsafeEngageAxesCommandType = "unsafe/engageAxes"
    params: UnsafeEngageAxesParams

    _CommandCls: Type[UnsafeEngageAxes] = UnsafeEngageAxes
