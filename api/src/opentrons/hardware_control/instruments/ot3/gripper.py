from __future__ import annotations

""" Classes and functions for gripper state tracking
"""
import logging
from typing import Any, Optional, Set, Dict, Tuple, Final

from opentrons.types import Point
from opentrons.config import gripper_config
from opentrons.hardware_control.types import (
    GripperProbe,
    CriticalPoint,
    GripperJawState,
)
from opentrons.hardware_control.errors import (
    InvalidCriticalPoint,
)
from .instrument_calibration import (
    GripperCalibrationOffset,
    load_gripper_calibration_offset,
    save_gripper_calibration_offset,
)
from ..instrument_abc import AbstractInstrument
from opentrons.hardware_control.dev_types import AttachedGripper, GripperDict
from opentrons_shared_data.errors.exceptions import (
    CommandPreconditionViolated,
    MotionFailedError,
)

from opentrons_shared_data.gripper import (
    GripperDefinition,
    GripForceProfile,
    Geometry,
)

RECONFIG_KEYS = {"quirks", "grip_force_profile"}

MAX_ACCEPTABLE_JAW_DISPLACEMENT: Final = 20

mod_log = logging.getLogger(__name__)


class Gripper(AbstractInstrument[GripperDefinition]):
    """A class to gather and track gripper state and configs.

    This class should not touch hardware or call back out to the hardware
    control API. Its only purpose is to gather state.
    """

    def __init__(
        self,
        config: GripperDefinition,
        gripper_cal_offset: GripperCalibrationOffset,
        gripper_id: str,
        jaw_max_offset: Optional[float] = None,
    ) -> None:
        self._config = config
        self._model = config.model

        self._geometry = self._config.geometry
        base_offset = Point(*self._geometry.base_offset_from_mount)
        self._jaw_center_offset = (
            Point(*self._geometry.jaw_center_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the jaw center at home
        self._front_calibration_pin_offset = (
            Point(*self._geometry.pin_one_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the front calibration pin
        #: at home
        self._rear_calibration_pin_offset = (
            Point(*self._geometry.pin_two_offset_from_base) + base_offset
        )
        #: the distance between the gripper mount and the rear calibration pin
        #: at home
        self._calibration_offset = gripper_cal_offset
        #: The output value of calibration - the additional vector added into
        #: the critical point geometry based on gripper mount calibration
        self._gripper_id = gripper_id
        self._state = GripperJawState.UNHOMED
        self._current_jaw_displacement = 0.0
        self._attached_probe: Optional[GripperProbe] = None
        self._log = mod_log.getChild(self._gripper_id)
        self._log.info(
            f"loaded: {self._model}, gripper offset: {self._calibration_offset}"
        )
        self._jaw_max_offset = jaw_max_offset

    @property
    def grip_force_profile(self) -> GripForceProfile:
        return self._config.grip_force_profile

    @property
    def geometry(self) -> Geometry:
        return self._geometry

    @property
    def attached_probe(self) -> Optional[GripperProbe]:
        return self._attached_probe

    def add_probe(self, probe: GripperProbe) -> None:
        """This is used for finding the critical point during calibration."""
        assert not self.attached_probe
        self._attached_probe = probe

    def remove_probe(self) -> None:
        assert self.attached_probe
        self._attached_probe = None

    @property
    def max_allowed_grip_error(self) -> float:
        return self._geometry.max_allowed_grip_error

    @property
    def max_jaw_width(self) -> float:
        return self._config.geometry.jaw_width["max"] + (self._jaw_max_offset or 0)

    @property
    def min_jaw_width(self) -> float:
        return self._config.geometry.jaw_width["min"]

    @property
    def jaw_width(self) -> float:
        return self.max_jaw_width - (self.current_jaw_displacement * 2.0)

    @property
    def current_jaw_displacement(self) -> float:
        """The distance one side of the jaw has traveled from home."""
        return self._current_jaw_displacement

    @current_jaw_displacement.setter
    def current_jaw_displacement(self, mm: float) -> None:
        max_mm = self.max_jaw_displacement() + 2.0
        if mm > max_mm:
            self._log.warning(
                f"jaw displacement {round(mm, 1)} mm exceeds max expected value: "
                f"{max_mm} mm, setting value to max value instead."
            )
        self._current_jaw_displacement = min(mm, max_mm)

    @property
    def default_grip_force(self) -> float:
        return self.grip_force_profile.default_grip_force

    @property
    def default_idle_force(self) -> float:
        return self.grip_force_profile.default_idle_force

    @property
    def default_home_force(self) -> float:
        return self.grip_force_profile.default_home_force

    def max_jaw_displacement(self) -> float:
        geometry = self._config.geometry
        return (self.max_jaw_width - geometry.jaw_width["min"]) / 2

    @property
    def state(self) -> GripperJawState:
        return self._state

    @state.setter
    def state(self, s: GripperJawState) -> None:
        self._state = s

    @property
    def config(self) -> GripperDefinition:
        return self._config

    def update_config_item(self, elements: Dict[str, Any]) -> None:
        raise NotImplementedError("Update config is not supported at this time.")

    @property
    def model(self) -> str:
        return repr(self._model)

    @property
    def gripper_id(self) -> str:
        return self._gripper_id

    def reload_configurations(self) -> None:
        return None

    def update_jaw_open_position_from_closed_position(
        self, jaw_at_closed: float
    ) -> None:
        """Update the estimation of the jaw position at open based on reading it at closed.

        This is necessary because the gripper jaw has a well-defined positional hard stop
        when fully closed and empty but _not_ when open. The open position can vary unit to
        unit. You can calibrate this out by reading the position of the encoder when the jaw
        is closed, and then altering the logical open position so that it is whatever it needs
        to be for the logical closed position to be the same as the config.
        """
        jaw_min = self._config.geometry.jaw_width["min"]
        jaw_nominal_max = self._config.geometry.jaw_width["max"]
        if (
            abs((jaw_at_closed * 2) - (jaw_nominal_max - jaw_min))
            > MAX_ACCEPTABLE_JAW_DISPLACEMENT
        ):
            raise MotionFailedError(
                message="Gripper jaw calibration out of bounds",
                detail={
                    "type": "gripper-jaw-calibration-out-of-bounds",
                    "actual-displacement": str(jaw_at_closed * 2),
                    "nominal-displacement": str(jaw_nominal_max - jaw_min),
                },
            )

        self._jaw_max_offset = jaw_min - (jaw_nominal_max - (jaw_at_closed * 2))
        self._log.info(
            f"Gripper max jaw offset is now {self._jaw_max_offset} from input position {jaw_at_closed}"
        )

    @property
    def has_jaw_width_calibration(self) -> bool:
        return self._jaw_max_offset is not None

    def reset_offset(self, to_default: bool) -> None:
        """Tempoarily reset the gripper offsets to default values."""
        if to_default:
            self._calibration_offset = load_gripper_calibration_offset(gripper_id=None)
        else:
            self._calibration_offset = load_gripper_calibration_offset(
                gripper_id=self._gripper_id
            )

    def save_offset(self, delta: Point) -> GripperCalibrationOffset:
        """Save a new gripper offset."""
        save_gripper_calibration_offset(self.gripper_id, delta)
        self._calibration_offset = load_gripper_calibration_offset(self.gripper_id)
        return self._calibration_offset

    def check_calibration_pin_location_is_accurate(self) -> None:
        if not self.attached_probe:
            raise CommandPreconditionViolated(
                "Cannot calibrate gripper without attaching a calibration probe",
                detail={
                    "probe": str(self._attached_probe),
                    "jaw_state": str(self.state),
                },
            )
        if self.state != GripperJawState.GRIPPING:
            raise CommandPreconditionViolated(
                "Cannot calibrate gripper if jaw is not in gripping state",
                detail={
                    "probe": str(self._attached_probe),
                    "jaw_state": str(self.state),
                },
            )

    def critical_point(self, cp_override: Optional[CriticalPoint] = None) -> Point:
        """
        The vector from the gripper mount to the critical point, which is selectable
        between the center of the gripper engagement volume and the calibration pins.
        """
        if cp_override in [CriticalPoint.NOZZLE, CriticalPoint.TIP]:
            raise InvalidCriticalPoint(cp_override.name, "gripper")

        if not self._attached_probe:
            cp = cp_override or CriticalPoint.GRIPPER_JAW_CENTER
        else:
            if self._attached_probe is GripperProbe.REAR:
                cp = cp_override or CriticalPoint.GRIPPER_REAR_CALIBRATION_PIN
            else:
                cp = cp_override or CriticalPoint.GRIPPER_FRONT_CALIBRATION_PIN

        if cp in [CriticalPoint.GRIPPER_JAW_CENTER, CriticalPoint.XY_CENTER]:
            return self._jaw_center_offset + Point(*self._calibration_offset.offset)
        elif cp == CriticalPoint.GRIPPER_FRONT_CALIBRATION_PIN:
            self.check_calibration_pin_location_is_accurate()
            return (
                self._front_calibration_pin_offset
                + Point(*self._calibration_offset.offset)
                + Point(y=self.current_jaw_displacement)
                - Point(y=(self._jaw_max_offset or 0))
            )
        elif cp == CriticalPoint.GRIPPER_REAR_CALIBRATION_PIN:
            self.check_calibration_pin_location_is_accurate()
            return (
                self._rear_calibration_pin_offset
                + Point(*self._calibration_offset.offset)
                - Point(y=self.current_jaw_displacement)
                + Point(y=(self._jaw_max_offset or 0))
            )
        else:
            raise InvalidCriticalPoint(cp.name, "gripper")

    def duty_cycle_by_force(self, newton: float) -> float:
        return gripper_config.duty_cycle_by_force(newton, self.grip_force_profile)

    def __str__(self) -> str:
        return f"{self._config.display_name}"

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}: {self._config.display_name} {id(self)}"

    def as_dict(self) -> GripperDict:
        d: GripperDict = {
            "model": self._config.model,
            "gripper_id": self._gripper_id,
            "display_name": self._config.display_name,
            "state": self._state,
            "calibration_offset": self._calibration_offset,
        }
        return d


def _reload_gripper(
    new_config: GripperDefinition,
    attached_instr: Gripper,
    cal_offset: GripperCalibrationOffset,
) -> Tuple[Gripper, bool]:
    # Once we have determined that the new and attached grippers
    # are similar enough that we might skip, see if the configs
    # match closely enough.
    # Returns a gripper object
    if new_config == attached_instr.config:
        # Same config, good enough
        return attached_instr, True
    else:
        newdict = new_config.model_dump()
        olddict = attached_instr.config.model_dump()
        changed: Set[str] = set()
        for k in newdict.keys():
            if newdict[k] != olddict[k]:
                changed.add(k)
        if changed.intersection(RECONFIG_KEYS):
            # Something has changed that requires reconfig
            # we shoud recalibrate the jaw as well
            return (
                Gripper(
                    new_config,
                    cal_offset,
                    attached_instr._gripper_id,
                    None,
                ),
                False,
            )
        else:
            # update just the cal offset and update info
            attached_instr._calibration_offset = cal_offset
            return attached_instr, True


def compare_gripper_config_and_check_skip(
    freshly_detected: AttachedGripper,
    attached: Optional[Gripper],
    cal_offset: GripperCalibrationOffset,
) -> Tuple[Optional[Gripper], bool]:
    """
    Given the gripper config for an attached gripper (if any) freshly read
    from disk, and any attached instruments,

    - Compare the new and configured gripper configs
    - Load the new configs if they differ
    - Return a bool indicating whether hardware reconfiguration may be
      skipped
    """
    config = freshly_detected.get("config")
    serial = freshly_detected.get("id") or ""

    if not config and not attached:
        # nothing attached now, nothing used to be attached, nothing
        # to reconfigure
        return attached, True

    if config and attached:
        # something was attached and something is attached. are they
        # the same? we can tell by comparing serials
        if serial == attached.gripper_id:
            # similar enough to check
            return _reload_gripper(config, attached, cal_offset)

    if config:
        return Gripper(config, cal_offset, serial), False
    else:
        return None, False
