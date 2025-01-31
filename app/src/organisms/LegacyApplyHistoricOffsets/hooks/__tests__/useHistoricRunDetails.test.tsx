import { describe, it, expect, vi } from 'vitest'
import { when } from 'vitest-when'
import { renderHook, waitFor } from '@testing-library/react'

import { useNotifyAllRunsQuery } from '/app/resources/runs/useNotifyAllRunsQuery'
import { useHistoricRunDetails } from '../useHistoricRunDetails'
import { mockRunningRun } from '/app/resources/runs/__fixtures__'
import { mockSuccessQueryResults } from '../../../../__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { RunData } from '@opentrons/api-client'

vi.mock('/app/resources/runs/useNotifyAllRunsQuery')

const MOCK_RUN_LATER: RunData = {
  ...mockRunningRun,
  id: 'run_one',
  createdAt: '2022-05-02T14:34:48.843177',
  current: false,
  status: 'succeeded',
  protocolId: 'fakeProtocolId',
}
const MOCK_RUN_EARLIER: RunData = {
  ...mockRunningRun,
  id: 'run_zero',
  createdAt: '2022-05-01T14:34:48.843177',
  current: false,
  status: 'succeeded',
  protocolId: 'fakeProtocolId',
}

describe('useHistoricRunDetails', () => {
  when(useNotifyAllRunsQuery)
    .calledWith({}, {}, undefined)
    .thenReturn(
      mockSuccessQueryResults({
        data: [MOCK_RUN_LATER, MOCK_RUN_EARLIER],
        links: {},
      })
    )

  it('returns historical run details with newest first', async () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <div>{children}</div>
    const { result } = renderHook(useHistoricRunDetails, { wrapper })
    await waitFor(() => {
      expect(result.current).toEqual([MOCK_RUN_LATER, MOCK_RUN_EARLIER])
    })
  })
  it('returns historical run details with newest first to specific host', async () => {
    when(useNotifyAllRunsQuery)
      .calledWith({}, {}, { hostname: 'fakeIp' })
      .thenReturn(
        mockSuccessQueryResults({
          data: [MOCK_RUN_EARLIER, MOCK_RUN_EARLIER, MOCK_RUN_LATER],
          links: {},
        })
      )
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <div>{children}</div>
    const { result } = renderHook(
      () => useHistoricRunDetails({ hostname: 'fakeIp' }),
      { wrapper }
    )
    await waitFor(() => {
      expect(result.current).toEqual([
        MOCK_RUN_LATER,
        MOCK_RUN_EARLIER,
        MOCK_RUN_EARLIER,
      ])
    })
  })
})
