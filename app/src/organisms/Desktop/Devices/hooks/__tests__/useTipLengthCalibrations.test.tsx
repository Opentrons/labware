import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { renderHook } from '@testing-library/react'
import { useAllTipLengthCalibrationsQuery } from '@opentrons/react-api-client'
import {
  mockTipLengthCalibration1,
  mockTipLengthCalibration2,
  mockTipLengthCalibration3,
} from '/app/redux/calibration/tip-length/__fixtures__'
import { useTipLengthCalibrations } from '..'

import type { FunctionComponent, ReactNode } from 'react'

vi.mock('@opentrons/react-api-client')

const CALIBRATIONS_FETCH_MS = 5000

describe('useTipLengthCalibrations hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    afterEach(() => {
      vi.resetAllMocks()
    })
  })

  it('returns an empty array when no tip length calibrations found', () => {
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({
        refetchInterval: CALIBRATIONS_FETCH_MS,
      })
      .thenReturn(null as any)

    const { result } = renderHook(() => useTipLengthCalibrations(), {
      wrapper,
    })

    expect(result.current).toEqual([])
  })

  it('returns tip length calibrations when found', () => {
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({
        refetchInterval: CALIBRATIONS_FETCH_MS,
      })
      .thenReturn({
        data: {
          data: [
            mockTipLengthCalibration1,
            mockTipLengthCalibration2,
            mockTipLengthCalibration3,
          ],
        },
      } as any)

    const { result } = renderHook(() => useTipLengthCalibrations(), {
      wrapper,
    })

    expect(result.current).toEqual([
      mockTipLengthCalibration1,
      mockTipLengthCalibration2,
      mockTipLengthCalibration3,
    ])
  })
})
