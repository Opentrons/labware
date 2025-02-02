"""Test load module command."""
from typing import cast
from unittest.mock import sentinel

import pytest
from decoy import Decoy

from opentrons.protocol_engine.errors import LocationIsOccupiedError
from opentrons.protocol_engine.state import update_types
from opentrons.protocol_engine.state.state import StateView
from opentrons_shared_data.robot.types import RobotType
from opentrons.types import DeckSlotName
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    ModuleModel,
)
from opentrons.protocol_engine.execution import EquipmentHandler, LoadedModuleData
from opentrons.protocol_engine import ModuleModel as EngineModuleModel
from opentrons.hardware_control.modules import ModuleType

from opentrons.protocol_engine.commands.command import SuccessData
from opentrons.protocol_engine.commands.load_module import (
    LoadModuleParams,
    LoadModuleResult,
    LoadModuleImplementation,
)
from opentrons.hardware_control.modules.types import (
    ModuleModel as HardwareModuleModel,
    TemperatureModuleModel,
    MagneticModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    FlexStackerModuleModel,
)
from opentrons_shared_data.deck.types import (
    DeckDefinitionV5,
    SlotDefV3,
)
from opentrons_shared_data.deck import load as load_deck
from opentrons.protocols.api_support.deck_type import (
    STANDARD_OT2_DECK,
    STANDARD_OT3_DECK,
)


@pytest.mark.parametrize(
    "module_model,module_def_fixture_name,load_slot_name",
    [
        (ModuleModel.TEMPERATURE_MODULE_V2, "tempdeck_v2_def", DeckSlotName.SLOT_D1),
        (ModuleModel.MAGNETIC_BLOCK_V1, "mag_block_v1_def", DeckSlotName.SLOT_D1),
        (
            ModuleModel.THERMOCYCLER_MODULE_V2,
            "thermocycler_v2_def",
            # only B1 provides addressable area for thermocycler v2
            # so we use it here with decoy
            DeckSlotName.SLOT_B1,
        ),
        (
            ModuleModel.HEATER_SHAKER_MODULE_V1,
            "heater_shaker_v1_def",
            DeckSlotName.SLOT_D3,
        ),
        (ModuleModel.ABSORBANCE_READER_V1, "abs_reader_v1_def", DeckSlotName.SLOT_D3),
        (
            ModuleModel.FLEX_STACKER_MODULE_V1,
            "flex_stacker_v1_def",
            DeckSlotName.SLOT_D3,
        ),
    ],
)
async def test_load_module_implementation(
    request: pytest.FixtureRequest,
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    ot3_standard_deck_def: DeckDefinitionV5,
    module_model: ModuleModel,
    module_def_fixture_name: str,
    load_slot_name: DeckSlotName,
) -> None:
    """A loadModule command should have an execution implementation."""
    module_definition = request.getfixturevalue(module_def_fixture_name)

    # Load module function is different for magnetic block v1
    load_module_func = (
        equipment.load_magnetic_block
        if module_model == ModuleModel.MAGNETIC_BLOCK_V1
        else equipment.load_module
    )

    subject = LoadModuleImplementation(equipment=equipment, state_view=state_view)

    data = LoadModuleParams(
        model=module_model,
        location=DeckSlotLocation(slotName=load_slot_name),
        moduleId="some-id",
    )

    decoy.when(state_view.labware.get_deck_definition()).then_return(
        ot3_standard_deck_def
    )
    decoy.when(
        state_view.addressable_areas.get_cutout_id_by_deck_slot_name(load_slot_name)
    ).then_return("cutout" + load_slot_name.value)

    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            DeckSlotLocation(slotName=load_slot_name)
        )
    ).then_return(DeckSlotLocation(slotName=load_slot_name))

    decoy.when(
        state_view.modules.ensure_and_convert_module_fixture_location(
            deck_slot=data.location.slotName,
            model=data.model,
        )
    ).then_return(sentinel.addressable_area_provided_by_module)

    decoy.when(
        await load_module_func(
            model=module_model,
            location=DeckSlotLocation(slotName=load_slot_name),
            module_id="some-id",
        )
    ).then_return(
        LoadedModuleData(
            module_id="module-id",
            serial_number="mod-serial",
            definition=module_definition,
        )
    )

    result = await subject.execute(data)
    decoy.verify(
        state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
            sentinel.addressable_area_provided_by_module
        )
    )
    assert result == SuccessData(
        public=LoadModuleResult(
            moduleId="module-id",
            serialNumber="mod-serial",
            model=module_model,
            definition=module_definition,
        ),
        state_update=update_types.StateUpdate(
            addressable_area_used=update_types.AddressableAreaUsedUpdate(
                addressable_area_name=data.location.slotName.id
            )
        ),
    )


async def test_load_module_raises_if_location_occupied(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
) -> None:
    """A loadModule command should have an execution implementation."""
    subject = LoadModuleImplementation(equipment=equipment, state_view=state_view)

    data = LoadModuleParams(
        model=ModuleModel.TEMPERATURE_MODULE_V2,
        location=DeckSlotLocation(slotName=DeckSlotName.SLOT_D1),
        moduleId="some-id",
    )

    deck_def = load_deck(STANDARD_OT3_DECK, 5)

    decoy.when(state_view.labware.get_deck_definition()).then_return(deck_def)
    decoy.when(
        state_view.addressable_areas.get_cutout_id_by_deck_slot_name(
            DeckSlotName.SLOT_D1
        )
    ).then_return("cutout" + DeckSlotName.SLOT_D1.value)

    decoy.when(
        state_view.geometry.ensure_location_not_occupied(
            DeckSlotLocation(slotName=DeckSlotName.SLOT_D1)
        )
    ).then_raise(LocationIsOccupiedError("Get your own spot!"))

    with pytest.raises(LocationIsOccupiedError):
        await subject.execute(data)


