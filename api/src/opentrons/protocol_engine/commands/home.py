"""Home command payload, result, and implementation models."""
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, List, Type, Any

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from typing_extensions import Literal

from opentrons.types import MountType
from ..state import update_types
from ..types import MotorAxis
from .command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ..errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from ..execution import MovementHandler


HomeCommandType = Literal["home"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class HomeParams(BaseModel):
    """Payload required for a Home command."""

    axes: List[MotorAxis] | SkipJsonSchema[None] = Field(
        None,
        description=(
            "Axes to return to their home positions. If omitted,"
            " will home all motors. Extra axes may be implicitly homed"
            " to ensure accurate homing of the explicitly specified axes."
        ),
        json_schema_extra=_remove_default,
    )
    skipIfMountPositionOk: MountType | SkipJsonSchema[None] = Field(
        None,
        description=(
            "If this parameter is provided, the gantry will only be homed if the"
            " specified mount has an invalid position. If omitted, the homing action"
            " will be executed unconditionally."
        ),
        json_schema_extra=_remove_default,
    )


class HomeResult(BaseModel):
    """Result data from the execution of a Home command."""


class HomeImplementation(AbstractCommandImpl[HomeParams, SuccessData[HomeResult]]):
    """Home command implementation."""

    def __init__(self, movement: MovementHandler, **kwargs: object) -> None:
        self._movement = movement

    async def execute(self, params: HomeParams) -> SuccessData[HomeResult]:
        """Home some or all motors to establish positional accuracy."""
        state_update = update_types.StateUpdate()

        if (
            params.skipIfMountPositionOk is None
            or not await self._movement.check_for_valid_position(
                mount=params.skipIfMountPositionOk
            )
        ):
            await self._movement.home(axes=params.axes)

        # todo(mm, 2024-09-17): Clearing all pipette locations *unconditionally* is to
        # preserve prior behavior, but we might only want to do this if we actually home.
        state_update.clear_all_pipette_locations()

        return SuccessData(public=HomeResult(), state_update=state_update)


class Home(BaseCommand[HomeParams, HomeResult, ErrorOccurrence]):
    """Command to send some (or all) motors to their home positions.

    Homing a motor re-establishes positional accuracy the first time a motor
    is used, or any time the motor "loses" its position, for example, after
    a halt or after a collision.
    """

    commandType: HomeCommandType = "home"
    params: HomeParams
    result: Optional[HomeResult] = None

    _ImplementationCls: Type[HomeImplementation] = HomeImplementation


class HomeCreate(BaseCommandCreate[HomeParams]):
    """Data to create a Home command."""

    commandType: HomeCommandType = "home"
    params: HomeParams

    _CommandCls: Type[Home] = Home
