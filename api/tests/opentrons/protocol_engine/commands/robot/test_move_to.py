"""Test robot.move-to commands."""
from decoy import Decoy

from opentrons.protocol_engine.execution import MovementHandler
from opentrons.protocol_engine.types import DeckPoint
from opentrons.types import Point, MountType

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.robot.move_to import (
    MoveToParams,
    MoveToResult,
    MoveToImplementation,
)


async def test_move_to_implementation(
    decoy: Decoy,
    movement: MovementHandler,
) -> None:
    """Test the `robot.moveTo` implementation.

    It should call `MovementHandler.move_mount_to` with the
    correct coordinates.
    """
    subject = MoveToImplementation(
        movement=movement,
    )

    params = MoveToParams(
        mount=MountType.LEFT,
        destination=DeckPoint(x=1.11, y=2.22, z=3.33),
        speed=567.8,
    )

    decoy.when(
        await movement.move_mount_to(
            mount=MountType.LEFT,
            destination=DeckPoint(x=1.11, y=2.22, z=3.33),
            speed=567.8,
        )
    ).then_return(Point(x=4.44, y=5.55, z=6.66))

    result = await subject.execute(params=params)

    assert result == SuccessData(
        public=MoveToResult(position=DeckPoint(x=4.44, y=5.55, z=6.66))
    )
