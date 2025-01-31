"""Test move relative commands."""
from datetime import datetime

from decoy import Decoy, matchers
import pytest

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.types import DeckPoint, MovementAxis
from opentrons.protocol_engine.execution import MovementHandler
from opentrons.types import Point

from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.commands.move_relative import (
    MoveRelativeParams,
    MoveRelativeResult,
    MoveRelativeImplementation,
)
from opentrons.protocol_engine.resources.model_utils import ModelUtils


@pytest.fixture
def subject(
    movement: MovementHandler, model_utils: ModelUtils
) -> MoveRelativeImplementation:
    """Build a MoveRelativeImplementation with injected dependencies."""
    return MoveRelativeImplementation(movement=movement, model_utils=model_utils)


async def test_move_relative_implementation(
    decoy: Decoy, movement: MovementHandler, subject: MoveRelativeImplementation
) -> None:
    """A MoveRelative command should have an execution implementation."""
    data = MoveRelativeParams(
        pipetteId="pipette-id",
        axis=MovementAxis.X,
        distance=42.0,
    )

    decoy.when(
        await movement.move_relative(
            pipette_id="pipette-id",
            axis=MovementAxis.X,
            distance=42.0,
        )
    ).then_return(Point(x=1, y=2, z=3))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=MoveRelativeResult(position=DeckPoint(x=1, y=2, z=3)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.NO_CHANGE,
                new_deck_point=DeckPoint(x=1, y=2, z=3),
            )
        ),
    )


async def test_move_relative_stalls(
    decoy: Decoy,
    movement: MovementHandler,
    model_utils: ModelUtils,
    subject: MoveRelativeImplementation,
) -> None:
    """A MoveRelative command should handle stalls."""
    data = MoveRelativeParams(pipetteId="pipette-id", axis=MovementAxis.Y, distance=40)

    decoy.when(
        await movement.move_relative(
            pipette_id="pipette-id", axis=MovementAxis.Y, distance=40
        )
    ).then_raise(StallOrCollisionDetectedError())

    timestamp = datetime.now()
    test_id = "test-id"

    decoy.when(model_utils.get_timestamp()).then_return(timestamp)
    decoy.when(model_utils.generate_id()).then_return(test_id)

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=test_id, createdAt=timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(pipette_location=update_types.CLEAR),
    )
