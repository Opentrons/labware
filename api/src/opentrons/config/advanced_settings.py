import json
import logging
import os
import sys
from functools import lru_cache
from typing import (
    TYPE_CHECKING,
    Any,
    Dict,
    Mapping,
    Tuple,
    Union,
    Optional,
    NamedTuple,
    cast,
    List,
)

from opentrons.config import CONFIG
from opentrons_shared_data.robot.types import RobotTypeEnum

if TYPE_CHECKING:
    from pathlib import Path

log = logging.getLogger(__name__)


SettingsMap = Dict[str, Optional[bool]]


class SettingException(Exception):
    def __init__(self, message: str, error: str) -> None:
        super(Exception, self).__init__(message)
        self.error = error


class SettingsData(NamedTuple):
    settings_map: SettingsMap
    version: int


class SettingDefinition:
    def __init__(
        self,
        _id: str,
        title: str,
        description: str,
        robot_type: List[RobotTypeEnum],
        old_id: Optional[str] = None,
        restart_required: bool = False,
        show_if: Optional[Tuple[str, bool]] = None,
        internal_only: bool = False,
        default_true_on_robot_types: Optional[List[RobotTypeEnum]] = None,
    ):
        self.id = _id
        #: The id of the setting for programmatic access through
        #: get_adv_setting
        self.old_id = old_id
        #: the old id before migration, if any
        self.title = title
        #: User facing title
        self.description = description
        #: User facing description
        self.restart_required = restart_required
        #: True if the user must restart
        self.show_if = show_if
        #: A tuple of (other setting id, setting value) that must match reality
        #: to show this setting in http endpoints
        self.robot_type = robot_type
        #: A list of RobotTypeEnums that are compatible with this feature flag.
        self.internal_only = internal_only
        #: A flag determining whether this setting is user-facing.
        self.default_true_on_robot_types = default_true_on_robot_types or []
        #: Robot types for which null/unset means the setting is activated

    def __repr__(self) -> str:
        return "{}: {}".format(self.__class__, self.id)

    def should_show(self) -> bool:
        """
        Use show_if attribute to determine if setting should be presented
        to users
        """
        if not self.show_if:
            return True
        return (
            get_setting_with_env_overload(self.show_if[0], self.robot_type[0])
            == self.show_if[1]
        )

    async def on_change(self, value: Optional[bool]) -> None:
        """
        An opportunity for side effects as a result of change a setting
        value
        """
        if self.restart_required:
            set_restart_required()


class Setting(NamedTuple):
    value: Optional[bool]
    definition: SettingDefinition


