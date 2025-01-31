from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional, Union, List

from opentrons import types
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.hardware_control.types import HardwareAction
from opentrons.protocol_api.core.common import WellCore
from opentrons.protocols.advanced_control.transfers.common import TransferTipPolicyV2
from opentrons.protocols.api_support import instrument as instrument_support
from opentrons.protocols.api_support.labware_like import LabwareLike
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION
from opentrons.protocols.api_support.util import (
    FlowRates,
    PlungerSpeeds,
    APIVersionError,
)
from opentrons.protocols.geometry import planning
from opentrons_shared_data.errors.exceptions import (
    UnexpectedTipRemovalError,
    UnexpectedTipAttachError,
)

from ...disposal_locations import TrashBin, WasteChute
from opentrons.protocol_api._nozzle_layout import NozzleLayout
from opentrons.protocol_api._liquid import LiquidClass

from ..instrument import AbstractInstrument

from ..legacy.legacy_well_core import LegacyWellCore
from ..legacy.legacy_module_core import LegacyThermocyclerCore, LegacyHeaterShakerCore

if TYPE_CHECKING:
    from .legacy_protocol_core import LegacyProtocolCoreSimulator


_log = logging.getLogger()

_PRE_2_2_TIP_DROP_HEIGHT_MM = 10
"""In PAPIv2.1 and below, tips are always dropped 10 mm from the bottom of the well."""


