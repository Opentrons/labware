"""Models and implementation for the ``moveLid`` command."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Type, Any, List

from pydantic.json_schema import SkipJsonSchema
from pydantic import BaseModel, Field
from typing_extensions import Literal

from opentrons_shared_data.errors.exceptions import (
    FailedGripperPickupError,
    LabwareDroppedError,
    StallOrCollisionDetectedError,
)

from opentrons.protocol_engine.resources.model_utils import ModelUtils
from opentrons.types import Point
from ..types import (
    CurrentWell,
    LabwareLocation,
    DeckSlotLocation,
    OnLabwareLocation,
    AddressableAreaLocation,
    LabwareMovementStrategy,
    LabwareOffsetVector,
    LabwareMovementOffsetData,
)
from ..errors import (
    LabwareMovementNotAllowedError,
    NotSupportedOnRobotType,
    LabwareOffsetDoesNotExistError,
)
from ..resources import labware_validation, fixture_validation
from .command import (
    AbstractCommandImpl,
    BaseCommand,
    BaseCommandCreate,
    DefinedErrorData,
    SuccessData,
)
from ..errors.error_occurrence import ErrorOccurrence
from ..state.update_types import StateUpdate
from opentrons_shared_data.gripper.constants import GRIPPER_PADDLE_WIDTH
from .move_labware import GripperMovementError

if TYPE_CHECKING:
    from ..execution import EquipmentHandler, RunControlHandler, LabwareMovementHandler
    from ..state.state import StateView


MoveLidCommandType = Literal["moveLid"]


def _remove_default(s: dict[str, Any]) -> None:
    s.pop("default", None)


# Extra buffer on top of minimum distance to move to the right
_TRASH_CHUTE_DROP_BUFFER_MM = 8
_LID_STACK_PE_LABWARE = "protocol_engine_lid_stack_object"
_LID_STACK_PE_NAMESPACE = "opentrons"
_LID_STACK_PE_VERSION = 1


class MoveLidParams(BaseModel):
    """Input parameters for a ``moveLid`` command."""

    labwareId: str = Field(..., description="The ID of the labware to move.")
    newLocation: LabwareLocation = Field(..., description="Where to move the labware.")
    strategy: LabwareMovementStrategy = Field(
        ...,
        description="Whether to use the gripper to perform the labware movement"
        " or to perform a manual movement with an option to pause.",
    )
    pickUpOffset: LabwareOffsetVector | SkipJsonSchema[None] = Field(
        None,
        description="Offset to use when picking up labware. "
        "Experimental param, subject to change",
        json_schema_extra=_remove_default,
    )
    dropOffset: LabwareOffsetVector | SkipJsonSchema[None] = Field(
        None,
        description="Offset to use when dropping off labware. "
        "Experimental param, subject to change",
        json_schema_extra=_remove_default,
    )


class MoveLidResult(BaseModel):
    """The output of a successful ``moveLid`` command."""

    offsetId: Optional[str] = Field(
        # Default `None` instead of `...` so this field shows up as non-required in
        # OpenAPI. The server is allowed to omit it or make it null.
        None,
        description=(
            "An ID referencing the labware offset that will apply to this labware"
            " now that it's in the new location."
            " This offset will be in effect until the labware is moved"
            " with another `moveLid` command."
            " Null or undefined means no offset applies,"
            " so the default of (0, 0, 0) will be used."
        ),
    )


_ExecuteReturn = SuccessData[MoveLidResult] | DefinedErrorData[GripperMovementError]


class MoveLidImplementation(AbstractCommandImpl[MoveLidParams, _ExecuteReturn]):
    """The execution implementation for ``moveLid`` commands."""

    def __init__(
        self,
        model_utils: ModelUtils,
        state_view: StateView,
        equipment: EquipmentHandler,
        labware_movement: LabwareMovementHandler,
        run_control: RunControlHandler,
        **kwargs: object,
    ) -> None:
        self._model_utils = model_utils
        self._state_view = state_view
        self._equipment = equipment
        self._labware_movement = labware_movement
        self._run_control = run_control

    async def execute(self, params: MoveLidParams) -> _ExecuteReturn:  # noqa: C901
        """Move a loaded lid to a new location."""
        state_update = StateUpdate()
        if not labware_validation.validate_definition_is_lid(
            self._state_view.labware.get_definition(params.labwareId)
        ):
            raise ValueError(
                f"MoveLid command can only move labware with allowed role 'lid'. {self._state_view.labware.get_load_name(params.labwareId)}"
            )

        # Allow propagation of LabwareNotLoadedError.
        current_labware = self._state_view.labware.get(labware_id=params.labwareId)
        current_labware_definition = self._state_view.labware.get_definition(
            labware_id=params.labwareId
        )
        definition_uri = current_labware.definitionUri
        post_drop_slide_offset: Optional[Point] = None
        trash_lid_drop_offset: Optional[LabwareOffsetVector] = None

        if isinstance(params.newLocation, AddressableAreaLocation):
            area_name = params.newLocation.addressableAreaName
            if (
                not fixture_validation.is_gripper_waste_chute(area_name)
                and not fixture_validation.is_deck_slot(area_name)
                and not fixture_validation.is_trash(area_name)
            ):
                raise LabwareMovementNotAllowedError(
                    f"Cannot move {current_labware.loadName} to addressable area {area_name}"
                )
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                area_name
            )
            state_update.set_addressable_area_used(addressable_area_name=area_name)

            if fixture_validation.is_gripper_waste_chute(area_name):
                # When dropping off labware in the waste chute, some bigger pieces
                # of labware (namely tipracks) can get stuck between a gripper
                # paddle and the bottom of the waste chute, even after the gripper
                # has homed all the way to the top of its travel. We add a "post-drop
                # slide" to dropoffs in the waste chute in order to guarantee that the
                # labware can drop fully through the chute before the gripper jaws close.
                post_drop_slide_offset = Point(
                    x=(current_labware_definition.dimensions.xDimension / 2.0)
                    + (GRIPPER_PADDLE_WIDTH / 2.0)
                    + _TRASH_CHUTE_DROP_BUFFER_MM,
                    y=0,
                    z=0,
                )
            elif fixture_validation.is_trash(area_name):
                # When dropping labware in the trash bins we want to ensure they are lids
                # and enforce a y-axis drop offset to ensure they fall within the trash bin
                lid_disposable_offfets = current_labware_definition.gripperOffsets.get(
                    "lidDisposalOffsets"
                )
                if lid_disposable_offfets is not None:
                    trash_lid_drop_offset = LabwareOffsetVector(
                        x=lid_disposable_offfets.dropOffset.x,
                        y=lid_disposable_offfets.dropOffset.y,
                        z=lid_disposable_offfets.dropOffset.z,
                    )
                else:
                    raise LabwareOffsetDoesNotExistError(
                        f"Labware Definition {current_labware.loadName} does not contain required field 'lidDisposalOffsets' of 'gripperOffsets'."
                    )

        elif isinstance(params.newLocation, DeckSlotLocation):
            if (
                current_labware_definition.parameters.isDeckSlotCompatible is not None
                and not current_labware_definition.parameters.isDeckSlotCompatible
            ):
                raise ValueError(
                    f"Lid Labware {current_labware.loadName} cannot be moved onto a Deck Slot."
                )
            self._state_view.addressable_areas.raise_if_area_not_in_deck_configuration(
                params.newLocation.slotName.id
            )
            state_update.set_addressable_area_used(
                addressable_area_name=params.newLocation.slotName.id
            )

        available_new_location = self._state_view.geometry.ensure_location_not_occupied(
            location=params.newLocation
        )

        # Check that labware and destination do not have labware on top
        self._state_view.labware.raise_if_labware_has_labware_on_top(
            labware_id=params.labwareId
        )
        if isinstance(available_new_location, OnLabwareLocation):
            # Ensure that labware can be placed on requested labware
            self._state_view.labware.raise_if_labware_cannot_be_stacked(
                top_labware_definition=current_labware_definition,
                bottom_labware_id=available_new_location.labwareId,
            )
            if params.labwareId == available_new_location.labwareId:
                raise LabwareMovementNotAllowedError(
                    "Cannot move a labware onto itself."
                )

        # Allow propagation of ModuleNotLoadedError.
        new_offset_id = self._equipment.find_applicable_labware_offset_id(
            labware_definition_uri=definition_uri,
            labware_location=available_new_location,
        )
        await self._labware_movement.ensure_movement_not_obstructed_by_module(
            labware_id=params.labwareId, new_location=available_new_location
        )

        if params.strategy == LabwareMovementStrategy.USING_GRIPPER:
            if self._state_view.config.robot_type == "OT-2 Standard":
                raise NotSupportedOnRobotType(
                    message="Labware movement using a gripper is not supported on the OT-2",
                    details={"strategy": params.strategy},
                )
            if not labware_validation.validate_gripper_compatible(
                current_labware_definition
            ):
                raise LabwareMovementNotAllowedError(
                    f"Cannot move labware '{current_labware_definition.parameters.loadName}' with gripper."
                    f" If trying to move a labware on an adapter, load the adapter separately to allow"
                    f" gripper movement."
                )

            validated_current_loc = (
                self._state_view.geometry.ensure_valid_gripper_location(
                    current_labware.location
                )
            )
            validated_new_loc = self._state_view.geometry.ensure_valid_gripper_location(
                available_new_location,
            )
            user_offset_data = LabwareMovementOffsetData(
                pickUpOffset=params.pickUpOffset or LabwareOffsetVector(x=0, y=0, z=0),
                dropOffset=params.dropOffset or LabwareOffsetVector(x=0, y=0, z=0),
            )

            if trash_lid_drop_offset:
                user_offset_data.dropOffset += trash_lid_drop_offset

            try:
                # Skips gripper moves when using virtual gripper
                await self._labware_movement.move_labware_with_gripper(
                    labware_id=params.labwareId,
                    current_location=validated_current_loc,
                    new_location=validated_new_loc,
                    user_offset_data=user_offset_data,
                    post_drop_slide_offset=post_drop_slide_offset,
                )
            except (
                FailedGripperPickupError,
                LabwareDroppedError,
                StallOrCollisionDetectedError,
                # todo(mm, 2024-09-26): Catch LabwareNotPickedUpError when that exists and
                # move_labware_with_gripper() raises it.
            ) as exception:
                gripper_movement_error: GripperMovementError | None = (
                    GripperMovementError(
                        id=self._model_utils.generate_id(),
                        createdAt=self._model_utils.get_timestamp(),
                        errorCode=exception.code.value.code,
                        detail=exception.code.value.detail,
                        wrappedErrors=[
                            ErrorOccurrence.from_failed(
                                id=self._model_utils.generate_id(),
                                createdAt=self._model_utils.get_timestamp(),
                                error=exception,
                            )
                        ],
                    )
                )
            else:
                gripper_movement_error = None

            # All mounts will have been retracted as part of the gripper move.
            state_update.clear_all_pipette_locations()

            if gripper_movement_error:
                return DefinedErrorData(
                    public=gripper_movement_error,
                    state_update=state_update,
                )

        elif params.strategy == LabwareMovementStrategy.MANUAL_MOVE_WITH_PAUSE:
            # Pause to allow for manual labware movement
            await self._run_control.wait_for_resume()

        # We may have just moved the labware that contains the current well out from
        # under the pipette. Clear the current location to reflect the fact that the
        # pipette is no longer over any labware. This is necessary for safe path
        # planning in case the next movement goes to the same labware (now in a new
        # place).
        pipette_location = self._state_view.pipettes.get_current_location()
        if (
            isinstance(pipette_location, CurrentWell)
            and pipette_location.labware_id == params.labwareId
        ):
            state_update.clear_all_pipette_locations()

        parent_updates: List[str] = []
        lid_updates: List[str | None] = []
        # when moving a lid between locations we need to:
        assert isinstance(current_labware.location, OnLabwareLocation)
        if (
            self._state_view.labware.get_lid_by_labware_id(
                current_labware.location.labwareId
            )
            is not None
        ):
            # if the source location was a parent labware and not a lid stack or lid, update the parent labware lid ID to None (no more lid)
            parent_updates.append(current_labware.location.labwareId)
            lid_updates.append(None)

        # --- otherwise the source location was another lid, theres nothing to do so move on ---

        # if the new location is a empty deck slot, make a new lid stack there

        # update the LIDs labware location to new location
        state_update.set_labware_location(
            labware_id=params.labwareId,
            new_location=available_new_location,
            new_offset_id=new_offset_id,
        )
        # If we're moving to a non lid object, add to the setlids list of things to do
        if isinstance(
            available_new_location, OnLabwareLocation
        ) and not labware_validation.validate_definition_is_lid(
            self._state_view.labware.get_definition(available_new_location.labwareId)
        ):
            parent_updates.append(available_new_location.labwareId)
            lid_updates.append(params.labwareId)
        # Add to setlids
        if len(parent_updates) > 0:
            state_update.set_lids(
                parent_labware_ids=parent_updates,
                lid_ids=lid_updates,
            )

        return SuccessData(
            public=MoveLidResult(offsetId=new_offset_id),
            state_update=state_update,
        )


class MoveLid(BaseCommand[MoveLidParams, MoveLidResult, GripperMovementError]):
    """A ``moveLid`` command."""

    commandType: MoveLidCommandType = "moveLid"
    params: MoveLidParams
    result: Optional[MoveLidResult] = None

    _ImplementationCls: Type[MoveLidImplementation] = MoveLidImplementation


class MoveLidCreate(BaseCommandCreate[MoveLidParams]):
    """A request to create a ``moveLid`` command."""

    commandType: MoveLidCommandType = "moveLid"
    params: MoveLidParams

    _CommandCls: Type[MoveLid] = MoveLid
