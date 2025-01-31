"""Functions for commanding motion limited by tool sensors."""
import asyncio
from contextlib import AsyncExitStack
from functools import partial
from typing import (
    Union,
    List,
    Iterator,
    Tuple,
    Dict,
    Callable,
    AsyncContextManager,
    Optional,
    AsyncIterator,
    Mapping,
)
from logging import getLogger
from numpy import float64
from math import copysign
from typing_extensions import Literal
from contextlib import asynccontextmanager
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    SensorId,
    SensorType,
    SensorOutputBinding,
    ErrorCode,
    SensorThresholdMode,
)
from opentrons_hardware.firmware_bindings.messages.payloads import (
    SendAccumulatedSensorDataPayload,
    BindSensorOutputRequestPayload,
)
from opentrons_hardware.firmware_bindings.messages.fields import (
    SensorIdField,
    SensorOutputBindingField,
    SensorTypeField,
)
from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    BindSensorOutputRequest,
    SendAccumulatedSensorDataRequest,
)
from opentrons_hardware.sensors.sensor_driver import SensorDriver, LogListener
from opentrons_hardware.sensors.types import (
    sensor_fixed_point_conversion,
    SensorDataType,
)
from opentrons_hardware.sensors.sensor_types import (
    SensorInformation,
    PressureSensor,
    CapacitiveSensor,
)
from opentrons_hardware.sensors.scheduler import SensorScheduler
from opentrons_hardware.drivers.can_bus.can_messenger import CanMessenger
from opentrons_hardware.hardware_control.motion import (
    MoveStopCondition,
    create_step,
    MoveGroupStep,
)
from opentrons_hardware.hardware_control.move_group_runner import MoveGroupRunner
from opentrons_hardware.hardware_control.types import (
    MotorPositionStatus,
    MoveCompleteAck,
)

LOG = getLogger(__name__)

PipetteProbeTarget = Literal[NodeId.pipette_left, NodeId.pipette_right]
InstrumentProbeTarget = Union[PipetteProbeTarget, Literal[NodeId.gripper]]
ProbeSensorDict = Union[
    Dict[SensorId, PressureSensor], Dict[SensorId, CapacitiveSensor]
]


def _fix_pass_step_for_buffer(
    move_group: MoveGroupStep,
    movers: List[NodeId],
    distance: Dict[NodeId, float],
    speed: Dict[NodeId, float],
    sensor_type: SensorType,
    sensor_id: SensorId,
    stop_condition: MoveStopCondition = MoveStopCondition.sync_line,
    binding_flags: Optional[int] = None,
) -> MoveGroupStep:
    if binding_flags is None:
        binding_flags = (
            SensorOutputBinding.auto_baseline_report
            + SensorOutputBinding.sync
            + SensorOutputBinding.report
        )
    tool_nodes = [
        i
        for i in movers
        if i in [NodeId.pipette_left, NodeId.pipette_right, NodeId.gripper]
    ]
    if sensor_type == SensorType.pressure:
        tool_move = create_step(
            distance={ax: float64(abs(distance[ax])) for ax in movers},
            velocity={
                ax: float64(speed[ax] * copysign(1.0, distance[ax])) for ax in movers
            },
            acceleration={},
            # use any node present to calculate duration of the move, assuming the durations
            #   will be the same
            duration=float64(abs(distance[movers[0]] / speed[movers[0]])),
            present_nodes=tool_nodes,
            stop_condition=MoveStopCondition.sensor_report,
            sensor_type_pass=sensor_type,
            sensor_id_pass=sensor_id,
            sensor_binding_flags=binding_flags,
        )
    elif sensor_type == SensorType.capacitive:
        tool_move = create_step(
            distance={},
            velocity={},
            acceleration={},
            # use any node present to calculate duration of the move, assuming the durations
            #   will be the same
            duration=float64(abs(distance[movers[0]] / speed[movers[0]])),
            present_nodes=tool_nodes,
            stop_condition=MoveStopCondition.sync_line,
            sensor_type_pass=sensor_type,
            sensor_id_pass=sensor_id,
            sensor_binding_flags=binding_flags,
        )
    for node in tool_nodes:
        move_group[node] = tool_move[node]
    return move_group


