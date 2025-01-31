import mock
import pytest
from decoy import Decoy
import asyncio

from contextlib import (
    nullcontext as does_not_raise,
    AbstractContextManager,
)
from typing import (
    cast,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Any,
    Iterator,
    AsyncIterator,
    ContextManager,
)

from opentrons.hardware_control.backends.ot3controller import OT3Controller
from opentrons.hardware_control.backends.ot3utils import (
    node_to_axis,
    axis_to_node,
    sensor_node_for_mount,
    subsystem_to_target,
    target_to_subsystem,
)
from opentrons.hardware_control.backends.subsystem_manager import SubsystemManager
from opentrons_hardware.drivers.eeprom import EEPROMDriver
from opentrons_hardware.drivers.can_bus.can_messenger import (
    MessageListenerCallback,
    MessageListenerCallbackFilter,
    CanMessenger,
)
from opentrons.config.types import (
    OT3Config,
    GantryLoad,
    LiquidProbeSettings,
)
from opentrons.config.robot_configs import build_config_ot3
from opentrons_hardware.firmware_bindings.arbitration_id import ArbitrationId
from opentrons_hardware.firmware_bindings.constants import (
    NodeId,
    PipetteName as FirmwarePipetteName,
    USBTarget,
)
from opentrons_hardware.drivers.can_bus.abstract_driver import AbstractCanDriver
from opentrons_hardware.drivers.binary_usb import SerialUsbDriver
from opentrons.hardware_control.types import (
    Axis,
    OT3Mount,
    OT3AxisMap,
    MotorStatus,
    SubSystem,
    SubSystemState,
    UpdateStatus,
    UpdateState,
    EstopState,
    CurrentConfig,
)
from opentrons.hardware_control.errors import (
    InvalidPipetteName,
    InvalidPipetteModel,
)

from opentrons_hardware.firmware_bindings.utils import UInt8Field
from opentrons_hardware.firmware_bindings.messages.messages import MessageDefinition
from opentrons_hardware.hardware_control.motion import (
    MoveType,
    MoveStopCondition,
    MoveGroupSingleAxisStep,
)
from opentrons_hardware.hardware_control.types import (
    PCBARevision,
    MotorPositionStatus,
    MoveCompleteAck,
)
from opentrons_hardware.hardware_control import current_settings
from opentrons_hardware.hardware_control.network import DeviceInfoCache
from opentrons_hardware.hardware_control.tools.types import (
    ToolSummary,
    PipetteInformation,
    GripperInformation,
)

from opentrons.hardware_control.backends.estop_state import EstopStateMachine

from opentrons_shared_data.errors.exceptions import (
    EStopActivatedError,
    EStopNotPresentError,
    FirmwareUpdateRequiredError,
    FailedGripperPickupError,
    PipetteLiquidNotFoundError,
)

from opentrons_hardware.hardware_control.move_group_runner import MoveGroupRunner


@pytest.fixture
def mock_config() -> OT3Config:
    return build_config_ot3({})


class MockCanMessageNotifier:
    """A CanMessage notifier."""

    def __init__(self) -> None:
        """Constructor."""
        self._listeners: List[
            Tuple[MessageListenerCallback, Optional[MessageListenerCallbackFilter]]
        ] = []

    def add_listener(
        self,
        listener: MessageListenerCallback,
        filter: Optional[MessageListenerCallbackFilter] = None,
    ) -> None:
        """Add listener."""
        self._listeners.append((listener, filter))

    def notify(self, message: MessageDefinition, arbitration_id: ArbitrationId) -> None:
        """Notify."""
        for listener, filter in self._listeners:
            if filter and not filter(arbitration_id):
                continue
            listener(message, arbitration_id)


@pytest.fixture
def can_message_notifier() -> MockCanMessageNotifier:
    """A fixture that notifies mock_messenger listeners of a new message."""
    return MockCanMessageNotifier()


@pytest.fixture
def mock_messenger(can_message_notifier: MockCanMessageNotifier) -> mock.AsyncMock:
    """Mock can messenger."""
    messenger = mock.AsyncMock(spec=CanMessenger)
    messenger.add_listener.side_effect = can_message_notifier.add_listener
    return messenger


@pytest.fixture
def mock_can_driver(mock_messenger: mock.AsyncMock) -> AbstractCanDriver:
    return mock.AsyncMock(spec=AbstractCanDriver)


@pytest.fixture
def mock_usb_driver() -> SerialUsbDriver:
    return mock.AsyncMock(spec=SerialUsbDriver)


@pytest.fixture
def mock_eeprom_driver() -> EEPROMDriver:
    """Mock eeprom driver."""
    return mock.Mock(spec=EEPROMDriver)


@pytest.fixture
def controller(
    mock_config: OT3Config,
    mock_can_driver: AbstractCanDriver,
    mock_eeprom_driver: EEPROMDriver,
) -> OT3Controller:
    with (mock.patch("opentrons.hardware_control.backends.ot3controller.OT3GPIO")):
        return OT3Controller(
            mock_config, mock_can_driver, eeprom_driver=mock_eeprom_driver
        )


@pytest.fixture
def fake_liquid_settings() -> LiquidProbeSettings:
    return LiquidProbeSettings(
        mount_speed=40,
        plunger_speed=10,
        plunger_impulse_time=0.2,
        sensor_threshold_pascals=15,
        aspirate_while_sensing=False,
        z_overlap_between_passes_mm=0.1,
        plunger_reset_offset=2.0,
        samples_for_baselining=20,
        sample_time_sec=0.004,
    )


@pytest.fixture
def mock_send_stop_threshold() -> Iterator[mock.AsyncMock]:
    with mock.patch(
        "opentrons_hardware.sensors.sensor_driver.SensorDriver.send_stop_threshold",
        autospec=True,
    ) as mock_stop_threshold:
        yield mock_stop_threshold


@pytest.fixture
def mock_move_group_run() -> Iterator[mock.AsyncMock]:

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.MoveGroupRunner.run",
        autospec=True,
    ) as mock_mgr_run:
        mock_mgr_run.return_value = {}
        yield mock_mgr_run


