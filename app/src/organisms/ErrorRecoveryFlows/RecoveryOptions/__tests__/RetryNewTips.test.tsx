import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RetryNewTips, RetryWithNewTips } from '../RetryNewTips'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'
import { clickButtonLabeled } from '../../__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/molecules/Command')
vi.mock('../SelectRecoveryOption')
vi.mock('../../shared', async () => {
  const actual = await vi.importActual('../../shared')
  return {
    ...actual,
    TwoColLwInfoAndDeck: vi.fn(() => <div>MOCK_REPLACE_TIPS</div>),
    SelectTips: vi.fn(() => <div>MOCK_SELECT_TIPS</div>),
  }
})

const render = (props: ComponentProps<typeof RetryNewTips>) => {
  return renderWithProviders(<RetryNewTips {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const renderRetryWithNewTips = (
  props: ComponentProps<typeof RetryWithNewTips>
) => {
  return renderWithProviders(<RetryWithNewTips {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RetryNewTips', () => {
  let props: ComponentProps<typeof RetryNewTips>
  let mockProceedToRouteAndStep: Mock

  beforeEach(() => {
    mockProceedToRouteAndStep = vi.fn()

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        proceedToRouteAndStep: mockProceedToRouteAndStep,
      } as any,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
  })

  it(`renders ReplaceTips when step is ${RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.REPLACE_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.REPLACE_TIPS,
      },
    }
    render(props)
    screen.getByText('MOCK_REPLACE_TIPS')
  })

  it(`renders SelectTips when step is ${RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.SELECT_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.SELECT_TIPS,
      },
    }
    render(props)
    screen.getByText('MOCK_SELECT_TIPS')
  })

  it(`renders RetryWithNewTips when step is ${RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.RETRY}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.RETRY,
      },
    }
    render(props)
    screen.getByText('Retry with new tips')
  })

  it('renders SelectRecoveryOption as a fallback', () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: 'UNKNOWN_STEP' as any,
      },
    }
    render(props)
    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })

  it(`proceeds to ${RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE} route and ${RECOVERY_MAP.DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING} step when step is ${RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.DROP_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.RETRY_NEW_TIPS.STEPS.DROP_TIPS,
      },
    }
    render(props)
    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE,
      RECOVERY_MAP.DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING
    )
  })
})

describe('RetryWithNewTips', () => {
  let props: ComponentProps<typeof RetryWithNewTips>
  let mockhandleMotionRouting: Mock
  let mockRetryFailedCommand: Mock
  let mockResumeRun: Mock

  beforeEach(() => {
    mockhandleMotionRouting = vi.fn(() => Promise.resolve())
    mockRetryFailedCommand = vi.fn(() => Promise.resolve())
    mockResumeRun = vi.fn()

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        handleMotionRouting: mockhandleMotionRouting,
      } as any,
      recoveryCommands: {
        retryFailedCommand: mockRetryFailedCommand,
        resumeRun: mockResumeRun,
      } as any,
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the component with the correct text', () => {
    renderRetryWithNewTips(props)
    screen.getByText('Retry with new tips')
    screen.queryByText('The robot will retry the step with the new tips.')
    screen.queryByText('Close the robot door before proceeding.')
  })

  it('calls the correct routeUpdateActions and recoveryCommands in the correct order when the primary button is clicked', async () => {
    renderRetryWithNewTips(props)
    clickButtonLabeled('Retry now')

    await waitFor(() => {
      expect(mockhandleMotionRouting).toHaveBeenCalledWith(
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

    expect(mockhandleMotionRouting.mock.invocationCallOrder[0]).toBeLessThan(
      mockRetryFailedCommand.mock.invocationCallOrder[0]
    )
    expect(mockRetryFailedCommand.mock.invocationCallOrder[0]).toBeLessThan(
      mockResumeRun.mock.invocationCallOrder[0]
    )
  })
})
