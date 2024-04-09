"""Custom protocol command.

A "custom" command contains arbitrary payload and result data.
It can be used by ProtocolEngine plugins to represent external
commands in state that a vanilla ProtocolEngine would not
know about.

This data model serves as a wrapper to ensure custom, arbitrary
data still adheres to the shapes that ProtocolEngine expects.
If you are implementing a custom command, you should probably
put your own disambiguation identifier in the payload.
"""
from pydantic import ConfigDict, BaseModel
from typing import Optional, Type
from typing_extensions import Literal

from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate


CustomCommandType = Literal["custom"]


class CustomParams(BaseModel):
    """Payload used by a custom command."""

    model_config = ConfigDict(extra="allow")


# TODO: replace this once we have the proper comment command
class LegacyCommentCustomParams(CustomParams):

    legacyCommandType: str
    legacyCommandText: str


class CustomResult(BaseModel):
    """Result data from a custom command."""

    model_config = ConfigDict(extra="allow")


class CustomImplementation(AbstractCommandImpl[CustomParams, CustomResult]):
    """Custom command implementation."""

    # TODO(mm, 2022-11-09): figure out how a plugin can specify a custom command
    # implementation. For now, always no-op, so we can use custom commands as containers
    # for legacy RPC (pre-ProtocolEngine) payloads.
    async def execute(self, params: CustomParams) -> CustomResult:
        """A custom command does nothing when executed directly."""
        return CustomResult.construct()


class Custom(BaseCommand[CustomParams, CustomResult]):
    """Custom command model."""

    commandType: CustomCommandType = "custom"
    params: CustomParams
    result: Optional[CustomResult] = None

    _ImplementationCls: Type[CustomImplementation] = CustomImplementation


class CustomCreate(BaseCommandCreate[CustomParams]):
    """A request to create a custom command."""

    commandType: CustomCommandType = "custom"
    params: CustomParams

    _CommandCls: Type[Custom] = Custom
