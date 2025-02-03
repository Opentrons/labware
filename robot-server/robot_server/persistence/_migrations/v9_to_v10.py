"""Migrate the persistence directory from schema 9 to schema 10.

Summary of changes from schema 9:

- Adds a new `labware_offset_sequence_components` table.
"""

from pathlib import Path

import sqlalchemy

from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.deck import load as load_deck

from opentrons.types import DeckSlotName
from opentrons.protocols.api_support.deck_type import (
    guess_from_global_config as guess_deck_type_from_global_config,
)
from opentrons.protocol_engine import LegacyLabwareOffsetLocation, DeckType, ModuleModel
from opentrons.protocol_engine.labware_offset_standardization import (
    legacy_offset_location_to_offset_location_sequence,
)

from robot_server.persistence.database import sql_engine_ctx
from robot_server.persistence.file_and_directory_names import DB_FILE
from robot_server.persistence.tables import schema_10, schema_9

from ._util import copy_contents
from .._folder_migrator import Migration


class Migration9to10(Migration):  # noqa: D101
    def migrate(self, source_dir: Path, dest_dir: Path) -> None:
        """Migrate the persistence directory from schema 9 to 10."""
        # grab the deck def. middlewares aren't up yet so we can't use the nice version
        copy_contents(source_dir=source_dir, dest_dir=dest_dir)

        # First we create the new version of our labware offsets table and sequence table
        with sql_engine_ctx(
            dest_dir / DB_FILE
        ) as engine, engine.begin() as transaction:
            schema_10.labware_offset_table.create(transaction)
            schema_10.labware_offset_location_sequence_components_table.create(
                transaction
            )
            # Then we upmigrate the data to the new tables
            _upmigrate_stored_offsets(transaction)
            # Then, we drop the table with we don't care about anymore
            schema_9.labware_offset_table.drop(transaction)


def _upmigrate_stored_offsets(connection: sqlalchemy.engine.Connection) -> None:
    deck_definition = load_deck(
        DeckType(guess_deck_type_from_global_config()), version=5
    )

    offsets = connection.execute(sqlalchemy.select(schema_9.labware_offset_table))

    for offset in offsets:
        new_row = connection.execute(
            sqlalchemy.insert(schema_10.labware_offset_table).values(
                _v9_offset_to_v10_offset(offset)
            )
        ).lastrowid
        connection.execute(
            sqlalchemy.insert(
                schema_10.labware_offset_location_sequence_components_table
            ).values(
                _v9_offset_to_v10_offset_locations(offset, new_row, deck_definition)
            )
        )


def _v9_offset_to_v10_offset(v9_offset: sqlalchemy.engine.Row) -> dict[str, object]:
    return dict(
        offset_id=v9_offset.offset_id,
        definition_uri=v9_offset.definition_uri,
        vector_x=v9_offset.vector_x,
        vector_y=v9_offset.vector_y,
        vector_z=v9_offset.vector_z,
        created_at=v9_offset.created_at,
        active=v9_offset.active,
    )


def _v9_offset_to_v10_offset_locations(
    v9_offset: sqlalchemy.engine.Row, v10_id: int, deck_definition: DeckDefinitionV5
) -> list[dict[str, object]]:
    location_sequence = legacy_offset_location_to_offset_location_sequence(
        LegacyLabwareOffsetLocation(
            slotName=DeckSlotName(v9_offset.location_slot_name),
            moduleModel=(
                ModuleModel(v9_offset.location_module_model)
                if v9_offset.location_module_model is not None
                else None
            ),
            definitionUri=v9_offset.location_definition_uri,
        ),
        deck_definition,
    )
    values: list[dict[str, object]] = []
    for index, sequence_component in enumerate(location_sequence):
        primary_component_value = ""
        component_value_json = ""
        if sequence_component.kind == "onLabware":
            primary_component_value = sequence_component.labwareUri
            component_value_json = sequence_component.model_dump_json()
        elif sequence_component.kind == "onModule":
            primary_component_value = sequence_component.moduleModel.value
            component_value_json = sequence_component.model_dump_json()
        elif sequence_component.kind == "onAddressableArea":
            primary_component_value = sequence_component.addressableAreaName
            component_value_json = sequence_component.model_dump_json()
        else:
            # This should never happen since we're exhaustively checking kinds here
            continue
        values.append(
            dict(
                offset_id=v10_id,
                sequence_ordinal=index,
                component_kind=sequence_component.kind,
                primary_component_value=primary_component_value,
                component_value_json=component_value_json,
            )
        )
    return values
