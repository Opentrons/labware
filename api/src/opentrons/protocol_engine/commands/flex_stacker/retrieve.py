"""Command models to retrieve a labware from a Flex Stacker."""
from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
    CannotPerformModuleAction,
    LocationIsOccupiedError,
)
from ...state import update_types
from ...types import ModuleLocation

if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler

RetrieveCommandType = Literal["flexStacker/retrieve"]


class RetrieveParams(BaseModel):
    """Input parameters for a labware retrieval command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the Flex Stacker.",
    )


class RetrieveResult(BaseModel):
    """Result data from a labware retrieval command."""

    labware_id: str = Field(
        ...,
        description="The labware ID of the retrieved labware.",
    )


class RetrieveImpl(AbstractCommandImpl[RetrieveParams, SuccessData[RetrieveResult]]):
    """Implementation of a labware retrieval command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: RetrieveParams) -> SuccessData[RetrieveResult]:
        """Execute the labware retrieval command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )

        if stacker_state.in_static_mode:
            raise CannotPerformModuleAction(
                "Cannot retrieve labware from Flex Stacker while in static mode"
            )

        stacker_loc = ModuleLocation(moduleId=params.moduleId)
        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        if not stacker_state.hopper_labware_ids:
            raise CannotPerformModuleAction(
                f"Flex Stacker {params.moduleId} has no labware to retrieve"
            )

        try:
            self._state_view.labware.raise_if_labware_in_location(stacker_loc)
        except LocationIsOccupiedError:
            raise CannotPerformModuleAction(
                "Cannot retrieve a labware from Flex Stacker if the carriage is occupied"
            )

        state_update = update_types.StateUpdate()

        # Get the labware dimensions for the labware being retrieved,
        # which is the first one in the hopper labware id list
        lw_id = stacker_state.hopper_labware_ids[0]
        if stacker_hw is not None:
            labware = self._state_view.labware.get(lw_id)
            labware_height = self._state_view.labware.get_dimensions(labware_id=lw_id).z
            if labware.lid_id is not None:
                lid_def = self._state_view.labware.get_definition(labware.lid_id)
                offset = self._state_view.labware.get_labware_overlap_offsets(
                    lid_def, labware.loadName
                ).z
                labware_height = labware_height + lid_def.dimensions.zDimension - offset
            await stacker_hw.dispense_labware(labware_height=labware_height)

        # update the state to reflect the labware is now in the flex stacker slot
        state_update.set_labware_location(
            labware_id=lw_id,
            new_location=ModuleLocation(moduleId=params.moduleId),
            new_offset_id=None,
        )
        state_update.retrieve_flex_stacker_labware(
            module_id=params.moduleId, labware_id=lw_id
        )
        return SuccessData(
            public=RetrieveResult(labware_id=lw_id), state_update=state_update
        )


class Retrieve(BaseCommand[RetrieveParams, RetrieveResult, ErrorOccurrence]):
    """A command to retrieve a labware from a Flex Stacker."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams
    result: Optional[RetrieveResult]

    _ImplementationCls: Type[RetrieveImpl] = RetrieveImpl


class RetrieveCreate(BaseCommandCreate[RetrieveParams]):
    """A request to execute a Flex Stacker retrieve command."""

    commandType: RetrieveCommandType = "flexStacker/retrieve"
    params: RetrieveParams

    _CommandCls: Type[Retrieve] = Retrieve
