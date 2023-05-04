import { useAllRunsQuery } from '..'
import { useHost } from '../../api'
import { mockRunsResponse } from '../__fixtures__'
import { getRuns } from '@opentrons/api-client'
import type { HostConfig, Response, Runs } from '@opentrons/api-client'
import { renderHook } from '@testing-library/react-hooks'
import { when, resetAllWhenMocks } from 'jest-when'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockGetRuns = getRuns as jest.MockedFunction<typeof getRuns>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }

describe('useAllRunsQuery hook', () => {
  let wrapper: React.FunctionComponent<{}>

  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{}> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    wrapper = clientProvider
  })
  afterEach(() => {
    resetAllWhenMocks()
  })

  it('should return no data if no host', () => {
    when(mockUseHost).calledWith().mockReturnValue(null)

    const { result } = renderHook(useAllRunsQuery, { wrapper })

    expect(result.current.data).toBeUndefined()
  })

  it('should return no data if the get runs request fails', () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetRuns).calledWith(HOST_CONFIG).mockRejectedValue('oh no')

    const { result } = renderHook(useAllRunsQuery, { wrapper })
    expect(result.current.data).toBeUndefined()
  })

  it('should return all current robot runs', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetRuns)
      .calledWith(HOST_CONFIG)
      .mockResolvedValue({ data: mockRunsResponse } as Response<Runs>)

    const { result, waitFor } = renderHook(useAllRunsQuery, { wrapper })

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(mockRunsResponse)
  })
})
