from __future__ import annotations
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Sequence,
    Union,
    Tuple,
    Mapping,
    NamedTuple,
    TYPE_CHECKING,
)
from math import isinf, isnan
from typing_extensions import TypeGuard

from opentrons_shared_data.labware.labware_definition import LabwareRole
from opentrons_shared_data.pipette.types import PipetteNameType
from opentrons_shared_data.robot.types import RobotType

from opentrons.protocols.api_support.types import APIVersion, ThermocyclerStep
from opentrons.protocols.api_support.util import APIVersionError
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocols.advanced_control.transfers.common import TransferTipPolicyV2
from opentrons.types import (
    Mount,
    DeckSlotName,
    StagingSlotName,
    Location,
    AxisType,
    AxisMapType,
    StringAxisMap,
)
from opentrons.hardware_control.modules.types import (
    ModuleModel,
    MagneticModuleModel,
    TemperatureModuleModel,
    ThermocyclerModuleModel,
    HeaterShakerModuleModel,
    MagneticBlockModel,
    AbsorbanceReaderModel,
)

from .disposal_locations import TrashBin, WasteChute

if TYPE_CHECKING:
    from .labware import Well


# The first APIVersion where Python protocols can specify deck labels like "D1" instead of "1".
_COORDINATE_DECK_LABEL_VERSION_GATE = APIVersion(2, 15)

# The first APIVersion where Python protocols can specify staging deck slots (e.g. "D4")
_STAGING_DECK_SLOT_VERSION_GATE = APIVersion(2, 16)

# The first APIVersion where Python protocols can load lids as stacks and treat them as attributes of a parent labware.
LID_STACK_VERSION_GATE = APIVersion(2, 23)

# Mapping of public Python Protocol API pipette load names
# to names used by the internal Opentrons system
_PIPETTE_NAMES_MAP = {
    "p10_single": PipetteNameType.P10_SINGLE,
    "p10_multi": PipetteNameType.P10_MULTI,
    "p20_single_gen2": PipetteNameType.P20_SINGLE_GEN2,
    "p20_multi_gen2": PipetteNameType.P20_MULTI_GEN2,
    "p50_single": PipetteNameType.P50_SINGLE,
    "p50_multi": PipetteNameType.P50_MULTI,
    "p300_single": PipetteNameType.P300_SINGLE,
    "p300_multi": PipetteNameType.P300_MULTI,
    "p300_single_gen2": PipetteNameType.P300_SINGLE_GEN2,
    "p300_multi_gen2": PipetteNameType.P300_MULTI_GEN2,
    "p1000_single": PipetteNameType.P1000_SINGLE,
    "p1000_single_gen2": PipetteNameType.P1000_SINGLE_GEN2,
    "flex_1channel_50": PipetteNameType.P50_SINGLE_FLEX,
    "flex_8channel_50": PipetteNameType.P50_MULTI_FLEX,
    "flex_1channel_1000": PipetteNameType.P1000_SINGLE_FLEX,
    "flex_8channel_1000": PipetteNameType.P1000_MULTI_FLEX,
    "flex_8channel_1000_em": PipetteNameType.P1000_MULTI_EM,
    "flex_96channel_1000": PipetteNameType.P1000_96,
    "flex_96channel_200": PipetteNameType.P200_96,
}


class InvalidPipetteMountError(ValueError):
    """An error raised when attempting to load pipettes on an invalid mount."""


class PipetteMountTypeError(TypeError):
    """An error raised when an invalid mount type is used for loading pipettes."""


class InstrumentMountTypeError(TypeError):
    """An error raised when an invalid mount type is used for any available instruments."""


class IncorrectAxisError(TypeError):
    """An error raised when an invalid axis key is provided in an axis map."""


class LabwareDefinitionIsNotAdapterError(ValueError):
    """An error raised when an adapter is attempted to be loaded as a labware."""


class LabwareDefinitionIsNotLabwareError(ValueError):
    """An error raised when a labware is not loaded using `load_labware`."""


class InvalidTrashBinLocationError(ValueError):
    """An error raised when attempting to load trash bins in invalid slots."""


