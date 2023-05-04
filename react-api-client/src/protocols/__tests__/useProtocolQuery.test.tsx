import { useProtocolQuery } from '..'
import { useHost } from '../../api'
import { getProtocol } from '@opentrons/api-client'
import type { HostConfig, Response, Protocol } from '@opentrons/api-client'
import { renderHook } from '@testing-library/react-hooks'
import { when, resetAllWhenMocks } from 'jest-when'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockGetProtocol = getProtocol as jest.MockedFunction<typeof getProtocol>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const PROTOCOL_ID = '1'
const PROTOCOL_RESPONSE = {
  data: {
    protocolType: 'json',
    createdAt: 'now',
    id: '1',
    metadata: {},
    analysisSummaries: [],
    files: [],
  },
} as Protocol

describe('useProtocolQuery hook', () => {
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

    const { result } = renderHook(() => useProtocolQuery(PROTOCOL_ID), {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
  })

  it('should return no data if the get protocols request fails', () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetProtocol)
      .calledWith(HOST_CONFIG, PROTOCOL_ID)
      .mockRejectedValue('oh no')

    const { result } = renderHook(() => useProtocolQuery(PROTOCOL_ID), {
      wrapper,
    })
    expect(result.current.data).toBeUndefined()
  })

  it('should return a protocol', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetProtocol)
      .calledWith(HOST_CONFIG, PROTOCOL_ID)
      .mockResolvedValue({ data: PROTOCOL_RESPONSE } as Response<Protocol>)

    const { result, waitFor } = renderHook(
      () => useProtocolQuery(PROTOCOL_ID),
      {
        wrapper,
      }
    )

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(PROTOCOL_RESPONSE)
  })
})
