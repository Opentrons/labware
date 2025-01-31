"""Instruments routes."""
from typing import Annotated, Optional, Dict, List, cast

from fastapi import status, Depends
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons.hardware_control.instruments.ot3.instrument_calibration import (
    PipetteOffsetSummary,
)
from opentrons.protocol_engine.errors import HardwareNotSupportedError

from robot_server.hardware import get_hardware
from robot_server.service.json_api import (
    SimpleMultiBody,
    PydanticResponse,
    MultiBodyMeta,
)

from opentrons.types import Mount, MountType
from opentrons.protocol_engine.types import Vec3f
from opentrons.protocol_engine.resources.ot3_validation import ensure_ot3_hardware
from opentrons.hardware_control import (
    HardwareControlAPI,
)
from opentrons.hardware_control.types import (
    OT3Mount,
    SubSystem as HWSubSystem,
)
from opentrons.hardware_control.dev_types import (
    PipetteDict,
    PipetteStateDict,
    GripperDict,
)
from opentrons_shared_data.gripper.gripper_definition import GripperModelStr

from .instrument_models import (
    PipetteData,
    Pipette,
    InstrumentCalibrationData,
    GripperData,
    Gripper,
    AttachedItem,
    BadGripper,
    BadPipette,
    PipetteState,
    InconsistentCalibrationFailure,
)

from robot_server.subsystems.models import SubSystem
from robot_server.subsystems.router import status_route_for, update_route_for

from opentrons.hardware_control import OT3HardwareControlAPI

instruments_router = LightRouter()


def _pipette_dict_to_pipette_res(
    pipette_dict: PipetteDict,
    pipette_offset: Optional[PipetteOffsetSummary],
    mount: Mount,
    fw_version: Optional[int],
    pipette_state: Optional[PipetteStateDict],
) -> Pipette:
    """Convert PipetteDict to Pipette response model."""
    if pipette_dict:
        calibration_data = pipette_offset
        return Pipette.model_construct(
            firmwareVersion=str(fw_version) if fw_version else None,
            ok=True,
            mount=MountType.from_hw_mount(mount).value,
            instrumentName=pipette_dict["name"],
            instrumentModel=pipette_dict["model"],
            serialNumber=pipette_dict["pipette_id"],
            subsystem=SubSystem.from_hw(HWSubSystem.of_mount(mount)),
            data=PipetteData(
                channels=pipette_dict["channels"],
                min_volume=pipette_dict["min_volume"],
                max_volume=pipette_dict["max_volume"],
                calibratedOffset=InstrumentCalibrationData.model_construct(
                    offset=Vec3f(
                        x=calibration_data.offset.x,
                        y=calibration_data.offset.y,
                        z=calibration_data.offset.z,
                    ),
                    source=calibration_data.source,
                    last_modified=calibration_data.last_modified,
                    reasonability_check_failures=[
                        InconsistentCalibrationFailure.model_construct(
                            offsets={
                                k.name: Vec3f.model_construct(x=v.x, y=v.y, z=v.z)
                                for k, v in failure.offsets.items()
                            },
                            limit=failure.limit,
                        )
                        for failure in calibration_data.reasonability_check_failures
                    ],
                )
                if calibration_data
                else None,
            ),
            state=PipetteState.model_validate(pipette_state) if pipette_state else None,
        )


def _gripper_dict_to_gripper_res(
    gripper_dict: GripperDict, fw_version: Optional[int]
) -> Gripper:
    """Convert GripperDict to Gripper response model."""
    calibration_data = gripper_dict["calibration_offset"]
    return Gripper.model_construct(
        firmwareVersion=str(fw_version) if fw_version else None,
        ok=True,
        mount=MountType.EXTENSION.value,
        instrumentModel=GripperModelStr(str(gripper_dict["model"])),
        serialNumber=gripper_dict["gripper_id"],
        subsystem=SubSystem.from_hw(HWSubSystem.of_mount(OT3Mount.GRIPPER)),
        data=GripperData(
            jawState=gripper_dict["state"].name.lower(),
            calibratedOffset=InstrumentCalibrationData.model_construct(
                offset=Vec3f(
                    x=calibration_data.offset.x,
                    y=calibration_data.offset.y,
                    z=calibration_data.offset.z,
                ),
                source=calibration_data.source,
                last_modified=calibration_data.last_modified,
                reasonability_check_failures=[],
            ),
        ),
    )


def _bad_gripper_response() -> BadGripper:
    return BadGripper(
        instrumentType="gripper",
        subsystem=SubSystem.gripper,
        status=status_route_for(SubSystem.gripper),
        update=update_route_for(SubSystem.gripper),
        ok=False,
    )


