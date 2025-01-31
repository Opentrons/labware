"""File format validation interface."""
from __future__ import annotations

from typing import Iterable

import anyio
from pydantic import ValidationError as PydanticValidationError

from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.protocol.models import (
    ProtocolSchemaV6 as JsonProtocolV6,
    ProtocolSchemaV7 as JsonProtocolV7,
    ProtocolSchemaV8 as JsonProtocolV8,
)
from opentrons_shared_data.errors.exceptions import PythonException

from opentrons.protocols.models import JsonProtocol as JsonProtocolUpToV5

from .file_identifier import (
    IdentifiedFile,
    IdentifiedJsonMain,
    IdentifiedPythonMain,
    IdentifiedLabwareDefinition,
    IdentifiedData,
)
from .protocol_files_invalid_error import ProtocolFilesInvalidError


class FileFormatValidationError(ProtocolFilesInvalidError):
    """Raised when a file does not conform to the format it's supposed to."""

    @classmethod
    def _generic_json_failure(
        cls, info: IdentifiedJsonMain, exc: Exception
    ) -> FileFormatValidationError:
        return cls(
            message=f"{info.original_file.name} could not be read as a JSON protocol.",
            detail={"kind": "bad-json-protocol"},
            wrapping=[PythonException(exc)],
        )


class FileFormatValidator:
    """File format validation interface."""

    @staticmethod
    async def validate(files: Iterable[IdentifiedFile]) -> None:
        """Validate that each file actually conforms to the format we think it does."""
        for file in files:
            if isinstance(file, IdentifiedJsonMain):
                await _validate_json_protocol(file)
            elif isinstance(file, IdentifiedPythonMain):
                pass  # No more validation to do for Python protocols.
            elif isinstance(file, IdentifiedLabwareDefinition):
                await _validate_labware_definition(file)
            elif isinstance(file, IdentifiedData):
                pass  # No more validation to do for bundled data files.


async def _validate_labware_definition(info: IdentifiedLabwareDefinition) -> None:
    def validate_sync() -> None:
        try:
            LabwareDefinition.model_validate(info.unvalidated_json)
        except PydanticValidationError as e:
            raise FileFormatValidationError(
                message=f"{info.original_file.name} could not be read as a labware definition.",
                detail={"kind": "bad-labware-definition"},
                wrapping=[PythonException(e)],
            ) from e

    await anyio.to_thread.run_sync(validate_sync)


def _handle_v8_json_protocol_validation_error(
    info: IdentifiedJsonMain, pve: PydanticValidationError
) -> None:
    for error in pve.errors():
        if error["loc"] == ("commandSchemaId",) and error["type"] == "type_error.enum":
            # type_error.enum is for "this entry is not in this enum" and happens if you constrain a field by
            # annotating it with Enum, as we now do for command schema IDs
            raise FileFormatValidationError(
                message=(
                    f"{info.original_file.name} could not be read as a JSON protocol, in part because its command schema "
                    "id is unknown. This protocol may have been exported from a future version of authorship software. "
                    "Updating your Opentrons software may help."
                ),
                detail={
                    "kind": "bad-command-schema-id",
                    "command-schema-id": info.unvalidated_json.get(
                        "commandSchemaId", "<unknown>"
                    ),
                },
                wrapping=[PythonException(pve)],
            ) from pve
        if (
            error["loc"] == ("labwareDefinitionSchemaId",)
            and error["type"] == "value_error.const"
        ):
            # value_error.const is for "this entry is not one of these const values", which is different from type_error.enum
            # for I'm sure a very good reason, and happens if you constrain a field by annotating it with a Literal
            raise FileFormatValidationError(
                message=(
                    f"{info.original_file.name} could not be read as a JSON protocol, in part because its labware schema "
                    "id is unknown. This protocol may have been exported from a future version of authorship software. "
                    "Updating your Opentrons software may help."
                ),
                detail={
                    "kind": "bad-labware-schema-id",
                    "labware-schema-id": info.unvalidated_json.get(
                        "labwareDefinitionSchemaId", "<unknown>"
                    ),
                },
            )
        if error["loc"] == ("liquidSchemaId",) and error["type"] == "value_error.const":
            raise FileFormatValidationError(
                message=(
                    f"{info.original_file.name} could not be read as a JSON protocol, in part because its liquid schema "
                    "id is unknown. This protocol may have been exported from a future version of authorship software. "
                    "Updating your Opentrons software may help."
                ),
                detail={
                    "kind": "bad-liquid-schema-id",
                    "liquid-schema-id": info.unvalidated_json.get(
                        "liquidSchemaId", "<unknown>"
                    ),
                },
            )
    else:
        raise FileFormatValidationError._generic_json_failure(info, pve) from pve


async def _validate_json_protocol(info: IdentifiedJsonMain) -> None:
    def validate_sync() -> None:
        if info.schema_version == 8:
            try:
                JsonProtocolV8.model_validate(info.unvalidated_json)
            except PydanticValidationError as pve:
                _handle_v8_json_protocol_validation_error(info, pve)
        else:
            try:
                if info.schema_version == 7:
                    JsonProtocolV7.model_validate(info.unvalidated_json)
                elif info.schema_version == 6:
                    JsonProtocolV6.model_validate(info.unvalidated_json)
                else:
                    JsonProtocolUpToV5.model_validate(info.unvalidated_json)
            except PydanticValidationError as e:
                raise FileFormatValidationError._generic_json_failure(info, e) from e

    await anyio.to_thread.run_sync(validate_sync)
