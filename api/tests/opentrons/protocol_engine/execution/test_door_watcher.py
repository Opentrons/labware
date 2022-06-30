"""Tests for door_watcher."""


from typing import cast

import pytest
from anyio import to_thread
from decoy import Decoy, matchers

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import (
    DoorStateNotification,
    DoorState,
    HardwareEventHandler,
)

from opentrons.protocol_engine.actions import ActionDispatcher, DoorChangeAction
from opentrons.protocol_engine.execution.door_watcher import (
    DoorWatcher,
)


@pytest.fixture
def hardware_control_api(
    decoy: Decoy,
) -> HardwareControlAPI:
    """Return a mock in the shape of a HardwareControlAPI."""
    return decoy.mock(cls=HardwareControlAPI)


@pytest.fixture
def action_dispatcher(decoy: Decoy) -> ActionDispatcher:
    """Return a mock in the shape of an ActionDispatcher."""
    return decoy.mock(cls=ActionDispatcher)


@pytest.fixture
async def subject(
    hardware_control_api: HardwareControlAPI, action_dispatcher: ActionDispatcher
) -> DoorWatcher:
    """Return a DoorWatcher with mocked dependencies.

    Async because DoorWatcher's initializer requires a running event loop.
    """
    return DoorWatcher(
        hardware_api=hardware_control_api, action_dispatcher=action_dispatcher
    )


async def test_event_forwarding(
    decoy: Decoy,
    subject: DoorWatcher,
    hardware_control_api: HardwareControlAPI,
    action_dispatcher: ActionDispatcher,
) -> None:
    """It should forward events that come from a different thread."""
    handler_captor = matchers.Captor()
    unsubscribe_callback = decoy.mock()
    decoy.when(hardware_control_api.register_callback(handler_captor)).then_return(
        unsubscribe_callback
    )

    subject.start()

    captured_handler = cast(HardwareEventHandler, handler_captor.value)

    input_event = DoorStateNotification(new_state=DoorState.OPEN)
    expected_action_to_forward = DoorChangeAction(input_event)

    await to_thread.run_sync(captured_handler, input_event)
    decoy.verify(action_dispatcher.dispatch(expected_action_to_forward))


async def test_one_subscribe_one_unsubscribe(
    decoy: Decoy,
    hardware_control_api: HardwareControlAPI,
    subject: DoorWatcher,
) -> None:
    """Multiple start()s and stop()s should be collapsed."""
    unsubscribe = decoy.mock()
    wrong_unsubscribe = decoy.mock()

    decoy.when(hardware_control_api.register_callback(matchers.Anything())).then_return(
        unsubscribe, wrong_unsubscribe
    )

    subject.start()
    subject.start()
    subject.stop_soon()
    subject.stop_soon()

    decoy.verify(unsubscribe(), times=1)
    decoy.verify(wrong_unsubscribe(), times=0)
