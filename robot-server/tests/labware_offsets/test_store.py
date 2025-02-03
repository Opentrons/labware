# noqa: D100

from datetime import datetime, timezone

import pytest
import sqlalchemy

from opentrons.protocol_engine import (
    LabwareOffsetVector,
    OnLabwareOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnAddressableAreaOffsetLocationSequenceComponent,
)
from opentrons.protocol_engine.types import ModuleModel

from robot_server.labware_offsets.store import (
    LabwareOffsetStore,
    LabwareOffsetNotFoundError,
)
from robot_server.labware_offsets.models import (
    StoredLabwareOffset,
    DoNotFilterType,
    DO_NOT_FILTER,
)


@pytest.fixture
def subject(sql_engine: sqlalchemy.engine.Engine) -> LabwareOffsetStore:
    """Return a test subject."""
    return LabwareOffsetStore(sql_engine)


def _get_all(store: LabwareOffsetStore) -> list[StoredLabwareOffset]:
    return store.search()


@pytest.mark.parametrize(
    argnames=[
        "id_filter",
        "definition_uri_filter",
        "location_addressable_area_filter",
        "location_module_model_filter",
        "location_labware_uri_filter",
        "returned_ids",
    ],
    argvalues=[
        pytest.param(
            "a",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ["a"],
            id="id-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            "definitionUri a",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ["a", "c", "d", "e"],
            id="labware-only",
        ),
        pytest.param(
            "a",
            "definitionUri a",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ["a"],
            id="labware-and-id-matching",
        ),
        pytest.param(
            "a",
            "definitionUri b",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            [],
            id="labware-and-id-conflicting",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            "A1",
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ["a", "c", "d", "e"],
            id="aa-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            "A1",
            None,
            None,
            ["c"],
            id="aa-and-not-mod-or-lw",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            "A1",
            None,
            DO_NOT_FILTER,
            ["c", "d"],
            id="aa-and-not-module",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            "A1",
            DO_NOT_FILTER,
            None,
            ["c", "e"],
            id="aa-and-not-lw",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ModuleModel.MAGNETIC_BLOCK_V1,
            DO_NOT_FILTER,
            ["b", "e"],
            id="module-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            ModuleModel.MAGNETIC_BLOCK_V1,
            None,
            ["e"],
            id="module-and-not-lw",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            "location.definitionUri a",
            ["a", "d"],
            id="lw-only",
        ),
        pytest.param(
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            DO_NOT_FILTER,
            None,
            "location.definitionUri a",
            ["d"],
            id="lw-and-not-module",
        ),
    ],
)
def test_filter_fields(
    subject: LabwareOffsetStore,
    id_filter: str | DoNotFilterType,
    definition_uri_filter: str | DoNotFilterType,
    location_addressable_area_filter: str | DoNotFilterType,
    location_module_model_filter: ModuleModel | None | DoNotFilterType,
    location_labware_uri_filter: str | None | DoNotFilterType,
    returned_ids: list[str],
) -> None:
    """Test each filterable field to make sure it returns only matching entries."""
    offsets = {
        "a": StoredLabwareOffset(
            id="a",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri a"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.THERMOCYCLER_MODULE_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        ),
        "b": StoredLabwareOffset(
            id="b",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri b",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri b"
                ),
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.MAGNETIC_BLOCK_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="B1"
                ),
            ],
            vector=LabwareOffsetVector(x=2, y=4, z=6),
        ),
        "c": StoredLabwareOffset(
            id="c",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=3, y=6, z=9),
        ),
        "d": StoredLabwareOffset(
            id="d",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnLabwareOffsetLocationSequenceComponent(
                    labwareUri="location.definitionUri a"
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=4, y=8, z=12),
        ),
        "e": StoredLabwareOffset(
            id="e",
            createdAt=datetime.now(timezone.utc),
            definitionUri="definitionUri a",
            locationSequence=[
                OnModuleOffsetLocationSequenceComponent(
                    moduleModel=ModuleModel.MAGNETIC_BLOCK_V1
                ),
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                ),
            ],
            vector=LabwareOffsetVector(x=5, y=10, z=15),
        ),
    }
    for offset in offsets.values():
        subject.add(offset)
    results = subject.search(
        id_filter=id_filter,
        definition_uri_filter=definition_uri_filter,
        location_addressable_area_filter=location_addressable_area_filter,
        location_module_model_filter=location_module_model_filter,
        location_definition_uri_filter=location_labware_uri_filter,
    )
    assert sorted(
        results,
        key=lambda o: o.id,
    ) == sorted([offsets[id_] for id_ in returned_ids], key=lambda o: o.id)


def test_filter_combinations(subject: LabwareOffsetStore) -> None:
    """Test that multiple filters are combined correctly."""
    ids_and_definition_uris = [
        ("id-1", "definition-uri-a"),
        ("id-2", "definition-uri-b"),
        ("id-3", "definition-uri-a"),
        ("id-4", "definition-uri-b"),
        ("id-5", "definition-uri-a"),
        ("id-6", "definition-uri-b"),
    ]
    labware_offsets = [
        StoredLabwareOffset(
            id=id,
            createdAt=datetime.now(timezone.utc),
            definitionUri=definition_uri,
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for (id, definition_uri) in ids_and_definition_uris
    ]

    for labware_offset in labware_offsets:
        subject.add(labware_offset)

    # No filters:
    assert subject.search() == labware_offsets

    # Filter on one thing:
    result = subject.search(definition_uri_filter="definition-uri-b")
    assert len(result) == 3
    assert result == [
        entry for entry in labware_offsets if entry.definitionUri == "definition-uri-b"
    ]

    # Filter on two things:
    result = subject.search(
        id_filter="id-2",
        definition_uri_filter="definition-uri-b",
    )
    assert result == [labware_offsets[1]]

    # Filters should be ANDed, not ORed, together:
    result = subject.search(
        id_filter="id-1",
        definition_uri_filter="definition-uri-b",
    )
    assert result == []


def test_delete(subject: LabwareOffsetStore) -> None:
    """Test the `delete()` and `delete_all()` methods."""
    a, b, c = [
        StoredLabwareOffset(
            id=id,
            createdAt=datetime.now(timezone.utc),
            definitionUri="",
            locationSequence=[
                OnAddressableAreaOffsetLocationSequenceComponent(
                    addressableAreaName="A1"
                )
            ],
            vector=LabwareOffsetVector(x=1, y=2, z=3),
        )
        for id in ["id-a", "id-b", "id-c"]
    ]

    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete("b")

    subject.add(a)
    subject.add(b)
    subject.add(c)
    assert subject.delete(b.id) == b
    assert _get_all(subject) == [a, c]
    with pytest.raises(LabwareOffsetNotFoundError):
        subject.delete(b.id)

    subject.delete_all()
    assert _get_all(subject) == []
