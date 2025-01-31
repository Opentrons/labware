"""Tests for the InstrumentContext public interface."""

import inspect
from typing import cast

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import APIVersionError, UnsupportedAPIError
from opentrons.protocol_api import MAX_SUPPORTED_VERSION, Labware, Well
from opentrons.protocol_api.core import well_grid
from opentrons.protocol_api.core.common import (
    LabwareCore,
    WellCore,
    ProtocolCore,
    ModuleCore,
)

from opentrons.protocol_api.core.labware import LabwareLoadParams
from opentrons.protocol_api.core.core_map import LoadedCoreMap
from opentrons.protocol_api import TemperatureModuleContext
from opentrons.protocol_api._liquid import Liquid

from opentrons.types import Point

from . import versions_at_or_below, versions_at_or_above, versions_between


@pytest.fixture(autouse=True)
def _mock_well_grid_module(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out the well grid module."""
    for name, func in inspect.getmembers(well_grid, inspect.isfunction):
        monkeypatch.setattr(well_grid, name, decoy.mock(func=func))


@pytest.fixture
def mock_labware_core(decoy: Decoy) -> LabwareCore:
    """Get a mock labware implementation core."""
    return decoy.mock(cls=LabwareCore)


@pytest.fixture
def mock_protocol_core(decoy: Decoy) -> ProtocolCore:
    """Get a mock protocol implementation core."""
    return decoy.mock(cls=ProtocolCore)


@pytest.fixture
def mock_map_core(decoy: Decoy) -> LoadedCoreMap:
    """Get a mock map core."""
    return decoy.mock(cls=LoadedCoreMap)


@pytest.fixture
def api_version() -> APIVersion:
    """Get the API version to test at."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def subject(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
    api_version: APIVersion,
) -> Labware:
    """Get a Labware test subject with its dependencies mocked out."""
    decoy.when(mock_labware_core.get_well_columns()).then_return([])
    decoy.when(well_grid.create([])).then_return(
        well_grid.WellGrid(columns_by_name={}, rows_by_name={})
    )
    return Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )


@pytest.mark.parametrize("api_version", [APIVersion(2, 13)])
def test_api_version(api_version: APIVersion, subject: Labware) -> None:
    """It should have an api_version property."""
    assert subject.api_version == api_version


@pytest.mark.parametrize("api_version", [APIVersion(2, 12)])
def test_api_version_clamped(subject: Labware) -> None:
    """It should not allow the API version to go any lower than 2.13."""
    assert subject.api_version == APIVersion(2, 13)


def test_is_tiprack(
    decoy: Decoy, mock_labware_core: LabwareCore, subject: Labware
) -> None:
    """It should report if it's a tip rack."""
    decoy.when(mock_labware_core.is_tip_rack()).then_return(True)
    assert subject.is_tiprack is True

    decoy.when(mock_labware_core.is_tip_rack()).then_return(False)
    assert subject.is_tiprack is False


def test_is_adapter(
    decoy: Decoy, mock_labware_core: LabwareCore, subject: Labware
) -> None:
    """It should report if it's an adapter."""
    decoy.when(mock_labware_core.is_adapter()).then_return(True)
    assert subject.is_adapter is True

    decoy.when(mock_labware_core.is_adapter()).then_return(False)
    assert subject.is_adapter is False


def test_load_labware(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
    api_version: APIVersion,
    subject: Labware,
) -> None:
    """It should load a labware by the load parameters."""
    new_mock_core = decoy.mock(cls=LabwareCore)
    decoy.when(
        mock_protocol_core.load_labware(
            load_name="labware-name",
            label="a label",
            namespace="a-namespace",
            version=123,
            location=mock_labware_core,
        )
    ).then_return(new_mock_core)
    decoy.when(new_mock_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        name="labware-name",
        label="a label",
        namespace="a-namespace",
        version=123,
    )

    assert isinstance(result, Labware)
    assert result.api_version == api_version
    decoy.verify(mock_map_core.add(new_mock_core, result), times=1)


