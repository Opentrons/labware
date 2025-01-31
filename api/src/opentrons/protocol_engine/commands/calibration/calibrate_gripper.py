"""Models and implementation for the calibrateGripper command."""

from enum import Enum
from typing import Optional, Type, Any
from typing_extensions import Literal

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.types import Point
from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control import ot3_calibration
from opentrons.hardware_control.types import OT3Mount, GripperProbe as HWAPIGripperProbe
from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    GripperCalibrationOffset,
)
from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from opentrons.protocol_engine.types import Vec3f
from opentrons.protocol_engine.resources import ensure_ot3_hardware


CalibrateGripperCommandType = Literal["calibration/calibrateGripper"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class CalibrateGripperParamsJaw(Enum):  # noqa: D101
    FRONT = "front"
    REAR = "rear"


class CalibrateGripperParams(BaseModel):
    """Parameters for a `calibrateGripper` command."""

    jaw: CalibrateGripperParamsJaw = Field(
        ...,
        description=(
            "Which of the gripper's jaws to use to measure its offset."
            " The robot will assume that a human operator has already attached"
            " the capacitive probe to the jaw and none is attached to the other jaw."
        ),
    )

    otherJawOffset: Vec3f | SkipJsonSchema[None] = Field(
        None,
        description=(
            "If an offset for the other probe is already found, then specifying it here"
            " will enable the CalibrateGripper command to complete the calibration"
            " process by calculating the total offset and saving it to disk."
            " If this param is not specified then the command will only find and return"
            " the offset for the specified probe."
        ),
        json_schema_extra=_remove_default,
    )


class CalibrateGripperResult(BaseModel):
    """The result of a successful `calibrateGripper` command."""

    jawOffset: Vec3f = Field(
        ...,
        description=(
            "The offset from the probe's nominal position"
            " to its actual measured position."
        ),
    )

    savedCalibration: GripperCalibrationOffset | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Gripper calibration result data, when `otherJawOffset` is provided."
        ),
        json_schema_extra=_remove_default,
    )


class CalibrateGripperImplementation(
    AbstractCommandImpl[CalibrateGripperParams, SuccessData[CalibrateGripperResult]]
):
    """The implementation of a `calibrateGripper` command."""

    def __init__(
        self,
        hardware_api: HardwareControlAPI,
        *args: object,
        **kwargs: object,
    ) -> None:
        self._hardware_api = hardware_api

    async def execute(
        self, params: CalibrateGripperParams
    ) -> SuccessData[CalibrateGripperResult]:
        """Execute a `calibrateGripper` command.

        1. Move from the current location to the calibration area on the deck.
        2. Using the given probe, sense the gripper's offset from its ideal position.
        3. Return the gripper's offset from its ideal position.
        """
        ot3_hardware_api = ensure_ot3_hardware(self._hardware_api)

        probe_offset = await ot3_calibration.calibrate_gripper_jaw(
            hcapi=ot3_hardware_api, probe=self._convert_to_hw_api_probe(params.jaw)
        )
        other_probe_offset = params.otherJawOffset
        calibration_data: Optional[GripperCalibrationOffset] = None
        if other_probe_offset is not None:
            total_offset = 0.5 * (
                probe_offset
                + Point(
                    x=other_probe_offset.x,
                    y=other_probe_offset.y,
                    z=other_probe_offset.z,
                )
            )
            result = await ot3_hardware_api.save_instrument_offset(
                mount=OT3Mount.GRIPPER, delta=total_offset
            )
            assert isinstance(result, GripperCalibrationOffset), (
                f"Expected result to be GripperCalibrationOffset type, "
                f"but received {type(result)}"
            )
            calibration_data = result

        return SuccessData(
            public=CalibrateGripperResult.model_construct(
                jawOffset=Vec3f.model_construct(
                    x=probe_offset.x, y=probe_offset.y, z=probe_offset.z
                ),
                savedCalibration=calibration_data,
            ),
        )

    @staticmethod
    def _convert_to_hw_api_probe(
        probe_from_params: CalibrateGripperParamsJaw,
    ) -> HWAPIGripperProbe:
        if probe_from_params is CalibrateGripperParamsJaw.FRONT:
            return HWAPIGripperProbe.FRONT
        elif probe_from_params is CalibrateGripperParamsJaw.REAR:
            return HWAPIGripperProbe.REAR


class CalibrateGripper(
    BaseCommand[CalibrateGripperParams, CalibrateGripperResult, ErrorOccurrence]
):
    """A `calibrateGripper` command."""

    commandType: CalibrateGripperCommandType = "calibration/calibrateGripper"
    params: CalibrateGripperParams
    result: Optional[CalibrateGripperResult] = None

    _ImplementationCls: Type[
        CalibrateGripperImplementation
    ] = CalibrateGripperImplementation


class CalibrateGripperCreate(BaseCommandCreate[CalibrateGripperParams]):
    """A request to create a `calibrateGripper` command."""

    commandType: CalibrateGripperCommandType = "calibration/calibrateGripper"
    params: CalibrateGripperParams

    _CommandCls: Type[CalibrateGripper] = CalibrateGripper