def _build_pass_step(
    movers: List[NodeId],
    distance: Dict[NodeId, float],
    speed: Dict[NodeId, float],
    sensor_type: SensorType,
    sensor_id: SensorId,
    stop_condition: MoveStopCondition = MoveStopCondition.sync_line,
    binding_flags: Optional[int] = None,
) -> MoveGroupStep:
    move_group = create_step(
        distance={ax: float64(abs(distance[ax])) for ax in movers},
        velocity={
            ax: float64(speed[ax] * copysign(1.0, distance[ax])) for ax in movers
        },
        acceleration={},
        # use any node present to calculate duration of the move, assuming the durations
        #   will be the same
        duration=float64(abs(distance[movers[0]] / speed[movers[0]])),
        present_nodes=movers,
        stop_condition=stop_condition,
        sensor_type_pass=sensor_type,
        sensor_id_pass=sensor_id,
        sensor_binding_flags=binding_flags,
    )
    return move_group


async def _setup_pressure_sensors(
    messenger: CanMessenger,
    sensor_id: SensorId,
    tool: PipetteProbeTarget,
    num_baseline_reads: int,
    threshold_fixed_point: float,
    sensor_driver: SensorDriver,
    auto_zero_sensor: bool,
) -> Dict[SensorId, PressureSensor]:
    sensors: List[SensorId] = []
    result: Dict[SensorId, PressureSensor] = {}
    if sensor_id == SensorId.BOTH:
        sensors.append(SensorId.S0)
        sensors.append(SensorId.S1)
    else:
        sensors.append(sensor_id)

    for sensor in sensors:
        pressure_sensor = PressureSensor.build(
            sensor_id=sensor,
            node_id=tool,
            stop_threshold=threshold_fixed_point,
        )

        if auto_zero_sensor:
            pressure_baseline = await sensor_driver.get_baseline(
                messenger, pressure_sensor, num_baseline_reads
            )
            LOG.debug(f"found baseline pressure: {pressure_baseline} pascals")

        await sensor_driver.send_stop_threshold(messenger, pressure_sensor)
        result[sensor] = pressure_sensor
    return result


async def _setup_capacitive_sensors(
    messenger: CanMessenger,
    sensor_id: SensorId,
    tool: InstrumentProbeTarget,
    relative_threshold_pf: float,
    sensor_driver: SensorDriver,
) -> Dict[SensorId, CapacitiveSensor]:
    sensors: List[SensorId] = []
    result: Dict[SensorId, CapacitiveSensor] = {}
    if sensor_id == SensorId.BOTH:
        sensors.append(SensorId.S0)
        sensors.append(SensorId.S1)
    else:
        sensors.append(sensor_id)

    for sensor in sensors:
        capacitive_sensor = CapacitiveSensor.build(
            sensor_id=sensor,
            node_id=tool,
            stop_threshold=relative_threshold_pf,
        )
        threshold = await sensor_driver.send_stop_threshold(
            messenger, capacitive_sensor, SensorThresholdMode.auto_baseline
        )
        LOG.info(
            f"starting capacitive probe with threshold {threshold.to_float() if threshold is not None else None}"
        )
        result[sensor] = capacitive_sensor
    return result


