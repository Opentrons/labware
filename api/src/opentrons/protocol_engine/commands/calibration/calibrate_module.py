"""Calibrate-module command for OT3 hardware. request, result, and implementation models."""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Type
from typing_extensions import Literal
from pydantic import BaseModel, Field

from opentrons.types import MountType
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware
from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

# Work around type-only circular dependencies.
if TYPE_CHECKING:
    from ...state.state import StateView

from ...types import ModuleOffsetVector, DeckSlotLocation

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import OT3Mount
from opentrons.hardware_control import ot3_calibration as calibration


CalibrateModuleCommandType = Literal["calibration/calibrateModule"]


class CalibrateModuleParams(BaseModel):
    """Payload required to calibrate-module."""

    moduleId: str = Field(..., description="The unique id of module to calibrate.")
    labwareId: str = Field(
        ..., description="The unique id of module calibration adapter labware."
    )
    mount: MountType = Field(
        ..., description="The instrument mount used to calibrate the module."
    )


class CalibrateModuleResult(BaseModel):
    """Result data from the execution of a calibrate-module command."""

    moduleOffset: ModuleOffsetVector = Field(
        ..., description="Offset of calibrated module."
    )

    location: DeckSlotLocation = Field(
        ..., description="The deck slot this module was calibrated in."
    )


class CalibrateModuleImplementation(
    AbstractCommandImpl[CalibrateModuleParams, SuccessData[CalibrateModuleResult]]
):
    """CalibrateModule command implementation."""

    def __init__(
        self,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._hardware_api = hardware_api

    async def execute(
        self, params: CalibrateModuleParams
    ) -> SuccessData[CalibrateModuleResult]:
        """Execute calibrate-module command."""
        ot3_api = ensure_ot3_hardware(
            self._hardware_api,
        )
        ot3_mount = OT3Mount.from_mount(params.mount)
        slot = self._state_view.modules.get_location(params.moduleId)
        module_serial = self._state_view.modules.get_serial_number(params.moduleId)
        # NOTE (ba, 2023-03-31): There are two wells for calibration labware definitions
        # well A1 represents the location calibration square center relative to the adapters bottom-left corner
        # well B1 represents the location of the calibration square probe point relative to the adapters bottom-left corner.
        nominal_position = self._state_view.geometry.get_nominal_well_position(
            labware_id=params.labwareId, well_name="B1"
        )

        # start the calibration
        module_offset = await calibration.calibrate_module(
            ot3_api, ot3_mount, slot.slotName.id, module_serial, nominal_position
        )

        return SuccessData(
            public=CalibrateModuleResult(
                moduleOffset=ModuleOffsetVector(
                    x=module_offset.x, y=module_offset.y, z=module_offset.z
                ),
                location=slot,
            ),
        )


class CalibrateModule(
    BaseCommand[CalibrateModuleParams, CalibrateModuleResult, ErrorOccurrence]
):
    """Calibrate-module command model."""

    commandType: CalibrateModuleCommandType = "calibration/calibrateModule"
    params: CalibrateModuleParams
    result: Optional[CalibrateModuleResult] = None

    _ImplementationCls: Type[
        CalibrateModuleImplementation
    ] = CalibrateModuleImplementation


class CalibrateModuleCreate(BaseCommandCreate[CalibrateModuleParams]):
    """Create calibrate-module command request model."""

    commandType: CalibrateModuleCommandType = "calibration/calibrateModule"
    params: CalibrateModuleParams

    _CommandCls: Type[CalibrateModule] = CalibrateModule
