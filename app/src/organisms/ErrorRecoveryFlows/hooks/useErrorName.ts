import { useTranslation } from 'react-i18next'

import { ERROR_KINDS } from '../constants'

import type { ErrorKind } from '../types'

// Returns the user-facing name of the errorKind.
export function useErrorName(errorKind: ErrorKind): string {
  const { t } = useTranslation('error_recovery')

  switch (errorKind) {
    case ERROR_KINDS.NO_LIQUID_DETECTED:
      return t('no_liquid_detected')
    case ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE:
      return t('pipette_overpressure')
    case ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING:
      return t('pipette_overpressure')
    case ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING:
      return t('pipette_overpressure')
    case ERROR_KINDS.TIP_NOT_DETECTED:
      return t('tip_not_detected')
    case ERROR_KINDS.TIP_DROP_FAILED:
      return t('tip_drop_failed')
    case ERROR_KINDS.GRIPPER_ERROR:
      return t('gripper_error')
    case ERROR_KINDS.STALL_OR_COLLISION:
      return t('stall_or_collision_error')
    default:
      return t('error')
  }
}
