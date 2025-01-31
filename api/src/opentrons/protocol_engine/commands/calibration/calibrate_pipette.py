"""Calibrate-pipette command for OT3 hardware. request, result, and implementation models."""
from typing import Optional, Type
from typing_extensions import Literal
from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...types import InstrumentOffsetVector

from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware


from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import OT3Mount
from opentrons.hardware_control import ot3_calibration as calibration

from opentrons.types import MountType

CalibratePipetteCommandType = Literal["calibration/calibratePipette"]


class CalibratePipetteParams(BaseModel):
    """Payload required to calibrate-pipette."""

    mount: MountType = Field(..., description="Instrument mount to calibrate.")


class CalibratePipetteResult(BaseModel):
    """Result data from the execution of a calibrate-pipette command."""

    pipetteOffset: InstrumentOffsetVector = Field(
        ..., description="Offset of calibrated pipette."
    )


class CalibratePipetteImplementation(
    AbstractCommandImpl[CalibratePipetteParams, SuccessData[CalibratePipetteResult]]
):
    """CalibratePipette command implementation."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api

    async def execute(
        self, params: CalibratePipetteParams
    ) -> SuccessData[CalibratePipetteResult]:
        """Execute calibrate-pipette command."""
        # TODO (tz, 20-9-22): Add a better solution to determine if a command can be executed on an OT-3/OT-2
        ot3_api = ensure_ot3_hardware(
            self._hardware_api,
        )
        ot3_mount = OT3Mount.from_mount(params.mount)
        assert (
            ot3_mount is not OT3Mount.GRIPPER
        ), "Expected a Pipette mount but Gripper mount was provided."

        pipette_offset = await calibration.find_pipette_offset(
            hcapi=ot3_api, mount=ot3_mount, slot=5
        )

        await ot3_api.save_instrument_offset(mount=ot3_mount, delta=pipette_offset)

        return SuccessData(
            public=CalibratePipetteResult.model_construct(
                pipetteOffset=InstrumentOffsetVector.model_construct(
                    x=pipette_offset.x, y=pipette_offset.y, z=pipette_offset.z
                )
            ),
        )


class CalibratePipette(
    BaseCommand[CalibratePipetteParams, CalibratePipetteResult, ErrorOccurrence]
):
    """Calibrate-pipette command model."""

    commandType: CalibratePipetteCommandType = "calibration/calibratePipette"
    params: CalibratePipetteParams
    result: Optional[CalibratePipetteResult] = None

    _ImplementationCls: Type[
        CalibratePipetteImplementation
    ] = CalibratePipetteImplementation


class CalibratePipetteCreate(BaseCommandCreate[CalibratePipetteParams]):
    """Create calibrate-pipette command request model."""

    commandType: CalibratePipetteCommandType = "calibration/calibratePipette"
    params: CalibratePipetteParams

    _CommandCls: Type[CalibratePipette] = CalibratePipette
