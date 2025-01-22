"""Pipetting command handling."""
from typing import Optional, Iterator, Tuple
from typing_extensions import Protocol as TypingProtocol
from contextlib import contextmanager

from opentrons.hardware_control import HardwareControlAPI

from ..state.state import StateView
from ..state.pipettes import HardwarePipette
from ..notes import CommandNoteAdder, CommandNote
from ..errors.exceptions import (
    TipNotAttachedError,
    InvalidAspirateVolumeError,
    InvalidPushOutVolumeError,
    InvalidDispenseVolumeError,
)
from opentrons.protocol_engine.types import WellLocation

# 1e-9 µL (1 femtoliter!) is a good value because:
# * It's large relative to rounding errors that occur in practice in protocols. For
#   example, https://opentrons.atlassian.net/browse/RESC-182 shows a rounding error
#   on the order of 1e-15 µL.
# * It's small relative to volumes that our users might actually care about and
#   expect the robot to execute faithfully.
# * It's the default absolute tolerance for math.isclose(), where it apparently works
#   well in general.
_VOLUME_ROUNDING_ERROR_TOLERANCE = 1e-9


class PipettingHandler(TypingProtocol):
    """Liquid handling commands."""

    def get_is_ready_to_aspirate(self, pipette_id: str) -> bool:
        """Get whether a pipette is ready to aspirate."""

    async def prepare_for_aspirate(self, pipette_id: str) -> None:
        """Prepare for pipette aspiration."""

    async def aspirate_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
        correction_volume: float = 0.0,
    ) -> float:
        """Set flow-rate and aspirate."""

    async def aspirate_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
    ) -> float:
        """Set flow-rate and aspirate while tracking."""

    async def dispense_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
    ) -> float:
        """Set flow-rate and dispense while tracking."""

    async def dispense_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
        correction_volume: float = 0.0,
    ) -> float:
        """Set flow-rate and dispense."""

    async def blow_out_in_place(
        self,
        pipette_id: str,
        flow_rate: float,
    ) -> None:
        """Set flow rate and blow-out."""

    async def liquid_probe_in_place(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: WellLocation,
    ) -> float:
        """Detect liquid level."""


