"""Tests for well math."""

import json
import pathlib
from itertools import chain
from typing import Any, cast
from collections import OrderedDict

import pytest

from opentrons_shared_data.pipette.pipette_definition import ValidNozzleMaps

from opentrons.types import Point
from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons.protocol_engine.state._well_math import (
    wells_covered_dense,
    wells_covered_sparse,
    nozzles_per_well,
)

from .. import pipette_fixtures

_96_FULL_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={
            "Full": sum(
                [
                    pipette_fixtures.NINETY_SIX_ROWS["A"],
                    pipette_fixtures.NINETY_SIX_ROWS["B"],
                    pipette_fixtures.NINETY_SIX_ROWS["C"],
                    pipette_fixtures.NINETY_SIX_ROWS["D"],
                    pipette_fixtures.NINETY_SIX_ROWS["E"],
                    pipette_fixtures.NINETY_SIX_ROWS["F"],
                    pipette_fixtures.NINETY_SIX_ROWS["G"],
                    pipette_fixtures.NINETY_SIX_ROWS["H"],
                ],
                [],
            )
        }
    ),
)
_96_COL1_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H1",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={"Column1": pipette_fixtures.NINETY_SIX_COLS["1"]}
    ),
)

_96_COL12_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="A12",
    back_left_nozzle="A12",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={"Column12": pipette_fixtures.NINETY_SIX_COLS["12"]}
    ),
)

_96_SINGLE_FR_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="H12",
    back_left_nozzle="H12",
    front_right_nozzle="H12",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Single": ["H12"]}),
)
_96_SINGLE_BL_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="A1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Single": ["A1"]}),
)
_96_RECTANGLE_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.NINETY_SIX_MAP,
    physical_rows=pipette_fixtures.NINETY_SIX_ROWS,
    physical_columns=pipette_fixtures.NINETY_SIX_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="E2",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={
            "Subrect": [
                "A1",
                "A2",
                "B1",
                "B2",
                "C1",
                "C2",
                "D1",
                "D2",
                "E1",
                "E2",
            ]
        }
    ),
)
_8_FULL_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.EIGHT_CHANNEL_MAP,
    physical_rows=pipette_fixtures.EIGHT_CHANNEL_ROWS,
    physical_columns=pipette_fixtures.EIGHT_CHANNEL_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="H1",
    valid_nozzle_maps=ValidNozzleMaps(
        maps={"Full": pipette_fixtures.EIGHT_CHANNEL_COLS["1"]}
    ),
)
_8_SINGLE_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.EIGHT_CHANNEL_MAP,
    physical_rows=pipette_fixtures.EIGHT_CHANNEL_ROWS,
    physical_columns=pipette_fixtures.EIGHT_CHANNEL_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="A1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Full": ["A1"]}),
)
_8_HALF_MAP = NozzleMap.build(
    physical_nozzles=pipette_fixtures.EIGHT_CHANNEL_MAP,
    physical_rows=pipette_fixtures.EIGHT_CHANNEL_ROWS,
    physical_columns=pipette_fixtures.EIGHT_CHANNEL_COLS,
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="D1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Half": ["A1", "B1", "C1", "D1"]}),
)
_SINGLE_MAP = NozzleMap.build(
    physical_nozzles=OrderedDict((("A1", Point(0.0, 1.0, 2.0)),)),
    physical_rows=OrderedDict((("1", ["A1"]),)),
    physical_columns=OrderedDict((("A", ["A1"]),)),
    starting_nozzle="A1",
    back_left_nozzle="A1",
    front_right_nozzle="A1",
    valid_nozzle_maps=ValidNozzleMaps(maps={"Single": ["A1"]}),
)


def _fixture(fixture_name: str) -> Any:
    return json.load(
        open(
            pathlib.Path(__file__).parent
            / f"../../../../../shared-data/labware/fixtures/2/{fixture_name}.json"
        )
    )


@pytest.fixture
def _96_wells() -> list[list[str]]:
    return fixture_map("fixture_96_plate")


@pytest.fixture
def _384_wells() -> list[list[str]]:
    return fixture_map("fixture_384_plate")


@pytest.fixture
def _12_reservoir() -> list[list[str]]:
    return fixture_map("fixture_12_trough_v2")


