"""Ungrip labware payload, result, and implementaiton."""

from __future__ import annotations

from opentrons.hardware_control.types import Axis
from opentrons.protocol_engine.errors.exceptions import GripperNotAttachedError
from pydantic import BaseModel
from typing import Optional, Type
from typing_extensions import Literal

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...resources import ensure_ot3_hardware

from opentrons.hardware_control import HardwareControlAPI


UnsafeUngripLabwareCommandType = Literal["unsafe/ungripLabware"]


class UnsafeUngripLabwareParams(BaseModel):
    """Payload required for an UngripLabware command."""


class UnsafeUngripLabwareResult(BaseModel):
    """Result data from the execution of an UngripLabware command."""


class UnsafeUngripLabwareImplementation(
    AbstractCommandImpl[
        UnsafeUngripLabwareParams,
        SuccessData[UnsafeUngripLabwareResult],
    ]
):
    """Ungrip labware command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api

    async def execute(
        self, params: UnsafeUngripLabwareParams
    ) -> SuccessData[UnsafeUngripLabwareResult]:
        """Ungrip Labware."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        if not ot3_hardware_api.has_gripper():
            raise GripperNotAttachedError("No gripper found to perform ungrip.")
        await ot3_hardware_api.home([Axis.G])
        return SuccessData(
            public=UnsafeUngripLabwareResult(),
        )


class UnsafeUngripLabware(
    BaseCommand[UnsafeUngripLabwareParams, UnsafeUngripLabwareResult, ErrorOccurrence]
):
    """UnsafeUngripLabware command model."""

    commandType: UnsafeUngripLabwareCommandType = "unsafe/ungripLabware"
    params: UnsafeUngripLabwareParams
    result: Optional[UnsafeUngripLabwareResult] = None

    _ImplementationCls: Type[
        UnsafeUngripLabwareImplementation
    ] = UnsafeUngripLabwareImplementation


class UnsafeUngripLabwareCreate(BaseCommandCreate[UnsafeUngripLabwareParams]):
    """UnsafeEngageAxes command request model."""

    commandType: UnsafeUngripLabwareCommandType = "unsafe/ungripLabware"
    params: UnsafeUngripLabwareParams

    _CommandCls: Type[UnsafeUngripLabware] = UnsafeUngripLabware
