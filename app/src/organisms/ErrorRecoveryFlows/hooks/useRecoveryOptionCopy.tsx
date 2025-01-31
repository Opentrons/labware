import { useTranslation } from 'react-i18next'

import type { ErrorKind, RecoveryRoute } from '../types'
import { ERROR_KINDS, RECOVERY_MAP } from '../constants'

// Return user-friendly recovery option copy from a given route. Only routes that are
// recovery options are handled.
export function useRecoveryOptionCopy(): (
  recoveryOption: RecoveryRoute | null,
  errorKind: ErrorKind
) => string {
  const { t } = useTranslation('error_recovery')

  const getRecoveryOptionCopy = (
    recoveryOption: RecoveryRoute | null,
    errorKind: ErrorKind
  ): string => {
    switch (recoveryOption) {
      case RECOVERY_MAP.RETRY_STEP.ROUTE:
        if (errorKind === ERROR_KINDS.TIP_DROP_FAILED) {
          return t('retry_dropping_tip')
        } else if (errorKind === ERROR_KINDS.TIP_NOT_DETECTED) {
          return t('retry_picking_up_tip')
        } else {
          return t('retry_step')
        }
      case RECOVERY_MAP.CANCEL_RUN.ROUTE:
        return t('cancel_run')
      case RECOVERY_MAP.HOME_AND_RETRY.ROUTE:
        return t('home_and_retry')
      case RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE:
        return t('retry_with_new_tips')
      case RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE:
        return t('retry_with_same_tips')
      case RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE:
        return t('manually_fill_well_and_skip')
      case RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE:
        return t('ignore_error_and_skip')
      case RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE:
        return t('skip_to_next_step_new_tips')
      case RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE:
        return t('skip_to_next_step_same_tips')
      case RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE:
        return t('manually_move_lw_and_skip')
      case RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE:
        return t('manually_replace_lw_and_retry')
      default:
        return 'Unknown action'
    }
  }

  return getRecoveryOptionCopy
}
