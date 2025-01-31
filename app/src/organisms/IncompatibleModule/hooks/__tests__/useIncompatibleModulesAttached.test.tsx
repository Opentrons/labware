import { QueryClient, QueryClientProvider } from 'react-query'

import { vi, it, expect, describe, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useModulesQuery } from '@opentrons/react-api-client'
import { useIncompatibleModulesAttached } from '..'

import * as Fixtures from '../__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { Modules } from '@opentrons/api-client'
import type { UseQueryResult } from 'react-query'
vi.mock('@opentrons/react-api-client')

describe('useIncompatibleModulesAttached', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: FunctionComponent<{
      children: ReactNode
    }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
  })
  it('treats older endpoint responses as if the module were compatible', () => {
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: {
        data: Fixtures.v2MockModulesResponse,
        meta: {},
      },
      error: null,
    } as any) as UseQueryResult<Modules>)
    const { result } = renderHook(useIncompatibleModulesAttached, { wrapper })
    expect(result.current).toHaveLength(0)
  })
  it('pulls incompatible modules out of endpoint responses', () => {
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: {
        data: Fixtures.mockModulesWithOneIncompatibleResponse,
        meta: {},
      },
      error: null,
    } as any) as UseQueryResult<Modules>)
    const { result } = renderHook(useIncompatibleModulesAttached, { wrapper })
    expect(result.current).toHaveLength(1)
    expect(result.current).toContain(
      Fixtures.mockModulesWithOneIncompatibleResponse[0]
    )
  })
  it('treats modules under new schema without compatibility as compatible', () => {
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: {
        data: Fixtures.mockModulesAllNotImplementedResponse,
        meta: {},
      },
      error: null,
    } as any) as UseQueryResult<Modules>)
    const { result } = renderHook(useIncompatibleModulesAttached, { wrapper })
    expect(result.current).toHaveLength(0)
  })
  it('passes all compatible modules', () => {
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: {
        data: Fixtures.mockModulesAllCompatibleResponse,
        meta: {},
      },
    } as any) as UseQueryResult<Modules>)
    const { result } = renderHook(useIncompatibleModulesAttached, { wrapper })
    expect(result.current).toHaveLength(0)
  })
})
