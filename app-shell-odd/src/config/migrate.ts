import path from 'path'
import { app } from 'electron'
import uuid from 'uuid/v4'

import type {
  Config,
  ConfigV12,
  ConfigV13,
  ConfigV14,
  ConfigV15,
  ConfigV16,
  ConfigV17,
  ConfigV18,
  ConfigV19,
  ConfigV20,
  ConfigV21,
  ConfigV22,
  ConfigV23,
  ConfigV24,
  ConfigV25,
  ConfigV26,
} from '@opentrons/app/src/redux/config/types'
// format
// base config v12 defaults
// any default values for later config versions are specified in the migration
// functions for those version below

const CONFIG_VERSION_LATEST = 26 // update this after each config version bump

const PKG_VERSION: string = _PKG_VERSION_
export const DEFAULTS_V12: ConfigV12 = {
  version: 12,
  devtools: false,
  reinstallDevtools: false,
  update: { channel: PKG_VERSION.includes('beta') ? 'beta' : 'latest' },
  log: { level: { file: 'debug', console: 'info' } },
  ui: {
    width: 1024,
    height: 600,
    url: { protocol: 'file:', path: 'ui/index.html' },
    webPreferences: { webSecurity: true },
    minWidth: 600,
  },
  analytics: {
    appId: uuid(),
    optedIn: false,
    seenOptIn: true,
  },
  support: {
    userId: uuid(),
    createdAt: Math.floor(Date.now() / 1000),
    name: null,
    email: null,
  },
  discovery: {
    candidates: [],
    disableCache: false,
  },
  labware: {
    directory: path.join(app.getPath('userData'), 'labware'),
    showLabwareOffsetCodeSnippets: false,
  },
  alerts: { ignored: [] },
  p10WarningSeen: {},
  calibration: { useTrashSurfaceForTipCal: null },
  python: { pathToPythonOverride: null },
  modules: { heaterShaker: { isAttached: false } },
  isOnDevice: true,
  protocols: { sendAllProtocolsToOT3: false, protocolsStoredSortKey: null },
  robotSystemUpdate: {
    manifestUrls: {
      OT2: 'dummy-ot2-manifest',
      OT3: 'dummy-ot3-manifest',
    },
  },
}

const BASE_CONFIG_VERSION = Number(DEFAULTS_V12.version)

// config version 13 migration and defaults
const toVersion13 = (prevConfig: ConfigV12): ConfigV13 => {
  const nextConfig = {
    ...prevConfig,
    version: 13 as const,
    protocols: {
      ...prevConfig.protocols,
      protocolsOnDeviceSortKey: null,
    },
  }
  return nextConfig
}

// config version 14 migration and defaults
const toVersion14 = (prevConfig: ConfigV13): ConfigV14 => {
  const nextConfig = {
    ...prevConfig,
    version: 14 as const,
    protocols: {
      ...prevConfig.protocols,
      pinnedProtocolIds: [],
    },
  }
  return nextConfig
}

// config version 15 migration and defaults
const toVersion15 = (prevConfig: ConfigV14): ConfigV15 => {
  // Note (kj:02/10/2023) default settings
  // sleepMs: never(no sleep), brightness device default settings, textSize x1
  const nextConfig = {
    ...prevConfig,
    version: 15 as const,
    onDeviceDisplaySettings: {
      sleepMs: 60 * 1000 * 60 * 24 * 7,
      brightness: 4,
      textSize: 1,
    },
  }
  return nextConfig
}

// config version 16 migration and defaults
const toVersion16 = (prevConfig: ConfigV15): ConfigV16 => {
  const nextConfig = {
    ...prevConfig,
    version: 16 as const,
    onDeviceDisplaySettings: {
      ...prevConfig.onDeviceDisplaySettings,
      unfinishedUnboxingFlowRoute: '/welcome',
    },
  }
  return nextConfig
}

// config version 17 migration and defaults
const toVersion17 = (prevConfig: ConfigV16): ConfigV17 => {
  const nextConfig = {
    ...prevConfig,
    version: 17 as const,
    protocols: {
      ...prevConfig.protocols,
      applyHistoricOffsets: true,
    },
  }
  return nextConfig
}

const toVersion18 = (prevConfig: ConfigV17): ConfigV18 => {
  const { robotSystemUpdate, version, ...rest } = prevConfig
  return {
    version: 18 as const,
    ...rest,
  }
}

const toVersion19 = (prevConfig: ConfigV18): ConfigV19 => {
  const nextConfig = {
    ...prevConfig,
    version: 19 as const,
    update: {
      ...prevConfig.update,
      hasJustUpdated: false,
    },
  }
  return nextConfig
}

