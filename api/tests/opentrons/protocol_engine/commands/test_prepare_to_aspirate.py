"""Test prepare to aspirate commands."""
from datetime import datetime
from opentrons.types import Point
import pytest
from decoy import Decoy, matchers

from opentrons.protocol_engine.execution import (
    PipettingHandler,
)

from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.commands.prepare_to_aspirate import (
    PrepareToAspirateParams,
    PrepareToAspirateImplementation,
    PrepareToAspirateResult,
)
from opentrons.protocol_engine.execution.gantry_mover import GantryMover
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.commands.pipetting_common import OverpressureError
from opentrons.protocol_engine.state import update_types
from opentrons_shared_data.errors.exceptions import PipetteOverpressureError


@pytest.fixture
def subject(
    pipetting: PipettingHandler,
    model_utils: ModelUtils,
    gantry_mover: GantryMover,
) -> PrepareToAspirateImplementation:
    """Get the implementation subject."""
    return PrepareToAspirateImplementation(
        pipetting=pipetting, model_utils=model_utils, gantry_mover=gantry_mover
    )


async def test_prepare_to_aspirate_implementation(
    decoy: Decoy,
    gantry_mover: GantryMover,
    subject: PrepareToAspirateImplementation,
    pipetting: PipettingHandler,
) -> None:
    """A PrepareToAspirate command should have an executing implementation."""
    data = PrepareToAspirateParams(pipetteId="some id")
    position = Point(x=1, y=2, z=3)

    decoy.when(await pipetting.prepare_for_aspirate(pipette_id="some id")).then_return(
        None
    )
    decoy.when(await gantry_mover.get_position("some id")).then_return(position)

    result = await subject.execute(data)
    assert result == SuccessData(
        public=PrepareToAspirateResult(),
        state_update=update_types.StateUpdate(
            pipette_aspirated_fluid=update_types.PipetteEmptyFluidUpdate(
                pipette_id="some id"
            )
        ),
    )


async def test_overpressure_error(
    decoy: Decoy,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    subject: PrepareToAspirateImplementation,
    model_utils: ModelUtils,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"

    position = Point(x=1, y=2, z=3)

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)

    data = PrepareToAspirateParams(
        pipetteId=pipette_id,
    )

    decoy.when(
        await pipetting.prepare_for_aspirate(
            pipette_id=pipette_id,
        ),
    ).then_raise(PipetteOverpressureError())

    decoy.when(model_utils.generate_id()).then_return(error_id)
    decoy.when(model_utils.get_timestamp()).then_return(error_timestamp)
    decoy.when(await gantry_mover.get_position(pipette_id)).then_return(position)

    result = await subject.execute(data)

    assert result == DefinedErrorData(
        public=OverpressureError.model_construct(
            id=error_id,
            createdAt=error_timestamp,
            wrappedErrors=[matchers.Anything()],
            errorInfo={"retryLocation": (position.x, position.y, position.z)},
        ),
        state_update=update_types.StateUpdate(
            pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                pipette_id="pipette-id"
            )
        ),
    )
