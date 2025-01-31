import type { LogLevel } from '../../logger'
import type { Language } from '/app/i18n'
import type { ProtocolSort } from '/app/redux/protocol-storage'

export type UrlProtocol = 'file:' | 'http:'

export type UpdateChannel = 'latest' | 'beta' | 'alpha'

export type DiscoveryCandidates = string[]

export type DevInternalFlag =
  | 'forceHttpPolling'
  | 'protocolStats'
  | 'enableRunNotes'
  | 'lpcRedesign'
  | 'protocolTimeline'
  | 'enableLabwareCreator'
  | 'reactQueryDevtools'
  | 'reactScan'

export type FeatureFlags = Partial<Record<DevInternalFlag, boolean | undefined>>

export type ProtocolsOnDeviceSortKey =
  | 'alphabetical'
  | 'reverse'
  | 'recentRun'
  | 'oldRun'
  | 'recentCreated'
  | 'oldCreated'

export type QuickTransfersOnDeviceSortKey =
  | 'alphabetical'
  | 'reverse'
  | 'recentCreated'
  | 'oldCreated'

export interface OnDeviceDisplaySettings {
  sleepMs: number
  brightness: number
  textSize: number
  unfinishedUnboxingFlowRoute: string | null
}

export interface ConfigV0 {
  version: 0
  devtools: boolean
  reinstallDevtools: boolean

  // app update config
  update: {
    channel: UpdateChannel
  }

  // robot update config
  buildroot: {
    manifestUrl: string
  }

  // logging config
  log: {
    level: {
      file: LogLevel
      console: LogLevel
    }
  }

  // ui and browser config
  ui: {
    width: number
    height: number
    url: {
      protocol: UrlProtocol
      path: string
    }
    webPreferences: {
      webSecurity: boolean
    }
  }

  analytics: {
    appId: string
    optedIn: boolean
    seenOptIn: boolean
  }

  // deprecated
  p10WarningSeen: {
    [id: string]: boolean | null | undefined
  }

  support: {
    userId: string
    createdAt: number
    name: string | null
    email: string | null | undefined
  }

  discovery: {
    candidates: DiscoveryCandidates
  }

  // custom labware files
  labware: {
    directory: string
  }

  // app wide alerts
  alerts: { ignored: string[] }

  // internal development flags
  devInternal?: FeatureFlags
}

export type ConfigV1 = Omit<ConfigV0, 'version' | 'discovery'> & {
  version: 1
  discovery: {
    candidates: DiscoveryCandidates
    disableCache: boolean
  }
}

export type ConfigV2 = Omit<ConfigV1, 'version'> & {
  version: 2
  calibration: {
    useTrashSurfaceForTipCal: boolean | null
  }
}

export type ConfigV3 = Omit<ConfigV2, 'version' | 'support'> & {
  version: 3
  support: ConfigV2['support'] & {
    name: string | null
    email: string | null
  }
}

export type ConfigV4 = Omit<ConfigV3, 'version' | 'labware'> & {
  version: 4
  labware: ConfigV3['labware'] & {
    showLabwareOffsetCodeSnippets: boolean
  }
}

export type ConfigV5 = Omit<ConfigV4, 'version'> & {
  version: 5
  python: {
    pathToPythonOverride: string | null
  }
}

export type ConfigV6 = Omit<ConfigV5, 'version'> & {
  version: 6
  modules: {
    heaterShaker: { isAttached: boolean }
  }
}

export type ConfigV7 = Omit<ConfigV6, 'version'> & {
  version: 7
  ui: ConfigV6['ui'] & {
    minWidth: number
  }
}

export type ConfigV8 = Omit<ConfigV7, 'version'> & {
  version: 8
}

export type ConfigV9 = Omit<ConfigV8, 'version'> & {
  version: 9
  isOnDevice: boolean
}

export type ConfigV10 = Omit<ConfigV9, 'version'> & {
  version: 10
  protocols: { sendAllProtocolsToOT3: boolean }
}

export type ConfigV11 = Omit<ConfigV10, 'version'> & {
  version: 11
  protocols: ConfigV10['protocols'] & {
    protocolsStoredSortKey: ProtocolSort | null
  }
}

export type ConfigV12 = Omit<ConfigV11, 'version' | 'buildroot'> & {
  version: 12
  robotSystemUpdate: {
    manifestUrls: { OT2: string; OT3: string }
  }
}

export type ConfigV13 = Omit<ConfigV12, 'version'> & {
  version: 13
  protocols: ConfigV12['protocols'] & {
    protocolsOnDeviceSortKey: ProtocolsOnDeviceSortKey | null
  }
}

export type ConfigV14 = Omit<ConfigV13, 'version'> & {
  version: 14
  protocols: ConfigV13['protocols'] & {
    pinnedProtocolIds: string[]
  }
}

export type ConfigV15 = Omit<ConfigV14, 'version'> & {
  version: 15
  onDeviceDisplaySettings: {
    sleepMs: number
    brightness: number
    textSize: number
  }
}

export type ConfigV16 = Omit<ConfigV15, 'version'> & {
  version: 16
  onDeviceDisplaySettings: ConfigV15['onDeviceDisplaySettings'] & {
    unfinishedUnboxingFlowRoute: string | null
  }
}

export type ConfigV17 = Omit<ConfigV16, 'version'> & {
  version: 17
  protocols: ConfigV15['protocols'] & {
    applyHistoricOffsets: boolean
  }
}

export type ConfigV18 = Omit<ConfigV17, 'version' | 'robotSystemUpdate'> & {
  version: 18
}

export type ConfigV19 = Omit<ConfigV18, 'version' | 'update'> & {
  version: 19
  devtools: boolean
  reinstallDevtools: boolean
  update: {
    channel: UpdateChannel
    hasJustUpdated: boolean
  }
}

export type ConfigV20 = Omit<ConfigV19, 'version'> & {
  version: 20
  robotSystemUpdate: {
    manifestUrls: {
      OT2: string
    }
  }
}

export type ConfigV21 = Omit<ConfigV20, 'version'> & {
  version: 21
}

export type ConfigV22 = Omit<ConfigV21, 'version' | 'analytics'> & {
  version: 22
  analytics: {
    appId: string
    optedIn: boolean
  }
}
export type ConfigV23 = Omit<ConfigV22, 'version'> & {
  version: 23
  protocols: ConfigV22['protocols'] & {
    pinnedQuickTransferIds: string[]
    quickTransfersOnDeviceSortKey: QuickTransfersOnDeviceSortKey | null
    hasDismissedQuickTransferIntro: boolean
  }
}

export type ConfigV24 = Omit<ConfigV23, 'version' | 'support'> & {
  version: 24
  userInfo: {
    userId: string
  }
}

export type ConfigV25 = Omit<ConfigV24, 'version'> & {
  version: 25
  language: {
    appLanguage: Language | null
    systemLanguage: string | null
  }
}

export type ConfigV26 = Omit<ConfigV25, 'version'> & {
  version: 26
}

export type Config = ConfigV26