@pytest.fixture
def mock_check_overpressure() -> Iterator[mock.AsyncMock]:
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.check_overpressure",
        autospec=True,
    ) as mock_check_overpressure:
        queue: asyncio.Queue[Any] = asyncio.Queue()

        class FakeOverpressure:
            async def __aenter__(self) -> asyncio.Queue[Any]:
                return queue

            async def __aexit__(self, *args: Any, **kwargs: Any) -> None:
                pass

        mock_check_overpressure.return_value = lambda: FakeOverpressure()
        yield mock_check_overpressure


def _device_info_entry(subsystem: SubSystem) -> Tuple[SubSystem, DeviceInfoCache]:
    return subsystem, DeviceInfoCache(
        target=subsystem_to_target(subsystem),
        version=2,
        flags=0,
        shortsha="abcdef",
        revision=PCBARevision(main="c2"),
        subidentifier=1,
        ok=True,
    )


def _subsystems_entry(info: DeviceInfoCache) -> Tuple[SubSystem, SubSystemState]:
    return target_to_subsystem(info.target), SubSystemState(
        ok=info.ok,
        current_fw_version=info.version,
        next_fw_version=2,
        current_fw_sha=info.shortsha,
        pcba_revision="A1",
        update_state=None,
        fw_update_needed=False,
    )


@pytest.fixture
def mock_present_devices(
    controller: OT3Controller, mock_subsystem_manager: SubsystemManager, decoy: Decoy
) -> None:
    decoy.when(mock_subsystem_manager.device_info).then_return(
        dict(
            _device_info_entry(subsys)
            for subsys in (
                SubSystem.pipette_left,
                SubSystem.gantry_x,
                SubSystem.gantry_y,
                SubSystem.head,
                SubSystem.pipette_right,
                SubSystem.gripper,
                SubSystem.rear_panel,
            )
        )
    )
    decoy.when(mock_subsystem_manager.targets).then_return(
        {
            NodeId.pipette_left,
            NodeId.pipette_right,
            NodeId.gripper,
            NodeId.gantry_x,
            NodeId.gantry_y,
            NodeId.head,
            USBTarget.rear_panel,
        }
    )


@pytest.fixture
def mock_subsystem_manager(
    controller: OT3Controller, decoy: Decoy
) -> Iterator[SubsystemManager]:
    with mock.patch.object(
        controller, "_subsystem_manager", decoy.mock(cls=SubsystemManager)
    ) as mock_subsystem:
        yield mock_subsystem


@pytest.fixture
def mock_estop_state_machine(
    controller: OT3Controller, decoy: Decoy
) -> Iterator[EstopStateMachine]:
    with mock.patch.object(
        controller, "_estop_state_machine", decoy.mock(cls=EstopStateMachine)
    ) as mock_estop_state:
        yield mock_estop_state


@pytest.fixture
def fw_update_info() -> Dict[NodeId, str]:
    return {
        NodeId.head: "/some/path/head.hex",
        NodeId.gantry_x: "/some/path/gantry.hex",
    }


@pytest.fixture
def fw_node_info() -> Dict[NodeId, DeviceInfoCache]:
    node_cache1 = DeviceInfoCache(
        NodeId.head, 1, "12345678", None, PCBARevision(None), subidentifier=0, ok=True
    )
    node_cache2 = DeviceInfoCache(
        NodeId.gantry_x,
        1,
        "12345678",
        None,
        PCBARevision(None),
        subidentifier=0,
        ok=True,
    )
    return {NodeId.head: node_cache1, NodeId.gantry_x: node_cache2}


home_test_params = [
    [Axis.X],
    [Axis.Y],
    [Axis.Z_L],
    [Axis.Z_R],
    [Axis.X, Axis.Y, Axis.Z_R],
    [Axis.X, Axis.Z_R, Axis.P_R, Axis.Y, Axis.Z_L],
    [Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R, Axis.P_L, Axis.P_R],
    [Axis.P_R],
    [Axis.Z_L, Axis.Z_R, Axis.Z_G],
    [Axis.X, Axis.Y, Axis.Z_G],
]


def move_group_run_side_effect_home(
    controller: OT3Controller, axes_to_home: List[Axis]
) -> Iterator[Dict[NodeId, MotorPositionStatus]]:
    """Return homed position for axis that is present and was commanded to home."""
    motor_nodes = controller._motor_nodes()
    gantry_homes = {
        axis_to_node(ax): MotorPositionStatus(0.0, 0.0, True, True, MoveCompleteAck(1))
        for ax in Axis.gantry_axes()
        if ax in axes_to_home and axis_to_node(ax) in motor_nodes
    }
    if gantry_homes:
        yield gantry_homes

    pipette_homes = {
        axis_to_node(ax): MotorPositionStatus(0.0, 0.0, True, True, MoveCompleteAck(1))
        for ax in Axis.pipette_axes()
        if ax in axes_to_home and axis_to_node(ax) in motor_nodes
    }
    yield pipette_homes


@pytest.mark.parametrize("axes", home_test_params)
async def test_home_execute(
    controller: OT3Controller,
    axes: List[Axis],
    mock_present_devices: None,
    mock_check_overpressure: None,
) -> None:
    config = {"run.side_effect": move_group_run_side_effect_home(controller, axes)}
    with mock.patch(  # type: ignore [call-overload]
        "opentrons.hardware_control.backends.ot3controller.MoveGroupRunner",
        spec=MoveGroupRunner,
        **config
    ) as mock_runner:
        present_axes = set(ax for ax in axes if controller.axis_is_present(ax))
        controller.set_pressure_sensor_available(Axis.P_L, True)
        controller.set_pressure_sensor_available(Axis.P_R, True)

        # nothing has been homed
        assert not controller._motor_status
        await controller.home(axes, GantryLoad.LOW_THROUGHPUT)
        all_groups = [
            group
            for arg in mock_runner.call_args_list
            for group in arg.kwargs["move_groups"]
        ]

        actual_nodes_steps: Dict[Axis, List[MoveGroupSingleAxisStep]] = {
            ax: [] for ax in axes
        }
        for group in all_groups:
            for step in group:
                for k, v in step.items():
                    actual_nodes_steps[node_to_axis(k)].append(v)

        # every single node will receive one home request and one backoff requests
        for ax in present_axes:
            assert len(actual_nodes_steps[ax]) == 2
            home_request = filter(
                lambda m: m.stop_condition == MoveStopCondition.limit_switch,
                actual_nodes_steps[ax],
            )
            backoff_request = filter(
                lambda m: m.stop_condition == MoveStopCondition.limit_switch_backoff,
                actual_nodes_steps[ax],
            )
            assert len(list(home_request)) == 1
            assert len(list(backoff_request)) == 1

        # all commanded axes have been homed
        assert all(controller._motor_status[axis_to_node(ax)].motor_ok for ax in axes)
        assert controller.check_motor_status(axes)


