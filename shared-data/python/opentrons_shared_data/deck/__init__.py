"""
opentrons_shared_data.deck: types and bindings for deck definitions
"""
from typing import Dict, List, NamedTuple, cast, overload, TYPE_CHECKING
from typing_extensions import Final
import json

from .. import get_shared_data_root, load_shared_data

if TYPE_CHECKING:
    from .types import (
        DeckSchema,
        DeckDefinition,
        DeckDefinitionV3,
        DeckSchemaVersion3,
        DeckDefinitionV4,
        DeckSchemaVersion4,
        DeckDefinitionV5,
        DeckSchemaVersion5,
    )

DEFAULT_DECK_DEFINITION_VERSION: Final = 5


class Offset(NamedTuple):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


Z_PREP_OFFSET = Offset(x=13, y=13)
CALIBRATION_PROBE_RADIUS: Final[float] = 2
CALIBRATION_SQUARE_DEPTH: Final[float] = -0.25
CALIBRATION_SQUARE_SIZE: Final[float] = 20
CALIBRATION_SQUARE_EDGES: Dict[str, Offset] = {
    "left": Offset(x=-CALIBRATION_SQUARE_SIZE * 0.5),
    "right": Offset(x=CALIBRATION_SQUARE_SIZE * 0.5),
    "top": Offset(y=CALIBRATION_SQUARE_SIZE * 0.5),
    "bottom": Offset(y=-CALIBRATION_SQUARE_SIZE * 0.5),
}


@overload
def load(name: str, version: "DeckSchemaVersion5") -> "DeckDefinitionV5":
    ...


@overload
def load(name: str, version: "DeckSchemaVersion4") -> "DeckDefinitionV4":
    ...


@overload
def load(name: str, version: "DeckSchemaVersion3") -> "DeckDefinitionV3":
    ...


@overload
def load(name: str) -> "DeckDefinitionV5":
    ...


def load(name: str, version: int = DEFAULT_DECK_DEFINITION_VERSION) -> "DeckDefinition":
    return json.loads(  # type: ignore[no-any-return]
        load_shared_data(f"deck/definitions/{version}/{name}.json")
    )


def load_schema(version: int) -> "DeckSchema":
    return cast(
        "DeckSchema", json.loads(load_shared_data(f"deck/schemas/{version}.json"))
    )


def list_names(version: int) -> List[str]:
    """Return all loadable deck definition names, for the given schema version."""
    definitions_directory = (
        get_shared_data_root() / "deck" / "definitions" / f"{version}"
    )
    return [file.stem for file in definitions_directory.iterdir()]


def get_calibration_square_position_in_slot(slot: int) -> Offset:
    """Get the position of an OT-3 deck slot's calibration square.

    Params:
        slot: The slot whose calibration square to retrieve, specified as an OT-2-style slot number.
            For example, specify 5 to get slot C2.
    """
    deck = load("ot3_standard", version=3)
    slots = deck["locations"]["orderedSlots"]

    # Assume that the OT-3 deck definition has the same number of slots, and in the same order,
    # as the OT-2.
    # TODO(mm, 2023-05-22): This assumption will break down when the OT-3 has staging area slots.
    # https://opentrons.atlassian.net/browse/RLAB-345
    s = slots[slot - 1]

    bottom_left = s["position"]
    slot_size_x = s["boundingBox"]["xDimension"]
    slot_size_y = s["boundingBox"]["yDimension"]
    relative_center = [float(slot_size_x) * 0.5, float(slot_size_y) * 0.5, 0]
    square_z = [0, 0, CALIBRATION_SQUARE_DEPTH]
    # add up the elements of each list and return an Offset of the result
    nominal_position = [
        float(sum(x)) for x in zip(bottom_left, relative_center, square_z)
    ]
    return Offset(*nominal_position)
