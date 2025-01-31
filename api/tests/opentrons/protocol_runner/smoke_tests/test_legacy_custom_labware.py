"""Test legacy custom labware in an end-to-end environment.

Legacy ProtocolContext objects are prohibitively difficult to instansiate
and mock in an isolated unit test environment.
"""
import pytest
import textwrap
from decoy import matchers
from pathlib import Path
from typing import List

from opentrons_shared_data import load_shared_data
from opentrons.types import DeckSlotName
from opentrons.protocol_engine import DeckSlotLocation, LoadedLabware
from opentrons.protocol_reader import ProtocolReader
from opentrons.protocol_runner.create_simulating_orchestrator import (
    create_simulating_orchestrator,
)

FIXTURE_LABWARE_DEF = load_shared_data("labware/fixtures/2/fixture_96_plate.json")
CUSTOM_LABWARE_PROTOCOL = textwrap.dedent(
    """
    metadata = {
        "apiLevel": "2.11",
    }

    def run(ctx):
        plate = ctx.load_labware(
            load_name="fixture_96_plate",
            location="1",
        )
    """
)


@pytest.fixture()
def custom_labware_protocol_files(tmp_path: Path) -> List[Path]:
    """Create input files to feed into the ProtocolReader."""
    protocol_path = tmp_path / "protocol-name.py"
    protocol_path.write_text(CUSTOM_LABWARE_PROTOCOL)

    labware_path = tmp_path / "labware.json"
    labware_path.write_bytes(FIXTURE_LABWARE_DEF)

    return [protocol_path, labware_path]


async def test_legacy_custom_labware(custom_labware_protocol_files: List[Path]) -> None:
    """It should map legacy pick up tip commands."""
    protocol_reader = ProtocolReader()
    protocol_source = await protocol_reader.read_saved(
        files=custom_labware_protocol_files,
        directory=None,
    )

    subject = await create_simulating_orchestrator(
        robot_type="OT-2 Standard", protocol_config=protocol_source.config
    )
    result = await subject.run(deck_configuration=[], protocol_source=protocol_source)

    expected_labware = LoadedLabware.model_construct(
        id=matchers.Anything(),
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        loadName="fixture_96_plate",
        definitionUri="fixture/fixture_96_plate/1",
        offsetId=None,
    )

    assert result.state_summary.errors == []
    assert expected_labware in result.state_summary.labware
