import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { getRobotModelByName } from '/app/redux/discovery'

import { useIsFlex } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('/app/redux/discovery/selectors')

const store: Store<any> = createStore(vi.fn(), {})

describe('useIsFlex hook', () => {
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
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns false when given a robot name that does not have a discoverable model', () => {
    when(vi.mocked(getRobotModelByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(null)

    const { result } = renderHook(() => useIsFlex('otie'), { wrapper })

    expect(result.current).toEqual(false)
  })

  it('returns true when given a discoverable OT-3 robot name with a model', () => {
    when(vi.mocked(getRobotModelByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn('OT-3 Classic')

    const { result } = renderHook(() => useIsFlex('otie'), {
      wrapper,
    })

    expect(result.current).toEqual(true)
  })
  it('returns true when given a discoverable OT-3 robot name with an Opentrons Flex model', () => {
    when(vi.mocked(getRobotModelByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn('Opentrons Flex')

    const { result } = renderHook(() => useIsFlex('otie'), {
      wrapper,
    })

    expect(result.current).toEqual(true)
  })
})
