import { when } from 'vitest-when'
import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { getDiscoverableRobotByName } from '/app/redux/discovery'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'

import { useRobot } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('/app/redux/discovery')

const store: Store<any> = createStore(vi.fn(), {})

describe('useRobot hook', () => {
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

  it('returns null when given a robot name that is not discoverable', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(null)

    const { result } = renderHook(() => useRobot('otie'), { wrapper })

    expect(result.current).toEqual(null)
  })

  it('returns robot when given a discoverable robot name', () => {
    when(vi.mocked(getDiscoverableRobotByName))
      .calledWith(undefined as any, 'otie')
      .thenReturn(mockConnectableRobot)

    const { result } = renderHook(() => useRobot('otie'), {
      wrapper,
    })

    expect(result.current).toEqual(mockConnectableRobot)
  })
})