async def finalize_logs(
    messenger: CanMessenger,
    tool: NodeId,
    listeners: Dict[SensorId, LogListener],
    sensors: Mapping[SensorId, Union[CapacitiveSensor, PressureSensor]],
) -> None:
    """Signal the sensors to finish sending their data and wait for it to flush out."""
    for s_id in sensors.keys():
        # Tell the sensor to stop recording
        await messenger.ensure_send(
            node_id=tool,
            message=BindSensorOutputRequest(
                payload=BindSensorOutputRequestPayload(
                    sensor=SensorTypeField(sensors[s_id].sensor.sensor_type),
                    sensor_id=SensorIdField(s_id),
                    binding=SensorOutputBindingField(SensorOutputBinding.none),
                )
            ),
            expected_nodes=[tool],
        )
        request = SendAccumulatedSensorDataRequest(
            payload=SendAccumulatedSensorDataPayload(
                sensor_id=SensorIdField(s_id),
                sensor_type=SensorTypeField(sensors[s_id].sensor.sensor_type),
            )
        )
        # set the message index of the Ack that signals this sensor is finished sending data
        listeners[s_id].set_stop_ack(request.payload.message_index.value)
        # tell the sensor to clear it's queue
        await messenger.send(
            node_id=tool,
            message=request,
        )
    # wait for the data to finish sending
    for listener in listeners.values():
        await listener.wait_for_complete()


async def liquid_probe(
    messenger: CanMessenger,
    tool: PipetteProbeTarget,
    head_node: NodeId,
    max_p_distance: float,
    plunger_speed: float,
    mount_speed: float,
    threshold_pascals: float,
    plunger_impulse_time: float,
    num_baseline_reads: int,
    z_offset_for_plunger_prep: float,
    sensor_id: SensorId = SensorId.S0,
    force_both_sensors: bool = False,
    emplace_data: Optional[
        Callable[[Dict[SensorId, List[SensorDataType]]], None]
    ] = None,
) -> Dict[NodeId, MotorPositionStatus]:
    """Move the mount and pipette simultaneously while reading from the pressure sensor."""
    sensor_driver = SensorDriver()
    threshold_fixed_point = threshold_pascals * sensor_fixed_point_conversion
    sensor_binding = None
    if sensor_id == SensorId.BOTH and force_both_sensors:
        # this covers the case when we want to use both sensors in an AND configuration
        # we don't think we'll use this but we want the ability to override the standard OR configuration
        sensor_binding = (
            SensorOutputBinding.auto_baseline_report
            + SensorOutputBinding.sync
            + SensorOutputBinding.report
            + SensorOutputBinding.multi_sensor_sync
        )
    pressure_sensors: Dict[SensorId, PressureSensor] = await _setup_pressure_sensors(
        messenger,
        sensor_id,
        tool,
        num_baseline_reads,
        threshold_fixed_point,
        sensor_driver,
        True,
    )
    p_prep_distance = float(plunger_impulse_time * plunger_speed)
    p_pass_distance = float(max_p_distance - p_prep_distance)
    max_z_distance = (p_pass_distance / plunger_speed) * mount_speed

    lower_plunger = create_step(
        distance={tool: float64(p_prep_distance)},
        velocity={tool: float64(plunger_speed)},
        acceleration={},
        duration=float64(plunger_impulse_time),
        present_nodes=[tool],
    )

    sensor_group = _build_pass_step(
        movers=[head_node, tool],
        distance={head_node: max_z_distance, tool: p_pass_distance},
        speed={head_node: mount_speed, tool: plunger_speed},
        sensor_type=SensorType.pressure,
        sensor_id=sensor_id,
        stop_condition=MoveStopCondition.sync_line,
        binding_flags=sensor_binding,
    )

    sensor_group = _fix_pass_step_for_buffer(
        sensor_group,
        movers=[head_node, tool],
        distance={head_node: max_z_distance, tool: p_pass_distance},
        speed={head_node: mount_speed, tool: plunger_speed},
        sensor_type=SensorType.pressure,
        sensor_id=sensor_id,
        stop_condition=MoveStopCondition.sync_line,
        binding_flags=sensor_binding,
    )
    sensor_runner = MoveGroupRunner(move_groups=[[lower_plunger], [sensor_group]])

    # Only raise the z a little so we don't do a huge slow travel
    raise_z = create_step(
        distance={head_node: float64(z_offset_for_plunger_prep)},
        velocity={head_node: float64(-1 * mount_speed)},
        acceleration={},
        duration=float64(max_z_distance / mount_speed),
        present_nodes=[head_node],
    )

    raise_z_runner = MoveGroupRunner(move_groups=[[raise_z]])
    listeners = {
        s_id: LogListener(messenger, pressure_sensors[s_id])
        for s_id in pressure_sensors.keys()
    }

    LOG.info(
        f"Starting LLD pass: {head_node} {sensor_id} max p distance {max_p_distance} max z distance {max_z_distance}"
    )
    async with AsyncExitStack() as binding_stack:
        for listener in listeners.values():
            await binding_stack.enter_async_context(listener)
        positions = await sensor_runner.run(can_messenger=messenger)
        if positions[head_node].move_ack == MoveCompleteAck.stopped_by_condition:
            LOG.info(
                f"Liquid found {head_node} motor_postion {positions[head_node].motor_position} encoder position {positions[head_node].encoder_position}"
            )
            await raise_z_runner.run(can_messenger=messenger)
        await finalize_logs(messenger, tool, listeners, pressure_sensors)

    # give response data to any consumer that wants it
    if emplace_data:
        for s_id in listeners.keys():
            data = listeners[s_id].get_data()
            if data:
                for d in data:
                    emplace_data({s_id: data})

    return positions


