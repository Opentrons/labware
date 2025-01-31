import { ERROR_KINDS, DEFINED_ERROR_TYPES } from '../constants'

import type { ErrorKind } from '../types'
import type { FailedCommandBySource } from '/app/organisms/ErrorRecoveryFlows/hooks'

/**
 * Given server-side information about a failed command,
 * decide which UI flow to present to recover from it.
 *
 * NOTE IMPORTANT: Any failed command by run record must have an equivalent protocol analysis command or default
 * to the fallback general error. Prefer using FailedCommandBySource for this reason.
 */
export function getErrorKind(
  failedCommand: FailedCommandBySource | null
): ErrorKind {
  const failedCommandByRunRecord = failedCommand?.byRunRecord ?? null
  const commandType = failedCommandByRunRecord?.commandType
  const errorIsDefined = failedCommandByRunRecord?.error?.isDefined ?? false
  const errorType = failedCommandByRunRecord?.error?.errorType

  if (Boolean(errorIsDefined)) {
    if (
      commandType === 'prepareToAspirate' &&
      errorType === DEFINED_ERROR_TYPES.OVERPRESSURE
    ) {
      return ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE
    } else if (
      (commandType === 'aspirate' || commandType === 'aspirateInPlace') &&
      errorType === DEFINED_ERROR_TYPES.OVERPRESSURE
    ) {
      return ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING
    } else if (
      (commandType === 'dispense' || commandType === 'dispenseInPlace') &&
      errorType === DEFINED_ERROR_TYPES.OVERPRESSURE
    ) {
      return ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING
    } else if (
      commandType === 'liquidProbe' &&
      errorType === DEFINED_ERROR_TYPES.LIQUID_NOT_FOUND
    ) {
      return ERROR_KINDS.NO_LIQUID_DETECTED
    } else if (
      commandType === 'pickUpTip' &&
      errorType === DEFINED_ERROR_TYPES.TIP_PHYSICALLY_MISSING
    ) {
      return ERROR_KINDS.TIP_NOT_DETECTED
    } else if (
      (commandType === 'dropTip' || commandType === 'dropTipInPlace') &&
      errorType === DEFINED_ERROR_TYPES.TIP_PHYSICALLY_ATTACHED
    ) {
      return ERROR_KINDS.TIP_DROP_FAILED
    } else if (
      commandType === 'moveLabware' &&
      errorType === DEFINED_ERROR_TYPES.GRIPPER_MOVEMENT
    ) {
      return ERROR_KINDS.GRIPPER_ERROR
    } else if (errorType === DEFINED_ERROR_TYPES.STALL_OR_COLLISION) {
      return ERROR_KINDS.STALL_OR_COLLISION
    }
  }

  return ERROR_KINDS.GENERAL_ERROR
}
