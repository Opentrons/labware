"""Test drop tip commands."""

from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.protocol_engine import (
    DropTipWellLocation,
    DropTipWellOrigin,
    WellLocation,
    WellOffset,
    DeckPoint,
)
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.commands.drop_tip import (
    DropTipParams,
    DropTipResult,
    DropTipImplementation,
)
from opentrons.protocol_engine.commands.pipetting_common import (
    TipPhysicallyAttachedError,
)
from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.errors.exceptions import TipAttachedError
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.execution import MovementHandler, TipHandler


from opentrons.types import Point


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Get a mock StateView."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def mock_movement_handler(decoy: Decoy) -> MovementHandler:
    """Get a mock MovementHandler."""
    return decoy.mock(cls=MovementHandler)


@pytest.fixture
def mock_tip_handler(decoy: Decoy) -> TipHandler:
    """Get a mock TipHandler."""
    return decoy.mock(cls=TipHandler)


@pytest.fixture
def mock_model_utils(decoy: Decoy) -> ModelUtils:
    """Get a mock ModelUtils."""
    return decoy.mock(cls=ModelUtils)


def test_drop_tip_params_defaults() -> None:
    """A drop tip should use a `WellOrigin.DROP_TIP` by default."""
    default_params = DropTipParams.model_validate(
        {"pipetteId": "abc", "labwareId": "def", "wellName": "ghj"}
    )

    assert default_params.wellLocation == DropTipWellLocation(
        origin=DropTipWellOrigin.DEFAULT, offset=WellOffset(x=0, y=0, z=0)
    )


def test_drop_tip_params_default_origin() -> None:
    """A drop tip should drop a `WellOrigin.DROP_TIP` by default even if an offset is given."""
    default_params = DropTipParams.model_validate(
        {
            "pipetteId": "abc",
            "labwareId": "def",
            "wellName": "ghj",
            "wellLocation": {"offset": {"x": 1, "y": 2, "z": 3}},
        }
    )

    assert default_params.wellLocation == DropTipWellLocation(
        origin=DropTipWellOrigin.DEFAULT, offset=WellOffset(x=1, y=2, z=3)
    )


async def test_drop_tip_implementation(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_movement_handler: MovementHandler,
    mock_tip_handler: TipHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = DropTipImplementation(
        state_view=mock_state_view,
        movement=mock_movement_handler,
        tip_handler=mock_tip_handler,
        model_utils=mock_model_utils,
    )

    params = DropTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
        homeAfter=True,
    )

    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured(pipette_id="abc")
    ).then_return(False)

    decoy.when(
        mock_state_view.geometry.get_checked_tip_drop_location(
            pipette_id="abc",
            labware_id="123",
            well_location=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
            partially_configured=False,
        )
    ).then_return(WellLocation(offset=WellOffset(x=4, y=5, z=6)))

    decoy.when(
        await mock_movement_handler.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=4, y=5, z=6)),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=111, y=222, z=333))

    result = await subject.execute(params)

    assert result == SuccessData(
        public=DropTipResult(position=DeckPoint(x=111, y=222, z=333)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(
                    labware_id="123",
                    well_name="A3",
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
            pipette_tip_state=update_types.PipetteTipStateUpdate(
                pipette_id="abc", tip_geometry=None
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="abc"
            ),
        ),
    )

    decoy.verify(
        await mock_tip_handler.drop_tip(pipette_id="abc", home_after=True),
        times=1,
    )


async def test_drop_tip_with_alternating_locations(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_movement_handler: MovementHandler,
    mock_tip_handler: TipHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """It should drop tip at random location within the labware every time."""
    subject = DropTipImplementation(
        state_view=mock_state_view,
        movement=mock_movement_handler,
        tip_handler=mock_tip_handler,
        model_utils=mock_model_utils,
    )
    params = DropTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
        homeAfter=True,
        alternateDropLocation=True,
    )
    drop_location = DropTipWellLocation(
        origin=DropTipWellOrigin.DEFAULT, offset=WellOffset(x=10, y=20, z=30)
    )
    decoy.when(
        mock_state_view.geometry.get_next_tip_drop_location(
            labware_id="123", well_name="A3", pipette_id="abc"
        )
    ).then_return(drop_location)

    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured(pipette_id="abc")
    ).then_return(False)

    decoy.when(
        mock_state_view.geometry.get_checked_tip_drop_location(
            pipette_id="abc",
            labware_id="123",
            well_location=drop_location,
            partially_configured=False,
        )
    ).then_return(WellLocation(offset=WellOffset(x=4, y=5, z=6)))

    decoy.when(
        await mock_movement_handler.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=4, y=5, z=6)),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=111, y=222, z=333))

    result = await subject.execute(params)
    assert result == SuccessData(
        public=DropTipResult(position=DeckPoint(x=111, y=222, z=333)),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(
                    labware_id="123",
                    well_name="A3",
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
            pipette_tip_state=update_types.PipetteTipStateUpdate(
                pipette_id="abc", tip_geometry=None
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="abc"
            ),
        ),
    )


