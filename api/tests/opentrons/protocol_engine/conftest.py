"""ProtocolEngine shared test fixtures."""
from __future__ import annotations

import pytest
from typing import TYPE_CHECKING
from decoy import Decoy

from opentrons_shared_data import load_shared_data
from opentrons_shared_data.deck import load as load_deck
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.labware import load_definition
from opentrons_shared_data.labware.labware_definition import LabwareDefinition
from opentrons_shared_data.pipette import pipette_definition
from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT2_DECK,
    SHORT_TRASH_DECK,
    STANDARD_OT3_DECK,
)
from opentrons.protocol_engine.types import ModuleDefinition

from opentrons.hardware_control import HardwareControlAPI, OT2HardwareControlAPI
from opentrons.hardware_control.api import API
from opentrons.hardware_control.protocols.types import FlexRobotType, OT2RobotType
from opentrons.protocol_engine.notes import CommandNoteAdder
from opentrons.protocol_engine.resources.file_provider import FileProvider

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.fixture
def hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mocked out HardwareControlAPI of unspecified robot type."""
    return decoy.mock(cls=OT2HardwareControlAPI)


@pytest.fixture
def ot2_hardware_api(decoy: Decoy) -> API:
    """Get a mocked out OT-2 hardware API."""
    mock = decoy.mock(cls=API)
    decoy.when(mock.get_robot_type()).then_return(OT2RobotType)
    return mock


@pytest.mark.ot3_only
@pytest.fixture
def ot3_hardware_api(decoy: Decoy) -> OT3API:
    """Get a mocked out OT3API."""
    try:
        from opentrons.hardware_control.ot3api import OT3API

        mock = decoy.mock(cls=OT3API)
        decoy.when(mock.get_robot_type()).then_return(FlexRobotType)
        return mock
    except ImportError:
        # TODO (tz, 9-23-22) Figure out a better way to use this fixture with OT-3 api only.
        return None  # type: ignore[return-value]


@pytest.fixture(scope="session")
def ot2_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT2_DECK, 5)


@pytest.fixture(scope="session")
def ot2_short_trash_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 short-trash deck definition."""
    return load_deck(SHORT_TRASH_DECK, 5)


@pytest.fixture(scope="session")
def ot3_standard_deck_def() -> DeckDefinitionV5:
    """Get the OT-2 standard deck definition."""
    return load_deck(STANDARD_OT3_DECK, 5)


@pytest.fixture(scope="session")
def ot2_fixed_trash_def() -> LabwareDefinition:
    """Get the definition of the OT-2 standard fixed trash."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_1_trash_1100ml_fixed", 1)
    )


@pytest.fixture(scope="session")
def ot2_short_fixed_trash_def() -> LabwareDefinition:
    """Get the definition of the OT-2 short fixed trash."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_1_trash_850ml_fixed", 1)
    )


@pytest.fixture(scope="session")
def ot3_fixed_trash_def() -> LabwareDefinition:
    """Get the definition of the OT-3 fixed trash."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_1_trash_3200ml_fixed", 1)
    )


@pytest.fixture(scope="session")
def ot3_absorbance_reader_lid() -> LabwareDefinition:
    """Get the definition of the OT-3 plate reader lid."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_flex_lid_absorbance_plate_reader_module", 1)
    )


@pytest.fixture(scope="session")
def well_plate_def() -> LabwareDefinition:
    """Get the definition of a 96 well plate."""
    return LabwareDefinition.model_validate(
        load_definition("corning_96_wellplate_360ul_flat", 2)
    )


@pytest.fixture(scope="session")
def flex_50uL_tiprack() -> LabwareDefinition:
    """Get the definition of a Flex 50uL tiprack."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_flex_96_filtertiprack_50ul", 1)
    )


@pytest.fixture(scope="session")
def adapter_plate_def() -> LabwareDefinition:
    """Get the definition of a h/s adapter plate."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_universal_flat_adapter", 1)
    )


@pytest.fixture(scope="session")
def reservoir_def() -> LabwareDefinition:
    """Get the definition of single-row reservoir."""
    return LabwareDefinition.model_validate(
        load_definition("nest_12_reservoir_15ml", 1)
    )


