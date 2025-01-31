import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, renderHook } from '@testing-library/react'
import { createStore } from 'redux'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Provider } from 'react-redux'

import {
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
} from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '../__fixtures__'
import { getIsOnDevice } from '/app/redux/config'
import { useRecoverySplash, RecoverySplash } from '../RecoverySplash'
import { StepInfo } from '../shared'
import { useToaster } from '../../ToasterOven'
import { clickButtonLabeled } from './util'

import type { ComponentProps, FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('/app/redux/config')
vi.mock('../shared')
vi.mock('../../ToasterOven')

const store: Store<any> = createStore(vi.fn(), {})

describe('useRunPausedSplash', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
  })

  const TEST_CASES = [
    { isOnDevice: true, showERWizard: true, expected: true },
    { isOnDevice: true, showERWizard: false, expected: true },
    { isOnDevice: false, showERWizard: true, expected: false },
    { isOnDevice: false, showERWizard: false, expected: true },
  ]

  describe('useRunPausedSplash', () => {
    TEST_CASES.forEach(({ isOnDevice, showERWizard, expected }) => {
      it(`returns ${expected} when isOnDevice is ${isOnDevice} and showERWizard is ${showERWizard}`, () => {
        const { result } = renderHook(
          () => useRecoverySplash(isOnDevice, showERWizard),
          {
            wrapper,
          }
        )
        expect(result.current).toEqual(expected)
      })
    })
  })
})

const render = (props: ComponentProps<typeof RecoverySplash>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RecoverySplash {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('RecoverySplash', () => {
  let props: ComponentProps<typeof RecoverySplash>
  const mockToggleERWiz = vi.fn(() => Promise.resolve())
  const mockProceedToRouteAndStep = vi.fn()
  const mockHandleMotionRouting = vi.fn(() => Promise.resolve())
  const mockRouteUpdateActions = {
    proceedToRouteAndStep: mockProceedToRouteAndStep,
    handleMotionRouting: mockHandleMotionRouting,
  } as any
  const mockMakeToast = vi.fn()
  const mockResumeRecovery = vi.fn()
  const mockHomePipetteZAxes = vi.fn(() => Promise.resolve())

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      robotName: 'testRobot',
      toggleERWizAsActiveUser: mockToggleERWiz,
      routeUpdateActions: mockRouteUpdateActions,
      recoveryActionMutationUtils: {
        resumeRecovery: mockResumeRecovery,
      } as any,
      resumePausedRecovery: true,
      recoveryCommands: { homePipetteZAxes: mockHomePipetteZAxes } as any,
    }

    vi.mocked(StepInfo).mockReturnValue(<div>MOCK STEP INFO</div>)
    vi.mocked(useToaster).mockReturnValue({ makeToast: mockMakeToast } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render a generic paused screen if there is no handled errorType', () => {
    render(props)
    screen.getByText('Tip not detected')
    screen.getByText('MOCK STEP INFO')
  })

  it('should render an overpressure error type if the errorType is overpressure', () => {
    props = {
      ...props,
      failedCommand: {
        byRunRecord: {
          ...props.failedCommand?.byRunRecord,
          commandType: 'aspirate',
          error: { isDefined: true, errorType: 'overpressure' },
        },
      } as any,
    }
    render(props)
    screen.getByText('Pipette overpressure')
    screen.getByText('MOCK STEP INFO')
  })

  it('should contain buttons with expected appearance and behavior', async () => {
    render(props)

    const primaryBtn = screen.getByRole('button', {
      name: 'Launch recovery mode',
    })
    const secondaryBtn = screen.getByRole('button', { name: 'Cancel run' })

    expect(primaryBtn).toBeInTheDocument()
    expect(secondaryBtn).toBeInTheDocument()

    fireEvent.click(secondaryBtn)

    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledWith(true, false)
    })
    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledTimes(1)
    })

    expect(mockToggleERWiz.mock.invocationCallOrder[0]).toBeLessThan(
      mockProceedToRouteAndStep.mock.invocationCallOrder[0]
    )

    fireEvent.click(primaryBtn)
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledWith(true, true)
    })

    expect(mockHandleMotionRouting).toHaveBeenNthCalledWith(1, true)
    expect(mockHandleMotionRouting).toHaveBeenNthCalledWith(2, false)

    await waitFor(() => {
      expect(props.recoveryCommands.homePipetteZAxes).toHaveBeenCalled()
    })
  })

  it('should render a door open toast if the door is open', () => {
    props = {
      ...props,
      runStatus: RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
    }

    render(props)

    clickButtonLabeled('Launch recovery mode')

    expect(mockMakeToast).toHaveBeenCalled()
  })

  it(`should transition the run status from ${RUN_STATUS_AWAITING_RECOVERY_PAUSED} to ${RUN_STATUS_AWAITING_RECOVERY} when resumePausedRecovery is true`, () => {
    props = { ...props, runStatus: RUN_STATUS_AWAITING_RECOVERY_PAUSED }

    render(props)

    expect(mockResumeRecovery).toHaveBeenCalled()
  })
})
