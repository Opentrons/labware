from typing import NamedTuple, Union, Optional

from opentrons.types import (
    Mount,
    DeckLocation,
    Location,
    Point,
    AxisMapType,
    AxisType,
    StringAxisMap,
)
from opentrons.legacy_commands import publisher
from opentrons.hardware_control import SyncHardwareAPI
from opentrons.protocols.api_support.util import requires_version
from opentrons.protocols.api_support.types import APIVersion
from opentrons_shared_data.pipette.types import PipetteNameType

from . import validation
from .core.common import ProtocolCore, RobotCore
from .module_contexts import ModuleContext
from .labware import Labware
from ._types import PipetteActionTypes, PlungerPositionTypes


class HardwareManager(NamedTuple):
    """Back. compat. wrapper for a removed class called `HardwareManager`.

    This interface will not be present in PAPIv3.
    """

    hardware: SyncHardwareAPI


class RobotContext(publisher.CommandPublisher):
    """
    A context for the movement system of the robot.

    The RobotContext class provides the objects, attributes, and methods that allow
    you to control robot motor axes individually.

    Its methods can command the robot to perform an action, like moving to an absolute position,
    controlling the gripper jaw, or moving individual pipette motors.

    Objects in this class should not be instantiated directly. Instead, instances are
    returned by :py:meth:`ProtocolContext.robot`.

    .. versionadded:: 2.20

    """

    def __init__(
        self, core: RobotCore, protocol_core: ProtocolCore, api_version: APIVersion
    ) -> None:
        self._hardware = HardwareManager(hardware=protocol_core.get_hardware())
        self._core = core
        self._protocol_core = protocol_core
        self._api_version = api_version

    @property
    @requires_version(2, 22)
    def api_version(self) -> APIVersion:
        return self._api_version

    @property
    def hardware(self) -> HardwareManager:
        # TODO this hardware attribute should be deprecated
        # in version 3.0+ as we will only support exposed robot
        # context commands.
        return self._hardware

    @requires_version(2, 22)
    def move_to(
        self,
        mount: Union[Mount, str],
        destination: Location,
        speed: Optional[float] = None,
    ) -> None:
        """
        Move a specified mount to a destination location on the deck.

        :param mount: The mount of the instrument you wish to move.
                      This can either be an instance of :py:class:`.types.Mount` or one
                      of the strings ``"left"``, ``"right"``, ``"extension"``, ``"gripper"``. Note
                      that the gripper mount can be referred to either as ``"extension"`` or ``"gripper"``.
        :type mount: types.Mount or str
        :param Location destination:
        :param speed:
        """
        mount = validation.ensure_instrument_mount(mount)
        self._core.move_to(mount, destination.point, speed)

    @requires_version(2, 22)
    def move_axes_to(
        self,
        axis_map: Union[AxisMapType, StringAxisMap],
        critical_point: Optional[Union[AxisMapType, StringAxisMap]] = None,
        speed: Optional[float] = None,
    ) -> None:
        """
        Move a set of axes to an absolute position on the deck.

        :param axis_map: A dictionary mapping axes to an absolute position on the deck in mm.
        :param critical_point: The critical point to move the axes with. It should only
        specify the gantry axes (i.e. `x`, `y`, `z`).
        :param float speed: The maximum speed with which you want to move all the axes
        in the axis map.
        """
        instrument_on_left = self._core.get_pipette_type_from_engine(Mount.LEFT)
        is_96_channel = instrument_on_left == PipetteNameType.P1000_96
        axis_map = validation.ensure_axis_map_type(
            axis_map, self._protocol_core.robot_type, is_96_channel
        )
        if critical_point:
            critical_point = validation.ensure_axis_map_type(
                critical_point, self._protocol_core.robot_type, is_96_channel
            )
            validation.ensure_only_gantry_axis_map_type(
                critical_point, self._protocol_core.robot_type
            )
        else:
            critical_point = None
        self._core.move_axes_to(axis_map, critical_point, speed)

    @requires_version(2, 22)
    def move_axes_relative(
        self,
        axis_map: Union[AxisMapType, StringAxisMap],
        speed: Optional[float] = None,
    ) -> None:
        """
        Move a set of axes to a relative position on the deck.

        :param axis_map: A dictionary mapping axes to relative movements in mm.
        :type mount: types.Mount or str

        :param float speed: The maximum speed with which you want to move all the axes
        in the axis map.
        """
        instrument_on_left = self._core.get_pipette_type_from_engine(Mount.LEFT)
        is_96_channel = instrument_on_left == PipetteNameType.P1000_96

        axis_map = validation.ensure_axis_map_type(
            axis_map, self._protocol_core.robot_type, is_96_channel
        )
        self._core.move_axes_relative(axis_map, speed)

    def close_gripper_jaw(self, force: Optional[float] = None) -> None:
        """Command the gripper closed with some force."""
        self._core.close_gripper(force)

    def open_gripper_jaw(self) -> None:
        """Command the gripper open."""
        self._core.release_grip()

    def axis_coordinates_for(
        self,
        mount: Union[Mount, str],
        location: Union[Location, ModuleContext, DeckLocation],
    ) -> AxisMapType:
        """
        Build a :py:class:`.types.AxisMapType` from a location to be compatible with
        either :py:meth:`.RobotContext.move_axes_to` or :py:meth:`.RobotContext.move_axes_relative`.
        You must provide only one of `location`, `slot`, or `module` to build
        the axis map.

        :param mount: The mount of the instrument you wish create an axis map for.
                      This can either be an instance of :py:class:`.types.Mount` or one
                      of the strings ``"left"``, ``"right"``, ``"extension"``, ``"gripper"``. Note
                      that the gripper mount can be referred to either as ``"extension"`` or ``"gripper"``.
        :type mount: types.Mount or str
        :param location: The location to format an axis map for.
        :type location: `Well`, `ModuleContext`, `DeckLocation` or `OffDeckType`
        """
        mount = validation.ensure_instrument_mount(mount)

        mount_axis = AxisType.axis_for_mount(mount)
        if location:
            loc: Union[Point, Labware, None]
            if isinstance(location, ModuleContext):
                loc = location.labware
                if not loc:
                    raise ValueError(f"There must be a labware on {location}")
                top_of_labware = loc.wells()[0].top()
                loc = top_of_labware.point
                return {mount_axis: loc.z, AxisType.X: loc.x, AxisType.Y: loc.y}
            elif location is DeckLocation and not isinstance(location, Location):
                slot_name = validation.ensure_and_convert_deck_slot(
                    location,
                    api_version=self._api_version,
                    robot_type=self._protocol_core.robot_type,
                )
                loc = self._protocol_core.get_slot_center(slot_name)
                return {mount_axis: loc.z, AxisType.X: loc.x, AxisType.Y: loc.y}
            elif isinstance(location, Location):
                assert isinstance(location, Location)
                loc = location.point
                return {mount_axis: loc.z, AxisType.X: loc.x, AxisType.Y: loc.y}
            else:
                raise ValueError(
                    "Location parameter must be a Module, Deck Location, or Location type."
                )
        else:
            raise TypeError("You must specify a location to move to.")

    def plunger_coordinates_for_volume(
        self, mount: Union[Mount, str], volume: float, action: PipetteActionTypes
    ) -> AxisMapType:
        """
        Build a :py:class:`.types.AxisMapType` for a pipette plunger motor from volume.

        """
        pipette_name = self._core.get_pipette_type_from_engine(mount)
        if not pipette_name:
            raise ValueError(
                f"Expected a pipette to be attached to provided mount {mount}"
            )
        mount = validation.ensure_mount_for_pipette(mount, pipette_name)
        pipette_axis = AxisType.plunger_axis_for_mount(mount)

        pipette_position = self._core.get_plunger_position_from_volume(
            mount, volume, action, self._protocol_core.robot_type
        )
        return {pipette_axis: pipette_position}

    def plunger_coordinates_for_named_position(
        self, mount: Union[Mount, str], position_name: PlungerPositionTypes
    ) -> AxisMapType:
        """
        Build a :py:class:`.types.AxisMapType` for a pipette plunger motor from position_name.

        """
        pipette_name = self._core.get_pipette_type_from_engine(mount)
        if not pipette_name:
            raise ValueError(
                f"Expected a pipette to be attached to provided mount {mount}"
            )
        mount = validation.ensure_mount_for_pipette(mount, pipette_name)
        pipette_axis = AxisType.plunger_axis_for_mount(mount)
        pipette_position = self._core.get_plunger_position_from_name(
            mount, position_name
        )
        return {pipette_axis: pipette_position}

    def build_axis_map(self, axis_map: StringAxisMap) -> AxisMapType:
        """Take in a :py:class:`.types.StringAxisMap` and output a :py:class:`.types.AxisMapType`.
        A :py:class:`.types.StringAxisMap` is allowed to contain any of the following strings:
        ``"x"``, ``"y"``, "``z_l"``, "``z_r"``, "``z_g"``, ``"q"``.

        An example of a valid axis map could be:

        {"x": 1, "y": 2} or {"Z_L": 100}

        Note that capitalization does not matter.

        """
        instrument_on_left = self._core.get_pipette_type_from_engine(Mount.LEFT)
        is_96_channel = instrument_on_left == PipetteNameType.P1000_96

        return validation.ensure_axis_map_type(
            axis_map, self._protocol_core.robot_type, is_96_channel
        )
