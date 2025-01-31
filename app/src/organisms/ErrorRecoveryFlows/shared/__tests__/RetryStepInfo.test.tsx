import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RetryStepInfo } from '../RetryStepInfo'
import { ERROR_KINDS, RECOVERY_MAP } from '../../constants'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

describe('RetryStepInfo', () => {
  let props: ComponentProps<typeof RetryStepInfo>
  let mockHandleMotionRouting: Mock
  let mockRetryFailedCommand: Mock
  let mockResumeRun: Mock

  beforeEach(() => {
    mockHandleMotionRouting = vi.fn(() => Promise.resolve())
    mockRetryFailedCommand = vi.fn(() => Promise.resolve())
    mockResumeRun = vi.fn()

    props = {
      routeUpdateActions: {
        handleMotionRouting: mockHandleMotionRouting,
      } as any,
      recoveryCommands: {
        retryFailedCommand: mockRetryFailedCommand,
        resumeRun: mockResumeRun,
      } as any,
      errorKind: ERROR_KINDS.GENERAL_ERROR,
      stepCounts: { hasRunDiverged: false },
    } as any
  })

  const render = (props: ComponentProps<typeof RetryStepInfo>) => {
    return renderWithProviders(<RetryStepInfo {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it('calls correct functions when primary button is clicked', async () => {
    render(props)

    clickButtonLabeled('Retry now')

    await waitFor(() => {
      expect(mockHandleMotionRouting).toHaveBeenCalledWith(
        true,
        RECOVERY_MAP.ROBOT_RETRYING_STEP.ROUTE
      )
    })
    await waitFor(() => {
      expect(mockRetryFailedCommand).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockResumeRun).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockHandleMotionRouting.mock.invocationCallOrder[0]).toBeLessThan(
        mockRetryFailedCommand.mock.invocationCallOrder[0]
      )
    })
    await waitFor(() => {
      expect(mockRetryFailedCommand.mock.invocationCallOrder[0]).toBeLessThan(
        mockResumeRun.mock.invocationCallOrder[0]
      )
    })
  })

  it(`renders correct body text for ${ERROR_KINDS.TIP_NOT_DETECTED} error`, () => {
    props.errorKind = ERROR_KINDS.TIP_NOT_DETECTED

    render(props)

    screen.getByText(
      'First, take any necessary actions to prepare the robot to retry the failed tip pickup.'
    )
    screen.getByText('Then, close the robot door before proceeding.')
  })

  it(`renders correct body text for ${ERROR_KINDS.TIP_DROP_FAILED} error`, () => {
    props.errorKind = ERROR_KINDS.TIP_DROP_FAILED

    render(props)

    screen.getByText(
      'First, take any necessary actions to prepare the robot to retry the failed tip drop.'
    )
    screen.getByText('Then, close the robot door before proceeding.')
  })

  it(`renders correct body text for ${ERROR_KINDS.GRIPPER_ERROR}`, () => {
    props.errorKind = ERROR_KINDS.GRIPPER_ERROR

    render(props)

    screen.getByText(
      'The robot will retry the failed labware movement step from where the labware was replaced on the deck.'
    )
    screen.getByText('Close the robot door before proceeding.')
  })

  it('renders default body text for other error kinds', () => {
    props.errorKind = ERROR_KINDS.GENERAL_ERROR

    render(props)

    screen.getByText(
      'Take any necessary additional actions to prepare the robot to retry the failed step.'
    )
    screen.getByText('Close the robot door before proceeding.')
  })
})
