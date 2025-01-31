"""Test fixtures for opentrons.protocol_runner tests.

These fixtures consist of two "matching" JSON and Python protocols,
saved to disk.
"""
import pytest
import json
import textwrap
from pathlib import Path

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.labware import load_definition
from opentrons.protocol_engine import ModuleDefinition


@pytest.fixture(scope="session")
def tempdeck_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 tempdeck."""
    definition = load_shared_data("module/definitions/3/temperatureModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture()
def json_protocol_file(tmp_path: Path) -> Path:
    """Get minimal JSON protocol input "file"."""
    tip_rack_def = load_definition("opentrons_96_tiprack_300ul", version=1)
    path = tmp_path / "protocol-name.json"

    path.write_text(
        json.dumps(
            {
                "$otSharedSchema": "#/protocol/schemas/6",
                "schemaVersion": 6,
                "metadata": {},
                "robot": {"model": "OT-2 Standard", "deckId": "ot2_standard"},
                "pipettes": {
                    "pipette-id": {"name": "p300_single"},
                },
                "labware": {
                    "labware-id": {
                        "displayName": "Opentrons 96 Tip Rack 300 µL",
                        "definitionId": "opentrons/opentrons_96_tiprack_300ul/1",
                    },
                },
                "labwareDefinitions": {
                    "opentrons/opentrons_96_tiprack_300ul/1": tip_rack_def,
                },
                "commands": [
                    {
                        "id": "command-id-1",
                        "commandType": "loadLabware",
                        "params": {
                            "labwareId": "labware-id",
                            "loadName": "opentrons_96_tiprack_300ul",
                            "namespace": "opentrons",
                            "version": 1,
                            "location": {"slotName": "1"},
                        },
                    },
                    {
                        "id": "command-id-2",
                        "commandType": "loadPipette",
                        "params": {
                            "pipetteId": "pipette-id",
                            "pipetteName": "p300_single",
                            "mount": "left",
                        },
                    },
                    {
                        "id": "command-id-3",
                        "commandType": "pickUpTip",
                        "params": {
                            "pipetteId": "pipette-id",
                            "labwareId": "labware-id",
                            "wellName": "A1",
                        },
                    },
                ],
            }
        )
    )

    return path


@pytest.fixture()
def python_protocol_file(tmp_path: Path) -> Path:
    """Get minimal Python protocol input "file"."""
    path = tmp_path / "protocol-name.py"
    path.write_text(
        textwrap.dedent(
            """
            # my protocol
            metadata = {
                "apiLevel": "2.14",
            }
            def run(ctx):
                pipette = ctx.load_instrument(
                    instrument_name="p300_single",
                    mount="left",
                )
                tip_rack = ctx.load_labware(
                    load_name="opentrons_96_tiprack_300ul",
                    location="1",
                )
                temp_module = ctx.load_module(
                    module_name="temperature module",
                    location="3"
                )
                pipette.pick_up_tip(
                    location=tip_rack.wells_by_name()["A1"],
                )
            """
        )
    )

    return path


@pytest.fixture()
def python_protocol_file_with_run_time_params(tmp_path: Path) -> Path:
    """Get minimal Python protocol input "file" with run time parameters."""
    path = tmp_path / "protocol-name.py"
    path.write_text(
        textwrap.dedent(
            """
            # my protocol
            metadata = {
                "apiLevel": "2.18",
            }
            def add_parameters(params):
                params.add_float(
                    display_name="Aspirate volume",
                    variable_name="aspirate_volume",
                    default=25.5,
                    minimum=10,
                    maximum=50,
                )
                params.add_str(
                    display_name="Mount",
                    variable_name="mount",
                    choices=[
                        {"display_name": "Left Mount", "value": "left"},
                        {"display_name": "Right Mount", "value": "right"},
                    ],
                    default="left",
                )
            def run(ctx):
                pipette = ctx.load_instrument(
                    instrument_name="p300_single",
                    mount=ctx.params.mount,
                )
                tip_rack = ctx.load_labware(
                    load_name="opentrons_96_tiprack_300ul",
                    location="1",
                )
                reservoir = ctx.load_labware(
                    load_name="nest_1_reservoir_195ml",
                    location=2,
                )
                pipette.pick_up_tip(
                    location=tip_rack.wells_by_name()["A1"],
                )
                pipette.aspirate(ctx.params.aspirate_volume, reservoir.wells()[0])
            """
        )
    )

    return path


@pytest.fixture()
def legacy_python_protocol_file(tmp_path: Path) -> Path:
    """Get an on-disk, minimal Python protocol fixture."""
    path = tmp_path / "protocol-name.py"
    path.write_text(
        textwrap.dedent(
            """
            # my protocol
            metadata = {
                "apiLevel": "2.11",
            }
            def run(ctx):
                pipette = ctx.load_instrument(
                    instrument_name="p300_single",
                    mount="left",
                )
                tip_rack = ctx.load_labware(
                    load_name="opentrons_96_tiprack_300ul",
                    location="1",
                )
                pipette.pick_up_tip(
                    location=tip_rack.wells_by_name()["A1"],
                )
            """
        )
    )

    return path


@pytest.fixture()
def legacy_json_protocol_file(tmp_path: Path) -> Path:
    """Get an on-disk, minimal JSON protocol fixture."""
    tip_rack_def = load_definition("opentrons_96_tiprack_300ul", version=1)
    path = tmp_path / "protocol-name.json"
    path.write_text(
        json.dumps(
            {
                "$otSharedSchema": "#/protocol/schemas/5",
                "schemaVersion": 5,
                "metadata": {},
                "robot": {"model": "OT-2 Standard"},
                "pipettes": {
                    "pipette-id": {"mount": "left", "name": "p300_single"},
                },
                "labware": {
                    "labware-id": {
                        "slot": "1",
                        "displayName": "Opentrons 96 Tip Rack 300 µL",
                        "definitionId": "opentrons/opentrons_96_tiprack_300ul/1",
                    },
                },
                "modules": {},
                "labwareDefinitions": {
                    "opentrons/opentrons_96_tiprack_300ul/1": tip_rack_def,
                },
                "commands": [
                    {
                        "command": "pickUpTip",
                        "params": {
                            "pipette": "pipette-id",
                            "labware": "labware-id",
                            "well": "A1",
                        },
                    },
                ],
            }
        )
    )

    return path
