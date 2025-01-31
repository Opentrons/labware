import { describe, it, beforeEach, vi, expect } from 'vitest'

import { screen } from '@testing-library/react'
import { RUN_STATUS_AWAITING_RECOVERY_PAUSED } from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockRecoveryContentProps } from '../__fixtures__'
import { i18n } from '/app/i18n'
import { RecoveryDoorOpen } from '../RecoveryDoorOpen'
import { clickButtonLabeled } from './util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

const render = (props: ComponentProps<typeof RecoveryDoorOpen>) => {
  return renderWithProviders(<RecoveryDoorOpen {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RecoveryDoorOpen', () => {
  let props: ComponentProps<typeof RecoveryDoorOpen>
  let mockResumeRecovery: Mock
  let mockProceedToRouteAndStep: Mock

  beforeEach(() => {
    mockResumeRecovery = vi.fn().mockResolvedValue(undefined)
    mockProceedToRouteAndStep = vi.fn()
    props = {
      ...mockRecoveryContentProps,
      recoveryActionMutationUtils: {
        resumeRecovery: mockResumeRecovery,
        isResumeRecoveryLoading: false,
      },
      runStatus: RUN_STATUS_AWAITING_RECOVERY_PAUSED,
      routeUpdateActions: {
        stashedMap: null,
        proceedToRouteAndStep: mockProceedToRouteAndStep,
      } as any,
    }
  })

  it('renders the correct content', () => {
    render(props)

    screen.getByTestId('recovery_door_alert_icon')
    screen.getByText('Robot door is open')
    screen.getByText(
      'Close the robot door, and then resume the recovery action.'
    )
  })

  it(`calls resumeRecovery when the primary button is clicked and the run status is ${RUN_STATUS_AWAITING_RECOVERY_PAUSED}`, () => {
    render(props)

    clickButtonLabeled('Resume')

    expect(mockResumeRecovery).toHaveBeenCalledTimes(1)
  })

  it('calls proceedToRouteAndStep after resumeRecovery if stashedMap is provided', async () => {
    const stashedMap = { route: 'testRoute', step: 'testStep' } as any
    props.routeUpdateActions.stashedMap = stashedMap

    render(props)

    clickButtonLabeled('Resume')

    await vi.waitFor(() => {
      expect(mockResumeRecovery).toHaveBeenCalledTimes(1)
      expect(mockProceedToRouteAndStep).toHaveBeenCalledTimes(1)
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        stashedMap.route,
        stashedMap.step
      )
    })
  })
})
