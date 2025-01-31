"""Test move to addressable area for drop tip commands."""
from datetime import datetime

from decoy import Decoy, matchers
import pytest

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.protocol_engine import DeckPoint, AddressableOffsetVector
from opentrons.protocol_engine.execution import MovementHandler
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.types import Point

from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.move_to_addressable_area_for_drop_tip import (
    MoveToAddressableAreaForDropTipParams,
    MoveToAddressableAreaForDropTipResult,
    MoveToAddressableAreaForDropTipImplementation,
)
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError


@pytest.fixture
def subject(
    state_view: StateView, movement: MovementHandler, model_utils: ModelUtils
) -> MoveToAddressableAreaForDropTipImplementation:
    """Get a command implementation with injected dependencies."""
    return MoveToAddressableAreaForDropTipImplementation(
        state_view=state_view, movement=movement, model_utils=model_utils
    )


async def test_move_to_addressable_area_for_drop_tip_implementation(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    subject: MoveToAddressableAreaForDropTipImplementation,
) -> None:
    """A MoveToAddressableAreaForDropTip command should have an execution implementation."""
    data = MoveToAddressableAreaForDropTipParams(
        pipetteId="abc",
        addressableAreaName="123",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
        alternateDropLocation=True,
        ignoreTipConfiguration=False,
    )

    decoy.when(
        state_view.geometry.get_next_tip_drop_location_for_addressable_area(
            addressable_area_name="123", pipette_id="abc"
        )
    ).then_return(AddressableOffsetVector(x=10, y=11, z=12))

    decoy.when(
        await movement.move_to_addressable_area(
            pipette_id="abc",
            addressable_area_name="123",
            offset=AddressableOffsetVector(x=10, y=11, z=12),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            stay_at_highest_possible_z=False,
            ignore_tip_configuration=False,
            highest_possible_z_extra_offset=None,
        )
    ).then_return(Point(x=9, y=8, z=7))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=MoveToAddressableAreaForDropTipResult(position=DeckPoint(x=9, y=8, z=7)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.AddressableArea(addressable_area_name="123"),
                new_deck_point=DeckPoint(x=9, y=8, z=7),
            ),
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name="123"
            ),
        ),
    )


async def test_move_to_addressable_area_for_drop_tip_handles_stalls(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    model_utils: ModelUtils,
    subject: MoveToAddressableAreaForDropTipImplementation,
) -> None:
    """A MoveToAddressableAreaForDropTip command should have an execution implementation."""
    data = MoveToAddressableAreaForDropTipParams(
        pipetteId="abc",
        addressableAreaName="123",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
        alternateDropLocation=True,
        ignoreTipConfiguration=False,
    )

    decoy.when(
        state_view.geometry.get_next_tip_drop_location_for_addressable_area(
            addressable_area_name="123", pipette_id="abc"
        )
    ).then_return(AddressableOffsetVector(x=10, y=11, z=12))

    decoy.when(
        await movement.move_to_addressable_area(
            pipette_id="abc",
            addressable_area_name="123",
            offset=AddressableOffsetVector(x=10, y=11, z=12),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            stay_at_highest_possible_z=False,
            ignore_tip_configuration=False,
            highest_possible_z_extra_offset=None,
        )
    ).then_raise(StallOrCollisionDetectedError())
    timestamp = datetime.now()
    test_id = "test-id"
    decoy.when(model_utils.generate_id()).then_return(test_id)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=test_id, createdAt=timestamp, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name="123"
            ),
        ),
    )
