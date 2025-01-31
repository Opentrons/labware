import { describe, it, expect } from 'vitest'

import * as Selectors from '../selectors'

import type { State } from '../../types'

describe('shell selectors', () => {
  describe('getDevtoolsEnabled', () => {
    it('should return false if config is unknown', () => {
      const state: State = { config: null } as any
      expect(Selectors.getDevtoolsEnabled(state)).toEqual(false)
    })

    it('should return config.devtools if config is known', () => {
      const state: State = { config: { devtools: true } } as any
      expect(Selectors.getDevtoolsEnabled(state)).toEqual(true)
    })
  })

  describe('getFeatureFlags', () => {
    it('should return an empty object if config is unknown', () => {
      const state: State = { config: null } as any
      expect(Selectors.getFeatureFlags(state)).toEqual({})
    })

    it('should return config.devInternal if config is known', () => {
      const state: State = {
        config: { devInternal: { ['feature' as any]: true } },
      } as any
      expect(Selectors.getFeatureFlags(state)).toEqual({ feature: true })
    })
  })

  describe('getUpdateChannel', () => {
    it('should return "latest" if config is unknown', () => {
      const state: State = { config: null } as any
      expect(Selectors.getUpdateChannel(state)).toEqual('latest')
    })

    it('should return config.update.channel if config is known', () => {
      const state: State = {
        config: { update: { channel: 'beta' } },
      } as any
      expect(Selectors.getUpdateChannel(state)).toEqual('beta')
    })
  })

  describe('getHasJustUpdated', () => {
    it('should return false if config is unknown', () => {
      const state: State = { config: null } as any
      expect(Selectors.getHasJustUpdated(state)).toEqual(false)
    })

    it('should return config.update.hasJustUpdated if config is known', () => {
      const state: State = {
        config: { update: { hasJustUpdated: false } },
      } as any
      expect(Selectors.getHasJustUpdated(state)).toEqual(false)
    })
  })

  describe('getUpdateChannelOptions', () => {
    it('should return "latest" and "beta" options if config is unknown', () => {
      const state: State = { config: null } as any
      expect(Selectors.getUpdateChannelOptions(state)).toEqual([
        { label: 'Stable', value: 'latest' },
        { label: 'Beta', value: 'beta' },
      ])
    })

    it('should return "latest" and "beta" options if config is known and devtools are disabled', () => {
      const state: State = {
        config: { devtools: false, update: { channel: 'latest' } },
      } as any
      expect(Selectors.getUpdateChannelOptions(state)).toEqual([
        { label: 'Stable', value: 'latest' },
        { label: 'Beta', value: 'beta' },
      ])
    })

    it('should return "latest", "beta", and "alpha" options if devtools are enabled', () => {
      const state: State = {
        config: { devtools: true, update: { channel: 'latest' } },
      } as any
      expect(Selectors.getUpdateChannelOptions(state)).toEqual([
        { label: 'Stable', value: 'latest' },
        { label: 'Beta', value: 'beta' },
        { label: 'Alpha', value: 'alpha' },
      ])
    })

    it('should return an "alpha" option if devtools are disabled but current channel is alpha', () => {
      const state: State = {
        config: { devtools: false, update: { channel: 'alpha' } },
      } as any
      expect(Selectors.getUpdateChannelOptions(state)).toEqual([
        { label: 'Stable', value: 'latest' },
        { label: 'Beta', value: 'beta' },
        { label: 'Alpha', value: 'alpha' },
      ])
    })
  })

  describe('getUseTrashSurfaceForTipCal', () => {
    it('should return null if saved value in config is null', () => {
      const state: State = {
        config: { calibration: { useTrashSurfaceForTipCal: null } },
      } as any
      expect(Selectors.getUseTrashSurfaceForTipCal(state)).toEqual(null)
    })

    it('should return true if saved value in config is true', () => {
      const state: State = {
        config: { calibration: { useTrashSurfaceForTipCal: true } },
      } as any
      expect(Selectors.getUseTrashSurfaceForTipCal(state)).toEqual(true)
    })

    it('should return false if saved value in config is false', () => {
      const state: State = {
        config: { calibration: { useTrashSurfaceForTipCal: false } },
      } as any
      expect(Selectors.getUseTrashSurfaceForTipCal(state)).toEqual(false)
    })
  })

  describe('getIsLabwareOffsetCodeSnippetsOn', () => {
    it('should return true is saved value in config is true', () => {
      const state: State = {
        config: { labware: { showLabwareOffsetCodeSnippets: true } },
      } as any
      expect(Selectors.getIsLabwareOffsetCodeSnippetsOn(state)).toEqual(true)
    })

    it('should return false is saved value in config is false', () => {
      const state: State = {
        config: { labware: { showLabwareOffsetCodeSnippets: false } },
      } as any
      expect(Selectors.getIsLabwareOffsetCodeSnippetsOn(state)).toEqual(false)
    })
  })

  describe('getPathToPythonOverride', () => {
    it('should return path if path is specified', () => {
      const state: State = {
        config: { python: { pathToPythonOverride: 'path' } },
      } as any
      expect(Selectors.getPathToPythonOverride(state)).toEqual('path')
    })

    it('should return null if saved value in config is null', () => {
      const state: State = {
        config: { python: { pathToPythonOverride: null } },
      } as any
      expect(Selectors.getPathToPythonOverride(state)).toEqual(null)
    })
  })

  describe('getProtocolsDesktopSortKey', () => {
    it('should return ProtocolSort if sortKey is selected', () => {
      const state: State = {
        config: {
          protocols: { protocolsStoredSortKey: 'alphabetical' },
        },
      } as any
      expect(Selectors.getProtocolsDesktopSortKey(state)).toEqual(
        'alphabetical'
      )
    })

    it('should return null if saved value in config is null', () => {
      const state: State = {
        config: { protocols: { protocolsStoredSortKey: null } },
      } as any
      expect(Selectors.getProtocolsDesktopSortKey(state)).toEqual(null)
    })
  })

  describe('getProtocolsOnDeviceSortKey', () => {
    it('should return ProtocolSort if sortKey is selected', () => {
      const state: State = {
        config: {
          protocols: { protocolsOnDeviceSortKey: 'alphabetical' },
        },
      } as any
      expect(Selectors.getProtocolsOnDeviceSortKey(state)).toEqual(
        'alphabetical'
      )
    })

    it('should return null if saved value in config is null', () => {
      const state: State = {
        config: { protocols: { protocolsOnDeviceSortKey: null } },
      } as any
      expect(Selectors.getProtocolsOnDeviceSortKey(state)).toEqual(null)
    })
  })

  describe('pinnedProtocolIds', () => {
    it('should return id list if pinnedProtocolIds is selected', () => {
      const state: State = {
        config: {
          protocols: {
            pinnedProtocolIds: ['2b790468-5d72-45ba-b5da-2fd2e6d93a0e'],
          },
        },
      } as any
      expect(Selectors.getPinnedProtocolIds(state)).toEqual([
        '2b790468-5d72-45ba-b5da-2fd2e6d93a0e',
      ])
    })

    it('should return empty array if saved value in config is empty array', () => {
      const state: State = {
        config: { protocols: { pinnedProtocolIds: [] } },
      } as any
      expect(Selectors.getPinnedProtocolIds(state)).toEqual([])
    })
  })
  describe('pinnedQuickTransferIds', () => {
    it('should return id list if pinnedQuickTransferIds is selected', () => {
      const state: State = {
        config: {
          protocols: {
            pinnedQuickTransferIds: ['2b790468-5d72-45ba-b5da-2fd2e6d93a0e'],
          },
        },
      } as any
      expect(Selectors.getPinnedQuickTransferIds(state)).toEqual([
        '2b790468-5d72-45ba-b5da-2fd2e6d93a0e',
      ])
    })

    it('should return empty array if saved value in config is empty array', () => {
      const state: State = {
        config: { protocols: { pinnedQuickTransferIds: [] } },
      } as any
      expect(Selectors.getPinnedQuickTransferIds(state)).toEqual([])
    })
  })
  describe('getOnDeviceDisplaySettings', () => {
    it('should return the initial settings OnDeviceDisplaySettings, when starting the unbox flow', () => {
      const state: State = {
        config: {
          onDeviceDisplaySettings: {
            sleepMs: 25200000,
            brightness: 4,
            textSize: 1,
            unfinishedUnboxingFlowRoute: '/choose-language',
          },
        },
      } as any
      expect(Selectors.getOnDeviceDisplaySettings(state)).toEqual({
        sleepMs: 25200000,
        brightness: 4,
        textSize: 1,
        unfinishedUnboxingFlowRoute: '/choose-language',
      })
    })
  })

  describe('applyHistoricOffsets', () => {
    it('should return false if applyHistoricOffsets is selected', () => {
      const state: State = {
        config: {
          protocols: {
            applyHistoricOffsets: false,
          },
        },
      } as any
      expect(Selectors.getApplyHistoricOffsets(state)).toEqual(false)
    })

    it('should return true if applyHistoricOffsets is selected', () => {
      const state: State = {
        config: {
          protocols: {
            applyHistoricOffsets: true,
          },
        },
      } as any
      expect(Selectors.getApplyHistoricOffsets(state)).toEqual(true)
    })
  })

  describe('getUserId', () => {
    it('should return userId if it exists in config', () => {
      const state: State = {
        config: {
          userInfo: { userId: 'test-user-id' },
        },
      } as any
      expect(Selectors.getUserId(state)).toEqual('test-user-id')
    })

    it('should return an empty string if config is null', () => {
      const state: State = { config: null } as any
      expect(Selectors.getUserId(state)).toEqual('')
    })
  })
})
