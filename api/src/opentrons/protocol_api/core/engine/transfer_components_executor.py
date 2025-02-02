"""Executor for liquid class based complex commands."""
from __future__ import annotations

from copy import deepcopy
from enum import Enum
from typing import TYPE_CHECKING, Optional, Union
from dataclasses import dataclass, field

from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    PositionReference,
    Coordinate,
    BlowoutLocation,
)

from opentrons.protocol_api._liquid_properties import (
    Submerge,
    TransferProperties,
    MixProperties,
)
from opentrons.protocol_engine.errors import TouchTipDisabledError
from opentrons.types import Location, Point

if TYPE_CHECKING:
    from .well import WellCore
    from .instrument import InstrumentCore
    from ... import TrashBin, WasteChute


@dataclass
class LiquidAndAirGapPair:
    """Pairing of a liquid and air gap in a tip, with air gap below the liquid in a tip."""

    liquid: float = 0
    air_gap: float = 0


@dataclass
class TipState:
    """Carrier of the state of the pipette tip in use.

    Properties:
        last_liquid_and_air_gap_in_tip: The last liquid + air_gap combo in the tip.
            This will only include the existing liquid and air gap in the tip that
            an aspirate/ dispense interacts with. For example, the air gap from
            a previous step that needs to be removed, or the liquid from a previous
            aspirate that needs to be dispensed or the liquid that needs to be added to
            during a consolidation.
        ready_to_aspirate: Whether the pipette plunger is in a position that allows
            correct aspiration. The starting state for the pipette at initialization of
            `TransferComponentsExecutor`s should be ready_to_aspirate == True.
    """

    ready_to_aspirate: bool = True
    # TODO: maybe use the tip contents from engine state instead.
    last_liquid_and_air_gap_in_tip: LiquidAndAirGapPair = field(
        default_factory=LiquidAndAirGapPair
    )

    def append_liquid(self, volume: float) -> None:
        # Neither aspirate nor a dispense process should be adding liquid
        # when there is an air gap present.
        assert (
            self.last_liquid_and_air_gap_in_tip.air_gap == 0
        ), "Air gap present in the tip."
        self.last_liquid_and_air_gap_in_tip.liquid += volume

    def delete_liquid(self, volume: float) -> None:
        # Neither aspirate nor a dispense process should be removing liquid
        # when there is an air gap present.
        assert (
            self.last_liquid_and_air_gap_in_tip.air_gap == 0
        ), "Air gap present in the tip."
        self.last_liquid_and_air_gap_in_tip.liquid -= volume

    def append_air_gap(self, volume: float) -> None:
        # Neither aspirate nor a dispense process should be adding air gaps
        # when there is already an air gap present.
        assert (
            self.last_liquid_and_air_gap_in_tip.air_gap == 0
        ), "Air gap already present in the tip."
        self.last_liquid_and_air_gap_in_tip.air_gap = volume

    def delete_air_gap(self, volume: float) -> None:
        assert (
            self.last_liquid_and_air_gap_in_tip.air_gap == volume
        ), "Last air gap volume doe not match the volume being removed"
        self.last_liquid_and_air_gap_in_tip.air_gap = 0


class TransferType(Enum):
    ONE_TO_ONE = "one_to_one"
    MANY_TO_ONE = "many_to_one"
    ONE_TO_MANY = "one_to_many"


