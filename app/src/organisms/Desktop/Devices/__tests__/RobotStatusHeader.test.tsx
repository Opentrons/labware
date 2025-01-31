import { MemoryRouter } from 'react-router-dom'
import { RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useProtocolQuery } from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { useCurrentRunStatus } from '/app/organisms/RunTimeControl/hooks'
import {
  getRobotAddressesByName,
  HEALTH_STATUS_OK,
  OPENTRONS_USB,
} from '/app/redux/discovery'
import { getNetworkInterfaces } from '/app/redux/networking'
import { useIsFlex } from '/app/redux-resources/robots'
import { RobotStatusHeader } from '../RobotStatusHeader'
import { useNotifyRunQuery, useCurrentRunId } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type { DiscoveryClientRobotAddress } from '/app/redux/discovery/types'
import type { SimpleInterfaceStatus } from '/app/redux/networking/types'
import type { State } from '/app/redux/types'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/RunTimeControl/hooks')
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/networking')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/runs')

const MOCK_OTIE = {
  name: 'otie',
  local: true,
  robotModel: 'OT-2',
}
const MOCK_BUZZ = {
  name: 'buzz',
  local: true,
  robotModel: 'Opentrons Flex',
}

const WIFI_IP = 'wifi-ip'
const ETHERNET_IP = 'ethernet-ip'

const render = (props: ComponentProps<typeof RobotStatusHeader>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotStatusHeader {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}
describe('RobotStatusHeader', () => {
  let props: ComponentProps<typeof RobotStatusHeader>

  beforeEach(() => {
    props = MOCK_OTIE
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useCurrentRunStatus).mockReturnValue(null)
    when(useNotifyRunQuery)
      .calledWith(null, { staleTime: Infinity })
      .thenReturn({} as any)
    when(useNotifyRunQuery)
      .calledWith('fakeRunId', { staleTime: Infinity })
      .thenReturn({
        data: {
          data: { protocolId: 'fakeProtocolId' },
        },
      } as any)
    when(useProtocolQuery)
      .calledWith(null, { staleTime: Infinity })
      .thenReturn({} as any)
    when(useProtocolQuery)
      .calledWith('fakeProtocolId', { staleTime: Infinity })
      .thenReturn({
        data: {
          data: {
            metadata: { protocolName: 'fake protocol name' },
          },
        },
      } as any)
    when(getNetworkInterfaces)
      .calledWith({} as State, 'otie')
      .thenReturn({ wifi: null, ethernet: null })
    when(getRobotAddressesByName)
      .calledWith({} as State, 'otie')
      .thenReturn([
        {
          ip: WIFI_IP,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
        {
          ip: ETHERNET_IP,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
        {
          ip: OPENTRONS_USB,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
      ])
    when(useIsFlex).calledWith('otie').thenReturn(true)
  })

  it('renders the model of robot and robot name - OT-2', () => {
    render(props)
    screen.getByText('OT-2')
    screen.getByText('otie')
  })

  it('renders the model of robot and robot name - OT-3', () => {
    when(getNetworkInterfaces)
      .calledWith({} as State, 'buzz')
      .thenReturn({ wifi: null, ethernet: null })
    when(getRobotAddressesByName)
      .calledWith({} as State, 'buzz')
      .thenReturn([
        {
          ip: WIFI_IP,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
        {
          ip: ETHERNET_IP,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
        {
          ip: OPENTRONS_USB,
          healthStatus: HEALTH_STATUS_OK,
        } as DiscoveryClientRobotAddress,
      ])
    render(MOCK_BUZZ)
    screen.getByText('Opentrons Flex')
    screen.getByText('buzz')
  })

  it('does not render a running protocol banner when a protocol is not running', () => {
    render(props)

    expect(screen.queryByText('fake protocol name;')).toBeFalsy()
    expect(screen.queryByText('Go to Run')).toBeFalsy()
  })

  it('renders a running protocol banner when a protocol is running', () => {
    vi.mocked(useCurrentRunId).mockReturnValue('fakeRunId')
    when(useCurrentRunStatus).calledWith().thenReturn(RUN_STATUS_RUNNING)

    render(props)

    screen.getByText('fake protocol name; running')

    const runLink = screen.getByRole('link', { name: 'Go to Run' })
    expect(runLink.getAttribute('href')).toEqual(
      '/devices/otie/protocol-runs/fakeRunId/run-preview'
    )
  })

  it('renders an ethernet icon when connected by wifi and ethernet', () => {
    when(getNetworkInterfaces)
      .calledWith({} as State, 'otie')
      .thenReturn({
        wifi: { ipAddress: WIFI_IP } as SimpleInterfaceStatus,
        ethernet: { ipAddress: ETHERNET_IP } as SimpleInterfaceStatus,
      })

    render(props)

    screen.getByLabelText('ethernet')
  })

  it('renders a wifi icon when only connected by wifi', () => {
    when(getNetworkInterfaces)
      .calledWith({} as State, 'otie')
      .thenReturn({
        wifi: { ipAddress: WIFI_IP } as SimpleInterfaceStatus,
        ethernet: null,
      })

    render(props)

    screen.getByLabelText('wifi')
  })

  it('renders a usb icon when OT-2 connected locally via USB-ethernet adapter', () => {
    when(getNetworkInterfaces)
      .calledWith({} as State, 'otie')
      .thenReturn({
        wifi: null,
        ethernet: { ipAddress: ETHERNET_IP } as SimpleInterfaceStatus,
      })
    when(useIsFlex).calledWith('otie').thenReturn(false)
    render(props)

    screen.getByLabelText('usb')
  })

  it('renders a usb icon when only connected locally', () => {
    render(props)
    screen.getByLabelText('usb')
  })

  it('does not render a wifi or ethernet icon when discovery client cannot find a healthy robot at its network connection ip addresses', () => {
    when(getNetworkInterfaces)
      .calledWith({} as State, 'otie')
      .thenReturn({
        wifi: { ipAddress: WIFI_IP } as SimpleInterfaceStatus,
        ethernet: { ipAddress: ETHERNET_IP } as SimpleInterfaceStatus,
      })
    when(getRobotAddressesByName)
      .calledWith({} as State, 'otie')
      .thenReturn([])
    render(props)

    expect(screen.queryByLabelText('wifi')).toBeNull()
    expect(screen.queryByLabelText('ethernet')).toBeNull()
  })
})
