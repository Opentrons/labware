import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useWifiList } from '/app/resources/networking/hooks'
import { getNetworkInterfaces, INTERFACE_WIFI } from '/app/redux/networking'
import * as Fixtures from '/app/redux/networking/__fixtures__'
import { NetworkDetailsModal } from '../../RobotSettingsDashboard/NetworkSettings/NetworkDetailsModal'
import { WifiConnectionDetails } from '../WifiConnectionDetails'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

vi.mock('/app/resources/networking/hooks')
vi.mock('/app/redux/networking')
vi.mock('/app/redux/discovery/selectors')
vi.mock('../../RobotSettingsDashboard/NetworkSettings/NetworkDetailsModal')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof WifiConnectionDetails>) => {
  return renderWithProviders(
    <MemoryRouter>
      <WifiConnectionDetails {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const initialMockWifi = {
  ipAddress: '127.0.0.100',
  subnetMask: '255.255.255.230',
  macAddress: 'WI:FI:00:00:00:00',
  type: INTERFACE_WIFI,
}

const mockWifiList = [
  { ...Fixtures.mockWifiNetwork, ssid: 'foo', active: true },
  { ...Fixtures.mockWifiNetwork, ssid: 'bar', active: false },
]

describe('WifiConnectionDetails', () => {
  let props: ComponentProps<typeof WifiConnectionDetails>
  beforeEach(() => {
    props = {
      ssid: 'mockWifi',
      authType: 'wpa-psk',
    }
    vi.mocked(getNetworkInterfaces).mockReturnValue({
      wifi: initialMockWifi,
      ethernet: null,
    })
    vi.mocked(useWifiList).mockReturnValue(mockWifiList)
    vi.mocked(NetworkDetailsModal).mockReturnValue(
      <div>mock NetworkDetailsModal</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render title and description', () => {
    render(props)
    screen.getByText('Wi-Fi')
    screen.getByText('Successfully connected to mockWifi!')
    screen.getByText('View network details')
    screen.getByText('Continue')
  })

  it('should render network details when tapping view network details', () => {
    render(props)
    fireEvent.click(screen.getByText('View network details'))
    screen.getByText('mock NetworkDetailsModal')
  })

  it('when clicking Check for updates button, should call mock function', () => {
    render(props)
    fireEvent.click(screen.getByText('Continue'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/robot-settings/update-robot-during-onboarding'
    )
  })
})
