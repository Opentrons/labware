import { Trans, useTranslation } from 'react-i18next'

import { LegacyStyledText } from '@opentrons/components'

import { ERROR_KINDS, RECOVERY_MAP } from '../constants'
import { TwoColTextAndFailedStepNextStep } from './TwoColTextAndFailedStepNextStep'

import type { RecoveryContentProps } from '../types'

export function RetryStepInfo(
  props: RecoveryContentProps & { secondaryBtnOnClickOverride?: () => void }
): JSX.Element {
  const { routeUpdateActions, recoveryCommands, errorKind } = props
  const { ROBOT_RETRYING_STEP } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')

  const { retryFailedCommand, resumeRun } = recoveryCommands
  const { handleMotionRouting } = routeUpdateActions

  const primaryBtnOnClick = (): Promise<void> => {
    return handleMotionRouting(true, ROBOT_RETRYING_STEP.ROUTE)
      .then(() => retryFailedCommand())
      .then(() => {
        resumeRun()
      })
  }

  const buildBodyCopyKey = (): string => {
    switch (errorKind) {
      case ERROR_KINDS.TIP_NOT_DETECTED:
        return 'take_necessary_actions_failed_pickup'
      case ERROR_KINDS.GRIPPER_ERROR:
        return 'robot_retry_failed_lw_movement'
      case ERROR_KINDS.TIP_DROP_FAILED:
        return 'take_necessary_actions_failed_tip_drop'
      default:
        return 'take_necessary_actions'
    }
  }
  const buildBodyText = (): JSX.Element => {
    return (
      <Trans
        t={t}
        i18nKey={buildBodyCopyKey()}
        components={{
          block: <LegacyStyledText as="p" />,
        }}
      />
    )
  }

  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('retry_step')}
      leftColBodyText={buildBodyText()}
      primaryBtnOnClick={primaryBtnOnClick}
      primaryBtnCopy={t('retry_now')}
    />
  )
}
