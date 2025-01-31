"""Command models to start heating a Thermocycler's block."""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING, Any
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


SetTargetBlockTemperatureCommandType = Literal["thermocycler/setTargetBlockTemperature"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class SetTargetBlockTemperatureParams(BaseModel):
    """Input parameters to set a Thermocycler's target block temperature."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler Module.")
    celsius: float = Field(..., description="Target temperature in °C.")
    blockMaxVolumeUl: float | SkipJsonSchema[None] = Field(
        None,
        description="Amount of liquid in uL of the most-full well"
        " in labware loaded onto the thermocycler.",
        json_schema_extra=_remove_default,
    )
    holdTimeSeconds: float | SkipJsonSchema[None] = Field(
        None,
        description="Amount of time, in seconds, to hold the temperature for."
        " If specified, a waitForBlockTemperature command will block until"
        " the given hold time has elapsed.",
        json_schema_extra=_remove_default,
    )


class SetTargetBlockTemperatureResult(BaseModel):
    """Result data from setting a Thermocycler's target block temperature."""

    targetBlockTemperature: float = Field(
        ...,
        description="The target block temperature that was set after validation.",
    )


class SetTargetBlockTemperatureImpl(
    AbstractCommandImpl[
        SetTargetBlockTemperatureParams,
        SuccessData[SetTargetBlockTemperatureResult],
    ]
):
    """Execution implementation of a Thermocycler's set block temperature command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(
        self,
        params: SetTargetBlockTemperatureParams,
    ) -> SuccessData[SetTargetBlockTemperatureResult]:
        """Set a Thermocycler's target block temperature."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        target_temperature = thermocycler_state.validate_target_block_temperature(
            params.celsius
        )
        target_volume: Optional[float]
        if params.blockMaxVolumeUl is not None:
            target_volume = thermocycler_state.validate_max_block_volume(
                params.blockMaxVolumeUl
            )
        else:
            target_volume = None
        hold_time: Optional[float]
        if params.holdTimeSeconds is not None:
            hold_time = thermocycler_state.validate_hold_time(params.holdTimeSeconds)
        else:
            hold_time = None

        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        if thermocycler_hardware is not None:
            await thermocycler_hardware.set_target_block_temperature(
                target_temperature, volume=target_volume, hold_time_seconds=hold_time
            )

        return SuccessData(
            public=SetTargetBlockTemperatureResult(
                targetBlockTemperature=target_temperature
            ),
        )


class SetTargetBlockTemperature(
    BaseCommand[
        SetTargetBlockTemperatureParams,
        SetTargetBlockTemperatureResult,
        ErrorOccurrence,
    ]
):
    """A command to set a Thermocycler's target block temperature."""

    commandType: SetTargetBlockTemperatureCommandType = (
        "thermocycler/setTargetBlockTemperature"
    )
    params: SetTargetBlockTemperatureParams
    result: Optional[SetTargetBlockTemperatureResult] = None

    _ImplementationCls: Type[
        SetTargetBlockTemperatureImpl
    ] = SetTargetBlockTemperatureImpl


class SetTargetBlockTemperatureCreate(
    BaseCommandCreate[SetTargetBlockTemperatureParams]
):
    """A request to create a Thermocycler's set block temperature command."""

    commandType: SetTargetBlockTemperatureCommandType = (
        "thermocycler/setTargetBlockTemperature"
    )
    params: SetTargetBlockTemperatureParams

    _CommandCls: Type[SetTargetBlockTemperature] = SetTargetBlockTemperature
