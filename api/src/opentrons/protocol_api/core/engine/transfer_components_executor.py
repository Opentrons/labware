"""Executor for liquid class based complex commands."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Union, TYPE_CHECKING, Optional

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    PositionReference,
    Coordinate,
)

from opentrons.protocol_api._liquid_properties import (
    SingleDispenseProperties,
    MultiDispenseProperties,
    Submerge,
    RetractAspirate,
    RetractDispense,
    DelayProperties,
    TransferProperties,
    MixProperties,
    AspirateProperties,
)
from opentrons.types import Location, Point

if TYPE_CHECKING:
    from .well import WellCore
    from .instrument import InstrumentCore


@dataclass
class _TargetPosition:
    position_reference: PositionReference
    offset: Coordinate


@dataclass
class _TargetAsLocationAndWell:
    location: Location
    well: WellCore


@dataclass
class MixAspDispData:
    flow_rate: float
    delay: DelayProperties


@dataclass
class MixData:
    mix_properties: MixProperties
    aspirate_data: MixAspDispData
    dispense_data: MixAspDispData


class TransferComponentsExecutor:
    def __init__(
        self,
        instrument_core: InstrumentCore,
        transfer_properties: TransferProperties,
        target_location_and_well: _TargetAsLocationAndWell,
    ) -> None:
        self._instrument = instrument_core
        self._transfer_properties = transfer_properties
        self._target_location_and_well = target_location_and_well

    def submerge(
        self,
        submerge_properties: Submerge,
        air_gap_volume: float,
    ) -> None:
        """Execute submerge steps.

        1. move to position shown by positionReference + offset (should practically be a point outside/above the liquid).
        Should raise an error if this point is inside the liquid?
            For liquid meniscus this is easy to tell. Can’t be below meniscus
            For reference pos of anything else, do not allow submerge position to be below aspirate position
        2. move to aspirate position at desired speed
        3. delay
        """
        # TODO: compare submerge start position and aspirate position and raise error if incompatible
        submerge_start_location = location_from_position_reference_and_offset(
            self._target_location_and_well.well,
            submerge_properties.position_reference,
            submerge_properties.offset,
        )
        self._instrument.move_to(
            location=submerge_start_location,
            well_core=self._target_location_and_well.well,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
        )
        self._remove_air_gap(
            location=submerge_start_location,
            volume=air_gap_volume,
        )
        self._instrument.move_to(
            location=self._target_location_and_well.location,
            well_core=self._target_location_and_well.well,
            force_direct=True,
            minimum_z_height=None,
            speed=submerge_properties.speed,
        )
        if submerge_properties.delay.enabled:
            assert submerge_properties.delay.duration is not None
            self._instrument.delay(submerge_properties.delay.duration)

    def aspirate_and_wait(self, volume: float) -> None:
        """Aspirate according to aspirate properties and wait if enabled."""
        aspirate_props = self._transfer_properties.aspirate
        self._instrument.aspirate(
            location=self._target_location_and_well.location,
            well_core=None,
            volume=volume,
            rate=1,
            flow_rate=aspirate_props.flow_rate_by_volume.get_for_volume(volume),
            in_place=True,
            is_meniscus=None,  # TODO: update this once meniscus is implemented
        )
        delay_props = aspirate_props.delay
        if delay_props.enabled:
            # This would have been validated in the liquid class.
            # Assertion only for mypy purposes
            assert delay_props.duration is not None
            self._instrument.delay(delay_props.duration)

    def dispense_and_wait(self, volume: float, push_out: Optional[float]) -> None:
        """Dispense according to dispense properties and wait if enabled."""
        dispense_props = self._transfer_properties.dispense
        self._instrument.dispense(
            location=self._target_location_and_well.location,
            well_core=None,
            volume=volume,
            rate=1,
            flow_rate=dispense_props.flow_rate_by_volume.get_for_volume(volume),
            in_place=True,
            push_out=push_out,  # TODO: check if this should be 0 instead
            is_meniscus=None,
        )
        dispense_delay = dispense_props.delay
        if dispense_delay.enabled:
            assert dispense_delay.duration is not None
            self._instrument.delay(dispense_delay.duration)

    def mix(
        self,
        mix_properties: MixProperties,
        aspirate_data: MixAspDispData,
        dispense_data: MixAspDispData,
    ) -> None:
        """Execute mix steps.

        1. Use same flow rates and delays as aspirate and dispense
        2. Do [(aspirate + dispense) x repetitions] at the same position
        3. Do NOT push out at the end of dispense
        4. USE the delay property from aspirate & dispense during mix as well (flow rate and delay are coordinated with each other)
        5. Do not mix during consolidation
        NOTE: For most of our built-in definitions, we will keep _mix_ off because it is a very application specific thing.
        We should mention in our docs that users should adjust this property according to their application.
        """
        if not mix_properties.enabled:
            return
        # This would have been validated in the liquid class.
        # Assertion only for mypy purposes
        assert (
            mix_properties.repetitions is not None and mix_properties.volume is not None
        )
        for n in range(mix_properties.repetitions):
            self.aspirate_and_wait(volume=mix_properties.volume)
            # TODO: Update to doing a push out at the end of mix for a post-dispense mix
            self.dispense_and_wait(volume=mix_properties.volume, push_out=0)

    def pre_wet(
        self,
        enabled: bool,
        volume: float,
        aspirate_data: MixAspDispData,
        dispense_data: MixAspDispData,
    ) -> None:
        """Do a pre-wet.

        - 1 combo of aspirate + dispense at the same flow rate as specified in asp & disp and the delays in asp & disp
        - Use the target volume/ volume we will be aspirating
        - No push out
        - Not pre-wet for consolidation
        """
        if not enabled:
            return
        mix_props = MixProperties(_enabled=True, _repetitions=1, _volume=volume)
        self.mix(
            mix_properties=mix_props,
            aspirate_data=aspirate_data,
            dispense_data=dispense_data,
        )

    def retract_after_aspiration(self, air_gap_volume: float) -> None:
        """Execute post-aspiration retraction steps.

        1. Move TO the position reference+offset AT the specified speed
            Raise error if retract is below aspirate position or below the meniscus
        2. Delay
        3. Touch tip
            - Move to the Z offset position
            - Touch tip to the sides at the specified speed (tip moves back to the center as part of touch tip)
            - Return back to the retract position
        4. Air gap
            - Air gap volume depends on the amount of liquid in the pipette
            So if total aspirated volume is 20, use the value for airGapByVolume[20]
            Flow rate = min(aspirateFlowRate, (airGapByVolume)/sec)
            - Use post-aspirate delay
        """
        # TODO: Raise error if retract is below the meniscus
        retract_props = self._transfer_properties.aspirate.retract
        retract_location = location_from_position_reference_and_offset(
            self._target_location_and_well.well,
            retract_props.position_reference,
            retract_props.offset,
        )
        self._instrument.move_to(
            location=retract_location,
            well_core=self._target_location_and_well.well,
            force_direct=True,
            minimum_z_height=None,
            speed=retract_props.speed,
        )
        retract_delay = retract_props.delay
        if retract_delay.enabled:
            assert retract_delay.duration is not None
            self._instrument.delay(retract_delay.duration)
        touch_tip_props = retract_props.touch_tip
        if touch_tip_props.enabled:
            assert (
                touch_tip_props.speed is not None
                and touch_tip_props.z_offset is not None
                and touch_tip_props.mm_to_edge is not None
            )
            # TODO: update this once touch tip has mmToEdge
            self._instrument.touch_tip(
                location=self._target_location_and_well.location,
                well_core=self._target_location_and_well.well,
                radius=0,
                z_offset=touch_tip_props.z_offset,
                speed=touch_tip_props.speed,
            )
            self._instrument.move_to(
                location=retract_location,
                well_core=self._target_location_and_well.well,
                force_direct=True,
                minimum_z_height=None,
                # Full speed because assumption is that the tip will already be out of the liquid
                speed=None,
            )
        self._add_air_gap(volume=air_gap_volume)

    def _add_air_gap(self, volume: float) -> None:
        """Add an air gap."""
        aspirate_props = self._transfer_properties.aspirate
        # To err on the side of caution, the maximum flow rate should be air_gap_volume per second
        flow_rate = min(
            aspirate_props.flow_rate_by_volume.get_for_volume(volume), volume
        )
        self._instrument.air_gap_in_place(volume=volume, flow_rate=flow_rate)
        delay_props = aspirate_props.delay
        if delay_props.enabled:
            # This would have been validated in the liquid class.
            # Assertion only for mypy purposes
            assert delay_props.duration is not None
            self._instrument.delay(delay_props.duration)

    def _remove_air_gap(self, location: Location, volume: float) -> None:
        """Remove a previously added air gap."""
        dispense_props = self._transfer_properties.dispense
        # To err on the side of caution, the maximum flow rate should be air_gap_volume per second
        flow_rate = min(
            dispense_props.flow_rate_by_volume.get_for_volume(volume), volume
        )
        self._instrument.dispense(
            location=location,
            well_core=None,
            volume=volume,
            rate=1,
            flow_rate=flow_rate,
            in_place=True,
            is_meniscus=None,
            push_out=0,
        )
        dispense_delay = dispense_props.delay
        if dispense_delay.enabled:
            assert dispense_delay.duration is not None
            self._instrument.delay(dispense_delay.duration)

    def retract_after_dispensing(self) -> None:
        """Execute post-dispense retraction steps.

        1. Position ref+offset is the ending position. Move to this position using specified speed
        2. If blowout is enabled and “destination”
            - Do blow-out (at the retract position)
            - Leave plunger down
        3. Touch-tip
        4. If not ready-to-aspirate
            - Prepare-to-aspirate (at the retract position)
        5. Air-gap (at the retract position)
            - This air gap is for preventing any stray droplets from falling while moving the pipette.
                It will be performed out of caution even if we just did a blow_out and should *hypothetically*
                have no liquid left in the tip.
            - This air gap will be removed at the next aspirate.
                If this is the last step of the transfer, and we aren't dropping the tip off,
                then the air gap will be left as is(?).
        6. If blowout is “source” or “trash”
            - Move to location (top of Well)
            - Do blow-out (top of well)
            - Do touch-tip (?????) (only if it’s in a non-trash location)
            - Prepare-to-aspirate (top of well)
            - Do air-gap (top of well)
        7. If drop tip, move to drop tip location, drop tip
        """


def location_from_position_reference_and_offset(
    well: WellCore,
    position_reference: PositionReference,
    offset: Coordinate,
) -> Location:
    """Get position in `Location` type, given the well, the position reference and offset."""
    match position_reference:
        case PositionReference.WELL_TOP:
            reference_point = well.get_top(0)
        case PositionReference.WELL_BOTTOM:
            reference_point = well.get_bottom(0)
        case PositionReference.WELL_CENTER:
            reference_point = well.get_center()
        case PositionReference.LIQUID_MENISCUS:
            raise NotImplementedError(
                "Liquid transfer using liquid-meniscus relative positioning is not yet implemented"
            )
        case _:
            raise ValueError(f"Unknown position reference {position_reference}")
    return Location(reference_point + Point(offset.x, offset.y, offset.z), labware=None)
