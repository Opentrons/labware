// ToDo (kk:04/25/2024) re-organized all constants

export const ANALYTICS_PIPETTE_OFFSET_STARTED: 'analytics:PIPETTE_OFFSET_STARTED' =
  'analytics:PIPETTE_OFFSET_STARTED'
export const ANALYTICS_TIP_LENGTH_STARTED: 'analytics:TIP_LENGTH_STARTED' =
  'analytics:TIP_LENGTH_STARTED'

export const ANALYTICS_LIQUID_SETUP_VIEW_TOGGLE = 'liquidSetupViewToggle'
export const ANALYTICS_ADD_CUSTOM_LABWARE = 'addCustomLabware'
export const ANALYTICS_U2E_DRIVE_ALERT_DISMISSED = 'u2eDriverAlertDismissed'
export const ANALYTICS_U2E_DRIVE_LINK_CLICKED = 'u2eDriverLinkClicked'
export const ANALYTICS_PROCEED_TO_MODULE_SETUP_STEP =
  'proceed_to_module_setup_step'
export const ANALYTICS_PROCEED_TO_LABWARE_SETUP_STEP =
  'proceed_to_labware_setup_step'
export const ANALYTICS_HIGHLIGHT_LIQUID_IN_DETAIL_MODAL =
  'highlightLiquidInDetailModal'
export const ANALYTICS_EXPAND_LIQUID_SETUP_ROW = 'expandLiquidSetupRow'
export const ANALYTICS_OPEN_LIQUID_LABWARE_DETAIL_MODAL =
  'openLiquidLabwareDetailModal'
export const ANALYTICS_JUPYTER_OPEN = 'jupyterOpen'
export const ANALYTICS_RENAME_ROBOT = 'renameRobot'
export const ANALYTICS_OPEN_LABWARE_CREATOR_FROM_OVERFLOW_MENU =
  'openLabwareCreatorFromLabwareOverflowMenu'
export const ANALYTICS_DELETE_PROTOCOL_FROM_APP = 'deleteProtocolFromApp'
export const ANALYTICS_IMPORT_PROTOCOL_TO_APP = 'importProtocolToApp'
export const ANALYTICS_CALIBRATION_DATA_DOWNLOADED = 'calibrationDataDownloaded'
export const ANALYTICS_CALIBRATION_HEALTH_CHECK_BUTTON_CLICKED =
  'calibrationHealthCheckButtonClicked'
export const ANALYTICS_CHANGE_PATH_TO_PYTHON_DIRECTORY =
  'changePathToPythonDirectory'
export const ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER =
  'changeCustomLabwareSourceFolder'
export const ANALYTICS_APP_UPDATE_NOTIFICATIONS_TOGGLED =
  'appUpdateNotificationsToggled'
export const ANALYTICS_OPEN_LABWARE_CREATOR_FROM_BOTTOM_OF_LABWARE_LIBRARY_LIST =
  'openLabwareCreatorFromBottomOfLabwareLibraryList'
export const ANALYTICS_SENT_TO_FLEX = 'sendToFlex' // This would be changed

export const ANALYTICS_ODD_APP_ERROR = 'oddError'
export const ANALYTICS_DESKTOP_APP_ERROR = 'desktopAppError'
export const ANALYTICS_NOTIFICATION_PORT_BLOCK_ERROR =
  'notificationPortBlockError'

export const ANALYTICS_PROTOCOL_RUN_ACTION = {
  AGAIN: 'runAgain',
  FINISH: 'runFinish',
  PAUSE: 'runPause',
  START: 'runStart',
  RESUME: 'runResume',
  CANCEL: 'runCancel',
} as const
export const ANALYTICS_PROTOCOL_PROCEED_TO_RUN = 'proceedToRun'

export const ANALYTICS_STATE_ROBOT_UPDATE = {
  IGNORE: 'robotUpdateIgnore',
  INITIATE: 'robotUpdateInitiate',
  ERROR: 'robotUpdateError',
  COMPLETE: 'robotUpdateComplete',
} as const
export const ANALYTICS_ROBOT_UPDATE_VIEW = 'robotUpdateView'
export const ANALYTICS_ROBOT_UPDATE_CHANGE_LOG_VIEW = 'robotUpdateChangeLogView'

/**
 * Error Recovery Analytics
 */

export const ANALYTICS_RECOVERY_ERROR_EVENT = 'recoveryErrorEvent'
export const ANALYTICS_RECOVERY_ACTION_SELECTED =
  'recoverySelectedRecoveryAction'
export const ANALYTICS_RECOVERY_VIEW_ERROR_DETAILS = 'recoveryViewErrorDetails'
export const ANALYTICS_RECOVERY_ACTION_RESULT =
  'recoverySelectedRecoveryActionResult'
export const ANALYTICS_RECOVERY_RUN_RESULT = 'recoveryRunResultAfterError'

/**
 * Quick Transfer Analytics
 */

export const ANALYTICS_QUICK_TRANSFER_TAB_SELECTED = 'quickTransferTab'
export const ANALYTICS_QUICK_TRANSFER_FLOW_STARTED = 'quickTransferFlowStarted'
export const ANALYTICS_QUICK_TRANSFER_WELL_SELECTION_DURATION =
  'quickTransferWellSelectionDuration'
export const ANALYTICS_QUICK_TRANSFER_EXIT_EARLY = 'quickTransferExitEarly'
export const ANALYTICS_QUICK_TRANSFER_ADVANCED_SETTINGS_TAB =
  'quickTransferAdvancedSettingsTab'
export const ANALYTICS_QUICK_TRANSFER_TIP_MANAGEMENT_TAB =
  'quickTransferTipManagementTab'
export const ANALYTICS_QUICK_TRANSFER_SETTING_SAVED =
  'quickTransferSettingSaved'
export const ANALYTICS_QUICK_TRANSFER_TIME_TO_CREATE =
  'quickTransferTimeToCreate'
export const ANALYTICS_QUICK_TRANSFER_SAVE_FOR_LATER =
  'quickTransferSaveForLater'
export const ANALYTICS_QUICK_TRANSFER_RUN_NOW = 'quickTransferRunNow'
export const ANALYTICS_QUICK_TRANSFER_DETAILS_PAGE = 'quickTransferDetailsPage'
export const ANALYTICS_QUICK_TRANSFER_RUN_FROM_DETAILS =
  'quickTransferRunFromDetails'
export const ANALYTICS_QUICK_TRANSFER_RERUN = 'quickTransferReRunFromSummary'

/**
 * Resource Monitor Analytics
 */
export const ANALYTICS_RESOURCE_MONITOR_REPORT: 'analytics:RESOURCE_MONITOR_REPORT' =
  'analytics:RESOURCE_MONITOR_REPORT'

/**
 * Internationalization Analytics
 */
export const ANALYTICS_LANGUAGE_UPDATED_ODD_UNBOXING_FLOW: 'languageUpdatedOddUnboxingFlow' =
  'languageUpdatedOddUnboxingFlow'
export const ANALYTICS_LANGUAGE_UPDATED_ODD_SETTINGS: 'languageUpdatedOddSettings' =
  'languageUpdatedOddSettings'
export const ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_MODAL: 'languageUpdatedDesktopAppModal' =
  'languageUpdatedDesktopAppModal'
export const ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_SETTINGS: 'languageUpdatedDesktopAppSettings' =
  'languageUpdatedDesktopAppSettings'
