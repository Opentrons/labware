import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsiveBreakpoints } from '../useResponsiveBreakpoints'

describe('useResponsiveBreakpoints', () => {
  const resizeWindow = (width: number) => {
    window.innerWidth = width
    window.dispatchEvent(new Event('resize'))
  }

  it('should return "xs" when width is less than BREAKPOINT_SM_WIDTH', () => {
    const { result } = renderHook(() => useResponsiveBreakpoints())
    act(() => {
      resizeWindow(900)
    })
    expect(result.current).toBe('xs')
  })

  it('should return "sm" when width is between BREAKPOINT_SM_WIDTH and BREAKPOINT_MD_WIDTH', () => {
    const { result } = renderHook(() => useResponsiveBreakpoints())
    act(() => {
      resizeWindow(1000)
    })
    expect(result.current).toBe('sm')
  })

  it('should return "md" when width is between BREAKPOINT_MD_WIDTH and BREAKPOINT_LG_WIDTH', () => {
    const { result } = renderHook(() => useResponsiveBreakpoints())
    act(() => {
      resizeWindow(1120)
    })
    expect(result.current).toBe('md')
  })

  it('should return "lg" when width is between BREAKPOINT_LG_WIDTH and BREAKPOINT_XL_WIDTH', () => {
    const { result } = renderHook(() => useResponsiveBreakpoints())
    act(() => {
      resizeWindow(1200)
    })
    expect(result.current).toBe('lg')
  })

  it('should return "xl" when width is greater than BREAKPOINT_XL_WIDTH', () => {
    const { result } = renderHook(() => useResponsiveBreakpoints())
    act(() => {
      resizeWindow(1500)
    })
    expect(result.current).toBe('xl')
  })
})
