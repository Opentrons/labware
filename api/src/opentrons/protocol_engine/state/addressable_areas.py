"""Basic addressable area data state and store."""
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Set, Union

from opentrons_shared_data.deck.dev_types import DeckDefinitionV4, SlotDefV3

from opentrons.types import Point, DeckSlotName

from ..commands import (
    Command,
    LoadLabwareResult,
    LoadModuleResult,
    MoveLabwareResult,
    MoveToAddressableAreaResult,
)
from ..errors import (
    IncompatibleAddressableAreaError,
    AreaNotInDeckConfigurationError,
    SlotDoesNotExistError,
)
from ..resources import deck_configuration_provider
from ..types import (
    DeckSlotLocation,
    AddressableAreaLocation,
    AddressableArea,
    AreaType,
    PotentialCutoutFixture,
    DeckConfigurationType,
)
from ..actions import Action, UpdateCommandAction, PlayAction
from .config import Config
from .abstract_store import HasState, HandlesActions


@dataclass
class AddressableAreaState:
    """State of all loaded addressable area resources."""

    loaded_addressable_areas_by_name: Dict[str, AddressableArea]
    """The addressable areas that have been loaded so far.

    When `use_simulated_deck_config` is `False`, these are the addressable areas that the
    deck configuration provided.

    When `use_simulated_deck_config` is `True`, these are the addressable areas that have been
    referenced by the protocol so far.
    """

    potential_cutout_fixtures_by_cutout_id: Dict[str, Set[PotentialCutoutFixture]]

    assumed_slots_for_deck: Set[str]

    deck_definition: DeckDefinitionV4

    deck_configuration: Optional[DeckConfigurationType]
    """The host robot's full deck configuration.

    If `use_simulated_deck_config` is `True`, this is meaningless and this value is undefined.
    In practice it will probably be `None` or `[]`.

    If `use_simulated_deck_config` is `False`, this will be non-`None`.
    """

    use_simulated_deck_config: bool
    """See `Config.use_simulated_deck_config`."""


def _get_conflicting_addressable_areas(
    potential_cutout_fixtures: Set[PotentialCutoutFixture],
    loaded_addressable_areas: Set[str],
    deck_definition: DeckDefinitionV4,
) -> Set[str]:
    loaded_areas_on_cutout = set()
    for fixture in potential_cutout_fixtures:
        loaded_areas_on_cutout.update(
            deck_configuration_provider.get_provided_addressable_area_names(
                fixture.cutout_fixture_id,
                fixture.cutout_id,
                deck_definition,
            )
        )
    loaded_areas_on_cutout.intersection_update(loaded_addressable_areas)
    return loaded_areas_on_cutout


# This is a temporary shim while Protocol Engine's conflict-checking code
# can only take deck slots as input.
# Long-term solution: Check for conflicts based on bounding boxes, not slot adjacencies.
# Shorter-term: Change the conflict-checking code to take cutouts instead of deck slots.
CUTOUT_TO_DECK_SLOT_MAP: Dict[str, DeckSlotName] = {
    # OT-2
    "cutout1": DeckSlotName.SLOT_1,
    "cutout2": DeckSlotName.SLOT_2,
    "cutout3": DeckSlotName.SLOT_3,
    "cutout4": DeckSlotName.SLOT_4,
    "cutout5": DeckSlotName.SLOT_5,
    "cutout6": DeckSlotName.SLOT_6,
    "cutout7": DeckSlotName.SLOT_7,
    "cutout8": DeckSlotName.SLOT_8,
    "cutout9": DeckSlotName.SLOT_9,
    "cutout10": DeckSlotName.SLOT_10,
    "cutout11": DeckSlotName.SLOT_11,
    "cutout12": DeckSlotName.FIXED_TRASH,
    # Flex
    "cutoutA1": DeckSlotName.SLOT_A1,
    "cutoutA2": DeckSlotName.SLOT_A2,
    "cutoutA3": DeckSlotName.SLOT_A3,
    "cutoutB1": DeckSlotName.SLOT_B1,
    "cutoutB2": DeckSlotName.SLOT_B2,
    "cutoutB3": DeckSlotName.SLOT_B3,
    "cutoutC1": DeckSlotName.SLOT_C1,
    "cutoutC2": DeckSlotName.SLOT_C2,
    "cutoutC3": DeckSlotName.SLOT_C3,
    "cutoutD1": DeckSlotName.SLOT_D1,
    "cutoutD2": DeckSlotName.SLOT_D2,
    "cutoutD3": DeckSlotName.SLOT_D3,
}


