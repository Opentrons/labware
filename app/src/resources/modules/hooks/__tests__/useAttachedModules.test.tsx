import { vi, it, expect, describe } from 'vitest'
import { renderHook } from '@testing-library/react'
import { mockModulesResponse } from '@opentrons/api-client'
import { useModulesQuery } from '@opentrons/react-api-client'
import { useAttachedModules } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { UseQueryResult } from 'react-query'
import type { Modules } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')

describe('useAttachedModules hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>

  it('returns attached modules', () => {
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: mockModulesResponse },
    } as UseQueryResult<Modules, unknown>)

    const { result } = renderHook(() => useAttachedModules(), { wrapper })

    expect(result.current).toEqual(mockModulesResponse)
  })
})
