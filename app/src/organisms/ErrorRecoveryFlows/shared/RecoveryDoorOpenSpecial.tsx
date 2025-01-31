import { useEffect, useState } from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_END,
  RESPONSIVENESS,
  SPACING,
  StyledText,
  TEXT_ALIGN_CENTER,
} from '@opentrons/components'
import { RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR } from '@opentrons/api-client'

import { RecoverySingleColumnContentWrapper } from './RecoveryContentWrapper'
import { RecoveryFooterButtons } from './RecoveryFooterButtons'
import { RECOVERY_MAP } from '../constants'

import type {
  RecoveryContentProps,
  RecoveryRoute,
  RouteStep,
} from '../../ErrorRecoveryFlows/types'

// Whenever a step uses a custom "close the robot door" view, use this component.
// Note that the allowDoorOpen metadata for the route must be set to true for this view to render.
export function RecoveryDoorOpenSpecial({
  currentRecoveryOptionUtils,
  runStatus,
  recoveryActionMutationUtils,
  routeUpdateActions,
  doorStatusUtils,
  recoveryCommands,
}: RecoveryContentProps): JSX.Element {
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { resumeRecovery } = recoveryActionMutationUtils
  const { proceedToRouteAndStep, handleMotionRouting } = routeUpdateActions
  const { t } = useTranslation('error_recovery')

  const [isLoading, setIsLoading] = useState(false)

  const primaryOnClick = (): void => {
    setIsLoading(true)
    void resumeRecovery()
  }

  const buildSubtext = (): string => {
    switch (selectedRecoveryOption) {
      case RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE:
      case RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE:
      case RECOVERY_MAP.HOME_AND_RETRY.ROUTE:
        return t('door_open_robot_home')
      default: {
        console.error(
          `Unhandled special-cased door open subtext on route ${selectedRecoveryOption}.`
        )
        return t('close_the_robot_door')
      }
    }
  }

  const handleHomeAllAndRoute = (
    route: RecoveryRoute,
    step?: RouteStep
  ): void => {
    void handleMotionRouting(true, RECOVERY_MAP.ROBOT_IN_MOTION.ROUTE)
      .then(() => recoveryCommands.homeAll())
      .finally(() => handleMotionRouting(false))
      .then(() => proceedToRouteAndStep(route, step))
  }

  const handleHomeExceptPlungersAndRoute = (
    route: RecoveryRoute,
    step?: RouteStep
  ): void => {
    void handleMotionRouting(true, RECOVERY_MAP.ROBOT_IN_MOTION.ROUTE)
      .then(() => recoveryCommands.homeExceptPlungers())
      .finally(() => handleMotionRouting(false))
      .then(() => proceedToRouteAndStep(route, step))
  }

  useEffect(() => {
    if (!doorStatusUtils.isDoorOpen) {
      switch (selectedRecoveryOption) {
        case RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE:
          handleHomeExceptPlungersAndRoute(
            RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
            RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE
          )
          break
        case RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE:
          handleHomeExceptPlungersAndRoute(
            RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
            RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE
          )
          break
        case RECOVERY_MAP.HOME_AND_RETRY.ROUTE:
          handleHomeAllAndRoute(
            RECOVERY_MAP.HOME_AND_RETRY.ROUTE,
            RECOVERY_MAP.HOME_AND_RETRY.STEPS.CONFIRM_RETRY
          )
          break
        default: {
          console.error(
            `Unhandled special-cased door open on route ${selectedRecoveryOption}.`
          )
          void proceedToRouteAndStep(RECOVERY_MAP.OPTION_SELECTION.ROUTE)
        }
      }
    }
  }, [doorStatusUtils.isDoorOpen])

  return (
    <RecoverySingleColumnContentWrapper>
      <Flex
        padding={SPACING.spacing40}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={ALIGN_CENTER}
        flex="1"
      >
        <Icon
          css={ICON_STYLE}
          name="alert-circle"
          data-testid="recovery_door_alert_icon"
        />
        <Flex css={TEXT_STYLE}>
          <StyledText
            desktopStyle="headingSmallBold"
            oddStyle="level3HeaderBold"
          >
            {t('close_robot_door')}
          </StyledText>
          <StyledText
            desktopStyle="bodyDefaultRegular"
            oddStyle="level4HeaderRegular"
          >
            {buildSubtext()}
          </StyledText>
        </Flex>
      </Flex>
      <Flex justifyContent={JUSTIFY_END}>
        <RecoveryFooterButtons
          primaryBtnOnClick={primaryOnClick}
          primaryBtnDisabled={
            runStatus === RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
          }
          isLoadingPrimaryBtnAction={isLoading}
        />
      </Flex>
    </RecoverySingleColumnContentWrapper>
  )
}

const TEXT_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_CENTER};
  text-align: ${TEXT_ALIGN_CENTER};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing4};
  }
`

const ICON_STYLE = css`
  height: ${SPACING.spacing40};
  width: ${SPACING.spacing40};
  color: ${COLORS.yellow50};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing60};
    width: ${SPACING.spacing60};
  }
`