@pytest.mark.parametrize(
    (
        "requested_model",
        "engine_model",
        "deck_def",
        "slot_name",
        "robot_type",
    ),
    [
        (
            TemperatureModuleModel.TEMPERATURE_V2,
            EngineModuleModel.TEMPERATURE_MODULE_V2,
            load_deck(STANDARD_OT3_DECK, 5),
            DeckSlotName.SLOT_D2,
            "OT-3 Standard",
        ),
        (
            ThermocyclerModuleModel.THERMOCYCLER_V1,
            EngineModuleModel.THERMOCYCLER_MODULE_V1,
            load_deck(STANDARD_OT2_DECK, 5),
            DeckSlotName.SLOT_1,
            "OT-2 Standard",
        ),
        (
            ThermocyclerModuleModel.THERMOCYCLER_V2,
            EngineModuleModel.THERMOCYCLER_MODULE_V2,
            load_deck(STANDARD_OT3_DECK, 5),
            DeckSlotName.SLOT_A2,
            "OT-3 Standard",
        ),
        (
            HeaterShakerModuleModel.HEATER_SHAKER_V1,
            EngineModuleModel.HEATER_SHAKER_MODULE_V1,
            load_deck(STANDARD_OT3_DECK, 5),
            DeckSlotName.SLOT_A2,
            "OT-3 Standard",
        ),
        (
            FlexStackerModuleModel.FLEX_STACKER_V1,
            EngineModuleModel.FLEX_STACKER_MODULE_V1,
            load_deck(STANDARD_OT3_DECK, 5),
            DeckSlotName.SLOT_A2,
            "OT-3 Standard",
        ),
    ],
)
async def test_load_module_raises_wrong_location(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    requested_model: HardwareModuleModel,
    engine_model: EngineModuleModel,
    deck_def: DeckDefinitionV5,
    slot_name: DeckSlotName,
    robot_type: RobotType,
) -> None:
    """It should issue a load module engine command."""
    subject = LoadModuleImplementation(equipment=equipment, state_view=state_view)

    data = LoadModuleParams(
        model=engine_model,
        location=DeckSlotLocation(slotName=slot_name),
        moduleId="some-id",
    )

    decoy.when(state_view.config.robot_type).then_return(robot_type)

    if robot_type == "OT-2 Standard":
        decoy.when(
            state_view.addressable_areas.get_slot_definition(slot_name.id)
        ).then_return(cast(SlotDefV3, {"compatibleModuleTypes": []}))
    else:
        decoy.when(state_view.labware.get_deck_definition()).then_return(deck_def)
        decoy.when(
            state_view.addressable_areas.get_cutout_id_by_deck_slot_name(slot_name)
        ).then_return("cutout" + slot_name.value)

    with pytest.raises(
        ValueError,
        match=f"A {ModuleType.from_model(model=requested_model).value} cannot be loaded into slot {slot_name}",
    ):
        await subject.execute(data)


@pytest.mark.parametrize(
    (
        "requested_model",
        "engine_model",
        "deck_def",
        "slot_name",
        "robot_type",
    ),
    [
        (
            MagneticModuleModel.MAGNETIC_V2,
            EngineModuleModel.MAGNETIC_MODULE_V2,
            load_deck(STANDARD_OT3_DECK, 5),
            DeckSlotName.SLOT_A2,
            "OT-3 Standard",
        ),
    ],
)
async def test_load_module_raises_module_fixture_id_does_not_exist(
    decoy: Decoy,
    equipment: EquipmentHandler,
    state_view: StateView,
    requested_model: HardwareModuleModel,
    engine_model: EngineModuleModel,
    deck_def: DeckDefinitionV5,
    slot_name: DeckSlotName,
    robot_type: RobotType,
) -> None:
    """It should issue a load module engine command and raise an error for unmatched fixtures."""
    subject = LoadModuleImplementation(equipment=equipment, state_view=state_view)

    data = LoadModuleParams(
        model=engine_model,
        location=DeckSlotLocation(slotName=slot_name),
        moduleId="some-id",
    )

    decoy.when(state_view.config.robot_type).then_return(robot_type)

    if robot_type == "OT-2 Standard":
        decoy.when(
            state_view.addressable_areas.get_slot_definition(slot_name.id)
        ).then_return(cast(SlotDefV3, {"compatibleModuleTypes": []}))
    else:
        decoy.when(state_view.labware.get_deck_definition()).then_return(deck_def)
        decoy.when(
            state_view.addressable_areas.get_cutout_id_by_deck_slot_name(slot_name)
        ).then_return("cutout" + slot_name.value)

    with pytest.raises(
        ValueError,
        match=f"Module Type {ModuleType.from_model(requested_model).value} does not have a related fixture ID.",
    ):
        await subject.execute(data)
