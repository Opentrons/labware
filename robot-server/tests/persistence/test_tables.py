"""Tests for SQL tables."""

from pathlib import Path
from typing import List, cast

import pytest
import sqlalchemy

from robot_server.persistence.database import sql_engine_ctx
from robot_server.persistence.file_and_directory_names import DB_FILE
from robot_server.persistence.persistence_directory import make_migration_orchestrator
from robot_server.persistence.tables import (
    metadata as latest_metadata,
    schema_3,
    schema_2,
    schema_4,
    schema_5,
    schema_6,
    schema_7,
    schema_8,
    schema_9,
    schema_10,
)

# The statements that we expect to emit when we create a fresh database.
#
# If this changes semantically in any way,
# the change must be paired with a SQL schema migration.
# Examples of semantic changes:
#
#   * Adding, removing, or renaming a table.
#   * Adding, removing, or renaming a column.
#   * Changing a column type.
#   * Adding, removing, or renaming a constraint or relation.
#
# Whitespace and formatting changes, on the other hand, are allowed.
EXPECTED_STATEMENTS_LATEST = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR(14) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT protocolkindsqlenum CHECK (protocol_kind IN ('standard', 'quick-transfer'))
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE analysis_primitive_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        parameter_type VARCHAR(5) NOT NULL,
        parameter_value VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        CONSTRAINT primitiveparamsqlenum CHECK (parameter_type IN ('int', 'float', 'bool', 'str'))
    )
    """,
    """
    CREATE TABLE analysis_csv_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        command_intent VARCHAR,
        command_error VARCHAR,
        command_status VARCHAR(9),
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_status_index_in_run ON run_command (run_id, command_status, index_in_run)
    """,
    """
    CREATE INDEX ix_protocol_protocol_kind ON protocol (protocol_kind)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        source VARCHAR(9),
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE run_csv_rtp_table (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE TABLE boolean_setting (
        "key" VARCHAR(21) NOT NULL,
        value BOOLEAN NOT NULL,
        PRIMARY KEY ("key"),
        CONSTRAINT booleansettingkey CHECK ("key" IN ('enable_error_recovery'))
    )
    """,
    """
    CREATE TABLE labware_offset_with_sequence (
        row_id INTEGER NOT NULL,
        offset_id VARCHAR NOT NULL,
        definition_uri VARCHAR NOT NULL,
        vector_x FLOAT NOT NULL,
        vector_y FLOAT NOT NULL,
        vector_z FLOAT NOT NULL,
        active BOOLEAN NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (row_id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_labware_offset_with_sequence_offset_id ON labware_offset_with_sequence (offset_id)
    """,
    """
    CREATE TABLE labware_offset_sequence_components (
       row_id INTEGER NOT NULL,
       offset_id INTEGER NOT NULL,
       sequence_ordinal INTEGER NOT NULL,
       component_kind VARCHAR NOT NULL,
       primary_component_value VARCHAR NOT NULL,
       component_value_json VARCHAR NOT NULL,
       PRIMARY KEY (row_id),
       FOREIGN KEY(offset_id) REFERENCES labware_offset_with_sequence (row_id)
    )
    """,
    """
    CREATE INDEX ix_labware_offset_sequence_components_offset_id ON labware_offset_sequence_components (offset_id)
    """,
]

EXPECTED_STATEMENTS_V10 = EXPECTED_STATEMENTS_LATEST


EXPECTED_STATEMENTS_V9 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR(14) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT protocolkindsqlenum CHECK (protocol_kind IN ('standard', 'quick-transfer'))
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE analysis_primitive_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        parameter_type VARCHAR(5) NOT NULL,
        parameter_value VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        CONSTRAINT primitiveparamsqlenum CHECK (parameter_type IN ('int', 'float', 'bool', 'str'))
    )
    """,
    """
    CREATE TABLE analysis_csv_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        command_intent VARCHAR,
        command_error VARCHAR,
        command_status VARCHAR(9),
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_status_index_in_run ON run_command (run_id, command_status, index_in_run)
    """,
    """
    CREATE INDEX ix_protocol_protocol_kind ON protocol (protocol_kind)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        source VARCHAR(9),
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE run_csv_rtp_table (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE TABLE boolean_setting (
        "key" VARCHAR(21) NOT NULL,
        value BOOLEAN NOT NULL,
        PRIMARY KEY ("key"),
        CONSTRAINT booleansettingkey CHECK ("key" IN ('enable_error_recovery'))
    )
    """,
    """
    CREATE TABLE labware_offset (
        row_id INTEGER NOT NULL,
        offset_id VARCHAR NOT NULL,
        definition_uri VARCHAR NOT NULL,
        location_slot_name VARCHAR NOT NULL,
        location_module_model VARCHAR,
        location_definition_uri VARCHAR,
        vector_x FLOAT NOT NULL,
        vector_y FLOAT NOT NULL,
        vector_z FLOAT NOT NULL,
        active BOOLEAN NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (row_id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_labware_offset_offset_id ON labware_offset (offset_id)
    """,
]


EXPECTED_STATEMENTS_V8 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR(14) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT protocolkindsqlenum CHECK (protocol_kind IN ('standard', 'quick-transfer'))
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE analysis_primitive_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        parameter_type VARCHAR(5) NOT NULL,
        parameter_value VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        CONSTRAINT primitiveparamsqlenum CHECK (parameter_type IN ('int', 'float', 'bool', 'str'))
    )
    """,
    """
    CREATE TABLE analysis_csv_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        command_intent VARCHAR,
        command_error VARCHAR,
        command_status VARCHAR(9),
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_status_index_in_run ON run_command (run_id, command_status, index_in_run)
    """,
    """
    CREATE INDEX ix_protocol_protocol_kind ON protocol (protocol_kind)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        source VARCHAR(9),
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE run_csv_rtp_table (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE TABLE boolean_setting (
        "key" VARCHAR(21) NOT NULL,
        value BOOLEAN NOT NULL,
        PRIMARY KEY ("key"),
        CONSTRAINT booleansettingkey CHECK ("key" IN ('enable_error_recovery'))
    )
    """,
]


EXPECTED_STATEMENTS_V7 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR(14) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT protocolkindsqlenum CHECK (protocol_kind IN ('standard', 'quick-transfer'))
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE analysis_primitive_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        parameter_type VARCHAR(5) NOT NULL,
        parameter_value VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        CONSTRAINT primitiveparamsqlenum CHECK (parameter_type IN ('int', 'float', 'bool', 'str'))
    )
    """,
    """
    CREATE TABLE analysis_csv_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        command_intent VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE INDEX ix_protocol_protocol_kind ON protocol (protocol_kind)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        source VARCHAR(9),
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE run_csv_rtp_table (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE TABLE boolean_setting (
        "key" VARCHAR(21) NOT NULL,
        value BOOLEAN NOT NULL,
        PRIMARY KEY ("key"),
        CONSTRAINT booleansettingkey CHECK ("key" IN ('enable_error_recovery'))
    )
    """,
]


EXPECTED_STATEMENTS_V6 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR(14) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT protocolkindsqlenum CHECK (protocol_kind IN ('standard', 'quick-transfer'))
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE analysis_primitive_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        parameter_type VARCHAR(5) NOT NULL,
        parameter_value VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        CONSTRAINT primitiveparamsqlenum CHECK (parameter_type IN ('int', 'float', 'bool', 'str'))
    )
    """,
    """
    CREATE TABLE analysis_csv_rtp_table (
        row_id INTEGER NOT NULL,
        analysis_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(analysis_id) REFERENCES analysis (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE INDEX ix_protocol_protocol_kind ON protocol (protocol_kind)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE run_csv_rtp_table (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        parameter_variable_name VARCHAR NOT NULL,
        file_id VARCHAR,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id),
        FOREIGN KEY(file_id) REFERENCES data_files (id)
    )
    """,
]


EXPECTED_STATEMENTS_V5 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        protocol_kind VARCHAR,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        run_time_parameter_values_and_defaults VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
    """
    CREATE TABLE data_files (
        id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        file_hash VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id)
    )
    """,
]


EXPECTED_STATEMENTS_V4 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        run_time_parameter_values_and_defaults VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        run_time_parameters VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
]


EXPECTED_STATEMENTS_V3 = [
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary VARCHAR,
        engine_status VARCHAR,
        _updated_at DATETIME,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE TABLE run_command (
        row_id INTEGER NOT NULL,
        run_id VARCHAR NOT NULL,
        index_in_run INTEGER NOT NULL,
        command_id VARCHAR NOT NULL,
        command VARCHAR NOT NULL,
        PRIMARY KEY (row_id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_command_id ON run_command (run_id, command_id)
    """,
    """
    CREATE UNIQUE INDEX ix_run_run_id_index_in_run ON run_command (run_id, index_in_run)
    """,
]


