import json
import pytest
from typing import Any, Dict
from pathlib import Path
from opentrons_shared_data import load_shared_data
from opentrons_shared_data.protocol.models import (
    protocol_schema_v6,
    Robot,
    Metadata,
    Liquid,
    Module,
    Pipette,
    Labware,
)

from . import list_fixtures


@pytest.mark.parametrize("defpath", list_fixtures(6))
def test_v6_types(defpath: Path) -> None:
    def_data = load_shared_data(defpath)
    def_model = protocol_schema_v6.ProtocolSchemaV6.model_validate_json(def_data)
    def_dict_from_model = def_model.model_dump(
        exclude_unset=True,
        # 'schemaVersion' in python is '$schemaVersion' in JSON
        by_alias=True,
    )
    expected_def_dict = json.loads(def_data)
    delete_unexpected_results(expected_def_dict)
    assert def_dict_from_model == expected_def_dict


# TODO (Tamar and Max 3/16/22):
# Some of our v6 fixtures accidentally contain command "result" data,
# which is not part of the schema, and which we don't parse into our models.
# Here, we delete the extra junk from the fixtures.
# Remove this when the fixtures are corrected.
# https://github.com/Opentrons/opentrons/issues/9701
def delete_unexpected_results(protocol_fixture: Dict[str, Any]) -> None:
    for command_object_dict in protocol_fixture["commands"]:
        command_object_dict.pop("result", None)
        command_object_dict.pop("id", None)


@pytest.mark.parametrize(
    "input_command, missing_id, load_command",
    [
        (
            protocol_schema_v6.Command(
                commandType="loadLabware",
                params=protocol_schema_v6.Params(labwareId="labware-id-3"),
            ),
            "labware-id-3",
            "loadLabware",
        ),
        (
            protocol_schema_v6.Command(
                commandType="loadPipette",
                params=protocol_schema_v6.Params(pipetteId="pipette-id-3"),
            ),
            "pipette-id-3",
            "loadPipette",
        ),
        (
            protocol_schema_v6.Command(
                commandType="loadLiquid",
                params=protocol_schema_v6.Params(liquidId="liquid-id-3"),
            ),
            "liquid-id-3",
            "loadLiquid",
        ),
        (
            protocol_schema_v6.Command(
                commandType="loadModule",
                params=protocol_schema_v6.Params(moduleId="module-id-3"),
            ),
            "module-id-3",
            "loadModule",
        ),
    ],
)
def test_schema_validators(
    input_command: protocol_schema_v6.Command, missing_id: str, load_command: str
) -> None:
    """Should raise an error the keys do not match."""
    labware = {
        "labware-id-1": Labware(definitionId="definition-1"),
        "labware-id-2": Labware(definitionId="definition-2"),
    }
    pipettes = {"pipette-id-1": Pipette(name="pipette-1")}
    liquids = {"liquid-id-1": Liquid(displayName="liquid-1", description="liquid desc")}
    modules = {"module-id-1": Module(model="model-1")}
    with pytest.raises(
        ValueError,
        match=f"{load_command} command at index 0 references ID {missing_id}, which doesn't exist.",
    ):
        protocol_schema_v6.ProtocolSchemaV6(
            otSharedSchema="#/protocol/schemas/6",
            schemaVersion=6,
            metadata=Metadata(),
            robot=Robot(model="OT-2 Standard", deckId=""),
            labware=labware,
            pipettes=pipettes,
            liquids=liquids,
            modules=modules,
            labwareDefinitions={},
            commands=[input_command],
        )
