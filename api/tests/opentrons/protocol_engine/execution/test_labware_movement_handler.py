"""Test labware movement command execution side effects."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Union, Optional, Tuple
from unittest.mock import sentinel

from decoy import Decoy, matchers
import pytest

from opentrons.protocol_engine.execution import EquipmentHandler, MovementHandler
from opentrons.hardware_control import HardwareControlAPI
from opentrons.types import DeckSlotName, Point

from opentrons.hardware_control.types import OT3Mount, Axis
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    ModuleLocation,
    OnLabwareLocation,
    LabwareOffset,
    LegacyLabwareOffsetLocation,
    LabwareOffsetVector,
    LabwareLocation,
    NonStackedLocation,
    LabwareMovementOffsetData,
    Dimensions,
)
from opentrons.protocol_engine.execution.thermocycler_plate_lifter import (
    ThermocyclerPlateLifter,
)
from opentrons.protocol_engine.execution.thermocycler_movement_flagger import (
    ThermocyclerMovementFlagger,
)
from opentrons.protocol_engine.execution.heater_shaker_movement_flagger import (
    HeaterShakerMovementFlagger,
)

from opentrons.protocol_engine.execution.labware_movement import (
    LabwareMovementHandler,
)
from opentrons.protocol_engine.errors import (
    HardwareNotSupportedError,
    GripperNotAttachedError,
    LabwareMovementNotAllowedError,
    ThermocyclerNotOpenError,
    HeaterShakerLabwareLatchNotOpenError,
)
from opentrons.protocol_engine.state.state import StateStore

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.fixture
def state_store(decoy: Decoy) -> StateStore:
    """Get a mocked out StateStore instance."""
    return decoy.mock(cls=StateStore)


@pytest.fixture
def equipment(decoy: Decoy) -> EquipmentHandler:
    """Get a mocked out EquipmentHandler instance."""
    return decoy.mock(cls=EquipmentHandler)


@pytest.fixture
def movement(decoy: Decoy) -> MovementHandler:
    """Get a mocked out MovementHandler."""
    return decoy.mock(cls=MovementHandler)


@pytest.fixture
def thermocycler_plate_lifter(decoy: Decoy) -> ThermocyclerPlateLifter:
    """Get a mocked out ThermocyclerPlateLifter instance."""
    return decoy.mock(cls=ThermocyclerPlateLifter)


@pytest.fixture
def thermocycler_movement_flagger(decoy: Decoy) -> ThermocyclerMovementFlagger:
    """Get a mocked out ThermocyclerMovementFlagger instance."""
    return decoy.mock(cls=ThermocyclerMovementFlagger)


@pytest.fixture
def heater_shaker_movement_flagger(decoy: Decoy) -> HeaterShakerMovementFlagger:
    """Get a mocked out HeaterShakerMovementFlagger instance."""
    return decoy.mock(cls=HeaterShakerMovementFlagger)


@pytest.fixture
def hardware_gripper_offset_data() -> (
    Tuple[LabwareMovementOffsetData, LabwareMovementOffsetData]
):
    """Get a set of mocked labware offset data."""
    user_offset_data = LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=123, y=234, z=345),
        dropOffset=LabwareOffsetVector(x=111, y=222, z=333),
    )
    final_offset_data = LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=-1, y=-2, z=-3),
        dropOffset=LabwareOffsetVector(x=1, y=2, z=3),
    )
    return user_offset_data, final_offset_data


def default_experimental_movement_data() -> LabwareMovementOffsetData:
    """Experimental movement data with default values."""
    return LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
        dropOffset=LabwareOffsetVector(x=0, y=0, z=0),
    )


async def set_up_decoy_hardware_gripper(
    decoy: Decoy, ot3_hardware_api: OT3API, state_store: StateStore
) -> None:
    """Shared hardware gripper decoy setup."""
    decoy.when(state_store.config.use_virtual_gripper).then_return(False)
    decoy.when(ot3_hardware_api.has_gripper()).then_return(True)
    decoy.when(ot3_hardware_api.gripper_jaw_can_home()).then_return(True)
    assert ot3_hardware_api.hardware_gripper
    decoy.when(
        await ot3_hardware_api.gantry_position(mount=OT3Mount.GRIPPER)
    ).then_return(Point(x=777, y=888, z=999))

    decoy.when(
        await ot3_hardware_api.encoder_current_position_ot3(OT3Mount.GRIPPER)
    ).then_return({Axis.G: 4.0})

    decoy.when(
        ot3_hardware_api.hardware_gripper.geometry.max_allowed_grip_error
    ).then_return(6.0)

    decoy.when(ot3_hardware_api.hardware_gripper.jaw_width).then_return(89)

    decoy.when(
        state_store.labware.get_grip_force(sentinel.my_teleporting_labware_def)
    ).then_return(100)

    decoy.when(state_store.labware.get_labware_offset("new-offset-id")).then_return(
        LabwareOffset(
            id="new-offset-id",
            createdAt=datetime(year=2022, month=10, day=20),
            definitionUri="my-labware",
            location=LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_5
            ),  # this location doesn't matter for this test
            vector=LabwareOffsetVector(x=0.5, y=0.6, z=0.7),
        )
    )


@pytest.mark.ot3_only
@pytest.fixture
def subject(
    ot3_hardware_api: OT3API,
    state_store: StateStore,
    equipment: EquipmentHandler,
    movement: MovementHandler,
    thermocycler_plate_lifter: ThermocyclerPlateLifter,
    thermocycler_movement_flagger: ThermocyclerMovementFlagger,
    heater_shaker_movement_flagger: HeaterShakerMovementFlagger,
) -> LabwareMovementHandler:
    """Get LabwareMovementHandler for OT3, with its dependencies mocked out."""
    return LabwareMovementHandler(
        hardware_api=ot3_hardware_api,
        state_store=state_store,
        equipment=equipment,
        movement=movement,
        thermocycler_plate_lifter=thermocycler_plate_lifter,
        thermocycler_movement_flagger=thermocycler_movement_flagger,
        heater_shaker_movement_flagger=heater_shaker_movement_flagger,
    )


@pytest.mark.ot3_only
async def test_raise_error_if_gripper_pickup_failed(
    decoy: Decoy,
    state_store: StateStore,
    thermocycler_plate_lifter: ThermocyclerPlateLifter,
    ot3_hardware_api: OT3API,
    subject: LabwareMovementHandler,
    hardware_gripper_offset_data: Tuple[
        LabwareMovementOffsetData, LabwareMovementOffsetData
    ],
) -> None:
    """Test that the gripper position check is called at the right time."""
    #  This function should only be called when after the gripper opens,
    #  and then closes again. This is when we expect the labware to be
    #  in the gripper jaws.
    await set_up_decoy_hardware_gripper(decoy, ot3_hardware_api, state_store)
    assert ot3_hardware_api.hardware_gripper

    user_offset_data, final_offset_data = hardware_gripper_offset_data

    starting_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    to_location = DeckSlotLocation(slotName=DeckSlotName.SLOT_2)

    decoy.when(
        state_store.labware.get_definition("my-teleporting-labware")
    ).then_return(sentinel.my_teleporting_labware_def)

    mock_tc_context_manager = decoy.mock(name="mock_tc_context_manager")
    decoy.when(
        thermocycler_plate_lifter.lift_plate_for_labware_movement(
            labware_location=starting_location
        )
    ).then_return(mock_tc_context_manager)

    current_labware = state_store.labware.get_definition(
        labware_id="my-teleporting-labware"
    )

    decoy.when(
        state_store.geometry.get_final_labware_movement_offset_vectors(
            from_location=starting_location,
            to_location=to_location,
            additional_offset_vector=user_offset_data,
            current_labware=current_labware,
        )
    ).then_return(final_offset_data)

    decoy.when(
        state_store.geometry.get_labware_grip_point(
            labware_definition=sentinel.my_teleporting_labware_def,
            location=starting_location,
        )
    ).then_return(Point(101, 102, 119.5))

    decoy.when(
        state_store.geometry.get_labware_grip_point(
            labware_definition=sentinel.my_teleporting_labware_def, location=to_location
        )
    ).then_return(Point(201, 202, 219.5))

    decoy.when(
        state_store.labware.get_dimensions(
            labware_definition=sentinel.my_teleporting_labware_def
        )
    ).then_return(Dimensions(x=100, y=85, z=0))

    decoy.when(
        state_store.labware.get_well_bbox(
            labware_definition=sentinel.my_teleporting_labware_def
        )
    ).then_return(Dimensions(x=99, y=80, z=1))

    await subject.move_labware_with_gripper(
        labware_id="my-teleporting-labware",
        current_location=starting_location,
        new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
        user_offset_data=user_offset_data,
        post_drop_slide_offset=Point(x=1, y=1, z=1),
    )

    decoy.verify(
        await ot3_hardware_api.home(axes=[Axis.Z_L, Axis.Z_R, Axis.Z_G]),
        await mock_tc_context_manager.__aenter__(),
        await ot3_hardware_api.grip(force_newtons=100),
        await ot3_hardware_api.ungrip(),
        await ot3_hardware_api.grip(force_newtons=100),
        ot3_hardware_api.raise_error_if_gripper_pickup_failed(
            expected_grip_width=85,
            grip_width_uncertainty_wider=0,
            grip_width_uncertainty_narrower=5,
        ),
        await ot3_hardware_api.grip(force_newtons=100),
        ot3_hardware_api.raise_error_if_gripper_pickup_failed(
            expected_grip_width=85,
            grip_width_uncertainty_wider=0,
            grip_width_uncertainty_narrower=5,
        ),
        await ot3_hardware_api.grip(force_newtons=100),
        ot3_hardware_api.raise_error_if_gripper_pickup_failed(
            expected_grip_width=85,
            grip_width_uncertainty_wider=0,
            grip_width_uncertainty_narrower=5,
        ),
        await ot3_hardware_api.disengage_axes([Axis.Z_G]),
        await ot3_hardware_api.ungrip(),
        await ot3_hardware_api.ungrip(),
    )


# TODO (spp, 2022-10-18):
#  1. Should write an acceptance test w/ real labware on ot3 deck.
#  2. This test will be split once waypoints generation is moved to motion planning.
@pytest.mark.parametrize(
    argnames=["from_location", "to_location", "slide_offset"],
    argvalues=[
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            None,
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ModuleLocation(moduleId="module-id"),
            Point(x=50, y=0, z=0),
        ),
        (
            OnLabwareLocation(labwareId="a-labware-id"),
            OnLabwareLocation(labwareId="another-labware-id"),
            None,
        ),
        (
            ModuleLocation(moduleId="a-module-id"),
            DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            Point(x=-10, y=40, z=-40),
        ),
    ],
)
@pytest.mark.ot3_only
async def test_move_labware_with_gripper(
    decoy: Decoy,
    state_store: StateStore,
    thermocycler_plate_lifter: ThermocyclerPlateLifter,
    ot3_hardware_api: OT3API,
    subject: LabwareMovementHandler,
    from_location: Union[DeckSlotLocation, ModuleLocation, OnLabwareLocation],
    to_location: Union[DeckSlotLocation, ModuleLocation, OnLabwareLocation],
    slide_offset: Optional[Point],
    hardware_gripper_offset_data: Tuple[
        LabwareMovementOffsetData, LabwareMovementOffsetData
    ],
) -> None:
    """It should perform a labware movement with gripper by delegating to OT3API."""
    # TODO (spp, 2023-07-26): this test does NOT stub out movement waypoints in order to
    #  keep this as the semi-smoke test that it previously was. We should add a proper
    #  smoke test for gripper labware movement with actual labware and make this a unit test.
    await set_up_decoy_hardware_gripper(decoy, ot3_hardware_api, state_store)

    decoy.when(
        state_store.labware.get_definition("my-teleporting-labware")
    ).then_return(sentinel.my_teleporting_labware_def)

    user_offset_data, final_offset_data = hardware_gripper_offset_data
    current_labware = state_store.labware.get_definition(
        labware_id="my-teleporting-labware"
    )
    decoy.when(
        state_store.geometry.get_final_labware_movement_offset_vectors(
            from_location=from_location,
            to_location=to_location,
            additional_offset_vector=user_offset_data,
            current_labware=current_labware,
        )
    ).then_return(final_offset_data)

    decoy.when(
        state_store.labware.get_dimensions(
            labware_definition=sentinel.my_teleporting_labware_def
        )
    ).then_return(Dimensions(x=100, y=85, z=0))

    decoy.when(
        state_store.labware.get_well_bbox(
            labware_definition=sentinel.my_teleporting_labware_def
        )
    ).then_return(Dimensions(x=99, y=80, z=1))

    decoy.when(
        state_store.geometry.get_labware_grip_point(
            labware_definition=sentinel.my_teleporting_labware_def,
            location=from_location,
        )
    ).then_return(Point(101, 102, 119.5))
    decoy.when(
        state_store.geometry.get_labware_grip_point(
            labware_definition=sentinel.my_teleporting_labware_def, location=to_location
        )
    ).then_return(Point(201, 202, 219.5))
    mock_tc_context_manager = decoy.mock(name="mock_tc_context_manager")
    decoy.when(
        thermocycler_plate_lifter.lift_plate_for_labware_movement(
            labware_location=from_location
        )
    ).then_return(mock_tc_context_manager)

    expected_waypoints = [
        Point(100, 100, 999),  # move to above slot 1
        Point(100, 100, 116.5),  # move to labware on slot 1
        Point(100, 100, 999),  # gripper retract at current location
        Point(202.0, 204.0, 999),  # move to above slot 3
        Point(202.0, 204.0, 222.5),  # move down to labware drop height on slot 3
        Point(202.0, 204.0, 999),  # retract in place
    ]

    await subject.move_labware_with_gripper(
        labware_id="my-teleporting-labware",
        current_location=from_location,
        new_location=to_location,
        user_offset_data=user_offset_data,
        post_drop_slide_offset=slide_offset,
    )

    gripper = OT3Mount.GRIPPER

    if slide_offset is None:
        decoy.verify(
            await ot3_hardware_api.home(axes=[Axis.Z_L, Axis.Z_R, Axis.Z_G]),
            await mock_tc_context_manager.__aenter__(),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[0]
            ),
            await ot3_hardware_api.ungrip(),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[1]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[2]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[3]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[4]
            ),
            await ot3_hardware_api.disengage_axes([Axis.Z_G]),
            await ot3_hardware_api.ungrip(),
            await ot3_hardware_api.home_z(OT3Mount.GRIPPER),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[5]
            ),
            await ot3_hardware_api.idle_gripper(),
        )
    else:
        decoy.verify(
            await ot3_hardware_api.home(axes=[Axis.Z_L, Axis.Z_R, Axis.Z_G]),
            await mock_tc_context_manager.__aenter__(),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[0]
            ),
            await ot3_hardware_api.ungrip(),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[1]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[2]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[3]
            ),
            await ot3_hardware_api.grip(force_newtons=100),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[4]
            ),
            await ot3_hardware_api.disengage_axes([Axis.Z_G]),
            await ot3_hardware_api.ungrip(),
            await ot3_hardware_api.home_z(OT3Mount.GRIPPER),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[5]
            ),
            await ot3_hardware_api.ungrip(),
            await ot3_hardware_api.move_to(
                mount=gripper, abs_position=expected_waypoints[5] + slide_offset
            ),
            await ot3_hardware_api.idle_gripper(),
        )


async def test_labware_movement_raises_on_ot2(
    decoy: Decoy,
    state_store: StateStore,
    hardware_api: HardwareControlAPI,
    equipment: EquipmentHandler,
    movement: MovementHandler,
) -> None:
    """It should raise an error when attempting a gripper movement on a non-OT3 bot."""
    decoy.when(state_store.config.use_virtual_gripper).then_return(False)
    subject = LabwareMovementHandler(
        hardware_api=hardware_api,
        state_store=state_store,
        equipment=equipment,
        movement=movement,
    )

    with pytest.raises(HardwareNotSupportedError):
        await subject.move_labware_with_gripper(
            labware_id="labware-id",
            current_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            user_offset_data=default_experimental_movement_data(),
            post_drop_slide_offset=None,
        )


@pytest.mark.ot3_only
async def test_labware_movement_skips_for_virtual_gripper(
    decoy: Decoy,
    state_store: StateStore,
    ot3_hardware_api: OT3API,
    subject: LabwareMovementHandler,
) -> None:
    """It should neither raise error nor move gripper when using virtual gripper."""
    decoy.when(state_store.config.use_virtual_gripper).then_return(True)
    await subject.move_labware_with_gripper(
        labware_id="labware-id",
        current_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        user_offset_data=default_experimental_movement_data(),
        post_drop_slide_offset=None,
    )
    decoy.verify(
        await ot3_hardware_api.move_to(
            mount=matchers.Anything(), abs_position=matchers.Anything()
        ),
        times=0,
        ignore_extra_args=True,
    )


@pytest.mark.ot3_only
async def test_labware_movement_raises_without_gripper(
    decoy: Decoy,
    state_store: StateStore,
    ot3_hardware_api: OT3API,
    subject: LabwareMovementHandler,
) -> None:
    """It should raise an error when attempting a gripper movement without a gripper."""
    decoy.when(state_store.config.use_virtual_gripper).then_return(False)
    decoy.when(ot3_hardware_api.has_gripper()).then_return(False)
    with pytest.raises(GripperNotAttachedError):
        await subject.move_labware_with_gripper(
            labware_id="labware-id",
            current_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            user_offset_data=default_experimental_movement_data(),
            post_drop_slide_offset=None,
        )


@pytest.mark.parametrize(
    argnames=["from_loc", "to_loc"],
    argvalues=[
        (
            ModuleLocation(moduleId="a-thermocycler-id"),
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            ModuleLocation(moduleId="a-thermocycler-id"),
        ),
    ],
)
async def test_ensure_movement_obstructed_by_thermocycler_raises(
    decoy: Decoy,
    subject: LabwareMovementHandler,
    state_store: StateStore,
    thermocycler_movement_flagger: ThermocyclerMovementFlagger,
    from_loc: NonStackedLocation,
    to_loc: LabwareLocation,
) -> None:
    """It should raise error when labware movement is obstructed by thermocycler."""
    decoy.when(
        state_store.labware.get_parent_location(labware_id="labware-id")
    ).then_return(from_loc)
    decoy.when(
        await thermocycler_movement_flagger.raise_if_labware_in_non_open_thermocycler(
            labware_parent=ModuleLocation(moduleId="a-thermocycler-id")
        )
    ).then_raise(ThermocyclerNotOpenError("Thou shall not pass!"))

    with pytest.raises(LabwareMovementNotAllowedError):
        await subject.ensure_movement_not_obstructed_by_module(
            labware_id="labware-id", new_location=to_loc
        )


async def test_ensure_movement_not_obstructed_by_modules(
    decoy: Decoy,
    subject: LabwareMovementHandler,
    state_store: StateStore,
) -> None:
    """It should not raise error when labware movement is not obstructed by thermocycler."""
    decoy.when(
        state_store.labware.get_parent_location(labware_id="labware-id")
    ).then_return(ModuleLocation(moduleId="a-rando-module-id"))
    await subject.ensure_movement_not_obstructed_by_module(
        labware_id="labware-id",
        new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
    )


@pytest.mark.parametrize(
    argnames=["from_loc", "to_loc"],
    argvalues=[
        (
            ModuleLocation(moduleId="a-heater-shaker-id"),
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
            ModuleLocation(moduleId="a-heater-shaker-id"),
        ),
    ],
)
async def test_ensure_movement_obstructed_by_heater_shaker_raises(
    decoy: Decoy,
    subject: LabwareMovementHandler,
    heater_shaker_movement_flagger: HeaterShakerMovementFlagger,
    state_store: StateStore,
    from_loc: NonStackedLocation,
    to_loc: LabwareLocation,
) -> None:
    """It should raise error when labware movement is obstructed by thermocycler."""
    decoy.when(
        state_store.labware.get_parent_location(labware_id="labware-id")
    ).then_return(from_loc)
    decoy.when(
        await heater_shaker_movement_flagger.raise_if_labware_latched_on_heater_shaker(
            labware_parent=ModuleLocation(moduleId="a-heater-shaker-id")
        )
    ).then_raise(HeaterShakerLabwareLatchNotOpenError("Thou shall not take!"))

    with pytest.raises(LabwareMovementNotAllowedError):
        await subject.ensure_movement_not_obstructed_by_module(
            labware_id="labware-id", new_location=to_loc
        )


async def test_ensure_movement_not_obstructed_does_not_raise_for_slot_locations(
    decoy: Decoy,
    subject: LabwareMovementHandler,
    state_store: StateStore,
) -> None:
    """It should not raise error when moving from slot to slot."""
    decoy.when(
        state_store.labware.get_parent_location(labware_id="labware-id")
    ).then_return(DeckSlotLocation(slotName=DeckSlotName.SLOT_1))
    await subject.ensure_movement_not_obstructed_by_module(
        labware_id="labware-id",
        new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
    )
