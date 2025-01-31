import typing

from server_utils.util import duration
from .base_executor import CommandExecutor
from .command import Command, CompletedCommand, CommandResult


CommandHandler = typing.Callable[
    [str, typing.Dict[typing.Any, typing.Any]], typing.Coroutine[None, None, None]
]


class CallableExecutor(CommandExecutor):
    """A command executor that passes off execution to a callable"""

    def __init__(self, command_handler: CommandHandler):
        """
        Constructor

        :param command_handler: A function
        """
        self._callable = command_handler

    async def execute(self, command: Command) -> CompletedCommand:
        """Execute command"""
        with duration() as time_it:
            name_arg = command.request.command
            data = command.request.data
            data_arg = data.model_dump() if data else {}

            await self._callable(name_arg, data_arg)

        return CompletedCommand(
            request=command.request,
            meta=command.meta,
            result=CommandResult(started_at=time_it.start, completed_at=time_it.end),
        )
