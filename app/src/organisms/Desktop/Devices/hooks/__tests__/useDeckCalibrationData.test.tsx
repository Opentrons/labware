import { when } from 'vitest-when'
import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useCalibrationStatusQuery } from '@opentrons/react-api-client'

import {
  DECK_CAL_STATUS_OK,
  DECK_CAL_STATUS_BAD_CALIBRATION,
  DECK_CAL_STATUS_IDENTITY,
} from '/app/redux/calibration'
import { getDiscoverableRobotByName } from '/app/redux/discovery'
import { mockDeckCalData } from '/app/redux/calibration/__fixtures__'
import { useDispatchApiRequest } from '/app/redux/robot-api'
import { useDeckCalibrationData } from '..'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { DispatchApiRequestType } from '/app/redux/robot-api'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/calibration')
vi.mock('/app/redux/robot-api')
vi.mock('/app/redux/discovery')

const store: Store<any> = createStore(vi.fn(), {})

describe('useDeckCalibrationData hook', () => {
  let dispatchApiRequest: DispatchApiRequestType
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    dispatchApiRequest = vi.fn()
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
    vi.mocked(useDispatchApiRequest).mockReturnValue([dispatchApiRequest, []])
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns no deck calibration data when given a null robot name', () => {
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({}, null)
      .thenReturn({
        data: {
          data: {
            deckCalibration: {
              data: mockDeckCalData,
              status: DECK_CAL_STATUS_IDENTITY,
            },
          },
        },
      } as any)

    const { result } = renderHook(() => useDeckCalibrationData(null), {
      wrapper,
    })

    expect(result.current).toEqual({
      deckCalibrationData: null,
      isDeckCalibrated: false,
      markedBad: false,
    })
    expect(dispatchApiRequest).not.toBeCalled()
  })

  it('returns deck calibration data when given a robot name', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(mockConnectableRobot)

    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({}, { hostname: mockConnectableRobot.ip })
      .thenReturn({
        data: {
          deckCalibration: {
            data: mockDeckCalData,
            status: DECK_CAL_STATUS_OK,
          },
        },
      } as any)

    const { result } = renderHook(() => useDeckCalibrationData('otie'), {
      wrapper,
    })

    expect(result.current).toEqual({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: true,
      markedBad: false,
    })
  })

  it('returns markedBad deck calibration data when given a failed status', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(mockConnectableRobot)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({}, { hostname: mockConnectableRobot.ip })
      .thenReturn({
        data: {
          deckCalibration: {
            data: mockDeckCalData,
            status: DECK_CAL_STATUS_BAD_CALIBRATION,
          },
        },
      } as any)

    const { result } = renderHook(() => useDeckCalibrationData('otie'), {
      wrapper,
    })

    expect(result.current).toEqual({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: false,
      markedBad: true,
    })
  })
})
