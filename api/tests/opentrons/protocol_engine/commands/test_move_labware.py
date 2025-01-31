"""Test the ``moveLabware`` command."""

from datetime import datetime
import inspect
from unittest.mock import sentinel

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.labware.labware_definition import Parameters, Dimensions
from opentrons_shared_data.errors.exceptions import (
    EnumeratedError,
    FailedGripperPickupError,
    LabwareDroppedError,
    StallOrCollisionDetectedError,
)
from opentrons_shared_data.gripper.constants import GRIPPER_PADDLE_WIDTH

from opentrons.protocol_engine.state import update_types
from opentrons.types import DeckSlotName, Point
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocol_engine import errors, Config
from opentrons.protocol_engine.resources import labware_validation
from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.protocol_engine.types import (
    CurrentWell,
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    LoadedLabware,
    LabwareMovementStrategy,
    LabwareOffsetVector,
    LabwareMovementOffsetData,
    DeckType,
    AddressableAreaLocation,
)
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.commands.command import DefinedErrorData, SuccessData
from opentrons.protocol_engine.commands.move_labware import (
    GripperMovementError,
    MoveLabwareParams,
    MoveLabwareResult,
    MoveLabwareImplementation,
)
from opentrons.protocol_engine.execution import (
    EquipmentHandler,
    RunControlHandler,
    LabwareMovementHandler,
)


@pytest.fixture(autouse=True)
def patch_mock_labware_validation(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out labware_validation.py functions."""
    for name, func in inspect.getmembers(labware_validation, inspect.isfunction):
        monkeypatch.setattr(labware_validation, name, decoy.mock(func=func))


@pytest.fixture
def subject(
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
    run_control: RunControlHandler,
    model_utils: ModelUtils,
) -> MoveLabwareImplementation:
    """Return a test subject configured to use mocked-out dependencies."""
    return MoveLabwareImplementation(
        state_view=state_view,
        equipment=equipment,
        labware_movement=labware_movement,
        run_control=run_control,
        model_utils=model_utils,
    )


@pytest.mark.parametrize(
    argnames=["strategy", "times_pause_called"],
    argvalues=[
        [LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE, 1],
        [LabwareMovementStrategy.MANUAL_MOVE_WITHOUT_PAUSE, 0],
    ],
)
async def test_manual_move_labware_implementation(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    state_view: StateView,
    run_control: RunControlHandler,
    strategy: LabwareMovementStrategy,
    times_pause_called: int,
) -> None:
    """It should execute a pause and return the new offset."""
    new_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_4)
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=new_location,
        strategy=strategy,
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        )
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_5))
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        )
    ).then_return("wowzers-a-new-offset-id")

    result = await subject.execute(data)
    decoy.verify(await run_control.wait_for_resume(), times=times_pause_called)
    decoy.verify(
        state_view.labware.raise_if_labware_has_labware_on_top("my-cool-labware-id")
    )
    assert result == SuccessData(
        public=MoveLabwareResult(
            offsetId="wowzers-a-new-offset-id",
        ),
        state_update=update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="my-cool-labware-id",
                offset_id="wowzers-a-new-offset-id",
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            ),
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name=new_location.slotName.id
            ),
        ),
    )


async def test_move_labware_implementation_on_labware(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    state_view: StateView,
    run_control: RunControlHandler,
) -> None:
    """It should execute a pause and return the new offset."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=OnLabwareLocation(labwareId="new-labware-id"),
        strategy=LabwareMovementStrategy.MANUAL_MOVE_WITHOUT_PAUSE,
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(
        LabwareDefinition.model_construct(namespace="spacename")  # type: ignore[call-arg]
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=OnLabwareLocation(labwareId="new-labware-id"),
        )
    ).then_return(OnLabwareLocation(labwareId="my-even-cooler-labware-id"))
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=OnLabwareLocation(labwareId="my-even-cooler-labware-id"),
        )
    ).then_return("wowzers-a-new-offset-id")

    result = await subject.execute(data)
    decoy.verify(
        state_view.labware.raise_if_labware_has_labware_on_top("my-cool-labware-id"),
        state_view.labware.raise_if_labware_has_labware_on_top(
            "my-even-cooler-labware-id"
        ),
        state_view.labware.raise_if_labware_cannot_be_stacked(
            LabwareDefinition.model_construct(namespace="spacename"),  # type: ignore[call-arg]
            "my-even-cooler-labware-id",
        ),
    )
    assert result == SuccessData(
        public=MoveLabwareResult(
            offsetId="wowzers-a-new-offset-id",
        ),
        state_update=update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="my-cool-labware-id",
                offset_id="wowzers-a-new-offset-id",
                new_location=OnLabwareLocation(labwareId="my-even-cooler-labware-id"),
            )
        ),
    )


