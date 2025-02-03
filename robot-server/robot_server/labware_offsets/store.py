# noqa: D100

from typing import Iterator

from opentrons.protocol_engine.types import (
    LabwareOffsetVector,
    ModuleModel,
    OnAddressableAreaOffsetLocationSequenceComponent,
    OnModuleOffsetLocationSequenceComponent,
    OnLabwareOffsetLocationSequenceComponent,
    LabwareOffsetLocationSequenceComponents,
    LabwareOffsetLocationSequence,
)

from robot_server.persistence.tables import (
    labware_offset_table,
    labware_offset_location_sequence_components_table,
)
from .models import StoredLabwareOffset, DoNotFilterType, DO_NOT_FILTER

import sqlalchemy
import sqlalchemy.exc

from ._search_query_builder import SearchQueryBuilder


class LabwareOffsetStore:
    """A persistent store for labware offsets, to support the `/labwareOffsets` endpoints."""

    def __init__(self, sql_engine: sqlalchemy.engine.Engine) -> None:
        """Initialize the store.

        Params:
            sql_engine: The SQL database to use as backing storage. Assumed to already
                have all the proper tables set up.
        """
        self._sql_engine = sql_engine

    def add(self, offset: StoredLabwareOffset) -> None:
        """Store a new labware offset."""
        with self._sql_engine.begin() as transaction:
            offset_row_id = transaction.execute(
                sqlalchemy.insert(labware_offset_table).values(
                    _pydantic_to_sql_offset(offset)
                )
            ).lastrowid
            transaction.execute(
                sqlalchemy.insert(
                    labware_offset_location_sequence_components_table
                ).values(
                    list(
                        _pydantic_to_sql_location_sequence_iterator(
                            offset, offset_row_id
                        )
                    )
                )
            )

    def search(
        self,
        id_filter: str | DoNotFilterType = DO_NOT_FILTER,
        definition_uri_filter: str | DoNotFilterType = DO_NOT_FILTER,
        location_addressable_area_filter: str | DoNotFilterType = DO_NOT_FILTER,
        location_module_model_filter: (
            ModuleModel | None | DoNotFilterType
        ) = DO_NOT_FILTER,
        location_definition_uri_filter: str | None | DoNotFilterType = DO_NOT_FILTER,
        # todo(mm, 2024-12-06): Support pagination (cursor & pageLength query params).
        # The logic for that is currently duplicated across several places in
        # robot-server and api. We should try to clean that up, or at least avoid
        # making it worse.
    ) -> list[StoredLabwareOffset]:
        """Return all matching labware offsets in order from oldest-added to newest."""
        builder = (
            SearchQueryBuilder()
            .do_active_filter(True)
            .do_id_filter(id_filter)
            .do_definition_uri_filter(definition_uri_filter)
            .do_on_addressable_area_filter(location_addressable_area_filter)
            .do_on_module_filter(location_module_model_filter)
            .do_on_labware_filter(location_definition_uri_filter)
        )
        query = builder.build_query()

        with self._sql_engine.begin() as transaction:
            result = transaction.execute(query).all()

        if len(result) == 0:
            return []
        return list(_collate_sql_to_pydantic(result))

    def delete(self, offset_id: str) -> StoredLabwareOffset:
        """Delete a labware offset by its ID. Return what was just deleted."""
        builder = SearchQueryBuilder().do_id_filter(offset_id)
        query = builder.build_query()
        with self._sql_engine.begin() as transaction:
            try:
                offset_rows = transaction.execute(query).all()
            except sqlalchemy.exc.NoResultFound:
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id) from None
            if len(offset_rows) == 0:
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)
            if not offset_rows[0].active:
                # Already soft-deleted.
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)

            transaction.execute(
                sqlalchemy.update(labware_offset_table)
                .where(labware_offset_table.c.offset_id == offset_id)
                .values(active=False)
            )

        return next(_collate_sql_to_pydantic(offset_rows))

    def delete_all(self) -> None:
        """Delete all labware offsets."""
        with self._sql_engine.begin() as transaction:
            transaction.execute(
                sqlalchemy.update(labware_offset_table).values(active=False)
            )


