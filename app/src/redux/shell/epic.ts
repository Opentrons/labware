import { createLogger } from '../../logger'
import { alertTriggered, ALERT_APP_UPDATE_AVAILABLE } from '../alerts'
import { getUpdateChannel } from '../config'
import type { Epic, Action } from '../types'
import { remote } from './remote'
import { getAvailableShellUpdate, checkShellUpdate } from './update'
import { combineEpics } from 'redux-observable'
import { fromEvent } from 'rxjs'
import {
  map,
  mapTo,
  filter,
  pairwise,
  tap,
  ignoreElements,
} from 'rxjs/operators'

const { ipcRenderer } = remote

const log = createLogger(__filename)

const sendActionToShellEpic: Epic = action$ =>
  action$.pipe(
    // @ts-expect-error protect against absent meta key on action
    filter<Action>(a => a.meta != null && a.meta.shell != null && a.meta.shell),
    tap<Action>((shellAction: Action) =>
      ipcRenderer.send('dispatch', shellAction)
    ),
    ignoreElements()
  )

const receiveActionFromShellEpic: Epic = () =>
  // IPC event listener: (IpcRendererEvent, ...args) => void
  // our action is the only argument, so pluck it out from index 1
  fromEvent<Action>(
    // @ts-expect-error TODO: fromEvent type expects ArrayLike though ipcRenderer doesn't match that type, don't use fromEvent it's deprecated
    ipcRenderer,
    'dispatch',
    (_: unknown, incoming: Action) => incoming
  ).pipe<Action>(
    tap(incoming => {
      log.debug('Received action from main via IPC', {
        actionType: incoming.type,
      })
    })
  )

const appUpdateAvailableAlertEpic: Epic = (action$, state$) => {
  return state$.pipe(
    map(getAvailableShellUpdate),
    pairwise(),
    filter(([prev, next]) => prev === null && next !== null),
    mapTo(alertTriggered(ALERT_APP_UPDATE_AVAILABLE))
  )
}

const checkForUpdateAfterChannelChangeEpic: Epic = (action$, state$) => {
  return state$.pipe(
    map(getUpdateChannel),
    pairwise(),
    filter(([prev, next]) => prev !== next),
    mapTo(checkShellUpdate())
  )
}

export const shellEpic: Epic = combineEpics<Epic>(
  sendActionToShellEpic,
  receiveActionFromShellEpic,
  appUpdateAvailableAlertEpic,
  checkForUpdateAfterChannelChangeEpic
)
