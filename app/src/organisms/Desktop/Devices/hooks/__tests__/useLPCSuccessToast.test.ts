import { useContext } from 'react'
import { vi, it, expect, describe } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLPCSuccessToast } from '..'

vi.mock('react', async importOriginal => {
  const actualReact = await importOriginal<typeof useContext>()
  return {
    ...actualReact,
    useContext: vi.fn(),
  }
})

describe('useLPCSuccessToast', () => {
  it('return true when useContext returns true', () => {
    vi.mocked(useContext).mockReturnValue({
      setIsShowingLPCSuccessToast: true,
    })
    const { result } = renderHook(() => useLPCSuccessToast())
    expect(result.current).toStrictEqual({
      setIsShowingLPCSuccessToast: true,
    })
  })
  it('return false when useContext returns false', () => {
    vi.mocked(useContext).mockReturnValue({
      setIsShowingLPCSuccessToast: false,
    })
    const { result } = renderHook(() => useLPCSuccessToast())
    expect(result.current).toStrictEqual({
      setIsShowingLPCSuccessToast: false,
    })
  })
})
