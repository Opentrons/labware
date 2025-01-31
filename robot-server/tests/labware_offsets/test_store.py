# noqa: D100


from datetime import datetime
from opentrons.protocol_engine import (
    LabwareOffset,
    LabwareOffsetLocation,
    LabwareOffsetVector,
)
from opentrons.types import DeckSlotName
import pytest
from robot_server.labware_offsets.store import (
    LabwareOffsetStore,
    LabwareOffsetNotFoundError,
)


def _get_all(store: LabwareOffsetStore) -> list[LabwareOffset]:
    return store.search(
        id_filter=None,
        definition_uri_filter=None,
        location_definition_uri_filter=None,
        location_module_model_filter=None,
        location_slot_name_filter=None,
    )


def test_filters() -> None:
    """Test that the `.search()` method applies filters correctly."""
    ids_and_definition_uris = [
        ("id-1", "definition-uri-a"),
        ("id-2", "definition-uri-b"),
        ("id-3", "definition-uri-a"),
        ("id-4", "definition-uri-b"),
        ("id-5", "definition-uri-a"),
        ("id-6", "definition-uri-b"),
    ]
    labware_offsets = [
        LabwareOffset(
            id=id,
            createdAt=datetime.now(),
            definitionUri=definition_uri,
            location=LabwareOffsetLocation(slotName=DeckSlotName.SLOT_A1),
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for (id, definition_uri) in ids_and_definition_uris
    ]

    subject = LabwareOffsetStore()

    for labware_offset in labware_offsets:
        subject.add(labware_offset)

    # No filters:
    assert (
        subject.search(
            id_filter=None,
            definition_uri_filter=None,
            location_definition_uri_filter=None,
            location_module_model_filter=None,
            location_slot_name_filter=None,
        )
        == labware_offsets
    )

    # Filter on one thing:
    result = subject.search(
        id_filter=None,
        definition_uri_filter="definition-uri-b",
        location_definition_uri_filter=None,
        location_module_model_filter=None,
        location_slot_name_filter=None,
    )
    assert len(result) == 3
    assert result == [
        entry for entry in labware_offsets if entry.definitionUri == "definition-uri-b"
    ]

    # Filter on two things:
    result = subject.search(
        id_filter="id-2",
        definition_uri_filter="definition-uri-b",
        location_definition_uri_filter=None,
        location_module_model_filter=None,
        location_slot_name_filter=None,
    )
    assert result == [labware_offsets[1]]

    # Filters should be ANDed, not ORed, together:
    result = subject.search(
        id_filter="id-1",
        definition_uri_filter="definition-uri-b",
        location_definition_uri_filter=None,
        location_module_model_filter=None,
        location_slot_name_filter=None,
    )
    assert result == []


def test_delete() -> None:
    """Test the `delete()` method."""
    a, b, c = [
        LabwareOffset(
            id=id,
            createdAt=datetime.now(),
            definitionUri="",
            location=LabwareOffsetLocation(slotName=DeckSlotName.SLOT_A1),
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for id in ["id-a", "id-b", "id-c"]
    ]

    subject = LabwareOffsetStore()

    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete("b")

    subject.add(a)
    subject.add(b)
    subject.add(c)
    assert subject.delete(b.id) == b
    assert _get_all(subject) == [a, c]
    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete(b.id)
