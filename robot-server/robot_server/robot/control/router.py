"""Router for /robot/control endpoints."""
from typing import Annotated, TYPE_CHECKING

from fastapi import status, Depends
from server_utils.fastapi_utils.light_router import LightRouter

from opentrons_shared_data.robot.types import RobotType
from opentrons_shared_data.robot.types import RobotTypeEnum
from robot_server.hardware import get_robot_type

from robot_server.errors.error_responses import ErrorBody
from robot_server.errors.robot_errors import NotSupportedOnOT2
from robot_server.service.json_api import (
    PydanticResponse,
    SimpleBody,
)

from .models import EstopStatusModel, DoorStatusModel, DoorState
from .estop_handler import EstopHandler
from robot_server.hardware import get_estop_handler, get_hardware
from opentrons.hardware_control import HardwareControlAPI
from opentrons.config import feature_flags as ff

if TYPE_CHECKING:
    from opentrons.hardware_control.ot3api import OT3API  # noqa: F401

control_router = LightRouter()


async def _get_estop_status_response(
    estop_handler: EstopHandler,
) -> PydanticResponse[SimpleBody[EstopStatusModel]]:
    """Helper to generate the current Estop Status as a response model."""
    data = EstopStatusModel.model_construct(
        status=estop_handler.get_state(),
        leftEstopPhysicalStatus=estop_handler.get_left_physical_status(),
        rightEstopPhysicalStatus=estop_handler.get_right_physical_status(),
    )
    return await PydanticResponse.create(content=SimpleBody.model_construct(data=data))


@PydanticResponse.wrap_route(
    control_router.get,
    path="/robot/control/estopStatus",
    summary="Get connected estop status.",
    description="Get the current estop status of the robot, as well as a list of connected estops.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[EstopStatusModel]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
    },
)
async def get_estop_status(
    estop_handler: Annotated[EstopHandler, Depends(get_estop_handler)],
) -> PydanticResponse[SimpleBody[EstopStatusModel]]:
    """Return the current status of the estop."""
    return await _get_estop_status_response(estop_handler)


@PydanticResponse.wrap_route(
    control_router.put,
    path="/robot/control/acknowledgeEstopDisengage",
    summary="Acknowledge and clear an Estop event.",
    description="If the estop is currently logically engaged (the estop was previously pressed but is "
    + "now released), this endpoint will reset the state to reflect the current physical status.",
    responses={
        status.HTTP_200_OK: {"model": SimpleBody[EstopStatusModel]},
        status.HTTP_403_FORBIDDEN: {"model": ErrorBody[NotSupportedOnOT2]},
    },
)
async def put_acknowledge_estop_disengage(
    estop_handler: Annotated[EstopHandler, Depends(get_estop_handler)],
) -> PydanticResponse[SimpleBody[EstopStatusModel]]:
    """Transition from the `logically_engaged` status if applicable."""
    estop_handler.acknowledge_and_clear()
    return await _get_estop_status_response(estop_handler)


def get_door_switch_required(
    robot_type: Annotated[RobotType, Depends(get_robot_type)]
) -> bool:
    return ff.enable_door_safety_switch(RobotTypeEnum.robot_literal_to_enum(robot_type))


@PydanticResponse.wrap_route(
    control_router.get,
    path="/robot/door/status",
    summary="Get the status of the robot door.",
    description="Get whether the robot door is open or closed.",
    responses={status.HTTP_200_OK: {"model": SimpleBody[DoorStatusModel]}},
)
async def get_door_status(
    hardware: Annotated[HardwareControlAPI, Depends(get_hardware)],
    door_required: Annotated[bool, Depends(get_door_switch_required)],
) -> PydanticResponse[SimpleBody[DoorStatusModel]]:
    return await PydanticResponse.create(
        content=SimpleBody.model_construct(
            data=DoorStatusModel.model_construct(
                status=DoorState.from_hw_physical_status(hardware.door_state),
                doorRequiredClosedForProtocol=door_required,
            )
        )
    )
