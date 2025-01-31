"""Labware state store tests.

DEPRECATED: Testing LabwareView independently of LabwareStore is no
longer helpful. Try to add new tests to test_labware_state.py, where they can be
tested together, treating LabwareState as a private implementation detail.
"""

import pytest
from datetime import datetime
from typing import Dict, Optional, cast, ContextManager, Any, Union, NamedTuple, List
from contextlib import nullcontext as does_not_raise

from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.pipette.types import LabwareUri
from opentrons_shared_data.labware import load_definition
from opentrons_shared_data.labware.labware_definition import (
    Parameters,
    LabwareDefinition,
    LabwareRole,
    OverlapOffset as SharedDataOverlapOffset,
    GripperOffsets,
    OffsetVector,
)

from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT2_DECK,
    STANDARD_OT3_DECK,
)
from opentrons.types import DeckSlotName, MountType

from opentrons.protocol_engine import errors
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    Dimensions,
    LabwareOffset,
    LabwareOffsetVector,
    LegacyLabwareOffsetLocation,
    LoadedLabware,
    ModuleModel,
    ModuleLocation,
    OnLabwareLocation,
    LabwareLocation,
    AddressableAreaLocation,
    OFF_DECK_LOCATION,
    OverlapOffset,
    LabwareMovementOffsetData,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
)
from opentrons.protocol_engine.state._move_types import EdgePathType
from opentrons.protocol_engine.state.labware import (
    LabwareState,
    LabwareView,
    LabwareLoadParams,
)

plate = LoadedLabware(
    id="plate-id",
    loadName="plate-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    definitionUri="some-plate-uri",
    offsetId=None,
    displayName="Fancy Plate Name",
)

flex_tiprack = LoadedLabware(
    id="flex-tiprack-id",
    loadName="flex-tiprack-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    definitionUri="some-flex-tiprack-uri",
    offsetId=None,
    displayName="Flex Tiprack Name",
)

reservoir = LoadedLabware(
    id="reservoir-id",
    loadName="reservoir-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
    definitionUri="some-reservoir-uri",
    offsetId=None,
)

trash = LoadedLabware(
    id="trash-id",
    loadName="trash-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
    definitionUri="some-trash-uri",
    offsetId=None,
)

tube_rack = LoadedLabware(
    id="tube-rack-id",
    loadName="tube-rack-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    definitionUri="some-tube-rack-uri",
    offsetId=None,
)

tip_rack = LoadedLabware(
    id="tip-rack-id",
    loadName="tip-rack-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    definitionUri="some-tip-rack-uri",
    offsetId=None,
)

adapter_plate = LoadedLabware(
    id="adapter-plate-id",
    loadName="adapter-load-name",
    location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
    definitionUri="some-adapter-uri",
    offsetId=None,
)


def get_labware_view(
    labware_by_id: Optional[Dict[str, LoadedLabware]] = None,
    labware_offsets_by_id: Optional[Dict[str, LabwareOffset]] = None,
    definitions_by_uri: Optional[Dict[str, LabwareDefinition]] = None,
    deck_definition: Optional[DeckDefinitionV5] = None,
) -> LabwareView:
    """Get a labware view test subject."""
    state = LabwareState(
        labware_by_id=labware_by_id or {},
        labware_offsets_by_id=labware_offsets_by_id or {},
        definitions_by_uri=definitions_by_uri or {},
        deck_definition=deck_definition or cast(DeckDefinitionV5, {"fake": True}),
    )

    return LabwareView(state=state)


def test_get_labware_data_bad_id() -> None:
    """get_labware_data_by_id should raise if labware ID doesn't exist."""
    subject = get_labware_view()

    with pytest.raises(errors.LabwareNotLoadedError):
        subject.get("asdfghjkl")


def test_get_labware_data_by_id() -> None:
    """It should retrieve labware data from the state."""
    subject = get_labware_view(labware_by_id={"plate-id": plate})

    assert subject.get("plate-id") == plate


def test_get_id_by_module() -> None:
    """Should return the labware id associated to the module."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="test-uri",
                location=ModuleLocation(moduleId="module-id"),
            )
        }
    )
    assert subject.get_id_by_module(module_id="module-id") == "labware-id"


def test_get_id_by_module_raises_error() -> None:
    """Should raise error that labware not found."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="test-uri",
                location=ModuleLocation(moduleId="module-id"),
            )
        }
    )
    with pytest.raises(errors.exceptions.LabwareNotLoadedOnModuleError):
        subject.get_id_by_module(module_id="no-module-id")


def test_get_id_by_labware() -> None:
    """Should return the labware id associated to the labware."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="test-uri",
                location=OnLabwareLocation(labwareId="other-labware-id"),
            )
        }
    )
    assert subject.get_id_by_labware(labware_id="other-labware-id") == "labware-id"


def test_get_id_by_labware_raises_error() -> None:
    """Should raise error that labware not found."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="test-uri",
                location=OnLabwareLocation(labwareId="other-labware-id"),
            )
        }
    )
    with pytest.raises(errors.exceptions.LabwareNotLoadedOnLabwareError):
        subject.get_id_by_labware(labware_id="no-labware-id")


def test_raise_if_labware_has_labware_on_top() -> None:
    """It should raise if labware has another labware on top."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id-1": LoadedLabware(
                id="labware-id-1",
                loadName="test",
                definitionUri="test-uri",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ),
            "labware-id-2": LoadedLabware(
                id="labware-id-2",
                loadName="test",
                definitionUri="test-uri",
                location=ModuleLocation(moduleId="module-id"),
            ),
            "labware-id-3": LoadedLabware(
                id="labware-id-3",
                loadName="test",
                definitionUri="test-uri",
                location=OnLabwareLocation(labwareId="labware-id-1"),
            ),
        }
    )
    subject.raise_if_labware_has_labware_on_top("labware-id-2")
    subject.raise_if_labware_has_labware_on_top("labware-id-3")
    with pytest.raises(errors.exceptions.LabwareIsInStackError):
        subject.raise_if_labware_has_labware_on_top("labware-id-1")


def test_get_labware_definition(well_plate_def: LabwareDefinition) -> None:
    """It should get a labware's definition from the state."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    assert subject.get_definition("plate-id") == well_plate_def