def test_load_labware_from_definition(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
    api_version: APIVersion,
    subject: Labware,
) -> None:
    """It should be able to load a labware from a definition dictionary."""
    new_mock_core = decoy.mock(cls=LabwareCore)

    labware_definition_dict = cast(LabwareDefDict, {"labwareDef": True})
    labware_load_params = LabwareLoadParams("you", "are", 1337)

    decoy.when(
        mock_protocol_core.add_labware_definition(labware_definition_dict)
    ).then_return(labware_load_params)

    decoy.when(new_mock_core.get_well_columns()).then_return([])

    decoy.when(
        mock_protocol_core.load_labware(
            namespace="you",
            load_name="are",
            version=1337,
            label="a label",
            location=mock_labware_core,
        )
    ).then_return(new_mock_core)

    result = subject.load_labware_from_definition(
        definition=labware_definition_dict,
        label="a label",
    )

    assert isinstance(result, Labware)
    assert result.api_version == api_version
    decoy.verify(mock_map_core.add(new_mock_core, result), times=1)


def test_wells(
    decoy: Decoy,
    api_version: APIVersion,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
    subject: Labware,
) -> None:
    """It should return a list of wells."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)
    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )

    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_1.get_max_volume()).then_return(100)
    decoy.when(mock_well_core_2.get_name()).then_return("B1")
    decoy.when(mock_well_core_1.get_max_volume()).then_return(1000)

    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)

    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    result = subject.wells()
    result_a1 = result[0]
    result_b1 = result[1]

    assert len(result) == 2
    assert isinstance(result_a1, Well)
    assert result_a1.well_name == "A1"
    assert isinstance(result_b1, Well)
    assert result_b1.well_name == "B1"

    assert subject.wells_by_name() == {"A1": result_a1, "B1": result_b1}

    assert subject.rows() == [[result_a1], [result_b1]]
    assert subject.rows_by_name() == {"A": [result_a1], "B": [result_b1]}
    assert subject.columns() == [[result_a1, result_b1]]
    assert subject.columns_by_name() == {"1": [result_a1, result_b1]}


def test_reset_tips(
    decoy: Decoy, mock_labware_core: LabwareCore, subject: Labware
) -> None:
    """It should reset and tip state."""
    subject.reset()
    decoy.verify(mock_labware_core.reset_tips(), times=1)


def test_parent_slot(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
) -> None:
    """Should get the labware's parent slot name or None."""
    decoy.when(mock_protocol_core.get_labware_location(mock_labware_core)).then_return(
        "bloop"
    )

    assert subject.parent == "bloop"