@pytest.fixture(scope="session")
def tip_rack_def() -> LabwareDefinition:
    """Get the definition of Opentrons 300 uL tip rack."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_96_tiprack_300ul", 1)
    )


@pytest.fixture(scope="session")
def adapter_def() -> LabwareDefinition:
    """Get the definition of Opentrons 96 PCR adapter."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_96_pcr_adapter", 1)
    )


@pytest.fixture(scope="session")
def falcon_tuberack_def() -> LabwareDefinition:
    """Get the definition of the 6-well Falcon tuberack."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_6_tuberack_falcon_50ml_conical", 1)
    )


@pytest.fixture(scope="session")
def magdeck_well_plate_def() -> LabwareDefinition:
    """Get the definition of a well place compatible with magdeck."""
    return LabwareDefinition.model_validate(
        load_definition("nest_96_wellplate_100ul_pcr_full_skirt", 1)
    )


@pytest.fixture(scope="session")
def tiprack_lid_def() -> LabwareDefinition:
    """Get the definition of the opentrons tiprack lid."""
    return LabwareDefinition.model_validate(
        load_definition("opentrons_flex_tiprack_lid", 1, schema=3)
    )


@pytest.fixture(scope="session")
def tempdeck_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 tempdeck."""
    definition = load_shared_data("module/definitions/3/temperatureModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def tempdeck_v2_def() -> ModuleDefinition:
    """Get the definition of a V2 tempdeck."""
    definition = load_shared_data("module/definitions/3/temperatureModuleV2.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def magdeck_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 magdeck."""
    definition = load_shared_data("module/definitions/3/magneticModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def magdeck_v2_def() -> ModuleDefinition:
    """Get the definition of a V2 magdeck."""
    definition = load_shared_data("module/definitions/3/magneticModuleV2.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def thermocycler_v1_def() -> ModuleDefinition:
    """Get the definition of a V2 thermocycler."""
    definition = load_shared_data("module/definitions/3/thermocyclerModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def thermocycler_v2_def() -> ModuleDefinition:
    """Get the definition of a V2 thermocycler."""
    definition = load_shared_data("module/definitions/3/thermocyclerModuleV2.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def heater_shaker_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 heater-shaker."""
    definition = load_shared_data("module/definitions/3/heaterShakerModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def mag_block_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 Mag Block."""
    definition = load_shared_data("module/definitions/3/magneticBlockV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def abs_reader_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 absorbance plate reader."""
    definition = load_shared_data("module/definitions/3/absorbanceReaderV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def flex_stacker_v1_def() -> ModuleDefinition:
    """Get the definition of a V1 Flex Stacker."""
    definition = load_shared_data("module/definitions/3/flexStackerModuleV1.json")
    return ModuleDefinition.model_validate_json(definition)


@pytest.fixture(scope="session")
def supported_tip_fixture() -> pipette_definition.SupportedTipsDefinition:
    """Get a mock supported tip definition."""
    return pipette_definition.SupportedTipsDefinition(
        defaultAspirateFlowRate=pipette_definition.FlowRateDefinition(
            default=10, valuesByApiLevel={}
        ),
        defaultDispenseFlowRate=pipette_definition.FlowRateDefinition(
            default=10, valuesByApiLevel={}
        ),
        defaultBlowOutFlowRate=pipette_definition.FlowRateDefinition(
            default=10, valuesByApiLevel={}
        ),
        defaultTipLength=40,
        defaultReturnTipHeight=0.5,
        aspirate=pipette_definition.ulPerMMDefinition(default={"1": [(0, 0, 0)]}),
        dispense=pipette_definition.ulPerMMDefinition(default={"1": [(0, 0, 0)]}),
        defaultPushOutVolume=3,
    )


@pytest.fixture
def mock_command_note_adder(decoy: Decoy) -> CommandNoteAdder:
    """Get a command note adder."""
    return decoy.mock(cls=CommandNoteAdder)


@pytest.fixture
def file_provider(decoy: Decoy) -> FileProvider:
    """Get a mocked out FileProvider."""
    return decoy.mock(cls=FileProvider)