def _bad_pipette_response(subsystem: SubSystem) -> BadPipette:
    return BadPipette(
        instrumentType="pipette",
        subsystem=subsystem,
        status=status_route_for(subsystem),
        update=update_route_for(subsystem),
        ok=False,
    )


async def _get_gripper_instrument_data(
    hardware: OT3HardwareControlAPI,
    attached_gripper: Optional[GripperDict],
) -> Optional[AttachedItem]:
    subsys = HWSubSystem.of_mount(OT3Mount.GRIPPER)
    status = hardware.attached_subsystems.get(subsys)
    if status and (status.fw_update_needed or not status.ok):
        return _bad_gripper_response()
    if attached_gripper:
        return _gripper_dict_to_gripper_res(
            gripper_dict=attached_gripper,
            fw_version=status.current_fw_version if status else None,
        )
    return None


async def _get_pipette_instrument_data(
    hardware: OT3HardwareControlAPI,
    attached_pipettes: Dict[Mount, PipetteDict],
    mount: Mount,
) -> Optional[AttachedItem]:
    pipette_dict = attached_pipettes.get(mount)
    subsys = HWSubSystem.of_mount(mount)
    status = hardware.attached_subsystems.get(subsys)
    if status and (status.fw_update_needed or not status.ok):
        return _bad_pipette_response(SubSystem.from_hw(subsys))
    if pipette_dict:
        offset = cast(
            Optional[PipetteOffsetSummary],
            hardware.get_instrument_offset(OT3Mount.from_mount(mount)),
        )
        pipette_state = await hardware.get_instrument_state(mount)
        return _pipette_dict_to_pipette_res(
            pipette_dict=pipette_dict,
            mount=mount,
            pipette_offset=offset,
            fw_version=status.current_fw_version if status else None,
            pipette_state=pipette_state,
        )
    return None


async def _get_instrument_data(
    hardware: OT3HardwareControlAPI,
) -> List[AttachedItem]:
    attached_pipettes = hardware.attached_pipettes
    attached_gripper = hardware.attached_gripper

    pipette_left = await _get_pipette_instrument_data(
        hardware, attached_pipettes, Mount.LEFT
    )
    pipette_right = await _get_pipette_instrument_data(
        hardware, attached_pipettes, Mount.RIGHT
    )
    gripper = await _get_gripper_instrument_data(hardware, attached_gripper)

    info_list = []
    for info in (pipette_left, pipette_right, gripper):
        if info:
            info_list.append(info)
    return info_list


async def _get_attached_instruments_ot3(
    hardware: OT3HardwareControlAPI,
) -> PydanticResponse[SimpleMultiBody[AttachedItem]]:
    # OT3
    await hardware.cache_instruments(skip_if_would_block=True)
    response_data = await _get_instrument_data(hardware)
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(
            data=response_data,
            meta=MultiBodyMeta(cursor=0, totalLength=len(response_data)),
        ),
        status_code=status.HTTP_200_OK,
    )


async def _get_attached_instruments_ot2(
    hardware: HardwareControlAPI,
) -> PydanticResponse[SimpleMultiBody[AttachedItem]]:
    pipettes = hardware.attached_instruments
    response_data = [
        _pipette_dict_to_pipette_res(
            pipette_dict=pipette_dict,
            mount=mount,
            pipette_offset=None,
            fw_version=None,
            pipette_state=None,
        )
        for mount, pipette_dict in pipettes.items()
        if pipette_dict
    ]
    return await PydanticResponse.create(
        content=SimpleMultiBody.model_construct(
            data=response_data,
            meta=MultiBodyMeta(cursor=0, totalLength=len(response_data)),
        ),
        status_code=status.HTTP_200_OK,
    )


@PydanticResponse.wrap_route(
    instruments_router.get,
    path="/instruments",
    summary="Get attached instruments",
    description=(
        "Get a list of all instruments (pipettes & gripper) currently attached"
        " to the robot."
        "\n\n"
        "**Warning:** The behavior of this endpoint is currently only defined for Flex"
        " robots. For OT-2 robots, use `/pipettes` instead."
    ),
    responses={status.HTTP_200_OK: {"model": SimpleMultiBody[AttachedItem]}},
)
async def get_attached_instruments(
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
) -> PydanticResponse[SimpleMultiBody[AttachedItem]]:
    """Get a list of all attached instruments.

    Note: This endpoint returns the full AttachedItem data for Flex instruments only.

          On an OT-2, this endpoint will provide partial data of the OT-2 pipettes
          (no pipette fw and calibration data), and will not fetch new data after
          a pipette attachment/ removal.
    """
    try:
        ot3_hardware = ensure_ot3_hardware(hardware_api=hardware)
        return await _get_attached_instruments_ot3(ot3_hardware)
    except HardwareNotSupportedError:
        # OT2
        pass
    return await _get_attached_instruments_ot2(hardware)
