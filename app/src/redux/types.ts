/* eslint-disable no-use-before-define */
// application types
import type { Store as ReduxStore, Dispatch as ReduxDispatch } from 'redux'
import type { RouterAction } from 'connected-react-router'
import type { Observable } from 'rxjs'

import type { RobotApiState, RobotApiAction } from './robot-api/types'
import type { RobotAdminState, RobotAdminAction } from './robot-admin/types'
import type {
  RobotControlsState,
  RobotControlsAction,
} from './robot-controls/types'
import type { RobotUpdateState, RobotUpdateAction } from './robot-update/types'
import type { PipettesState, PipettesAction } from './pipettes/types'
import type { ModulesAction } from './modules/types'
import type { ShellState, ShellAction } from './shell/types'
import type { ConfigState, ConfigAction } from './config/types'
import type { DiscoveryState, DiscoveryAction } from './discovery/types'
import type { NetworkingState, NetworkingAction } from './networking/types'
import type {
  ProtocolStorageState,
  ProtocolStorageAction,
} from './protocol-storage/types'
import type { ProtocolAnalysisAction } from './protocol-analysis'
import type {
  CustomLabwareState,
  CustomLabwareAction,
  AddCustomLabwareFromCreatorAction,
} from './custom-labware/types'
import type {
  RobotSettingsState,
  RobotSettingsAction,
} from './robot-settings/types'
import type { CalibrationState, CalibrationAction } from './calibration/types'
import type { SystemInfoState, SystemInfoAction } from './system-info/types'
import type { AlertsState, AlertsAction } from './alerts/types'
import type { SessionState, SessionsAction } from './sessions/types'
import type { AnalyticsTriggerAction } from './analytics/types'

import type { ProtocolRunState, ProtocolRunAction } from './protocol-runs/types'

export interface State {
  readonly robotApi: RobotApiState
  readonly robotAdmin: RobotAdminState
  readonly robotControls: RobotControlsState
  readonly robotSettings: RobotSettingsState
  readonly robotUpdate: RobotUpdateState
  readonly pipettes: PipettesState
  readonly config: ConfigState
  readonly discovery: DiscoveryState
  readonly networking: NetworkingState
  readonly labware: CustomLabwareState
  readonly shell: ShellState
  readonly systemInfo: SystemInfoState
  readonly alerts: AlertsState
  readonly sessions: SessionState
  readonly calibration: CalibrationState
  readonly protocolStorage: ProtocolStorageState
  readonly protocolRuns: ProtocolRunState
}

export type Action =
  | RobotApiAction
  | RobotAdminAction
  | RobotControlsAction
  | RobotSettingsAction
  | RobotUpdateAction
  | PipettesAction
  | ModulesAction
  | ShellAction
  | ConfigAction
  | RouterAction
  | DiscoveryAction
  | ProtocolAnalysisAction
  | ProtocolStorageAction
  | CustomLabwareAction
  | NetworkingAction
  | SystemInfoAction
  | AlertsAction
  | SessionsAction
  | CalibrationAction
  | AnalyticsTriggerAction
  | AddCustomLabwareFromCreatorAction
  | ProtocolRunAction

export type GetState = () => State

export type ThunkAction =
  | ((dispatch: Dispatch, getState: GetState) => Action)
  | ((dispatch: Dispatch, getState: GetState) => void)

export type ThunkPromiseAction = (
  dispatch: Dispatch,
  getState: GetState
) => Promise<Action | null | undefined>

export type Store = ReduxStore<State, Action>

export type Dispatch = PlainDispatch & ThunkDispatch & ThunkPromiseDispatch

export type Middleware = (s: MwStore) => (n: PlainDispatch) => PlainDispatch

interface MwStore {
  getState: GetState
  dispatch: Dispatch
}

type PlainDispatch = ReduxDispatch<Action>

type ThunkDispatch = (thunk: ThunkAction) => Action | null | undefined

type ThunkPromiseDispatch = (
  thunk: ThunkPromiseAction
) => Promise<Action | null | undefined>

export type Epic = (
  action$: Observable<Action>,
  state$: Observable<State>
) => Observable<Action>

export type Error = Partial<{ name: string; message: string }>

export * from './shell/types'
