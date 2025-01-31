import pytest
import typeguard

from opentrons_shared_data.deck import (
    list_names as list_deck_definition_names,
    load as load_deck_definition,
)
from opentrons_shared_data.deck.types import (
    DeckDefinitionV3,
    DeckDefinitionV5,
)


@pytest.mark.parametrize("defname", list_deck_definition_names(version=3))
def test_v3_defs(defname: str) -> None:
    defn = load_deck_definition(name=defname, version=3)
    typeguard.check_type(defn, DeckDefinitionV3)


@pytest.mark.parametrize("defname", list_deck_definition_names(version=5))
def test_v5_defs(defname: str) -> None:
    defn = load_deck_definition(name=defname, version=5)
    typeguard.check_type(defn, DeckDefinitionV5)
