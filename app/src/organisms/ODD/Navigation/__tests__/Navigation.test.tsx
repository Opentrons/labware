import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getLocalRobot } from '/app/redux/discovery'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'
import { useNetworkConnection } from '/app/resources/networking/hooks/useNetworkConnection'
import { NavigationMenu } from '../NavigationMenu'
import { Navigation } from '..'
import { useScrollPosition } from '/app/local-resources/dom-utils'

import type { ComponentProps } from 'react'

vi.mock('/app/resources/networking/hooks/useNetworkConnection')
vi.mock('/app/redux/discovery')
vi.mock('../NavigationMenu')
vi.mock('/app/local-resources/dom-utils')

mockConnectedRobot.name = '12345678901234567'

const render = (props: ComponentProps<typeof Navigation>) => {
  return renderWithProviders(
    <MemoryRouter>
      <Navigation {...props} />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )[0]
}

describe('Navigation', () => {
  let props: ComponentProps<typeof Navigation>
  beforeEach(() => {
    props = {}
    vi.mocked(getLocalRobot).mockReturnValue(mockConnectedRobot)
    vi.mocked(NavigationMenu).mockReturnValue(<div>mock NavigationMenu</div>)
    vi.mocked(useNetworkConnection).mockReturnValue({
      isEthernetConnected: false,
      isWifiConnected: false,
      isUsbConnected: false,
      connectionStatus: 'Not connected',
    })
    vi.mocked(useScrollPosition).mockReturnValue({
      isScrolled: false,
      scrollRef: {} as any,
    })
  })
  it('should render text and they have attribute', () => {
    render(props)
    screen.getByRole('link', { name: '123456789012...' }) // because of the truncate function
    const allProtocols = screen.getByRole('link', { name: 'Protocols' })
    expect(allProtocols).toHaveAttribute('href', '/protocols')

    const quickTransfer = screen.getByRole('link', { name: 'Quick Transfer' })
    expect(quickTransfer).toHaveAttribute('href', '/quick-transfer')

    const instruments = screen.getByRole('link', { name: 'Instruments' })
    expect(instruments).toHaveAttribute('href', '/instruments')

    const settings = screen.getByRole('link', { name: 'Settings' })
    expect(settings).toHaveAttribute('href', '/robot-settings')

    expect(screen.queryByText('Get started')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('network icon')).not.toBeInTheDocument()
  })
  it('should render a network icon', () => {
    vi.mocked(useNetworkConnection).mockReturnValue({
      isEthernetConnected: false,
      isWifiConnected: true,
      isUsbConnected: false,
      connectionStatus: 'Not connected',
      icon: 'wifi',
    })
    render(props)
    expect(screen.getByLabelText('network icon')).toBeInTheDocument()
  })
  it('should render the overflow btn and clicking on it renders the menu', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'overflow menu button' })
    )
    screen.getByText('mock NavigationMenu')
  })
  it('should call the setNavMenuIsOpened prop when you click on the overflow menu button', () => {
    props = {
      ...props,
      setNavMenuIsOpened: vi.fn(),
    }
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'overflow menu button' })
    )
    screen.getByText('mock NavigationMenu')
    expect(props.setNavMenuIsOpened).toHaveBeenCalled()
  })
  it('should change z index of nav bar when longPressModalIsOpened is defined and true', () => {
    props = {
      ...props,
      longPressModalIsOpened: true,
    }
    render(props)
    expect(screen.getByLabelText('Navigation_container')).toHaveStyle({
      zIndex: 0,
    })
  })
})