async def check_overpressure(
    messenger: CanMessenger,
    tools: Dict[PipetteProbeTarget, List[SensorId]],
) -> Callable[..., AsyncContextManager["asyncio.Queue[Tuple[NodeId, ErrorCode]]"]]:
    """Montior for overpressure in the system.

    Returns a partial context manager to be used in the hardware controller so
    we can wrap moves.
    """
    sensor_scheduler = SensorScheduler()
    sensor_info = []
    for tool, sensor_ids in tools.items():
        for _ids in sensor_ids:
            sensor_info.append(SensorInformation(SensorType.pressure, _ids, tool))
    return partial(
        sensor_scheduler.monitor_exceed_max_threshold, sensor_info, messenger
    )


async def capacitive_probe(
    messenger: CanMessenger,
    tool: InstrumentProbeTarget,
    mover: NodeId,
    distance: float,
    mount_speed: float,
    sensor_id: SensorId = SensorId.S0,
    relative_threshold_pf: float = 1.0,
    response_queue: Optional[
        asyncio.Queue[dict[SensorId, list[SensorDataType]]]
    ] = None,
) -> MotorPositionStatus:
    """Move the specified tool down until its capacitive sensor triggers.

    Moves down by the specified distance at the specified speed until the
    capacitive sensor triggers and returns the position afterward.

    The direction is sgn(distance)*sgn(speed), so you can set the direction
    either by negating speed or negating distance.
    """
    sensor_driver = SensorDriver()
    pipette_present = tool in [NodeId.pipette_left, NodeId.pipette_right]

    capacitive_sensors = await _setup_capacitive_sensors(
        messenger,
        sensor_id,
        tool,
        relative_threshold_pf,
        sensor_driver,
    )

    probe_distance = {mover: distance}
    probe_speed = {mover: mount_speed}
    movers = [mover]
    if pipette_present:
        probe_distance[tool] = 0.0
        probe_speed[tool] = 0.0
        movers.append(tool)

    sensor_group = _build_pass_step(
        movers=movers,
        distance=probe_distance,
        speed=probe_speed,
        sensor_type=SensorType.capacitive,
        sensor_id=sensor_id,
        stop_condition=MoveStopCondition.sync_line,
    )

    sensor_group = _fix_pass_step_for_buffer(
        sensor_group,
        movers=movers,
        distance=probe_distance,
        speed=probe_speed,
        sensor_type=SensorType.capacitive,
        sensor_id=sensor_id,
        stop_condition=MoveStopCondition.sync_line,
    )

    runner = MoveGroupRunner(move_groups=[[sensor_group]])

    listeners = {
        s_id: LogListener(messenger, capacitive_sensors[s_id])
        for s_id in capacitive_sensors.keys()
    }
    async with AsyncExitStack() as binding_stack:
        for listener in listeners.values():
            await binding_stack.enter_async_context(listener)
        for sensor in capacitive_sensors.values():
            await binding_stack.enter_async_context(
                sensor_driver.bind_output(
                    can_messenger=messenger,
                    sensor=sensor,
                    binding=[SensorOutputBinding.sync],
                )
            )
        positions = await runner.run(can_messenger=messenger)
        await finalize_logs(messenger, tool, listeners, capacitive_sensors)

    # give response data to any consumer that wants it
    if response_queue:
        for s_id in listeners.keys():
            data = listeners[s_id].get_data()
            if data:
                for d in data:
                    response_queue.put_nowait({s_id: data})
    return positions[mover]


