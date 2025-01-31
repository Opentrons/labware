"""Module state store tests.

DEPRECATED: Testing ModuleStore independently of ModuleView is no longer helpful.
Try to add new tests to test_module_state.py, where they can be tested together,
treating ModuleState as a private implementation detail.
"""
from typing import List, Set, cast, Dict, Optional

import pytest
from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.deck.types import DeckDefinitionV5
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]

from opentrons.types import DeckSlotName
from opentrons.protocol_engine import commands, actions
from opentrons.protocol_engine.commands import (
    heater_shaker as hs_commands,
    temperature_module as temp_commands,
    thermocycler as tc_commands,
)
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    ModuleDefinition,
    ModuleModel,
    HeaterShakerLatchStatus,
    DeckType,
    AddressableArea,
    DeckConfigurationType,
    PotentialCutoutFixture,
)

from opentrons.protocol_engine.state.modules import (
    ModuleStore,
    ModuleState,
    HardwareModule,
)

from opentrons.protocol_engine.state.module_substates import (
    MagneticModuleId,
    MagneticModuleSubState,
    HeaterShakerModuleId,
    HeaterShakerModuleSubState,
    TemperatureModuleId,
    TemperatureModuleSubState,
    ThermocyclerModuleId,
    ThermocyclerModuleSubState,
    ModuleSubStateType,
)

from opentrons.protocol_engine.state.addressable_areas import (
    AddressableAreaView,
    AddressableAreaState,
)
from opentrons.protocol_engine.state.config import Config
from opentrons.hardware_control.modules.types import LiveData


_OT2_STANDARD_CONFIG = Config(
    use_simulated_deck_config=False,
    robot_type="OT-2 Standard",
    deck_type=DeckType.OT2_STANDARD,
)


def get_addressable_area_view(
    loaded_addressable_areas_by_name: Optional[Dict[str, AddressableArea]] = None,
    potential_cutout_fixtures_by_cutout_id: Optional[
        Dict[str, Set[PotentialCutoutFixture]]
    ] = None,
    deck_definition: Optional[DeckDefinitionV5] = None,
    deck_configuration: Optional[DeckConfigurationType] = None,
    robot_type: RobotType = "OT-3 Standard",
    use_simulated_deck_config: bool = False,
) -> AddressableAreaView:
    """Get a labware view test subject."""
    state = AddressableAreaState(
        loaded_addressable_areas_by_name=loaded_addressable_areas_by_name or {},
        potential_cutout_fixtures_by_cutout_id=potential_cutout_fixtures_by_cutout_id
        or {},
        deck_definition=deck_definition or cast(DeckDefinitionV5, {"otId": "fake"}),
        deck_configuration=deck_configuration or [],
        robot_definition={
            "displayName": "OT-3",
            "robotType": "OT-3 Standard",
            "models": ["OT-3 Standard"],
            "extents": [477.2, 493.8, 0.0],
            "paddingOffsets": {
                "rear": -177.42,
                "front": 51.8,
                "leftSide": 31.88,
                "rightSide": -80.32,
            },
            "mountOffsets": {
                "left": [-13.5, -60.5, 255.675],
                "right": [40.5, -60.5, 255.675],
                "gripper": [84.55, -12.75, 93.85],
            },
        },
        robot_type=robot_type,
        use_simulated_deck_config=use_simulated_deck_config,
    )

    return AddressableAreaView(state=state)


def test_initial_state() -> None:
    """It should initialize the module state."""
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    assert subject.state == ModuleState(
        deck_type=DeckType.OT2_STANDARD,
        requested_model_by_id={},
        slot_by_module_id={},
        hardware_by_module_id={},
        substate_by_module_id={},
        module_offset_by_serial={},
        additional_slots_occupied_by_module_id={},
        deck_fixed_labware=[],
    )


