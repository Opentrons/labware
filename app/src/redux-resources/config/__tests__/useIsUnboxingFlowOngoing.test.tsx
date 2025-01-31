import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import { getIsOnDevice, getOnDeviceDisplaySettings } from '/app/redux/config'
import { useIsUnboxingFlowOngoing } from '../useIsUnboxingFlowOngoing'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/config')

const store: Store<State> = createStore(vi.fn(), {})

const mockDisplaySettings = {
  sleepMs: 604800000,
  brightness: 4,
  textSize: 1,
  unfinishedUnboxingFlowRoute: null,
}

describe('useIsUnboxingFlowOngoing', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    wrapper = ({ children }) => <Provider store={store}>{children}</Provider>
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue(mockDisplaySettings)
    vi.mocked(getIsOnDevice).mockReturnValue(true)
  })

  it('should return true if unfinishedUnboxingFlowRoute is /welcome', () => {
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue({
      ...mockDisplaySettings,
      unfinishedUnboxingFlowRoute: '/welcome',
    })
    const { result } = renderHook(() => useIsUnboxingFlowOngoing(), {
      wrapper,
    })
    expect(result.current).toBe(true)
  })

  it('should return true if unfinishedUnboxingFlowRoute is /emergency-stop', () => {
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue({
      ...mockDisplaySettings,
      unfinishedUnboxingFlowRoute: '/emergency-stop',
    })
    const { result } = renderHook(() => useIsUnboxingFlowOngoing(), {
      wrapper,
    })
    expect(result.current).toBe(true)
  })

  it('should return false if unfinishedUnboxingFlowRoute is null', () => {
    const { result } = renderHook(() => useIsUnboxingFlowOngoing(), {
      wrapper,
    })
    expect(result.current).toBe(false)
  })
})