# If you add or remove any settings here BE SURE TO ADD A MIGRATION below.
# You will also need to update the migration tests in:
# api/tests/opentrons/config/test_advanced_settings_migration.py
settings = [
    SettingDefinition(
        _id="shortFixedTrash",
        old_id="short-fixed-trash",
        title="Short (55mm) fixed trash",
        description="Trash box is 55mm tall (rather than the 77mm default)",
        robot_type=[RobotTypeEnum.OT2],
    ),
    SettingDefinition(
        _id="deckCalibrationDots",
        old_id="dots-deck-type",
        title="Deck calibration to dots",
        description="Perform deck calibration to dots rather than crosses, for"
        " robots that do not have crosses etched on the deck",
        robot_type=[RobotTypeEnum.OT2],
    ),
    SettingDefinition(
        _id="disableHomeOnBoot",
        old_id="disable-home-on-boot",
        title="Disable home on boot",
        description="Prevent robot from homing motors on boot",
        robot_type=[RobotTypeEnum.OT2, RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="useOldAspirationFunctions",
        title="Use older aspirate behavior",
        description="Aspirate with the less accurate volumetric calibrations"
        " that were used before version 3.7.0. Use this if you"
        " need consistency with pre-v3.7.0 results. This only"
        " affects GEN1 P10S, P10M, P50S, P50M, and P300S pipettes.",
        robot_type=[RobotTypeEnum.OT2],
    ),
    SettingDefinition(
        _id="enableDoorSafetySwitch",
        title="Enable robot door safety switch",
        description="Automatically pause protocols when robot door opens. "
        "Opening the robot door during a run will "
        "pause your robot only after it has completed its "
        "current motion.",
        robot_type=[RobotTypeEnum.OT2],
        default_true_on_robot_types=[RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="enableOT3HardwareController",
        title="Enable experimental OT-3 hardware controller",
        description=(
            "Do not enable. This is an Opentrons-internal setting to test "
            "new hardware."
        ),
        restart_required=True,
        robot_type=[RobotTypeEnum.FLEX],
        internal_only=True,
    ),
    SettingDefinition(
        _id="rearPanelIntegration",
        title="Enable robots with the new usb connected rear-panel board.",
        description="This is an Opentrons-internal setting to test new rear-panel.",
        robot_type=[RobotTypeEnum.FLEX],
        internal_only=True,
    ),
    SettingDefinition(
        _id="disableStallDetection",
        title="Disable stall detection on the Flex.",
        description="This is an Opentrons-internal setting for hardware-testing.",
        robot_type=[RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="disableStatusBar",
        title="Disable the LED status bar on the Flex.",
        description="This setting disables the LED status bar on the Flex.",
        robot_type=[RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="estopNotRequired",
        title="If enabled, the Flex gantry can move with no estop attached.",
        description="This setting allows the gantry on the Flex to move with no estop attached.",
        show_if=(
            "estopNotRequired",
            True,
        ),  # Configured so this only shows if it has been set by a user
        robot_type=[RobotTypeEnum.FLEX],
        internal_only=True,
    ),
    SettingDefinition(
        _id="disableOverpressureDetection",
        title="Disable Flex pipette pressure sensing.",
        description="When this setting is on, Flex will continue its activities regardless of pressure changes inside the pipette. Do not turn this setting on unless you are intentionally causing pressures over 8 kPa inside the pipette air channel.",
        robot_type=[RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="enableErrorRecoveryExperiments",
        title="Enable error recovery experiments",
        description=(
            "Do not enable."
            " This is an Opentrons internal setting to enable additional,"
            " in-development error recovery features."
        ),
        robot_type=[RobotTypeEnum.FLEX],
        internal_only=True,
    ),
    SettingDefinition(
        _id="enableOEMMode",
        title="Enable OEM Mode",
        description="This setting anonymizes Opentrons branding in the ODD app.",
        robot_type=[RobotTypeEnum.FLEX],
    ),
    SettingDefinition(
        _id="enablePerformanceMetrics",
        title="Enable performance metrics",
        description=(
            "Do not enable."
            " This is an Opentrons internal setting to collect performance metrics."
            " Do not turn this on unless you are playing with the performance metrics system."
        ),
        robot_type=[RobotTypeEnum.OT2, RobotTypeEnum.FLEX],
        internal_only=True,
    ),
]


settings_by_id: Dict[str, SettingDefinition] = {s.id: s for s in settings}
settings_by_old_id: Dict[str, SettingDefinition] = {
    s.old_id: s for s in settings if s.old_id
}


def get_setting_definition(setting_id: str) -> Optional[SettingDefinition]:
    clean = _clean_id(setting_id)
    for setting in settings:
        if setting.id == clean:
            return setting
    return None


def get_adv_setting(setting: str, robot_type: RobotTypeEnum) -> Optional[Setting]:
    setting = _clean_id(setting)
    s = get_all_adv_settings(robot_type, include_internal=True)
    return s.get(setting, None)


def _filtered_key(
    definition: SettingDefinition,
    robot_type: RobotTypeEnum,
    include_internal: bool,
) -> bool:
    if include_internal:
        return robot_type in definition.robot_type
    else:
        return robot_type in definition.robot_type and not definition.internal_only


@lru_cache(maxsize=1)
def get_all_adv_settings(
    robot_type: RobotTypeEnum, include_internal: bool = False
) -> Dict[str, Setting]:
    """Get all the advanced setting values and definitions"""
    settings_file = CONFIG["feature_flags_file"]

    values, _ = _read_settings_file(settings_file)

    return {
        key: Setting(value=value, definition=settings_by_id[key])
        for key, value in values.items()
        if key in settings_by_id
        and _filtered_key(settings_by_id[key], robot_type, include_internal)
    }


async def set_adv_setting(_id: str, value: Optional[bool]) -> None:
    _id = _clean_id(_id)
    settings_file = CONFIG["feature_flags_file"]
    setting_data = _read_settings_file(settings_file)
    if _id not in setting_data.settings_map:
        raise ValueError(f"{_id} is not recognized")
    # Side effecting
    await settings_by_id[_id].on_change(value)

    setting_data.settings_map[_id] = value
    _write_settings_file(setting_data.settings_map, setting_data.version, settings_file)
    # Clear the lru cache
    get_all_adv_settings.cache_clear()


def _clean_id(_id: str) -> str:
    if _id in settings_by_old_id.keys():
        _id = settings_by_old_id[_id].id
    return _id


def _read_json_file(path: Union[str, "Path"]) -> Dict[str, Any]:
    try:
        with open(path, "r") as fd:
            data = json.load(fd)
    except FileNotFoundError:
        data = {}
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Could not load advanced settings file {path}: {e}\n")
        data = {}
    return cast(Dict[str, Any], data)


def _read_settings_file(settings_file: "Path") -> SettingsData:
    """
    Read the settings file, which is a json object with settings IDs as keys
    and boolean values. For each key, look up the `Settings` object with that
    key. If the key is one of the old IDs (kebab case), replace it with the
    new ID and rewrite the settings file

    :param settings_file: the path to the settings file
    :return: a dict with all new settings IDs as the keys, and boolean values
        (the values stored in the settings file, or `False` if the key was not
        found). Along with the version.
    """
    # Read settings from persistent file
    data = _read_json_file(settings_file)
    settings, version = _migrate(data)
    settings = _ensure(settings)

    if data.get("_version") != version:
        _write_settings_file(settings, version, settings_file)

    return SettingsData(settings_map=settings, version=version)


def _write_settings_file(
    data: Mapping[str, Any],
    version: int,
    settings_file: "Path",
) -> None:
    try:
        with settings_file.open("w") as fd:
            json.dump({**data, "_version": version}, fd)
            fd.flush()
            os.fsync(fd.fileno())
    except OSError:
        log.exception(f"Failed to write advanced settings file to {settings_file}")


def _migrate0to1(previous: Mapping[str, Any]) -> SettingsMap:
    """
    Migrate to version 1 of the feature flags file. Replaces old IDs with new
    IDs and sets any False values to None
    """
    next: SettingsMap = {}

    for s in settings:
        id = s.id
        old_id = s.old_id

        if previous.get(id) is True:
            next[id] = True
        elif old_id and previous.get(old_id) is True:
            next[id] = True
        else:
            next[id] = None

    return next


def _migrate1to2(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 2 of the feature flags file. Adds the
    disableLogAggregation config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["disableLogAggregation"] = None
    return newmap


def _migrate2to3(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 3 of the feature flags file. Adds the
    enableApi1BackCompat config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableApi1BackCompat"] = None
    newmap["useProtocolApi2"] = None
    return newmap


def _migrate3to4(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 4 of the feature flags file. Adds the
    useV1HttpApi config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["useV1HttpApi"] = None
    return newmap


def _migrate4to5(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 5 of the feature flags file. Adds the
    enableDoorSafetyFeature config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableDoorSafetySwitch"] = None
    return newmap


def _migrate5to6(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 6 of the feature flags file. Adds the
    enableTipLengthCalibration config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableTipLengthCalibration"] = None
    return newmap


def _migrate6to7(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 7 of the feature flags file. Adds the
    enableHttpProtocolSessions config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableHttpProtocolSessions"] = None
    return newmap


def _migrate7to8(previous: SettingsMap) -> SettingsMap:
    """
    Migration to version 8 of the feature flags file. Adds the
    enableFastProtocolUpload config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableFastProtocolUpload"] = None
    return newmap


def _migrate8to9(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 9 of the feature flags file.

    - Adds the enableProtocolEngine config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableProtocolEngine"] = None
    return newmap


def _migrate9to10(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 10 of the feature flags file.

    - Removes deprecated useProtocolApi2 option
    - Removes deprecated enableApi1BackCompat option
    - Removed deprecated useV1HttpApi option
    - Removes deprecated enableTipLengthCalibration option
    - Removes deprecated enableFastProtocolUpload option
    - Adds disableFastProtocolUpload option
    """
    removals = [
        "useProtocolApi2",
        "enableApi1BackCompat",
        "useV1HttpApi",
        "enableTipLengthCalibration",
        "enableFastProtocolUpload",
    ]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    newmap["disableFastProtocolUpload"] = None
    return newmap


def _migrate10to11(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 11 of the feature flags file.

    - Removes deprecated enableProtocolEngine option
    """
    removals = ["enableProtocolEngine"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate11to12(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 12 of the feature flags file.

    - Adds the enableOT3HardwareController config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableOT3HardwareController"] = None
    return newmap


def _migrate12to13(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 13 of the feature flags file.

    - Removes deprecated calibrateToBottom option
    """
    removals = ["calibrateToBottom"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate13to14(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 14 of the feature flags file.

    - Removes deprecated enableHttpProtocolSessions option
    """
    removals = ["enableHttpProtocolSessions"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate14to15(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 15 of the feature flags file.

    - adds enableHeaterShakerPAPI option
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableHeaterShakerPAPI"] = None
    return newmap


def _migrate15to16(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 16 of the feature flags file.

    - Removes deprecated enableHeaterShakerPAPI option
    """
    removals = ["enableHeaterShakerPAPI"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate16to17(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 17 of the advanced settings file.

    - Adds enableProtocolEnginePAPICore option
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableProtocolEnginePAPICore"] = None
    return newmap


def _migrate17to18(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 18 of the advanced settings file.

    - Adds enableLoadLiquid option
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableLoadLiquid"] = None
    return newmap


def _migrate18to19(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 19 of the feature flags file.

    - Removes deprecated enableLoadLiquid option
    """
    removals = ["enableLoadLiquid"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate19to20(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 20 of the feature flags file.

    - Adds the enableOT3FirmwareUpdates config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableOT3FirmwareUpdates"] = None
    return newmap


def _migrate20to21(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 21 of the feature flags file.

    - Removes deprecated enableProtocolEnginePAPICore option
    """
    removals = ["enableProtocolEnginePAPICore"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate21to22(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 22 of the feature flags file.

    - Removes deprecated enableOT3FirmwareUpdates option
    """
    removals = ["enableOT3FirmwareUpdates"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate22to23(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 23 of the feature flags file.

    - Adds the rearPanelIntegration config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["rearPanelIntegration"] = None
    return newmap


def _migrate23to24(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 24 of the feature flags file.

    - flips the rearPanelIntegration config element default to true.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["rearPanelIntegration"] = True
    return newmap


def _migrate24to25(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 25 of the feature flags file.

    - Adds the disableStallDetection config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["disableStallDetection"] = None
    return newmap


def _migrate25to26(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 26 of the feature flags file.

    - Adds the disableStatusBar config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["disableStatusBar"] = None
    return newmap


def _migrate26to27(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 27 of the feature flags file.

    - Adds the disableOverpressureDetection config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["disableOverpressureDetection"] = None
    return newmap


def _migrate27to28(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 28 of the feature flags file.

    - Adds the disableTipPresenceDetection config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["disableTipPresenceDetection"] = None
    return newmap


def _migrate28to29(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 29 of the feature flags file.

    - Adds the estopNotRequired config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["estopNotRequired"] = None
    return newmap


def _migrate29to30(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 30 of the feature flags file.

    - Removes the disableTipPresenceDetection flag.
    """
    return {k: v for k, v in previous.items() if "disableTipPresenceDetection" != k}


def _migrate30to31(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 31 of the feature flags file.

    - Adds the enableErrorRecoveryExperiments config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableErrorRecoveryExperiments"] = None
    return newmap


def _migrate31to32(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 32 of the feature flags file.

    - Adds the enableOEMMode config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enableOEMMode"] = None
    return newmap


def _migrate32to33(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 33 of the feature flags file.

    - Adds the enablePerformanceMetrics config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["enablePerformanceMetrics"] = None
    return newmap


def _migrate33to34(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 34 of the feature flags file.

    - Removes disableFastProtocolUpload
    """
    removals = ["disableFastProtocolUpload"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate34to35(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 35 of the feature flags file.

    - Removes disableLogAggregation
    """
    removals = ["disableLogAggregation"]
    newmap = {k: v for k, v in previous.items() if k not in removals}
    return newmap


def _migrate35to36(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 36 of the feature flags file.

    - Adds the allowLiquidClasses config element.
    """
    newmap = {k: v for k, v in previous.items()}
    newmap["allowLiquidClasses"] = None
    return newmap


def _migrate36to37(previous: SettingsMap) -> SettingsMap:
    """Migrate to version 37 of the feature flags file.

    - Removes the allowLiquidClasses flag.
    """
    return {k: v for k, v in previous.items() if "allowLiquidClasses" != k}


_MIGRATIONS = [
    _migrate0to1,
    _migrate1to2,
    _migrate2to3,
    _migrate3to4,
    _migrate4to5,
    _migrate5to6,
    _migrate6to7,
    _migrate7to8,
    _migrate8to9,
    _migrate9to10,
    _migrate10to11,
    _migrate11to12,
    _migrate12to13,
    _migrate13to14,
    _migrate14to15,
    _migrate15to16,
    _migrate16to17,
    _migrate17to18,
    _migrate18to19,
    _migrate19to20,
    _migrate20to21,
    _migrate21to22,
    _migrate22to23,
    _migrate23to24,
    _migrate24to25,
    _migrate25to26,
    _migrate26to27,
    _migrate27to28,
    _migrate28to29,
    _migrate29to30,
    _migrate30to31,
    _migrate31to32,
    _migrate32to33,
    _migrate33to34,
    _migrate34to35,
    _migrate35to36,
    _migrate36to37,
]
"""
List of all migrations to apply, indexed by (version - 1). See _migrate below
for how the migration functions are applied. Each migration function should
return a new dictionary (rather than modify their input)
"""


def _migrate(data: Mapping[str, Any]) -> SettingsData:
    """
    Check the version integer of the JSON file data a run any necessary
    migrations to get us to the latest file format. Returns dictionary of
    settings and version migrated to
    """
    next = dict(data)
    version = next.pop("_version", 0)
    target_version = len(_MIGRATIONS)
    migrations = _MIGRATIONS[version:]

    if len(migrations) > 0:
        log.info(
            "Migrating advanced settings from version {} to {}".format(
                version, target_version
            )
        )

    for m in migrations:
        next = m(next)

    return SettingsData(settings_map=next, version=target_version)


def _ensure(data: Mapping[str, Any]) -> SettingsMap:
    """Ensure config data is valid, regardless of version.

    Even after migration, we may have an invalid file. For instance,
    the user may have _downgraded_. Make sure all required keys are present,
    regardless of config version.
    """
    newdata = {k: v for k, v in data.items()}
    for s in settings:
        if s.id not in newdata:
            newdata[s.id] = None
    return newdata


def get_setting_with_env_overload(setting_name: str, robot_type: RobotTypeEnum) -> bool:
    env_name = "OT_API_FF_" + setting_name
    defn = get_setting_definition(setting_name)
    if env_name in os.environ:
        return os.environ[env_name].lower() in {"1", "true", "on"}
    else:
        s = get_adv_setting(setting_name, robot_type)
        if s is not None:
            return s.value is True
        if defn is None:
            return False
        if robot_type in defn.default_true_on_robot_types:
            return True
        return False


_SETTINGS_RESTART_REQUIRED = False
# This is a bit of global state that indicates whether a setting has changed
# that requires a restart. It's OK for this to be global because the behavior
# it's catching is global - changing the kind of setting that requires a
# a restart anywhere, even if you theoretically have two servers running in
# the same process, will require _all_ of them to be restarted.


def is_restart_required() -> bool:
    return _SETTINGS_RESTART_REQUIRED


def set_restart_required() -> bool:
    """Set the restart required flag."""
    global _SETTINGS_RESTART_REQUIRED
    _SETTINGS_RESTART_REQUIRED = True
    return _SETTINGS_RESTART_REQUIRED
