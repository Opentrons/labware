"""Test the common utility functions used in transfers."""
import pytest
from contextlib import nullcontext as does_not_raise
from typing import ContextManager, Any, Iterable, List, Tuple

from opentrons.protocols.advanced_control.transfers.common import (
    Target,
    check_valid_volume_parameters,
    expand_for_volume_constraints,
)


@pytest.mark.parametrize(
    argnames=["disposal_volume", "air_gap", "max_volume", "expected_raise"],
    argvalues=[
        (9.9, 9.9, 10, pytest.raises(ValueError, match="The sum of")),
        (9.9, 10, 10, pytest.raises(ValueError, match="The air gap must be less than")),
        (
            10,
            9.9,
            10,
            pytest.raises(ValueError, match="The disposal volume must be less than"),
        ),
        (9.9, 9.9, 20, does_not_raise()),
    ],
)
def test_check_valid_volume_parameters(
    disposal_volume: float,
    air_gap: float,
    max_volume: float,
    expected_raise: ContextManager[Any],
) -> None:
    """It should raise the expected error for invalid parameters."""
    with expected_raise:
        check_valid_volume_parameters(
            disposal_volume=disposal_volume,
            air_gap=air_gap,
            max_volume=max_volume,
        )


@pytest.mark.parametrize(
    argnames=["volumes", "targets", "max_volume", "expanded_list_result"],
    argvalues=[
        (
            [60, 70, 75],
            [("a", "b"), ("c", "d"), ("e", "f")],
            20,
            [
                (20, ("a", "b")),
                (20, ("a", "b")),
                (20, ("a", "b")),
                (20, ("c", "d")),
                (20, ("c", "d")),
                (15, ("c", "d")),
                (15, ("c", "d")),
                (20, ("e", "f")),
                (20, ("e", "f")),
                (17.5, ("e", "f")),
                (17.5, ("e", "f")),
            ],
        ),
    ],
)
def test_expand_for_volume_constraints(
    volumes: Iterable[float],
    targets: Iterable[Target],
    max_volume: float,
    expanded_list_result: List[Tuple[float, Target]],
) -> None:
    """It should raise the expected error for invalid parameters."""
    result = expand_for_volume_constraints(
        volumes=volumes,
        targets=targets,
        max_volume=max_volume,
    )
    assert list(result) == expanded_list_result
