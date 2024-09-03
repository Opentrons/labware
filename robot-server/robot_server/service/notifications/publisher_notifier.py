"""Provides an interface for alerting notification publishers to events and related lifecycle utilities."""
import asyncio
from logging import getLogger
from fastapi import Depends
from typing import Optional, Callable, List, Awaitable, Union

from server_utils.fastapi_utils.app_state import (
    AppState,
    AppStateAccessor,
    get_app_state,
)

from opentrons.util.change_notifier import ChangeNotifier, ChangeNotifier_ts

LOG = getLogger(__name__)


class PublisherNotifier:
    """An interface that invokes notification callbacks whenever a generic notify event occurs."""

    def __init__(self, change_notifier: Union[ChangeNotifier, ChangeNotifier_ts]):
        self._change_notifier = change_notifier
        self._notifier: Optional[asyncio.Task[None]] = None
        self._callbacks: List[Callable[[], Awaitable[None]]] = []

    def register_publish_callbacks(
        self, callbacks: List[Callable[[], Awaitable[None]]]
    ):
        """Extend the list of callbacks with a given list of callbacks."""
        self._callbacks.extend(callbacks)

    async def _initialize(self) -> None:
        """Initializes an instance of PublisherNotifier. This method should only be called once."""
        self._notifier = asyncio.create_task(
            self._wait_for_event(), name="Run publisher notifier"
        )

    def _notify_publishers(self) -> None:
        """A generic notifier, alerting all `waiters` of a change."""
        self._change_notifier.notify()

    async def _wait_for_event(self) -> None:
        """Indefinitely wait for an event to occur, then invoke each callback."""
        try:
            while True:
                await self._change_notifier.wait()
                for callback in self._callbacks:
                    try:
                        await callback()
                    except BaseException as e:
                        LOG.exception(
                            f"PublisherNotifier: exception in callback {getattr(callback, '__name__', '<unknown>')} - {e}"
                        )
        except asyncio.CancelledError:
            LOG.info("PublisherNotifier: Task was cancelled gracefully.")
            raise  # Re-raise to ensure proper task cancellation
        except BaseException as e:
            LOG.exception(f"PublisherNotifier: notify task failed - {e}")
        finally:
            LOG.info("PublisherNotifier: _wait_for_event has stopped.")


_pe_publisher_notifier_accessor: AppStateAccessor[PublisherNotifier] = AppStateAccessor[
    PublisherNotifier
]("publisher_notifier")


def get_pe_publisher_notifier(
    app_state: AppState = Depends(get_app_state),
) -> PublisherNotifier:
    """Intended for use by various publishers only. Intended for protocol engine."""
    publisher_notifier = _pe_publisher_notifier_accessor.get_from(app_state)
    assert publisher_notifier is not None

    return publisher_notifier


def get_pe_notify_publishers(
    app_state: AppState = Depends(get_app_state),
) -> Callable[[], None]:
    """Provides access to the callback used to notify publishers of changes. Intended for protocol engine."""
    publisher_notifier = _pe_publisher_notifier_accessor.get_from(app_state)
    assert isinstance(publisher_notifier, PublisherNotifier)

    return publisher_notifier._notify_publishers


async def initialize_pe_publisher_notifier(app_state: AppState) -> None:
    """Create a new `NotificationClient` and store it on `app_state`.

    Intended to be called just once, when the server starts up.
    """
    publisher_notifier: PublisherNotifier = PublisherNotifier(
        change_notifier=ChangeNotifier()
    )
    _pe_publisher_notifier_accessor.set_on(app_state, publisher_notifier)

    await publisher_notifier._initialize()
