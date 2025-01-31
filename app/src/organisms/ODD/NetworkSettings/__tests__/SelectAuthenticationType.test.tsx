import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getNetworkInterfaces, INTERFACE_WIFI } from '/app/redux/networking'
import { useIsUnboxingFlowOngoing } from '/app/redux-resources/config'
import { AlternativeSecurityTypeModal } from '../AlternativeSecurityTypeModal'
import { SelectAuthenticationType } from '../SelectAuthenticationType'
import { SetWifiCred } from '../SetWifiCred'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockSetSelectedAuthType = vi.fn()

vi.mock('../SetWifiCred')
vi.mock('/app/redux/networking')
vi.mock('/app/redux/discovery/selectors')
vi.mock('../AlternativeSecurityTypeModal')
vi.mock('/app/redux-resources/config')
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const initialMockWifi = {
  ipAddress: '127.0.0.100',
  subnetMask: '255.255.255.230',
  macAddress: 'WI:FI:00:00:00:00',
  type: INTERFACE_WIFI,
}

const render = (props: ComponentProps<typeof SelectAuthenticationType>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SelectAuthenticationType {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('SelectAuthenticationType', () => {
  let props: ComponentProps<typeof SelectAuthenticationType>
  beforeEach(() => {
    props = {
      selectedAuthType: 'wpa-psk',
      setSelectedAuthType: mockSetSelectedAuthType,
    }
    vi.mocked(getNetworkInterfaces).mockReturnValue({
      wifi: initialMockWifi,
      ethernet: null,
    })
    vi.mocked(SetWifiCred).mockReturnValue(<div>Mock SetWifiCred</div>)
    vi.mocked(AlternativeSecurityTypeModal).mockReturnValue(
      <div>mock AlternativeSecurityTypeModal</div>
    )
    vi.mocked(useIsUnboxingFlowOngoing).mockReturnValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('WPA2 Personal')
    screen.getByText('Most labs use this method')
    screen.getByText('None')
    screen.getByText('Not recommended')
    screen.getByText('Your MAC Address is WI:FI:00:00:00:00')
    screen.getByText('Need another security type?')
  })

  it('should render AlternativeSecurityTypeModal when tapping need another security type? button', () => {
    render(props)
    fireEvent.click(screen.getByText('Need another security type?'))
    screen.getByText('mock AlternativeSecurityTypeModal')
  })
})
