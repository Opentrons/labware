import { I18nextProvider } from 'react-i18next'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '/app/i18n'
import { useFeatureFlag } from '/app/redux/config'
import { useHardwareStatusText } from '..'

import type { FunctionComponent, ReactNode } from 'react'

vi.mock('/app/redux/config')

describe('useHardwareStatusText', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    )

    vi.mocked(useFeatureFlag).mockReturnValue(true)
  })
  it('should return string for ready', () => {
    const { result } = renderHook(() => useHardwareStatusText([], []), {
      wrapper,
    })
    expect(result.current).toEqual('Ready to run')
  })
  it('should return missing 1 module', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'module',
              moduleModel: 'temperatureModuleV2',
              slot: '1',
              connected: false,
              hasSlotConflict: false,
            },
          ],
          []
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Missing 1 module')
  })
  it('should return missing 2 modules', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'module',
              moduleModel: 'temperatureModuleV2',
              slot: '1',
              connected: false,
              hasSlotConflict: false,
            },
            {
              hardwareType: 'module',
              moduleModel: 'heaterShakerModuleV1',
              slot: '5',
              connected: false,
              hasSlotConflict: false,
            },
          ],
          []
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Missing 2 modules')
  })
  it('should return missing 1 pipette', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'pipette',
              pipetteName: 'p1000_96',
              mount: 'left',
              connected: false,
            },
          ],
          []
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Missing 1 pipette')
  })
  it('should return missing 2 pipettes', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'pipette',
              pipetteName: 'p50_multi_flex',
              mount: 'left',
              connected: false,
            },
            {
              hardwareType: 'pipette',
              pipetteName: 'p1000_multi_flex',
              mount: 'right',
              connected: false,
            },
          ],
          []
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Missing 2 pipettes')
  })
  it('should return missing hardware', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'pipette',
              pipetteName: 'p50_multi_flex',
              mount: 'left',
              connected: false,
            },
            {
              hardwareType: 'module',
              moduleModel: 'heaterShakerModuleV1',
              slot: '5',
              connected: false,
              hasSlotConflict: false,
            },
          ],
          []
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Missing hardware')
  })
  it('should return location conflict', () => {
    const { result } = renderHook(
      () =>
        useHardwareStatusText(
          [
            {
              hardwareType: 'module',
              moduleModel: 'heaterShakerModuleV1',
              slot: '5',
              connected: false,
              hasSlotConflict: true,
            },
          ],
          ['1']
        ),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Location conflicts')
  })
})
