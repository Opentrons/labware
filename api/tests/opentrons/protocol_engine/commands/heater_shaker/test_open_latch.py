"""Test Heater Shaker open latch command implementation."""
import pytest
from decoy import Decoy

from opentrons.protocol_engine import execution
from opentrons.protocol_engine.commands import heater_shaker
from opentrons.protocol_engine.commands.heater_shaker.open_latch import (
    OpenLatchImpl,
)


@pytest.fixture()
def subject(
    equipment: execution.EquipmentHandler,
    movement: execution.MovementHandler,
    pipetting: execution.PipettingHandler,
    run_control: execution.RunControlHandler,
) -> OpenLatchImpl:
    """Get the command implementation with mocked out dependencies."""
    return OpenLatchImpl(
        equipment=equipment,
        movement=movement,
        pipetting=pipetting,
        run_control=run_control,
    )


# TODO(mc, 2022-02-25): verify hardware interaction
@pytest.mark.xfail(raises=NotImplementedError, strict=True)
async def test_open_latch(decoy: Decoy, subject: OpenLatchImpl) -> None:
    """It should be able to open the module's labware latch."""
    data = heater_shaker.OpenLatchParams(moduleId="heater-shaker-id")

    result = await subject.execute(data)

    assert result == heater_shaker.OpenLatchResult()
