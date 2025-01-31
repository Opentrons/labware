from __future__ import annotations

import asyncio
import contextlib
from concurrent.futures.thread import ThreadPoolExecutor
from functools import partial
from typing import Optional, AsyncGenerator, Union
from typing_extensions import Literal

from serial import Serial, serial_for_url  # type: ignore[import-untyped]

TimeoutProperties = Union[Literal["write_timeout"], Literal["timeout"]]


class AsyncSerial:
    """Async wrapper around Serial."""

    @classmethod
    async def create(
        cls,
        port: str,
        baud_rate: int,
        timeout: Optional[float] = None,
        write_timeout: Optional[float] = None,
        loop: Optional[asyncio.AbstractEventLoop] = None,
        reset_buffer_before_write: bool = False,
    ) -> AsyncSerial:
        """
        Create an AsyncSerial instance.

        Args:
            port: url or port name
            baud_rate: the baud rate
            timeout: optional timeout in seconds
            write_timeout: optional write timeout in seconds
            loop: optional event loop. if None get_running_loop will be used
            reset_buffer_before_write: reset the serial input buffer before
             writing to it
        """
        loop = loop or asyncio.get_running_loop()
        executor = ThreadPoolExecutor(max_workers=1)
        serial = await loop.run_in_executor(
            executor=executor,
            func=partial(
                serial_for_url,
                url=port,
                baudrate=baud_rate,
                timeout=timeout,
                write_timeout=write_timeout,
            ),
        )
        return cls(
            serial=serial,
            executor=executor,
            loop=loop,
            reset_buffer_before_write=reset_buffer_before_write,
        )

    def __init__(
        self,
        serial: Serial,
        executor: ThreadPoolExecutor,
        loop: asyncio.AbstractEventLoop,
        reset_buffer_before_write: bool,
    ) -> None:
        """
        Constructor

        Args:
            serial: connected Serial object
            executor: a thread pool executor
            loop: event loop
        """
        self._serial = serial
        self._executor = executor
        self._loop = loop
        self._reset_buffer_before_write = reset_buffer_before_write

    async def read_until(self, match: bytes) -> bytes:
        """
        Read data until match.

        Args:
            match: a sequence of bytes to match
            timeout: optional timeout in seconds. this is a temporary override
                of parameter supplied to `create`

        Returns:
            read data.
        """
        return await self._loop.run_in_executor(
            executor=self._executor,
            func=partial(self._serial.read_until, expected=match),
        )

    async def write(self, data: bytes) -> None:
        """
        Write data

        Args:
            data: data to write.

        Returns:
            None
        """
        await self._loop.run_in_executor(
            executor=self._executor,
            func=lambda: self._sync_write(data=data),
        )

    def _sync_write(self, data: bytes) -> None:
        """
        The synchronous write function

        Args:
            data: data to write.

        Returns:
            None
        """
        if self._reset_buffer_before_write:
            self._serial.reset_input_buffer()
        self._serial.write(data=data)
        self._serial.flush()

    async def open(self) -> None:
        """
        Open the connection.

        Returns: None
        """
        return await self._loop.run_in_executor(
            executor=self._executor, func=self._serial.open
        )

    async def close(self) -> None:
        """
        Close the connection

        Returns: None
        """
        return await self._loop.run_in_executor(
            executor=self._executor, func=self._serial.close
        )

    async def is_open(self) -> bool:
        """
        Check if connection is open.

        Returns: boolean
        """
        return self._serial.is_open is True

    def reset_input_buffer(self) -> None:
        """Reset the input buffer"""
        self._serial.reset_input_buffer()

    def reset_output_buffer(self) -> None:
        """Reset the output buffer"""
        self._serial.reset_output_buffer()

    @contextlib.asynccontextmanager
    async def timeout_override(
        self, timeout_property: TimeoutProperties, timeout: Optional[float]
    ) -> AsyncGenerator[None, None]:
        """Context manager that will temporarily override the default timeout."""
        default_timeout = getattr(self._serial, timeout_property)
        override = timeout is not None and default_timeout != timeout
        try:
            if override:
                await self._loop.run_in_executor(
                    executor=self._executor,
                    func=lambda: setattr(self._serial, timeout_property, timeout),
                )
            yield
        finally:
            if override:
                await self._loop.run_in_executor(
                    executor=self._executor,
                    func=lambda: setattr(
                        self._serial, timeout_property, default_timeout
                    ),
                )
