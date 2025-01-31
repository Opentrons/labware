import { vi, describe, expect, it, beforeEach } from 'vitest'
import { screen, renderHook } from '@testing-library/react'

import { useHost } from '@opentrons/react-api-client'
import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_RUNNING,
  RUN_STATUS_STOP_REQUESTED,
} from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockFailedCommand } from '../__fixtures__'
import { ErrorRecoveryFlows, useErrorRecoveryFlows } from '..'
import {
  useCurrentlyRecoveringFrom,
  useERUtils,
  useRecoveryTakeover,
} from '../hooks'
import { useRecoveryAnalytics } from '/app/redux-resources/analytics'
import { getIsOnDevice } from '/app/redux/config'
import { useERWizard, ErrorRecoveryWizard } from '../ErrorRecoveryWizard'
import { useRecoverySplash, RecoverySplash } from '../RecoverySplash'
import { useRunLoadedLabwareDefinitionsByUri } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type { RunStatus } from '@opentrons/api-client'

vi.mock('../ErrorRecoveryWizard')
vi.mock('../hooks')
vi.mock('../useRecoveryCommands')
vi.mock('/app/redux/config')
vi.mock('../RecoverySplash')
vi.mock('/app/redux-resources/analytics')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useSelector: vi.fn(),
  }
})

describe('useErrorRecoveryFlows', () => {
  beforeEach(() => {
    vi.mocked(useCurrentlyRecoveringFrom).mockReturnValue('mockCommand' as any)
    vi.mocked(useRunLoadedLabwareDefinitionsByUri).mockReturnValue({})
  })

  it('should have initial state of isERActive as false', () => {
    const { result } = renderHook(() =>
      useErrorRecoveryFlows('MOCK_ID', RUN_STATUS_RUNNING)
    )

    expect(result.current.isERActive).toBe(false)
  })

  it('should toggle the value of isERActive properly when the run status is valid and failedCommand is not null', () => {
    const { result, rerender } = renderHook(
      runStatus => useErrorRecoveryFlows('MOCK_ID', runStatus),
      {
        initialProps: RUN_STATUS_AWAITING_RECOVERY,
      }
    )

    expect(result.current.isERActive).toBe(true)

    rerender(RUN_STATUS_STOP_REQUESTED as any)

    expect(result.current.isERActive).toBe(true)
  })

  it('should disable error recovery when runStatus is not a valid ER run status', () => {
    const { result } = renderHook(
      (runStatus: RunStatus) => useErrorRecoveryFlows('MOCK_ID', runStatus),
      {
        initialProps: RUN_STATUS_RUNNING,
      }
    )

    expect(result.current.isERActive).toBe(false)
  })

  it('should return the failed run command', () => {
    const { result } = renderHook(() =>
      useErrorRecoveryFlows('MOCK_ID', RUN_STATUS_RUNNING)
    )

    expect(result.current.failedCommand).toEqual('mockCommand')
  })

  it("should return the run's labware definitions", () => {
    const { result } = renderHook(() =>
      useErrorRecoveryFlows('MOCK_ID', RUN_STATUS_RUNNING)
    )

    expect(result.current.failedCommand).toEqual('mockCommand')
  })

  it(`should return isERActive false if the run status is ${RUN_STATUS_STOP_REQUESTED} before seeing ${RUN_STATUS_AWAITING_RECOVERY}`, () => {
    const { result } = renderHook(() =>
      useErrorRecoveryFlows('MOCK_ID', RUN_STATUS_STOP_REQUESTED)
    )

    expect(result.current.runLwDefsByUri).toEqual({})
  })

  it('should not return isERActive if the run labware defintions is null', () => {
    vi.mocked(useRunLoadedLabwareDefinitionsByUri).mockReturnValue(null)

    const { result } = renderHook(
      runStatus => useErrorRecoveryFlows('MOCK_ID', runStatus),
      {
        initialProps: RUN_STATUS_AWAITING_RECOVERY,
      }
    )
    expect(result.current.isERActive).toBe(false)
  })

  it('should set hasSeenAwaitingRecovery to true when runStatus is RUN_STATUS_AWAITING_RECOVERY', () => {
    const { result, rerender } = renderHook(
      runStatus => useErrorRecoveryFlows('MOCK_ID', runStatus),
      {
        initialProps: RUN_STATUS_RUNNING,
      }
    )

    expect(result.current.isERActive).toBe(false)

    rerender(RUN_STATUS_AWAITING_RECOVERY as any)

    expect(result.current.isERActive).toBe(true)
  })

  it('should set hasSeenAwaitingRecovery to false when runStatus is an invalid ER run status after seeing RUN_STATUS_AWAITING_RECOVERY', () => {
    const { result, rerender } = renderHook(
      runStatus => useErrorRecoveryFlows('MOCK_ID', runStatus),
      {
        initialProps: RUN_STATUS_AWAITING_RECOVERY,
      }
    )

    expect(result.current.isERActive).toBe(true)

    rerender(RUN_STATUS_RUNNING as any)

    expect(result.current.isERActive).toBe(false)
  })
})

