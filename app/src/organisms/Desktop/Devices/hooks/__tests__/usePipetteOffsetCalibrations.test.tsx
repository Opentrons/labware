import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useAllPipetteOffsetCalibrationsQuery } from '@opentrons/react-api-client'
import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
  mockPipetteOffsetCalibration3,
} from '/app/redux/calibration/pipette-offset/__fixtures__'
import { usePipetteOffsetCalibrations } from '..'

import type { FunctionComponent, ReactNode } from 'react'

vi.mock('@opentrons/react-api-client')

const CALIBRATION_DATA_POLL_MS = 5000

describe('usePipetteOffsetCalibrations hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns empty array when no calibrations found', () => {
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: CALIBRATION_DATA_POLL_MS })
      .thenReturn(null as any)

    const { result } = renderHook(() => usePipetteOffsetCalibrations(), {
      wrapper,
    })

    expect(result.current).toEqual([])
  })

  it('returns pipette offset calibrations when calibrations found', () => {
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: CALIBRATION_DATA_POLL_MS })
      .thenReturn({
        data: {
          data: [
            mockPipetteOffsetCalibration1,
            mockPipetteOffsetCalibration2,
            mockPipetteOffsetCalibration3,
          ],
        },
      } as any)

    const { result } = renderHook(() => usePipetteOffsetCalibrations(), {
      wrapper,
    })

    expect(result.current).toEqual([
      mockPipetteOffsetCalibration1,
      mockPipetteOffsetCalibration2,
      mockPipetteOffsetCalibration3,
    ])
  })
})
