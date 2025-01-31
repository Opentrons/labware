"""The interface that implements InstrumentContext."""

from __future__ import annotations

from abc import abstractmethod, ABC
from typing import Any, Generic, Optional, TypeVar, Union, List

from opentrons import types
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocols.api_support.util import FlowRates
from opentrons.protocols.advanced_control.transfers.common import TransferTipPolicyV2
from opentrons.protocol_api._nozzle_layout import NozzleLayout
from opentrons.protocol_api._liquid import LiquidClass
from ..disposal_locations import TrashBin, WasteChute
from .well import WellCoreType


class AbstractInstrument(ABC, Generic[WellCoreType]):
    @abstractmethod
    def get_default_speed(self) -> float:
        ...

    @abstractmethod
    def set_default_speed(self, speed: float) -> None:
        ...

    @abstractmethod
    def air_gap_in_place(self, volume: float, flow_rate: float) -> None:
        """Aspirate a given volume of air from the current location of the pipette.
        Args:
            volume: The volume of air to aspirate, in microliters.
            flow_rate: The flow rate of air into the pipette, in microliters.
        """

    @abstractmethod
    def aspirate(
        self,
        location: types.Location,
        well_core: Optional[WellCoreType],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        is_meniscus: Optional[bool] = None,
    ) -> None:
        """Aspirate a given volume of liquid from the specified location.
        Args:
            volume: The volume of liquid to aspirate, in microliters.
            location: The exact location to aspirate from.
            well_core: The well to aspirate from, if applicable.
            rate: The rate for how quickly to aspirate.
            flow_rate: The flow rate in µL/s to aspirate at.
            in_place: Whether this is in-place.
        """
        ...

    @abstractmethod
    def dispense(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[WellCoreType],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        push_out: Optional[float],
        is_meniscus: Optional[bool] = None,
    ) -> None:
        """Dispense a given volume of liquid into the specified location.
        Args:
            volume: The volume of liquid to dispense, in microliters.
            location: The exact location to dispense to.
            well_core: The well to dispense to, if applicable.
            rate: The rate for how quickly to dispense.
            flow_rate: The flow rate in µL/s to dispense at.
            in_place: Whether this is in-place.
            push_out: The amount to push the plunger below bottom position.
        """
        ...

    @abstractmethod
    def blow_out(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[WellCoreType],
        in_place: bool,
    ) -> None:
        """Blow liquid out of the tip.

        Args:
            location: The location to blow out into.
            well_core: The well to blow out into.
            in_place: Whether this is in-place.
        """
        ...

    @abstractmethod
    def touch_tip(
        self,
        location: types.Location,
        well_core: WellCoreType,
        radius: float,
        z_offset: float,
        speed: float,
    ) -> None:
        ...

    @abstractmethod
    def pick_up_tip(
        self,
        location: types.Location,
        well_core: WellCoreType,
        presses: Optional[int],
        increment: Optional[float],
        prep_after: bool = True,
    ) -> None:
        """Move to and pick up a tip from a given well.

        Args:
            location: The location of the well we're picking up from.
            well_core: The well to pick up from.
            presses: Customize the number of presses the pipette does.
            increment: Customize the movement "distance" of the pipette to press harder.
            prep_after: Move plunger to the "ready to aspirate" position after pick up.
        """
        ...

    @abstractmethod
    def drop_tip(
        self,
        location: Optional[types.Location],
        well_core: WellCoreType,
        home_after: Optional[bool],
        alternate_drop_location: Optional[bool] = False,
    ) -> None:
        """Move to and drop a tip into a given well.

        Args:
            location: The location of the well we're dropping to.
                If unspecified, the default drop location of the well will be used.
            well_core: The well we're dropping into
            home_after: Whether to home the pipette after the tip is dropped.
            alternate_drop_location: Whether to randomize the exact location to drop tip
                within the specified well.
        """
        ...

    @abstractmethod
    def drop_tip_in_disposal_location(
        self,
        disposal_location: Union[TrashBin, WasteChute],
        home_after: Optional[bool],
        alternate_tip_drop: bool = False,
    ) -> None:
        """Move to and drop tip into a TrashBin or WasteChute.

        Args:
            disposal_location: The disposal location object we're dropping to.
            home_after: Whether to home the pipette after the tip is dropped.
            alternate_tip_drop: Whether to alternate tip drop location in a trash bin.
        """
        ...

    @abstractmethod
    def home(self) -> None:
        ...

    @abstractmethod
    def home_plunger(self) -> None:
        ...

    @abstractmethod
    def move_to(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[WellCoreType],
        force_direct: bool,
        minimum_z_height: Optional[float],
        speed: Optional[float],
    ) -> None:
        ...

    @abstractmethod
    def resin_tip_seal(
        self,
        location: types.Location,
        well_core: WellCoreType,
        in_place: Optional[bool] = False,
    ) -> None:
        ...

    @abstractmethod
    def resin_tip_unseal(
        self,
        location: types.Location,
        well_core: WellCoreType,
    ) -> None:
        ...

    @abstractmethod
    def resin_tip_dispense(
        self,
        location: types.Location,
        well_core: WellCoreType,
        volume: Optional[float] = None,
        flow_rate: Optional[float] = None,
    ) -> None:
        ...

    @abstractmethod
    def get_mount(self) -> types.Mount:
        ...

    @abstractmethod
    def get_pipette_name(self) -> str:
        ...

    @abstractmethod
    def get_model(self) -> str:
        ...

    @abstractmethod
    def get_display_name(self) -> str:
        ...

    @abstractmethod
    def get_min_volume(self) -> float:
        ...

    @abstractmethod
    def get_max_volume(self) -> float:
        ...

    @abstractmethod
    def get_working_volume(self) -> float:
        ...

    @abstractmethod
    def get_current_volume(self) -> float:
        ...

    @abstractmethod
    def get_available_volume(self) -> float:
        ...

    @abstractmethod
    def get_hardware_state(self) -> PipetteDict:
        """Get the current state of the pipette hardware as a dictionary."""
        ...

    @abstractmethod
    def get_channels(self) -> int:
        ...

    @abstractmethod
    def get_active_channels(self) -> int:
        ...

    @abstractmethod
    def get_nozzle_map(self) -> types.NozzleMapInterface:
        ...

    @abstractmethod
    def has_tip(self) -> bool:
        ...

    @abstractmethod
    def get_return_height(self) -> float:
        ...

    @abstractmethod
    def get_flow_rate(self) -> FlowRates:
        ...

    @abstractmethod
    def get_aspirate_flow_rate(self, rate: float = 1.0) -> float:
        ...

    @abstractmethod
    def get_dispense_flow_rate(self, rate: float = 1.0) -> float:
        ...

    @abstractmethod
    def get_blow_out_flow_rate(self, rate: float = 1.0) -> float:
        ...

    @abstractmethod
    def get_liquid_presence_detection(self) -> bool:
        ...

    @abstractmethod
    def _pressure_supported_by_pipette(self) -> bool:
        ...

    @abstractmethod
    def set_liquid_presence_detection(self, enable: bool) -> None:
        ...

    @abstractmethod
    def set_flow_rate(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        ...

    @abstractmethod
    def configure_for_volume(self, volume: float) -> None:
        """Configure the pipette for a specific volume.

        Args:
            volume: The volume to prepare to handle.
        """
        ...

    @abstractmethod
    def prepare_to_aspirate(self) -> None:
        """Prepare the pipette to aspirate."""
        ...

    @abstractmethod
    def configure_nozzle_layout(
        self,
        style: NozzleLayout,
        primary_nozzle: Optional[str],
        front_right_nozzle: Optional[str],
        back_left_nozzle: Optional[str],
    ) -> None:
        """Configure the pipette to a specific nozzle layout.

        Args:
            style: The type of configuration you wish to build.
            primary_nozzle: The nozzle that will determine a pipette's critical point.
            front_right_nozzle: The front right most nozzle in the requested layout.
            back_left_nozzle: The back left most nozzle in the requested layout.
        """
        ...

    @abstractmethod
    def load_liquid_class(
        self,
        liquid_class: LiquidClass,
        pipette_load_name: str,
        tiprack_uri: str,
    ) -> str:
        """Load the liquid class properties of given pipette and tiprack into the engine.

        Returns: ID of the liquid class record
        """
        ...

    @abstractmethod
    def transfer_liquid(
        self,
        liquid_class_id: str,
        volume: float,
        source: List[WellCoreType],
        dest: List[WellCoreType],
        new_tip: TransferTipPolicyV2,
        trash_location: Union[WellCoreType, types.Location, TrashBin, WasteChute],
    ) -> None:
        """Transfer a liquid from source to dest according to liquid class properties."""
        ...

    @abstractmethod
    def is_tip_tracking_available(self) -> bool:
        """Return whether auto tip tracking is available for the pipette's current nozzle configuration."""

    @abstractmethod
    def retract(self) -> None:
        """Retract this instrument to the top of the gantry."""
        ...

    @abstractmethod
    def detect_liquid_presence(
        self, well_core: WellCoreType, loc: types.Location
    ) -> bool:
        """Do a liquid probe to detect whether there is liquid in the well."""

    @abstractmethod
    def liquid_probe_with_recovery(
        self, well_core: WellCoreType, loc: types.Location
    ) -> None:
        """Do a liquid probe to detect the presence of liquid in the well."""
        ...

    @abstractmethod
    def liquid_probe_without_recovery(
        self, well_core: WellCoreType, loc: types.Location
    ) -> float:
        """Do a liquid probe to find the level of the liquid in the well."""
        ...

    @abstractmethod
    def nozzle_configuration_valid_for_lld(self) -> bool:
        """Check if the nozzle configuration currently supports LLD."""


InstrumentCoreType = TypeVar("InstrumentCoreType", bound=AbstractInstrument[Any])
