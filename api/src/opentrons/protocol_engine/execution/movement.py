"""Movement command handling."""
from __future__ import annotations

import logging
from typing import Optional, List, Union

from opentrons.types import Point, MountType, StagingSlotName
from opentrons.hardware_control import HardwareControlAPI
from opentrons_shared_data.errors.exceptions import PositionUnknownError
from opentrons.protocol_engine.errors import LocationIsStagingSlotError

from ..types import (
    WellLocation,
    LiquidHandlingWellLocation,
    DeckPoint,
    MovementAxis,
    MotorAxis,
    CurrentWell,
    AddressableOffsetVector,
)
from ..state.state import StateStore
from ..resources import ModelUtils
from .thermocycler_movement_flagger import ThermocyclerMovementFlagger
from .heater_shaker_movement_flagger import HeaterShakerMovementFlagger

from .gantry_mover import GantryMover


log = logging.getLogger(__name__)


class MovementHandler:
    """Implementation logic for gantry movement."""

    _state_store: StateStore
    _model_utils: ModelUtils

    def __init__(
        self,
        state_store: StateStore,
        hardware_api: HardwareControlAPI,
        gantry_mover: GantryMover,
        model_utils: Optional[ModelUtils] = None,
        thermocycler_movement_flagger: Optional[ThermocyclerMovementFlagger] = None,
        heater_shaker_movement_flagger: Optional[HeaterShakerMovementFlagger] = None,
    ) -> None:
        """Initialize a MovementHandler instance."""
        self._state_store = state_store
        self._model_utils = model_utils or ModelUtils()
        self._tc_movement_flagger = (
            thermocycler_movement_flagger
            or ThermocyclerMovementFlagger(
                state_store=self._state_store, hardware_api=hardware_api
            )
        )
        self._hs_movement_flagger = (
            heater_shaker_movement_flagger
            or HeaterShakerMovementFlagger(
                state_store=self._state_store, hardware_api=hardware_api
            )
        )
        self._hardware_api = hardware_api

        self._gantry_mover = gantry_mover

    async def move_to_well(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        well_location: Optional[Union[WellLocation, LiquidHandlingWellLocation]] = None,
        current_well: Optional[CurrentWell] = None,
        force_direct: bool = False,
        minimum_z_height: Optional[float] = None,
        speed: Optional[float] = None,
        operation_volume: Optional[float] = None,
    ) -> Point:
        """Move to a specific well."""
        self._state_store.labware.raise_if_labware_inaccessible_by_pipette(
            labware_id=labware_id
        )

        self._state_store.labware.raise_if_labware_has_labware_on_top(
            labware_id=labware_id
        )

        await self._tc_movement_flagger.raise_if_labware_in_non_open_thermocycler(
            labware_parent=self._state_store.labware.get_location(labware_id=labware_id)
        )

        # Check for presence of heater shakers on deck, and if planned
        # pipette movement is allowed
        hs_movement_restrictors = (
            self._state_store.modules.get_heater_shaker_movement_restrictors()
        )

        ancestor = self._state_store.geometry.get_ancestor_slot_name(labware_id)
        if isinstance(ancestor, StagingSlotName):
            raise LocationIsStagingSlotError(
                "Cannot move to well on labware in Staging Area Slot."
            )

        dest_slot_int = ancestor.as_int()

        self._hs_movement_flagger.raise_if_movement_restricted(
            hs_movement_restrictors=hs_movement_restrictors,
            destination_slot=dest_slot_int,
            is_multi_channel=(
                self._state_store.tips.get_pipette_channels(pipette_id) > 1
            ),
            destination_is_tip_rack=self._state_store.labware.is_tiprack(labware_id),
        )

        # get the pipette's mount and current critical point, if applicable
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id,
            current_location=current_well,
        )
        origin_cp = pipette_location.critical_point

        await self._gantry_mover.prepare_for_mount_movement(
            pipette_location.mount.to_hw_mount()
        )
        origin = await self._gantry_mover.get_position(pipette_id=pipette_id)
        max_travel_z = self._gantry_mover.get_max_travel_z(pipette_id=pipette_id)

        # calculate the movement's waypoints
        waypoints = self._state_store.motion.get_movement_waypoints_to_well(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
            origin=origin,
            origin_cp=origin_cp,
            max_travel_z=max_travel_z,
            current_well=current_well,
            force_direct=force_direct,
            minimum_z_height=minimum_z_height,
            operation_volume=operation_volume,
        )

        speed = self._state_store.pipettes.get_movement_speed(
            pipette_id=pipette_id, requested_speed=speed
        )

        final_point = await self._gantry_mover.move_to(
            pipette_id=pipette_id, waypoints=waypoints, speed=speed
        )

        return final_point

    async def move_mount_to(
        self, mount: MountType, destination: DeckPoint, speed: Optional[float] = None
    ) -> Point:
        """Move mount to a specific location on the deck."""
        hw_mount = mount.to_hw_mount()
        await self._gantry_mover.prepare_for_mount_movement(hw_mount)
        origin = await self._gantry_mover.get_position_from_mount(mount=hw_mount)
        max_travel_z = self._gantry_mover.get_max_travel_z_from_mount(mount=mount)

        # calculate the movement's waypoints
        waypoints = self._state_store.motion.get_movement_waypoints_to_coords(
            origin=origin,
            dest=Point(x=destination.x, y=destination.y, z=destination.z),
            max_travel_z=max_travel_z,
            direct=False,
            additional_min_travel_z=None,
        )

        # move through the waypoints
        final_point = await self._gantry_mover.move_mount_to(
            mount=hw_mount,
            waypoints=waypoints,
            speed=speed,
        )

        return final_point

    async def move_to_addressable_area(
        self,
        pipette_id: str,
        addressable_area_name: str,
        offset: AddressableOffsetVector,
        force_direct: bool = False,
        minimum_z_height: Optional[float] = None,
        speed: Optional[float] = None,
        stay_at_highest_possible_z: bool = False,
        ignore_tip_configuration: Optional[bool] = True,
        highest_possible_z_extra_offset: Optional[float] = None,
    ) -> Point:
        """Move to a specific addressable area."""
        # Check for presence of heater shakers on deck, and if planned
        # pipette movement is allowed
        hs_movement_restrictors = (
            self._state_store.modules.get_heater_shaker_movement_restrictors()
        )

        dest_slot_int = (
            self._state_store.addressable_areas.get_addressable_area_base_slot(
                addressable_area_name
            ).as_int()
        )

        self._hs_movement_flagger.raise_if_movement_restricted(
            hs_movement_restrictors=hs_movement_restrictors,
            destination_slot=dest_slot_int,
            is_multi_channel=(
                self._state_store.tips.get_pipette_channels(pipette_id) > 1
            ),
            destination_is_tip_rack=False,
        )

        # TODO(jbl 11-28-2023) check if addressable area is a deck slot, and if it is check if there are no labware
        #   or modules on top.

        # get the pipette's mount and current critical point, if applicable
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id,
            current_location=None,
        )
        origin_cp = pipette_location.critical_point

        await self._gantry_mover.prepare_for_mount_movement(
            pipette_location.mount.to_hw_mount()
        )
        origin = await self._gantry_mover.get_position(pipette_id=pipette_id)
        max_travel_z = self._gantry_mover.get_max_travel_z(pipette_id=pipette_id)

        # calculate the movement's waypoints
        waypoints = self._state_store.motion.get_movement_waypoints_to_addressable_area(
            addressable_area_name=addressable_area_name,
            offset=offset,
            origin=origin,
            origin_cp=origin_cp,
            max_travel_z=max_travel_z,
            force_direct=force_direct,
            minimum_z_height=minimum_z_height,
            stay_at_max_travel_z=stay_at_highest_possible_z,
            ignore_tip_configuration=ignore_tip_configuration,
            max_travel_z_extra_margin=highest_possible_z_extra_offset,
        )

        speed = self._state_store.pipettes.get_movement_speed(
            pipette_id=pipette_id, requested_speed=speed
        )

        final_point = await self._gantry_mover.move_to(
            pipette_id=pipette_id, waypoints=waypoints, speed=speed
        )

        return final_point

    async def move_relative(
        self,
        pipette_id: str,
        axis: MovementAxis,
        distance: float,
    ) -> Point:
        """Move a given pipette a relative amount in millimeters."""
        delta = Point(
            x=distance if axis == MovementAxis.X else 0,
            y=distance if axis == MovementAxis.Y else 0,
            z=distance if axis == MovementAxis.Z else 0,
        )

        speed = self._state_store.pipettes.get_movement_speed(pipette_id=pipette_id)

        point = await self._gantry_mover.move_relative(
            pipette_id=pipette_id,
            delta=delta,
            speed=speed,
        )

        return point

    async def move_to_coordinates(
        self,
        pipette_id: str,
        deck_coordinates: DeckPoint,
        direct: bool,
        additional_min_travel_z: Optional[float],
        speed: Optional[float] = None,
    ) -> Point:
        """Move pipette to a given deck coordinate."""
        # get the pipette's mount, if applicable
        pipette_location = self._state_store.motion.get_pipette_location(
            pipette_id=pipette_id
        )
        await self._gantry_mover.prepare_for_mount_movement(
            pipette_location.mount.to_hw_mount()
        )
        origin = await self._gantry_mover.get_position(pipette_id=pipette_id)
        max_travel_z = self._gantry_mover.get_max_travel_z(pipette_id=pipette_id)

        # calculate the movement's waypoints
        waypoints = self._state_store.motion.get_movement_waypoints_to_coords(
            origin=origin,
            dest=Point(
                x=deck_coordinates.x, y=deck_coordinates.y, z=deck_coordinates.z
            ),
            max_travel_z=max_travel_z,
            direct=direct,
            additional_min_travel_z=additional_min_travel_z,
        )

        speed = self._state_store.pipettes.get_movement_speed(
            pipette_id=pipette_id, requested_speed=speed
        )

        # move through the waypoints
        final_point = await self._gantry_mover.move_to(
            pipette_id=pipette_id,
            waypoints=waypoints,
            speed=speed,
        )

        return final_point

    async def home(self, axes: Optional[List[MotorAxis]]) -> None:
        """Send the requested axes to their "home" positions.

        If axes is `None`, will home all motors.
        """
        await self._gantry_mover.home(axes)

    async def retract_axis(self, axis: MotorAxis) -> None:
        """Retract the requested axis as close to its home positions as safely possible.

        For the OT2, the axis will retract to a safe distance from its limit switch,
        and then probe the limit switch to reach the home position.
        For the OT3, the axis will retract to its known home position.
        """
        await self._gantry_mover.retract_axis(axis)

    async def check_for_valid_position(self, mount: MountType) -> bool:
        """Check if any axes have an unknown position.

        Returns `True` if the mount position is known, or `False` if it is not known.
        """
        try:
            await self._hardware_api.gantry_position(
                mount=mount.to_hw_mount(), fail_on_not_homed=True
            )
        except PositionUnknownError:
            return False
        return True
