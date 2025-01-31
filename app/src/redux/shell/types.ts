import type { IpcMainEvent } from 'electron'
import type { UpdateFileInfo } from 'electron-updater'
import type { ReleaseNoteInfo } from 'builder-util-runtime'
import type { Error } from '../types'
import type { RobotSystemAction } from './is-ready/types'

export interface Remote {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>
    send: (channel: string, ...args: unknown[]) => void
    on: (channel: string, listener: IpcListener) => void
    off: (channel: string, listener: IpcListener) => void
  }
  /* The renderer process isn't allowed the file path for security reasons. */
  getFilePathFrom: (file: File) => Promise<string>
}

export type IpcListener = (
  event: IpcMainEvent,
  hostname: string,
  topic: NotifyTopic,
  message: NotifyResponseData | NotifyNetworkError,
  ...args: unknown[]
) => void

export interface NotifyRefetchData {
  refetch: boolean
}

export interface NotifyUnsubscribeData {
  unsubscribe: boolean
}

export type NotifyBrokerResponses = NotifyRefetchData | NotifyUnsubscribeData
export type NotifyNetworkError = 'ECONNFAILED' | 'ECONNREFUSED'
export type NotifyResponseData = NotifyBrokerResponses | NotifyNetworkError

export interface UpdateInfo {
  version: string
  files: UpdateFileInfo[]
  releaseDate?: string
  releaseNotes?: string | null | ReleaseNoteInfo[]
}

export interface ShellUpdateState {
  checking: boolean
  downloading: boolean
  available: boolean
  downloaded: boolean
  downloadPercentage: number
  error: Error | null | undefined
  info: UpdateInfo | null | undefined
}

export type ShellUpdateAction =
  | { type: 'shell:CHECK_UPDATE'; meta: { shell: true } }
  | {
      type: 'shell:CHECK_UPDATE_RESULT'
      payload: { available?: boolean; info?: UpdateInfo | null; error?: Error }
    }
  | { type: 'shell:DOWNLOAD_UPDATE'; meta: { shell: true } }
  | { type: 'shell:DOWNLOAD_UPDATE_RESULT'; payload: { error?: Error } }
  | { type: 'shell:APPLY_UPDATE'; meta: { shell: true } }
  | { type: 'shell:DOWNLOAD_PERCENTAGE'; payload: { percent: number } }

export interface ShellState {
  update: ShellUpdateState
  isReady: boolean
  filePaths: string[]
  systemLanguage: string[] | null
}

export interface UiInitializedAction {
  type: 'shell:UI_INITIALIZED'
  meta: { shell: true }
}

export type UsbRequestsAction =
  | { type: 'shell:USB_HTTP_REQUESTS_START'; meta: { shell: true } }
  | { type: 'shell:USB_HTTP_REQUESTS_STOP'; meta: { shell: true } }

export interface AppRestartAction {
  type: 'shell:APP_RESTART'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface ReloadUiAction {
  type: 'shell:RELOAD_UI'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface SystemLanguageAction {
  type: 'shell:SYSTEM_LANGUAGE'
  payload: {
    systemLanguage: string[]
  }
  meta: { shell: true }
}

export interface SendLogAction {
  type: 'shell:SEND_LOG'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface UpdateBrightnessAction {
  type: 'shell:UPDATE_BRIGHTNESS'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceAdded {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_ADDED'
  payload: {
    rootPath: string
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceEnumerated {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_ENUMERATED'
  payload: {
    rootPath: string
    filePaths: string[]
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceRemoved {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_REMOVED'
  payload: {
    rootPath: string
  }
  meta: { shell: true }
}

export type NotifyTopic =
  | 'ALL_TOPICS'
  | 'robot-server/maintenance_runs/current_run'
  | 'robot-server/runs/commands_links'
  | 'robot-server/runs'
  | `robot-server/runs/${string}`
  | 'robot-server/deck_configuration'
  | `robot-server/runs/pre_serialized_commands/${string}`
  | `robot-server/clientData/${string}`

export interface NotifySubscribeAction {
  type: 'shell:NOTIFY_SUBSCRIBE'
  payload: {
    hostname: string
    topic: NotifyTopic
  }
  meta: { shell: true }
}

export interface SendFilePathsAction {
  type: 'shell:SEND_FILE_PATHS'
  payload: {
    filePaths: string[]
  }
  meta: { shell: true }
}

export type ShellAction =
  | UiInitializedAction
  | ShellUpdateAction
  | RobotSystemAction
  | UsbRequestsAction
  | AppRestartAction
  | ReloadUiAction
  | SendLogAction
  | UpdateBrightnessAction
  | RobotMassStorageDeviceAdded
  | RobotMassStorageDeviceEnumerated
  | RobotMassStorageDeviceRemoved
  | NotifySubscribeAction
  | SendFilePathsAction
  | SystemLanguageAction

export type IPCSafeFormDataEntry =
  | {
      type: 'string'
      name: string
      value: string
    }
  | {
      type: 'file'
      name: string
      value: ArrayBuffer
      filename: string
    }

export type IPCSafeFormData = IPCSafeFormDataEntry[]
