"""Can messenger class."""
from __future__ import annotations
import asyncio
from inspect import Traceback
from typing import (
    Optional,
    Callable,
    Tuple,
    Dict,
    Union,
    List,
    cast,
    TypeVar,
    Type,
    Set,
)

import logging

from opentrons_shared_data.errors.exceptions import (
    CanbusCommunicationError,
    EnumeratedError,
    PythonException,
)
from opentrons_hardware.drivers.can_bus.abstract_driver import AbstractCanDriver
from opentrons_hardware.firmware_bindings.arbitration_id import (
    ArbitrationId,
    ArbitrationIdParts,
)
from opentrons_hardware.firmware_bindings.message import CanMessage
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    MessageId,
    FunctionCode,
    ErrorCode,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    Acknowledgement,
    ErrorMessage,
)
from opentrons_hardware.firmware_bindings.messages.messages import (
    MessageDefinition,
    get_definition,
)
from opentrons_hardware.firmware_bindings.utils import BinarySerializableException

log = logging.getLogger(__name__)


MessageListenerCallback = Callable[[MessageDefinition, ArbitrationId], None]
"""Incoming message listener."""


MessageListenerCallbackFilter = Callable[[ArbitrationId], bool]
"""A function used to filter incoming messages. Returns true to accept message."""


_AckResponses = Union[ErrorMessage, Acknowledgement]
_AckPacket = Tuple[ArbitrationId, _AckResponses]
_Acks = List[_AckPacket]
_AckIdFilter = [MessageId.acknowledgement, MessageId.error_message]

_Basic_Nodes: List[NodeId] = [NodeId.gantry_x, NodeId.gantry_y, NodeId.head]
_Gripper_SubNodes: List[NodeId] = [NodeId.gripper_g, NodeId.gripper_z]
_Head_SubNodes: List[NodeId] = [NodeId.head_l, NodeId.head_r]


class AcknowledgeListener:
    """Helper class for CanMessenger to listen for Acks back from commands."""

    def __init__(
        self,
        can_messenger: CanMessenger,
        node_id: NodeId,
        message: MessageDefinition,
        timeout: float,
        expected_nodes: List[NodeId],
        exclusive: bool = False,
    ) -> None:
        """Build this listener class and ready the queue."""
        self._can_messenger = can_messenger
        self._node_id = node_id
        self._message = message
        self._timeout = timeout
        self._event = asyncio.Event()
        self._exclusive = exclusive
        # NOTE: 96-channel replies with the same nodes 3 times to broadcast,
        # right now we consider the responded with the first reply we receive
        self._expected_nodes = expected_nodes
        self._expected_gripper_subnodes = (
            _Gripper_SubNodes.copy() if NodeId.gripper in expected_nodes else []
        )
        self._expected_head_subnodes = (
            _Head_SubNodes.copy() if NodeId.head in expected_nodes else []
        )
        self._ack_queue: asyncio.Queue[_AckPacket] = asyncio.Queue()

    def __call__(
        self, message: MessageDefinition, arbitration_id: ArbitrationId
    ) -> None:
        """Called by can messenger when a message arrives."""
        if isinstance(message, Acknowledgement) or isinstance(message, ErrorMessage):
            self.handle_ack(message, arbitration_id)

    def _remove_response_subnodes(self, node: NodeId) -> None:
        if node in self._expected_gripper_subnodes:
            self._expected_gripper_subnodes.remove(node)
            # delete gripper node if all subnodes responded
            if len(self._expected_gripper_subnodes) == 0:
                self._expected_nodes.remove(NodeId.gripper)

        elif node in self._expected_head_subnodes:
            self._expected_head_subnodes.remove(node)
            # delete head node if all subnodes responded
            if len(self._expected_head_subnodes) == 0:
                self._expected_nodes.remove(NodeId.head)

    def _remove_response_node(self, node: NodeId) -> None:
        # this is a bit of a hack, some nodes don't responde with the same originating nodes
        # and respond with their subnodes instead
        if node in self._expected_nodes:
            self._expected_nodes.remove(node)
        else:
            self._remove_response_subnodes(node)

    def handle_ack(self, message: _AckResponses, arbitration_id: ArbitrationId) -> None:
        """Add the ack to the queue if it matches the message_index of the sent message."""
        if message.payload.message_index == self._message.payload.message_index:
            self._remove_response_node(arbitration_id.parts.originating_node_id)
            self._ack_queue.put_nowait((arbitration_id, message))
        # If we've recieved all responses exit the listener
        if len(self._expected_nodes) == 0:
            self._event.set()

    async def send_and_verify_recieved(self) -> ErrorCode:
        """Send the message and wait for an Ack."""
        try:
            self._can_messenger.add_listener(
                self,
                lambda arbitration_id: bool(
                    arbitration_id.parts.message_id in _AckIdFilter
                ),
            )
            self._event.clear()
            if self._exclusive:
                await self._can_messenger.send_exclusive(self._node_id, self._message)
            else:
                await self._can_messenger.send(self._node_id, self._message)
            await asyncio.wait_for(
                self._event.wait(),
                max(1.0, self._timeout),
            )
        except asyncio.TimeoutError:
            log.error(
                f"Message did not receive ack for message index {self._message.payload.message_index} Missing node(s) {self._expected_nodes}"
            )
            return ErrorCode.timeout
        finally:
            self._can_messenger.remove_listener(self)

        while not self._ack_queue.empty():
            arb_id, message = self._ack_queue.get_nowait()
            if arb_id.parts.message_id == MessageId.error_message:
                err_msg = cast(ErrorMessage, message)
                return ErrorCode(err_msg.payload.error_code.value)
        return ErrorCode.ok


