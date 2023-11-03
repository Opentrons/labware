"""Convert between internal types for validation and HTTP-exposed response models."""

import dataclasses
from typing import Iterable, List

from . import models
from . import validation


def map_in(request: models.DeckConfigurationRequest) -> List[validation.Placement]:
    return [
        validation.Placement(cutout_id=p.cutoutId, cutout_fixture_id=p.cutoutFixtureId)
        for p in request.cutoutFixtures
    ]


def map_out(
    validation_errors: Iterable[validation.ConfigurationError],
) -> List[models.InvalidDeckConfiguration]:
    return [_map_out_single_error(e) for e in validation_errors]


def _map_out_single_error(
    error: validation.ConfigurationError,
) -> models.InvalidDeckConfiguration:
    meta = {
        "deckConfigurationProblem": error.__class__.__name__,
        **dataclasses.asdict(error),
    }
    return models.InvalidDeckConfiguration(
        detail="Invalid deck configuration.", meta=meta
    )
