import { when } from 'vitest-when'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  useAllPipetteOffsetCalibrationsQuery,
  useAllTipLengthCalibrationsQuery,
  usePipettesQuery,
} from '@opentrons/react-api-client'

import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
} from '/app/redux/calibration/pipette-offset/__fixtures__'
import {
  mockTipLengthCalibration1,
  mockTipLengthCalibration2,
} from '/app/redux/calibration/tip-length/__fixtures__'

import { useAttachedPipetteCalibrations } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/calibration')
vi.mock('/app/redux/pipettes')
vi.mock('/app/redux/robot-api')

const store: Store<State> = createStore(state => state, {})

const PIPETTE_CALIBRATIONS = {
  left: {
    offset: mockPipetteOffsetCalibration1,
    tipLength: mockTipLengthCalibration1,
  },
  right: {
    offset: mockPipetteOffsetCalibration2,
    tipLength: mockTipLengthCalibration2,
  },
}

describe('useAttachedPipetteCalibrations hook', () => {
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

  it('returns attached pipette calibrations when given a robot name', () => {
    when(vi.mocked(usePipettesQuery))
      .calledWith({}, {})
      .thenReturn({
        data: {
          left: {
            id: mockPipetteOffsetCalibration1.pipette,
            name: 'p300_single_gen2',
            model: 'p300_single_v2.1',
            tip_length: 50,
            mount_axis: 'z',
            plunger_axis: 'b',
          },
          right: {
            id: mockPipetteOffsetCalibration2.pipette,
            name: 'p20_single_gen2',
            model: 'p20_single_v2.1',
            tip_length: 50,
            mount_axis: 'z',
            plunger_axis: 'b',
          },
        },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith()
      .thenReturn({
        data: {
          data: [mockPipetteOffsetCalibration1, mockPipetteOffsetCalibration2],
        },
      } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith()
      .thenReturn({
        data: {
          data: [mockTipLengthCalibration1, mockTipLengthCalibration2],
        },
      } as any)

    const { result } = renderHook(() => useAttachedPipetteCalibrations(), {
      wrapper,
    })

    expect(result.current).toEqual(PIPETTE_CALIBRATIONS)
  })
})
