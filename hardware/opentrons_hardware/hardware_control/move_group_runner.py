"""Class that schedules motion on can bus."""
import asyncio
from collections import defaultdict
import logging
from typing import List, Set, Tuple, Iterator, Union, Optional
import numpy as np
import time

from opentrons_shared_data.errors.exceptions import (
    GeneralError,
    MoveConditionNotMetError,
    EnumeratedError,
    EStopActivatedError,
    MotionFailedError,
    PythonException,
    MotorDriverError,
)

from opentrons_hardware.firmware_bindings import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    ErrorCode,
    ErrorSeverity,
    GearMotorId,
    MoveAckId,
    MotorDriverErrorCode,
)
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.messages import MessageDefinition
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    ClearAllMoveGroupsRequest,
    AddLinearMoveRequest,
    MoveCompleted,
    ExecuteMoveGroupRequest,
    HomeRequest,
    GripperGripRequest,
    GripperHomeRequest,
    AddBrushedLinearMoveRequest,
    TipActionRequest,
    TipActionResponse,
    ErrorMessage,
    StopRequest,
    ReadMotorDriverErrorStatusResponse,
    AddSensorLinearMoveRequest,
)
from opentrons_hardware.firmware_bindings.messages.payloads import (
    AddLinearMoveRequestPayload,
    ExecuteMoveGroupRequestPayload,
    HomeRequestPayload,
    GripperMoveRequestPayload,
    TipActionRequestPayload,
    EmptyPayload,
    AddSensorLinearMoveBasePayload,
)
from .constants import (
    interrupts_per_sec,
    tip_interrupts_per_sec,
    brushed_motor_interrupts_per_sec,
)
from opentrons_hardware.errors import raise_from_error_message
from opentrons_hardware.hardware_control.motion import (
    MoveGroups,
    MoveGroupSingleAxisStep,
    MoveGroupSingleGripperStep,
    MoveGroupTipActionStep,
    MoveType,
    SingleMoveStep,
)
from opentrons_hardware.firmware_bindings.utils import (
    UInt8Field,
    UInt32Field,
    Int32Field,
)
from opentrons_hardware.firmware_bindings.messages.fields import (
    PipetteTipActionTypeField,
    MoveStopConditionField,
    SensorIdField,
    SensorTypeField,
)
from opentrons_hardware.hardware_control.motion import MoveStopCondition
from opentrons_hardware.hardware_control.motor_position_status import (
    extract_motor_status_info,
)

from .types import NodeDict, MotorPositionStatus

log = logging.getLogger(__name__)

_AcceptableMoves = Union[MoveCompleted, TipActionResponse]
_CompletionPacket = Tuple[ArbitrationId, _AcceptableMoves]
_Completions = List[_CompletionPacket]


