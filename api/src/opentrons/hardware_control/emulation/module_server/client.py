from __future__ import annotations
import asyncio
from asyncio import IncompleteReadError, LimitOverrunError
from typing import Optional

from opentrons.hardware_control.emulation.module_server.models import Message
from opentrons.hardware_control.emulation.module_server.server import MessageDelimiter


class ModuleServerClientError(Exception):
    pass


class ModuleServerDisconnected(ModuleServerClientError):
    pass


class ModuleStatusClient:
    """A module server client."""

    def __init__(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        """Constructor."""
        self._reader = reader
        self._writer = writer

    @classmethod
    async def connect(
        cls,
        host: str,
        port: int,
        retries: int = 3,
        interval_seconds: float = 0.1,
    ) -> ModuleStatusClient:
        """Connect to the module server.

        Args:
            host: module server host.
            port: module server port.
            retries: number of retries
            interval_seconds: time between retries.

        Returns:
            None
        Raises:
            IOError on retry expiry.
        """
        r: Optional[asyncio.StreamReader] = None
        w: Optional[asyncio.StreamWriter] = None
        for i in range(retries):
            try:
                r, w = await asyncio.open_connection(host=host, port=port)
                break
            except OSError:
                await asyncio.sleep(interval_seconds)

        if r is not None and w is not None:
            return ModuleStatusClient(reader=r, writer=w)
        else:
            raise IOError(
                f"Failed to connect to module_server at after {retries} retries."
            )

    async def read(self) -> Message:
        """Read a message from the module server."""
        try:
            b = await self._reader.readuntil(MessageDelimiter)
            m: Message = Message.model_validate_json(b)
            return m
        except LimitOverrunError as e:
            raise ModuleServerClientError(str(e))
        except IncompleteReadError:
            raise ModuleServerDisconnected()

    def close(self) -> None:
        """Close the client."""
        self._writer.close()