class LegacyInstrumentCoreSimulator(AbstractInstrument[LegacyWellCore]):
    """A simulation of an instrument context."""

    def __init__(
        self,
        protocol_interface: LegacyProtocolCoreSimulator,
        pipette_dict: PipetteDict,
        mount: types.Mount,
        instrument_name: str,
        default_speed: float = 400.0,
        api_version: Optional[APIVersion] = None,
    ):
        """Constructor."""
        self._protocol_interface = protocol_interface
        self._mount = mount
        self._pipette_dict = pipette_dict
        self._instrument_name = instrument_name
        self._default_speed = default_speed
        self._api_version = api_version or MAX_SUPPORTED_VERSION

        self._flow_rate = FlowRates(self)
        pipette_state = self.get_hardware_state()
        self._flow_rate.set_defaults(
            aspirate_defaults=pipette_state["default_aspirate_flow_rates"],
            dispense_defaults=pipette_state["default_dispense_flow_rates"],
            blow_out_defaults=pipette_state["default_blow_out_flow_rates"],
            api_level=self._api_version,
        )

        self._plunger_speeds = PlungerSpeeds(self)
        # Cache the maximum instrument height
        self._instrument_max_height = (
            protocol_interface.get_hardware().get_instrument_max_height(self._mount)
        )
        self._liquid_presence_detection = False

    def get_default_speed(self) -> float:
        return self._default_speed

    def set_default_speed(self, speed: float) -> None:
        self._default_speed = speed

    def air_gap_in_place(self, volume: float, flow_rate: float) -> None:
        assert False, "Air gap tracking only available in API version 2.22 and later"

    def aspirate(
        self,
        location: types.Location,
        well_core: Optional[LegacyWellCore],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        is_meniscus: Optional[bool] = None,
    ) -> None:
        if self.get_current_volume() == 0:
            # Make sure we're at the top of the labware and clear of any
            # liquid to prepare the pipette for aspiration
            if self._api_version < APIVersion(2, 3) or not self.is_ready_to_aspirate():
                if location.labware.is_well:
                    self.move_to(
                        location=location.labware.as_well().top(), well_core=well_core
                    )
                else:
                    # TODO(seth,2019/7/29): This should be a warning exposed
                    #  via rpc to the runapp
                    _log.warning(
                        "When aspirate is called on something other than a "
                        "well relative position, we can't move to the top of"
                        " the well to prepare for aspiration. This might "
                        "cause over aspiration if the previous command is a "
                        "blow_out."
                    )
                self.prepare_to_aspirate()
            self.move_to(location=location, well_core=well_core)
        elif location != self._protocol_interface.get_last_location():
            self.move_to(location=location, well_core=well_core)

        self._raise_if_no_tip(HardwareAction.ASPIRATE.name)
        new_volume = self.get_current_volume() + volume
        assert (
            new_volume <= self._pipette_dict["working_volume"]
        ), "Cannot aspirate more than pipette max volume"
        self._pipette_dict["ready_to_aspirate"] = True
        self._update_volume(new_volume)

    def dispense(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[LegacyWellCore],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        push_out: Optional[float],
        is_meniscus: Optional[bool] = None,
    ) -> None:
        if isinstance(location, (TrashBin, WasteChute)):
            raise APIVersionError(
                api_element="Dispense in Moveable Trash or Waste Chute"
            )
        if not in_place:
            self.move_to(location=location, well_core=well_core)
        self._raise_if_no_tip(HardwareAction.DISPENSE.name)
        self._update_volume(self.get_current_volume() - volume)

    def blow_out(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[LegacyWellCore],
        in_place: bool,
    ) -> None:
        if isinstance(location, (TrashBin, WasteChute)):
            raise APIVersionError(
                api_element="Blow Out in Moveable Trash or Waste Chute"
            )
        if not in_place:
            self.move_to(location=location, well_core=well_core)
        self._raise_if_no_tip(HardwareAction.BLOWOUT.name)
        self._update_volume(0)
        self._pipette_dict["ready_to_aspirate"] = False

    def _update_volume(self, vol: float) -> None:
        self._pipette_dict["current_volume"] = vol
        self._pipette_dict["available_volume"] = (
            self._pipette_dict["working_volume"] - vol
        )

    def touch_tip(
        self,
        location: types.Location,
        well_core: LegacyWellCore,
        radius: float,
        z_offset: float,
        speed: float,
    ) -> None:
        self.move_to(location)

    def pick_up_tip(
        self,
        location: types.Location,
        well_core: LegacyWellCore,
        presses: Optional[int],
        increment: Optional[float],
        prep_after: bool = True,
    ) -> None:
        geometry = well_core.geometry
        tip_rack_core = geometry.parent
        tip_length = instrument_support.tip_length_for(
            pipette=self._pipette_dict,
            tip_rack_definition=tip_rack_core.get_definition(),
        )

        self.move_to(location=location)
        self._raise_if_tip("pick up tip")
        self._pipette_dict["has_tip"] = True
        self._pipette_dict["tip_length"] = tip_length
        self._pipette_dict["current_volume"] = 0
        self._pipette_dict["working_volume"] = min(
            geometry.max_volume, self.get_max_volume()
        )
        self._pipette_dict["available_volume"] = self._pipette_dict["working_volume"]
        if prep_after:
            self._pipette_dict["ready_to_aspirate"] = True

        tip_rack_core.get_tip_tracker().use_tips(
            start_well=well_core,
            num_channels=self.get_channels(),
            fail_if_full=self._api_version < APIVersion(2, 2),
        )

    def drop_tip(
        self,
        location: Optional[types.Location],
        well_core: LegacyWellCore,
        home_after: Optional[bool],
        alternate_drop_location: Optional[bool] = False,
    ) -> None:
        if alternate_drop_location:
            raise APIVersionError(api_element="Tip drop alternation")
        labware_core = well_core.geometry.parent

        if location is None:
            from opentrons.protocol_api.labware import Labware, Well

            labware = Labware(
                core=labware_core,
                api_version=self._api_version,
                protocol_core=None,  # type: ignore[arg-type]
                core_map=None,  # type: ignore[arg-type]
            )
            well = Well(parent=labware, core=well_core, api_version=self._api_version)

            if LabwareLike(labware).is_fixed_trash():
                location = well.top()
            elif self._api_version < APIVersion(2, 2):
                location = well.bottom(z=_PRE_2_2_TIP_DROP_HEIGHT_MM)
            else:
                assert (
                    labware_core.is_tip_rack()
                ), "Expected tip drop target to be a tip rack."

                return_height = self.get_return_height()
                location = well.top(z=-return_height * labware_core.get_tip_length())

        self.move_to(location=location)
        self._raise_if_no_tip(HardwareAction.DROPTIP.name)
        self._pipette_dict["has_tip"] = False
        self._pipette_dict["tip_length"] = 0.0
        self._update_volume(0)

        if self._api_version < APIVersion(2, 2) and labware_core.is_tip_rack():
            # If this is a tiprack we can try and add the dirty tip back to the tracker
            try:
                labware_core.get_tip_tracker().return_tips(
                    start_well=well_core,
                    num_channels=self.get_channels(),
                )
            except AssertionError:
                # Similarly to :py:meth:`return_tips`, the failure case here
                # just means the tip can't be reused, so don't actually stop
                # the protocol
                _log.warning(
                    f"Could not return tip to {labware_core.get_display_name()}"
                )

    def drop_tip_in_disposal_location(
        self,
        disposal_location: Union[TrashBin, WasteChute],
        home_after: Optional[bool],
        alternate_tip_drop: bool = False,
    ) -> None:
        raise APIVersionError(api_element="Dropping tips in a trash bin or waste chute")

    def resin_tip_seal(
        self,
        location: types.Location,
        well_core: WellCore,
        in_place: Optional[bool] = False,
    ) -> None:
        raise APIVersionError(api_element="Sealing resin tips.")

    def resin_tip_unseal(
        self,
        location: types.Location,
        well_core: WellCore,
    ) -> None:
        raise APIVersionError(api_element="Unsealing resin tips.")

    def resin_tip_dispense(
        self,
        location: types.Location,
        well_core: WellCore,
        volume: Optional[float] = None,
        flow_rate: Optional[float] = None,
    ) -> None:
        raise APIVersionError(api_element="Dispensing liquid from resin tips.")

    def home(self) -> None:
        self._protocol_interface.set_last_location(None)

    def home_plunger(self) -> None:
        pass

    def move_to(
        self,
        location: Union[types.Location, TrashBin, WasteChute],
        well_core: Optional[LegacyWellCore] = None,
        force_direct: bool = False,
        minimum_z_height: Optional[float] = None,
        speed: Optional[float] = None,
    ) -> None:
        """Simulation of only the motion planning portion of move_to."""
        if isinstance(location, (TrashBin, WasteChute)):
            raise APIVersionError(api_element="Move To Trash Bin and Waste Chute")

        self.flag_unsafe_move(location)

        last_location = self._protocol_interface.get_last_location()
        if last_location:
            from_loc = last_location
        else:
            from_loc = types.Location(types.Point(0, 0, 0), LabwareLike(None))

        # We just want to catch planning errors.
        planning.plan_moves(
            from_loc,
            location,
            self._protocol_interface.get_deck(),
            self._instrument_max_height,
            force_direct=force_direct,
            minimum_z_height=minimum_z_height,
        )

        self._protocol_interface.set_last_location(location)

    def get_mount(self) -> types.Mount:
        return self._mount

    def get_requested_as_name(self) -> str:
        return self._instrument_name

    def get_pipette_name(self) -> str:
        return self._pipette_dict["name"]

    def get_model(self) -> str:
        return self._pipette_dict["model"]

    def get_display_name(self) -> str:
        return self._pipette_dict["display_name"]

    def get_min_volume(self) -> float:
        return self._pipette_dict["min_volume"]

    def get_max_volume(self) -> float:
        return self._pipette_dict["max_volume"]

    def get_working_volume(self) -> float:
        return self._pipette_dict["working_volume"]

    def get_current_volume(self) -> float:
        return self._pipette_dict["current_volume"]

    def get_available_volume(self) -> float:
        return self._pipette_dict["available_volume"]

    def get_hardware_state(self) -> PipetteDict:
        return self._pipette_dict

    def get_channels(self) -> int:
        return self._pipette_dict["channels"]

    def has_tip(self) -> bool:
        return self._pipette_dict["has_tip"]

    def is_ready_to_aspirate(self) -> bool:
        return self._pipette_dict["ready_to_aspirate"]

    def prepare_to_aspirate(self) -> None:
        self._raise_if_no_tip(HardwareAction.PREPARE_ASPIRATE.name)

    def get_return_height(self) -> float:
        return self._pipette_dict["return_tip_height"]

    def get_speed(self) -> PlungerSpeeds:
        return self._plunger_speeds

    def get_liquid_presence_detection(self) -> bool:
        return self._liquid_presence_detection

    def set_liquid_presence_detection(self, enable: bool) -> None:
        self._liquid_presence_detection = enable

    def get_flow_rate(self) -> FlowRates:
        return self._flow_rate

    def get_aspirate_flow_rate(self, rate: float = 1.0) -> float:
        return self._pipette_dict["aspirate_flow_rate"] * rate

    def get_dispense_flow_rate(self, rate: float = 1.0) -> float:
        return self._pipette_dict["dispense_flow_rate"] * rate

    def get_blow_out_flow_rate(self, rate: float = 1.0) -> float:
        return self._pipette_dict["blow_out_flow_rate"] * rate

    def set_flow_rate(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        self._protocol_interface.get_hardware().set_flow_rate(
            mount=self._mount,
            aspirate=aspirate,
            dispense=dispense,
            blow_out=blow_out,
        )
        self._update_flow_rate()

    def set_pipette_speed(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        self._protocol_interface.get_hardware().set_pipette_speed(
            mount=self._mount,
            aspirate=aspirate,
            dispense=dispense,
            blow_out=blow_out,
        )
        self._update_flow_rate()

    def flag_unsafe_move(self, location: types.Location) -> None:
        """Check if a movement to a destination is potentially unsafe.

        Args:
            location: The movement destination.

        Raises:
            RuntimeError: The movement is unsafe.
        """
        from_loc = self._protocol_interface.get_last_location()

        if not from_loc:
            from_loc = types.Location(types.Point(0, 0, 0), LabwareLike(None))

        for mod in self._protocol_interface.get_module_cores():
            if isinstance(mod, LegacyThermocyclerCore):
                mod.flag_unsafe_move(to_loc=location, from_loc=from_loc)
            elif isinstance(mod, LegacyHeaterShakerCore):
                mod.flag_unsafe_move(
                    to_loc=location,
                    is_multichannel=self.get_channels() > 1,
                )

    def _update_flow_rate(self) -> None:
        """Update cached speed and flow rates from hardware controller pipette."""
        p = self._protocol_interface.get_hardware().get_attached_instrument(
            self.get_mount()
        )
        self._pipette_dict["aspirate_flow_rate"] = p["aspirate_flow_rate"]
        self._pipette_dict["dispense_flow_rate"] = p["dispense_flow_rate"]
        self._pipette_dict["blow_out_flow_rate"] = p["blow_out_flow_rate"]
        self._pipette_dict["aspirate_speed"] = p["aspirate_speed"]
        self._pipette_dict["dispense_speed"] = p["dispense_speed"]
        self._pipette_dict["blow_out_speed"] = p["blow_out_speed"]

    def _raise_if_no_tip(self, action: str) -> None:
        """Raise UnexpectedTipRemovalError if no tip."""
        if not self.has_tip():
            raise UnexpectedTipRemovalError(
                action, self._instrument_name, self._mount.name
            )

    def _raise_if_tip(self, action: str) -> None:
        """Raise UnexpectedTipAttachError if tip."""
        if self.has_tip():
            raise UnexpectedTipAttachError(
                action, self._instrument_name, self._mount.name
            )

    def configure_for_volume(self, volume: float) -> None:
        """This will never be called because it was added in API 2.15."""
        pass

    def configure_nozzle_layout(
        self,
        style: NozzleLayout,
        primary_nozzle: Optional[str],
        front_right_nozzle: Optional[str],
        back_left_nozzle: Optional[str],
    ) -> None:
        """This will never be called because it was added in API 2.15."""
        pass

    def load_liquid_class(
        self,
        liquid_class: LiquidClass,
        pipette_load_name: str,
        tiprack_uri: str,
    ) -> str:
        """This will never be called because it was added in .."""
        # TODO(spp, 2024-11-20): update the docstring and error to include API version
        assert False, "load_liquid_class is not supported in legacy context"

    def transfer_liquid(
        self,
        liquid_class_id: str,
        volume: float,
        source: List[LegacyWellCore],
        dest: List[LegacyWellCore],
        new_tip: TransferTipPolicyV2,
        trash_location: Union[LegacyWellCore, types.Location, TrashBin, WasteChute],
    ) -> None:
        """Transfer a liquid from source to dest according to liquid class properties."""
        # TODO(spp, 2024-11-20): update the docstring and error to include API version
        assert False, "transfer_liquid is not supported in legacy context"

    def get_active_channels(self) -> int:
        """This will never be called because it was added in API 2.16."""
        assert False, "get_active_channels only supported in API 2.16 & later"

    def get_nozzle_map(self) -> types.NozzleMapInterface:
        """This will never be called because it was added in API 2.18."""
        assert False, "get_nozzle_map only supported in API 2.18 & later"

    def is_tip_tracking_available(self) -> bool:
        # Tip tracking is always available in legacy context
        return True

    def retract(self) -> None:
        """Retract this instrument to the top of the gantry."""
        self._protocol_interface.get_hardware.retract(self._mount)  # type: ignore [attr-defined]

    def detect_liquid_presence(self, well_core: WellCore, loc: types.Location) -> bool:
        """This will never be called because it was added in API 2.20."""
        assert False, "detect_liquid_presence only supported in API 2.20 & later"

    def liquid_probe_with_recovery(
        self, well_core: WellCore, loc: types.Location
    ) -> None:
        """This will never be called because it was added in API 2.20."""
        assert False, "liquid_probe_with_recovery only supported in API 2.20 & later"

    def liquid_probe_without_recovery(
        self, well_core: WellCore, loc: types.Location
    ) -> float:
        """This will never be called because it was added in API 2.20."""
        assert False, "liquid_probe_without_recovery only supported in API 2.20 & later"

    def _pressure_supported_by_pipette(self) -> bool:
        return False

    def nozzle_configuration_valid_for_lld(self) -> bool:
        """Check if the nozzle configuration currently supports LLD."""
        return False
