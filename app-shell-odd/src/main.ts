// electron main entry point
import { app, ipcMain } from 'electron'
import dns from 'dns'
import fse from 'fs-extra'
import path from 'path'
import { createUi, waitForRobotServerAndShowMainWindow } from './ui'
import { createLogger } from './log'
import { registerDiscovery } from './discovery'
import { registerUpdateBrightness } from './system'
import { registerRobotSystemUpdate } from './system-update'
import { registerAppRestart } from './restart'
import {
  getConfig,
  getStore,
  getOverrides,
  registerConfig,
  resetStore,
} from './config'
import systemd from './systemd'
import { registerDataFiles, watchForMassStorage } from './usb'
import {
  registerNotify,
  establishBrokerConnection,
  closeBrokerConnection,
} from './notifications'
import { setUserDataPath } from './early'
import { registerResourceMonitor } from './monitor'

import type { OTLogger } from './log'
import type { BrowserWindow } from 'electron'
import type { Action, Dispatch, Logger } from './types'
import type { LogEntry } from 'winston'

/**
 * node 17 introduced a change to default IP resolving to prefer IPv6 which causes localhost requests to fail
 * setting the default to IPv4 fixes the issue
 * https://github.com/node-fetch/node-fetch/issues/1624
 */
dns.setDefaultResultOrder('ipv4first')
setUserDataPath()

systemd.sendStatus('starting app')
const config = getConfig()
const log = createLogger('main')

log.debug('App config', {
  config,
  store: getStore(),
  overrides: getOverrides(),
})

systemd.setRemoteDevToolsEnabled(config.devtools)

// hold on to references so they don't get garbage collected
let mainWindow: BrowserWindow | null | undefined
let rendererLogger: Logger

// prepended listener is important here to work around Electron issue
// https://github.com/electron/electron/issues/19468#issuecomment-623529556
app.prependOnceListener('ready', startUp)
if (config.devtools) app.once('ready', installDevtools)

function quitApplication(): void {
  app.quit()
  closeBrokerConnection()
    .then(() => {
      app.quit()
    })
    .catch(error => {
      log.warn('Failed to properly close MQTT connections:', error)
      app.quit()
    })
}

app.once('window-all-closed', () => {
  log.debug('all windows closed, quitting the app')
  quitApplication()
})

app.once('render-process-gone', (_, __, details) => {
  log.error('Renderer process has died, quitting the app', details)
  quitApplication()
})

function startUp(): void {
  log.info('Starting App')
  console.log('Starting App')
  const storeNeedsReset = fse.existsSync(
    path.join(setUserDataPath(), `_CONFIG_TO_BE_DELETED_ON_REBOOT`)
  )
  if (storeNeedsReset) {
    log.debug('store marked to be reset, resetting store')
    resetStore()
    fse.removeSync(
      path.join(app.getPath('userData'), `_CONFIG_TO_BE_DELETED_ON_REBOOT`)
    )
  }
  systemd.sendStatus('loading app')
  process.on('uncaughtException', error => log.error('Uncaught: ', { error }))
  process.on('unhandledRejection', reason =>
    log.error('Uncaught Promise rejection: ', { reason })
  )

  // wire modules to UI dispatches
  const dispatch: Dispatch = action => {
    // This function now dispatches actions to all the handlers in the app shell. That would make it
    // vulnerable to infinite recursion:
    // - handler handles action A
    // - handler dispatches action A as a response (calls this function)
    // - this function calls handler with action A
    // By deferring to nextTick(), we would still be executing the code over and over but we should have
    // broken the stack.
    process.nextTick(() => {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (mainWindow) {
        log.silly('Sending action via IPC to renderer', { action })
        mainWindow.webContents.send('dispatch', action)
      }
      log.debug(
        `bouncing action ${action.type} to ${actionHandlers.length} handlers`
      )
      // Make actions that are sourced from the shell also go to the app shell without needing
      // round tripping. This call is the reason for the nextTick() above.
      actionHandlers.forEach(handler => {
        handler(action)
      })
    })
  }

  mainWindow = createUi(dispatch)
  rendererLogger = createRendererLogger()
  void establishBrokerConnection()
  mainWindow.once('closed', () => (mainWindow = null))

  const actionHandlers: Dispatch[] = [
    registerConfig(dispatch),
    registerDiscovery(dispatch),
    registerRobotSystemUpdate(dispatch),
    registerResourceMonitor(dispatch),
    registerAppRestart(),
    registerUpdateBrightness(),
    registerNotify(dispatch, mainWindow),
    registerDataFiles(dispatch),
  ]

  ipcMain.on('dispatch', (_, action) => {
    log.debug('Received action via IPC from renderer', { action })
    actionHandlers.forEach(handler => {
      handler(action as Action)
    })
  })

  log.silly('Global references', { mainWindow, rendererLogger })

  ipcMain.once('dispatch', () => {
    log.info('First dispatch, showing')
    systemd.sendStatus('started')
    systemd.ready()
    try {
      const stopWatching = watchForMassStorage(dispatch)
      ipcMain.once('quit', stopWatching)
    } catch (err: any) {
      if (err instanceof Error) {
        console.log(
          `Failed to watch for mass storage: ${err.name}: ${err.message}`,
          err
        )
      } else {
        console.log(`Failed to watch for mass storage: ${err}`)
      }
    }
    // TODO: This is where we render the main window for the first time. See ui.ts
    // in the createUI function for more.
    if (!!!mainWindow) {
      log.error('mainWindow went away before show')
    } else {
      waitForRobotServerAndShowMainWindow(dispatch, mainWindow)
    }
  })
}

function createRendererLogger(): OTLogger {
  log.info('Creating renderer logger')

  const logger = createLogger('renderer')
  ipcMain.on('log', (_, info) => logger.log(info as LogEntry))

  return logger
}

function installDevtools(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const devtools = require('electron-devtools-installer')
  const extensions = [devtools.REACT_DEVELOPER_TOOLS, devtools.REDUX_DEVTOOLS]
  const install = devtools.default
  const forceReinstall = config.reinstallDevtools

  log.debug('Installing devtools')

  install(extensions, {
    loadExtensionOptions: { allowFileAccess: true },
    forceDownload: forceReinstall,
  })
    .then(() => log.debug('Devtools extensions installed'))
    .catch((error: unknown) => {
      log.warn('Failed to install devtools extensions', {
        forceReinstall,
        error,
      })
    })
}