def test_get_labware_definition_bad_id() -> None:
    """get_labware_definition should raise if labware definition doesn't exist."""
    subject = get_labware_view()

    with pytest.raises(errors.LabwareDefinitionDoesNotExistError):
        subject.get_definition_by_uri(cast(LabwareUri, "not-a-uri"))


@pytest.mark.parametrize(
    argnames=["namespace", "version"],
    argvalues=[("world", 123), (None, 123), ("world", None), (None, None)],
)
def test_find_custom_labware_params(
    namespace: Optional[str], version: Optional[int]
) -> None:
    """It should find the missing (if any) load labware parameters."""
    labware_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(loadName="hello"),  # type: ignore[call-arg]
        namespace="world",
        version=123,
    )
    standard_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(loadName="goodbye"),  # type: ignore[call-arg]
        namespace="opentrons",
        version=456,
    )

    subject = get_labware_view(
        definitions_by_uri={
            "some-labware-uri": labware_def,
            "some-standard-uri": standard_def,
        },
    )

    result = subject.find_custom_labware_load_params()

    assert result == [
        LabwareLoadParams(load_name="hello", namespace="world", version=123)
    ]


def test_get_all_labware(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return all labware."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": plate,
            "reservoir-id": reservoir,
        }
    )

    all_labware = subject.get_all()

    assert all_labware == [plate, reservoir]


def test_get_labware_location() -> None:
    """It should return labware location."""
    subject = get_labware_view(labware_by_id={"plate-id": plate})

    result = subject.get_location("plate-id")

    assert result == DeckSlotLocation(slotName=DeckSlotName.SLOT_1)


