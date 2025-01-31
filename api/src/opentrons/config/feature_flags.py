from opentrons.config import advanced_settings as advs
from opentrons_shared_data.robot.types import RobotTypeEnum


def short_fixed_trash() -> bool:
    return advs.get_setting_with_env_overload("shortFixedTrash", RobotTypeEnum.OT2)


def dots_deck_type() -> bool:
    return advs.get_setting_with_env_overload("deckCalibrationDots", RobotTypeEnum.OT2)


def disable_home_on_boot() -> bool:
    return advs.get_setting_with_env_overload("disableHomeOnBoot", RobotTypeEnum.OT2)


def use_old_aspiration_functions() -> bool:
    return advs.get_setting_with_env_overload(
        "useOldAspirationFunctions", RobotTypeEnum.OT2
    )


def enable_door_safety_switch(robot_type: RobotTypeEnum) -> bool:
    return advs.get_setting_with_env_overload("enableDoorSafetySwitch", robot_type)


def enable_ot3_hardware_controller() -> bool:
    """Get whether to use the OT-3 hardware controller."""

    return advs.get_setting_with_env_overload(
        "enableOT3HardwareController", RobotTypeEnum.FLEX
    )


def rear_panel_integration() -> bool:
    """Whether to enable usb connected rear_panel for the OT-3."""

    return advs.get_setting_with_env_overload(
        "rearPanelIntegration", RobotTypeEnum.FLEX
    )


def stall_detection_enabled() -> bool:
    return not advs.get_setting_with_env_overload(
        "disableStallDetection", RobotTypeEnum.FLEX
    )


def overpressure_detection_enabled() -> bool:
    return not advs.get_setting_with_env_overload(
        "disableOverpressureDetection", RobotTypeEnum.FLEX
    )


def status_bar_enabled() -> bool:
    """Whether the status bar is enabled."""
    return not advs.get_setting_with_env_overload(
        "disableStatusBar", RobotTypeEnum.FLEX
    )


def require_estop() -> bool:
    """Whether the OT3 should allow gantry movements with no Estop plugged in."""
    return not advs.get_setting_with_env_overload(
        "estopNotRequired", RobotTypeEnum.FLEX
    )


def enable_error_recovery_experiments() -> bool:
    return advs.get_setting_with_env_overload(
        "enableErrorRecoveryExperiments", RobotTypeEnum.FLEX
    )


def enable_performance_metrics(robot_type: RobotTypeEnum) -> bool:
    return advs.get_setting_with_env_overload("enablePerformanceMetrics", robot_type)


def oem_mode_enabled() -> bool:
    return advs.get_setting_with_env_overload("enableOEMMode", RobotTypeEnum.FLEX)
