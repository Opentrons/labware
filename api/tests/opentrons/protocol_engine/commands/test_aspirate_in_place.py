"""Test aspirate-in-place commands."""

from datetime import datetime

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.errors.exceptions import PipetteOverpressureError

from opentrons.types import Point
from opentrons.hardware_control import API as HardwareAPI

from opentrons.protocol_engine.execution import PipettingHandler, GantryMover
from opentrons.protocol_engine.commands.aspirate_in_place import (
    AspirateInPlaceParams,
    AspirateInPlaceResult,
    AspirateInPlaceImplementation,
)
from opentrons.protocol_engine.commands.command import SuccessData, DefinedErrorData
from opentrons.protocol_engine.errors.exceptions import PipetteNotReadyToAspirateError
from opentrons.protocol_engine.notes import CommandNoteAdder
from opentrons.protocol_engine.resources import ModelUtils
from opentrons.protocol_engine.state.state import StateStore
from opentrons.protocol_engine.commands.pipetting_common import OverpressureError
from opentrons.protocol_engine.types import (
    CurrentWell,
    CurrentPipetteLocation,
    CurrentAddressableArea,
    AspiratedFluid,
    FluidKind,
)
from opentrons.protocol_engine.state import update_types


@pytest.fixture
def hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mock in the shape of a HardwareAPI."""
    return decoy.mock(cls=HardwareAPI)


@pytest.fixture
def state_store(decoy: Decoy) -> StateStore:
    """Get a mock in the shape of a StateStore."""
    return decoy.mock(cls=StateStore)


@pytest.fixture
def pipetting(decoy: Decoy) -> PipettingHandler:
    """Get a mock in the shape of a PipettingHandler."""
    return decoy.mock(cls=PipettingHandler)


@pytest.fixture
def subject(
    pipetting: PipettingHandler,
    state_store: StateStore,
    hardware_api: HardwareAPI,
    mock_command_note_adder: CommandNoteAdder,
    model_utils: ModelUtils,
    gantry_mover: GantryMover,
) -> AspirateInPlaceImplementation:
    """Get the impelementation subject."""
    return AspirateInPlaceImplementation(
        pipetting=pipetting,
        hardware_api=hardware_api,
        state_view=state_store,
        command_note_adder=mock_command_note_adder,
        model_utils=model_utils,
        gantry_mover=gantry_mover,
    )


@pytest.mark.parametrize(
    "location,stateupdateLabware,stateupdateWell",
    [
        (
            CurrentWell(
                pipette_id="pipette-id-abc",
                labware_id="labware-id-1",
                well_name="well-name-1",
            ),
            "labware-id-1",
            "well-name-1",
        ),
        (None, None, None),
        (CurrentAddressableArea("pipette-id-abc", "addressable-area-1"), None, None),
    ],
)
async def test_aspirate_in_place_implementation(
    decoy: Decoy,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    state_store: StateStore,
    hardware_api: HardwareAPI,
    mock_command_note_adder: CommandNoteAdder,
    subject: AspirateInPlaceImplementation,
    location: CurrentPipetteLocation | None,
    stateupdateLabware: str,
    stateupdateWell: str,
) -> None:
    """It should aspirate in place."""
    data = AspirateInPlaceParams(
        pipetteId="pipette-id-abc",
        volume=123,
        flowRate=1.234,
    )
    decoy.when(
        state_store.geometry.get_nozzles_per_well(
            labware_id=stateupdateLabware,
            target_well_name=stateupdateWell,
            pipette_id="pipette-id-abc",
        )
    ).then_return(2)

    decoy.when(
        state_store.geometry.get_wells_covered_by_pipette_with_active_well(
            stateupdateLabware, stateupdateWell, "pipette-id-abc"
        )
    ).then_return(["A3", "A4"])
    decoy.when(
        pipetting.get_is_ready_to_aspirate(
            pipette_id="pipette-id-abc",
        )
    ).then_return(True)

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id="pipette-id-abc",
            volume=123,
            flow_rate=1.234,
            command_note_adder=mock_command_note_adder,
        )
    ).then_return(123)

    decoy.when(await gantry_mover.get_position("pipette-id-abc")).then_return(
        Point(1, 2, 3)
    )

    decoy.when(state_store.pipettes.get_current_location()).then_return(location)

    result = await subject.execute(params=data)

    if isinstance(location, CurrentWell):
        assert result == SuccessData(
            public=AspirateInPlaceResult(volume=123),
            state_update=update_types.StateUpdate(
                liquid_operated=update_types.LiquidOperatedUpdate(
                    labware_id=stateupdateLabware,
                    well_names=["A3", "A4"],
                    volume_added=-246,
                ),
                pipette_aspirated_fluid=update_types.PipetteAspiratedFluidUpdate(
                    pipette_id="pipette-id-abc",
                    fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=123),
                ),
            ),
        )
    else:
        assert result == SuccessData(
            public=AspirateInPlaceResult(volume=123),
            state_update=update_types.StateUpdate(
                pipette_aspirated_fluid=update_types.PipetteAspiratedFluidUpdate(
                    pipette_id="pipette-id-abc",
                    fluid=AspiratedFluid(kind=FluidKind.LIQUID, volume=123),
                )
            ),
        )


async def test_handle_aspirate_in_place_request_not_ready_to_aspirate(
    decoy: Decoy,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    state_store: StateStore,
    hardware_api: HardwareAPI,
    subject: AspirateInPlaceImplementation,
) -> None:
    """Should raise an exception for not ready to aspirate."""
    data = AspirateInPlaceParams(
        pipetteId="pipette-id-abc",
        volume=123,
        flowRate=1.234,
    )
    decoy.when(await gantry_mover.get_position("pipette-id-abc")).then_return(
        Point(1, 2, 3)
    )
    decoy.when(
        pipetting.get_is_ready_to_aspirate(
            pipette_id="pipette-id-abc",
        )
    ).then_return(False)

    with pytest.raises(
        PipetteNotReadyToAspirateError,
        match="Pipette cannot aspirate in place because of a previous blow out."
        " The first aspirate following a blow-out must be from a specific well"
        " so the plunger can be reset in a known safe position.",
    ):
        await subject.execute(params=data)


async def test_aspirate_raises_volume_error(
    decoy: Decoy,
    pipetting: PipettingHandler,
    subject: AspirateInPlaceImplementation,
    mock_command_note_adder: CommandNoteAdder,
    gantry_mover: GantryMover,
) -> None:
    """Should raise an assertion error for volume larger than working volume."""
    data = AspirateInPlaceParams(
        pipetteId="abc",
        volume=50,
        flowRate=1.23,
    )
    decoy.when(await gantry_mover.get_position("abc")).then_return(Point(x=1, y=2, z=3))
    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id="abc")).then_return(True)

    decoy.when(
        await pipetting.aspirate_in_place(
            pipette_id="abc",
            volume=50,
            flow_rate=1.23,
            command_note_adder=mock_command_note_adder,
        )
    ).then_raise(AssertionError("blah blah"))

    with pytest.raises(AssertionError):
        await subject.execute(data)


@pytest.mark.parametrize(
    "location,stateupdateLabware,stateupdateWell",
    [
        (
            CurrentWell(
                pipette_id="pipette-id",
                labware_id="labware-id-1",
                well_name="well-name-1",
            ),
            "labware-id-1",
            "well-name-1",
        ),
        (None, None, None),
        (CurrentAddressableArea("pipette-id", "addressable-area-1"), None, None),
    ],
)
async def test_overpressure_error(
    decoy: Decoy,
    gantry_mover: GantryMover,
    pipetting: PipettingHandler,
    subject: AspirateInPlaceImplementation,
    model_utils: ModelUtils,
    mock_command_note_adder: CommandNoteAdder,
    state_store: StateStore,
    location: CurrentPipetteLocation | None,
    stateupdateLabware: str,
    stateupdateWell: str,
) -> None:
    """It should return an overpressure error if the hardware API indicates that."""
    pipette_id = "pipette-id"

    position = Point(x=1, y=2, z=3)

    error_id = "error-id"
    error_timestamp = datetime(year=2020, month=1, day=2)
    decoy.when(
        state_store.geometry.get_nozzles_per_well(
            labware_id=stateupdateLabware,
            target_well_name=stateupdateWell,
            pipette_id="pipette-id",
        )
    ).then_return(2)

    decoy.when(
        state_store.geometry.get_wells_covered_by_pipette_with_active_well(
            stateupdateLabware, stateupdateWell, "pipette-id"
        )
    ).then_return(["A3", "A4"])
    data = AspirateInPlaceParams(
        pipetteId=pipette_id,
        volume=50,
        flowRate=1.23,
    )

    decoy.when(pipetting.get_is_ready_to_aspirate(pipette_id=pipette_id)).then_return(
        True
    )

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
    decoy.when(await gantry_mover.get_position(pipette_id)).then_return(position)
    decoy.when(state_store.pipettes.get_current_location()).then_return(location)

    result = await subject.execute(data)

    if isinstance(location, CurrentWell):
        assert result == DefinedErrorData(
            public=OverpressureError.model_construct(
                id=error_id,
                createdAt=error_timestamp,
                wrappedErrors=[matchers.Anything()],
                errorInfo={"retryLocation": (position.x, position.y, position.z)},
            ),
            state_update=update_types.StateUpdate(
                liquid_operated=update_types.LiquidOperatedUpdate(
                    labware_id=stateupdateLabware,
                    well_names=["A3", "A4"],
                    volume_added=update_types.CLEAR,
                ),
                pipette_aspirated_fluid=update_types.PipetteUnknownFluidUpdate(
                    pipette_id="pipette-id"
                ),
            ),
        )
    else:
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
