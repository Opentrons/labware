import pytest
from typing import Dict, List, Tuple, Union, Iterator, cast

from opentrons.hardware_control import nozzle_manager

from opentrons.types import Point, NozzleConfigurationType

from opentrons_shared_data.pipette.load_data import load_definition
from opentrons_shared_data.pipette.types import (
    PipetteModelType,
    PipetteChannelType,
    PipetteVersionType,
    PipetteOEMType,
)
from opentrons_shared_data.pipette.pipette_definition import (
    PipetteConfigurations,
    ValidNozzleMaps,
)
from tests.opentrons.protocol_engine.pipette_fixtures import (
    NINETY_SIX_ROWS,
    NINETY_SIX_COLS,
    EIGHT_CHANNEL_COLS,
)

# Ninety six channel valid nozzle maps
NINETY_SIX_FULL: Dict[str, List[str]] = {
    "Full": sum(
        [
            NINETY_SIX_ROWS["A"],
            NINETY_SIX_ROWS["B"],
            NINETY_SIX_ROWS["C"],
            NINETY_SIX_ROWS["D"],
            NINETY_SIX_ROWS["E"],
            NINETY_SIX_ROWS["F"],
            NINETY_SIX_ROWS["G"],
            NINETY_SIX_ROWS["H"],
        ],
        [],
    )
}
NINETY_SIX_COL_1: Dict[str, List[str]] = {"Column1": NINETY_SIX_COLS["1"]}
NINETY_SIX_COL_12: Dict[str, List[str]] = {"Column12": NINETY_SIX_COLS["12"]}
NINETY_SIX_ROW_A: Dict[str, List[str]] = {"RowA": NINETY_SIX_ROWS["A"]}
NINETY_SIX_ROW_H: Dict[str, List[str]] = {"RowH": NINETY_SIX_ROWS["H"]}

A1_D6: Dict[str, List[str]] = {
    "A1_D6": [
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "C1",
        "C2",
        "C3",
        "C4",
        "C5",
        "C6",
        "D1",
        "D2",
        "D3",
        "D4",
        "D5",
        "D6",
    ]
}
E7_H12: Dict[str, List[str]] = {
    "E7_H12": [
        "E7",
        "E8",
        "E9",
        "E10",
        "E11",
        "E12",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
        "G7",
        "G8",
        "G9",
        "G10",
        "G11",
        "G12",
        "H7",
        "H8",
        "H9",
        "H10",
        "H11",
        "H12",
    ]
}
E1_H6: Dict[str, List[str]] = {
    "E1_H6": [
        "E1",
        "E2",
        "E3",
        "E4",
        "E5",
        "E6",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "G1",
        "G2",
        "G3",
        "G4",
        "G5",
        "G6",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
    ]
}
A1_B12: Dict[str, List[str]] = {
    "A1_B12": [
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "A9",
        "A10",
        "A11",
        "A12",
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "B7",
        "B8",
        "B9",
        "B10",
        "B11",
        "B12",
    ]
}
G1_H12: Dict[str, List[str]] = {
    "G1_H12": [
        "G1",
        "G2",
        "G3",
        "G4",
        "G5",
        "G6",
        "G7",
        "G8",
        "G9",
        "G10",
        "G11",
        "G12",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "H7",
        "H8",
        "H9",
        "H10",
        "H11",
        "H12",
    ]
}
A1_H3: Dict[str, List[str]] = {
    "A1_H3": [
        "A1",
        "A2",
        "A3",
        "B1",
        "B2",
        "B3",
        "C1",
        "C2",
        "C3",
        "D1",
        "D2",
        "D3",
        "E1",
        "E2",
        "E3",
        "F1",
        "F2",
        "F3",
        "G1",
        "G2",
        "G3",
        "H1",
        "H2",
        "H3",
    ]
}
A10_H12: Dict[str, List[str]] = {
    "A10_H12": [
        "A10",
        "A11",
        "A12",
        "B10",
        "B11",
        "B12",
        "C10",
        "C11",
        "C12",
        "D10",
        "D11",
        "D12",
        "E10",
        "E11",
        "E12",
        "F10",
        "F11",
        "F12",
        "G10",
        "G11",
        "G12",
        "H10",
        "H11",
        "H12",
    ]
}

