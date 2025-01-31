import logging
import functools

from typing import Any, Dict, Optional, Set, Tuple, Union, cast

from opentrons.types import Point

from opentrons_shared_data.pipette.pipette_definition import (
    PipetteConfigurations,
    PlungerPositions,
    MotorConfigurations,
    SupportedTipsDefinition,
    PickUpTipConfigurations,
    PressFitPickUpTipConfiguration,
    CamActionPickUpTipConfiguration,
    DropTipConfigurations,
    PlungerHomingConfigurations,
    PipetteNameType,
    PipetteModelVersionType,
    PipetteLiquidPropertiesDefinition,
    default_tip_for_liquid_class,
)
from opentrons_shared_data.errors.exceptions import (
    InvalidLiquidClassName,
    CommandPreconditionViolated,
    PythonException,
    InvalidInstrumentData,
)
from opentrons_shared_data.pipette.ul_per_mm import (
    calculate_ul_per_mm,
    PIPETTING_FUNCTION_FALLBACK_VERSION,
    PIPETTING_FUNCTION_LATEST_VERSION,
)
from ..instrument_abc import AbstractInstrument
from .instrument_calibration import (
    save_pipette_offset_calibration,
    load_pipette_offset,
    PipetteOffsetByPipetteMount,
)
from opentrons_shared_data.pipette.types import (
    UlPerMmAction,
    PipetteName,
    PipetteModel,
    Quirks,
    PipetteOEMType,
)
from opentrons_shared_data.pipette import (
    load_data as load_pipette_data,
    types as pip_types,
)
from opentrons.hardware_control.types import CriticalPoint, OT3Mount
from opentrons.hardware_control.errors import InvalidCriticalPoint
from opentrons.hardware_control import nozzle_manager

from opentrons.hardware_control.util import (
    pick_up_speed_by_configuration,
    pick_up_distance_by_configuration,
    pick_up_current_by_configuration,
    nominal_tip_overlap_dictionary_by_configuration,
)

mod_log = logging.getLogger(__name__)


