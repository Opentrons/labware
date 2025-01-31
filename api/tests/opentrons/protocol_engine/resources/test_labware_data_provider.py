"""Functional tests for the LabwareDataProvider."""
from typing import cast

from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict
from opentrons.calibration_storage.helpers import hash_labware_def
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocol_api.labware import get_labware_definition

from opentrons.protocol_engine.resources import LabwareDataProvider


async def test_labware_data_gets_standard_definition() -> None:
    """It should be able to get a "standard" labware's definition."""
    expected = get_labware_definition(
        load_name="opentrons_96_tiprack_300ul",
        namespace="opentrons",
        version=1,
    )
    result = await LabwareDataProvider().get_labware_definition(
        load_name="opentrons_96_tiprack_300ul",
        namespace="opentrons",
        version=1,
    )

    assert result == LabwareDefinition.model_validate(expected)


async def test_labware_hash_match() -> None:
    """Labware dict vs Pydantic model hashing should match.

    This is a smoke test to ensure proper functioning of
    LabwareDataProvider.get_calibrated_tip_length given its
    internal implementation relies on this to work.
    """
    labware_dict = get_labware_definition(
        load_name="opentrons_96_tiprack_300ul",
        namespace="opentrons",
        version=1,
    )

    labware_model = LabwareDefinition.model_validate(labware_dict)
    labware_model_dict = cast(
        LabwareDefDict, labware_model.model_dump(exclude_none=True, exclude_unset=True)
    )

    assert hash_labware_def(labware_dict) == hash_labware_def(labware_model_dict)