@pytest.mark.parametrize("axes", home_test_params)
async def test_home_gantry_order(
    controller: OT3Controller,
    mock_move_group_run: mock.AsyncMock,
    axes: List[Axis],
    mock_present_devices: None,
) -> None:
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.MoveGroupRunner",
        spec=MoveGroupRunner,
    ) as mock_runner:
        controller._build_home_gantry_z_runner(axes, GantryLoad.LOW_THROUGHPUT)
        has_mount = len(set(Axis.ot3_mount_axes()) & set(axes)) > 0
        has_x = Axis.X in axes
        has_y = Axis.Y in axes
        if has_mount or has_x or has_y:
            gantry_moves = mock_runner.call_args_list[0].kwargs["move_groups"]

            # mount steps are commanded first
            if has_mount:
                # only one seq per group
                assert len(gantry_moves[0]) == len(gantry_moves[1]) == 1
                assert gantry_moves[0][0].keys() == gantry_moves[1][0].keys()
                assert all(
                    node_to_axis(node) in Axis.ot3_mount_axes()
                    for node in gantry_moves[0][0].keys()
                )
                gantry_moves.pop(0)
                gantry_moves.pop(0)

            # then X
            if has_x:
                # only one seq per group
                assert len(gantry_moves[0]) == len(gantry_moves[1]) == 1
                assert gantry_moves[0][0].keys() == gantry_moves[1][0].keys()
                assert all(
                    node_to_axis(node) == Axis.X for node in gantry_moves[0][0].keys()
                )
                gantry_moves.pop(0)
                gantry_moves.pop(0)

            # lastly Y
            if has_y:
                # only one seq per group
                assert len(gantry_moves[0]) == len(gantry_moves[1]) == 1
                assert gantry_moves[0][0].keys() == gantry_moves[1][0].keys()
                assert all(
                    node_to_axis(node) == Axis.Y for node in gantry_moves[0][0].keys()
                )
                gantry_moves.pop(0)
                gantry_moves.pop(0)

            assert not gantry_moves


@pytest.mark.parametrize("axes", home_test_params)
async def test_home_only_present_devices(
    controller: OT3Controller,
    mock_move_group_run: mock.AsyncMock,
    axes: List[Axis],
    mock_present_devices: None,
    mock_check_overpressure: None,
) -> None:
    starting_position = {
        NodeId.head_l: 20.0,
        NodeId.head_r: 85.0,
        NodeId.gantry_x: 68.0,
        NodeId.gantry_y: 54.0,
        NodeId.pipette_left: 30.0,
        NodeId.pipette_right: 110.0,
    }
    homed_position = {}

    controller._position = starting_position
    controller.set_pressure_sensor_available(Axis.P_L, True)
    controller.set_pressure_sensor_available(Axis.P_R, True)

    mock_move_group_run.side_effect = move_group_run_side_effect_home(controller, axes)

    # nothing has been homed
    assert not controller._motor_status
    await controller.home(axes, GantryLoad.LOW_THROUGHPUT)

    for call in mock_move_group_run.call_args_list:
        # pull the bound-self argument that is the runner instance out of
        # the args list - we can do this because the mock here is the
        # function definition in the class body
        move_group_runner = call[0][0]
        for move_group in move_group_runner._move_groups:
            assert move_group  # don't pass in empty groups
            for move_group_step in move_group:
                assert move_group_step  # don't pass in empty moves
                for node, step in move_group_step.items():
                    assert step  # don't pass in empty steps
                    homed_position[node] = 0.0  # track homed position for node

    # check that the current position is updated
    expected_position = {**starting_position, **homed_position}
    for node, pos in controller._position.items():
        assert pos == expected_position[node]
    # check that the homed axis is tracked by _homed_nodes
    assert controller._motor_status.keys() == homed_position.keys()


async def test_get_attached_instruments(
    controller: OT3Controller, mock_subsystem_manager: SubsystemManager, decoy: Decoy
) -> None:
    pipette_id = "P1KSV33hello"
    gripper_id = "GRPV00fake_serial"
    gripper_name = "Flex Gripper"
    decoy.when(mock_subsystem_manager.tools).then_return(
        ToolSummary(
            left=PipetteInformation(
                name=FirmwarePipetteName.p1000_single,
                name_int=FirmwarePipetteName.p1000_single.value,
                model="3.3",
                serial="hello",
            ),
            right=None,
            gripper=GripperInformation(model="0.0", serial="fake_serial"),
        )
    )

    detected = await controller.get_attached_instruments({})
    assert list(detected.keys()) == [OT3Mount.LEFT, OT3Mount.GRIPPER]
    assert detected[OT3Mount.LEFT]["id"] == pipette_id
    gripper_obj = detected[OT3Mount.GRIPPER]
    assert gripper_obj
    assert gripper_obj["id"] == gripper_id
    config = gripper_obj["config"]
    assert config
    assert config.display_name == gripper_name