class InvalidFixtureLocationError(ValueError):
    """An error raised when attempting to load a fixture in an invalid cutout."""


def ensure_mount_for_pipette(
    mount: Union[str, Mount, None], pipette: PipetteNameType
) -> Mount:
    """Ensure that an input value represents a valid mount, and is valid for the given pipette."""
    if pipette in [PipetteNameType.P1000_96, PipetteNameType.P200_96]:
        # Always validate the raw mount input, even if the pipette is a 96-channel and we're not going
        # to use the mount value.
        if mount is not None:
            _ensure_mount(mount)
        # Internal layers treat the 96-channel as being on the left mount.
        return Mount.LEFT
    else:
        if mount is None:
            raise InvalidPipetteMountError(
                f"You must specify a left or right mount to load {pipette.value}."
            )
        else:
            return _ensure_mount(mount)


def _ensure_mount(mount: Union[str, Mount]) -> Mount:
    """Ensure that an input value represents a valid Mount."""
    if mount in [Mount.EXTENSION, "extension"]:
        # This would cause existing protocols that might be iterating over mount types
        # for loading pipettes to raise an error because Mount now includes Extension mount.
        # For example, this would raise error-
        # ```
        #   for i, mount in enumerate(Mount):
        #       pipette[i] = ctx.load_instrument("p300_single", mount)
        # ```
        # But this is a very rare use case and none of the protocols in protocol library
        # or protocols seen/ built by support/ science/ apps engg do this so it might be
        # safe to raise this error now?
        raise InvalidPipetteMountError(
            f"Loading pipettes on {mount} is not allowed."
            f"Use the left or right mounts instead."
        )
    if isinstance(mount, Mount):
        return mount

    if isinstance(mount, str):
        try:
            return Mount[mount.upper()]
        except KeyError as e:
            raise InvalidPipetteMountError(
                "If mount is specified as a string, it must be 'left' or 'right';"
                f" instead, {mount} was given."
            ) from e

    raise PipetteMountTypeError(
        "Instrument mount should be 'left', 'right', or an opentrons.types.Mount;"
        f" instead, {mount} was given."
    )


def ensure_instrument_mount(mount: Union[str, Mount]) -> Mount:
    """Ensure that an input value represents a valid Mount for all instruments."""
    if isinstance(mount, Mount):
        return mount

    if isinstance(mount, str):
        if mount == "gripper":
            # TODO (lc 08-02-2024) We should decide on the user facing name for
            # the gripper mount axis.
            mount = "extension"
        try:
            return Mount[mount.upper()]
        except KeyError as e:
            raise InstrumentMountTypeError(
                "If mount is specified as a string, it must be 'left', 'right', 'gripper', or 'extension';"
                f" instead, {mount} was given."
            ) from e


def ensure_pipette_name(pipette_name: str) -> PipetteNameType:
    """Ensure that an input value represents a valid pipette name."""
    pipette_name = ensure_lowercase_name(pipette_name)

    try:
        return _PIPETTE_NAMES_MAP[pipette_name]
    except KeyError:
        raise ValueError(
            f"Cannot resolve {pipette_name} to pipette, must be given valid pipette name."
        ) from None


def _check_ot2_axis_type(
    robot_type: RobotType, axis_map_keys: Union[List[str], List[AxisType]]
) -> None:
    if robot_type == "OT-2 Standard" and isinstance(axis_map_keys[0], AxisType):
        if any(k not in AxisType.ot2_axes() for k in axis_map_keys):
            raise IncorrectAxisError(
                f"An OT-2 Robot only accepts the following axes {AxisType.ot2_axes()}"
            )
    if robot_type == "OT-2 Standard" and isinstance(axis_map_keys[0], str):
        if any(k.upper() not in [axis.value for axis in AxisType.ot2_axes()] for k in axis_map_keys):  # type: ignore [union-attr]
            raise IncorrectAxisError(
                f"An OT-2 Robot only accepts the following axes {AxisType.ot2_axes()}"
            )


