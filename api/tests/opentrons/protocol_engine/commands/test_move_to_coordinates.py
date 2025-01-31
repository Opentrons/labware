"""Test move-to-coordinates commands."""
from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.protocol_engine.execution import MovementHandler
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.types import DeckPoint
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.types import Point

from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.move_to_coordinates import (
    MoveToCoordinatesParams,
    MoveToCoordinatesResult,
    MoveToCoordinatesImplementation,
)


@pytest.fixture
def subject(
    movement: MovementHandler, model_utils: ModelUtils
) -> MoveToCoordinatesImplementation:
    """Build a command implementation with injected dependencies."""
    return MoveToCoordinatesImplementation(movement=movement, model_utils=model_utils)


async def test_move_to_coordinates_implementation(
    decoy: Decoy, movement: MovementHandler, subject: MoveToCoordinatesImplementation
) -> None:
    """Test the `moveToCoordinates` implementation."""
    params = MoveToCoordinatesParams(
        pipetteId="pipette-id",
        coordinates=DeckPoint(x=1.11, y=2.22, z=3.33),
        minimumZHeight=1234,
        forceDirect=True,
        speed=567.8,
    )

    decoy.when(
        await movement.move_to_coordinates(
            pipette_id="pipette-id",
            deck_coordinates=DeckPoint(x=1.11, y=2.22, z=3.33),
            direct=True,
            additional_min_travel_z=1234,
            speed=567.8,
        )
    ).then_return(Point(x=4.44, y=5.55, z=6.66))

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=MoveToCoordinatesResult(position=DeckPoint(x=4.44, y=5.55, z=6.66)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=None,
                new_deck_point=DeckPoint(x=4.44, y=5.55, z=6.66),
            )
        ),
    )


async def test_move_to_coordinates_stall(
    decoy: Decoy,
    movement: MovementHandler,
    model_utils: ModelUtils,
    subject: MoveToCoordinatesImplementation,
) -> None:
    """It should handle stall errors."""
    params = MoveToCoordinatesParams(
        pipetteId="pipette-id",
        coordinates=DeckPoint(x=1.11, y=2.22, z=3.33),
        minimumZHeight=1234,
        forceDirect=True,
        speed=567.8,
    )

    decoy.when(
        await movement.move_to_coordinates(
            pipette_id="pipette-id",
            deck_coordinates=DeckPoint(x=1.11, y=2.22, z=3.33),
            direct=True,
            additional_min_travel_z=1234,
            speed=567.8,
        )
    ).then_raise(StallOrCollisionDetectedError())
    test_id = "test-id"
    timestamp = datetime.now()
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)
    decoy.when(model_utils.generate_id()).then_return(test_id)

    result = await subject.execute(params=params)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=test_id, createdAt=timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(pipette_location=update_types.CLEAR),
    )