@pytest.mark.parametrize(
    argnames=["module_definition", "params_model", "result_model", "expected_substate"],
    argvalues=[
        (
            lazy_fixture("magdeck_v2_def"),
            ModuleModel.MAGNETIC_MODULE_V2,
            ModuleModel.MAGNETIC_MODULE_V2,
            MagneticModuleSubState(
                module_id=MagneticModuleId("module-id"),
                model=ModuleModel.MAGNETIC_MODULE_V2,
            ),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            ModuleModel.HEATER_SHAKER_MODULE_V1,
            ModuleModel.HEATER_SHAKER_MODULE_V1,
            HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
                is_plate_shaking=False,
                plate_target_temperature=None,
            ),
        ),
        (
            lazy_fixture("tempdeck_v1_def"),
            ModuleModel.TEMPERATURE_MODULE_V1,
            ModuleModel.TEMPERATURE_MODULE_V1,
            TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            ),
        ),
        (
            lazy_fixture("tempdeck_v1_def"),
            ModuleModel.TEMPERATURE_MODULE_V2,
            ModuleModel.TEMPERATURE_MODULE_V1,
            TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            ),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            ModuleModel.TEMPERATURE_MODULE_V1,
            ModuleModel.TEMPERATURE_MODULE_V2,
            TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            ),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            ModuleModel.TEMPERATURE_MODULE_V2,
            ModuleModel.TEMPERATURE_MODULE_V2,
            TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=None,
            ),
        ),
        (
            lazy_fixture("thermocycler_v1_def"),
            ModuleModel.THERMOCYCLER_MODULE_V1,
            ModuleModel.THERMOCYCLER_MODULE_V1,
            ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id"),
                is_lid_open=False,
                target_block_temperature=None,
                target_lid_temperature=None,
            ),
        ),
    ],
)
def test_load_module(
    module_definition: ModuleDefinition,
    params_model: ModuleModel,
    result_model: ModuleModel,
    expected_substate: ModuleSubStateType,
) -> None:
    """It should handle a successful LoadModule command."""
    action = actions.SucceedCommandAction(
        command=commands.LoadModule.model_construct(  # type: ignore[call-arg]
            params=commands.LoadModuleParams(
                model=params_model,
                location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
            ),
            result=commands.LoadModuleResult(
                moduleId="module-id",
                model=result_model,
                serialNumber="serial-number",
                definition=module_definition,
            ),
        ),
    )

    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )
    subject.handle_action(action)

    assert subject.state == ModuleState(
        deck_type=DeckType.OT2_STANDARD,
        slot_by_module_id={"module-id": DeckSlotName.SLOT_1},
        requested_model_by_id={"module-id": params_model},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=module_definition,
            )
        },
        substate_by_module_id={"module-id": expected_substate},
        module_offset_by_serial={},
        additional_slots_occupied_by_module_id={},
        deck_fixed_labware=[],
    )


@pytest.mark.parametrize(
    argnames=["tc_slot", "deck_type", "robot_type", "expected_additional_slots"],
    argvalues=[
        (
            DeckSlotName.SLOT_7,
            DeckType.OT2_STANDARD,
            "OT-2 Standard",
            [DeckSlotName.SLOT_8, DeckSlotName.SLOT_10, DeckSlotName.SLOT_11],
        ),
        (
            DeckSlotName.SLOT_B1,
            DeckType.OT3_STANDARD,
            "OT-3 Standard",
            [DeckSlotName.SLOT_A1],
        ),
    ],
)
def test_load_thermocycler_in_thermocycler_slot(
    tc_slot: DeckSlotName,
    deck_type: DeckType,
    robot_type: RobotType,
    expected_additional_slots: List[DeckSlotName],
    thermocycler_v2_def: ModuleDefinition,
) -> None:
    """It should update additional slots for thermocycler module."""
    action = actions.SucceedCommandAction(
        command=commands.LoadModule.model_construct(  # type: ignore[call-arg]
            params=commands.LoadModuleParams(
                model=ModuleModel.THERMOCYCLER_MODULE_V2,
                location=DeckSlotLocation(slotName=tc_slot),
            ),
            result=commands.LoadModuleResult(
                moduleId="module-id",
                model=ModuleModel.THERMOCYCLER_MODULE_V2,
                serialNumber="serial-number",
                definition=thermocycler_v2_def,
            ),
        ),
    )

    subject = ModuleStore(
        Config(
            use_simulated_deck_config=False,
            robot_type=robot_type,
            deck_type=deck_type,
        ),
        deck_fixed_labware=[],
    )
    subject.handle_action(action)

    assert subject.state.slot_by_module_id == {"module-id": tc_slot}
    assert subject.state.additional_slots_occupied_by_module_id == {
        "module-id": expected_additional_slots
    }


