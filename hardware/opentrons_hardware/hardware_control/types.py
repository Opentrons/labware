"""Types and definitions for hardware bindings."""
from typing import Mapping, TypeVar, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from opentrons_hardware.firmware_bindings.constants import NodeId, MoveAckId

MapPayload = TypeVar("MapPayload")

NodeMap = Mapping[NodeId, MapPayload]

NodeList = List[NodeId]

NodeDict = Dict[NodeId, MapPayload]


@dataclass
class PCBARevision:
    """The electrical revision of a PCBA."""

    main: Optional[str]
    #: A combination of primary and secondary used for looking up firmware
    tertiary: Optional[str] = None
    #: An often-not-present tertiary


class MoveCompleteAck(Enum):
    """Move Complete Ack."""

    complete_without_condition = MoveAckId.complete_without_condition.value
    stopped_by_condition = MoveAckId.stopped_by_condition.value
    timeout = MoveAckId.timeout.value
    position_error = MoveAckId.position_error.value


@dataclass
class MotorPositionStatus:
    """Motor Position Status information."""

    motor_position: float
    encoder_position: float
    motor_ok: bool
    encoder_ok: bool


@dataclass
class MoveStatus:
    """Move status: same as MotorPositionStatus, but with an extra move_ack field."""

    position_status: MotorPositionStatus
    move_ack: MoveCompleteAck

    def get_positions_only(self) -> Tuple[float, float]:
        return (
            self.position_status.motor_position,
            self.position_status.encoder_position,
        )