async def test_get_attached_instruments_handles_unknown_name(
    controller: OT3Controller, mock_subsystem_manager: SubsystemManager, decoy: Decoy
) -> None:
    decoy.when(mock_subsystem_manager.tools).then_return(
        ToolSummary(
            left=PipetteInformation(
                name=FirmwarePipetteName.unknown,
                name_int=41,
                model="30",
                serial="hello",
            ),
            right=None,
            gripper=GripperInformation(
                model="0.0",
                serial="fake_serial",
            ),
        )
    )
    with pytest.raises(InvalidPipetteName):
        await controller.get_attached_instruments({})


async def test_get_attached_instruments_handles_unknown_model(
    controller: OT3Controller, mock_subsystem_manager: SubsystemManager, decoy: Decoy
) -> None:
    decoy.when(mock_subsystem_manager.tools).then_return(
        ToolSummary(
            left=PipetteInformation(
                name=FirmwarePipetteName.p1000_single,
                name_int=0,
                model="4.1",
                serial="hello",
            ),
            right=None,
            gripper=GripperInformation(model="0", serial="fake_serial"),
        )
    )
    with pytest.raises(InvalidPipetteModel):
        await controller.get_attached_instruments({})


async def test_gripper_home_jaw(
    controller: OT3Controller, mock_move_group_run: mock.AsyncMock
) -> None:
    await controller.gripper_home_jaw(25)
    for call in mock_move_group_run.call_args_list:
        move_group_runner = call[0][0]
        for move_group in move_group_runner._move_groups:
            assert move_group  # don't pass in empty groups
            assert len(move_group) == 1
        # only homing the gripper jaw
        assert list(move_group[0].keys()) == [NodeId.gripper_g]
        step = move_group[0][NodeId.gripper_g]
        assert step.stop_condition == MoveStopCondition.limit_switch
        assert step.move_type == MoveType.home


async def test_gripper_grip(
    controller: OT3Controller, mock_move_group_run: mock.AsyncMock
) -> None:
    await controller.gripper_grip_jaw(duty_cycle=50, expected_displacement=0)
    for call in mock_move_group_run.call_args_list:
        move_group_runner = call[0][0]
        for move_group in move_group_runner._move_groups:
            assert move_group  # don't pass in empty groups
            assert len(move_group) == 1
        # only gripping the gripper jaw
        assert list(move_group[0].keys()) == [NodeId.gripper_g]
        step = move_group[0][NodeId.gripper_g]
        assert step.stop_condition == MoveStopCondition.none
        assert step.move_type == MoveType.grip


async def test_gripper_jaw_width(
    controller: OT3Controller, mock_move_group_run: mock.AsyncMock
) -> None:
    max_jaw_width = 134350
    await controller.gripper_hold_jaw(
        encoder_position_um=int((max_jaw_width - 80000) / 2)
    )
    for call in mock_move_group_run.call_args_list:
        move_group_runner = call[0][0]
        for move_group in move_group_runner._move_groups:
            assert move_group  # don't pass in empty groups
            assert len(move_group) == 1
        # only moving the gripper jaw
        assert list(move_group[0].keys()) == [NodeId.gripper_g]
        step = move_group[0][NodeId.gripper_g]
        assert step.stop_condition == MoveStopCondition.encoder_position
        assert step.move_type == MoveType.linear


async def test_get_limit_switches(
    controller: OT3Controller,
    mock_subsystem_manager: SubsystemManager,
    decoy: Decoy,
) -> None:
    decoy.when(mock_subsystem_manager.device_info).then_return(
        dict(
            (
                _device_info_entry(SubSystem.gantry_x),
                _device_info_entry(SubSystem.gantry_y),
            )
        )
    )
    decoy.when(mock_subsystem_manager.targets).then_return(
        {NodeId.gantry_x, NodeId.gantry_y}
    )

    fake_response = {
        NodeId.gantry_x: UInt8Field(0),
        NodeId.gantry_y: UInt8Field(0),
    }

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.get_limit_switches",
        autospec=True,
    ) as mock_hardware_get_limit_switches:
        mock_hardware_get_limit_switches.return_value = fake_response
        res = await controller.get_limit_switches()
        mock_hardware_get_limit_switches.assert_called_once_with(
            controller._messenger, {NodeId.gantry_x, NodeId.gantry_y}
        )
        assert Axis.X in res
        assert Axis.Y in res


@pytest.mark.parametrize(
    "motor_status,ready",
    [
        ({}, False),
        ({NodeId.gripper_g: MotorStatus(True, True)}, False),
        (
            {
                NodeId.gantry_x: MotorStatus(True, True),
                NodeId.gantry_y: MotorStatus(True, True),
                NodeId.head_l: MotorStatus(False, True),
            },
            False,
        ),
        (
            {
                NodeId.gantry_x: MotorStatus(True, True),
                NodeId.gantry_y: MotorStatus(True, True),
                NodeId.head_l: MotorStatus(True, True),
            },
            True,
        ),
    ],
)
async def test_ready_for_movement(
    controller: OT3Controller,
    motor_status: Dict[NodeId, MotorStatus],
    ready: bool,
) -> None:
    controller._motor_status = motor_status

    axes = [Axis.X, Axis.Y, Axis.Z_L]
    assert controller.check_motor_status(axes) == ready


def probe_move_group_run_side_effect(
    head: NodeId, tool: NodeId
) -> Iterator[Dict[NodeId, MotorPositionStatus]]:
    """Return homed position for axis that is present and was commanded to home."""
    positions = {
        head: MotorPositionStatus(0.0, 0.0, True, True, MoveCompleteAck(1)),
        tool: MotorPositionStatus(0.0, 0.0, True, True, MoveCompleteAck(1)),
    }
    yield positions