@pytest.mark.parametrize(
    argnames="location",
    argvalues=[
        DeckSlotLocation(slotName=DeckSlotName.SLOT_D1),
        ModuleLocation(moduleId="module-id"),
        OFF_DECK_LOCATION,
    ],
)
def test_get_parent_location(location: LabwareLocation) -> None:
    """It should return the non-OnLabware location of a labware."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="plate-id",
                loadName="load-name",
                location=location,
                definitionUri="some-uri",
            )
        }
    )

    result = subject.get_parent_location(labware_id="labware-id")

    assert result == location


@pytest.mark.parametrize(
    argnames="location",
    argvalues=[
        DeckSlotLocation(slotName=DeckSlotName.SLOT_D1),
        ModuleLocation(moduleId="module-id"),
    ],
)
def test_get_parent_location_on_labware(location: LabwareLocation) -> None:
    """It should return the non-OnLabware location of a labware."""
    subject = get_labware_view(
        labware_by_id={
            "top-id": LoadedLabware(
                id="top-id",
                loadName="load-name",
                location=OnLabwareLocation(labwareId="middle-id"),
                definitionUri="some-uri",
            ),
            "middle-id": LoadedLabware(
                id="middle-id",
                loadName="load-name",
                location=OnLabwareLocation(labwareId="bottom-id"),
                definitionUri="some-uri",
            ),
            "bottom-id": LoadedLabware(
                id="bottom-id",
                loadName="load-name",
                location=location,
                definitionUri="some-uri",
            ),
        }
    )

    result = subject.get_parent_location(labware_id="top-id")

    assert result == location


def test_get_has_quirk(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return whether a labware by ID has a given quirk."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": plate,
            "reservoir-id": reservoir,
        },
        definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    well_plate_has_center_quirk = subject.get_has_quirk(
        labware_id="plate-id",
        quirk="centerMultichannelOnWells",
    )

    reservoir_has_center_quirk = subject.get_has_quirk(
        labware_id="reservoir-id",
        quirk="centerMultichannelOnWells",
    )

    assert well_plate_has_center_quirk is False
    assert reservoir_has_center_quirk is True


def test_quirks(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should return a labware's quirks."""
    subject = get_labware_view(
        labware_by_id={
            "plate-id": plate,
            "reservoir-id": reservoir,
        },
        definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    well_plate_quirks = subject.get_quirks("plate-id")
    reservoir_quirks = subject.get_quirks("reservoir-id")

    assert well_plate_quirks == []
    assert reservoir_quirks == ["centerMultichannelOnWells", "touchTipDisabled"]


def test_get_well_definition_bad_name(well_plate_def: LabwareDefinition) -> None:
    """get_well_definition should raise if well name doesn't exist."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    with pytest.raises(errors.WellDoesNotExistError):
        subject.get_well_definition(labware_id="plate-id", well_name="foobar")


def test_get_well_definition(well_plate_def: LabwareDefinition) -> None:
    """It should return a well definition by well name."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    expected_well_def = well_plate_def.wells["B2"]
    result = subject.get_well_definition(labware_id="plate-id", well_name="B2")

    assert result == expected_well_def


def test_get_well_definition_get_first(well_plate_def: LabwareDefinition) -> None:
    """It should return the first well definition if no given well name."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    expected_well_def = well_plate_def.wells["A1"]
    result = subject.get_well_definition(labware_id="plate-id", well_name=None)

    assert result == expected_well_def


def test_get_well_geometry_raises_error(well_plate_def: LabwareDefinition) -> None:
    """It should raise an IncompleteLabwareDefinitionError when there's no innerLabwareGeometry."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    with pytest.raises(errors.IncompleteLabwareDefinitionError):
        subject.get_well_geometry(labware_id="plate-id")


def test_get_well_size_circular(well_plate_def: LabwareDefinition) -> None:
    """It should return the well dimensions of a circular well."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )
    expected_well_def = well_plate_def.wells["A2"]
    expected_size = (
        expected_well_def.diameter,
        expected_well_def.diameter,
        expected_well_def.depth,
    )

    result = subject.get_well_size(labware_id="plate-id", well_name="A2")

    assert result == expected_size


def test_get_well_size_rectangular(reservoir_def: LabwareDefinition) -> None:
    """It should return the well dimensions of a rectangular well."""
    subject = get_labware_view(
        labware_by_id={"reservoir-id": reservoir},
        definitions_by_uri={"some-reservoir-uri": reservoir_def},
    )
    expected_well_def = reservoir_def.wells["A2"]
    expected_size = (
        expected_well_def.xDimension,
        expected_well_def.yDimension,
        expected_well_def.depth,
    )

    result = subject.get_well_size(labware_id="reservoir-id", well_name="A2")

    assert result == expected_size


def test_labware_has_well(falcon_tuberack_def: LabwareDefinition) -> None:
    """It should return a list of wells from definition."""
    subject = get_labware_view(
        labware_by_id={"tube-rack-id": tube_rack},
        definitions_by_uri={"some-tube-rack-uri": falcon_tuberack_def},
    )

    result = subject.validate_liquid_allowed_in_labware(
        labware_id="tube-rack-id", wells={"A1": 30, "B1": 100}
    )
    assert result == ["A1", "B1"]

    with pytest.raises(errors.WellDoesNotExistError):
        subject.validate_liquid_allowed_in_labware(
            labware_id="tube-rack-id", wells={"AA": 30}
        )

    with pytest.raises(errors.LabwareNotLoadedError):
        subject.validate_liquid_allowed_in_labware(labware_id="no-id", wells={"A1": 30})


def test_validate_liquid_allowed_raises_incompatible_labware() -> None:
    """It should raise when validating labware that is a tiprack or an adapter."""
    subject = get_labware_view(
        labware_by_id={
            "tiprack-id": LoadedLabware(
                id="tiprack-id",
                loadName="test1",
                definitionUri="some-tiprack-uri",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ),
            "adapter-id": LoadedLabware(
                id="adapter-id",
                loadName="test2",
                definitionUri="some-adapter-uri",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2),
            ),
        },
        definitions_by_uri={
            "some-tiprack-uri": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(isTiprack=True),  # type: ignore[call-arg]
                wells={},
            ),
            "some-adapter-uri": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(isTiprack=False),  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.adapter],
                wells={},
            ),
        },
    )

    with pytest.raises(errors.LabwareIsTipRackError):
        subject.validate_liquid_allowed_in_labware(labware_id="tiprack-id", wells={})

    with pytest.raises(errors.LabwareIsAdapterError):
        subject.validate_liquid_allowed_in_labware(labware_id="adapter-id", wells={})


def test_get_tip_length_raises_with_non_tip_rack(
    well_plate_def: LabwareDefinition,
) -> None:
    """It should raise if you try to get the tip length of a regular labware."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    with pytest.raises(errors.LabwareIsNotTipRackError):
        subject.get_tip_length("plate-id")


def test_get_tip_length_gets_length_from_definition(
    tip_rack_def: LabwareDefinition,
) -> None:
    """It should return the tip length from the definition."""
    subject = get_labware_view(
        labware_by_id={"tip-rack-id": tip_rack},
        definitions_by_uri={"some-tip-rack-uri": tip_rack_def},
    )

    length = subject.get_tip_length("tip-rack-id", 12.3)
    assert length == tip_rack_def.parameters.tipLength - 12.3  # type: ignore[operator]


def test_get_tip_drop_z_offset() -> None:
    """It should get a tip drop z offset by scaling the tip length."""
    tip_rack_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        parameters=Parameters.model_construct(  # type: ignore[call-arg]
            tipLength=100,
        )
    )

    subject = get_labware_view(
        labware_by_id={"tip-rack-id": tip_rack},
        definitions_by_uri={"some-tip-rack-uri": tip_rack_def},
    )

    result = subject.get_tip_drop_z_offset(
        labware_id="tip-rack-id", length_scale=0.5, additional_offset=-0.123
    )

    assert result == -50.123


def test_get_labware_uri_from_definition(tip_rack_def: LabwareDefinition) -> None:
    """It should return the labware's definition URI."""
    tip_rack = LoadedLabware(
        id="tip-rack-id",
        loadName="tip-rack-load-name",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        definitionUri="some-tip-rack-uri",
        offsetId=None,
    )

    subject = get_labware_view(
        labware_by_id={"tip-rack-id": tip_rack},
        definitions_by_uri={"some-tip-rack-uri": tip_rack_def},
    )

    result = subject.get_definition_uri(labware_id="tip-rack-id")
    assert result == "some-tip-rack-uri"


def test_get_labware_uri_from_full_definition(tip_rack_def: LabwareDefinition) -> None:
    """It should be able to construct a URI given a full definition."""
    subject = get_labware_view()
    result = subject.get_uri_from_definition(tip_rack_def)
    assert result == "opentrons/opentrons_96_tiprack_300ul/1"


def test_is_tiprack(
    tip_rack_def: LabwareDefinition, reservoir_def: LabwareDefinition
) -> None:
    """It should determine if labware is a tip rack."""
    subject = get_labware_view(
        labware_by_id={
            "tip-rack-id": tip_rack,
            "reservoir-id": reservoir,
        },
        definitions_by_uri={
            "some-tip-rack-uri": tip_rack_def,
            "some-reservoir-uri": reservoir_def,
        },
    )

    assert subject.is_tiprack(labware_id="tip-rack-id") is True
    assert subject.is_tiprack(labware_id="reservoir-id") is False


def test_get_load_name(reservoir_def: LabwareDefinition) -> None:
    """It should return the load name."""
    subject = get_labware_view(
        labware_by_id={"reservoir-id": reservoir},
        definitions_by_uri={"some-reservoir-uri": reservoir_def},
    )

    result = subject.get_load_name("reservoir-id")

    assert result == reservoir_def.parameters.loadName


