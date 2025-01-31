// app-shell self-update tests
import * as ElectronUpdater from 'electron-updater'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'
import { UPDATE_VALUE } from '@opentrons/app/src/redux/config'
import { registerUpdate } from '../update'
import * as Cfg from '../config'

import type { Dispatch } from '../types'

vi.unmock('electron-updater')
vi.mock('electron-updater')
vi.mock('../log')
vi.mock('../config')

describe('update', () => {
  let dispatch: Dispatch
  let handleAction: Dispatch

  beforeEach(() => {
    dispatch = vi.fn()
    handleAction = registerUpdate(dispatch)
  })

  afterEach(() => {
    vi.resetAllMocks()
    ;(ElectronUpdater as any).__mockReset()
  })

  it('handles shell:CHECK_UPDATE with available update', () => {
    vi.mocked(Cfg.getConfig).mockReturnValue('dev' as any)
    handleAction({ type: 'shell:CHECK_UPDATE', meta: { shell: true } })

    expect(vi.mocked(Cfg.getConfig)).toHaveBeenCalledWith('update.channel')
    expect(vi.mocked(ElectronUpdater.autoUpdater).channel).toEqual('dev')
    expect(
      vi.mocked(ElectronUpdater.autoUpdater).checkForUpdates
    ).toHaveBeenCalledTimes(1)

    vi.mocked(ElectronUpdater.autoUpdater).emit('update-available', {
      version: '1.0.0',
    } as any)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:CHECK_UPDATE_RESULT',
      payload: { available: true, info: { version: '1.0.0' } },
    })
  })

  it('handles shell:CHECK_UPDATE with no available update', () => {
    handleAction({ type: 'shell:CHECK_UPDATE', meta: { shell: true } })
    vi.mocked(ElectronUpdater.autoUpdater).emit('update-not-available', {
      version: '1.0.0',
    } as any)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:CHECK_UPDATE_RESULT',
      payload: { available: false, info: { version: '1.0.0' } },
    })
  })

  it('handles shell:CHECK_UPDATE with error', () => {
    handleAction({ type: 'shell:CHECK_UPDATE', meta: { shell: true } })
    vi.mocked(ElectronUpdater.autoUpdater).emit('error', new Error('AH'))

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:CHECK_UPDATE_RESULT',
      payload: {
        error: { name: 'Error', message: 'AH' },
        available: false,
        info: null,
      },
    })
  })

  it('handles shell:DOWNLOAD_UPDATE', () => {
    handleAction({
      type: 'shell:DOWNLOAD_UPDATE',
      meta: { shell: true },
    })

    expect(
      vi.mocked(ElectronUpdater.autoUpdater).downloadUpdate
    ).toHaveBeenCalledTimes(1)

    const progress: any = {
      percent: 20,
    }

    vi.mocked(ElectronUpdater.autoUpdater).emit('download-progress', progress)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:DOWNLOAD_PERCENTAGE',
      payload: {
        percent: 20,
      },
    })

    vi.mocked(ElectronUpdater.autoUpdater).emit('update-downloaded', {
      version: '1.0.0',
    } as any)

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:DOWNLOAD_UPDATE_RESULT',
      payload: {},
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: UPDATE_VALUE,
      payload: { path: 'update.hasJustUpdated', value: true },
      meta: { shell: true },
    })
  })

  it('handles shell:DOWNLOAD_UPDATE with error', () => {
    handleAction({
      type: 'shell:DOWNLOAD_UPDATE',
      meta: { shell: true },
    })
    vi.mocked(ElectronUpdater.autoUpdater).emit('error', new Error('AH'))

    expect(dispatch).toHaveBeenCalledWith({
      type: 'shell:DOWNLOAD_UPDATE_RESULT',
      payload: { error: { name: 'Error', message: 'AH' } },
    })
  })

  it('handles shell:APPLY_UPDATE', () => {
    handleAction({ type: 'shell:APPLY_UPDATE', meta: { shell: true } })
    expect(
      vi.mocked(ElectronUpdater.autoUpdater).quitAndInstall
    ).toHaveBeenCalledTimes(1)
  })
})
