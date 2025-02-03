"""Helper to build a search query."""

from __future__ import annotations
from typing import Final, TYPE_CHECKING

import sqlalchemy

from opentrons.protocol_engine import ModuleModel

from robot_server.persistence.tables import (
    labware_offset_table,
    labware_offset_location_sequence_components_table,
)
from .models import DoNotFilterType, DO_NOT_FILTER

if TYPE_CHECKING:
    from typing_extensions import Self


class SearchQueryBuilder:
    """Helper class to build a search query.

    This object is stateful, and should be kept around just long enough to have the parameters
    of a single search injected.
    """

    def __init__(self) -> None:
        """Build the object."""
        super().__init__()
        self._filter_original: Final = sqlalchemy.select(
            labware_offset_table.c.row_id,
            labware_offset_table.c.offset_id,
            labware_offset_table.c.definition_uri,
            labware_offset_table.c.vector_x,
            labware_offset_table.c.vector_y,
            labware_offset_table.c.vector_z,
            labware_offset_table.c.created_at,
            labware_offset_table.c.active,
            labware_offset_location_sequence_components_table.c.sequence_ordinal,
            labware_offset_location_sequence_components_table.c.component_kind,
            labware_offset_location_sequence_components_table.c.primary_component_value,
        ).select_from(
            sqlalchemy.join(
                labware_offset_table,
                labware_offset_location_sequence_components_table,
                labware_offset_table.c.row_id
                == labware_offset_location_sequence_components_table.c.offset_id,
            )
        )
        self._offset_location_alias: Final = (
            labware_offset_location_sequence_components_table.alias()
        )
        self._current_base_filter_statement = self._filter_original
        self._current_positive_location_filter: (
            sqlalchemy.sql.selectable.Exists | None
        ) = None
        self._current_negative_filter_subqueries: list[
            sqlalchemy.sql.selectable.Exists
        ] = []

    def _positive_query(self) -> sqlalchemy.sql.selectable.Exists:
        if self._current_positive_location_filter is not None:
            return self._current_positive_location_filter
        return sqlalchemy.exists().where(
            self._offset_location_alias.c.offset_id
            == labware_offset_location_sequence_components_table.c.offset_id
        )

    def build_query(self) -> sqlalchemy.sql.selectable.Selectable:
        """Render the query into a sqlalchemy object suitable for passing to the database."""
        statement = self._current_base_filter_statement
        if self._current_positive_location_filter is not None:
            statement = statement.where(self._current_positive_location_filter)
        for subq in self._current_negative_filter_subqueries:
            statement = statement.where(sqlalchemy.not_(subq))
        statement = statement.order_by(labware_offset_table.c.row_id).order_by(
            labware_offset_location_sequence_components_table.c.sequence_ordinal
        )
        return statement

    def do_active_filter(self, active: bool) -> Self:
        """Filter to only rows that are active (active=True) or inactive (active=False)."""
        self._current_base_filter_statement = self._current_base_filter_statement.where(
            labware_offset_table.c.active == active
        )
        return self

    def do_id_filter(self, id_filter: str | DoNotFilterType) -> Self:
        """Filter to rows with only the given offset ID."""
        if id_filter is DO_NOT_FILTER:
            return self

        self._current_base_filter_statement = self._current_base_filter_statement.where(
            labware_offset_table.c.offset_id == id_filter
        )
        return self

    def do_definition_uri_filter(
        self, definition_uri_filter: str | DoNotFilterType
    ) -> Self:
        """Filter to rows of an offset that apply to a definition URI."""
        if definition_uri_filter is DO_NOT_FILTER:
            return self
        self._current_base_filter_statement = self._current_base_filter_statement.where(
            labware_offset_table.c.definition_uri == definition_uri_filter
        )
        return self

    def do_on_addressable_area_filter(
        self,
        addressable_area_filter: str | DoNotFilterType,
    ) -> Self:
        """Filter to rows of an offset that applies to the given addressable area."""
        if addressable_area_filter is DO_NOT_FILTER:
            return self
        self._current_positive_location_filter = (
            self._positive_query()
            .where(self._offset_location_alias.c.component_kind == "onAddressableArea")
            .where(
                self._offset_location_alias.c.primary_component_value
                == addressable_area_filter
            )
        )
        return self

    def do_on_labware_filter(
        self, labware_uri_filter: str | DoNotFilterType | None
    ) -> Self:
        """Filter to the rows of an offset located on the given labware (or no labware)."""
        if labware_uri_filter is DO_NOT_FILTER:
            return self
        if labware_uri_filter is None:
            self._current_negative_filter_subqueries.append(
                sqlalchemy.exists()
                .where(
                    self._offset_location_alias.c.offset_id
                    == labware_offset_location_sequence_components_table.c.offset_id
                )
                .where(self._offset_location_alias.c.component_kind == "onLabware")
            )
            return self
        self._current_positive_location_filter = (
            self._positive_query()
            .where(self._offset_location_alias.c.component_kind == "onLabware")
            .where(
                self._offset_location_alias.c.primary_component_value
                == labware_uri_filter
            )
        )
        return self

    def do_on_module_filter(
        self,
        module_model_filter: ModuleModel | DoNotFilterType | None,
    ) -> Self:
        """Filter to the rows of an offset located on the given module (or no module)."""
        if module_model_filter is DO_NOT_FILTER:
            return self
        if module_model_filter is None:
            self._current_negative_filter_subqueries.append(
                sqlalchemy.exists()
                .where(
                    self._offset_location_alias.c.offset_id
                    == labware_offset_location_sequence_components_table.c.offset_id
                )
                .where(self._offset_location_alias.c.component_kind == "onModule")
            )
            return self
        self._current_positive_location_filter = (
            self._positive_query()
            .where(self._offset_location_alias.c.component_kind == "onModule")
            .where(
                self._offset_location_alias.c.primary_component_value
                == module_model_filter.value
            )
        )
        return self
