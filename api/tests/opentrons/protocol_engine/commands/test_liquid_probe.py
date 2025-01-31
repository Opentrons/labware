"""Test LiquidProbe commands."""

from datetime import datetime
from typing import Type, Union

from decoy import matchers, Decoy
import pytest

from opentrons.protocol_engine.errors.exceptions import (
    MustHomeError,
    PipetteNotReadyToAspirateError,
    TipNotAttachedError,
    TipNotEmptyError,
)
from opentrons_shared_data.errors.exceptions import (
    PipetteLiquidNotFoundError,
    StallOrCollisionDetectedError,
)
from opentrons_shared_data.pipette.pipette_definition import (
    AvailableSensorDefinition,
    SupportedTipsDefinition,
)

from opentrons_shared_data.pipette.types import PipetteNameType

from opentrons.protocol_engine.commands.pipetting_common import LiquidNotFoundError
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.pipettes import (
    StaticPipetteConfig,
    BoundingNozzlesOffsets,
    PipetteBoundingBoxOffsets,
)
from opentrons.protocol_engine.state import update_types
from opentrons.types import MountType, Point
from opentrons.protocol_engine import WellLocation, WellOrigin, WellOffset, DeckPoint

from opentrons.protocol_engine.commands.liquid_probe import (
    LiquidProbeParams,
    LiquidProbeResult,
    LiquidProbeImplementation,
    TryLiquidProbeParams,
    TryLiquidProbeResult,
    TryLiquidProbeImplementation,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError


from opentrons.protocol_engine.execution import (
    MovementHandler,
    PipettingHandler,
    GantryMover,
)
from opentrons.protocol_engine.resources.model_utils import ModelUtils

from ..pipette_fixtures import get_default_nozzle_map

EitherImplementationType = Union[
    Type[LiquidProbeImplementation], Type[TryLiquidProbeImplementation]
]
EitherImplementation = Union[LiquidProbeImplementation, TryLiquidProbeImplementation]
EitherParamsType = Union[Type[LiquidProbeParams], Type[TryLiquidProbeParams]]
EitherResultType = Union[Type[LiquidProbeResult], Type[TryLiquidProbeResult]]


@pytest.fixture
def available_sensors() -> AvailableSensorDefinition:
    """Provide a list of sensors."""
    return AvailableSensorDefinition(sensors=["pressure", "capacitive", "environment"])


@pytest.fixture(
    params=[
        (LiquidProbeImplementation, LiquidProbeParams, LiquidProbeResult),
        (TryLiquidProbeImplementation, TryLiquidProbeParams, TryLiquidProbeResult),
    ]
)
def types(
    request: pytest.FixtureRequest,
) -> tuple[EitherImplementationType, EitherParamsType, EitherResultType]:
    """Return a tuple of types associated with a single variant of the command."""
    return request.param  # type: ignore[no-any-return]


@pytest.fixture
def implementation_type(
    types: tuple[EitherImplementationType, object, object],
) -> EitherImplementationType:
    """Return an implementation type. Kept in sync with the params and result types."""
    return types[0]


@pytest.fixture
def params_type(types: tuple[object, EitherParamsType, object]) -> EitherParamsType:
    """Return a params type. Kept in sync with the implementation and result types."""
    return types[1]


@pytest.fixture
def result_type(types: tuple[object, object, EitherResultType]) -> EitherResultType:
    """Return a result type. Kept in sync with the implementation and params types."""
    return types[2]


@pytest.fixture
def subject(
    implementation_type: EitherImplementationType,
    state_view: StateView,
    movement: MovementHandler,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
) -> Union[LiquidProbeImplementation, TryLiquidProbeImplementation]:
    """Get the implementation subject."""
    return implementation_type(
        state_view=state_view,
        pipetting=pipetting,
        movement=movement,
        gantry_mover=gantry_mover,
        model_utils=model_utils,
    )


async def test_liquid_probe_implementation(
    decoy: Decoy,
    movement: MovementHandler,
    state_view: StateView,
    pipetting: PipettingHandler,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    result_type: EitherResultType,
    model_utils: ModelUtils,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should move to the destination and do a liquid probe there."""
    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = params_type(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=location,
    )

    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id="abc")).then_return(
        0
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_return(Point(x=1, y=2, z=3))

    decoy.when(
        await pipetting.liquid_probe_in_place(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=location,
        ),
    ).then_return(15.0)

    decoy.when(
        state_view.geometry.get_well_volume_at_height(
            labware_id="123",
            well_name="A3",
            height=15.0,
        ),
    ).then_return(30.0)
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld("abc")
    ).then_return(True)

    decoy.when(state_view.pipettes.get_config("abc")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )

    timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)

    result = await subject.execute(data)

    assert type(result.public) is result_type  # Pydantic v1 only compares the fields.
    assert result == SuccessData(
        public=result_type(z_position=15.0, position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(labware_id="123", well_name="A3"),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            liquid_probed=update_types.LiquidProbedUpdate(
                labware_id="123",
                well_name="A3",
                height=15.0,
                volume=30.0,
                last_probed=timestamp,
            ),
        ),
    )


async def test_liquid_not_found_error(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    model_utils: ModelUtils,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should return a liquid not found error if the hardware API indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = WellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    position = Point(x=1, y=2, z=3)

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    data = params_type(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
    )

    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id)).then_return(0)
    decoy.when(state_view.pipettes.get_config("pipette-id")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_return(position)
    decoy.when(
        await pipetting.liquid_probe_in_place(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        ),
    ).then_raise(PipetteLiquidNotFoundError())
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id)
    ).then_return(True)
    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    result = await subject.execute(data)

    expected_state_update = update_types.StateUpdate(
        pipette_location=update_types.PipetteLocationUpdate(
            pipette_id=pipette_id,
            new_location=update_types.Well(labware_id=labware_id, well_name=well_name),
            new_deck_point=DeckPoint(x=position.x, y=position.y, z=position.z),
        ),
        liquid_probed=update_types.LiquidProbedUpdate(
            labware_id=labware_id,
            well_name=well_name,
            height=update_types.CLEAR,
            volume=update_types.CLEAR,
            last_probed=error_timestamp,
        ),
    )
    if isinstance(subject, LiquidProbeImplementation):
        assert result == DefinedErrorData(
            public=LiquidNotFoundError.model_construct(
                id=error_id,
                createdAt=error_timestamp,
                wrappedErrors=[matchers.Anything()],
            ),
            state_update=expected_state_update,
        )
    else:
        assert result == SuccessData(
            public=TryLiquidProbeResult(
                z_position=None,
                position=DeckPoint(x=position.x, y=position.y, z=position.z),
            ),
            state_update=expected_state_update,
        )


async def test_liquid_probe_tip_checking(
    decoy: Decoy,
    state_view: StateView,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should raise a TipNotAttached error if the state view indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = WellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    data = params_type(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
    )
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id)
    ).then_return(True)
    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id)).then_raise(
        TipNotAttachedError()
    )
    decoy.when(state_view.pipettes.get_config("pipette-id")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    with pytest.raises(TipNotAttachedError):
        await subject.execute(data)


async def test_liquid_probe_plunger_preparedness_checking(
    decoy: Decoy,
    state_view: StateView,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should raise a PipetteNotReadyToAspirate error if the state view indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = WellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    data = params_type(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
    )
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id)
    ).then_return(True)
    decoy.when(state_view.pipettes.get_config("pipette-id")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id)).then_return(None)
    with pytest.raises(PipetteNotReadyToAspirateError):
        await subject.execute(data)


async def test_liquid_probe_volume_checking(
    decoy: Decoy,
    state_view: StateView,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should return a TipNotEmptyError if the hardware API indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = WellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    data = params_type(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
    )

    decoy.when(
        state_view.pipettes.get_aspirated_volume(pipette_id=pipette_id),
    ).then_return(123)
    decoy.when(state_view.pipettes.get_config("pipette-id")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id)
    ).then_return(True)

    with pytest.raises(TipNotEmptyError):
        await subject.execute(data)

    decoy.when(
        state_view.pipettes.get_aspirated_volume(pipette_id=pipette_id),
    ).then_return(None)

    with pytest.raises(PipetteNotReadyToAspirateError):
        await subject.execute(data)


async def test_liquid_probe_location_checking(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should return a PositionUnkownError if the hardware API indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = WellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    data = params_type(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
    )
    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id)).then_return(0)
    decoy.when(state_view.pipettes.get_config("pipette-id")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    decoy.when(
        await movement.check_for_valid_position(
            mount=MountType.LEFT,
        ),
    ).then_return(False)
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld(pipette_id)
    ).then_return(True)
    with pytest.raises(MustHomeError):
        await subject.execute(data)


async def test_liquid_probe_stall(
    decoy: Decoy,
    movement: MovementHandler,
    state_view: StateView,
    pipetting: PipettingHandler,
    subject: EitherImplementation,
    params_type: EitherParamsType,
    model_utils: ModelUtils,
    available_sensors: AvailableSensorDefinition,
    supported_tip_fixture: SupportedTipsDefinition,
) -> None:
    """It should move to the destination and do a liquid probe there."""
    location = WellLocation(origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1))

    data = params_type(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=location,
    )

    decoy.when(state_view.pipettes.get_aspirated_volume(pipette_id="abc")).then_return(
        0
    )
    decoy.when(state_view.pipettes.get_config("abc")).then_return(
        StaticPipetteConfig(
            min_volume=1,
            max_volume=9001,
            channels=1,
            model="blah",
            display_name="bleh",
            serial_number="",
            tip_configuration_lookup_table={9001: supported_tip_fixture},
            nominal_tip_overlap={},
            home_position=0,
            nozzle_offset_z=0,
            bounding_nozzle_offsets=BoundingNozzlesOffsets(
                back_left_offset=Point(x=10, y=20, z=30),
                front_right_offset=Point(x=40, y=50, z=60),
            ),
            default_nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            pipette_bounding_box_offsets=PipetteBoundingBoxOffsets(
                back_left_corner=Point(x=10, y=20, z=30),
                front_right_corner=Point(x=40, y=50, z=60),
                front_left_corner=Point(x=10, y=50, z=60),
                back_right_corner=Point(x=40, y=20, z=60),
            ),
            lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        )
    )
    decoy.when(
        state_view.pipettes.get_nozzle_configuration_supports_lld("abc")
    ).then_return(True)

    decoy.when(
        await movement.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_raise(StallOrCollisionDetectedError())

    error_id = "error-id"
    timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)
    decoy.when(model_utils.generate_id()).then_return(error_id)

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id, createdAt=timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(pipette_location=update_types.CLEAR),
    )
