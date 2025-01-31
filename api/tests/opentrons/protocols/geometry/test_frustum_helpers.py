import pytest
from math import pi, isclose
from typing import Any, List

from opentrons_shared_data.labware.labware_definition import (
    ConicalFrustum,
    CuboidalFrustum,
    SphericalSegment,
)
from opentrons.protocol_engine.state.frustum_helpers import (
    _cross_section_area_rectangular,
    _cross_section_area_circular,
    _reject_unacceptable_heights,
    _rectangular_frustum_polynomial_roots,
    _volume_from_height_rectangular,
    _volume_from_height_circular,
    _volume_from_height_spherical,
    _height_from_volume_circular,
    _height_from_volume_rectangular,
    _height_from_volume_spherical,
    height_at_volume_within_section,
    _get_segment_capacity,
)
from opentrons.protocol_engine.errors.exceptions import InvalidLiquidHeightFound


def fake_frusta() -> List[List[Any]]:
    """A bunch of weird fake well shapes."""
    frusta = []
    frusta.append(
        [
            CuboidalFrustum(
                shape="cuboidal",
                topXDimension=9.0,
                topYDimension=10.0,
                bottomXDimension=8.0,
                bottomYDimension=9.0,
                topHeight=10.0,
                bottomHeight=5.0,
            ),
            CuboidalFrustum(
                shape="cuboidal",
                topXDimension=8.0,
                topYDimension=9.0,
                bottomXDimension=15.0,
                bottomYDimension=18.0,
                topHeight=5.0,
                bottomHeight=1.0,
            ),
            ConicalFrustum(
                shape="conical",
                topDiameter=23.0,
                bottomDiameter=3.0,
                topHeight=2.0,
                bottomHeight=1.0,
            ),
            SphericalSegment(
                shape="spherical",
                radiusOfCurvature=4.0,
                topHeight=1.0,
                bottomHeight=0.0,
            ),
        ]
    )
    frusta.append(
        [
            CuboidalFrustum(
                shape="cuboidal",
                topXDimension=8.0,
                topYDimension=70.0,
                bottomXDimension=7.0,
                bottomYDimension=75.0,
                topHeight=3.5,
                bottomHeight=2.0,
            ),
            CuboidalFrustum(
                shape="cuboidal",
                topXDimension=8.0,
                topYDimension=80.0,
                bottomXDimension=8.0,
                bottomYDimension=90.0,
                topHeight=1.0,
                bottomHeight=0.0,
            ),
        ]
    )
    frusta.append(
        [
            ConicalFrustum(
                shape="conical",
                topDiameter=23.0,
                bottomDiameter=11.5,
                topHeight=7.5,
                bottomHeight=5.0,
            ),
            ConicalFrustum(
                shape="conical",
                topDiameter=11.5,
                bottomDiameter=23.0,
                topHeight=5.0,
                bottomHeight=2.5,
            ),
            ConicalFrustum(
                shape="conical",
                topDiameter=23.0,
                bottomDiameter=11.5,
                topHeight=2.5,
                bottomHeight=0.0,
            ),
        ]
    )
    frusta.append(
        [
            ConicalFrustum(
                shape="conical",
                topDiameter=4.0,
                bottomDiameter=5.0,
                topHeight=3.0,
                bottomHeight=2.0,
            ),
            SphericalSegment(
                shape="spherical",
                radiusOfCurvature=3.5,
                topHeight=2.0,
                bottomHeight=0.0,
            ),
        ]
    )
    frusta.append(
        [
            SphericalSegment(
                shape="spherical",
                radiusOfCurvature=4.0,
                topHeight=3.0,
                bottomHeight=0.0,
            )
        ]
    )
    frusta.append(
        [
            CuboidalFrustum(
                shape="cuboidal",
                topXDimension=27.0,
                topYDimension=36.0,
                bottomXDimension=36.0,
                bottomYDimension=26.0,
                topHeight=3.5,
                bottomHeight=1.5,
            ),
            SphericalSegment(
                shape="spherical",
                radiusOfCurvature=4.0,
                topHeight=1.5,
                bottomHeight=0.0,
            ),
        ]
    )
    return frusta


@pytest.mark.parametrize(
    ["max_height", "potential_heights", "expected_heights"],
    [
        (34, [complex(4, 5), complex(5, 0), 35, 34, 33, 10, 0], [5, 34, 33, 10, 0]),
        (2934, [complex(4, 5), complex(5, 0)], [5]),
        (100, [-99, -1, complex(99.99, 0), 101], [99.99]),
        (2, [0, -1, complex(-1.5, 0)], [0]),
        (8, [complex(7, 1), -0.01], []),
    ],
)
def test_reject_unacceptable_heights(
    max_height: float, potential_heights: List[Any], expected_heights: List[float]
) -> None:
    """Make sure we reject all mathematical solutions that are physically not possible."""
    if len(expected_heights) != 1:
        with pytest.raises(InvalidLiquidHeightFound):
            _reject_unacceptable_heights(
                max_height=max_height, potential_heights=potential_heights
            )
    else:
        found_heights = _reject_unacceptable_heights(
            max_height=max_height, potential_heights=potential_heights
        )
        assert found_heights == expected_heights[0]


