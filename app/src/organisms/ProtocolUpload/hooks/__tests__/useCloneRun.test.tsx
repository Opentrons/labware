import * as React from 'react'
import { when } from 'vitest-when'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'

import { useHost, useCreateRunMutation } from '@opentrons/react-api-client'

import { useCloneRun } from '../useCloneRun'
import { useNotifyRunQuery } from '../../../../resources/runs/useNotifyRunQuery'

import type { HostConfig } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('../../../../resources/runs/useNotifyRunQuery')

const mockUseHost = useHost as jest.MockedFunction<typeof useHost>
const mockUseNotifyRunQuery = useNotifyRunQuery as jest.MockedFunction<
  typeof useNotifyRunQuery
>
const mockUseCreateRunMutation = useCreateRunMutation as jest.MockedFunction<
  typeof useCreateRunMutation
>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const RUN_ID: string = 'run_id'

describe('useCloneRun hook', () => {
  let wrapper: React.FunctionComponent<{ children: React.ReactNode }>

  beforeEach(() => {
    when(mockUseHost).calledWith().thenReturn(HOST_CONFIG)
    when(mockUseNotifyRunQuery)
      .calledWith(RUN_ID)
      .thenReturn({
        data: {
          data: {
            id: RUN_ID,
            protocolId: 'protocolId',
            labwareOffsets: 'someOffset',
          },
        },
      } as any)
    when(mockUseCreateRunMutation)
      .calledWith(expect.anything())
      .thenReturn({ createRun: vi.fn() } as any)

    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{
      children: React.ReactNode
    }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return a function that when called, calls stop run with the run id', async () => {
    const mockCreateRun = vi.fn()
    mockUseCreateRunMutation.mockReturnValue({
      createRun: mockCreateRun,
    } as any)

    const { result } = renderHook(() => useCloneRun(RUN_ID), { wrapper })
    result.current && result.current.cloneRun()
    expect(mockCreateRun).toHaveBeenCalledWith({
      protocolId: 'protocolId',
      labwareOffsets: 'someOffset',
    })
  })
})
