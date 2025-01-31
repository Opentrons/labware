"""The interface that implements ProtocolContext."""

from __future__ import annotations

from abc import abstractmethod, ABC
from typing import Generic, List, Optional, Union, Tuple, Dict, TYPE_CHECKING

from opentrons_shared_data.deck.types import DeckDefinitionV5, SlotDefV3
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.labware.types import LabwareDefinition
from opentrons_shared_data.robot.types import RobotType

from opentrons.types import (
    DeckSlotName,
    StagingSlotName,
    Location,
    Mount,
    Point,
)
from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.modules.types import ModuleModel
from opentrons.protocols.api_support.util import AxisMaxSpeeds

from .instrument import InstrumentCoreType
from .labware import LabwareCoreType, LabwareLoadParams
from .module import ModuleCoreType
from .._liquid import Liquid, LiquidClass
from .robot import AbstractRobot
from .._types import OffDeckType
from ..disposal_locations import TrashBin, WasteChute

if TYPE_CHECKING:
    from ..labware import Labware


class AbstractProtocol(
    ABC, Generic[InstrumentCoreType, LabwareCoreType, ModuleCoreType]
):
    @property
    @abstractmethod
    def fixed_trash(self) -> Optional[LabwareCoreType]:
        """Get the fixed trash labware core."""
        ...

    @property
    @abstractmethod
    def robot_type(self) -> RobotType:
        ...

    @abstractmethod
    def get_max_speeds(self) -> AxisMaxSpeeds:
        ...

    @abstractmethod
    def get_hardware(self) -> SyncHardwareAPI:
        ...

    @abstractmethod
    def is_simulating(self) -> bool:
        ...

    @abstractmethod
    def add_labware_definition(
        self,
        definition: LabwareDefinition,
    ) -> LabwareLoadParams:
        """Add a labware definition to the set of loadable definitions."""
        ...

    @abstractmethod
    def append_disposal_location(
        self,
        disposal_location: Union[Labware, TrashBin, WasteChute],
    ) -> None:
        """Append a disposal location object to the core"""
        ...

    @abstractmethod
    def load_labware(
        self,
        load_name: str,
        location: Union[
            DeckSlotName, StagingSlotName, LabwareCoreType, ModuleCoreType, OffDeckType
        ],
        label: Optional[str],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        """Load a labware using its identifying parameters."""
        ...

    @abstractmethod
    def load_adapter(
        self,
        load_name: str,
        location: Union[DeckSlotName, StagingSlotName, ModuleCoreType, OffDeckType],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        """Load an adapter using its identifying parameters"""
        ...

    @abstractmethod
    def load_lid(
        self,
        load_name: str,
        location: LabwareCoreType,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        """Load an individual lid labware using its identifying parameters. Must be loaded on a labware."""
        ...

    @abstractmethod
    def move_labware(
        self,
        labware_core: LabwareCoreType,
        new_location: Union[
            DeckSlotName,
            StagingSlotName,
            LabwareCoreType,
            ModuleCoreType,
            OffDeckType,
            WasteChute,
            TrashBin,
        ],
        use_gripper: bool,
        pause_for_manual_move: bool,
        pick_up_offset: Optional[Tuple[float, float, float]],
        drop_offset: Optional[Tuple[float, float, float]],
    ) -> None:
        ...

    @abstractmethod
    def load_module(
        self,
        model: ModuleModel,
        deck_slot: Optional[DeckSlotName],
        configuration: Optional[str],
    ) -> ModuleCoreType:
        ...

    @abstractmethod
    def load_instrument(
        self,
        instrument_name: PipetteNameType,
        mount: Mount,
        liquid_presence_detection: bool = False,
    ) -> InstrumentCoreType:
        ...

    @abstractmethod
    def load_trash_bin(self, slot_name: DeckSlotName, area_name: str) -> TrashBin:
        ...

    @abstractmethod
    def load_ot2_fixed_trash_bin(self) -> None:
        ...

    @abstractmethod
    def load_waste_chute(self) -> WasteChute:
        ...

    @abstractmethod
    def pause(self, msg: Optional[str]) -> None:
        ...

    @abstractmethod
    def comment(self, msg: str) -> None:
        ...

    @abstractmethod
    def delay(self, seconds: float, msg: Optional[str]) -> None:
        ...

    @abstractmethod
    def home(self) -> None:
        ...

    @abstractmethod
    def set_rail_lights(self, on: bool) -> None:
        ...

    @abstractmethod
    def get_disposal_locations(self) -> List[Union[Labware, TrashBin, WasteChute]]:
        ...

    @abstractmethod
    def get_rail_lights_on(self) -> bool:
        ...

    @abstractmethod
    def door_closed(self) -> bool:
        ...

    @abstractmethod
    def get_last_location(
        self,
        mount: Optional[Mount] = None,
    ) -> Optional[Location]:
        ...

    @abstractmethod
    def set_last_location(
        self,
        location: Optional[Location],
        mount: Optional[Mount] = None,
    ) -> None:
        ...

    @abstractmethod
    def load_lid_stack(
        self,
        load_name: str,
        location: Union[DeckSlotName, StagingSlotName, LabwareCoreType],
        quantity: int,
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        ...

    @abstractmethod
    def get_deck_definition(self) -> DeckDefinitionV5:
        """Get the geometry definition of the robot's deck."""

    @abstractmethod
    def get_slot_definition(
        self, slot: Union[DeckSlotName, StagingSlotName]
    ) -> SlotDefV3:
        """Get the slot definition from the robot's deck."""

    @abstractmethod
    def get_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all standard slot definitions available in the deck definition."""

    @abstractmethod
    def get_staging_slot_definitions(self) -> Dict[str, SlotDefV3]:
        """Get all staging slot definitions available in the deck definition."""

    @abstractmethod
    def get_slot_item(
        self, slot_name: Union[DeckSlotName, StagingSlotName]
    ) -> Union[LabwareCoreType, ModuleCoreType, None]:
        """Get the contents of a given slot, if any."""

    @abstractmethod
    def get_labware_on_module(
        self, module_core: ModuleCoreType
    ) -> Optional[LabwareCoreType]:
        """Get the labware on a given module, if any."""

    @abstractmethod
    def get_labware_on_labware(
        self, labware_core: LabwareCoreType
    ) -> Optional[LabwareCoreType]:
        """Get the labware on a given labware, if any."""

    @abstractmethod
    def get_slot_center(self, slot_name: Union[DeckSlotName, StagingSlotName]) -> Point:
        """Get the absolute coordinate of a slot's center."""

    @abstractmethod
    def get_highest_z(self) -> float:
        """Get the highest Z point of all deck items."""

    @abstractmethod
    def get_labware_cores(self) -> List[LabwareCoreType]:
        """Get all loaded labware cores."""

    @abstractmethod
    def get_module_cores(self) -> List[ModuleCoreType]:
        """Get all loaded module cores."""

    @abstractmethod
    def define_liquid(
        self, name: str, description: Optional[str], display_color: Optional[str]
    ) -> Liquid:
        """Define a liquid to load into a well."""

    @abstractmethod
    def define_liquid_class(self, name: str) -> LiquidClass:
        """Define a liquid class for use in transfer functions."""

    @abstractmethod
    def get_labware_location(
        self, labware_core: LabwareCoreType
    ) -> Union[str, LabwareCoreType, ModuleCoreType, OffDeckType]:
        """Get labware parent location."""

    @abstractmethod
    def load_robot(self) -> AbstractRobot:
        """Load a Robot Core context into a protocol"""