@pytest.mark.parametrize("mount", [OT3Mount.LEFT, OT3Mount.RIGHT])
async def test_liquid_probe(
    mount: OT3Mount,
    controller: OT3Controller,
    fake_liquid_settings: LiquidProbeSettings,
    mock_move_group_run: mock.AsyncMock,
    mock_send_stop_threshold: mock.AsyncMock,
) -> None:
    fake_max_p_dist = 70
    head_node = axis_to_node(Axis.by_mount(mount))
    tool_node = sensor_node_for_mount(mount)
    mock_move_group_run.side_effect = probe_move_group_run_side_effect(
        head_node, tool_node
    )
    controller._pipettes_to_monitor_pressure = mock.MagicMock(  # type: ignore[method-assign]
        return_value=[sensor_node_for_mount(mount)]
    )
    try:
        await controller.liquid_probe(
            mount=mount,
            max_p_distance=fake_max_p_dist,
            mount_speed=fake_liquid_settings.mount_speed,
            plunger_speed=fake_liquid_settings.plunger_speed,
            threshold_pascals=fake_liquid_settings.sensor_threshold_pascals,
            plunger_impulse_time=fake_liquid_settings.plunger_impulse_time,
            num_baseline_reads=fake_liquid_settings.samples_for_baselining,
            z_offset_for_plunger_prep=2.0,
        )
    except PipetteLiquidNotFoundError:
        # the move raises a liquid not found now since we don't call the move group and it doesn't
        # get any positions back
        pass
    move_groups = mock_move_group_run.call_args_list[0][0][0]._move_groups
    #  in tool_sensors, pipette moves down, then sensor move goes
    assert move_groups[0][0][tool_node].stop_condition == MoveStopCondition.none
    assert (
        move_groups[1][0][tool_node].stop_condition == MoveStopCondition.sensor_report
    )
    assert len(move_groups) == 2
    assert move_groups[0][0][tool_node]
    assert move_groups[1][0][head_node], move_groups[2][0][tool_node]


async def test_tip_action(
    controller: OT3Controller,
    mock_move_group_run: mock.AsyncMock,
) -> None:
    await controller.home_tip_motors(distance=33, velocity=-5.5, back_off=False)
    for call in mock_move_group_run.call_args_list:
        move_group_runner = call[0][0]
        for move_group in move_group_runner._move_groups:
            assert move_group  # don't pass in empty groups
            assert len(move_group) == 1
        # we should be sending this command to the pipette axes to process.
        assert list(move_group[0].keys()) == [NodeId.pipette_left]
        step = move_group[0][NodeId.pipette_left]
        assert step.stop_condition == MoveStopCondition.limit_switch

    mock_move_group_run.reset_mock()

    await controller.home_tip_motors(distance=33, velocity=-5.5, back_off=True)
    for call in mock_move_group_run.call_args_list:
        move_group_runner = call[0][0]
        move_groups = move_group_runner._move_groups

        for move_group in move_groups:
            assert move_group  # don't pass in empty groups
            assert len(move_group) >= 1

        # we should be sending this command to the pipette axes to process.
        home_step = move_groups[0][0][NodeId.pipette_left]
        assert home_step.stop_condition == MoveStopCondition.limit_switch
        backoff_step = move_groups[0][1][NodeId.pipette_left]
        assert backoff_step.stop_condition == MoveStopCondition.limit_switch_backoff


async def test_update_motor_status(
    mock_messenger: CanMessenger, controller: OT3Controller, mock_present_devices: None
) -> None:
    async def fake_gmp(
        can_messenger: CanMessenger, nodes: Set[NodeId], timeout: float = 1.0
    ) -> Dict[NodeId, MotorPositionStatus]:
        return {
            node: MotorPositionStatus(0.223, 0.323, False, True, None) for node in nodes
        }

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.get_motor_position", fake_gmp
    ):
        nodes = set([NodeId.gantry_x, NodeId.gantry_y, NodeId.head_l, NodeId.head_r])
        await controller.update_motor_status()
        for node in nodes:
            assert controller._position.get(node) == 0.223
            assert controller._encoder_position.get(node) == 0.323
            assert controller._motor_status.get(node) == MotorStatus(False, True)


@pytest.mark.parametrize("axes", home_test_params)
async def test_update_motor_estimation(
    mock_messenger: CanMessenger,
    controller: OT3Controller,
    axes: List[Axis],
    mock_present_devices: None,
) -> None:
    async def fake_umpe(
        can_messenger: CanMessenger, nodes: Set[NodeId], timeout: float = 1.0
    ) -> Dict[NodeId, MotorPositionStatus]:
        return {
            node: MotorPositionStatus(0.223, 0.323, False, True, None) for node in nodes
        }

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.update_motor_position_estimation",
        fake_umpe,
    ):
        nodes = [axis_to_node(a) for a in axes]
        for node in nodes:
            controller._motor_status.update(
                {node: MotorStatus(motor_ok=False, encoder_ok=True)}
            )
        await controller.update_motor_estimation(axes)
        for node in nodes:
            assert controller._position.get(node) == 0.223
            assert controller._encoder_position.get(node) == 0.323
            assert controller._motor_status.get(node) == MotorStatus(False, True)


@pytest.mark.parametrize(
    argnames=["gantry_load", "expected_call"],
    argvalues=[
        [GantryLoad.HIGH_THROUGHPUT, [NodeId.pipette_left]],  # this uses the Q motor
        [GantryLoad.LOW_THROUGHPUT, []],
    ],
)
async def test_set_default_currents(
    controller: OT3Controller,
    gantry_load: GantryLoad,
    expected_call: List[NodeId],
    mock_present_devices: None,
) -> None:
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ) as mocked_currents:
        await controller.update_to_default_current_settings(gantry_load)
        mocked_currents.assert_called_once_with(
            mocked_currents.call_args_list[0][0][0],
            mocked_currents.call_args_list[0][0][1],
            use_tip_motor_message_for=expected_call,
        )
        these_current_settings = controller._current_settings
        assert these_current_settings
        for k, v in these_current_settings.items():
            if k == Axis.P_L and (
                gantry_load == GantryLoad.HIGH_THROUGHPUT
                and expected_call[0] == NodeId.pipette_left
            ):
                # q motor config
                v = these_current_settings[Axis.Q]
                assert (
                    mocked_currents.call_args_list[0][0][1][axis_to_node(k)]
                    == v.as_tuple()
                )
            else:
                assert (
                    mocked_currents.call_args_list[0][0][1][axis_to_node(k)]
                    == v.as_tuple()
                )


