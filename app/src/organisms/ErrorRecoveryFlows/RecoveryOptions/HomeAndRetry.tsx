import { Trans, useTranslation } from 'react-i18next'
import { LegacyStyledText } from '@opentrons/components'
import { RECOVERY_MAP } from '../constants'
import {
  TwoColTextAndFailedStepNextStep,
  TwoColLwInfoAndDeck,
  SelectTips,
  RecoveryDoorOpenSpecial,
  RetryStepInfo,
} from '../shared'
import { ManageTips } from './ManageTips'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

const { HOME_AND_RETRY } = RECOVERY_MAP
export function HomeAndRetry(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { route, step } = recoveryMap
  switch (step) {
    case HOME_AND_RETRY.STEPS.PREPARE_DECK_FOR_HOME: {
      return <PrepareDeckForHome {...props} />
    }
    case HOME_AND_RETRY.STEPS.REMOVE_TIPS_FROM_PIPETTE: {
      // TODO: Make this work the same way as e.g. RetryNewTips by changing one of them. Or both of them.
      return <ManageTips {...props} />
    }
    case HOME_AND_RETRY.STEPS.REPLACE_TIPS: {
      return <TwoColLwInfoAndDeck {...props} />
    }
    case HOME_AND_RETRY.STEPS.SELECT_TIPS: {
      return <SelectTips {...props} />
    }
    case HOME_AND_RETRY.STEPS.HOME_BEFORE_RETRY: {
      return <HomeGantryBeforeRetry {...props} />
    }
    case HOME_AND_RETRY.STEPS.CLOSE_DOOR_AND_HOME: {
      return <RecoveryDoorOpenSpecial {...props} />
    }
    case HOME_AND_RETRY.STEPS.CONFIRM_RETRY: {
      return <RetryAfterHome {...props} />
    }
    default:
      console.warn(
        `HomeAndRetry:  ${step} in ${route} not explicitly handled. Rerouting.}`
      )
      return <SelectRecoveryOption {...props} />
  }
}

export function RetryAfterHome(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap, routeUpdateActions } = props
  const { step, route } = recoveryMap
  const { HOME_AND_RETRY } = RECOVERY_MAP
  const { proceedToRouteAndStep } = routeUpdateActions

  const buildContent = (): JSX.Element => {
    switch (step) {
      case HOME_AND_RETRY.STEPS.CONFIRM_RETRY:
        return (
          <RetryStepInfo
            {...props}
            secondaryBtnOnClickOverride={() =>
              proceedToRouteAndStep(
                HOME_AND_RETRY.ROUTE,
                HOME_AND_RETRY.STEPS.HOME_BEFORE_RETRY
              )
            }
          />
        )
      default:
        console.warn(
          `RetryStep: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }
  return buildContent()
}

export function PrepareDeckForHome(props: RecoveryContentProps): JSX.Element {
  const { t } = useTranslation('error_recovery')
  const { routeUpdateActions, tipStatusUtils } = props
  const { proceedToRouteAndStep } = routeUpdateActions
  const primaryBtnOnClick = (): Promise<void> =>
    proceedToRouteAndStep(
      RECOVERY_MAP.HOME_AND_RETRY.ROUTE,
      tipStatusUtils.areTipsAttached
        ? RECOVERY_MAP.HOME_AND_RETRY.STEPS.REMOVE_TIPS_FROM_PIPETTE
        : RECOVERY_MAP.HOME_AND_RETRY.STEPS.HOME_BEFORE_RETRY
    )
  const buildBodyText = (): JSX.Element => (
    <Trans
      t={t}
      i18nKey="carefully_move_labware"
      components={{ block: <LegacyStyledText as="p" /> }}
    />
  )
  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('prepare_deck_for_homing')}
      leftColBodyText={buildBodyText()}
      primaryBtnCopy={t('continue')}
      primaryBtnOnClick={primaryBtnOnClick}
    />
  )
}

export function HomeGantryBeforeRetry(
  props: RecoveryContentProps
): JSX.Element {
  const { t } = useTranslation('error_recovery')
  const { routeUpdateActions, tipStatusUtils } = props
  const { proceedToRouteAndStep } = routeUpdateActions
  const { HOME_AND_RETRY } = RECOVERY_MAP
  const buildBodyText = (): JSX.Element => (
    <Trans
      t={t}
      i18nKey="take_necessary_actions_home"
      components={{ block: <LegacyStyledText as="p" /> }}
    />
  )
  const secondaryBtnOnClick = (): Promise<void> =>
    proceedToRouteAndStep(
      RECOVERY_MAP.HOME_AND_RETRY.ROUTE,
      tipStatusUtils.areTipsAttached
        ? RECOVERY_MAP.HOME_AND_RETRY.STEPS.REMOVE_TIPS_FROM_PIPETTE
        : RECOVERY_MAP.HOME_AND_RETRY.STEPS.PREPARE_DECK_FOR_HOME
    )

  const primaryBtnOnClick = (): Promise<void> =>
    proceedToRouteAndStep(
      HOME_AND_RETRY.ROUTE,
      HOME_AND_RETRY.STEPS.CLOSE_DOOR_AND_HOME
    )
  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('home_gantry')}
      leftColBodyText={buildBodyText()}
      primaryBtnCopy={t('home_now')}
      primaryBtnOnClick={primaryBtnOnClick}
      secondaryBtnOnClickOverride={secondaryBtnOnClick}
    />
  )
}
