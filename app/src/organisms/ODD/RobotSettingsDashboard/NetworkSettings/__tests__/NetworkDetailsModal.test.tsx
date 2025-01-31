import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { NetworkDetailsModal } from '../NetworkDetailsModal'

import type { ComponentProps } from 'react'

const mockFn = vi.fn()

const render = (props: ComponentProps<typeof NetworkDetailsModal>) => {
  return renderWithProviders(<NetworkDetailsModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('NetworkDetailsModal', () => {
  let props: ComponentProps<typeof NetworkDetailsModal>

  beforeEach(() => {
    props = {
      setShowNetworkDetailModal: mockFn,
      ipAddress: '192.168.1.100',
      subnetMask: '255.255.255.0',
      macAddress: '00:14:2D:69:45:9F',
      ssid: 'mock Wifi ssid',
      securityType: 'WPA-2',
    }
  })

  it('should render text and icon - wifi', () => {
    render(props)
    screen.getByText('mock Wifi ssid')
    screen.getByText('IP Address')
    screen.getByText('192.168.1.100')
    screen.getByText('Security Type')
    screen.getByText('WPA-2')
    screen.getByText('Subnet Mask')
    screen.getByText('255.255.255.0')
    screen.getByText('MAC Address')
    screen.getByText('00:14:2D:69:45:9F')
    screen.getByLabelText('icon_wifi')
  })

  it('should render text and icon - ethernet', () => {
    const ethernetSettings = {
      setShowNetworkDetailModal: mockFn,
      ipAddress: '192.168.0.100',
      subnetMask: '255.255.255.0',
      macAddress: '00:14:2D:69:45:9A',
    }
    props = ethernetSettings
    render(props)
    screen.getByText('Ethernet')
    screen.getByText('IP Address')
    screen.getByText('192.168.0.100')
    expect(screen.queryByText('Security Type')).not.toBeInTheDocument()
    screen.getByText('Subnet Mask')
    screen.getByText('255.255.255.0')
    screen.getByText('MAC Address')
    screen.getByText('00:14:2D:69:45:9A')
    screen.getByLabelText('icon_ethernet')
  })

  it('should call the mock function when tapping the close icon', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('closeIcon'))
    expect(mockFn).toHaveBeenCalled()
  })

  it('should call the mock function when tapping outside of the modal', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('BackgroundOverlay'))
    expect(mockFn).toHaveBeenCalled()
  })
})