async def test_tip_attached_error(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_movement_handler: MovementHandler,
    mock_tip_handler: TipHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = DropTipImplementation(
        state_view=mock_state_view,
        movement=mock_movement_handler,
        tip_handler=mock_tip_handler,
        model_utils=mock_model_utils,
    )

    params = DropTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
    )

    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured(pipette_id="abc")
    ).then_return(False)

    decoy.when(
        mock_state_view.geometry.get_checked_tip_drop_location(
            pipette_id="abc",
            labware_id="123",
            well_location=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
            partially_configured=False,
        )
    ).then_return(WellLocation(offset=WellOffset(x=4, y=5, z=6)))

    decoy.when(
        await mock_movement_handler.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=4, y=5, z=6)),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=111, y=222, z=333))
    decoy.when(
        await mock_tip_handler.drop_tip(pipette_id="abc", home_after=None)
    ).then_raise(TipAttachedError("Egads!"))

    decoy.when(mock_model_utils.generate_id()).then_return("error-id")
    decoy.when(mock_model_utils.get_timestamp()).then_return(
        datetime(year=1, month=2, day=3)
    )

    result = await subject.execute(params)

    assert result == DefinedErrorData(
        public=TipPhysicallyAttachedError.model_construct(
            id="error-id",
            createdAt=datetime(year=1, month=2, day=3),
            wrappedErrors=[matchers.Anything()],
            errorInfo={"retryLocation": (111, 222, 333)},
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(
                    labware_id="123",
                    well_name="A3",
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="abc"
            ),
        ),
        state_update_if_false_positive=update_types.StateUpdate(
            pipette_tip_state=update_types.PipetteTipStateUpdate(
                pipette_id="abc",
                tip_geometry=None,
            ),
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="abc",
                new_location=update_types.Well(
                    labware_id="123",
                    well_name="A3",
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
        ),
    )


async def test_stall_error(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_movement_handler: MovementHandler,
    mock_tip_handler: TipHandler,
    mock_model_utils: ModelUtils,
) -> None:
    """A DropTip command should have an execution implementation."""
    subject = DropTipImplementation(
        state_view=mock_state_view,
        movement=mock_movement_handler,
        tip_handler=mock_tip_handler,
        model_utils=mock_model_utils,
    )

    params = DropTipParams(
        pipetteId="abc",
        labwareId="123",
        wellName="A3",
        wellLocation=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
    )

    decoy.when(
        mock_state_view.pipettes.get_is_partially_configured(pipette_id="abc")
    ).then_return(False)

    decoy.when(
        mock_state_view.geometry.get_checked_tip_drop_location(
            pipette_id="abc",
            labware_id="123",
            well_location=DropTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
            partially_configured=False,
        )
    ).then_return(WellLocation(offset=WellOffset(x=4, y=5, z=6)))

    decoy.when(
        await mock_movement_handler.move_to_well(
            pipette_id="abc",
            labware_id="123",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=4, y=5, z=6)),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_raise(StallOrCollisionDetectedError())

    decoy.when(mock_model_utils.generate_id()).then_return("error-id")
    decoy.when(mock_model_utils.get_timestamp()).then_return(
        datetime(year=1, month=2, day=3)
    )

    result = await subject.execute(params)

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id="error-id",
            createdAt=datetime(year=1, month=2, day=3),
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
        ),
    )
