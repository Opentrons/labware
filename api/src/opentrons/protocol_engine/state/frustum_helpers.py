"""Helper functions for liquid-level related calculations inside a given frustum."""
from typing import List, Tuple
from numpy import pi, iscomplex, roots, real
from math import isclose

from ..errors.exceptions import InvalidLiquidHeightFound

from opentrons_shared_data.labware.labware_definition import (
    InnerWellGeometry,
    WellSegment,
    SphericalSegment,
    ConicalFrustum,
    CuboidalFrustum,
    SquaredConeSegment,
)


def _reject_unacceptable_heights(
    potential_heights: List[float], max_height: float
) -> float:
    """Reject any solutions to a polynomial equation that cannot be the height of a frustum."""
    valid_heights: List[float] = []
    for root in potential_heights:
        # reject any heights that are negative or greater than the max height
        if not iscomplex(root):
            # take only the real component of the root and round to 4 decimal places
            rounded_root = round(real(root), 4)
            if (rounded_root <= max_height) and (rounded_root >= 0):
                if not any([isclose(rounded_root, height) for height in valid_heights]):
                    valid_heights.append(rounded_root)
    if len(valid_heights) != 1:
        raise InvalidLiquidHeightFound(
            message="Unable to estimate valid liquid height from volume."
        )
    return valid_heights[0]


def _cross_section_area_circular(diameter: float) -> float:
    """Get the area of a circular cross-section."""
    radius = diameter / 2
    return pi * (radius**2)


def _cross_section_area_rectangular(x_dimension: float, y_dimension: float) -> float:
    """Get the area of a rectangular cross-section."""
    return x_dimension * y_dimension


def _rectangular_frustum_polynomial_roots(
    bottom_length: float,
    bottom_width: float,
    top_length: float,
    top_width: float,
    total_frustum_height: float,
) -> Tuple[float, float, float]:
    """Polynomial representation of the volume of a rectangular frustum."""
    # roots of the polynomial with shape ax^3 + bx^2 + cx
    a = (
        (top_length - bottom_length)
        * (top_width - bottom_width)
        / (3 * total_frustum_height**2)
    )
    b = (
        (bottom_length * (top_width - bottom_width))
        + (bottom_width * (top_length - bottom_length))
    ) / (2 * total_frustum_height)
    c = bottom_length * bottom_width
    return a, b, c


def _circular_frustum_polynomial_roots(
    bottom_radius: float,
    top_radius: float,
    total_frustum_height: float,
) -> Tuple[float, float, float]:
    """Polynomial representation of the volume of a circular frustum."""
    # roots of the polynomial with shape ax^3 + bx^2 + cx
    a = pi * ((top_radius - bottom_radius) ** 2) / (3 * total_frustum_height**2)
    b = pi * bottom_radius * (top_radius - bottom_radius) / total_frustum_height
    c = pi * bottom_radius**2
    return a, b, c


def _volume_from_height_circular(
    target_height: float, segment: ConicalFrustum
) -> float:
    """Find the volume given a height within a circular frustum."""
    heights = segment.height_to_volume_table.keys()
    best_fit_height = min(heights, key=lambda x: abs(x - target_height))
    return segment.height_to_volume_table[best_fit_height]


def _volume_from_height_rectangular(
    target_height: float,
    total_frustum_height: float,
    bottom_length: float,
    bottom_width: float,
    top_length: float,
    top_width: float,
) -> float:
    """Find the volume given a height within a rectangular frustum."""
    a, b, c = _rectangular_frustum_polynomial_roots(
        bottom_length=bottom_length,
        bottom_width=bottom_width,
        top_length=top_length,
        top_width=top_width,
        total_frustum_height=total_frustum_height,
    )
    volume = a * (target_height**3) + b * (target_height**2) + c * target_height
    return volume


def _volume_from_height_spherical(
    target_height: float,
    radius_of_curvature: float,
) -> float:
    """Find the volume given a height within a spherical frustum."""
    volume = (
        (1 / 3) * pi * (target_height**2) * (3 * radius_of_curvature - target_height)
    )
    return volume


def _volume_from_height_squared_cone(
    target_height: float, segment: SquaredConeSegment
) -> float:
    """Find the volume given a height within a squared cone segment."""
    heights = segment.height_to_volume_table.keys()
    best_fit_height = min(heights, key=lambda x: abs(x - target_height))
    return segment.height_to_volume_table[best_fit_height]


def _height_from_volume_circular(
    target_volume: float, segment: ConicalFrustum
) -> float:
    """Find the height given a volume within a squared cone segment."""
    volumes = segment.volume_to_height_table.keys()
    best_fit_volume = min(volumes, key=lambda x: abs(x - target_volume))
    return segment.volume_to_height_table[best_fit_volume]