def test_get_dimensions(well_plate_def: LabwareDefinition) -> None:
    """It should compute the dimensions of a labware."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate},
        definitions_by_uri={"some-plate-uri": well_plate_def},
    )

    result = subject.get_dimensions(labware_id="plate-id")

    assert result == Dimensions(
        x=well_plate_def.dimensions.xDimension,
        y=well_plate_def.dimensions.yDimension,
        z=well_plate_def.dimensions.zDimension,
    )


def test_get_labware_overlap_offsets() -> None:
    """It should get the labware overlap offsets."""
    subject = get_labware_view()
    result = subject.get_labware_overlap_offsets(
        definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
            stackingOffsetWithLabware={
                "bottom-labware-name": SharedDataOverlapOffset(x=1, y=2, z=3)
            }
        ),
        below_labware_name="bottom-labware-name",
    )

    assert result == OverlapOffset(x=1, y=2, z=3)


class ModuleOverlapSpec(NamedTuple):
    """Spec data to test LabwareView.get_module_overlap_offsets."""

    spec_deck_definition: DeckDefinitionV5
    module_model: ModuleModel
    stacking_offset_with_module: Dict[str, SharedDataOverlapOffset]
    expected_offset: OverlapOffset


module_overlap_specs: List[ModuleOverlapSpec] = [
    ModuleOverlapSpec(
        # Labware on temp module on OT2, with stacking overlap for temp module
        spec_deck_definition=load_deck(STANDARD_OT2_DECK, 5),
        module_model=ModuleModel.TEMPERATURE_MODULE_V2,
        stacking_offset_with_module={
            str(ModuleModel.TEMPERATURE_MODULE_V2.value): SharedDataOverlapOffset(
                x=1, y=2, z=3
            ),
        },
        expected_offset=OverlapOffset(x=1, y=2, z=3),
    ),
    ModuleOverlapSpec(
        # Labware on TC Gen1 on OT2, with stacking overlap for TC Gen1
        spec_deck_definition=load_deck(STANDARD_OT2_DECK, 5),
        module_model=ModuleModel.THERMOCYCLER_MODULE_V1,
        stacking_offset_with_module={
            str(ModuleModel.THERMOCYCLER_MODULE_V1.value): SharedDataOverlapOffset(
                x=11, y=22, z=33
            ),
        },
        expected_offset=OverlapOffset(x=11, y=22, z=33),
    ),
    ModuleOverlapSpec(
        # Labware on TC Gen2 on OT2, with no stacking overlap
        spec_deck_definition=load_deck(STANDARD_OT2_DECK, 5),
        module_model=ModuleModel.THERMOCYCLER_MODULE_V2,
        stacking_offset_with_module={},
        expected_offset=OverlapOffset(x=0, y=0, z=10.7),
    ),
    ModuleOverlapSpec(
        # Labware on TC Gen2 on Flex, with no stacking overlap
        spec_deck_definition=load_deck(STANDARD_OT3_DECK, 5),
        module_model=ModuleModel.THERMOCYCLER_MODULE_V2,
        stacking_offset_with_module={},
        expected_offset=OverlapOffset(x=0, y=0, z=0),
    ),
    ModuleOverlapSpec(
        # Labware on TC Gen2 on Flex, with stacking overlap for TC Gen2
        spec_deck_definition=load_deck(STANDARD_OT3_DECK, 5),
        module_model=ModuleModel.THERMOCYCLER_MODULE_V2,
        stacking_offset_with_module={
            str(ModuleModel.THERMOCYCLER_MODULE_V2.value): SharedDataOverlapOffset(
                x=111, y=222, z=333
            ),
        },
        expected_offset=OverlapOffset(x=111, y=222, z=333),
    ),
]


@pytest.mark.parametrize(
    argnames=ModuleOverlapSpec._fields,
    argvalues=module_overlap_specs,
)
def test_get_module_overlap_offsets(
    spec_deck_definition: DeckDefinitionV5,
    module_model: ModuleModel,
    stacking_offset_with_module: Dict[str, SharedDataOverlapOffset],
    expected_offset: OverlapOffset,
) -> None:
    """It should get the labware overlap offsets."""
    subject = get_labware_view(
        deck_definition=spec_deck_definition,
    )
    result = subject.get_module_overlap_offsets(
        definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
            stackingOffsetWithModule=stacking_offset_with_module
        ),
        module_model=module_model,
    )

    assert result == expected_offset


def test_get_default_magnet_height(
    magdeck_well_plate_def: LabwareDefinition,
) -> None:
    """Should get get the default value for magnetic height."""
    well_plate = LoadedLabware(
        id="well-plate-id",
        loadName="load-name",
        location=ModuleLocation(moduleId="module-id"),
        definitionUri="well-plate-uri",
        offsetId=None,
    )

    subject = get_labware_view(
        labware_by_id={"well-plate-id": well_plate},
        definitions_by_uri={"well-plate-uri": magdeck_well_plate_def},
    )

    assert subject.get_default_magnet_height(module_id="module-id", offset=2) == 12.0


def test_get_deck_definition(ot2_standard_deck_def: DeckDefinitionV5) -> None:
    """It should get the deck definition from the state."""
    subject = get_labware_view(deck_definition=ot2_standard_deck_def)

    assert subject.get_deck_definition() == ot2_standard_deck_def


def test_get_labware_offset_vector() -> None:
    """It should get a labware's offset vector."""
    labware_without_offset = LoadedLabware(
        id="without-offset-labware-id",
        loadName="labware-load-name",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        definitionUri="some-labware-uri",
        offsetId=None,
    )

    labware_with_offset = LoadedLabware(
        id="with-offset-labware-id",
        loadName="labware-load-name",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        definitionUri="some-labware-uri",
        offsetId="offset-id",
    )

    offset_vector = LabwareOffsetVector(x=1, y=2, z=3)
    offset = LabwareOffset(
        id="offset-id",
        createdAt=datetime(year=2021, month=1, day=2),
        definitionUri="some-labware-uri",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=offset_vector,
    )

    subject = get_labware_view(
        labware_by_id={
            labware_without_offset.id: labware_without_offset,
            labware_with_offset.id: labware_with_offset,
        },
        labware_offsets_by_id={"offset-id": offset},
    )

    assert subject.get_labware_offset_vector(labware_with_offset.id) == offset.vector

    assert subject.get_labware_offset_vector(
        labware_without_offset.id
    ) == LabwareOffsetVector(x=0, y=0, z=0)

    with pytest.raises(errors.LabwareNotLoadedError):
        subject.get_labware_offset_vector("wrong-labware-id")