E = TypeVar("E", bound=BaseException)


class CanMessenger:
    """High level can messaging class wrapping a CanDriver.

    Should only be used when it is the only thing talking on the bus.

    The background task can be controlled with start/stop methods.

    To receive message notifications add a listener using add_listener
    """

    def __init__(self, driver: AbstractCanDriver) -> None:
        """Constructor.

        Args:
            driver: The can bus driver to use.
        """
        self._drive = driver
        self._listeners: Dict[
            MessageListenerCallback,
            Tuple[MessageListenerCallback, Optional[MessageListenerCallbackFilter]],
        ] = {}
        self._task: Optional[asyncio.Task[None]] = None
        self._access_lock = asyncio.Lock()
        self._exclusive_condvar = asyncio.Condition(self._access_lock)
        self._nonexclusive_condvar = asyncio.Condition(self._access_lock)
        self._held_exclusive = False
        self._nonexclusive_access_count = 0
        self._exclusive_lock = asyncio.Lock()
        self._known_nodes: Set[NodeId] = set(_Basic_Nodes.copy())

    def update_known_nodes(self, nodes: Set[NodeId]) -> None:
        """Update present nodes."""
        self._known_nodes = nodes
        log.debug(f"Known nodes have been updated: {self._known_nodes}")

    async def send(self, node_id: NodeId, message: MessageDefinition) -> None:
        """Send a message."""
        async with self._exclusive_lock:
            return await self._send(node_id, message)

    async def send_exclusive(self, node_id: NodeId, message: MessageDefinition) -> None:
        """Send while the exclusive ock is held."""
        return await self._send(node_id, message)

    async def _send(self, node_id: NodeId, message: MessageDefinition) -> None:
        func = (
            FunctionCode.error
            if message.message_id == MessageId.error_message
            else FunctionCode.network_management
        )

        arbitration_id = ArbitrationId(
            parts=ArbitrationIdParts(
                message_id=message.message_id,
                node_id=node_id,
                function_code=func,
                originating_node_id=NodeId.host,
            )
        )
        data = message.payload.serialize()
        log.debug(
            f"Sending -->\n\tarbitration_id: {arbitration_id},\n\t"
            f"payload: {message.payload}"
        )
        try:
            await self._drive.send(
                message=CanMessage(arbitration_id=arbitration_id, data=data)
            )
        except EnumeratedError:
            raise
        except Exception as exc:
            log.exception("Exception in CAN send")
            raise CanbusCommunicationError(
                message="Exception in canbus.send", wrapping=[PythonException(exc)]
            )

    async def ensure_send_exclusive(
        self,
        node_id: NodeId,
        message: MessageDefinition,
        timeout: float = 3,
        expected_nodes: List[NodeId] = [],
    ) -> ErrorCode:
        """Send a message and wait for the ack while holding the exclusive lock."""
        return await self._ensure_send(
            node_id, message, timeout, expected_nodes, exclusive=True
        )

    async def ensure_send(
        self,
        node_id: NodeId,
        message: MessageDefinition,
        timeout: float = 3,
        expected_nodes: List[NodeId] = [],
    ) -> ErrorCode:
        """Send a message and wait for the ack."""
        # Note: we don't take the lock in this method because the acknowledge listener
        # does it
        return await self._ensure_send(node_id, message, timeout, expected_nodes)

    async def _ensure_send(
        self,
        node_id: NodeId,
        message: MessageDefinition,
        timeout: float = 3,
        expected_nodes: List[NodeId] = [],
        exclusive: bool = False,
    ) -> ErrorCode:
        if len(expected_nodes) == 0:
            if node_id == NodeId.broadcast:
                if not expected_nodes:
                    expected_nodes = list(self._known_nodes)
            else:
                expected_nodes = [node_id]
            log.warning(
                f"Expected Nodes should have been specified, Setting expected nodes to {expected_nodes}"
            )

        listener = AcknowledgeListener(
            can_messenger=self,
            node_id=node_id,
            message=message,
            timeout=timeout,
            expected_nodes=expected_nodes,
            exclusive=exclusive,
        )
        try:
            return await listener.send_and_verify_recieved()
        except EnumeratedError:
            raise
        except Exception as exc:
            log.exception("Exception in CAN ensure_send")
            raise CanbusCommunicationError(
                message="Exception in CAN ensure_send", wrapping=[PythonException(exc)]
            )

    async def __aenter__(self: CanMessenger) -> CanMessenger:
        """Start messenger."""
        self.start()
        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[E]],
        exc_val: Optional[E],
        exc_tb: Optional[Traceback],
    ) -> None:
        """Stop messenger."""
        await self.stop()
        if exc_val:
            if isinstance(exc_val, EnumeratedError):
                raise exc_val
            # Don't want a specific error here because this wraps other code
            raise PythonException(exc_val)

    def start(self) -> None:
        """Start the reader task."""
        if self._task:
            log.warning("can messenger task already running.")
            return
        self._task = asyncio.get_event_loop().create_task(self._read_task_shield())

    async def stop(self) -> None:
        """Stop the reader task."""
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                log.info("CAN messenger task cancelled.")
        else:
            log.warning("task not running.")

    def add_listener(
        self,
        listener: MessageListenerCallback,
        filter: Optional[MessageListenerCallbackFilter] = None,
    ) -> None:
        """Add a message listener."""
        self._listeners[listener] = listener, filter

    def remove_listener(self, listener: MessageListenerCallback) -> None:
        """Remove a message listener."""
        if listener in self._listeners:
            self._listeners.pop(listener)

    async def _read_task_shield(self) -> None:
        while True:
            try:
                await self._read_task()
            except (asyncio.CancelledError, StopAsyncIteration):
                return
            except BaseException:
                log.exception("Exception in read")
                continue

    async def _read_task(self) -> None:
        """Read task."""
        async for message in self._drive:
            message_definition = get_definition(
                MessageId(message.arbitration_id.parts.message_id)
            )
            if message_definition:
                try:
                    build = message_definition.payload_type.build(message.data)
                    log.debug(
                        f"Received <--\n\tarbitration_id: {message.arbitration_id},\n\t"
                        f"payload: {build}"
                    )
                    handled = False
                    for listener, filter in self._listeners.values():
                        if filter and not filter(message.arbitration_id):
                            continue
                        listener(message_definition(payload=build), message.arbitration_id)  # type: ignore[arg-type]
                        handled = True
                    if not handled:
                        if (
                            message.arbitration_id.parts.message_id
                            == MessageId.error_message
                        ):
                            log.error(f"Asynchronous error message ignored: {message}")
                        else:
                            log.info(f"Message ignored: {message}")
                except BinarySerializableException:
                    log.exception(f"Failed to build from {message}")
            else:
                log.error(f"Message {message} is not recognized.")

    @property
    def exclusive_writer(self) -> asyncio.Lock:
        """A caller may acquire this context manager to temporarily gain exclusive control of the bus.

        When this context manager is acquired, only the acquirer may send data to the bus. This is
        guaranteed by
        - Waiting for any other bus callers, exclusive or non-exclusive, to finish their business before
          yielding control back to the caller
        - Preventing any other callers, exclusive or non-exclusive, from starting a send until the
          context manager is released

        The context manager resolves to an object that has a read and write interface to use only while
        holding the lock.
        """
        log.info("probably about to do exclusive")
        return self._exclusive_lock


