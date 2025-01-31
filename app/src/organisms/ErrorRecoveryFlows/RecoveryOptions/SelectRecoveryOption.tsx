import { useState, useEffect } from 'react'
import head from 'lodash/head'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  RESPONSIVENESS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  RadioButton,
} from '@opentrons/components'

import {
  RECOVERY_MAP,
  ERROR_KINDS,
  ODD_SECTION_TITLE_STYLE,
} from '../constants'
import { RecoverySingleColumnContentWrapper } from '../shared'

import type { ErrorKind, RecoveryContentProps, RecoveryRoute } from '../types'
import type { PipetteWithTip } from '/app/resources/instruments'

// The "home" route within Error Recovery. When a user completes a non-terminal flow or presses "Go back" enough
// to escape the boundaries of any route, they will be redirected here.
export function SelectRecoveryOption(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step } = recoveryMap
  const { OPTION_SELECTION } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case OPTION_SELECTION.STEPS.SELECT:
        return <SelectRecoveryOptionHome {...props} />
      default:
        return <SelectRecoveryOptionHome {...props} />
    }
  }

  return buildContent()
}

export function SelectRecoveryOptionHome({
  errorKind,
  routeUpdateActions,
  tipStatusUtils,
  currentRecoveryOptionUtils,
  getRecoveryOptionCopy,
  analytics,
  isOnDevice,
}: RecoveryContentProps): JSX.Element | null {
  const { t } = useTranslation('error_recovery')
  const { proceedToRouteAndStep } = routeUpdateActions
  const { determineTipStatus } = tipStatusUtils
  const { setSelectedRecoveryOption } = currentRecoveryOptionUtils
  const validRecoveryOptions = getRecoveryOptions(errorKind)
  const [selectedRoute, setSelectedRoute] = useState<RecoveryRoute>(
    head(validRecoveryOptions) as RecoveryRoute
  )

  useCurrentTipStatus(determineTipStatus)

  return (
    <RecoverySingleColumnContentWrapper
      footerDetails={{
        primaryBtnOnClick: () => {
          analytics.reportActionSelectedEvent(selectedRoute)
          setSelectedRecoveryOption(selectedRoute)
          void proceedToRouteAndStep(selectedRoute as RecoveryRoute)
        },
      }}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          oddStyle="level4HeaderSemiBold"
          desktopStyle="headingSmallBold"
          css={ODD_SECTION_TITLE_STYLE}
        >
          {t('choose_a_recovery_action')}
        </StyledText>
        <RecoveryOptions
          validRecoveryOptions={validRecoveryOptions}
          setSelectedRoute={setSelectedRoute}
          selectedRoute={selectedRoute}
          getRecoveryOptionCopy={getRecoveryOptionCopy}
          errorKind={errorKind}
          isOnDevice={isOnDevice}
        />
      </Flex>
    </RecoverySingleColumnContentWrapper>
  )
}

interface RecoveryOptionsProps {
  validRecoveryOptions: RecoveryRoute[]
  setSelectedRoute: (route: RecoveryRoute) => void
  getRecoveryOptionCopy: RecoveryContentProps['getRecoveryOptionCopy']
  errorKind: RecoveryContentProps['errorKind']
  isOnDevice: RecoveryContentProps['isOnDevice']
  selectedRoute?: RecoveryRoute
}

export function RecoveryOptions({
  errorKind,
  validRecoveryOptions,
  selectedRoute,
  setSelectedRoute,
  getRecoveryOptionCopy,
  isOnDevice,
}: RecoveryOptionsProps): JSX.Element {
  return (
    <Flex css={RECOVERY_OPTION_CONTAINER_STYLE}>
      {validRecoveryOptions.map((recoveryOption: RecoveryRoute) => {
        const optionName = getRecoveryOptionCopy(recoveryOption, errorKind)
        return (
          <RadioButton
            key={`recovery_option_${optionName}`}
            buttonLabel={optionName}
            buttonValue={optionName}
            onChange={() => {
              setSelectedRoute(recoveryOption)
            }}
            isSelected={recoveryOption === selectedRoute}
            radioButtonType="large"
            largeDesktopBorderRadius={!isOnDevice}
          />
        )
      })}
    </Flex>
  )
}

const RECOVERY_OPTION_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing4};
  width: 100%;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing8};
  }
`

// Pre-fetch tip attachment status. Users are not blocked from proceeding at this step.
export function useCurrentTipStatus(
  determineTipStatus: () => Promise<PipetteWithTip[]>
): void {
  useEffect(() => {
    void determineTipStatus()
  }, [])
}

export function getRecoveryOptions(errorKind: ErrorKind): RecoveryRoute[] {
  switch (errorKind) {
    case ERROR_KINDS.NO_LIQUID_DETECTED:
      return NO_LIQUID_DETECTED_OPTIONS
    case ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE:
      return OVERPRESSURE_PREPARE_TO_ASPIRATE
    case ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING:
      return OVERPRESSURE_WHILE_ASPIRATING_OPTIONS
    case ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING:
      return OVERPRESSURE_WHILE_DISPENSING_OPTIONS
    case ERROR_KINDS.TIP_NOT_DETECTED:
      return TIP_NOT_DETECTED_OPTIONS
    case ERROR_KINDS.TIP_DROP_FAILED:
      return TIP_DROP_FAILED_OPTIONS
    case ERROR_KINDS.GRIPPER_ERROR:
      return GRIPPER_ERROR_OPTIONS
    case ERROR_KINDS.GENERAL_ERROR:
      return GENERAL_ERROR_OPTIONS
    case ERROR_KINDS.STALL_OR_COLLISION:
      return STALL_OR_COLLISION_OPTIONS
  }
}

export const STALL_OR_COLLISION_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.HOME_AND_RETRY.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const NO_LIQUID_DETECTED_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE,
  RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const OVERPRESSURE_PREPARE_TO_ASPIRATE: RecoveryRoute[] = [
  RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE,
  RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const OVERPRESSURE_WHILE_ASPIRATING_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const OVERPRESSURE_WHILE_DISPENSING_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE,
  RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const TIP_NOT_DETECTED_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.RETRY_STEP.ROUTE,
  RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const TIP_DROP_FAILED_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.RETRY_STEP.ROUTE,
  RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const GRIPPER_ERROR_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
  RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]

export const GENERAL_ERROR_OPTIONS: RecoveryRoute[] = [
  RECOVERY_MAP.RETRY_STEP.ROUTE,
  RECOVERY_MAP.CANCEL_RUN.ROUTE,
]
