# noqa: D100

import enum
from typing import Final, Literal, TypeAlias, Iterator

from opentrons.protocol_engine.types import (
    LabwareOffsetVector,
    ModuleModel,
    OnAddressableAreaOffsetSequenceComponent,
    OnModuleOffsetSequenceComponent,
    OnLabwareOffsetSequenceComponent,
    LabwareOffsetLocationSequenceComponents,
)
from opentrons.types import DeckSlotName

from robot_server.persistence.tables import (
    labware_offset_table,
    labware_offset_location_sequence_components_table,
)
from .models import StoredLabwareOffset

import sqlalchemy
import sqlalchemy.exc


class _DoNotFilter(enum.Enum):
    DO_NOT_FILTER = enum.auto()


DO_NOT_FILTER: Final = _DoNotFilter.DO_NOT_FILTER
"""A sentinel value for when a filter should not be applied.

This is different from filtering on `None`, which returns only entries where the
value is equal to `None`.
"""


DoNotFilterType: TypeAlias = Literal[_DoNotFilter.DO_NOT_FILTER]
"""The type of `DO_NOT_FILTER`, as `NoneType` is to `None`.

Unfortunately, mypy doesn't let us write `Literal[DO_NOT_FILTER]`. Use this instead.
"""


# todo(mm, 2024-12-06): Convert to be SQL-based and persistent instead of in-memory.
# https://opentrons.atlassian.net/browse/EXEC-1015
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
            offset_row_id = (
                transaction.execute(
                    sqlalchemy.insert(labware_offset_table)
                    .values(_pydantic_to_sql_offset(offset))
                    .returning(labware_offset_table.c.row_id)
                )
                .one()
                .row_id
            )
            transaction.execute(
                sqlalchemy.insert(labware_offset_table).values(
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
        location_slot_name_filter: DeckSlotName | DoNotFilterType = DO_NOT_FILTER,
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
        filter_statement = (
            sqlalchemy.select(labware_offset_table)
            .join(
                labware_offset_location_sequence_components_table,
                labware_offset_table.c.row_id
                == labware_offset_sequence_table.c.offset_id,
            )
            .where(labware_offset_table.c.active == True)  # noqa: E712
        )

        if id_filter is not DO_NOT_FILTER:
            filter_statement = filter_statement.where(
                labware_offset_table.c.offset_id == id_filter
            )
        if definition_uri_filter is not DO_NOT_FILTER:
            filter_statement = filter_statement.where(
                labware_offset_table.c.definition_uri == definition_uri_filter
            )
        if location_slot_name_filter is not DO_NOT_FILTER:
            filter_statement = (
                filter_statement.where(
                    labware_offset_location_sequence_components_table.c.component_kind
                    == "onAddressableArea"
                )
                .where(
                    labware_offset_location_sequence_components_table.c.primary_component_value
                    == location_slot_name_filter.value
                )
                .exists(0)
            )
        if location_module_model_filter is not DO_NOT_FILTER:
            location_module_model_filter_value = (
                location_module_model_filter.value
                if location_module_model_filter is not None
                else None
            )
            filter_statement = (
                filter_statement.where(
                    labware_offset_location_sequence_components_table.c.component_kind
                    == "onModule"
                )
                .where(
                    labware_offset_location_sequence_components_table.c.primary_component_value
                    == location_module_model_filter.value
                )
                .exists()
            )
        if location_definition_uri_filter is not DO_NOT_FILTER:
            filter_statement = (
                filter_statement.where(
                    labware_offset_location_sequence_components_table.c.component_kind
                    == "onLabware"
                )
                .where(
                    labware_offset_location_sequence_components_table.c.primary
                    - component_value
                    == location_definition_uri_filter
                )
                .exists()
            )

        filter_statement = filter_statement.order_by(
            labware_offset_table.c.row_id
        ).order_by(labware_offset_location_sequence_components_table.c.sequence_ordinal)

        with self._sql_engine.begin() as transaction:
            result = transaction.execute(filter_statement).all()

        return list(_collate_sql_to_pydantic(result))

    def delete(self, offset_id: str) -> StoredLabwareOffset:
        """Delete a labware offset by its ID. Return what was just deleted."""
        with self._sql_engine.begin() as transaction:
            try:
                row_to_delete = transaction.execute(
                    sqlalchemy.select(labware_offset_table).where(
                        labware_offset_table.c.offset_id == offset_id
                    )
                ).one()
            except sqlalchemy.exc.NoResultFound:
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id) from None
            if not row_to_delete.active:
                # Already soft-deleted.
                raise LabwareOffsetNotFoundError(bad_offset_id=offset_id)

            transaction.execute(
                sqlalchemy.update(labware_offset_table)
                .where(labware_offset_table.c.offset_id == offset_id)
                .values(active=False)
            )

            location_sequence = transaction.execute(
                sqlalchemy.get(labware_offset_location_sequence_components_table)
                .where(
                    labware_offset_location_sequence_components_table.c.offset_id
                    == row_to_delete.row_id
                )
                .order_by(
                    labware_offset_location_sequence_components_table.c.sequence_ordinal
                )
            ).all()

        return _sql_to_pydantic(row_to_delete, location_sequence)

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
        yield OnLabwareOffsetSequenceComponent(
            labwareUri=component_row.primary_component_value
        )
    elif component_row.component_kind == "onModule":
        yield OnModuleOffsetSequenceComponent(
            moduleModel=ModuleModel(component_row.primary_component_value)
        )
    elif component_row.component_kind == "onAddressableArea":
        yield OnAddressableAreaOffsetSequenceComponent(
            addressableAreaName=component_row.primary_component_value
        )
    else:
        raise KeyError(component_row.component_kind)


def _collate_sql_locations(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[LabwareOffsetLocationSequence, Optional[sqlalchemy.engine.Row]]:
    offset_id = first_row.offset_id
    location_sequence: list[LabwareOffsetLocationSequenceComponents] = [
        _sql_sequence_component_to_pydantic_sequence_component(first_row)
    ]
    while True:
        try:
            row = next(rest_rows)
        except StopIteration:
            return location_sequence, None
        if row.offset_id != first_row.offset_id:
            return location_sequence, row
        location_sequence.append(
            _sql_sequence_component_to_pydantic_sequence_component(row)
        )


def _sql_to_pydantic(
    first_row: sqlalchemy.engine.Row, rest_rows: Iterator[sqlalchemy.engine.Row]
) -> tuple[StoredLabwareOffset, Optional[sqlalchemy.engine.Row]]:
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
    row = next(row_iter)
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
    for index, component in labware_offset.locationSequence:
        if isinstance(component, OnLabwareOffsetSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.labwareUri,
                component_value_json=component.model_dump(),
            )
        elif isinstance(component, OnModuleOffsetSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.moduleModel.value,
                component_value_json=component.model_dump(),
            )
        elif isinstance(component, OnAddressableAreaOffsetSequenceComponent):
            yield dict(
                offset_id=offset_row_id,
                sequence_ordinal=index,
                component_kind=component.kind,
                primary_component_value=component.addressableAreaName,
                component_value_json=component.model_dump(),
            )
        else:
            # TODO: log here
            pass
