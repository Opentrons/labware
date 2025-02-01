"""Test for the ProtocolEngine-based well API core."""

import inspect

import pytest
from decoy import Decoy

from opentrons_shared_data.labware.labware_definition import WellDefinition

from opentrons.protocol_api import MAX_SUPPORTED_VERSION
from opentrons.protocol_engine import WellLocation, WellOrigin, WellOffset
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine.errors.exceptions import (
    LiquidHeightUnknownError,
    LiquidVolumeUnknownError,
)
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import UnsupportedAPIError
from opentrons.types import Point
from opentrons_shared_data.labware.labware_definition import (
    InnerWellGeometry,
    ConicalFrustum,
    SphericalSegment,
)

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


def test_current_liquid_height(
    decoy: Decoy, subject: WellCore, mock_engine_client: EngineClient
) -> None:
    """Make sure current_liquid_height returns the correct meniscus value or raises an error."""
    fake_meniscus_height = 2222.2
    decoy.when(
        mock_engine_client.state.geometry.get_meniscus_height(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return(fake_meniscus_height)
    assert subject.current_liquid_height() == fake_meniscus_height

    # make sure that WellCore propagates a LiquidHeightUnknownError
    decoy.when(
        mock_engine_client.state.geometry.get_meniscus_height(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_raise(LiquidHeightUnknownError())

    with pytest.raises(LiquidHeightUnknownError):
        subject.current_liquid_height()


def test_current_liquid_volume(
    decoy: Decoy, subject: WellCore, mock_engine_client: EngineClient
) -> None:
    """Make sure current_liquid_volume returns the correct value or raises an error."""
    fake_volume = 2222.2
    decoy.when(
        mock_engine_client.state.geometry.get_current_well_volume(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return(fake_volume)
    assert subject.get_well_volume() == fake_volume

    # make sure that WellCore propagates a LiquidVolumeUnknownError
    decoy.when(
        mock_engine_client.state.geometry.get_current_well_volume(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_raise(LiquidVolumeUnknownError())

    with pytest.raises(LiquidVolumeUnknownError):
        subject.get_well_volume()


@pytest.mark.parametrize("operation_volume", [0.0, 100, -100, 2, -4, 5])
def test_estimate_liquid_height_after_pipetting(
    decoy: Decoy,
    subject: WellCore,
    mock_engine_client: EngineClient,
    operation_volume: float,
) -> None:
    """Make sure estimate_liquid_height_after_pipetting returns the correct value and does not raise an error."""
    fake_well_geometry = InnerWellGeometry(
        sections=[
            SphericalSegment(
                shape="spherical",
                radiusOfCurvature=1.0,
                topHeight=2.5,
                bottomHeight=0.0,
            ),
            ConicalFrustum(
                shape="conical",
                bottomHeight=2.5,
                topHeight=10.1,
                bottomDiameter=4.4,
                topDiameter=6.7,
            ),
            ConicalFrustum(
                shape="conical",
                bottomHeight=10.1,
                topHeight=10.2,
                bottomDiameter=6.7,
                topDiameter=7.7,
            ),
        ]
    )
    decoy.when(
        mock_engine_client.state.labware.get_well_geometry(
            labware_id="labware-id", well_name="well-name"
        )
    ).then_return(fake_well_geometry)
    initial_liquid_height = 5.6
    fake_final_height = 10000000
    decoy.when(subject.current_liquid_height()).then_return(initial_liquid_height)
    decoy.when(
        mock_engine_client.state.geometry.get_well_height_after_liquid_handling_no_error(
            labware_id="labware-id",
            well_name="well-name",
            initial_height=initial_liquid_height,
            volume=operation_volume,
        )
    ).then_return(fake_final_height)

    # make sure that no error was raised
    final_height = subject.estimate_liquid_height_after_pipetting(
        operation_volume=operation_volume,
    )
    assert final_height == fake_final_height


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
