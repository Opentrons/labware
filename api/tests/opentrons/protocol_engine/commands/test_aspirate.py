"""Test aspirate commands."""

from datetime import datetime

from opentrons_shared_data.errors.exceptions import (
    PipetteOverpressureError,
    StallOrCollisionDetectedError,
)
from decoy import matchers, Decoy
import pytest

from opentrons.protocol_engine.commands.pipetting_common import OverpressureError
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.state import update_types
from opentrons.types import Point
from opentrons.protocol_engine import (
    LiquidHandlingWellLocation,
    WellOrigin,
    WellOffset,
    DeckPoint,
)

from opentrons.protocol_engine.commands.aspirate import (
    AspirateParams,
    AspirateResult,
    AspirateImplementation,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData

from opentrons.protocol_engine.state.state import StateView

from opentrons.protocol_engine.execution import (
    MovementHandler,
    PipettingHandler,
)
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.types import (
    CurrentWell,
    AspiratedFluid,
    FluidKind,
    WellLocation,
)
from opentrons.hardware_control import HardwareControlAPI
from opentrons.protocol_engine.notes import CommandNoteAdder


@pytest.fixture
def subject(
    state_view: StateView,
    hardware_api: HardwareControlAPI,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    mock_command_note_adder: CommandNoteAdder,
    model_utils: ModelUtils,
) -> AspirateImplementation:
    """Get the implementation subject."""
    return AspirateImplementation(
        pipetting=pipetting,
        state_view=state_view,
        movement=movement,
        hardware_api=hardware_api,
        command_note_adder=mock_command_note_adder,
        model_utils=model_utils,
    )


async def test_aspirate_implementation_no_prep(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    mock_command_note_adder: CommandNoteAdder,
) -> None:
    """An Aspirate should have an execution implementation without preparing to aspirate."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )
    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

    decoy.when(
        state_view.geometry.get_nozzles_per_well(
            labware_id=labware_id,
            target_well_name=well_name,
            pipette_id=pipette_id,
        )
    ).then_return(2)

    decoy.when(
        state_view.geometry.get_wells_covered_by_pipette_with_active_well(
            labware_id, well_name, pipette_id
        )
    ).then_return(["covered-well-1", "covered-well-2"])

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=-50,
        ),
    ).then_return(Point(x=1, y=2, z=3))

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=50,
            flow_rate=1.23,
            command_note_adder=mock_command_note_adder,
        ),
    ).then_return(50)

    result = await subject.execute(params)

    assert result == SuccessData(
        public=AspirateResult(volume=50, position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id=pipette_id,
                new_location=update_types.Well(
                    labware_id=labware_id, well_name=well_name
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            liquid_operated=update_types.LiquidOperatedUpdate(
                labware_id=labware_id,
                well_names=["covered-well-1", "covered-well-2"],
                volume_added=-100,
            ),
            pipette_aspirated_fluid=update_types.PipetteAspiratedFluidUpdate(
                pipette_id=pipette_id,
                fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=50),
            ),
        ),
    )


async def test_aspirate_implementation_with_prep(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    mock_command_note_adder: CommandNoteAdder,
    subject: AspirateImplementation,
) -> None:
    """An Aspirate should have an execution implementation with preparing to aspirate."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )
    volume = 50
    flow_rate = 1.23
    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=location,
        volume=volume,
        flowRate=flow_rate,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        False
    )

    decoy.when(
        state_view.geometry.get_nozzles_per_well(
            labware_id=labware_id,
            target_well_name=well_name,
            pipette_id=pipette_id,
        )
    ).then_return(2)

    decoy.when(
        state_view.geometry.get_wells_covered_by_pipette_with_active_well(
            labware_id, well_name, pipette_id
        )
    ).then_return(["covered-well-1", "covered-well-2"])

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=WellLocation(origin=WellOrigin.TOP),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_return(Point())

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=location,
            current_well=CurrentWell(
                pipette_id=pipette_id,
                labware_id=labware_id,
                well_name=well_name,
            ),
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=-volume,
        ),
    ).then_return(Point(x=1, y=2, z=3))

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=volume,
            flow_rate=flow_rate,
            command_note_adder=mock_command_note_adder,
        ),
    ).then_return(volume)

    result = await subject.execute(params)

    assert result == SuccessData(
        public=AspirateResult(volume=50, position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id=pipette_id,
                new_location=update_types.Well(
                    labware_id=labware_id, well_name=well_name
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            liquid_operated=update_types.LiquidOperatedUpdate(
                labware_id=labware_id,
                well_names=["covered-well-1", "covered-well-2"],
                volume_added=-100,
            ),
            pipette_aspirated_fluid=update_types.PipetteAspiratedFluidUpdate(
                pipette_id=pipette_id,
                fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=50),
            ),
        ),
    )


