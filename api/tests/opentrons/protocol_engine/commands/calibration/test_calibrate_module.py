"""Test calibrate-module command."""
from __future__ import annotations
from typing import TYPE_CHECKING

import inspect
import pytest
from decoy import Decoy
from opentrons.hardware_control.api import API

from opentrons.protocol_engine.commands.calibration.calibrate_module import (
    CalibrateModuleResult,
    CalibrateModuleImplementation,
    CalibrateModuleParams,
)
from opentrons.protocol_engine.errors.exceptions import HardwareNotSupportedError
from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.types import (
    DeckSlotLocation,
    LoadedModule,
    ModuleModel,
    ModuleOffsetVector,
)

from opentrons.hardware_control.types import OT3Mount
from opentrons.types import DeckSlotName, MountType, Point

from opentrons.hardware_control import ot3_calibration as calibration

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API


@pytest.mark.ot3_only
@pytest.fixture(autouse=True)
def _mock_ot3_calibration(decoy: Decoy, monkeypatch: pytest.MonkeyPatch) -> None:
    for name, func in inspect.getmembers(calibration, inspect.isfunction):
        monkeypatch.setattr(calibration, name, decoy.mock(func=func))


@pytest.mark.ot3_only
async def test_calibrate_module_implementation(
    decoy: Decoy, ot3_hardware_api: OT3API, state_view: StateView
) -> None:
    """Test Calibration command execution."""
    subject = CalibrateModuleImplementation(state_view, ot3_hardware_api)

    location = DeckSlotLocation(slotName=DeckSlotName("3"))
    model = ModuleModel.TEMPERATURE_MODULE_V2
    module_id = "test1234"
    serial = "TC1234abcd"
    params = CalibrateModuleParams(
        moduleId=module_id,
        mount=MountType.LEFT,
    )

    module = LoadedModule.construct(
        id=module_id,
        location=location,
        model=model,
        serialNumber=serial,
    )

    decoy.when(subject._state_view.modules.get(module_id)).then_return(module)
    decoy.when(subject._state_view.modules.get_location(module_id)).then_return(
        location
    )
    decoy.when(
        subject._state_view.geometry.get_labware_origin_position(module_id)
    ).then_return(Point(x=3, y=2, z=1))
    decoy.when(
        await calibration.calibrate_module(
            hcapi=ot3_hardware_api,
            mount=OT3Mount.LEFT,
            slot=location.slotName.as_int(),
            module_id=serial,
            nominal_position=Point(x=3, y=2, z=1),
        )
    ).then_return(Point(x=3, y=4, z=6))

    result = await subject.execute(params)

    assert result == CalibrateModuleResult(
        moduleOffset=ModuleOffsetVector(x=3, y=4, z=6)
    )


@pytest.mark.ot3_only
async def test_calibrate_module_implementation_wrong_hardware(
    decoy: Decoy, ot2_hardware_api: API, state_view: StateView
) -> None:
    """Should raise an unsupported hardware error."""
    subject = CalibrateModuleImplementation(
        state_view=state_view, hardware_api=ot2_hardware_api
    )

    params = CalibrateModuleParams(
        moduleId="Test1234",
        mount=MountType.LEFT,
    )

    with pytest.raises(HardwareNotSupportedError):
        await subject.execute(params)
