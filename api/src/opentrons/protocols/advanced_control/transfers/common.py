"""Common functions between v1 transfer and liquid-class-based transfer."""
import enum
from typing import Iterable, Generator, Tuple, TypeVar, Literal


class TransferTipPolicyV2(enum.Enum):
    ONCE = "once"
    NEVER = "never"
    ALWAYS = "always"
    PER_SOURCE = "per source"


TransferTipPolicyV2Type = Literal["once", "always", "per source", "never"]

Target = TypeVar("Target")


def check_valid_volume_parameters(
    disposal_volume: float, air_gap: float, max_volume: float
) -> None:
    if air_gap >= max_volume:
        raise ValueError(
            "The air gap must be less than the maximum volume of the pipette"
        )
    elif disposal_volume >= max_volume:
        raise ValueError(
            "The disposal volume must be less than the maximum volume of the pipette"
        )
    elif disposal_volume + air_gap >= max_volume:
        raise ValueError(
            "The sum of the air gap and disposal volume must be less than"
            " the maximum volume of the pipette"
        )


def expand_for_volume_constraints(
    volumes: Iterable[float],
    targets: Iterable[Target],
    max_volume: float,
) -> Generator[Tuple[float, "Target"], None, None]:
    """Split a sequence of proposed transfers if necessary to keep each
    transfer under the given max volume.
    """
    # A final defense against an infinite loop.
    # Raising a proper exception with a helpful message is left to calling code,
    # because it has more context about what the user is trying to do.
    assert max_volume > 0
    for volume, target in zip(volumes, targets):
        while volume > max_volume * 2:
            yield max_volume, target
            volume -= max_volume

        if volume > max_volume:
            volume /= 2
            yield volume, target
        yield volume, target
