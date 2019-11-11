// @flow
// DEPRECATED
// do not add to this file
// do not import from this file if you can avoid it
import { of, concat } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import { ofType } from 'redux-observable'

import { robotApiFetch } from './http'

import type { Observable } from 'rxjs'
import type { State, Epic, Action, ActionLike } from '../types'
import type {
  RequestMeta,
  RobotApiRequest,
  RobotApiResponse,
  DeprecatedRobotApiAction as RobotApiAction,
  RobotApiActionLike,
  RobotApiRequestAction,
  RobotApiResponseAction,
  RobotApiActionType,
  RobotInstanceApiState,
  RobotApiRequestState,
} from './types'

import {
  ROBOT_API_ACTION_PREFIX,
  ROBOT_API_REQUEST_PREFIX,
  ROBOT_API_RESPONSE_PREFIX,
  ROBOT_API_ERROR_PREFIX,
} from './constants'

const robotApiRequest = (
  payload: RobotApiRequest,
  meta: RequestMeta
): RobotApiRequestAction => ({
  type: `${ROBOT_API_REQUEST_PREFIX}__${payload.method}__${payload.path}`,
  payload,
  meta,
})

const robotApiResponse = (
  payload: RobotApiResponse,
  meta: RequestMeta
): RobotApiResponseAction => ({
  type: `${ROBOT_API_RESPONSE_PREFIX}__${payload.method}__${payload.path}`,
  payload,
  meta,
})

export const robotApiError = (
  payload: RobotApiResponse,
  meta: RequestMeta
): RobotApiResponseAction => ({
  type: `${ROBOT_API_ERROR_PREFIX}__${payload.method}__${payload.path}`,
  payload,
  meta,
})

export const passRobotApiAction = (
  action: Action | ActionLike
): RobotApiActionLike | null =>
  action.type.startsWith(ROBOT_API_ACTION_PREFIX) ? (action: any) : null

export const passRobotApiRequestAction = (
  action: Action | ActionLike
): RobotApiRequestAction | null =>
  action.type.startsWith(ROBOT_API_REQUEST_PREFIX) ? (action: any) : null

export const passRobotApiResponseAction = (
  action: Action | ActionLike
): RobotApiResponseAction | null =>
  action.type.startsWith(ROBOT_API_RESPONSE_PREFIX) ? (action: any) : null

export const passRobotApiErrorAction = (
  action: Action | ActionLike
): RobotApiResponseAction | null =>
  action.type.startsWith(ROBOT_API_ERROR_PREFIX) ? (action: any) : null

export const makeRobotApiRequest = (
  request: RobotApiRequest,
  meta: RequestMeta = {}
): Observable<mixed> => {
  const reqAction = of(robotApiRequest(request, meta))
  const resAction = robotApiFetch(request).pipe(
    switchMap<RobotApiResponse, _, RobotApiResponseAction>(res =>
      of(res.ok ? robotApiResponse(res, meta) : robotApiError(res, meta))
    )
  )

  return concat(reqAction, resAction)
}

export const createBaseRobotApiEpic = (
  type: RobotApiActionType
): Epic => action$ =>
  action$.pipe(
    ofType(type),
    switchMap<RobotApiAction, _, _>(a =>
      // `any` typed to recast strictly-typed `meta` of RobotApiRequest
      // to loosely-typed `meta` of RobotApi(Request|Response)Action
      makeRobotApiRequest(a.payload, (a: any).meta)
    )
  )

export const getRobotApiState = (
  state: State,
  robotName: string
): RobotInstanceApiState | null => state.deprecatedRobotApi[robotName] || null

export const getRobotApiRequestState = (
  state: State,
  robotName: string,
  path: string
): RobotApiRequestState | null => {
  return getRobotApiState(state, robotName)?.networking[path] || null
}
