"""Tests for the ProtocolContext public interface."""
import inspect
from typing import cast

import pytest
from decoy import Decoy, matchers

from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.labware.types import LabwareDefinition as LabwareDefDict
from opentrons_shared_data.robot.types import RobotTypeEnum, RobotType

from opentrons.protocol_api._liquid import LiquidClass
from opentrons.types import Mount, DeckSlotName, StagingSlotName
from opentrons.config import feature_flags as ff
from opentrons.protocol_api import OFF_DECK
from opentrons.legacy_broker import LegacyBroker
from opentrons.hardware_control.modules.types import ModuleType, TemperatureModuleModel
from opentrons.protocols.api_support import instrument as mock_instrument_support
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.util import (
    APIVersionError,
    RobotTypeError,
    UnsupportedAPIError,
)
from opentrons.protocol_api import (
    MAX_SUPPORTED_VERSION,
    ProtocolContext,
    InstrumentContext,
    ModuleContext,
    TemperatureModuleContext,
    MagneticModuleContext,
    MagneticBlockContext,
    Labware,
    Deck,
    validation as mock_validation,
    Liquid,
)
from opentrons.protocol_api.core.core_map import LoadedCoreMap
from opentrons.protocol_api.core.labware import LabwareLoadParams
from opentrons.protocol_api.core.common import (
    InstrumentCore,
    LabwareCore,
    ProtocolCore,
    TemperatureModuleCore,
    MagneticModuleCore,
    MagneticBlockCore,
)
from opentrons.protocol_api.disposal_locations import TrashBin, WasteChute
from opentrons.protocols.api_support.deck_type import (
    NoTrashDefinedError,
)
from opentrons.protocol_engine.errors import LabwareMovementNotAllowedError
from opentrons.protocol_engine.clients import SyncClient as EngineClient


