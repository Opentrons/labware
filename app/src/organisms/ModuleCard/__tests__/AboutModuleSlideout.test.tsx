import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  RUN_STATUS_IDLE,
  RUN_STATUS_RUNNING,
  RUN_STATUS_FINISHING,
} from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockMagneticModule,
  mockMagneticModuleGen2,
  mockTemperatureModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
} from '/app/redux/modules/__fixtures__'
import { useCurrentRunStatus } from '/app/organisms/RunTimeControl'
import { AboutModuleSlideout } from '../AboutModuleSlideout'

import type { ComponentProps } from 'react'

vi.mock('/app/organisms/RunTimeControl')

const render = (props: ComponentProps<typeof AboutModuleSlideout>) => {
  return renderWithProviders(<AboutModuleSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AboutModuleSlideout', () => {
  let props: ComponentProps<typeof AboutModuleSlideout>
  beforeEach(() => {
    props = {
      module: mockMagneticModule,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    vi.mocked(useCurrentRunStatus).mockReturnValue(RUN_STATUS_IDLE)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct info when module is a magnetic module  GEN1 and exit button works correctly', () => {
    render(props)

    screen.getByText('About Magnetic Module GEN1')
    screen.getByText('def456')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
    const button = screen.getByRole('button', { name: /exit/i })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders no banner when run is running', () => {
    vi.mocked(useCurrentRunStatus).mockReturnValue(RUN_STATUS_RUNNING)
    render(props)

    screen.getByText('About Magnetic Module GEN1')
    screen.getByText('def456')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
  })

  it('renders no banner when run is finishing', () => {
    vi.mocked(useCurrentRunStatus).mockReturnValue(RUN_STATUS_FINISHING)
    render(props)

    screen.getByText('About Magnetic Module GEN1')
    screen.getByText('def456')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
  })

  it('renders correct info when module is a magnetic module GEN2', () => {
    props = {
      module: mockMagneticModuleGen2,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    render(props)

    screen.getByText('About Magnetic Module GEN2')
    screen.getByText('def456')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
  })

  it('renders correct info when module is a temperature module GEN2', () => {
    props = {
      module: mockTemperatureModuleGen2,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    render(props)

    screen.getByText('About Temperature Module GEN2')
    screen.getByText('abc123')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
  })

  it('renders correct info when module is a temperature module GEN1', () => {
    props = {
      module: mockTemperatureModule,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    render(props)

    screen.getByText('About Temperature Module GEN1')
    screen.getByText('abc123')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
  })

  it('renders correct info when module is a thermocycler module with an update available', () => {
    props = {
      module: mockThermocycler,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    render(props)

    screen.getByText('About Thermocycler Module GEN1')
    screen.getByText('ghi789')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
    screen.getByText('Firmware update available.')
    const viewUpdate = screen.getByRole('button', { name: 'Update now' })
    fireEvent.click(viewUpdate)
    expect(props.firmwareUpdateClick).toHaveBeenCalled()
    expect(props.onCloseClick).toHaveBeenCalled()
    expect(viewUpdate).toBeEnabled()
    const exit = screen.getByLabelText('close_icon')
    fireEvent.click(exit)
    expect(exit).not.toBeVisible()
  })

  it('renders correct info when module is a temperature module GEN1 and clicking on button closes it', () => {
    props = {
      module: mockTemperatureModule,
      isExpanded: true,
      onCloseClick: vi.fn(),
      firmwareUpdateClick: vi.fn(),
    }
    render(props)

    screen.getByText('About Temperature Module GEN1')
    screen.getByText('abc123')
    screen.getByText('SERIAL NUMBER')
    screen.getByText('CURRENT VERSION')
    screen.getByText('v2.0.0')
    const button = screen.getByRole('button', { name: 'close' })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
