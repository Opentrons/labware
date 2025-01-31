"""Utilities for doing coverage math on wells."""

from typing import Iterator
from opentrons_shared_data.errors.exceptions import (
    InvalidStoredData,
    InvalidProtocolData,
)

from opentrons.hardware_control.nozzle_manager import NozzleMap


def wells_covered_by_pipette_configuration(
    nozzle_map: NozzleMap,
    target_well: str,
    labware_wells_by_column: list[list[str]],
) -> Iterator[str]:
    """Compute the wells covered by a pipette nozzle configuration."""
    if len(labware_wells_by_column) >= 12 and len(labware_wells_by_column[0]) >= 8:
        yield from wells_covered_dense(
            nozzle_map,
            target_well,
            labware_wells_by_column,
        )
    elif len(labware_wells_by_column) < 12 and len(labware_wells_by_column[0]) < 8:
        yield from wells_covered_sparse(
            nozzle_map, target_well, labware_wells_by_column
        )
    else:
        raise InvalidStoredData(
            "Labware of non-SBS and non-reservoir format cannot be handled"
        )


def row_col_ordinals_from_column_major_map(
    target_well: str, column_major_wells: list[list[str]]
) -> tuple[int, int]:
    """Turn a well name into the index of its row and column (in that order) within the labware."""
    for column_index, column in enumerate(column_major_wells):
        if target_well in column:
            return column.index(target_well), column_index
    raise InvalidStoredData(f"Well name {target_well} is not present in labware")


def wells_covered_dense(  # noqa: C901
    nozzle_map: NozzleMap, target_well: str, target_wells_by_column: list[list[str]]
) -> Iterator[str]:
    """Get the list of wells covered by a nozzle map on an SBS format labware with a specified multiplier of 96 into the number of wells.

    This will handle the offsetting of the nozzle map into higher-density well plates. For instance, a full column config target at A1 of a
    96 plate would cover wells A1, B1, C1, D1, E1, F1, G1, H1, and use downsample_factor 1.0 (96*1 = 96). A full column config target on a
    384 plate would cover wells A1, C1, E1, G1, I1, K1, M1, O1 and use downsample_factor 4.0 (96*4 = 384), while a full column config
    targeting B1 would cover wells B1, D1, F1, H1, J1, L1, N1, P1 - still using downsample_factor 4.0, with the offset gathered from the
    target well.

    The function may also handle sub-96 regular labware with fractional downsample factors, but that's physically improbable and it's not
    tested. If you have a regular labware with fewer than 96 wells that is still regularly-spaced and has little enough space between well
    walls that it's reasonable to use with multiple channels, you probably want wells_covered_trough.
    """
    target_row_index, target_column_index = row_col_ordinals_from_column_major_map(
        target_well, target_wells_by_column
    )
    column_downsample = len(target_wells_by_column) // 12
    row_downsample = len(target_wells_by_column[0]) // 8
    if column_downsample < 1 or row_downsample < 1:
        raise InvalidStoredData(
            "This labware cannot be used wells_covered_dense because it is less dense than an SBS 96 standard"
        )

    for nozzle_column in range(len(nozzle_map.columns)):
        target_column_offset = nozzle_column * column_downsample
        for nozzle_row in range(len(nozzle_map.rows)):
            target_row_offset = nozzle_row * row_downsample
            if nozzle_map.starting_nozzle == "A1":
                if (
                    target_column_index + target_column_offset
                    < len(target_wells_by_column)
                ) and (
                    target_row_index + target_row_offset
                    < len(target_wells_by_column[target_column_index])
                ):
                    yield target_wells_by_column[
                        target_column_index + target_column_offset
                    ][target_row_index + target_row_offset]
            elif nozzle_map.starting_nozzle == "A12":
                if (target_column_index - target_column_offset >= 0) and (
                    target_row_index + target_row_offset
                    < len(target_wells_by_column[target_column_index])
                ):
                    yield target_wells_by_column[
                        target_column_index - target_column_offset
                    ][target_row_index + target_row_offset]
            elif nozzle_map.starting_nozzle == "H1":
                if (
                    target_column_index + target_column_offset
                    < len(target_wells_by_column)
                ) and (target_row_index - target_row_offset >= 0):
                    yield target_wells_by_column[
                        target_column_index + target_column_offset
                    ][target_row_index - target_row_offset]
            elif nozzle_map.starting_nozzle == "H12":
                if (target_column_index - target_column_offset >= 0) and (
                    target_row_index - target_row_offset >= 0
                ):
                    yield target_wells_by_column[
                        target_column_index - target_column_offset
                    ][target_row_index - target_row_offset]
            else:
                raise InvalidProtocolData(
                    f"A pipette nozzle configuration may not having a starting nozzle of {nozzle_map.starting_nozzle}"
                )