const render = (props: ComponentProps<typeof ErrorRecoveryFlows>) => {
  return renderWithProviders(<ErrorRecoveryFlows {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorRecoveryFlows', () => {
  let props: ComponentProps<typeof ErrorRecoveryFlows>

  beforeEach(() => {
    props = {
      runStatus: RUN_STATUS_AWAITING_RECOVERY,
      unvalidatedFailedCommand: mockFailedCommand,
      runId: 'MOCK_RUN_ID',
      protocolAnalysis: null,
      runLwDefsByUri: {},
    }
    vi.mocked(ErrorRecoveryWizard).mockReturnValue(<div>MOCK WIZARD</div>)
    vi.mocked(RecoverySplash).mockReturnValue(<div>MOCK RUN PAUSED SPLASH</div>)
    vi.mocked(useERWizard).mockReturnValue({
      hasLaunchedRecovery: true,
      toggleERWizard: () => Promise.resolve(),
      showERWizard: true,
    })
    vi.mocked(useRecoverySplash).mockReturnValue(true)
    vi.mocked(useERUtils).mockReturnValue({
      routeUpdateActions: {},
      doorStatusUtils: { isDoorOpen: false, isProhibitedDoorOpen: false },
    } as any)
    vi.mocked(useRecoveryAnalytics).mockReturnValue({
      reportErrorEvent: vi.fn(),
    } as any)
    vi.mocked(useHost).mockReturnValue({ robotName: 'MockRobot' } as any)
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    vi.mocked(useRecoveryTakeover).mockReturnValue({
      toggleERWizAsActiveUser: vi.fn(),
      isActiveUser: true,
      intent: 'recovering',
      showTakeover: false,
    })
  })

  it('renders the wizard when showERWizard is true', () => {
    render(props)
    screen.getByText('MOCK WIZARD')
  })

  it('renders the wizard when isDoorOpen is true', () => {
    vi.mocked(useERWizard).mockReturnValue({
      hasLaunchedRecovery: false,
      toggleERWizard: () => Promise.resolve(),
      showERWizard: false,
    })

    vi.mocked(useERUtils).mockReturnValue({
      routeUpdateActions: {},
      doorStatusUtils: { isDoorOpen: true, isProhibitedDoorOpen: true },
    } as any)

    render(props)
    screen.getByText('MOCK WIZARD')
  })

  it('does not render the wizard when showERWizard is false and isDoorOpen is false', () => {
    vi.mocked(useERWizard).mockReturnValue({
      hasLaunchedRecovery: true,
      toggleERWizard: () => Promise.resolve(),
      showERWizard: false,
    })
    vi.mocked(useERUtils).mockReturnValue({
      routeUpdateActions: {},
      doorStatusUtils: { isDoorOpen: false, isProhibitedDoorOpen: false },
    } as any)

    render(props)
    expect(screen.queryByText('MOCK WIZARD')).not.toBeInTheDocument()
  })

  it('renders the splash when showSplash is true', () => {
    render(props)
    screen.getByText('MOCK RUN PAUSED SPLASH')
  })

  it('does not render the splash when showSplash is false', () => {
    vi.mocked(useRecoverySplash).mockReturnValue(false)
    render(props)
    expect(screen.queryByText('MOCK RUN PAUSED SPLASH')).not.toBeInTheDocument()
  })
})