class MoveGroupRunner:
    """A move command scheduler."""

    def __init__(
        self,
        move_groups: MoveGroups,
        start_at_index: int = 0,
        ignore_stalls: bool = False,
    ) -> None:
        """Constructor.

        Args:
            move_groups: The move groups to run.
            start_at_index: The index the MoveGroupManager will start at
            ignore_stalls: Depends on the disableStallDetection feature flag
        """
        self._move_groups = move_groups
        self._start_at_index = start_at_index
        self._ignore_stalls = ignore_stalls
        self._is_prepped: bool = False

    @staticmethod
    def _has_moves(move_groups: MoveGroups) -> bool:
        for move_group in move_groups:
            for move in move_group:
                for node, step in move.items():
                    return True
        return False

    async def prep(self, can_messenger: CanMessenger) -> None:
        """Prepare the move group. The first thing that happens during run().

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        if not self._has_moves(self._move_groups):
            log.debug("No moves. Nothing to do.")
            return
        await self._clear_groups(can_messenger)
        await self._send_groups(can_messenger)
        self._is_prepped = True

    async def execute(
        self, can_messenger: CanMessenger
    ) -> NodeDict[MotorPositionStatus]:
        """Execute a pre-prepared move group. The second thing that run() does.

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        if not self._has_moves(self._move_groups):
            log.debug("No moves. Nothing to do.")
            return {}
        if not self._is_prepped:
            raise GeneralError(
                message="A move group must be prepped before it can be executed."
            )
        move_completion_data = await self._move(can_messenger, self._start_at_index)
        return self._accumulate_move_completions(move_completion_data)

    async def run(self, can_messenger: CanMessenger) -> NodeDict[MotorPositionStatus]:
        """Run the move group.

        Args:
            can_messenger: a can messenger

        Returns:
            The current position after the move for all the axes that
            acknowledged completing moves.

        This function first prepares all connected devices to move (by sending
        all the data for the moves over) and then executes the move with a
        single call.

        prep() and execute() can be used to replace a single call to run() to
        ensure tighter timing, if you want something else to start as soon as
        possible to the actual execution of the move.
        """
        await self.prep(can_messenger)
        return await self.execute(can_messenger)

    @staticmethod
    def _accumulate_move_completions(
        completions: _Completions,
    ) -> NodeDict[MotorPositionStatus]:
        position: NodeDict[
            List[Tuple[Tuple[int, int], MotorPositionStatus]]
        ] = defaultdict(list)
        gear_motor_position: NodeDict[
            List[Tuple[Tuple[int, int], MotorPositionStatus]]
        ] = defaultdict(list)
        for arbid, completion in completions:
            move_info = (
                (
                    completion.payload.group_id.value,
                    completion.payload.seq_id.value,
                ),
                extract_motor_status_info(completion),
            )
            if isinstance(completion, TipActionResponse):
                # if any completions are TipActionResponses, separate them from the 'positions'
                # dict so the left pipette's position doesn't get overwritten
                gear_motor_position[NodeId(arbid.parts.originating_node_id)].append(
                    move_info
                )
            else:
                position[NodeId(arbid.parts.originating_node_id)].append(move_info)
        # for each node, pull the position from the completion with the largest
        # combination of group id and sequence id
        if any(gear_motor_position):
            return {
                node: next(
                    reversed(
                        sorted(
                            poslist, key=lambda position_element: position_element[0]
                        )
                    )
                )[1]
                for node, poslist in gear_motor_position.items()
            }
        return {
            node: next(
                reversed(
                    sorted(poslist, key=lambda position_element: position_element[0])
                )
            )[1]
            for node, poslist in position.items()
        }

    async def _clear_groups(self, can_messenger: CanMessenger) -> None:
        """Send commands to clear the message groups.

        Args:
            can_messenger: a can messenger
        """
        error = await can_messenger.ensure_send(
            node_id=NodeId.broadcast,
            message=ClearAllMoveGroupsRequest(payload=EmptyPayload()),
            expected_nodes=list(self.all_nodes()),
        )
        if error != ErrorCode.ok:
            log.warning("Clear move group failed")

    def all_nodes(self) -> Set[NodeId]:
        """Get all of the nodes in the move group runner's move groups."""
        node_set: Set[NodeId] = set()
        for group in self._move_groups:
            for sequence in group:
                for node in sequence.keys():
                    node_set.add(node)
        return node_set

    def all_moving_nodes(self) -> Set[NodeId]:
        """Get all of the moving nodes in the move group runner's move groups."""
        node_set: Set[NodeId] = set()
        for group in self._move_groups:
            for sequence in group:
                for node, node_step in sequence.items():
                    if node_step.is_moving_step():
                        node_set.add(node)
        return node_set

    async def _send_groups(self, can_messenger: CanMessenger) -> None:
        """Send commands to set up the message groups."""
        for group_i, group in enumerate(self._move_groups):
            for seq_i, sequence in enumerate(group):
                for node, step in sequence.items():
                    await can_messenger.send(
                        node_id=node,
                        message=self._get_message_type(
                            step, group_i + self._start_at_index, seq_i
                        ),
                    )

    def _convert_velocity(
        self, velocity: Union[float, np.float64], interrupts: int
    ) -> Int32Field:
        return Int32Field(int((velocity / interrupts) * (2**31)))

    def _get_message_type(
        self, step: SingleMoveStep, group: int, seq: int
    ) -> MessageDefinition:
        """Return the correct payload type."""
        if isinstance(step, MoveGroupSingleAxisStep):
            return self._get_stepper_motor_message(step, group, seq)
        elif isinstance(step, MoveGroupTipActionStep):
            return self._get_tip_action_motor_message(step, group, seq)
        else:
            return self._get_brushed_motor_message(step, group, seq)

    def _get_brushed_motor_message(
        self, step: MoveGroupSingleGripperStep, group: int, seq: int
    ) -> MessageDefinition:
        payload = GripperMoveRequestPayload(
            group_id=UInt8Field(group),
            seq_id=UInt8Field(seq),
            duration=UInt32Field(
                int(step.duration_sec * brushed_motor_interrupts_per_sec)
            ),
            duty_cycle=UInt32Field(int(step.pwm_duty_cycle)),
            encoder_position_um=Int32Field(int(step.encoder_position_um)),
            stay_engaged=UInt8Field(int(step.stay_engaged)),
        )
        if step.move_type == MoveType.home:
            return GripperHomeRequest(payload=payload)
        elif step.move_type == MoveType.grip:
            return GripperGripRequest(payload=payload)
        else:
            return AddBrushedLinearMoveRequest(payload=payload)

    def _get_stepper_motor_message(
        self, step: MoveGroupSingleAxisStep, group: int, seq: int
    ) -> MessageDefinition:
        if step.move_type == MoveType.home:
            home_payload = HomeRequestPayload(
                group_id=UInt8Field(group),
                seq_id=UInt8Field(seq),
                duration=UInt32Field(int(step.duration_sec * interrupts_per_sec)),
                velocity_mm=self._convert_velocity(
                    step.velocity_mm_sec, interrupts_per_sec
                ),
            )
            return HomeRequest(payload=home_payload)
        elif step.move_type == MoveType.sensor:
            # stop_condition = step.stop_condition.value
            assert step.sensor_type is not None
            assert step.sensor_id is not None
            assert step.sensor_binding_flags is not None
            stop_condition = MoveStopCondition.sync_line
            sensor_move_payload = AddSensorLinearMoveBasePayload(
                request_stop_condition=MoveStopConditionField(stop_condition),
                group_id=UInt8Field(group),
                seq_id=UInt8Field(seq),
                duration=UInt32Field(int(step.duration_sec * interrupts_per_sec)),
                acceleration_um=Int32Field(
                    int(
                        (
                            step.acceleration_mm_sec_sq
                            * 1000.0
                            / interrupts_per_sec
                            / interrupts_per_sec
                        )
                        * (2**31)
                    )
                ),
                velocity_mm=Int32Field(
                    int((step.velocity_mm_sec / interrupts_per_sec) * (2**31))
                ),
                sensor_type=SensorTypeField(step.sensor_type),
                sensor_id=SensorIdField(step.sensor_id),
                sensor_binding_flags=UInt8Field(step.sensor_binding_flags),
            )
            return AddSensorLinearMoveRequest(payload=sensor_move_payload)
        else:
            stop_cond = step.stop_condition.value
            if self._ignore_stalls:
                stop_cond += MoveStopCondition.ignore_stalls.value
            linear_payload = AddLinearMoveRequestPayload(
                request_stop_condition=MoveStopConditionField(stop_cond),
                group_id=UInt8Field(group),
                seq_id=UInt8Field(seq),
                duration=UInt32Field(int(step.duration_sec * interrupts_per_sec)),
                acceleration_um=Int32Field(
                    int(
                        (
                            step.acceleration_mm_sec_sq
                            * 1000.0
                            / interrupts_per_sec
                            / interrupts_per_sec
                        )
                        * (2**31)
                    )
                ),
                velocity_mm=Int32Field(
                    int((step.velocity_mm_sec / interrupts_per_sec) * (2**31))
                ),
            )
            return AddLinearMoveRequest(payload=linear_payload)

    def _get_tip_action_motor_message(
        self, step: MoveGroupTipActionStep, group: int, seq: int
    ) -> TipActionRequest:
        tip_action_payload = TipActionRequestPayload(
            group_id=UInt8Field(group),
            seq_id=UInt8Field(seq),
            duration=UInt32Field(int(step.duration_sec * tip_interrupts_per_sec)),
            velocity=self._convert_velocity(
                step.velocity_mm_sec, tip_interrupts_per_sec
            ),
            action=PipetteTipActionTypeField(step.action),
            request_stop_condition=MoveStopConditionField(step.stop_condition),
            acceleration=Int32Field(
                int(
                    (
                        step.acceleration_mm_sec_sq
                        * 1000.0
                        / tip_interrupts_per_sec
                        / tip_interrupts_per_sec
                    )
                    * (2**31)
                )
            ),
        )
        return TipActionRequest(payload=tip_action_payload)

    async def _move(
        self, can_messenger: CanMessenger, start_at_index: int
    ) -> _Completions:
        """Run all the move groups."""
        scheduler = MoveScheduler(self._move_groups, start_at_index)
        try:
            can_messenger.add_listener(scheduler)
            completions = await scheduler.run(can_messenger)
        finally:
            can_messenger.remove_listener(scheduler)
        return completions