def test_get_labware_offset() -> None:
    """It should return the requested labware offset, if it exists."""
    offset_a = LabwareOffset(
        id="id-a",
        createdAt=datetime(year=2021, month=1, day=1),
        definitionUri="uri-a",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=1, z=1),
    )

    offset_b = LabwareOffset(
        id="id-b",
        createdAt=datetime(year=2022, month=2, day=2),
        definitionUri="uri-b",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_2),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="2")
        ],
        vector=LabwareOffsetVector(x=2, y=2, z=2),
    )

    subject = get_labware_view(
        labware_offsets_by_id={"id-a": offset_a, "id-b": offset_b}
    )

    assert subject.get_labware_offset("id-a") == offset_a
    assert subject.get_labware_offset("id-b") == offset_b
    with pytest.raises(errors.LabwareOffsetDoesNotExistError):
        subject.get_labware_offset("wrong-labware-offset-id")


def test_get_labware_offsets() -> None:
    """It should return a list of all labware offsets, in order."""
    offset_a = LabwareOffset(
        id="id-a",
        createdAt=datetime(year=2021, month=1, day=1),
        definitionUri="uri-a",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=1, z=1),
    )

    offset_b = LabwareOffset(
        id="id-b",
        createdAt=datetime(year=2022, month=2, day=2),
        definitionUri="uri-b",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_2),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="2")
        ],
        vector=LabwareOffsetVector(x=2, y=2, z=2),
    )

    empty_subject = get_labware_view()
    assert empty_subject.get_labware_offsets() == []

    filled_subject_a_before_b = get_labware_view(
        labware_offsets_by_id={"id-a": offset_a, "id-b": offset_b}
    )
    assert filled_subject_a_before_b.get_labware_offsets() == [offset_a, offset_b]

    filled_subject_b_before_a = get_labware_view(
        labware_offsets_by_id={"id-b": offset_b, "id-a": offset_a}
    )
    assert filled_subject_b_before_a.get_labware_offsets() == [offset_b, offset_a]


def test_find_applicable_labware_offset() -> None:
    """It should return the most recent offset with matching URI and location."""
    offset_1 = LabwareOffset(
        id="id-1",
        createdAt=datetime(year=2021, month=1, day=1),
        definitionUri="definition-uri",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=1, y=1, z=1),
    )

    # Same definitionUri and location; different id, createdAt, and offset.
    offset_2 = LabwareOffset(
        id="id-2",
        createdAt=datetime(year=2022, month=2, day=2),
        definitionUri="definition-uri",
        location=LegacyLabwareOffsetLocation(slotName=DeckSlotName.SLOT_1),
        locationSequence=[
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1")
        ],
        vector=LabwareOffsetVector(x=2, y=2, z=2),
    )

    offset_3 = LabwareOffset(
        id="id-3",
        createdAt=datetime(year=2023, month=3, day=3),
        definitionUri="on-module-definition-uri",
        location=LegacyLabwareOffsetLocation(
            slotName=DeckSlotName.SLOT_1,
            moduleModel=ModuleModel.TEMPERATURE_MODULE_V1,
        ),
        locationSequence=[
            OnModuleOffsetLocationSequenceComponent(
                moduleModel=ModuleModel.TEMPERATURE_MODULE_V1
            ),
            OnAddressableAreaOffsetLocationSequenceComponent(addressableAreaName="1"),
        ],
        vector=LabwareOffsetVector(x=3, y=3, z=3),
    )

    subject = get_labware_view(
        # Simulate offset_2 having been added after offset_1.
        labware_offsets_by_id={"id-1": offset_1, "id-2": offset_2, "id-3": offset_3}
    )

    # Matching both definitionURI and location. Should return 2nd (most recent) offset.
    assert (
        subject.find_applicable_labware_offset(
            definition_uri="definition-uri",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                )
            ],
        )
        == offset_2
    )

    assert (
        subject.find_applicable_labware_offset(
            definition_uri="on-module-definition-uri",
            location=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.TEMPERATURE_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                ),
            ],
        )
        == offset_3
    )

    # Doesn't match anything, since definitionUri is different.
    assert (
        subject.find_applicable_labware_offset(
            definition_uri="different-definition-uri",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="1"
                )
            ],
        )
        is None
    )

    # Doesn't match anything, since location is different.
    assert (
        subject.find_applicable_labware_offset(
            definition_uri="different-definition-uri",
            location=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="2"
                )
            ],
        )
        is None
    )


def test_get_user_specified_display_name() -> None:
    """It should get a labware's user-specified display name."""
    subject = get_labware_view(
        labware_by_id={
            "plate_with_display_name": plate,
            "reservoir_without_display_name": reservoir,
        },
    )

    assert (
        subject.get_user_specified_display_name("plate_with_display_name")
        == "Fancy Plate Name"
    )
    assert (
        subject.get_user_specified_display_name("reservoir_without_display_name")
        is None
    )


