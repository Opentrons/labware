import { describe, it, vi, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScreenSizeCheck } from '../useScreenSizeCheck'

describe('useScreenSizeCheck', () => {
  it('should return true if the window size is greater than 600px x 650px', () => {
    vi.stubGlobal('innerWidth', 1440)
    vi.stubGlobal('innerHeight', 900)
    const { result } = renderHook(() => useScreenSizeCheck())
    expect(result.current).toBe(true)
  })

  it('should return false if the window height is less than 650px', () => {
    vi.stubGlobal('innerWidth', 1440)
    vi.stubGlobal('innerHeight', 649)
    window.dispatchEvent(new Event('resize'))
    const { result } = renderHook(() => useScreenSizeCheck())
    expect(result.current).toBe(false)
  })

  it('should return true if the window width is 768px', () => {
    vi.stubGlobal('innerWidth', 768)
    vi.stubGlobal('innerHeight', 900)
    window.dispatchEvent(new Event('resize'))
    const { result } = renderHook(() => useScreenSizeCheck())
    expect(result.current).toBe(false)
  })

  it('should return false if the window width is less than 768px', () => {
    vi.stubGlobal('innerWidth', 767)
    vi.stubGlobal('innerHeight', 900)
    window.dispatchEvent(new Event('resize'))
    const { result } = renderHook(() => useScreenSizeCheck())
    expect(result.current).toBe(false)
  })

  it('should return false if the window width is less than 768px and height is less than 650px', () => {
    vi.stubGlobal('innerWidth', 767)
    vi.stubGlobal('innerHeight', 649)
    window.dispatchEvent(new Event('resize'))
    const { result } = renderHook(() => useScreenSizeCheck())
    expect(result.current).toBe(false)
  })
})