class HardwarePipettingHandler(PipettingHandler):
    """Liquid handling, using the Hardware API.""" ""

    def __init__(self, state_view: StateView, hardware_api: HardwareControlAPI) -> None:
        """Initialize a PipettingHandler instance."""
        self._state_view = state_view
        self._hardware_api = hardware_api

    def get_is_ready_to_aspirate(self, pipette_id: str) -> bool:
        """Get whether a pipette is ready to aspirate."""
        hw_pipette = self._state_view.pipettes.get_hardware_pipette(
            pipette_id=pipette_id,
            attached_pipettes=self._hardware_api.attached_instruments,
        )
        return (
            self._state_view.pipettes.get_aspirated_volume(pipette_id) is not None
            and hw_pipette.config["ready_to_aspirate"]
        )

    async def prepare_for_aspirate(self, pipette_id: str) -> None:
        """Prepare for pipette aspiration.

        Raises:
            PipetteOverpressureError, propagated as-is from the hardware controller.
        """
        hw_mount = self._state_view.pipettes.get_mount(pipette_id).to_hw_mount()
        await self._hardware_api.prepare_for_aspirate(mount=hw_mount)

    def get_hw_aspirate_params(
        self,
        pipette_id: str,
        volume: float,
        command_note_adder: CommandNoteAdder,
    ) -> Tuple[HardwarePipette, float]:
        """Get params for hardware aspirate."""
        _adjusted_volume = _validate_aspirate_volume(
            state_view=self._state_view,
            pipette_id=pipette_id,
            aspirate_volume=volume,
            command_note_adder=command_note_adder,
        )
        _hw_pipette = self._state_view.pipettes.get_hardware_pipette(
            pipette_id=pipette_id,
            attached_pipettes=self._hardware_api.attached_instruments,
        )
        return _hw_pipette, _adjusted_volume

    def get_hw_dispense_params(
        self,
        pipette_id: str,
        volume: float,
    ) -> Tuple[HardwarePipette, float]:
        """Get params for hardware dispense."""
        _adjusted_volume = _validate_dispense_volume(
            state_view=self._state_view,
            pipette_id=pipette_id,
            dispense_volume=volume,
        )
        _hw_pipette = self._state_view.pipettes.get_hardware_pipette(
            pipette_id=pipette_id,
            attached_pipettes=self._hardware_api.attached_instruments,
        )
        return _hw_pipette, _adjusted_volume

    async def aspirate_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
    ) -> float:
        """Set flow-rate and aspirate.

        Raises:
            PipetteOverpressureError, propagated as-is from the hardware controller.
        """
        # get mount and config data from state and hardware controller
        """hw_pipette, adjusted_volume = self.get_hw_aspirate_params(
            pipette_id, volume, command_note_adder
        )

        aspirate_z_distance = self._state_view.geometry.get_liquid_handling_z_change(
            labware_id=labware_id,
            well_name=well_name,
            operation_volume=volume * -1,
        )
        with self._set_flow_rate(pipette=hw_pipette, aspirate_flow_rate=flow_rate):
            await self._hardware_api.aspirate_while_tracking(
                mount=hw_pipette.mount,
                z_distance=aspirate_z_distance,
                flow_rate=flow_rate,
                volume=adjusted_volume,
            )
        return adjusted_volume
        """
        return 0.0

    async def dispense_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
    ) -> float:
        """Set flow-rate and dispense.

        Raises:
            PipetteOverpressureError, propagated as-is from the hardware controller.
        """
        # get mount and config data from state and hardware controller
        """hw_pipette, adjusted_volume = self.get_hw_dispense_params(pipette_id, volume)

        dispense_z_distance = self._state_view.geometry.get_liquid_handling_z_change(
            labware_id=labware_id,
            well_name=well_name,
            operation_volume=volume,
        )
        with self._set_flow_rate(pipette=hw_pipette, dispense_flow_rate=flow_rate):
            await self._hardware_api.dispense_while_tracking(
                mount=hw_pipette.mount,
                z_distance=dispense_z_distance,
                flow_rate=flow_rate,
                volume=adjusted_volume,
                push_out=push_out,
            )

        return adjusted_volume
        """
        return 0.0

    async def aspirate_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
        correction_volume: float = 0.0,
    ) -> float:
        """Set flow-rate and aspirate.

        Raises:
            PipetteOverpressureError, propagated as-is from the hardware controller.
        """
        # get mount and config data from state and hardware controller
        hw_pipette, adjusted_volume = self.get_hw_aspirate_params(
            pipette_id, volume, command_note_adder
        )
        with self._set_flow_rate(pipette=hw_pipette, aspirate_flow_rate=flow_rate):
            await self._hardware_api.aspirate(
                mount=hw_pipette.mount,
                volume=adjusted_volume,
                correction_volume=correction_volume,
            )

        return adjusted_volume

    async def dispense_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
        correction_volume: float = 0.0,
    ) -> float:
        """Dispense liquid without moving the pipette."""
        hw_pipette, adjusted_volume = self.get_hw_dispense_params(pipette_id, volume)
        # TODO (tz, 8-23-23): add a check for push_out not larger that the max volume allowed when working on this https://opentrons.atlassian.net/browse/RSS-329
        if push_out and push_out < 0:
            raise InvalidPushOutVolumeError(
                "push out value cannot have a negative value."
            )
        with self._set_flow_rate(pipette=hw_pipette, dispense_flow_rate=flow_rate):
            await self._hardware_api.dispense(
                mount=hw_pipette.mount,
                volume=adjusted_volume,
                push_out=push_out,
                correction_volume=correction_volume,
            )

        return adjusted_volume

    async def blow_out_in_place(
        self,
        pipette_id: str,
        flow_rate: float,
    ) -> None:
        """Set flow rate and blow-out."""
        # get mount and config data from state and hardware controller
        hw_pipette = self._state_view.pipettes.get_hardware_pipette(
            pipette_id=pipette_id,
            attached_pipettes=self._hardware_api.attached_instruments,
        )
        with self._set_flow_rate(pipette=hw_pipette, blow_out_flow_rate=flow_rate):
            await self._hardware_api.blow_out(mount=hw_pipette.mount)

    async def liquid_probe_in_place(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: WellLocation,
    ) -> float:
        """Detect liquid level."""
        hw_pipette = self._state_view.pipettes.get_hardware_pipette(
            pipette_id=pipette_id,
            attached_pipettes=self._hardware_api.attached_instruments,
        )
        well_def = self._state_view.labware.get_well_definition(labware_id, well_name)
        well_depth = well_def.depth
        lld_min_height = self._state_view.pipettes.get_current_tip_lld_settings(
            pipette_id=pipette_id
        )
        z_pos = await self._hardware_api.liquid_probe(
            mount=hw_pipette.mount,
            max_z_dist=well_depth - lld_min_height + well_location.offset.z,
        )
        labware_pos = self._state_view.geometry.get_labware_position(labware_id)
        relative_height = z_pos - labware_pos.z - well_def.z
        return float(relative_height)

    @contextmanager
    def _set_flow_rate(
        self,
        pipette: HardwarePipette,
        aspirate_flow_rate: Optional[float] = None,
        dispense_flow_rate: Optional[float] = None,
        blow_out_flow_rate: Optional[float] = None,
    ) -> Iterator[None]:
        """Context manager for setting flow rate before calling aspirate, dispense, or blowout."""
        original_aspirate_rate = pipette.config["aspirate_flow_rate"]
        original_dispense_rate = pipette.config["dispense_flow_rate"]
        original_blow_out_rate = pipette.config["blow_out_flow_rate"]
        self._hardware_api.set_flow_rate(
            pipette.mount,
            aspirate=aspirate_flow_rate,
            dispense=dispense_flow_rate,
            blow_out=blow_out_flow_rate,
        )
        try:
            yield
        finally:
            self._hardware_api.set_flow_rate(
                pipette.mount,
                aspirate=original_aspirate_rate,
                dispense=original_dispense_rate,
                blow_out=original_blow_out_rate,
            )