def _check_96_channel_axis_type(
    is_96_channel: bool, axis_map_keys: Union[List[str], List[AxisType]]
) -> None:
    if is_96_channel and any(
        key_variation in axis_map_keys for key_variation in ["Z_R", "z_r", AxisType.Z_R]
    ):
        raise IncorrectAxisError(
            "A 96 channel is attached. You cannot move the `Z_R` mount."
        )
    if not is_96_channel and any(
        key_variation in axis_map_keys for key_variation in ["Q", "q", AxisType.Q]
    ):
        raise IncorrectAxisError(
            "A 96 channel is not attached. The clamp `Q` motor does not exist."
        )


def ensure_axis_map_type(
    axis_map: Union[AxisMapType, StringAxisMap],
    robot_type: RobotType,
    is_96_channel: bool = False,
) -> AxisMapType:
    """Ensure that the axis map provided is in the correct shape and contains the correct keys."""
    axis_map_keys: Union[List[str], List[AxisType]] = list(axis_map.keys())  # type: ignore
    key_type = set(type(k) for k in axis_map_keys)

    if len(key_type) > 1:
        raise IncorrectAxisError(
            "Please provide an `axis_map` with only string or only AxisType keys."
        )
    _check_ot2_axis_type(robot_type, axis_map_keys)
    _check_96_channel_axis_type(is_96_channel, axis_map_keys)

    if all(isinstance(k, AxisType) for k in axis_map_keys):
        return_map: AxisMapType = axis_map  # type: ignore
        return return_map
    try:
        return {AxisType[k.upper()]: v for k, v in axis_map.items()}  # type: ignore [union-attr]
    except KeyError as e:
        raise IncorrectAxisError(f"{e} is not a supported `AxisMapType`")


def ensure_only_gantry_axis_map_type(
    axis_map: AxisMapType, robot_type: RobotType
) -> None:
    """Ensure that the axis map provided is in the correct shape and matches the gantry axes for the robot."""
    if robot_type == "OT-2 Standard":
        if any(k not in AxisType.ot2_gantry_axes() for k in axis_map.keys()):
            raise IncorrectAxisError(
                f"A critical point only accepts OT-2 gantry axes which are {AxisType.ot2_gantry_axes()}"
            )
    else:
        if any(k not in AxisType.flex_gantry_axes() for k in axis_map.keys()):
            raise IncorrectAxisError(
                f"A critical point only accepts Flex gantry axes which are {AxisType.flex_gantry_axes()}"
            )


# TODO(jbl 11-17-2023) this function's original purpose was ensure a valid deck slot for a given robot type
#   With deck configuration, the shape of this should change to better represent it checking if a deck slot
#   (and maybe any addressable area) being valid for that deck configuration
def ensure_and_convert_deck_slot(
    deck_slot: Union[int, str], api_version: APIVersion, robot_type: RobotType
) -> Union[DeckSlotName, StagingSlotName]:
    """Ensure that a primitive value matches a named deck slot.

    Also, convert the deck slot to match the given `robot_type`.

    Params:
        deck_slot: The primitive value to validate. Valid values are like `5`, `"5"`, or `"C2"`.
        api_version: The Python Protocol API version whose rules to use to validate the value.
            Values like `"C2"` are only supported in newer versions.

    Raises:
        TypeError: If you provide something that's not an `int` or `str`.
        ValueError: If the value does not match a known deck slot.
        APIVersionError: If you provide a value like `"C2"`, but `api_version` is too old.

    Returns:
        A `DeckSlotName` appropriate for the given `robot_type`. For example, given `"5"`,
        this will return `DeckSlotName.SLOT_C2` on a Flex.
    """
    if not isinstance(deck_slot, (int, str)):
        raise TypeError(f"Deck slot must be a string or integer, but got {deck_slot}")

    if str(deck_slot).upper() in {"A4", "B4", "C4", "D4"}:
        if api_version < APIVersion(2, 16):
            raise APIVersionError(
                api_element="Using a staging deck slot",
                until_version=f"{_STAGING_DECK_SLOT_VERSION_GATE}",
                current_version=f"{api_version}",
            )
        # Don't need a try/except since we're already pre-validating this
        parsed_staging_slot = StagingSlotName.from_primitive(str(deck_slot))
        return parsed_staging_slot
    else:
        try:
            parsed_slot = DeckSlotName.from_primitive(deck_slot)
        except ValueError as e:
            raise ValueError(f"'{deck_slot}' is not a valid deck slot") from e
        is_ot2_style = parsed_slot.to_ot2_equivalent() == parsed_slot
        if not is_ot2_style and api_version < _COORDINATE_DECK_LABEL_VERSION_GATE:
            alternative = parsed_slot.to_ot2_equivalent().id
            raise APIVersionError(
                api_element=f"Specifying a deck slot like '{deck_slot}'",
                until_version=f"{_COORDINATE_DECK_LABEL_VERSION_GATE}",
                current_version=f"{api_version}",
                extra_message=f"Increase your protocol's apiLevel, or use slot '{alternative}' instead.",
            )

        return parsed_slot.to_equivalent_for_robot_type(robot_type)


