// @flow
import { TestScheduler } from 'rxjs/testing'

import * as RobotApiHttp from '../../../robot-api/http'
import * as DiscoverySelectors from '../../../discovery/selectors'
import * as Fixtures from '../../__fixtures__'

import * as Actions from '../../actions'
import * as Types from '../../types'
import { modulesEpic } from '../../epic'

import type { Observable } from 'rxjs'
import type {
  RobotHost,
  HostlessRobotApiRequest,
  RobotApiResponse,
} from '../../../robot-api/types'

jest.mock('../../../robot-api/http')
jest.mock('../../../discovery/selectors')

const mockState = { state: true }
const { mockRobot } = Fixtures

const mockFetchRobotApi: JestMockFn<
  [RobotHost, HostlessRobotApiRequest],
  Observable<RobotApiResponse>
> = RobotApiHttp.fetchRobotApi

const mockGetRobotByName: JestMockFn<[any, string], mixed> =
  DiscoverySelectors.getRobotByName

describe('fetchModulesEpic', () => {
  let testScheduler

  beforeEach(() => {
    mockGetRobotByName.mockReturnValue(mockRobot)

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('handles FETCH_MODULES', () => {
    const meta = { requestId: '1234' }
    const action: Types.FetchModulesAction = {
      ...Actions.fetchModules(mockRobot.name),
      meta,
    }

    test('calls GET /modules', () => {
      testScheduler.run(({ hot, cold, expectObservable, flush }) => {
        mockFetchRobotApi.mockReturnValue(
          cold('r', { r: Fixtures.mockFetchModulesSuccess })
        )

        const action$ = hot('--a', { a: action })
        const state$ = hot('a-a', { a: mockState })
        const output$ = modulesEpic(action$, state$)

        expectObservable(output$)
        flush()

        expect(mockGetRobotByName).toHaveBeenCalledWith(
          mockState,
          mockRobot.name
        )
        expect(mockFetchRobotApi).toHaveBeenCalledWith(mockRobot, {
          method: 'GET',
          path: '/modules',
        })
      })
    })

    test('maps successful response to FETCH_PIPETTES_SUCCESS', () => {
      testScheduler.run(({ hot, cold, expectObservable, flush }) => {
        mockFetchRobotApi.mockReturnValue(
          cold('r', { r: Fixtures.mockFetchModulesSuccess })
        )

        const action$ = hot('--a', { a: action })
        const state$ = hot('a-a', { a: {} })
        const output$ = modulesEpic(action$, state$)

        expectObservable(output$).toBe('--a', {
          a: Actions.fetchModulesSuccess(
            mockRobot.name,
            Fixtures.mockFetchModulesSuccess.body.modules,
            { ...meta, response: Fixtures.mockFetchModulesSuccessMeta }
          ),
        })
      })
    })

    test('maps failed response to FETCH_PIPETTES_FAILURE', () => {
      testScheduler.run(({ hot, cold, expectObservable, flush }) => {
        mockFetchRobotApi.mockReturnValue(
          cold('r', { r: Fixtures.mockFetchModulesFailure })
        )

        const action$ = hot('--a', { a: action })
        const state$ = hot('a-a', { a: {} })
        const output$ = modulesEpic(action$, state$)

        expectObservable(output$).toBe('--a', {
          a: Actions.fetchModulesFailure(
            mockRobot.name,
            { message: 'AH' },
            { ...meta, response: Fixtures.mockFetchModulesFailureMeta }
          ),
        })
      })
    })
  })
})
