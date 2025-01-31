import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { QueryClient, QueryClientProvider } from 'react-query'
import { renderHook } from '@testing-library/react'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { when } from 'vitest-when'

import { mockTipRackDefinition } from '/app/redux/custom-labware/__fixtures__'
import {
  useRunCalibrationStatus,
  useRunPipetteInfoByMount,
  useNotifyRunQuery,
} from '..'
import { useDeckCalibrationStatus } from '/app/resources/calibration'
import { useIsFlex } from '/app/redux-resources/robots'

import type { FunctionComponent, ReactNode } from 'react'
import type { PipetteInfo } from '/app/redux/pipettes'

vi.mock('../useRunPipetteInfoByMount')
vi.mock('../useNotifyRunQuery')
vi.mock('/app/resources/calibration')
vi.mock('/app/resources/analysis')
vi.mock('/app/redux-resources/robots')

let wrapper: FunctionComponent<{ children: ReactNode }>

describe('useRunCalibrationStatus hook', () => {
  beforeEach(() => {
    when(vi.mocked(useDeckCalibrationStatus))
      .calledWith('otie')
      .thenReturn('OK')

    when(vi.mocked(useRunPipetteInfoByMount)).calledWith('1').thenReturn({
      left: null,
      right: null,
    })
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(false)
    vi.mocked(useNotifyRunQuery).mockReturnValue({} as any)

    const store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    store.getState = vi.fn(() => {})

    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>{children}</Provider>
      </QueryClientProvider>
    )
  })

  it('should return deck cal failure if not calibrated', () => {
    when(vi.mocked(useDeckCalibrationStatus))
      .calledWith('otie')
      .thenReturn('BAD_CALIBRATION')
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: false,
      reason: 'calibrate_deck_failure_reason',
    })
  })
  it('should ignore deck calibration status of a Flex', () => {
    when(vi.mocked(useDeckCalibrationStatus))
      .calledWith('otie')
      .thenReturn('BAD_CALIBRATION')
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(true)
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: true,
    })
  })
  it('should return attach pipette if missing', () => {
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith('1')
      .thenReturn({
        left: {
          requestedPipetteMatch: 'incompatible',
          pipetteCalDate: null,
          pipetteSpecs: {
            displayName: 'pipette 1',
          },
          tipRacksForPipette: [
            {
              displayName: 'Mock TipRack Definition',
              lastModifiedDate: '',
              tipRackDef: mockTipRackDefinition,
            },
          ],
        } as PipetteInfo,
        right: null,
      })
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: false,
      reason: 'attach_pipette_failure_reason',
    })
  })
  it('should return calibrate pipette if cal date null', () => {
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith('1')
      .thenReturn({
        left: {
          requestedPipetteMatch: 'match',
          pipetteCalDate: null,
          pipetteSpecs: {
            displayName: 'pipette 1',
          },
          tipRacksForPipette: [
            {
              displayName: 'Mock TipRack Definition',
              lastModifiedDate: '',
              tipRackDef: mockTipRackDefinition,
            },
          ],
        } as PipetteInfo,
        right: null,
      })
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: false,
      reason: 'calibrate_pipette_failure_reason',
    })
  })
  it('should return calibrate tip rack if cal date null', () => {
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith('1')
      .thenReturn({
        left: {
          requestedPipetteMatch: 'match',
          pipetteCalDate: '2020-08-30T10:02',
          pipetteSpecs: {
            displayName: 'pipette 1',
          },
          tipRacksForPipette: [
            {
              displayName: 'Mock TipRack Definition',
              lastModifiedDate: null,
              tipRackDef: mockTipRackDefinition,
            },
          ],
        } as PipetteInfo,
        right: null,
      })
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: false,
      reason: 'calibrate_tiprack_failure_reason',
    })
  })
  it('should ignore tip rack calibration for the Flex', () => {
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith('1')
      .thenReturn({
        left: {
          requestedPipetteMatch: 'match',
          pipetteCalDate: '2020-08-30T10:02',
          pipetteSpecs: {
            displayName: 'pipette 1',
          },
          tipRacksForPipette: [
            {
              displayName: 'Mock TipRack Definition',
              lastModifiedDate: null,
              tipRackDef: mockTipRackDefinition,
            },
          ],
        } as PipetteInfo,
        right: null,
      })
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(true)
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: true,
    })
  })
  it('should return complete if everything is calibrated', () => {
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith('1')
      .thenReturn({
        left: {
          requestedPipetteMatch: 'match',
          pipetteCalDate: '2020-08-30T10:02',
          pipetteSpecs: {
            displayName: 'pipette 1',
          },
          tipRacksForPipette: [
            {
              displayName: 'Mock TipRack Definition',
              lastModifiedDate: '2020-08-30T10:02',
              tipRackDef: mockTipRackDefinition,
            },
          ],
        } as PipetteInfo,
        right: null,
      })
    const { result } = renderHook(() => useRunCalibrationStatus('otie', '1'), {
      wrapper,
    })
    expect(result.current).toStrictEqual({
      complete: true,
    })
  })
})
