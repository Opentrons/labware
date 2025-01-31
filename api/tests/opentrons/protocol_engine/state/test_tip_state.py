"""Tests for tip state store and selectors."""
from collections import OrderedDict

import pytest

from typing import Optional

from opentrons_shared_data.labware.labware_definition import (
    LabwareDefinition,
    Parameters as LabwareParameters,
)
from opentrons_shared_data.pipette import pipette_definition
from opentrons_shared_data.pipette.pipette_definition import ValidNozzleMaps

from opentrons.hardware_control.nozzle_manager import NozzleMap
from opentrons.protocol_engine import actions, commands
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.tips import TipStore, TipView
from opentrons.protocol_engine.types import DeckSlotLocation, FlowRates
from opentrons.protocol_engine.resources.pipette_data_provider import (
    LoadedStaticPipetteData,
)
from opentrons.types import DeckSlotName, Point
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.pipette.pipette_definition import (
    AvailableSensorDefinition,
)
from ..pipette_fixtures import (
    NINETY_SIX_MAP,
    NINETY_SIX_COLS,
    NINETY_SIX_ROWS,
    get_default_nozzle_map,
)

_tip_rack_parameters = LabwareParameters.model_construct(isTiprack=True)  # type: ignore[call-arg]


@pytest.fixture
def available_sensors() -> AvailableSensorDefinition:
    """Provide a list of sensors."""
    return AvailableSensorDefinition(sensors=["pressure", "capacitive", "environment"])


@pytest.fixture
def subject() -> TipStore:
    """Get a TipStore test subject."""
    return TipStore()


@pytest.fixture
def labware_definition() -> LabwareDefinition:
    """Get a labware definition value object."""
    return LabwareDefinition.model_construct(  # type: ignore[call-arg]
        ordering=[
            ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"],
            ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2"],
            ["A3", "B3", "C3", "D3", "E3", "F3", "G3", "H3"],
            ["A4", "B4", "C4", "D4", "E4", "F4", "G4", "H4"],
            ["A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5"],
            ["A6", "B6", "C6", "D6", "E6", "F6", "G6", "H6"],
            ["A7", "B7", "C7", "D7", "E7", "F7", "G7", "H7"],
            ["A8", "B8", "C8", "D8", "E8", "F8", "G8", "H8"],
            ["A9", "B9", "C9", "D9", "E9", "F9", "G9", "H9"],
            ["A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10"],
            ["A11", "B11", "C11", "D11", "E11", "F11", "G11", "H11"],
            ["A12", "B12", "C12", "D12", "E12", "F12", "G12", "H12"],
        ],
        parameters=_tip_rack_parameters,
    )


@pytest.fixture
def load_labware_action(
    labware_definition: LabwareDefinition,
) -> actions.SucceedCommandAction:
    """Get a load labware command value object."""
    return actions.SucceedCommandAction(
        command=_dummy_command(),
        state_update=update_types.StateUpdate(
            loaded_labware=update_types.LoadedLabwareUpdate(
                labware_id="cool-labware",
                definition=labware_definition,
                new_location=DeckSlotLocation(slotName=DeckSlotName.SLOT_A1),
                display_name=None,
                offset_id=None,
            )
        ),
    )


def _dummy_command() -> commands.Command:
    """Return a placeholder command."""
    return commands.Comment.model_construct()  # type: ignore[call-arg]


@pytest.mark.parametrize(
    "labware_definition",
    [LabwareDefinition.model_construct(ordering=[], parameters=_tip_rack_parameters)],  # type: ignore[call-arg]
)
def test_get_next_tip_returns_none(
    load_labware_action: actions.SucceedCommandAction,
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should start at the first tip in the labware."""
    subject.handle_action(load_labware_action)
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=96,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name=None,
        nozzle_map=None,
    )

    assert result is None


@pytest.mark.parametrize("input_tip_amount", [1, 8, 96])
def test_get_next_tip_returns_first_tip(
    load_labware_action: actions.SucceedCommandAction,
    subject: TipStore,
    input_tip_amount: int,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should start at the first tip in the labware."""
    subject.handle_action(load_labware_action)

    pipette_name_type = PipetteNameType.P1000_96
    if input_tip_amount == 1:
        pipette_name_type = PipetteNameType.P300_SINGLE_GEN2
    elif input_tip_amount == 8:
        pipette_name_type = PipetteNameType.P300_MULTI_GEN2
    else:
        pipette_name_type = PipetteNameType.P1000_96
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=input_tip_amount,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(pipette_name_type),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=input_tip_amount,
        starting_tip_name=None,
        nozzle_map=None,
    )

    assert result == "A1"


