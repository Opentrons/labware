"""JSON file reading."""
from typing import Union

from opentrons_shared_data.protocol.models.protocol_schema_v6 import ProtocolSchemaV6
from opentrons_shared_data.protocol.models.protocol_schema_v7 import ProtocolSchemaV7
from opentrons_shared_data.protocol.models.protocol_schema_v8 import ProtocolSchemaV8
from opentrons.protocol_reader import (
    ProtocolSource,
    JsonProtocolConfig,
    ProtocolFilesInvalidError,
)


class JsonFileReader:
    """Reads and parses JSON protocol files."""

    @staticmethod
    def read(
        protocol_source: ProtocolSource,
    ) -> Union[ProtocolSchemaV6, ProtocolSchemaV7, ProtocolSchemaV8]:
        """Read and parse file into a JsonProtocol model."""
        name = protocol_source.metadata.get("name", protocol_source.main_file.name)
        if not isinstance(protocol_source.config, JsonProtocolConfig):
            raise ProtocolFilesInvalidError(
                message=f"Cannot execute {name} as a JSON protocol",
                detail={
                    "kind": "non-json-file-in-json-file-reader",
                    "metadata-name": str(protocol_source.metadata.get("name")),
                    "file-name": protocol_source.main_file.name,
                },
            )
        if protocol_source.config.schema_version == 6:
            return ProtocolSchemaV6.model_validate_json(
                protocol_source.main_file.read_bytes()
            )
        elif protocol_source.config.schema_version == 7:
            return ProtocolSchemaV7.model_validate_json(
                protocol_source.main_file.read_bytes()
            )
        elif protocol_source.config.schema_version == 8:
            return ProtocolSchemaV8.model_validate_json(
                protocol_source.main_file.read_bytes()
            )
        else:
            raise ProtocolFilesInvalidError(
                message=f"{name} is a JSON protocol v{protocol_source.config.schema_version} which this robot cannot execute",
                detail={
                    "kind": "schema-version-unknown",
                    "requested-schema-version": str(
                        protocol_source.config.schema_version
                    ),
                    "minimum-handled-schema-version": "6",
                    "maximum-handled-shcema-version": "8",
                },
            )
