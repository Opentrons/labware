import { when } from 'vitest-when'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'

import { i18n } from '/app/i18n'
import { useWifiList } from '/app/resources/networking/hooks'
import * as Networking from '/app/redux/networking'
import * as Fixtures from '/app/redux/networking/__fixtures__'
import { getNetworkInterfaces } from '/app/redux/networking'

import { useNetworkConnection } from '../useNetworkConnection'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'

vi.mock('/app/redux/networking/selectors')
vi.mock('../useWifiList')

const mockRobotName = 'robot-name'
const mockWifiList = [
  { ...Fixtures.mockWifiNetwork, ssid: 'foo', active: true },
  { ...Fixtures.mockWifiNetwork, ssid: 'bar' },
  {
    ...Fixtures.mockWifiNetwork,
    ssid: 'baz',
    securityType: Networking.SECURITY_NONE,
  },
]

const mockWifi = {
  ipAddress: '127.0.0.100',
  subnetMask: '255.255.255.230',
  macAddress: 'WI:FI:00:00:00:00',
  type: Networking.INTERFACE_WIFI,
}

const mockEthernet = {
  ipAddress: '127.0.0.101',
  subnetMask: '255.255.255.231',
  macAddress: 'US:B0:00:00:00:00',
  type: Networking.INTERFACE_ETHERNET,
}

const store: Store<any> = createStore(vi.fn(), {})

// ToDo (kj:0202/2023) USB test cases will be added when USB is out
describe('useNetworkConnection', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>

  beforeEach(() => {
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )

    when(useWifiList).calledWith(mockRobotName, 10000).thenReturn(mockWifiList)
    when(getNetworkInterfaces)
      .calledWith(undefined as any, mockRobotName)
      .thenReturn({ wifi: mockWifi, ethernet: mockEthernet })
  })

  it('should return network connection information - wifi and ethernet are connected', () => {
    const { result } = renderHook(() => useNetworkConnection(mockRobotName), {
      wrapper,
    })
    expect(result.current.activeSsid).toBe('foo')
    expect(result.current.isWifiConnected).toBe(true)
    expect(result.current.isEthernetConnected).toBe(true)
    expect(result.current.connectionStatus).toBe(
      'Connected via Wi-Fi and Ethernet'
    )
  })

  it('should return network connection information - only wifi is connected and ethernet is connected', () => {
    when(getNetworkInterfaces)
      .calledWith(undefined as any, mockRobotName)
      .thenReturn({ wifi: mockWifi, ethernet: null })
    const { result } = renderHook(() => useNetworkConnection(mockRobotName), {
      wrapper,
    })
    expect(result.current.activeSsid).toBe('foo')
    expect(result.current.isWifiConnected).toBe(true)
    expect(result.current.isEthernetConnected).toBe(false)
    expect(result.current.connectionStatus).toBe('foo')
  })

  it('should return network connection information - only ethernet is connected', () => {
    when(getNetworkInterfaces)
      .calledWith(undefined as any, mockRobotName)
      .thenReturn({ wifi: null, ethernet: mockEthernet })
    const { result } = renderHook(() => useNetworkConnection(mockRobotName), {
      wrapper,
    })
    expect(result.current.isWifiConnected).toBe(false)
    expect(result.current.isEthernetConnected).toBe(true)
    expect(result.current.connectionStatus).toBe('Connected via Ethernet')
  })

  it('should return network connection information - wifi and ethernet are not connected', () => {
    when(getNetworkInterfaces)
      .calledWith(undefined as any, mockRobotName)
      .thenReturn({ wifi: null, ethernet: null })
    const { result } = renderHook(() => useNetworkConnection(mockRobotName), {
      wrapper,
    })
    expect(result.current.isWifiConnected).toBe(false)
    expect(result.current.isEthernetConnected).toBe(false)
    expect(result.current.connectionStatus).toBe('Not connected')
  })
})
