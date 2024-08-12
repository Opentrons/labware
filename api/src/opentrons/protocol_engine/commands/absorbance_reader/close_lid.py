"""Command models to close the lid on an Absorbance Reader."""
from __future__ import annotations
from typing import Optional, Literal, TYPE_CHECKING
from typing_extensions import Type

from pydantic import BaseModel, Field

from ..command import AbstractCommandImpl, BaseCommand, BaseCommandCreate, SuccessData
from ...errors.error_occurrence import ErrorOccurrence
from ...errors import CannotPerformModuleAction
from opentrons.protocol_engine.types import AddressableAreaLocation

from opentrons.protocol_engine.resources import labware_validation
from .types import MoveLidResult

from opentrons.drivers.types import AbsorbanceReaderLidStatus

if TYPE_CHECKING:
    from opentrons.protocol_engine.state import StateView
    from opentrons.protocol_engine.execution import (
        EquipmentHandler,
        LabwareMovementHandler,
    )


CloseLidCommandType = Literal["absorbanceReader/closeLid"]


class CloseLidParams(BaseModel):
    """Input parameters to close the lid on an absorbance reading."""

    moduleId: str = Field(..., description="Unique ID of the absorbance reader.")


class CloseLidResult(MoveLidResult):
    """Result data from closing the lid on an aborbance reading."""


class CloseLidImpl(
    AbstractCommandImpl[CloseLidParams, SuccessData[CloseLidResult, None]]
):
    """Execution implementation of closing the lid on an Absorbance Reader."""

    def __init__(
        self,
        state_view: StateView,
        equipment: EquipmentHandler,
        labware_movement: LabwareMovementHandler,
        **unused_dependencies: object,
    ) -> None:
        self._state_view = state_view
        self._equipment = equipment
        self._labware_movement = labware_movement

    async def execute(
        self, params: CloseLidParams
    ) -> SuccessData[CloseLidResult, None]:
        """Execute the close lid command."""
        mod_substate = self._state_view.modules.get_absorbance_reader_substate(
            module_id=params.moduleId
        )

        # lid should currently be on the module
        assert mod_substate.lid_id is not None
        loaded_lid = self._state_view.labware.get(mod_substate.lid_id)
        assert labware_validation.is_absorbance_reader_lid(loaded_lid.loadName)

        # If the lid is already Closed, No-op out
        if mod_substate.is_lid_on:
            current_offset_id = self._equipment.find_applicable_labware_offset_id(
                labware_definition_uri=loaded_lid.definitionUri,
                labware_location=loaded_lid.location,
            )
            return SuccessData(
                public=CloseLidResult(
                    lidId=loaded_lid.id,
                    newLocation=loaded_lid.location,
                    offsetId=current_offset_id,
                ),
                private=None,
            )

        # Allow propagation of ModuleNotAttachedError.
        _ = self._equipment.get_module_hardware_api(mod_substate.module_id)

        current_location = loaded_lid.location
        validated_current_location = (
            self._state_view.geometry.ensure_valid_gripper_location(current_location)
        )

        # we need to move the lid onto the module reader
        absorbance_model = self._state_view.modules.get_requested_model(params.moduleId)
        assert absorbance_model is not None
        new_location = AddressableAreaLocation(
            addressableAreaName=self._state_view.modules.ensure_and_convert_module_fixture_location(
                deck_slot=self._state_view.modules.get_location(
                    params.moduleId
                ).slotName,
                deck_type=self._state_view.config.deck_type,
                model=absorbance_model,
            )
        )
        validated_new_location = (
            self._state_view.geometry.ensure_valid_gripper_location(new_location)
        )

        lid_gripper_offsets = self._state_view.labware.get_labware_gripper_offsets(
            loaded_lid.id, None
        )
        if lid_gripper_offsets is None:
            raise ValueError(
                "Gripper Offset values for Absorbance Reader Lid labware must not be None."
            )

        # Skips gripper moves when using virtual gripper
        await self._labware_movement.move_labware_with_gripper(
            labware_id=loaded_lid.id,
            current_location=validated_current_location,
            new_location=validated_new_location,
            user_offset_data=lid_gripper_offsets,
            post_drop_slide_offset=None,
        )

        new_offset_id = self._equipment.find_applicable_labware_offset_id(
            labware_definition_uri=loaded_lid.definitionUri,
            labware_location=new_location,
        )

        if not self._state_view.config.use_virtual_modules:
            abs_reader = self._equipment.get_module_hardware_api(mod_substate.module_id)

            if abs_reader is not None:
                result = await abs_reader.get_current_lid_status()
                if result is not AbsorbanceReaderLidStatus.ON:
                    raise CannotPerformModuleAction(
                        "The Opentrons Plate Reader lid mechanicaly position did not match expected Closed state."
                    )
            else:
                raise CannotPerformModuleAction(
                    "Could not reach the Hardware API for Opentrons Plate Reader Module."
                )

        return SuccessData(
            public=CloseLidResult(
                lidId=loaded_lid.id, newLocation=new_location, offsetId=new_offset_id
            ),
            private=None,
        )


class CloseLid(BaseCommand[CloseLidParams, CloseLidResult, ErrorOccurrence]):
    """A command to close the lid on an Absorbance Reader."""

    commandType: CloseLidCommandType = "absorbanceReader/closeLid"
    params: CloseLidParams
    result: Optional[CloseLidResult]

    _ImplementationCls: Type[CloseLidImpl] = CloseLidImpl


class CloseLidCreate(BaseCommandCreate[CloseLidParams]):
    """A request to execute an Absorbance Reader close lid command."""

    commandType: CloseLidCommandType = "absorbanceReader/closeLid"
    params: CloseLidParams

    _CommandCls: Type[CloseLid] = CloseLid
