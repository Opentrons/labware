export const SECTIONS = {
  BEFORE_BEGINNING: 'BEFORE_BEGINNING',
  MOUNT_GRIPPER: 'MOUNT_GRIPPER',
  FIRMWARE_UPDATE: 'FIRMWARE_UPDATE',
  MOVE_PIN: 'MOVE_PIN',
  SUCCESS: 'SUCCESS',
  UNMOUNT_GRIPPER: 'UNMOUNT_GRIPPER',
} as const

export const GRIPPER_FLOW_TYPES = {
  ATTACH: 'ATTACH',
  DETACH: 'DETACH',
  RECALIBRATE: 'RECALIBRATE',
} as const

// note: we will not translate these item titles to be consistent with manuals
export const CALIBRATION_PIN_DISPLAY_NAME = 'Calibration Pin'
export const HEX_SCREWDRIVER_DISPLAY_NAME = '2.5 mm Hex Screwdriver'

// pin movements

export const MOVE_PIN_TO_FRONT_JAW = 'movePinToFrontJaw' as const
export const MOVE_PIN_FROM_FRONT_JAW_TO_REAR_JAW = 'movePinFromFrontJawToRearJaw' as const
export const REMOVE_PIN_FROM_REAR_JAW = 'removePinFromRearJaw' as const

// successful actions

export const SUCCESSFULLY_ATTACHED = 'successfullyAttached' as const
export const SUCCESSFULLY_ATTACHED_AND_CALIBRATED = 'successfullyAttachedAndCalibrated' as const
export const SUCCESSFULLY_DETACHED = 'successfullyDetached' as const
export const SUCCESSFULLY_CALIBRATED = 'successfullyCalibrated' as const

//  required equipment list
export const CAL_PIN_LOADNAME = 'calibration_pin' as const
export const SCREWDRIVER_LOADNAME = 'hex_screwdriver' as const
export const GRIPPER_LOADNAME = 'flex_gripper' as const