async def test_gripper_move_labware_implementation(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
) -> None:
    """It should delegate to the equipment handler and return the new offset."""
    from_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    new_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_5)
    pick_up_offset = LabwareOffsetVector(x=1, y=2, z=3)

    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=new_location,
        strategy=LabwareMovementStrategy.USING_GRIPPER,
        pickUpOffset=pick_up_offset,
        dropOffset=None,
    )

    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(sentinel.labware_definition)
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=from_location,
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(location=new_location)
    ).then_return(sentinel.new_location_validated_unoccupied)
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=sentinel.new_location_validated_unoccupied,
        )
    ).then_return("wowzers-a-new-offset-id")

    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(from_location)
    ).then_return(sentinel.from_location_validated_for_gripper)
    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(
            sentinel.new_location_validated_unoccupied
        )
    ).then_return(sentinel.new_location_validated_for_gripper)
    decoy.when(
        labware_validation.validate_gripper_compatible(sentinel.labware_definition)
    ).then_return(True)

    result = await subject.execute(data)
    decoy.verify(
        state_view.labware.raise_if_labware_has_labware_on_top("my-cool-labware-id"),
        await labware_movement.move_labware_with_gripper(
            labware_id="my-cool-labware-id",
            current_location=sentinel.from_location_validated_for_gripper,
            new_location=sentinel.new_location_validated_for_gripper,
            user_offset_data=LabwareMovementOffsetData(
                pickUpOffset=pick_up_offset,
                dropOffset=LabwareOffsetVector(x=0, y=0, z=0),
            ),
            post_drop_slide_offset=None,
        ),
    )
    assert result == SuccessData(
        public=MoveLabwareResult(
            offsetId="wowzers-a-new-offset-id",
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="my-cool-labware-id",
                new_location=sentinel.new_location_validated_unoccupied,
                offset_id="wowzers-a-new-offset-id",
            ),
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name=new_location.slotName.id
            ),
        ),
    )


@pytest.mark.parametrize(
    "underlying_exception",
    [
        FailedGripperPickupError(),
        LabwareDroppedError(),
        StallOrCollisionDetectedError(),
    ],
)
async def test_gripper_error(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
    model_utils: ModelUtils,
    labware_movement: LabwareMovementHandler,
    underlying_exception: EnumeratedError,
) -> None:
    """Test the handling of errors during a gripper movement."""
    labware_id = "labware-id"
    labware_namespace = "labware-namespace"
    labware_load_name = "load-name"
    labware_definition_uri = "opentrons-test/load-name/1"
    labware_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        namespace=labware_namespace,
    )
    original_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_A1)
    new_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_A2)
    error_id = "error-id"
    error_created_at = datetime.now()

    # Common MoveLabwareImplementation boilerplate:
    decoy.when(state_view.labware.get_definition(labware_id=labware_id)).then_return(
        LabwareDefinition.model_construct(namespace=labware_namespace)  # type: ignore[call-arg]
    )
    decoy.when(state_view.labware.get(labware_id=labware_id)).then_return(
        LoadedLabware(
            id=labware_id,
            loadName=labware_load_name,
            definitionUri=labware_definition_uri,
            location=original_location,
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(original_location)
    ).then_return(original_location)
    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(new_location)
    ).then_return(new_location)
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=new_location,
        )
    ).then_return(new_location)
    decoy.when(labware_validation.validate_gripper_compatible(labware_def)).then_return(
        True
    )
    params = MoveLabwareParams(
        labwareId=labware_id,
        newLocation=new_location,
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )

    # Actual setup for this test:
    decoy.when(
        await labware_movement.move_labware_with_gripper(
            labware_id=labware_id,
            current_location=original_location,
            new_location=new_location,
            user_offset_data=LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
                dropOffset=LabwareOffsetVector(x=0, y=0, z=0),
            ),
            post_drop_slide_offset=None,
        )
    ).then_raise(underlying_exception)
    decoy.when(model_utils.get_timestamp()).then_return(error_created_at)
    decoy.when(model_utils.generate_id()).then_return(error_id)

    result = await subject.execute(params)

    assert result == DefinedErrorData(
        public=GripperMovementError.model_construct(
            id=error_id,
            createdAt=error_created_at,
            errorCode=underlying_exception.code.value.code,
            detail=underlying_exception.code.value.detail,
            wrappedErrors=[matchers.Anything()],
        ),
        state_update=update_types.StateUpdate(
            labware_location=update_types.NO_CHANGE,
            pipette_location=update_types.CLEAR,
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name=new_location.slotName.id
            ),
        ),
    )


