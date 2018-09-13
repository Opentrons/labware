// @flow
// robot HTTP API client module
import {combineReducers} from 'redux'
import apiReducer from './reducer'
import {calibrationReducer, type CalibrationAction} from './calibration'
import type {HealthAction} from './health'
import type {PipettesAction} from './pipettes'
import type {ModulesAction} from './modules'
import {motorsReducer, type MotorsAction} from './motors'
import type {ResetAction} from './reset'
import {robotReducer, type RobotAction} from './robot'
import {serverReducer, type ServerAction} from './server'
import type {SettingsAction} from './settings'
import {wifiReducer, type WifiAction} from './wifi'

export const reducer = combineReducers({
  calibration: calibrationReducer,
  motors: motorsReducer,
  robot: robotReducer,
  server: serverReducer,
  wifi: wifiReducer,
  // TODO(mc, 2018-07-09): api subreducer will become the sole reducer
  api: apiReducer,
})

export * from './types'

export type {
  ApiRequestAction,
  ApiSuccessAction,
  ApiFailureAction,
  ClearApiResponseAction,
} from './actions'

export type {
  DeckCalStartState,
  DeckCalCommandState,
  JogAxis,
  JogDirection,
  JogStep,
  DeckCalPoint,
} from './calibration'

export type {
  RobotMove,
  RobotHome,
  RobotLights,
} from './robot'

export type {
  RobotServerUpdate,
  RobotServerRestart,
  RobotServerUpdateIgnore,
} from './server'

export type {
  WifiListResponse,
  WifiStatusResponse,
  WifiConfigureResponse,
  RobotWifiList,
  RobotWifiStatus,
  RobotWifiConfigure,
} from './wifi'

export type State = $Call<typeof reducer>

export type Action =
  | CalibrationAction
  | HealthAction
  | ModulesAction
  | MotorsAction
  | PipettesAction
  | ResetAction
  | RobotAction
  | ServerAction
  | SettingsAction
  | WifiAction

export {
  startDeckCalibration,
  deckCalibrationCommand,
  makeGetDeckCalibrationStartState,
  makeGetDeckCalibrationCommandState,
} from './calibration'

export * from './health'

export * from './modules'

export * from './reset'

export * from './settings'

export * from './pipettes'

export {
  disengagePipetteMotors,
} from './motors'

export {
  home,
  clearHomeResponse,
  moveRobotTo,
  clearMoveResponse,
  fetchRobotLights,
  setRobotLights,
  makeGetRobotMove,
  makeGetRobotHome,
  makeGetRobotLights,
} from './robot'

export {
  updateRobotServer,
  restartRobotServer,
  makeGetAvailableRobotUpdate,
  makeGetRobotUpdateRequest,
  makeGetRobotRestartRequest,
  getAnyRobotUpdateAvailable,
  fetchHealthAndIgnored,
  fetchIgnoredUpdate,
  setIgnoredUpdate,
  makeGetRobotIgnoredUpdateRequest,
  clearRestartResponse,
} from './server'

export {
  fetchWifiList,
  fetchWifiStatus,
  clearConfigureWifiResponse,
  configureWifi,
  makeGetRobotWifiStatus,
  makeGetRobotWifiList,
  makeGetRobotWifiConfigure,
} from './wifi'