class AddressableAreaStore(HasState[AddressableAreaState], HandlesActions):
    """Addressable area state container."""

    _state: AddressableAreaState

    def __init__(
        self,
        deck_configuration: DeckConfigurationType,
        config: Config,
        deck_definition: DeckDefinitionV4,
    ) -> None:
        """Initialize an addressable area store and its state."""
        if config.use_simulated_deck_config:
            loaded_addressable_areas_by_name = {}
        else:
            loaded_addressable_areas_by_name = (
                self._get_addressable_areas_from_deck_configuration(
                    deck_configuration,
                    deck_definition,
                )
            )

        if config.robot_type == "OT-2 Standard":
            assumed_slots = {slot.to_ot2_equivalent().id for slot in DeckSlotName}
        else:
            assumed_slots = {slot.to_ot3_equivalent().id for slot in DeckSlotName}

        self._state = AddressableAreaState(
            deck_configuration=deck_configuration,
            loaded_addressable_areas_by_name=loaded_addressable_areas_by_name,
            potential_cutout_fixtures_by_cutout_id={},
            assumed_slots_for_deck=assumed_slots,
            deck_definition=deck_definition,
            use_simulated_deck_config=config.use_simulated_deck_config,
        )

    def handle_action(self, action: Action) -> None:
        """Modify state in reaction to an action."""
        if isinstance(action, UpdateCommandAction):
            self._handle_command(action.command)
        if isinstance(action, PlayAction):
            current_state = self._state
            if (
                action.deck_configuration is not None
                and not self._state.use_simulated_deck_config
            ):
                self._state.deck_configuration = action.deck_configuration
                self._state.loaded_addressable_areas_by_name = (
                    self._get_addressable_areas_from_deck_configuration(
                        deck_config=action.deck_configuration,
                        deck_definition=current_state.deck_definition,
                    )
                )

    def _handle_command(self, command: Command) -> None:
        """Modify state in reaction to a command."""
        if isinstance(command.result, LoadLabwareResult):
            location = command.params.location
            if isinstance(location, (DeckSlotLocation, AddressableAreaLocation)):
                self._check_location_is_addressable_area(location)

        elif isinstance(command.result, MoveLabwareResult):
            location = command.params.newLocation
            if isinstance(location, (DeckSlotLocation, AddressableAreaLocation)):
                self._check_location_is_addressable_area(location)

        elif isinstance(command.result, LoadModuleResult):
            self._check_location_is_addressable_area(command.params.location)

        elif isinstance(command.result, MoveToAddressableAreaResult):
            addressable_area_name = command.params.addressableAreaName
            self._check_location_is_addressable_area(addressable_area_name)

    @staticmethod
    def _get_addressable_areas_from_deck_configuration(
        deck_config: DeckConfigurationType, deck_definition: DeckDefinitionV4
    ) -> Dict[str, AddressableArea]:
        """Return all addressable areas provided by the given deck configuration."""
        # TODO uncomment once execute is hooked up with this properly
        # assert (
        #     len(deck_config) == 12
        # ), f"{len(deck_config)} cutout fixture ids provided."
        addressable_areas = []
        for cutout_id, cutout_fixture_id in deck_config:
            provided_addressable_areas = (
                deck_configuration_provider.get_provided_addressable_area_names(
                    cutout_fixture_id, cutout_id, deck_definition
                )
            )
            cutout_position = deck_configuration_provider.get_cutout_position(
                cutout_id, deck_definition
            )
            base_slot = CUTOUT_TO_DECK_SLOT_MAP[cutout_id]
            for addressable_area_name in provided_addressable_areas:
                addressable_areas.append(
                    deck_configuration_provider.get_addressable_area_from_name(
                        addressable_area_name=addressable_area_name,
                        cutout_position=cutout_position,
                        base_slot=base_slot,
                        deck_definition=deck_definition,
                    )
                )
        return {area.area_name: area for area in addressable_areas}

    def _check_location_is_addressable_area(
        self, location: Union[DeckSlotLocation, AddressableAreaLocation, str]
    ) -> None:
        if isinstance(location, DeckSlotLocation):
            addressable_area_name = location.slotName.id
        elif isinstance(location, AddressableAreaLocation):
            addressable_area_name = location.addressableAreaName
        else:
            addressable_area_name = location

        if addressable_area_name not in self._state.loaded_addressable_areas_by_name:
            # TODO Validate that during an actual run, the deck configuration provides the requested
            # addressable area. If it does not, MoveToAddressableArea.execute() needs to raise;
            # this store class cannot raise because Protocol Engine stores are not allowed to.

            cutout_id = self._validate_addressable_area_for_simulation(
                addressable_area_name
            )

            self._update_assumed_slots_for_deck(cutout_id)

            cutout_position = deck_configuration_provider.get_cutout_position(
                cutout_id, self._state.deck_definition
            )
            base_slot = CUTOUT_TO_DECK_SLOT_MAP[cutout_id]
            addressable_area = (
                deck_configuration_provider.get_addressable_area_from_name(
                    addressable_area_name=addressable_area_name,
                    cutout_position=cutout_position,
                    base_slot=base_slot,
                    deck_definition=self._state.deck_definition,
                )
            )
            self._state.loaded_addressable_areas_by_name[
                addressable_area.area_name
            ] = addressable_area

    def _validate_addressable_area_for_simulation(
        self, addressable_area_name: str
    ) -> str:
        """Given an addressable area name, validate it can exist on the deck and return cutout id associated with it."""
        (
            cutout_id,
            potential_fixtures,
        ) = deck_configuration_provider.get_potential_cutout_fixtures(
            addressable_area_name, self._state.deck_definition
        )

        if cutout_id in self._state.potential_cutout_fixtures_by_cutout_id:
            # Get the existing potential cutout fixtures for the addressable area already loaded on this cutout
            existing_potential_fixtures = (
                self._state.potential_cutout_fixtures_by_cutout_id[cutout_id]
            )
            # See if there's any common cutout fixture that supplies existing addressable areas and the one being loaded
            remaining_fixtures = existing_potential_fixtures.intersection(
                set(potential_fixtures)
            )
            if not remaining_fixtures:
                loaded_areas_on_cutout = _get_conflicting_addressable_areas(
                    existing_potential_fixtures,
                    set(self.state.loaded_addressable_areas_by_name),
                    self._state.deck_definition,
                )
                # FIXME(mm, 2023-12-01): This needs to be raised from within
                # MoveToAddressableAreaImplementation.execute(). Protocol Engine stores are not
                # allowed to raise.
                raise IncompatibleAddressableAreaError(
                    f"Cannot load {addressable_area_name}, not compatible with one or more of"
                    f" the following areas: {loaded_areas_on_cutout}"
                )

            self._state.potential_cutout_fixtures_by_cutout_id[
                cutout_id
            ] = remaining_fixtures
        else:
            self._state.potential_cutout_fixtures_by_cutout_id[cutout_id] = set(
                potential_fixtures
            )

        return cutout_id

    def _update_assumed_slots_for_deck(self, cutout_id: str) -> None:
        """Update assumed deck slot for analysis run and remove if no longer possible in a deck configuration."""
        deck_slot = CUTOUT_TO_DECK_SLOT_MAP[cutout_id]
        potential_addressable_areas: Set[str] = set()
        for fixtures in self._state.potential_cutout_fixtures_by_cutout_id[cutout_id]:
            potential_addressable_areas.update(fixtures.provided_addressable_areas)
        if deck_slot.id not in potential_addressable_areas:
            self._state.assumed_slots_for_deck.discard(deck_slot.id)