@pytest.mark.parametrize(
    ("current_labware_id", "moved_labware_id", "expect_cleared_location"),
    [
        ("lw1", "lw2", False),
        ("lw1", "lw1", True),
    ],
)
async def test_clears_location_if_current_labware_moved_from_under_pipette(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
    current_labware_id: str,
    moved_labware_id: str,
    expect_cleared_location: bool,
) -> None:
    """If it moves the labware that the pipette is currently over, it should clear the location."""
    from_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_A1)
    to_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_A2)

    decoy.when(state_view.labware.get(labware_id=moved_labware_id)).then_return(
        LoadedLabware(
            id=moved_labware_id,
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=from_location,
            offsetId=None,
        )
    )

    decoy.when(state_view.pipettes.get_current_location()).then_return(
        CurrentWell(
            pipette_id="pipette-id", labware_id=current_labware_id, well_name="A1"
        )
    )

    result = await subject.execute(
        params=MoveLabwareParams(
            labwareId=moved_labware_id,
            newLocation=to_location,
            strategy=LabwareMovementStrategy.MANUAL_MOVE_WITHOUT_PAUSE,
        )
    )
    assert (
        result.state_update.pipette_location == update_types.CLEAR
        if expect_cleared_location
        else update_types.NO_CHANGE
    )


async def test_gripper_move_to_waste_chute_implementation(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
) -> None:
    """It should drop the labware with a delay added."""
    from_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    new_location = AddressableAreaLocation(addressableAreaName="gripperWasteChute")
    labware_width = 50
    expected_slide_offset = Point(
        x=labware_width / 2 + GRIPPER_PADDLE_WIDTH / 2 + 8, y=0, z=0
    )

    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=new_location,
        strategy=LabwareMovementStrategy.USING_GRIPPER,
        pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
        dropOffset=None,
    )
    labware_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        namespace="my-cool-namespace",
        dimensions=Dimensions(
            yDimension=labware_width, zDimension=labware_width, xDimension=labware_width
        ),
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(labware_def)
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=from_location,
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=new_location,
        )
    ).then_return(new_location)
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=new_location,
        )
    ).then_return("wowzers-a-new-offset-id")

    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(from_location)
    ).then_return(from_location)
    decoy.when(
        state_view.geometry.ensure_valid_gripper_location(new_location)
    ).then_return(new_location)
    decoy.when(labware_validation.validate_gripper_compatible(labware_def)).then_return(
        True
    )

    result = await subject.execute(data)
    decoy.verify(
        state_view.labware.raise_if_labware_has_labware_on_top("my-cool-labware-id"),
        await labware_movement.move_labware_with_gripper(
            labware_id="my-cool-labware-id",
            current_location=from_location,
            new_location=new_location,
            user_offset_data=LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
                dropOffset=LabwareOffsetVector(x=0, y=0, z=0),
            ),
            post_drop_slide_offset=expected_slide_offset,
        ),
    )
    assert result == SuccessData(
        public=MoveLabwareResult(
            offsetId="wowzers-a-new-offset-id",
        ),
        state_update=update_types.StateUpdate(
            pipette_location=update_types.CLEAR,
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="my-cool-labware-id",
                new_location=new_location,
                offset_id="wowzers-a-new-offset-id",
            ),
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name=new_location.addressableAreaName
            ),
        ),
    )


async def test_move_labware_raises_for_labware_or_module_not_found(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """It should raise an error when specified labware/ module is not found."""
    move_non_existent_labware_params = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_raise(
        errors.LabwareNotLoadedError("Woops!")
    )
    with pytest.raises(errors.LabwareNotLoadedError):
        await subject.execute(move_non_existent_labware_params)

    move_labware_from_questionable_module_params = MoveLabwareParams(
        labwareId="real-labware-id",
        newLocation=ModuleLocation(moduleId="imaginary-module-id-1"),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )
    decoy.when(state_view.labware.get(labware_id="real-labware-id")).then_return(
        LoadedLabware(
            id="real-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=ModuleLocation(moduleId="imaginary-module-id-3"),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=ModuleLocation(moduleId="imaginary-module-id-1"),
        )
    ).then_return(ModuleLocation(moduleId="imaginary-module-id-2"))

    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=ModuleLocation(moduleId="imaginary-module-id-2"),
        )
    ).then_raise(errors.ModuleNotLoadedError(module_id="woops-i-dont-exist"))

    with pytest.raises(errors.ModuleNotLoadedError):
        await subject.execute(move_labware_from_questionable_module_params)