# Eight channel valid nozzle maps
EIGHT_CHANNEL_FULL: Dict[str, List[str]] = {"Full": EIGHT_CHANNEL_COLS["1"]}
A1_D1: Dict[str, List[str]] = {"A1_D1": ["A1", "B1", "C1", "D1"]}
E1_H1: Dict[str, List[str]] = {"E1_H1": ["E1", "F1", "G1", "H1"]}
A1: Dict[str, List[str]] = {"A1": ["A1"]}
H1: Dict[str, List[str]] = {"H1": ["H1"]}


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_single_pipettes_always_full(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.SINGLE_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config, ValidNozzleMaps(maps=A1)
    )
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL

    subject.update_nozzle_configuration("A1", "A1", "A1")
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL

    subject.reset_to_default_configuration()
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_single_pipette_map_entries(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.SINGLE_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config, ValidNozzleMaps(maps=A1)
    )

    def test_map_entries(nozzlemap: nozzle_manager.NozzleMap) -> None:
        assert nozzlemap.back_left == "A1"
        assert nozzlemap.front_right == "A1"
        assert list(nozzlemap.map_store.keys()) == ["A1"]
        assert list(nozzlemap.rows.keys()) == ["A"]
        assert list(nozzlemap.columns.keys()) == ["1"]
        assert nozzlemap.rows["A"] == ["A1"]
        assert nozzlemap.columns["1"] == ["A1"]
        assert nozzlemap.tip_count == 1

    test_map_entries(subject.current_configuration)
    subject.update_nozzle_configuration("A1", "A1", "A1")
    test_map_entries(subject.current_configuration)
    subject.reset_to_default_configuration()
    test_map_entries(subject.current_configuration)


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_single_pipette_map_geometry(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.SINGLE_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config, ValidNozzleMaps(maps=A1)
    )

    def test_map_geometry(nozzlemap: nozzle_manager.NozzleMap) -> None:
        assert nozzlemap.xy_center_offset == Point(*config.nozzle_map["A1"])
        assert nozzlemap.y_center_offset == Point(*config.nozzle_map["A1"])
        assert nozzlemap.front_nozzle_offset == Point(*config.nozzle_map["A1"])
        assert nozzlemap.starting_nozzle_offset == Point(*config.nozzle_map["A1"])

    test_map_geometry(subject.current_configuration)
    subject.update_nozzle_configuration("A1", "A1", "A1")
    test_map_geometry(subject.current_configuration)
    subject.reset_to_default_configuration()
    test_map_geometry(subject.current_configuration)


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_multi_config_identification(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.EIGHT_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(maps=EIGHT_CHANNEL_FULL | A1_D1 | A1 | H1),
    )

    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL

    subject.update_nozzle_configuration("A1", "H1", "A1")
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL

    subject.reset_to_default_configuration()
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL

    subject.update_nozzle_configuration("A1", "D1", "A1")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.COLUMN
    )

    subject.update_nozzle_configuration("A1", "A1", "A1")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SINGLE
    )

    subject.update_nozzle_configuration("H1", "H1", "H1")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SINGLE
    )

    subject.reset_to_default_configuration()
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_multi_config_map_entries(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.EIGHT_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(maps=EIGHT_CHANNEL_FULL | A1_D1 | A1 | H1),
    )

    def test_map_entries(
        nozzlemap: nozzle_manager.NozzleMap, nozzles: List[str]
    ) -> None:
        assert nozzlemap.back_left == nozzles[0]
        assert nozzlemap.front_right == nozzles[-1]
        assert list(nozzlemap.map_store.keys()) == nozzles
        assert list(nozzlemap.rows.keys()) == [nozzle[0] for nozzle in nozzles]
        assert list(nozzlemap.columns.keys()) == ["1"]
        for rowname, row_elements in nozzlemap.rows.items():
            assert row_elements == [f"{rowname}1"]

        assert nozzlemap.columns["1"] == nozzles
        assert nozzlemap.tip_count == len(nozzles)

    test_map_entries(
        subject.current_configuration, ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"]
    )
    subject.update_nozzle_configuration("A1", "H1", "A1")
    test_map_entries(
        subject.current_configuration, ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"]
    )
    subject.update_nozzle_configuration("A1", "D1", "A1")
    test_map_entries(subject.current_configuration, ["A1", "B1", "C1", "D1"])
    subject.update_nozzle_configuration("A1", "A1", "A1")
    test_map_entries(subject.current_configuration, ["A1"])
    subject.update_nozzle_configuration("H1", "H1", "H1")
    test_map_entries(subject.current_configuration, ["H1"])


