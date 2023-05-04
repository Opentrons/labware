import { useAllSessionsQuery } from '..'
import { useHost } from '../../api'
import { getSessions } from '@opentrons/api-client'
import type { HostConfig, Response, Sessions } from '@opentrons/api-client'
import { renderHook } from '@testing-library/react-hooks'
import { when, resetAllWhenMocks } from 'jest-when'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockGetSessions = getSessions as jest.MockedFunction<typeof getSessions>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const SESSIONS_RESPONSE = {
  data: [
    { sessionType: 'deckCalibration', id: '1' },
    { sessionType: 'tipLengthCalibration', id: '2' },
  ],
} as Sessions

describe('useAllSessionsQuery hook', () => {
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

    const { result } = renderHook(useAllSessionsQuery, { wrapper })

    expect(result.current.data).toBeUndefined()
  })

  it('should return no data if the get sessions request fails', () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetSessions).calledWith(HOST_CONFIG).mockRejectedValue('oh no')

    const { result } = renderHook(useAllSessionsQuery, { wrapper })
    expect(result.current.data).toBeUndefined()
  })

  it('should return all current robot sessions', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetSessions)
      .calledWith(HOST_CONFIG)
      .mockResolvedValue({ data: SESSIONS_RESPONSE } as Response<Sessions>)

    const { result, waitFor } = renderHook(useAllSessionsQuery, { wrapper })

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(SESSIONS_RESPONSE)
  })
})