@pytest.mark.parametrize("input_tip_amount, result_well_name", [(1, "B1"), (8, "A2")])
def test_get_next_tip_used_starting_tip(
    load_labware_action: actions.SucceedCommandAction,
    subject: TipStore,
    input_tip_amount: int,
    result_well_name: str,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should start searching at the given starting tip."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=input_tip_amount,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=input_tip_amount,
        starting_tip_name="B1",
        nozzle_map=None,
    )

    assert result == result_well_name


@pytest.mark.parametrize(
    "input_tip_amount, get_next_tip_tips, input_starting_tip, result_well_name",
    [
        (1, 8, "A2", "A2"),
        (1, 1, "A2", "A2"),
        (8, 8, "B2", "A3"),
        (1, 8, "A1", "A2"),
        (8, 1, "D1", "A2"),
        (1, 96, "A1", None),
        (1, 8, None, "A2"),
        (8, 1, "D1", "A2"),
        (1, 96, None, None),
    ],
)
def test_get_next_tip_skips_picked_up_tip(
    load_labware_action: actions.SucceedCommandAction,
    subject: TipStore,
    input_tip_amount: int,
    get_next_tip_tips: int,
    input_starting_tip: Optional[str],
    result_well_name: Optional[str],
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should get the next tip in the column if one has been picked up."""
    subject.handle_action(load_labware_action)

    channels_num = input_tip_amount
    if input_starting_tip is not None:
        pipette_name_type = PipetteNameType.P1000_96
        if input_tip_amount == 1:
            pipette_name_type = PipetteNameType.P300_SINGLE_GEN2
        elif input_tip_amount == 8:
            pipette_name_type = PipetteNameType.P300_MULTI_GEN2
        else:
            pipette_name_type = PipetteNameType.P1000_96
    else:
        channels_num = get_next_tip_tips
        pipette_name_type = PipetteNameType.P1000_96
        if get_next_tip_tips == 1:
            pipette_name_type = PipetteNameType.P300_SINGLE_GEN2
        elif get_next_tip_tips == 8:
            pipette_name_type = PipetteNameType.P300_MULTI_GEN2
        else:
            pipette_name_type = PipetteNameType.P1000_96
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=channels_num,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(pipette_name_type),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    pick_up_tip_state_update = update_types.StateUpdate(
        tips_used=update_types.TipsUsedUpdate(
            pipette_id="pipette-id",
            labware_id="cool-labware",
            well_name="A1",
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=pick_up_tip_state_update,
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=get_next_tip_tips,
        starting_tip_name=input_starting_tip,
        nozzle_map=config_update.config.nozzle_map,
    )

    assert result == result_well_name


def test_get_next_tip_with_starting_tip(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the starting tip, and then the following tip after that."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=1,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )
    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name="B2",
        nozzle_map=config_update.config.nozzle_map,
    )

    assert result == "B2"

    pick_up_tip_state_update = update_types.StateUpdate(
        tips_used=update_types.TipsUsedUpdate("pipette-id", "cool-labware", "B2")
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=pick_up_tip_state_update,
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name="B2",
        nozzle_map=config_update.config.nozzle_map,
    )

    assert result == "C2"


def test_get_next_tip_with_starting_tip_8_channel(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the starting tip, and then the following tip after that."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=8,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_MULTI_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=8,
        starting_tip_name="A2",
        nozzle_map=None,
    )

    assert result == "A2"

    pick_up_tip_state_update = update_types.StateUpdate(
        tips_used=update_types.TipsUsedUpdate(
            pipette_id="pipette-id", labware_id="cool-labware", well_name="A2"
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=pick_up_tip_state_update,
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=8,
        starting_tip_name="A2",
        nozzle_map=None,
    )

    assert result == "A3"


def test_get_next_tip_with_1_channel_followed_by_8_channel(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the first tip of column 2 for the 8 channel after performing a single tip pickup on column 1."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=1,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )
    config_update_2 = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id2",
        serial_number="pipette-serial2",
        config=LoadedStaticPipetteData(
            channels=8,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name2",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_MULTI_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update_2),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name=None,
        nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
    )

    assert result == "A1"

    pick_up_tip_2_state_update = update_types.StateUpdate(
        tips_used=update_types.TipsUsedUpdate(
            pipette_id="pipette-id2", labware_id="cool-labware", well_name="A1"
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=pick_up_tip_2_state_update,
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=8,
        starting_tip_name=None,
        nozzle_map=get_default_nozzle_map(PipetteNameType.P300_MULTI_GEN2),
    )

    assert result == "A2"


def test_get_next_tip_with_starting_tip_out_of_tips(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the starting tip of H12 and then None after that."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=1,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name="H12",
        nozzle_map=None,
    )

    assert result == "H12"

    pick_up_tip_state_update = update_types.StateUpdate(
        tips_used=update_types.TipsUsedUpdate(
            pipette_id="pipette-id", labware_id="cool-labware", well_name="H12"
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=pick_up_tip_state_update,
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=1,
        starting_tip_name="H12",
        nozzle_map=None,
    )

    assert result is None


def test_get_next_tip_with_column_and_starting_tip(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should return the first tip in a column, taking starting tip into account."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=8,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_MULTI_GEN2),
            back_left_corner_offset=Point(0, 0, 0),
            front_right_corner_offset=Point(0, 0, 0),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=8,
        starting_tip_name="D1",
        nozzle_map=None,
    )

    assert result == "A2"


def test_reset_tips(
    subject: TipStore,
    load_labware_action: actions.SucceedCommandAction,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """It should be able to reset tip tracking state."""
    subject.handle_action(load_labware_action)

    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=1,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )

    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=update_types.StateUpdate(
                tips_used=update_types.TipsUsedUpdate(
                    pipette_id="pipette-id",
                    labware_id="cool-labware",
                    well_name="A1",
                )
            ),
        )
    )

    def get_result() -> str | None:
        return TipView(subject.state).get_next_tip(
            labware_id="cool-labware",
            num_tips=1,
            starting_tip_name=None,
            nozzle_map=None,
        )

    assert get_result() != "A1"
    subject.handle_action(actions.ResetTipsAction(labware_id="cool-labware"))
    assert get_result() == "A1"


def test_handle_pipette_config_action(
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Should add pipette channel to state."""
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=8,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    assert TipView(subject.state).get_pipette_channels("pipette-id") == 8
    assert TipView(subject.state).get_pipette_active_channels("pipette-id") == 8


@pytest.mark.parametrize(
    "labware_definition",
    [
        LabwareDefinition.model_construct(  # type: ignore[call-arg]
            ordering=[["A1"]],
            parameters=LabwareParameters.model_construct(isTiprack=False),  # type: ignore[call-arg]
        )
    ],
)
def test_has_tip_not_tip_rack(
    load_labware_action: actions.SucceedCommandAction, subject: TipStore
) -> None:
    """It should return False if labware isn't a tip rack."""
    subject.handle_action(load_labware_action)

    result = TipView(state=subject.state).has_clean_tip("cool-labware", "A1")

    assert result is False


def test_has_tip_tip_rack(
    load_labware_action: actions.SucceedCommandAction, subject: TipStore
) -> None:
    """It should return False if labware isn't a tip rack."""
    subject.handle_action(load_labware_action)

    result = TipView(state=subject.state).has_clean_tip("cool-labware", "A1")

    assert result is True


@pytest.mark.parametrize(
    argnames=["nozzle_map", "expected_channels"],
    argvalues=[
        (
            NozzleMap.build(
                physical_nozzles=OrderedDict({"A1": Point(0, 0, 0)}),
                physical_rows=OrderedDict({"A": ["A1"]}),
                physical_columns=OrderedDict({"1": ["A1"]}),
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="A1",
                valid_nozzle_maps=ValidNozzleMaps(maps={"A1": ["A1"]}),
            ),
            1,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="H12",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={
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
                ),
            ),
            96,
        ),
        (
            NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A1",
                back_left_nozzle="A1",
                front_right_nozzle="E1",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={"A1_E1": ["A1", "B1", "C1", "D1", "E1"]}
                ),
            ),
            5,
        ),
    ],
)
def test_active_channels(
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    nozzle_map: NozzleMap,
    expected_channels: int,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Should update active channels after pipette configuration change."""
    # Load pipette to update state
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=9,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=nozzle_map,
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    # Configure nozzle for partial configuration
    state_update = update_types.StateUpdate(
        pipette_nozzle_map=update_types.PipetteNozzleMapUpdate(
            pipette_id="pipette-id",
            nozzle_map=nozzle_map,
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=state_update,
        )
    )
    assert (
        TipView(subject.state).get_pipette_active_channels("pipette-id")
        == expected_channels
    )


def test_next_tip_uses_active_channels(
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    load_labware_action: actions.SucceedCommandAction,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Test that tip tracking logic uses pipette's active channels."""
    # Load labware
    subject.handle_action(load_labware_action)

    # Load pipette
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=96,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P300_SINGLE_GEN2),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    # Configure nozzle for partial configuration
    state_update = update_types.StateUpdate(
        pipette_nozzle_map=update_types.PipetteNozzleMapUpdate(
            pipette_id="pipette-id",
            nozzle_map=NozzleMap.build(
                physical_nozzles=NINETY_SIX_MAP,
                physical_rows=NINETY_SIX_ROWS,
                physical_columns=NINETY_SIX_COLS,
                starting_nozzle="A12",
                back_left_nozzle="A12",
                front_right_nozzle="H12",
                valid_nozzle_maps=ValidNozzleMaps(
                    maps={
                        "A12_H12": [
                            "A12",
                            "B12",
                            "C12",
                            "D12",
                            "E12",
                            "F12",
                            "G12",
                            "H12",
                        ]
                    }
                ),
            ),
        )
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=state_update,
        )
    )
    # Pick up partial tips
    subject.handle_action(
        actions.SucceedCommandAction(
            command=_dummy_command(),
            state_update=update_types.StateUpdate(
                tips_used=update_types.TipsUsedUpdate(
                    pipette_id="pipette-id",
                    labware_id="cool-labware",
                    well_name="A1",
                )
            ),
        )
    )

    result = TipView(subject.state).get_next_tip(
        labware_id="cool-labware",
        num_tips=5,
        starting_tip_name=None,
        nozzle_map=None,
    )
    assert result == "A2"


