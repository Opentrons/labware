import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useCalibrationStatusQuery } from '@opentrons/react-api-client'

import { DECK_CAL_STATUS_OK } from '/app/redux/calibration'
import { getDiscoverableRobotByName } from '/app/redux/discovery'

import { useDeckCalibrationStatus } from '..'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/calibration')
vi.mock('/app/redux/discovery')

const store: Store<any> = createStore(vi.fn(), {})

describe('useDeckCalibrationStatus hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns no deck calibration status when no robot provided', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'null')
      .thenReturn(null)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({}, null)
      .thenReturn({ data: null } as any)

    const { result } = renderHook(() => useDeckCalibrationStatus(null), {
      wrapper,
    })

    expect(result.current).toEqual(null)
  })

  it('returns deck calibration status when given a robot name', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(mockConnectableRobot)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({}, { hostname: mockConnectableRobot.ip })
      .thenReturn({
        data: { deckCalibration: { status: DECK_CAL_STATUS_OK } },
      } as any)

    const { result } = renderHook(() => useDeckCalibrationStatus('otie'), {
      wrapper,
    })

    expect(result.current).toEqual('OK')
  })
})
