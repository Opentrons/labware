"""Command models for opening a gripper jaw."""
from __future__ import annotations
from typing import Literal, Type, Optional, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_engine.resources import ensure_ot3_hardware

from ..command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    SuccessData,
)
from opentrons.protocol_engine.errors.error_occurrence import ErrorOccurrence


closeGripperJawCommandType = Literal["robot/closeGripperJaw"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class closeGripperJawParams(BaseModel):
    """Payload required to close a gripper."""

    force: float | SkipJsonSchema[None] = Field(
        default=None,
        description="The force the gripper should use to hold the jaws, falls to default if none is provided.",
        json_schema_extra=_remove_default,
    )


class closeGripperJawResult(BaseModel):
    """Result data from the execution of a closeGripperJaw command."""

    pass


class closeGripperJawImplementation(
    AbstractCommandImpl[closeGripperJawParams, SuccessData[closeGripperJawResult]]
):
    """closeGripperJaw command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api

    async def execute(
        self, params: closeGripperJawParams
    ) -> SuccessData[closeGripperJawResult]:
        """Release the gripper."""
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)
        await ot3_hardware_api.grip(force_newtons=params.force)
        return SuccessData(
            public=closeGripperJawResult(),
        )


class closeGripperJaw(
    BaseCommand[closeGripperJawParams, closeGripperJawResult, ErrorOccurrence]
):
    """closeGripperJaw command model."""

    commandType: closeGripperJawCommandType = "robot/closeGripperJaw"
    params: closeGripperJawParams
    result: Optional[closeGripperJawResult] = None

    _ImplementationCls: Type[
        closeGripperJawImplementation
    ] = closeGripperJawImplementation


class closeGripperJawCreate(BaseCommandCreate[closeGripperJawParams]):
    """closeGripperJaw command request model."""

    commandType: closeGripperJawCommandType = "robot/closeGripperJaw"
    params: closeGripperJawParams

    _CommandCls: Type[closeGripperJaw] = closeGripperJaw
