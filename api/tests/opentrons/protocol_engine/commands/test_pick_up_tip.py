"""Test pick up tip commands."""

from datetime import datetime

from decoy import Decoy, matchers
from unittest.mock import sentinel


from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from opentrons.types import MountType, Point

from opentrons.protocol_engine import (
    WellLocation,
    PickUpTipWellLocation,
    WellOffset,
    DeckPoint,
)
from opentrons.protocol_engine.errors import PickUpTipTipNotAttachedError
from opentrons.protocol_engine.execution import MovementHandler, TipHandler
from opentrons.protocol_engine.resources import ModelUtils
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import TipGeometry

from opentrons.protocol_engine.commands.movement_common import StallOrCollisionError
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.commands.pick_up_tip import (
    PickUpTipParams,
    PickUpTipResult,
    PickUpTipImplementation,
    TipPhysicallyMissingError,
)


async def test_success(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    tip_handler: TipHandler,
    model_utils: ModelUtils,
) -> None:
    """A PickUpTip command should have an execution implementation."""
    subject = PickUpTipImplementation(
        state_view=state_view,
        movement=movement,
        tip_handler=tip_handler,
        model_utils=model_utils,
    )

    decoy.when(state_view.pipettes.get_mount("pipette-id")).then_return(MountType.LEFT)

    decoy.when(
        state_view.geometry.convert_pick_up_tip_well_location(
            well_location=PickUpTipWellLocation(offset=WellOffset(x=1, y=2, z=3))
        )
    ).then_return(WellLocation(offset=WellOffset(x=1, y=2, z=3)))

    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="A3",
            well_location=WellLocation(offset=WellOffset(x=1, y=2, z=3)),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=111, y=222, z=333))

    decoy.when(
        await tip_handler.pick_up_tip(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="A3",
        )
    ).then_return(TipGeometry(length=42, diameter=5, volume=300))

    result = await subject.execute(
        PickUpTipParams(
            pipetteId="pipette-id",
            labwareId="labware-id",
            wellName="A3",
            wellLocation=PickUpTipWellLocation(offset=WellOffset(x=1, y=2, z=3)),
        )
    )

    assert result == SuccessData(
        public=PickUpTipResult(
            tipLength=42,
            tipVolume=300,
            tipDiameter=5,
            position=DeckPoint(x=111, y=222, z=333),
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(labware_id="labware-id", well_name="A3"),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
            pipette_tip_state=update_types.PipetteTipStateUpdate(
                pipette_id="pipette-id",
                tip_geometry=TipGeometry(length=42, diameter=5, volume=300),
            ),
            tips_used=update_types.TipsUsedUpdate(
                pipette_id="pipette-id", labware_id="labware-id", well_name="A3"
            ),
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="pipette-id"
            ),
        ),
    )


async def test_tip_physically_missing_error(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    tip_handler: TipHandler,
    model_utils: ModelUtils,
) -> None:
    """It should return a TipPhysicallyMissingError if the HW API indicates that."""
    subject = PickUpTipImplementation(
        state_view=state_view,
        movement=movement,
        tip_handler=tip_handler,
        model_utils=model_utils,
    )

    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    error_id = "error-id"
    error_created_at = datetime(1234, 5, 6)

    decoy.when(
        state_view.geometry.convert_pick_up_tip_well_location(
            well_location=PickUpTipWellLocation(offset=WellOffset())
        )
    ).then_return(WellLocation(offset=WellOffset()))

    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(offset=WellOffset()),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_return(Point(x=111, y=222, z=333))
    decoy.when(
        await tip_handler.pick_up_tip(
            pipette_id=pipette_id, labware_id=labware_id, well_name=well_name
        )
    ).then_raise(PickUpTipTipNotAttachedError(tip_geometry=sentinel.tip_geometry))
    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_created_at)

    result = await subject.execute(
        PickUpTipParams(pipetteId=pipette_id, labwareId=labware_id, wellName=well_name)
    )

    assert result == DefinedErrorData(
        public=TipPhysicallyMissingError.model_construct(
            id=error_id, createdAt=error_created_at, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(
                    labware_id="labware-id", well_name="well-name"
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
            tips_used=update_types.TipsUsedUpdate(
                pipette_id="pipette-id", labware_id="labware-id", well_name="well-name"
            ),
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="pipette-id"
            ),
        ),
        state_update_if_false_positive=update_types.StateUpdate(
            pipette_tip_state=update_types.PipetteTipStateUpdate(
                pipette_id="pipette-id", tip_geometry=sentinel.tip_geometry
            ),
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="pipette-id"
            ),
            tips_used=update_types.TipsUsedUpdate(
                pipette_id="pipette-id", labware_id="labware-id", well_name="well-name"
            ),
            pipette_location=update_types.PipetteLocationUpdate(
                pipette_id="pipette-id",
                new_location=update_types.Well(
                    labware_id="labware-id", well_name="well-name"
                ),
                new_deck_point=DeckPoint(x=111, y=222, z=333),
            ),
        ),
    )


async def test_stall_error(
    decoy: Decoy,
    state_view: StateView,
    movement: MovementHandler,
    tip_handler: TipHandler,
    model_utils: ModelUtils,
) -> None:
    """It should return a TipPhysicallyMissingError if the HW API indicates that."""
    subject = PickUpTipImplementation(
        state_view=state_view,
        movement=movement,
        tip_handler=tip_handler,
        model_utils=model_utils,
    )

    pipette_id = "pipette-id"
    labware_id = "labware-id"
    well_name = "well-name"
    error_id = "error-id"
    error_created_at = datetime(1234, 5, 6)

    decoy.when(
        state_view.geometry.convert_pick_up_tip_well_location(
            well_location=PickUpTipWellLocation(offset=WellOffset())
        )
    ).then_return(WellLocation(offset=WellOffset()))

    decoy.when(
        await movement.move_to_well(
            pipette_id="pipette-id",
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(offset=WellOffset()),
            current_well=None,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
            operation_volume=None,
        )
    ).then_raise(StallOrCollisionDetectedError())

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_created_at)

    result = await subject.execute(
        PickUpTipParams(pipetteId=pipette_id, labwareId=labware_id, wellName=well_name)
    )

    assert result == DefinedErrorData(
        public=StallOrCollisionError.model_construct(
            id=error_id, createdAt=error_created_at, wrappedErrors=[matchers.Anything()]
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
        ),
    )