@pytest.mark.parametrize("diameter", [2, 5, 8, 356, 1000])
def test_cross_section_area_circular(diameter: float) -> None:
    """Test circular area calculation."""
    expected_area = pi * (diameter / 2) ** 2
    assert _cross_section_area_circular(diameter) == expected_area


@pytest.mark.parametrize(
    ["x_dimension", "y_dimension"], [(1, 38402), (234, 983), (94857, 40), (234, 999)]
)
def test_cross_section_area_rectangular(x_dimension: float, y_dimension: float) -> None:
    """Test rectangular area calculation."""
    expected_area = x_dimension * y_dimension
    assert (
        _cross_section_area_rectangular(
            x_dimension=x_dimension, y_dimension=y_dimension
        )
        == expected_area
    )


@pytest.mark.parametrize("well", fake_frusta())
def test_volume_and_height_circular(well: List[Any]) -> None:
    """Test both volume and height calculations for circular frusta."""
    if well[-1].shape == "spherical":
        return
    for segment in well:
        if segment.shape == "conical":
            a = segment.topDiameter / 2
            b = segment.bottomDiameter / 2
            # test volume within a bunch of arbitrary heights
            segment_height = segment.topHeight - segment.bottomHeight
            for target_height in range(round(segment_height)):
                r_y = (target_height / segment_height) * (a - b) + b
                expected_volume = (pi * target_height / 3) * (
                    b**2 + b * r_y + r_y**2
                )
                found_volume = _volume_from_height_circular(
                    target_height=target_height,
                    segment=segment,
                )
                assert isclose(found_volume, expected_volume)
                # test going backwards to get height back
                found_height = _height_from_volume_circular(
                    target_volume=found_volume, segment=segment
                )
                assert isclose(found_height, target_height)


@pytest.mark.parametrize("well", fake_frusta())
def test_volume_and_height_rectangular(well: List[Any]) -> None:
    """Test both volume and height calculations for rectangular frusta."""
    if well[-1].shape == "spherical":
        return
    total_height = well[0].topHeight
    for segment in well:
        if segment.shape == "cuboidal":
            top_length = segment.topYDimension
            top_width = segment.topXDimension
            bottom_length = segment.bottomYDimension
            bottom_width = segment.bottomXDimension
            a = (
                (top_length - bottom_length)
                * (top_width - bottom_width)
                / (3 * total_height**2)
            )
            b = (
                (bottom_length * (top_width - bottom_width))
                + (bottom_width * (top_length - bottom_length))
            ) / (2 * total_height)
            c = bottom_length * bottom_width
            assert _rectangular_frustum_polynomial_roots(
                top_length=top_length,
                bottom_length=bottom_length,
                top_width=top_width,
                bottom_width=bottom_width,
                total_frustum_height=total_height,
            ) == (a, b, c)
            # test volume within a bunch of arbitrary heights
            for target_height in range(round(total_height)):
                expected_volume = (
                    a * (target_height**3)
                    + b * (target_height**2)
                    + c * target_height
                )
                found_volume = _volume_from_height_rectangular(
                    target_height=target_height,
                    total_frustum_height=total_height,
                    bottom_length=bottom_length,
                    bottom_width=bottom_width,
                    top_length=top_length,
                    top_width=top_width,
                )
                assert found_volume == expected_volume
                # test going backwards to get height back
                found_height = _height_from_volume_rectangular(
                    volume=found_volume,
                    total_frustum_height=total_height,
                    bottom_length=bottom_length,
                    bottom_width=bottom_width,
                    top_length=top_length,
                    top_width=top_width,
                )
                assert isclose(found_height, target_height)


@pytest.mark.parametrize("well", fake_frusta())
def test_volume_and_height_spherical(well: List[Any]) -> None:
    """Test both volume and height calculations for spherical segments."""
    if well[0].shape == "spherical":
        for target_height in range(round(well[0].topHeight)):
            expected_volume = (
                (1 / 3)
                * pi
                * (target_height**2)
                * (3 * well[0].radiusOfCurvature - target_height)
            )
            found_volume = _volume_from_height_spherical(
                target_height=target_height,
                radius_of_curvature=well[0].radiusOfCurvature,
            )
            assert found_volume == expected_volume
            found_height = _height_from_volume_spherical(
                volume=found_volume,
                radius_of_curvature=well[0].radiusOfCurvature,
                total_frustum_height=well[0].topHeight,
            )
            assert isclose(found_height, target_height)


@pytest.mark.parametrize("well", fake_frusta())
def test_height_at_volume_within_section(well: List[Any]) -> None:
    """Test that finding the height when volume ~= capacity  works."""
    for segment in well:
        segment_height = segment.topHeight - segment.bottomHeight
        height = height_at_volume_within_section(
            segment, _get_segment_capacity(segment), segment_height
        )
        assert isclose(height, segment_height)