class Pipette(AbstractInstrument[PipetteConfigurations]):
    """A class to gather and track pipette state and configs.

    This class should not touch hardware or call back out to the hardware
    control API. Its only purpose is to gather state.
    """

    DictType = Dict[str, Union[str, float, bool]]
    #: The type of this data class as a dict

    def __init__(
        self,
        config: PipetteConfigurations,
        pipette_offset_cal: PipetteOffsetByPipetteMount,
        pipette_id: Optional[str] = None,
        use_old_aspiration_functions: bool = False,
    ) -> None:
        self._config = config
        self._config_as_dict = config.model_dump()
        self._plunger_motor_current = config.plunger_motor_configurations
        self._pick_up_configurations = config.pick_up_tip_configurations
        self._plunger_homing_configurations = config.plunger_homing_configurations
        self._drop_configurations = config.drop_tip_configurations
        self._pipette_offset = pipette_offset_cal
        self._pipette_type = self._config.pipette_type
        self._pipette_version = self._config.version
        self._max_channels = self._config.channels
        self._backlash_distance = config.backlash_distance

        self._liquid_class_name = pip_types.LiquidClasses.default
        self._liquid_class = self._config.liquid_properties[self._liquid_class_name]

        oem = PipetteOEMType.get_oem_from_quirks(config.quirks)
        # TODO (lc 12-05-2022) figure out how we can safely deprecate "name" and "model"
        self._pipette_name = PipetteNameType(
            pipette_type=config.pipette_type,
            pipette_channels=config.channels,
            pipette_generation=config.display_category,
            oem_type=oem,
        )
        self._acting_as = self._pipette_name
        self._pipette_model = PipetteModelVersionType(
            pipette_type=config.pipette_type,
            pipette_channels=config.channels,
            pipette_version=config.version,
            oem_type=oem,
        )
        self._valid_nozzle_maps = load_pipette_data.load_valid_nozzle_maps(
            self._pipette_model.pipette_type,
            self._pipette_model.pipette_channels,
            self._pipette_model.pipette_version,
            self._pipette_model.oem_type,
        )
        self._nozzle_offset = self._config.nozzle_offset
        self._nozzle_manager = (
            nozzle_manager.NozzleConfigurationManager.build_from_config(
                self._config, self._valid_nozzle_maps
            )
        )
        self._current_volume = 0.0
        self._working_volume = float(self._liquid_class.max_volume)
        self._current_tip_length = 0.0
        self._has_tip_length: Optional[bool] = None
        self._current_tiprack_diameter = 0.0
        self._pipette_id = pipette_id
        self._log = mod_log.getChild(
            self._pipette_id if self._pipette_id else "<unknown>"
        )
        self._log.info(
            "loaded: {}, pipette offset: {}".format(
                self._pipette_model, self._pipette_offset.offset
            )
        )
        self.ready_to_aspirate = False

        self._active_tip_setting_name = default_tip_for_liquid_class(self._liquid_class)
        self._active_tip_settings = self._liquid_class.supported_tips[
            self._active_tip_setting_name
        ]
        self._fallback_tip_length = self._active_tip_settings.default_tip_length

        self._aspirate_flow_rate = (
            self._active_tip_settings.default_aspirate_flowrate.default
        )
        self._dispense_flow_rate = (
            self._active_tip_settings.default_dispense_flowrate.default
        )
        self._blow_out_flow_rate = (
            self._active_tip_settings.default_blowout_flowrate.default
        )
        self._flow_acceleration = self._active_tip_settings.default_flow_acceleration

        self._versioned_tip_overlap_dictionary = (
            self.get_nominal_tip_overlap_dictionary_by_configuration()
        )

        if use_old_aspiration_functions:
            self._pipetting_function_version = PIPETTING_FUNCTION_FALLBACK_VERSION
        else:
            self._pipetting_function_version = PIPETTING_FUNCTION_LATEST_VERSION

    @property
    def config(self) -> PipetteConfigurations:
        return self._config

    @property
    def liquid_class(self) -> PipetteLiquidPropertiesDefinition:
        return self._liquid_class

    @property
    def liquid_class_name(self) -> pip_types.LiquidClasses:
        return self._liquid_class_name

    @property
    def channels(self) -> pip_types.PipetteChannelType:
        return self._max_channels

    @property
    def backlash_distance(self) -> float:
        return self._backlash_distance

    @property
    def tip_overlap(self) -> Dict[str, Dict[str, float]]:
        return self._versioned_tip_overlap_dictionary

    @property
    def nozzle_offset(self) -> Point:
        return self._nozzle_manager.starting_nozzle_offset

    @property
    def nozzle_manager(self) -> nozzle_manager.NozzleConfigurationManager:
        return self._nozzle_manager

    @property
    def pipette_offset(self) -> PipetteOffsetByPipetteMount:
        return self._pipette_offset

    @property
    def plunger_positions(self) -> PlungerPositions:
        return self._config.plunger_positions_configurations[self._liquid_class_name]

    @property
    def plunger_motor_current(self) -> MotorConfigurations:
        return self._plunger_motor_current

    @property
    def pick_up_configurations(self) -> PickUpTipConfigurations:
        return self._pick_up_configurations

    @pick_up_configurations.setter
    def pick_up_configurations(self, pick_up_configs: PickUpTipConfigurations) -> None:
        self._pick_up_configurations = pick_up_configs

    @property
    def plunger_homing_configurations(self) -> PlungerHomingConfigurations:
        return self._plunger_homing_configurations

    @property
    def drop_configurations(self) -> DropTipConfigurations:
        return self._drop_configurations

    @property
    def active_tip_settings(self) -> SupportedTipsDefinition:
        return self._active_tip_settings

    @property
    def push_out_volume(self) -> float:
        return self._active_tip_settings.default_push_out_volume

    def is_high_speed_pipette(self) -> bool:
        return Quirks.highSpeed in self._config.quirks

    def act_as(self, name: PipetteName) -> None:
        """Reconfigure to act as ``name``. ``name`` must be either the
        actual name of the pipette, or a name in its back-compatibility
        config.
        """
        raise NotImplementedError(
            "Backwards compatibility is not supported at this time."
        )

    def update_config_item(self, elem_name: Dict[str, Any]) -> None:
        raise NotImplementedError("Update config is not supported at this time.")

    @property
    def acting_as(self) -> PipetteName:
        return cast(PipetteName, f"{self._acting_as}")

    def reload_configurations(self) -> None:
        self._config = load_pipette_data.load_definition(
            self._pipette_model.pipette_type,
            self._pipette_model.pipette_channels,
            self._pipette_model.pipette_version,
            self._pipette_model.oem_type,
        )
        self._config_as_dict = self._config.model_dump()

    def reset_state(self) -> None:
        self._current_volume = 0.0
        self._working_volume = float(self.liquid_class.max_volume)
        self._current_tip_length = 0.0
        self._has_tip_length = None
        self._current_tiprack_diameter = 0.0
        self.ready_to_aspirate = False
        #: True if ready to aspirate
        self.set_liquid_class_by_name("default")
        self.set_tip_type(default_tip_for_liquid_class(self._liquid_class))

        self._aspirate_flow_rate = (
            self._active_tip_settings.default_aspirate_flowrate.default
        )
        self._dispense_flow_rate = (
            self._active_tip_settings.default_dispense_flowrate.default
        )
        self._blow_out_flow_rate = (
            self._active_tip_settings.default_blowout_flowrate.default
        )
        self._flow_acceleration = self._active_tip_settings.default_flow_acceleration

        self._versioned_tip_overlap_dictionary = (
            self.get_nominal_tip_overlap_dictionary_by_configuration()
        )
        self._nozzle_manager = (
            nozzle_manager.NozzleConfigurationManager.build_from_config(
                self._config, self._valid_nozzle_maps
            )
        )

    def reset_pipette_offset(self, mount: OT3Mount, to_default: bool) -> None:
        """Reset the pipette offset to system defaults."""
        if to_default:
            self._pipette_offset = load_pipette_offset(pip_id=None, mount=mount)
        else:
            self._pipette_offset = load_pipette_offset(self._pipette_id, mount)

    def save_pipette_offset(
        self, mount: OT3Mount, offset: Point
    ) -> PipetteOffsetByPipetteMount:
        """Update the pipette offset to a new value."""
        save_pipette_offset_calibration(self._pipette_id, mount, offset)
        self._pipette_offset = load_pipette_offset(self._pipette_id, mount)
        return self._pipette_offset

    @property
    def name(self) -> PipetteName:
        return cast(PipetteName, f"{self._pipette_name}")

    @property
    def model(self) -> PipetteModel:
        return cast(PipetteModel, f"{self._pipette_model}")

    @property
    def pipette_type(self) -> pip_types.PipetteModelType:
        return self._pipette_type

    @property
    def pipette_id(self) -> Optional[str]:
        return self._pipette_id

    def critical_point(self, cp_override: Optional[CriticalPoint] = None) -> Point:
        """
        The vector from the pipette's origin to its critical point. The
        critical point for a pipette is the end of the nozzle if no tip is
        attached, or the end of the tip if a tip is attached.

        If `cp_override` is specified and valid - so is either
        :py:attr:`CriticalPoint.NOZZLE` or :py:attr:`CriticalPoint.TIP` when
        we have a tip, or :py:attr:`CriticalPoint.XY_CENTER` - the specified
        critical point will be used.
        """
        if cp_override in [
            CriticalPoint.GRIPPER_JAW_CENTER,
            CriticalPoint.GRIPPER_FRONT_CALIBRATION_PIN,
            CriticalPoint.GRIPPER_REAR_CALIBRATION_PIN,
        ]:
            raise InvalidCriticalPoint(cp_override.name, "pipette")

        instr = Point(*self._pipette_offset.offset)
        cp_with_tip_length = self._nozzle_manager.critical_point_with_tip_length(
            cp_override,
            self.current_tip_length if cp_override != CriticalPoint.NOZZLE else 0.0,
        )
        cp = cp_with_tip_length + instr

        if self._log.isEnabledFor(logging.DEBUG):
            info_str = "cp: {}{}: {} (from: ".format(
                cp_override, " (from override)" if cp_override else "", cp
            )
            info_str += "model offset: {} + instrument offset: {}".format(
                cp_with_tip_length, instr
            )
            info_str += " - tip_length: {}".format(self.current_tip_length)
            info_str += ")"
            self._log.debug(info_str)

        return cp

    @property
    def current_volume(self) -> float:
        """The amount of liquid currently aspirated"""
        return self._current_volume

    @property
    def current_tip_length(self) -> float:
        """The length of the current tip attached (0.0 if no tip)"""
        return self._current_tip_length

    @current_tip_length.setter
    def current_tip_length(self, tip_length: float) -> None:
        self._current_tip_length = tip_length
        self._has_tip_length = True

    @property
    def current_tiprack_diameter(self) -> float:
        """The diameter of the current tip rack (0.0 if no tip)"""
        return self._current_tiprack_diameter

    @current_tiprack_diameter.setter
    def current_tiprack_diameter(self, diameter: float) -> None:
        self._current_tiprack_diameter = diameter

    @property
    def aspirate_flow_rate(self) -> float:
        """Current active flow rate (not config value)"""
        return self._aspirate_flow_rate

    @aspirate_flow_rate.setter
    def aspirate_flow_rate(self, new_flow_rate: float) -> None:
        assert new_flow_rate > 0
        self._aspirate_flow_rate = new_flow_rate

    @property
    def dispense_flow_rate(self) -> float:
        """Current active flow rate (not config value)"""
        return self._dispense_flow_rate

    @dispense_flow_rate.setter
    def dispense_flow_rate(self, new_flow_rate: float) -> None:
        assert new_flow_rate > 0
        self._dispense_flow_rate = new_flow_rate

    @property
    def blow_out_flow_rate(self) -> float:
        """Current active flow rate (not config value)"""
        return self._blow_out_flow_rate

    @blow_out_flow_rate.setter
    def blow_out_flow_rate(self, new_flow_rate: float) -> None:
        assert new_flow_rate > 0
        self._blow_out_flow_rate = new_flow_rate

    @property
    def flow_acceleration(self) -> float:
        """Current active flow acceleration (not config value)"""
        return self._flow_acceleration

    @flow_acceleration.setter
    def flow_acceleration(self, new_flow_acceleration: float) -> None:
        assert new_flow_acceleration > 0
        self._flow_acceleration = new_flow_acceleration

    @property
    def aspirate_flow_rates_lookup(self) -> Dict[str, float]:
        return self._active_tip_settings.default_aspirate_flowrate.values_by_api_level

    @property
    def dispense_flow_rates_lookup(self) -> Dict[str, float]:
        return self._active_tip_settings.default_dispense_flowrate.values_by_api_level

    @property
    def blow_out_flow_rates_lookup(self) -> Dict[str, float]:
        return self._active_tip_settings.default_blowout_flowrate.values_by_api_level

    @property
    def working_volume(self) -> float:
        """The working volume of the pipette"""
        return self._working_volume

    @working_volume.setter
    def working_volume(self, tip_volume: float) -> None:
        """The working volume is the current tip max volume"""
        self.set_tip_type_by_volume(tip_volume)
        self._working_volume = min(tip_volume, self.liquid_class.max_volume)

    @property
    def minimum_volume(self) -> float:
        """The smallest controllable volume the pipette can handle in this liquid class."""
        return self.liquid_class.min_volume

    @property
    def available_volume(self) -> float:
        """The amount of liquid possible to aspirate"""
        return self.working_volume - self.current_volume

    def set_current_volume(self, new_volume: float) -> None:
        assert new_volume >= 0
        assert new_volume <= self.working_volume
        self._current_volume = new_volume

    def add_current_volume(self, volume_incr: float) -> None:
        assert self.ok_to_add_volume(volume_incr)
        self._current_volume += volume_incr

    def remove_current_volume(self, volume_incr: float) -> None:
        assert self._current_volume >= volume_incr
        self._current_volume -= volume_incr

    def ok_to_add_volume(self, volume_incr: float) -> bool:
        return self.current_volume + volume_incr <= self.working_volume

    def ok_to_push_out(self, push_out_dist_mm: float) -> bool:
        return push_out_dist_mm <= (
            self.plunger_positions.blow_out - self.plunger_positions.bottom
        )

    def update_nozzle_configuration(
        self,
        back_left_nozzle: str,
        front_right_nozzle: str,
        starting_nozzle: Optional[str] = None,
    ) -> None:
        """
        Update nozzle configuration manager.
        """
        self._nozzle_manager.update_nozzle_configuration(
            back_left_nozzle, front_right_nozzle, starting_nozzle
        )

    def reset_nozzle_configuration(self) -> None:
        """
        Reset nozzle configuration manager.
        """
        self._nozzle_manager.reset_to_default_configuration()

    def add_tip(self, tip_length: float) -> None:
        """
        Add a tip to the pipette for position tracking and validation
        (effectively updates the pipette's critical point)

        :param tip_length: a positive, non-zero float presenting the distance
            in Z from the end of the pipette nozzle to the end of the tip
        :return:
        """
        assert tip_length > 0.0, "tip_length must be greater than 0"
        assert not self.has_tip_length
        self._current_tip_length = tip_length
        self._has_tip_length = True

    def remove_tip(self) -> None:
        """
        Remove the tip from the pipette (effectively updates the pipette's
        critical point)
        """
        self._current_tip_length = 0.0
        self._has_tip_length = False

    @property
    def has_tip(self) -> bool:
        return self.has_tip_length

    @property
    def has_tip_length(self) -> bool:
        return self.current_tip_length > 0.0

    @property
    def tip_presence_check_dist_mm(self) -> float:
        return self._config.tip_presence_check_distance_mm

    @property
    def tip_presence_responses(self) -> int:
        # TODO: put this in shared-data
        return 2 if self.channels > 8 else 1

    # Cache max is chosen somewhat arbitrarily. With a float is input we don't
    # want this to unbounded.
    @functools.lru_cache(maxsize=100)
    def ul_per_mm(self, ul: float, action: UlPerMmAction) -> float:
        return calculate_ul_per_mm(
            ul,
            action,
            self._active_tip_settings,
            self._pipetting_function_version,
            self._config.shaft_ul_per_mm,
        )

    def __str__(self) -> str:
        return "{} current volume {}ul critical point: {} at {}".format(
            self._config.display_name,
            self.current_volume,
            "tip end" if self.has_tip_length else "nozzle end",
            0,
        )

    def __repr__(self) -> str:
        return "<{}: {} {}>".format(
            self.__class__.__name__, self._config.display_name, id(self)
        )

    def as_dict(self) -> "Pipette.DictType":
        # TODO (lc 12-05-2022) Kill this code ASAP
        self._config_as_dict.update(
            {
                "current_volume": self.current_volume,
                "available_volume": self.available_volume,
                "name": self.name,
                "model": self.model,
                "pipette_id": self.pipette_id,
                "has_tip": self.has_tip_length,
                "working_volume": self.working_volume,
                "aspirate_flow_rate": self.aspirate_flow_rate,
                "dispense_flow_rate": self.dispense_flow_rate,
                "blow_out_flow_rate": self.blow_out_flow_rate,
                "flow_acceleration": self.flow_acceleration,
                "default_aspirate_flow_rates": self.aspirate_flow_rates_lookup,
                "default_blow_out_flow_rates": self.blow_out_flow_rates_lookup,
                "default_dispense_flow_rates": self.dispense_flow_rates_lookup,
                "default_flow_acceleration": self.active_tip_settings.default_flow_acceleration,
                "tip_length": self.current_tip_length,
                "return_tip_height": self.active_tip_settings.default_return_tip_height,
                "tip_overlap": self.tip_overlap["v0"],
                "versioned_tip_overlap": self.tip_overlap,
                "back_compat_names": self._config.pipette_backcompat_names,
                "supported_tips": self.liquid_class.supported_tips,
                "shaft_ul_per_mm": self._config.shaft_ul_per_mm,
            }
        )
        return self._config_as_dict

    def set_liquid_class_by_name(self, class_name: str) -> None:
        """Change the currently active liquid class."""
        if self.current_volume > 0:
            raise CommandPreconditionViolated(
                "Cannot switch liquid classes when liquid is in the tip"
            )
        try:
            new_name = pip_types.LiquidClasses[class_name]
            if new_name == self._liquid_class_name:
                return
            new_class = self._config.liquid_properties[new_name]
        except KeyError:
            raise InvalidLiquidClassName(
                message=f"Liquid class {class_name} is not valid for {self._config.display_name}",
                detail={
                    "requested-class-name": class_name,
                    "pipette-model": str(self._pipette_model),
                },
            )
        if (
            self.has_tip_length
            and self._active_tip_setting_name not in new_class.supported_tips
        ):
            raise CommandPreconditionViolated(
                message=f"Requested liquid class {class_name} does not support the currently attached tip",
                detail={
                    "requested-class-name": class_name,
                    "current-tip": str(self._active_tip_setting_name),
                },
            )
        self._liquid_class_name = new_name
        self._liquid_class = new_class
        if not self.has_tip_length:
            new_tip_class = sorted(
                [tip for tip in self._liquid_class.supported_tips.keys()],
                key=lambda tt: tt.value,
            )[0]
        else:
            new_tip_class = self._active_tip_setting_name
        self.set_tip_type(new_tip_class)

        self.ready_to_aspirate = False

    def set_tip_type_by_volume(self, tip_volume: float) -> None:
        """Change the currently active tip type."""
        intified = float(int(tip_volume))
        try:
            new_name = pip_types.PipetteTipType(int(intified))
        except (ValueError, KeyError) as e:
            raise InvalidLiquidClassName(
                message=f"There is no configuration for tips of volume {intified} in liquid class {str(self._liquid_class_name)}",
                detail={
                    "current-liquid-class": str(self._liquid_class_name),
                    "requested-volume": str(intified),
                },
                wrapping=[PythonException(e)],
            ) from e
        self.set_tip_type(new_name)

    def set_tip_type(self, tip_type: pip_types.PipetteTipType) -> None:
        """Change the currently active tip by its exact type."""
        try:
            new_tips = self._liquid_class.supported_tips[tip_type]
        except KeyError as e:
            raise InvalidInstrumentData(
                message=f"There is no configuration for {tip_type.name} in the pick up tip configurations for a {self._config.display_name}",
                wrapping=[PythonException(e)],
            ) from e

        self._active_tip_setting_name = tip_type
        self._active_tip_settings = new_tips

        self._aspirate_flow_rate = (
            self._active_tip_settings.default_aspirate_flowrate.default
        )
        self._dispense_flow_rate = (
            self._active_tip_settings.default_dispense_flowrate.default
        )
        self._blow_out_flow_rate = (
            self._active_tip_settings.default_blowout_flowrate.default
        )
        self._flow_acceleration = self._active_tip_settings.default_flow_acceleration

        self._fallback_tip_length = self._active_tip_settings.default_tip_length
        self._versioned_tip_overlap_dictionary = (
            self.get_nominal_tip_overlap_dictionary_by_configuration()
        )
        self._working_volume = min(tip_type.value, self.liquid_class.max_volume)

    def get_pick_up_configuration(  # noqa: C901
        self,
    ) -> Union[CamActionPickUpTipConfiguration, PressFitPickUpTipConfiguration]:
        for config in (
            self._config.pick_up_tip_configurations.press_fit,
            self._config.pick_up_tip_configurations.cam_action,
        ):
            if not config:
                continue
            config_values = None
            try:
                config_values = config.configuration_by_nozzle_map[
                    self._nozzle_manager.current_configuration.valid_map_key
                ][self._active_tip_setting_name.name]
            except KeyError:
                try:
                    config_values = config.configuration_by_nozzle_map[
                        self._nozzle_manager.current_configuration.valid_map_key
                    ].get("default")
                    if config_values is None:
                        raise KeyError(
                            f"Default tip type configuration values do not exist for Nozzle Map {self._nozzle_manager.current_configuration.valid_map_key}."
                        )
                except KeyError:
                    # No valid key found for the approved nozzle map under this configuration - try the next
                    continue
            if config_values is not None:
                if isinstance(config, PressFitPickUpTipConfiguration) and all(
                    [
                        config_values.speed,
                        config_values.distance,
                        config_values.current,
                    ]
                ):
                    return config
                elif config_values.current is not None:
                    return config

        raise CommandPreconditionViolated(
            message="No valid pick up tip configuration values found in instrument definition.",
        )

    def get_pick_up_speed_by_configuration(
        self,
        config: Union[CamActionPickUpTipConfiguration, PressFitPickUpTipConfiguration],
    ) -> float:
        return pick_up_speed_by_configuration(
            config,
            self._nozzle_manager.current_configuration.valid_map_key,
            self._active_tip_setting_name,
        )

    def get_pick_up_distance_by_configuration(
        self,
        config: Union[CamActionPickUpTipConfiguration, PressFitPickUpTipConfiguration],
    ) -> float:
        return pick_up_distance_by_configuration(
            config,
            self._nozzle_manager.current_configuration.valid_map_key,
            self._active_tip_setting_name,
        )

    def get_pick_up_current_by_configuration(
        self,
        config: Union[CamActionPickUpTipConfiguration, PressFitPickUpTipConfiguration],
    ) -> float:
        return pick_up_current_by_configuration(
            config,
            self._nozzle_manager.current_configuration.valid_map_key,
            self._active_tip_setting_name,
        )

    def get_nominal_tip_overlap_dictionary_by_configuration(
        self,
    ) -> Dict[str, Dict[str, float]]:
        return nominal_tip_overlap_dictionary_by_configuration(
            self._config,
            self._nozzle_manager.current_configuration.valid_map_key,
            self._active_tip_setting_name,
        )


