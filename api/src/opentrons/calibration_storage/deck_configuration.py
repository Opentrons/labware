from datetime import datetime
from typing import List, Optional, Tuple

import pydantic

from .types import CutoutFixturePlacement
from . import file_operators as io


class _CutoutFixturePlacementModel(pydantic.BaseModel):
    cutoutId: str
    cutoutFixtureId: str
    opentronsModuleSerialNumber: Optional[str] = None


class _DeckConfigurationModel(pydantic.BaseModel):
    """The on-filesystem representation of a deck configuration."""

    cutoutFixtures: List[_CutoutFixturePlacementModel]
    lastModified: datetime


def serialize_deck_configuration(
    cutout_fixture_placements: List[CutoutFixturePlacement], last_modified: datetime
) -> bytes:
    """Serialize a deck configuration for storing on the filesystem."""
    data = _DeckConfigurationModel.model_construct(
        cutoutFixtures=[
            _CutoutFixturePlacementModel.model_construct(
                cutoutId=e.cutout_id,
                cutoutFixtureId=e.cutout_fixture_id,
                opentronsModuleSerialNumber=e.opentrons_module_serial_number,
            )
            for e in cutout_fixture_placements
        ],
        lastModified=last_modified,
    )
    return io.serialize_pydantic_model(data)


# TODO(mm, 2023-11-21): If the data is corrupt, we should propagate the underlying error.
# And there should be an enumerated "corrupt storage" error in shared-data.
def deserialize_deck_configuration(
    serialized: bytes,
) -> Optional[Tuple[List[CutoutFixturePlacement], datetime]]:
    """Deserialize bytes previously serialized by `serialize_deck_configuration()`.

    Returns a tuple `(deck_configuration, last_modified_time)`, or `None` if the data is corrupt.
    """
    parsed = io.deserialize_pydantic_model(serialized, _DeckConfigurationModel)
    if parsed is None:
        return None
    else:
        cutout_fixture_placements = [
            CutoutFixturePlacement(
                cutout_id=e.cutoutId,
                cutout_fixture_id=e.cutoutFixtureId,
                opentrons_module_serial_number=e.opentronsModuleSerialNumber,
            )
            for e in parsed.cutoutFixtures
        ]
        return cutout_fixture_placements, parsed.lastModified
