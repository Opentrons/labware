import type { State } from '../../types'
import { SESSION_TYPE_CALIBRATION_HEALTH_CHECK } from '../constants'
import { getRobotSessionOfType } from '../selectors'
import type { Session, CalibrationCheckSession } from '../types'

export const getCalibrationCheckSession: (
  state: State,
  robotName: string
) => CalibrationCheckSession | null = (state, robotName) => {
  const calCheckSession: Session | null = getRobotSessionOfType(
    state,
    robotName,
    SESSION_TYPE_CALIBRATION_HEALTH_CHECK
  )
  if (
    calCheckSession &&
    calCheckSession.sessionType === SESSION_TYPE_CALIBRATION_HEALTH_CHECK
  ) {
    return calCheckSession
  }
  return null
}