def _reload_and_check_skip(
    new_config: PipetteConfigurations,
    attached_instr: Pipette,
    pipette_offset: PipetteOffsetByPipetteMount,
    use_old_aspiration_functions: bool,
) -> Tuple[Pipette, bool]:
    # Once we have determined that the new and attached pipettes
    # are similar enough that we might skip, see if the configs
    # match closely enough.
    # Returns a pipette object and True if we may skip hw reconfig
    # TODO this can potentially be removed in a follow-up refactor.
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
        if changed.intersection("quirks"):
            # Something has changed that requires reconfig
            p = Pipette(
                new_config,
                pipette_offset,
                attached_instr._pipette_id,
                use_old_aspiration_functions,
            )
            p.act_as(attached_instr.acting_as)
            return p, False
        # Good to skip, just need to update calibration offset and update_info
        attached_instr._pipette_offset = pipette_offset
        return attached_instr, True


def load_from_config_and_check_skip(
    config: Optional[PipetteConfigurations],
    attached: Optional[Pipette],
    requested: Optional[PipetteName],
    serial: Optional[str],
    pipette_offset: PipetteOffsetByPipetteMount,
    use_old_aspiration_functions: bool,
) -> Tuple[Optional[Pipette], bool]:
    """
    Given the pipette config for an attached pipette (if any) freshly read
    from disk, and any attached instruments,

    - Compare the new and configured pipette configs
    - Load the new configs if they differ
    - Return a bool indicating whether hardware reconfiguration may be
      skipped
    """

    if not config and not attached:
        # nothing attached now, nothing used to be attached, nothing
        # to reconfigure
        return attached, True

    if config and attached:
        # something was attached and something is attached. are they
        # the same? we can tell by comparing serials
        if serial == attached.pipette_id:
            if requested:
                # if there is an explicit instrument request, in addition
                # to checking if the old and new responses are the same
                # we also have to make sure the old pipette is properly
                # configured to the request
                if requested == attached.acting_as:
                    # similar enough to check
                    return _reload_and_check_skip(
                        config,
                        attached,
                        pipette_offset,
                        use_old_aspiration_functions,
                    )
            else:
                # if there is no request, make sure that the old pipette
                # did not have backcompat applied
                if attached.acting_as == attached.name:
                    # similar enough to check
                    return _reload_and_check_skip(
                        config,
                        attached,
                        pipette_offset,
                        use_old_aspiration_functions,
                    )

    if config:
        return (
            Pipette(config, pipette_offset, serial, use_old_aspiration_functions),
            False,
        )
    else:
        return None, False