def test_next_tip_automatic_tip_tracking_with_partial_configurations(
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    load_labware_action: actions.SucceedCommandAction,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Test tip tracking logic using multiple pipette configurations."""
    # Load labware
    subject.handle_action(load_labware_action)

    # Load pipette
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=96,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    def _assert_and_pickup(well: str, nozzle_map: NozzleMap) -> None:
        result = TipView(subject.state).get_next_tip(
            labware_id="cool-labware",
            num_tips=0,
            starting_tip_name=None,
            nozzle_map=nozzle_map,
        )
        assert result is not None and result == well

        pick_up_tip_state_update = update_types.StateUpdate(
            tips_used=update_types.TipsUsedUpdate(
                pipette_id="pipette-id",
                labware_id="cool-labware",
                well_name=result,
            )
        )

        subject.handle_action(
            actions.SucceedCommandAction(
                command=_dummy_command(),
                state_update=pick_up_tip_state_update,
            )
        )

    def _reconfigure_nozzle_layout(start: str, back_l: str, front_r: str) -> NozzleMap:
        nozzle_map = NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle=start,
            back_left_nozzle=back_l,
            front_right_nozzle=front_r,
            valid_nozzle_maps=ValidNozzleMaps(
                maps={
                    "A1": ["A1"],
                    "H1": ["H1"],
                    "A12": ["A12"],
                    "H12": ["H12"],
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
                    ],
                    "A1_F2": [
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
                        "F1",
                        "F2",
                    ],
                }
            ),
        )
        state_update = update_types.StateUpdate(
            pipette_nozzle_map=update_types.PipetteNozzleMapUpdate(
                pipette_id="pipette-id",
                nozzle_map=nozzle_map,
            )
        )
        subject.handle_action(
            actions.SucceedCommandAction(
                command=_dummy_command(),
                state_update=state_update,
            )
        )
        return nozzle_map

    map = _reconfigure_nozzle_layout("A1", "A1", "H3")
    _assert_and_pickup("A10", map)
    map = _reconfigure_nozzle_layout("A1", "A1", "F2")
    _assert_and_pickup("C8", map)

    # Configure to single tip pickups
    map = _reconfigure_nozzle_layout("H12", "H12", "H12")
    _assert_and_pickup("A1", map)
    map = _reconfigure_nozzle_layout("H1", "H1", "H1")
    _assert_and_pickup("A9", map)
    map = _reconfigure_nozzle_layout("A12", "A12", "A12")
    _assert_and_pickup("H1", map)
    map = _reconfigure_nozzle_layout("A1", "A1", "A1")
    _assert_and_pickup("B9", map)


def test_next_tip_automatic_tip_tracking_tiprack_limits(
    subject: TipStore,
    supported_tip_fixture: pipette_definition.SupportedTipsDefinition,
    load_labware_action: actions.SucceedCommandAction,
    available_sensors: AvailableSensorDefinition,
) -> None:
    """Test tip tracking logic to ensure once a tiprack is consumed it returns None when consuming tips using multiple pipette configurations."""
    # Load labware
    subject.handle_action(load_labware_action)

    # Load pipette
    config_update = update_types.PipetteConfigUpdate(
        pipette_id="pipette-id",
        serial_number="pipette-serial",
        config=LoadedStaticPipetteData(
            channels=96,
            max_volume=15,
            min_volume=3,
            model="gen a",
            display_name="display name",
            flow_rates=FlowRates(
                default_aspirate={},
                default_dispense={},
                default_blow_out={},
            ),
            tip_configuration_lookup_table={15: supported_tip_fixture},
            nominal_tip_overlap={},
            nozzle_offset_z=1.23,
            home_position=4.56,
            nozzle_map=get_default_nozzle_map(PipetteNameType.P1000_96),
            back_left_corner_offset=Point(x=1, y=2, z=3),
            front_right_corner_offset=Point(x=4, y=5, z=6),
            pipette_lld_settings={},
            plunger_positions={
                "top": 0.0,
                "bottom": 5.0,
                "blow_out": 19.0,
                "drop_tip": 20.0,
            },
            shaft_ul_per_mm=5.0,
            available_sensors=available_sensors,
        ),
    )
    subject.handle_action(
        actions.SucceedCommandAction(
            state_update=update_types.StateUpdate(pipette_config=config_update),
            command=_dummy_command(),
        )
    )

    def _get_next_and_pickup(nozzle_map: NozzleMap) -> str | None:
        result = TipView(subject.state).get_next_tip(
            labware_id="cool-labware",
            num_tips=0,
            starting_tip_name=None,
            nozzle_map=nozzle_map,
        )
        if result is not None:
            pick_up_tip_state_update = update_types.StateUpdate(
                tips_used=update_types.TipsUsedUpdate(
                    pipette_id="pipette-id", labware_id="cool-labware", well_name=result
                )
            )

            subject.handle_action(
                actions.SucceedCommandAction(
                    command=_dummy_command(),
                    state_update=pick_up_tip_state_update,
                )
            )

        return result

    def _reconfigure_nozzle_layout(start: str, back_l: str, front_r: str) -> NozzleMap:
        nozzle_map = NozzleMap.build(
            physical_nozzles=NINETY_SIX_MAP,
            physical_rows=NINETY_SIX_ROWS,
            physical_columns=NINETY_SIX_COLS,
            starting_nozzle=start,
            back_left_nozzle=back_l,
            front_right_nozzle=front_r,
            valid_nozzle_maps=ValidNozzleMaps(
                maps={
                    "A1": ["A1"],
                    "H1": ["H1"],
                    "A12": ["A12"],
                    "H12": ["H12"],
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
                    ),
                }
            ),
        )
        state_update = update_types.StateUpdate(
            pipette_nozzle_map=update_types.PipetteNozzleMapUpdate(
                pipette_id="pipette-id", nozzle_map=nozzle_map
            )
        )
        subject.handle_action(
            actions.SucceedCommandAction(
                command=_dummy_command(), state_update=state_update
            )
        )
        return nozzle_map

    map = _reconfigure_nozzle_layout("A1", "A1", "A1")
    for _ in range(96):
        _get_next_and_pickup(map)
    assert _get_next_and_pickup(map) is None

    subject.handle_action(actions.ResetTipsAction(labware_id="cool-labware"))
    map = _reconfigure_nozzle_layout("A12", "A12", "A12")
    for _ in range(96):
        _get_next_and_pickup(map)
    assert _get_next_and_pickup(map) is None

    subject.handle_action(actions.ResetTipsAction(labware_id="cool-labware"))
    map = _reconfigure_nozzle_layout("H1", "H1", "H1")
    for _ in range(96):
        _get_next_and_pickup(map)
    assert _get_next_and_pickup(map) is None

    subject.handle_action(actions.ResetTipsAction(labware_id="cool-labware"))
    map = _reconfigure_nozzle_layout("H12", "H12", "H12")
    for _ in range(96):
        _get_next_and_pickup(map)
    assert _get_next_and_pickup(map) is None