class TransferComponentsExecutor:
    def __init__(
        self,
        instrument_core: InstrumentCore,
        transfer_properties: TransferProperties,
        target_location: Location,
        target_well: WellCore,
        tip_state: TipState,
        transfer_type: TransferType,
    ) -> None:
        self._instrument = instrument_core
        self._transfer_properties = transfer_properties
        self._target_location = target_location
        self._target_well = target_well
        self._tip_state: TipState = deepcopy(tip_state)  # don't modify caller's object
        self._transfer_type: TransferType = transfer_type

    @property
    def tip_state(self) -> TipState:
        """Return the tip state."""
        return self._tip_state

    def submerge(
        self,
        submerge_properties: Submerge,
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
        submerge_start_point = absolute_point_from_position_reference_and_offset(
            well=self._target_well,
            position_reference=submerge_properties.position_reference,
            offset=submerge_properties.offset,
        )
        submerge_start_location = Location(
            point=submerge_start_point, labware=self._target_location.labware
        )
        self._instrument.move_to(
            location=submerge_start_location,
            well_core=self._target_well,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
        )
        if self._transfer_type == TransferType.ONE_TO_ONE:
            self._remove_air_gap(location=submerge_start_location)
        self._instrument.move_to(
            location=self._target_location,
            well_core=self._target_well,
            force_direct=True,
            minimum_z_height=None,
            speed=submerge_properties.speed,
        )
        if submerge_properties.delay.enabled:
            assert submerge_properties.delay.duration is not None
            self._instrument.delay(submerge_properties.delay.duration)

    def aspirate_and_wait(self, volume: float) -> None:
        """Aspirate according to aspirate properties and wait if enabled."""
        # TODO: handle volume correction
        aspirate_props = self._transfer_properties.aspirate
        correction_volume = aspirate_props.correction_by_volume.get_for_volume(volume)
        self._instrument.aspirate(
            location=self._target_location,
            well_core=None,
            volume=volume,
            rate=1,
            flow_rate=aspirate_props.flow_rate_by_volume.get_for_volume(volume),
            in_place=True,
            is_meniscus=None,  # TODO: update this once meniscus is implemented
            correction_volume=correction_volume,
        )
        self._tip_state.append_liquid(volume)
        delay_props = aspirate_props.delay
        if delay_props.enabled:
            # Assertion only for mypy purposes
            assert delay_props.duration is not None
            self._instrument.delay(delay_props.duration)

    def dispense_and_wait(
        self, volume: float, push_out_override: Optional[float]
    ) -> None:
        """Dispense according to dispense properties and wait if enabled."""
        # TODO: handle volume correction
        dispense_props = self._transfer_properties.dispense
        correction_volume = dispense_props.correction_by_volume.get_for_volume(volume)
        self._instrument.dispense(
            location=self._target_location,
            well_core=None,
            volume=volume,
            rate=1,
            flow_rate=dispense_props.flow_rate_by_volume.get_for_volume(volume),
            in_place=True,
            push_out=push_out_override,
            is_meniscus=None,
            correction_volume=correction_volume,
        )
        if push_out_override:
            # If a push out was performed, we need to reset the plunger before we can aspirate again
            self._tip_state.ready_to_aspirate = False
        self._tip_state.delete_liquid(volume)
        dispense_delay = dispense_props.delay
        if dispense_delay.enabled:
            assert dispense_delay.duration is not None
            self._instrument.delay(dispense_delay.duration)

    def mix(self, mix_properties: MixProperties, last_dispense_push_out: bool) -> None:
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
        # Assertion only for mypy purposes
        assert (
            mix_properties.repetitions is not None and mix_properties.volume is not None
        )
        push_out_vol = (
            self._transfer_properties.dispense.push_out_by_volume.get_for_volume(
                mix_properties.volume
            )
        )
        for n in range(mix_properties.repetitions, 0, -1):
            self.aspirate_and_wait(volume=mix_properties.volume)
            self.dispense_and_wait(
                volume=mix_properties.volume,
                push_out_override=push_out_vol
                if last_dispense_push_out is True and n == 1
                else 0,
            )

    def pre_wet(
        self,
        volume: float,
    ) -> None:
        """Do a pre-wet.

        - 1 combo of aspirate + dispense at the same flow rate as specified in asp & disp and the delays in asp & disp
        - Use the target volume/ volume we will be aspirating
        - No push out
        - No pre-wet for consolidation
        """
        if not self._transfer_properties.aspirate.pre_wet:
            return
        mix_props = MixProperties(_enabled=True, _repetitions=1, _volume=volume)
        self.mix(mix_properties=mix_props, last_dispense_push_out=False)

    def retract_after_aspiration(self, volume: float) -> None:
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
        retract_point = absolute_point_from_position_reference_and_offset(
            well=self._target_well,
            position_reference=retract_props.position_reference,
            offset=retract_props.offset,
        )
        retract_location = Location(
            retract_point, labware=self._target_location.labware
        )
        self._instrument.move_to(
            location=retract_location,
            well_core=self._target_well,
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
                and touch_tip_props.mm_from_edge is not None
            )
            self._instrument.touch_tip(
                location=retract_location,
                well_core=self._target_well,
                radius=1,
                z_offset=touch_tip_props.z_offset,
                speed=touch_tip_props.speed,
                mm_from_edge=touch_tip_props.mm_from_edge,
            )
            self._instrument.move_to(
                location=retract_location,
                well_core=self._target_well,
                force_direct=True,
                minimum_z_height=None,
                # Full speed because the tip will already be out of the liquid
                speed=None,
            )
        self._add_air_gap(
            air_gap_volume=self._transfer_properties.aspirate.retract.air_gap_by_volume.get_for_volume(
                volume
            )
        )

    def retract_after_dispensing(
        self,
        trash_location: Union[Location, TrashBin, WasteChute],
        source_location: Optional[Location],
        source_well: Optional[WellCore],
        add_final_air_gap: bool,
    ) -> None:
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
        # TODO: Raise error if retract is below the meniscus

        retract_props = self._transfer_properties.dispense.retract
        retract_point = absolute_point_from_position_reference_and_offset(
            well=self._target_well,
            position_reference=retract_props.position_reference,
            offset=retract_props.offset,
        )
        retract_location = Location(
            retract_point, labware=self._target_location.labware
        )
        self._instrument.move_to(
            location=retract_location,
            well_core=self._target_well,
            force_direct=True,
            minimum_z_height=None,
            speed=retract_props.speed,
        )
        retract_delay = retract_props.delay
        if retract_delay.enabled:
            assert retract_delay.duration is not None
            self._instrument.delay(retract_delay.duration)

        blowout_props = retract_props.blowout
        if (
            blowout_props.enabled
            and blowout_props.location == BlowoutLocation.DESTINATION
        ):
            assert blowout_props.flow_rate is not None
            self._instrument.set_flow_rate(blow_out=blowout_props.flow_rate)
            self._instrument.blow_out(
                location=retract_location,
                well_core=None,
                in_place=True,
            )
            self._tip_state.ready_to_aspirate = False
        is_final_air_gap = (
            blowout_props.enabled
            and blowout_props.location == BlowoutLocation.DESTINATION
        ) or not blowout_props.enabled
        # Regardless of the blowout location, do touch tip and air gap
        # when leaving the dispense well. If this will be the final air gap, i.e,
        # we won't be moving to a Trash or a Source for Blowout after this air gap,
        # then skip the final air gap if we have been told to do so.
        self._do_touch_tip_and_air_gap(
            location=retract_location,
            well=self._target_well,
            skip_air_gap=True if is_final_air_gap and not add_final_air_gap else False,
        )

        if (
            blowout_props.enabled
            and blowout_props.location != BlowoutLocation.DESTINATION
        ):
            # TODO: no-op touch tip if touch tip is enabled and blowout is in trash/ reservoir/ any labware with touch-tip disabled
            assert blowout_props.flow_rate is not None
            self._instrument.set_flow_rate(blow_out=blowout_props.flow_rate)
            touch_tip_and_air_gap_location: Optional[Location]
            if blowout_props.location == BlowoutLocation.SOURCE:
                if source_location is None or source_well is None:
                    raise RuntimeError(
                        "Blowout location is 'source' but source location &/or well is not provided."
                    )
                # TODO: check if we should add a blowout location z-offset in liq class definition
                self._instrument.blow_out(
                    location=Location(
                        source_well.get_top(0), labware=source_location.labware
                    ),
                    well_core=source_well,
                    in_place=False,
                )
                touch_tip_and_air_gap_location = Location(
                    source_well.get_top(0), labware=source_location.labware
                )
                touch_tip_and_air_gap_well = source_well
            else:
                self._instrument.blow_out(
                    location=trash_location,
                    well_core=None,
                    in_place=False,
                )
                touch_tip_and_air_gap_location = (
                    trash_location if isinstance(trash_location, Location) else None
                )
                touch_tip_and_air_gap_well = (
                    # We have already established that trash location of `Location` type
                    # has its `labware` as `Well` type.
                    trash_location.labware.as_well()._core  # type: ignore[assignment]
                    if isinstance(trash_location, Location)
                    else None
                )
            last_air_gap = self._tip_state.last_liquid_and_air_gap_in_tip.air_gap
            self._tip_state.delete_air_gap(last_air_gap)
            self._tip_state.ready_to_aspirate = False
            # Do touch tip and air gap again after blowing out into source well or trash
            self._do_touch_tip_and_air_gap(
                location=touch_tip_and_air_gap_location,
                well=touch_tip_and_air_gap_well,
                skip_air_gap=not add_final_air_gap,
            )

    def _do_touch_tip_and_air_gap(
        self,
        location: Optional[Location],
        well: Optional[WellCore],
        skip_air_gap: bool,
    ) -> None:
        """Perform touch tip and air gap as part of post-dispense retract."""
        touch_tip_props = self._transfer_properties.dispense.retract.touch_tip
        if touch_tip_props.enabled:
            assert (
                touch_tip_props.speed is not None
                and touch_tip_props.z_offset is not None
                and touch_tip_props.mm_from_edge is not None
            )
            # TODO:, check that when blow out is a non-dest-well,
            #  whether the touch tip params from transfer props should be used for
            #  both dest-well touch tip and non-dest-well touch tip.
            if well is not None and location is not None:
                try:
                    self._instrument.touch_tip(
                        location=location,
                        well_core=well,
                        radius=1,
                        z_offset=touch_tip_props.z_offset,
                        speed=touch_tip_props.speed,
                        mm_from_edge=touch_tip_props.mm_from_edge,
                    )
                except TouchTipDisabledError:
                    # TODO: log a warning
                    pass

                # Move back to the 'retract' position
                self._instrument.move_to(
                    location=location,
                    well_core=well,
                    force_direct=True,
                    minimum_z_height=None,
                    # Full speed because the tip will already be out of the liquid
                    speed=None,
                )

        if self._transfer_type != TransferType.ONE_TO_MANY:
            # TODO: check if it is okay to just do `prepare_to_aspirate` unconditionally
            if not self._tip_state.ready_to_aspirate:
                self._instrument.prepare_to_aspirate()
                self._tip_state.ready_to_aspirate = True
            if not skip_air_gap:
                self._add_air_gap(
                    air_gap_volume=self._transfer_properties.aspirate.retract.air_gap_by_volume.get_for_volume(
                        0
                    )
                )

    def _add_air_gap(self, air_gap_volume: float) -> None:
        """Add an air gap."""
        if air_gap_volume == 0:
            return
        aspirate_props = self._transfer_properties.aspirate
        correction_volume = aspirate_props.correction_by_volume.get_for_volume(
            air_gap_volume
        )
        # The maximum flow rate should be air_gap_volume per second
        flow_rate = min(
            aspirate_props.flow_rate_by_volume.get_for_volume(air_gap_volume),
            air_gap_volume,
        )
        self._instrument.air_gap_in_place(
            volume=air_gap_volume,
            flow_rate=flow_rate,
            correction_volume=correction_volume,
        )
        delay_props = aspirate_props.delay
        if delay_props.enabled:
            # Assertion only for mypy purposes
            assert delay_props.duration is not None
            self._instrument.delay(delay_props.duration)
        self._tip_state.append_air_gap(air_gap_volume)

    def _remove_air_gap(self, location: Location) -> None:
        """Remove a previously added air gap."""
        last_air_gap = self._tip_state.last_liquid_and_air_gap_in_tip.air_gap
        if last_air_gap == 0:
            return

        dispense_props = self._transfer_properties.dispense
        correction_volume = dispense_props.correction_by_volume.get_for_volume(
            last_air_gap
        )
        # The maximum flow rate should be air_gap_volume per second
        flow_rate = min(
            dispense_props.flow_rate_by_volume.get_for_volume(last_air_gap),
            last_air_gap,
        )
        self._instrument.dispense(
            location=location,
            well_core=None,
            volume=last_air_gap,
            rate=1,
            flow_rate=flow_rate,
            in_place=True,
            is_meniscus=None,
            push_out=0,
            correction_volume=correction_volume,
        )
        self._tip_state.delete_air_gap(last_air_gap)
        dispense_delay = dispense_props.delay
        if dispense_delay.enabled:
            assert dispense_delay.duration is not None
            self._instrument.delay(dispense_delay.duration)


def absolute_point_from_position_reference_and_offset(
    well: WellCore,
    position_reference: PositionReference,
    offset: Coordinate,
) -> Point:
    """Return the absolute point, given the well, the position reference and offset."""
    match position_reference:
        case PositionReference.WELL_TOP:
            reference_point = well.get_top(0)
        case PositionReference.WELL_BOTTOM:
            reference_point = well.get_bottom(0)
        case PositionReference.WELL_CENTER:
            reference_point = well.get_center()
        case PositionReference.LIQUID_MENISCUS:
            raise NotImplementedError(
                "Liquid transfer using liquid-meniscus relative positioning"
                " is not yet implemented."
            )
        case _:
            raise ValueError(f"Unknown position reference {position_reference}")
    return reference_point + Point(offset.x, offset.y, offset.z)
