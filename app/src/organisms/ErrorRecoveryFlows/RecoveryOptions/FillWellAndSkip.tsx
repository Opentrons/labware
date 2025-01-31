import { Trans, useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'

import { RECOVERY_MAP } from '../constants'
import { CancelRun } from './CancelRun'
import {
  RecoveryFooterButtons,
  RecoverySingleColumnContentWrapper,
  LeftColumnLabwareInfo,
  TwoColTextAndFailedStepNextStep,
} from '../shared'
import { TwoColumn, DeckMapContent } from '/app/molecules/InterventionModal'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function FillWellAndSkip(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { MANUAL_FILL_AND_SKIP, CANCEL_RUN } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case MANUAL_FILL_AND_SKIP.STEPS.MANUAL_FILL:
        return <FillWell {...props} />
      case MANUAL_FILL_AND_SKIP.STEPS.SKIP:
        return <SkipToNextStep {...props} />
      case CANCEL_RUN.STEPS.CONFIRM_CANCEL:
        return <CancelRun {...props} />
      default:
        console.warn(
          `FillWellAndSkip: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

export function FillWell(props: RecoveryContentProps): JSX.Element | null {
  const { routeUpdateActions, failedLabwareUtils, deckMapUtils } = props
  const { t } = useTranslation('error_recovery')
  const { goBackPrevStep, proceedNextStep } = routeUpdateActions

  return (
    <RecoverySingleColumnContentWrapper>
      <TwoColumn>
        <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
          <LeftColumnLabwareInfo
            {...props}
            title={t('manually_fill_liquid_in_well', {
              well: failedLabwareUtils.relevantWellName,
            })}
            type="location"
          />
        </Flex>
        <Flex marginTop="1.742rem">
          <DeckMapContent {...deckMapUtils} />
        </Flex>
      </TwoColumn>
      <RecoveryFooterButtons
        primaryBtnOnClick={proceedNextStep}
        secondaryBtnOnClick={goBackPrevStep}
      />
    </RecoverySingleColumnContentWrapper>
  )
}

export function SkipToNextStep(
  props: RecoveryContentProps
): JSX.Element | null {
  const {
    routeUpdateActions,
    recoveryCommands,
    currentRecoveryOptionUtils,
  } = props
  const {
    handleMotionRouting,
    goBackPrevStep,
    proceedToRouteAndStep,
  } = routeUpdateActions
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { skipFailedCommand } = recoveryCommands
  const { ROBOT_SKIPPING_STEP, IGNORE_AND_SKIP } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')

  const secondaryBtnOnClick = (): void => {
    if (selectedRecoveryOption === IGNORE_AND_SKIP.ROUTE) {
      void proceedToRouteAndStep(IGNORE_AND_SKIP.ROUTE)
    } else {
      void goBackPrevStep()
    }
  }

  const primaryBtnOnClick = (): Promise<void> => {
    return handleMotionRouting(true, ROBOT_SKIPPING_STEP.ROUTE).then(() => {
      skipFailedCommand()
    })
  }

  const buildBodyText = (): JSX.Element => {
    return (
      <Trans
        t={t}
        i18nKey="robot_will_not_check_for_liquid"
        components={{
          block: <LegacyStyledText as="p" />,
        }}
      />
    )
  }

  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={t('skip_to_next_step')}
      leftColBodyText={buildBodyText()}
      primaryBtnCopy={t('continue_run_now')}
      primaryBtnOnClick={primaryBtnOnClick}
      secondaryBtnOnClickOverride={secondaryBtnOnClick}
    />
  )
}