class MoveScheduler:
    """A message listener that manages the sending of execute move group messages."""

    def __init__(self, move_groups: MoveGroups, start_at_index: int = 0) -> None:
        """Constructor."""
        # For each move group create a set identifying the node and seq id.
        self._moves: List[Set[Tuple[int, int]]] = []
        self._durations: List[float] = []
        self._stop_condition: List[List[MoveStopCondition]] = []
        self._start_at_index = start_at_index
        self._expected_tip_action_motors = []

        for move_group in move_groups:
            move_set = set()
            duration = 0.0
            stop_cond = []
            expected_motors = []
            for seq_id, move in enumerate(move_group):
                movesteps = list(move.values())
                move_set.update(set((k.value, seq_id) for k in move.keys()))
                duration += float(movesteps[0].duration_sec)
                if any(isinstance(g, MoveGroupTipActionStep) for g in movesteps):
                    expected_motors.append(
                        [
                            GearMotorId.left,
                            GearMotorId.right,
                        ]
                    )
                else:
                    expected_motors.append([])
                for step in move_group[seq_id]:
                    stop_cond.append(move_group[seq_id][step].stop_condition)

            self._moves.append(move_set)
            self._stop_condition.append(stop_cond)
            self._durations.append(duration)
            self._expected_tip_action_motors.append(expected_motors)
        log.debug(f"Move scheduler running for groups {move_groups}")
        self._completion_queue: asyncio.Queue[_CompletionPacket] = asyncio.Queue()
        self._event = asyncio.Event()
        self._errors: List[EnumeratedError] = []
        self._current_group: Optional[int] = None
        self._should_stop = False

    def _remove_move_group(
        self, message: _AcceptableMoves, arbitration_id: ArbitrationId
    ) -> None:
        seq_id = message.payload.seq_id.value
        group_id = message.payload.group_id.value - self._start_at_index
        node_id = arbitration_id.parts.originating_node_id
        try:
            in_group = (node_id, seq_id) in self._moves[group_id]
            self._moves[group_id].remove((node_id, seq_id))
            self._completion_queue.put_nowait((arbitration_id, message))
            log.debug(
                f"Received completion for {node_id} group {group_id} seq {seq_id}"
                f", which {'is' if in_group else 'isn''t'} in group"
            )
            if self._moves[group_id] and len(self._moves[group_id]) == 0:
                log.error(
                    f"Python bug proven if check {bool(not self._moves[group_id])} len check {len(self._moves[group_id]) == 0}"
                )
            if not self._moves[group_id]:
                log.debug(f"Move group {group_id+self._start_at_index} has completed.")
                self._event.set()
        except KeyError:
            log.warning(
                f"Got a move ack for ({node_id}, {seq_id}) which is not in this "
                "group; may have leaked from an earlier timed-out group"
            )
        except IndexError:
            # If we have two move groups running at once, we need to handle
            # moves from a group we don't own
            return

    def _handle_error(
        self, message: ErrorMessage, arbitration_id: ArbitrationId
    ) -> None:
        try:
            message = raise_from_error_message(message, arbitration_id)
        except EnumeratedError as e:
            self._errors.append(e)
        severity = message.payload.severity.value
        node_name = NodeId(arbitration_id.parts.node_id).name
        log.error(f"Error during move group from {node_name} : {message}")
        if severity == ErrorSeverity.unrecoverable:
            self._should_stop = True
            self._event.set()

    def _handle_move_completed(
        self, message: _AcceptableMoves, arbitration_id: ArbitrationId
    ) -> None:
        group_id = message.payload.group_id.value - self._start_at_index
        seq_id = message.payload.seq_id.value
        ack_id = message.payload.ack_id.value
        node_id = arbitration_id.parts.originating_node_id
        try:
            stop_cond = self._stop_condition[group_id][seq_id]
            if (
                (
                    stop_cond.value
                    & (
                        MoveStopCondition.limit_switch.value
                        | MoveStopCondition.limit_switch_backoff.value
                    )
                )
                != 0
            ) and ack_id != MoveAckId.stopped_by_condition:
                log.error(
                    f"Homing move from node {node_id} completed without meeting condition {stop_cond}"
                )
                self._errors.append(
                    MoveConditionNotMetError(
                        detail={
                            "node": NodeId(node_id).name,
                            "stop-condition": stop_cond.name,
                        }
                    )
                )
                self._should_stop = True
                self._event.set()
            if (
                stop_cond.value & MoveStopCondition.stall.value
            ) and ack_id == MoveAckId.stopped_by_condition:
                # When an axis has a stop-on-stall move and stalls, it will clear the rest of its executing moves.
                # If we wait for those moves, we'll time out.
                remaining = [elem for elem in self._moves[group_id]]
                for move_node, move_seq in remaining:
                    if node_id == move_node:
                        self._moves[group_id].remove((move_node, move_seq))
                if not self._moves[group_id]:
                    self._event.set()
        except IndexError:
            # If we have two move group runners running at once, they each
            # pick up groups they don't care about, and need to not fail.
            pass

    def _handle_motor_driver_error(
        self, message: ReadMotorDriverErrorStatusResponse, arbitration_id: ArbitrationId
    ) -> None:
        node_id = arbitration_id.parts.originating_node_id
        data = message.payload.data.value
        if data & MotorDriverErrorCode.over_temperature.value:
            log.error(f"Motor driver over-temperature error from node {node_id}")
            self._errors.append(
                MotorDriverError(
                    detail={
                        "node": NodeId(node_id).name,
                        "error": "over temperature",
                    }
                )
            )
        if data & MotorDriverErrorCode.short_circuit.value:
            log.error(f"Motor driver short circuit error from node {node_id}")
            self._errors.append(
                MotorDriverError(
                    detail={
                        "node": NodeId(node_id).name,
                        "error": "short circuit",
                    }
                )
            )
        if data & MotorDriverErrorCode.open_circuit.value:
            log.error(f"Motor driver open circuit error from node {node_id}")
            self._errors.append(
                MotorDriverError(
                    detail={
                        "node": NodeId(node_id).name,
                        "error": "open circuit",
                    }
                )
            )

    def __call__(
        self, message: MessageDefinition, arbitration_id: ArbitrationId
    ) -> None:
        """Incoming message handler."""
        if isinstance(message, MoveCompleted):
            self._remove_move_group(message, arbitration_id)
            self._handle_move_completed(message, arbitration_id)
        elif isinstance(message, TipActionResponse):
            if self._handle_tip_action_motors(message):
                self._remove_move_group(message, arbitration_id)
                self._handle_move_completed(message, arbitration_id)
        elif isinstance(message, ErrorMessage):
            self._handle_error(message, arbitration_id)
        elif isinstance(message, ReadMotorDriverErrorStatusResponse):
            self._handle_motor_driver_error(message, arbitration_id)

    def _handle_tip_action_motors(self, message: TipActionResponse) -> bool:
        gear_id = GearMotorId(message.payload.gear_motor_id.value)
        group_id = message.payload.group_id.value - self._start_at_index
        seq_id = message.payload.seq_id.value
        self._expected_tip_action_motors[group_id][seq_id].remove(gear_id)
        if len(self._expected_tip_action_motors[group_id][seq_id]) == 0:
            return True
        return False

    def _get_nodes_in_move_group(self, group_id: int) -> List[NodeId]:
        nodes = []
        for (node_id, seq_id) in self._moves[group_id - self._start_at_index]:
            if node_id not in nodes:
                nodes.append(NodeId(node_id))
        return nodes

    def _filtered_errors(self) -> List[EnumeratedError]:
        """If multiple errors occurred, filter which ones we raise.

        This function primarily handles the case when an Estop is pressed during a run.
        Multiple kinds of error messages may arise, but the only one that is important
        to raise is the message about the Estop.
        """
        for err in self._errors:
            if isinstance(err, EStopActivatedError):
                return [err]
        return self._errors

    async def _send_stop_if_necessary(
        self, can_messenger: CanMessenger, group_id: int
    ) -> None:
        if self._should_stop:
            err = await can_messenger.ensure_send(
                node_id=NodeId.broadcast,
                message=StopRequest(payload=EmptyPayload()),
                expected_nodes=self._get_nodes_in_move_group(group_id),
            )
            if err != ErrorCode.stop_requested:
                log.warning("Stop request failed")
            if self._errors:
                errors_to_show = self._filtered_errors()
                if len(errors_to_show) > 1:
                    raise MotionFailedError(
                        "Motion failed with multiple errors", wrapping=errors_to_show
                    )
                else:
                    raise errors_to_show[0]
            else:
                # This happens when the move completed without stop condition
                raise MoveConditionNotMetError(detail={"group-id": str(group_id)})
        elif self._errors:
            log.warning(
                f"Recoverable firmware errors during {group_id}: {self._errors}"
            )

    async def _run_one_group(self, group_id: int, can_messenger: CanMessenger) -> None:
        self._event.clear()

        log.debug(f"Executing move group {group_id}.")
        self._current_group = group_id - self._start_at_index
        error = await can_messenger.ensure_send(
            node_id=NodeId.broadcast,
            message=ExecuteMoveGroupRequest(
                payload=ExecuteMoveGroupRequestPayload(
                    group_id=UInt8Field(group_id),
                    # TODO (al, 2021-11-8): The triggers should be populated
                    #  with actual values.
                    start_trigger=UInt8Field(0),
                    cancel_trigger=UInt8Field(0),
                )
            ),
            expected_nodes=self._get_nodes_in_move_group(group_id),
        )
        if error != ErrorCode.ok:
            log.error(f"received error trying to execute move group: {str(error)}")

        expected_time = max(3.0, self._durations[group_id - self._start_at_index] * 1.1)
        full_timeout = max(5.0, self._durations[group_id - self._start_at_index] * 2)
        start_time = time.time()

        try:
            # The staged timeout handles some times when a move takes a liiiittle extra
            await asyncio.wait_for(
                self._event.wait(),
                full_timeout,
            )
            duration = time.time() - start_time
            await self._send_stop_if_necessary(can_messenger, group_id)

            if duration >= expected_time:
                log.warning(
                    f"Move set {str(group_id)} took longer ({duration} seconds) than expected ({expected_time} seconds)."
                )
        except asyncio.TimeoutError:
            missing_node_msg = ", ".join(
                node.name for node in self._get_nodes_in_move_group(group_id)
            )
            log.error(
                f"Move set {str(group_id)} timed out of max duration {full_timeout}. Expected time: {expected_time}. Missing: {missing_node_msg}"
            )

            raise MotionFailedError(
                message="Command timed out",
                detail={
                    "missing-nodes": missing_node_msg,
                    "full-timeout": str(full_timeout),
                    "expected-time": str(expected_time),
                    "elapsed": str(time.time() - start_time),
                },
            )
        except EnumeratedError:
            log.exception("Cancelling move group scheduler")
            raise
        except BaseException as e:
            log.exception("canceling move group scheduler")
            raise PythonException(e) from e

    async def run(self, can_messenger: CanMessenger) -> _Completions:
        """Start each move group after the prior has completed."""
        for group_id in range(
            self._start_at_index, self._start_at_index + len(self._moves)
        ):
            await self._run_one_group(group_id, can_messenger)

        def _reify_queue_iter() -> Iterator[_CompletionPacket]:
            while not self._completion_queue.empty():
                yield self._completion_queue.get_nowait()

        return list(_reify_queue_iter())