@pytest.mark.parametrize(
    argnames=["active_current", "gantry_load", "expected_call"],
    argvalues=[
        [
            {Axis.X: 1.0, Axis.Y: 2.0},
            GantryLoad.LOW_THROUGHPUT,
            [{NodeId.gantry_x: 1.0, NodeId.gantry_y: 2.0}, []],
        ],
        [
            {Axis.Q: 1.5},
            GantryLoad.HIGH_THROUGHPUT,
            [{NodeId.pipette_left: 1.5}, [NodeId.pipette_left]],
        ],
    ],
)
async def test_set_run_current(
    controller: OT3Controller,
    active_current: OT3AxisMap[float],
    gantry_load: GantryLoad,
    expected_call: List[Any],
    mock_present_devices: None,
) -> None:
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ):
        with mock.patch(
            "opentrons.hardware_control.backends.ot3controller.set_run_current",
            spec=current_settings.set_run_current,
        ) as mocked_currents:
            await controller.update_to_default_current_settings(gantry_load)
            await controller.set_active_current(active_current)
            mocked_currents.assert_called_once_with(
                mocked_currents.call_args_list[0][0][0],
                expected_call[0],
                use_tip_motor_message_for=expected_call[1],
            )


@pytest.mark.parametrize(
    argnames=["hold_current", "gantry_load", "expected_call"],
    argvalues=[
        [
            {Axis.P_L: 0.5, Axis.Y: 0.8},
            GantryLoad.LOW_THROUGHPUT,
            [{NodeId.pipette_left: 0.5, NodeId.gantry_y: 0.8}, []],
        ],
        [
            {Axis.Q: 0.8},
            GantryLoad.HIGH_THROUGHPUT,
            [{NodeId.pipette_left: 0.8}, [NodeId.pipette_left]],
        ],
    ],
)
async def test_set_hold_current(
    controller: OT3Controller,
    hold_current: OT3AxisMap[float],
    gantry_load: GantryLoad,
    expected_call: List[Any],
    mock_present_devices: None,
) -> None:
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ):
        with mock.patch(
            "opentrons.hardware_control.backends.ot3controller.set_hold_current",
            spec=current_settings.set_hold_current,
        ) as mocked_currents:
            await controller.update_to_default_current_settings(gantry_load)
            await controller.set_hold_current(hold_current)
            mocked_currents.assert_called_once_with(
                mocked_currents.call_args_list[0][0][0],
                expected_call[0],
                use_tip_motor_message_for=expected_call[1],
            )


async def test_update_required_flag(
    mock_messenger: CanMessenger,
    controller: OT3Controller,
    mock_subsystem_manager: SubsystemManager,
    decoy: Decoy,
) -> None:
    """Test that FirmwareUpdateRequired is raised when update_required flag is set."""
    axes = [Axis.X, Axis.Y]
    decoy.when(mock_subsystem_manager.update_required).then_return(True)
    controller._initialized = True
    with pytest.raises(FirmwareUpdateRequiredError):
        await controller.home(axes, gantry_load=GantryLoad.LOW_THROUGHPUT)


async def test_update_required_bypass_firmware_update(
    controller: OT3Controller, mock_subsystem_manager: SubsystemManager, decoy: Decoy
) -> None:
    """Do not raise FirmwareUpdateRequired for update_firmware."""
    decoy.when(mock_subsystem_manager.update_required).then_return(True)

    async def _mock_update() -> AsyncIterator[UpdateStatus]:
        yield UpdateStatus(
            subsystem=SubSystem.gantry_x, state=UpdateState.done, progress=100
        )

    decoy.when(mock_subsystem_manager.update_firmware(set(), False)).then_return(
        _mock_update()
    )
    controller._initialized = True
    async for status_element in controller.update_firmware(set()):
        pass
    # raise FirmwareUpdateRequired if the _update_required flag is set
    controller._initialized = True
    with pytest.raises(FirmwareUpdateRequiredError):
        await controller.home([Axis.X], gantry_load=GantryLoad.LOW_THROUGHPUT)


async def test_update_required_flag_false(
    controller: OT3Controller,
    mock_subsystem_manager: SubsystemManager,
    decoy: Decoy,
    mock_present_devices: None,
) -> None:
    """Do not raise FirmwareUpdateRequired if update_required is False."""

    decoy.when(mock_subsystem_manager.device_info).then_return(
        dict(
            (
                _device_info_entry(SubSystem.gantry_x),
                _device_info_entry(SubSystem.gantry_y),
            )
        )
    )
    decoy.when(mock_subsystem_manager.update_required).then_return(False)

    for node in controller._motor_nodes():
        controller._motor_status.update(
            {node: MotorStatus(motor_ok=False, encoder_ok=True)}
        )
    # update_required is false so dont raise FirmwareUpdateRequired
    controller._initialized = True
    controller._check_updates = True
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ):
        await controller.update_to_default_current_settings(GantryLoad.LOW_THROUGHPUT)

    async def fake_src(
        can_messenger: CanMessenger,
        current_settings: Dict[NodeId, float],
        use_tip_motor_message_for: List[NodeId],
    ) -> None:
        return None

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_run_current",
        fake_src,
    ):
        await controller.set_active_current({Axis.X: 2})


async def test_update_required_flag_initialized(
    controller: OT3Controller,
    mock_subsystem_manager: SubsystemManager,
    mock_present_devices: None,
    decoy: Decoy,
) -> None:
    """Do not raise FirmwareUpdateRequired if initialized is False."""
    decoy.when(mock_subsystem_manager.update_required).then_return(True)

    for node in controller._motor_nodes():
        controller._motor_status.update(
            {node: MotorStatus(motor_ok=False, encoder_ok=True)}
        )

    # update_required is true, but initialized is false so dont raise FirmwareUpdateRequired
    controller._initialized = False
    controller._check_updates = True
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ):
        await controller.update_to_default_current_settings(GantryLoad.LOW_THROUGHPUT)

    async def fake_src(
        can_messenger: CanMessenger,
        current_settings: Dict[NodeId, float],
        use_tip_motor_message_for: List[NodeId],
    ) -> None:
        return None

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_run_current",
        fake_src,
    ):
        await controller.set_active_current({Axis.X: 2})


