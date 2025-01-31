"""Test the tool-sensor coordination code."""
import logging
from mock import patch, AsyncMock, call
import pytest
from contextlib import asynccontextmanager
from typing import Iterator, List, Tuple, AsyncIterator, Any, Dict, Callable
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    ExecuteMoveGroupRequest,
    MoveCompleted,
    ReadFromSensorResponse,
    Acknowledgement,
    BindSensorOutputRequest,
)
from opentrons_hardware.firmware_bindings.messages import MessageDefinition
from opentrons_hardware.firmware_bindings.messages.payloads import (
    EmptyPayload,
    MoveCompletedPayload,
    ReadFromSensorResponsePayload,
    BindSensorOutputRequestPayload,
)
from opentrons_hardware.firmware_bindings.utils import (
    UInt8Field,
    UInt32Field,
    Int32Field,
)
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.firmware_bindings.messages.fields import (
    SensorIdField,
    SensorTypeField,
    MotorPositionFlagsField,
    SensorOutputBindingField,
)


from tests.conftest import CanLoopback

from opentrons_hardware.hardware_control.tool_sensors import (
    capacitive_probe,
    capacitive_pass,
    liquid_probe,
    check_overpressure,
    InstrumentProbeTarget,
    PipetteProbeTarget,
)
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    SensorId,
    SensorType,
    SensorThresholdMode,
    SensorOutputBinding,
)
from opentrons_hardware.sensors.scheduler import SensorScheduler
from opentrons_hardware.sensors.sensor_driver import SensorDriver
from opentrons_hardware.sensors.types import SensorDataType
from opentrons_hardware.sensors.sensor_types import SensorInformation
from opentrons_hardware.sensors.utils import SensorThresholdInformation


@pytest.fixture
def mock_sensor_threshold() -> Iterator[AsyncMock]:
    """Mock setting of sensor thresholds."""
    with patch(
        "opentrons_hardware.sensors.scheduler.SensorScheduler.send_threshold",
        AsyncMock(spec=SensorScheduler.send_threshold),
    ) as mock_threshold:

        async def echo_value(
            info: SensorThresholdInformation, messenger: CanMessenger
        ) -> SensorDataType:
            if info.mode == SensorThresholdMode.auto_baseline:
                return SensorDataType.build(11, info.sensor.sensor_type)
            return info.data

        mock_threshold.side_effect = echo_value
        yield mock_threshold


@pytest.fixture
def mock_bind_output() -> Iterator[AsyncMock]:
    """Mock sensor output binding."""
    mock_bind = AsyncMock(spec=SensorDriver.bind_output)

    @asynccontextmanager
    async def _fake_bind(*args: Any, **kwargs: Any) -> AsyncIterator[None]:
        await mock_bind(*args, **kwargs)
        yield

    with patch(
        "opentrons_hardware.sensors.sensor_driver.SensorDriver.bind_output",
        _fake_bind,
    ):
        yield mock_bind


@pytest.fixture
def mock_bind_sync() -> Iterator[AsyncMock]:
    """Mock sensor output binding."""
    mock_bind = AsyncMock(spec=SensorScheduler.bind_sync)

    @asynccontextmanager
    async def _fake_bind(*args: Any, **kwargs: Any) -> AsyncIterator[None]:
        await mock_bind(*args, **kwargs)
        yield

    with patch(
        "opentrons_hardware.sensors.scheduler.SensorScheduler.bind_sync",
        _fake_bind,
    ):
        yield mock_bind


