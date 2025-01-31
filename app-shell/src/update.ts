// app updater
import updater from 'electron-updater'

import { createLogger } from './log'
import { getConfig } from './config'
import { UI_INITIALIZED, UPDATE_VALUE } from './constants'
import type { UpdateInfo } from '@opentrons/app/src/redux/shell/types'
import type { Action, Dispatch, PlainError } from './types'

const autoUpdater = updater.autoUpdater

autoUpdater.logger = createLogger('update')
autoUpdater.autoDownload = false
autoUpdater.forceDevUpdateConfig = true

export const CURRENT_VERSION: string = autoUpdater.currentVersion.version

export function registerUpdate(
  dispatch: Dispatch
): (action: Action) => unknown {
  return function handleAction(action: Action) {
    switch (action.type) {
      case UI_INITIALIZED:
      case 'shell:CHECK_UPDATE': {
        checkUpdate(dispatch)
        return
      }

      case 'shell:DOWNLOAD_UPDATE': {
        downloadUpdate(dispatch)
        return
      }

      case 'shell:APPLY_UPDATE': {
        autoUpdater.quitAndInstall()
      }
    }
  }
}

function checkUpdate(dispatch: Dispatch): void {
  const onAvailable = (info: UpdateInfo): void => {
    done({ info, available: true })
  }
  const onNotAvailable = (info: UpdateInfo): void => {
    done({ info, available: false })
  }

  const onError = (error: Error): void => {
    done({ error: PlainObjectError(error), info: null, available: false })
  }

  autoUpdater.once('update-available', onAvailable)
  autoUpdater.once('update-not-available', onNotAvailable)
  autoUpdater.once('error', onError)

  // @ts-expect-error(mc, 2021-02-16): do not use dot-path notation
  autoUpdater.channel = getConfig('update.channel')
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  autoUpdater.checkForUpdates()

  function done(payload: {
    info?: UpdateInfo | null
    available?: boolean
    error?: PlainError
  }): void {
    autoUpdater.removeListener('update-available', onAvailable)
    autoUpdater.removeListener('update-not-available', onNotAvailable)
    autoUpdater.removeListener('error', onError)
    dispatch({ type: 'shell:CHECK_UPDATE_RESULT', payload })
  }
}

interface ProgressInfo {
  total: number
  delta: number
  transferred: number
  percent: number
  bytesPerSecond: number
}

function downloadUpdate(dispatch: Dispatch): void {
  const onDownloading = (payload: ProgressInfo): void => {
    dispatch({ type: 'shell:DOWNLOAD_PERCENTAGE', payload })
  }
  const onDownloaded = (): void => {
    done({})
  }
  const onError = (error: Error): void => {
    done({ error: PlainObjectError(error) })
  }

  autoUpdater.on('download-progress', onDownloading)
  autoUpdater.once('update-downloaded', onDownloaded)
  autoUpdater.once('error', onError)
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  autoUpdater.downloadUpdate()

  function done(payload: { error?: PlainError }): void {
    autoUpdater.removeListener('download-progress', onDownloading)
    autoUpdater.removeListener('update-downloaded', onDownloaded)
    autoUpdater.removeListener('error', onError)
    if (payload.error == null)
      dispatch({
        type: UPDATE_VALUE,
        payload: { path: 'update.hasJustUpdated', value: true },
        meta: { shell: true },
      })
    dispatch({ type: 'shell:DOWNLOAD_UPDATE_RESULT', payload })
  }
}

// TODO(mc, 2018-03-29): this only exists to support RPC in a webworker;
//   remove when RPC is gone
function PlainObjectError(error: Error): PlainError {
  return { name: error.name, message: error.message }
}
