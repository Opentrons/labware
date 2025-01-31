import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'

import { useProtocolQuery } from '@opentrons/react-api-client'
import {
  OT2_ROBOT_TYPE,
  parseInitialLoadedLabwareEntity,
  parsePipetteEntity,
  parseRequiredModulesEntity,
} from '@opentrons/shared-data'

import { storedProtocolData } from '/app/redux/protocol-storage/__fixtures__'
import { getStoredProtocol } from '/app/redux/protocol-storage'
import { useStoredProtocolAnalysis } from '../useStoredProtocolAnalysis'
import {
  LABWARE_ENTITY,
  MODULE_ENTITY,
  PIPETTE_ENTITY,
  STORED_PROTOCOL_ANALYSIS,
} from '../__fixtures__/storedProtocolAnalysis'
import { useNotifyRunQuery } from '/app/resources/runs'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { UseQueryResult } from 'react-query'
import type { Protocol, Run } from '@opentrons/api-client'
import type * as SharedData from '@opentrons/shared-data'
import type { StoredProtocolData } from '/app/redux/protocol-storage'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseInitialLoadedLabwareEntity: vi.fn(),
    parsePipetteEntity: vi.fn(),
    parseRequiredModulesEntity: vi.fn(),
  }
})
vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/protocol-storage/selectors')
vi.mock('/app/resources/runs')

const store: Store<any> = createStore(vi.fn(), {})

const modifiedStoredProtocolData = {
  ...storedProtocolData,
  mostRecentAnalysis: {
    commands: storedProtocolData?.mostRecentAnalysis?.commands,
    liquids: storedProtocolData?.mostRecentAnalysis?.liquids,
    errors: storedProtocolData?.mostRecentAnalysis?.errors,
    runTimeParameters:
      storedProtocolData?.mostRecentAnalysis?.runTimeParameters,
    robotType: OT2_ROBOT_TYPE,
  },
}

const RUN_ID = 'the_run_id'
const PROTOCOL_ID = 'the_protocol_id'
const PROTOCOL_KEY = 'the_protocol_key'

describe('useStoredProtocolAnalysis hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )

    when(vi.mocked(useNotifyRunQuery))
      .calledWith(null, { staleTime: Infinity })
      .thenReturn({} as UseQueryResult<Run>)
    when(vi.mocked(useProtocolQuery))
      .calledWith(null, { staleTime: Infinity })
      .thenReturn({} as UseQueryResult<Protocol>)
    when(vi.mocked(getStoredProtocol))
      .calledWith(undefined as any)
      .thenReturn(null)
    vi.mocked(parseRequiredModulesEntity).mockReturnValue([MODULE_ENTITY])
    vi.mocked(parseInitialLoadedLabwareEntity).mockReturnValue([LABWARE_ENTITY])
    vi.mocked(parsePipetteEntity).mockReturnValue([PIPETTE_ENTITY])
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns null when called with null', () => {
    const { result } = renderHook(() => useStoredProtocolAnalysis(null), {
      wrapper,
    })

    expect(result.current).toEqual(null)
  })

  it('returns null when there is no stored protocol analysis for a protocol key', () => {
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID, { staleTime: Infinity })
      .thenReturn({
        data: { data: { protocolId: PROTOCOL_ID } },
      } as UseQueryResult<Run>)
    when(vi.mocked(useProtocolQuery))
      .calledWith(PROTOCOL_ID, { staleTime: Infinity })
      .thenReturn({
        data: { data: { key: PROTOCOL_KEY } },
      } as UseQueryResult<Protocol>)
    when(vi.mocked(getStoredProtocol))
      .calledWith(undefined as any, PROTOCOL_KEY)
      .thenReturn(null)

    const { result } = renderHook(() => useStoredProtocolAnalysis(RUN_ID), {
      wrapper,
    })

    expect(result.current).toEqual(null)
  })

  it('returns a stored protocol analysis when one exists for a protocol key', () => {
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID, { staleTime: Infinity })
      .thenReturn({
        data: { data: { protocolId: PROTOCOL_ID } },
      } as UseQueryResult<Run>)
    when(vi.mocked(useProtocolQuery))
      .calledWith(PROTOCOL_ID, { staleTime: Infinity })
      .thenReturn({
        data: { data: { key: PROTOCOL_KEY } },
      } as UseQueryResult<Protocol>)
    when(vi.mocked(getStoredProtocol))
      .calledWith(undefined as any, PROTOCOL_KEY)
      .thenReturn(modifiedStoredProtocolData as StoredProtocolData)

    const { result } = renderHook(() => useStoredProtocolAnalysis(RUN_ID), {
      wrapper,
    })

    expect(result.current).toEqual(STORED_PROTOCOL_ANALYSIS)
  })
})
