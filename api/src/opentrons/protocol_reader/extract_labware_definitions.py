# noqa: D100

import json
from pathlib import Path
from typing import List

import anyio

from opentrons.protocols.models import LabwareDefinition

from .protocol_source import ProtocolFileRole, ProtocolSource, ProtocolType


async def extract_labware_definitions(
    protocol_source: ProtocolSource,
) -> List[LabwareDefinition]:
    """Extract all the labware definitions that are in the given protocol source.

    This accounts for differences between JSON protocols,
    which embed their labware definitions in the main protocol file,
    and Python protocols, which have them in separate sidecar files.

    May raise an exception if the files are not well-formed. Do not depend on the exact
    exception type. This should not happen if the `ProtocolSource` was acquired from a
    `ProtocolReader`, which should have validated the files.
    """
    if protocol_source.config.protocol_type == ProtocolType.JSON:
        return await _extract_from_json_protocol_file(path=protocol_source.main_file)
        # If there are any separate labware files, ignore them. This avoids custom
        # labware definitions shadowing the ones intrinsic to the main file, which would
        # be confusing. Note that, at least as of v6.2.0, the Opentrons App sends us
        # *every* custom labware definition along with *every* protocol.

    else:
        assert protocol_source.config.protocol_type == ProtocolType.PYTHON
        return [
            await _extract_from_labware_file(file.path)
            for file in protocol_source.files
            if file.role == ProtocolFileRole.LABWARE
        ]


async def _extract_from_labware_file(path: Path) -> LabwareDefinition:
    def _do_parse() -> LabwareDefinition:
        return LabwareDefinition.model_validate_json(path.read_bytes())

    return await anyio.to_thread.run_sync(_do_parse)


async def _extract_from_json_protocol_file(path: Path) -> List[LabwareDefinition]:
    def extract_sync(path: Path) -> List[LabwareDefinition]:
        with path.open("rb") as file:
            json_contents = json.load(file)
            # Rely on the file conforming to one of our JSON protocol schemas 3 to 7,
            # which require this labwareDefinitions key.
            unvalidated_definitions = json_contents["labwareDefinitions"].values()
            validated_definitions = [
                LabwareDefinition.model_validate(u) for u in unvalidated_definitions
            ]
            return validated_definitions

    return await anyio.to_thread.run_sync(extract_sync, path)
