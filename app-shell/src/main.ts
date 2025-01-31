// electron main entry point
import { app, ipcMain } from 'electron'
import electronDebug from 'electron-debug'
import dns from 'dns'
import contextMenu from 'electron-context-menu'
import * as electronDevtoolsInstaller from 'electron-devtools-installer'

import { createUi, registerReloadUi, registerSystemLanguage } from './ui'
import { initializeMenu } from './menu'
import { createLogger } from './log'
import { registerProtocolAnalysis } from './protocol-analysis'
import { registerDiscovery } from './discovery'
import { registerLabware } from './labware'
import { registerUpdate } from './update'
import { registerRobotUpdate } from './robot-update'
import { registerSystemInfo } from './system-info'
import { registerProtocolStorage } from './protocol-storage'
import { getConfig, getStore, getOverrides, registerConfig } from './config'
import { registerUsb } from './usb'
import { registerNotify, closeAllNotifyConnections } from './notifications'
import type { BrowserWindow } from 'electron'
import type { Action, Dispatch, Logger } from './types'
import type { LogEntry } from 'winston'

/**
 * node 17 introduced a change to default IP resolving to prefer IPv6 which causes localhost requests to fail
 * setting the default to IPv4 fixes the issue
 * https://github.com/node-fetch/node-fetch/issues/1624
 */
dns.setDefaultResultOrder('ipv4first')

const config = getConfig()
const log = createLogger('main')

log.debug('App config', {
  config,
  store: getStore(),
  overrides: getOverrides(),
})

if (config.devtools) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  electronDebug({ isEnabled: true, showDevTools: true })
}

// hold on to references so they don't get garbage collected
let mainWindow: BrowserWindow | null | undefined
let rendererLogger: Logger

// prepended listener is important here to work around Electron issue
// https://github.com/electron/electron/issues/19468#issuecomment-623529556
app.prependOnceListener('ready', startUp)
// eslint-disable-next-line @typescript-eslint/no-misused-promises
if (config.devtools) app.once('ready', installDevtools)

app.once('window-all-closed', () => {
  log.debug('all windows closed, quitting the app')
  app.quit()
  closeAllNotifyConnections()
    .then(() => {
      app.quit()
    })
    .catch(error => {
      log.warn('Failed to properly close MQTT connections:', error)
      app.quit()
    })
})

function startUp(): void {
  log.info('Starting App')
  process.on('uncaughtException', error => log.error('Uncaught: ', { error }))
  process.on('unhandledRejection', reason =>
    log.error('Uncaught Promise rejection: ', { reason })
  )

  mainWindow = createUi()
  rendererLogger = createRendererLogger()

  mainWindow.once('closed', () => (mainWindow = null))

  contextMenu({
    menu: actions => {
      return config.devtools
        ? [actions.copy({}), actions.searchWithGoogle({}), actions.inspect()]
        : [actions.copy({}), actions.searchWithGoogle({})]
    },
  })

  initializeMenu()

  // wire modules to UI dispatches
  const dispatch: Dispatch = action => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (mainWindow) {
      log.silly('Sending action via IPC to renderer', { action })
      mainWindow.webContents.send('dispatch', action)
    }
  }

  const actionHandlers: Dispatch[] = [
    registerConfig(dispatch),
    registerDiscovery(dispatch),
    registerProtocolAnalysis(dispatch, mainWindow),
    registerUpdate(dispatch),
    registerRobotUpdate(dispatch),
    registerLabware(dispatch, mainWindow),
    registerSystemInfo(dispatch),
    registerProtocolStorage(dispatch),
    registerUsb(dispatch),
    registerNotify(dispatch, mainWindow),
    registerReloadUi(mainWindow),
    registerSystemLanguage(dispatch),
  ]

  ipcMain.on('dispatch', (_, action) => {
    log.debug('Received action via IPC from renderer', { action })
    actionHandlers.forEach(handler => {
      handler(action as Action)
    })
  })

  log.silly('Global references', { mainWindow, rendererLogger })
}

function createRendererLogger(): Logger {
  log.info('Creating renderer logger')

  const logger = createLogger('renderer')
  ipcMain.on('log', (_, info) => logger.log(info as LogEntry))

  return logger
}

function installDevtools(): Promise<Logger> {
  const extensions = [
    electronDevtoolsInstaller.REACT_DEVELOPER_TOOLS,
    electronDevtoolsInstaller.REDUX_DEVTOOLS,
  ]
  // @ts-expect-error the types for electron-devtools-installer are not correct
  // when importing the default export via commmon JS. the installer is actually nested in
  // another default object
  const install = electronDevtoolsInstaller.default?.default
  const forceReinstall = config.reinstallDevtools

  log.debug('Installing devtools')

  if (typeof install === 'function') {
    return install(extensions, {
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
  } else {
    log.warn('could not resolve electron dev tools installer')
    return Promise.reject(
      new Error('could not resolve electron dev tools installer')
    )
  }
}