@pytest.fixture
def _1_reservoir() -> list[list[str]]:
    return [["A1"]]


def all_wells(fixture_name: str) -> list[str]:
    """All wells in a labware as a flat list."""
    ordering = fixture_map(fixture_name)
    return list(chain(*ordering))


def fixture_map(fixture_name: str) -> list[list[str]]:
    """The ordering map."""
    return cast(list[list[str]], _fixture(fixture_name)["ordering"])


@pytest.mark.parametrize(
    "nozzle_map,target_well,result",
    [
        # these configurations have all the nozzles on/in the wellplate
        (_SINGLE_MAP, "A1", ["A1"]),
        (_SINGLE_MAP, "D7", ["D7"]),
        (_8_FULL_MAP, "A1", ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"]),
        (_8_FULL_MAP, "A10", ["A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10"]),
        (_96_FULL_MAP, "A1", all_wells("fixture_96_plate")),
        (
            _96_RECTANGLE_MAP,
            "C8",
            ["C8", "D8", "E8", "F8", "G8", "C9", "D9", "E9", "F9", "G9"],
        ),
        # these configurations have some nozzles below or to the right
        (_8_FULL_MAP, "D1", ["D1", "E1", "F1", "G1", "H1"]),
        (
            _96_FULL_MAP,
            "C8",
            [
                well
                for well in all_wells("fixture_96_plate")
                if ord(well[0]) >= ord("C") and int(well[1:]) >= 8
            ],
        ),
    ],
)
def test_wells_covered_dense_96(
    nozzle_map: NozzleMap,
    target_well: str,
    result: list[str],
    _96_wells: list[list[str]],
) -> None:
    """It should calculate well coverage for an SBS 96."""
    assert list(wells_covered_dense(nozzle_map, target_well, _96_wells)) == result


@pytest.mark.parametrize(
    "nozzle_map,target_well,result",
    [
        # these configurations have all the nozzles on/in the wellplate
        (_SINGLE_MAP, "A1", ["A1"]),
        (_SINGLE_MAP, "D7", ["D7"]),
        (_8_FULL_MAP, "A1", ["A1", "C1", "E1", "G1", "I1", "K1", "M1", "O1"]),
        (_8_FULL_MAP, "B1", ["B1", "D1", "F1", "H1", "J1", "L1", "N1", "P1"]),
        (_8_FULL_MAP, "A10", ["A10", "C10", "E10", "G10", "I10", "K10", "M10", "O10"]),
        # well offsets inside the four-well clusters that are the size of each 96-well well
        (
            _96_FULL_MAP,
            "A1",
            [
                well
                for well in all_wells("fixture_384_plate")
                if well[0] in "ACEGIKMO"
                and int(well[1:]) in [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]
            ],
        ),
        (
            _96_FULL_MAP,
            "A2",
            [
                well
                for well in all_wells("fixture_384_plate")
                if well[0] in "ACEGIKMO"
                and int(well[1:]) in [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
            ],
        ),
        (
            _96_FULL_MAP,
            "B1",
            [
                well
                for well in all_wells("fixture_384_plate")
                if well[0] in "BDFHJLNP"
                and int(well[1:]) in [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]
            ],
        ),
        (
            _96_FULL_MAP,
            "B2",
            [
                well
                for well in all_wells("fixture_384_plate")
                if well[0] in "BDFHJLNP"
                and int(well[1:]) in [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
            ],
        ),
        (
            _96_RECTANGLE_MAP,
            "C8",
            ["C8", "E8", "G8", "I8", "K8", "C10", "E10", "G10", "I10", "K10"],
        ),
        (
            _96_RECTANGLE_MAP,
            "C9",
            ["C9", "E9", "G9", "I9", "K9", "C11", "E11", "G11", "I11", "K11"],
        ),
        (
            _96_RECTANGLE_MAP,
            "D8",
            ["D8", "F8", "H8", "J8", "L8", "D10", "F10", "H10", "J10", "L10"],
        ),
        (
            _96_RECTANGLE_MAP,
            "D9",
            ["D9", "F9", "H9", "J9", "L9", "D11", "F11", "H11", "J11", "L11"],
        ),
    ],
)
def test_wells_covered_dense_384(
    nozzle_map: NozzleMap,
    target_well: str,
    result: list[str],
    _384_wells: list[list[str]],
) -> None:
    """It should calculate well coverage for an SBS 384."""
    assert list(wells_covered_dense(nozzle_map, target_well, _384_wells)) == result


@pytest.mark.parametrize(
    "nozzle_map,target_well,result",
    [
        (_SINGLE_MAP, "A1", ["A1"]),
        (_SINGLE_MAP, "A8", ["A8"]),
        (_8_FULL_MAP, "A1", ["A1"]),
        (_8_FULL_MAP, "A8", ["A8"]),
        (
            _96_FULL_MAP,
            "A1",
            all_wells("fixture_12_trough_v2"),
        ),
        (
            _96_FULL_MAP,
            "A8",
            [well for well in all_wells("fixture_12_trough_v2") if int(well[1:]) >= 8],
        ),
        (_96_RECTANGLE_MAP, "A1", ["A1", "A2"]),
        (_96_RECTANGLE_MAP, "A8", ["A8", "A9"]),
    ],
)
def test_wells_covered_sparse_12(
    nozzle_map: NozzleMap,
    target_well: str,
    result: list[str],
    _12_reservoir: list[list[str]],
) -> None:
    """It should calculate well coverage for a 12 column reservoir."""
    assert list(wells_covered_sparse(nozzle_map, target_well, _12_reservoir)) == result


@pytest.mark.parametrize(
    "nozzle_map",
    [
        _SINGLE_MAP,
        _8_FULL_MAP,
        _96_FULL_MAP,
        _96_RECTANGLE_MAP,
    ],
)
def test_wells_covered_sparse_1(
    nozzle_map: NozzleMap, _1_reservoir: list[list[str]]
) -> None:
    """It should calculate well coverage for a 1 column reservoir."""
    assert list(wells_covered_sparse(nozzle_map, "A1", _1_reservoir)) == ["A1"]


@pytest.mark.parametrize(
    "nozzle_map",
    [
        _SINGLE_MAP,
        _8_FULL_MAP,
        _96_FULL_MAP,
        _96_RECTANGLE_MAP,
        _8_SINGLE_MAP,
        _96_SINGLE_BL_MAP,
        _96_SINGLE_FR_MAP,
    ],
)
@pytest.mark.parametrize("fixture_name", ["fixture_384_plate", "fixture_96_plate"])
def test_nozzles_per_well_dense_force_1(
    nozzle_map: NozzleMap, fixture_name: str
) -> None:
    """It should calculate nozzles per well for SBS dense labware."""
    all_fixture_wells = all_wells(fixture_name)
    # it's a bit unreasonable to test every well of a 384 plate so walk the diagonal
    well_name = "A1"
    while True:
        if well_name not in all_fixture_wells:
            break
        assert nozzles_per_well(nozzle_map, well_name, fixture_map(fixture_name)) == 1
        well_name = f"{chr(ord(well_name[0])+1)}{str(int(well_name[1:])+1)}"


@pytest.mark.parametrize(
    "nozzle_map,target_well,result",
    [
        (_SINGLE_MAP, "A1", 1),
        (_SINGLE_MAP, "A12", 1),
        (_8_FULL_MAP, "A1", 8),
        (_96_FULL_MAP, "A1", 8),
        (_96_FULL_MAP, "A12", 8),
        (_96_RECTANGLE_MAP, "A4", 5),
    ],
)
def test_nozzles_per_well_12column(
    nozzle_map: NozzleMap, target_well: str, result: int
) -> None:
    """It should calculate nozzles per well for a 12 column."""
    assert (
        nozzles_per_well(nozzle_map, target_well, fixture_map("fixture_12_trough_v2"))
        == result
    )


@pytest.mark.parametrize(
    "nozzle_map,result",
    [
        (_SINGLE_MAP, 1),
        (_SINGLE_MAP, 1),
        (_8_FULL_MAP, 8),
        (_96_FULL_MAP, 96),
        (_96_FULL_MAP, 96),
        (_96_RECTANGLE_MAP, 10),
    ],
)
def test_nozzles_per_well_1column(nozzle_map: NozzleMap, result: int) -> None:
    """It should calculate nozzles per well for a 1-well reservoir."""
    assert nozzles_per_well(nozzle_map, "A1", [["A1"]]) == result
