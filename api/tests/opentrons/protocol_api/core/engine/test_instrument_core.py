"""Test for the ProtocolEngine-based instrument API core."""

from typing import cast, Optional

from opentrons_shared_data.errors.exceptions import PipetteLiquidNotFoundError
import pytest
from decoy import Decoy
from decoy import errors
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
    PositionReference,
    Coordinate,
)

from opentrons_shared_data.pipette.types import PipetteNameType

from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocol_api._liquid_properties import TransferProperties
from opentrons.protocol_api.core.engine import transfer_components_executor, LabwareCore
from opentrons.protocol_api.core.engine.transfer_components_executor import (
    TransferComponentsExecutor,
    TransferType,
    TipState,
    LiquidAndAirGapPair,
)
from opentrons.protocol_engine import (
    DeckPoint,
    LoadedPipette,
    MotorAxis,
    WellLocation,
    LiquidHandlingWellLocation,
    PickUpTipWellLocation,
    WellOffset,
    WellOrigin,
    PickUpTipWellOrigin,
    DropTipWellLocation,
    DropTipWellOrigin,
)
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine.clients.sync_client import SyncClient
from opentrons.protocol_engine.commands import GetNextTipResult
from opentrons.protocol_engine.errors.exceptions import TipNotAttachedError
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocol_engine.types import (
    FlowRates,
    TipGeometry,
    NozzleLayoutConfigurationType,
    RowNozzleLayoutConfiguration,
    SingleNozzleLayoutConfiguration,
    ColumnNozzleLayoutConfiguration,
    AddressableOffsetVector,
    LiquidClassRecord,
    NextTipInfo,
    NoTipAvailable,
    NoTipReason,
)
from opentrons.protocol_api.disposal_locations import (
    TrashBin,
    WasteChute,
    DisposalOffset,
)
from opentrons.protocol_api._nozzle_layout import NozzleLayout
from opentrons.protocol_api._liquid import LiquidClass
from opentrons.protocol_api.core.engine import (
    InstrumentCore,
    WellCore,
    ProtocolCore,
    pipette_movement_conflict,
)
from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.advanced_control.transfers import common as tx_commons
from opentrons.types import Location, Mount, MountType, Point, NozzleConfigurationType

from ... import versions_below, versions_at_or_above


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def mock_sync_hardware(decoy: Decoy) -> SyncHardwareAPI:
    """Get a mock SyncHardwareAPI synchronous client."""
    return decoy.mock(cls=SyncHardwareAPI)


@pytest.fixture
def mock_protocol_core(decoy: Decoy) -> ProtocolCore:
    """Get a mock protocol implementation core."""
    return decoy.mock(cls=ProtocolCore)


@pytest.fixture(autouse=True)
def patch_mock_pipette_movement_safety_check(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace deck_conflict.check() with a mock."""
    mock = decoy.mock(func=pipette_movement_conflict.check_safe_for_pipette_movement)
    monkeypatch.setattr(
        pipette_movement_conflict, "check_safe_for_pipette_movement", mock
    )


@pytest.fixture(autouse=True)
def patch_mock_check_valid_volume_parameters(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace tx_commons.check_valid_volume_parameters() with a mock."""
    mock = decoy.mock(func=tx_commons.check_valid_volume_parameters)
    monkeypatch.setattr(tx_commons, "check_valid_volume_parameters", mock)


@pytest.fixture(autouse=True)
def patch_mock_expand_for_volume_constraints(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Replace tx_commons.expand_for_volume_constraints() with a mock."""
    mock = decoy.mock(func=tx_commons.expand_for_volume_constraints)
    monkeypatch.setattr(tx_commons, "expand_for_volume_constraints", mock)


@pytest.fixture
def mock_transfer_components_executor(
    decoy: Decoy,
) -> TransferComponentsExecutor:
    """Get a mocked out TransferComponentsExecutor."""
    return decoy.mock(cls=TransferComponentsExecutor)


@pytest.fixture(autouse=True)
def patch_mock_transfer_components_executor(
    decoy: Decoy,
    monkeypatch: pytest.MonkeyPatch,
    mock_transfer_components_executor: TransferComponentsExecutor,
) -> None:
    """Replace transfer_components_executor functions with mocks."""
    monkeypatch.setattr(
        transfer_components_executor,
        "TransferComponentsExecutor",
        mock_transfer_components_executor,
    )
    monkeypatch.setattr(
        transfer_components_executor,
        "absolute_point_from_position_reference_and_offset",
        decoy.mock(
            func=transfer_components_executor.absolute_point_from_position_reference_and_offset
        ),
    )


@pytest.fixture
def subject(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_hardware: SyncHardwareAPI,
    mock_protocol_core: ProtocolCore,
) -> InstrumentCore:
    """Get a InstrumentCore test subject with its dependencies mocked out."""
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(mount=MountType.LEFT)  # type: ignore[call-arg]
    )

    decoy.when(mock_engine_client.state.pipettes.get_flow_rates("abc123")).then_return(
        FlowRates(
            default_aspirate={"1.2": 2.3},
            default_dispense={"3.4": 4.5},
            default_blow_out={"5.6": 6.7},
        ),
    )

    return InstrumentCore(
        pipette_id="abc123",
        engine_client=mock_engine_client,
        sync_hardware_api=mock_sync_hardware,
        protocol_core=mock_protocol_core,
        # When this baby hits 88 mph, you're going to see some serious shit.
        default_movement_speed=39339.5,
    )


def test_pipette_id(subject: InstrumentCore) -> None:
    """It should have a ProtocolEngine ID."""
    assert subject.pipette_id == "abc123"


@pytest.mark.parametrize(
    "version",
    [
        APIVersion(2, 15),
        APIVersion(2, 17),
        APIVersion(2, 20),
        APIVersion(2, 22),
    ],
)
def test_get_pipette_name_old(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
    version: APIVersion,
) -> None:
    """It should get the pipette's load name."""
    decoy.when(mock_protocol_core.api_version).then_return(version)
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P300_SINGLE)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "p300_single"
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P1000_96)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "p1000_96"
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P50_SINGLE_FLEX)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "p50_single_flex"