def wells_covered_sparse(  # noqa: C901
    nozzle_map: NozzleMap, target_well: str, target_wells_by_column: list[list[str]]
) -> Iterator[str]:
    """Get the list of wells covered by a nozzle map on a column-oriented reservoir.

    This function handles reservoirs whose wells span multiple rows and columns - the most common case is something like a
    12-well reservoir, whose wells are the height of an SBS column and the width of an SBS row, or a 1-well reservoir whose well
    is the size of an SBS active area.
    """
    target_row_index, target_column_index = row_col_ordinals_from_column_major_map(
        target_well, target_wells_by_column
    )
    column_upsample = 12 // len(target_wells_by_column)
    row_upsample = 8 // len(target_wells_by_column[0])
    if column_upsample < 1 or row_upsample < 1:
        raise InvalidStoredData(
            "This labware cannot be used with wells_covered_sparse because it is more dense than an SBS 96 standard."
        )
    for nozzle_column in range(max(1, len(nozzle_map.columns) // column_upsample)):
        for nozzle_row in range(max(1, len(nozzle_map.rows) // row_upsample)):
            if nozzle_map.starting_nozzle == "A1":
                if (
                    target_column_index + nozzle_column < len(target_wells_by_column)
                ) and (
                    target_row_index + nozzle_row
                    < len(target_wells_by_column[target_column_index])
                ):
                    yield target_wells_by_column[target_column_index + nozzle_column][
                        target_row_index + nozzle_row
                    ]
            elif nozzle_map.starting_nozzle == "A12":
                if (target_column_index - nozzle_column >= 0) and (
                    target_row_index + nozzle_row
                    < len(target_wells_by_column[target_column_index])
                ):
                    yield target_wells_by_column[target_column_index - nozzle_column][
                        target_row_index + nozzle_row
                    ]
            elif nozzle_map.starting_nozzle == "H1":
                if (
                    target_column_index + nozzle_column
                    < len(target_wells_by_column[target_column_index])
                ) and (target_row_index - nozzle_row >= 0):
                    yield target_wells_by_column[target_column_index + nozzle_column][
                        target_row_index - nozzle_row
                    ]
            elif nozzle_map.starting_nozzle == "H12":
                if (target_column_index - nozzle_column >= 0) and (
                    target_row_index - nozzle_row >= 0
                ):
                    yield target_wells_by_column[target_column_index - nozzle_column][
                        target_row_index - nozzle_row
                    ]
            else:
                raise InvalidProtocolData(
                    f"A pipette nozzle configuration may not having a starting nozzle of {nozzle_map.starting_nozzle}"
                )


def nozzles_per_well(
    nozzle_map: NozzleMap, target_well: str, target_wells_by_column: list[list[str]]
) -> int:
    """Get the number of nozzles that will interact with each well in the labware.

    For instance, if this is an SBS 96 or more dense, there is always 1 nozzle per well
    that is interacted with (and some wells may not be interacted with at all). If this is
    a 12-column reservoir, then all active nozzles in each column of the configuration will
    interact with each well; so an 8-channel full config would have 8 nozzles per well,
    and a 96 channel with a rectangle config from A1 to D12 would have 4 nozzles per well.
    """
    _, target_column_index = row_col_ordinals_from_column_major_map(
        target_well, target_wells_by_column
    )
    # labware as or more dense than a 96 plate will only ever have 1 nozzle per well (and some wells won't be touched)
    if len(target_wells_by_column) >= len(nozzle_map.columns) and len(
        target_wells_by_column[target_column_index]
    ) >= len(nozzle_map.rows):
        return 1
    return max(1, len(nozzle_map.columns) // len(target_wells_by_column)) * max(
        1, len(nozzle_map.rows) // len(target_wells_by_column[target_column_index])
    )
