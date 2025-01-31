import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import { RECOVERY_MAP } from './constants'
import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  DIRECTION_COLUMN,
  SPACING,
} from '@opentrons/components'

import { InProgressModal } from '/app/molecules/InProgressModal'

import type { RobotMovingRoute, RecoveryContentProps } from './types'

export function RecoveryInProgress({
  recoveryMap,
  recoveryCommands,
  routeUpdateActions,
  doorStatusUtils,
  currentRecoveryOptionUtils,
}: RecoveryContentProps): JSX.Element {
  const {
    ROBOT_CANCELING,
    ROBOT_IN_MOTION,
    ROBOT_RESUMING,
    ROBOT_RETRYING_STEP,
    ROBOT_PICKING_UP_TIPS,
    ROBOT_SKIPPING_STEP,
    ROBOT_RELEASING_LABWARE,
  } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')
  const { route } = recoveryMap

  const gripperReleaseCountdown = useGripperRelease({
    recoveryMap,
    recoveryCommands,
    routeUpdateActions,
    doorStatusUtils,
    currentRecoveryOptionUtils,
  })

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
      case ROBOT_RELEASING_LABWARE.ROUTE: {
        if (gripperReleaseCountdown > 0) {
          return t('gripper_will_release_in_s', {
            seconds: gripperReleaseCountdown,
          })
        } else {
          return t('gripper_releasing_labware')
        }
      }
      default:
        return t('stand_back')
    }
  }

  const description = buildDescription()

  return (
    <Flex css={CONTAINER_STYLE}>
      <InProgressModal description={description} />
    </Flex>
  )
}

export const GRIPPER_RELEASE_COUNTDOWN_S = 3

type UseGripperReleaseProps = Pick<
  RecoveryContentProps,
  | 'currentRecoveryOptionUtils'
  | 'recoveryCommands'
  | 'routeUpdateActions'
  | 'doorStatusUtils'
  | 'recoveryMap'
>

// Handles the gripper release copy and action, which operates on an interval. At T=0, release the labware then proceed
// to the next step in the active route if the door is open (which should be a route to handle the door), or to the next
// CTA route if the door is closed.
export function useGripperRelease({
  currentRecoveryOptionUtils,
  recoveryCommands,
  routeUpdateActions,
  doorStatusUtils,
  recoveryMap,
}: UseGripperReleaseProps): number {
  const { releaseGripperJaws, homeExceptPlungers } = recoveryCommands
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const {
    proceedToRouteAndStep,
    proceedNextStep,
    handleMotionRouting,
  } = routeUpdateActions
  const { isDoorOpen } = doorStatusUtils
  const { MANUAL_MOVE_AND_SKIP, MANUAL_REPLACE_AND_RETRY } = RECOVERY_MAP
  const [countdown, setCountdown] = useState(GRIPPER_RELEASE_COUNTDOWN_S)

  const proceedToDoorStep = (): void => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        void proceedToRouteAndStep(
          MANUAL_MOVE_AND_SKIP.ROUTE,
          MANUAL_MOVE_AND_SKIP.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME
        )
        break
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        void proceedToRouteAndStep(
          MANUAL_REPLACE_AND_RETRY.ROUTE,
          MANUAL_REPLACE_AND_RETRY.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME
        )
        break
      default: {
        console.error('Unhandled post grip-release routing when door is open.')
        void proceedToRouteAndStep(RECOVERY_MAP.OPTION_SELECTION.ROUTE)
      }
    }
  }

  const proceedToValidNextStep = (): void => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        void proceedToRouteAndStep(
          MANUAL_MOVE_AND_SKIP.ROUTE,
          MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE
        )
        break
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        void proceedToRouteAndStep(
          MANUAL_REPLACE_AND_RETRY.ROUTE,
          MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE
        )
        break
      default:
        console.error('Unhandled post grip-release routing.')
        void proceedNextStep()
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (recoveryMap.route === RECOVERY_MAP.ROBOT_RELEASING_LABWARE.ROUTE) {
      intervalId = setInterval(() => {
        setCountdown(prevCountdown => {
          const updatedCountdown = prevCountdown - 1

          if (updatedCountdown === 0) {
            if (intervalId != null) {
              clearInterval(intervalId)
            }

            void releaseGripperJaws().then(() => {
              if (isDoorOpen) {
                return handleMotionRouting(false).then(() => {
                  proceedToDoorStep()
                })
              }

              return handleMotionRouting(true)
                .then(() => homeExceptPlungers())
                .then(() => handleMotionRouting(false))
                .then(() => {
                  proceedToValidNextStep()
                })
            })
          }

          return updatedCountdown
        })
      }, 1000)
    }

    return () => {
      if (intervalId != null) {
        clearInterval(intervalId)
      }
    }
  }, [recoveryMap.route])

  return countdown
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
