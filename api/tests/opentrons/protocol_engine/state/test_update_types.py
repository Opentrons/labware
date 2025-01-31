"""Unit tests for the utilities in `update_types`."""
from opentrons.protocol_engine import DeckSlotLocation, ModuleLocation
from opentrons.protocol_engine.state import update_types
from opentrons.types import DeckSlotName


def test_append() -> None:
    """Test `StateUpdate.append()`."""
    state_update = update_types.StateUpdate(
        labware_location=update_types.LabwareLocationUpdate(
            labware_id="test-123",
            new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
            offset_id=None,
        )
    )

    # Populating a new field should leave the original ones unchanged.
    result = state_update.append(
        update_types.StateUpdate(pipette_location=update_types.CLEAR)
    )
    assert result is state_update
    assert state_update.labware_location == update_types.LabwareLocationUpdate(
        labware_id="test-123",
        new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
        offset_id=None,
    )
    assert state_update.pipette_location == update_types.CLEAR

    # Populating a field that's already been populated should overwrite it.
    result = state_update.append(
        update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="test-123",
                new_location=ModuleLocation(moduleId="module-123"),
                offset_id=None,
            )
        )
    )
    assert result is state_update
    assert state_update.labware_location == update_types.LabwareLocationUpdate(
        labware_id="test-123",
        new_location=ModuleLocation(moduleId="module-123"),
        offset_id=None,
    )
    assert state_update.pipette_location == update_types.CLEAR


def test_reduce() -> None:
    """Test `StateUpdate.reduce()`."""
    assert update_types.StateUpdate.reduce() == update_types.StateUpdate()

    # It should union all the set fields together.
    assert update_types.StateUpdate.reduce(
        update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="test-123",
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
                offset_id=None,
            )
        ),
        update_types.StateUpdate(pipette_location=update_types.CLEAR),
    ) == update_types.StateUpdate(
        labware_location=update_types.LabwareLocationUpdate(
            labware_id="test-123",
            new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
            offset_id=None,
        ),
        pipette_location=update_types.CLEAR,
    )

    # When one field appears multiple times, the last write wins.
    assert update_types.StateUpdate.reduce(
        update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="test-123",
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
                offset_id=None,
            )
        ),
        update_types.StateUpdate(
            labware_location=update_types.LabwareLocationUpdate(
                labware_id="test-123",
                new_location=ModuleLocation(moduleId="module-123"),
                offset_id=None,
            )
        ),
    ) == update_types.StateUpdate(
        labware_location=update_types.LabwareLocationUpdate(
            labware_id="test-123",
            new_location=ModuleLocation(moduleId="module-123"),
            offset_id=None,
        )
    )
