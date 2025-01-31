import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { renderHook, waitFor } from '@testing-library/react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from 'react-query'

import { useProtocolRunAnalyticsData } from '../useProtocolRunAnalyticsData'
import { hash } from '/app/redux/analytics/hash'
import { getStoredProtocol } from '/app/redux/protocol-storage'
import { useProtocolDetailsForRun, useRunTimestamps } from '/app/resources/runs'
import { useStoredProtocolAnalysis } from '/app/resources/analysis'
import { useProtocolMetadata } from '/app/resources/protocols'
import { formatInterval } from '/app/transformations/commands'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('/app/redux/analytics/hash')
vi.mock('/app/redux/protocol-storage')
vi.mock('/app/resources/protocols')
vi.mock('/app/resources/analysis')
vi.mock('/app/resources/runs')
vi.mock('/app/transformations/commands')

let wrapper: FunctionComponent<{ children: ReactNode }>
let store: Store<any> = createStore(vi.fn(), {})

const RUN_ID = '1'
const RUN_ID_2 = '2'

const PIPETTES = [
  { id: '1', pipetteName: 'testModelLeft' },
  { id: '2', pipetteName: 'testModelRight' },
]
const FORMATTED_PIPETTES = 'testModelLeft,testModelRight'
const MODULES = {
  module1: { model: 'module1' },
  module2: { model: 'module2' },
}
const RUNTIME_PARAMETERS = [
  {
    displayName: 'test param',
    variableName: 'test_param',
    description: 'Mock boolean parameter',
    type: 'bool',
    default: true,
    value: true,
  },
]
const FORMATTED_MODULES = 'module1,module2'
const STORED_PROTOCOL_ANALYSIS = {
  config: { protocolType: 'json', schemaVersion: 1.11 },
  metadata: {
    author: 'testAuthor',
    apiLevel: 2.2,
    protocolName: 'stored protocol',
    source: 'stored protocol source',
  },
  robotType: 'OT-2 Standard',
  pipettes: PIPETTES,
  modules: MODULES,
  runTimeParameters: RUNTIME_PARAMETERS,
}
const ROBOT_PROTOCOL_ANALYSIS = {
  robotType: 'OT-2 Standard',
  pipettes: PIPETTES,
  modules: MODULES,
  runTimeParameters: RUNTIME_PARAMETERS,
}

describe('useProtocolRunAnalyticsData hook', () => {
  beforeEach(() => {
    store = createStore(vi.fn(), {})
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
    vi.mocked(hash).mockReturnValue(
      new Promise(resolve => resolve('hashedString'))
    )
    vi.mocked(getStoredProtocol).mockReturnValue({
      srcFiles: Buffer.from('protocol content'),
    } as any)
    when(vi.mocked(useStoredProtocolAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(STORED_PROTOCOL_ANALYSIS as any)
    when(vi.mocked(useProtocolDetailsForRun))
      .calledWith(RUN_ID)
      .thenReturn({ protocolData: null } as any)
    vi.mocked(useProtocolMetadata).mockReturnValue({
      author: 'testAuthor',
      apiLevel: 2.3,
      protocolName: 'robot protocol',
      source: 'robot protocol source',
    })
    vi.mocked(useRunTimestamps).mockReturnValue({ startedAt: '100000' } as any)
    vi.mocked(formatInterval).mockReturnValue('1:00:00' as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns getProtocolRunAnalyticsData function', () => {
    const { result } = renderHook(
      () => useProtocolRunAnalyticsData(RUN_ID, mockConnectableRobot),
      {
        wrapper,
      }
    )
    expect(typeof result.current.getProtocolRunAnalyticsData).toEqual(
      'function'
    )
  })

  it('getProtocolRunAnalyticsData returns robot data when available', async () => {
    when(vi.mocked(useProtocolDetailsForRun))
      .calledWith(RUN_ID_2)
      .thenReturn({ protocolData: ROBOT_PROTOCOL_ANALYSIS } as any)
    const { result } = renderHook(
      () => useProtocolRunAnalyticsData(RUN_ID_2, mockConnectableRobot),
      {
        wrapper,
      }
    )
    const protocolRunAnalyticsData = await waitFor(() =>
      result.current.getProtocolRunAnalyticsData()
    )
    expect(protocolRunAnalyticsData).toStrictEqual({
      protocolRunAnalyticsData: {
        pipettes: FORMATTED_PIPETTES,
        modules: FORMATTED_MODULES,
        protocolApiVersion: 2.3,
        protocolAppName: 'Python API',
        protocolAppVersion: 2.3,
        protocolAuthor: 'hashedString',
        protocolHasRunTimeParameterCustomValues: false,
        protocolHasRunTimeParameters: true,
        protocolName: 'robot protocol',
        protocolSource: 'robot protocol source',
        protocolText: 'hashedString',
        protocolType: '',
        robotType: 'OT-2 Standard',
        robotSerialNumber: 'mock-serial',
      },
      runTime: '1:00:00',
    })
  })

  it('getProtocolRunAnalyticsData returns fallback stored data when robot data unavailable', async () => {
    const { result } = renderHook(
      () => useProtocolRunAnalyticsData(RUN_ID, mockConnectableRobot),
      {
        wrapper,
      }
    )
    const protocolRunAnalyticsData = await waitFor(() =>
      result.current.getProtocolRunAnalyticsData()
    )
    expect(protocolRunAnalyticsData).toStrictEqual({
      protocolRunAnalyticsData: {
        pipettes: FORMATTED_PIPETTES,
        modules: FORMATTED_MODULES,
        protocolApiVersion: 2.2,
        protocolAppName: 'Protocol Designer',
        protocolAppVersion: '1.1',
        protocolAuthor: 'hashedString',
        protocolName: 'stored protocol',
        protocolHasRunTimeParameterCustomValues: false,
        protocolHasRunTimeParameters: true,
        protocolSource: 'stored protocol source',
        protocolText: 'hashedString',
        protocolType: 'json',
        robotType: 'OT-2 Standard',
        robotSerialNumber: 'mock-serial',
      },
      runTime: '1:00:00',
    })
  })
})