class VirtualPipettingHandler(PipettingHandler):
    """Liquid handling, using the virtual pipettes.""" ""

    _state_view: StateView

    def __init__(
        self,
        state_view: StateView,
    ) -> None:
        """Initialize a PipettingHandler instance."""
        self._state_view = state_view

    def get_is_ready_to_aspirate(self, pipette_id: str) -> bool:
        """Get whether a pipette is ready to aspirate."""
        return self._state_view.pipettes.get_aspirated_volume(pipette_id) is not None

    async def prepare_for_aspirate(self, pipette_id: str) -> None:
        """Virtually prepare to aspirate (no-op)."""

    async def aspirate_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
        correction_volume: float = 0.0,
    ) -> float:
        """Virtually aspirate (no-op)."""
        self._validate_tip_attached(pipette_id=pipette_id, command_name="aspirate")
        return _validate_aspirate_volume(
            state_view=self._state_view,
            pipette_id=pipette_id,
            aspirate_volume=volume,
            command_note_adder=command_note_adder,
        )

    async def dispense_in_place(
        self,
        pipette_id: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
        correction_volume: float = 0.0,
    ) -> float:
        """Virtually dispense (no-op)."""
        # TODO (tz, 8-23-23): add a check for push_out not larger that the max volume allowed when working on this https://opentrons.atlassian.net/browse/RSS-329
        if push_out and push_out < 0:
            raise InvalidPushOutVolumeError(
                "push out value cannot have a negative value."
            )
        self._validate_tip_attached(pipette_id=pipette_id, command_name="dispense")
        return _validate_dispense_volume(
            state_view=self._state_view, pipette_id=pipette_id, dispense_volume=volume
        )

    async def blow_out_in_place(
        self,
        pipette_id: str,
        flow_rate: float,
    ) -> None:
        """Virtually blow out (no-op)."""

    async def liquid_probe_in_place(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: WellLocation,
    ) -> float:
        """Detect liquid level."""
        well_def = self._state_view.labware.get_well_definition(labware_id, well_name)
        # raise ValueError(f"returning liquid height {well_def.depth}")
        return well_def.depth

    def _validate_tip_attached(self, pipette_id: str, command_name: str) -> None:
        """Validate if there is a tip attached."""
        tip_geometry = self._state_view.pipettes.get_attached_tip(pipette_id)
        if not tip_geometry:
            raise TipNotAttachedError(
                f"Cannot perform {command_name} without a tip attached"
            )

    async def aspirate_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        command_note_adder: CommandNoteAdder,
    ) -> float:
        """Virtually aspirate (no-op)."""
        self._validate_tip_attached(pipette_id=pipette_id, command_name="aspirate")

        return _validate_aspirate_volume(
            state_view=self._state_view,
            pipette_id=pipette_id,
            aspirate_volume=volume,
            command_note_adder=command_note_adder,
        )

    async def dispense_while_tracking(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        volume: float,
        flow_rate: float,
        push_out: Optional[float],
    ) -> float:
        """Virtually dispense (no-op)."""
        # TODO (tz, 8-23-23): add a check for push_out not larger that the max volume allowed when working on this https://opentrons.atlassian.net/browse/RSS-329
        if push_out and push_out < 0:
            raise InvalidPushOutVolumeError(
                "push out value cannot have a negative value."
            )
        self._validate_tip_attached(pipette_id=pipette_id, command_name="dispense")
        return _validate_dispense_volume(
            state_view=self._state_view, pipette_id=pipette_id, dispense_volume=volume
        )


