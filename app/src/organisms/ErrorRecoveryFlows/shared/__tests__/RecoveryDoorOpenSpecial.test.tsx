import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import {
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY,
} from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RecoveryDoorOpenSpecial } from '../RecoveryDoorOpenSpecial'
import { RECOVERY_MAP } from '../../constants'

import type { ComponentProps } from 'react'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'

describe('RecoveryDoorOpenSpecial', () => {
  let props: ComponentProps<typeof RecoveryDoorOpenSpecial>

  beforeEach(() => {
    props = {
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
      },
      runStatus: RUN_STATUS_AWAITING_RECOVERY,
      recoveryActionMutationUtils: {
        resumeRecovery: vi.fn(),
      },
      routeUpdateActions: {
        proceedToRouteAndStep: vi.fn(),
        handleMotionRouting: vi.fn().mockImplementation(_ => Promise.resolve()),
      },
      doorStatusUtils: {
        isDoorOpen: true,
      },
      recoveryCommands: {
        homeExceptPlungers: vi.fn().mockResolvedValue(undefined),
      },
    } as any
  })

  const render = (props: ComponentProps<typeof RecoveryDoorOpenSpecial>) => {
    return renderWithProviders(<RecoveryDoorOpenSpecial {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it('calls resumeRecovery when primary button is clicked', async () => {
    render(props)

    clickButtonLabeled('Continue')

    expect(props.recoveryActionMutationUtils.resumeRecovery).toHaveBeenCalled()
  })

  it(`disables primary button when runStatus is ${RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR}`, () => {
    props.runStatus = RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
    render(props)

    const btn = screen.getAllByRole('button', { name: 'Continue' })[0]

    expect(btn).toBeDisabled()
  })

  it(`renders correct copy for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE
    render(props)
    screen.getByText('Close the robot door')
    screen.getByText(
      'The robot needs to safely move to its home location before you manually move the labware.'
    )
  })

  it.each([
    {
      recoveryOption: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
      expectedRoute: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
      expectedStep: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE,
    },
    {
      recoveryOption: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
      expectedRoute: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
      expectedStep: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE,
    },
  ])(
    'executes correct chain of actions when door is closed for $recoveryOption',
    async ({ recoveryOption, expectedRoute, expectedStep }) => {
      props.currentRecoveryOptionUtils.selectedRecoveryOption = recoveryOption
      props.doorStatusUtils.isDoorOpen = false

      render(props)

      await waitFor(() => {
        expect(
          props.routeUpdateActions.handleMotionRouting
        ).toHaveBeenCalledWith(true, RECOVERY_MAP.ROBOT_IN_MOTION.ROUTE)
      })

      await waitFor(() => {
        expect(props.recoveryCommands.homeExceptPlungers).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(
          props.routeUpdateActions.handleMotionRouting
        ).toHaveBeenCalledWith(false)
      })

      await waitFor(() => {
        expect(
          props.routeUpdateActions.proceedToRouteAndStep
        ).toHaveBeenCalledWith(expectedRoute, expectedStep)
      })
    }
  )

  it('renders default subtext for an unhandled recovery option', () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption = 'UNHANDLED_OPTION' as any
    render(props)
    screen.getByText('Close the robot door')
    screen.getByText(
      'Close the robot door, and then resume the recovery action.'
    )
  })

  it('calls proceedToRouteAndStep with OPTION_SELECTION for unhandled recovery option when door is closed', () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption = 'UNHANDLED_OPTION' as any
    props.doorStatusUtils.isDoorOpen = false
    render(props)
    expect(props.routeUpdateActions.proceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.OPTION_SELECTION.ROUTE
    )
  })
})
