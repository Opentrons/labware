// @flow
// domain layer constants

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION'

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS'

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE'

export const COMPLETE_ROBOT_CALIBRATION_CHECK: 'calibration:COMPLETE_ROBOT_CALIBRATION_CHECK' =
  'calibration:COMPLETE_ROBOT_CALIBRATION_CHECK'


// api constants

export const ROBOT_CALIBRATION_CHECK_PATH: '/calibration/check/session' =
  '/calibration/check/session'


const SESSION_START: 'sessionStart' = 'sessionStart'
const LOAD_LABWARE: 'loadLabware' = 'loadLabware'
const PICK_UP_TIP: 'pickUpTip' = 'pickUpTip'
const CHECK_POINT_ONE: 'checkPointOne' = 'checkPointOne'
const CHECK_POINT_TWO: 'checkPointTwo' = 'checkPointTwo'
const CHECK_POINT_THREE: 'checkPointThree' = 'checkPointThree'
const CHECK_HEIGHT: 'checkHeight' = 'checkHeight'
const SESSION_EXIT: 'sessionExit' = 'sessionExit'
const BAD_ROBOT_CALIBRATION: 'badRobotCalibration' = 'badRobotCalibration'
const NO_PIPETTES_ATTACHED: 'noPipettesAttached' = 'noPipettesAttached'

export const ROBOT_CALIBRATION_STEPS = {
  SESSION_START,
  LOAD_LABWARE,
  PICK_UP_TIP,
  CHECK_POINT_ONE,
  CHECK_POINT_TWO,
  CHECK_POINT_THREE,
  CHECK_HEIGHT,
  SESSION_EXIT,
  BAD_ROBOT_CALIBRATION,
  NO_PIPETTES_ATTACHED,
}