def assert_offset_in_center_of(
    offset: Point, between: Union[Tuple[str, str], str], config: PipetteConfigurations
) -> None:
    if isinstance(between, str):
        assert offset == Point(*config.nozzle_map[between])
    else:
        assert (
            offset
            == (
                Point(*config.nozzle_map[between[0]])
                + Point(*config.nozzle_map[between[1]])
            )
            * 0.5
        )


@pytest.mark.parametrize(
    "pipette_details",
    [
        (PipetteModelType.p10, PipetteVersionType(major=1, minor=3)),
        (PipetteModelType.p20, PipetteVersionType(major=2, minor=0)),
        (PipetteModelType.p50, PipetteVersionType(major=3, minor=4)),
        (PipetteModelType.p300, PipetteVersionType(major=2, minor=1)),
        (PipetteModelType.p1000, PipetteVersionType(major=3, minor=5)),
    ],
)
def test_multi_config_geometry(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.EIGHT_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(maps=EIGHT_CHANNEL_FULL | A1_D1 | E1_H1 | A1 | H1),
    )

    def test_map_geometry(
        nozzlemap: nozzle_manager.NozzleMap,
        front_nozzle: str,
        starting_nozzle: str,
        xy_center_in_center_of: Union[Tuple[str, str], str],
        y_center_in_center_of: Union[Tuple[str, str], str],
    ) -> None:
        assert_offset_in_center_of(
            nozzlemap.xy_center_offset, xy_center_in_center_of, config
        )
        assert_offset_in_center_of(
            nozzlemap.y_center_offset, y_center_in_center_of, config
        )

        assert nozzlemap.front_nozzle_offset == Point(*config.nozzle_map[front_nozzle])
        assert nozzlemap.starting_nozzle_offset == Point(
            *config.nozzle_map[starting_nozzle]
        )

    test_map_geometry(
        subject.current_configuration, "H1", "A1", ("A1", "H1"), ("A1", "H1")
    )

    subject.update_nozzle_configuration("A1", "A1", "A1")
    test_map_geometry(subject.current_configuration, "A1", "A1", "A1", "A1")

    subject.update_nozzle_configuration("E1", "H1", "E1")
    test_map_geometry(
        subject.current_configuration, "H1", "E1", ("E1", "H1"), ("E1", "H1")
    )

    subject.reset_to_default_configuration()
    test_map_geometry(
        subject.current_configuration, "H1", "A1", ("A1", "H1"), ("A1", "H1")
    )