def _height_from_volume_rectangular(
    volume: float,
    total_frustum_height: float,
    bottom_length: float,
    bottom_width: float,
    top_length: float,
    top_width: float,
) -> float:
    """Find the height given a volume within a rectangular frustum."""
    a, b, c = _rectangular_frustum_polynomial_roots(
        bottom_length=bottom_length,
        bottom_width=bottom_width,
        top_length=top_length,
        top_width=top_width,
        total_frustum_height=total_frustum_height,
    )
    d = volume * -1
    x_intercept_roots = (a, b, c, d)

    height_from_volume_roots = roots(x_intercept_roots)
    height = _reject_unacceptable_heights(
        potential_heights=list(height_from_volume_roots),
        max_height=total_frustum_height,
    )
    return height


def _height_from_volume_spherical(
    volume: float,
    radius_of_curvature: float,
    total_frustum_height: float,
) -> float:
    """Find the height given a volume within a spherical frustum."""
    a = -1 * pi / 3
    b = pi * radius_of_curvature
    c = 0.0
    d = volume * -1
    x_intercept_roots = (a, b, c, d)

    height_from_volume_roots = roots(x_intercept_roots)
    height = _reject_unacceptable_heights(
        potential_heights=list(height_from_volume_roots),
        max_height=total_frustum_height,
    )
    return height


def _height_from_volume_squared_cone(
    target_volume: float, segment: SquaredConeSegment
) -> float:
    """Find the height given a volume within a squared cone segment."""
    volumes = segment.volume_to_height_table.keys()
    best_fit_volume = min(volumes, key=lambda x: abs(x - target_volume))
    return segment.volume_to_height_table[best_fit_volume]


def _get_segment_capacity(segment: WellSegment) -> float:
    section_height = segment.topHeight - segment.bottomHeight
    match segment:
        case SphericalSegment():
            return (
                _volume_from_height_spherical(
                    target_height=segment.topHeight,
                    radius_of_curvature=segment.radiusOfCurvature,
                )
                * segment.count
            )
        case CuboidalFrustum():
            return (
                _volume_from_height_rectangular(
                    target_height=section_height,
                    bottom_length=segment.bottomYDimension,
                    bottom_width=segment.bottomXDimension,
                    top_length=segment.topYDimension,
                    top_width=segment.topXDimension,
                    total_frustum_height=section_height,
                )
                * segment.count
            )
        case ConicalFrustum():
            return (
                _volume_from_height_circular(
                    target_height=section_height,
                    segment=segment,
                )
                * segment.count
            )
        case SquaredConeSegment():
            return (
                _volume_from_height_squared_cone(section_height, segment)
                * segment.count
            )
        case _:
            # TODO: implement volume calculations for truncated circular and rounded rectangular segments
            raise NotImplementedError(
                f"volume calculation for shape: {segment.shape} not yet implemented."
            )


def get_well_volumetric_capacity(
    well_geometry: InnerWellGeometry,
) -> List[Tuple[float, float]]:
    """Return the total volumetric capacity of a well as a map of height borders to volume."""
    # dictionary map of heights to volumetric capacities within their respective segment
    # {top_height_0: volume_0, top_height_1: volume_1, top_height_2: volume_2}
    well_volume = []

    # get the well segments sorted in ascending order
    sorted_well = sorted(well_geometry.sections, key=lambda section: section.topHeight)

    for segment in sorted_well:
        section_volume = _get_segment_capacity(segment)
        well_volume.append((segment.topHeight, section_volume))
    return well_volume


def height_at_volume_within_section(
    section: WellSegment,
    target_volume_relative: float,
    section_height: float,
) -> float:
    """Calculate a height within a bounded section according to geometry."""
    target_volume_relative = target_volume_relative / section.count
    match section:
        case SphericalSegment():
            return _height_from_volume_spherical(
                volume=target_volume_relative,
                total_frustum_height=section_height,
                radius_of_curvature=section.radiusOfCurvature,
            )
        case ConicalFrustum():
            return _height_from_volume_circular(target_volume_relative, section)
        case CuboidalFrustum():
            return _height_from_volume_rectangular(
                volume=target_volume_relative,
                total_frustum_height=section_height,
                bottom_width=section.bottomXDimension,
                bottom_length=section.bottomYDimension,
                top_width=section.topXDimension,
                top_length=section.topYDimension,
            )
        case SquaredConeSegment():
            return _height_from_volume_squared_cone(target_volume_relative, section)
        case _:
            raise NotImplementedError(
                "Height from volume calculation not yet implemented for this well shape."
            )


