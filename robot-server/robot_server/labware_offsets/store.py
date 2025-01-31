# noqa: D100

import enum
from typing import Final, Literal, TypeAlias

from opentrons.protocol_engine.types import (
    LabwareOffset,
    LegacyLabwareOffsetLocation,
    LabwareOffsetVector,
    ModuleModel,
)
from opentrons.types import DeckSlotName

from robot_server.persistence.tables import labware_offset_table

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

    def add(self, offset: LabwareOffset) -> None:
        """Store a new labware offset."""
        with self._sql_engine.begin() as transaction:
            transaction.execute(
                sqlalchemy.insert(labware_offset_table).values(_pydantic_to_sql(offset))
            )

    def search(
        self,
        id_filter: str | DoNotFilterType = DO_NOT_FILTER,
        definition_uri_filter: str | DoNotFilterType = DO_NOT_FILTER,
        location_slot_name_filter: DeckSlotName | DoNotFilterType = DO_NOT_FILTER,
        location_module_model_filter: ModuleModel
        | None
        | DoNotFilterType = DO_NOT_FILTER,
        location_definition_uri_filter: str | None | DoNotFilterType = DO_NOT_FILTER,
        # todo(mm, 2024-12-06): Support pagination (cursor & pageLength query params).
        # The logic for that is currently duplicated across several places in
        # robot-server and api. We should try to clean that up, or at least avoid
        # making it worse.
    ) -> list[LabwareOffset]:
        """Return all matching labware offsets in order from oldest-added to newest."""
        statement = (
            sqlalchemy.select(labware_offset_table)
            .order_by(labware_offset_table.c.row_id)
            .where(labware_offset_table.c.active == True)  # noqa: E712
        )

        if id_filter is not DO_NOT_FILTER:
            statement = statement.where(labware_offset_table.c.offset_id == id_filter)
        if definition_uri_filter is not DO_NOT_FILTER:
            statement = statement.where(
                labware_offset_table.c.definition_uri == definition_uri_filter
            )
        if location_slot_name_filter is not DO_NOT_FILTER:
            statement = statement.where(
                labware_offset_table.c.location_slot_name
                == location_slot_name_filter.value
            )
        if location_module_model_filter is not DO_NOT_FILTER:
            location_module_model_filter_value = (
                location_module_model_filter.value
                if location_module_model_filter is not None
                else None
            )
            statement = statement.where(
                labware_offset_table.c.location_module_model
                == location_module_model_filter_value
            )
        if location_definition_uri_filter is not DO_NOT_FILTER:
            statement = statement.where(
                labware_offset_table.c.location_definition_uri
                == location_definition_uri_filter
            )

        with self._sql_engine.begin() as transaction:
            result = transaction.execute(statement).all()

        return [_sql_to_pydantic(row) for row in result]

    def delete(self, offset_id: str) -> LabwareOffset:
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

        return _sql_to_pydantic(row_to_delete)

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


def _sql_to_pydantic(row: sqlalchemy.engine.Row) -> LabwareOffset:
    return LabwareOffset(
        id=row.offset_id,
        createdAt=row.created_at,
        definitionUri=row.definition_uri,
        location=LegacyLabwareOffsetLocation(
            slotName=DeckSlotName(row.location_slot_name),
            moduleModel=row.location_module_model,
            definitionUri=row.location_definition_uri,
        ),
        vector=LabwareOffsetVector(
            x=row.vector_x,
            y=row.vector_y,
            z=row.vector_z,
        ),
    )


def _pydantic_to_sql(labware_offset: LabwareOffset) -> dict[str, object]:
    return dict(
        offset_id=labware_offset.id,
        definition_uri=labware_offset.definitionUri,
        location_slot_name=labware_offset.location.slotName.value,
        location_module_model=labware_offset.location.moduleModel.value
        if labware_offset.location.moduleModel is not None
        else None,
        location_definition_uri=labware_offset.location.definitionUri,
        vector_x=labware_offset.vector.x,
        vector_y=labware_offset.vector.y,
        vector_z=labware_offset.vector.z,
        created_at=labware_offset.createdAt,
        active=True,
    )
