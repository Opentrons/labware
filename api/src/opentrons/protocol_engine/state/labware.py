"""Basic labware data state and store."""
from __future__ import annotations

from dataclasses import dataclass
from typing import (
    Any,
    Dict,
    List,
    Mapping,
    Optional,
    Sequence,
    Tuple,
    NamedTuple,
    cast,
    Union,
    overload,
)

from opentrons.protocol_engine.state import update_types
from opentrons_shared_data.deck.types import DeckDefinitionV5
from opentrons_shared_data.gripper.constants import LABWARE_GRIP_FORCE
from opentrons_shared_data.labware.labware_definition import (
    LabwareRole,
    InnerWellGeometry,
)
from opentrons_shared_data.pipette.types import LabwareUri

from opentrons.types import DeckSlotName, StagingSlotName, MountType
from opentrons.protocols.api_support.constants import OPENTRONS_NAMESPACE
from opentrons.protocols.models import LabwareDefinition, WellDefinition
from opentrons.calibration_storage.helpers import uri_from_details

from .. import errors
from ..resources import DeckFixedLabware, labware_validation, fixture_validation
from ..types import (
    DeckSlotLocation,
    OnLabwareLocation,
    AddressableAreaLocation,
    NonStackedLocation,
    Dimensions,
    LabwareOffset,
    LabwareOffsetVector,
    LabwareOffsetLocation,
    LabwareLocation,
    LoadedLabware,
    ModuleLocation,
    ModuleModel,
    OverlapOffset,
    LabwareMovementOffsetData,
    OnDeckLabwareLocation,
    OFF_DECK_LOCATION,
)
from ..actions import (
    Action,
    AddLabwareOffsetAction,
    AddLabwareDefinitionAction,
    get_state_updates,
)
from ._abstract_store import HasState, HandlesActions
from ._move_types import EdgePathType


# URIs of labware whose definitions accidentally specify an engage height
# in units of half-millimeters instead of millimeters.
_MAGDECK_HALF_MM_LABWARE = {
    "opentrons/biorad_96_wellplate_200ul_pcr/1",
    "opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1",
    "opentrons/usascientific_96_wellplate_2.4ml_deep/1",
}

_RIGHT_SIDE_SLOTS = {
    # OT-2:
    DeckSlotName.FIXED_TRASH,
    DeckSlotName.SLOT_9,
    DeckSlotName.SLOT_6,
    DeckSlotName.SLOT_3,
    # OT-3:
    DeckSlotName.SLOT_A3,
    DeckSlotName.SLOT_B3,
    DeckSlotName.SLOT_C3,
    DeckSlotName.SLOT_D3,
}


# The max height of the labware that can fit in a plate reader
_PLATE_READER_MAX_LABWARE_Z_MM = 16


class LabwareLoadParams(NamedTuple):
    """Parameters required to load a labware in Protocol Engine."""

    load_name: str
    namespace: str
    version: int


@dataclass
class LabwareState:
    """State of all loaded labware resources."""

    # Indexed by LoadedLabware.id.
    # If a LoadedLabware here has a non-None offsetId,
    # it must point to an existing element of labware_offsets_by_id.
    labware_by_id: Dict[str, LoadedLabware]

    # Indexed by LabwareOffset.id.
    # We rely on Python 3.7+ preservation of dict insertion order.
    labware_offsets_by_id: Dict[str, LabwareOffset]

    definitions_by_uri: Dict[str, LabwareDefinition]
    deck_definition: DeckDefinitionV5