@pytest.mark.parametrize(
    argnames=["module_definition", "live_data", "expected_substate"],
    argvalues=[
        (
            lazy_fixture("magdeck_v2_def"),
            {},
            MagneticModuleSubState(
                module_id=MagneticModuleId("module-id"),
                model=ModuleModel.MAGNETIC_MODULE_V2,
            ),
        ),
        (
            lazy_fixture("heater_shaker_v1_def"),
            {
                "status": "abc",
                "data": {
                    "labwareLatchStatus": "idle_closed",
                    "speedStatus": "holding at target",
                    "targetSpeed": 123,
                    "targetTemp": 123,
                },
            },
            HeaterShakerModuleSubState(
                module_id=HeaterShakerModuleId("module-id"),
                labware_latch_status=HeaterShakerLatchStatus.CLOSED,
                is_plate_shaking=True,
                plate_target_temperature=123,
            ),
        ),
        (
            lazy_fixture("tempdeck_v2_def"),
            {"status": "abc", "data": {"targetTemp": 123}},
            TemperatureModuleSubState(
                module_id=TemperatureModuleId("module-id"),
                plate_target_temperature=123,
            ),
        ),
        (
            lazy_fixture("thermocycler_v1_def"),
            {
                "status": "abc",
                "data": {
                    "targetTemp": 123,
                    "lidTarget": 321,
                    "lid": "open",
                },
            },
            ThermocyclerModuleSubState(
                module_id=ThermocyclerModuleId("module-id"),
                is_lid_open=True,
                target_block_temperature=123,
                target_lid_temperature=321,
            ),
        ),
    ],
)
def test_add_module_action(
    module_definition: ModuleDefinition,
    live_data: LiveData,
    expected_substate: ModuleSubStateType,
) -> None:
    """It should be able to add attached modules directly into state."""
    action = actions.AddModuleAction(
        module_id="module-id",
        serial_number="serial-number",
        definition=module_definition,
        module_live_data=live_data,
    )

    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )
    subject.handle_action(action)

    assert subject.state == ModuleState(
        deck_type=DeckType.OT2_STANDARD,
        slot_by_module_id={"module-id": None},
        requested_model_by_id={"module-id": None},
        hardware_by_module_id={
            "module-id": HardwareModule(
                serial_number="serial-number",
                definition=module_definition,
            )
        },
        substate_by_module_id={"module-id": expected_substate},
        module_offset_by_serial={},
        additional_slots_occupied_by_module_id={},
        deck_fixed_labware=[],
    )