@pytest.fixture(autouse=True)
def _mock_validation_module(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    for name, func in inspect.getmembers(mock_validation, inspect.isfunction):
        monkeypatch.setattr(mock_validation, name, decoy.mock(func=func))


@pytest.fixture(autouse=True)
def _mock_instrument_support_module(
    decoy: Decoy, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name, func in inspect.getmembers(mock_instrument_support, inspect.isfunction):
        monkeypatch.setattr(mock_instrument_support, name, decoy.mock(func=func))


@pytest.fixture
def mock_core(decoy: Decoy) -> ProtocolCore:
    """Get a mock implementation core."""
    mock_core = decoy.mock(cls=ProtocolCore)
    mock_fixed_trash = decoy.mock(cls=LabwareCore)
    decoy.when(mock_core.fixed_trash).then_return(mock_fixed_trash)
    decoy.when(mock_fixed_trash.get_name()).then_return("cool trash")
    decoy.when(mock_fixed_trash.get_display_name()).then_return("Cool Trash")
    decoy.when(mock_fixed_trash.get_well_columns()).then_return([])
    return mock_core


@pytest.fixture
def mock_core_map(decoy: Decoy) -> LoadedCoreMap:
    """Get a mock LoadedCoreMap."""
    return decoy.mock(cls=LoadedCoreMap)


@pytest.fixture
def mock_deck(decoy: Decoy) -> Deck:
    """Get a mock Deck."""
    return decoy.mock(cls=Deck)


@pytest.fixture
def mock_fixed_trash(decoy: Decoy) -> Labware:
    """Get a mock Fixed Trash."""
    return decoy.mock(cls=Labware)


@pytest.fixture
def api_version() -> APIVersion:
    """The API version under test."""
    return MAX_SUPPORTED_VERSION


@pytest.fixture
def mock_engine_client(decoy: Decoy) -> EngineClient:
    """Get a mock ProtocolEngine synchronous client."""
    return decoy.mock(cls=EngineClient)


@pytest.fixture
def subject(
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    mock_deck: Deck,
    api_version: APIVersion,
    mock_fixed_trash: Labware,
    decoy: Decoy,
) -> ProtocolContext:
    """Get a ProtocolContext test subject with its dependencies mocked out."""
    decoy.when(mock_core_map.get(mock_core.fixed_trash)).then_return(mock_fixed_trash)
    return ProtocolContext(
        api_version=api_version,
        core=mock_core,
        core_map=mock_core_map,
        deck=mock_deck,
    )


def test_legacy_trash_loading(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    mock_fixed_trash: Labware,
    mock_deck: Deck,
) -> None:
    """It should load a trash labware on init on API level 2.15 and below."""
    decoy.when(mock_core_map.get(mock_core.fixed_trash)).then_return(mock_fixed_trash)
    context = ProtocolContext(
        api_version=APIVersion(2, 15),
        core=mock_core,
        core_map=mock_core_map,
        deck=mock_deck,
    )
    assert mock_fixed_trash == context.fixed_trash
    decoy.verify(mock_core.append_disposal_location(mock_fixed_trash))


def test_automatic_ot2_trash_loading(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    mock_deck: Deck,
) -> None:
    """It should load a trash labware on init on API level 2.15 and below."""
    decoy.when(mock_core.robot_type).then_return("OT-2 Standard")
    ProtocolContext(
        api_version=APIVersion(2, 16),
        core=mock_core,
        core_map=mock_core_map,
        deck=mock_deck,
    )
    decoy.verify(mock_core.load_ot2_fixed_trash_bin())


def test_fixed_trash(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    subject: ProtocolContext,
) -> None:
    """It should get the fixed trash labware from the core."""
    trash_captor = matchers.Captor()

    assert mock_core.fixed_trash is not None
    decoy.verify(mock_core_map.add(mock_core.fixed_trash, trash_captor), times=1)

    trash = trash_captor.value

    decoy.when(mock_core_map.get(mock_core.fixed_trash)).then_return(trash)
    decoy.when(mock_core.get_disposal_locations()).then_return([trash])
    result = subject.fixed_trash

    assert result is trash
    assert isinstance(result, Labware)
    assert result.name == "cool trash"


def test_deck(subject: ProtocolContext) -> None:
    """It should have a Deck interface."""
    result = subject.deck
    assert isinstance(result, Deck)


@pytest.mark.parametrize("api_version", [APIVersion(2, 20)])
def test_load_instrument_robot_type(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """Non-Flex robot type should raise a ValueError."""
    mock_tip_racks = [decoy.mock(cls=Labware), decoy.mock(cls=Labware)]

    decoy.when(mock_validation.ensure_lowercase_name("Gandalf")).then_return("gandalf")
    decoy.when(mock_validation.ensure_pipette_name("gandalf")).then_return(
        PipetteNameType.P300_SINGLE
    )
    decoy.when(
        mock_validation.ensure_mount_for_pipette(
            "shadowfax", PipetteNameType.P300_SINGLE
        )
    ).then_return(Mount.LEFT)
    decoy.when(mock_core.robot_type).then_return("OT-2 Standard")

    with pytest.raises(RobotTypeError):
        subject.load_instrument(
            instrument_name="Gandalf",
            mount="shadowfax",
            tip_racks=mock_tip_racks,
            liquid_presence_detection=False,
        )


@pytest.mark.parametrize("api_version", [APIVersion(2, 14)])
def test_load_instrument_api_version(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """Using an API Version prior to 2.20 should raise a APIVersionError."""
    mock_tip_racks = [decoy.mock(cls=Labware), decoy.mock(cls=Labware)]

    decoy.when(mock_validation.ensure_lowercase_name("Gandalf")).then_return("gandalf")
    decoy.when(mock_validation.ensure_pipette_name("gandalf")).then_return(
        PipetteNameType.P300_SINGLE
    )
    decoy.when(
        mock_validation.ensure_mount_for_pipette(
            "shadowfax", PipetteNameType.P300_SINGLE
        )
    ).then_return(Mount.LEFT)
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")

    with pytest.raises(APIVersionError):
        subject.load_instrument(
            instrument_name="Gandalf",
            mount="shadowfax",
            tip_racks=mock_tip_racks,
            liquid_presence_detection=False,
        )


def test_load_instrument(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should create an instrument using its execution core."""
    mock_instrument_core = decoy.mock(cls=InstrumentCore)
    mock_tip_racks = [decoy.mock(cls=Labware), decoy.mock(cls=Labware)]

    decoy.when(mock_validation.ensure_lowercase_name("Gandalf")).then_return("gandalf")
    decoy.when(mock_validation.ensure_pipette_name("gandalf")).then_return(
        PipetteNameType.P300_SINGLE
    )
    decoy.when(
        mock_validation.ensure_mount_for_pipette(
            "shadowfax", PipetteNameType.P300_SINGLE
        )
    ).then_return(Mount.LEFT)

    decoy.when(
        mock_core.load_instrument(
            instrument_name=PipetteNameType.P300_SINGLE,
            mount=Mount.LEFT,
            liquid_presence_detection=False,
        )
    ).then_return(mock_instrument_core)

    decoy.when(mock_instrument_core.get_pipette_name()).then_return("Gandalf the Grey")
    decoy.when(mock_core.get_disposal_locations()).then_raise(
        NoTrashDefinedError("No trash!")
    )

    result = subject.load_instrument(
        instrument_name="Gandalf", mount="shadowfax", tip_racks=mock_tip_racks
    )

    assert isinstance(result, InstrumentContext)
    assert result.name == "Gandalf the Grey"
    assert result.requested_as == "gandalf"
    assert subject.loaded_instruments["left"] is result

    decoy.verify(
        mock_instrument_support.validate_tiprack(
            instrument_name="Gandalf the Grey",
            tip_rack=mock_tip_racks[0],
            log=matchers.Anything(),
        ),
        mock_instrument_support.validate_tiprack(
            instrument_name="Gandalf the Grey",
            tip_rack=mock_tip_racks[1],
            log=matchers.Anything(),
        ),
    )


def test_load_instrument_replace(
    decoy: Decoy, mock_core: ProtocolCore, subject: ProtocolContext
) -> None:
    """It should allow/disallow pipette replacement."""
    mock_instrument_core = decoy.mock(cls=InstrumentCore)

    decoy.when(mock_validation.ensure_lowercase_name(matchers.IsA(str))).then_return(
        "ada"
    )
    decoy.when(mock_validation.ensure_pipette_name(matchers.IsA(str))).then_return(
        PipetteNameType.P300_SINGLE
    )
    decoy.when(
        mock_validation.ensure_mount_for_pipette(
            matchers.IsA(Mount), matchers.IsA(PipetteNameType)
        )
    ).then_return(Mount.RIGHT)
    decoy.when(
        mock_core.load_instrument(
            instrument_name=matchers.IsA(PipetteNameType),
            mount=matchers.IsA(Mount),
            liquid_presence_detection=False,
        )
    ).then_return(mock_instrument_core)
    decoy.when(mock_instrument_core.get_pipette_name()).then_return("Ada Lovelace")
    decoy.when(mock_core.get_disposal_locations()).then_raise(
        NoTrashDefinedError("No trash!")
    )

    pipette_1 = subject.load_instrument(instrument_name="ada", mount=Mount.RIGHT)
    assert subject.loaded_instruments["right"] is pipette_1

    pipette_2 = subject.load_instrument(
        instrument_name="ada", mount=Mount.RIGHT, replace=True
    )
    assert subject.loaded_instruments["right"] is pipette_2

    with pytest.raises(RuntimeError, match="Instrument already present"):
        subject.load_instrument(instrument_name="ada", mount=Mount.RIGHT)


def test_96_channel_pipette_raises_if_another_pipette_attached(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should always raise when loading a 96-channel pipette when another pipette is attached."""
    mock_instrument_core = decoy.mock(cls=InstrumentCore)

    decoy.when(
        mock_validation.ensure_lowercase_name("A Single Channel Name")
    ).then_return("a single channel name")
    decoy.when(
        mock_validation.ensure_pipette_name("a single channel name")
    ).then_return(PipetteNameType.P300_SINGLE)
    decoy.when(
        mock_validation.ensure_mount_for_pipette(
            Mount.RIGHT, PipetteNameType.P300_SINGLE
        )
    ).then_return(Mount.RIGHT)

    decoy.when(
        mock_core.load_instrument(
            instrument_name=PipetteNameType.P300_SINGLE,
            mount=Mount.RIGHT,
            liquid_presence_detection=False,
        )
    ).then_return(mock_instrument_core)

    decoy.when(mock_instrument_core.get_pipette_name()).then_return("ada")

    decoy.when(mock_core.get_disposal_locations()).then_raise(
        NoTrashDefinedError("No trash!")
    )

    pipette_1 = subject.load_instrument(
        instrument_name="A Single Channel Name", mount=Mount.RIGHT
    )
    assert subject.loaded_instruments["right"] is pipette_1

    decoy.when(mock_validation.ensure_lowercase_name("A 96 Channel Name")).then_return(
        "a 96 channel name"
    )
    decoy.when(mock_validation.ensure_pipette_name("a 96 channel name")).then_return(
        PipetteNameType.P1000_96
    )
    decoy.when(
        mock_validation.ensure_mount_for_pipette("shadowfax", PipetteNameType.P1000_96)
    ).then_return(Mount.LEFT)
    decoy.when(
        mock_core.load_instrument(
            instrument_name=PipetteNameType.P1000_96,
            mount=Mount.LEFT,
        )
    ).then_return(mock_instrument_core)

    with pytest.raises(RuntimeError):
        subject.load_instrument(instrument_name="A 96 Channel Name", mount="shadowfax")


def test_load_labware(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create a labware using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LABWARE")).then_return(
        "lowercase_labware"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_5)

    decoy.when(
        mock_core.load_labware(
            load_name="lowercase_labware",
            location=DeckSlotName.SLOT_5,
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_display_name()).then_return("Display Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        load_name="UPPERCASE_LABWARE",
        location=42,
        label="some_display_name",
        namespace="some_namespace",
        version=1337,
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


def test_load_labware_off_deck(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    subject: ProtocolContext,
) -> None:
    """It should load labware off-deck."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LABWARE")).then_return(
        "lowercase_labware"
    )

    decoy.when(
        mock_core.load_labware(
            load_name="lowercase_labware",
            location=OFF_DECK,
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_display_name()).then_return("Display Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        load_name="UPPERCASE_LABWARE",
        label="some_display_name",
        namespace="some_namespace",
        version=1337,
        location=OFF_DECK,
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


@pytest.mark.parametrize("api_version", [APIVersion(2, 14)])
def test_load_labware_off_deck_raises(
    subject: ProtocolContext,
) -> None:
    """It should raise and api error."""
    with pytest.raises(APIVersionError):
        subject.load_labware(
            load_name="UPPERCASE_LABWARE",
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
            location=OFF_DECK,
        )


def test_load_labware_on_staging_slot(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create a labware on a staging slot using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LABWARE")).then_return(
        "lowercase_labware"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(StagingSlotName.SLOT_B4)

    decoy.when(
        mock_core.load_labware(
            load_name="lowercase_labware",
            location=StagingSlotName.SLOT_B4,
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_display_name()).then_return("Display Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        load_name="UPPERCASE_LABWARE",
        location=42,
        label="some_display_name",
        namespace="some_namespace",
        version=1337,
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


def test_load_labware_from_definition(
    decoy: Decoy,
    mock_core: ProtocolCore,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should be able to load a labware from a definition dictionary."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    labware_definition_dict = cast(LabwareDefDict, {"labwareDef": True})
    labware_load_params = LabwareLoadParams("you", "are", 1337)

    decoy.when(mock_validation.ensure_lowercase_name("are")).then_return("are")
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_1)
    decoy.when(mock_core.add_labware_definition(labware_definition_dict)).then_return(
        labware_load_params
    )

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    decoy.when(
        mock_core.load_labware(
            namespace="you",
            load_name="are",
            version=1337,
            location=DeckSlotName.SLOT_1,
            label="Some Display Name",
        )
    ).then_return(mock_labware_core)

    result = subject.load_labware_from_definition(
        labware_def=labware_definition_dict,
        location=42,
        label="Some Display Name",
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"


def test_load_adapter(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create an adapter using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_ADAPTER")).then_return(
        "lowercase_adapter"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_5)

    decoy.when(
        mock_core.load_adapter(
            load_name="lowercase_adapter",
            location=DeckSlotName.SLOT_5,
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_adapter(
        load_name="UPPERCASE_ADAPTER",
        location=42,
        namespace="some_namespace",
        version=1337,
    )

    assert isinstance(result, Labware)

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


def test_load_adapter_on_staging_slot(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create an adapter on a staging slot using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_ADAPTER")).then_return(
        "lowercase_adapter"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(StagingSlotName.SLOT_B4)

    decoy.when(
        mock_core.load_adapter(
            load_name="lowercase_adapter",
            location=StagingSlotName.SLOT_B4,
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_adapter(
        load_name="UPPERCASE_ADAPTER",
        location=42,
        namespace="some_namespace",
        version=1337,
    )

    assert isinstance(result, Labware)

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


def test_load_labware_on_adapter(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create a labware using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    mock_adapter_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LABWARE")).then_return(
        "lowercase_labware"
    )

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_ADAPTER")).then_return(
        "lowercase_adapter"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_5)
    decoy.when(
        mock_core.load_adapter(
            load_name="lowercase_adapter",
            location=DeckSlotName.SLOT_5,
            namespace="some_namespace",
            version=None,
        )
    ).then_return(mock_adapter_core)

    decoy.when(mock_adapter_core.get_well_columns()).then_return([])

    decoy.when(
        mock_core.load_labware(
            load_name="lowercase_labware",
            location=mock_adapter_core,
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_display_name()).then_return("Display Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        load_name="UPPERCASE_LABWARE",
        location=42,
        label="some_display_name",
        namespace="some_namespace",
        version=1337,
        adapter="UPPERCASE_ADAPTER",
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


@pytest.mark.parametrize("api_version", [APIVersion(2, 23)])
def test_load_labware_with_lid(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create a labware with a lid on it using its execution core."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    mock_lid_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LABWARE")).then_return(
        "lowercase_labware"
    )

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LID")).then_return(
        "lowercase_lid"
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_C1)

    decoy.when(
        mock_core.load_labware(
            load_name="lowercase_labware",
            location=DeckSlotName.SLOT_C1,
            label="some_display_name",
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_labware_core)
    decoy.when(mock_lid_core.get_well_columns()).then_return([])

    decoy.when(
        mock_core.load_lid(
            load_name="lowercase_lid",
            location=mock_labware_core,
            namespace="some_namespace",
            version=None,
        )
    ).then_return(mock_lid_core)

    decoy.when(mock_labware_core.get_name()).then_return("Full Name")
    decoy.when(mock_labware_core.get_display_name()).then_return("Display Name")
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    result = subject.load_labware(
        load_name="UPPERCASE_LABWARE",
        location=42,
        label="some_display_name",
        namespace="some_namespace",
        version=1337,
        lid="UPPERCASE_LID",
    )

    assert isinstance(result, Labware)
    assert result.name == "Full Name"

    decoy.verify(mock_core_map.add(mock_labware_core, result), times=1)


@pytest.mark.parametrize("api_version", [APIVersion(2, 23)])
def test_load_lid_stack(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should create a labware with a lid on it using its execution core."""
    mock_lid_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_validation.ensure_lowercase_name("UPPERCASE_LID")).then_return(
        "lowercase_lid"
    )

    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_C1)

    decoy.when(
        mock_core.load_lid_stack(
            load_name="lowercase_lid",
            location=DeckSlotName.SLOT_C1,
            quantity=5,
            namespace="some_namespace",
            version=1337,
        )
    ).then_return(mock_lid_core)

    decoy.when(mock_lid_core.get_name()).then_return("STACK_OBJECT")
    decoy.when(mock_lid_core.get_display_name()).then_return("")
    decoy.when(mock_lid_core.get_well_columns()).then_return([])

    result = subject.load_lid_stack(
        load_name="UPPERCASE_LID",
        location=42,
        quantity=5,
        namespace="some_namespace",
        version=1337,
    )

    assert isinstance(result, Labware)
    assert result.name == "STACK_OBJECT"


def test_loaded_labware(
    decoy: Decoy,
    mock_core_map: LoadedCoreMap,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should return a list of all loaded modules."""
    labware_core_4 = decoy.mock(cls=LabwareCore)
    labware_core_6 = decoy.mock(cls=LabwareCore)
    labware_4 = decoy.mock(cls=Labware)
    labware_6 = decoy.mock(cls=Labware)

    decoy.when(mock_core.get_labware_cores()).then_return(
        [labware_core_4, labware_core_6]
    )
    decoy.when(labware_core_4.get_deck_slot()).then_return(DeckSlotName.SLOT_4)
    decoy.when(labware_core_6.get_deck_slot()).then_return(DeckSlotName.SLOT_6)
    decoy.when(mock_core_map.get(labware_core_4)).then_return(labware_4)
    decoy.when(mock_core_map.get(labware_core_6)).then_return(labware_6)

    result = subject.loaded_labwares

    assert result == {4: labware_4, 6: labware_6}


def test_move_labware_to_slot(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should move labware to new slot location."""
    drop_offset = {"x": 4, "y": 5, "z": 6}
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_1)
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )
    decoy.when(
        mock_validation.ensure_valid_labware_offset_vector(drop_offset)
    ).then_return((1, 2, 3))
    subject.move_labware(
        labware=movable_labware,
        new_location=42,
        drop_offset=drop_offset,
    )

    decoy.verify(
        mock_core.move_labware(
            labware_core=mock_labware_core,
            new_location=DeckSlotName.SLOT_1,
            use_gripper=False,
            pause_for_manual_move=True,
            pick_up_offset=None,
            drop_offset=(1, 2, 3),
        )
    )


def test_move_labware_to_staging_slot(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should move labware to new slot location."""
    drop_offset = {"x": 4, "y": 5, "z": 6}
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(StagingSlotName.SLOT_B4)
    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )
    decoy.when(
        mock_validation.ensure_valid_labware_offset_vector(drop_offset)
    ).then_return((1, 2, 3))
    subject.move_labware(
        labware=movable_labware,
        new_location=42,
        drop_offset=drop_offset,
    )

    decoy.verify(
        mock_core.move_labware(
            labware_core=mock_labware_core,
            new_location=StagingSlotName.SLOT_B4,
            use_gripper=False,
            pause_for_manual_move=True,
            pick_up_offset=None,
            drop_offset=(1, 2, 3),
        )
    )


def test_move_labware_to_module(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    subject: ProtocolContext,
) -> None:
    """It should move labware to new module location."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    mock_module_core = decoy.mock(cls=TemperatureModuleCore)
    mock_broker = decoy.mock(cls=LegacyBroker)

    decoy.when(mock_labware_core.get_well_columns()).then_return([])
    decoy.when(mock_module_core.get_deck_slot()).then_return(DeckSlotName.SLOT_A1)
    decoy.when(mock_core.get_labware_on_module(mock_module_core)).then_return(None)
    decoy.when(mock_core_map.get(None)).then_return(None)

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )
    module_location = TemperatureModuleContext(
        core=mock_module_core,
        api_version=MAX_SUPPORTED_VERSION,
        broker=mock_broker,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )

    subject.move_labware(labware=movable_labware, new_location=module_location)
    decoy.verify(
        mock_core.move_labware(
            labware_core=mock_labware_core,
            new_location=mock_module_core,
            use_gripper=False,
            pause_for_manual_move=True,
            pick_up_offset=None,
            drop_offset=None,
        )
    )


def test_move_labware_off_deck(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    subject: ProtocolContext,
) -> None:
    """It should move labware off-deck."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )

    subject.move_labware(labware=movable_labware, new_location=OFF_DECK)
    decoy.verify(
        mock_core.move_labware(
            labware_core=mock_labware_core,
            new_location=OFF_DECK,
            use_gripper=False,
            pause_for_manual_move=True,
            pick_up_offset=None,
            drop_offset=None,
        )
    )


@pytest.mark.parametrize("api_version", [APIVersion(2, 14)])
def test_move_labware_off_deck_raises(
    subject: ProtocolContext,
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
) -> None:
    """It should raise an APIVersionError if using move_labware in an unsupported version."""
    mock_labware_core = decoy.mock(cls=LabwareCore)

    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )

    with pytest.raises(APIVersionError):
        subject.move_labware(labware=movable_labware, new_location=OFF_DECK)


def test_move_labware_to_trash_raises(
    subject: ProtocolContext,
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    mock_engine_client: EngineClient,
) -> None:
    """It should raise an LabwareMovementNotAllowedError if using move_labware to move something that is not a lid to a TrashBin."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    trash_location = TrashBin(
        location=DeckSlotName.SLOT_D3,
        addressable_area_name="moveableTrashD3",
        api_version=MAX_SUPPORTED_VERSION,
        engine_client=mock_engine_client,
    )

    decoy.when(mock_labware_core.get_well_columns()).then_return([])

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )

    with pytest.raises(LabwareMovementNotAllowedError):
        subject.move_labware(labware=movable_labware, new_location=trash_location)


def test_move_lid_to_trash_passes(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    subject: ProtocolContext,
    mock_engine_client: EngineClient,
) -> None:
    """It should move a lid labware into a trashbin successfully."""
    mock_labware_core = decoy.mock(cls=LabwareCore)
    trash_location = TrashBin(
        location=DeckSlotName.SLOT_D3,
        addressable_area_name="moveableTrashD3",
        api_version=MAX_SUPPORTED_VERSION,
        engine_client=mock_engine_client,
    )

    decoy.when(mock_labware_core.get_well_columns()).then_return([])
    decoy.when(mock_labware_core.is_lid()).then_return(True)

    movable_labware = Labware(
        core=mock_labware_core,
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_core_map,
    )

    subject.move_labware(labware=movable_labware, new_location=trash_location)
    decoy.verify(
        mock_core.move_labware(
            labware_core=mock_labware_core,
            new_location=trash_location,
            use_gripper=False,
            pause_for_manual_move=True,
            pick_up_offset=None,
            drop_offset=None,
        )
    )


def test_load_trash_bin(
    decoy: Decoy,
    mock_core: ProtocolCore,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should load a trash bin."""
    mock_trash = decoy.mock(cls=TrashBin)

    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(
            "blah", api_version, "OT-3 Standard"
        )
    ).then_return(DeckSlotName.SLOT_A1)
    decoy.when(
        mock_validation.ensure_and_convert_trash_bin_location(
            "blah", api_version, "OT-3 Standard"
        )
    ).then_return("my swanky trash bin")
    decoy.when(
        mock_core.load_trash_bin(DeckSlotName.SLOT_A1, "my swanky trash bin")
    ).then_return(mock_trash)

    result = subject.load_trash_bin("blah")

    assert result == mock_trash


def test_load_trash_bin_raises_for_staging_slot(
    decoy: Decoy,
    mock_core: ProtocolCore,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should raise when a trash bin load is attempted in a staging slot."""
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(
            "bleh", api_version, "OT-3 Standard"
        )
    ).then_return(StagingSlotName.SLOT_A4)

    with pytest.raises(ValueError, match="Staging areas not permitted"):
        subject.load_trash_bin("bleh")


def test_load_wast_chute(
    decoy: Decoy,
    mock_core: ProtocolCore,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should load a waste chute."""
    mock_chute = decoy.mock(cls=WasteChute)
    decoy.when(mock_core.load_waste_chute()).then_return(mock_chute)
    result = subject.load_waste_chute()
    assert result == mock_chute


def test_load_module(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should load a module."""
    mock_module_core = decoy.mock(cls=TemperatureModuleCore)

    decoy.when(mock_validation.ensure_module_model("spline reticulator")).then_return(
        TemperatureModuleModel.TEMPERATURE_V1
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(DeckSlotName.SLOT_3)

    decoy.when(
        mock_core.load_module(
            model=TemperatureModuleModel.TEMPERATURE_V1,
            deck_slot=DeckSlotName.SLOT_3,
            configuration=None,
        )
    ).then_return(mock_module_core)

    decoy.when(mock_module_core.get_model()).then_return(
        TemperatureModuleModel.TEMPERATURE_V2
    )
    decoy.when(mock_module_core.get_serial_number()).then_return("cap'n crunch")
    decoy.when(mock_module_core.get_deck_slot()).then_return(DeckSlotName.SLOT_3)

    result = subject.load_module(module_name="spline reticulator", location=42)

    assert isinstance(result, ModuleContext)
    decoy.verify(mock_core_map.add(mock_module_core, result), times=1)


def test_load_module_default_location(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should load a module without specifying a location explicitly."""
    mock_module_core = decoy.mock(cls=TemperatureModuleCore)

    decoy.when(mock_validation.ensure_module_model("spline reticulator")).then_return(
        TemperatureModuleModel.TEMPERATURE_V1
    )

    decoy.when(
        mock_core.load_module(
            model=TemperatureModuleModel.TEMPERATURE_V1,
            deck_slot=None,
            configuration=None,
        )
    ).then_return(mock_module_core)

    decoy.when(mock_module_core.MODULE_TYPE).then_return(ModuleType.TEMPERATURE)
    decoy.when(mock_module_core.get_model()).then_return(
        TemperatureModuleModel.TEMPERATURE_V2
    )
    decoy.when(mock_module_core.get_serial_number()).then_return("cap'n crunch")
    decoy.when(mock_module_core.get_deck_slot()).then_return(DeckSlotName.SLOT_3)

    result = subject.load_module(module_name="spline reticulator", location=42)

    assert isinstance(result, ModuleContext)


@pytest.mark.parametrize("api_version", [APIVersion(2, 14)])
def test_load_module_with_configuration(subject: ProtocolContext) -> None:
    """It should raise an APIVersionError if the deprecated `configuration` argument is used."""
    with pytest.raises(UnsupportedAPIError):
        subject.load_module(
            module_name="spline reticulator",
            location=42,
            configuration="semi",
        )


@pytest.mark.parametrize("api_version", [APIVersion(2, 14)])
def test_load_module_with_mag_block_raises(subject: ProtocolContext) -> None:
    """It should raise an APIVersionError if loading a magnetic block."""
    with pytest.raises(UnsupportedAPIError):
        subject.load_module(
            module_name="magneticBlockV1",
            location=42,
            configuration="semi",
        )


def test_load_module_on_staging_slot_raises(
    decoy: Decoy,
    mock_core: ProtocolCore,
    mock_core_map: LoadedCoreMap,
    api_version: APIVersion,
    subject: ProtocolContext,
) -> None:
    """It should raise when attempting to load a module onto a staging slot."""
    decoy.when(mock_validation.ensure_module_model("spline reticulator")).then_return(
        TemperatureModuleModel.TEMPERATURE_V1
    )
    decoy.when(mock_core.robot_type).then_return("OT-3 Standard")
    decoy.when(
        mock_validation.ensure_and_convert_deck_slot(42, api_version, "OT-3 Standard")
    ).then_return(StagingSlotName.SLOT_B4)

    with pytest.raises(ValueError, match="Cannot load a module onto a staging slot."):
        subject.load_module(module_name="spline reticulator", location=42)


def test_loaded_modules(
    decoy: Decoy,
    mock_core_map: LoadedCoreMap,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should return a list of all loaded modules."""
    module_core_4 = decoy.mock(cls=TemperatureModuleCore)
    module_core_6 = decoy.mock(cls=MagneticModuleCore)
    module_core_7 = decoy.mock(cls=MagneticBlockCore)

    module_4 = decoy.mock(cls=TemperatureModuleContext)
    module_6 = decoy.mock(cls=MagneticModuleContext)
    module_7 = decoy.mock(cls=MagneticBlockContext)

    decoy.when(mock_core.get_module_cores()).then_return(
        [module_core_4, module_core_6, module_core_7]
    )
    decoy.when(module_core_4.get_deck_slot()).then_return(DeckSlotName.SLOT_4)
    decoy.when(module_core_6.get_deck_slot()).then_return(DeckSlotName.SLOT_6)
    decoy.when(module_core_7.get_deck_slot()).then_return(DeckSlotName.SLOT_7)
    decoy.when(mock_core_map.get(module_core_4)).then_return(module_4)
    decoy.when(mock_core_map.get(module_core_6)).then_return(module_6)
    decoy.when(mock_core_map.get(module_core_7)).then_return(module_7)

    result = subject.loaded_modules

    assert result == {4: module_4, 6: module_6, 7: module_7}


def test_home(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """It should home all axes."""
    subject.home()
    decoy.verify(mock_core.home(), times=1)


def test_define_liquid(
    decoy: Decoy, mock_core: ProtocolCore, subject: ProtocolContext
) -> None:
    """It should add a liquid to the state."""
    expected_result = Liquid(
        _id="water-id",
        name="water",
        description="water desc",
        display_color="#1234",
    )

    decoy.when(
        mock_core.define_liquid(
            name="water", description="water desc", display_color="#1234"
        )
    ).then_return(expected_result)

    result = subject.define_liquid(
        name="water", description="water desc", display_color="#1234"
    )

    assert result == expected_result


@pytest.mark.parametrize(
    ("api_version", "expect_success"),
    [
        (APIVersion(2, 19), False),
        (APIVersion(2, 20), True),
    ],
)
def test_define_liquid_arg_defaulting(
    expect_success: bool,
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
) -> None:
    """Test API version dependent behavior for missing description and display_color."""
    success_result = Liquid(
        _id="water-id", name="water", description=None, display_color=None
    )
    decoy.when(
        mock_core.define_liquid(name="water", description=None, display_color=None)
    ).then_return(success_result)

    if expect_success:
        assert (
            subject.define_liquid(
                name="water"
                # description and display_color omitted.
            )
            == success_result
        )
    else:
        with pytest.raises(APIVersionError):
            subject.define_liquid(
                name="water"
                # description and display_color omitted.
            )


@pytest.mark.parametrize("robot_type", ["OT-2 Standard", "OT-3 Standard"])
def test_define_liquid_class(
    decoy: Decoy,
    mock_core: ProtocolCore,
    subject: ProtocolContext,
    robot_type: RobotType,
    mock_feature_flags: None,
) -> None:
    """It should create the liquid class definition."""
    expected_liquid_class = LiquidClass(
        _name="volatile_100", _display_name="volatile 100%", _by_pipette_setting={}
    )
    decoy.when(mock_core.define_liquid_class("volatile_90")).then_return(
        expected_liquid_class
    )
    decoy.when(mock_core.robot_type).then_return(robot_type)
    decoy.when(
        ff.allow_liquid_classes(RobotTypeEnum.robot_literal_to_enum(robot_type))
    ).then_return(True)
    assert subject.define_liquid_class("volatile_90") == expected_liquid_class


def test_bundled_data(
    decoy: Decoy, mock_core_map: LoadedCoreMap, mock_deck: Deck, mock_core: ProtocolCore
) -> None:
    """It should return bundled data."""
    subject = ProtocolContext(
        api_version=MAX_SUPPORTED_VERSION,
        core=mock_core,
        core_map=mock_core_map,
        deck=mock_deck,
        bundled_data={"foo": b"ar"},
    )

    assert subject.bundled_data == {"foo": b"ar"}