def test_get_display_name(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should get the labware's display name."""
    subject = get_labware_view(
        labware_by_id={
            "plate_with_custom_display_name": plate,
            "reservoir_with_default_display_name": reservoir,
        },
        definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-reservoir-uri": reservoir_def,
        },
    )
    assert (
        subject.get_display_name("plate_with_custom_display_name") == "Fancy Plate Name"
    )
    assert (
        subject.get_display_name("reservoir_with_default_display_name")
        == "NEST 12 Well Reservoir 15 mL"
    )


def test_get_fixed_trash_id() -> None:
    """It should return the ID of the labware loaded into the fixed trash slot."""
    # OT-2 fixed trash slot:
    subject = get_labware_view(
        labware_by_id={
            "abc123": LoadedLabware(
                id="abc123",
                loadName="trash-load-name",
                location=DeckSlotLocation(slotName=DeckSlotName.FIXED_TRASH),
                definitionUri="trash-definition-uri",
                offsetId=None,
                displayName=None,
            )
        },
    )
    assert subject.get_fixed_trash_id() == "abc123"

    # OT-3 fixed trash slot:
    subject = get_labware_view(
        labware_by_id={
            "abc123": LoadedLabware(
                id="abc123",
                loadName="trash-load-name",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A3),
                definitionUri="trash-definition-uri",
                offsetId=None,
                displayName=None,
            )
        },
    )
    assert subject.get_fixed_trash_id() == "abc123"

    # Nothing in the fixed trash slot:
    subject = get_labware_view(
        labware_by_id={
            "abc123": LoadedLabware(
                id="abc123",
                loadName="trash-load-name",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                definitionUri="trash-definition-uri",
                offsetId=None,
                displayName=None,
            )
        },
    )
    assert subject.get_fixed_trash_id() is None


@pytest.mark.parametrize(
    argnames=["location", "expected_raise"],
    argvalues=[
        (
            DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            pytest.raises(errors.LocationIsOccupiedError),
        ),
        (
            ModuleLocation(moduleId="module-id"),
            pytest.raises(errors.LocationIsOccupiedError),
        ),
        (DeckSlotLocation(slotName=DeckSlotName.SLOT_2), does_not_raise()),
        (ModuleLocation(moduleId="non-matching-id"), does_not_raise()),
    ],
)
def test_raise_if_labware_in_location(
    location: Union[DeckSlotLocation, ModuleLocation],
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise if there is labware in specified location."""
    subject = get_labware_view(
        labware_by_id={
            "abc123": LoadedLabware(
                id="abc123",
                loadName="labware-1",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                definitionUri="labware-definition-uri",
                offsetId=None,
                displayName=None,
            ),
            "xyz456": LoadedLabware(
                id="xyz456",
                loadName="labware-2",
                location=ModuleLocation(moduleId="module-id"),
                definitionUri="labware-definition-uri",
                offsetId=None,
                displayName=None,
            ),
        }
    )
    with expected_raise:
        subject.raise_if_labware_in_location(location=location)


def test_get_by_slot() -> None:
    """It should get the labware in a given slot."""
    labware_1 = LoadedLabware.model_construct(  # type: ignore[call-arg]
        id="1", location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
    )
    labware_2 = LoadedLabware.model_construct(  # type: ignore[call-arg]
        id="2", location=DeckSlotLocation(slotName=DeckSlotName.SLOT_2)
    )
    labware_3 = LoadedLabware.model_construct(  # type: ignore[call-arg]
        id="3", location=ModuleLocation(moduleId="cool-module")
    )

    subject = get_labware_view(
        labware_by_id={"1": labware_1, "2": labware_2, "3": labware_3}
    )

    assert subject.get_by_slot(DeckSlotName.SLOT_1) == labware_1
    assert subject.get_by_slot(DeckSlotName.SLOT_2) == labware_2
    assert subject.get_by_slot(DeckSlotName.SLOT_3) is None


@pytest.mark.parametrize(
    ["well_name", "mount", "labware_slot", "next_to_module", "expected_result"],
    [
        ("abc", MountType.RIGHT, DeckSlotName.SLOT_3, False, EdgePathType.LEFT),
        ("abc", MountType.RIGHT, DeckSlotName.SLOT_D3, False, EdgePathType.LEFT),
        ("abc", MountType.RIGHT, DeckSlotName.SLOT_1, True, EdgePathType.LEFT),
        ("abc", MountType.RIGHT, DeckSlotName.SLOT_D1, True, EdgePathType.LEFT),
        ("pqr", MountType.LEFT, DeckSlotName.SLOT_3, True, EdgePathType.RIGHT),
        ("pqr", MountType.LEFT, DeckSlotName.SLOT_D3, True, EdgePathType.RIGHT),
        ("pqr", MountType.LEFT, DeckSlotName.SLOT_3, False, EdgePathType.DEFAULT),
        ("pqr", MountType.LEFT, DeckSlotName.SLOT_D3, False, EdgePathType.DEFAULT),
        ("pqr", MountType.RIGHT, DeckSlotName.SLOT_3, True, EdgePathType.DEFAULT),
        ("pqr", MountType.RIGHT, DeckSlotName.SLOT_D3, True, EdgePathType.DEFAULT),
        ("def", MountType.LEFT, DeckSlotName.SLOT_3, True, EdgePathType.DEFAULT),
        ("def", MountType.LEFT, DeckSlotName.SLOT_D3, True, EdgePathType.DEFAULT),
    ],
)
def test_get_edge_path_type(
    well_name: str,
    mount: MountType,
    labware_slot: DeckSlotName,
    next_to_module: bool,
    expected_result: EdgePathType,
) -> None:
    """It should get the proper edge path type based on well name, mount, and labware position."""
    labware = LoadedLabware(
        id="tip-rack-id",
        loadName="load-name",
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        definitionUri="some-labware-uri",
        offsetId=None,
    )

    labware_def = LabwareDefinition.model_construct(  # type: ignore[call-arg]
        ordering=[["abc", "def"], ["ghi", "jkl"], ["mno", "pqr"]]
    )

    subject = get_labware_view(
        labware_by_id={"labware-id": labware},
        definitions_by_uri={
            "some-labware-uri": labware_def,
        },
    )

    result = subject.get_edge_path_type(
        "labware-id", well_name, mount, labware_slot, next_to_module
    )

    assert result == expected_result


def test_get_all_labware_definition(
    tip_rack_def: LabwareDefinition, falcon_tuberack_def: LabwareDefinition
) -> None:
    """It should return the loaded labware definition list."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="opentrons_96_tiprack_300ul",
                location=ModuleLocation(moduleId="module-id"),
            )
        },
        definitions_by_uri={
            "opentrons_96_tiprack_300ul": tip_rack_def,
            "falcon-definition": falcon_tuberack_def,
        },
    )

    result = subject.get_loaded_labware_definitions()

    assert result == [tip_rack_def]