def internal_slot_to_public_string(
    slot_name: Union[DeckSlotName, StagingSlotName], robot_type: RobotType
) -> str:
    """Convert an internal `DeckSlotName` to a user-facing Python Protocol API string.

    This normalizes the string to the robot type's native format, like "5" for OT-2s or "C2" for
    Flexes. This probably won't change anything because the internal `DeckSlotName` should already
    match the robot's native format, but it's nice to have an explicit interface barrier.
    """
    if isinstance(slot_name, DeckSlotName):
        return slot_name.to_equivalent_for_robot_type(robot_type).id
    else:
        # No need to convert staging slot names per robot type, since they only exist on Flex.
        return slot_name.id


def ensure_lowercase_name(name: str) -> str:
    """Ensure that a given name string is all lowercase."""
    if not isinstance(name, str):
        raise TypeError(f"Value must be a string, but got {name}")

    return name.lower()


def ensure_definition_is_adapter(definition: LabwareDefinition) -> None:
    """Ensure that one of the definition's allowed roles is `adapter`."""
    if LabwareRole.adapter not in definition.allowedRoles:
        raise LabwareDefinitionIsNotAdapterError(
            f"Labware {definition.parameters.loadName} is not an adapter."
        )


def ensure_definition_is_labware(definition: LabwareDefinition) -> None:
    """Ensure that one of the definition's allowed roles is `labware` or that that field is empty."""
    if definition.allowedRoles and LabwareRole.labware not in definition.allowedRoles:
        raise LabwareDefinitionIsNotLabwareError(
            f"Labware {definition.parameters.loadName} is not defined as a normal labware."
        )


def ensure_definition_is_lid(definition: LabwareDefinition) -> None:
    """Ensure that one of the definition's allowed roles is `lid` or that that field is empty."""
    if LabwareRole.lid not in definition.allowedRoles:
        raise LabwareDefinitionIsNotLabwareError(
            f"Labware {definition.parameters.loadName} is not a lid."
        )


def ensure_definition_is_not_lid_after_api_version(
    api_version: APIVersion, definition: LabwareDefinition
) -> None:
    """Ensure that one of the definition's allowed roles is not `lid` or that the API Version is below the release where lid loading was seperated."""
    if (
        LabwareRole.lid in definition.allowedRoles
        and api_version >= LID_STACK_VERSION_GATE
    ):
        raise APIVersionError(
            f"Labware Lids cannot be loaded like standard labware in Protocols written with an API version greater than {LID_STACK_VERSION_GATE}."
        )


_MODULE_ALIASES: Dict[str, ModuleModel] = {
    "magdeck": MagneticModuleModel.MAGNETIC_V1,
    "magnetic module": MagneticModuleModel.MAGNETIC_V1,
    "magnetic module gen2": MagneticModuleModel.MAGNETIC_V2,
    "tempdeck": TemperatureModuleModel.TEMPERATURE_V1,
    "temperature module": TemperatureModuleModel.TEMPERATURE_V1,
    "temperature module gen2": TemperatureModuleModel.TEMPERATURE_V2,
    "thermocycler": ThermocyclerModuleModel.THERMOCYCLER_V1,
    "thermocycler module": ThermocyclerModuleModel.THERMOCYCLER_V1,
    "thermocycler module gen2": ThermocyclerModuleModel.THERMOCYCLER_V2,
    # No alias for heater-shaker. Use heater-shaker model name for loading.
}