def test_parent_module_context(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """Should get labware parent module context."""
    mock_module_core = decoy.mock(cls=ModuleCore)
    mock_temp_module_context = decoy.mock(cls=TemperatureModuleContext)

    decoy.when(mock_protocol_core.get_labware_location(mock_labware_core)).then_return(
        mock_module_core
    )

    decoy.when(mock_map_core.get(mock_module_core)).then_return(
        mock_temp_module_context
    )

    assert subject.parent == mock_temp_module_context


def test_parent_labware(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """Should get labware's parent labware."""
    mock_parent_labware_core = decoy.mock(cls=LabwareCore)
    mock_labware = decoy.mock(cls=Labware)

    decoy.when(mock_protocol_core.get_labware_location(mock_labware_core)).then_return(
        mock_parent_labware_core
    )

    decoy.when(mock_map_core.get(mock_parent_labware_core)).then_return(mock_labware)

    assert subject.parent == mock_labware


def test_child(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should get the labware sitting on top of the labware."""
    mock_child_labware_core = decoy.mock(cls=LabwareCore)
    mock_labware = decoy.mock(cls=Labware)

    decoy.when(
        mock_protocol_core.get_labware_on_labware(mock_labware_core)
    ).then_return(mock_child_labware_core)
    decoy.when(mock_map_core.get(mock_child_labware_core)).then_return(mock_labware)

    assert subject.child == mock_labware


@pytest.mark.parametrize("api_version", versions_at_or_below(APIVersion(2, 13)))
def test_set_offset_succeeds_on_low_api_version(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
) -> None:
    """It should pass the offset to the core, on low API versions."""
    subject.set_offset(1, 2, 3)
    decoy.verify(mock_labware_core.set_calibration(Point(1, 2, 3)))


@pytest.mark.parametrize(
    "api_version",
    versions_between(
        low_inclusive_bound=APIVersion(2, 14), high_inclusive_bound=APIVersion(2, 17)
    ),
)
def test_set_offset_raises_on_intermediate_api_version(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
) -> None:
    """It should raise an error, on high API versions."""
    with pytest.raises(APIVersionError):
        subject.set_offset(1, 2, 3)


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 18)))
def test_set_offset_succeeds_on_high_api_version(
    decoy: Decoy, subject: Labware, mock_labware_core: LabwareCore
) -> None:
    """It should not raise an API version error on the most recent versions."""
    subject.set_offset(1, 2, 3)
    decoy.verify(mock_labware_core.set_calibration(Point(1, 2, 3)))


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 14)))
def test_separate_calibration_raises_on_high_api_version(
    decoy: Decoy,
    subject: Labware,
    mock_labware_core: LabwareCore,
) -> None:
    """It should raise an error, on high API versions."""
    with pytest.raises(UnsupportedAPIError):
        subject.separate_calibration


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_liquid_handles_valid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should load volumes for list of wells."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)
    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")

    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)

    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    mock_liquid = decoy.mock(cls=Liquid)

    subject.load_liquid(["A1", subject["B1"]], 10, mock_liquid)
    decoy.verify(
        mock_labware_core.load_liquid(
            {
                "A1": 10,
                "B1": 10,
            },
            mock_liquid,
        )
    )


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_liquid_rejects_invalid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should require valid load inputs."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)

    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")
    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)
    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )

    core_2 = decoy.mock(cls=LabwareCore)
    mock_well_core_3 = decoy.mock(cls=WellCore)
    grid_2 = well_grid.WellGrid(
        columns_by_name={"1": ["A1"]}, rows_by_name={"A": ["A1"]}
    )
    decoy.when(mock_well_core_3.get_name()).then_return("A1")
    decoy.when(core_2.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(core_2.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(core_2.get_well_core("B1")).then_return(mock_well_core_2)

    decoy.when(well_grid.create([["A1"]])).then_return(grid_2)
    other_labware = Labware(
        core=core_2,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    mock_liquid = decoy.mock(cls=Liquid)
    with pytest.raises(KeyError):
        subject.load_liquid(["A1", "C1"], 10, mock_liquid)

    with pytest.raises(KeyError):
        subject.load_liquid([subject["A1"], other_labware["A1"]], 10, mock_liquid)

    with pytest.raises(TypeError):
        subject.load_liquid([2], 10, mock_liquid)  # type: ignore[list-item]

    with pytest.raises(TypeError):
        subject.load_liquid(["A1"], "A1", mock_liquid)  # type: ignore[arg-type]
    mock_liquid = decoy.mock(cls=Liquid)

    subject.load_liquid(["A1", subject["B1"]], 10, mock_liquid)
    decoy.verify(
        mock_labware_core.load_liquid(
            {
                "A1": 10,
                "B1": 10,
            },
            mock_liquid,
        )
    )


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_liquid_by_well_handles_valid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should load liquids of different volumes in different wells."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)
    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")

    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)
    decoy.when(mock_well_core_2.get_display_name()).then_return("well 2")
    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    mock_liquid = decoy.mock(cls=Liquid)

    subject.load_liquid_by_well({"A1": 10, subject["B1"]: 11}, mock_liquid)
    decoy.verify(
        mock_labware_core.load_liquid(
            {
                "A1": 10,
                "B1": 11,
            },
            mock_liquid,
        )
    )


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_liquid_by_well_rejects_invalid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should require valid well specs."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)

    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")
    decoy.when(mock_well_core_1.get_display_name()).then_return("well 1")
    decoy.when(mock_well_core_2.get_display_name()).then_return("well 2")
    decoy.when(mock_well_core_1.get_top(z_offset=0.0)).then_return(Point(4, 5, 6))
    decoy.when(mock_well_core_1.get_top(z_offset=0.0)).then_return(Point(7, 8, 9))
    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)
    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    core_2 = decoy.mock(cls=LabwareCore)
    mock_well_core_3 = decoy.mock(cls=WellCore)
    decoy.when(mock_well_core_3.get_display_name()).then_return("well 3")
    grid_2 = well_grid.WellGrid(
        columns_by_name={"1": ["A1"]}, rows_by_name={"A": ["A1"]}
    )
    decoy.when(mock_well_core_3.get_name()).then_return("A1")
    decoy.when(core_2.get_well_columns()).then_return([["A1"]])
    decoy.when(core_2.get_well_core("A1")).then_return(mock_well_core_3)
    decoy.when(mock_well_core_3.get_top(z_offset=0.0)).then_return(Point(1, 2, 3))

    decoy.when(well_grid.create([["A1"]])).then_return(grid_2)
    other_labware = Labware(
        core=core_2,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )

    mock_liquid = decoy.mock(cls=Liquid)
    with pytest.raises(KeyError):
        subject.load_liquid_by_well({"A1": 10, "C1": 11}, mock_liquid)

    with pytest.raises(KeyError):
        subject.load_liquid_by_well(
            {subject["A1"]: 10, other_labware["A1"]: 11}, mock_liquid
        )

    with pytest.raises(TypeError):
        subject.load_liquid_by_well({2: 10}, mock_liquid)  # type: ignore[dict-item]

    with pytest.raises(TypeError):
        subject.load_liquid_by_well({"A1": "A3"}, mock_liquid)  # type: ignore[dict-item]


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_empty_handles_valid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should load lists of wells as empty."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)
    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")

    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)

    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )

    subject.load_empty(["A1", subject["B1"]])
    decoy.verify(mock_labware_core.load_empty(["A1", "B1"]))


@pytest.mark.parametrize("api_version", versions_at_or_above(APIVersion(2, 22)))
def test_load_empty_rejects_invalid_inputs(
    decoy: Decoy,
    mock_labware_core: LabwareCore,
    api_version: APIVersion,
    mock_protocol_core: ProtocolCore,
    mock_map_core: LoadedCoreMap,
) -> None:
    """It should require valid well specs."""
    mock_well_core_1 = decoy.mock(cls=WellCore)
    mock_well_core_2 = decoy.mock(cls=WellCore)

    grid = well_grid.WellGrid(
        columns_by_name={"1": ["A1", "B1"]},
        rows_by_name={"A": ["A1"], "B": ["B1"]},
    )
    decoy.when(mock_well_core_1.get_name()).then_return("A1")
    decoy.when(mock_well_core_2.get_name()).then_return("B1")
    decoy.when(mock_labware_core.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(mock_labware_core.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(mock_labware_core.get_well_core("B1")).then_return(mock_well_core_2)
    decoy.when(well_grid.create([["A1", "B1"]])).then_return(grid)
    subject = Labware(
        core=mock_labware_core,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )

    core_2 = decoy.mock(cls=LabwareCore)
    mock_well_core_3 = decoy.mock(cls=WellCore)
    grid_2 = well_grid.WellGrid(
        columns_by_name={"1": ["A1"]}, rows_by_name={"A": ["A1"]}
    )
    decoy.when(mock_well_core_3.get_name()).then_return("A1")
    decoy.when(core_2.get_well_columns()).then_return([["A1", "B1"]])
    decoy.when(core_2.get_well_core("A1")).then_return(mock_well_core_1)
    decoy.when(core_2.get_well_core("B1")).then_return(mock_well_core_2)

    decoy.when(well_grid.create([["A1"]])).then_return(grid_2)
    other_labware = Labware(
        core=core_2,
        api_version=api_version,
        protocol_core=mock_protocol_core,
        core_map=mock_map_core,
    )
    with pytest.raises(KeyError):
        subject.load_empty(["A1", "C1"])

    with pytest.raises(KeyError):
        subject.load_empty([subject["A1"], other_labware["A1"]])

    with pytest.raises(TypeError):
        subject.load_empty([2])  # type: ignore[list-item]