@pytest.mark.parametrize(
    "target_node,motor_node, threshold_pascals",
    [
        (NodeId.pipette_left, NodeId.head_l, 14),
        (NodeId.pipette_right, NodeId.head_r, 16),
    ],
)
async def test_liquid_probe(
    mock_messenger: AsyncMock,
    mock_bind_output: AsyncMock,
    message_send_loopback: CanLoopback,
    mock_sensor_threshold: AsyncMock,
    target_node: PipetteProbeTarget,
    motor_node: NodeId,
    threshold_pascals: float,
) -> None:
    """Test that liquid_probe targets the right nodes."""
    sensor_info = SensorInformation(
        sensor_type=SensorType.pressure, sensor_id=SensorId.S0, node_id=target_node
    )

    def check_first_move(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        return [
            (
                NodeId.host,
                MoveCompleted(
                    payload=MoveCompletedPayload(
                        group_id=UInt8Field(0),
                        seq_id=UInt8Field(0),
                        current_position_um=UInt32Field(14000),
                        encoder_position_um=Int32Field(14000),
                        position_flags=MotorPositionFlagsField(0),
                        ack_id=UInt8Field(1),
                    )
                ),
                target_node,
            )
        ]

    def check_second_move(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        return [
            (
                NodeId.host,
                MoveCompleted(
                    payload=MoveCompletedPayload(
                        group_id=UInt8Field(1),
                        seq_id=UInt8Field(0),
                        current_position_um=UInt32Field(14000),
                        encoder_position_um=Int32Field(14000),
                        position_flags=MotorPositionFlagsField(0),
                        ack_id=UInt8Field(2),
                    )
                ),
                motor_node,
            ),
            (
                NodeId.host,
                MoveCompleted(
                    payload=MoveCompletedPayload(
                        group_id=UInt8Field(1),
                        seq_id=UInt8Field(0),
                        current_position_um=UInt32Field(14000),
                        encoder_position_um=Int32Field(14000),
                        position_flags=MotorPositionFlagsField(0),
                        ack_id=UInt8Field(2),
                    )
                ),
                target_node,
            ),
        ]

    def check_third_move(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        return [
            (
                NodeId.host,
                MoveCompleted(
                    payload=MoveCompletedPayload(
                        group_id=UInt8Field(0),
                        seq_id=UInt8Field(0),
                        current_position_um=UInt32Field(14000),
                        encoder_position_um=Int32Field(14000),
                        position_flags=MotorPositionFlagsField(0),
                        ack_id=UInt8Field(1),
                    )
                ),
                motor_node,
            )
        ]

    def get_responder() -> Iterator[
        Callable[
            [NodeId, MessageDefinition], List[Tuple[NodeId, MessageDefinition, NodeId]]
        ]
    ]:
        yield check_first_move
        yield check_second_move
        yield check_third_move

    responder_getter = get_responder()

    def move_responder(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        message.payload.serialize()
        if isinstance(message, ExecuteMoveGroupRequest):
            responder = next(responder_getter)
            return responder(node_id, message)
        else:
            return []

    message_send_loopback.add_responder(move_responder)

    position = await liquid_probe(
        messenger=mock_messenger,
        tool=target_node,
        head_node=motor_node,
        max_p_distance=70,
        mount_speed=10,
        plunger_speed=8,
        threshold_pascals=threshold_pascals,
        plunger_impulse_time=0.2,
        num_baseline_reads=20,
        z_offset_for_plunger_prep=2.0,
        sensor_id=SensorId.S0,
    )
    assert position[motor_node].positions_only()[0] == 14
    assert mock_sensor_threshold.call_args_list[0][0][0] == SensorThresholdInformation(
        sensor=sensor_info,
        data=SensorDataType.build(threshold_pascals * 65536, sensor_info.sensor_type),
        mode=SensorThresholdMode.absolute,
    )


@pytest.mark.parametrize(
    "target_node,motor_node,distance,speed,",
    [
        (NodeId.pipette_left, NodeId.head_l, 10, 10),
        (NodeId.pipette_right, NodeId.head_r, 10, -10),
        (NodeId.gripper, NodeId.gripper_z, -10, 10),
        (NodeId.pipette_left, NodeId.gantry_x, -10, -10),
        (NodeId.gripper, NodeId.gantry_y, 10, 10),
    ],
)
async def test_capacitive_probe(
    mock_messenger: AsyncMock,
    message_send_loopback: CanLoopback,
    mock_sensor_threshold: AsyncMock,
    target_node: InstrumentProbeTarget,
    motor_node: NodeId,
    caplog: Any,
    distance: float,
    speed: float,
) -> None:
    """Test that capacitive_probe targets the right nodes."""
    caplog.set_level(logging.INFO)
    sensor_info = SensorInformation(
        sensor_type=SensorType.capacitive, sensor_id=SensorId.S0, node_id=target_node
    )

    def move_responder(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        message.payload.serialize()
        if isinstance(message, ExecuteMoveGroupRequest):
            ack_payload = EmptyPayload()
            ack_payload.message_index = message.payload.message_index
            return [
                (
                    NodeId.host,
                    Acknowledgement(payload=ack_payload),
                    motor_node,
                ),
                (
                    NodeId.host,
                    MoveCompleted(
                        payload=MoveCompletedPayload(
                            group_id=UInt8Field(0),
                            seq_id=UInt8Field(0),
                            current_position_um=UInt32Field(10000),
                            encoder_position_um=Int32Field(10000),
                            position_flags=MotorPositionFlagsField(0),
                            ack_id=UInt8Field(1),
                        )
                    ),
                    motor_node,
                ),
                (
                    NodeId.host,
                    Acknowledgement(payload=ack_payload),
                    target_node,
                ),
                (
                    NodeId.host,
                    MoveCompleted(
                        payload=MoveCompletedPayload(
                            group_id=UInt8Field(0),
                            seq_id=UInt8Field(0),
                            current_position_um=UInt32Field(10000),
                            encoder_position_um=Int32Field(10000),
                            position_flags=MotorPositionFlagsField(0),
                            ack_id=UInt8Field(1),
                        )
                    ),
                    target_node,
                ),
            ]
        else:
            return []

    message_send_loopback.add_responder(move_responder)

    status = await capacitive_probe(
        mock_messenger, target_node, motor_node, distance, speed
    )
    assert status.motor_position == 10  # this comes from the current_position_um above
    assert status.encoder_position == 10
    # this mock assert is annoying because something's __eq__ doesn't work
    assert mock_sensor_threshold.call_args_list[0][0][0] == SensorThresholdInformation(
        sensor=sensor_info,
        data=SensorDataType.build(1.0, sensor_info.sensor_type),
        mode=SensorThresholdMode.auto_baseline,
    )


@pytest.mark.parametrize(
    "target_node,motor_node,distance,speed,",
    [
        (NodeId.pipette_left, NodeId.head_l, 10, 10),
        (NodeId.pipette_right, NodeId.head_r, 10, -10),
        (NodeId.gripper, NodeId.gripper_z, -10, 10),
        (NodeId.pipette_left, NodeId.gantry_x, -10, -10),
        (NodeId.gripper, NodeId.gantry_y, 10, 10),
    ],
)
async def test_capacitive_sweep(
    mock_messenger: AsyncMock,
    message_send_loopback: CanLoopback,
    mock_sensor_threshold: AsyncMock,
    mock_bind_sync: AsyncMock,
    target_node: InstrumentProbeTarget,
    motor_node: NodeId,
    distance: float,
    speed: float,
) -> None:
    """Test capacitive sweep."""

    def move_responder(
        node_id: NodeId, message: MessageDefinition
    ) -> List[Tuple[NodeId, MessageDefinition, NodeId]]:
        message.payload.serialize()
        if isinstance(message, ExecuteMoveGroupRequest):
            ack_payload = EmptyPayload()
            ack_payload.message_index = message.payload.message_index
            sensor_values: List[Tuple[NodeId, MessageDefinition, NodeId]] = [
                (
                    NodeId.host,
                    ReadFromSensorResponse(
                        payload=ReadFromSensorResponsePayload(
                            sensor=SensorTypeField(SensorType.capacitive.value),
                            sensor_id=SensorIdField(SensorId.S0),
                            sensor_data=Int32Field(i << 16),
                        )
                    ),
                    target_node,
                )
                for i in range(10)
            ]
            move_ack: List[Tuple[NodeId, MessageDefinition, NodeId]] = [
                (
                    NodeId.host,
                    MoveCompleted(
                        payload=MoveCompletedPayload(
                            group_id=UInt8Field(0),
                            seq_id=UInt8Field(0),
                            current_position_um=UInt32Field(10000),
                            encoder_position_um=Int32Field(10000),
                            position_flags=MotorPositionFlagsField(0),
                            ack_id=UInt8Field(1),
                        )
                    ),
                    motor_node,
                ),
            ]
            execute_ack: List[Tuple[NodeId, MessageDefinition, NodeId]] = [
                (
                    NodeId.host,
                    Acknowledgement(
                        payload=ack_payload,
                    ),
                    motor_node,
                ),
            ]
            return execute_ack + sensor_values + move_ack
        else:
            return []

    message_send_loopback.add_responder(move_responder)

    result = await capacitive_pass(
        mock_messenger, target_node, motor_node, distance, speed
    )
    assert result == list(range(10))


@pytest.mark.parametrize(
    "target_node",
    [
        ({NodeId.pipette_left: [SensorId.S0]}),
        ({NodeId.pipette_right: [SensorId.S1]}),
        ({NodeId.pipette_right: [SensorId.S1], NodeId.pipette_left: [SensorId.S1]}),
        (
            {
                NodeId.pipette_right: [SensorId.S0, SensorId.S1],
                NodeId.pipette_left: [SensorId.S1],
            }
        ),
    ],
)
async def test_overpressure_closure(
    mock_messenger: AsyncMock,
    target_node: Dict[PipetteProbeTarget, List[SensorId]],
) -> None:
    """Test that we can use partial context manager."""
    partial_context_manager = await check_overpressure(
        mock_messenger,
        target_node,
    )

    # Execute the actual partial context manager and see that the correct
    # messages are sent.
    async with partial_context_manager():
        mock_messenger.ensure_send.assert_has_calls(
            [
                call(
                    node_id=n,
                    message=BindSensorOutputRequest(
                        payload=BindSensorOutputRequestPayload(
                            sensor=SensorTypeField(SensorType.pressure),
                            sensor_id=SensorIdField(s),
                            binding=SensorOutputBindingField(
                                SensorOutputBinding.max_threshold_sync
                            ),
                        )
                    ),
                    expected_nodes=[n],
                )
                for n, sids in target_node.items()
                for s in sids
            ],
            any_order=True,
        )
    mock_messenger.ensure_send.assert_has_calls(
        [
            call(
                node_id=n,
                message=BindSensorOutputRequest(
                    payload=BindSensorOutputRequestPayload(
                        sensor=SensorTypeField(SensorType.pressure),
                        sensor_id=SensorIdField(s),
                        binding=SensorOutputBindingField(SensorOutputBinding.none),
                    )
                ),
                expected_nodes=[n],
            )
            for n, sids in target_node.items()
            for s in sids
        ],
        any_order=True,
    )
