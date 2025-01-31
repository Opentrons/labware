"""Test load pipette commands."""
from opentrons.protocol_engine.state.update_types import (
    LoadPipetteUpdate,
    PipetteConfigUpdate,
    StateUpdate,
    PipetteUnknownFluidUpdate,
)
import pytest
from decoy import Decoy

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.pipette.pipette_definition import AvailableSensorDefinition
from opentrons.types import MountType, Point

from opentrons.protocol_engine.errors import InvalidSpecificationForRobotTypeError
from opentrons.protocol_engine.types import FlowRates
from opentrons.protocol_engine.execution import LoadedPipetteData, EquipmentHandler
from opentrons.protocol_engine.resources.pipette_data_provider import (
    LoadedStaticPipetteData,
)
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.load_pipette import (
    LoadPipetteParams,
    LoadPipetteResult,
    LoadPipetteImplementation,
)
from ..pipette_fixtures import get_default_nozzle_map


@pytest.fixture
def available_sensors() -> AvailableSensorDefinition:
    """Provide a list of sensors."""
    return AvailableSensorDefinition(sensors=["pressure", "capacitive", "environment"])


@pytest.mark.parametrize(
    "data",
    [
        LoadPipetteParams(
            pipetteName=PipetteNameType.P300_SINGLE,
            mount=MountType.LEFT,
            pipetteId="some id",
        ),
        LoadPipetteParams(
            pipetteName=PipetteNameType.P300_SINGLE,
            mount=MountType.LEFT,
            pipetteId="some id",
            tipOverlapNotAfterVersion="v2",
        ),
    ],
)
async def test_load_pipette_implementation(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    data: LoadPipetteParams,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """A LoadPipette command should have an execution implementation."""
    subject = LoadPipetteImplementation(equipment=equipment, state_view=state_view)
    config_data = LoadedStaticPipetteData(
        model="some-model",
        display_name="Hello",
        min_volume=0,
        max_volume=251,
        channels=8,
        home_position=123.1,
        nozzle_offset_z=331.0,
        flow_rates=FlowRates(
            default_aspirate={}, default_dispense={}, default_blow_out={}
        ),
        tip_configuration_lookup_table={},
        nominal_tip_overlap={},
        nozzle_map=get_default_nozzle_map(PipetteNameType.P300_MULTI),
        back_left_corner_offset=Point(x=1, y=2, z=3),
        front_right_corner_offset=Point(x=4, y=5, z=6),
        pipette_lld_settings={},
        plunger_positions={
            "top": 0.0,
            "bottom": 5.0,
            "blow_out": 19.0,
            "drop_tip": 20.0,
        },
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )

    decoy.when(
        await equipment.load_pipette(
            pipette_name=PipetteNameType.P300_SINGLE,
            mount=MountType.LEFT,
            pipette_id="some id",
            tip_overlap_version=data.tipOverlapNotAfterVersion,
        )
    ).then_return(
        LoadedPipetteData(
            pipette_id="some id",
            serial_number="some-serial-number",
            static_config=config_data,
        )
    )

    result = await subject.execute(data)

    assert result == SuccessData(
        public=LoadPipetteResult(pipetteId="some id"),
        state_update=StateUpdate(
            loaded_pipette=LoadPipetteUpdate(
                pipette_name=PipetteNameType.P300_SINGLE,
                mount=MountType.LEFT,
                pipette_id="some id",
                liquid_presence_detection=None,
            ),
            pipette_config=PipetteConfigUpdate(
                pipette_id="some id",
                serial_number="some-serial-number",
                config=config_data,
            ),
            pipette_aspirated_fluid=PipetteUnknownFluidUpdate(pipette_id="some id"),
        ),
    )


async def test_load_pipette_implementation_96_channel(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """A LoadPipette command should have an execution implementation."""
    subject = LoadPipetteImplementation(equipment=equipment, state_view=state_view)

    data = LoadPipetteParams(
        pipetteName=PipetteNameType.P1000_96,
        mount=MountType.LEFT,
        pipetteId="some id",
    )
    config_data = LoadedStaticPipetteData(
        model="p1000_96_v3.3",
        display_name="Hello",
        min_volume=0,
        max_volume=251,
        channels=96,
        home_position=123.1,
        nozzle_offset_z=331.0,
        flow_rates=FlowRates(
            default_aspirate={}, default_dispense={}, default_blow_out={}
        ),
        tip_configuration_lookup_table={},
        nominal_tip_overlap={},
        nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
        back_left_corner_offset=Point(x=1, y=2, z=3),
        front_right_corner_offset=Point(x=4, y=5, z=6),
        pipette_lld_settings={},
        plunger_positions={
            "top": 0.0,
            "bottom": 5.0,
            "blow_out": 19.0,
            "drop_tip": 20.0,
        },
        shaft_ul_per_mm=5.0,
        available_sensors=available_sensors,
    )

    decoy.when(
        await equipment.load_pipette(
            pipette_name=PipetteNameType.P1000_96,
            mount=MountType.LEFT,
            pipette_id="some id",
            tip_overlap_version=None,
        )
    ).then_return(
        LoadedPipetteData(
            pipette_id="pipette-id", serial_number="some id", static_config=config_data
        )
    )

    result = await subject.execute(data)

    assert result == SuccessData(
        public=LoadPipetteResult(pipetteId="pipette-id"),
        state_update=StateUpdate(
            loaded_pipette=LoadPipetteUpdate(
                pipette_name=PipetteNameType.P1000_96,
                mount=MountType.LEFT,
                pipette_id="pipette-id",
                liquid_presence_detection=None,
            ),
            pipette_config=PipetteConfigUpdate(
                pipette_id="pipette-id",
                serial_number="some id",
                config=config_data,
            ),
            pipette_aspirated_fluid=PipetteUnknownFluidUpdate(pipette_id="pipette-id"),
        ),
    )


@pytest.mark.parametrize(
    argnames=["pipette_type", "robot_type"],
    argvalues=[
        (PipetteNameType.P300_SINGLE, "OT-3 Standard"),
        (PipetteNameType.P20_MULTI_GEN2, "OT-3 Standard"),
        (PipetteNameType.P10_MULTI, "OT-3 Standard"),
        (PipetteNameType.P1000_SINGLE, "OT-3 Standard"),
        (PipetteNameType.P1000_MULTI_FLEX, "OT-2 Standard"),
        (PipetteNameType.P50_SINGLE_FLEX, "OT-2 Standard"),
        (PipetteNameType.P1000_96, "OT-2 Standard"),
    ],
)
async def test_loading_wrong_pipette_for_robot_raises_error(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    pipette_type: PipetteNameType,
    robot_type: RobotType,
) -> None:
    """A LoadPipette command should raise error when pipette is not supported on robot."""
    subject = LoadPipetteImplementation(equipment=equipment, state_view=state_view)
    p1000_params = LoadPipetteParams(
        pipetteName=pipette_type,
        mount=MountType.LEFT,
        pipetteId="p1000-id",
    )
    decoy.when(state_view.config.robot_type).then_return(robot_type)
    with pytest.raises(InvalidSpecificationForRobotTypeError):
        await subject.execute(p1000_params)
