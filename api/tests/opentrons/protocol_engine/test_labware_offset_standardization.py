"""Tests for `labware_offset_standardization`."""

from functools import lru_cache
import pytest

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck import load
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons.types import DeckSlotName
from opentrons.protocol_engine import labware_offset_standardization as subject
from opentrons.protocol_engine.types import (
    LabwareOffsetCreate,
    LegacyLabwareOffsetCreate,
    LegacyLabwareOffsetLocation,
    OnLabwareOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnAddressableAreaOffsetLocationSequenceComponent,
    ModuleModel,
    LabwareOffsetVector,
    LabwareOffsetLocationSequence,
    LabwareOffsetCreateInternal,
)


@lru_cache
def load_from_robot_type(robot_type: RobotType) -> DeckDefinitionV5:
    """Get a deck from robot type."""
    if robot_type == "OT-3 Standard":
        return load("ot3_standard")
    else:
        return load("ot2_standard")


@pytest.mark.parametrize(
    ("location", "robot_type", "expected_modern_location", "expected_legacy_location"),
    [
        # Directly on a slot
        pytest.param(
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_5),
            "OT-2 Standard",
            [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="5")],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_5),
            id="direct-slot-ot2-native",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_5),
            "OT-3 Standard",
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="C2"
                )
            ],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_C2),
            id="direct-slot-flex-ot2",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-2 Standard",
            [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="5")],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_5),
            id="direct-slot-ot2-flex",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_C2),
            "OT-3 Standard",
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="C2"
                )
            ],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_C2),
            id="direct-slot-flex-native",
        ),
        # On a module with no adapter
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-3 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-flex-native",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-3 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-flex-ot2",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-2 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-ot2-flex",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-2 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-ot2-native",
        ),
        # On a labware (or stack...) on a slot
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1, definitionUri="opentrons-test/foo/1"
            ),
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="D1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-flex-native",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1, definitionUri="opentrons-test/foo/1"
            ),
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-ot2-flex",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1, definitionUri="opentrons-test/foo/1"
            ),
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="D1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-flex-ot2",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1, definitionUri="opentrons-test/foo/1"
            ),
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-ot2-native",
        ),
        # On an adapter on a module
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-module-flex-native",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-module-ot2-flex",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-module-flex-ot2",
        ),
        pytest.param(
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-module-ot2-native",
        ),
    ],
)
def test_standardize_legacy_labware_offset(
    location: LegacyLabwareOffsetLocation,
    robot_type: RobotType,
    expected_modern_location: LabwareOffsetLocationSequence,
    expected_legacy_location: LegacyLabwareOffsetLocation,
) -> None:
    """It should convert deck slots in `LegacyLabwareOffsetCreate`s and go to the new format."""
    deck_def = load_from_robot_type(robot_type)
    original = LegacyLabwareOffsetCreate(
        definitionUri="opentrons-test/foo/1",
        location=location,
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    expected = LabwareOffsetCreateInternal(
        definitionUri="opentrons-test/foo/1",
        legacyLocation=expected_legacy_location,
        locationSequence=expected_modern_location,
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    assert (
        subject.standardize_labware_offset_create(original, robot_type, deck_def)
        == expected
    )


@pytest.mark.parametrize(
    ("location", "robot_type", "expected_modern_location", "expected_legacy_location"),
    [
        # Directly on a slot
        pytest.param(
            [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="5")],
            "OT-2 Standard",
            [OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="5")],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_5),
            id="slot-direct-ot2",
        ),
        pytest.param(
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="C2"
                )
            ],
            "OT-3 Standard",
            [
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="C2"
                )
            ],
            LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_C2),
            id="slot-direct-flex",
        ),
        # On a module with no adapter
        pytest.param(
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            "OT-3 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-slot-flex",
        ),
        pytest.param(
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            "OT-2 Standard",
            [
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="module-slot-ot2",
        ),
        # On a labware  on a slot
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="D1"
                ),
            ],
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="D1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-flex",
        ),
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1, definitionUri="opentrons-test/foo/1"
            ),
            id="labware-slot-ot2",
        ),
        # On an adapter on a module
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="temperatureModuleV2D1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_D1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-module-flex",
        ),
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-slot-ot2",
        ),
        # On a stack of labware
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A3",
                ),
            ],
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A3",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_A3,
                definitionUri="opentrons-test/foo/1",
            ),
            id="labware-stack-flex",
        ),
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="2",
                ),
            ],
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="2",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_2,
                definitionUri="opentrons-test/foo/1",
            ),
            id="labware-stack-ot2",
        ),
        # On a stack of labware on a module
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3",
                ),
            ],
            "OT-2 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="3",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_3,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-stack-module-ot2",
        ),
        pytest.param(
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1",
                ),
            ],
            "OT-3 Standard",
            [
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/foo/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/bar/1"
                ),
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="opentrons-test/baz/1"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1",
                ),
            ],
            LegacyLabwareOffsetLocation(
                slotName=DeckSlotName.SLOT_A1,
                definitionUri="opentrons-test/foo/1",
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V2,
            ),
            id="labware-stack-module-flex",
        ),
    ],
)
def test_standardize_modern_labware_offset(
    location: LabwareOffsetLocationSequence,
    robot_type: RobotType,
    expected_modern_location: LabwareOffsetLocationSequence,
    expected_legacy_location: LegacyLabwareOffsetLocation,
) -> None:
    """It should convert deck slots in `LabwareOffsetCreate`s and fill in the old format."""
    deck_def = load_from_robot_type(robot_type)
    original = LabwareOffsetCreate(
        definitionUri="opentrons-test/foo/1",
        locationSequence=location,
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    expected = LabwareOffsetCreateInternal(
        definitionUri="opentrons-test/foo/1",
        legacyLocation=expected_legacy_location,
        locationSequence=expected_modern_location,
        vector=LabwareOffsetVector(x=1, y=2, z=3),
    )
    assert (
        subject.standardize_labware_offset_create(original, robot_type, deck_def)
        == expected
    )
