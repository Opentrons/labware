import { createSelector } from 'reselect'
import { SLEEP_NEVER_MS } from '/app/local-resources/dom-utils'
import type { State } from '../types'
import type {
  Config,
  FeatureFlags,
  UpdateChannel,
  ProtocolsOnDeviceSortKey,
  QuickTransfersOnDeviceSortKey,
  OnDeviceDisplaySettings,
} from './types'
import type { Language } from '/app/i18n'
import type { ProtocolSort } from '/app/redux/protocol-storage'

export interface SelectOption {
  value: string
  label?: string
  isDisabled?: boolean
}

export const getConfig = (state: State): Config | null => state.config

export const getApplyHistoricOffsets: (
  state: State
) => boolean = createSelector(
  getConfig,
  config => config?.protocols.applyHistoricOffsets ?? true
)

export const getDevtoolsEnabled = (state: State): boolean => {
  return state.config?.devtools ?? false
}

export const getFeatureFlags = (state: State): FeatureFlags => {
  return state.config?.devInternal ?? {}
}

export const getUpdateChannel = (state: State): UpdateChannel => {
  return state.config?.update.channel ?? 'latest'
}

export const getHasJustUpdated = (state: State): boolean => {
  return state.config?.update.hasJustUpdated ?? false
}

export const getUseTrashSurfaceForTipCal = (state: State): boolean | null => {
  return state.config?.calibration.useTrashSurfaceForTipCal ?? null
}

export const getHasCalibrationBlock = (state: State): boolean | null => {
  const useTrashSurface = getUseTrashSurfaceForTipCal(state)
  return useTrashSurface === null ? null : !useTrashSurface
}

export const getIsHeaterShakerAttached = (state: State): boolean => {
  return state.config?.modules.heaterShaker.isAttached ?? false
}

export const getIsLabwareOffsetCodeSnippetsOn = (state: State): boolean => {
  return state.config?.labware.showLabwareOffsetCodeSnippets ?? false
}

export const getPathToPythonOverride: (
  state: State
) => string | null = createSelector(
  getConfig,
  config => config?.python.pathToPythonOverride ?? null
)

const UPDATE_CHANNEL_OPTS = [
  { label: 'Stable', value: 'latest' as UpdateChannel },
  { label: 'Beta', value: 'beta' as UpdateChannel },
]

const UPDATE_CHANNEL_OPTS_WITH_ALPHA = [
  ...UPDATE_CHANNEL_OPTS,
  { label: 'Alpha', value: 'alpha' as UpdateChannel },
]

export const getUpdateChannelOptions = (state: State): SelectOption[] => {
  return state.config?.devtools || state.config?.update.channel === 'alpha'
    ? UPDATE_CHANNEL_OPTS_WITH_ALPHA
    : UPDATE_CHANNEL_OPTS
}

export const getIsOnDevice: (state: State) => boolean = createSelector(
  getConfig,
  config => !!(config?.isOnDevice ?? false)
)

export const getProtocolsDesktopSortKey: (
  state: State
) => ProtocolSort | null = createSelector(
  getConfig,
  config => config?.protocols.protocolsStoredSortKey ?? null
)

export const getProtocolsOnDeviceSortKey: (
  state: State
) => ProtocolsOnDeviceSortKey | null = createSelector(
  getConfig,
  config => config?.protocols.protocolsOnDeviceSortKey ?? null
)

export const getPinnedProtocolIds: (
  state: State
) => string[] | undefined = createSelector(
  getConfig,
  config => config?.protocols.pinnedProtocolIds
)

export const getPinnedQuickTransferIds: (
  state: State
) => string[] | undefined = createSelector(
  getConfig,
  config => config?.protocols.pinnedQuickTransferIds
)

export const getQuickTransfersOnDeviceSortKey: (
  state: State
) => QuickTransfersOnDeviceSortKey | null = createSelector(
  getConfig,
  config => config?.protocols.quickTransfersOnDeviceSortKey ?? null
)

export const getHasDismissedQuickTransferIntro: (
  state: State
) => boolean = createSelector(
  getConfig,
  config => config?.protocols.hasDismissedQuickTransferIntro ?? false
)

export const getOnDeviceDisplaySettings: (
  state: State
) => OnDeviceDisplaySettings = createSelector(getConfig, config => {
  if (config?.onDeviceDisplaySettings != null) {
    return {
      ...config.onDeviceDisplaySettings,
      unfinishedUnboxingFlowRoute:
        // @ts-expect-error special casing 0 because there is no null type that gnu make can provide at build time
        // see dev-shell-odd in app/Makefile (we provide 0 instead of null)
        config.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute !== 0
          ? config?.onDeviceDisplaySettings.unfinishedUnboxingFlowRoute
          : null,
    }
  }
  return {
    sleepMs: SLEEP_NEVER_MS,
    brightness: 4,
    textSize: 1,
    unfinishedUnboxingFlowRoute: '/choose-language',
  }
})

export const getUserId: (state: State) => string = createSelector(
  getConfig,
  config => config?.userInfo.userId ?? ''
)

export const getAppLanguage: (state: State) => Language | null = createSelector(
  getConfig,
  config => config?.language.appLanguage ?? null
)

export const getStoredSystemLanguage: (
  state: State
) => string | null = createSelector(
  getConfig,
  config => config?.language.systemLanguage ?? null
)
