import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SkipStepInfo } from '../SkipStepInfo'
import { RECOVERY_MAP } from '../../constants'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

describe('SkipStepInfo', () => {
  let props: ComponentProps<typeof SkipStepInfo>
  let mockHandleMotionRouting: Mock
  let mockSkipFailedCommand: Mock

  beforeEach(() => {
    mockHandleMotionRouting = vi.fn(() => Promise.resolve())
    mockSkipFailedCommand = vi.fn(() => Promise.resolve())

    props = {
      routeUpdateActions: {
        handleMotionRouting: mockHandleMotionRouting,
      } as any,
      recoveryCommands: {
        skipFailedCommand: mockSkipFailedCommand,
      } as any,
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE,
      } as any,
      stepCounts: { hasRunDiverged: false },
    } as any
  })

  const render = (props: ComponentProps<typeof SkipStepInfo>) => {
    return renderWithProviders(<SkipStepInfo {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it('calls correct functions when primary button is clicked', async () => {
    render(props)

    clickButtonLabeled('Continue run now')

    await waitFor(() => {
      expect(mockHandleMotionRouting).toHaveBeenCalledWith(
        true,
        RECOVERY_MAP.ROBOT_SKIPPING_STEP.ROUTE
      )
    })
    await waitFor(() => {
      expect(mockSkipFailedCommand).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockHandleMotionRouting.mock.invocationCallOrder[0]).toBeLessThan(
        mockSkipFailedCommand.mock.invocationCallOrder[0]
      )
    })
  })

  it(`renders correct title and body text for ${RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE
    render(props)

    screen.getByText('Skip to next step')
    screen.getByText(
      "First, inspect the robot to ensure it's prepared to continue the run from the next step."
    )
    screen.getByText('Then, close the robot door before proceeding.')
  })

  it(`renders correct title and body text for ${RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE
    render(props)

    screen.getByText('Skip to next step with same tips')
    screen.getByText(
      'The failed dispense step will not be completed. The run will continue from the next step with the attached tips.'
    )
    screen.getByText('Close the robot door before proceeding.')
  })

  it(`renders correct title and body text for ${RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE
    render(props)

    screen.getByText('Skip to next step with new tips')
    screen.getByText(
      'The failed dispense step will not be completed. The run will continue from the next step with the attached tips.'
    )
    screen.getByText('Close the robot door before proceeding.')
  })

  it(`renders correct title and body text for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE
    render(props)

    screen.getByText('Skip to next step')
    screen.getByText(
      'The robot will not attempt to move the labware again. The run will continue from the next step.'
    )
    screen.getByText('Close the robot door before proceeding.')
  })

  it('renders error message for unexpected recovery option', () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption = 'UNEXPECTED_ROUTE' as any
    render(props)

    expect(screen.getAllByText('UNEXPECTED STEP')[0]).toBeInTheDocument()
  })
})
