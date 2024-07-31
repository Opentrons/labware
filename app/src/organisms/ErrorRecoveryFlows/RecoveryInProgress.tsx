import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import { RECOVERY_MAP } from './constants'
import {
  Flex,
  Icon,
  StyledText,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  DIRECTION_COLUMN,
  SPACING,
  COLORS,
} from '@opentrons/components'

import type { RobotMovingRoute, RecoveryContentProps } from './types'

export function RecoveryInProgress({
  recoveryMap,
}: RecoveryContentProps): JSX.Element {
  const {
    ROBOT_CANCELING,
    ROBOT_IN_MOTION,
    ROBOT_RESUMING,
    ROBOT_RETRYING_STEP,
    ROBOT_PICKING_UP_TIPS,
    ROBOT_SKIPPING_STEP,
  } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')
  const { route } = recoveryMap

  const buildDescription = (): RobotMovingRoute => {
    switch (route) {
      case ROBOT_CANCELING.ROUTE:
        return t('canceling_run')
      case ROBOT_IN_MOTION.ROUTE:
        return t('stand_back')
      case ROBOT_RESUMING.ROUTE:
        return t('stand_back_resuming')
      case ROBOT_RETRYING_STEP.ROUTE:
        return t('stand_back_retrying')
      case ROBOT_PICKING_UP_TIPS.ROUTE:
        return t('stand_back_picking_up_tips')
      case ROBOT_SKIPPING_STEP.ROUTE:
        return t('stand_back_skipping_to_next_step')
      default:
        return t('stand_back')
    }
  }

  const description = buildDescription()

  return (
    <Flex css={CONTAINER_STYLE}>
      <Icon name="ot-spinner" aria-label="spinner" css={ICON_STYLE} spin />
      {description != null && (
        <StyledText desktopStyle="headingSmallBold" oddStyle="level3HeaderBold">
          {description}
        </StyledText>
      )}
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing16};
  width: 100%;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing24};
  }
`

const ICON_STYLE = css`
  height: 5rem;
  width: 5rem;
  color: ${COLORS.grey60};
  opacity: 100%;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 6.25rem;
    width: 6.25rem;
  }
`