_MODULE_MODELS: Dict[str, ModuleModel] = {
    "magneticModuleV1": MagneticModuleModel.MAGNETIC_V1,
    "magneticModuleV2": MagneticModuleModel.MAGNETIC_V2,
    "temperatureModuleV1": TemperatureModuleModel.TEMPERATURE_V1,
    "temperatureModuleV2": TemperatureModuleModel.TEMPERATURE_V2,
    "thermocyclerModuleV1": ThermocyclerModuleModel.THERMOCYCLER_V1,
    "thermocyclerModuleV2": ThermocyclerModuleModel.THERMOCYCLER_V2,
    "heaterShakerModuleV1": HeaterShakerModuleModel.HEATER_SHAKER_V1,
    "magneticBlockV1": MagneticBlockModel.MAGNETIC_BLOCK_V1,
    "absorbanceReaderV1": AbsorbanceReaderModel.ABSORBANCE_READER_V1,
}


def ensure_module_model(load_name: str) -> ModuleModel:
    """Ensure that a requested module load name matches a known module model."""
    if not isinstance(load_name, str):
        raise TypeError(f"Module load name must be a string, but got {load_name}")

    model = _MODULE_ALIASES.get(load_name.lower()) or _MODULE_MODELS.get(load_name)

    if model is None:
        valid_names = '", "'.join(_MODULE_ALIASES.keys())
        valid_models = '", "'.join(_MODULE_MODELS.keys())
        raise ValueError(
            f"{load_name} is not a valid module load name.\n"
            f'Valid names (ignoring case): "{valid_names}"\n'
            f'You may also use their exact models: "{valid_models}"'
        )

    return model


def ensure_and_convert_trash_bin_location(
    deck_slot: Union[int, str], api_version: APIVersion, robot_type: RobotType
) -> str:
    """Ensure trash bin load location is valid.

    Also, convert the deck slot to a valid trash bin addressable area.
    """

    if robot_type == "OT-2 Standard":
        raise InvalidTrashBinLocationError("Cannot load trash on OT-2.")

    # map trash bin location to addressable area
    trash_bin_slots = [
        DeckSlotName(slot) for slot in ["A1", "B1", "C1", "D1", "A3", "B3", "C3", "D3"]
    ]
    trash_bin_addressable_areas = [
        "movableTrashA1",
        "movableTrashB1",
        "movableTrashC1",
        "movableTrashD1",
        "movableTrashA3",
        "movableTrashB3",
        "movableTrashC3",
        "movableTrashD3",
    ]
    map_trash_bin_addressable_area = {
        slot: addressable_area
        for slot, addressable_area in zip(trash_bin_slots, trash_bin_addressable_areas)
    }

    slot_name_ot3 = ensure_and_convert_deck_slot(deck_slot, api_version, robot_type)
    if not isinstance(slot_name_ot3, DeckSlotName):
        raise ValueError("Staging areas not permitted for trash bin.")
    if slot_name_ot3 not in trash_bin_slots:
        raise InvalidTrashBinLocationError(
            f"Invalid location for trash bin: {slot_name_ot3}.\n"
            f"Valid slots: Any slot in column 1 or 3."
        )

    return map_trash_bin_addressable_area[slot_name_ot3]


def ensure_hold_time_seconds(
    seconds: Optional[float], minutes: Optional[float]
) -> float:
    """Ensure that hold time is expressed in seconds."""
    if seconds is None:
        seconds = 0
    if minutes is not None:
        seconds += minutes * 60
    return seconds


def ensure_thermocycler_repetition_count(repetitions: int) -> int:
    """Ensure thermocycler repetitions is a positive integer."""
    if repetitions <= 0:
        raise ValueError("repetitions must be a positive integer")
    return repetitions