const toVersion20 = (prevConfig: ConfigV19): ConfigV20 => {
  return {
    ...prevConfig,
    version: 20 as const,
    robotSystemUpdate: {
      manifestUrls: {
        OT2: 'not-used-on-ODD',
      },
    },
  }
}

const toVersion21 = (prevConfig: ConfigV20): ConfigV21 => {
  return {
    ...prevConfig,
    version: 21 as const,
    onDeviceDisplaySettings: {
      ...prevConfig.onDeviceDisplaySettings,
      unfinishedUnboxingFlowRoute:
        prevConfig.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute ===
        '/dashboard'
          ? null
          : prevConfig.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute,
    },
  }
}

const toVersion22 = (prevConfig: ConfigV21): ConfigV22 => {
  const nextConfig = {
    ...prevConfig,
    version: 22 as const,
    analytics: {
      appId: prevConfig.analytics.appId,
      optedIn: true,
    },
  }
  return nextConfig
}
const toVersion23 = (prevConfig: ConfigV22): ConfigV23 => {
  const nextConfig = {
    ...prevConfig,
    version: 23 as const,
    protocols: {
      ...prevConfig.protocols,
      pinnedQuickTransferIds: [],
      quickTransfersOnDeviceSortKey: null,
      hasDismissedQuickTransferIntro: false,
    },
  }
  return nextConfig
}

const toVersion24 = (prevConfig: ConfigV23): ConfigV24 => {
  const { support, ...rest } = prevConfig
  return {
    ...rest,
    version: 24 as const,
    userInfo: {
      userId: uuid(),
    },
  }
}

const toVersion25 = (prevConfig: ConfigV24): ConfigV25 => {
  const nextConfig = {
    ...prevConfig,
    version: 25 as const,
    language: {
      appLanguage: null,
      systemLanguage: null,
    },
  }
  return nextConfig
}
const toVersion26 = (prevConfig: ConfigV25): ConfigV26 => {
  const nextConfig = {
    ...prevConfig,
    version: 26 as const,
    onDeviceDisplaySettings: {
      ...prevConfig.onDeviceDisplaySettings,
      unfinishedUnboxingFlowRoute:
        prevConfig.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute ===
        '/welcome'
          ? '/choose-language'
          : prevConfig.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute,
    },
  }
  return nextConfig
}

const MIGRATIONS: [
  (prevConfig: ConfigV12) => ConfigV13,
  (prevConfig: ConfigV13) => ConfigV14,
  (prevConfig: ConfigV14) => ConfigV15,
  (prevConfig: ConfigV15) => ConfigV16,
  (prevConfig: ConfigV16) => ConfigV17,
  (prevConfig: ConfigV17) => ConfigV18,
  (prevConfig: ConfigV18) => ConfigV19,
  (prevConfig: ConfigV19) => ConfigV20,
  (prevConfig: ConfigV20) => ConfigV21,
  (prevConfig: ConfigV21) => ConfigV22,
  (prevConfig: ConfigV22) => ConfigV23,
  (prevConfig: ConfigV23) => ConfigV24,
  (prevConfig: ConfigV24) => ConfigV25,
  (prevConfig: ConfigV25) => ConfigV26
] = [
  toVersion13,
  toVersion14,
  toVersion15,
  toVersion16,
  toVersion17,
  toVersion18,
  toVersion19,
  toVersion20,
  toVersion21,
  toVersion22,
  toVersion23,
  toVersion24,
  toVersion25,
  toVersion26,
]

export const DEFAULTS: Config = migrate(DEFAULTS_V12)

export function migrate(
  prevConfig:
    | ConfigV12
    | ConfigV13
    | ConfigV14
    | ConfigV15
    | ConfigV16
    | ConfigV17
    | ConfigV18
    | ConfigV19
    | ConfigV20
    | ConfigV21
    | ConfigV22
    | ConfigV23
    | ConfigV24
    | ConfigV25
    | ConfigV26
): Config {
  let result = prevConfig
  // loop through the migrations, skipping any migrations that are unnecessary
  // Note: the default version of app-shell-odd is version 12 (need to adjust the index range)
  for (
    let i: number = prevConfig.version;
    i < BASE_CONFIG_VERSION + MIGRATIONS.length;
    i++
  ) {
    const migrateVersion = MIGRATIONS[i - BASE_CONFIG_VERSION]
    // @ts-expect-error (kj: 01/27/2023): migrateVersion function input typed to never
    result = migrateVersion(result)
  }

  if (result.version < CONFIG_VERSION_LATEST) {
    throw new Error(
      `Config migration failed; expected at least version ${CONFIG_VERSION_LATEST} but got ${result.version}`
    )
  }

  return result as Config
}
