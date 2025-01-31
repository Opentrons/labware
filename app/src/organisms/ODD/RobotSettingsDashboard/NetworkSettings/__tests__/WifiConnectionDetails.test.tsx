import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getLocalRobot } from '/app/redux/discovery'
import * as Networking from '/app/redux/networking'
import { NetworkDetailsModal } from '../NetworkDetailsModal'
import { WifiConnectionDetails } from '../WifiConnectionDetails'

import type { ComponentProps } from 'react'
import type * as Dom from 'react-router-dom'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/discovery')
vi.mock('/app/redux/networking')
vi.mock('../NetworkDetailsModal')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<typeof Dom>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const getNetworkInterfaces = Networking.getNetworkInterfaces
const ROBOT_NAME = 'otie'

const initialMockWifi = {
  ipAddress: '127.0.0.100',
  subnetMask: '255.255.255.230',
  macAddress: 'WI:FI:00:00:00:00',
  type: Networking.INTERFACE_WIFI,
}

const render = (props: ComponentProps<typeof WifiConnectionDetails>) => {
  return renderWithProviders(<WifiConnectionDetails {...props} />, {
    i18nInstance: i18n,
  })
}

describe('WifiConnectionDetails', () => {
  let props: ComponentProps<typeof WifiConnectionDetails>
  beforeEach(() => {
    props = {
      activeSsid: 'mock wifi ssid',
      connectedWifiAuthType: 'none',
      handleNetworkPress: vi.fn(),
      handleJoinAnotherNetwork: vi.fn(),
    }
    vi.mocked(getLocalRobot).mockReturnValue({
      name: ROBOT_NAME,
    } as any)
    when(getNetworkInterfaces)
      .calledWith({} as State, ROBOT_NAME)
      .thenReturn({
        wifi: initialMockWifi,
        ethernet: null,
      })
    vi.mocked(NetworkDetailsModal).mockReturnValue(
      <div>mock NetworkDetailsModal</div>
    )
  })

  it('should render text and button with icon when connected to a network', () => {
    render(props)
    screen.getByText('Connected Network')
    screen.getByLabelText('mock wifi ssid_wifi_icon')
    screen.getByLabelText('mock wifi ssid_info_icon')
    screen.getByText('mock wifi ssid')
    screen.getByText('View details')
    screen.getByText('Other Networks')
  })

  it('should show the modal when tapping connected wifi button', () => {
    render(props)
    const button = screen.getByText('mock wifi ssid')
    fireEvent.click(button)
    screen.getByText('mock NetworkDetailsModal')
  })

  it('should not render text and button when not connected to a network', () => {
    props.activeSsid = undefined
    render(props)
    expect(screen.queryByText('Connected Network')).not.toBeInTheDocument()
    expect(screen.queryByText('mock wifi ssid')).not.toBeInTheDocument()
    expect(screen.queryByText('Other Networks')).not.toBeInTheDocument()
  })

  it.todo('should render the wifi list')
})