def ensure_thermocycler_profile_steps(
    steps: List[ThermocyclerStep],
) -> List[ThermocyclerStep]:
    """Ensure thermocycler steps are valid and hold time is expressed in seconds only."""
    validated_steps = []
    for step in steps:
        temperature = step.get("temperature")
        hold_mins = step.get("hold_time_minutes")
        hold_secs = step.get("hold_time_seconds")
        if temperature is None:
            raise ValueError("temperature must be defined for each step in cycle")
        if hold_mins is None and hold_secs is None:
            raise ValueError(
                "either hold_time_minutes or hold_time_seconds must be"
                "defined for each step in cycle"
            )
        validated_seconds = ensure_hold_time_seconds(hold_secs, hold_mins)
        validated_steps.append(
            ThermocyclerStep(
                temperature=temperature, hold_time_seconds=validated_seconds
            )
        )
    return validated_steps


def is_all_integers(items: Sequence[Any]) -> TypeGuard[Sequence[int]]:
    """Check that every item in a list is an integer."""
    return all(isinstance(i, int) for i in items)


def is_all_strings(items: Sequence[Any]) -> TypeGuard[Sequence[str]]:
    """Check that every item in a list is a string."""
    return all(isinstance(i, str) for i in items)


def ensure_valid_labware_offset_vector(
    offset: Mapping[str, float]
) -> Tuple[float, float, float]:
    if not isinstance(offset, dict):
        raise TypeError("Labware offset must be a dictionary.")

    try:
        offsets = (offset["x"], offset["y"], offset["z"])
    except KeyError:
        raise TypeError(
            "Labware offset vector is expected to be a dictionary with"
            " with floating point offset values for all 3 axes."
            " For example: {'x': 1.1, 'y': 2.2, 'z': 3.3}"
        )
    if not all(isinstance(v, (float, int)) for v in offsets):
        raise TypeError("Offset values should be a number (int or float).")
    return offsets


class WellTarget(NamedTuple):
    """A movement target that is a well."""

    well: Well
    location: Optional[Location]
    in_place: bool


class PointTarget(NamedTuple):
    """A movement to coordinates"""

    location: Location
    in_place: bool


class NoLocationError(ValueError):
    """Error representing that no location was supplied."""


class LocationTypeError(TypeError):
    """Error representing that the location supplied is of different expected type."""


ValidTarget = Union[WellTarget, PointTarget, TrashBin, WasteChute]


def validate_location(
    location: Union[Location, Well, TrashBin, WasteChute, None],
    last_location: Optional[Location],
) -> ValidTarget:
    """Validate a given location for a liquid handling command.

    Args:
        location: The input location.
        last_location: The last location accessed by the pipette.

    Returns:
        A `WellTarget` if the input location represents a well.
        A `PointTarget` if the input location is an x, y, z coordinate.

    Raises:
        NoLocationError: The is no input location and no cached loaction.
        LocationTypeError: The location supplied is of unexpected type.
    """
    from .labware import Well

    target_location = location or last_location

    if target_location is None:
        raise NoLocationError()

    if not isinstance(target_location, (Location, Well, TrashBin, WasteChute)):
        raise LocationTypeError(
            f"location should be a Well, Location, TrashBin or WasteChute, but it is {location}"
        )

    if isinstance(target_location, (TrashBin, WasteChute)):
        return target_location

    in_place = target_location == last_location

    if isinstance(target_location, Well):
        return WellTarget(well=target_location, location=None, in_place=in_place)

    _, well = target_location.labware.get_parent_labware_and_well()

    return (
        WellTarget(well=well, location=target_location, in_place=in_place)
        if well is not None
        else PointTarget(location=target_location, in_place=in_place)
    )


def ensure_boolean(value: bool) -> bool:
    """Ensure value is a boolean."""
    if not isinstance(value, bool):
        raise ValueError("Value must be a boolean.")
    return value


