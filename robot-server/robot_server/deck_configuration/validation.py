from collections import defaultdict
from dataclasses import dataclass
from typing import DefaultDict, FrozenSet, List, Set, Tuple, Union

from opentrons_shared_data.deck import dev_types as deck_types


@dataclass(frozen=True)
class MountedCutoutFixture:
    cutout_id: str
    cutout_fixture_id: str


@dataclass(frozen=True)
class UnoccupiedCutoutError:
    cutout_id: str


@dataclass(frozen=True)
class OvercrowdedCutoutError:
    cutout_id: str
    cutout_fixture_ids: Tuple[str, ...]
    """All the conflicting cutout fixtures, in input order."""


@dataclass(frozen=True)
class InvalidLocationError:
    cutout_id: str
    cutout_fixture_id: str
    allowed_cutout_ids: FrozenSet[str]


@dataclass(frozen=True)
class UnrecognizedCutoutError:
    cutout_id: str


@dataclass(frozen=True)
class UnrecognizedCutoutFixtureError:
    cutout_fixture_id: str


ConfigurationError = Union[
    UnoccupiedCutoutError,
    OvercrowdedCutoutError,
    InvalidLocationError,
    UnrecognizedCutoutError,
    UnrecognizedCutoutFixtureError,
]


def get_configuration_errors(
    deck_definition: deck_types.DeckDefinitionV4,
    cutout_fixtures: List[MountedCutoutFixture],
) -> Set[ConfigurationError]:
    errors: Set[ConfigurationError] = set()
    fixtures_by_cutout: DefaultDict[str, List[str]] = defaultdict(list)

    for cutout_fixture in cutout_fixtures:
        fixtures_by_cutout[cutout_fixture.cutout_id].append(
            cutout_fixture.cutout_fixture_id
        )

    expected_cutouts = set(c["id"] for c in deck_definition["locations"]["cutouts"])
    occupied_cutouts = set(fixtures_by_cutout.keys())
    errors.update(
        UnoccupiedCutoutError(cutout_id)
        for cutout_id in expected_cutouts - occupied_cutouts
    )

    for cutout, fixtures in fixtures_by_cutout.items():
        if len(fixtures) > 1:
            errors.add(OvercrowdedCutoutError(cutout, tuple(fixtures)))

    for cutout_fixture in cutout_fixtures:
        found_cutout_fixture = find_cutout_fixture(
            deck_definition, cutout_fixture.cutout_fixture_id
        )
        if isinstance(found_cutout_fixture, UnrecognizedCutoutFixtureError):
            errors.add(found_cutout_fixture)
        else:
            allowed_cutout_ids = frozenset(found_cutout_fixture["mayMountTo"])
            if cutout_fixture.cutout_id not in allowed_cutout_ids:
                errors.add(
                    InvalidLocationError(
                        cutout_id=cutout_fixture.cutout_id,
                        cutout_fixture_id=cutout_fixture.cutout_fixture_id,
                        allowed_cutout_ids=allowed_cutout_ids,
                    )
                )

    return errors


def find_cutout_fixture(
    deck_definition: deck_types.DeckDefinitionV4, cutout_fixture_id: str
) -> Union[deck_types.CutoutFixture, UnrecognizedCutoutFixtureError]:
    try:
        return next(
            cutout_fixture
            for cutout_fixture in deck_definition["cutoutFixtures"]
            if cutout_fixture["id"] == cutout_fixture_id
        )
    except StopIteration:
        return UnrecognizedCutoutFixtureError(cutout_fixture_id=cutout_fixture_id)
