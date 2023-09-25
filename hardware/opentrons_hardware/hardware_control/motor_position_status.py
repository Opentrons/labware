"""Utilities for gathering motor position/status for an OT3 axis."""
import asyncio
from typing import Set, Tuple, Union
import logging

from opentrons_shared_data.errors.exceptions import (
    RoboticsControlError,
    CommandTimedOutError,
)
from opentrons_hardware.drivers.can_bus.can_messenger import (
    CanMessenger,
    WaitableCallback,
    MultipleMessagesWaitableCallback,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    MotorPositionRequest,
    MotorPositionResponse,
    MoveCompleted,
    TipActionResponse,
    UpdateMotorPositionEstimationRequest,
    UpdateMotorPositionEstimationResponse,
)
from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    MessageId,
    MotorPositionFlags,
)

from .types import NodeMap, MotorPositionStatus


log = logging.getLogger(__name__)


_MotorStatusMoves = Union[MoveCompleted, TipActionResponse, MotorPositionResponse, UpdateMotorPositionEstimationResponse]


def extract_motor_status_info(msg: _MotorStatusMoves) -> MotorPositionStatus:
    return (
        float(msg.payload.current_position_um.value / 1000.0),
        float(msg.payload.encoder_position_um.value) / 1000.0,
        bool(
            msg.payload.position_flags.value
            & MotorPositionFlags.stepper_position_ok.value
        ),
        bool(
            msg.payload.position_flags.value
            & MotorPositionFlags.encoder_position_ok.value
        ),
    )


async def _parser_motor_position_response(
    reader: WaitableCallback,
) -> NodeMap[MotorPositionStatus]:
    data = {}
    async for response, arb_id in reader:
        assert isinstance(response, MotorPositionResponse)
        node = NodeId(arb_id.parts.originating_node_id)
        data.update({node: extract_motor_status_info(response)})
    return data


async def get_motor_position(
    can_messenger: CanMessenger, nodes: Set[NodeId], timeout: float = 1.0
) -> NodeMap[MotorPositionStatus]:
    """Request node to respond with motor and encoder status."""
    data: NodeMap[MotorPositionStatus] = {}

    def _listener_filter(arbitration_id: ArbitrationId) -> bool:
        return (NodeId(arbitration_id.parts.originating_node_id) in nodes) and (
            MessageId(arbitration_id.parts.message_id)
            == MotorPositionResponse.message_id
        )

    with MultipleMessagesWaitableCallback(
        can_messenger,
        _listener_filter,
        len(nodes),
    ) as reader:
        await can_messenger.send(
            node_id=NodeId.broadcast, message=MotorPositionRequest()
        )
        try:
            data = await asyncio.wait_for(
                _parser_motor_position_response(reader),
                timeout,
            )
        except asyncio.TimeoutError:
            log.warning("Motor position timed out")
    return data


async def _parser_update_motor_position_response(
    reader: WaitableCallback, expected: NodeId
) -> MotorPositionStatus:
    async for response, arb_id in reader:
        assert isinstance(response, UpdateMotorPositionEstimationResponse)
        node = NodeId(arb_id.parts.originating_node_id)
        if node == expected:
            return extract_motor_status_info(response)
    raise StopAsyncIteration


async def update_motor_position_estimation(
    can_messenger: CanMessenger, nodes: Set[NodeId], timeout: float = 1.0
) -> NodeMap[MotorPositionStatus]:
    """Updates the estimation of motor position on selected nodes.

    Request node to update motor position from its encoder and respond
    with updated motor and encoder status.
    """

    def _listener_filter(arbitration_id: ArbitrationId) -> bool:
        return (NodeId(arbitration_id.parts.originating_node_id) in nodes) and (
            MessageId(arbitration_id.parts.message_id)
            == UpdateMotorPositionEstimationResponse.message_id
        )

    data = {}

    for node in nodes:
        with WaitableCallback(can_messenger, _listener_filter) as reader:
            await can_messenger.send(
                node_id=node, message=UpdateMotorPositionEstimationRequest()
            )
            try:
                data[node] = await asyncio.wait_for(
                    _parser_update_motor_position_response(reader, node), timeout
                )
                if not data[node][2]:
                    # If the stepper_ok flag isn't set, that means the node didn't update position.
                    # This probably is because the motor is off. It's rare.
                    raise RoboticsControlError(
                        message="Failed to update motor position",
                        detail={
                            "node": node.name,
                        },
                    )
            except asyncio.TimeoutError:
                log.warning("Update motor position estimation timed out")
                raise CommandTimedOutError(
                    "Update motor position estimation timed out",
                    detail={
                        "missing-nodes": ", ".join(
                            node.name for node in set(nodes).difference(set(data))
                        )
                    },
                )

    return data
