import itertools
import warnings
import logging
import time

from opentrons import commands
from opentrons.containers import unpack_location
from opentrons.containers.placeable import (
    Container, Placeable, WellSeries
)
from opentrons.helpers import helpers
from opentrons.trackers import pose_tracker

log = logging.getLogger(__name__)


PLUNGER_POSITIONS = {
    'top': 18.5,
    'bottom': 2,
    'blow_out': 0,
    'drop_tip': -3.5
}

DROP_TIP_RELEASE_DISTANCE = 20

DEFAULT_ASPIRATE_SPEED = 5
DEFAULT_DISPENSE_SPEED = 10

DEFAULT_TIP_PRESS_MM = -10

DEFAULT_PLUNGE_CURRENT = 0.1

SHAKE_OFF_TIPS_SPEED = 50
SHAKE_OFF_TIPS_DISTANCE = 2


def _sleep(seconds):
    time.sleep(seconds)


class PipetteTip:
    def __init__(self, length):
        self.length = length


class Pipette:
    """
    Through this class you can can:

        * Handle liquids with :meth:`aspirate`, :meth:`dispense`,
          :meth:`mix`, and :meth:`blow_out`
        * Handle tips with :meth:`pick_up_tip`, :meth:`drop_tip`,
          and :meth:`return_tip`
        * Calibrate this pipette's plunger positions
        * Calibrate the position of each :any:`Container` on deck

    Here are the typical steps of using the Pipette:

        * Instantiate a pipette with a maximum volume (uL)
          and a mount (`left` or `right`)
        * Design your protocol through the pipette's liquid-handling commands

    Methods in this class include assertions where needed to ensure that any
    action that requires a tip must be preceeded by `pick_up_tip`. For example:
    `mix`, `transfer`, `aspirate`, `blow_out`, and `drop_tip`.

    Parameters
    ----------
    mount : str
        The axis of the pipette's actuator on the Opentrons robot
        ('left' or 'right')
    name : str
        Assigns the pipette a unique name for saving it's calibrations
    channels : int
        The number of channels on this pipette (Default: `1`)
    min_volume : int
        The smallest recommended uL volume for this pipette (Default: `0`)
    trash_container : Container
        Sets the default location :meth:`drop_tip()` will put tips
        (Default: `fixed-trash`)
    tip_racks : list
        A list of Containers for this Pipette to track tips when calling
        :meth:`pick_up_tip` (Default: [])
    aspirate_speed : int
        The speed (in mm/minute) the plunger will move while aspirating
        (Default: 300)
    dispense_speed : int
        The speed (in mm/minute) the plunger will move while dispensing
        (Default: 500)

    Returns
    -------

    A new instance of :class:`Pipette`.

    Examples
    --------
    >>> from opentrons import instruments, containers
    <opentrons.robot.robot.Robot object at ...>
    >>> p1000 = instruments.P10_Single(mount='left')
    >>> tip_rack_300ul = containers.load('GEB-tiprack-300ul', '2')
    >>> p200 = instruments.P300_Single(
    ...     mount='right',
    ...     tip_racks=[tip_rack_300ul])

    """

    def __init__(
            self,
            robot,
            model_offset=(0, 0, 0),
            mount=None,
            axis=None,
            mount_obj=None,
            name=None,
            channels=1,
            min_volume=0,
            max_volume=None,
            ul_per_mm=1000.0,  # if none is specified, make it incredibily big
            trash_container='',
            tip_racks=[],
            aspirate_speed=DEFAULT_ASPIRATE_SPEED,
            dispense_speed=DEFAULT_DISPENSE_SPEED,
            aspirate_flow_rate=None,
            dispense_flow_rate=None,
            fallback_tip_length=51.7):  # TODO (andy): move to tip-rack

        self.robot = robot

        # Uses information from axis to decide if a pipette is on the left
        # or right mount
        if axis:
            warnings.warn(
                "'axis' is deprecated, please use 'mount' in constructor"
            )

        if axis == 'a':
            mount = 'right'
        elif axis == 'b':
            mount = 'left'

        self.mount = mount
        self.channels = channels

        self.model_offset = model_offset

        self.tip_attached = False
        self.instrument_actuator = None
        self.instrument_mover = None

        if not name:
            name = self.__class__.__name__
        self.name = name

        if trash_container == '':
            trash_container = self.robot.fixed_trash

        if isinstance(trash_container, Container) and len(trash_container) > 0:
            trash_container = trash_container[0]

        self.trash_container = trash_container
        self.tip_racks = tip_racks
        self.starting_tip = None

        self.reset_tip_tracking()

        self.robot.add_instrument(self.mount, self)

        self.placeables = []
        self.previous_placeable = None
        self.current_volume = 0

        self.plunger_positions = PLUNGER_POSITIONS.copy()

        if max_volume:
            warnings.warn(
                "'max_volume' is deprecated, use `ul_per_mm` in constructor"
            )

        self.ul_per_mm = ul_per_mm
        self.min_volume = min_volume
        t = self._get_plunger_position('top')
        b = self._get_plunger_position('bottom')
        self.max_volume = (t - b) * self.ul_per_mm

        self._pick_up_current = None
        self.set_pick_up_current(DEFAULT_PLUNGE_CURRENT)

        self.speeds = {}
        self.set_speed(aspirate=aspirate_speed, dispense=dispense_speed)

        self.set_flow_rate(
            aspirate=aspirate_flow_rate, dispense=dispense_flow_rate)

        # TODO (andy): remove from pipette, move to tip-rack
        self.robot.config.tip_length[self.name] = \
            self.robot.config.tip_length.get(self.name, fallback_tip_length)

    def reset(self):
        """
        Reset the state of this pipette, removing associated placeables,
        set current volume to zero, and reset tip tracking
        """
        self.tip_attached = False
        self.placeables = []
        self.previous_placeable = None
        self.current_volume = 0
        self.reset_tip_tracking()

    def has_tip_rack(self):
        """
        Returns True of this :any:`Pipette` was instantiated with tip_racks
        """
        return (self.tip_racks is not None and
                isinstance(self.tip_racks, list) and
                len(self.tip_racks) > 0)

    def reset_tip_tracking(self):
        """
        Resets the :any:`Pipette` tip tracking, "refilling" the tip racks
        """
        self.current_tip(None)
        self.tip_rack_iter = iter([])

        if self.has_tip_rack():
            iterables = self.tip_racks

            if self.channels > 1:
                iterables = [c for rack in self.tip_racks for c in rack.cols]
            else:
                iterables = [w for rack in self.tip_racks for w in rack]

            if self.starting_tip:
                iterables = iterables[iterables.index(self.starting_tip):]

            self.tip_rack_iter = itertools.chain(iterables)

    def current_tip(self, *args):
        # TODO(ahmed): revisit
        if len(args) and (isinstance(args[0], Placeable) or args[0] is None):
            self.current_tip_home_well = args[0]
        return self.current_tip_home_well

    def start_at_tip(self, _tip):
        if isinstance(_tip, Placeable):
            self.starting_tip = _tip
            self.reset_tip_tracking()

    def get_next_tip(self):
        next_tip = None
        if self.has_tip_rack():
            try:
                next_tip = next(self.tip_rack_iter)
            except StopIteration as e:
                raise RuntimeWarning(
                    '{0} has run out of tips'.format(self.name))
        else:
            self.robot.add_warning(
                'pick_up_tip called with no reference to a tip')
        return next_tip

    def _associate_placeable(self, location):
        if not location:
            return

        placeable, _ = unpack_location(location)
        self.previous_placeable = placeable
        if not self.placeables or (placeable != self.placeables[-1]):
            self.placeables.append(placeable)

    # Publishing this command provides a more granular picture of what the
    # robot is doing, but it makes the display to the user very noisy, so it
    # is currently ommitted
    # @commands.publish.both(command=commands.move_to)
    def move_to(self, location, strategy=None):
        """
        Move this :any:`Pipette` to a :any:`Placeable` on the :any:`Deck`

        Notes
        -----
        Until obstacle-avoidance algorithms are in place,
        :any:`Robot` and :any:`Pipette` :meth:`move_to` use either an
        "arc" or "direct"

        Parameters
        ----------
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The destination to arrive at

        strategy : "arc" or "direct"
            "arc" strategies (default) will pick the head up on Z axis, then
            over to the XY destination, then finally down to the Z destination.
            "direct" strategies will simply move in a straight line from
            the current position

        Returns
        -------

        This instance of :class:`Pipette`.
        """
        if not location:
            return self

        placeable, _ = unpack_location(location)

        if strategy is None:
            # if no strategy is specified, default to type 'arc'
            strategy = 'arc'
            # unless we are still within the same Well, then move directly
            if placeable == self.previous_placeable:
                strategy = 'direct'

        self._associate_placeable(placeable)
        self.robot.move_to(
            location,
            instrument=self,
            strategy=strategy)

        return self

    @commands.publish.both(command=commands.aspirate)
    def aspirate(self, volume=None, location=None, rate=1.0):
        """
        Aspirate a volume of liquid (in microliters) using this pipette
        from the specified location

        Notes
        -----
        If only a volume is passed, the pipette will aspirate
        from it's current position. If only a location is passed,
        `aspirate` will default to it's `max_volume`.

        The location may be a Well, or a specific position in relation to a
        Well, such as `Well.top()`. If a Well is specified without calling a
        a position method (such as .top or .bottom), this method will default
        to the bottom of the well.

        Parameters
        ----------
        volume : int or float
            The number of microliters to aspirate (Default: self.max_volume)

        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the aspirate.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`

        rate : float
            Set plunger speed for this aspirate, where
            speed = rate * aspirate_speed (see :meth:`set_speed`)

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'A1')
        >>> p300 = instruments.P300_Single(mount='left')

        >>> # aspirate 50uL from a Well
        >>> p300.aspirate(50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # aspirate 50uL from the center of a well
        >>> p300.aspirate(50, plate[1].bottom()) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # aspirate 20uL in place, twice as fast
        >>> p300.aspirate(20, rate=2.0) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # aspirate the pipette's remaining volume (80uL) from a Well
        >>> p300.aspirate(plate[2]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        """
        if not self.tip_attached:
            log.warning("Cannot aspirate without a tip attached.")

        # Note: volume positional argument may not be passed. if it isn't then
        # assume the first positional argument is the location
        if not helpers.is_number(volume):
            if volume and not location:
                location = volume
            volume = self.max_volume - self.current_volume

        # if volume is specified as 0uL, then do nothing
        if volume == 0:
            return self

        if self.current_volume + volume > self.max_volume:
            raise RuntimeWarning(
                'Pipette with max volume of {0} cannot hold volume {1}'
                .format(
                    self.max_volume,
                    self.current_volume + volume)
            )

        self._position_for_aspirate(location)

        mm_position = self._ul_to_plunger_position(
            self.current_volume + volume)
        speed = self.speeds['aspirate'] * rate

        self.instrument_actuator.push_speed()
        self.instrument_actuator.set_speed(speed)
        self.robot.poses = self.instrument_actuator.move(
            self.robot.poses,
            x=mm_position
        )
        self.instrument_actuator.pop_speed()
        self.current_volume += volume  # update after actual aspirate

        return self

    @commands.publish.both(command=commands.dispense)
    def dispense(self,
                 volume=None,
                 location=None,
                 rate=1.0):
        """
        Dispense a volume of liquid (in microliters/uL) using this pipette

        Notes
        -----
        If only a volume is passed, the pipette will dispense
        from it's current position. If only a location is passed,
        `dispense` will default to it's `current_volume`

        The location may be a Well, or a specific position in relation to a
        Well, such as `Well.top()`. If a Well is specified without calling a
        a position method (such as .top or .bottom), this method will default
        to the bottom of the well.

        Parameters
        ----------
        volume : int or float
            The number of microliters to dispense
            (Default: self.current_volume)
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the dispense.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`
        rate : float
            Set plunger speed for this dispense, where
            speed = rate * dispense_speed (see :meth:`set_speed`)

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'C1')
        >>> p300 = instruments.P300_Single(mount='left')
        >>> # fill the pipette with liquid (200uL)
        >>> p300.aspirate(plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # dispense 50uL to a Well
        >>> p300.dispense(50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # dispense 50uL to the center of a well
        >>> relative_vector = plate[1].center()
        >>> p300.dispense(50, (plate[1], relative_vector)) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # dispense 20uL in place, at half the speed
        >>> p300.dispense(20, rate=0.5) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # dispense the pipette's remaining volume (80uL) to a Well
        >>> p300.dispense(plate[2]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot dispense without a tip attached.")

        # Note: volume positional argument may not be passed. if it isn't then
        # assume the first positional argument is the location
        if not helpers.is_number(volume):
            if volume and not location:
                location = volume
            volume = self.current_volume

        # Ensure we don't dispense more than the current volume
        volume = min(self.current_volume, volume)

        # if volume is specified as 0uL, then do nothing
        if volume == 0:
            return self

        self._position_for_dispense(location)

        mm_position = self._ul_to_plunger_position(
            self.current_volume - volume)
        speed = self.speeds['dispense'] * rate

        self.instrument_actuator.push_speed()
        self.instrument_actuator.set_speed(speed)
        self.robot.poses = self.instrument_actuator.move(
            self.robot.poses,
            x=mm_position
        )
        self.instrument_actuator.pop_speed()
        self.current_volume -= volume  # update after actual dispense

        return self


    def _position_for_aspirate(self, location=None, clearance=1.0):
        """
        Position this :any:`Pipette` for an aspiration,
        given it's current state
        """

        placeable = None
        if location:
            placeable, _ = unpack_location(location)
            # go to top of source, if not already there
            if placeable != self.previous_placeable:
                self.move_to(placeable.top())
        else:
            placeable = self.previous_placeable

        # if pipette is currently empty, ensure the plunger is at "bottom"
        if self.current_volume == 0:
            pos, _, _ = pose_tracker.absolute(
                self.robot.poses, self.instrument_actuator)
            if pos != self._get_plunger_position('bottom'):
                # move to top of well to avoid touching liquid
                if placeable:
                    self.move_to(placeable.top())
                self.robot.poses = self.instrument_actuator.move(
                    self.robot.poses,
                    x=self._get_plunger_position('bottom')
                )

        # then go inside the location
        if location:
            if isinstance(location, Placeable):
                location = location.bottom(min(location.z_size(), clearance))
            self.move_to(location, strategy='direct')

<<<<<<< HEAD
    def _position_for_dispense(self, location=None, clearance=0.5):
        """
        Position this :any:`Pipette` for an dispense
        """
=======
    def _position_for_dispense(self, location=None):
        assert self.tip_attached
>>>>>>> Remove dead code, overly fragile tests, and clean up test code to use correct objects

        if location:
            if isinstance(location, Placeable):
                location = location.bottom(min(location.z_size(), clearance))
            self.move_to(location)

    def retract(self, safety_margin=10):
        '''
        Move the pipette's mount upwards and away from the deck

        Parameters
        ----------
        safety_margin: int
            Distance in millimeters awey from the limit switch,
            used during the mount's `fast_home()` method
        '''
        self.previous_placeable = None  # it is no longer inside a placeable
        self.robot.poses = self.instrument_mover.fast_home(
            self.robot.poses, safety_margin)
        return self

    @commands.publish.both(command=commands.mix)
    def mix(self,
            repetitions=1,
            volume=None,
            location=None,
            rate=1.0):
        """
        Mix a volume of liquid (in microliters/uL) using this pipette

        Notes
        -----
        If no `location` is passed, the pipette will mix
        from it's current position. If no `volume` is passed,
        `mix` will default to it's `max_volume`

        Parameters
        ----------
        repetitions: int
            How many times the pipette should mix (Default: 1)

        volume : int or float
            The number of microliters to mix (Default: self.max_volume)

        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the mix.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`

        rate : float
            Set plunger speed for this mix, where
            speed = rate * (aspirate_speed or dispense_speed)
            (see :meth:`set_speed`)

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'D1')

        >>> p300 = instruments.P300_Single(mount='left')

        >>> # mix 50uL in a Well, three times
        >>> p300.mix(3, 50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        >>> # mix 3x with the pipette's max volume, from current position
        >>> p300.mix(3) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot mix without a tip attached.")

        if volume is None:
            volume = self.max_volume

        if not location and self.previous_placeable:
            location = self.previous_placeable

        self.aspirate(location=location, volume=volume, rate=rate)
        for i in range(repetitions - 1):
            self.dispense(volume, rate=rate)
            self.aspirate(volume, rate=rate)
        self.dispense(volume, rate=rate)

        return self

    @commands.publish.both(command=commands.blow_out)
    def blow_out(self, location=None):
        """
        Force any remaining liquid to dispense, by moving
        this pipette's plunger to the calibrated `blow_out` position

        Notes
        -----
        If no `location` is passed, the pipette will blow_out
        from it's current position.

        Parameters
        ----------
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the blow_out.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import instruments
        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.aspirate(50).dispense().blow_out() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>

        """
        if not self.tip_attached:
            log.warning("Cannot 'blow out' without a tip attached.")

        self.move_to(location)
        self.robot.poses = self.instrument_actuator.move(
            self.robot.poses,
            x=self._get_plunger_position('blow_out')
        )
        self.current_volume = 0

        return self

    @commands.publish.both(command=commands.touch_tip)
    def touch_tip(self, location=None, radius=1.0):
        """
        Touch the :any:`Pipette` tip to the sides of a well,
        with the intent of removing left-over droplets

        Notes
        -----
        If no `location` is passed, the pipette will touch_tip
        from it's current position.

        Parameters
        ----------
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the touch_tip.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`

        radius : float
            Radius is a floating point number between 0.0 and 1.0, describing
            the percentage of a well's radius. When radius=1.0,
            :any:`touch_tip()` will move to 100% of the wells radius. When
            radius=0.5, :any:`touch_tip()` will move to 50% of the wells
            radius.

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'B2')

        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.aspirate(50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.dispense(plate[1]).touch_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot touch tip without a tip attached.")

        height_offset = 0

        if helpers.is_number(location):
            height_offset = location
            location = None

        # if no location specified, use the previously
        # associated placeable to get Well dimensions
        if location:
            self.move_to(location)
        else:
            location = self.previous_placeable

        v_offset = (0, 0, height_offset)

        well_edges = [
            location.from_center(x=radius, y=0, z=1),       # right edge
            location.from_center(x=radius * -1, y=0, z=1),  # left edge
            location.from_center(x=0, y=radius, z=1),       # back edge
            location.from_center(x=0, y=radius * -1, z=1)   # front edge
        ]

        # Apply vertical offset to well edges
        well_edges = map(lambda x: x + v_offset, well_edges)

        self.robot.gantry.push_speed()
        self.robot.gantry.set_speed(100)
        [self.move_to((location, e), strategy='direct') for e in well_edges]
        self.robot.gantry.pop_speed()

        return self

    @commands.publish.both(command=commands.air_gap)
    def air_gap(self, volume=None, height=None):
        """
        Pull air into the :any:`Pipette` current tip

        Notes
        -----
        If no `location` is passed, the pipette will touch_tip
        from it's current position.

        Parameters
        ----------
        volume : number
            The amount in uL to aspirate air into the tube.
            (Default will use all remaining volume in tip)

        height : number
            The number of millimiters to move above the current Placeable
            to perform and air-gap aspirate
            (Default will be 10mm above current Placeable)

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> p300 = instruments.P300_Single(mount='left')
        >>> plate = containers.load('96-flat', '2')
        >>> p300.aspirate(50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.air_gap(50) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot perform air_gap without a tip attached.")

        # if volumes is specified as 0uL, do nothing
        if volume is 0:
            return self

        if height is None:
            height = 5

        location = self.previous_placeable.top(height)
        # "move_to" separate from aspirate command
        # so "_position_for_aspirate" isn't executed
        self.move_to(location)
        self.aspirate(volume)
        return self

    @commands.publish.both(command=commands.return_tip)
    def return_tip(self, home_after=True):
        """
        Drop the pipette's current tip to it's originating tip rack

        Notes
        -----
        This method requires one or more tip-rack :any:`Container`
        to be in this Pipette's `tip_racks` list (see :any:`Pipette`)

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> tiprack = containers.load('tiprack-200ul', 'E1', share=True)
        >>> plate = containers.load('96-flat', '2')
        >>> p300 = instruments.P300_Single(mount='left',
        ...     tip_racks=[tiprack])
        >>> p300.pick_up_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.aspirate(50, plate[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.dispense(plate[1]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.return_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot return tip without tip attached.")

        if not self.current_tip():
            self.robot.add_warning(
                'Pipette has no tip to return, dropping in place')

        self.drop_tip(self.current_tip(), home_after=home_after)
        return self

    def pick_up_tip(self, location=None, presses=3, increment=1):
        """
        Pick up a tip for the Pipette to run liquid-handling commands with

        Notes
        -----
        A tip can be manually set by passing a `location`. If no location
        is passed, the Pipette will pick up the next available tip in
        it's `tip_racks` list (see :any:`Pipette`)

        Parameters
        ----------
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the pick_up_tip.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`
        presses : :any:int
            The number of times to lower and then raise the pipette when
            picking up a tip, to ensure a good seal (0 [zero] will result in
            the pipette hovering over the tip but not picking it up--generally
            not desireable, but could be used for dry-run)
        increment: :int
            The additional distance to travel on each successive press (e.g.:
            if presses=3 and increment=1, then the first press will travel down
            into the tip by 3.5mm, the second by 4.5mm, and the third by 5.5mm

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> tiprack = containers.load('tiprack-200ul', 'A2')
        >>> p300 = instruments.P300_Single(mount='left', tip_racks=[tiprack])
        >>> p300.pick_up_tip(tiprack[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.return_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> # `pick_up_tip` will automatically go to tiprack[1]
        >>> p300.pick_up_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.return_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if self.tip_attached:
            log.warning("There is already a tip attached to this pipette.")

        if not location:
            location = self.get_next_tip()
        self.current_tip(None)
        if location:
            placeable, _ = unpack_location(location)
            self.current_tip(placeable)

        presses = (1 if not helpers.is_number(presses) else presses)

        @commands.publish.both(command=commands.pick_up_tip)
        def _pick_up_tip(
                self, location, presses, plunge_depth, increment):
            self.robot.poses = self.instrument_actuator.move(
                self.robot.poses,
                x=self._get_plunger_position('bottom')
            )
            self.current_volume = 0
            self.move_to(self.current_tip().top(0))

            for i in range(int(presses)):
                # move nozzle down into the tip
                self.instrument_mover.push_speed()
                self.instrument_mover.push_current()
                self.instrument_mover.set_current(self._pick_up_current)
                self.instrument_mover.set_speed(30)
                dist = plunge_depth + (-1 * increment * i)
                self.move_to(
                    self.current_tip().top(dist),
                    strategy='direct')
                # move nozzle back up
                self.instrument_mover.pop_current()
                self.instrument_mover.pop_speed()
                self.move_to(
                    self.current_tip().top(0),
                    strategy='direct')
            self._add_tip(
                length=self._tip_length
            )
            self.previous_placeable = None  # no longer inside a placeable
            self.robot.poses = self.instrument_mover.fast_home(
                self.robot.poses, abs(plunge_depth))

            return self

        return _pick_up_tip(
            self,
            location=location,
            presses=presses,
            plunge_depth=DEFAULT_TIP_PRESS_MM,
            increment=increment)

    def drop_tip(self, location=None, home_after=True):
        """
        Drop the pipette's current tip

        Notes
        -----
        If no location is passed, the pipette defaults to its `trash_container`
        (see :any:`Pipette`)

        Parameters
        ----------
        location : :any:`Placeable` or tuple(:any:`Placeable`, :any:`Vector`)
            The :any:`Placeable` (:any:`Well`) to perform the drop_tip.
            Can also be a tuple with first item :any:`Placeable`,
            second item relative :any:`Vector`

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> tiprack = containers.load('tiprack-200ul', 'C2')
        >>> trash = containers.load('point', 'A3')
        >>> p300 = instruments.P300_Single(mount='left', trash_container=trash)
        >>> p300.pick_up_tip(tiprack[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> # drops the tip in the trash
        >>> p300.drop_tip() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> p300.pick_up_tip(tiprack[1]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        >>> # drops the tip back at its tip rack
        >>> p300.drop_tip(tiprack[1]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        if not self.tip_attached:
            log.warning("Cannot drop tip without a tip attached.")

        if not location and self.trash_container:
            location = self.trash_container

        if isinstance(location, Placeable):
            # give space for the drop-tip mechanism
            # @TODO (Laura & Andy 2018261)
            # When container typing is implemented, make sure that
            # when returning to a tiprack, tips are dropped within the rack
            if 'rack' in location.get_parent().get_type():
                half_tip_length = self._tip_length / 2
                location = location.top(-half_tip_length)
            elif 'trash' in location.get_parent().get_type():
                loc, coords = location.top()
                location = (loc, coords + (0, self.model_offset[1], 0))
            else:
                location = location.top()

        @commands.publish.both(command=commands.drop_tip)
        def _drop_tip(location, instrument=self):
            if location:
                self.move_to(location)

            pos_bottom = self._get_plunger_position('bottom')
            pos_drop_tip = self._get_plunger_position('drop_tip')

            self.robot.poses = self.instrument_actuator.move(
                self.robot.poses,
                x=pos_bottom
            )
            self.robot.poses = self.instrument_actuator.move(
                self.robot.poses,
                x=pos_drop_tip
            )

            self._shake_off_tips(location)

            if home_after:
                self._home_after_drop_tip()

            self.current_volume = 0
            self.current_tip(None)
            self._remove_tip(
                length=self._tip_length
            )

            return self
        return _drop_tip(location)

    def _shake_off_tips(self, location):
        # tips don't always fall off, especially if resting against
        # tiprack or other tips below it. To ensure the tip has fallen
        # first, shake the pipette to dislodge partially-sealed tips,
        # then second, raise the pipette so loosened tips have room to fall

        # shake the pipette left/right a few millimeters
        shake_off_distance = SHAKE_OFF_TIPS_DISTANCE
        if location:
            placeable, _ = unpack_location(location)
            # ensure the distance is not >25% the diameter of placeable
            shake_off_distance = min(
                shake_off_distance, placeable.x_size() / 4)
        self.robot.gantry.push_speed()
        self.robot.gantry.set_speed(SHAKE_OFF_TIPS_SPEED)
        self.robot.poses = self._jog(
            self.robot.poses, 'x', -shake_off_distance)  # move left
        self.robot.poses = self._jog(
            self.robot.poses, 'x', shake_off_distance * 2)  # move right
        self.robot.poses = self._jog(
            self.robot.poses, 'x', -shake_off_distance)  # move left
        self.robot.gantry.pop_speed()

        # raise the pipette upwards so we are sure tip has fallen off
        self.robot.poses = self._jog(
            self.robot.poses, 'z', DROP_TIP_RELEASE_DISTANCE)

    def _home_after_drop_tip(self):
        # incase plunger motor stalled while dropping a tip, add a
        # safety margin of the distance between `bottom` and `drop_tip`
        b = self._get_plunger_position('bottom')
        d = self._get_plunger_position('drop_tip')
        safety_margin = abs(b - d)
        self.robot.poses = self.instrument_actuator.fast_home(
            self.robot.poses, safety_margin)
        self.robot.poses = self.instrument_actuator.move(
            self.robot.poses,
            x=self._get_plunger_position('bottom')
        )

    def home(self):
        """
        Home the pipette's plunger axis during a protocol run

        Notes
        -----
        `Pipette.home()` homes the `Robot`

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import instruments
        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.home() # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        @commands.publish.both(command=commands.home)
        def _home(mount):
            self.current_volume = 0
            self.robot.poses = self.instrument_actuator.home(
                self.robot.poses)
            self.robot.poses = self.instrument_mover.home(self.robot.poses)
            self.previous_placeable = None  # no longer inside a placeable

        _home(self.mount)
        return self

    @commands.publish.both(command=commands.distribute)
    def distribute(self, volume, source, dest, *args, **kwargs):
        """
        Distribute will move a volume of liquid from a single of source
        to a list of target locations. See :any:`Transfer` for details
        and a full list of optional arguments.

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'B3')
        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.distribute(50, plate[1], plate.cols[0]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        # Note: currently it varies whether the pipette should have a tip on
        # or not depending on the parameters for this call, so we cannot
        # create a very reliable assertion on tip status

        args = [volume, source, dest, *args]
        kwargs['mode'] = 'distribute'
        kwargs['mix_after'] = (0, 0)
        if 'disposal_vol' not in kwargs:
            kwargs['disposal_vol'] = self.min_volume
        return self.transfer(*args, **kwargs)

    @commands.publish.both(command=commands.consolidate)
    def consolidate(self, volume, source, dest, *args, **kwargs):
        """
        Consolidate will move a volume of liquid from a list of sources
        to a single target location. See :any:`Transfer` for details
        and a full list of optional arguments.

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'A3')
        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.consolidate(50, plate.cols[0], plate[1]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """

        kwargs['mode'] = 'consolidate'
        kwargs['mix_before'] = (0, 0)
        kwargs['air_gap'] = 0
        kwargs['disposal_vol'] = 0
        args = [volume, source, dest, *args]
        return self.transfer(*args, **kwargs)

    @commands.publish.both(command=commands.transfer)
    def transfer(self, volume, source, dest, **kwargs):
        """
        Transfer will move a volume of liquid from a source location(s)
        to a dest location(s). It is a higher-level command, incorporating
        other :any:`Pipette` commands, like :any:`aspirate` and
        :any:`dispense`, designed to make protocol writing easier at the
        cost of specificity.

        Parameters
        ----------
        volumes : number, list, or tuple
            The amount of volume to remove from each `sources` :any:`Placeable`
            and add to each `targets` :any:`Placeable`. If `volumes` is a list,
            each volume will be used for the sources/targets at the
            matching index. If `volumes` is a tuple with two elements,
            like `(20, 100)`, then a list of volumes will be generated with
            a linear gradient between the two volumes in the tuple.

        source : Placeable or list
            Single :any:`Placeable` or list of :any:`Placeable`s, from where
            liquid will be :any:`aspirate`ed from.

        dest : Placeable or list
            Single :any:`Placeable` or list of :any:`Placeable`s, where
            liquid will be :any:`dispense`ed to.

        new_tip : number
            The number of clean tips this transfer command will use. If 0,
            no tips will be picked up nor dropped. If 1, a single tip will be
            used for all commands.

        trash : boolean
            If `False` (default behavior) tips will be returned to their
            tip rack. If `True` and a trash container has been attached
            to this `Pipette`, then the tip will be sent to the trash
            container.

        touch_tip : boolean
            If `True`, a :any:`touch_tip` will occur following each
            :any:`aspirate` and :any:`dispense`. If set to `False` (default),
            no :any:`touch_tip` will occur.

        blow_out : boolean
            If `True`, a :any:`blow_out` will occur following each
            :any:`dispense`, but only if the pipette has no liquid left in it.
            If set to `False` (default), no :any:`blow_out` will occur.

        mix_before : tuple
            Specify the number of repetitions volume to mix, and a :any:`mix`
            will proceed each :any:`aspirate` during the transfer and dispense.
            The tuple's values is interpreted as (repetitions, volume).

        mix_after : tuple
            Specify the number of repetitions volume to mix, and a :any:`mix`
            will following each :any:`dispense` during the transfer or
            consolidate. The tuple's values is interpreted as
            (repetitions, volume).

        carryover : boolean
            If `True` (default), any `volumes` that exceed the maximum volume
            of this `Pipette` will be split into multiple smaller volumes.

        repeat : boolean
            (Only applicable to :any:`distribute` and :any:`consolidate`)If
            `True` (default), sequential :any:`aspirate` volumes will be
            combined into one tip for the purpose of saving time. If `False`,
            all volumes will be transferred seperately.

        gradient : lambda
            Function for calculated the curve used for gradient volumes.
            When `volumes` is a tuple of length 2, it's values are used
            to create a list of gradient volumes. The default curve for
            this gradient is linear (lambda x: x), however a method can
            be passed with the `gradient` keyword argument to create a
            custom curve.

        Returns
        -------

        This instance of :class:`Pipette`.

        Examples
        --------
        ..
        >>> from opentrons import containers, instruments
        >>> plate = containers.load('96-flat', 'D1')
        >>> p300 = instruments.P300_Single(mount='left')
        >>> p300.transfer(50, plate[0], plate[1]) # doctest: +ELLIPSIS
        <opentrons.instruments.pipette.Pipette object at ...>
        """
        # Note: currently it varies whether the pipette should have a tip on
        # or not depending on the parameters for this call, so we cannot
        # create a very reliable assertion on tip status

        kwargs['mode'] = kwargs.get('mode', 'transfer')

        touch_tip = kwargs.get('touch_tip', False)
        if touch_tip is True:
            touch_tip = -1
        kwargs['touch_tip'] = touch_tip

        tip_options = {
            'once': 1,
            'never': 0,
            'always': float('inf')
        }
        tip_option = kwargs.get('new_tip', 'once')
        tips = tip_options.get(tip_option)
        if tips is None:
            raise ValueError('Unknown "new_tip" option: {}'.format(tip_option))

        plan = self._create_transfer_plan(volume, source, dest, **kwargs)
        self._run_transfer_plan(tips, plan, **kwargs)

        return self

    @commands.publish.both(command=commands.delay)
    def delay(self, seconds=0, minutes=0):
        """
        Parameters
        ----------

        seconds: float
            The number of seconds to freeze in place.
        """

        minutes += int(seconds / 60)
        seconds = seconds % 60
        seconds += float(minutes * 60)

        self.robot.pause()
        _sleep(seconds)
        self.robot.resume()

        return self

    def calibrate_plunger(
            self,
            top=None,
            bottom=None,
            blow_out=None,
            drop_tip=None):
        """Set calibration values for the pipette plunger.

        This can be called multiple times as the user sets each value,
        or you can set them all at once.

        Parameters
        ----------

        top : int
           Touching but not engaging the plunger.

        bottom: int
            Must be above the pipette's physical hard-stop, while still
            leaving enough room for 'blow_out'

        blow_out : int
            Plunger has been pushed down enough to expell all liquids.

        drop_tip : int
            This position that causes the tip to be released from the
            pipette.

        """
        if top is not None:
            self.plunger_positions['top'] = top
        if bottom is not None:
            self.plunger_positions['bottom'] = bottom
        if blow_out is not None:
            self.plunger_positions['blow_out'] = blow_out
        if drop_tip is not None:
            self.plunger_positions['drop_tip'] = drop_tip

        return self

    def _get_plunger_position(self, position):
        """
        Returns the calibrated coordinate of a given plunger position

        Raises exception if the position has not been calibrated yet
        """
        try:
            value = self.plunger_positions[position]
            if helpers.is_number(value):
                return value
            else:
                raise RuntimeError(
                    'Plunger position "{}" not yet calibrated'.format(
                        position))
        except KeyError:
            raise RuntimeError(
                'Plunger position "{}" does not exist'.format(
                    position))

    def _ul_to_mm(self, ul):
        """Calculate distance in millimeters to move for a given liquid volume.

        Calibration of the pipette motor's ul-to-mm conversion is required
        """

        millimeters = ul / self.ul_per_mm
        return round(millimeters, 3)

    def _ul_to_plunger_position(self, ul):
        """Calculate axis position for a given liquid volume.

        Translates the passed liquid volume to absolute coordinates
        on the axis associated with this pipette.

        Calibration of the pipette motor's ul-to-mm conversion is required
        """

        millimeters = self._ul_to_mm(ul)
        destination_mm = self._get_plunger_position('bottom') + millimeters
        return round(destination_mm, 3)

    def _volume_percentage(self, volume):
        """Returns the plunger percentage for a given volume.

        We use this to calculate what actual position the plunger axis
        needs to be at in order to achieve the correct volume of liquid.
        """
        if volume < 0:
            raise RuntimeError(
                "Volume must be a positive number, got {}.".format(volume))
        if volume > self.max_volume:
            raise RuntimeError(
                "{0}µl exceeds pipette's maximum volume ({1}ul).".format(
                    volume, self.max_volume))
        if volume < self.min_volume:
            self.robot.add_warning(
                "{0}µl is less than pipette's min_volume ({1}ul).".format(
                    volume, self.min_volume))

        return volume / self.max_volume

    def _create_transfer_plan(self, v, s, t, **kwargs):
        # SPECIAL CASE: if using multi-channel pipette,
        # and the source or target is a WellSeries
        # then avoid iterating through it's Wells.
        # Else, single channel pipettes will flatten a multi-dimensional
        # WellSeries into a 1 dimensional list of wells
        if self.channels > 1:
            if isinstance(s, WellSeries) and not isinstance(s[0], WellSeries):
                s = [s]
            if isinstance(t, WellSeries) and not isinstance(t[0], WellSeries):
                t = [t]
        else:
            if isinstance(s, WellSeries) and isinstance(s[0], WellSeries):
                s = [well for series in s for well in series]
            if isinstance(t, WellSeries) and isinstance(t[0], WellSeries):
                t = [well for series in t for well in series]

        # create list of volumes, sources, and targets of equal length
        s, t = helpers._create_source_target_lists(s, t, **kwargs)
        total_transfers = len(t)
        v = helpers._create_volume_list(v, total_transfers, **kwargs)

        transfer_plan = []
        for i in range(total_transfers):
            transfer_plan.append({
                'aspirate': {'location': s[i], 'volume': v[i]},
                'dispense': {'location': t[i], 'volume': v[i]}
            })

        max_vol = self.max_volume
        max_vol -= kwargs.get('air_gap', 0)  # air

        if kwargs.get('divide', True):
            transfer_plan = helpers._expand_for_carryover(
                max_vol, transfer_plan, **kwargs)

        transfer_plan = helpers._compress_for_repeater(
            max_vol, transfer_plan, **kwargs)

        return transfer_plan

    def _run_transfer_plan(self, tips, plan, **kwargs):
        air_gap = kwargs.get('air_gap', 0)
        touch_tip = kwargs.get('touch_tip', False)

        total_transfers = len(plan)
        for i, step in enumerate(plan):

            aspirate = step.get('aspirate')
            dispense = step.get('dispense')

            if aspirate:
                self._add_tip_during_transfer(tips, **kwargs)
                self._aspirate_during_transfer(
                    aspirate['volume'], aspirate['location'], **kwargs)

            if dispense:
                self._dispense_during_transfer(
                    dispense['volume'], dispense['location'], **kwargs)
                if step is plan[-1] or plan[i + 1].get('aspirate'):
                    self._blowout_during_transfer(
                        dispense['location'], **kwargs)
                    if touch_tip or touch_tip is 0:
                        self.touch_tip(touch_tip)
                    tips = self._drop_tip_during_transfer(
                        tips, i, total_transfers, **kwargs)
                else:
                    if air_gap:
                        self.air_gap(air_gap)
                    if touch_tip or touch_tip is 0:
                        self.touch_tip(touch_tip)

    def _add_tip_during_transfer(self, tips, **kwargs):
        """
        Performs a :any:`pick_up_tip` when running a :any:`transfer`,
        :any:`distribute`, or :any:`consolidate`.
        """
        if self.has_tip_rack() and tips > 0 and not self.current_tip():
            self.pick_up_tip()

    def _aspirate_during_transfer(self, vol, loc, **kwargs):
        """
        Performs an :any:`aspirate` when running a :any:`transfer`, and
        optionally a :any:`touch_tip` afterwards.
        """
        rate = kwargs.get('rate', 1)
        mix_before = kwargs.get('mix', kwargs.get('mix_before', (0, 0)))
        air_gap = kwargs.get('air_gap', 0)
        touch_tip = kwargs.get('touch_tip', False)

        well, _ = unpack_location(loc)

        if self.current_volume == 0:
            self._mix_during_transfer(mix_before, well, **kwargs)
        self.aspirate(vol, loc, rate=rate)
        if air_gap:
            self.air_gap(air_gap)
        if touch_tip or touch_tip is 0:
            self.touch_tip(touch_tip)

    def _dispense_during_transfer(self, vol, loc, **kwargs):
        """
        Performs a :any:`dispense` when running a :any:`transfer`, and
        optionally a :any:`mix`, :any:`touch_tip`, and/or
        :any:`blow_out` afterwards.
        """
        mix_after = kwargs.get('mix_after', (0, 0))
        rate = kwargs.get('rate', 1)
        air_gap = kwargs.get('air_gap', 0)

        well, _ = unpack_location(loc)

        if air_gap:
            self.dispense(air_gap, well.top(5), rate=rate)
        self.dispense(vol, loc, rate=rate)
        self._mix_during_transfer(mix_after, well, **kwargs)

    def _mix_during_transfer(self, mix, loc, **kwargs):
        if self.current_volume == 0 and isinstance(mix, (tuple, list)):
            if len(mix) == 2 and 0 not in mix:
                self.mix(mix[0], mix[1], loc)

    def _blowout_during_transfer(self, loc, **kwargs):
        blow_out = kwargs.get('blow_out', False)
        if self.current_volume > 0 or blow_out:
            if not isinstance(blow_out, Placeable):
                blow_out = self.trash_container
                if self.current_volume == 0:
                    blow_out = None
            self.blow_out(blow_out)
            self._mix_during_transfer(
                kwargs.get('mix_after', (0, 0)),
                loc,
                **kwargs)

    def _drop_tip_during_transfer(self, tips, i, total, **kwargs):
        """
        Performs a :any:`drop_tip` or :any:`return_tip` when
        running a :any:`transfer`, :any:`distribute`, or :any:`consolidate`.
        """
        trash = kwargs.get('trash', True)
        if tips > 1 or (i + 1 == total and tips > 0):
            if trash and self.trash_container:
                self.drop_tip()
            else:
                self.return_tip()
            tips -= 1
        return tips

    @property
    def _tip_length(self):
        # TODO (andy): tip length should be retrieved from tip-rack's labware
        # definition, unblocking ability to use multiple types of tips
        return self.robot.config.tip_length[self.name]

    def set_speed(self, aspirate=None, dispense=None):
        """
        Set the speed (mm/second) the :any:`Pipette` plunger will move
        during :meth:`aspirate` and :meth:`dispense`

        Parameters
        ----------
        aspirate: int
            The speed in millimeters-per-second, at which the plunger will
            move while performing an aspirate

        dispense: int
            The speed in millimeters-per-second, at which the plunger will
            move while performing an dispense
        """
        if aspirate:
            self.speeds['aspirate'] = aspirate
        if dispense:
            self.speeds['dispense'] = dispense
        return self

    def set_flow_rate(self, aspirate=None, dispense=None):
        """
        Set the speed (uL/second) the :any:`Pipette` plunger will move
        during :meth:`aspirate` and :meth:`dispense`

        Parameters
        ----------
        aspirate: int
            The speed in microliters-per-second, at which the plunger will
            move while performing an aspirate

        dispense: int
            The speed in microliters-per-second, at which the plunger will
            move while performing an dispense
        """
        if aspirate:
            self.set_speed(
                aspirate=self._ul_to_mm(aspirate))
        if dispense:
            self.set_speed(
                dispense=self._ul_to_mm(dispense))
        return self

    def set_pick_up_current(self, amperes):
        """
        Set the current (amperes) the pipette mount's motor will use while
        picking up a tip.

        Parameters
        ----------
        amperes: float (0.0 - 2.0)
            The amperage of the motor while creating a seal with tips.
        """
        if amperes >= 0 and amperes <= 2.0:
            self._pick_up_current = amperes
        else:
            raise ValueError(
                'Amperes must be a floating point between 0.0 and 2.0')
        return self

    def _move(self, pose_tree, x=None, y=None, z=None):
        current_x, current_y, current_z = pose_tracker.absolute(
            pose_tree,
            self)

        _x = current_x if x is None else x
        _y = current_y if y is None else y
        _z = current_z if z is None else z

        dx, dy, dz = pose_tracker.change_base(
            pose_tree,
            src=self,
            dst=self.mount)

        _x, _y, _z = _x - dx, _y - dy, _z - dz

        if x is not None or y is not None:
            pose_tree = self.robot.gantry.move(
                pose_tree,
                x=_x,
                y=_y)

        if z is not None:
            pose_tree = self.instrument_mover.move(
                pose_tree,
                z=_z)

        return pose_tree

    def _jog(self, pose_tree, axis, distance):
        assert axis in 'xyz', "Axis must be 'x', 'y', or 'z'"
        if axis in 'xy':
            pose_tree = self.robot.gantry.jog(pose_tree, axis, distance)
        elif axis == 'z':
            pose_tree = self.instrument_mover.jog(pose_tree, axis, distance)

        return pose_tree

    def _probe(self, pose_tree, axis, movement):
        assert axis in 'xyz', "Axis must be 'x', 'y', or 'z'"
        if axis in 'xy':
            pose_tree = self.robot.gantry.probe(pose_tree, axis, movement)
        elif axis == 'z':
            pose_tree = self.instrument_mover.probe(pose_tree, axis, movement)

        return pose_tree

    def _add_tip(self, length):
        if not self.tip_attached:
            x, y, z = pose_tracker.change_base(
                self.robot.poses,
                src=self,
                dst=self.mount)
            self.robot.poses = pose_tracker.update(
                self.robot.poses, self, pose_tracker.Point(
                    x, y, z - length))
            self.tip_attached = True

    def _remove_tip(self, length):
        if self.tip_attached:
            x, y, z = pose_tracker.change_base(
                self.robot.poses,
                src=self,
                dst=self.mount)
            self.robot.poses = pose_tracker.update(
                self.robot.poses, self, pose_tracker.Point(
                    x, y, z + length))
            self.tip_attached = False

    def _max_deck_height(self):
        mount_max_height = self.instrument_mover.axis_maximum(
            self.robot.poses, 'z')
        _, _, pipette_max_height = pose_tracker.change_base(
            self.robot.poses,
            src=self,
            dst=self.mount,
            point=(0, 0, mount_max_height))
        return pipette_max_height

    @property
    def type(self):
        return 'single' if self.channels == 1 else 'multi'
