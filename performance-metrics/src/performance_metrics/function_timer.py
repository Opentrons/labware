"""A module that contains a context manager to track the start and end time of a function."""

from contextlib import ContextDecorator, AsyncContextDecorator
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Type
from types import TracebackType


@dataclass
class FunctionTime:
    """A dataclass to store the start and end time of a function.

    The dates are in UTC timezone.
    """

    start_time: datetime
    end_time: datetime


class FunctionTimer(ContextDecorator, AsyncContextDecorator):
    """A context manager that tracks the start and end time of a function.

    Handles both synchronous and asynchronous functions.
    """

    def __init__(self) -> None:
        self._start_time: datetime | None = None
        self._end_time: datetime | None = None

    def __enter__(self) -> "FunctionTimer":
        """Set the start time of the function."""
        self._start_time = self._get_datetime()
        return self

    def __exit__(
        self,
        exc_type: Type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Set the end time of the function."""
        self._end_time = self._get_datetime()

    async def __aenter__(self) -> "FunctionTimer":
        """Set the start time of the function."""
        self._start_time = self._get_datetime()
        return self

    async def __aexit__(
        self,
        exc_type: Type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Set the end time of the function."""
        self._end_time = self._get_datetime()

    def _get_datetime(self) -> datetime:
        """Get the current datetime in UTC timezone."""
        return datetime.now(timezone.utc)

    def get_time(self) -> FunctionTime:
        """Return a FunctionTime object with the start and end time of the function."""
        assert self._start_time is not None 
        assert self._end_time is not None
        return FunctionTime(start_time=self._start_time, end_time=self._end_time)
