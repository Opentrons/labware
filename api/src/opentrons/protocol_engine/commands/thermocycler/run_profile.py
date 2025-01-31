"""Command models to execute a Thermocycler profile."""
from __future__ import annotations
from typing import List, Optional, TYPE_CHECKING, Any
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.hardware_control.modules.types import ThermocyclerStep

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


RunProfileCommandType = Literal["thermocycler/runProfile"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class RunProfileStepParams(BaseModel):
    """Input parameters for an individual Thermocycler profile step."""

    celsius: float = Field(..., description="Target temperature in °C.")
    holdSeconds: float = Field(
        ..., description="Time to hold target temperature at in seconds."
    )


class RunProfileParams(BaseModel):
    """Input parameters to run a Thermocycler profile."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler.")
    profile: List[RunProfileStepParams] = Field(
        ...,
        description="Array of profile steps with target temperature and temperature hold time.",
    )
    blockMaxVolumeUl: float | SkipJsonSchema[None] = Field(
        None,
        description="Amount of liquid in uL of the most-full well"
        " in labware loaded onto the thermocycler.",
        json_schema_extra=_remove_default,
    )


class RunProfileResult(BaseModel):
    """Result data from running a Thermocycler profile."""


class RunProfileImpl(
    AbstractCommandImpl[RunProfileParams, SuccessData[RunProfileResult]]
):
    """Execution implementation of a Thermocycler's run profile command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: RunProfileParams) -> SuccessData[RunProfileResult]:
        """Run a Thermocycler profile."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        steps = [
            ThermocyclerStep(
                temperature=thermocycler_state.validate_target_block_temperature(
                    profile_step.celsius
                ),
                hold_time_seconds=profile_step.holdSeconds,
            )
            for profile_step in params.profile
        ]

        target_volume: Optional[float]
        if params.blockMaxVolumeUl is not None:
            target_volume = thermocycler_state.validate_max_block_volume(
                params.blockMaxVolumeUl
            )
        else:
            target_volume = None

        if thermocycler_hardware is not None:
            # TODO(jbl 2022-06-27) hardcoded constant 1 for `repetitions` should be
            #  moved from HardwareControlAPI to the Python ProtocolContext
            await thermocycler_hardware.cycle_temperatures(
                steps=steps, repetitions=1, volume=target_volume
            )

        return SuccessData(
            public=RunProfileResult(),
        )


class RunProfile(BaseCommand[RunProfileParams, RunProfileResult, ErrorOccurrence]):
    """A command to execute a Thermocycler profile run."""

    commandType: RunProfileCommandType = "thermocycler/runProfile"
    params: RunProfileParams
    result: Optional[RunProfileResult] = None

    _ImplementationCls: Type[RunProfileImpl] = RunProfileImpl


class RunProfileCreate(BaseCommandCreate[RunProfileParams]):
    """A request to execute a Thermocycler profile run."""

    commandType: RunProfileCommandType = "thermocycler/runProfile"
    params: RunProfileParams

    _CommandCls: Type[RunProfile] = RunProfile