def ensure_float(value: Union[int, float]) -> float:
    """Ensure value is a float (or an integer) and return it as a float."""
    if not isinstance(value, (int, float)):
        raise ValueError("Value must be a floating point number.")
    return float(value)


def ensure_positive_float(value: Union[int, float]) -> float:
    """Ensure value is a positive and real float value."""
    float_value = ensure_float(value)
    if isnan(float_value) or isinf(float_value):
        raise ValueError("Value must be a defined, non-infinite number.")
    if float_value < 0:
        raise ValueError("Value must be a positive float.")
    return float_value


def ensure_positive_int(value: int) -> int:
    """Ensure value is a positive integer."""
    if not isinstance(value, int):
        raise ValueError("Value must be an integer.")
    if value < 0:
        raise ValueError("Value must be a positive integer.")
    return value


def validate_coordinates(value: Sequence[float]) -> Tuple[float, float, float]:
    """Ensure value is a valid sequence of 3 floats and return a tuple of 3 floats."""
    if len(value) != 3:
        raise ValueError("Coordinates must be a sequence of exactly three numbers")
    if not all(isinstance(v, (float, int)) for v in value):
        raise ValueError("All values in coordinates must be floats.")
    return float(value[0]), float(value[1]), float(value[2])


def ensure_new_tip_policy(value: str) -> TransferTipPolicyV2:
    """Ensure that new_tip value is a valid TransferTipPolicy value."""
    try:
        return TransferTipPolicyV2(value.lower())
    except ValueError:
        raise ValueError(
            f"'{value}' is invalid value for 'new_tip'."
            f" Acceptable value is either 'never', 'once', 'always' or 'per source'."
        )


def _verify_each_list_element_is_valid_location(locations: Sequence[Well]) -> None:
    from .labware import Well

    for loc in locations:
        if not isinstance(loc, Well):
            raise ValueError(
                f"'{loc}' is not a valid location for transfer."
                f" Location should be a well instance."
            )


def ensure_valid_flat_wells_list_for_transfer_v2(
    target: Union[Well, Sequence[Well], Sequence[Sequence[Well]]],
) -> List[Well]:
    """Ensure that the given target(s) for a liquid transfer are valid and in a flat list."""
    from .labware import Well

    if isinstance(target, Well):
        return [target]

    if isinstance(target, (list, tuple)):
        if len(target) == 0:
            raise ValueError("No target well(s) specified for transfer.")
        if isinstance(target[0], (list, tuple)):
            for sub_sequence in target:
                _verify_each_list_element_is_valid_location(sub_sequence)
            return [loc for sub_sequence in target for loc in sub_sequence]
        else:
            _verify_each_list_element_is_valid_location(target)
            return list(target)
    else:
        raise ValueError(
            f"'{target}' is not a valid location for transfer."
            f" Location should be a well instance, or a 1-dimensional or"
            f" 2-dimensional sequence of well instances."
        )


def ensure_valid_tip_drop_location_for_transfer_v2(
    tip_drop_location: Union[Location, Well, TrashBin, WasteChute]
) -> Union[Location, Well, TrashBin, WasteChute]:
    """Ensure that the tip drop location is valid for v2 transfer."""
    from .labware import Well

    if (
        isinstance(tip_drop_location, Well)
        or isinstance(tip_drop_location, TrashBin)
        or isinstance(tip_drop_location, WasteChute)
    ):
        return tip_drop_location
    elif isinstance(tip_drop_location, Location):
        _, maybe_well = tip_drop_location.labware.get_parent_labware_and_well()

        if maybe_well is None:
            raise TypeError(
                "If a location is specified as a `types.Location`"
                " (for instance, as the result of a call to `Well.top()`),"
                " it must be a location relative to a well,"
                " since that is where a tip is dropped."
                " However, the given location doesn't refer to any well."
            )
        return tip_drop_location
    else:
        raise TypeError(
            f"If specified, location should be an instance of"
            f" `types.Location` (e.g. the return value from `Well.top()`)"
            f" or `Well` (e.g. `reservoir.wells()[0]`) or an instance of `TrashBin` or `WasteChute`."
            f" However, it is '{tip_drop_location}'."
        )
