import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { QueryClient, QueryClientProvider } from 'react-query'
import { renderHook } from '@testing-library/react'
import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'

import { useModuleCalibrationStatus } from '../useModuleCalibrationStatus'
import { useModuleRenderInfoForProtocolById } from '../useModuleRenderInfoForProtocolById'
import { useIsFlex } from '/app/redux-resources/robots'

import { mockMagneticModuleGen2 } from '/app/redux/modules/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { ModuleModel, ModuleType } from '@opentrons/shared-data'

vi.mock('/app/redux-resources/robots')
vi.mock('../useModuleRenderInfoForProtocolById')

let wrapper: FunctionComponent<{ children: ReactNode }>

const mockMagneticModuleDefinition = {
  moduleId: 'someMagneticModule',
  model: 'magneticModuleV2' as ModuleModel,
  type: 'magneticModuleType' as ModuleType,
  labwareOffset: { x: 5, y: 5, z: 5 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  dimensions: {
    xDimension: 100,
    yDimension: 100,
    footprintXDimension: 50,
    footprintYDimension: 50,
    labwareInterfaceXDimension: 80,
    labwareInterfaceYDimension: 120,
  },
  twoDimensionalRendering: { children: [] },
}

const MAGNETIC_MODULE_INFO = {
  moduleId: 'magneticModuleId',
  x: 0,
  y: 0,
  z: 0,
  moduleDef: mockMagneticModuleDefinition as any,
  nestedLabwareDef: null,
  nestedLabwareId: null,
  nestedLabwareDisplayName: null,
  protocolLoadOrder: 0,
  slotName: '1',
}

const mockOffsetData = {
  offset: {
    x: 0.2578125,
    y: -0.3515625,
    z: -0.7515000000000001,
  },
  slot: 'D1',
  last_modified: '2023-10-11T14:11:14.061780+00:00',
}

describe('useModuleCalibrationStatus hook', () => {
  beforeEach(() => {
    const queryClient = new QueryClient()
    const store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    store.getState = vi.fn(() => {})

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>{children}</Provider>
      </QueryClientProvider>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return calibration complete if OT-2', () => {
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(false)
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith('1')
      .thenReturn({})

    const { result } = renderHook(
      () => useModuleCalibrationStatus('otie', '1'),
      { wrapper }
    )

    expect(result.current).toEqual({ complete: true })
  })

  it('should return calibration complete if no modules needed', () => {
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(true)
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith('1')
      .thenReturn({})

    const { result } = renderHook(
      () => useModuleCalibrationStatus('otie', '1'),
      { wrapper }
    )

    expect(result.current).toEqual({ complete: true })
  })

  it('should return calibration complete if offset date exists', () => {
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(true)
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith('1')
      .thenReturn({
        magneticModuleId: {
          attachedModuleMatch: {
            ...mockMagneticModuleGen2,
            moduleOffset: mockOffsetData,
          },
          conflictedFixture: null,
          ...MAGNETIC_MODULE_INFO,
        },
      })

    const { result } = renderHook(
      () => useModuleCalibrationStatus('otie', '1'),
      { wrapper }
    )

    expect(result.current).toEqual({ complete: true })
  })

  it('should return calibration needed if offset date does not exist', () => {
    when(vi.mocked(useIsFlex)).calledWith('otie').thenReturn(true)
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith('1')
      .thenReturn({
        magneticModuleId: {
          attachedModuleMatch: {
            ...mockMagneticModuleGen2,
          },
          conflictedFixture: null,
          ...MAGNETIC_MODULE_INFO,
        },
      })

    const { result } = renderHook(
      () => useModuleCalibrationStatus('otie', '1'),
      { wrapper }
    )

    expect(result.current).toEqual({
      complete: false,
      reason: 'calibrate_module_failure_reason',
    })
  })
})
