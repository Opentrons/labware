import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  SPACING,
  StyledText,
} from '@opentrons/components'

import {
  FLEX_WIDTH_ALERT_INFO_STYLE,
  ICON_SIZE_ALERT_INFO_STYLE,
  RECOVERY_MAP,
} from '../constants'
import {
  RecoveryFooterButtons,
  RecoverySingleColumnContentWrapper,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'
import type { ERUtilsResults } from '../hooks'

export function CancelRun(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { CANCEL_RUN } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case CANCEL_RUN.STEPS.CONFIRM_CANCEL:
        return <CancelRunConfirmation {...props} />
      default:
        console.warn(
          `CancelRun: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

function CancelRunConfirmation({
  routeUpdateActions,
  recoveryCommands,
  tipStatusUtils,
}: RecoveryContentProps): JSX.Element | null {
  const { t } = useTranslation('error_recovery')

  const { goBackPrevStep } = routeUpdateActions

  const { handleCancelRunClick, showBtnLoadingState } = useOnCancelRun({
    recoveryCommands,
    routeUpdateActions,
    tipStatusUtils,
  })

  return (
    <RecoverySingleColumnContentWrapper
      gridGap={SPACING.spacing24}
      alignItems={ALIGN_CENTER}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing16}
        padding={`${SPACING.spacing32} ${SPACING.spacing16}`}
        height="100%"
        css={FLEX_WIDTH_ALERT_INFO_STYLE}
      >
        <Icon
          name="ot-alert"
          css={ICON_SIZE_ALERT_INFO_STYLE}
          marginTop={SPACING.spacing24}
          color={COLORS.red50}
        />
        <StyledText oddStyle="level3HeaderBold" desktopStyle="headingSmallBold">
          {t('are_you_sure_you_want_to_cancel')}
        </StyledText>
        <StyledText
          oddStyle="level4HeaderRegular"
          desktopStyle="bodyDefaultRegular"
          color={COLORS.black90}
          textAlign={ALIGN_CENTER}
        >
          {t('if_tips_are_attached')}
        </StyledText>
      </Flex>
      <RecoveryFooterButtons
        primaryBtnOnClick={handleCancelRunClick}
        secondaryBtnOnClick={goBackPrevStep}
        primaryBtnTextOverride={t('confirm')}
        isLoadingPrimaryBtnAction={showBtnLoadingState}
      />
    </RecoverySingleColumnContentWrapper>
  )
}

interface OnCancelRunProps {
  tipStatusUtils: ERUtilsResults['tipStatusUtils']
  recoveryCommands: ERUtilsResults['recoveryCommands']
  routeUpdateActions: ERUtilsResults['routeUpdateActions']
}

// Manages routing to cancel route or drop tip route, depending on tip attachment status.
// Note that tip attachment status begins fetching in SelectRecoveryOption, but it may not finish
// by the time a user clicks "cancel run".
export function useOnCancelRun({
  tipStatusUtils,
  routeUpdateActions,
  recoveryCommands,
}: OnCancelRunProps): {
  handleCancelRunClick: () => void
  showBtnLoadingState: boolean
} {
  const { ROBOT_CANCELING, DROP_TIP_FLOWS } = RECOVERY_MAP
  const { isLoadingTipStatus, areTipsAttached } = tipStatusUtils
  const { handleMotionRouting, proceedToRouteAndStep } = routeUpdateActions
  const { cancelRun } = recoveryCommands

  const [hasUserClicked, setHasUserClicked] = useState(false)

  const showBtnLoadingState = hasUserClicked && isLoadingTipStatus

  useEffect(() => {
    if (hasUserClicked) {
      if (!isLoadingTipStatus) {
        if (areTipsAttached) {
          void proceedToRouteAndStep(DROP_TIP_FLOWS.ROUTE)
        } else {
          void handleMotionRouting(true, ROBOT_CANCELING.ROUTE).then(() => {
            cancelRun()
          })
        }
      }
    }
  }, [hasUserClicked, isLoadingTipStatus, areTipsAttached])

  const handleCancelRunClick = (): void => {
    setHasUserClicked(true)
  }

  return { showBtnLoadingState, handleCancelRunClick }
}