def test_handle_hs_temperature_commands(heater_shaker_v1_def: ModuleDefinition) -> None:
    """It should update `plate_target_temperature` correctly."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            serialNumber="serial-number",
            definition=heater_shaker_v1_def,
        ),
    )
    set_temp_cmd = hs_commands.SetTargetTemperature.model_construct(  # type: ignore[call-arg]
        params=hs_commands.SetTargetTemperatureParams(moduleId="module-id", celsius=42),
        result=hs_commands.SetTargetTemperatureResult(),
    )
    deactivate_cmd = hs_commands.DeactivateHeater.model_construct(  # type: ignore[call-arg]
        params=hs_commands.DeactivateHeaterParams(moduleId="module-id"),
        result=hs_commands.DeactivateHeaterResult(),
    )
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    subject.handle_action(actions.SucceedCommandAction(command=set_temp_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
            is_plate_shaking=False,
            plate_target_temperature=42,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=deactivate_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
            is_plate_shaking=False,
            plate_target_temperature=None,
        )
    }


def test_handle_hs_shake_commands(heater_shaker_v1_def: ModuleDefinition) -> None:
    """It should update heater-shaker's `is_plate_shaking` correctly."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            serialNumber="serial-number",
            definition=heater_shaker_v1_def,
        ),
    )
    set_shake_cmd = hs_commands.SetAndWaitForShakeSpeed.model_construct(  # type: ignore[call-arg]
        params=hs_commands.SetAndWaitForShakeSpeedParams(moduleId="module-id", rpm=111),
        result=hs_commands.SetAndWaitForShakeSpeedResult(pipetteRetracted=False),
    )
    deactivate_cmd = hs_commands.DeactivateShaker.model_construct(  # type: ignore[call-arg]
        params=hs_commands.DeactivateShakerParams(moduleId="module-id"),
        result=hs_commands.DeactivateShakerResult(),
    )
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    subject.handle_action(actions.SucceedCommandAction(command=set_shake_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
            is_plate_shaking=True,
            plate_target_temperature=None,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=deactivate_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
            is_plate_shaking=False,
            plate_target_temperature=None,
        )
    }


def test_handle_hs_labware_latch_commands(
    heater_shaker_v1_def: ModuleDefinition,
) -> None:
    """It should update heater-shaker's `is_labware_latch_closed` correctly."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.HEATER_SHAKER_MODULE_V1,
            serialNumber="serial-number",
            definition=heater_shaker_v1_def,
        ),
    )
    close_latch_cmd = hs_commands.CloseLabwareLatch.model_construct(  # type: ignore[call-arg]
        params=hs_commands.CloseLabwareLatchParams(moduleId="module-id"),
        result=hs_commands.CloseLabwareLatchResult(),
    )
    open_latch_cmd = hs_commands.OpenLabwareLatch.model_construct(  # type: ignore[call-arg]
        params=hs_commands.OpenLabwareLatchParams(moduleId="module-id"),
        result=hs_commands.OpenLabwareLatchResult(pipetteRetracted=False),
    )
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.UNKNOWN,
            is_plate_shaking=False,
            plate_target_temperature=None,
        )
    }

    subject.handle_action(actions.SucceedCommandAction(command=close_latch_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.CLOSED,
            is_plate_shaking=False,
            plate_target_temperature=None,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=open_latch_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": HeaterShakerModuleSubState(
            module_id=HeaterShakerModuleId("module-id"),
            labware_latch_status=HeaterShakerLatchStatus.OPEN,
            is_plate_shaking=False,
            plate_target_temperature=None,
        )
    }


def test_handle_tempdeck_temperature_commands(
    tempdeck_v2_def: ModuleDefinition,
) -> None:
    """It should update Tempdeck's `plate_target_temperature` correctly."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.TEMPERATURE_MODULE_V2,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.TEMPERATURE_MODULE_V2,
            serialNumber="serial-number",
            definition=tempdeck_v2_def,
        ),
    )
    set_temp_cmd = temp_commands.SetTargetTemperature.model_construct(  # type: ignore[call-arg]
        params=temp_commands.SetTargetTemperatureParams(
            moduleId="module-id", celsius=42.4
        ),
        result=temp_commands.SetTargetTemperatureResult(targetTemperature=42),
    )
    deactivate_cmd = temp_commands.DeactivateTemperature.model_construct(  # type: ignore[call-arg]
        params=temp_commands.DeactivateTemperatureParams(moduleId="module-id"),
        result=temp_commands.DeactivateTemperatureResult(),
    )
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    subject.handle_action(actions.SucceedCommandAction(command=set_temp_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": TemperatureModuleSubState(
            module_id=TemperatureModuleId("module-id"), plate_target_temperature=42
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=deactivate_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": TemperatureModuleSubState(
            module_id=TemperatureModuleId("module-id"), plate_target_temperature=None
        )
    }


