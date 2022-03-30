"""Test Heater Shaker stop shake command implementation."""
from decoy import Decoy

from opentrons.hardware_control.modules import HeaterShaker

from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.state.modules import (
    HeaterShakerModuleSubState,
    HeaterShakerModuleId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import heater_shaker
from opentrons.protocol_engine.commands.heater_shaker.stop_shake import (
    StopShakeImpl,
)


async def test_stop_shake(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
) -> None:
    """It should be able to stop the module's shake."""
    subject = StopShakeImpl(state_view=state_view, equipment=equipment)
    data = heater_shaker.StopShakeParams(moduleId="input-heater-shaker-id")

    # Get module view
    hs_module_view = decoy.mock(cls=HeaterShakerModuleSubState)
    hs_hardware = decoy.mock(cls=HeaterShaker)

    decoy.when(
        state_view.modules.get_heater_shaker_module_substate(
            module_id="input-heater-shaker-id")
    ).then_return(hs_module_view)

    decoy.when(hs_module_view.module_id).then_return(
        HeaterShakerModuleId("heater-shaker-id")
    )

    # Get stubbed hardware module from hs module view
    decoy.when(
        equipment.get_module_hardware_api(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(hs_hardware)

    result = await subject.execute(data)
    decoy.verify(await hs_hardware.set_speed(rpm=0), times=1)
    assert result == heater_shaker.StopShakeResult()


async def test_stop_shake_virtual(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
) -> None:
    """It should be able to stop the module's shake."""
    subject = StopShakeImpl(state_view=state_view, equipment=equipment)
    data = heater_shaker.StopShakeParams(moduleId="input-heater-shaker-id")

    # Get module view
    hs_module_view = decoy.mock(cls=HeaterShakerModuleSubState)

    decoy.when(
        state_view.modules.get_heater_shaker_module_substate(
            module_id="input-heater-shaker-id")
    ).then_return(hs_module_view)

    decoy.when(hs_module_view.module_id).then_return(
        HeaterShakerModuleId("heater-shaker-id")
    )

    # Get stubbed hardware module from hs module view
    decoy.when(
        equipment.get_module_hardware_api(HeaterShakerModuleId("heater-shaker-id"))
    ).then_return(None)

    result = await subject.execute(data)
    assert result == heater_shaker.StopShakeResult()
