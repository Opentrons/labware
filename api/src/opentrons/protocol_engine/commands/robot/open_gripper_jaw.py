"""Command models for opening a gripper jaw."""
from __future__ import annotations
from typing import Literal, Type, Optional
from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_engine.resources import ensure_ot3_hardware

from pydantic import BaseModel

from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
)
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence


openGripperJawCommandType = Literal["robot/openGripperJaw"]


class openGripperJawParams(BaseModel):
    """Payload required to release a gripper."""

    pass


class openGripperJawResult(BaseModel):
    """Result data from the execution of a openGripperJaw command."""

    pass


class openGripperJawImplementation(
    AbstractCommandImpl[openGripperJawParams, SuccessData[openGripperJawResult]]
):
    """openGripperJaw command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api

    async def execute(
        self, params: openGripperJawParams
    ) -> SuccessData[openGripperJawResult]:
        """Release the gripper."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)

        await ot3_hardware_api.home_gripper_jaw()
        return SuccessData(
            public=openGripperJawResult(),
        )


class openGripperJaw(
    BaseCommand[openGripperJawParams, openGripperJawResult, ErrorOccurrence]
):
    """openGripperJaw command model."""

    commandType: openGripperJawCommandType = "robot/openGripperJaw"
    params: openGripperJawParams
    result: Optional[openGripperJawResult] = None

    _ImplementationCls: Type[
        openGripperJawImplementation
    ] = openGripperJawImplementation


class openGripperJawCreate(BaseCommandCreate[openGripperJawParams]):
    """openGripperJaw command request model."""

    commandType: openGripperJawCommandType = "robot/openGripperJaw"
    params: openGripperJawParams

    _CommandCls: Type[openGripperJaw] = openGripperJaw