def test_handle_thermocycler_temperature_commands(
    thermocycler_v1_def: ModuleDefinition,
) -> None:
    """It should update thermocycler's temperature statuses correctly."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.THERMOCYCLER_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.THERMOCYCLER_MODULE_V1,
            serialNumber="serial-number",
            definition=thermocycler_v1_def,
        ),
    )
    set_block_temp_cmd = tc_commands.SetTargetBlockTemperature.model_construct(  # type: ignore[call-arg]
        params=tc_commands.SetTargetBlockTemperatureParams(
            moduleId="module-id", celsius=42.4
        ),
        result=tc_commands.SetTargetBlockTemperatureResult(targetBlockTemperature=42.4),
    )
    deactivate_block_cmd = tc_commands.DeactivateBlock.model_construct(  # type: ignore[call-arg]
        params=tc_commands.DeactivateBlockParams(moduleId="module-id"),
        result=tc_commands.DeactivateBlockResult(),
    )
    set_lid_temp_cmd = tc_commands.SetTargetLidTemperature.model_construct(  # type: ignore[call-arg]
        params=tc_commands.SetTargetLidTemperatureParams(
            moduleId="module-id", celsius=35.3
        ),
        result=tc_commands.SetTargetLidTemperatureResult(targetLidTemperature=35.3),
    )
    deactivate_lid_cmd = tc_commands.DeactivateLid.model_construct(  # type: ignore[call-arg]
        params=tc_commands.DeactivateLidParams(moduleId="module-id"),
        result=tc_commands.DeactivateLidResult(),
    )
    subject = ModuleStore(
        config=_OT2_STANDARD_CONFIG,
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    subject.handle_action(actions.SucceedCommandAction(command=set_block_temp_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=False,
            target_block_temperature=42.4,
            target_lid_temperature=None,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=set_lid_temp_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=False,
            target_block_temperature=42.4,
            target_lid_temperature=35.3,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=deactivate_lid_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=False,
            target_block_temperature=42.4,
            target_lid_temperature=None,
        )
    }
    subject.handle_action(actions.SucceedCommandAction(command=deactivate_block_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=False,
            target_block_temperature=None,
            target_lid_temperature=None,
        )
    }


def test_handle_thermocycler_lid_commands(
    thermocycler_v1_def: ModuleDefinition,
) -> None:
    """It should update thermocycler's lid status after executing lid commands."""
    load_module_cmd = commands.LoadModule.model_construct(  # type: ignore[call-arg]
        params=commands.LoadModuleParams(
            model=ModuleModel.THERMOCYCLER_MODULE_V1,
            location=DeckSlotLocation(slotName=DeckSlotName.SLOT_1),
        ),
        result=commands.LoadModuleResult(
            moduleId="module-id",
            model=ModuleModel.THERMOCYCLER_MODULE_V1,
            serialNumber="serial-number",
            definition=thermocycler_v1_def,
        ),
    )

    open_lid_cmd = tc_commands.OpenLid.model_construct(  # type: ignore[call-arg]
        params=tc_commands.OpenLidParams(moduleId="module-id"),
        result=tc_commands.OpenLidResult(),
    )
    close_lid_cmd = tc_commands.CloseLid.model_construct(  # type: ignore[call-arg]
        params=tc_commands.CloseLidParams(moduleId="module-id"),
        result=tc_commands.CloseLidResult(),
    )

    subject = ModuleStore(
        Config(
            use_simulated_deck_config=False,
            robot_type="OT-3 Standard",
            deck_type=DeckType.OT3_STANDARD,
        ),
        deck_fixed_labware=[],
    )

    subject.handle_action(actions.SucceedCommandAction(command=load_module_cmd))
    subject.handle_action(actions.SucceedCommandAction(command=open_lid_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=True,
            target_block_temperature=None,
            target_lid_temperature=None,
        )
    }

    subject.handle_action(actions.SucceedCommandAction(command=close_lid_cmd))
    assert subject.state.substate_by_module_id == {
        "module-id": ThermocyclerModuleSubState(
            module_id=ThermocyclerModuleId("module-id"),
            is_lid_open=False,
            target_block_temperature=None,
            target_lid_temperature=None,
        )
    }