async def capacitive_pass(
    messenger: CanMessenger,
    tool: InstrumentProbeTarget,
    mover: NodeId,
    distance: float,
    speed: float,
    sensor_id: SensorId = SensorId.S0,
) -> List[float]:
    """Move the specified axis while capturing capacitive sensor readings."""
    sensor_scheduler = SensorScheduler()
    sensor_info = SensorInformation(
        sensor_type=SensorType.capacitive,
        sensor_id=sensor_id,
        node_id=tool,
    )

    sensor_group = _build_pass_step(
        movers=[mover],
        distance={mover: distance},
        speed={mover: speed},
        sensor_type=SensorType.capacitive,
        sensor_id=sensor_id,
    )

    runner = MoveGroupRunner(move_groups=[[sensor_group]])
    await runner.prep(messenger)
    async with sensor_scheduler.capture_output(sensor_info, messenger) as output_queue:
        await runner.execute(messenger)

    def _drain() -> Iterator[float]:
        while True:
            try:
                yield output_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    return list(_drain())


@asynccontextmanager
async def grab_pressure(
    channels: int, tool: NodeId, messenger: CanMessenger
) -> AsyncIterator[None]:
    """Run some task and log the pressure."""
    sensor_driver = SensorDriver()
    sensor_id = SensorId.BOTH if channels > 1 else SensorId.S0
    sensors: List[SensorId] = []
    if sensor_id == SensorId.BOTH:
        sensors.append(SensorId.S0)
        sensors.append(SensorId.S1)
    else:
        sensors.append(sensor_id)

    for sensor in sensors:
        pressure_sensor = PressureSensor.build(
            sensor_id=sensor,
            node_id=tool,
        )
        num_baseline_reads = 10
        # TODO: RH log this baseline and remove noqa
        pressure_baseline = await sensor_driver.get_baseline(  # noqa: F841
            messenger, pressure_sensor, num_baseline_reads
        )
        await messenger.ensure_send(
            node_id=tool,
            message=BindSensorOutputRequest(
                payload=BindSensorOutputRequestPayload(
                    sensor=SensorTypeField(SensorType.pressure),
                    sensor_id=SensorIdField(sensor),
                    binding=SensorOutputBindingField(SensorOutputBinding.report),
                )
            ),
            expected_nodes=[tool],
        )
    try:
        yield
    finally:
        for sensor in sensors:
            await messenger.ensure_send(
                node_id=tool,
                message=BindSensorOutputRequest(
                    payload=BindSensorOutputRequestPayload(
                        sensor=SensorTypeField(SensorType.pressure),
                        sensor_id=SensorIdField(sensor),
                        binding=SensorOutputBindingField(SensorOutputBinding.none),
                    )
                ),
                expected_nodes=[tool],
            )