class LabwareOffsetNotFoundError(KeyError):
    """Raised when trying to access a labware offset that doesn't exist."""

    def __init__(self, bad_offset_id: str) -> None:
        super().__init__(bad_offset_id)
        self.bad_offset_id = bad_offset_id


def _sql_sequence_component_to_pydantic_sequence_component(
    component_row: sqlalchemy.engine.Row,
) -> LabwareOffsetLocationSequenceComponents:
    if component_row.component_kind == "onLabware":
        return OnLabwareOffsetLocationSequenceComponent(
            labwareUri=component_row.primary_component_value
        )
    elif component_row.component_kind == "onModule":
        return OnModuleOffsetLocationSequenceComponent(
            moduleModel=ModuleModel(component_row.primary_component_value)
        )
    elif component_row.component_kind == "onAddressableArea":
        return OnAddressableAreaOffsetLocationSequenceComponent(
            addressableAreaName=component_row.primary_component_value
        )
    else:
        raise KeyError(component_row.component_kind)


def _collate_sql_locations(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[LabwareOffsetLocationSequence, sqlalchemy.engine.Row | None]:
    offset_id = first_row.offset_id
    location_sequence: list[LabwareOffsetLocationSequenceComponents] = [
        _sql_sequence_component_to_pydantic_sequence_component(first_row)
    ]
    while True:
        try:
            row = next(rest_rows)
        except StopIteration:
            return location_sequence, None
        if row.offset_id != offset_id:
            return location_sequence, row
        location_sequence.append(
            _sql_sequence_component_to_pydantic_sequence_component(row)
        )


def _sql_to_pydantic(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[StoredLabwareOffset, sqlalchemy.engine.Row | None]:
    location_sequence, next_row = _collate_sql_locations(first_row, rest_rows)
    return (
        StoredLabwareOffset(
            id=first_row.offset_id,
            createdAt=first_row.created_at,
            definitionUri=first_row.definition_uri,
            locationSequence=location_sequence,
            vector=LabwareOffsetVector(
                x=first_row.vector_x,
                y=first_row.vector_y,
                z=first_row.vector_z,
            ),
        ),
        next_row,
    )


def _collate_sql_to_pydantic(
    query_results: list[sqlalchemy.engine.Row],
) -> Iterator[StoredLabwareOffset]:
    row_iter = iter(query_results)
    row: sqlalchemy.engine.Row | None = next(row_iter)
    while row:
        result, row = _sql_to_pydantic(row, row_iter)
        yield result


def _pydantic_to_sql_offset(labware_offset: StoredLabwareOffset) -> dict[str, object]:
    return dict(
        offset_id=labware_offset.id,
        definition_uri=labware_offset.definitionUri,
        vector_x=labware_offset.vector.x,
        vector_y=labware_offset.vector.y,
        vector_z=labware_offset.vector.z,
        created_at=labware_offset.createdAt,
        active=True,
    )


def _pydantic_to_sql_location_sequence_iterator(
    labware_offset: StoredLabwareOffset, offset_row_id: int
) -> Iterator[dict[str, object]]:
    for index, component in enumerate(labware_offset.locationSequence):
        if isinstance(component, OnLabwareOffsetLocationSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.labwareUri,
                component_value_json=component.model_dump_json(),
            )
        elif isinstance(component, OnModuleOffsetLocationSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.moduleModel.value,
                component_value_json=component.model_dump_json(),
            )
        elif isinstance(component, OnAddressableAreaOffsetLocationSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.addressableAreaName,
                component_value_json=component.model_dump_json(),
            )
        else:
            print(f"ISINSTANCE FAILED: {component}")
            pass
