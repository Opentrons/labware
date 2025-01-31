import { vi, it, expect, describe, beforeEach } from 'vitest'
import { when } from 'vitest-when'
import { renderHook } from '@testing-library/react'
import { usePipettesQuery } from '@opentrons/react-api-client'
import { getPipetteModelSpecs } from '@opentrons/shared-data'
import { useAttachedPipettes } from '../useAttachedPipettes'
import {
  pipetteResponseFixtureLeft,
  pipetteResponseFixtureRight,
} from '@opentrons/api-client'

import type { FunctionComponent, ReactNode } from 'react'
import type { UseQueryResult } from 'react-query'
import type { FetchPipettesResponseBody } from '@opentrons/api-client'
import type { PipetteModelSpecs } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('@opentrons/shared-data')

describe('useAttachedPipettes hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    vi.mocked(getPipetteModelSpecs).mockReturnValue({
      name: 'mockName',
    } as PipetteModelSpecs)
  })

  it('returns attached pipettes', () => {
    when(vi.mocked(usePipettesQuery))
      .calledWith({}, {})
      .thenReturn({
        data: {
          left: pipetteResponseFixtureLeft,
          right: pipetteResponseFixtureRight,
        },
      } as UseQueryResult<FetchPipettesResponseBody, unknown>)

    const { result } = renderHook(() => useAttachedPipettes(), {
      wrapper,
    })

    expect(result.current).toEqual({
      left: { ...pipetteResponseFixtureLeft, modelSpecs: { name: 'mockName' } },
      right: {
        ...pipetteResponseFixtureRight,
        modelSpecs: { name: 'mockName' },
      },
    })
  })

  it('returns attached pipettes polled every 5 seconds if poll true', () => {
    when(vi.mocked(usePipettesQuery))
      .calledWith({}, { refetchInterval: 5000 })
      .thenReturn({
        data: {
          left: pipetteResponseFixtureLeft,
          right: pipetteResponseFixtureRight,
        },
      } as UseQueryResult<FetchPipettesResponseBody, unknown>)

    const { result } = renderHook(() => useAttachedPipettes(true), {
      wrapper,
    })

    expect(result.current).toEqual({
      left: { ...pipetteResponseFixtureLeft, modelSpecs: { name: 'mockName' } },
      right: {
        ...pipetteResponseFixtureRight,
        modelSpecs: { name: 'mockName' },
      },
    })
  })
})
