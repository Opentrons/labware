// preload script for renderer process
// defines subset of Electron API that renderer process is allowed to access
// for security reasons
import { ipcRenderer, webUtils } from 'electron'

// The renderer process is not permitted the file path for any type "file" input
// post Electron v32. The correct way of doing this involves the context bridge,
// see comments in Electron settings.
// See https://www.electronjs.org/docs/latest/breaking-changes#removed-filepath
const getFilePathFrom = (file: File): Promise<string> => {
  return Promise.resolve(webUtils.getPathForFile(file))
}

// @ts-expect-error can't get TS to recognize global.d.ts
global.APP_SHELL_REMOTE = { ipcRenderer, getFilePathFrom }
