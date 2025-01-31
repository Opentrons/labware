/* eslint-disable testing-library/no-node-access */
import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getLocalRobot } from '/app/redux/discovery'
import { useWifiList } from '/app/resources/networking/hooks'
import { WifiConnectionDetails } from '../WifiConnectionDetails'
import { EthernetConnectionDetails } from '../EthernetConnectionDetails'
import { NetworkSettings } from '..'

import type { ComponentProps } from 'react'
import type { DiscoveredRobot } from '/app/redux/discovery/types'
import type { WifiNetwork } from '/app/redux/networking/types'

vi.mock('/app/redux/discovery')
vi.mock('/app/resources/networking/hooks')
vi.mock('../WifiConnectionDetails')
vi.mock('../EthernetConnectionDetails')

const mockSetCurrentOption = vi.fn()

const render = (props: ComponentProps<typeof NetworkSettings>) => {
  return renderWithProviders(<NetworkSettings {...props} />, {
    i18nInstance: i18n,
  })
}

describe('NetworkSettings', () => {
  let props: ComponentProps<typeof NetworkSettings>

  beforeEach(() => {
    props = {
      setCurrentOption: mockSetCurrentOption,
      networkConnection: {
        isWifiConnected: true,
        isEthernetConnected: false,
        isUsbConnected: false,
        connectionStatus: 'Connected via Wi-Fi',
        activeSsid: 'Mock WiFi Network',
      },
    }
    vi.mocked(getLocalRobot).mockReturnValue({
      name: 'Otie',
    } as DiscoveredRobot)
    vi.mocked(useWifiList).mockReturnValue([
      {
        ssid: 'Mock WiFi Network',
        active: true,
        securityType: 'wpa-psk',
      } as WifiNetwork,
    ])
    vi.mocked(WifiConnectionDetails).mockReturnValue(
      <div>mock WifiConnectionDetails</div>
    )
    vi.mocked(EthernetConnectionDetails).mockReturnValue(
      <div>mock EthernetConnectionDetails</div>
    )
  })

  it('displays the wifi and ethernet options', () => {
    render(props)
    expect(screen.getByText('Wi-Fi')).toBeTruthy()
    expect(screen.getByText('Ethernet')).toBeTruthy()
  })

  it('selecting the Wi-Fi option displays the wifi details', () => {
    render(props)
    screen.getByText('Wi-Fi').click()
    expect(mockSetCurrentOption).toHaveBeenCalledWith('RobotSettingsWifi')
  })

  it('clicking back on the wifi details screen shows the network settings page again', () => {
    const [{ container }] = render(props)
    screen.getByText('Wi-Fi').click()
    container.querySelector('button')?.click()
    expect(screen.queryByText('WIFI DETAILS')).toBeFalsy()
    expect(screen.getByText('Network Settings')).toBeTruthy()
  })

  it('selecting the Ethernet option displays the ethernet details', () => {
    render(props)
    screen.getByText('Ethernet').click()
    expect(mockSetCurrentOption).toHaveBeenCalledWith(
      'EthernetConnectionDetails'
    )
  })

  it('clicking back on the ethernet details screen shows the network settings page again', () => {
    const [{ container }] = render(props)
    screen.getByText('Ethernet').click()
    container.querySelector('button')?.click()
    expect(screen.queryByText('ETHERNET DETAILS')).toBeFalsy()
    expect(screen.getByText('Network Settings')).toBeTruthy()
  })
})
