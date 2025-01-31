"""Tests for the InstrumentContext public interface."""

import pytest
from decoy import Decoy

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_api import MAX_SUPPORTED_VERSION, Labware, Well
from opentrons.protocol_api.core.common import WellCore
from opentrons.protocol_api._liquid import Liquid
from opentrons.types import Point, Location


@pytest.fixture
def mock_well_core(decoy: Decoy) -> WellCore:
    """Get a mock labware implementation core."""
    core = decoy.mock(cls=WellCore)
    decoy.when(core.get_display_name()).then_return("A1 of Cool Labware")
    return core


@pytest.fixture
def api_version() -> APIVersion:
    """Get the API version to test at."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def mock_parent(decoy: Decoy) -> Labware:
    """Get the well's parent."""
    return decoy.mock(cls=Labware)


@pytest.fixture
def subject(
    mock_parent: Labware, mock_well_core: WellCore, api_version: APIVersion
) -> Well:
    """Get a Well test subject with its dependencies mocked out."""
    return Well(parent=mock_parent, core=mock_well_core, api_version=api_version)


@pytest.mark.parametrize("api_version", [APIVersion(2, 13)])
def test_api_version(api_version: APIVersion, subject: Well) -> None:
    """It should have an api_version property."""
    assert subject.api_version == api_version


@pytest.mark.parametrize("api_version", [APIVersion(2, 12)])
def test_api_version_clamped(subject: Well) -> None:
    """It should not allow the API version to go any lower than 2.13."""
    assert subject.api_version == APIVersion(2, 13)


def test_parent(mock_parent: Labware, subject: Well) -> None:
    """It should have a reference to its parent."""
    assert subject.parent is mock_parent


def test_repr(
    decoy: Decoy, mock_well_core: WellCore, mock_parent: Labware, subject: Well
) -> None:
    """It should have a string representation."""
    assert subject.display_name == "A1 of Cool Labware"
    assert repr(subject) == "A1 of Cool Labware"


def test_well_max_volume(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get the well's max volume from the core."""
    decoy.when(mock_well_core.get_max_volume()).then_return(101)
    assert subject.max_volume == 101


def test_well_top(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get a Location representing the top of the well."""
    decoy.when(mock_well_core.get_top(z_offset=4.2)).then_return(Point(1, 2, 3))

    result = subject.top(4.2)

    assert isinstance(result, Location)
    assert result.point == Point(1, 2, 3)
    assert result.labware.as_well() is subject


def test_well_bottom(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get a Location representing the bottom of the well."""
    decoy.when(mock_well_core.get_bottom(z_offset=4.2)).then_return(Point(1, 2, 3))

    result = subject.bottom(4.2)

    assert isinstance(result, Location)
    assert result.point == Point(1, 2, 3)
    assert result.labware.as_well() is subject


def test_well_center(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get a Location representing the center of the well."""
    decoy.when(mock_well_core.get_center()).then_return(Point(1, 2, 3))

    result = subject.center()

    assert isinstance(result, Location)
    assert result.point == Point(1, 2, 3)
    assert result.labware.as_well() is subject


def test_well_meniscus(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get a Location representing the meniscus of the well."""
    result = subject.meniscus(z=4.2, target="end")

    assert isinstance(result, Location)
    assert result.point == Point(0, 0, 4.2)
    assert result.labware.as_well() is subject


def test_has_tip(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get tip state from the core."""
    decoy.when(mock_well_core.has_tip()).then_return(True)
    assert subject.has_tip is True

    decoy.when(mock_well_core.has_tip()).then_return(False)
    assert subject.has_tip is False


def test_load_liquid(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should load a liquid to a location."""
    mocked_liquid = Liquid(
        _id="liquid-id", name="water", description=None, display_color=None
    )

    subject.load_liquid(
        liquid=mocked_liquid,
        volume=20,
    )

    decoy.verify(
        mock_well_core.load_liquid(
            liquid=mocked_liquid,
            volume=20,
        ),
        times=1,
    )


def test_diameter(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get the diameter from the core."""
    decoy.when(mock_well_core.diameter).then_return(12.3)

    assert subject.diameter == 12.3


def test_length(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get the length from the core."""
    decoy.when(mock_well_core.length).then_return(45.6)

    assert subject.length == 45.6


def test_width(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get the width from the core."""
    decoy.when(mock_well_core.width).then_return(78.9)

    assert subject.width == 78.9


def test_depth(decoy: Decoy, mock_well_core: WellCore, subject: Well) -> None:
    """It should get the depth from the core."""
    decoy.when(mock_well_core.depth).then_return(42.0)

    assert subject.depth == 42.0


def test_from_center_cartesian(
    decoy: Decoy, mock_well_core: WellCore, subject: Well
) -> None:
    """It should get the calculated center cartesian point from the core."""
    decoy.when(mock_well_core.from_center_cartesian(1, 2, 3)).then_return(
        Point(4, 5, 6)
    )

    result = subject.from_center_cartesian(1, 2, 3)

    assert result == Point(4, 5, 6)
