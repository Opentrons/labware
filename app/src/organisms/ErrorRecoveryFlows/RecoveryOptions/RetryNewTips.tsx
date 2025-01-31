import { Trans, useTranslation } from 'react-i18next'

import { LegacyStyledText } from '@opentrons/components'

import { RECOVERY_MAP } from '../constants'
import {
  TwoColLwInfoAndDeck,
  SelectTips,
  TwoColTextAndFailedStepNextStep,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function RetryNewTips(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap, routeUpdateActions } = props
  const { step, route } = recoveryMap
  const { RETRY_NEW_TIPS, DROP_TIP_FLOWS } = RECOVERY_MAP

  // Do this instead of directly routing to DropTipFlows route first,
  // so SelectRecoveryOptions labels this route as the selected recovery option.
  if (step === RETRY_NEW_TIPS.STEPS.DROP_TIPS) {
    void routeUpdateActions.proceedToRouteAndStep(
      DROP_TIP_FLOWS.ROUTE,
      DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING
    )
  }

  const buildContent = (): JSX.Element => {
    switch (step) {
      case RETRY_NEW_TIPS.STEPS.REPLACE_TIPS:
        return <TwoColLwInfoAndDeck {...props} />
      case RETRY_NEW_TIPS.STEPS.SELECT_TIPS:
        return <SelectTips {...props} />
      case RETRY_NEW_TIPS.STEPS.RETRY:
        return <RetryWithNewTips {...props} />
      default:
        console.warn(
          `RetryNewTips: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

export function RetryWithNewTips(props: RecoveryContentProps): JSX.Element {
  const { recoveryCommands, routeUpdateActions } = props
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
        i18nKey="robot_will_retry_with_new_tips"
        components={{
          block: <LegacyStyledText as="p" />,
        }}
      />
    )
  }

  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('retry_with_new_tips')}
      leftColBodyText={buildBodyText()}
      primaryBtnCopy={t('retry_now')}
      primaryBtnOnClick={primaryBtnOnClick}
    />
  )
}
