"""Test move to well commands."""

from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.protocol_engine import (
    WellLocation,
    WellOffset,
    DeckPoint,
    errors,
)
from opentrons.protocol_engine.execution import MovementHandler
from opentrons.protocol_engine.state import update_types
from opentrons.types import Point

from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.move_to_well import (
    MoveToWellParams,
    MoveToWellResult,
    MoveToWellImplementation,
)
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.resources.model_utils import ModelUtils


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Get a mock StateView."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def mock_model_utils(decoy: Decoy) -> ModelUtils:
    """Get a mock ModelUtils."""
    return decoy.mock(cls=ModelUtils)


async def test_move_to_well_implementation(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """A MoveToWell command should have an execution implementation."""
    subject = MoveToWellImplementation(
        state_view=state_view, movement=movement, model_utils=mock_model_utils
    )

    data = MoveToWellParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
    )

    decoy.when(
        await movement.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            current_well=None,
            operation_volume=None,
        )
    ).then_return(Point(x=9, y=8, z=7))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=MoveToWellResult(position=DeckPoint(x=9, y=8, z=7)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(labware_id="123", well_name="A3"),
                new_deck_point=DeckPoint(x=9, y=8, z=7),
            )
        ),
    )


async def test_move_to_well_with_tip_rack_and_volume_offset(
    decoy: Decoy,
    mock_state_view: StateView,
    movement: MovementHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """It should disallow movement to a tip rack when volumeOffset is specified."""
    subject = MoveToWellImplementation(
        state_view=mock_state_view, movement=movement, model_utils=mock_model_utils
    )

    data = MoveToWellParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=WellLocation(offset=WellOffset(x=1, y=2, z=3), volumeOffset=-40.0),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
    )

    decoy.when(mock_state_view.labware.is_tiprack("123")).then_return(True)

    with pytest.raises(errors.LabwareIsTipRackError):
        await subject.execute(data)


async def test_move_to_well_stall_defined_error(
    decoy: Decoy,
    mock_state_view: StateView,
    movement: MovementHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """It should catch StallOrCollisionError exceptions and make them DefinedErrors."""
    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(
        await movement.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            current_well=None,
            operation_volume=None,
        )
    ).then_raise(StallOrCollisionDetectedError())
    decoy.when(mock_model_utils.generate_id()).then_return(error_id)
    decoy.when(mock_model_utils.get_timestamp()).then_return(error_timestamp)

    subject = MoveToWellImplementation(
        state_view=mock_state_view, movement=movement, model_utils=mock_model_utils
    )

    data = MoveToWellParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
    )

    result = await subject.execute(data)
    assert isinstance(result, DefinedErrorData)
    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id, createdAt=error_timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(pipette_location=update_types.CLEAR),
    )
