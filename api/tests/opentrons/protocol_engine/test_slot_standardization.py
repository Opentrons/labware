"""Tests for `slot_standardization`."""

import pytest

from opentrons_shared_data.robot.types import RobotType

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import (
    commands,
    slot_standardization as subject,
    CommandIntent,
    DeckSlotLocation,
    OnLabwareLocation,
    LabwareLocation,
    LabwareMovementStrategy,
    LabwareOffsetVector,
    ModuleLocation,
    ModuleModel,
    OFF_DECK_LOCATION,
)


@pytest.mark.parametrize(
    ("original_location", "robot_type", "expected_location"),
    [
        # DeckSlotLocations should have their slotName standardized.
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
        # ModuleLocations, OnLabwareLocations, and OFF_DECK_LOCATIONs should be left alone.
        (
            ModuleLocation(moduleId="module-id"),
            "OT-3 Standard",
            ModuleLocation(moduleId="module-id"),
        ),
        (
            OnLabwareLocation(labwareId="labware-id"),
            "OT-3 Standard",
            OnLabwareLocation(labwareId="labware-id"),
        ),
        (
            OFF_DECK_LOCATION,
            "OT-3 Standard",
            OFF_DECK_LOCATION,
        ),
    ],
)
def test_standardize_load_labware_command(
    original_location: LabwareLocation,
    robot_type: RobotType,
    expected_location: LabwareLocation,
) -> None:
    """It should convert deck slots in `LoadLabwareCreate`s."""
    original = commands.LoadLabwareCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.LoadLabwareParams(
            location=original_location,
            loadName="loadName",
            namespace="namespace",
            version=123,
            labwareId="labwareId",
            displayName="displayName",
        ),
    )
    expected = commands.LoadLabwareCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.LoadLabwareParams(
            location=expected_location,
            loadName="loadName",
            namespace="namespace",
            version=123,
            labwareId="labwareId",
            displayName="displayName",
        ),
    )
    assert subject.standardize_command(original, robot_type) == expected


@pytest.mark.parametrize(
    ("original_location", "robot_type", "expected_location"),
    [
        # DeckSlotLocations should have their slotName standardized.
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
        # ModuleLocations and OFF_DECK_LOCATIONs should be left alone.
        (
            ModuleLocation(moduleId="module-id"),
            "OT-3 Standard",
            ModuleLocation(moduleId="module-id"),
        ),
        (
            OnLabwareLocation(labwareId="labware-id"),
            "OT-3 Standard",
            OnLabwareLocation(labwareId="labware-id"),
        ),
        (
            OFF_DECK_LOCATION,
            "OT-3 Standard",
            OFF_DECK_LOCATION,
        ),
    ],
)
def test_standardize_move_labware_command(
    original_location: LabwareLocation,
    robot_type: RobotType,
    expected_location: LabwareLocation,
) -> None:
    """It should convert deck slots in `MoveLabwareCreate`s."""
    original = commands.MoveLabwareCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.MoveLabwareParams(
            newLocation=original_location,
            labwareId="labwareId",
            strategy=LabwareMovementStrategy.USING_GRIPPER,
            pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
            dropOffset=LabwareOffsetVector(x=4, y=5, z=6),
        ),
    )
    expected = commands.MoveLabwareCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.MoveLabwareParams(
            newLocation=expected_location,
            labwareId="labwareId",
            strategy=LabwareMovementStrategy.USING_GRIPPER,
            pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
            dropOffset=LabwareOffsetVector(x=4, y=5, z=6),
        ),
    )
    assert subject.standardize_command(original, robot_type) == expected


@pytest.mark.parametrize(
    ("original_location", "robot_type", "expected_location"),
    [
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-2 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_5),
        ),
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-3 Standard",
            DeckSlotLocation(slotName=DeckSlotName.SLOT_C2),
        ),
    ],
)
def test_standardize_load_module_command(
    original_location: DeckSlotLocation,
    robot_type: RobotType,
    expected_location: DeckSlotLocation,
) -> None:
    """It should convert deck slots in `LoadModuleCreate`s."""
    original = commands.LoadModuleCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.LoadModuleParams(
            location=original_location,
            model=ModuleModel.MAGNETIC_MODULE_V1,
            moduleId="moduleId",
        ),
    )
    expected = commands.LoadModuleCreate(
        intent=CommandIntent.SETUP,
        key="key",
        params=commands.LoadModuleParams(
            location=expected_location,
            model=ModuleModel.MAGNETIC_MODULE_V1,
            moduleId="moduleId",
        ),
    )
    assert subject.standardize_command(original, robot_type) == expected


@pytest.mark.parametrize("robot_type", ["OT-2 Standard", "OT-3 Standard"])
def test_standardize_other_commands(robot_type: RobotType) -> None:
    """If a`CommandCreate` contains no deck slot, it should be passed through unchanged."""
    original = commands.HomeCreate(params=commands.HomeParams())
    assert subject.standardize_command(original, robot_type) == original