async def test_update_required_flag_disabled(
    controller: OT3Controller,
    mock_present_devices: None,
    decoy: Decoy,
    mock_subsystem_manager: SubsystemManager,
) -> None:
    """Do not raise FirmwareUpdateRequired if check_updates is False."""
    decoy.when(mock_subsystem_manager.update_required).then_return(True)

    for node in controller._motor_nodes():
        controller._motor_status.update(
            {node: MotorStatus(motor_ok=False, encoder_ok=True)}
        )
    # update_required and initialized are true, but not check_updates, no exception
    controller._initialized = False
    controller._check_updates = False
    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_currents",
        spec=current_settings.set_currents,
    ):
        await controller.update_to_default_current_settings(GantryLoad.LOW_THROUGHPUT)

    async def fake_src(
        can_messenger: CanMessenger,
        current_settings: Dict[NodeId, float],
        use_tip_motor_message_for: List[NodeId],
    ) -> None:
        return None

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_run_current",
        fake_src,
    ):
        await controller.set_active_current({Axis.X: 2})


@pytest.mark.parametrize(
    "estop_state, expectation",
    [
        [EstopState.DISENGAGED, does_not_raise()],
        [EstopState.NOT_PRESENT, pytest.raises(EStopNotPresentError)],
        [EstopState.PHYSICALLY_ENGAGED, pytest.raises(EStopActivatedError)],
        [EstopState.LOGICALLY_ENGAGED, pytest.raises(EStopActivatedError)],
    ],
)
async def test_requires_estop(
    controller: OT3Controller,
    mock_estop_state_machine: EstopStateMachine,
    decoy: Decoy,
    estop_state: EstopState,
    expectation: ContextManager[None],
    mock_check_overpressure: None,
) -> None:
    """Test that the estop state machine raises properly."""
    decoy.when(mock_estop_state_machine.state).then_return(estop_state)

    with expectation:
        await controller.home([Axis.X, Axis.Y], gantry_load=GantryLoad.LOW_THROUGHPUT)


@pytest.mark.parametrize(
    "run_currents, hold_currents",
    [
        [{Axis.X: 1.0}, {}],
        [{}, {Axis.X: 1.0}],
        [{Axis.X: 1.0}, {Axis.X: 1.0}],
        [{}, {}],
    ],
)
async def test_motor_current(
    controller: OT3Controller,
    run_currents: OT3AxisMap[float],
    hold_currents: OT3AxisMap[float],
) -> None:
    """Test that restore current actually works."""
    controller._current_settings = {Axis.X: CurrentConfig(0.0, 0.0)}

    with mock.patch.object(controller, "set_active_current") as mock_run_currents:
        with mock.patch.object(controller, "set_hold_current") as mock_hold_currents:
            with mock.patch.object(controller, "set_default_currents") as mock_default:

                async with controller.motor_current(run_currents, hold_currents):
                    await controller.update_position()

                if not run_currents and not hold_currents:
                    mock_default.assert_called_once()
                    mock_run_currents.assert_not_called()
                    mock_hold_currents.assert_not_called()
                elif run_currents:
                    mock_run_currents.assert_has_calls(
                        [
                            mock.call({Axis.X: 1.0}),
                            mock.call({Axis.X: 0.0}),
                        ],
                    )
                elif hold_currents:
                    mock_hold_currents.assert_has_calls(
                        [
                            mock.call({Axis.X: 1.0}),
                            mock.call({Axis.X: 0.0}),
                        ],
                    )


@pytest.mark.parametrize(
    ["axes", "expected_tip_nodes", "expected_normal_nodes"],
    [
        [
            [Axis.X, Axis.Z_L, Axis.Q],
            {NodeId.pipette_left},
            {NodeId.gantry_x, NodeId.head_l},
        ],
        [[Axis.X, Axis.Z_L], {}, {NodeId.gantry_x, NodeId.head_l}],
        [[Axis.Q], {NodeId.pipette_left}, {}],
        [
            [Axis.X, Axis.Z_L, Axis.P_L, Axis.Q],
            {NodeId.pipette_left},
            {NodeId.gantry_x, NodeId.head_l, NodeId.pipette_left},
        ],
    ],
)
async def test_engage_motors(
    controller: OT3Controller,
    axes: List[Axis],
    expected_tip_nodes: Set[NodeId],
    expected_normal_nodes: Set[NodeId],
) -> None:
    """Test that engaging/disengaging motors works."""

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_enable_motor",
        autospec=True,
    ) as set_normal_axes:
        with mock.patch(
            "opentrons.hardware_control.backends.ot3controller.set_enable_tip_motor",
            autospec=True,
        ) as set_tip_axes:
            await controller.engage_axes(axes=axes)

            if len(expected_normal_nodes) > 0:
                set_normal_axes.assert_awaited_with(
                    controller._messenger, expected_normal_nodes
                )
            else:
                set_normal_axes.assert_not_awaited()
            if len(expected_tip_nodes) > 0:
                set_tip_axes.assert_awaited_with(
                    controller._messenger, expected_tip_nodes
                )
            else:
                set_tip_axes.assert_not_awaited()

    with mock.patch(
        "opentrons.hardware_control.backends.ot3controller.set_disable_motor",
        autospec=True,
    ) as set_normal_axes:
        with mock.patch(
            "opentrons.hardware_control.backends.ot3controller.set_disable_tip_motor",
            autospec=True,
        ) as set_tip_axes:
            await controller.disengage_axes(axes=axes)

            if len(expected_normal_nodes) > 0:
                set_normal_axes.assert_awaited_with(
                    controller._messenger, expected_normal_nodes
                )
            else:
                set_normal_axes.assert_not_awaited()
            if len(expected_tip_nodes) > 0:
                set_tip_axes.assert_awaited_with(
                    controller._messenger, expected_tip_nodes
                )
            else:
                set_tip_axes.assert_not_awaited()