async def test_aspirate_raises_volume_error(
    decoy: Decoy,
    pipetting: PipettingHandler,
    movement: MovementHandler,
    mock_command_note_adder: CommandNoteAdder,
    state_view: StateView,
    subject: AspirateImplementation,
) -> None:
    """Should raise an assertion error for volume larger than working volume."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )
    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

    decoy.when(
        state_view.geometry.get_nozzles_per_well(
            labware_id=labware_id,
            target_well_name=well_name,
            pipette_id=pipette_id,
        )
    ).then_return(2)

    decoy.when(
        state_view.geometry.get_wells_covered_by_pipette_with_active_well(
            labware_id, well_name, pipette_id
        )
    ).then_return(["covered-well-1", "covered-well-2"])

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=-50,
        ),
    ).then_return(Point(1, 2, 3))

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=50,
            flow_rate=1.23,
            command_note_adder=mock_command_note_adder,
        )
    ).then_raise(AssertionError("blah blah"))

    with pytest.raises(AssertionError):
        await subject.execute(params)


async def test_overpressure_error(
    decoy: Decoy,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    model_utils: ModelUtils,
    mock_command_note_adder: CommandNoteAdder,
    state_view: StateView,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    position = Point(x=1, y=2, z=3)

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(
        state_view.geometry.get_nozzles_per_well(
            labware_id=labware_id,
            target_well_name=well_name,
            pipette_id=pipette_id,
        )
    ).then_return(2)

    decoy.when(
        state_view.geometry.get_wells_covered_by_pipette_with_active_well(
            labware_id, well_name, pipette_id
        )
    ).then_return(["covered-well-1", "covered-well-2"])

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
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
            operation_volume=-50,
        ),
    ).then_return(position)

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=50,
            flow_rate=1.23,
            command_note_adder=mock_command_note_adder,
        ),
    ).then_raise(PipetteOverpressureError())

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    result = await subject.execute(params)

    assert result == DefinedErrorData(
        public=OverpressureError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
            errorInfo={"retryLocation": (position.x, position.y, position.z)},
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id=pipette_id,
                new_location=update_types.Well(
                    labware_id=labware_id, well_name=well_name
                ),
                new_deck_point=DeckPoint(x=position.x, y=position.y, z=position.z),
            ),
            liquid_operated=update_types.LiquidOperatedUpdate(
                labware_id=labware_id,
                well_names=["covered-well-1", "covered-well-2"],
                volume_added=update_types.CLEAR,
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id=pipette_id
            ),
        ),
    )


async def test_aspirate_implementation_meniscus(
    decoy: Decoy,
    state_view: StateView,
    hardware_api: HardwareControlAPI,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    mock_command_note_adder: CommandNoteAdder,
) -> None:
    """Aspirate should update WellVolumeOffset when called with WellOrigin.MENISCUS."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    location = LiquidHandlingWellLocation(
        origin=WellOrigin.MENISCUS,
        offset=WellOffset(x=0, y=0, z=-1),
        volumeOffset="operationVolume",
    )
    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(
        state_view.geometry.get_nozzles_per_well(
            labware_id=labware_id,
            target_well_name=well_name,
            pipette_id=pipette_id,
        )
    ).then_return(2)

    decoy.when(
        state_view.geometry.get_wells_covered_by_pipette_with_active_well(
            labware_id, well_name, pipette_id
        )
    ).then_return(["covered-well-1", "covered-well-2"])

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=location,
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=-50,
        ),
    ).then_return(Point(x=1, y=2, z=3))

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id=pipette_id,
            volume=50,
            flow_rate=1.23,
            command_note_adder=mock_command_note_adder,
        ),
    ).then_return(50)

    result = await subject.execute(params)

    assert result == SuccessData(
        public=AspirateResult(volume=50, position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id=pipette_id,
                new_location=update_types.Well(
                    labware_id=labware_id, well_name=well_name
                ),
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            ),
            liquid_operated=update_types.LiquidOperatedUpdate(
                labware_id=labware_id,
                well_names=["covered-well-1", "covered-well-2"],
                volume_added=-100,
            ),
            pipette_aspirated_fluid=update_types.PipetteAspiratedFluidUpdate(
                pipette_id=pipette_id,
                fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=50),
            ),
        ),
    )


