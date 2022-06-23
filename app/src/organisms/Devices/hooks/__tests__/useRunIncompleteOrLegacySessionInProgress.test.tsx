import { UseQueryResult } from 'react-query'
import { useAllSessionsQuery } from '@opentrons/react-api-client'
import {
  RUN_STATUS_FAILED,
  RUN_STATUS_RUNNING,
  RUN_STATUS_STOPPED,
  RUN_STATUS_SUCCEEDED,
} from '@opentrons/api-client'

import { useCurrentRunId } from '../../../ProtocolUpload/hooks'
import { useRunStatus } from '../../../RunTimeControl/hooks'
import { useRunIncompleteOrLegacySessionInProgress } from '..'

import type { Sessions } from '@opentrons/api-client'

jest.mock('@opentrons/react-api-client')
jest.mock('../../../ProtocolUpload/hooks')
jest.mock('../../../RunTimeControl/hooks')

const mockUseRunStatus = useRunStatus as jest.MockedFunction<
  typeof useRunStatus
>
const mockUseCurrentRunId = useCurrentRunId as jest.MockedFunction<
  typeof useCurrentRunId
>
const mockUseAllSessionsQuery = useAllSessionsQuery as jest.MockedFunction<
  typeof useAllSessionsQuery
>

describe('useRunIncompleteOrLegacySessionInProgress', () => {
  beforeEach(() => {
    mockUseRunStatus.mockReturnValue(RUN_STATUS_RUNNING)
    mockUseCurrentRunId.mockReturnValue('123')
    mockUseAllSessionsQuery.mockReturnValue(({
      data: [],
      links: null,
    } as unknown) as UseQueryResult<Sessions, Error>)
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns true when current run status is not terminal or sessions are empty', () => {
    const result = useRunIncompleteOrLegacySessionInProgress()
    expect(result).toBe(true)
  })

  it('returns false when run status is suceeded or sessions are not empty', () => {
    mockUseRunStatus.mockReturnValue(RUN_STATUS_SUCCEEDED)
    mockUseAllSessionsQuery.mockReturnValue(({
      data: [
        {
          id: 'test',
          createdAt: '2019-08-24T14:15:22Z',
          details: {},
          sessionType: 'calibrationCheck',
          createParams: {},
        },
      ],
      links: {},
    } as unknown) as UseQueryResult<Sessions, Error>)
    const result = useRunIncompleteOrLegacySessionInProgress()
    expect(result).toBe(false)
  })

  it('returns false when run status is stopped or sessions are not empty', () => {
    mockUseRunStatus.mockReturnValue(RUN_STATUS_STOPPED)
    mockUseAllSessionsQuery.mockReturnValue(({
      data: [
        {
          id: 'test',
          createdAt: '2019-08-24T14:15:22Z',
          details: {},
          sessionType: 'calibrationCheck',
          createParams: {},
        },
      ],
      links: {},
    } as unknown) as UseQueryResult<Sessions, Error>)
    const result = useRunIncompleteOrLegacySessionInProgress()
    expect(result).toBe(false)
  })

  it('returns false when run status is failed or sessions are not empty', () => {
    mockUseRunStatus.mockReturnValue(RUN_STATUS_FAILED)
    mockUseAllSessionsQuery.mockReturnValue(({
      data: [
        {
          id: 'test',
          createdAt: '2019-08-24T14:15:22Z',
          details: {},
          sessionType: 'calibrationCheck',
          createParams: {},
        },
      ],
      links: {},
    } as unknown) as UseQueryResult<Sessions, Error>)
    const result = useRunIncompleteOrLegacySessionInProgress()
    expect(result).toBe(false)
  })
})