def test_get_all_labware_definition_empty() -> None:
    """It should return an empty list."""
    subject = get_labware_view(
        labware_by_id={},
    )

    result = subject.get_loaded_labware_definitions()

    assert result == []


def test_raise_if_labware_inaccessible_by_pipette_staging_area() -> None:
    """It should raise if the labware is on a staging slot."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=AddressableAreaLocation(addressableAreaName="B4"),
            )
        },
    )

    with pytest.raises(
        errors.LocationNotAccessibleByPipetteError, match="on staging slot"
    ):
        subject.raise_if_labware_inaccessible_by_pipette("labware-id")


def test_raise_if_labware_inaccessible_by_pipette_off_deck() -> None:
    """It should raise if the labware is off-deck."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=OFF_DECK_LOCATION,
            )
        },
    )

    with pytest.raises(errors.LocationNotAccessibleByPipetteError, match="off-deck"):
        subject.raise_if_labware_inaccessible_by_pipette("labware-id")


def test_raise_if_labware_inaccessible_by_pipette_stacked_labware_on_staging_area() -> (
    None
):
    """It should raise if the labware is stacked on a staging slot."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=OnLabwareLocation(labwareId="lower-labware-id"),
            ),
            "lower-labware-id": LoadedLabware(
                id="lower-labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=AddressableAreaLocation(addressableAreaName="B4"),
            ),
        },
    )

    with pytest.raises(
        errors.LocationNotAccessibleByPipetteError, match="on staging slot"
    ):
        subject.raise_if_labware_inaccessible_by_pipette("labware-id")


def test_raise_if_labware_cannot_be_stacked_is_adapter() -> None:
    """It should raise if the labware trying to be stacked is an adapter."""
    subject = get_labware_view()

    with pytest.raises(
        errors.LabwareCannotBeStackedError, match="defined as an adapter"
    ):
        subject.raise_if_labware_cannot_be_stacked(
            top_labware_definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(loadName="name"),  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.adapter],
            ),
            bottom_labware_id="labware-id",
        )


def test_raise_if_labware_cannot_be_stacked_not_validated() -> None:
    """It should raise if the labware name is not in the definition stacking overlap."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            )
        },
    )

    with pytest.raises(
        errors.LabwareCannotBeStackedError, match="loaded onto labware test"
    ):
        subject.raise_if_labware_cannot_be_stacked(
            top_labware_definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(loadName="name"),  # type: ignore[call-arg]
                stackingOffsetWithLabware={},
            ),
            bottom_labware_id="labware-id",
        )


def test_raise_if_labware_cannot_be_stacked_on_module_not_adapter() -> None:
    """It should raise if the below labware on a module is not an adapter."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri",
                location=ModuleLocation(moduleId="module-id"),
            )
        },
        definitions_by_uri={
            "def-uri": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.labware]
            )
        },
    )

    with pytest.raises(errors.LabwareCannotBeStackedError, match="module"):
        subject.raise_if_labware_cannot_be_stacked(
            top_labware_definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(loadName="name"),  # type: ignore[call-arg]
                stackingOffsetWithLabware={
                    "test": SharedDataOverlapOffset(x=0, y=0, z=0)
                },
            ),
            bottom_labware_id="labware-id",
        )


def test_raise_if_labware_cannot_be_stacked_on_labware_on_adapter() -> None:
    """It should raise if the OnLabware location is on an adapter."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="test",
                definitionUri="def-uri-1",
                location=OnLabwareLocation(labwareId="below-id"),
            ),
            "below-id": LoadedLabware(
                id="below-id",
                loadName="adapter-name",
                definitionUri="def-uri-2",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ),
        },
        definitions_by_uri={
            "def-uri-1": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.labware],
                parameters=Parameters.model_construct(loadName="test"),  # type: ignore[call-arg]
            ),
            "def-uri-2": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=[LabwareRole.adapter]
            ),
        },
    )

    with pytest.raises(
        errors.LabwareCannotBeStackedError, match="cannot be loaded to stack"
    ):
        subject.raise_if_labware_cannot_be_stacked(
            top_labware_definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(loadName="name"),  # type: ignore[call-arg]
                stackingOffsetWithLabware={
                    "test": SharedDataOverlapOffset(x=0, y=0, z=0)
                },
            ),
            bottom_labware_id="labware-id",
        )


