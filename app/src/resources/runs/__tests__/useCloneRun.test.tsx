import { when } from 'vitest-when'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'

import {
  useHost,
  useCreateRunMutation,
  useCreateProtocolAnalysisMutation,
} from '@opentrons/react-api-client'

import { useCloneRun } from '../useCloneRun'
import { useNotifyRunQuery } from '../useNotifyRunQuery'

import type { FunctionComponent, ReactNode } from 'react'
import type { HostConfig } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs/useNotifyRunQuery')

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const RUN_ID_NO_RTP: string = 'run_id_no_rtp'
const RUN_ID_RTP: string = 'run_id_rtp'

describe('useCloneRun hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>

  beforeEach(() => {
    when(vi.mocked(useHost)).calledWith().thenReturn(HOST_CONFIG)
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID_NO_RTP)
      .thenReturn({
        data: {
          data: {
            id: RUN_ID_NO_RTP,
            protocolId: 'protocolId',
            labwareOffsets: 'someOffset',
            runTimeParameters: [
              {
                type: 'int',
                variableName: 'number_param',
                default: 1,
                value: 1,
              },
              {
                type: 'bool',
                variableName: 'boolean_param',
                default: true,
                value: true,
              },
            ],
          },
        },
      } as any)
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID_RTP)
      .thenReturn({
        data: {
          data: {
            id: RUN_ID_RTP,
            protocolId: 'protocolId',
            labwareOffsets: 'someOffset',
            runTimeParameters: [
              {
                type: 'int',
                variableName: 'number_param',
                default: 1,
                value: 2,
              },
              {
                type: 'bool',
                variableName: 'boolean_param',
                default: true,
                value: false,
              },
              {
                type: 'csv_file',
                variableName: 'file_param',
                file: { id: 'fileId_123' },
              },
            ],
          },
        },
      } as any)
    when(vi.mocked(useCreateRunMutation))
      .calledWith(expect.anything())
      .thenReturn({ createRun: vi.fn() } as any)
    vi.mocked(useCreateProtocolAnalysisMutation).mockReturnValue({
      createProtocolAnalysis: vi.fn(),
    } as any)

    const queryClient = new QueryClient()
    const clientProvider: FunctionComponent<{
      children: ReactNode
    }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return a function that when called, calls createRun run with the run id', async () => {
    const mockCreateRun = vi.fn()
    vi.mocked(useCreateRunMutation).mockReturnValue({
      createRun: mockCreateRun,
    } as any)

    const { result } = renderHook(() => useCloneRun(RUN_ID_NO_RTP), { wrapper })
    result.current && result.current.cloneRun()
    expect(mockCreateRun).toHaveBeenCalledWith({
      protocolId: 'protocolId',
      labwareOffsets: 'someOffset',
      runTimeParameterValues: {},
      runTimeParameterFiles: {},
    })
  })
  it('should return a function that when called, calls createRun run with runTimeParameterValues overrides', async () => {
    const mockCreateRun = vi.fn()
    vi.mocked(useCreateRunMutation).mockReturnValue({
      createRun: mockCreateRun,
    } as any)

    const { result } = renderHook(() => useCloneRun(RUN_ID_RTP), { wrapper })
    result.current && result.current.cloneRun()
    expect(mockCreateRun).toHaveBeenCalledWith({
      protocolId: 'protocolId',
      labwareOffsets: 'someOffset',
      runTimeParameterValues: {
        number_param: 2,
        boolean_param: false,
      },
      runTimeParameterFiles: {
        file_param: 'fileId_123',
      },
    })
  })
})