class LabwareStore(HasState[LabwareState], HandlesActions):
    """Labware state container."""

    _state: LabwareState

    def __init__(
        self,
        deck_definition: DeckDefinitionV5,
        deck_fixed_labware: Sequence[DeckFixedLabware],
    ) -> None:
        """Initialize a labware store and its state."""
        definitions_by_uri: Dict[str, LabwareDefinition] = {
            uri_from_details(
                load_name=fixed_labware.definition.parameters.loadName,
                namespace=fixed_labware.definition.namespace,
                version=fixed_labware.definition.version,
            ): fixed_labware.definition
            for fixed_labware in deck_fixed_labware
        }
        labware_by_id = {
            fixed_labware.labware_id: LoadedLabware.model_construct(
                id=fixed_labware.labware_id,
                location=fixed_labware.location,
                loadName=fixed_labware.definition.parameters.loadName,
                definitionUri=uri_from_details(
                    load_name=fixed_labware.definition.parameters.loadName,
                    namespace=fixed_labware.definition.namespace,
                    version=fixed_labware.definition.version,
                ),
                offsetId=None,
            )
            for fixed_labware in deck_fixed_labware
        }

        self._state = LabwareState(
            definitions_by_uri=definitions_by_uri,
            labware_offsets_by_id={},
            labware_by_id=labware_by_id,
            deck_definition=deck_definition,
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        for state_update in get_state_updates(action):
            self._add_loaded_labware(state_update)
            self._add_loaded_lid_stack(state_update)
            self._set_labware_location(state_update)
            self._set_labware_lid(state_update)

        if isinstance(action, AddLabwareOffsetAction):
            labware_offset = LabwareOffset.model_construct(
                id=action.labware_offset_id,
                createdAt=action.created_at,
                definitionUri=action.request.definitionUri,
                location=action.request.location,
                vector=action.request.vector,
            )
            self._add_labware_offset(labware_offset)

        elif isinstance(action, AddLabwareDefinitionAction):
            uri = uri_from_details(
                namespace=action.definition.namespace,
                load_name=action.definition.parameters.loadName,
                version=action.definition.version,
            )
            self._state.definitions_by_uri[uri] = action.definition

    def _add_labware_offset(self, labware_offset: LabwareOffset) -> None:
        """Add a new labware offset to state.

        `labware_offset.id` must not match any existing labware offset ID.
        `LoadLabwareCommand`s retain references to their corresponding labware offsets
        and expect them to be immutable.
        """
        assert labware_offset.id not in self._state.labware_offsets_by_id

        self._state.labware_offsets_by_id[labware_offset.id] = labware_offset

    def _add_loaded_labware(self, state_update: update_types.StateUpdate) -> None:
        loaded_labware_update = state_update.loaded_labware
        if loaded_labware_update != update_types.NO_CHANGE:
            # If the labware load refers to an offset, that offset must actually exist.
            if loaded_labware_update.offset_id is not None:
                assert (
                    loaded_labware_update.offset_id in self._state.labware_offsets_by_id
                )

            definition_uri = uri_from_details(
                namespace=loaded_labware_update.definition.namespace,
                load_name=loaded_labware_update.definition.parameters.loadName,
                version=loaded_labware_update.definition.version,
            )

            self._state.definitions_by_uri[
                definition_uri
            ] = loaded_labware_update.definition

            location = loaded_labware_update.new_location

            display_name = loaded_labware_update.display_name

            self._state.labware_by_id[
                loaded_labware_update.labware_id
            ] = LoadedLabware.model_construct(
                id=loaded_labware_update.labware_id,
                location=location,
                loadName=loaded_labware_update.definition.parameters.loadName,
                definitionUri=definition_uri,
                offsetId=loaded_labware_update.offset_id,
                displayName=display_name,
            )

    def _add_loaded_lid_stack(self, state_update: update_types.StateUpdate) -> None:
        loaded_lid_stack_update = state_update.loaded_lid_stack
        if loaded_lid_stack_update != update_types.NO_CHANGE:
            # Add the stack object
            stack_definition_uri = uri_from_details(
                namespace=loaded_lid_stack_update.stack_object_definition.namespace,
                load_name=loaded_lid_stack_update.stack_object_definition.parameters.loadName,
                version=loaded_lid_stack_update.stack_object_definition.version,
            )
            self.state.definitions_by_uri[
                stack_definition_uri
            ] = loaded_lid_stack_update.stack_object_definition
            self._state.labware_by_id[
                loaded_lid_stack_update.stack_id
            ] = LoadedLabware.construct(
                id=loaded_lid_stack_update.stack_id,
                location=loaded_lid_stack_update.stack_location,
                loadName=loaded_lid_stack_update.stack_object_definition.parameters.loadName,
                definitionUri=stack_definition_uri,
                offsetId=None,
                displayName=None,
            )

            # Add the Lids on top of the stack object
            for i in range(len(loaded_lid_stack_update.labware_ids)):
                definition_uri = uri_from_details(
                    namespace=loaded_lid_stack_update.definition.namespace,
                    load_name=loaded_lid_stack_update.definition.parameters.loadName,
                    version=loaded_lid_stack_update.definition.version,
                )

                self._state.definitions_by_uri[
                    definition_uri
                ] = loaded_lid_stack_update.definition

                location = loaded_lid_stack_update.new_locations_by_id[
                    loaded_lid_stack_update.labware_ids[i]
                ]

                self._state.labware_by_id[
                    loaded_lid_stack_update.labware_ids[i]
                ] = LoadedLabware.construct(
                    id=loaded_lid_stack_update.labware_ids[i],
                    location=location,
                    loadName=loaded_lid_stack_update.definition.parameters.loadName,
                    definitionUri=definition_uri,
                    offsetId=None,
                    displayName=None,
                )

    def _set_labware_lid(self, state_update: update_types.StateUpdate) -> None:
        labware_lid_update = state_update.labware_lid
        if labware_lid_update != update_types.NO_CHANGE:
            parent_labware_id = labware_lid_update.parent_labware_id
            lid_id = labware_lid_update.lid_id
            self._state.labware_by_id[parent_labware_id].lid_id = lid_id

    def _set_labware_location(self, state_update: update_types.StateUpdate) -> None:
        labware_location_update = state_update.labware_location
        if labware_location_update != update_types.NO_CHANGE:
            labware_id = labware_location_update.labware_id
            new_offset_id = labware_location_update.offset_id

            self._state.labware_by_id[labware_id].offsetId = new_offset_id

            if labware_location_update.new_location:
                new_location = labware_location_update.new_location

                if isinstance(new_location, AddressableAreaLocation) and (
                    fixture_validation.is_gripper_waste_chute(
                        new_location.addressableAreaName
                    )
                    or fixture_validation.is_trash(new_location.addressableAreaName)
                ):
                    # If a labware has been moved into a waste chute it's been chuted away and is now technically off deck
                    new_location = OFF_DECK_LOCATION

                self._state.labware_by_id[labware_id].location = new_location


class LabwareView:
    """Read-only labware state view."""

    _state: LabwareState

    def __init__(self, state: LabwareState) -> None:
        """Initialize the computed view of labware state.

        Arguments:
            state: Labware state dataclass used for all calculations.
        """
        self._state = state

    def get(self, labware_id: str) -> LoadedLabware:
        """Get labware data by the labware's unique identifier."""
        try:
            return self._state.labware_by_id[labware_id]
        except KeyError as e:
            raise errors.LabwareNotLoadedError(
                f"Labware {labware_id} not found."
            ) from e

    def get_id_by_module(self, module_id: str) -> str:
        """Return the ID of the labware loaded on the given module."""
        for labware_id, labware in self._state.labware_by_id.items():
            if (
                isinstance(labware.location, ModuleLocation)
                and labware.location.moduleId == module_id
            ):
                return labware_id

        raise errors.exceptions.LabwareNotLoadedOnModuleError(
            "There is no labware loaded on this Module"
        )

    def get_id_by_labware(self, labware_id: str) -> str:
        """Return the ID of the labware loaded on the given labware."""
        for labware in self._state.labware_by_id.values():
            if (
                isinstance(labware.location, OnLabwareLocation)
                and labware.location.labwareId == labware_id
            ):
                return labware.id
        raise errors.exceptions.LabwareNotLoadedOnLabwareError(
            f"There is not labware loaded onto labware {labware_id}"
        )

    def raise_if_labware_has_labware_on_top(self, labware_id: str) -> None:
        """Raise if labware has another labware on top."""
        for labware in self._state.labware_by_id.values():
            if (
                isinstance(labware.location, OnLabwareLocation)
                and labware.location.labwareId == labware_id
            ):
                raise errors.LabwareIsInStackError(
                    f"Cannot move to labware {labware_id}, labware has other labware stacked on top."
                )

    def get_by_slot(
        self,
        slot_name: Union[DeckSlotName, StagingSlotName],
    ) -> Optional[LoadedLabware]:
        """Get the labware located in a given slot, if any."""
        loaded_labware = list(self._state.labware_by_id.values())

        for labware in loaded_labware:
            if (
                isinstance(labware.location, DeckSlotLocation)
                and labware.location.slotName.id == slot_name.id
            ) or (
                isinstance(labware.location, AddressableAreaLocation)
                and labware.location.addressableAreaName == slot_name.id
            ):
                return labware

        return None

    def get_by_addressable_area(
        self,
        addressable_area: str,
    ) -> Optional[LoadedLabware]:
        """Get the labware located in a given addressable area, if any."""
        loaded_labware = list(self._state.labware_by_id.values())

        for labware in loaded_labware:
            if (
                isinstance(labware.location, AddressableAreaLocation)
                and labware.location.addressableAreaName == addressable_area
            ):
                return labware

        return None

    def get_definition(self, labware_id: str) -> LabwareDefinition:
        """Get labware definition by the labware's unique identifier."""
        return self.get_definition_by_uri(
            LabwareUri(self.get(labware_id).definitionUri)
        )

    def get_user_specified_display_name(self, labware_id: str) -> Optional[str]:
        """Get the labware's user-specified display name, if set."""
        return self.get(labware_id).displayName

    def get_display_name(self, labware_id: str) -> str:
        """Get the labware's display name.

        If a user-specified display name exists, will return that, else will return
        display name from the definition.
        """
        return (
            self.get_user_specified_display_name(labware_id)
            or self.get_definition(labware_id).metadata.displayName
        )

    def get_deck_definition(self) -> DeckDefinitionV5:
        """Get the current deck definition."""
        return self._state.deck_definition

    def get_definition_by_uri(self, uri: LabwareUri) -> LabwareDefinition:
        """Get the labware definition matching loadName namespace and version."""
        try:
            return self._state.definitions_by_uri[uri]
        except KeyError as e:
            raise errors.LabwareDefinitionDoesNotExistError(
                f"Labware definition for matching {uri} not found."
            ) from e

    def get_loaded_labware_definitions(self) -> List[LabwareDefinition]:
        """Get all loaded labware definitions."""
        loaded_labware = self._state.labware_by_id.values()
        return [
            self.get_definition_by_uri(LabwareUri(labware.definitionUri))
            for labware in loaded_labware
        ]

    def find_custom_labware_load_params(self) -> List[LabwareLoadParams]:
        """Find all load labware parameters for custom labware definitions in state."""
        return [
            LabwareLoadParams(
                load_name=definition.parameters.loadName,
                namespace=definition.namespace,
                version=definition.version,
            )
            for definition in self._state.definitions_by_uri.values()
            if definition.namespace != OPENTRONS_NAMESPACE
        ]

    def get_location(self, labware_id: str) -> LabwareLocation:
        """Get labware location by the labware's unique identifier."""
        return self.get(labware_id).location

    def get_parent_location(self, labware_id: str) -> NonStackedLocation:
        """Get labware's non-labware parent location."""
        parent = self.get_location(labware_id)
        if isinstance(parent, OnLabwareLocation):
            return self.get_parent_location(parent.labwareId)
        return parent

    def get_labware_stack(
        self, labware_stack: List[LoadedLabware]
    ) -> List[LoadedLabware]:
        """Get the a stack of labware starting from a given labware or existing stack."""
        parent = self.get_location(labware_stack[-1].id)
        if isinstance(parent, OnLabwareLocation):
            labware_stack.append(self.get(parent.labwareId))
            return self.get_labware_stack(labware_stack)
        return labware_stack

    def get_all(self) -> List[LoadedLabware]:
        """Get a list of all labware entries in state."""
        return list(self._state.labware_by_id.values())

    def get_has_quirk(self, labware_id: str, quirk: str) -> bool:
        """Get if a labware has a certain quirk."""
        return quirk in self.get_quirks(labware_id=labware_id)

    def get_quirks(self, labware_id: str) -> List[str]:
        """Get a labware's quirks."""
        definition = self.get_definition(labware_id)
        return definition.parameters.quirks or []

    def get_should_center_column_on_target_well(self, labware_id: str) -> bool:
        """True if a pipette moving to this labware should center its active column on the target.

        This is true for labware that have wells spanning entire columns.
        """
        has_quirk = self.get_has_quirk(labware_id, "centerMultichannelOnWells")
        return has_quirk and (
            len(self.get_definition(labware_id).wells) > 1
            and len(self.get_definition(labware_id).wells) < 96
        )

    def get_labware_stacking_maximum(self, labware: LabwareDefinition) -> int:
        """Returns the maximum number of labware allowed in a stack for a given labware definition.

        If not defined within a labware, defaults to one.
        """
        return labware.stackLimit if labware.stackLimit is not None else 1

    def get_should_center_pipette_on_target_well(self, labware_id: str) -> bool:
        """True if a pipette moving to a well of this labware should center its body on the target.

        This is true for 1-well reservoirs no matter the pipette, and for large plates.
        """
        has_quirk = self.get_has_quirk(labware_id, "centerMultichannelOnWells")
        return has_quirk and (
            len(self.get_definition(labware_id).wells) == 1
            or len(self.get_definition(labware_id).wells) >= 96
        )

    def get_well_definition(
        self,
        labware_id: str,
        well_name: Optional[str] = None,
    ) -> WellDefinition:
        """Get a well's definition by labware and well name.

        If `well_name` is omitted, the first well in the labware
        will be used.
        """
        definition = self.get_definition(labware_id)
        if well_name is None:
            well_name = definition.ordering[0][0]

        try:
            return definition.wells[well_name]
        except KeyError as e:
            raise errors.WellDoesNotExistError(
                f"{well_name} does not exist in {labware_id}."
            ) from e

    def get_well_geometry(
        self, labware_id: str, well_name: Optional[str] = None
    ) -> InnerWellGeometry:
        """Get a well's inner geometry by labware and well name."""
        labware_def = self.get_definition(labware_id)
        if labware_def.innerLabwareGeometry is None:
            raise errors.IncompleteLabwareDefinitionError(
                message=f"No innerLabwareGeometry found in labware definition for labware_id: {labware_id}."
            )
        well_def = self.get_well_definition(labware_id, well_name)
        well_id = well_def.geometryDefinitionId
        if well_id is None:
            raise errors.IncompleteWellDefinitionError(
                message=f"No geometryDefinitionId found in well definition for well: {well_name} in labware_id: {labware_id}"
            )
        else:
            well_geometry = labware_def.innerLabwareGeometry.get(well_id)
            if well_geometry is None:
                raise errors.IncompleteLabwareDefinitionError(
                    message=f"No innerLabwareGeometry found in labware definition for well_id: {well_id} in labware_id: {labware_id}"
                )
            return well_geometry

    def get_well_size(
        self, labware_id: str, well_name: str
    ) -> Tuple[float, float, float]:
        """Get a well's size in x, y, z dimensions based on its shape.

        Args:
            labware_id: Labware identifier.
            well_name: Name of well in labware.

        Returns:
            A tuple of dimensions in x, y, and z. If well is circular,
            the x and y dimensions will both be set to the diameter.
        """
        well_definition = self.get_well_definition(labware_id, well_name)

        if well_definition.diameter is not None:
            x_size = y_size = well_definition.diameter
        else:
            # If diameter is None we know these values will be floats
            x_size = cast(float, well_definition.xDimension)
            y_size = cast(float, well_definition.yDimension)

        return x_size, y_size, well_definition.depth

    def get_well_radial_offsets(
        self, labware_id: str, well_name: str, radius_percentage: float
    ) -> Tuple[float, float]:
        """Get x and y radius offsets modified by radius percentage."""
        x_size, y_size, z_size = self.get_well_size(labware_id, well_name)
        return (x_size / 2.0) * radius_percentage, (y_size / 2.0) * radius_percentage

    def get_edge_path_type(
        self,
        labware_id: str,
        well_name: str,
        mount: MountType,
        labware_slot: DeckSlotName,
        next_to_module: bool,
    ) -> EdgePathType:
        """Get the recommended edge path type based on well column, labware position and any neighboring modules."""
        labware_definition = self.get_definition(labware_id)
        left_column = labware_definition.ordering[0]
        right_column = labware_definition.ordering[-1]

        left_path_criteria = mount is MountType.RIGHT and well_name in left_column
        right_path_criteria = mount is MountType.LEFT and well_name in right_column
        labware_right_side = labware_slot in _RIGHT_SIDE_SLOTS

        if left_path_criteria and (next_to_module or labware_right_side):
            return EdgePathType.LEFT
        elif right_path_criteria and next_to_module:
            return EdgePathType.RIGHT
        else:
            return EdgePathType.DEFAULT

    def validate_liquid_allowed_in_labware(
        self, labware_id: str, wells: Mapping[str, Any]
    ) -> List[str]:
        """Check if wells associated to a labware_id has well by name and that labware is not tiprack."""
        labware_definition = self.get_definition(labware_id)
        labware_wells = labware_definition.wells
        contains_wells = all(well_name in labware_wells for well_name in iter(wells))
        if labware_definition.parameters.isTiprack:
            raise errors.LabwareIsTipRackError(
                f"Given labware: {labware_id} is a tiprack. Can not load liquid."
            )
        if LabwareRole.adapter in labware_definition.allowedRoles:
            raise errors.LabwareIsAdapterError(
                f"Given labware: {labware_id} is an adapter. Can not load liquid."
            )
        if not contains_wells:
            raise errors.WellDoesNotExistError(
                f"Some of the supplied wells do not match the labwareId: {labware_id}."
            )
        return list(wells)

    def get_tip_length(self, labware_id: str, overlap: float = 0) -> float:
        """Get the nominal tip length of a tip rack."""
        definition = self.get_definition(labware_id)
        if definition.parameters.tipLength is None:
            raise errors.LabwareIsNotTipRackError(
                f"Labware {labware_id} has no tip length defined."
            )

        return definition.parameters.tipLength - overlap

    def get_tip_drop_z_offset(
        self, labware_id: str, length_scale: float, additional_offset: float
    ) -> float:
        """Get the tip drop offset from the top of the well."""
        tip_length = self.get_tip_length(labware_id)
        return -tip_length * length_scale + additional_offset

    def get_definition_uri(self, labware_id: str) -> LabwareUri:
        """Get a labware's definition URI."""
        return LabwareUri(self.get(labware_id).definitionUri)

    def get_uri_from_definition(
        self,
        labware_definition: LabwareDefinition,
    ) -> LabwareUri:
        """Get a definition URI from a full labware definition."""
        return uri_from_details(
            load_name=labware_definition.parameters.loadName,
            namespace=labware_definition.namespace,
            version=labware_definition.version,
        )

    def is_tiprack(self, labware_id: str) -> bool:
        """Get whether labware is a tiprack."""
        definition = self.get_definition(labware_id)
        return definition.parameters.isTiprack

    def get_load_name(self, labware_id: str) -> str:
        """Get the labware's load name."""
        definition = self.get_definition(labware_id)
        return definition.parameters.loadName

    @overload
    def get_dimensions(self, *, labware_definition: LabwareDefinition) -> Dimensions:
        pass

    @overload
    def get_dimensions(self, *, labware_id: str) -> Dimensions:
        pass

    def get_dimensions(
        self,
        *,
        labware_definition: LabwareDefinition | None = None,
        labware_id: str | None = None,
    ) -> Dimensions:
        """Get the labware's dimensions."""
        if labware_definition is None:
            assert labware_id is not None  # From our @overloads.
            labware_definition = self.get_definition(labware_id)

        dims = labware_definition.dimensions

        return Dimensions(
            x=dims.xDimension,
            y=dims.yDimension,
            z=dims.zDimension,
        )

    def get_labware_overlap_offsets(
        self, definition: LabwareDefinition, below_labware_name: str
    ) -> OverlapOffset:
        """Get the labware's overlap with requested labware's load name."""
        if below_labware_name in definition.stackingOffsetWithLabware.keys():
            stacking_overlap = definition.stackingOffsetWithLabware.get(
                below_labware_name, OverlapOffset(x=0, y=0, z=0)
            )
        else:
            stacking_overlap = definition.stackingOffsetWithLabware.get(
                "default", OverlapOffset(x=0, y=0, z=0)
            )
        return OverlapOffset(
            x=stacking_overlap.x, y=stacking_overlap.y, z=stacking_overlap.z
        )

    def get_module_overlap_offsets(
        self, definition: LabwareDefinition, module_model: ModuleModel
    ) -> OverlapOffset:
        """Get the labware's overlap with requested module model."""
        stacking_overlap = definition.stackingOffsetWithModule.get(
            str(module_model.value)
        )
        if not stacking_overlap:
            if self._is_thermocycler_on_ot2(module_model):
                return OverlapOffset(x=0, y=0, z=10.7)
            else:
                return OverlapOffset(x=0, y=0, z=0)

        return OverlapOffset(
            x=stacking_overlap.x, y=stacking_overlap.y, z=stacking_overlap.z
        )

    def _is_thermocycler_on_ot2(self, module_model: ModuleModel) -> bool:
        """Whether the given module is a thermocycler with the current deck being an OT2 deck."""
        robot_model = self.get_deck_definition()["robot"]["model"]
        return (
            module_model
            in [ModuleModel.THERMOCYCLER_MODULE_V1, ModuleModel.THERMOCYCLER_MODULE_V2]
            and robot_model == "OT-2 Standard"
        )

    def get_default_magnet_height(self, module_id: str, offset: float) -> float:
        """Return a labware's default Magnetic Module engage height with added offset, if supplied.

        The returned value is measured in millimeters above the labware base plane.
        """
        labware_id = self.get_id_by_module(module_id)
        parameters = self.get_definition(labware_id).parameters
        default_engage_height = parameters.magneticModuleEngageHeight
        if (
            parameters.isMagneticModuleCompatible is False
            or default_engage_height is None
        ):
            raise errors.exceptions.NoMagnetEngageHeightError(
                "The labware loaded on this Magnetic Module"
                " does not have a default engage height."
            )

        if self._is_magnetic_module_uri_in_half_millimeter(labware_id):
            # TODO(mc, 2022-09-26): this value likely _also_ needs a few mm subtracted
            # https://opentrons.atlassian.net/browse/RSS-111
            calculated_height = default_engage_height / 2.0
        else:
            calculated_height = default_engage_height

        return calculated_height + offset

    def get_labware_offset_vector(self, labware_id: str) -> LabwareOffsetVector:
        """Get the labware's calibration offset."""
        offset_id = self.get(labware_id=labware_id).offsetId
        if offset_id is None:
            return LabwareOffsetVector(x=0, y=0, z=0)
        else:
            return self._state.labware_offsets_by_id[offset_id].vector

    def get_labware_offset(self, labware_offset_id: str) -> LabwareOffset:
        """Get a labware offset by the offset's unique ID.

        Raises:
            LabwareOffsetDoesNotExistError: If the given ID does not match any
                                            previously added offset.
        """
        try:
            return self._state.labware_offsets_by_id[labware_offset_id]
        except KeyError as e:
            raise errors.LabwareOffsetDoesNotExistError(
                f"Labware offset {labware_offset_id} not found."
            ) from e

    def get_labware_offsets(self) -> List[LabwareOffset]:
        """Get all labware offsets, in the order they were added."""
        return list(self._state.labware_offsets_by_id.values())

    # TODO: Make this slightly more ergonomic for the caller by
    # only returning the optional str ID, at the cost of baking redundant lookups
    # into the API?
    def find_applicable_labware_offset(
        self,
        definition_uri: str,
        location: LabwareOffsetLocation,
    ) -> Optional[LabwareOffset]:
        """Find a labware offset that applies to the given definition and location.

        Returns the *most recently* added matching offset,
        so later offsets can override earlier ones.
        Or, ``None`` if no offsets match at all.

        An offset "matches"
        if its ``definition_uri`` and ``location`` *exactly* match what's provided.
        This implies that if the location involves a module,
        it will *not* match a module that's compatible but not identical.
        """
        for candidate in reversed(list(self._state.labware_offsets_by_id.values())):
            if (
                candidate.definitionUri == definition_uri
                and candidate.location == location
            ):
                return candidate

        return None

    def get_fixed_trash_id(self) -> Optional[str]:
        """Get the identifier of labware loaded into the fixed trash location.

        Raises:
            LabwareNotLoadedError: a fixed trash was not loaded by the deck definition
                that is currently in use for the protocol run.
        """
        for labware in self._state.labware_by_id.values():
            if isinstance(
                labware.location, DeckSlotLocation
            ) and labware.location.slotName in {
                DeckSlotName.FIXED_TRASH,
                DeckSlotName.SLOT_A3,
            }:
                return labware.id
        return None

    def is_fixed_trash(self, labware_id: str) -> bool:
        """Check if labware is fixed trash."""
        return self.get_has_quirk(labware_id, "fixedTrash")

    def is_absorbance_reader_lid(self, labware_id: str) -> bool:
        """Check if labware is an absorbance reader lid."""
        return labware_validation.is_absorbance_reader_lid(
            self.get(labware_id).loadName
        )

    def raise_if_labware_inaccessible_by_pipette(self, labware_id: str) -> None:
        """Raise an error if the specified location cannot be reached via a pipette."""
        labware = self.get(labware_id)
        labware_location = labware.location
        if isinstance(labware_location, OnLabwareLocation):
            return self.raise_if_labware_inaccessible_by_pipette(
                labware_location.labwareId
            )
        elif labware.lid_id is not None:
            raise errors.LocationNotAccessibleByPipetteError(
                f"Cannot move pipette to {labware.loadName} "
                "because labware is currently covered by a lid."
            )
        elif isinstance(labware_location, AddressableAreaLocation):
            if fixture_validation.is_staging_slot(labware_location.addressableAreaName):
                raise errors.LocationNotAccessibleByPipetteError(
                    f"Cannot move pipette to {labware.loadName},"
                    f" labware is on staging slot {labware_location.addressableAreaName}"
                )
        elif labware_location == OFF_DECK_LOCATION:
            raise errors.LocationNotAccessibleByPipetteError(
                f"Cannot move pipette to {labware.loadName}, labware is off-deck."
            )

    def raise_if_labware_in_location(
        self,
        location: OnDeckLabwareLocation,
    ) -> None:
        """Raise an error if the specified location has labware in it."""
        for labware in self.get_all():
            if labware.location == location:
                raise errors.LocationIsOccupiedError(
                    f"Labware {labware.loadName} is already present at {location}."
                )

    def raise_if_labware_cannot_be_ondeck(
        self,
        location: LabwareLocation,
        labware_definition: LabwareDefinition,
    ) -> None:
        """Raise an error if the labware cannot be in the specified location."""
        if isinstance(
            location, (DeckSlotLocation, AddressableAreaLocation)
        ) and not labware_validation.validate_labware_can_be_ondeck(labware_definition):
            raise errors.LabwareCannotSitOnDeckError(
                f"{labware_definition.parameters.loadName} cannot sit in a slot by itself."
            )

    def raise_if_labware_incompatible_with_plate_reader(
        self,
        labware_definition: LabwareDefinition,
    ) -> None:
        """Raise an error if the labware is not compatible with the plate reader."""
        load_name = labware_definition.parameters.loadName
        number_of_wells = len(labware_definition.wells)
        if number_of_wells != 96:
            raise errors.LabwareMovementNotAllowedError(
                f"Cannot move '{load_name}' into plate reader because the"
                f" labware contains {number_of_wells} wells where 96 wells is expected."
            )
        elif labware_definition.dimensions.zDimension > _PLATE_READER_MAX_LABWARE_Z_MM:
            raise errors.LabwareMovementNotAllowedError(
                f"Cannot move '{load_name}' into plate reader because the"
                f" maximum allowed labware height is {_PLATE_READER_MAX_LABWARE_Z_MM}mm."
            )

    def raise_if_labware_cannot_be_stacked(  # noqa: C901
        self, top_labware_definition: LabwareDefinition, bottom_labware_id: str
    ) -> None:
        """Raise if the specified labware definition cannot be placed on top of the bottom labware."""
        if labware_validation.validate_definition_is_adapter(top_labware_definition):
            raise errors.LabwareCannotBeStackedError(
                f"Labware {top_labware_definition.parameters.loadName} is defined as an adapter and cannot be placed"
                " on other labware."
            )
        below_labware = self.get(bottom_labware_id)
        if not labware_validation.validate_labware_can_be_stacked(
            top_labware_definition=top_labware_definition,
            below_labware_load_name=below_labware.loadName,
        ):
            raise errors.LabwareCannotBeStackedError(
                f"Labware {top_labware_definition.parameters.loadName} cannot be loaded onto labware {below_labware.loadName}"
            )
        elif isinstance(below_labware.location, ModuleLocation):
            below_definition = self.get_definition(labware_id=below_labware.id)
            if not labware_validation.validate_definition_is_adapter(
                below_definition
            ) and not labware_validation.validate_definition_is_lid(
                top_labware_definition
            ):
                raise errors.LabwareCannotBeStackedError(
                    f"Labware {top_labware_definition.parameters.loadName} cannot be loaded"
                    f" onto a labware on top of a module"
                )
        elif isinstance(below_labware.location, OnLabwareLocation):
            labware_stack = self.get_labware_stack([below_labware])
            stack_without_adapters = []
            for lw in labware_stack:
                if not labware_validation.validate_definition_is_adapter(
                    self.get_definition(lw.id)
                ):
                    stack_without_adapters.append(lw)
            if len(stack_without_adapters) >= self.get_labware_stacking_maximum(
                top_labware_definition
            ):
                raise errors.LabwareCannotBeStackedError(
                    f"Labware {top_labware_definition.parameters.loadName} cannot be loaded to stack of more than {self.get_labware_stacking_maximum(top_labware_definition)} labware."
                )

            further_below_definition = self.get_definition(
                labware_id=below_labware.location.labwareId
            )
            if labware_validation.validate_definition_is_adapter(
                further_below_definition
            ) and not labware_validation.validate_definition_is_lid(
                top_labware_definition
            ):
                raise errors.LabwareCannotBeStackedError(
                    f"Labware {top_labware_definition.parameters.loadName} cannot be loaded"
                    f" onto labware on top of adapter"
                )

    def _is_magnetic_module_uri_in_half_millimeter(self, labware_id: str) -> bool:
        """Check whether the labware uri needs to be calculated in half a millimeter."""
        uri = self.get_uri_from_definition(self.get_definition(labware_id))
        return uri in _MAGDECK_HALF_MM_LABWARE

    def get_deck_default_gripper_offsets(self) -> Optional[LabwareMovementOffsetData]:
        """Get the deck's default gripper offsets."""
        parsed_offsets = (
            self.get_deck_definition().get("gripperOffsets", {}).get("default")
        )
        return (
            LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector(
                    x=parsed_offsets["pickUpOffset"]["x"],
                    y=parsed_offsets["pickUpOffset"]["y"],
                    z=parsed_offsets["pickUpOffset"]["z"],
                ),
                dropOffset=LabwareOffsetVector(
                    x=parsed_offsets["dropOffset"]["x"],
                    y=parsed_offsets["dropOffset"]["y"],
                    z=parsed_offsets["dropOffset"]["z"],
                ),
            )
            if parsed_offsets
            else None
        )

    def get_absorbance_reader_lid_definition(self) -> LabwareDefinition:
        """Return the special labware definition for the plate reader lid.

        See todo comments in `create_protocol_engine().
        """
        # NOTE: This needs to stay in sync with create_protocol_engine().
        return self._state.definitions_by_uri[
            "opentrons/opentrons_flex_lid_absorbance_plate_reader_module/1"
        ]

    @overload
    def get_child_gripper_offsets(
        self,
        *,
        labware_definition: LabwareDefinition,
        slot_name: Optional[DeckSlotName],
    ) -> Optional[LabwareMovementOffsetData]:
        pass

    @overload
    def get_child_gripper_offsets(
        self, *, labware_id: str, slot_name: Optional[DeckSlotName]
    ) -> Optional[LabwareMovementOffsetData]:
        pass

    def get_child_gripper_offsets(
        self,
        *,
        labware_definition: Optional[LabwareDefinition] = None,
        labware_id: Optional[str] = None,
        slot_name: Optional[DeckSlotName],
    ) -> Optional[LabwareMovementOffsetData]:
        """Get the grip offsets that a labware says should be applied to children stacked atop it.

        Params:
            labware_id: The ID of a parent labware (atop which another labware, the child, will be stacked).
            slot_name: The ancestor slot that the parent labware is ultimately loaded into,
                       perhaps after going through a module in the middle.

        Returns:
            If `slot_name` is provided, returns the gripper offsets that the parent labware definition
            specifies just for that slot, or `None` if the labware definition doesn't have an
            exact match.

            If `slot_name` is `None`, returns the gripper offsets that the parent labware
            definition designates as "default," or `None` if it doesn't designate any as such.
        """
        if labware_id is not None:
            labware_definition = self.get_definition(labware_id)
        else:
            # Should be ensured by our @overloads.
            assert labware_definition is not None

        parsed_offsets = labware_definition.gripperOffsets
        offset_key = slot_name.id if slot_name else "default"

        if parsed_offsets is None or offset_key not in parsed_offsets:
            return None
        else:
            return LabwareMovementOffsetData(
                pickUpOffset=LabwareOffsetVector.model_construct(
                    x=parsed_offsets[offset_key].pickUpOffset.x,
                    y=parsed_offsets[offset_key].pickUpOffset.y,
                    z=parsed_offsets[offset_key].pickUpOffset.z,
                ),
                dropOffset=LabwareOffsetVector.model_construct(
                    x=parsed_offsets[offset_key].dropOffset.x,
                    y=parsed_offsets[offset_key].dropOffset.y,
                    z=parsed_offsets[offset_key].dropOffset.z,
                ),
            )

    def get_grip_force(self, labware_definition: LabwareDefinition) -> float:
        """Get the recommended grip force for gripping labware using gripper."""
        recommended_force = labware_definition.gripForce
        return (
            recommended_force if recommended_force is not None else LABWARE_GRIP_FORCE
        )

    def get_grip_height_from_labware_bottom(
        self, labware_definition: LabwareDefinition
    ) -> float:
        """Get the recommended grip height from labware bottom, if present."""
        recommended_height = labware_definition.gripHeightFromLabwareBottom
        return (
            recommended_height
            if recommended_height is not None
            else self.get_dimensions(labware_definition=labware_definition).z / 2
        )

    @staticmethod
    def _max_x_of_well(well_defn: WellDefinition) -> float:
        if well_defn.shape == "rectangular":
            return well_defn.x + (well_defn.xDimension or 0) / 2
        elif well_defn.shape == "circular":
            return well_defn.x + (well_defn.diameter or 0) / 2
        else:
            return well_defn.x

    @staticmethod
    def _min_x_of_well(well_defn: WellDefinition) -> float:
        if well_defn.shape == "rectangular":
            return well_defn.x - (well_defn.xDimension or 0) / 2
        elif well_defn.shape == "circular":
            return well_defn.x - (well_defn.diameter or 0) / 2
        else:
            return 0

    @staticmethod
    def _max_y_of_well(well_defn: WellDefinition) -> float:
        if well_defn.shape == "rectangular":
            return well_defn.y + (well_defn.yDimension or 0) / 2
        elif well_defn.shape == "circular":
            return well_defn.y + (well_defn.diameter or 0) / 2
        else:
            return 0

    @staticmethod
    def _min_y_of_well(well_defn: WellDefinition) -> float:
        if well_defn.shape == "rectangular":
            return well_defn.y - (well_defn.yDimension or 0) / 2
        elif well_defn.shape == "circular":
            return well_defn.y - (well_defn.diameter or 0) / 2
        else:
            return 0

    @staticmethod
    def _max_z_of_well(well_defn: WellDefinition) -> float:
        return well_defn.z + well_defn.depth

    def get_well_bbox(self, labware_definition: LabwareDefinition) -> Dimensions:
        """Get the bounding box implied by the wells.

        The bounding box of the labware that is implied by the wells is that required
        to contain the bounds of the wells - the y-span from the min-y bound of the min-y
        well to the max-y bound of the max-y well, x ditto, z from labware 0 to the max-z
        well top.

        This is used for the specific purpose of finding the reasonable uncertainty bounds of
        where and how a gripper will interact with a labware.
        """
        max_x: Optional[float] = None
        min_x: Optional[float] = None
        max_y: Optional[float] = None
        min_y: Optional[float] = None
        max_z: Optional[float] = None

        for well in labware_definition.wells.values():
            well_max_x = self._max_x_of_well(well)
            well_min_x = self._min_x_of_well(well)
            well_max_y = self._max_y_of_well(well)
            well_min_y = self._min_y_of_well(well)
            well_max_z = self._max_z_of_well(well)
            if (max_x is None) or (well_max_x > max_x):
                max_x = well_max_x
            if (max_y is None) or (well_max_y > max_y):
                max_y = well_max_y
            if (min_x is None) or (well_min_x < min_x):
                min_x = well_min_x
            if (min_y is None) or (well_min_y < min_y):
                min_y = well_min_y
            if (max_z is None) or (well_max_z > max_z):
                max_z = well_max_z
        if (
            max_x is None
            or max_y is None
            or min_x is None
            or min_y is None
            or max_z is None
        ):
            return Dimensions(0, 0, 0)
        return Dimensions(max_x - min_x, max_y - min_y, max_z)