@pytest.mark.parametrize(
    argnames=[
        "allowed_roles",
        "stack_limit",
        "exception",
    ],
    argvalues=[
        [
            [LabwareRole.labware],
            1,
            pytest.raises(errors.LabwareCannotBeStackedError),
        ],
        [
            [LabwareRole.lid],
            5,
            does_not_raise(),
        ],
    ],
)
def test_labware_stacking_height_passes_or_raises(
    allowed_roles: List[LabwareRole],
    stack_limit: int,
    exception: ContextManager[None],
) -> None:
    """It should raise if the labware is stacked too high, and pass if the labware definition allowed this."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id4": LoadedLabware(
                id="labware-id4",
                loadName="test",
                definitionUri="def-uri-1",
                location=OnLabwareLocation(labwareId="labware-id3"),
            ),
            "labware-id3": LoadedLabware(
                id="labware-id3",
                loadName="test",
                definitionUri="def-uri-1",
                location=OnLabwareLocation(labwareId="labware-id2"),
            ),
            "labware-id2": LoadedLabware(
                id="labware-id2",
                loadName="test",
                definitionUri="def-uri-1",
                location=OnLabwareLocation(labwareId="labware-id1"),
            ),
            "labware-id1": LoadedLabware(
                id="labware-id1",
                loadName="test",
                definitionUri="def-uri-1",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ),
        },
        definitions_by_uri={
            "def-uri-1": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                allowedRoles=allowed_roles,
                parameters=Parameters.model_construct(
                    format="irregular",
                    isTiprack=False,
                    loadName="name",
                    isMagneticModuleCompatible=False,
                ),
                stackLimit=stack_limit,
            )
        },
    )

    with exception:
        subject.raise_if_labware_cannot_be_stacked(
            top_labware_definition=LabwareDefinition.model_construct(  # type: ignore[call-arg]
                parameters=Parameters.model_construct(
                    format="irregular",
                    isTiprack=False,
                    loadName="name",
                    isMagneticModuleCompatible=False,
                ),
                stackingOffsetWithLabware={
                    "test": SharedDataOverlapOffset(x=0, y=0, z=0)
                },
                stackLimit=stack_limit,
            ),
            bottom_labware_id="labware-id4",
        )


def test_get_deck_gripper_offsets(ot3_standard_deck_def: DeckDefinitionV5) -> None:
    """It should get the deck's gripper offsets."""
    subject = get_labware_view(deck_definition=ot3_standard_deck_def)

    assert subject.get_deck_default_gripper_offsets() == LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
        dropOffset=LabwareOffsetVector(x=0, y=0, z=-0.75),
    )


def test_get_labware_gripper_offsets(
    well_plate_def: LabwareDefinition,
    adapter_plate_def: LabwareDefinition,
) -> None:
    """It should get the labware's gripper offsets."""
    subject = get_labware_view(
        labware_by_id={"plate-id": plate, "adapter-plate-id": adapter_plate},
        definitions_by_uri={
            "some-plate-uri": well_plate_def,
            "some-adapter-uri": adapter_plate_def,
        },
    )

    assert (
        subject.get_child_gripper_offsets(labware_id="plate-id", slot_name=None) is None
    )
    assert subject.get_child_gripper_offsets(
        labware_id="adapter-plate-id", slot_name=DeckSlotName.SLOT_D1
    ) == LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=0, y=0, z=0),
        dropOffset=LabwareOffsetVector(x=2, y=0, z=0),
    )


def test_get_labware_gripper_offsets_default_no_slots(
    well_plate_def: LabwareDefinition,
    adapter_plate_def: LabwareDefinition,
) -> None:
    """It should get the labware's gripper offsets with only a default gripper offset entry."""
    subject = get_labware_view(
        labware_by_id={
            "labware-id": LoadedLabware(
                id="labware-id",
                loadName="labware-load-name",
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
                definitionUri="some-labware-uri",
                offsetId=None,
                displayName="Fancy Labware Name",
            )
        },
        definitions_by_uri={
            "some-labware-uri": LabwareDefinition.model_construct(  # type: ignore[call-arg]
                gripperOffsets={
                    "default": GripperOffsets(
                        pickUpOffset=OffsetVector(x=1, y=2, z=3),
                        dropOffset=OffsetVector(x=4, y=5, z=6),
                    )
                }
            ),
        },
    )

    assert (
        subject.get_child_gripper_offsets(
            labware_id="labware-id", slot_name=DeckSlotName.SLOT_D1
        )
        is None
    )

    assert subject.get_child_gripper_offsets(
        labware_id="labware-id", slot_name=None
    ) == LabwareMovementOffsetData(
        pickUpOffset=LabwareOffsetVector(x=1, y=2, z=3),
        dropOffset=LabwareOffsetVector(x=4, y=5, z=6),
    )


def test_get_grip_force(
    flex_50uL_tiprack: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should get the grip force, if present, from labware definition or return default."""
    subject = get_labware_view()

    assert subject.get_grip_force(flex_50uL_tiprack) == 16  # from definition
    assert subject.get_grip_force(reservoir_def) == 15  # default


def test_get_grip_height_from_labware_bottom(
    well_plate_def: LabwareDefinition,
    reservoir_def: LabwareDefinition,
) -> None:
    """It should get the grip height, if present, from labware definition or return default."""
    subject = get_labware_view()
    assert (
        subject.get_grip_height_from_labware_bottom(well_plate_def) == 12.2
    )  # from definition
    assert subject.get_grip_height_from_labware_bottom(reservoir_def) == 15.7  # default


@pytest.mark.parametrize(
    "labware_to_check,well_bbox",
    [
        ("opentrons_universal_flat_adapter", Dimensions(0, 0, 0)),
        (
            "corning_96_wellplate_360ul_flat",
            Dimensions(116.81 - 10.95, 77.67 - 7.81, 14.22),
        ),
        ("nest_12_reservoir_15ml", Dimensions(117.48 - 10.28, 78.38 - 7.18, 31.4)),
    ],
)
def test_calculates_well_bounding_box(
    labware_to_check: str, well_bbox: Dimensions
) -> None:
    """It should be able to calculate well bounding boxes."""
    definition = LabwareDefinition.model_validate(load_definition(labware_to_check, 1))
    subject = get_labware_view()
    assert subject.get_well_bbox(definition).x == pytest.approx(well_bbox.x)
    assert subject.get_well_bbox(definition).y == pytest.approx(well_bbox.y)
    assert subject.get_well_bbox(definition).z == pytest.approx(well_bbox.z)
