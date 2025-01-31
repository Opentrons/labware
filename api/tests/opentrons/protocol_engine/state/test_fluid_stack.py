"""Test pipette internal fluid tracking."""
import pytest

from opentrons.protocol_engine.state.fluid_stack import FluidStack
from opentrons.protocol_engine.types import AspiratedFluid, FluidKind


@pytest.mark.parametrize(
    "fluids,resulting_stack",
    [
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            [AspiratedFluid(FluidKind.LIQUID, 20)],
        ),
        (
            [AspiratedFluid(FluidKind.AIR, 10), AspiratedFluid(FluidKind.LIQUID, 20)],
            [AspiratedFluid(FluidKind.AIR, 10), AspiratedFluid(FluidKind.LIQUID, 20)],
        ),
        (
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 20),
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 20),
            ],
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 30),
                AspiratedFluid(FluidKind.AIR, 20),
            ],
        ),
    ],
)
def test_add_fluid(
    fluids: list[AspiratedFluid], resulting_stack: list[AspiratedFluid]
) -> None:
    """It should add fluids."""
    stack = FluidStack()
    for fluid in fluids:
        stack.add_fluid(fluid)
    assert stack._fluid_stack == resulting_stack


@pytest.mark.parametrize(
    "starting_fluids,remove_volume,resulting_stack",
    [
        ([], 1, []),
        ([], 0, []),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10)],
            0,
            [AspiratedFluid(FluidKind.LIQUID, 10)],
        ),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10)],
            5,
            [AspiratedFluid(FluidKind.LIQUID, 5)],
        ),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], 11, []),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10), AspiratedFluid(FluidKind.AIR, 10)],
            11,
            [AspiratedFluid(FluidKind.LIQUID, 9)],
        ),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10), AspiratedFluid(FluidKind.AIR, 10)],
            20,
            [],
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            28,
            [AspiratedFluid(FluidKind.LIQUID, 2)],
        ),
    ],
)
def test_remove_fluid(
    starting_fluids: list[AspiratedFluid],
    remove_volume: float,
    resulting_stack: list[AspiratedFluid],
) -> None:
    """It should remove fluids."""
    stack = FluidStack(_fluid_stack=[f for f in starting_fluids])
    stack.remove_fluid(remove_volume)
    assert stack._fluid_stack == resulting_stack


@pytest.mark.parametrize(
    "starting_fluids,filter,result",
    [
        ([], None, 0),
        ([], FluidKind.LIQUID, 0),
        ([], FluidKind.AIR, 0),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], None, 10),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], FluidKind.LIQUID, 10),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], FluidKind.AIR, 0),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10), AspiratedFluid(FluidKind.AIR, 10)],
            None,
            20,
        ),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10), AspiratedFluid(FluidKind.AIR, 10)],
            FluidKind.LIQUID,
            10,
        ),
        (
            [AspiratedFluid(FluidKind.LIQUID, 10), AspiratedFluid(FluidKind.AIR, 10)],
            FluidKind.AIR,
            10,
        ),
    ],
)
def test_aspirated_volume(
    starting_fluids: list[AspiratedFluid], filter: FluidKind | None, result: float
) -> None:
    """It should represent aspirated volume with filtering."""
    stack = FluidStack(_fluid_stack=starting_fluids)
    assert stack.aspirated_volume(kind=filter) == result


@pytest.mark.parametrize(
    "starting_fluids,dispense_volume,result",
    [
        ([], 0, 0),
        ([], 1, 0),
        ([AspiratedFluid(FluidKind.AIR, 10)], 10, 0),
        ([AspiratedFluid(FluidKind.AIR, 10)], 0, 0),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], 10, 10),
        ([AspiratedFluid(FluidKind.LIQUID, 10)], 0, 0),
        (
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            10,
            10,
        ),
        (
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            20,
            10,
        ),
        (
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            30,
            10,
        ),
        (
            [
                AspiratedFluid(FluidKind.AIR, 10),
                AspiratedFluid(FluidKind.LIQUID, 10),
            ],
            5,
            5,
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
            ],
            5,
            0,
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
            ],
            10,
            0,
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
            ],
            11,
            1,
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
            ],
            20,
            10,
        ),
        (
            [
                AspiratedFluid(FluidKind.LIQUID, 10),
                AspiratedFluid(FluidKind.AIR, 10),
            ],
            30,
            10,
        ),
    ],
)
def test_liquid_part_of_dispense_volume(
    starting_fluids: list[AspiratedFluid],
    dispense_volume: float,
    result: float,
) -> None:
    """It should predict resulting liquid from a dispense."""
    stack = FluidStack(_fluid_stack=starting_fluids)
    assert stack.liquid_part_of_dispense_volume(dispense_volume) == result