class WaitableCallback:
    """MessageListenerCallback that can be awaited or iterated."""

    def __init__(
        self,
        messenger: CanMessenger,
        filter: Optional[MessageListenerCallbackFilter] = None,
    ) -> None:
        """Constructor.

        Args:
            messenger: Messenger to listen on.
            filter: Optional message filtering function
        """
        self._messenger = messenger
        self._filter = filter
        self._queue: asyncio.Queue[
            Tuple[MessageDefinition, ArbitrationId]
        ] = asyncio.Queue()

    def __call__(
        self, message: MessageDefinition, arbitration_id: ArbitrationId
    ) -> None:
        """Callback."""
        self._queue.put_nowait((message, arbitration_id))

    def __enter__(self) -> WaitableCallback:
        """Enter context manager."""
        self._messenger.add_listener(self, self._filter)
        return self

    def __exit__(
        self, exc_type: type, exc_val: BaseException, exc_tb: Traceback
    ) -> None:
        """Exit context manager."""
        self._messenger.remove_listener(self)

    def __aiter__(self) -> WaitableCallback:
        """Enter iterator."""
        return self

    async def __anext__(self) -> Tuple[MessageDefinition, ArbitrationId]:
        """Async next."""
        return await self.read()

    async def read(self) -> Tuple[MessageDefinition, ArbitrationId]:
        """Read next message."""
        return await self._queue.get()


class MultipleMessagesWaitableCallback(WaitableCallback):
    """MessageListenerCallback that can be awaited or iterated."""

    # TODO we should refactor the rest of the code that relies on
    # waitable callback to specify how many messages it would like to wait
    # for. Otherwise, the code will timeout unless you return directly
    # from an async for loop.
    def __init__(
        self,
        messenger: CanMessenger,
        filter: Optional[MessageListenerCallbackFilter] = None,
        number_of_messages: Optional[int] = None,
    ) -> None:
        """Constructor.

        Args:
            messenger: Messenger to listen on.
            filter: Optional message filtering function
            number_of_messages: Optional number of messages to wait for or
            default to 1.
        """
        super().__init__(messenger, filter)
        self._number_of_messages: int = number_of_messages or 1

    async def __anext__(self) -> Tuple[MessageDefinition, ArbitrationId]:
        """Async next."""
        if self._number_of_messages < 1:
            raise StopAsyncIteration
        self._number_of_messages -= 1
        return await self.read()
