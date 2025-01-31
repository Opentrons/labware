"""Test for the ProtocolEngine-based well API core."""

import inspect

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.labware_definition import WellDefinition

from opentrons.protocol_api import MAX_SUPPORTED_VERSION
from opentrons.protocol_engine import WellLocation, WellOrigin, WellOffset
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import UnsupportedAPIError
from opentrons.types import Point

from opentrons.protocol_api._liquid import Liquid
from opentrons.protocol_api.core.engine import WellCore, point_calculations, stringify


@pytest.fixture(autouse=True)
def patch_mock_point_calculations(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock out point_calculations.py functions."""
    for name, func in inspect.getmembers(point_calculations, inspect.isfunction):
        monkeypatch.setattr(point_calculations, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def patch_mock_stringify(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock out stringify.py functions."""
    for name, func in inspect.getmembers(stringify, inspect.isfunction):
        monkeypatch.setattr(stringify, name, decoy.mock(func=func))


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def api_version() -> APIVersion:
    """Get an API version to apply to the interface."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def well_definition() -> WellDefinition:
    """Get a partial WellDefinition value object."""
    return WellDefinition.model_construct()  # type: ignore[call-arg]


@pytest.fixture
def subject(
    decoy: Decoy, mock_engine_client: EngineClient, well_definition: WellDefinition
) -> WellCore:
    """Get a WellCore test subject with mocked dependencies."""
    decoy.when(
        mock_engine_client.state.labware.get_well_definition(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return(well_definition)

    return WellCore(
        name="well-name",
        labware_id="labware-id",
        engine_client=mock_engine_client,
    )


def test_name(subject: WellCore) -> None:
    """It should have a name and labware ID."""
    assert subject.get_name() == "well-name"
    assert subject.labware_id == "labware-id"


def test_display_name(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should have a display name."""
    decoy.when(
        stringify.well(
            engine_client=mock_engine_client,
            well_name="well-name",
            labware_id="labware-id",
        )
    ).then_return("Matthew Zwimpfer")

    assert subject.get_display_name() == "Matthew Zwimpfer"


@pytest.mark.parametrize(
    "well_definition",
    [WellDefinition.model_construct(totalLiquidVolume=101)],  # type: ignore[call-arg]
)
def test_max_volume(subject: WellCore) -> None:
    """It should have a max volume."""
    assert subject.get_max_volume() == 101


def test_get_top(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should get a well top."""
    decoy.when(
        mock_engine_client.state.geometry.get_well_position(
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=42)
            ),
        )
    ).then_return(Point(1, 2, 3))

    assert subject.get_top(z_offset=42.0) == Point(1, 2, 3)


def test_get_bottom(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should get a well bottom."""
    decoy.when(
        mock_engine_client.state.geometry.get_well_position(
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(
                origin=WellOrigin.BOTTOM, offset=WellOffset(x=0, y=0, z=42)
            ),
        )
    ).then_return(Point(1, 2, 3))

    assert subject.get_bottom(z_offset=42.0) == Point(1, 2, 3)


def test_get_center(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should get a well center."""
    decoy.when(
        mock_engine_client.state.geometry.get_well_position(
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(origin=WellOrigin.CENTER),
        )
    ).then_return(Point(1, 2, 3))

    assert subject.get_center() == Point(1, 2, 3)


def test_has_tip(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should get whether a clean tip is present."""
    decoy.when(
        mock_engine_client.state.tips.has_clean_tip(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return(True)

    assert subject.has_tip() is True


def test_set_has_tip(subject: WellCore) -> None:
    """Trying to set the has tip state should raise an error."""
    with pytest.raises(UnsupportedAPIError):
        subject.set_has_tip(True)


def test_load_liquid(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should load a liquid into a well."""
    mock_liquid = Liquid(
        _id="liquid-id", name="water", description=None, display_color=None
    )

    subject.load_liquid(liquid=mock_liquid, volume=20)

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.LoadLiquidParams(
                labwareId="labware-id",
                liquidId="liquid-id",
                volumeByWell={"well-name": 20},
            )
        ),
        times=1,
    )


@pytest.mark.parametrize(
    "well_definition",
    [WellDefinition.model_construct(diameter=123.4)],  # type: ignore[call-arg]
)
def test_diameter(subject: WellCore) -> None:
    """It should get the diameter."""
    assert subject.diameter == 123.4


@pytest.mark.parametrize(
    "well_definition",
    [WellDefinition.model_construct(xDimension=567.8)],  # type: ignore[call-arg]
)
def test_length(subject: WellCore) -> None:
    """It should get the length."""
    assert subject.length == 567.8


@pytest.mark.parametrize(
    "well_definition",
    [WellDefinition.model_construct(yDimension=987.6)],  # type: ignore[call-arg]
)
def test_width(subject: WellCore) -> None:
    """It should get the width."""
    assert subject.width == 987.6


@pytest.mark.parametrize(
    "well_definition",
    [WellDefinition.model_construct(depth=42.0)],  # type: ignore[call-arg]
)
def test_depth(subject: WellCore) -> None:
    """It should get the depth."""
    assert subject.depth == 42.0


def test_from_center_cartesian(
    decoy: Decoy, mock_engine_client: EngineClient, subject: WellCore
) -> None:
    """It should get the relative point from the center of a well."""
    decoy.when(
        mock_engine_client.state.geometry.get_well_position(
            labware_id="labware-id",
            well_name="well-name",
            well_location=WellLocation(origin=WellOrigin.CENTER),
        )
    ).then_return(Point(1, 2, 3))

    decoy.when(
        mock_engine_client.state.labware.get_well_size(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return((4, 5, 6))

    decoy.when(
        point_calculations.get_relative_offset(
            point=Point(1, 2, 3),
            size=(4, 5, 6),
            x_ratio=7,
            y_ratio=8,
            z_ratio=9,
        )
    ).then_return(Point(3, 2, 1))

    result = subject.from_center_cartesian(x=7, y=8, z=9)

    assert result == Point(3, 2, 1)