def volume_at_height_within_section(
    section: WellSegment,
    target_height_relative: float,
    section_height: float,
) -> float:
    """Calculate a volume within a bounded section according to geometry."""
    match section:
        case SphericalSegment():
            return (
                _volume_from_height_spherical(
                    target_height=target_height_relative,
                    radius_of_curvature=section.radiusOfCurvature,
                )
                * section.count
            )
        case ConicalFrustum():
            return (
                _volume_from_height_circular(
                    target_height=target_height_relative, segment=section
                )
                * section.count
            )
        case CuboidalFrustum():
            return (
                _volume_from_height_rectangular(
                    target_height=target_height_relative,
                    total_frustum_height=section_height,
                    bottom_width=section.bottomXDimension,
                    bottom_length=section.bottomYDimension,
                    top_width=section.topXDimension,
                    top_length=section.topYDimension,
                )
                * section.count
            )
        case SquaredConeSegment():
            return (
                _volume_from_height_squared_cone(target_height_relative, section)
                * section.count
            )
        case _:
            # TODO(cm): this would be the NEST-96 2uL wells referenced in EXEC-712
            # we need to input the math attached to that issue
            raise NotImplementedError(
                "Height from volume calculation not yet implemented for this well shape."
            )


def _find_volume_in_partial_frustum(
    sorted_well: List[WellSegment],
    target_height: float,
) -> float:
    """Look through a sorted list of frusta for a target height, and find the volume at that height."""
    for segment in sorted_well:
        if segment.bottomHeight < target_height < segment.topHeight:
            relative_target_height = target_height - segment.bottomHeight
            section_height = segment.topHeight - segment.bottomHeight
            return volume_at_height_within_section(
                section=segment,
                target_height_relative=relative_target_height,
                section_height=section_height,
            )
    # if we've looked through all sections and can't find the target volume, raise an error
    raise InvalidLiquidHeightFound(
        f"Unable to find volume at given well-height {target_height}."
    )


def find_volume_at_well_height(
    target_height: float, well_geometry: InnerWellGeometry
) -> float:
    """Find the volume within a well, at a known height."""
    volumetric_capacity = get_well_volumetric_capacity(well_geometry)
    max_height = volumetric_capacity[-1][0]
    if target_height < 0 or target_height > max_height:
        raise InvalidLiquidHeightFound("Invalid target height.")
    # volumes in volumetric_capacity are relative to each frustum,
    # so we have to find the volume of all the full sections enclosed
    # beneath the target height
    closed_section_volume = 0.0
    for boundary_height, section_volume in volumetric_capacity:
        if boundary_height > target_height:
            break
        closed_section_volume += section_volume
        # if target height is a boundary cross-section, we already know the volume
        if target_height == boundary_height:
            return closed_section_volume
    # find the section the target height is in and compute the volume

    sorted_well = sorted(well_geometry.sections, key=lambda section: section.topHeight)
    partial_volume = _find_volume_in_partial_frustum(
        sorted_well=sorted_well,
        target_height=target_height,
    )
    return partial_volume + closed_section_volume


def _find_height_in_partial_frustum(
    sorted_well: List[WellSegment],
    volumetric_capacity: List[Tuple[float, float]],
    target_volume: float,
) -> float:
    """Look through a sorted list of frusta for a target volume, and find the height at that volume."""
    bottom_section_volume = 0.0
    for section, capacity in zip(sorted_well, volumetric_capacity):
        section_top_height, section_volume = capacity
        if (
            bottom_section_volume
            < target_volume
            <= (bottom_section_volume + section_volume)
        ):
            relative_target_volume = target_volume - bottom_section_volume
            section_height = section.topHeight - section.bottomHeight
            partial_height = height_at_volume_within_section(
                section=section,
                target_volume_relative=relative_target_volume,
                section_height=section_height,
            )
            return partial_height + section.bottomHeight
        # bottom section volume should always be the volume enclosed in the previously
        # viewed section
        bottom_section_volume += section_volume

    # if we've looked through all sections and can't find the target volume, raise an error
    raise InvalidLiquidHeightFound(
        f"Unable to find height at given volume {target_volume}."
    )


def find_height_at_well_volume(
    target_volume: float, well_geometry: InnerWellGeometry
) -> float:
    """Find the height within a well, at a known volume."""
    volumetric_capacity = get_well_volumetric_capacity(well_geometry)
    max_volume = sum(row[1] for row in volumetric_capacity)
    if target_volume < 0 or target_volume > max_volume:
        raise InvalidLiquidHeightFound("Invalid target volume.")

    sorted_well = sorted(well_geometry.sections, key=lambda section: section.topHeight)
    # find the section the target volume is in and compute the height
    return _find_height_in_partial_frustum(
        sorted_well=sorted_well,
        volumetric_capacity=volumetric_capacity,
        target_volume=target_volume,
    )