@pytest.mark.parametrize(
    "expected_grip_width,actual_grip_width,wider,narrower,allowed_error,hard_max,hard_min,raise_error",
    [
        (80, 80, 0, 0, 0, 92, 60, False),
        (80, 81, 0, 0, 0, 92, 60, True),
        (80, 79, 0, 0, 0, 92, 60, True),
        (80, 81, 1, 0, 0, 92, 60, False),
        (80, 79, 0, 1, 0, 92, 60, False),
        (80, 81, 0, 0, 1, 92, 60, False),
        (80, 79, 0, 0, 1, 92, 60, False),
        (80, 45, 40, 0, 1, 92, 60, True),
        (80, 100, 0, 40, 0, 92, 60, True),
    ],
)
def test_grip_error_detection(
    controller: OT3Controller,
    expected_grip_width: float,
    actual_grip_width: float,
    wider: float,
    narrower: float,
    allowed_error: float,
    hard_max: float,
    hard_min: float,
    raise_error: bool,
) -> None:
    context = cast(
        AbstractContextManager[None],
        pytest.raises(FailedGripperPickupError) if raise_error else does_not_raise(),
    )
    with context:
        controller.check_gripper_position_within_bounds(
            expected_grip_width,
            wider,
            narrower,
            actual_grip_width,
            allowed_error,
            hard_max,
            hard_min,
        )


def move_group_run_side_effect(
    controller: OT3Controller, target_pos: Dict[Axis, float]
) -> Iterator[Dict[NodeId, MotorPositionStatus]]:
    """Return homed position for axis that is present and was commanded to home."""
    motor_nodes = controller._motor_nodes()
    target_nodes = {axis_to_node(ax): ax for ax in target_pos.keys() if ax != Axis.Q}
    res = {}
    for node in motor_nodes:
        pos = 0.0
        if target_nodes.get(node):
            pos = target_pos[target_nodes[node]]
        res[node] = MotorPositionStatus(pos, pos, True, True, MoveCompleteAck(1))
    yield res


@pytest.mark.parametrize(
    argnames=["origin_pos", "target_pos", "expected_pos", "gear_position"],
    argvalues=[
        [
            {
                Axis.X: 0,
                Axis.Y: 0,
                Axis.Z_L: 0,
                Axis.Z_R: 0,
                Axis.P_L: 0,
                Axis.P_R: 0,
                Axis.Z_G: 0,
                Axis.G: 0,
                Axis.Q: 0,
            },
            {Axis.Q: 10},
            {
                Axis.X: 0,
                Axis.Y: 0,
                Axis.Z_L: 0,
                Axis.Z_R: 0,
                Axis.P_L: 0,
                Axis.P_R: 0,
                Axis.Z_G: 0,
                Axis.G: 0,
            },
            10,
        ],
        [
            {
                Axis.X: 0,
                Axis.Y: 0,
                Axis.Z_L: 0,
                Axis.Z_R: 0,
                Axis.P_L: 0,
                Axis.P_R: 0,
                Axis.Z_G: 0,
                Axis.G: 0,
            },
            {Axis.Q: 10},
            {
                Axis.X: 0,
                Axis.Y: 0,
                Axis.Z_L: 0,
                Axis.Z_R: 0,
                Axis.P_L: 0,
                Axis.P_R: 0,
                Axis.Z_G: 0,
                Axis.G: 0,
            },
            None,
        ],
        [
            {
                Axis.X: 0,
                Axis.Y: 0,
                Axis.Z_L: 0,
                Axis.Z_R: 0,
            },
            {
                Axis.X: 10,
                Axis.Y: 10,
                Axis.Z_L: 10,
            },
            {
                Axis.X: 10,
                Axis.Y: 10,
                Axis.Z_L: 10,
                Axis.Z_R: 0,
                Axis.P_L: 0,
                Axis.P_R: 0,
                Axis.Z_G: 0,
                Axis.G: 0,
            },
            None,
        ],
    ],
)
async def test_controller_move(
    controller: OT3Controller,
    mock_present_devices: mock.AsyncMock,
    origin_pos: Dict[Axis, float],
    target_pos: Dict[Axis, float],
    expected_pos: Dict[Axis, float],
    gear_position: Optional[float],
) -> None:
    from copy import deepcopy

    controller.update_constraints_for_gantry_load(GantryLoad.HIGH_THROUGHPUT)

    run_target_pos = deepcopy(target_pos)
    config = {"run.side_effect": move_group_run_side_effect(controller, run_target_pos)}
    with mock.patch(  # type: ignore [call-overload]
        "opentrons.hardware_control.backends.ot3controller.MoveGroupRunner",
        spec=MoveGroupRunner,
        **config
    ):
        await controller.move(origin_pos, target_pos, 100)
        position = await controller.update_position()
        gear_position = controller.gear_motor_position

        assert position == expected_pos
        assert gear_position == gear_position


@pytest.mark.parametrize(
    argnames=["axes", "pipette_has_sensor"],
    argvalues=[[[Axis.P_L, Axis.P_R], True], [[Axis.P_L, Axis.P_R], False]],
)
async def test_pressure_disable(
    controller: OT3Controller,
    axes: List[Axis],
    mock_present_devices: None,
    mock_check_overpressure: None,
    pipette_has_sensor: bool,
) -> None:
    config = {"run.side_effect": move_group_run_side_effect_home(controller, axes)}
    with mock.patch(  # type: ignore [call-overload]
        "opentrons.hardware_control.backends.ot3controller.MoveGroupRunner",
        spec=MoveGroupRunner,
        **config
    ):
        with mock.patch.object(controller, "_monitor_overpressure") as monitor:
            controller.set_pressure_sensor_available(Axis.P_L, pipette_has_sensor)
            controller.set_pressure_sensor_available(Axis.P_R, True)

            await controller.home(axes, GantryLoad.LOW_THROUGHPUT)

            if pipette_has_sensor:
                monitor.assert_called_once_with(
                    [NodeId.pipette_left, NodeId.pipette_right]
                )
            else:
                monitor.assert_called_once_with([NodeId.pipette_right])
