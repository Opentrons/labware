import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'

import {
  fetchPipetteOffsetCalibrations,
  getCalibrationForPipette,
} from '/app/redux/calibration'
import { mockPipetteOffsetCalibration1 } from '/app/redux/calibration/pipette-offset/__fixtures__'
import { useDispatchApiRequest } from '/app/redux/robot-api'
import { useRobot } from '/app/redux-resources/robots'
import { usePipetteOffsetCalibration } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { DiscoveredRobot } from '/app/redux/discovery/types'
import type { DispatchApiRequestType } from '/app/redux/robot-api'
import type { AttachedPipette, Mount } from '/app/redux/pipettes/types'

vi.mock('/app/redux/calibration')
vi.mock('/app/redux/robot-api')
vi.mock('/app/redux-resources/robots')

const store: Store<any> = createStore(vi.fn(), {})

const ROBOT_NAME = 'otie'
const PIPETTE_ID = 'pipetteId' as AttachedPipette['id']
const MOUNT = 'left' as Mount

describe('usePipetteOffsetCalibration hook', () => {
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
    when(vi.mocked(useRobot))
      .calledWith(ROBOT_NAME)
      .thenReturn(({ status: 'chill' } as unknown) as DiscoveredRobot)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns no pipette offset calibration when given a null robot name and null pipette id', () => {
    vi.mocked(getCalibrationForPipette).mockReturnValue(null)

    const { result } = renderHook(
      () => usePipetteOffsetCalibration(null, null, MOUNT),
      {
        wrapper,
      }
    )

    expect(result.current).toEqual(null)
    expect(dispatchApiRequest).not.toBeCalled()
  })

  it('returns pipette offset calibration when given a robot name, pipette id, and mount', () => {
    when(vi.mocked(getCalibrationForPipette))
      .calledWith(undefined as any, ROBOT_NAME, PIPETTE_ID, MOUNT)
      .thenReturn(mockPipetteOffsetCalibration1)

    const { result } = renderHook(
      () => usePipetteOffsetCalibration(ROBOT_NAME, PIPETTE_ID, MOUNT),
      {
        wrapper,
      }
    )

    expect(result.current).toEqual(mockPipetteOffsetCalibration1)
    expect(dispatchApiRequest).toBeCalledWith(
      vi.mocked(fetchPipetteOffsetCalibrations)(ROBOT_NAME)
    )
  })
})
