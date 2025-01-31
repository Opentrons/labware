import { Trans, useTranslation } from 'react-i18next'

import { LegacyStyledText } from '@opentrons/components'

import { TwoColTextAndFailedStepNextStep } from '../shared'
import { RECOVERY_MAP } from '../constants'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function RetrySameTips(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { RETRY_SAME_TIPS } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case RETRY_SAME_TIPS.STEPS.RETRY:
        return <RetrySameTipsInfo {...props} />
      default:
        console.warn(
          `RetrySameTips: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

export function RetrySameTipsInfo(props: RecoveryContentProps): JSX.Element {
  const { routeUpdateActions, recoveryCommands } = props
  const { retryFailedCommand, resumeRun } = recoveryCommands
  const { handleMotionRouting } = routeUpdateActions
  const { ROBOT_RETRYING_STEP } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')

  const primaryBtnOnClick = (): Promise<void> => {
    return handleMotionRouting(true, ROBOT_RETRYING_STEP.ROUTE)
      .then(() => retryFailedCommand())
      .then(() => {
        resumeRun()
      })
  }

  const buildBodyText = (): JSX.Element => {
    return (
      <Trans
        t={t}
        i18nKey="robot_will_retry_with_same_tips"
        components={{
          block: <LegacyStyledText as="p" />,
        }}
      />
    )
  }

  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('retry_with_same_tips')}
      leftColBodyText={buildBodyText()}
      primaryBtnOnClick={primaryBtnOnClick}
      primaryBtnCopy={t('retry_now')}
    />
  )
}
