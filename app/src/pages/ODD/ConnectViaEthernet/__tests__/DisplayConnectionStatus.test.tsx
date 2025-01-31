import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { DisplayConnectionStatus } from '../DisplayConnectionStatus'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockFunc = vi.fn()
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof DisplayConnectionStatus>) => {
  return renderWithProviders(<DisplayConnectionStatus {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DisplayConnectionStatus', () => {
  let props: ComponentProps<typeof DisplayConnectionStatus>

  beforeEach(() => {
    props = {
      isConnected: true,
      setShowNetworkDetailsModal: mockFunc,
    }
  })

  it('should render text, icon, and buttons when the connection status is connected', () => {
    render(props)
    screen.getByTestId('Ethernet_connected_icon')
    screen.getByText('Successfully connected!')
    screen.getByText('View network details')
    screen.getByText('Continue')
  })

  it('should render text, icon, and buttons when the connection status is not connected', () => {
    props.isConnected = false
    render(props)
    screen.getByTestId('Ethernet_not_connected_icon')
    screen.getByText('No network found')
    screen.getByText(
      'Connect an Ethernet cable to the back of the robot and a network switch or hub.'
    )
    screen.getByText('View network details')
  })

  it('should call a mock function when tapping view network details button when the connection status is connected', () => {
    render(props)
    fireEvent.click(screen.getByText('View network details'))
    expect(mockFunc).toHaveBeenCalled()
  })

  it('should call a mock function when tapping view network details button when the connection status is not connected', () => {
    render(props)
    fireEvent.click(screen.getByText('View network details'))
    expect(mockFunc).toHaveBeenCalled()
  })

  it('should call a mock push when tapping continue button', () => {
    render(props)
    fireEvent.click(screen.getByText('Continue'))
    expect(mockNavigate).toHaveBeenCalledWith(
      '/robot-settings/update-robot-during-onboarding'
    )
  })
})
