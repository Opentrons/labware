"""Test move to addressable area commands."""
from datetime import datetime

from decoy import Decoy, matchers
import pytest

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons.protocol_engine import DeckPoint, AddressableOffsetVector, LoadedPipette
from opentrons.protocol_engine.execution import MovementHandler
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.types import Point, MountType

from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.commands.move_to_addressable_area import (
    MoveToAddressableAreaParams,
    MoveToAddressableAreaResult,
    MoveToAddressableAreaImplementation,
)
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.resources.model_utils import ModelUtils


@pytest.fixture
def subject(
    movement: MovementHandler, state_view: StateView, model_utils: ModelUtils
) -> MoveToAddressableAreaImplementation:
    """Build an execution implementation with injected dependencies."""
    return MoveToAddressableAreaImplementation(
        movement=movement, state_view=state_view, model_utils=model_utils
    )


@pytest.mark.parametrize(
    "pipette_name",
    (
        pipette_name
        for pipette_name in PipetteNameType
        if pipette_name
        not in (
            PipetteNameType.P10_SINGLE,
            PipetteNameType.P10_MULTI,
            PipetteNameType.P50_MULTI,
            PipetteNameType.P50_SINGLE,
            PipetteNameType.P300_SINGLE,
            PipetteNameType.P300_MULTI,
            PipetteNameType.P1000_SINGLE,
        )
    ),
)
async def test_move_to_addressable_area_implementation_non_gen1(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    pipette_name: PipetteNameType,
    subject: MoveToAddressableAreaImplementation,
) -> None:
    """A MoveToAddressableArea command should have an execution implementation."""
    data = MoveToAddressableAreaParams(
        pipetteId="abc",
        addressableAreaName="123",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
        stayAtHighestPossibleZ=True,
    )

    decoy.when(state_view.pipettes.get("abc")).then_return(
        LoadedPipette(id="abc", pipetteName=pipette_name, mount=MountType.LEFT)
    )
    decoy.when(
        await movement.move_to_addressable_area(
            pipette_id="abc",
            addressable_area_name="123",
            offset=AddressableOffsetVector(x=1, y=2, z=3),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            stay_at_highest_possible_z=True,
            ignore_tip_configuration=True,
            highest_possible_z_extra_offset=None,
        )
    ).then_return(Point(x=9, y=8, z=7))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=MoveToAddressableAreaResult(position=DeckPoint(x=9, y=8, z=7)),
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


@pytest.mark.parametrize(
    "pipette_name",
    (
        PipetteNameType.P10_SINGLE,
        PipetteNameType.P10_MULTI,
        PipetteNameType.P50_MULTI,
        PipetteNameType.P50_SINGLE,
        PipetteNameType.P300_SINGLE,
        PipetteNameType.P300_MULTI,
        PipetteNameType.P1000_SINGLE,
    ),
)
async def test_move_to_addressable_area_implementation_with_gen1(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    pipette_name: PipetteNameType,
    subject: MoveToAddressableAreaImplementation,
) -> None:
    """A MoveToAddressableArea command should have an execution implementation."""
    data = MoveToAddressableAreaParams(
        pipetteId="abc",
        addressableAreaName="123",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
        stayAtHighestPossibleZ=True,
    )

    decoy.when(state_view.pipettes.get("abc")).then_return(
        LoadedPipette(id="abc", pipetteName=pipette_name, mount=MountType.LEFT)
    )
    decoy.when(
        await movement.move_to_addressable_area(
            pipette_id="abc",
            addressable_area_name="123",
            offset=AddressableOffsetVector(x=1, y=2, z=3),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            stay_at_highest_possible_z=True,
            ignore_tip_configuration=True,
            highest_possible_z_extra_offset=5.0,
        )
    ).then_return(Point(x=9, y=8, z=7))

    result = await subject.execute(data)

    assert result == SuccessData(
        public=MoveToAddressableAreaResult(position=DeckPoint(x=9, y=8, z=7)),
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


async def test_move_to_addressable_area_implementation_handles_stalls(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    model_utils: ModelUtils,
    subject: MoveToAddressableAreaImplementation,
) -> None:
    """A MoveToAddressableArea command should handle stalls."""
    data = MoveToAddressableAreaParams(
        pipetteId="abc",
        addressableAreaName="123",
        offset=AddressableOffsetVector(x=1, y=2, z=3),
        forceDirect=True,
        minimumZHeight=4.56,
        speed=7.89,
        stayAtHighestPossibleZ=True,
    )
    test_id = "test-id"
    timestamp = datetime.now()

    decoy.when(state_view.pipettes.get("abc")).then_return(
        LoadedPipette(
            id="abc", pipetteName=PipetteNameType.P1000_SINGLE, mount=MountType.LEFT
        )
    )
    decoy.when(model_utils.generate_id()).then_return(test_id)
    decoy.when(model_utils.get_timestamp()).then_return(timestamp)
    decoy.when(
        await movement.move_to_addressable_area(
            pipette_id="abc",
            addressable_area_name="123",
            offset=AddressableOffsetVector(x=1, y=2, z=3),
            force_direct=True,
            minimum_z_height=4.56,
            speed=7.89,
            stay_at_highest_possible_z=True,
            ignore_tip_configuration=True,
            highest_possible_z_extra_offset=5.0,
        )
    ).then_raise(StallOrCollisionDetectedError())

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
