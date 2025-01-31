import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScreenIdle } from '../useScreenIdle'
import { SLEEP_NEVER_MS } from '/app/local-resources/dom-utils'

const MOCK_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'click',
  'scroll',
]

const MOCK_OPTIONS = {
  events: MOCK_EVENTS,
  initialState: false,
}

describe('useIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('should return the default initialState', () => {
    const mockTime = 1000
    const { result } = renderHook(() => useScreenIdle(mockTime))
    expect(result.current).toBe(true)
  })

  it('should return the given initialState', () => {
    const mockTime = 1000
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
  })

  it('should return true after 1000ms', () => {
    const mockTime = 1000
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
    setTimeout(() => {
      expect(result.current).toBe(true)
    }, 1001)
  })

  it('should return true after 180,000ms - 3min', () => {
    const mockTime = 60 * 1000 * 3
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
    setTimeout(() => {
      expect(result.current).toBe(true)
    }, 180001)
  })

  it('should return true after 180,0000ms - 30min', () => {
    const mockTime = 60 * 1000 * 30
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
    setTimeout(() => {
      expect(result.current).toBe(true)
    }, 1800001)
  })

  it('should return true after 3,600,000ms - 1 hour', () => {
    const mockTime = 60 * 1000 * 60
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
    setTimeout(() => {
      expect(result.current).toBe(true)
    }, 3600001)
  })

  it(`should always return false if the idle time is exactly ${SLEEP_NEVER_MS}`, () => {
    const mockTime = SLEEP_NEVER_MS
    const { result } = renderHook(() => useScreenIdle(mockTime, MOCK_OPTIONS))
    expect(result.current).toBe(false)
    setTimeout(() => {
      expect(result.current).toBe(false)
    }, 604800001)
  })
})
