import { GET } from '../../robot-api'
import { mapToRobotApiRequest } from '../../robot-api/operators'
import type {
  ActionToRequestMapper,
  ResponseToActionMapper,
} from '../../robot-api/operators'
import type { Action, Epic } from '../../types'
import * as Actions from '../actions'
import * as Constants from '../constants'
import type { FetchSettingsAction } from '../types'
import { ofType } from 'redux-observable'

const mapActionToRequest: ActionToRequestMapper<FetchSettingsAction> = () => ({
  method: GET,
  path: Constants.SETTINGS_PATH,
})

const mapResponseToAction: ResponseToActionMapper<FetchSettingsAction> = (
  response,
  originalAction
) => {
  const { host, body, ...responseMeta } = response
  const meta = { ...originalAction.meta, response: responseMeta }

  return response.ok
    ? Actions.fetchSettingsSuccess(
        host.name,
        body.settings,
        body.links?.restart || null,
        meta
      )
    : Actions.fetchSettingsFailure(host.name, body, meta)
}

export const fetchSettingsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType<Action, FetchSettingsAction>(Constants.FETCH_SETTINGS),
    mapToRobotApiRequest(
      state$,
      a => a.payload.robotName,
      mapActionToRequest,
      mapResponseToAction
    )
  )
}