async def test_stall_during_final_movement(
    decoy: Decoy,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    model_utils: ModelUtils,
    state_view: StateView,
) -> None:
    """It should propagate a stall error that happens when moving to the final position."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
        volume=50,
        flowRate=1.23,
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
            operation_volume=-50,
        ),
    ).then_raise(StallOrCollisionDetectedError())

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    result = await subject.execute(params)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=update_types.StateUpdate(pipette_location=update_types.CLEAR),
    )


async def test_stall_during_preparation(
    decoy: Decoy,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    model_utils: ModelUtils,
) -> None:
    """It should propagate a stall error that happens during the prepare-to-aspirate part."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        False
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=WellLocation(origin=WellOrigin.TOP),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_raise(StallOrCollisionDetectedError())
    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    result = await subject.execute(params)
    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id, createdAt=error_timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
        ),
        state_update_if_false_positive=update_types.StateUpdate(),
    )


async def test_overpressure_during_preparation(
    decoy: Decoy,
    movement: MovementHandler,
    pipetting: PipettingHandler,
    subject: AspirateImplementation,
    state_view: StateView,
    model_utils: ModelUtils,
) -> None:
    """It should propagate an overpressure error that happens during the prepare-to-aspirate part."""
    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    well_location = LiquidHandlingWellLocation(
        origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=1)
    )

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    params = AspirateParams(
        pipetteId=pipette_id,
        labwareId=labware_id,
        wellName=well_name,
        wellLocation=well_location,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        False
    )

    retry_location = Point(1, 2, 3)
    decoy.when(
        state_view.geometry.get_well_position(
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            operation_volume=-params.volume,
            pipette_id=pipette_id,
        )
    ).then_return(retry_location)

    prep_location = Point(4, 5, 6)
    decoy.when(
        await movement.move_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=WellLocation(origin=WellOrigin.TOP),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        ),
    ).then_return(prep_location)

    decoy.when(await pipetting.prepare_for_aspirate(pipette_id)).then_raise(
        PipetteOverpressureError()
    )
    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)

    result = await subject.execute(params)
    assert result == DefinedErrorData(
        public=OverpressureError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
            errorInfo={
                "retryLocation": (retry_location.x, retry_location.y, retry_location.z)
            },
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id=pipette_id,
                new_location=update_types.Well(
                    labware_id=labware_id, well_name=well_name
                ),
                new_deck_point=DeckPoint(
                    x=prep_location.x, y=prep_location.y, z=prep_location.z
                ),
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id=pipette_id
            ),
        ),
        state_update_if_false_positive=update_types.StateUpdate(),
    )