async def test_move_labware_raises_if_movement_obstructed(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    equipment: EquipmentHandler,
    labware_movement: LabwareMovementHandler,
    state_view: StateView,
) -> None:
    """It should execute a pause and return the new offset."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        strategy=LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE,
    )
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        )
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_6))
    decoy.when(
        equipment.find_applicable_labware_offset_id(
            labware_definition_uri="opentrons-test/load-name/1",
            labware_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_6),
        )
    ).then_return("wowzers-a-new-offset-id")

    decoy.when(
        await labware_movement.ensure_movement_not_obstructed_by_module(
            labware_id="my-cool-labware-id",
            new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_6),
        )
    ).then_raise(errors.LabwareMovementNotAllowedError("Oh boy"))

    with pytest.raises(errors.LabwareMovementNotAllowedError):
        await subject.execute(data)


async def test_move_labware_raises_when_location_occupied(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise an error when trying to move labware to non-empty location."""
    move_labware_params = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        )
    ).then_raise(errors.LocationIsOccupiedError("Woops!"))

    with pytest.raises(errors.LocationIsOccupiedError):
        await subject.execute(move_labware_params)


async def test_move_labware_raises_when_moving_adapter_with_gripper(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise an error when trying to move an adapter with a gripper."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )

    definition = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(loadName="My cool adapter"),  # type: ignore[call-arg]
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(definition)
    decoy.when(labware_validation.validate_gripper_compatible(definition)).then_return(
        True
    )
    decoy.when(
        labware_validation.validate_definition_is_adapter(definition)
    ).then_return(True)

    with pytest.raises(
        errors.LabwareMovementNotAllowedError, match="move adapter 'My cool adapter'"
    ):
        await subject.execute(data)


async def test_move_labware_raises_when_moving_labware_with_gripper_incompatible_quirk(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise an error when trying to move an adapter with a gripper."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )

    definition = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(loadName="My cool labware"),  # type: ignore[call-arg]
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(definition)
    decoy.when(labware_validation.validate_gripper_compatible(definition)).then_return(
        False
    )

    with pytest.raises(
        errors.LabwareMovementNotAllowedError,
        match="Cannot move labware 'My cool labware' with gripper",
    ):
        await subject.execute(data)


async def test_move_labware_with_gripper_raises_on_ot2(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise an error when using a gripper with robot type of OT2."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )
    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(
        LabwareDefinition.model_construct(namespace="spacename")  # type: ignore[call-arg]
    )

    decoy.when(state_view.config).then_return(
        Config(robot_type="OT-2 Standard", deck_type=DeckType.OT2_STANDARD)
    )
    with pytest.raises(errors.NotSupportedOnRobotType):
        await subject.execute(data)


async def test_move_labware_raises_when_moving_fixed_trash_labware(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise an error when trying to move a fixed trash."""
    data = MoveLabwareParams(
        labwareId="my-cool-labware-id",
        newLocation=DeckSlotLocation(slotName=DeckSlotName.FIXED_TRASH),
        strategy=LabwareMovementStrategy.USING_GRIPPER,
    )

    definition = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(  # type: ignore[call-arg]
            loadName="My cool labware", quirks=["fixedTrash"]
        ),
    )

    decoy.when(state_view.labware.get(labware_id="my-cool-labware-id")).then_return(
        LoadedLabware(
            id="my-cool-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )
    decoy.when(
        state_view.labware.get_definition(labware_id="my-cool-labware-id")
    ).then_return(definition)

    decoy.when(state_view.labware.is_fixed_trash("my-cool-labware-id")).then_return(
        True
    )

    with pytest.raises(
        errors.LabwareMovementNotAllowedError,
        match="Cannot move fixed trash labware 'My cool labware'.",
    ):
        await subject.execute(data)


async def test_labware_raises_when_moved_onto_itself(
    decoy: Decoy,
    subject: MoveLabwareImplementation,
    state_view: StateView,
) -> None:
    """It should raise when the OnLabwareLocation has the same labware ID as the labware being moved."""
    data = MoveLabwareParams(
        labwareId="the-same-labware-id",
        newLocation=OnLabwareLocation(labwareId="a-cool-labware-id"),
        strategy=LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE,
    )

    decoy.when(state_view.labware.get(labware_id="the-same-labware-id")).then_return(
        LoadedLabware(
            id="the-same-labware-id",
            loadName="load-name",
            definitionUri="opentrons-test/load-name/1",
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_4),
            offsetId=None,
        )
    )

    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            location=OnLabwareLocation(labwareId="a-cool-labware-id"),
        )
    ).then_return(OnLabwareLocation(labwareId="the-same-labware-id"))

    with pytest.raises(
        errors.LabwareMovementNotAllowedError,
        match="Cannot move a labware onto itself.",
    ):
        await subject.execute(data)