EXPECTED_STATEMENTS_V2 = [
    """
    CREATE TABLE migration (
        id INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        version INTEGER NOT NULL,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE protocol (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_key VARCHAR,
        PRIMARY KEY (id)
    )
    """,
    """
    CREATE TABLE analysis (
        id VARCHAR NOT NULL,
        protocol_id VARCHAR NOT NULL,
        analyzer_version VARCHAR NOT NULL,
        completed_analysis BLOB NOT NULL,
        completed_analysis_as_document VARCHAR,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE INDEX ix_analysis_protocol_id ON analysis (protocol_id)
    """,
    """
    CREATE TABLE run (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        protocol_id VARCHAR,
        state_summary BLOB,
        commands BLOB,
        engine_status VARCHAR,
        _updated_at DATETIME,
        PRIMARY KEY (id),
        FOREIGN KEY(protocol_id) REFERENCES protocol (id)
    )
    """,
    """
    CREATE TABLE action (
        id VARCHAR NOT NULL,
        created_at DATETIME NOT NULL,
        action_type VARCHAR NOT NULL,
        run_id VARCHAR NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY(run_id) REFERENCES run (id)
    )
    """,
]


def _normalize_statement(statement: str) -> str:
    """Fix up the internal formatting of a single SQL statement for easier comparison."""
    lines = statement.splitlines()

    # Remove whitespace at the beginning and end of each line.
    lines = [line.strip() for line in lines]

    # Filter out blank lines.
    lines = [line for line in lines if line != ""]

    # Normalize line breaks to spaces. When we ask SQLite for its schema, it appears
    # inconsistent in whether it uses spaces or line breaks to separate tokens.
    # That may have to do with whether `ALTER TABLE` has been used on the table.
    return " ".join(lines)