class AddressableAreaView(HasState[AddressableAreaState]):
    """Read-only addressable area state view."""

    _state: AddressableAreaState

    def __init__(self, state: AddressableAreaState) -> None:
        """Initialize the computed view of addressable area state.

        Arguments:
            state: Addressable area state dataclass used for all calculations.
        """
        self._state = state

    def get_addressable_area(self, addressable_area_name: str) -> AddressableArea:
        """Get addressable area."""
        if not self._state.use_simulated_deck_config:
            return self._get_loaded_addressable_area(addressable_area_name)
        else:
            return self._get_addressable_area_from_deck_data(addressable_area_name)

    def get_all(self) -> List[str]:
        """Get a list of all loaded addressable area names."""
        return list(self._state.loaded_addressable_areas_by_name)

    def get_all_cutout_fixtures(self) -> Optional[List[str]]:
        """Get the names of all fixtures present in the host robot's deck configuration.

        If `use_simulated_deck_config` is `True` (see `Config`), we don't have a
        meaningful concrete layout of fixtures, so this will return `None`.
        """
        if self._state.use_simulated_deck_config:
            return None
        else:
            assert self._state.deck_configuration is not None
            return [
                cutout_fixture_id
                for _, cutout_fixture_id in self._state.deck_configuration
            ]

    def _get_loaded_addressable_area(
        self, addressable_area_name: str
    ) -> AddressableArea:
        """Get an addressable area that has been loaded into state. Will raise error if it does not exist."""
        try:
            return self._state.loaded_addressable_areas_by_name[addressable_area_name]
        except KeyError:
            raise AreaNotInDeckConfigurationError(
                f"{addressable_area_name} not provided by deck configuration."
            )

    def _get_addressable_area_from_deck_data(
        self, addressable_area_name: str
    ) -> AddressableArea:
        """Get an addressable area that may not have been already loaded for a simulated run.

        Since this may be the first time this addressable area has been called, and it might not exist in the store
        yet (and if not won't until the result completes), we have to check if it is theoretically possible and then
        get the area data from the deck configuration provider.
        """
        if addressable_area_name in self._state.loaded_addressable_areas_by_name:
            return self._state.loaded_addressable_areas_by_name[addressable_area_name]

        (
            cutout_id,
            potential_fixtures,
        ) = deck_configuration_provider.get_potential_cutout_fixtures(
            addressable_area_name, self._state.deck_definition
        )

        if cutout_id in self._state.potential_cutout_fixtures_by_cutout_id:
            if not self._state.potential_cutout_fixtures_by_cutout_id[
                cutout_id
            ].intersection(potential_fixtures):
                loaded_areas_on_cutout = _get_conflicting_addressable_areas(
                    self._state.potential_cutout_fixtures_by_cutout_id[cutout_id],
                    set(self._state.loaded_addressable_areas_by_name),
                    self.state.deck_definition,
                )
                raise IncompatibleAddressableAreaError(
                    f"Cannot load {addressable_area_name}, not compatible with one or more of"
                    f" the following areas: {loaded_areas_on_cutout}"
                )

        cutout_position = deck_configuration_provider.get_cutout_position(
            cutout_id, self._state.deck_definition
        )
        base_slot = CUTOUT_TO_DECK_SLOT_MAP[cutout_id]
        return deck_configuration_provider.get_addressable_area_from_name(
            addressable_area_name=addressable_area_name,
            cutout_position=cutout_position,
            base_slot=base_slot,
            deck_definition=self._state.deck_definition,
        )

    def get_addressable_area_base_slot(
        self, addressable_area_name: str
    ) -> DeckSlotName:
        """Get the base slot the addressable area is associated with."""
        addressable_area = self.get_addressable_area(addressable_area_name)
        return addressable_area.base_slot

    def get_addressable_area_position(self, addressable_area_name: str) -> Point:
        """Get the position of an addressable area."""
        # TODO This should be the regular `get_addressable_area` once Robot Server deck config and tests is hooked up
        addressable_area = self._get_addressable_area_from_deck_data(
            addressable_area_name
        )
        position = addressable_area.position
        return Point(x=position.x, y=position.y, z=position.z)

    def get_addressable_area_move_to_location(
        self, addressable_area_name: str
    ) -> Point:
        """Get the move-to position (top center) for an addressable area."""
        addressable_area = self.get_addressable_area(addressable_area_name)
        position = addressable_area.position
        bounding_box = addressable_area.bounding_box
        return Point(
            x=position.x + bounding_box.x / 2,
            y=position.y + bounding_box.y / 2,
            z=position.z + bounding_box.z,
        )

    def get_addressable_area_center(self, addressable_area_name: str) -> Point:
        """Get the (x, y, z) position of the center of the area."""
        addressable_area = self.get_addressable_area(addressable_area_name)
        position = addressable_area.position
        bounding_box = addressable_area.bounding_box
        return Point(
            x=position.x + bounding_box.x / 2,
            y=position.y + bounding_box.y / 2,
            z=position.z,
        )

    def get_fixture_height(self, cutout_fixture_name: str) -> float:
        """Get the z height of a cutout fixture."""
        cutout_fixture = deck_configuration_provider.get_cutout_fixture(
            cutout_fixture_name, self._state.deck_definition
        )
        return cutout_fixture["height"]

    @lru_cache(maxsize=16)
    def get_slot_definition(self, slot_id: str) -> SlotDefV3:
        """Get the definition of a slot in the deck."""
        try:
            addressable_area = self._get_addressable_area_from_deck_data(slot_id)
        except AssertionError:
            raise SlotDoesNotExistError(
                f"Slot ID {slot_id} does not exist in deck {self._state.deck_definition['otId']}"
            )
        position = addressable_area.position
        bounding_box = addressable_area.bounding_box
        return {
            "id": addressable_area.area_name,
            "position": [position.x, position.y, position.z],
            "boundingBox": {
                "xDimension": bounding_box.x,
                "yDimension": bounding_box.y,
                "zDimension": bounding_box.z,
            },
            "displayName": addressable_area.display_name,
            "compatibleModuleTypes": addressable_area.compatible_module_types,
        }

    def get_deck_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all slot definitions either configured for robot or assumed for analysis run so far."""
        if not self._state.use_simulated_deck_config:
            slot_definitions = {
                area.area_name: self.get_slot_definition(area.area_name)
                for area in self._state.loaded_addressable_areas_by_name.values()
                if area.area_type in {AreaType.SLOT, AreaType.STAGING_SLOT}
            }
        else:
            loaded_slot_names = {
                area.area_name
                for area in self._state.loaded_addressable_areas_by_name.values()
                if area.area_type in {AreaType.SLOT, AreaType.STAGING_SLOT}
            }
            assumed_and_loaded_slots = loaded_slot_names.union(
                self._state.assumed_slots_for_deck
            )

            slot_definitions = {
                slot_name: self.get_slot_definition(slot_name)
                for slot_name in assumed_and_loaded_slots
            }

        return slot_definitions
