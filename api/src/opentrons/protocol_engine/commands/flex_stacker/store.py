"""Command models to retrieve a labware from a Flex Stacker."""
from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors import (
    ErrorOccurrence,
    CannotPerformModuleAction,
    LabwareNotLoadedOnModuleError,
)
from ...state import update_types
from ...types import OFF_DECK_LOCATION


if TYPE_CHECKING:
    from opentrons.protocol_engine.state.state import StateView
    from opentrons.protocol_engine.execution import EquipmentHandler


StoreCommandType = Literal["flexStacker/store"]


class StoreParams(BaseModel):
    """Input parameters for a labware storage command."""

    moduleId: str = Field(
        ...,
        description="Unique ID of the flex stacker.",
    )


class StoreResult(BaseModel):
    """Result data from a labware storage command."""


class StoreImpl(AbstractCommandImpl[StoreParams, SuccessData[StoreResult]]):
    """Implementation of a labware storage command."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        **kwargs: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment

    async def execute(self, params: StoreParams) -> SuccessData[StoreResult]:
        """Execute the labware storage command."""
        stacker_state = self._state_view.modules.get_flex_stacker_substate(
            params.moduleId
        )
        if stacker_state.in_static_mode:
            raise CannotPerformModuleAction(
                "Cannot store labware in Flex Stacker while in static mode"
            )

        # Allow propagation of ModuleNotAttachedError.
        stacker_hw = self._equipment.get_module_hardware_api(stacker_state.module_id)

        try:
            lw_id = self._state_view.labware.get_id_by_module(params.moduleId)
        except LabwareNotLoadedOnModuleError:
            raise CannotPerformModuleAction(
                "Cannot store labware if Flex Stacker carriage is empty"
            )

        # TODO: check the type of the labware should match that already in the stack
        state_update = update_types.StateUpdate()

        if stacker_hw is not None:
            labware = self._state_view.labware.get(lw_id)
            labware_height = self._state_view.labware.get_dimensions(labware_id=lw_id).z
            if labware.lid_id is not None:
                lid_def = self._state_view.labware.get_definition(labware.lid_id)
                offset = self._state_view.labware.get_labware_overlap_offsets(
                    lid_def, labware.loadName
                ).z
                labware_height = labware_height + lid_def.dimensions.zDimension - offset
            await stacker_hw.store_labware(labware_height=labware_height)

        # update the state to reflect the labware is store in the stack
        state_update.set_labware_location(
            labware_id=lw_id,
            new_location=OFF_DECK_LOCATION,
            new_offset_id=None,
        )
        state_update.store_flex_stacker_labware(
            module_id=params.moduleId, labware_id=lw_id
        )

        return SuccessData(public=StoreResult(), state_update=state_update)


class Store(BaseCommand[StoreParams, StoreResult, ErrorOccurrence]):
    """A command to store a labware in a Flex Stacker."""

    commandType: StoreCommandType = "flexStacker/store"
    params: StoreParams
    result: Optional[StoreResult]

    _ImplementationCls: Type[StoreImpl] = StoreImpl


class StoreCreate(BaseCommandCreate[StoreParams]):
    """A request to execute a Flex Stacker store command."""

    commandType: StoreCommandType = "flexStacker/store"
    params: StoreParams

    _CommandCls: Type[Store] = Store
