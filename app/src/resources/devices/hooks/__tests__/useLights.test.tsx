import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  useLightsQuery,
  useSetLightsMutation,
} from '@opentrons/react-api-client'

import { useLights } from '../useLights'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { Mock } from 'vitest'

vi.mock('@opentrons/react-api-client')

const store: Store<any> = createStore(vi.fn(), {})

describe('useLights hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  let setLights: Mock

  beforeEach(() => {
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
    vi.mocked(useLightsQuery).mockReturnValue({ data: { on: false } } as any)
    setLights = vi.fn()
    vi.mocked(useSetLightsMutation).mockReturnValue({ setLights } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('toggles lights off when on', () => {
    vi.mocked(useLightsQuery).mockReturnValue({ data: { on: true } } as any)

    const { result } = renderHook(() => useLights(), { wrapper })

    expect(result.current.lightsOn).toEqual(true)
    result.current.toggleLights()
    expect(setLights).toBeCalledWith({ on: false })
  })

  it('toggles lights on when off', () => {
    vi.mocked(useLightsQuery).mockReturnValue({ data: { on: false } } as any)

    const { result } = renderHook(() => useLights(), {
      wrapper,
    })

    expect(result.current.lightsOn).toEqual(false)
    result.current.toggleLights()
    expect(setLights).toBeCalledWith({ on: true })
  })
})
