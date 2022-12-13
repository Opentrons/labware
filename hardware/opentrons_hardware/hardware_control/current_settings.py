"""Utilities for updating the current settings on the OT3."""
from typing import Tuple
import logging
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.messages import payloads
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    WriteMotorCurrentRequest,
)
from opentrons_hardware.firmware_bindings.constants import ErrorCode
from opentrons_hardware.firmware_bindings.utils import UInt32Field
from .types import NodeMap


CompleteCurrentSettings = NodeMap[Tuple[float, float]]
PartialCurrentSettings = NodeMap[float]

log = logging.getLogger(__name__)


async def set_currents(
    can_messenger: CanMessenger,
    current_settings: CompleteCurrentSettings,
) -> None:
    """Set hold current and run current for each node."""
    for node, currents in current_settings.items():
        error = await can_messenger.ensure_send(
            node_id=node,
            message=WriteMotorCurrentRequest(
                payload=payloads.MotorCurrentPayload(
                    hold_current=UInt32Field(int(currents[0] * (2**16))),
                    run_current=UInt32Field(int(currents[1] * (2**16))),
                )
            ),
            expected_nodes=[node],
        )
        if error != ErrorCode.ok:
            log.error(
                f"received error {str(error)} trying to set currents for {str(node)}"
            )


async def set_run_current(
    can_messenger: CanMessenger, current_settings: PartialCurrentSettings
) -> None:
    """Set only the run current for each node."""
    for node, current in current_settings.items():
        error = await can_messenger.ensure_send(
            node_id=node,
            message=WriteMotorCurrentRequest(
                payload=payloads.MotorCurrentPayload(
                    hold_current=UInt32Field(0),
                    run_current=UInt32Field(int(current * (2**16))),
                )
            ),
            expected_nodes=[node],
        )
        if error != ErrorCode.ok:
            log.error(
                f"recieved error {str(error)} trying to set run current for {str(node)}"
            )


async def set_hold_current(
    can_messenger: CanMessenger, current_settings: PartialCurrentSettings
) -> None:
    """Set only the hold current for each node."""
    for node, current in current_settings.items():
        error = await can_messenger.ensure_send(
            node_id=node,
            message=WriteMotorCurrentRequest(
                payload=payloads.MotorCurrentPayload(
                    hold_current=UInt32Field(int(current * (2**16))),
                    run_current=UInt32Field(0),
                )
            ),
            expected_nodes=[node],
        )
        if error != ErrorCode.ok:
            log.error(
                f"recieved error {str(error)} trying to set run current for {str(node)}"
            )