def create_pipetting_handler(
    state_view: StateView, hardware_api: HardwareControlAPI
) -> PipettingHandler:
    """Create a pipetting handler."""
    return (
        HardwarePipettingHandler(state_view=state_view, hardware_api=hardware_api)
        if state_view.config.use_virtual_pipettes is False
        else VirtualPipettingHandler(state_view=state_view)
    )


def _validate_aspirate_volume(
    state_view: StateView,
    pipette_id: str,
    aspirate_volume: float,
    command_note_adder: CommandNoteAdder,
) -> float:
    """Get whether the given volume is valid to aspirate right now.

    Return the volume to aspirate, possibly clamped, or raise an
    InvalidAspirateVolumeError.
    """
    working_volume = state_view.pipettes.get_working_volume(pipette_id=pipette_id)

    current_volume = (
        state_view.pipettes.get_aspirated_volume(pipette_id=pipette_id) or 0
    )

    # TODO(mm, 2024-01-11): We should probably just use
    # state_view.pipettes.get_available_volume()? Its whole `None` return vs. exception
    # raising thing is confusing me.
    available_volume = working_volume - current_volume
    available_volume_with_tolerance = (
        available_volume + _VOLUME_ROUNDING_ERROR_TOLERANCE
    )

    if aspirate_volume > available_volume_with_tolerance:
        raise InvalidAspirateVolumeError(
            attempted_aspirate_volume=aspirate_volume,
            available_volume=available_volume,
            max_pipette_volume=state_view.pipettes.get_maximum_volume(
                pipette_id=pipette_id
            ),
            max_tip_volume=_get_max_tip_volume(
                state_view=state_view, pipette_id=pipette_id
            ),
        )
    else:
        volume_to_aspirate = min(aspirate_volume, available_volume)
        if volume_to_aspirate < aspirate_volume:
            command_note_adder(
                CommandNote(
                    noteKind="warning",
                    shortMessage=f"Aspirate clamped to {available_volume} µL",
                    longMessage=(
                        f"Command requested to aspirate {aspirate_volume} µL but only"
                        f" {available_volume} µL were available in the pipette. This is"
                        " probably a floating point artifact."
                    ),
                    source="execution",
                )
            )
        return volume_to_aspirate


def _validate_dispense_volume(
    state_view: StateView, pipette_id: str, dispense_volume: float
) -> float:
    """Get whether the given volume is valid to dispense right now.

    Return the volume to dispense, possibly clamped, or raise an
    InvalidDispenseVolumeError.
    """
    aspirated_volume = state_view.pipettes.get_aspirated_volume(pipette_id)
    if aspirated_volume is None:
        raise InvalidDispenseVolumeError(
            "Cannot perform a dispense if there is no volume in attached tip."
        )
    else:
        remaining = aspirated_volume - dispense_volume
        if remaining < -_VOLUME_ROUNDING_ERROR_TOLERANCE:
            raise InvalidDispenseVolumeError(
                f"Cannot dispense {dispense_volume} µL when only {aspirated_volume} µL has been aspirated."
            )
        else:
            return min(dispense_volume, aspirated_volume)


def _get_max_tip_volume(state_view: StateView, pipette_id: str) -> Optional[float]:
    attached_tip = state_view.pipettes.get_attached_tip(pipette_id=pipette_id)
    return None if attached_tip is None else attached_tip.volume
