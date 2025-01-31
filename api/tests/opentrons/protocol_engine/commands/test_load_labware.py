"""Test load labware commands."""
import inspect
from typing import Optional
from unittest.mock import sentinel

import pytest
from decoy import Decoy

from opentrons.types import DeckSlotName
from opentrons.protocols.models import LabwareDefinition

from opentrons.protocol_engine.errors import (
    LabwareIsNotAllowedInLocationError,
    LocationIsOccupiedError,
)

from opentrons.protocol_engine.types import (
    AddressableAreaLocation,
    DeckSlotLocation,
    LabwareLocation,
    OnLabwareLocation,
)
from opentrons.protocol_engine.execution import LoadedLabwareData, EquipmentHandler
from opentrons.protocol_engine.resources import labware_validation
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.update_types import (
    AddressableAreaUsedUpdate,
    LoadedLabwareUpdate,
    StateUpdate,
)

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.load_labware import (
    LoadLabwareParams,
    LoadLabwareResult,
    LoadLabwareImplementation,
)


@pytest.fixture(autouse=True)
def patch_mock_labware_validation(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out labware_validations.py functions."""
    for name, func in inspect.getmembers(labware_validation, inspect.isfunction):
        monkeypatch.setattr(labware_validation, name, decoy.mock(func=func))


@pytest.mark.parametrize("display_name", ["My custom display name", None])
@pytest.mark.parametrize(
    ("location", "expected_addressable_area_name"),
    [
        (DeckSlotLocation(slotName=DeckSlotName.SLOT_3), "3"),
        (AddressableAreaLocation(addressableAreaName="3"), "3"),
    ],
)
async def test_load_labware_on_slot_or_addressable_area(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
    display_name: Optional[str],
    location: LabwareLocation,
    expected_addressable_area_name: str,
) -> None:
    """A LoadLabware command should have an execution implementation."""
    subject = LoadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = LoadLabwareParams(
        location=location,
        loadName="some-load-name",
        namespace="opentrons-test",
        version=1,
        displayName=display_name,
    )

    decoy.when(state_view.geometry.ensure_location_not_occupied(location)).then_return(
        sentinel.validated_empty_location
    )
    decoy.when(
        await equipment.load_labware(
            location=sentinel.validated_empty_location,
            load_name="some-load-name",
            namespace="opentrons-test",
            version=1,
            labware_id=None,
        )
    ).then_return(
        LoadedLabwareData(
            labware_id="labware-id",
            definition=well_plate_def,
            offsetId="labware-offset-id",
        )
    )

    decoy.when(
        labware_validation.validate_definition_is_labware(well_plate_def)
    ).then_return(True)

    result = await subject.execute(data)

    assert result == SuccessData(
        public=LoadLabwareResult(
            labwareId="labware-id",
            definition=well_plate_def,
            offsetId="labware-offset-id",
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id",
                definition=well_plate_def,
                offset_id="labware-offset-id",
                new_location=sentinel.validated_empty_location,
                display_name=display_name,
            ),
            addressable_area_used=AddressableAreaUsedUpdate(
                addressable_area_name=expected_addressable_area_name
            ),
        ),
    )


async def test_load_labware_raises_location_not_allowed(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A LoadLabware command should raise if the flex trash definition is not in a valid slot."""
    subject = LoadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = LoadLabwareParams(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A2),
        loadName="some-load-name",
        namespace="opentrons-test",
        version=1,
        displayName="My custom display name",
    )

    decoy.when(labware_validation.is_flex_trash("some-load-name")).then_return(True)

    with pytest.raises(LabwareIsNotAllowedInLocationError):
        await subject.execute(data)


async def test_load_labware_on_labware(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A LoadLabware command should raise if the definition is not validated as a labware."""
    subject = LoadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = LoadLabwareParams(
        location=OnLabwareLocation(labwareId="other-labware-id"),
        loadName="some-load-name",
        namespace="opentrons-test",
        version=1,
        displayName="My custom display name",
    )

    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            OnLabwareLocation(labwareId="other-labware-id")
        )
    ).then_return(OnLabwareLocation(labwareId="another-labware-id"))
    decoy.when(
        await equipment.load_labware(
            location=OnLabwareLocation(labwareId="another-labware-id"),
            load_name="some-load-name",
            namespace="opentrons-test",
            version=1,
            labware_id=None,
        )
    ).then_return(
        LoadedLabwareData(
            labware_id="labware-id",
            definition=well_plate_def,
            offsetId="labware-offset-id",
        )
    )

    decoy.when(
        labware_validation.validate_definition_is_labware(well_plate_def)
    ).then_return(True)

    result = await subject.execute(data)
    assert result == SuccessData(
        public=LoadLabwareResult(
            labwareId="labware-id",
            definition=well_plate_def,
            offsetId="labware-offset-id",
        ),
        state_update=StateUpdate(
            loaded_labware=LoadedLabwareUpdate(
                labware_id="labware-id",
                definition=well_plate_def,
                offset_id="labware-offset-id",
                new_location=OnLabwareLocation(labwareId="another-labware-id"),
                display_name="My custom display name",
            )
        ),
    )

    decoy.verify(
        state_view.labware.raise_if_labware_cannot_be_stacked(
            well_plate_def, "another-labware-id"
        )
    )


async def test_load_labware_raises_if_location_occupied(
    decoy: Decoy,
    well_plate_def: LabwareDefinition,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A LoadLabware command should have an execution implementation."""
    subject = LoadLabwareImplementation(equipment=equipment, state_view=state_view)

    data = LoadLabwareParams(
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_3),
        loadName="some-load-name",
        namespace="opentrons-test",
        version=1,
        displayName="My custom display name",
    )

    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_3)
        )
    ).then_raise(LocationIsOccupiedError("Get your own spot!"))

    with pytest.raises(LocationIsOccupiedError):
        await subject.execute(data)