@pytest.mark.parametrize(
    "pipette_details", [(PipetteModelType.p1000, PipetteVersionType(major=3, minor=5))]
)
def test_96_config_identification(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.NINETY_SIX_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(
            maps=NINETY_SIX_FULL
            | NINETY_SIX_COL_1
            | NINETY_SIX_COL_12
            | NINETY_SIX_ROW_A
            | NINETY_SIX_ROW_H
            | A1_D6
            | E7_H12
            | E1_H6
            | A1_B12
            | G1_H12
            | A1_H3
            | A10_H12
        ),
    )

    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL
    subject.update_nozzle_configuration("A1", "H12")
    assert subject.current_configuration.configuration == NozzleConfigurationType.FULL
    subject.update_nozzle_configuration("A1", "H1")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.COLUMN
    )
    subject.update_nozzle_configuration("A12", "H12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.COLUMN
    )

    subject.update_nozzle_configuration("A1", "A12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.ROW
    )
    subject.update_nozzle_configuration("H1", "H12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.ROW
    )

    subject.update_nozzle_configuration("E1", "H6")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )
    subject.update_nozzle_configuration("E7", "H12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )

    subject.update_nozzle_configuration("A1", "B12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )
    subject.update_nozzle_configuration("G1", "H12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )
    subject.update_nozzle_configuration("A1", "H3")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )
    subject.update_nozzle_configuration("A10", "H12")
    assert (
        cast(
            NozzleConfigurationType,
            subject.current_configuration.configuration,
        )
        == NozzleConfigurationType.SUBRECT
    )


@pytest.mark.parametrize(
    "pipette_details", [(PipetteModelType.p1000, PipetteVersionType(major=3, minor=5))]
)
def test_96_config_map_entries(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.NINETY_SIX_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(
            maps=NINETY_SIX_FULL
            | NINETY_SIX_COL_1
            | NINETY_SIX_COL_12
            | NINETY_SIX_ROW_A
            | NINETY_SIX_ROW_H
            | A1_D6
            | E7_H12
            | E1_H6
            | A1_B12
            | G1_H12
            | A1_H3
            | A10_H12
        ),
    )

    def test_map_entries(
        nozzlemap: nozzle_manager.NozzleMap,
        rows: Dict[str, List[str]],
        cols: Dict[str, List[str]],
    ) -> None:
        assert nozzlemap.back_left == next(iter(rows.values()))[0]
        assert nozzlemap.front_right == next(reversed(list(rows.values())))[-1]

        def _nozzles() -> Iterator[str]:
            for row in rows.values():
                for nozzle in row:
                    yield nozzle

        assert list(nozzlemap.map_store.keys()) == list(_nozzles())
        assert nozzlemap.rows == rows
        assert nozzlemap.columns == cols
        assert nozzlemap.tip_count == sum(len(row) for row in rows.values())

    test_map_entries(
        subject.current_configuration,
        {
            "A": [
                "A1",
                "A2",
                "A3",
                "A4",
                "A5",
                "A6",
                "A7",
                "A8",
                "A9",
                "A10",
                "A11",
                "A12",
            ],
            "B": [
                "B1",
                "B2",
                "B3",
                "B4",
                "B5",
                "B6",
                "B7",
                "B8",
                "B9",
                "B10",
                "B11",
                "B12",
            ],
            "C": [
                "C1",
                "C2",
                "C3",
                "C4",
                "C5",
                "C6",
                "C7",
                "C8",
                "C9",
                "C10",
                "C11",
                "C12",
            ],
            "D": [
                "D1",
                "D2",
                "D3",
                "D4",
                "D5",
                "D6",
                "D7",
                "D8",
                "D9",
                "D10",
                "D11",
                "D12",
            ],
            "E": [
                "E1",
                "E2",
                "E3",
                "E4",
                "E5",
                "E6",
                "E7",
                "E8",
                "E9",
                "E10",
                "E11",
                "E12",
            ],
            "F": [
                "F1",
                "F2",
                "F3",
                "F4",
                "F5",
                "F6",
                "F7",
                "F8",
                "F9",
                "F10",
                "F11",
                "F12",
            ],
            "G": [
                "G1",
                "G2",
                "G3",
                "G4",
                "G5",
                "G6",
                "G7",
                "G8",
                "G9",
                "G10",
                "G11",
                "G12",
            ],
            "H": [
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6",
                "H7",
                "H8",
                "H9",
                "H10",
                "H11",
                "H12",
            ],
        },
        {
            "1": ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"],
            "2": ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2"],
            "3": ["A3", "B3", "C3", "D3", "E3", "F3", "G3", "H3"],
            "4": ["A4", "B4", "C4", "D4", "E4", "F4", "G4", "H4"],
            "5": ["A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5"],
            "6": ["A6", "B6", "C6", "D6", "E6", "F6", "G6", "H6"],
            "7": ["A7", "B7", "C7", "D7", "E7", "F7", "G7", "H7"],
            "8": ["A8", "B8", "C8", "D8", "E8", "F8", "G8", "H8"],
            "9": ["A9", "B9", "C9", "D9", "E9", "F9", "G9", "H9"],
            "10": ["A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10"],
            "11": ["A11", "B11", "C11", "D11", "E11", "F11", "G11", "H11"],
            "12": ["A12", "B12", "C12", "D12", "E12", "F12", "G12", "H12"],
        },
    )

    subject.update_nozzle_configuration("A1", "H1")
    test_map_entries(
        subject.current_configuration,
        {
            "A": ["A1"],
            "B": ["B1"],
            "C": ["C1"],
            "D": ["D1"],
            "E": ["E1"],
            "F": ["F1"],
            "G": ["G1"],
            "H": ["H1"],
        },
        {"1": ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"]},
    )

    subject.update_nozzle_configuration("A12", "H12")
    test_map_entries(
        subject.current_configuration,
        {
            "A": ["A12"],
            "B": ["B12"],
            "C": ["C12"],
            "D": ["D12"],
            "E": ["E12"],
            "F": ["F12"],
            "G": ["G12"],
            "H": ["H12"],
        },
        {"12": ["A12", "B12", "C12", "D12", "E12", "F12", "G12", "H12"]},
    )

    subject.update_nozzle_configuration("A1", "A12")
    test_map_entries(
        subject.current_configuration,
        {
            "A": [
                "A1",
                "A2",
                "A3",
                "A4",
                "A5",
                "A6",
                "A7",
                "A8",
                "A9",
                "A10",
                "A11",
                "A12",
            ]
        },
        {
            "1": ["A1"],
            "2": ["A2"],
            "3": ["A3"],
            "4": ["A4"],
            "5": ["A5"],
            "6": ["A6"],
            "7": ["A7"],
            "8": ["A8"],
            "9": ["A9"],
            "10": ["A10"],
            "11": ["A11"],
            "12": ["A12"],
        },
    )

    subject.update_nozzle_configuration("H1", "H12")
    test_map_entries(
        subject.current_configuration,
        {
            "H": [
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6",
                "H7",
                "H8",
                "H9",
                "H10",
                "H11",
                "H12",
            ]
        },
        {
            "1": ["H1"],
            "2": ["H2"],
            "3": ["H3"],
            "4": ["H4"],
            "5": ["H5"],
            "6": ["H6"],
            "7": ["H7"],
            "8": ["H8"],
            "9": ["H9"],
            "10": ["H10"],
            "11": ["H11"],
            "12": ["H12"],
        },
    )

    subject.update_nozzle_configuration("A1", "D6")
    test_map_entries(
        subject.current_configuration,
        {
            "A": ["A1", "A2", "A3", "A4", "A5", "A6"],
            "B": ["B1", "B2", "B3", "B4", "B5", "B6"],
            "C": ["C1", "C2", "C3", "C4", "C5", "C6"],
            "D": ["D1", "D2", "D3", "D4", "D5", "D6"],
        },
        {
            "1": ["A1", "B1", "C1", "D1"],
            "2": ["A2", "B2", "C2", "D2"],
            "3": ["A3", "B3", "C3", "D3"],
            "4": ["A4", "B4", "C4", "D4"],
            "5": ["A5", "B5", "C5", "D5"],
            "6": ["A6", "B6", "C6", "D6"],
        },
    )

    subject.update_nozzle_configuration("E1", "H6")
    test_map_entries(
        subject.current_configuration,
        {
            "E": ["E1", "E2", "E3", "E4", "E5", "E6"],
            "F": ["F1", "F2", "F3", "F4", "F5", "F6"],
            "G": ["G1", "G2", "G3", "G4", "G5", "G6"],
            "H": ["H1", "H2", "H3", "H4", "H5", "H6"],
        },
        {
            "1": ["E1", "F1", "G1", "H1"],
            "2": ["E2", "F2", "G2", "H2"],
            "3": ["E3", "F3", "G3", "H3"],
            "4": ["E4", "F4", "G4", "H4"],
            "5": ["E5", "F5", "G5", "H5"],
            "6": ["E6", "F6", "G6", "H6"],
        },
    )

    subject.update_nozzle_configuration("E7", "H12")
    test_map_entries(
        subject.current_configuration,
        {
            "E": ["E7", "E8", "E9", "E10", "E11", "E12"],
            "F": ["F7", "F8", "F9", "F10", "F11", "F12"],
            "G": ["G7", "G8", "G9", "G10", "G11", "G12"],
            "H": ["H7", "H8", "H9", "H10", "H11", "H12"],
        },
        {
            "7": ["E7", "F7", "G7", "H7"],
            "8": ["E8", "F8", "G8", "H8"],
            "9": ["E9", "F9", "G9", "H9"],
            "10": ["E10", "F10", "G10", "H10"],
            "11": ["E11", "F11", "G11", "H11"],
            "12": ["E12", "F12", "G12", "H12"],
        },
    )


@pytest.mark.parametrize(
    "pipette_details", [(PipetteModelType.p1000, PipetteVersionType(major=3, minor=5))]
)
def test_96_config_geometry(
    pipette_details: Tuple[PipetteModelType, PipetteVersionType],
) -> None:
    config = load_definition(
        pipette_details[0],
        PipetteChannelType.NINETY_SIX_CHANNEL,
        pipette_details[1],
        PipetteOEMType.OT,
    )
    subject = nozzle_manager.NozzleConfigurationManager.build_from_config(
        config,
        ValidNozzleMaps(
            maps=NINETY_SIX_FULL
            | NINETY_SIX_COL_1
            | NINETY_SIX_COL_12
            | NINETY_SIX_ROW_A
            | NINETY_SIX_ROW_H
            | A1_D6
            | E7_H12
            | E1_H6
            | A1_B12
            | G1_H12
            | A1_H3
            | A10_H12
        ),
    )

    def test_map_geometry(
        config: PipetteConfigurations,
        nozzlemap: nozzle_manager.NozzleMap,
        starting_nozzle: str,
        front_nozzle: str,
        xy_center_between: Union[str, Tuple[str, str]],
        y_center_between: Union[str, Tuple[str, str]],
    ) -> None:
        assert_offset_in_center_of(
            nozzlemap.xy_center_offset, xy_center_between, config
        )
        assert_offset_in_center_of(nozzlemap.y_center_offset, y_center_between, config)

        assert nozzlemap.front_nozzle_offset == Point(*config.nozzle_map[front_nozzle])
        assert nozzlemap.starting_nozzle_offset == Point(
            *config.nozzle_map[starting_nozzle]
        )

    test_map_geometry(
        config, subject.current_configuration, "A1", "H1", ("A1", "H12"), ("A1", "H1")
    )

    subject.update_nozzle_configuration("A1", "H1")
    test_map_geometry(
        config, subject.current_configuration, "A1", "H1", ("A1", "H1"), ("A1", "H1")
    )

    subject.update_nozzle_configuration("A12", "H12")
    test_map_geometry(
        config,
        subject.current_configuration,
        "A12",
        "H12",
        ("A12", "H12"),
        ("A12", "H12"),
    )

    subject.update_nozzle_configuration("A1", "A12")
    test_map_geometry(
        config, subject.current_configuration, "A1", "A1", ("A1", "A12"), "A1"
    )

    subject.update_nozzle_configuration("H1", "H12")
    test_map_geometry(
        config, subject.current_configuration, "H1", "H1", ("H1", "H12"), "H1"
    )

    subject.update_nozzle_configuration("A1", "D6")
    test_map_geometry(
        config, subject.current_configuration, "A1", "D1", ("A1", "D6"), ("A1", "D1")
    )

    subject.update_nozzle_configuration("E7", "H12")
    test_map_geometry(
        config, subject.current_configuration, "E7", "H7", ("E7", "H12"), ("E7", "H7")
    )
