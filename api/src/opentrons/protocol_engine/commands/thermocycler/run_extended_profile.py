"""Command models to execute a Thermocycler profile."""
from __future__ import annotations
from typing import List, Optional, TYPE_CHECKING, overload, Union, Any
from typing_extensions import Literal, Type

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from opentrons.hardware_control.modules.types import ThermocyclerStep, ThermocyclerCycle

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler
    from opentrons.protocol_engine.state.module_substates.thermocycler_module_substate import (
        ThermocyclerModuleSubState,
    )


RunExtendedProfileCommandType = Literal["thermocycler/runExtendedProfile"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


class ProfileStep(BaseModel):
    """An individual step in a Thermocycler extended profile."""

    celsius: float = Field(..., description="Target temperature in °C.")
    holdSeconds: float = Field(
        ..., description="Time to hold target temperature in seconds."
    )


class ProfileCycle(BaseModel):
    """An individual cycle in a Thermocycler extended profile."""

    steps: List[ProfileStep] = Field(..., description="Steps to repeat.")
    repetitions: int = Field(..., description="Number of times to repeat the steps.")


class RunExtendedProfileParams(BaseModel):
    """Input parameters for an individual Thermocycler profile step."""

    moduleId: str = Field(..., description="Unique ID of the Thermocycler.")
    profileElements: List[Union[ProfileStep, ProfileCycle]] = Field(
        ...,
        description="Elements of the profile. Each can be either a step or a cycle.",
    )
    blockMaxVolumeUl: float | SkipJsonSchema[None] = Field(
        None,
        description="Amount of liquid in uL of the most-full well"
        " in labware loaded onto the thermocycler.",
        json_schema_extra=_remove_default,
    )


class RunExtendedProfileResult(BaseModel):
    """Result data from running a Thermocycler profile."""


def _transform_profile_step(
    step: ProfileStep, thermocycler_state: ThermocyclerModuleSubState
) -> ThermocyclerStep:
    return ThermocyclerStep(
        temperature=thermocycler_state.validate_target_block_temperature(step.celsius),
        hold_time_seconds=step.holdSeconds,
    )


@overload
def _transform_profile_element(
    element: ProfileStep, thermocycler_state: ThermocyclerModuleSubState
) -> ThermocyclerStep:
    ...


@overload
def _transform_profile_element(
    element: ProfileCycle, thermocycler_state: ThermocyclerModuleSubState
) -> ThermocyclerCycle:
    ...


def _transform_profile_element(
    element: Union[ProfileStep, ProfileCycle],
    thermocycler_state: ThermocyclerModuleSubState,
) -> Union[ThermocyclerStep, ThermocyclerCycle]:
    if isinstance(element, ProfileStep):
        return _transform_profile_step(element, thermocycler_state)
    else:
        return ThermocyclerCycle(
            steps=[
                _transform_profile_step(step, thermocycler_state)
                for step in element.steps
            ],
            repetitions=element.repetitions,
        )


class RunExtendedProfileImpl(
    AbstractCommandImpl[RunExtendedProfileParams, SuccessData[RunExtendedProfileResult]]
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

    async def execute(
        self, params: RunExtendedProfileParams
    ) -> SuccessData[RunExtendedProfileResult]:
        """Run a Thermocycler profile."""
        thermocycler_state = self._state_view.modules.get_thermocycler_module_substate(
            params.moduleId
        )
        thermocycler_hardware = self._equipment.get_module_hardware_api(
            thermocycler_state.module_id
        )

        profile = [
            _transform_profile_element(element, thermocycler_state)
            for element in params.profileElements
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
            await thermocycler_hardware.execute_profile(
                profile=profile, volume=target_volume
            )

        return SuccessData(
            public=RunExtendedProfileResult(),
        )


class RunExtendedProfile(
    BaseCommand[RunExtendedProfileParams, RunExtendedProfileResult, ErrorOccurrence]
):
    """A command to execute a Thermocycler profile run."""

    commandType: RunExtendedProfileCommandType = "thermocycler/runExtendedProfile"
    params: RunExtendedProfileParams
    result: Optional[RunExtendedProfileResult] = None

    _ImplementationCls: Type[RunExtendedProfileImpl] = RunExtendedProfileImpl


class RunExtendedProfileCreate(BaseCommandCreate[RunExtendedProfileParams]):
    """A request to execute a Thermocycler profile run."""

    commandType: RunExtendedProfileCommandType = "thermocycler/runExtendedProfile"
    params: RunExtendedProfileParams

    _CommandCls: Type[RunExtendedProfile] = RunExtendedProfile