@pytest.mark.parametrize("version", versions_at_or_above(APIVersion(2, 23)))
def test_get_pipette_name_new(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
    version: APIVersion,
) -> None:
    """It should get the pipette's API-specific load name."""
    decoy.when(mock_protocol_core.api_version).then_return(version)
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P300_SINGLE)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "p300_single"
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P1000_96)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "flex_96channel_1000"
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P50_SINGLE_FLEX)  # type: ignore[call-arg]
    )
    assert subject.get_pipette_name() == "flex_1channel_50"


def test_get_mount(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should get the pipette's mount."""
    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(mount=MountType.LEFT)  # type: ignore[call-arg]
    )

    result = subject.get_mount()

    assert result == Mount.LEFT


def test_get_hardware_state(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_sync_hardware: SyncHardwareAPI,
    subject: InstrumentCore,
) -> None:
    """It should return the actual state of the pipette hardware."""
    pipette_dict = cast(PipetteDict, {"display_name": "Cool Pipette", "has_tip": True})

    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(mount=MountType.LEFT)  # type: ignore[call-arg]
    )
    decoy.when(mock_sync_hardware.get_attached_instrument(Mount.LEFT)).then_return(
        pipette_dict
    )

    assert subject.get_hardware_state() == pipette_dict


def test_move_to_well(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should move the pipette to a location."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="well-name",
        labware_id="labware-id",
        engine_client=mock_engine_client,
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_well_location(
            labware_id="labware-id",
            well_name="well-name",
            absolute_point=Point(1, 2, 3),
        )
    ).then_return(WellLocation(origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)))

    subject.move_to(
        location=location,
        well_core=well_core,
        force_direct=True,
        minimum_z_height=9.87,
        speed=6.54,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToWellParams(
                pipetteId="abc123",
                labwareId="labware-id",
                wellName="well-name",
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
                forceDirect=True,
                minimumZHeight=9.87,
                speed=6.54,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_move_to_coordinates(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should move the pipette to a location."""
    location = Location(point=Point(1, 2, 3), labware=None)

    subject.move_to(
        location=location,
        well_core=None,
        force_direct=True,
        minimum_z_height=42.0,
        speed=4.56,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToCoordinatesParams(
                pipetteId="abc123",
                coordinates=DeckPoint(x=1, y=2, z=3),
                minimumZHeight=42.0,
                forceDirect=True,
                speed=4.56,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_pick_up_tip(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should pick up a tip from a well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="well-name",
        labware_id="labware-id",
        engine_client=mock_engine_client,
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_pick_up_tip_well_location(
            labware_id="labware-id",
            well_name="well-name",
            absolute_point=Point(1, 2, 3),
        )
    ).then_return(
        PickUpTipWellLocation(
            origin=PickUpTipWellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
        )
    )

    subject.pick_up_tip(
        location=location,
        well_core=well_core,
        presses=None,
        increment=None,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_tip_pickup_and_return(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="labware-id",
        ),
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="labware-id",
            well_name="well-name",
            well_location=PickUpTipWellLocation(
                origin=PickUpTipWellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.PickUpTipParams(
                pipetteId="abc123",
                labwareId="labware-id",
                wellName="well-name",
                wellLocation=PickUpTipWellLocation(
                    origin=PickUpTipWellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_get_return_height(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should get the return tip scale from the engine state."""
    decoy.when(
        mock_engine_client.state.pipettes.get_return_tip_scale("abc123")
    ).then_return(0.123)

    result = subject.get_return_height()

    assert result == 0.123


def test_drop_tip_no_location(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should drop a tip given a well core."""
    well_core = WellCore(
        name="well-name",
        labware_id="labware-id",
        engine_client=mock_engine_client,
    )

    subject.drop_tip(location=None, well_core=well_core, home_after=True)

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="labware-id",
            well_name="well-name",
            well_location=DropTipWellLocation(
                origin=DropTipWellOrigin.DEFAULT,
                offset=WellOffset(x=0, y=0, z=0),
            ),
        ),
        mock_engine_client.execute_command(
            cmd.DropTipParams(
                pipetteId="abc123",
                labwareId="labware-id",
                wellName="well-name",
                wellLocation=DropTipWellLocation(
                    origin=DropTipWellOrigin.DEFAULT,
                    offset=WellOffset(x=0, y=0, z=0),
                ),
                homeAfter=True,
                alternateDropLocation=False,
            )
        ),
    )


def test_drop_tip_with_location(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should drop a tip given a well core."""
    location = Location(point=Point(1, 2, 3), labware=None)
    well_core = WellCore(
        name="well-name",
        labware_id="labware-id",
        engine_client=mock_engine_client,
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_well_location(
            labware_id="labware-id",
            well_name="well-name",
            absolute_point=Point(1, 2, 3),
        )
    ).then_return(WellLocation(origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)))
    decoy.when(mock_engine_client.state.labware.is_tiprack("labware-id")).then_return(
        True
    )

    subject.drop_tip(location=location, well_core=well_core, home_after=True)

    decoy.verify(
        pipette_movement_conflict.check_safe_for_tip_pickup_and_return(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="labware-id",
        ),
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="labware-id",
            well_name="well-name",
            well_location=DropTipWellLocation(
                origin=DropTipWellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.DropTipParams(
                pipetteId="abc123",
                labwareId="labware-id",
                wellName="well-name",
                wellLocation=DropTipWellLocation(
                    origin=DropTipWellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
                homeAfter=True,
                alternateDropLocation=False,
            )
        ),
    )


def test_drop_tip_in_trash_bin(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should move to the trash bin and drop the tip in place."""
    trash_bin = decoy.mock(cls=TrashBin)

    decoy.when(trash_bin.offset).then_return(DisposalOffset(x=1, y=2, z=3))
    decoy.when(trash_bin.area_name).then_return("my tubular area")

    subject.drop_tip_in_disposal_location(
        trash_bin, home_after=True, alternate_tip_drop=True
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToAddressableAreaForDropTipParams(
                pipetteId="abc123",
                addressableAreaName="my tubular area",
                offset=AddressableOffsetVector(x=1, y=2, z=3),
                forceDirect=False,
                speed=None,
                minimumZHeight=None,
                alternateDropLocation=True,
                ignoreTipConfiguration=True,
            )
        ),
        mock_engine_client.execute_command(
            cmd.DropTipInPlaceParams(
                pipetteId="abc123",
                homeAfter=True,
            )
        ),
    )


def test_drop_tip_in_waste_chute(
    decoy: Decoy, mock_engine_client: EngineClient, subject: InstrumentCore
) -> None:
    """It should move to the trash bin and drop the tip in place."""
    waste_chute = decoy.mock(cls=WasteChute)

    decoy.when(waste_chute.offset).then_return(DisposalOffset(x=4, y=5, z=6))
    decoy.when(
        mock_engine_client.state.tips.get_pipette_channels("abc123")
    ).then_return(96)

    subject.drop_tip_in_disposal_location(
        waste_chute, home_after=True, alternate_tip_drop=True
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToAddressableAreaParams(
                pipetteId="abc123",
                addressableAreaName="96ChannelWasteChute",
                offset=AddressableOffsetVector(x=4, y=5, z=6),
                forceDirect=False,
                speed=None,
                minimumZHeight=None,
            )
        ),
        mock_engine_client.execute_command(
            cmd.DropTipInPlaceParams(
                pipetteId="abc123",
                homeAfter=True,
            )
        ),
    )


def test_aspirate_from_well(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should aspirate from a well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_liquid_handling_well_location(
            labware_id="123abc",
            well_name="my cool well",
            absolute_point=Point(1, 2, 3),
            is_meniscus=None,
        )
    ).then_return(
        LiquidHandlingWellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
        )
    )

    subject.aspirate(
        location=location,
        well_core=well_core,
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        in_place=False,
        correction_volume=123,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.AspirateParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=LiquidHandlingWellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
                volume=12.34,
                flowRate=7.8,
                correctionVolume=123,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_aspirate_from_coordinates(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should aspirate from coordinates."""
    location = Location(point=Point(1, 2, 3), labware=None)
    subject.aspirate(
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        well_core=None,
        location=location,
        in_place=False,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToCoordinatesParams(
                pipetteId="abc123",
                coordinates=DeckPoint(x=1, y=2, z=3),
                minimumZHeight=None,
                forceDirect=False,
                speed=None,
            )
        ),
        mock_engine_client.execute_command(
            cmd.AspirateInPlaceParams(
                pipetteId="abc123",
                volume=12.34,
                flowRate=7.8,
                correctionVolume=None,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_aspirate_from_meniscus(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should aspirate from a well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_liquid_handling_well_location(
            labware_id="123abc",
            well_name="my cool well",
            absolute_point=Point(1, 2, 3),
            is_meniscus=True,
        )
    ).then_return(
        LiquidHandlingWellLocation(
            origin=WellOrigin.MENISCUS, offset=WellOffset(x=3, y=2, z=1), volumeOffset=0
        )
    )

    subject.aspirate(
        location=location,
        well_core=well_core,
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        in_place=False,
        is_meniscus=True,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.MENISCUS,
                offset=WellOffset(x=3, y=2, z=1),
                volumeOffset="operationVolume",
            ),
        ),
        mock_engine_client.execute_command(
            cmd.AspirateParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=LiquidHandlingWellLocation(
                    origin=WellOrigin.MENISCUS,
                    offset=WellOffset(x=3, y=2, z=1),
                    volumeOffset="operationVolume",
                ),
                volume=12.34,
                flowRate=7.8,
                correctionVolume=None,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_aspirate_in_place(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should aspirate in place."""
    location = Location(point=Point(1, 2, 3), labware=None)
    subject.aspirate(
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        well_core=None,
        location=location,
        in_place=True,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.AspirateInPlaceParams(
                pipetteId="abc123",
                volume=12.34,
                flowRate=7.8,
                correctionVolume=None,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_blow_out_to_well(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should blow out from a well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )

    decoy.when(
        mock_engine_client.state.geometry.get_relative_well_location(
            labware_id="123abc", well_name="my cool well", absolute_point=Point(1, 2, 3)
        )
    ).then_return(WellLocation(origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)))

    subject.blow_out(location=location, well_core=well_core, in_place=False)

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=WellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.BlowOutParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
                flowRate=6.7,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_blow_to_coordinates(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should move to coordinate and blow out in place."""
    location = Location(point=Point(1, 2, 3), labware=None)

    subject.blow_out(location=location, well_core=None, in_place=False)

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToCoordinatesParams(
                pipetteId="abc123",
                coordinates=DeckPoint(x=1, y=2, z=3),
                minimumZHeight=None,
                speed=None,
                forceDirect=False,
            )
        ),
        mock_engine_client.execute_command(
            cmd.BlowOutInPlaceParams(
                pipetteId="abc123",
                flowRate=6.7,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_blow_out_in_place(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """Should blow-out in place."""
    location = Location(point=Point(1, 2, 3), labware=None)
    subject.blow_out(
        location=location,
        well_core=None,
        in_place=True,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.BlowOutInPlaceParams(
                pipetteId="abc123",
                flowRate=6.7,
            )
        ),
    )


def test_dispense_to_well(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should dispense to a well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )

    decoy.when(mock_protocol_core.api_version).then_return(MAX_SUPPORTED_VERSION)

    decoy.when(
        mock_engine_client.state.geometry.get_relative_liquid_handling_well_location(
            labware_id="123abc",
            well_name="my cool well",
            absolute_point=Point(1, 2, 3),
            is_meniscus=None,
        )
    ).then_return(
        LiquidHandlingWellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
        )
    )

    subject.dispense(
        location=location,
        well_core=well_core,
        volume=12.34,
        rate=5.6,
        flow_rate=6.0,
        in_place=False,
        correction_volume=321,
        push_out=7,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=LiquidHandlingWellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.DispenseParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=LiquidHandlingWellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=3, y=2, z=1)
                ),
                volume=12.34,
                flowRate=6.0,
                correctionVolume=321,
                pushOut=7,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_dispense_in_place(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should dispense in place."""
    decoy.when(mock_protocol_core.api_version).then_return(MAX_SUPPORTED_VERSION)
    location = Location(point=Point(1, 2, 3), labware=None)
    subject.dispense(
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        well_core=None,
        location=location,
        in_place=True,
        push_out=None,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.DispenseInPlaceParams(
                pipetteId="abc123",
                volume=12.34,
                correctionVolume=None,
                flowRate=7.8,
                pushOut=None,
            )
        ),
    )


def test_dispense_to_coordinates(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
) -> None:
    """It should dispense in place."""
    decoy.when(mock_protocol_core.api_version).then_return(MAX_SUPPORTED_VERSION)
    location = Location(point=Point(1, 2, 3), labware=None)
    subject.dispense(
        volume=12.34,
        rate=5.6,
        flow_rate=7.8,
        well_core=None,
        location=location,
        in_place=False,
        push_out=None,
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.MoveToCoordinatesParams(
                pipetteId="abc123",
                coordinates=DeckPoint(x=1, y=2, z=3),
                minimumZHeight=None,
                forceDirect=False,
                speed=None,
            )
        ),
        mock_engine_client.execute_command(
            cmd.DispenseInPlaceParams(
                pipetteId="abc123",
                volume=12.34,
                correctionVolume=None,
                flowRate=7.8,
                pushOut=None,
            )
        ),
    )


@pytest.mark.parametrize(
    ("api_version", "expect_clampage"),
    [(APIVersion(2, 16), True), (APIVersion(2, 17), False)],
)
def test_dispense_conditionally_clamps_volume(
    api_version: APIVersion,
    expect_clampage: bool,
    decoy: Decoy,
    subject: InstrumentCore,
    mock_protocol_core: ProtocolCore,
    mock_engine_client: SyncClient,
) -> None:
    """It should clamp the dispensed volume to the available volume on older API versions."""
    decoy.when(mock_protocol_core.api_version).then_return(api_version)
    decoy.when(
        mock_engine_client.state.pipettes.get_aspirated_volume(subject.pipette_id)
    ).then_return(111.111)

    subject.dispense(
        volume=99999999.99999999,
        rate=5.6,
        flow_rate=7.8,
        well_core=None,
        location=Location(point=Point(1, 2, 3), labware=None),
        in_place=True,
        push_out=None,
    )

    if expect_clampage:
        decoy.verify(
            mock_engine_client.execute_command(
                cmd.DispenseInPlaceParams(
                    pipetteId="abc123",
                    volume=111.111,
                    correctionVolume=None,
                    flowRate=7.8,
                    pushOut=None,
                )
            ),
        )
    else:
        decoy.verify(
            mock_engine_client.execute_command(
                cmd.DispenseInPlaceParams(
                    pipetteId="abc123",
                    volume=99999999.99999999,
                    flowRate=7.8,
                    correctionVolume=None,
                    pushOut=None,
                )
            ),
        )


def test_initialization_sets_default_movement_speed(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should set a default movement speed as soon as it's initialized."""
    decoy.verify(
        mock_engine_client.set_pipette_movement_speed(
            pipette_id="abc123", speed=39339.5
        )
    )


def test_set_default_speed(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should delegate to the engine client to set the pipette's movement speed."""
    subject.set_default_speed(speed=9000.1)
    decoy.verify(
        mock_engine_client.set_pipette_movement_speed(
            pipette_id=subject.pipette_id, speed=9000.1
        )
    )


def test_get_default_speed(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should delegate to the engine client to set the pipette's movement speed."""
    decoy.when(
        mock_engine_client.state.pipettes.get_movement_speed(
            pipette_id=subject.pipette_id
        )
    ).then_return(9000.1)
    assert subject.get_default_speed() == 9000.1


def test_get_model(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's model name."""
    decoy.when(
        mock_engine_client.state.pipettes.get_model_name(pipette_id=subject.pipette_id)
    ).then_return("pipette-model")
    assert subject.get_model() == "pipette-model"


def test_get_display_name(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's display name."""
    decoy.when(
        mock_engine_client.state.pipettes.get_display_name(
            pipette_id=subject.pipette_id
        )
    ).then_return("display-name")
    assert subject.get_display_name() == "display-name"


def test_get_min_volume(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's min volume."""
    decoy.when(
        mock_engine_client.state.pipettes.get_minimum_volume(
            pipette_id=subject.pipette_id
        )
    ).then_return(1.23)
    assert subject.get_min_volume() == 1.23


def test_get_max_volume(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's max volume."""
    decoy.when(
        mock_engine_client.state.pipettes.get_maximum_volume(
            pipette_id=subject.pipette_id
        )
    ).then_return(4.56)
    assert subject.get_max_volume() == 4.56


def test_get_working_volume(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's working volume."""
    decoy.when(
        mock_engine_client.state.pipettes.get_working_volume(
            pipette_id=subject.pipette_id
        )
    ).then_return(7.89)
    assert subject.get_working_volume() == 7.89


def test_get_channels(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's number of channels."""
    decoy.when(
        mock_engine_client.state.tips.get_pipette_channels(
            pipette_id=subject.pipette_id
        )
    ).then_return(42)
    assert subject.get_channels() == 42


def test_get_current_volume(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's current volume."""
    decoy.when(
        mock_engine_client.state.pipettes.get_aspirated_volume(
            pipette_id=subject.pipette_id
        )
    ).then_return(123.4)
    assert subject.get_current_volume() == 123.4


def test_get_current_volume_returns_zero_when_no_tip_attached(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should return 0 when an exception is raised."""
    decoy.when(
        mock_engine_client.state.pipettes.get_aspirated_volume(
            pipette_id=subject.pipette_id
        )
    ).then_raise(TipNotAttachedError())
    assert subject.get_current_volume() == 0


def test_get_available_volume_returns_zero_no_tip_attached(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should return 0 when an exception is raised."""
    decoy.when(
        mock_engine_client.state.pipettes.get_available_volume(
            pipette_id=subject.pipette_id
        )
    ).then_raise(TipNotAttachedError())
    assert subject.get_available_volume() == 0


def test_get_available_volume(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should get the pipette's available volume."""
    decoy.when(
        mock_engine_client.state.pipettes.get_available_volume(
            pipette_id=subject.pipette_id
        )
    ).then_return(9001)
    assert subject.get_available_volume() == 9001


def test_home_z(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should home its Z-stage and plunger."""
    decoy.when(mock_engine_client.state.pipettes.get_z_axis("abc123")).then_return(
        MotorAxis.RIGHT_Z
    )
    decoy.when(
        mock_engine_client.state.pipettes.get_plunger_axis("abc123")
    ).then_return(MotorAxis.RIGHT_PLUNGER)

    subject.home()

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.HomeParams(axes=[MotorAxis.RIGHT_Z, MotorAxis.RIGHT_PLUNGER])
        ),
        times=1,
    )


def test_home_plunger(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should home its plunger."""
    decoy.when(
        mock_engine_client.state.pipettes.get_plunger_axis("abc123")
    ).then_return(MotorAxis.LEFT_PLUNGER)

    subject.home_plunger()

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.HomeParams(axes=[MotorAxis.LEFT_PLUNGER])
        ),
        times=1,
    )


def test_touch_tip(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
) -> None:
    """It should touch the tip to the edges of the well."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )

    subject.touch_tip(
        location=location,
        well_core=well_core,
        radius=1.23,
        z_offset=4.56,
        speed=7.89,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=WellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=4.56)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.TouchTipParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=4.56)
                ),
                radius=1.23,
                speed=7.89,
                mmFromEdge=None,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_touch_tip_with_mm_from_edge(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
) -> None:
    """It should touch the tip to the edges of the well with mm_from_edge."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )
    subject.touch_tip(
        location=location,
        well_core=well_core,
        radius=1.0,
        z_offset=4.56,
        speed=7.89,
        mm_from_edge=9.87,
    )

    decoy.verify(
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=mock_engine_client.state,
            pipette_id="abc123",
            labware_id="123abc",
            well_name="my cool well",
            well_location=WellLocation(
                origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=4.56)
            ),
        ),
        mock_engine_client.execute_command(
            cmd.TouchTipParams(
                pipetteId="abc123",
                labwareId="123abc",
                wellName="my cool well",
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=4.56)
                ),
                radius=1.0,
                speed=7.89,
                mmFromEdge=9.87,
            )
        ),
        mock_protocol_core.set_last_location(location=location, mount=Mount.LEFT),
    )


def test_touch_tip_raises_with_radius_and_mm_from_edge(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
) -> None:
    """It should raise if a value of not 1.0 and a mm_from_edge argument is given."""
    location = Location(point=Point(1, 2, 3), labware=None)

    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )
    with pytest.raises(ValueError):
        subject.touch_tip(
            location=location,
            well_core=well_core,
            radius=1.23,
            z_offset=4.56,
            speed=7.89,
            mm_from_edge=9.87,
        )


def test_has_tip(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should return tip state."""
    decoy.when(
        mock_engine_client.state.pipettes.get_attached_tip("abc123")
    ).then_return(TipGeometry(length=1, diameter=2, volume=3))

    assert subject.has_tip() is True


def test_liquid_presence_detection(
    decoy: Decoy,
    subject: InstrumentCore,
    mock_engine_client: EngineClient,
) -> None:
    """It should have a default liquid presence detection boolean set to False."""
    decoy.when(
        mock_engine_client.state.pipettes.get_liquid_presence_detection(
            subject.pipette_id
        )
    ).then_return(False)
    assert subject.get_liquid_presence_detection() is False


@pytest.mark.parametrize(
    argnames=[
        "style",
        "primary_nozzle",
        "front_right_nozzle",
        "back_left_nozzle",
        "expected_model",
    ],
    argvalues=[
        [
            NozzleLayout.COLUMN,
            "A1",
            "H1",
            None,
            ColumnNozzleLayoutConfiguration(primaryNozzle="A1"),
        ],
        [
            NozzleLayout.SINGLE,
            "H12",
            None,
            None,
            SingleNozzleLayoutConfiguration(primaryNozzle="H12"),
        ],
        [
            NozzleLayout.ROW,
            "A12",
            None,
            None,
            RowNozzleLayoutConfiguration(primaryNozzle="A12"),
        ],
    ],
)
def test_configure_nozzle_layout(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
    style: NozzleLayout,
    primary_nozzle: Optional[str],
    front_right_nozzle: Optional[str],
    back_left_nozzle: Optional[str],
    expected_model: NozzleLayoutConfigurationType,
) -> None:
    """The correct model is passed to the engine client."""
    subject.configure_nozzle_layout(
        style, primary_nozzle, front_right_nozzle, back_left_nozzle
    )

    decoy.verify(
        mock_engine_client.execute_command(
            cmd.ConfigureNozzleLayoutParams(
                pipetteId=subject._pipette_id, configurationParams=expected_model
            )
        )
    )


@pytest.mark.parametrize(
    argnames=["pipette_channels", "nozzle_layout", "primary_nozzle", "expected_result"],
    argvalues=[
        (96, NozzleConfigurationType.FULL, "A1", True),
        (96, NozzleConfigurationType.ROW, "A1", True),
        (96, NozzleConfigurationType.COLUMN, "A1", True),
        (96, NozzleConfigurationType.COLUMN, "A12", True),
        (96, NozzleConfigurationType.SINGLE, "H12", True),
        (96, NozzleConfigurationType.SINGLE, "A1", True),
        (8, NozzleConfigurationType.FULL, "A1", True),
        (8, NozzleConfigurationType.SINGLE, "H1", True),
        (8, NozzleConfigurationType.SINGLE, "A1", True),
    ],
)
def test_is_tip_tracking_available(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
    pipette_channels: int,
    nozzle_layout: NozzleConfigurationType,
    primary_nozzle: str,
    expected_result: bool,
) -> None:
    """It should return whether tip tracking is available based on nozzle configuration."""
    decoy.when(
        mock_engine_client.state.tips.get_pipette_channels(subject.pipette_id)
    ).then_return(pipette_channels)
    decoy.when(
        mock_engine_client.state.pipettes.get_nozzle_layout_type(subject.pipette_id)
    ).then_return(nozzle_layout)
    decoy.when(
        mock_engine_client.state.pipettes.get_primary_nozzle(subject.pipette_id)
    ).then_return(primary_nozzle)
    assert subject.is_tip_tracking_available() == expected_result


@pytest.mark.parametrize("version", versions_below(APIVersion(2, 19), flex_only=False))
def test_configure_for_volume_pre_219(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
    version: APIVersion,
) -> None:
    """Configure_for_volume should specify overlap version."""
    decoy.when(mock_protocol_core.api_version).then_return(version)
    subject.configure_for_volume(123.0)
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.ConfigureForVolumeParams(
                pipetteId=subject.pipette_id,
                volume=123.0,
                tipOverlapNotAfterVersion="v0",
            )
        )
    )


@pytest.mark.parametrize("version", versions_at_or_above(APIVersion(2, 19)))
def test_configure_for_volume_post_219(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
    version: APIVersion,
) -> None:
    """Configure_for_volume should specify overlap version."""
    decoy.when(mock_protocol_core.api_version).then_return(version)
    subject.configure_for_volume(123.0)
    try:
        decoy.verify(
            mock_engine_client.execute_command(
                cmd.ConfigureForVolumeParams(
                    pipetteId=subject.pipette_id,
                    volume=123.0,
                    tipOverlapNotAfterVersion="v1",
                )
            )
        )
    except errors.VerifyError:
        decoy.verify(
            mock_engine_client.execute_command(
                cmd.ConfigureForVolumeParams(
                    pipetteId=subject.pipette_id,
                    volume=123.0,
                    tipOverlapNotAfterVersion="v3",
                )
            )
        )


@pytest.mark.parametrize(
    ("returned_from_engine", "expected_return_from_core"),
    [
        (None, False),
        (0, True),
        (1, True),
    ],
)
def test_detect_liquid_presence(
    returned_from_engine: Optional[float],
    expected_return_from_core: bool,
    decoy: Decoy,
    mock_protocol_core: ProtocolCore,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
) -> None:
    """It should convert a height result from the engine to True/False."""
    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.TryLiquidProbeParams(
                pipetteId=subject.pipette_id,
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=0)
                ),
                wellName=well_core.get_name(),
                labwareId=well_core.labware_id,
            )
        )
    ).then_return(
        cmd.TryLiquidProbeResult.model_construct(
            z_position=returned_from_engine,
            position=object(),  # type: ignore[arg-type]
        )
    )
    loc = Location(Point(0, 0, 0), None)

    result = subject.detect_liquid_presence(well_core=well_core, loc=loc)
    assert result == expected_return_from_core

    decoy.verify(mock_protocol_core.set_last_location(loc, mount=subject.get_mount()))


def test_liquid_probe_without_recovery(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
) -> None:
    """It should raise an exception on an empty well and return a float on a valid well."""
    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LiquidProbeParams(
                pipetteId=subject.pipette_id,
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=2)
                ),
                wellName=well_core.get_name(),
                labwareId=well_core.labware_id,
            )
        )
    ).then_raise(PipetteLiquidNotFoundError())
    loc = Location(Point(0, 0, 0), None)
    with pytest.raises(PipetteLiquidNotFoundError):
        subject.liquid_probe_without_recovery(well_core=well_core, loc=loc)


def test_liquid_probe_with_recovery(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
) -> None:
    """It should not raise an exception on an empty well."""
    well_core = WellCore(
        name="my cool well", labware_id="123abc", engine_client=mock_engine_client
    )
    loc = Location(Point(0, 0, 0), None)
    subject.liquid_probe_with_recovery(well_core=well_core, loc=loc)
    decoy.verify(
        mock_engine_client.execute_command(
            cmd.LiquidProbeParams(
                pipetteId=subject.pipette_id,
                wellLocation=WellLocation(
                    origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=2.0)
                ),
                wellName=well_core.get_name(),
                labwareId=well_core.labware_id,
            )
        )
    )


@pytest.mark.parametrize("version", versions_at_or_above(APIVersion(2, 23)))
def test_load_liquid_class(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    mock_protocol_core: ProtocolCore,
    subject: InstrumentCore,
    minimal_liquid_class_def2: LiquidClassSchemaV1,
    version: APIVersion,
) -> None:
    """It should send the load liquid class command to the engine."""
    sample_aspirate_data = minimal_liquid_class_def2.byPipette[0].byTipType[0].aspirate
    sample_single_dispense_data = (
        minimal_liquid_class_def2.byPipette[0].byTipType[0].singleDispense
    )
    sample_multi_dispense_data = (
        minimal_liquid_class_def2.byPipette[0].byTipType[0].multiDispense
    )

    decoy.when(mock_protocol_core.api_version).then_return(version)
    test_liq_class = decoy.mock(cls=LiquidClass)
    test_transfer_props = decoy.mock(cls=TransferProperties)

    decoy.when(mock_engine_client.state.pipettes.get("abc123")).then_return(
        LoadedPipette.model_construct(pipetteName=PipetteNameType.P50_SINGLE_FLEX)  # type: ignore[call-arg]
    )
    decoy.when(
        test_liq_class.get_for("flex_1channel_50", "opentrons_flex_96_tiprack_50ul")
    ).then_return(test_transfer_props)
    decoy.when(test_liq_class.name).then_return("water")
    decoy.when(
        mock_engine_client.state.pipettes.get_model_name(subject.pipette_id)
    ).then_return("flex_1channel_50")
    decoy.when(test_transfer_props.aspirate.as_shared_data_model()).then_return(
        sample_aspirate_data
    )
    decoy.when(test_transfer_props.dispense.as_shared_data_model()).then_return(
        sample_single_dispense_data
    )
    decoy.when(test_transfer_props.multi_dispense.as_shared_data_model()).then_return(  # type: ignore[union-attr]
        sample_multi_dispense_data
    )
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.LoadLiquidClassParams(
                liquidClassRecord=LiquidClassRecord(
                    liquidClassName="water",
                    pipetteModel="flex_1channel_50",
                    tiprack="opentrons_flex_96_tiprack_50ul",
                    aspirate=sample_aspirate_data,
                    singleDispense=sample_single_dispense_data,
                    multiDispense=sample_multi_dispense_data,
                )
            )
        )
    ).then_return(cmd.LoadLiquidClassResult(liquidClassId="liquid-class-id"))
    result = subject.load_liquid_class(
        name=test_liq_class.name,
        transfer_properties=test_transfer_props,
        tiprack_uri="opentrons_flex_96_tiprack_50ul",
    )
    assert result == "liquid-class-id"


def test_aspirate_liquid_class(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
    minimal_liquid_class_def2: LiquidClassSchemaV1,
    mock_transfer_components_executor: TransferComponentsExecutor,
) -> None:
    """It should call aspirate sub-steps execution based on liquid class."""
    source_well = decoy.mock(cls=WellCore)
    source_location = Location(Point(1, 2, 3), labware=None)
    test_liquid_class = LiquidClass.create(minimal_liquid_class_def2)
    test_transfer_properties = test_liquid_class.get_for(
        "flex_1channel_50", "opentrons_flex_96_tiprack_50ul"
    )
    decoy.when(
        transfer_components_executor.absolute_point_from_position_reference_and_offset(
            well=source_well,
            position_reference=PositionReference.WELL_BOTTOM,
            offset=Coordinate(x=0, y=0, z=-5),
        )
    ).then_return(Point(1, 2, 3))
    decoy.when(
        transfer_components_executor.TransferComponentsExecutor(
            instrument_core=subject,
            transfer_properties=test_transfer_properties,
            target_location=Location(Point(1, 2, 3), labware=None),
            target_well=source_well,
            transfer_type=TransferType.ONE_TO_ONE,
            tip_state=TipState(),
        )
    ).then_return(mock_transfer_components_executor)
    decoy.when(
        mock_transfer_components_executor.tip_state.last_liquid_and_air_gap_in_tip
    ).then_return(LiquidAndAirGapPair(liquid=111, air_gap=222))
    result = subject.aspirate_liquid_class(
        volume=123,
        source=(source_location, source_well),
        transfer_properties=test_transfer_properties,
        transfer_type=TransferType.ONE_TO_ONE,
        tip_contents=[],
    )
    decoy.verify(
        mock_transfer_components_executor.submerge(
            submerge_properties=test_transfer_properties.aspirate.submerge,
        ),
        mock_transfer_components_executor.mix(
            mix_properties=test_transfer_properties.aspirate.mix,
            last_dispense_push_out=False,
        ),
        mock_transfer_components_executor.pre_wet(volume=123),
        mock_transfer_components_executor.aspirate_and_wait(volume=123),
        mock_transfer_components_executor.retract_after_aspiration(volume=123),
    )
    assert result == [LiquidAndAirGapPair(air_gap=222, liquid=111)]


def test_aspirate_liquid_class_raises_for_more_than_max_volume(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
    minimal_liquid_class_def2: LiquidClassSchemaV1,
    mock_transfer_components_executor: TransferComponentsExecutor,
) -> None:
    """It should call aspirate sub-steps execution based on liquid class."""
    source_well = decoy.mock(cls=WellCore)
    source_location = Location(Point(1, 2, 3), labware=None)
    test_liquid_class = LiquidClass.create(minimal_liquid_class_def2)
    test_transfer_properties = test_liquid_class.get_for(
        "flex_1channel_50", "opentrons_flex_96_tiprack_50ul"
    )
    decoy.when(
        mock_engine_client.state.pipettes.get_working_volume("abc123")
    ).then_return(100)
    decoy.when(
        tx_commons.check_valid_volume_parameters(
            disposal_volume=0,
            air_gap=test_transfer_properties.aspirate.retract.air_gap_by_volume.get_for_volume(
                123
            ),
            max_volume=100,
        )
    ).then_raise(ValueError("Oh oh!"))
    with pytest.raises(ValueError, match="Oh oh!"):
        subject.aspirate_liquid_class(
            volume=123,
            source=(source_location, source_well),
            transfer_properties=test_transfer_properties,
            transfer_type=TransferType.ONE_TO_ONE,
            tip_contents=[],
        )


def test_dispense_liquid_class(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
    minimal_liquid_class_def2: LiquidClassSchemaV1,
    mock_transfer_components_executor: TransferComponentsExecutor,
) -> None:
    """It should call dispense sub-steps execution based on liquid class."""
    source_well = decoy.mock(cls=WellCore)
    source_location = Location(Point(1, 2, 3), labware=None)
    dest_well = decoy.mock(cls=WellCore)
    dest_location = Location(Point(3, 2, 1), labware=None)
    test_liquid_class = LiquidClass.create(minimal_liquid_class_def2)
    test_transfer_properties = test_liquid_class.get_for(
        "flex_1channel_50", "opentrons_flex_96_tiprack_50ul"
    )
    push_out_vol = test_transfer_properties.dispense.push_out_by_volume.get_for_volume(
        123
    )
    decoy.when(
        transfer_components_executor.absolute_point_from_position_reference_and_offset(
            well=dest_well,
            position_reference=PositionReference.WELL_BOTTOM,
            offset=Coordinate(x=0, y=0, z=-5),
        )
    ).then_return(Point(1, 2, 3))
    decoy.when(
        transfer_components_executor.TransferComponentsExecutor(
            instrument_core=subject,
            transfer_properties=test_transfer_properties,
            target_location=Location(Point(1, 2, 3), labware=None),
            target_well=dest_well,
            transfer_type=TransferType.ONE_TO_ONE,
            tip_state=TipState(),
        )
    ).then_return(mock_transfer_components_executor)
    decoy.when(
        mock_transfer_components_executor.tip_state.last_liquid_and_air_gap_in_tip
    ).then_return(LiquidAndAirGapPair(liquid=333, air_gap=444))
    result = subject.dispense_liquid_class(
        volume=123,
        dest=(dest_location, dest_well),
        source=(source_location, source_well),
        transfer_properties=test_transfer_properties,
        transfer_type=TransferType.ONE_TO_ONE,
        tip_contents=[],
        add_final_air_gap=True,
        trash_location=Location(Point(1, 2, 3), labware=None),
    )
    decoy.verify(
        mock_transfer_components_executor.submerge(
            submerge_properties=test_transfer_properties.dispense.submerge,
        ),
        mock_transfer_components_executor.dispense_and_wait(
            volume=123,
            push_out_override=push_out_vol,
        ),
        mock_transfer_components_executor.mix(
            mix_properties=test_transfer_properties.dispense.mix,
            last_dispense_push_out=True,
        ),
        mock_transfer_components_executor.retract_after_dispensing(
            trash_location=Location(Point(1, 2, 3), labware=None),
            source_location=source_location,
            source_well=source_well,
            add_final_air_gap=True,
        ),
    )
    assert result == [LiquidAndAirGapPair(air_gap=444, liquid=333)]


def test_get_next_tip(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
) -> None:
    """It should return the next tip result."""
    tip_racks = [decoy.mock(cls=LabwareCore)]
    expected_next_tip = NextTipInfo(labwareId="1234", tipStartingWell="BAR")
    decoy.when(tip_racks[0].labware_id).then_return("tiprack-id")
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.GetNextTipParams(
                pipetteId="abc123", labwareIds=["tiprack-id"], startingTipWell="F00"
            )
        )
    ).then_return(GetNextTipResult(nextTipInfo=expected_next_tip))
    result = subject.get_next_tip(
        tip_racks=tip_racks,
        starting_well="F00",
    )
    assert result == expected_next_tip


def test_get_next_tip_when_no_tip_available(
    decoy: Decoy,
    mock_engine_client: EngineClient,
    subject: InstrumentCore,
) -> None:
    """It should return None when there's no next tip available."""
    tip_racks = [decoy.mock(cls=LabwareCore)]
    decoy.when(tip_racks[0].labware_id).then_return("tiprack-id")
    decoy.when(
        mock_engine_client.execute_command_without_recovery(
            cmd.GetNextTipParams(
                pipetteId="abc123", labwareIds=["tiprack-id"], startingTipWell="F00"
            )
        )
    ).then_return(
        GetNextTipResult(
            nextTipInfo=NoTipAvailable(noTipReason=NoTipReason.NO_AVAILABLE_TIPS)
        )
    )
    result = subject.get_next_tip(
        tip_racks=tip_racks,
        starting_well="F00",
    )
    assert result is None
