// @flow
// generic api reducer

import type {State, Action} from '../types'
import type {BaseRobot} from '../robot'
import type {HealthState} from './health'
import type {PipettesState} from './pipettes'
import type {ModulesState} from './modules'
import type {MotorsState} from './motors'
import type {ResetState} from './reset'
import type {SettingsState} from './settings'
import type {NetworkingState} from './networking'

type RobotApiState = {|
  ...HealthState,
  ...PipettesState,
  ...ModulesState,
  ...MotorsState,
  ...ResetState,
  ...SettingsState,
  ...NetworkingState,
|}

type ApiState = {[name: string]: ?RobotApiState}

export default function apiReducer (
  state: ApiState = {},
  action: Action
): ApiState {
  switch (action.type) {
    case 'api:REQUEST': {
      const {request} = action.payload
      const {name, path, stateByName, stateByPath} = getUpdateInfo(state, action)

      return {
        ...state,
        [name]: {
          ...stateByName,
          [path]: {...stateByPath, request, inProgress: true, error: null},
        },
      }
    }

    case 'api:SUCCESS': {
      const {response} = action.payload
      const {name, path, stateByName, stateByPath} = getUpdateInfo(state, action)

      return {
        ...state,
        [name]: {
          ...stateByName,
          [path]: {...stateByPath, response, inProgress: false, error: null},
        },
      }
    }

    case 'api:FAILURE': {
      const {error} = action.payload
      const {name, path, stateByName, stateByPath} = getUpdateInfo(state, action)
      if (!stateByPath || !stateByPath.inProgress) return state

      return {
        ...state,
        [name]: {
          ...stateByName,
          [path]: {...stateByPath, error, inProgress: false},
        },
      }
    }

    case 'api:CLEAR_RESPONSE': {
      const {name, path, stateByName, stateByPath} = getUpdateInfo(state, action)

      return {
        ...state,
        [name]: {
          ...stateByName,
          [path]: {...stateByPath, response: null, inProgress: false, error: null},
        },
      }
    }

    case 'discovery:UPDATE_LIST':
      return action.payload.robots.reduce((apiState, robot) => {
        if (!robot.ok) return {...state, [robot.name]: {}}
        return apiState
      }, state)
  }

  return state
}

export function getRobotApiState (
  state: State,
  props: BaseRobot
): RobotApiState {
  return state.api.api[props.name] || {}
}

function getUpdateInfo (state: ApiState, action: *): * {
  const {path, robot: {name}} = action.payload
  const stateByName = state[name] || {}
  // $FlowFixMe: type RobotApiState properly
  const stateByPath = stateByName[path] || {}

  return {name, path, stateByName, stateByPath}
}
