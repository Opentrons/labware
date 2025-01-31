import type {
  ConfigV0,
  ConfigV1,
  ConfigV2,
  ConfigV3,
  ConfigV4,
  ConfigV5,
  ConfigV6,
  ConfigV7,
  ConfigV8,
  ConfigV9,
  ConfigV10,
  ConfigV11,
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

export const MOCK_CONFIG_V0: ConfigV0 = {
  version: 0, // Default key added on boot if missing in configs
  devtools: false,
  reinstallDevtools: false,
  update: {
    channel: 'latest',
  },
  buildroot: {
    manifestUrl:
      'https://opentrons-buildroot-ci.s3.us-east-2.amazonaws.com/releases.json',
  },
  log: {
    level: {
      file: 'debug',
      console: 'info',
    },
  },
  ui: {
    width: 1024,
    height: 768,
    url: {
      protocol: 'file:',
      path: 'ui/index.html',
    },
    webPreferences: {
      webSecurity: true,
    },
  },
  analytics: {
    appId: 'mock-mixpanel-id',
    optedIn: true,
    seenOptIn: false,
  },

  // deprecated warning flag
  p10WarningSeen: {
    'some-id': true,
  },

  // user support (intercom)
  support: {
    userId: 'mock-intercom-id',
    createdAt: 1589744281,
    name: 'Unknown User',
    email: null,
  },
  discovery: {
    candidates: [],
  },
  labware: {
    directory: '/Users/ot/Library/Application Support/Opentrons/labware',
  },
  alerts: {
    ignored: [],
  },
}

export const MOCK_CONFIG_V1: ConfigV1 = {
  ...MOCK_CONFIG_V0,
  version: 1,
  discovery: {
    ...MOCK_CONFIG_V0.discovery,
    disableCache: false,
  },
}

export const MOCK_CONFIG_V2: ConfigV2 = {
  ...MOCK_CONFIG_V1,
  version: 2,
  calibration: {
    useTrashSurfaceForTipCal: null,
  },
}

export const MOCK_CONFIG_V3: ConfigV3 = {
  ...MOCK_CONFIG_V2,
  version: 3,
  support: {
    ...MOCK_CONFIG_V2.support,
    name: null,
    email: null,
  },
}

export const MOCK_CONFIG_V4: ConfigV4 = {
  ...MOCK_CONFIG_V3,
  version: 4,
  labware: {
    ...MOCK_CONFIG_V3.labware,
    showLabwareOffsetCodeSnippets: false,
  },
}

export const MOCK_CONFIG_V5: ConfigV5 = {
  ...MOCK_CONFIG_V4,
  version: 5,
  python: {
    pathToPythonOverride: null,
  },
}

export const MOCK_CONFIG_V6: ConfigV6 = {
  ...MOCK_CONFIG_V5,
  version: 6,
  modules: {
    heaterShaker: {
      isAttached: false,
    },
  },
}

export const MOCK_CONFIG_V7: ConfigV7 = {
  ...MOCK_CONFIG_V6,
  version: 7,
  ui: {
    ...MOCK_CONFIG_V6.ui,
    width: 800,
    minWidth: 600,
    height: 760,
  },
}

export const MOCK_CONFIG_V8: ConfigV8 = {
  ...MOCK_CONFIG_V7,
  version: 8,
  ui: {
    ...MOCK_CONFIG_V7.ui,
    width: 1024,
    height: 768,
  },
}

export const MOCK_CONFIG_V9: ConfigV9 = {
  ...MOCK_CONFIG_V8,
  version: 9,
  isOnDevice: false,
}

export const MOCK_CONFIG_V10: ConfigV10 = {
  ...MOCK_CONFIG_V9,
  version: 10,
  protocols: { sendAllProtocolsToOT3: false },
}

export const MOCK_CONFIG_V11: ConfigV11 = {
  ...MOCK_CONFIG_V10,
  version: 11,
  protocols: {
    ...MOCK_CONFIG_V10.protocols,
    protocolsStoredSortKey: null,
  },
}

export const MOCK_CONFIG_V12: ConfigV12 = (() => {
  const { buildroot, ...restOfV11Config } = { ...MOCK_CONFIG_V11 } as ConfigV11
  return {
    ...restOfV11Config,
    version: 12 as const,
    robotSystemUpdate: {
      manifestUrls: {
        OT2: 'some-fake-manifest',
        OT3: 'some-fake-manifest-ot3',
      },
    },
  }
})()

export const MOCK_CONFIG_V13: ConfigV13 = {
  ...MOCK_CONFIG_V12,
  version: 13,
  protocols: {
    ...MOCK_CONFIG_V12.protocols,
    protocolsOnDeviceSortKey: null,
  },
}

export const MOCK_CONFIG_V14: ConfigV14 = {
  ...MOCK_CONFIG_V13,
  version: 14,
  protocols: {
    ...MOCK_CONFIG_V13.protocols,
    pinnedProtocolIds: [],
  },
}

export const MOCK_CONFIG_V15: ConfigV15 = {
  ...MOCK_CONFIG_V14,
  version: 15,
  onDeviceDisplaySettings: {
    sleepMs: 60 * 1000 * 60 * 24 * 7,
    brightness: 4,
    textSize: 1,
  },
}

export const MOCK_CONFIG_V16: ConfigV16 = {
  ...MOCK_CONFIG_V15,
  version: 16,
  onDeviceDisplaySettings: {
    ...MOCK_CONFIG_V15.onDeviceDisplaySettings,
    unfinishedUnboxingFlowRoute: null,
  },
}

export const MOCK_CONFIG_V17: ConfigV17 = {
  ...MOCK_CONFIG_V16,
  version: 17,
  protocols: {
    ...MOCK_CONFIG_V16.protocols,
    applyHistoricOffsets: true,
  },
}

export const MOCK_CONFIG_V18: ConfigV18 = {
  ...(() => {
    const { robotSystemUpdate, version, ...rest } = MOCK_CONFIG_V17
    return rest
  })(),
  version: 18,
}

export const MOCK_CONFIG_V19: ConfigV19 = {
  ...MOCK_CONFIG_V18,
  version: 19,
  update: {
    ...MOCK_CONFIG_V18.update,
    hasJustUpdated: false,
  },
}

export const MOCK_CONFIG_V20: ConfigV20 = {
  ...MOCK_CONFIG_V19,
  version: 20,
  robotSystemUpdate: {
    manifestUrls: {
      OT2:
        'https://opentrons-buildroot-ci.s3.us-east-2.amazonaws.com/releases.json',
    },
  },
}

export const MOCK_CONFIG_V21: ConfigV21 = {
  ...MOCK_CONFIG_V20,
  version: 21,
}

export const MOCK_CONFIG_V22: ConfigV22 = {
  ...MOCK_CONFIG_V21,
  version: 22,
  analytics: {
    appId: MOCK_CONFIG_V21.analytics.appId,
    optedIn: true,
  },
}

export const MOCK_CONFIG_V23: ConfigV23 = {
  ...MOCK_CONFIG_V22,
  version: 23,
  protocols: {
    ...MOCK_CONFIG_V22.protocols,
    pinnedQuickTransferIds: [],
    quickTransfersOnDeviceSortKey: null,
    hasDismissedQuickTransferIntro: false,
  },
}

export const MOCK_CONFIG_V24: ConfigV24 = {
  ...(() => {
    const { support, ...rest } = MOCK_CONFIG_V23
    return rest
  })(),
  version: 24,
  userInfo: {
    userId: 'MOCK_UUIDv4',
  },
}

export const MOCK_CONFIG_V25: ConfigV25 = {
  ...MOCK_CONFIG_V24,
  version: 25,
  language: {
    appLanguage: null,
    systemLanguage: null,
  },
}

export const MOCK_CONFIG_V26: ConfigV26 = {
  ...MOCK_CONFIG_V25,
  version: 26,
}