@pytest.mark.parametrize(
    ("metadata", "expected_statements"),
    [
        (latest_metadata, EXPECTED_STATEMENTS_LATEST),
        (schema_10.metadata, EXPECTED_STATEMENTS_V10),
        (schema_9.metadata, EXPECTED_STATEMENTS_V9),
        (schema_8.metadata, EXPECTED_STATEMENTS_V8),
        (schema_7.metadata, EXPECTED_STATEMENTS_V7),
        (schema_6.metadata, EXPECTED_STATEMENTS_V6),
        (schema_5.metadata, EXPECTED_STATEMENTS_V5),
        (schema_4.metadata, EXPECTED_STATEMENTS_V4),
        (schema_3.metadata, EXPECTED_STATEMENTS_V3),
        (schema_2.metadata, EXPECTED_STATEMENTS_V2),
    ],
)
def test_creating_from_metadata_emits_expected_statements(
    metadata: sqlalchemy.MetaData, expected_statements: List[str]
) -> None:
    """Test that each schema compiles down to the expected SQL statements.

    This is a snapshot test to help catch accidental changes to our SQL schema.
    For example, we might refactor the way we define the schema on the Python side,
    but we probably expect the way that it compiles down to SQL to stay stable.

    Based on:
    https://docs.sqlalchemy.org/en/14/faq/metadata_schema.html#faq-ddl-as-string
    """
    actual_statements: List[str] = []

    def record_statement(
        sql: sqlalchemy.schema.DDLElement, *multiparams: object, **params: object
    ) -> None:
        compiled_statement = str(sql.compile(dialect=engine.dialect))
        actual_statements.append(compiled_statement)

    engine = sqlalchemy.create_mock_engine("sqlite://", record_statement)
    metadata.create_all(cast(sqlalchemy.engine.Engine, engine))

    normalized_actual = [_normalize_statement(s) for s in actual_statements]
    normalized_expected = [_normalize_statement(s) for s in expected_statements]

    # Compare ignoring order. SQLAlchemy appears to emit CREATE INDEX statements in a
    # nondeterministic order that varies across runs. Although statement order
    # theoretically matters, it's unlikely to matter in practice for our purposes here.
    assert set(normalized_actual) == set(normalized_expected)


def test_migrated_db_matches_db_created_from_metadata(tmp_path: Path) -> None:
    """Test that the output of migration matches `metadata.create_all()`.

    In other words, constructing the database by going through our migration system
    should have the same final result as if we created the database directly from
    the latest schema version.

    This prevents migrations from sneaking in arbitrary changes and causing the actual
    database to not exactly match what our SQLAlchemy `metadata` object declares.
    """
    migration_orchestrator = make_migration_orchestrator(prepared_root=tmp_path)
    active_subdirectory = migration_orchestrator.migrate_to_latest()

    expected_statements = EXPECTED_STATEMENTS_LATEST

    with sql_engine_ctx(
        active_subdirectory / DB_FILE
    ) as sql_engine, sql_engine.begin() as transaction:
        actual_statements = (
            transaction.execute(
                sqlalchemy.text("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL")
            )
            .scalars()
            .all()
        )

    normalized_actual = [_normalize_statement(s) for s in actual_statements]
    normalized_expected = [_normalize_statement(s) for s in expected_statements]

    # Compare ignoring order. SQLAlchemy appears to emit CREATE INDEX statements in a
    # nondeterministic order that varies across runs. Although statement order
    # theoretically matters, it's unlikely to matter in practice for our purposes here.
    assert set(normalized_actual) == set(normalized_expected)
