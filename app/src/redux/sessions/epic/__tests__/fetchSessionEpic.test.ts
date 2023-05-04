import { sessionsEpic } from '..'
import { mockRobot } from '../../../robot-api/__fixtures__'
import { setupEpicTestMocks, runEpicTest } from '../../../robot-api/__utils__'
import type { Action } from '../../../types'
import * as Fixtures from '../../__fixtures__'
import * as Actions from '../../actions'

const makeTriggerAction = (robotName: string) =>
  Actions.fetchSession(robotName, Fixtures.mockSessionId)

describe('fetchSessionEpic', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  const expectedRequest = {
    method: 'GET',
    path: `/sessions/${Fixtures.mockSessionId}`,
  }

  it('calls GET /sessions/{id}', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockFetchSessionSuccess
    )

    runEpicTest<Action>(mocks, ({ hot, cold, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$)
      flush()

      expect(mocks.fetchRobotApi).toHaveBeenCalledWith(
        mocks.robot,
        expectedRequest
      )
    })
  })

  it('maps successful response to FETCH_SESSION_SUCCESS', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockFetchSessionSuccess
    )

    runEpicTest(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.fetchSessionSuccess(
          mockRobot.name,
          Fixtures.mockFetchSessionSuccess.body,
          { ...mocks.meta, response: Fixtures.mockFetchSessionSuccessMeta }
        ),
      })
    })
  })

  it('maps failed response to FETCH_SESSION_FAILURE', () => {
    const mocks = setupEpicTestMocks(
      makeTriggerAction,
      Fixtures.mockFetchSessionFailure
    )

    runEpicTest(mocks, ({ hot, expectObservable, flush }) => {
      const action$ = hot('--a', { a: mocks.action })
      const state$ = hot('s-s', { s: mocks.state })
      const output$ = sessionsEpic(action$, state$)

      expectObservable(output$).toBe('--a', {
        a: Actions.fetchSessionFailure(
          mocks.robot.name,
          Fixtures.mockSessionId,
          { errors: [{ status: 'went bad' }] },
          { ...mocks.meta, response: Fixtures.mockFetchSessionFailureMeta }
        ),
      })
    })
  })
})
